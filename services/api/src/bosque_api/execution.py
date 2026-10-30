"""Demo credentials and conservative, non-refundable daily PostgreSQL reservations."""

import secrets
from uuid import uuid4

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

    def reserve(self, owner: str, operation: str):
        config = self.config
        if not config.database_url.get_secret_value():
            raise HTTPException(503, "Control global de consumo no configurado")
        units = config.meta_reservation_units if operation == "identify" else 0
        if operation == "identify" and (not units or not config.budget_units):
            raise HTTPException(503, "Presupuesto Meta no configurado")
        identifier = uuid4()
        try:
            with psycopg.connect(config.database_url.get_secret_value(), connect_timeout=3) as conn:
                conn.execute("SET LOCAL statement_timeout = '3000ms'")
                # Serialize admissions across workers; limits are shared by this database.
                conn.execute("SELECT pg_advisory_xact_lock(78021931)")
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
                if (
                    count >= config.budget_requests
                    or own >= config.budget_requests_per_identity
                    or used + units > config.budget_units
                    or active >= config.budget_concurrency
                ):
                    raise HTTPException(429, "Límite global o por identidad alcanzado")
                conn.execute(
                    "INSERT INTO execution_reservations(id,identity_id,operation,reserved_units) "
                    "VALUES (%s,%s,%s,%s)",
                    (identifier, owner, operation, units),
                )
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
                conn.execute(
                    "UPDATE execution_reservations SET status=%s,reported_usage=%s "
                    "WHERE id=%s AND status='reserved'",
                    (status, Jsonb(usage), identifier),
                )
        except psycopg.Error:
            # Reservation remains charged; expiration recovers only the concurrency slot.
            raise HTTPException(503, "No se pudo confirmar el registro de ejecución") from None
