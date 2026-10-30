import hashlib
from uuid import uuid4

import psycopg
from bosque_ai.contracts import Identification
from fastapi import HTTPException
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from bosque_api.expeditions import Capture, CaptureAttempt, Collection

REFERENCE_LAYER = (
    "bcn_snaspe_pilot",
    "2826",
    "44dfa8b84b707d7301b93dcb5b69fc79d2bf003a2909bede8cad7302a850d7ea",
)
SELECT_CAPTURE = """
    SELECT o.id AS capture_id, o.id AS observation_id, o.owner_id, o.expedition_id,
        o.identification_id, o.species_id, o.observed_at, o.created_at,
        o.created_at AS updated_at, o.accuracy_m, o.spatial_status,
        ST_AsGeoJSON(o.location)::json AS location, i.result AS evidence,
        CASE WHEN o.species_id IS NULL THEN 'registered'
             ELSE 'identification_suggested' END AS capture_status,
        o.capture_request_hash
    FROM observations o JOIN identifications i ON i.id=o.identification_id
"""


def capture_row(row) -> Capture:
    data = dict(row)
    data.pop("capture_request_hash", None)
    if data["accuracy_m"] is not None and data["accuracy_m"] > 50:
        data["quality_flags"] = ["low_reported_gps_accuracy"]
    return Capture.model_validate(data)


class CaptureStore:
    def __init__(self, url: str, retention_days: int = 30):
        self.url = url
        self.retention_days = retention_days

    def save_identification(self, owner: str, result: Identification) -> Identification:
        result = result.model_copy(update={"identification_id": str(uuid4())})
        with psycopg.connect(self.url, connect_timeout=3) as conn:
            conn.execute(
                "INSERT INTO identifications(id,owner_id,result) VALUES (%s,%s,%s)",
                (result.identification_id, owner, Jsonb(result.model_dump(mode="json"))),
            )
        return result

    def create(self, owner: str, item: CaptureAttempt) -> tuple[Capture, bool]:
        digest = hashlib.sha256(
            item.model_dump_json(exclude={"idempotency_key"}).encode()
        ).hexdigest()
        with psycopg.connect(self.url, row_factory=dict_row, connect_timeout=3) as conn:
            conn.execute("SET LOCAL statement_timeout = '3000ms'")
            conn.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s, 78021932))", (owner,))
            existing = conn.execute(
                SELECT_CAPTURE + " WHERE o.owner_id=%s AND "
                "(o.capture_key=%s OR o.identification_id=%s)",
                (owner, item.idempotency_key, item.identification_id),
            ).fetchall()
            if existing:
                if len(existing) != 1 or existing[0]["capture_request_hash"] != digest:
                    raise HTTPException(409, "Captura duplicada con datos diferentes")
                # Expired personal data is never resurfaced by retries.
                visible = conn.execute(
                    "SELECT o.id FROM observations o JOIN identifications i "
                    "ON i.id=o.identification_id WHERE o.id=%s AND "
                    "o.created_at > now() - %s * interval '1 day' AND "
                    "i.created_at > now() - %s * interval '1 day'",
                    (existing[0]["capture_id"], self.retention_days, self.retention_days),
                ).fetchone()
                if not visible:
                    raise HTTPException(410, "Captura expirada")
                return capture_row(existing[0]), False
            record = conn.execute(
                "SELECT result FROM identifications WHERE id=%s AND owner_id=%s "
                "AND created_at > now() - %s * interval '1 day' FOR SHARE",
                (item.identification_id, owner, self.retention_days),
            ).fetchone()
            if not record:
                raise HTTPException(404, "Identificación no encontrada o expirada")
            result = Identification.model_validate(record["result"])
            candidates = {candidate.species_id for candidate in result.candidates}
            if item.species_id is not None and item.species_id not in candidates:
                raise HTTPException(422, "Especie no respaldada por esta identificación")
            spatial = "not_provided" if item.location is None else "not_checked"
            geometry = item.location.model_dump_json() if item.location else None
            if geometry:
                # Check only the already audited reference feature; no fabricated boundary.
                area = conn.execute(
                    "SELECT ST_Covers(f.geom, "
                    "ST_SetSRID(ST_GeomFromGeoJSON(%s),4326)) AS inside "
                    "FROM context_features f JOIN context_layers l ON l.id=f.source_id "
                    "WHERE f.source_id=%s AND f.feature_id=%s AND "
                    "l.metadata->>'kind'='protected' AND l.metadata->>'content_sha256'=%s",
                    (geometry, *REFERENCE_LAYER),
                ).fetchone()
                if area:
                    spatial = "inside_reference" if area["inside"] else "outside_reference"
            identifier = uuid4()
            conn.execute(
                "INSERT INTO observations(id,owner_id,species_id,identification_id,"
                "expedition_id,capture_key,capture_request_hash,observed_at,location,accuracy_m,"
                "spatial_status) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,"
                "ST_SetSRID(ST_GeomFromGeoJSON(%s),4326),%s,%s)",
                (
                    identifier,
                    owner,
                    item.species_id,
                    item.identification_id,
                    item.expedition_id,
                    item.idempotency_key,
                    digest,
                    item.observed_at,
                    geometry,
                    item.accuracy_m,
                    spatial,
                ),
            )
            row = conn.execute(SELECT_CAPTURE + " WHERE o.id=%s", (identifier,)).fetchone()
            return capture_row(row), True

    def collection(self, owner: str, limit: int, offset: int) -> Collection:
        with psycopg.connect(self.url, row_factory=dict_row, connect_timeout=3) as conn:
            conn.execute("SET LOCAL statement_timeout = '3000ms'")
            where = (
                " WHERE o.owner_id=%s AND o.created_at > now() - %s * interval '1 day'"
                " AND i.created_at > now() - %s * interval '1 day'"
            )
            params = (owner, self.retention_days, self.retention_days)
            rows = conn.execute(
                SELECT_CAPTURE + where + " ORDER BY o.created_at DESC, o.id LIMIT %s OFFSET %s",
                (*params, limit, offset),
            ).fetchall()
            stats = conn.execute(
                "SELECT count(*) AS total, "
                "array_agg(DISTINCT o.species_id) "
                "FILTER (WHERE o.species_id IS NOT NULL) AS species "
                "FROM observations o JOIN identifications i ON i.id=o.identification_id" + where,
                params,
            ).fetchone()
        species = sorted(stats["species"] or [])
        return Collection(
            captures=[capture_row(row) for row in rows],
            total_captures=stats["total"],
            species_recorded=species,
            suggested_species_count=len(species),
            educational_progress=(
                f"{stats['total']} registros personales; ninguna verificación taxonómica"
            ),
            limit=limit,
            offset=offset,
        )

    def get(self, owner: str, identifier) -> Capture:
        with psycopg.connect(self.url, row_factory=dict_row, connect_timeout=3) as conn:
            row = conn.execute(
                SELECT_CAPTURE + " WHERE o.id=%s AND o.owner_id=%s AND "
                "o.created_at > now() - %s * interval '1 day' AND "
                "i.created_at > now() - %s * interval '1 day'",
                (identifier, owner, self.retention_days, self.retention_days),
            ).fetchone()
        if not row:
            raise HTTPException(404, "Captura no encontrada")
        return capture_row(row)

    def delete(self, owner: str, identifier):
        with psycopg.connect(self.url, connect_timeout=3) as conn:
            row = conn.execute(
                "DELETE FROM observations WHERE id=%s AND owner_id=%s "
                "AND identification_id IS NOT NULL RETURNING identification_id",
                (identifier, owner),
            ).fetchone()
            if not row:
                raise HTTPException(404, "Captura no encontrada")
            conn.execute("DELETE FROM identifications WHERE id=%s AND owner_id=%s", (row[0], owner))

    def purge_expired(self) -> int:
        with psycopg.connect(self.url, connect_timeout=3) as conn:
            conn.execute(
                "DELETE FROM observations WHERE identification_id IN "
                "(SELECT id FROM identifications WHERE created_at <= "
                "now() - %s * interval '1 day')",
                (self.retention_days,),
            )
            return conn.execute(
                "DELETE FROM identifications WHERE created_at <= now() - %s * interval '1 day'",
                (self.retention_days,),
            ).rowcount

    def delete_identification(self, owner: str, identifier):
        with psycopg.connect(self.url, connect_timeout=3) as conn:
            conn.execute(
                "DELETE FROM observations WHERE identification_id=%s AND owner_id=%s",
                (identifier, owner),
            )
            row = conn.execute(
                "DELETE FROM identifications WHERE id=%s AND owner_id=%s RETURNING id",
                (identifier, owner),
            ).fetchone()
            if not row:
                raise HTTPException(404, "Identificación no encontrada")
