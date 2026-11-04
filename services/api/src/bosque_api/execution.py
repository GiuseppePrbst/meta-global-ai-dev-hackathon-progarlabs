"""Demo credentials and conservative, non-refundable daily PostgreSQL reservations."""

import logging
import secrets
from uuid import uuid4

import psycopg
from fastapi import HTTPException

from bosque_api.config import Settings
from bosque_api.public import CAMPAIGN_ID, EXPIRED_MESSAGE, campaign_expired
from bosque_api.sessions import (
    SESSION_PREFIX,
    Principal,
    authorize,
    pseudonym,
    rate_limit,
    resolve_session,
)

log = logging.getLogger("bosque_api.ledger")
# Alert lines (Cloud Logging) when cumulative reservations cross these USD amounts.
ALERT_USD = (30, 50, 70, 80, 85, 90)


def identity(config: Settings, authorization: str | None) -> Principal:
    """Static operator token (DEMO_TOKENS) or a temporary session token (migration 005)."""
    for name, token in config.demo_tokens.items():
        value = token.get_secret_value()
        if value and secrets.compare_digest(
            (authorization or "").encode(), ("Bearer " + value).encode()
        ):
            return Principal(name)
    bearer = (authorization or "").removeprefix("Bearer ")
    if bearer.startswith(SESSION_PREFIX) and config.database_url.get_secret_value():
        return resolve_session(config, bearer)
    raise HTTPException(401, "Identidad de demostración requerida")


class ExecutionStore:
    def __init__(self, config: Settings):
        self.config = config

    def reserve(self, owner: str, operation: str, owner_cap_units: int | None = None):
        """Reserve under one advisory lock: lifetime, owner cap, daily and concurrency.

        owner_cap_units bounds all reservations of this identity (research phases);
        it is checked in the same transaction, so concurrent callers cannot overrun it.
        """
        config = self.config
        authorize(owner, operation)  # a session never spends outside its scopes
        anonymous = getattr(owner, "anonymous", False)
        if operation != "raster" and campaign_expired(config):
            raise HTTPException(410, EXPIRED_MESSAGE)
        if owner_cap_units is None and config.budget_identity_units:
            owner_cap_units = config.budget_identity_units
        if not config.database_url.get_secret_value():
            raise HTTPException(503, "Control global de consumo no configurado")
        units = {
            "identify": config.meta_reservation_units,
            "transcribe": config.voice_reservation_units,
            "guide": config.guide_reservation_units,
            "raster": 0,
        }[operation]
        if operation != "raster" and (not units or not config.budget_units):
            raise HTTPException(503, "Presupuesto Meta no configurado")
        identifier = uuid4()
        try:
            with psycopg.connect(config.database_url.get_secret_value(), connect_timeout=3) as conn:
                conn.execute("SET LOCAL statement_timeout = '3000ms'")
                # Serialize admissions across workers; limits are shared by this database.
                conn.execute("SELECT pg_advisory_xact_lock(78021931)")
                cap = config.budget_lifetime_units
                if operation != "raster":
                    # Same transaction and clock as the insert: the deadline and the shared cap
                    # live in PostgreSQL, so no deploy or stale variable can reopen or raise them.
                    campaign = conn.execute(
                        "SELECT reservation_cap_units, closed_at IS NOT NULL, "
                        "clock_timestamp() >= expires_at FROM campaign_state WHERE id=%s",
                        (CAMPAIGN_ID,),
                    ).fetchone()
                    if campaign is None:
                        raise HTTPException(503, "Estado de campaña no disponible")
                    campaign_cap, closed, due = campaign
                    if closed or due:
                        if due and not closed:
                            conn.execute(
                                "UPDATE campaign_state SET closed_at=clock_timestamp(), "
                                "closed_reason='expired' WHERE id=%s",
                                (CAMPAIGN_ID,),
                            )
                            conn.commit()
                        raise HTTPException(410, EXPIRED_MESSAGE)
                    cap = min(cap or campaign_cap, campaign_cap)
                if cap:
                    lifetime = conn.execute(
                        "SELECT COALESCE(sum(reserved_units),0) FROM execution_reservations"
                    ).fetchone()[0]
                    if lifetime + units > cap:
                        raise HTTPException(429, "Límite acumulado de experimentación alcanzado")
                cohort = None
                per_identity_daily = config.budget_requests_per_identity
                if anonymous:
                    cohort, per_identity_daily = "public_demo", config.public_requests_per_day
                    wait = rate_limit(
                        conn, "public:" + owner, config.public_requests_per_minute, 60
                    )
                    if wait:
                        raise HTTPException(
                            429, "Límite por minuto alcanzado", headers={"Retry-After": str(wait)}
                        )
                elif config.budget_cohorts_enabled and operation != "raster":
                    # The cohort comes from the backend's identity row, never from the client;
                    # a role change moves future reservations only, history keeps its cohort.
                    found = conn.execute(
                        "SELECT i.cohort, i.suspended_at, c.cap_units, c.identity_cap_units, "
                        "c.daily_requests_per_identity, c.ai_enabled "
                        "FROM identities i JOIN budget_cohorts c USING (cohort) WHERE i.id=%s",
                        (owner,),
                    ).fetchone()
                    if found is None:
                        raise HTTPException(403, "Identidad sin grupo presupuestario")
                    cohort, suspended, _, identity_cap, per_identity_daily, enabled = found
                    if suspended:
                        raise HTTPException(403, "Cuenta suspendida")
                    if not enabled:
                        raise HTTPException(503, "IA no habilitada para este grupo")
                    owner_cap_units = min(identity_cap, owner_cap_units or identity_cap)
                if owner_cap_units is not None:
                    owned = conn.execute(
                        "SELECT COALESCE(sum(reserved_units),0) FROM execution_reservations "
                        "WHERE identity_id=%s",
                        (owner,),
                    ).fetchone()[0]
                    if owned + units > owner_cap_units:
                        raise HTTPException(429, "Límite acumulado de la identidad alcanzado")
                conn.execute(
                    "UPDATE execution_reservations SET status='expired' "
                    "WHERE status='reserved' AND expires_at <= now()"
                )
                count, own, used, active = conn.execute(
                    """
                    SELECT count(*), count(*) FILTER (WHERE identity_id=%s),
                        COALESCE(sum(reserved_units),0),
                        count(*) FILTER (WHERE status='reserved')
                    FROM execution_reservations
                    WHERE window_date=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date
                        OR status='reserved'
                    """,
                    (owner,),
                ).fetchone()
                daily = config.budget_daily_requests_enabled
                if (
                    daily
                    and (count >= config.budget_requests or own >= per_identity_daily)
                    or used + units > config.budget_units
                    or active >= config.budget_concurrency
                ):
                    raise HTTPException(429, "Límite global o por identidad alcanzado")
                if cohort is None:
                    conn.execute(
                        "INSERT INTO execution_reservations(id,identity_id,operation,"
                        "reserved_units) VALUES (%s,%s,%s,%s)",
                        (identifier, owner, operation, units),
                    )
                else:
                    conn.execute(
                        "INSERT INTO execution_reservations(id,identity_id,operation,"
                        "reserved_units,cohort) VALUES (%s,%s,%s,%s,%s)",
                        (identifier, owner, operation, units, cohort),
                    )
                    total = conn.execute(
                        "SELECT COALESCE(sum(reserved_units),0) FROM execution_reservations"
                    ).fetchone()[0]
                    for usd in ALERT_USD:
                        if total - units < usd * 1_000_000 <= total:
                            log.warning("ledger event=threshold_crossed usd=%d", usd)
        except psycopg.Error:
            raise HTTPException(503, "Control global de consumo no disponible") from None
        log.info(
            "ledger event=reserved id=%s op=%s units=%d who=%s",
            str(identifier)[:8],
            operation,
            units,
            pseudonym(owner),
        )
        return identifier

    def finish(self, identifier, status: str, usage: dict):
        from psycopg.types.json import Jsonb

        try:
            with psycopg.connect(
                self.config.database_url.get_secret_value(), connect_timeout=3
            ) as conn:
                conn.execute("SET LOCAL statement_timeout = '3000ms'")
                conn.execute(
                    "UPDATE execution_reservations SET status=%s,reported_usage=%s "
                    "WHERE id=%s AND status='reserved'",
                    (status, Jsonb(usage), identifier),
                )
            log.info("ledger event=finished id=%s status=%s", str(identifier)[:8], status)
        except psycopg.Error:
            # Reservation remains charged; expiration recovers only the concurrency slot.
            raise HTTPException(503, "No se pudo confirmar el registro de ejecución") from None
