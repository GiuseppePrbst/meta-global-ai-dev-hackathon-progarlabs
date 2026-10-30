import os
from pathlib import Path
from uuid import uuid4

import psycopg
import pytest
from bosque_geo.context import ContextLayer
from fastapi.testclient import TestClient
from psycopg import sql
from psycopg.conninfo import make_conninfo
from shapely.geometry import box, mapping

from bosque_api.config import Settings
from bosque_api.context_store import ContextStore
from bosque_api.main import create_app


def test_context_without_database_is_explicit_and_old_contracts_survive():
    client = TestClient(create_app(Settings(_env_file=None, database_url="")))
    assert client.get("/layers").status_code == 503
    assert (
        client.post("/context/point", json={"location": {"coordinates": [0, 0]}}).status_code == 503
    )
    assert (
        client.post("/context/point", json={"location": {"coordinates": [181, 0]}}).status_code
        == 422
    )
    assert client.get("/species").status_code == 200
    schema = client.get("/openapi.json").json()
    assert {
        "/species",
        "/species/{species_id}",
        "/identify",
        "/observations",
        "/forest/sources",
        "/forest/analyze",
    } <= set(schema["paths"])
    assert schema["components"]["schemas"]["ForestRequest"]["properties"]["area"]["$ref"].endswith(
        "/Polygon"
    )
    assert (
        client.post(
            "/forest/analyze/weighted",
            json={
                "source_id": "chmv2",
                "area": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [-72.084, -40.684],
                            [-72.083, -40.684],
                            [-72.083, -40.683],
                            [-72.084, -40.684],
                        ]
                    ],
                },
            },
        ).status_code
        == 501
    )


def test_invalid_source_metadata_is_sanitized(monkeypatch):
    class InvalidStore:
        def __init__(self, url):
            pass

        def layers(self):
            return ContextLayer.model_validate({"sensitive": "private-source-value"})

    monkeypatch.setattr("bosque_api.main.ContextStore", InvalidStore)
    client = TestClient(create_app(Settings(_env_file=None, database_url="test")))
    for response in [
        client.get("/layers"),
        client.post("/context/point", json={"location": {"coordinates": [0, 0]}}),
    ]:
        assert response.status_code == 503
        assert "private-source-value" not in response.text


@pytest.mark.integration
def test_context_postgis_roundtrip_boundaries_and_reversible_migration():
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("PostGIS local ausente")
    schema = "context_test_" + uuid4().hex
    scripts = Path(__file__).parents[1] / "sql"
    with psycopg.connect(url, autocommit=True) as conn:
        conn.execute("CREATE EXTENSION IF NOT EXISTS postgis")
        conn.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
    test_url = make_conninfo(url, options=f"-csearch_path={schema},public")
    try:
        with psycopg.connect(test_url) as conn:
            conn.execute((scripts / "001_init.sql").read_text(encoding="utf-8"))
            for _ in range(2):
                conn.execute((scripts / "002_context.up.sql").read_text(encoding="utf-8"))
        layer = ContextLayer(
            id="synthetic",
            kind="forest",
            producer="SYNTHETIC",
            distributor="SYNTHETIC",
            source_url="synthetic",
            version="test",
            accessed_at="2026-10-27",
            source_crs="EPSG:4326",
            license="test",
            attribution="synthetic",
            rights_status="redistribution_pending",
            geometry_status="pilot_checked",
            taxonomy_status="partial",
            content_sha256="0" * 64,
            limitations=["synthetic, not field observations"],
        )
        features = [
            {"id": identifier, "geometry": mapping(geometry), "properties": {"uso": "synthetic"}}
            for identifier, geometry in [
                ("one", box(-72.085, -40.685, -72.083, -40.681)),
                ("two", box(-72.083, -40.685, -72.081, -40.681)),
            ]
        ]
        store = ContextStore(test_url)
        assert store.ingest(layer, features) == 2
        assert store.ingest(layer, features) == 2
        with pytest.raises(ValueError, match="otro hash"):
            store.ingest(layer.model_copy(update={"content_sha256": "1" * 64}), features)
        client = TestClient(create_app(Settings(_env_file=None, database_url=test_url)))
        assert len(client.get("/layers").json()) == 1
        result = client.post(
            "/context/point", json={"location": {"coordinates": [-72.083, -40.683]}}
        )
        assert result.status_code == 200, result.text
        assert len(result.json()["forest_context"]) == 2
        assert "point_on_boundary" in result.json()["quality_flags"]
        result = client.post(
            "/context/area", json={"area": mapping(box(-72.085, -40.685, -72.081, -40.681))}
        )
        assert result.status_code == 200, result.text
        assert result.json()["coverage"][0]["fraction"] <= 1
        assert (
            client.post("/context/point", json={"location": {"coordinates": [0, 0]}}).json()[
                "status"
            ]
            == "no_coverage"
        )
        with psycopg.connect(test_url) as conn:
            assert conn.execute("SELECT count(*) FROM context_features").fetchone()[0] == 2
            conn.execute((scripts / "002_context.down.sql").read_text(encoding="utf-8"))
            assert conn.execute("SELECT count(*) FROM observations").fetchone()[0] == 0
        assert client.get("/layers").status_code == 503
    finally:
        with psycopg.connect(url, autocommit=True) as conn:
            conn.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))
