"""Closed-beta access: single-use invitations exchanged for short-lived session tokens.

- Only SHA-256 hashes of invitations and session tokens are stored (migration 005).
  Both are 32 random bytes, so a plain hash is enough; there is nothing to brute-force.
- Every session resolves to the stable identity chosen by the admin when inviting.
  The ledger counts consumption by that identity, so a new token never resets quotas.
- Scopes are ledger operations (guide, transcribe, identify, raster); ExecutionStore.reserve
  refuses an operation outside the session's scopes, so no route can spend without one.
- Static DEMO_TOKENS keep working (scopes=None: every operation) for operators only.
  They are never handed to testers; only names in ADMIN_IDENTITIES may create invitations.

The token is opaque on purpose: a future OIDC provider (Authorization Code + PKCE) would
replace /sessions/exchange and resolve to the same Principal; nothing else changes.
"""

import hashlib
import logging
import secrets
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID, uuid4

import psycopg
from fastapi import HTTPException, Path, Request, Response
from pydantic import BaseModel, ConfigDict, Field

from bosque_api.config import Settings

Operation = Literal["guide", "transcribe", "identify", "raster"]
SESSION_PREFIX = "bvs_"
INVITATION_PREFIX = "bvi_"
IDENTITY_PATTERN = r"^[a-z0-9][a-z0-9-]{2,40}$"
log = logging.getLogger("bosque_api.auth")


class Principal(str):
    """The ledger identity (a plain str for every store) plus how it authenticated."""

    scopes: frozenset[str] | None = None  # None: static operator token, every operation
    session_id: UUID | None = None
    expires_at: datetime | None = None
    access_expires_at: datetime | None = None


def pseudonym(identity: str | None) -> str:
    """Stable, non-reversible label for logs; identities never appear in clear."""
    return hashlib.sha256((identity or "").encode()).hexdigest()[:12] if identity else "-"


def digest(token: str) -> bytes:
    return hashlib.sha256(token.encode()).digest()


def authorize(owner: str | None, operation: str) -> None:
    scopes = getattr(owner, "scopes", None)
    if scopes is not None and operation not in scopes:
        raise HTTPException(403, f"La sesión no tiene permiso para '{operation}'")


def connect(config: Settings):
    if not config.database_url.get_secret_value():
        raise HTTPException(503, "Sesiones requieren PostgreSQL y migración 005")
    return psycopg.connect(config.database_url.get_secret_value(), connect_timeout=3)


def rate_limit(conn, bucket: str, limit: int, seconds: int, record: bool = True) -> int:
    """Sliding window in PostgreSQL (migration 006); returns Retry-After seconds, 0 if allowed.

    One advisory lock per bucket (two-key form, a separate space from the ledger's single-key
    lock) serializes only callers of the same identity or IP. Rejected calls are never stored,
    so a bucket holds at most `limit` rows; its expired rows are deleted on each call.
    """
    conn.execute("SELECT pg_advisory_xact_lock(7802, hashtext(%s))", (bucket,))
    conn.execute(
        "DELETE FROM rate_limit_hits WHERE bucket=%s AND at <= now() - make_interval(secs => %s)",
        (bucket, seconds),
    )
    count, wait = conn.execute(
        "SELECT count(*), ceil(extract(epoch FROM min(at) + make_interval(secs => %s) - now())) "
        "FROM rate_limit_hits WHERE bucket=%s",
        (seconds, bucket),
    ).fetchone()
    if count >= limit:
        return max(1, int(wait or 1))
    if record:
        conn.execute("INSERT INTO rate_limit_hits(bucket) VALUES (%s)", (bucket,))
        if secrets.randbelow(200) == 0:
            cleanup_rate_limits(conn)
    return 0


def cleanup_rate_limits(conn, older_than_hours: int = 24) -> int:
    """Purges buckets that are never revisited (one-off IPs); every window is <= 15 min."""
    return conn.execute(
        "DELETE FROM rate_limit_hits WHERE at < now() - make_interval(hours => %s)",
        (older_than_hours,),
    ).rowcount


def resolve_session(config: Settings, token: str) -> Principal:
    """Resolve a session and count the request against its stable identity's limit."""
    try:
        with connect(config) as conn:
            row = conn.execute(
                "SELECT id, identity_id, scopes, expires_at, access_expires_at "
                "FROM access_sessions WHERE token_hash=%s AND revoked_at IS NULL "
                "AND expires_at > now()",
                (digest(token),),
            ).fetchone()
            wait = row and rate_limit(
                conn, "identity:" + row[1], config.session_requests_per_minute, 60
            )
    except psycopg.Error:
        # Fail closed: without PostgreSQL neither the session nor its limit can be checked.
        raise HTTPException(503, "Servicio de sesiones no disponible") from None
    if row is None:
        raise HTTPException(401, "Sesión inválida, expirada o revocada")
    if wait:
        log.warning("auth event=identity_rate_limited who=%s", pseudonym(row[1]))
        raise HTTPException(
            429, "Límite de solicitudes de la identidad", headers={"Retry-After": str(wait)}
        )
    principal = Principal(row[1])
    principal.session_id, principal.scopes = row[0], frozenset(row[2])
    principal.expires_at, principal.access_expires_at = row[3], row[4]
    return principal


class Exchange(BaseModel):
    model_config = ConfigDict(extra="forbid")
    invitation: str = Field(min_length=20, max_length=200)


class SessionToken(BaseModel):
    access_token: str
    token_type: Literal["Bearer"] = "Bearer"
    expires_in: int
    expires_at: datetime
    access_expires_at: datetime
    session_id: UUID
    identity: str
    scopes: list[Operation]


class SessionInfo(BaseModel):
    identity: str
    auth: Literal["session", "operator"]
    scopes: list[Operation] | None
    session_id: UUID | None = None
    expires_at: datetime | None = None
    access_expires_at: datetime | None = None


class InvitationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    identity: str = Field(
        pattern=IDENTITY_PATTERN, description="Seudónimo estable, sin datos personales"
    )
    scopes: list[Operation] = Field(min_length=1)
    invitation_hours: int = Field(default=72, ge=1, le=168)
    access_days: int = Field(default=14, ge=1, le=60)


class Invitation(BaseModel):
    invitation: str
    invitation_id: UUID
    identity: str
    scopes: list[Operation]
    expires_at: datetime
    access_expires_at: datetime


class Revocation(BaseModel):
    identity: str
    sessions_revoked: int
    invitations_revoked: int


class InvitationState(BaseModel):
    invitation_id: UUID
    scopes: list[Operation]
    created_at: datetime
    expires_at: datetime
    access_expires_at: datetime
    redeemed_at: datetime | None
    revoked_at: datetime | None
    state: Literal["pending", "redeemed", "expired", "revoked"]


class IdentityStatus(BaseModel):
    """Operator view of one evaluator: no tokens, no hashes, only states and consumption."""

    identity: str
    invitations: list[InvitationState]
    active_sessions: int
    last_session_expires_at: datetime | None
    reserved_units: int
    reservations_by_status: dict[str, int]
    identity_cap_units: int | None


def register_session_routes(app, config: Settings):
    def client_ip(request: Request) -> str:
        # CF-Connecting-IP is trusted only when ORIGIN_AUTH_TOKEN is set: the middleware has
        # then verified the Worker's secret header; Cloudflare overwrites the value at the edge
        # and rejects clients that send it. Without the origin guard (local) it is spoofable.
        forwarded = request.headers.get("cf-connecting-ip")
        if forwarded and config.origin_auth_token.get_secret_value():
            return forwarded
        return request.client.host if request.client else "-"

    def issue(conn, identity, invitation_id, scopes, access_expires_at, event, actor=None):
        token = SESSION_PREFIX + secrets.token_urlsafe(32)
        session_id = uuid4()
        row = conn.execute(
            "INSERT INTO access_sessions(id, token_hash, identity_id, invitation_id, scopes, "
            "expires_at, access_expires_at) VALUES (%s,%s,%s,%s,%s, "
            "least(now() + make_interval(mins => %s), %s), %s) RETURNING expires_at",
            (
                session_id,
                digest(token),
                identity,
                invitation_id,
                list(scopes),
                config.session_ttl_minutes,
                access_expires_at,
                access_expires_at,
            ),
        ).fetchone()
        conn.execute(
            "INSERT INTO auth_events(event, identity_id, session_id, actor) VALUES (%s,%s,%s,%s)",
            (event, identity, session_id, actor),
        )
        log.info("auth event=%s who=%s session=%s", event, pseudonym(identity), str(session_id)[:8])
        return SessionToken(
            access_token=token,
            expires_in=max(0, int((row[0] - datetime.now(row[0].tzinfo)).total_seconds())),
            expires_at=row[0],
            access_expires_at=access_expires_at,
            session_id=session_id,
            identity=identity,
            scopes=sorted(scopes),
        )

    def session_principal(request: Request) -> Principal:
        owner = request.state.identity
        if getattr(owner, "session_id", None) is None:
            raise HTTPException(400, "Esta credencial no es una sesión temporal")
        return owner

    def operator(request: Request) -> Principal:
        owner = request.state.identity
        if owner is None or owner.scopes is not None or owner not in config.admin_identities:
            raise HTTPException(403, "Requiere credencial de operador autorizada")
        return owner

    @app.post(
        "/sessions/exchange",
        response_model=SessionToken,
        status_code=201,
        responses={
            401: {"description": "Invitación inválida, expirada, usada o revocada"},
            429: {"description": "Demasiados intentos fallidos desde esta IP"},
            503: {"description": "PostgreSQL o migración 005 no disponibles"},
        },
    )
    def exchange(item: Exchange, request: Request):
        """Canjea una invitación de un solo uso por una sesión de corta duración."""
        ip = client_ip(request)
        bucket = "exchange_failed:" + pseudonym(ip)  # the IP is never stored in clear
        limit = config.exchange_failures_per_ip
        try:
            with connect(config) as conn:
                wait = rate_limit(conn, bucket, limit, 900, record=False)
                if wait:
                    log.warning("auth event=exchange_blocked ip=%s", pseudonym(ip))
                    raise HTTPException(
                        429, "Demasiados intentos; espera", headers={"Retry-After": str(wait)}
                    )
                row = None
                if item.invitation.startswith(INVITATION_PREFIX):
                    row = conn.execute(
                        "UPDATE access_invitations SET redeemed_at=now() WHERE token_hash=%s "
                        "AND redeemed_at IS NULL AND revoked_at IS NULL AND expires_at > now() "
                        "AND access_expires_at > now() "
                        "RETURNING id, identity_id, scopes, access_expires_at",
                        (digest(item.invitation),),
                    ).fetchone()
                if row is None:
                    # ponytail: two concurrent failures at limit-1 may both count (overshoot of a
                    # few); the next attempt is then blocked, which only adds strictness.
                    rate_limit(conn, bucket, limit, 900)
                    conn.commit()  # keep the failure although we raise
                    log.warning("auth event=exchange_failed ip=%s", pseudonym(ip))
                    raise HTTPException(401, "Invitación inválida, expirada, usada o revocada")
                return issue(conn, row[1], row[0], row[2], row[3], "session_issued")
        except psycopg.Error:
            raise HTTPException(503, "Servicio de sesiones no disponible") from None

    @app.post("/sessions/refresh", response_model=SessionToken, status_code=201)
    def refresh(request: Request):
        """Reemplaza la sesión vigente por otra; nunca más allá de `access_expires_at`."""
        current = session_principal(request)
        try:
            with connect(config) as conn:
                row = conn.execute(
                    "UPDATE access_sessions SET revoked_at=now() WHERE id=%s "
                    "AND revoked_at IS NULL AND expires_at > now() AND access_expires_at > now() "
                    "RETURNING identity_id, invitation_id, scopes, access_expires_at",
                    (current.session_id,),
                ).fetchone()
                if row is None:
                    raise HTTPException(401, "Sesión expirada; canjea una invitación nueva")
                return issue(conn, row[0], row[1], row[2], row[3], "session_refreshed")
        except psycopg.Error:
            raise HTTPException(503, "Servicio de sesiones no disponible") from None

    @app.get("/sessions/me", response_model=SessionInfo)
    def me(request: Request):
        owner = request.state.identity
        if owner.session_id is None:
            return SessionInfo(identity=owner, auth="operator", scopes=None)
        return SessionInfo(
            identity=owner,
            auth="session",
            scopes=sorted(owner.scopes),
            session_id=owner.session_id,
            expires_at=owner.expires_at,
            access_expires_at=owner.access_expires_at,
        )

    @app.post("/sessions/logout", status_code=204)
    def logout(request: Request):
        current = session_principal(request)
        try:
            with connect(config) as conn:
                conn.execute(
                    "UPDATE access_sessions SET revoked_at=now() "
                    "WHERE id=%s AND revoked_at IS NULL",
                    (current.session_id,),
                )
                conn.execute(
                    "INSERT INTO auth_events(event, identity_id, session_id) VALUES "
                    "('session_revoked',%s,%s)",
                    (str(current), current.session_id),
                )
        except psycopg.Error:
            raise HTTPException(503, "Servicio de sesiones no disponible") from None
        log.info("auth event=session_revoked who=%s", pseudonym(current))
        return Response(status_code=204)

    @app.post(
        "/admin/invitations",
        response_model=Invitation,
        status_code=201,
        responses={403: {"description": "Solo operadores en ADMIN_IDENTITIES"}},
    )
    def invite(item: InvitationCreate, request: Request):
        """La invitación se muestra una sola vez; se guarda solo su hash."""
        actor = operator(request)
        if item.identity in config.demo_tokens:
            raise HTTPException(422, "La identidad coincide con una credencial de operador")
        token = INVITATION_PREFIX + secrets.token_urlsafe(32)
        invitation_id = uuid4()
        try:
            with connect(config) as conn:
                expires, access = conn.execute(
                    "INSERT INTO access_invitations(id, token_hash, identity_id, scopes, "
                    "created_by, expires_at, access_expires_at) VALUES (%s,%s,%s,%s,%s, "
                    "now() + make_interval(hours => %s), now() + make_interval(days => %s)) "
                    "RETURNING expires_at, access_expires_at",
                    (
                        invitation_id,
                        digest(token),
                        item.identity,
                        sorted(set(item.scopes)),
                        str(actor),
                        item.invitation_hours,
                        item.access_days,
                    ),
                ).fetchone()
                conn.execute(
                    "INSERT INTO auth_events(event, identity_id, actor) VALUES "
                    "('invitation_created',%s,%s)",
                    (item.identity, str(actor)),
                )
        except psycopg.Error:
            raise HTTPException(503, "Servicio de sesiones no disponible") from None
        log.info("auth event=invitation_created who=%s", pseudonym(item.identity))
        return Invitation(
            invitation=token,
            invitation_id=invitation_id,
            identity=item.identity,
            scopes=sorted(set(item.scopes)),
            expires_at=expires,
            access_expires_at=access,
        )

    @app.post("/admin/identities/{identity}/revoke", response_model=Revocation)
    def revoke(identity: Annotated[str, Path(pattern=IDENTITY_PATTERN)], request: Request):
        """Revoca todas las sesiones e invitaciones pendientes; el ledger se conserva."""
        actor = operator(request)
        try:
            with connect(config) as conn:
                sessions = conn.execute(
                    "UPDATE access_sessions SET revoked_at=now() "
                    "WHERE identity_id=%s AND revoked_at IS NULL",
                    (identity,),
                ).rowcount
                invitations = conn.execute(
                    "UPDATE access_invitations SET revoked_at=now() WHERE identity_id=%s "
                    "AND revoked_at IS NULL AND redeemed_at IS NULL",
                    (identity,),
                ).rowcount
                conn.execute(
                    "INSERT INTO auth_events(event, identity_id, actor) VALUES "
                    "('identity_revoked',%s,%s)",
                    (identity, str(actor)),
                )
        except psycopg.Error:
            raise HTTPException(503, "Servicio de sesiones no disponible") from None
        log.info("auth event=identity_revoked who=%s sessions=%d", pseudonym(identity), sessions)
        return Revocation(
            identity=identity, sessions_revoked=sessions, invitations_revoked=invitations
        )

    @app.get("/admin/identities/{identity}", response_model=IdentityStatus)
    def identity_status(identity: Annotated[str, Path(pattern=IDENTITY_PATTERN)], request: Request):
        """Estado de invitaciones, sesiones y consumo del ledger de un evaluador."""
        operator(request)
        try:
            with connect(config) as conn:
                invitations = conn.execute(
                    "SELECT id, scopes, created_at, expires_at, access_expires_at, redeemed_at, "
                    "revoked_at, CASE WHEN revoked_at IS NOT NULL THEN 'revoked' "
                    "WHEN redeemed_at IS NOT NULL THEN 'redeemed' "
                    "WHEN expires_at <= now() THEN 'expired' ELSE 'pending' END "
                    "FROM access_invitations WHERE identity_id=%s ORDER BY created_at",
                    (identity,),
                ).fetchall()
                active, last = conn.execute(
                    "SELECT count(*) FILTER (WHERE revoked_at IS NULL AND expires_at > now()), "
                    "max(expires_at) FROM access_sessions WHERE identity_id=%s",
                    (identity,),
                ).fetchone()
                ledger = dict(
                    conn.execute(
                        "SELECT status, count(*) FROM execution_reservations "
                        "WHERE identity_id=%s GROUP BY status",
                        (identity,),
                    ).fetchall()
                )
                units = conn.execute(
                    "SELECT COALESCE(sum(reserved_units),0) FROM execution_reservations "
                    "WHERE identity_id=%s",
                    (identity,),
                ).fetchone()[0]
        except psycopg.Error:
            raise HTTPException(503, "Servicio de sesiones no disponible") from None
        if not invitations:
            raise HTTPException(404, "Identidad sin invitaciones")
        return IdentityStatus(
            identity=identity,
            invitations=[
                InvitationState(
                    invitation_id=r[0],
                    scopes=r[1],
                    created_at=r[2],
                    expires_at=r[3],
                    access_expires_at=r[4],
                    redeemed_at=r[5],
                    revoked_at=r[6],
                    state=r[7],
                )
                for r in invitations
            ],
            active_sessions=active,
            last_session_expires_at=last,
            reserved_units=units,
            reservations_by_status=ledger,
            identity_cap_units=config.budget_identity_units or None,
        )
