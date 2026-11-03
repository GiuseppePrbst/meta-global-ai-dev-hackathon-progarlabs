"""Wilo: Knowledge Atlas routes, demo layer, tool safety, /guide/ask and the realtime proxy.

All audio here is synthetic silence; no Meta call leaves the process.
"""

import json
import re
import wave
from datetime import date
from io import BytesIO

import httpx
import pytest
from bosque_ai.guide import GuideToolError
from bosque_ai.meta import MetaResponsesClient
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from bosque_api import wilo
from bosque_api.atlas import Atlas, get_atlas, voice_keywords
from bosque_api.config import Settings
from bosque_api.execution import ExecutionStore
from bosque_api.guide_tools import TOOLS, execute_tool
from bosque_api.main import create_app

ALICE = {"Authorization": "Bearer test-alice"}


def config(**kwargs):
    return Settings(_env_file=None, demo_tokens={"alice": "test-alice"}, **kwargs)


def silence(seconds=0.2, rate=16000):
    output = BytesIO()
    with wave.open(output, "wb") as recording:
        recording.setparams((1, 2, rate, 0, "NONE", "not compressed"))
        recording.writeframes(b"\x00" * int(rate * 2 * seconds))
    return output.getvalue()


@pytest.fixture
def client():
    return TestClient(create_app(config(service_mode="demo")))


def tool(name, **args):
    return execute_tool(name, args, owner="alice", store=None, landscape_context=None)


# ---- Knowledge Atlas ------------------------------------------------------------------------


def test_snapshot_is_reproducible_from_repository_sources():
    from bosque_api.atlas_build import build

    assert build()["knowledge_version"] == get_atlas().version


def test_parks_are_public_and_cover_the_official_index(client):
    page = client.get("/parks", params={"limit": 100}).json()
    assert page["total"] == 46 and page["knowledge_version"].startswith("sha256:")
    lagos = client.get("/parks", params={"region": "los-lagos"}).json()
    assert "puyehue" in {p["id"] for p in lagos["items"]}
    assert client.get("/parks/no-existe").status_code == 404
    assert client.get("/trails/no-existe").status_code == 404


def test_puyehue_official_area_wins_over_secondary_conflicts(client):
    park = client.get("/parks/puyehue").json()
    assert park["area_ha"] == 112755 and park["live_status"] == "not_verified"
    assert set(park["sectors"]) == {"Anticura", "Antillanca", "Aguas Calientes"}
    area = [c for c in park["conflicts"] if c["field"] == "area_ha"]
    assert area and all(c["resolution"] == "official_preferred" for c in area)


def test_trails_keep_status_sources_and_never_geometry(client):
    official = client.get("/parks/puyehue/trails").json()
    assert {t["name"] for t in official} == {"El Indio", "La Princesa", "Repucura"}
    everything = client.get("/parks/puyehue/trails", params={"include_secondary": True}).json()
    pudu = next(t for t in everything if t["name"] == "Salto del Pudú")
    assert pudu["source_status"] == "secondary_reference"
    assert pudu["opening_status"] == "not_verified" and pudu["sources"][0]["type"] == "secondary"
    for trail in everything:
        assert trail["geometry"] is None and trail["geometry_available"] is False
    closed = client.get("/trails/villarrica-sendero-pichillancahue").json()
    assert closed["opening_status"] == "published_closure"
    assert "31 de diciembre de 2026" in closed["published_closure"]
    jeinimeni = client.get("/parks/patagonia/trails", params={"sector": "jeinimeni"}).json()
    assert jeinimeni and all(t["sector"] == "Jeinimeni" for t in jeinimeni)


def test_map_returns_bbox_without_inventing_a_boundary(client):
    conguillio = client.get("/parks/conguillio/map").json()
    assert conguillio["boundary_geometry"] is None and conguillio["boundary_unavailable_reason"]
    assert conguillio["geometry_status"] == "bbox_only" and len(conguillio["bbox"]) == 4
    assert conguillio["crs"] == "EPSG:4326" and len(conguillio["trails"]) == 14
    patagonia = client.get("/parks/patagonia/map").json()
    assert patagonia["bbox"] is None and patagonia["geometry_status"] == "unavailable"


def test_knowledge_status_flags_a_stale_snapshot(client):
    status = client.get("/knowledge/status").json()
    assert status["counts"]["Park"] == 46 and status["counts"]["TrailGeometry"] == 0
    raw = json.loads(
        (
            get_atlas.__wrapped__.__globals__["files"]("bosque_api")
            / "resources/knowledge-atlas.json"
        ).read_text(encoding="utf-8")
    )
    assert Atlas(raw, today=date(2027, 1, 1)).status()["stale"] is True
    assert Atlas(raw, today=date(2026, 11, 4)).status()["stale"] is False


def test_search_is_scoped_and_ranked(client):
    hits = client.get("/knowledge/search", params={"q": "senderos de Anticura"}).json()
    assert hits[0]["id"] == "puyehue"
    assert any(h["id"] == "puyehue--anticura" for h in hits)
    birds = client.get(
        "/knowledge/search", params={"q": "carpintero negro", "type": "Taxon"}
    ).json()
    assert [h["id"] for h in birds] == ["campephilus-magellanicus"]


# ---- Demo eligibility -------------------------------------------------------------------------


def test_demo_layer_filters_without_touching_the_catalog(client):
    assert client.get("/taxa").json()["total"] == 20
    ready = client.get("/taxa", params={"demo_only": True}).json()
    ids = {t["id"] for t in ready["items"]}
    assert ready["total"] == 13 and "boletus-chilensis" not in ids and "leopardus-guigna" not in ids
    guigna = client.get("/taxa/leopardus-guigna/eligibility").json()
    assert guigna["status"] == "educational_only" and guigna["collectible"] is False
    boletus = client.get("/taxa/boletus-chilensis/eligibility").json()
    assert boletus["status"] == "excluded_from_demo" and "descripción" in boletus["missing"]
    llao = client.get("/taxa/cyttaria-hariotii/eligibility").json()
    assert any("comestibilidad" in r for r in llao["restrictions"])


def test_incomplete_profile_declared_ready_falls_back_to_review():
    from bosque_api.biodiversity import get_taxa
    from bosque_api.demo import eligibility

    taxon = next(t for t in get_taxa() if t.id == "eucryphia-cordifolia")
    stripped = taxon.model_copy(
        update={"profile": taxon.profile.model_copy(update={"description": None})}
    )
    assert eligibility(stripped).status == "needs_review"


# ---- Tool safety ----------------------------------------------------------------------------


@pytest.mark.parametrize(
    "name,args",
    [
        ("run_sql", {"query": "SELECT * FROM execution_reservations"}),
        ("get_park_profile", {"park_id": "puyehue'; DROP TABLE captures;--"}),
        ("get_trail_profile", {"trail_id": "../../etc/passwd"}),
        ("get_trail_profile", {"trail_id": "x' OR 1=1"}),
        ("get_source_details", {"source_id": "file:///D:/restricted-data"}),
        ("get_taxon_profile", {"taxon_id": "invented"}),
        ("get_park_trails", {"park_id": "puyehue", "geometry": "please"}),
    ],
)
def test_malicious_tool_requests_are_rejected(name, args):
    with pytest.raises((ValueError, GuideToolError)):
        tool(name, **args)


def test_tools_are_bounded_and_sensitive_species_stay_educational():
    assert len(TOOLS) == 13
    trails = tool("get_park_trails", park_id="patagonia")
    assert trails["data"]["total"] == 27 and len(trails["data"]["trails"]) <= 30
    assert trails["map"] == {"park_id": "patagonia", "geometry_available": False}
    guigna = tool("get_taxon_profile", taxon_id="leopardus-guigna")
    assert "sensible" in guigna["data"]["safety"]
    assert not re.search(r'"(lat|lon|latitude|longitude|location)":', json.dumps(guigna))
    conservation = tool("get_taxon_conservation", taxon_id="leopardus-guigna")
    assert conservation["data"]["regional_status"] == "indeterminate"
    progress = tool("get_user_capture_progress")
    assert progress["status"] == "unavailable"


def test_voice_keywords_are_generated_and_bounded():
    words = voice_keywords()
    assert 30 < len(words) <= 100 and words[0] == "Wilo"
    for term in ("Anticura", "Güiña", "Llao-llao", "Cyttaria", "Nothofagus", "Conguillío"):
        assert term in words


# ---- /guide/ask -----------------------------------------------------------------------------


def test_ask_requires_identity_one_input_and_adult(client):
    assert (
        client.post("/guide/ask", data={"adult_confirmed": True, "question": "hola"}).status_code
        == 401
    )
    form = {"adult_confirmed": True}
    assert client.post("/guide/ask", headers=ALICE, data=form).status_code == 422
    both = client.post(
        "/guide/ask",
        headers=ALICE,
        data={**form, "question": "hola", "rights_confirmed": True},
        files={"file": ("a.wav", silence(), "audio/wav")},
    )
    assert both.status_code == 422
    minor = client.post(
        "/guide/ask", headers=ALICE, data={"adult_confirmed": False, "question": "x"}
    )
    assert minor.status_code == 422


def test_ask_mock_is_explicit_and_fallback_is_textual(client):
    text = client.post(
        "/guide/ask", headers=ALICE, data={"adult_confirmed": True, "question": "¿Senderos?"}
    ).json()
    assert text["status"] == "mock" and text["transcript"] is None and text["sources"] == []
    voice = client.post(
        "/guide/ask",
        headers=ALICE,
        data={"adult_confirmed": True, "rights_confirmed": True},
        files={"file": ("a.wav", silence(), "audio/wav")},
    ).json()
    assert voice["status"] == "mock" and voice["transcript"] == ""
    assert "No escuché" in voice["answer"]


def test_ask_rejects_bad_audio(client):
    form = {"adult_confirmed": True, "rights_confirmed": True}
    corrupt = client.post(
        "/guide/ask",
        headers=ALICE,
        data=form,
        files={"file": ("a.wav", b"RIFF0000WAVE", "audio/wav")},
    )
    assert corrupt.status_code == 422
    mp3 = client.post(
        "/guide/ask", headers=ALICE, data=form, files={"file": ("a.mp3", b"ID3", "audio/mpeg")}
    )
    assert mp3.status_code == 415
    large = client.post(
        "/guide/ask",
        headers=ALICE,
        data=form,
        files={"file": ("a.wav", b"\x00" * (3 * 1024 * 1024 + 1), "audio/wav")},
    )
    assert large.status_code == 413
    long = client.post(
        "/guide/ask", headers=ALICE, data=form, files={"file": ("a.wav", silence(61), "audio/wav")}
    )
    assert long.status_code in (413, 422)


@pytest.fixture
def meta_app(monkeypatch):
    monkeypatch.setattr(ExecutionStore, "reserve", lambda *a, **k: "reservation")
    monkeypatch.setattr(ExecutionStore, "finish", lambda *a, **k: None)

    def build(handle):
        original = MetaResponsesClient.__init__
        monkeypatch.setattr(
            MetaResponsesClient,
            "__init__",
            lambda self, key, timeout: original(
                self, key, timeout, transport=httpx.MockTransport(handle)
            ),
        )
        return TestClient(
            create_app(
                config(
                    service_mode="demo",
                    ai_provider="meta",
                    meta_enabled=True,
                    model_api_key="test-only",
                    database_url="postgresql://unused/never",
                    voice_reservation_units=1,
                    guide_reservation_units=1,
                    budget_units=10,
                )
            )
        )

    return build


def test_provider_429_maps_to_retryable_status(meta_app):
    client = meta_app(lambda request: httpx.Response(429, headers={"retry-after": "7"}))
    response = client.post(
        "/guide/transcribe",
        headers=ALICE,
        files={"file": ("a.wav", silence(), "audio/wav")},
        data={
            "adult_confirmed": True,
            "rights_confirmed": True,
            "external_processing_confirmed": True,
        },
    )
    assert response.status_code == 429 and response.headers["retry-after"] == "7"
    assert response.json()["detail"]["code"] == "stt_error_rate_limited"


def test_ask_end_to_end_audio_tools_sources_entities_map(meta_app):
    seen = []

    def handle(request):
        seen.append(request.url.path)
        if request.url.path.endswith("asr/transcribe"):
            assert b'"Anticura"' in request.content and b'"Spanish"' in request.content
            return httpx.Response(
                200,
                json={
                    "sessionId": "s",
                    "transcript": "¿Qué senderos hay en Anticura?",
                    "audioDurationMs": 200,
                    "turns": [],
                },
            )
        body = json.loads(request.content)
        if "tools" in body:
            call = {
                "id": "t1",
                "type": "function",
                "function": {"name": "get_park_trails", "arguments": '{"park_id":"puyehue"}'},
            }
            return httpx.Response(
                200,
                json={
                    "choices": [{"finish_reason": "tool_calls", "message": {"tool_calls": [call]}}]
                },
            )
        source = "atlas:puyehue-el-indio"
        final = {
            "answer": "CONAF nombra El Indio, Repucura y La Princesa; no confirma apertura.",
            "speech_text": "La ficha CONAF nombra tres senderos concesionados.",
            "claims": [{"text": "CONAF nombra El Indio.", "source_ids": [source]}],
            "source_ids": [source],
            "insufficient_evidence": False,
        }
        return httpx.Response(
            200,
            json={
                "choices": [{"finish_reason": "stop", "message": {"content": json.dumps(final)}}]
            },
        )

    client = meta_app(handle)
    response = client.post(
        "/guide/ask",
        headers=ALICE,
        files={"file": ("a.wav", silence(), "audio/wav")},
        data={
            "adult_confirmed": True,
            "rights_confirmed": True,
            "external_processing_confirmed": True,
            "language_hint": "es",
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["transcript"] == "¿Qué senderos hay en Anticura?" and body["status"] == "completed"
    assert body["transcription_model"] == "muse-voice-transcribe-1.0"
    assert (
        body["tools_used"] == ["get_park_trails"]
        and body["sources"][0]["id"] == "atlas:puyehue-el-indio"
    )
    assert {"type": "park", "id": "puyehue"} in body["entities"]
    assert body["map"] == {"park_id": "puyehue", "geometry_available": False}
    assert body["latency_ms"]["retrieval"] is not None and body["knowledge_version"].startswith(
        "sha256:"
    )
    assert len(seen) == 3


# ---- Realtime proxy ---------------------------------------------------------------------------


def start(**overrides):
    return json.dumps(
        {
            "type": "start",
            "token": "test-alice",
            "adult_confirmed": True,
            "rights_confirmed": True,
            "answer": False,
            **overrides,
        }
    )


def test_stream_rejects_missing_or_wrong_identity(client):
    with client.websocket_connect("/guide/voice/stream") as ws:
        ws.send_text(start(token="wrong"))
        assert ws.receive_json()["code"] == "unauthorized"
    with client.websocket_connect("/guide/voice/stream") as ws:
        ws.send_text('{"type": "hello"}')
        assert ws.receive_json()["code"] == "bad_start"


def test_stream_mock_cancel_and_frame_limits(client):
    with client.websocket_connect("/guide/voice/stream") as ws:
        ws.send_text(start())
        assert ws.receive_json()["provider"] == "mock"
        ws.send_bytes(b"\x00" * 3200)
        ws.send_text('{"type": "stop"}')
        final = ws.receive_json()
        assert final["type"] == "final" and final["text"] == "" and final["provider"] == "mock"
        assert ws.receive_json()["type"] == "done"
    with client.websocket_connect("/guide/voice/stream") as ws:
        ws.send_text(start())
        ws.receive_json()
        ws.send_text('{"type": "cancel"}')
        assert ws.receive_json()["type"] == "cancelled"
    with client.websocket_connect("/guide/voice/stream") as ws:
        ws.send_text(start())
        ws.receive_json()
        ws.send_bytes(b"\x00" * 3)
        assert ws.receive_json()["code"] == "bad_audio"


class FakeUpstream:
    def __init__(self, events):
        self.events = [json.dumps(e) for e in events]
        self.sent = []

    async def send(self, data):
        self.sent.append(data)

    def __aiter__(self):
        return self

    async def __anext__(self):
        if not self.events:
            raise StopAsyncIteration
        return self.events.pop(0)

    async def close(self):
        pass


def test_stream_meta_partials_replace_and_final(meta_app, monkeypatch):
    upstream = FakeUpstream(
        [
            {"type": "speechStart", "audioProcessedMs": 0, "turnId": 0},
            {
                "type": "transcript",
                "transcript": "Wilo qué",
                "final": False,
                "audioProcessedMs": 400,
            },
            {
                "type": "transcript",
                "transcript": "Wilo, qué senderos",
                "final": False,
                "audioProcessedMs": 800,
            },
            {
                "type": "transcript",
                "transcript": "Wilo, ¿qué senderos hay en Anticura?",
                "final": True,
                "audioProcessedMs": 1200,
            },
        ]
    )
    handshakes = []

    async def connect(handshake):
        handshakes.append(handshake)
        return upstream

    monkeypatch.setattr(wilo, "connect_upstream", connect)
    client = meta_app(lambda request: httpx.Response(500))
    with client.websocket_connect("/guide/voice/stream") as ws:
        ws.send_text(start(external_processing_confirmed=True))
        assert ws.receive_json()["provider"] == "meta"
        ws.send_bytes(b"\x00" * 3200)
        kinds = []
        while True:
            message = ws.receive_json()
            kinds.append(message)
            if message["type"] in ("final", "error"):
                break
    partials = [m for m in kinds if m["type"] == "partial"]
    assert [p["text"] for p in partials] == ["Wilo qué", "Wilo, qué senderos"]
    assert all(p["replace"] is True for p in partials)
    assert kinds[-1]["text"] == "Wilo, ¿qué senderos hay en Anticura?"
    shake = handshakes[0]
    assert shake["authorization"]["accessToken"] == "Bearer test-only"
    assert shake["mode"] == "PUSH_TO_TALK" and shake["partialMode"] == "CUMULATIVE"
    assert "Anticura" in shake["keywords"]


def test_stream_meta_requires_external_permission(meta_app):
    client = meta_app(lambda request: httpx.Response(500))
    with client.websocket_connect("/guide/voice/stream") as ws:
        ws.send_text(start())
        assert ws.receive_json()["code"] == "permissions"
        with pytest.raises(WebSocketDisconnect):
            ws.receive_json()


def test_language_hint_maps_to_accepted_bias_values(meta_app):
    bodies = []

    def handle(request):
        bodies.append(request.content)
        return httpx.Response(200, json={"sessionId": "s", "transcript": "Hey Wilo", "turns": []})

    client = meta_app(handle)
    form = {
        "adult_confirmed": True,
        "rights_confirmed": True,
        "external_processing_confirmed": True,
    }
    for hint in ("auto", "en", "mixed"):
        response = client.post(
            "/guide/transcribe",
            headers=ALICE,
            files={"file": ("a.wav", silence(), "audio/wav")},
            data={**form, "language_hint": hint},
        )
        assert response.status_code == 200
    assert b"languageBias" not in bodies[0]
    assert b'"languageBias": ["English"]' in bodies[1]
    assert b'"languageBias": ["Spanish", "English"]' in bodies[2]
    bad = client.post(
        "/guide/transcribe",
        headers=ALICE,
        files={"file": ("a.wav", silence(), "audio/wav")},
        data={**form, "language_hint": "klingon"},
    )
    assert bad.status_code == 422


def test_public_prefixes_do_not_exempt_lookalike_private_paths(client):
    assert client.get("/parks").status_code == 200 and client.get("/taxa").status_code == 200
    for path in ("/parksadmin", "/taxaexport", "/mediafoo", "/knowledgex"):
        assert client.get(path).status_code == 401, path
