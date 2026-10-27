import json

import psycopg
from bosque_geo.context import ContextAreaRequest, ContextLayer
from psycopg.rows import dict_row


class ContextStore:
    def __init__(self, database_url: str):
        self.database_url = database_url

    def layers(self) -> list[ContextLayer]:
        with psycopg.connect(self.database_url, row_factory=dict_row, connect_timeout=3) as conn:
            rows = conn.execute("SELECT metadata FROM context_layers ORDER BY id").fetchall()
        return [ContextLayer.model_validate(row["metadata"]) for row in rows]

    def features(self, geometry: dict) -> list[dict]:
        with psycopg.connect(self.database_url, row_factory=dict_row, connect_timeout=3) as conn:
            conn.execute("SET LOCAL statement_timeout = '3000ms'")
            rows = conn.execute(
                """
                SELECT source_id, feature_id AS id, attributes AS properties,
                       ST_AsGeoJSON(geom, 15)::json AS geometry
                FROM context_features
                WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON(%s),4326))
                ORDER BY source_id, feature_id LIMIT 501
                """,
                (json.dumps(geometry),),
            ).fetchall()
        if len(rows) > 500:
            raise ValueError("Consulta excede 500 coincidencias; reduce el área")
        return rows

    def ingest(self, layer: ContextLayer, features: list[dict]) -> int:
        if not features or len(features) > 500:
            raise ValueError("Ingesta piloto requiere de 1 a 500 polígonos")
        identifiers = [str(f["id"]) for f in features]
        if len(set(identifiers)) != len(identifiers):
            raise ValueError("IDs fuente duplicados")
        for feature in features:
            ContextAreaRequest(area=feature["geometry"])
            if not isinstance(feature["properties"], dict):
                raise ValueError("Atributos fuente requieren un objeto JSON")
            json.dumps(feature["properties"], allow_nan=False)
        with psycopg.connect(self.database_url) as conn:
            conn.execute(
                "INSERT INTO context_layers(id,metadata) VALUES (%s,%s) ON CONFLICT DO NOTHING",
                (layer.id, layer.model_dump_json()),
            )
            existing = conn.execute(
                "SELECT metadata->>'content_sha256' FROM context_layers WHERE id=%s FOR UPDATE",
                (layer.id,),
            ).fetchone()
            if existing and existing[0] != layer.content_sha256:
                raise ValueError("Fuente existente con otro hash: use un ID de versión nuevo")
            for feature in features:
                conn.execute(
                    """
                    INSERT INTO context_features(source_id,feature_id,attributes,geom)
                    VALUES (%s,%s,%s,ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(%s),4326)))
                    ON CONFLICT DO NOTHING
                    """,
                    (
                        layer.id,
                        str(feature["id"]),
                        json.dumps(feature["properties"]),
                        json.dumps(feature["geometry"]),
                    ),
                )
        return len(features)
