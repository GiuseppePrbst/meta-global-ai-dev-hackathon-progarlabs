import hashlib
import json
import os
import runpy
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from pathlib import Path
from uuid import uuid4

import httpx
import psycopg
import pytest
from bosque_ai.meta import MetaResponsesClient
from fastapi import HTTPException
from fastapi.testclient import TestClient
from PIL import Image
from psycopg import sql
from psycopg.conninfo import make_conninfo

from bosque_api.config import Settings
from bosque_api.database import ObservationStore
from bosque_api.execution import ExecutionStore
from bosque_api.main import create_app


def photo():
    output = BytesIO()
    Image.new("RGB", (4, 4), "green").save(output, "PNG")
    return output.getvalue()


def demo(**kwargs):
    return Settings(
        _env_file=None, service_mode="demo", demo_tokens={"alice": "test-alice"}, **kwargs
    )


def test_unauthorized_before_body_parsing_or_image_decode(monkeypatch):
    def decode(*args):
        pytest.fail("Unauthorized image decoded")

    monkeypatch.setattr("bosque_api.main.prepare_image", decode)
    client = TestClient(create_app(demo()))
    for route in ("/identify", "/observations", "/forest/analyze", "/context/point"):
        response = client.post(route, content=b"invalid")
        assert response.status_code == 401
        assert response.headers["X-Correlation-ID"]
    assert client.get("/observations").status_code == 401
    cross_origin = client.get("/observations", headers={"Origin": "http://localhost:3000"})
    assert cross_origin.status_code == 401
    assert cross_origin.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert client.get("/species").status_code == 200
    assert (
        client.post(
            "/identify", content=b"invalid", headers={"Authorization": "Bearer test-alice"}
        ).status_code
        == 422
    )


def test_missing_global_budget_fails_before_decode(monkeypatch):
    monkeypatch.setattr("bosque_api.main.prepare_image", lambda *args: pytest.fail("Decoded"))
    config = demo(ai_provider="meta", meta_enabled=True, model_api_key="test-only")
    client = TestClient(create_app(config))
    response = client.post(
        "/identify",
        files={"file": ("image.png", photo(), "image/png")},
        data={"adult_confirmed": True, "rights_confirmed": True},
        headers={"Authorization": "Bearer test-alice"},
    )
    assert response.status_code == 503
    assert "test-only" not in response.text


async def test_evaluation_empty_and_paid_runner_require_shared_admission(tmp_path, monkeypatch):
    runner = runpy.run_path(str(Path(__file__).parents[3] / "evaluations/run.py"))["run"]
    manifest = tmp_path / "cases.json"
    manifest.write_text("[]")
    assert (await runner(manifest, tmp_path, "meta", True))["summary"]["status"] == "not_evaluated"
    manifest.write_text(
        json.dumps(
            [
                {
                    "case_id": "synthetic",
                    "species_id": None,
                    "file": "does-not-exist.png",
                    "sha256": "1" * 64,
                    "license": "synthetic",
                    "source": "synthetic",
                    "authorized": True,
                    "external_processing_authorized": True,
                    "photo_type": "synthetic",
                    "reviewer": "test",
                    "individual_id": "one",
                    "partition": "test",
                    "validation_status": "synthetic",
                    "campaign_id": "one",
                    "spatial_block": "one",
                    "perceptual_group": "one",
                    "perceptual_duplicates_reviewed": True,
                }
            ]
        )
    )
    monkeypatch.setenv("MODEL_API_KEY", "test-only")
    monkeypatch.setenv("SERVICE_MODE", "local")
    with pytest.raises(ValueError, match="modo demo"):
        await runner(manifest, tmp_path, "meta", True)
    content = photo()
    (tmp_path / "does-not-exist.png").write_bytes(content)
    cases = json.loads(manifest.read_text())
    cases[0]["sha256"] = hashlib.sha256(content).hexdigest()
    manifest.write_text(json.dumps(cases))
    monkeypatch.setenv("SERVICE_MODE", "demo")
    monkeypatch.setenv("META_ENABLED", "true")
    monkeypatch.setenv("DEMO_TOKENS", '{"alice":"test-only"}')

    class BlockedLedger:
        def __init__(self, config):
            pass

        def reserve(self, owner, operation):
            raise HTTPException(429, "test quota")

    runner.__globals__["ExecutionStore"] = BlockedLedger
    blocked = await runner(manifest, tmp_path, "meta", True)
    assert blocked["results"] == []
    assert blocked["admission_error"]["http_status"] == 429


def test_sam_failure_is_optional_and_muse_usage_is_typed(monkeypatch):
    calls = []

    def handle(request):
        calls.append(request.url.path)
        if request.url.path.endswith("/responses"):
            return httpx.Response(503, json={"error": {"message": "private provider body"}})
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "finish_reason": "stop",
                        "message": {
                            "content": json.dumps(
                                {
                                    "candidates": [],
                                    "limitations": ["synthetic"],
                                    "message": "Más evidencia",
                                }
                            )
                        },
                    }
                ],
                "usage": {"prompt_tokens": 10},
            },
        )

    original = MetaResponsesClient.__init__

    def initialize(self, key, timeout):
        original(self, key, timeout, transport=httpx.MockTransport(handle))

    monkeypatch.setattr(MetaResponsesClient, "__init__", initialize)
    client = TestClient(
        create_app(
            Settings(
                _env_file=None,
                ai_provider="meta",
                meta_enabled=True,
                sam_enabled=True,
                model_api_key="test-only",
                meta_access_token="local-test",
            )
        )
    )
    result = client.post(
        "/identify",
        files={"file": ("image.png", photo(), "image/png")},
        data={"adult_confirmed": True, "rights_confirmed": True},
        headers={"Authorization": "Bearer local-test"},
    )
    assert result.status_code == 200, result.text
    assert result.json()["segmentation_status"] == "error"
    assert result.json()["stage_usage"]["identification"] == {"prompt_tokens": 10}
    assert len(calls) == 2
    assert "private provider body" not in result.text


@pytest.mark.integration
def test_global_budget_concurrent_workers_ownership_and_recovery():
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL required")
    schema = "execution_test_" + uuid4().hex
    scripts = Path(__file__).parents[1] / "sql"
    with psycopg.connect(url, autocommit=True) as conn:
        conn.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
    scoped = make_conninfo(url, options=f"-csearch_path={schema},public")
    try:
        with psycopg.connect(scoped) as conn:
            conn.execute((scripts / "001_init.sql").read_text())
            conn.execute((scripts / "003_execution.up.sql").read_text())
        config = demo(
            database_url=scoped,
            budget_units=200,
            meta_reservation_units=100,
            budget_requests=2,
            budget_requests_per_identity=1,
        )

        def admit(owner):
            try:
                return ExecutionStore(config).reserve(owner, "identify")
            except HTTPException as exc:
                return exc.status_code

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(admit, ["alice", "bob"]))
        assert sum(value == 429 for value in results) == 1
        reservation = next(value for value in results if value != 429)
        with psycopg.connect(scoped) as conn:
            conn.execute("UPDATE execution_reservations SET expires_at=now()-interval '1 second'")
            owner = conn.execute("SELECT identity_id FROM execution_reservations").fetchone()[0]
        with pytest.raises(HTTPException) as limit:
            ExecutionStore(config).reserve(owner, "identify")
        assert limit.value.status_code == 429  # Expiry never refunds consumed budget.
        other = "bob" if owner == "alice" else "alice"
        second = ExecutionStore(config).reserve(other, "identify")
        ExecutionStore(config).finish(second, "completed", {"total_tokens": 12})
        with pytest.raises(HTTPException):
            ExecutionStore(config).reserve("third", "identify")
        client = TestClient(create_app(config))
        headers = {"Authorization": "Bearer test-alice"}
        saved = client.post(
            "/observations",
            json={
                "notes": "private",
                "location": {"coordinates": [-72.08, -40.68]},
                "accuracy_m": 8,
            },
            headers=headers,
        )
        assert saved.status_code == 201, saved.text
        assert saved.json()["accuracy_m"] == 8
        identifier = saved.json()["id"]
        assert (
            client.post("/observations", json={"accuracy_m": 8}, headers=headers).status_code == 422
        )
        with psycopg.connect(scoped) as conn:
            with pytest.raises(psycopg.errors.RaiseException):
                conn.execute((scripts / "003_execution.down.sql").read_text())
        assert len(client.get("/observations", headers=headers).json()) == 1
        other_client = TestClient(
            create_app(
                Settings(
                    _env_file=None,
                    service_mode="demo",
                    database_url=scoped,
                    demo_tokens={"bob": "test-bob"},
                )
            )
        )
        bob = {"Authorization": "Bearer test-bob"}
        assert other_client.get("/observations", headers=bob).json() == []
        assert other_client.delete(f"/observations/{identifier}", headers=bob).status_code == 404
        assert client.delete(f"/observations/{identifier}", headers=headers).status_code == 204
        store = ObservationStore(scoped)
        from bosque_api.models import ObservationCreate

        expired = store.create(ObservationCreate(notes="expired"), "alice")
        with psycopg.connect(scoped) as conn:
            conn.execute(
                "UPDATE observations SET created_at=now()-interval '31 days' WHERE id=%s",
                (expired.id,),
            )
        assert store.list(10, "alice", 30) == []
        assert store.purge_expired(30) == 1
        # Moving to a new UTC day must not refund a cumulative research budget.
        with psycopg.connect(scoped) as conn:
            conn.execute(
                "UPDATE execution_reservations SET window_date=CURRENT_DATE-1, status='completed'"
            )
        lifetime = config.model_copy(update={"budget_lifetime_units": 200})
        with pytest.raises(HTTPException) as exhausted:
            ExecutionStore(lifetime).reserve("alice", "identify")
        assert exhausted.value.status_code == 429
        # Existing daily-only callers retain their admission behavior.
        daily = ExecutionStore(config).reserve("alice", "identify")
        ExecutionStore(config).finish(daily, "completed", {})
        with psycopg.connect(scoped) as conn:
            conn.execute((scripts / "003_execution.down.sql").read_text())
            assert conn.execute("SELECT count(*) FROM observations").fetchone()[0] == 0
        with pytest.raises(HTTPException) as unavailable:
            ExecutionStore(config).reserve("alice", "identify")
        assert unavailable.value.status_code == 503
        assert reservation is not None
    finally:
        with psycopg.connect(url, autocommit=True) as conn:
            conn.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))


@pytest.mark.integration
def test_research_profile_skips_daily_counter_but_keeps_money_and_atomic_owner_cap():
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL required")
    schema = "execution_test_" + uuid4().hex
    scripts = Path(__file__).parents[1] / "sql"
    with psycopg.connect(url, autocommit=True) as conn:
        conn.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
    scoped = make_conninfo(url, options=f"-csearch_path={schema},public")
    try:
        with psycopg.connect(scoped) as conn:
            conn.execute((scripts / "001_init.sql").read_text())
            conn.execute((scripts / "003_execution.up.sql").read_text())
        common = dict(
            database_url=scoped,
            budget_units=10_000,
            budget_lifetime_units=1_000,
            meta_reservation_units=100,
            budget_requests=2,
            budget_requests_per_identity=2,
            budget_concurrency=8,
        )
        normal = demo(**common)
        ExecutionStore(normal).reserve("p", "identify")
        ExecutionStore(normal).reserve("p", "identify")
        with pytest.raises(HTTPException):  # production profile keeps its daily counter
            ExecutionStore(normal).reserve("p", "identify")
        research = demo(**common, budget_daily_requests_enabled=False)

        def settle():  # completed reservations stay charged but free concurrency
            with psycopg.connect(scoped) as conn:
                conn.execute("UPDATE execution_reservations SET status='completed'")

        settle()

        def admit(_):
            try:
                ExecutionStore(research).reserve("phase", "identify", owner_cap_units=500)
                return "ok"
            except HTTPException as exc:
                return exc.status_code

        with ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(admit, range(8)))
        assert results.count("ok") == 5  # owner cap 500 = 5 x 100, atomic under 8 workers
        settle()
        ExecutionStore(research).reserve("other", "identify")  # beyond 2/day: no counter
        ExecutionStore(research).reserve("other", "identify")
        settle()
        ExecutionStore(research).reserve("other", "identify")  # 2+5+3 = 1000 units: full
        settle()
        with pytest.raises(HTTPException) as lifetime:  # cumulative money cap refuses
            ExecutionStore(research).reserve("other", "identify")
        assert lifetime.value.status_code == 429
        with psycopg.connect(scoped) as conn:
            assert (
                conn.execute("SELECT sum(reserved_units) FROM execution_reservations").fetchone()[0]
                <= 1_000
            )
    finally:
        with psycopg.connect(url, autocommit=True) as conn:
            conn.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))
