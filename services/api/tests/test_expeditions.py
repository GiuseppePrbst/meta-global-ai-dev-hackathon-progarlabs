import json
import os
import wave
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from io import BytesIO
from pathlib import Path
from uuid import uuid4

import httpx
import psycopg
import pytest
from bosque_ai.contracts import Candidate, Identification
from bosque_ai.guide import GuideToolError
from bosque_ai.meta import MetaResponsesClient
from fastapi import HTTPException
from fastapi.testclient import TestClient
from PIL import Image
from psycopg import sql
from psycopg.conninfo import make_conninfo

from bosque_api.capture_store import CaptureStore
from bosque_api.config import Settings
from bosque_api.execution import ExecutionStore
from bosque_api.expeditions import CaptureAttempt
from bosque_api.guide_tools import execute_tool
from bosque_api.main import create_app

ALICE = {"Authorization": "Bearer test-alice"}
BOB = {"Authorization": "Bearer test-bob"}


def config(**kwargs):
    return Settings(
        _env_file=None, demo_tokens={"alice": "test-alice", "bob": "test-bob"}, **kwargs
    )


def photo():
    output = BytesIO()
    Image.new("RGB", (3, 3), "green").save(output, "PNG")
    return output.getvalue()


def audio():
    output = BytesIO()
    with wave.open(output, "wb") as recording:
        recording.setparams((1, 2, 16000, 0, "NONE", "not compressed"))
        recording.writeframes(b"\x00" * 3200)
    return output.getvalue()


def attempt(identifier, **kwargs):
    return {
        "identification_id": str(identifier),
        "idempotency_key": "synthetic-key",
        "observed_at": (datetime.now(UTC) - timedelta(minutes=1)).isoformat(),
        **kwargs,
    }


def test_new_private_routes_authorize_before_parsing_in_local_and_demo():
    for mode in ("local", "demo"):
        client = TestClient(create_app(config(service_mode=mode)))
        for path in ("/guide/transcribe", "/guide/query", "/captures/attempts"):
            assert client.post(path, content=b"corrupt").status_code == 401
        assert client.get("/captures/me").status_code == 401
        assert client.get("/captures/me", headers=ALICE).status_code == 503


@pytest.mark.parametrize(
    "changes",
    [
        {"location": {"coordinates": [181, 0]}, "location_consent": True},
        {"location": {"coordinates": [0, 0]}},
        {"accuracy_m": 10},
        {"observed_at": "invalid"},
        {"observed_at": "2020-01-01T00:00:00"},
        {"observed_at": "2099-01-01T00:00:00Z"},
        {"owner_id": "bob"},
        {"taxonomic_verification_status": "verified"},
        {"expedition_id": "invented"},
        {"location": {"coordinates": [0, 0]}, "location_consent": True, "accuracy_m": 201},
    ],
)
def test_capture_validation_at_http_boundary(changes):
    client = TestClient(create_app(config()))
    assert (
        client.post(
            "/captures/attempts", headers=ALICE, json=attempt(uuid4(), **changes)
        ).status_code
        == 422
    )


def test_multiview_compatibility_and_invalid_extra_images():
    client = TestClient(create_app(config()))
    files = [("file", ("synthetic.png", photo(), "image/png"))]
    data = {"adult_confirmed": True, "rights_confirmed": True}
    result = client.post("/identify", files=files, data=data)
    assert result.status_code == 200 and result.json()["identification_id"] is None
    result = client.post(
        "/identify",
        files=files + [("additional_files", ("synthetic.png", photo(), "image/png"))] * 2,
        data=data,
    )
    assert result.status_code == 200 and result.json()["provider"] == "mock"
    assert (
        client.post(
            "/identify",
            files=files + [("additional_files", ("bad.png", b"corrupt", "image/png"))],
            data=data,
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/identify",
            files=files + [("additional_files", ("synthetic.png", photo(), "image/png"))] * 3,
            data=data,
        ).status_code
        == 422
    )
    assert (
        client.post("/identify", files=files, data={**data, "views": ["invented"]}).status_code
        == 422
    )


def test_mock_voice_is_explicit_and_never_invents_transcription():
    client = TestClient(create_app(config()))
    result = client.post(
        "/guide/transcribe",
        headers=ALICE,
        files={"file": ("synthetic.wav", audio(), "audio/wav")},
        data={"adult_confirmed": True, "rights_confirmed": True},
    )
    assert result.status_code == 200
    assert result.json()["provider"] == "mock" and result.json()["transcript"] == ""
    answer = client.post(
        "/guide/query", headers=ALICE, json={"question": "¿Ulmo?", "adult_confirmed": True}
    ).json()
    assert answer["insufficient_evidence"] and answer["sources"] == []


@pytest.mark.parametrize(
    "name,args",
    [
        ("delete_observations", {}),
        ("get_user_capture_progress", {"user_id": "bob"}),
        ("get_species_profile", {"species_id": "invented"}),
        ("get_forest_context", {"area_id": "arbitrary-private-area"}),
    ],
)
def test_tool_allowlist_and_identity_arguments(name, args):
    with pytest.raises((ValueError, GuideToolError)):
        execute_tool(name, args, owner="alice", store=None, landscape_context=None)


def test_new_meta_operations_require_budget_before_audio_decode(monkeypatch):
    monkeypatch.setattr(
        "bosque_api.expedition_routes.prepare_audio",
        lambda *a: pytest.fail("Decoded without budget"),
    )
    client = TestClient(
        create_app(config(ai_provider="meta", meta_enabled=True, model_api_key="test-only"))
    )
    response = client.post(
        "/guide/transcribe",
        headers=ALICE,
        files={"file": ("synthetic.wav", audio(), "audio/wav")},
        data={
            "adult_confirmed": True,
            "rights_confirmed": True,
            "external_processing_confirmed": True,
        },
    )
    assert response.status_code == 503
    assert (
        client.post(
            "/guide/query",
            headers=ALICE,
            json={
                "question": "test",
                "adult_confirmed": True,
                "external_processing_confirmed": True,
            },
        ).status_code
        == 503
    )


@pytest.fixture
def database():
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL required")
    schema = "expedition_test_" + uuid4().hex
    with psycopg.connect(url, autocommit=True) as conn:
        conn.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
    scoped = make_conninfo(url, options=f"-csearch_path={schema},public")
    scripts = Path(__file__).parents[1] / "sql"
    try:
        with psycopg.connect(scoped) as conn:
            for name in (
                "001_init.sql",
                "002_context.up.sql",
                "003_execution.up.sql",
                "004_expeditions.up.sql",
            ):
                conn.execute((scripts / name).read_text())
        yield scoped
    finally:
        with psycopg.connect(url, autocommit=True) as conn:
            conn.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))


@pytest.mark.integration
def test_capture_http_roundtrip_idempotency_ownership_retention_and_deletion(database):
    client = TestClient(create_app(config(service_mode="demo", database_url=database)))
    result = client.post(
        "/identify",
        headers=ALICE,
        files={"file": ("synthetic.png", photo(), "image/png")},
        data={"adult_confirmed": True, "rights_confirmed": True},
    )
    assert result.status_code == 200, result.text
    identifier = result.json()["identification_id"]
    payload = attempt(identifier)
    assert client.post("/captures/attempts", headers=BOB, json=payload).status_code == 404
    response = client.post("/captures/attempts", headers=ALICE, json=payload)
    assert response.status_code == 201, response.text
    capture = response.json()
    assert capture["location"] is None and capture["species_id"] is None
    assert capture["capture_status"] == "registered"
    assert capture["observation_id"] == capture["capture_id"]
    replay = client.post("/captures/attempts", headers=ALICE, json=payload)
    assert replay.status_code == 200 and replay.json() == capture
    changed = {**payload, "observed_at": "2020-01-01T00:00:00Z"}
    assert client.post("/captures/attempts", headers=ALICE, json=changed).status_code == 409
    assert client.get("/captures/me", headers=BOB).json()["total_captures"] == 0
    assert client.get("/captures/me", headers=ALICE).json()["total_captures"] == 1
    assert client.get("/observations", headers=ALICE).json()[0]["id"] == capture["capture_id"]
    legacy = TestClient(create_app(config(database_url=database)))
    assert legacy.get("/observations").json() == []
    route = f"/captures/{capture['capture_id']}"
    assert client.get(route, headers=BOB).status_code == 404
    assert client.delete(route, headers=BOB).status_code == 404
    assert client.delete(route, headers=ALICE).status_code == 204
    assert client.get(route, headers=ALICE).status_code == 404
    with psycopg.connect(database) as conn:
        assert conn.execute("SELECT count(*) FROM identifications").fetchone()[0] == 0


@pytest.mark.integration
def test_candidates_concurrent_capture_and_expired_evidence(database):
    store = CaptureStore(database)
    identification = store.save_identification(
        "alice",
        Identification(
            status="candidates",
            provider="meta",
            model="test-mock-transport",
            execution_status="completed",
            message="Synthetic evidence, not a real botanical result",
            candidates=[Candidate(species_id="nothofagus-dombeyi", evidence="synthetic")],
        ),
    )
    item = CaptureAttempt.model_validate(
        attempt(
            identification.identification_id,
            species_id="nothofagus-dombeyi",
            location={"coordinates": [0, 0]},
            location_consent=True,
            accuracy_m=100,
        )
    )
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: store.create("alice", item), range(2)))
    assert sorted(created for _, created in results) == [False, True]
    capture = results[0][0]
    assert capture.capture_status == "identification_suggested"
    assert capture.taxonomic_verification_status == "unverified"
    assert capture.location_visibility == "private"
    assert capture.quality_flags == ["low_reported_gps_accuracy"]
    bad = item.model_copy(update={"identification_id": uuid4(), "idempotency_key": "another-key"})
    with pytest.raises(HTTPException) as absent:
        store.create("alice", bad)
    assert absent.value.status_code == 404
    with psycopg.connect(database) as conn:
        with pytest.raises(psycopg.errors.RaiseException):
            conn.execute((Path(__file__).parents[1] / "sql/004_expeditions.down.sql").read_text())
    with psycopg.connect(database) as conn:
        conn.execute("UPDATE identifications SET created_at=now()-interval '31 days'")
    assert store.collection("alice", 100, 0).total_captures == 0
    with pytest.raises(HTTPException):
        store.get("alice", capture.capture_id)
    with pytest.raises(HTTPException) as expired:
        store.create("alice", item)
    assert expired.value.status_code == 410
    assert store.purge_expired() == 1
    with psycopg.connect(database) as conn:
        assert conn.execute("SELECT count(*) FROM observations").fetchone()[0] == 0
        conn.execute((Path(__file__).parents[1] / "sql/004_expeditions.down.sql").read_text())


@pytest.mark.integration
def test_spatial_reference_outside_is_flagged_and_never_relabels_species(database, monkeypatch):
    from bosque_geo.context import ContextLayer
    from shapely.geometry import box, mapping

    from bosque_api.context_store import ContextStore

    monkeypatch.setattr("bosque_api.capture_store.REFERENCE_LAYER", ("synthetic", "one", "1" * 64))
    layer = ContextLayer(
        id="synthetic",
        kind="protected",
        producer="SYNTHETIC",
        distributor="SYNTHETIC",
        source_url="https://example.org/synthetic",
        version="fixture-1",
        accessed_at="2026-10-29",
        source_crs="EPSG:4326",
        license="LicenseRef-ProGarLabs-Pending",
        attribution="Synthetic test only",
        rights_status="source_terms_checked",
        geometry_status="pilot_checked",
        taxonomy_status="not_applicable",
        content_sha256="1" * 64,
        limitations=["SYNTHETIC; no real protected area"],
    )
    ContextStore(database).ingest(
        layer, [{"id": "one", "properties": {}, "geometry": mapping(box(-1, -1, 1, 1))}]
    )
    store = CaptureStore(database)
    for point, expected in [
        ([0, 0], "inside_reference"),
        ([2, 0], "outside_reference"),
        ([1, 0], "inside_reference"),
    ]:
        result = store.save_identification(
            "alice",
            Identification(status="insufficient_evidence", provider="mock", message="synthetic"),
        )
        item = CaptureAttempt.model_validate(
            attempt(
                result.identification_id,
                idempotency_key=uuid4().hex,
                location={"coordinates": point},
                location_consent=True,
            )
        )
        capture, _ = store.create("alice", item)
        assert capture.spatial_status == expected and capture.species_id is None
        assert capture.taxonomic_verification_status == "unverified"


def test_catalog_reference_traits_are_sourced_without_field_verification():
    from bosque_api.catalog import get_species

    for species in get_species():
        assert species.trait_sources and species.morphology
        assert species.trait_validation_status == "source_checked"
        assert species.conservation_status is None
        assert species.taxonomic_status == "provisional"


def test_published_contract_examples_validate_and_legacy_inputs_remain_required():
    from bosque_ai.guide import GuideAnswer
    from bosque_ai.voice import Transcription
    from bosque_geo.context import ContextResponse

    from bosque_api.expeditions import Capture, Collection, Expedition

    models = {
        m.__name__: m
        for m in (
            Identification,
            GuideAnswer,
            Transcription,
            ContextResponse,
            Capture,
            Collection,
            Expedition,
        )
    }
    examples = json.loads(
        (Path(__file__).parents[3] / "evaluations/expeditions-contract-examples.json").read_text(
            "utf-8"
        )
    )
    assert len(examples["examples"]) >= 16
    for example in examples["examples"]:
        if example["contract_model"]:
            models[example["contract_model"]].model_validate(example["body"])
    schema = create_app(config()).openapi()
    ident = schema["components"]["schemas"]["Identification"]
    assert ident["properties"]["status"]["enum"] == ["candidates", "insufficient_evidence"]
    multipart = schema["paths"]["/identify"]["post"]["requestBody"]["content"][
        "multipart/form-data"
    ]
    name = multipart["schema"]["$ref"].split("/")[-1]
    assert schema["components"]["schemas"][name]["required"] == [
        "file",
        "adult_confirmed",
        "rights_confirmed",
    ]
    assert schema["paths"]["/guide/query"]["post"]["security"] == [{"DemoBearer": []}]
    client = TestClient(create_app(config()))
    assert client.get("/expeditions").json()[0]["verified_trails"] == []
    assert client.get("/expeditions/puyehue").status_code == 200
    assert client.get("/expeditions/invented").status_code == 404


@pytest.mark.integration
def test_delete_unlinked_evidence_and_observation_deletion_cleans_capture(database):
    client = TestClient(create_app(config(service_mode="demo", database_url=database)))
    store = CaptureStore(database)
    result = store.save_identification(
        "alice",
        Identification(status="insufficient_evidence", provider="mock", message="synthetic"),
    )
    path = f"/identifications/{result.identification_id}"
    assert client.delete(path, headers=BOB).status_code == 404
    assert client.delete(path, headers=ALICE).status_code == 204
    assert client.delete(path, headers=ALICE).status_code == 404
    result = store.save_identification(
        "alice",
        Identification(status="insufficient_evidence", provider="mock", message="synthetic"),
    )
    capture, _ = store.create(
        "alice", CaptureAttempt.model_validate(attempt(result.identification_id))
    )
    assert client.delete(f"/observations/{capture.capture_id}", headers=ALICE).status_code == 204
    with psycopg.connect(database) as conn:
        assert conn.execute("SELECT count(*) FROM identifications").fetchone()[0] == 0


def test_guide_forest_context_keeps_exact_location_in_backend():
    from types import SimpleNamespace

    from bosque_geo.context import ContextResponse
    from bosque_geo.contracts import Point

    point = Point(coordinates=[0, 0])

    class Store:
        def get(self, owner, identifier):
            assert owner == "alice"
            return SimpleNamespace(location=point, accuracy_m=15)

    def context(request):
        assert request.location == point and request.accuracy_m == 15
        return ContextResponse(
            status="no_coverage",
            forest_context=[],
            protected_context=[],
            source_refs=[],
            coverage=[],
            quality_flags=[],
            limitations=["synthetic"],
            taxonomy_version="synthetic",
        )

    result = execute_tool(
        "get_forest_context",
        {"area_id": "current_capture"},
        owner="alice",
        store=Store(),
        capture_id=uuid4(),
        landscape_context=context,
    )
    assert result["data"]["status"] == "no_coverage"
    assert "coordinates" not in json.dumps(result) and result["sources"] == []


@pytest.mark.integration
def test_voice_guide_http_with_real_ledger_and_mocked_meta(database, monkeypatch):
    requests = []

    def handle(request):
        requests.append(request.url.path)
        if request.url.path.endswith("asr/transcribe"):
            return httpx.Response(200, json={"transcript": "¿Qué nombre tiene el coigüe?"})
        body = json.loads(request.content)
        if "tools" in body:
            message = {
                "tool_calls": [
                    {
                        "id": "one",
                        "type": "function",
                        "function": {
                            "name": "get_species_profile",
                            "arguments": '{"species_id":"nothofagus-dombeyi"}',
                        },
                    }
                ]
            }
            reason = "tool_calls"
        else:
            message = {
                "content": json.dumps(
                    {
                        "answer": "Nombre: Nothofagus dombeyi.",
                        "source_ids": ["species:nothofagus-dombeyi"],
                        "insufficient_evidence": False,
                    }
                )
            }
            reason = "stop"
        return httpx.Response(
            200,
            json={
                "choices": [{"finish_reason": reason, "message": message}],
                "usage": {"prompt_tokens": 4},
            },
        )

    original = MetaResponsesClient.__init__
    monkeypatch.setattr(
        MetaResponsesClient,
        "__init__",
        lambda self, key, timeout: original(
            self, key, timeout, transport=httpx.MockTransport(handle)
        ),
    )
    settings = config(
        service_mode="demo",
        database_url=database,
        ai_provider="meta",
        meta_enabled=True,
        model_api_key="test",
        voice_reservation_units=10,
        guide_reservation_units=20,
        budget_units=30,
    )
    client = TestClient(create_app(settings))
    response = client.post(
        "/guide/transcribe",
        headers=ALICE,
        files={"file": ("synthetic.wav", audio(), "audio/wav")},
        data={
            "adult_confirmed": True,
            "rights_confirmed": True,
            "external_processing_confirmed": True,
        },
    )
    assert response.status_code == 200, response.text
    answer = client.post(
        "/guide/query",
        headers=ALICE,
        json={
            "question": response.json()["transcript"],
            "adult_confirmed": True,
            "external_processing_confirmed": True,
        },
    )
    assert answer.status_code == 200, answer.text
    assert answer.json()["tools_used"] == ["get_species_profile"]
    assert answer.json()["sources"][0]["scope"] == "taxonomy_only"
    assert len(requests) == 3
    with pytest.raises(HTTPException) as budget:
        ExecutionStore(settings).reserve("alice", "guide")
    assert budget.value.status_code == 429
    with psycopg.connect(database) as conn:
        records = conn.execute(
            "SELECT operation,status,reported_usage::text FROM execution_reservations"
        ).fetchall()
        assert len(records) == 2 and all(r[1] == "completed" for r in records)
        assert "coigüe" not in str(records) and "test-alice" not in str(records)


@pytest.mark.integration
@pytest.mark.parametrize("failure", ["stt_error", "tool_error", "llm_error"])
def test_provider_and_tool_errors_remain_distinct_and_sanitized(database, monkeypatch, failure):
    def handle(request):
        if failure == "stt_error":
            return httpx.Response(503, json={"error": "PRIVATE UPSTREAM BODY"})
        if failure == "tool_error":
            return httpx.Response(
                200,
                json={
                    "choices": [
                        {
                            "finish_reason": "tool_calls",
                            "message": {
                                "tool_calls": [
                                    {
                                        "id": "bad",
                                        "type": "function",
                                        "function": {
                                            "name": "delete_observations",
                                            "arguments": "{}",
                                        },
                                    }
                                ]
                            },
                        }
                    ]
                },
            )
        return httpx.Response(200, json={"private": "PRIVATE UPSTREAM BODY"})

    original = MetaResponsesClient.__init__
    monkeypatch.setattr(
        MetaResponsesClient,
        "__init__",
        lambda self, key, timeout: original(
            self, key, timeout, transport=httpx.MockTransport(handle)
        ),
    )
    client = TestClient(
        create_app(
            config(
                service_mode="demo",
                database_url=database,
                ai_provider="meta",
                meta_enabled=True,
                model_api_key="test-only-key",
                voice_reservation_units=10,
                guide_reservation_units=20,
                budget_units=100,
            )
        )
    )
    if failure == "stt_error":
        response = client.post(
            "/guide/transcribe",
            headers=ALICE,
            files={"file": ("synthetic.wav", audio(), "audio/wav")},
            data={
                "adult_confirmed": True,
                "rights_confirmed": True,
                "external_processing_confirmed": True,
            },
        )
    else:
        response = client.post(
            "/guide/query",
            headers=ALICE,
            json={
                "question": "test",
                "adult_confirmed": True,
                "external_processing_confirmed": True,
            },
        )
    assert response.status_code == 502, response.text
    assert response.json()["detail"]["code"] == failure
    assert "PRIVATE" not in response.text and "test-only-key" not in response.text
    with psycopg.connect(database) as conn:
        assert (
            conn.execute("SELECT status FROM execution_reservations").fetchone()[0]
            == "provider_error"
        )
