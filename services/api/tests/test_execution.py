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


def test_phase_i_without_snapshot_fails_before_database_access():
    with pytest.raises(HTTPException) as error:
        ExecutionStore(Settings(_env_file=None)).reserve("sam-api-lab:I", "identify", 1000)
    assert error.value.status_code == 503


def test_phase_i_without_phase_cap_fails_before_database_access():
    with pytest.raises(HTTPException) as error:
        ExecutionStore(Settings(_env_file=None)).reserve(
            "sam-api-lab:I", "identify", credit_snapshot=(None, 1000)
        )
    assert error.value.status_code == 503


def test_phase_i_rejects_manually_constructed_snapshot_tuple():
    with pytest.raises(HTTPException) as error:
        ExecutionStore(Settings(_env_file=None)).reserve(
            "sam-api-lab:I", "identify", 1000, credit_snapshot=("2026-11-03", 10**15)
        )
    assert error.value.status_code == 503


def test_research_lab_cannot_use_legacy_owner_without_phase():
    settings = Settings(_env_file=None, budget_lifetime_units=2_000_000)
    with pytest.raises(HTTPException) as error:
        ExecutionStore(settings).reserve("sam-api-lab", "identify")
    assert error.value.status_code == 503


def demo(**kwargs):
    return Settings(
        _env_file=None, service_mode="demo", demo_tokens={"alice": "test-alice"}, **kwargs
    )


def synthetic_credit_authorization(tmp_path, queue, checked_at, observed_usd):
    from datetime import timedelta

    from evaluations.sam_workers.schemas import register_financial_authorization

    evidence = tmp_path / "evidence"
    evidence.write_bytes(b"synthetic evidence")
    authorization = tmp_path / "authorization.json"
    authorization.write_text(
        json.dumps(
            {
                "campaign_id": "test",
                "responsible": "owner",
                "source_kind": "provider_verified",
                "source": "synthetic evidence",
                "evidence_sha256": hashlib.sha256(evidence.read_bytes()).hexdigest(),
                "observed_usd": observed_usd,
                "limit_usd": 0.001,
                "margin_usd": 0,
                "ledger_phase": "I",
                "checked_at": checked_at.isoformat(),
                "expires_at": (checked_at + timedelta(hours=1)).isoformat(),
            }
        )
    )
    identifier = register_financial_authorization(queue, authorization, evidence, "test", 0.001)
    return {
        "authorization_id": str(identifier),
        "authorization_file": str(authorization),
        "evidence_file": str(evidence),
        "campaign_id": "test",
    }


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
                identify_strategy="baseline",  # pins the legacy schema this mock returns
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


@pytest.mark.integration
def test_credit_snapshot_caps_all_post_snapshot_reservations_atomically(tmp_path):
    from evaluations.sam_workers.queue import Queue

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
        queue = Queue(scoped)
        queue.migrate()
        config = demo(
            database_url=scoped,
            budget_units=10000,
            budget_lifetime_units=10000,
            meta_reservation_units=100,
            budget_concurrency=8,
            budget_daily_requests_enabled=False,
        )
        store = ExecutionStore(config)
        historical = store.reserve("historical", "identify")
        store.finish(historical, "completed", {})
        store.reserve("uncertain", "identify")
        with psycopg.connect(scoped) as conn:
            snapshot = conn.execute("SELECT clock_timestamp()").fetchone()[0]
        admission = synthetic_credit_authorization(tmp_path, queue, snapshot, 0.0003)
        store.reserve("other", "identify")

        def reserve(_):
            try:
                store.reserve("sam-api-lab:I", "identify", 1000, credit_snapshot=admission)
                return "ok"
            except HTTPException as exc:
                return exc.status_code

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(reserve, range(2)))
        assert sorted(map(str, results)) == ["429", "ok"]
    finally:
        with psycopg.connect(url, autocommit=True) as conn:
            conn.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))


@pytest.mark.integration
def test_reservation_link_is_atomic_and_finish_requires_a_reserved_row(tmp_path):
    from evaluations.sam_workers.queue import Queue
    from evaluations.sam_workers.reconcile import inspect, resolve

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
        queue = Queue(scoped)
        queue.migrate()
        with queue.connect() as conn:
            assert conn.execute(
                "SELECT 1 FROM pg_constraint WHERE conrelid='sam_job_reservations'::regclass "
                "AND conname='sam_job_reservations_ledger_fk'"
            ).fetchone()
        spec = {
            "media_sha256": "d" * 64,
            "prompt": "fern",
            "model_version": "1",
            "protocol_version": "1",
            "protocol_approved_by": "test",
            "preprocessing_version": "1",
        }
        job = queue.enqueue("test", spec)
        owner = uuid4()
        assert queue.claim(owner)["job_id"] == job
        assert queue.start(job, owner)
        config = demo(
            database_url=scoped,
            budget_units=10000,
            budget_lifetime_units=10000,
            meta_reservation_units=100,
            budget_concurrency=8,
            budget_daily_requests_enabled=False,
        )
        store = ExecutionStore(config)
        with psycopg.connect(scoped) as conn:
            timestamp = conn.execute("SELECT now() - interval '1 minute'").fetchone()[0]
        admission = synthetic_credit_authorization(tmp_path, queue, timestamp, 0.001)
        with pytest.raises(HTTPException) as unregistered:
            store.reserve(
                "sam-api-lab:I",
                "identify",
                1000,
                credit_snapshot=admission | {"authorization_id": str(uuid4())},
            )
        assert unregistered.value.status_code == 503
        with pytest.raises(HTTPException) as excessive_cap:
            store.reserve("sam-api-lab:I", "identify", 1001, credit_snapshot=admission)
        assert excessive_cap.value.status_code == 503
        with pytest.raises(HTTPException) as wrong_campaign:
            store.reserve(
                "sam-api-lab:I",
                "identify",
                1000,
                credit_snapshot=admission | {"campaign_id": "other"},
            )
        assert wrong_campaign.value.status_code == 503
        evidence_path = Path(admission["evidence_file"])
        evidence_path.write_bytes(b"tampered")
        with pytest.raises(HTTPException) as changed:
            store.reserve("sam-api-lab:I", "identify", 1000, credit_snapshot=admission)
        assert changed.value.status_code == 503
        evidence_path.write_bytes(b"synthetic evidence")
        with pytest.raises(HTTPException) as invalid:
            store.reserve(
                "sam-api-lab:I",
                "identify",
                1000,
                credit_snapshot=admission,
                job_context=(job, uuid4(), 1),
            )
        assert invalid.value.status_code == 409
        with psycopg.connect(scoped) as conn:
            assert conn.execute("SELECT count(*) FROM execution_reservations").fetchone()[0] == 0
        reservation = store.reserve(
            "sam-api-lab:I",
            "identify",
            1000,
            credit_snapshot=admission,
            job_context=(job, owner, 1),
        )
        with psycopg.connect(scoped) as conn:
            assert conn.execute(
                "SELECT job_id,attempt FROM sam_job_reservations WHERE reservation_id=%s",
                (reservation,),
            ).fetchone() == (job, 1)
        store.finish(reservation, "completed", {})
        with pytest.raises(HTTPException) as repeated:
            store.finish(reservation, "completed", {})
        assert repeated.value.status_code == 409
        with queue.connect() as conn:
            conn.execute(
                "UPDATE sam_experiment_jobs SET lease_expires_at=now()-interval '1 second' "
                "WHERE job_id=%s",
                (job,),
            )
        queue.recover()
        output = tmp_path / str(job)
        output.mkdir()
        result_file = output / "result.json"
        result_file.write_text(
            json.dumps(
                {
                    "source_sha256": spec["media_sha256"],
                    "model": "sam-3.1",
                    "concept": "fern",
                    "job_id": str(job),
                    "job_attempt": 1,
                    "experiment_fingerprint": queue.get(job)["experiment_fingerprint"],
                    "reservation_id": str(reservation),
                    "status": "completed",
                    "cleanup": "pending",
                }
            )
        )
        assert inspect(queue, job, tmp_path)["identity_complete"]
        with pytest.raises(ValueError, match="cleanup"):
            resolve(queue, job, tmp_path, "completed", "reviewer", "checked evidence")
        evidence = json.loads(result_file.read_text())
        evidence["cleanup"] = "not_uploaded"
        result_file.write_text(json.dumps(evidence))
        assert (
            resolve(queue, job, tmp_path, "completed", "reviewer", "checked evidence")["job_status"]
            == "completed"
        )
        with pytest.raises(ValueError, match="not eligible"):
            resolve(queue, job, tmp_path, "completed", "reviewer", "checked evidence")
        with queue.connect() as conn:
            assert (
                conn.execute(
                    "SELECT count(*) AS n FROM sam_reconciliation_audit WHERE job_id=%s", (job,)
                ).fetchone()["n"]
                == 1
            )
            conn.execute(
                "UPDATE sam_financial_authorizations SET expires_at=now()-interval '1 second' "
                "WHERE authorization_id=%s",
                (admission["authorization_id"],),
            )
        with pytest.raises(HTTPException) as expired:
            store.reserve("sam-api-lab:I", "identify", 1000, credit_snapshot=admission)
        assert expired.value.status_code == 503
    finally:
        with psycopg.connect(url, autocommit=True) as conn:
            conn.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))
