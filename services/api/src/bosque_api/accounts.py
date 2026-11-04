"""Federated login (Firebase Authentication) and backend-managed roles and cohorts (migration 008).

Facebook says who the person is; Firebase signs an ID token; this module verifies it and maps
it to a stable internal identity. Roles, scopes and budgets come only from the database:
nothing the client sends (UID, e-mail, name, requested role) is trusted. The Facebook access
token never reaches the backend.
"""

import hashlib
import logging
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from typing import Annotated, Literal

import jwt
import psycopg
from fastapi import HTTPException, Path, Request
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field

from bosque_api.config import Settings
from bosque_api.public import CAMPAIGN_ID, EXPIRED_MESSAGE, campaign_expired
from bosque_api.sessions import (
    IDENTITY_PATTERN,
    Operation,
    SessionToken,
    connect,
    pseudonym,
    rate_limit,
)

log = logging.getLogger("bosque_api.auth")
JWKS_URL = (
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
)
Role = Literal["public_trial", "team_developer", "internal_qa", "administrator"]
Cohort = Literal["public_trial", "team_developer", "internal_qa", "public_demo"]
ROLE_SCOPES: dict[str, list[Operation]] = {
    role: ["guide", "identify", "raster", "transcribe"]
    for role in ("public_trial", "team_developer", "internal_qa", "administrator")
}
PLAN_LABEL = {
    "public_trial": "Prueba gratuita",
    "team_developer": "Equipo ProGarLabs",
    "internal_qa": "QA interno",
}


@lru_cache(maxsize=1)
def jwks() -> jwt.PyJWKClient:
    return jwt.PyJWKClient(JWKS_URL, cache_keys=True, lifespan=3600, timeout=5)


def signing_key(token: str):
    """Google's current key for the token's `kid` (cached one hour); tests replace this."""
    return jwks().get_signing_key_from_jwt(token).key


def verify_firebase_token(config: Settings, token: str) -> dict:
    """RS256 signature, issuer, audience, expiry, issue and auth time, subject and provider."""
    project = config.firebase_project_id
    try:
        key = signing_key(token)
    except jwt.PyJWKClientConnectionError:
        raise HTTPException(503, "No se pudieron obtener las claves de Firebase") from None
    except jwt.PyJWTError:
        raise HTTPException(401, "Token federado inválido") from None
    try:
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=project,
            issuer=f"https://securetoken.google.com/{project}",
            options={"require": ["exp", "iat", "sub", "aud", "iss", "auth_time"]},
            leeway=30,
        )
    except jwt.PyJWTError:
        raise HTTPException(401, "Token federado inválido o expirado") from None
    now = datetime.now(UTC).timestamp() + 30
    subject = claims.get("sub")
    provider = (claims.get("firebase") or {}).get("sign_in_provider")
    if not isinstance(subject, str) or not 1 <= len(subject) <= 128 or claims["auth_time"] > now:
        raise HTTPException(401, "Token federado inválido")
    if provider not in config.federated_providers:
        raise HTTPException(403, "Proveedor de identidad no admitido")
    return claims


def subject_hash(config: Settings, subject: str) -> bytes:
    return hashlib.sha256(f"{config.firebase_project_id}:{subject}".encode()).digest()


class FederatedToken(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id_token: str = Field(min_length=100, max_length=4096, description="ID token de Firebase")


class Permissions(BaseModel):
    identity: str
    role: Role | None
    scopes: list[Operation] | None
    administrator: bool
    ai_enabled: bool


class Quota(BaseModel):
    identity: str
    plan: str | None
    status: Literal[
        "available",
        "daily_limit",
        "trial_exhausted",
        "ai_disabled",
        "suspended",
        "no_cohort",
        "expired",
    ]
    reason: str | None = None
    features: list[Operation]
    units_limit: int | None = Field(description="Tope acumulado de la identidad (microUSD)")
    units_reserved: int = Field(description="Reservado hasta ahora; las reservas no se devuelven")
    units_available: int | None
    daily_requests_limit: int | None
    daily_requests_used: int
    estimate: str = (
        "Unidades en microUSD reservadas por operación antes de llamar a Meta; "
        "el costo facturado puede ser menor. No es un saldo contable."
    )


class IdentityUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Role
    cohort: Cohort | None = Field(default=None, description="Por defecto, la del rol")
    suspended: bool = False
    reason: str = Field(min_length=3, max_length=200)


class CohortUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    cap_units: int = Field(ge=0)
    identity_cap_units: int = Field(ge=0)
    daily_requests_per_identity: int = Field(ge=0, le=1000)
    ai_enabled: bool
    reason: str = Field(min_length=3, max_length=200)


class CampaignClose(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reason: str = Field(min_length=3, max_length=200)


class CohortUsage(BaseModel):
    cohort: Cohort
    cap_units: int
    identity_cap_units: int
    daily_requests_per_identity: int
    ai_enabled: bool
    identities: int
    reserved_units: int
    reservations_by_status: dict[str, int]
    reported_usage: dict[str, int]


class LedgerOverview(BaseModel):
    lifetime_cap_units: int
    reserved_units: int
    unassigned_reserved_units: int = Field(description="Reservas sin cohorte (anteriores a 008)")
    stuck_reservations: int = Field(description="En estado reserved con expiración vencida")
    alerts_crossed_usd: list[int]
    cohorts: list[CohortUsage]


class AccountDeletion(BaseModel):
    observations_deleted: int
    identifications_deleted: int
    sessions_revoked: int
    retained: str = (
        "Seudónimo, hash del identificador federado y ledger de consumo, para no renovar la "
        "cuota de prueba. Bosque Vivo no guarda nombre, correo ni foto de perfil."
    )


def default_cohort(role: str) -> str:
    return "internal_qa" if role == "administrator" else role


def register_account_routes(app, config: Settings):
    issue, operator, client_ip = app.state.issue_session, app.state.operator, app.state.client_ip

    def enabled():
        if not config.firebase_project_id or not config.budget_cohorts_enabled:
            raise HTTPException(501, "Login federado no configurado")

    def guarded(fn):
        try:
            with connect(config) as conn:
                return fn(conn)
        except psycopg.Error:
            raise HTTPException(503, "Servicio de sesiones no disponible") from None

    @app.post(
        "/sessions/federated/exchange",
        response_model=SessionToken,
        status_code=201,
        responses={
            401: {"description": "Token de Firebase inválido o expirado"},
            403: {"description": "Proveedor no admitido o cuenta suspendida"},
            429: {"description": "Demasiados registros nuevos desde esta IP"},
            501: {"description": "Login federado no configurado"},
        },
    )
    def federated_exchange(item: FederatedToken, request: Request):
        """Canjea un ID token de Firebase (Facebook Login) por una sesión BVS de 60 minutos.

        El primer ingreso crea una identidad `public_trial` estable; los siguientes, incluso
        desde otro dispositivo, vuelven a la misma identidad y a su consumo acumulado.
        """
        enabled()
        claims = verify_firebase_token(config, item.id_token)
        provider = claims["firebase"]["sign_in_provider"]
        hashed = subject_hash(config, claims["sub"])
        candidate = "u-" + hashed.hex()[:32]
        access = datetime.now(UTC) + timedelta(days=config.federated_access_days)

        def run(conn):
            row = conn.execute(
                "SELECT i.id, i.role, i.suspended_at FROM federated_subjects f "
                "JOIN identities i ON i.id=f.identity_id WHERE f.subject_hash=%s",
                (hashed,),
            ).fetchone()
            if row is None:
                bucket = "federated_new:" + pseudonym(client_ip(request))
                limit = config.federated_registrations_per_ip_hour
                wait = rate_limit(conn, bucket, limit, 3600)
                if wait:
                    raise HTTPException(
                        429, "Demasiados registros; espera", headers={"Retry-After": str(wait)}
                    )
                conn.execute(
                    "INSERT INTO identities(id, role, cohort) "
                    "VALUES (%s,'public_trial','public_trial') ON CONFLICT (id) DO NOTHING",
                    (candidate,),
                )
                if conn.execute(
                    "INSERT INTO federated_subjects(subject_hash, provider, identity_id) "
                    "VALUES (%s,%s,%s) ON CONFLICT DO NOTHING",
                    (hashed, provider, candidate),
                ).rowcount:
                    conn.execute(
                        "INSERT INTO auth_events(event, identity_id, actor) "
                        "VALUES ('federated_registered',%s,%s)",
                        (candidate, provider),
                    )
                    log.info("auth event=federated_registered who=%s", pseudonym(candidate))
                # A concurrent first login may have won the insert: read what exists.
                row = conn.execute(
                    "SELECT i.id, i.role, i.suspended_at FROM federated_subjects f "
                    "JOIN identities i ON i.id=f.identity_id WHERE f.subject_hash=%s",
                    (hashed,),
                ).fetchone()
            if row[2]:
                raise HTTPException(403, "Cuenta suspendida")
            return issue(
                conn,
                row[0],
                None,
                ROLE_SCOPES[row[1]],
                access,
                "federated_session_issued",
                provider,
            )

        return guarded(run)

    @app.post(
        "/sessions/federated/link",
        status_code=204,
        responses={409: {"description": "La cuenta federada ya tiene una identidad"}},
    )
    def federated_link(item: FederatedToken, request: Request):
        """Asocia la cuenta federada a la identidad de la invitación vigente (misma cuota).

        Solo con una sesión de invitación y antes del primer ingreso federado: no se
        fusionan identidades ya creadas ni se vincula por coincidencia de correo.
        """
        enabled()
        owner = request.state.identity
        if getattr(owner, "session_id", None) is None:
            raise HTTPException(400, "Requiere una sesión de invitación")
        claims = verify_firebase_token(config, item.id_token)
        hashed = subject_hash(config, claims["sub"])

        def run(conn):
            if (
                conn.execute(
                    "SELECT provider FROM access_sessions WHERE id=%s", (owner.session_id,)
                ).fetchone()[0]
                != "invitation"
            ):
                raise HTTPException(400, "Requiere una sesión de invitación")
            inserted = conn.execute(
                "INSERT INTO federated_subjects(subject_hash, provider, identity_id) "
                "VALUES (%s,%s,%s) ON CONFLICT DO NOTHING",
                (hashed, claims["firebase"]["sign_in_provider"], str(owner)),
            ).rowcount
            if not inserted:
                raise HTTPException(409, "La cuenta federada ya tiene una identidad")
            conn.execute(
                "INSERT INTO auth_events(event, identity_id, session_id) "
                "VALUES ('identity_linked',%s,%s)",
                (str(owner), owner.session_id),
            )

        guarded(run)
        log.info("auth event=identity_linked who=%s", pseudonym(owner))

    def cohort_row(conn, identity):
        return conn.execute(
            "SELECT i.role, i.cohort, i.suspended_at, c.identity_cap_units, "
            "c.daily_requests_per_identity, c.ai_enabled, c.cap_units "
            "FROM identities i JOIN budget_cohorts c USING (cohort) WHERE i.id=%s",
            (identity,),
        ).fetchone()

    @app.get("/me/permissions", response_model=Permissions)
    def my_permissions(request: Request):
        owner = request.state.identity
        row = (
            guarded(lambda conn: cohort_row(conn, str(owner)))
            if (config.budget_cohorts_enabled)
            else None
        )
        static = owner.scopes is None and owner in config.admin_identities
        return Permissions(
            identity=owner,
            role=row[0] if row else None,
            scopes=None if owner.scopes is None else sorted(owner.scopes),
            administrator=static or bool(row and row[0] == "administrator"),
            ai_enabled=bool(config.meta_enabled and row and row[5] and not row[2]),
        )

    @app.get("/me/quota", response_model=Quota)
    def my_quota(request: Request):
        """Cuota visible para la propia identidad; nunca muestra bolsas ni datos de otros."""
        owner = request.state.identity
        if not config.budget_cohorts_enabled:
            raise HTTPException(501, "Cuotas por grupo no configuradas")

        def run(conn):
            row = cohort_row(conn, str(owner))
            reserved, today = conn.execute(
                "SELECT COALESCE(sum(reserved_units),0), count(*) FILTER (WHERE "
                "window_date=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date) "
                "FROM execution_reservations WHERE identity_id=%s",
                (str(owner),),
            ).fetchone()
            # Cohorts share one campaign pool (migration 009).
            pooled, cohort_cap = conn.execute(
                "SELECT (SELECT COALESCE(sum(reserved_units),0) FROM execution_reservations), "
                "reservation_cap_units FROM campaign_state WHERE id=%s",
                (CAMPAIGN_ID,),
            ).fetchone()
            return row, reserved, today, pooled, cohort_cap

        row, reserved, today, pooled, cohort_cap = guarded(run)
        features = (
            sorted(owner.scopes) if owner.scopes is not None else list(ROLE_SCOPES["administrator"])
        )
        if row is None:
            return Quota(
                identity=owner,
                plan=None,
                status="no_cohort",
                features=features,
                reason="La identidad no tiene grupo presupuestario asignado",
                units_limit=None,
                units_reserved=reserved,
                units_available=None,
                daily_requests_limit=None,
                daily_requests_used=today,
            )
        role, cohort, suspended, cap, daily, cohort_on, _ = row
        cap = min(cap, config.budget_identity_units or cap)
        available = max(0, min(cap - reserved, cohort_cap - pooled))
        costs = (config.guide_reservation_units, config.meta_reservation_units)
        cheapest = min((u for u in costs if u), default=1)
        status, reason = "available", None
        if campaign_expired(config):
            status, reason = "expired", EXPIRED_MESSAGE
        elif suspended:
            status, reason = "suspended", "Cuenta suspendida"
        elif not (config.meta_enabled and cohort_on):
            status, reason = "ai_disabled", "IA temporalmente deshabilitada para este grupo"
        elif cap - reserved < cheapest:
            status, reason = "trial_exhausted", "Cuota acumulada agotada; no se renueva"
        elif cohort_cap - pooled < cheapest:
            status, reason = "ai_disabled", "Cupo del grupo agotado"
        elif today >= daily:
            status, reason = "daily_limit", "Límite diario alcanzado; vuelve mañana (UTC)"
        return Quota(
            identity=owner,
            plan=PLAN_LABEL[cohort],
            status=status,
            reason=reason,
            features=features,
            units_limit=cap,
            units_reserved=reserved,
            units_available=available,
            daily_requests_limit=daily,
            daily_requests_used=today,
        )

    @app.delete("/me", response_model=AccountDeletion)
    def delete_account(request: Request):
        """Elimina el contenido de la propia cuenta y cierra todas sus sesiones.

        Se conservan el seudónimo, el hash del identificador federado y el ledger: sin ellos,
        borrar la cuenta y volver a entrar regalaría otra cuota. No hay datos de perfil.
        """
        owner = request.state.identity
        if getattr(owner, "session_id", None) is None:
            raise HTTPException(400, "Requiere una sesión de usuario")

        def run(conn):
            observations = conn.execute(
                "DELETE FROM observations WHERE owner_id=%s", (str(owner),)
            ).rowcount
            identifications = conn.execute(
                "DELETE FROM identifications WHERE owner_id=%s", (str(owner),)
            ).rowcount
            sessions = conn.execute(
                "UPDATE access_sessions SET revoked_at=now() "
                "WHERE identity_id=%s AND revoked_at IS NULL",
                (str(owner),),
            ).rowcount
            conn.execute(
                "INSERT INTO auth_events(event, identity_id, detail) "
                "VALUES ('account_deleted',%s,%s)",
                (
                    str(owner),
                    Jsonb({"observations": observations, "identifications": identifications}),
                ),
            )
            return AccountDeletion(
                observations_deleted=observations,
                identifications_deleted=identifications,
                sessions_revoked=sessions,
            )

        result = guarded(run)
        log.info("auth event=account_deleted who=%s", pseudonym(owner))
        return result

    @app.put("/admin/identities/{identity}", response_model=Permissions)
    def update_identity(
        identity: Annotated[str, Path(pattern=IDENTITY_PATTERN)],
        item: IdentityUpdate,
        request: Request,
    ):
        """Asigna rol, cohorte o suspensión. El consumo previo se conserva y sigue contando."""
        actor = operator(request)
        if not config.budget_cohorts_enabled:
            raise HTTPException(501, "Cuotas por grupo no configuradas")
        cohort = item.cohort or default_cohort(item.role)
        if item.role != "administrator" and cohort != item.role:
            raise HTTPException(422, "La cohorte de un rol no administrador es la del rol")

        def run(conn):
            before = conn.execute(
                "SELECT role, cohort, suspended_at IS NOT NULL FROM identities WHERE id=%s "
                "FOR UPDATE",
                (identity,),
            ).fetchone()
            conn.execute(
                "INSERT INTO identities(id, role, cohort, suspended_at) VALUES "
                "(%s,%s,%s, CASE WHEN %s THEN now() END) ON CONFLICT (id) DO UPDATE SET "
                "role=EXCLUDED.role, cohort=EXCLUDED.cohort, suspended_at=CASE WHEN %s "
                "THEN COALESCE(identities.suspended_at, now()) END",
                (identity, item.role, cohort, item.suspended, item.suspended),
            )
            if item.suspended:
                conn.execute(
                    "UPDATE access_sessions SET revoked_at=now() "
                    "WHERE identity_id=%s AND revoked_at IS NULL",
                    (identity,),
                )
            detail = {
                "before": dict(zip(("role", "cohort", "suspended"), before, strict=True))
                if before
                else None,
                "after": {"role": item.role, "cohort": cohort, "suspended": item.suspended},
                "reason": item.reason,
            }
            conn.execute(
                "INSERT INTO auth_events(event, identity_id, actor, detail) "
                "VALUES ('identity_updated',%s,%s,%s)",
                (identity, str(actor), Jsonb(detail)),
            )
            return cohort_row(conn, identity)

        row = guarded(run)
        log.info("auth event=identity_updated who=%s role=%s", pseudonym(identity), item.role)
        return Permissions(
            identity=identity,
            role=row[0],
            scopes=ROLE_SCOPES[row[0]],
            administrator=row[0] == "administrator",
            ai_enabled=bool(config.meta_enabled and row[5] and not row[2]),
        )

    def overview(conn) -> LedgerOverview:
        cohorts = []
        for c in conn.execute(
            "SELECT cohort, cap_units, identity_cap_units, daily_requests_per_identity, "
            "ai_enabled FROM budget_cohorts ORDER BY cohort"
        ).fetchall():
            members = conn.execute(
                "SELECT count(*) FROM identities WHERE cohort=%s", (c[0],)
            ).fetchone()[0]
            by_status = dict(
                conn.execute(
                    "SELECT status, count(*) FROM execution_reservations WHERE cohort=%s "
                    "GROUP BY 1",
                    (c[0],),
                ).fetchall()
            )
            reserved = conn.execute(
                "SELECT COALESCE(sum(reserved_units),0) FROM execution_reservations "
                "WHERE cohort=%s",
                (c[0],),
            ).fetchone()[0]
            usage = dict(
                conn.execute(
                    "SELECT key, sum(value::bigint) FROM execution_reservations, "
                    "jsonb_each_text(COALESCE(reported_usage->'usage', reported_usage)) "
                    "WHERE cohort=%s AND value ~ '^[0-9]+$' GROUP BY 1",
                    (c[0],),
                ).fetchall()
            )
            cohorts.append(
                CohortUsage(
                    cohort=c[0],
                    cap_units=c[1],
                    identity_cap_units=c[2],
                    daily_requests_per_identity=c[3],
                    ai_enabled=c[4],
                    identities=members,
                    reserved_units=reserved,
                    reservations_by_status=by_status,
                    reported_usage=usage,
                )
            )
        total, unassigned, stuck = conn.execute(
            "SELECT COALESCE(sum(reserved_units),0), "
            "COALESCE(sum(reserved_units) FILTER (WHERE cohort IS NULL),0), "
            "count(*) FILTER (WHERE status='reserved' AND expires_at <= now()) "
            "FROM execution_reservations"
        ).fetchone()
        from bosque_api.execution import ALERT_USD

        return LedgerOverview(
            lifetime_cap_units=config.budget_lifetime_units,
            reserved_units=total,
            unassigned_reserved_units=unassigned,
            stuck_reservations=stuck,
            alerts_crossed_usd=[usd for usd in ALERT_USD if total >= usd * 1_000_000],
            cohorts=cohorts,
        )

    @app.post("/admin/campaign/close", status_code=204)
    def close_campaign(item: CampaignClose, request: Request):
        """Cierra la campaña para siempre; ninguna variable ni despliegue puede reabrirla."""
        actor = operator(request)

        def run(conn):
            conn.execute("SELECT pg_advisory_xact_lock(78021931)")  # same lock as reserve()
            conn.execute(
                "UPDATE campaign_state SET closed_at=COALESCE(closed_at, clock_timestamp()), "
                "closed_reason=COALESCE(closed_reason, %s) WHERE id=%s",
                (item.reason, CAMPAIGN_ID),
            )
            conn.execute(
                "INSERT INTO auth_events(event, actor, detail) VALUES ('campaign_closed',%s,%s)",
                (str(actor), Jsonb({"reason": item.reason})),
            )

        guarded(run)
        log.warning("auth event=campaign_closed")

    @app.get("/admin/cohorts", response_model=LedgerOverview)
    def list_cohorts(request: Request):
        """Consumo por cohorte, reservas atascadas y umbrales de alerta cruzados."""
        operator(request)
        if not config.budget_cohorts_enabled:
            raise HTTPException(501, "Cuotas por grupo no configuradas")
        return guarded(overview)

    @app.put("/admin/cohorts/{cohort}", response_model=LedgerOverview)
    def update_cohort(cohort: Cohort, item: CohortUpdate, request: Request):
        """Mueve presupuesto o enciende/apaga la IA de un grupo, con auditoría.

        La suma de topes de cohorte nunca supera BUDGET_LIFETIME_UNITS, y un tope nunca baja
        de lo ya reservado (el historial no se borra).
        """
        actor = operator(request)
        if not config.budget_cohorts_enabled:
            raise HTTPException(501, "Cuotas por grupo no configuradas")

        def run(conn):
            conn.execute("SELECT pg_advisory_xact_lock(78021931)")  # same lock as reserve()
            before = conn.execute(
                "SELECT cap_units, identity_cap_units, daily_requests_per_identity, ai_enabled "
                "FROM budget_cohorts WHERE cohort=%s",
                (cohort,),
            ).fetchone()
            others, reserved = conn.execute(
                "SELECT (SELECT COALESCE(sum(cap_units),0) FROM budget_cohorts WHERE cohort<>%s),"
                " (SELECT COALESCE(sum(reserved_units),0) FROM execution_reservations "
                "WHERE cohort=%s)",
                (cohort, cohort),
            ).fetchone()
            if config.budget_lifetime_units and others + item.cap_units > (
                config.budget_lifetime_units
            ):
                raise HTTPException(422, "La suma de cohortes superaría el tope acumulado")
            if item.cap_units < reserved:
                raise HTTPException(422, "El tope no puede quedar bajo lo ya reservado")
            conn.execute(
                "UPDATE budget_cohorts SET cap_units=%s, identity_cap_units=%s, "
                "daily_requests_per_identity=%s, ai_enabled=%s, updated_at=now() "
                "WHERE cohort=%s",
                (
                    item.cap_units,
                    item.identity_cap_units,
                    item.daily_requests_per_identity,
                    item.ai_enabled,
                    cohort,
                ),
            )
            keys = ("cap_units", "identity_cap_units", "daily_requests_per_identity", "ai_enabled")
            detail = {
                "cohort": cohort,
                "before": dict(zip(keys, before, strict=True)),
                "after": item.model_dump(exclude={"reason"}),
                "reason": item.reason,
            }
            conn.execute(
                "INSERT INTO auth_events(event, actor, detail) VALUES ('cohort_updated',%s,%s)",
                (str(actor), Jsonb(detail)),
            )
            return overview(conn)

        result = guarded(run)
        log.info("auth event=cohort_updated cohort=%s ai=%s", cohort, item.ai_enabled)
        return result
