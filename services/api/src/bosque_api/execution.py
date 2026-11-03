"""Demo credentials and conservative, non-refundable daily PostgreSQL reservations."""

import secrets
from pathlib import Path
from uuid import UUID, uuid4

import psycopg
from fastapi import HTTPException

from bosque_api.config import Settings


def identity(config: Settings, authorization: str | None) -> str:
    for name, token in config.demo_tokens.items():
        value = token.get_secret_value()
        if value and secrets.compare_digest(
            (authorization or "").encode(), ("Bearer " + value).encode()
        ):
            return name
    raise HTTPException(401, "Identidad de demostración requerida")


class ExecutionStore:
    def __init__(self, config: Settings):
        self.config = config

    def reserve(
        self,
        owner: str,
        operation: str,
        owner_cap_units: int | None = None,
        *,
        credit_snapshot=None,
        job_context=None,
    ):
        """Reserve under one advisory lock: lifetime, owner cap, daily and concurrency.

        owner_cap_units bounds all reservations of this identity (research phases);
        it is checked in the same transaction, so concurrent callers cannot overrun it.
        """
        config = self.config
        if owner == "sam-api-lab" and config.budget_lifetime_units > 1_000_000:
            raise HTTPException(503, "Campaña de investigación requiere fase explícita")
        if owner == "sam-api-lab:I" and (
            not isinstance(credit_snapshot, dict) or owner_cap_units is None
        ):
            raise HTTPException(503, "Fase I requiere autorización vigente y límite de fase")
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
                if credit_snapshot is not None:
                    if owner != "sam-api-lab:I" or set(credit_snapshot) != {
                        "authorization_id",
                        "authorization_file",
                        "evidence_file",
                        "campaign_id",
                    }:
                        raise HTTPException(503, "Referencia financiera inválida")
                    try:
                        from evaluations.sam_workers.schemas import financial_snapshot
                        from tools.meta_sam_api_lab.media import digest, private_path

                        auth_id = UUID(str(credit_snapshot["authorization_id"]))
                        auth_file = private_path(Path(credit_snapshot["authorization_file"]))
                        auth_hash = digest(auth_file)
                        registered = conn.execute(
                            "SELECT campaign_id,authorization_sha256,evidence_sha256,"
                            "phase_cap_units "
                            "FROM sam_financial_authorizations WHERE authorization_id=%s "
                            "AND revoked_at IS NULL AND checked_at<=now() AND expires_at>now()",
                            (auth_id,),
                        ).fetchone()
                        if (
                            not registered
                            or registered[0] != credit_snapshot["campaign_id"]
                            or registered[1] != auth_hash
                            or owner_cap_units > registered[3]
                            or registered[2]
                            != digest(private_path(Path(credit_snapshot["evidence_file"])))
                        ):
                            raise ValueError("Authorization record mismatch")
                        checked_at, available_units = financial_snapshot(
                            auth_file,
                            credit_snapshot["evidence_file"],
                            credit_snapshot["campaign_id"],
                            owner_cap_units / 1_000_000,
                        )
                        if digest(auth_file) != auth_hash:
                            raise ValueError("Authorization changed")
                    except (KeyError, TypeError, ValueError, OSError):
                        raise HTTPException(503, "Autorización financiera no verificable") from None
                    fresh = conn.execute(
                        "SELECT now() >= %s AND now() < %s + interval '24 hours'",
                        (checked_at, checked_at),
                    ).fetchone()[0]
                    if not fresh or available_units <= 0:
                        raise HTTPException(503, "Snapshot de créditos no vigente")
                    since = conn.execute(
                        "SELECT COALESCE(sum(reserved_units),0) FROM execution_reservations "
                        "WHERE created_at >= %s OR status IN ('reserved', 'expired')",
                        (checked_at,),
                    ).fetchone()[0]
                    if since + units > available_units:
                        raise HTTPException(429, "Créditos del snapshot insuficientes")
                if config.budget_lifetime_units:
                    lifetime = conn.execute(
                        "SELECT COALESCE(sum(reserved_units),0) FROM execution_reservations"
                    ).fetchone()[0]
                    if lifetime + units > config.budget_lifetime_units:
                        raise HTTPException(429, "Límite acumulado de experimentación alcanzado")
                if owner_cap_units is not None:
                    owned = conn.execute(
                        "SELECT COALESCE(sum(reserved_units),0) FROM execution_reservations "
                        "WHERE identity_id=%s",
                        (owner,),
                    ).fetchone()[0]
                    if owned + units > owner_cap_units:
                        raise HTTPException(429, "Límite de la fase de investigación alcanzado")
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
                    and (
                        count >= config.budget_requests
                        or own >= config.budget_requests_per_identity
                    )
                    or used + units > config.budget_units
                    or active >= config.budget_concurrency
                ):
                    raise HTTPException(429, "Límite global o por identidad alcanzado")
                conn.execute(
                    "INSERT INTO execution_reservations(id,identity_id,operation,reserved_units) "
                    "VALUES (%s,%s,%s,%s)",
                    (identifier, owner, operation, units),
                )
                if job_context is not None:
                    job_id, lease_owner, attempt = job_context
                    link = conn.execute(
                        "INSERT INTO sam_job_reservations(job_id,attempt,reservation_id) "
                        "SELECT job_id,%s,%s FROM sam_experiment_jobs WHERE job_id=%s "
                        "AND lease_owner=%s AND status='running' AND attempt_count=%s "
                        "AND lease_expires_at>now() AND (%s::text IS NULL OR campaign_id=%s) "
                        "RETURNING job_id",
                        (
                            attempt,
                            identifier,
                            job_id,
                            lease_owner,
                            attempt,
                            credit_snapshot["campaign_id"] if credit_snapshot else None,
                            credit_snapshot["campaign_id"] if credit_snapshot else None,
                        ),
                    ).fetchone()
                    if link is None:
                        raise HTTPException(409, "Lease o intento no válido para reserva")
        except psycopg.Error:
            raise HTTPException(503, "Control global de consumo no disponible") from None
        return identifier

    def finish(self, identifier, status: str, usage: dict):
        from psycopg.types.json import Jsonb

        try:
            with psycopg.connect(
                self.config.database_url.get_secret_value(), connect_timeout=3
            ) as conn:
                conn.execute("SET LOCAL statement_timeout = '3000ms'")
                updated = conn.execute(
                    "UPDATE execution_reservations SET status=%s,reported_usage=%s "
                    "WHERE id=%s AND status='reserved' RETURNING id",
                    (status, Jsonb(usage), identifier),
                ).fetchone()
                if updated is None:
                    raise HTTPException(409, "Reserva no disponible para finalizar")
        except psycopg.Error:
            # Reservation remains charged; expiration recovers only the concurrency slot.
            raise HTTPException(503, "No se pudo confirmar el registro de ejecución") from None
