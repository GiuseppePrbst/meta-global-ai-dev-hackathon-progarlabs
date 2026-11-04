"""Meta spending controls with the proposed beta budget, a real PostgreSQL ledger and real
sessions. Meta itself is an httpx.MockTransport that counts calls: nothing reaches the network.
"""

import io
import os
import wave
from pathlib import Path
from uuid import uuid4

import httpx
import psycopg
import pytest
from bosque_ai.meta import MetaResponsesClient
from conftest import OPEN_CAMPAIGN
from fastapi.testclient import TestClient
from PIL import Image
from psycopg import sql
from psycopg.conninfo import make_conninfo

from bosque_api.config import Settings
from bosque_api.execution import ExecutionStore, identity
from bosque_api.main import create_app

ADMIN = {"Authorization": "Bearer test-operator"}
# docs/META_CLOUD_ACTIVATION.md proposal (microUSD); not applied in production.
PROPOSAL = dict(
    guide_reservation_units=40_000,
    voice_reservation_units=5_000,
    meta_reservation_units=30_000,
    budget_identity_units=400_000,
    budget_units=1_000_000,
    budget_lifetime_units=5_000_000,
    budget_requests=25,
    budget_requests_per_identity=8,
    budget_concurrency=1,
)
QUESTION = {"question": "Senderos de Puyehue", "adult_confirmed": True}
QUESTION["external_processing_confirmed"] = True


def settings(database, **kwargs):
    values = dict(
        _env_file=None,
        service_mode="demo",
        ai_provider="meta",
        meta_enabled=True,
        model_api_key="test-only",
        database_url=database,
        demo_tokens={"operator": "test-operator"},
        admin_identities=["operator"],
        **PROPOSAL,
    )
    values.update(kwargs)
    return Settings(**values)


def wav() -> bytes:
    out = io.BytesIO()
    with wave.open(out, "wb") as audio:
        audio.setnchannels(1), audio.setsampwidth(2), audio.setframerate(16000)
        audio.writeframes(b"\x10\x00" * 16000)
    return out.getvalue()


def png() -> bytes:
    out = io.BytesIO()
    Image.new("RGB", (8, 8), "green").save(out, "PNG")
    return out.getvalue()


@pytest.fixture
def meta(monkeypatch):
    """Fake Meta: every call is counted and rejected with a non-retryable 400."""
    calls = []

    def handle(request):
        calls.append(request.url.path)
        return httpx.Response(400, json={"error": "private provider body"})

    original = MetaResponsesClient.__init__
    monkeypatch.setattr(
        MetaResponsesClient,
        "__init__",
        lambda self, key, timeout: original(
            self, key, timeout, transport=httpx.MockTransport(handle)
        ),
    )
    return calls


@pytest.fixture
def database():
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL required")
    schema = "meta_controls_" + uuid4().hex
    scripts = Path(__file__).parents[1] / "sql"
    with psycopg.connect(url, autocommit=True) as conn:
        conn.execute("CREATE EXTENSION IF NOT EXISTS postgis")
        conn.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
    scoped = make_conninfo(url, options=f"-csearch_path={schema},public")
    try:
        with psycopg.connect(scoped) as conn:
            for name in sorted(p.name for p in scripts.glob("00*.sql")):
                if name == "001_init.sql" or name.endswith(".up.sql"):
                    conn.execute((scripts / name).read_text())
            conn.execute(OPEN_CAMPAIGN)
        yield scoped
    finally:
        with psycopg.connect(url, autocommit=True) as conn:
            conn.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))


def session(client, name, scopes=("guide", "transcribe", "identify")):
    invitation = client.post(
        "/admin/invitations", json={"identity": name, "scopes": list(scopes)}, headers=ADMIN
    ).json()["invitation"]
    token = client.post("/sessions/exchange", json={"invitation": invitation}).json()
    return {"Authorization": f"Bearer {token['access_token']}"}


def ledger(database):
    with psycopg.connect(database) as conn:
        return conn.execute(
            "SELECT identity_id, operation, status, reserved_units, reported_usage "
            "FROM execution_reservations ORDER BY created_at"
        ).fetchall()


def all_three(client, headers):
    """Wilo text, transcription and identification; returns their status codes."""
    consent = {"adult_confirmed": True, "rights_confirmed": True}
    return (
        client.post("/guide/query", json=QUESTION, headers=headers).status_code,
        client.post(
            "/guide/transcribe",
            headers=headers,
            data={**consent, "external_processing_confirmed": True},
            files={"file": ("q.wav", wav(), "audio/wav")},
        ).status_code,
        client.post(
            "/identify",
            headers=headers,
            data=consent,
            files={"file": ("leaf.png", png(), "image/png")},
        ).status_code,
    )


@pytest.mark.integration
def test_no_budget_no_auth_no_scope_and_kill_switch_never_reach_meta(database, meta):
    # 1. Without budget there is no paid inference and no reservation.
    unfunded = TestClient(create_app(settings(database, budget_units=0)))
    assert all_three(unfunded, session(unfunded, "beta-01")) == (503, 503, 503)
    # 2. Without authentication: 401 before anything.
    assert all_three(unfunded, {}) == (401, 401, 401)
    # 3. Without the scope: 403 before any reservation.
    client = TestClient(create_app(settings(database)))
    assert all_three(client, session(client, "beta-02", ["raster"])) == (403, 403, 403)
    # 10. Kill switch (META_ENABLED=false) blocks the three capabilities and the voice stream.
    off = TestClient(create_app(settings(database, meta_enabled=False)))
    headers = session(off, "beta-03")
    assert all_three(off, headers) == (503, 503, 501)
    with off.websocket_connect("/guide/voice/stream") as ws:
        start = {"type": "start", "adult_confirmed": True, "rights_confirmed": True}
        token = headers["Authorization"].removeprefix("Bearer ")
        ws.send_json({**start, "external_processing_confirmed": True, "token": token})
        assert ws.receive_json()["code"] == "unavailable"
    assert meta == [] and ledger(database) == []


@pytest.mark.integration
def test_quota_concurrency_provider_errors_renewal_and_revocation(database, meta):
    config = settings(database)
    client = TestClient(create_app(config))
    headers = session(client, "beta-10")
    # 8. A provider error is sanitized (502), recorded, and its reservation stays charged.
    failed = client.post("/guide/query", json=QUESTION, headers=headers)
    assert failed.status_code == 502 and "private provider body" not in failed.text
    rows = ledger(database)
    assert [(r[0], r[1], r[2], r[3]) for r in rows] == [
        ("beta-10", "guide", "provider_error", 40_000)
    ]
    assert len(meta) == 1
    # 5. Concurrency: with one Meta call in flight, a second one is rejected without calling Meta.
    owner = identity(config, headers["Authorization"])
    open_slot = ExecutionStore(config).reserve(owner, "guide")
    busy = client.post("/guide/query", json=QUESTION, headers=headers)
    assert busy.status_code == 429 and len(meta) == 1
    ExecutionStore(config).finish(open_slot, "cancelled", {})
    # 4. The identity's 8 daily Meta requests are used (provider errors count), then 429.
    codes = [
        client.post("/guide/query", json=QUESTION, headers=headers).status_code for _ in range(7)
    ]
    assert codes == [502] * 6 + [429]
    assert len(ledger(database)) == 8 and len(meta) == 7
    # 7. Renewing the session or a second invitation for the same identity adds no quota.
    renewed = client.post("/sessions/refresh", headers=headers).json()["access_token"]
    again = session(client, "beta-10")
    for retry in ({"Authorization": f"Bearer {renewed}"}, again):
        assert client.post("/guide/query", json=QUESTION, headers=retry).status_code == 429
    # Another identity keeps its own quota.
    assert (
        client.post("/guide/query", json=QUESTION, headers=session(client, "beta-11")).status_code
        == 502
    )
    # 9. Revocation stops new operations immediately.
    assert client.post("/admin/identities/beta-11/revoke", headers=ADMIN).status_code == 200
    before = len(ledger(database))
    assert all_three(client, again)[0] == 429  # beta-10 still exhausted, not revoked
    revoked = session(client, "beta-11")  # a pending invitation was revoked, new one is fresh
    client.post("/admin/identities/beta-11/revoke", headers=ADMIN)
    assert all_three(client, revoked) == (401, 401, 401)
    assert len(ledger(database)) == before
    # 6. If the ledger is unavailable, the reservation fails first: 503 and no Meta call.
    calls = len(meta)
    down = TestClient(
        create_app(
            settings("postgresql://x:y@127.0.0.1:1/none", demo_tokens={"alice": "test-alice"})
        )
    )
    assert (
        down.post(
            "/guide/query", json=QUESTION, headers={"Authorization": "Bearer test-alice"}
        ).status_code
        == 503
    )
    assert len(meta) == calls
    # Lifetime money never exceeds the proposal: 9 reservations x USD 0.04.
    assert sum(r[3] for r in ledger(database)) == 9 * 40_000 <= PROPOSAL["budget_lifetime_units"]


class SilentUpstream:
    """Realtime upstream that never transcribes, so the client's cancel wins the race."""

    async def send(self, data):
        pass

    def __aiter__(self):
        return self

    async def __anext__(self):
        import asyncio

        await asyncio.Event().wait()

    async def close(self):
        pass


@pytest.mark.integration
def test_cancelled_voice_stream_closes_its_reservation(database, meta, monkeypatch):
    """Regression: 'cancelled' violated the 003 CHECK, so the slot stayed reserved 10 min."""
    from bosque_api import wilo

    async def connect(handshake):
        return SilentUpstream()

    monkeypatch.setattr(wilo, "connect_upstream", connect)
    client = TestClient(create_app(settings(database)))
    token = session(client, "beta-20")["Authorization"].removeprefix("Bearer ")
    start = {"type": "start", "token": token, "adult_confirmed": True, "rights_confirmed": True}
    with client.websocket_connect("/guide/voice/stream") as ws:
        ws.send_json({**start, "external_processing_confirmed": True})
        assert ws.receive_json()["type"] == "ready"
        ws.send_bytes(b"\x00" * 3200)
        ws.send_json({"type": "cancel"})
        assert ws.receive_json()["type"] == "cancelled"
    rows = ledger(database)
    assert [(r[1], r[2], r[3]) for r in rows] == [("transcribe", "cancelled", 5_000)]
    # The concurrency slot is free again: the next call is admitted (and fails at the fake).
    headers = {"Authorization": f"Bearer {token}"}
    assert client.post("/guide/query", json=QUESTION, headers=headers).status_code == 502


@pytest.mark.integration
def test_operator_identity_status_shows_states_and_consumption_without_tokens(database, meta):
    client = TestClient(create_app(settings(database)))
    headers = session(client, "beta-30", ["guide"])
    pending = client.post(
        "/admin/invitations", json={"identity": "beta-30", "scopes": ["guide"]}, headers=ADMIN
    ).json()["invitation"]
    assert client.post("/guide/query", json=QUESTION, headers=headers).status_code == 502
    status = client.get("/admin/identities/beta-30", headers=ADMIN)
    assert status.status_code == 200
    body = status.json()
    assert [i["state"] for i in body["invitations"]] == ["redeemed", "pending"]
    assert body["active_sessions"] == 1 and body["reserved_units"] == 40_000
    assert body["reservations_by_status"] == {"provider_error": 1}
    assert body["identity_cap_units"] == 400_000
    assert pending not in status.text and "bvs_" not in status.text and "bvi_" not in status.text
    assert client.get("/admin/identities/beta-30", headers=headers).status_code == 403
    assert client.get("/admin/identities/nobody-here", headers=ADMIN).status_code == 404
    client.post("/admin/identities/beta-30/revoke", headers=ADMIN)
    states = [
        i["state"]
        for i in client.get("/admin/identities/beta-30", headers=ADMIN).json()["invitations"]
    ]
    assert states == ["redeemed", "revoked"]
