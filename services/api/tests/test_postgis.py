import os
from pathlib import Path
from uuid import uuid4

import psycopg
import pytest
from fastapi.testclient import TestClient
from psycopg import sql
from psycopg.conninfo import make_conninfo

from bosque_api.config import Settings
from bosque_api.main import create_app


@pytest.mark.integration
def test_postgis_observation_roundtrip():
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL ausente: integración PostGIS no ejecutada")
    schema = f"test_bosque_{uuid4().hex}"
    with psycopg.connect(url, autocommit=True) as conn:
        conn.execute("CREATE EXTENSION IF NOT EXISTS postgis")
        conn.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
    test_url = make_conninfo(url, options=f"-csearch_path={schema},public")
    try:
        with psycopg.connect(test_url) as conn:
            conn.execute((Path(__file__).parents[1] / "sql/001_init.sql").read_text())
        client = TestClient(
            create_app(Settings(_env_file=None, database_url=test_url, ai_provider="mock"))
        )
        for location in [None, {"type": "Point", "coordinates": [0, 0]}]:
            response = client.post(
                "/observations",
                json={
                    "species_id": "nothofagus-dombeyi",
                    "notes": "Sintético: ' ;",
                    "location": location,
                },
            )
            assert response.status_code == 201, response.text
            saved = response.json()
            assert saved["notes"] == "Sintético: ' ;"
            assert saved["location"] == location
            assert saved["verification_status"] == "unverified"
        listed = client.get("/observations").json()
        assert len(listed) == 2
        assert len(client.get("/observations?limit=1").json()) == 1
        assert client.get("/observations?limit=101").status_code == 422
    finally:
        with psycopg.connect(url, autocommit=True) as conn:
            conn.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))
