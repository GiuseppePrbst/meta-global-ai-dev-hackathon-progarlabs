import json
from uuid import uuid4

import psycopg
from psycopg.rows import dict_row

from bosque_api.models import Observation, ObservationCreate

SELECT_OBSERVATION = """
    SELECT id, species_id, notes, created_at,
           ST_AsGeoJSON(location)::json AS location
    FROM observations
"""


class ObservationStore:
    def __init__(self, database_url: str):
        self.database_url = database_url

    def list(self, limit: int) -> list[Observation]:
        with psycopg.connect(self.database_url, row_factory=dict_row, connect_timeout=3) as conn:
            rows = conn.execute(
                SELECT_OBSERVATION + " ORDER BY created_at DESC LIMIT %s", (limit,)
            ).fetchall()
        return [Observation.model_validate(row) for row in rows]

    def create(self, item: ObservationCreate) -> Observation:
        identifier = uuid4()
        geometry = json.dumps(item.location.model_dump()) if item.location else None
        with psycopg.connect(self.database_url, row_factory=dict_row, connect_timeout=3) as conn:
            conn.execute(
                """
                INSERT INTO observations (id, species_id, notes, location)
                VALUES (%s, %s, %s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))
                """,
                (identifier, item.species_id, item.notes, geometry),
            )
            row = conn.execute(SELECT_OBSERVATION + " WHERE id = %s", (identifier,)).fetchone()
        return Observation.model_validate(row)
