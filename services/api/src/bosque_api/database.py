import json
from uuid import uuid4

import psycopg
from psycopg.rows import dict_row

from bosque_api.models import Observation, ObservationCreate

SELECT_OBSERVATION = """
    SELECT id, species_id, notes, created_at, accuracy_m,
           ST_AsGeoJSON(location)::json AS location
    FROM observations
"""


class ObservationStore:
    def __init__(self, database_url: str):
        self.database_url = database_url

    def list(
        self, limit: int, owner: str | None = None, retention_days: int = 30
    ) -> list[Observation]:
        with psycopg.connect(self.database_url, row_factory=dict_row, connect_timeout=3) as conn:
            condition = ""
            params = (limit,)
            if owner is not None:
                condition = " WHERE owner_id=%s AND created_at > now() - %s * interval '1 day'"
                params = (owner, retention_days, limit)
            rows = conn.execute(
                SELECT_OBSERVATION + condition + " ORDER BY created_at DESC LIMIT %s", params
            ).fetchall()
        return [Observation.model_validate(row) for row in rows]

    def create(self, item: ObservationCreate, owner: str | None = None) -> Observation:
        identifier = uuid4()
        geometry = json.dumps(item.location.model_dump()) if item.location else None
        with psycopg.connect(self.database_url, row_factory=dict_row, connect_timeout=3) as conn:
            conn.execute(
                """
                INSERT INTO observations (id, species_id, notes, location, accuracy_m)
                VALUES (%s, %s, %s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326), %s)
                """,
                (identifier, item.species_id, item.notes, geometry, item.accuracy_m),
            )
            row = conn.execute(SELECT_OBSERVATION + " WHERE id = %s", (identifier,)).fetchone()
            if owner is not None:
                conn.execute("UPDATE observations SET owner_id=%s WHERE id=%s", (owner, identifier))
        return Observation.model_validate(row)

    def delete(self, identifier, owner: str) -> bool:
        with psycopg.connect(self.database_url, connect_timeout=3) as conn:
            return (
                conn.execute(
                    "DELETE FROM observations WHERE id=%s AND owner_id=%s", (identifier, owner)
                ).rowcount
                == 1
            )

    def purge_expired(self, retention_days: int) -> int:
        with psycopg.connect(self.database_url, connect_timeout=3) as conn:
            return conn.execute(
                "DELETE FROM observations WHERE owner_id IS NOT NULL "
                "AND created_at <= now() - %s * interval '1 day'",
                (retention_days,),
            ).rowcount
