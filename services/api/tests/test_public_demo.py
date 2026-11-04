"""Public demo (docs/PUBLIC_DEMO.md): anonymous access, shared campaign cap and hard deadline.

Real PostgreSQL ledger; Meta is the counting MockTransport of test_meta_controls, so a provider
call is observable and every rejection is proven to happen before it.
"""

import logging
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from pathlib import Path

import psycopg
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from test_meta_controls import (  # noqa: F401
    ADMIN,
    SilentUpstream,
    database,
    meta,
    png,
    session,
    settings,
    wav,
)

from bosque_api import images, wilo
from bosque_api.execution import ExecutionStore
from bosque_api.main import create_app
from bosque_api.public import admit_anonymous

ORIGIN = {"X-Bosque-Origin": "test-origin"}
ADMIN_ORIGIN = {**ADMIN, **ORIGIN}
CLIENT = {**ORIGIN, "CF-Connecting-IP": "203.0.113.7", "CF-IPCountry": "CL"}
PUBLIC = dict(
    origin_auth_token="test-origin",
    public_demo_enabled=True,
    public_ip_hmac_key="test-hmac-key",
    budget_cohorts_enabled=True,
    guide_reservation_units=100_000,
    budget_identity_units=0,
    budget_units=20_000_000,
    budget_lifetime_units=90_000_000,
    budget_requests=500,
    budget_concurrency=4,
    public_requests_per_minute=50,
)
QUESTION = {"question": "Senderos de Puyehue", "adult_confirmed": True}
QUESTION["external_processing_confirmed"] = True
CONSENT = {"adult_confirmed": "true", "rights_confirmed": "true"}
EXTERNAL = {**CONSENT, "external_processing_confirmed": "true"}


def public_client(url, **overrides):
    return TestClient(create_app(settings(url, **{**PUBLIC, **overrides})))


def rows(
    url, query="SELECT identity_id, cohort, status, reserved_units FROM execution_reservations"
):
    with psycopg.connect(url) as conn:
        return conn.execute(query).fetchall()


def run(url, statement, *args):
    with psycopg.connect(url) as conn:
        conn.execute(statement, args)


def ask(client, headers=CLIENT):
    return client.post("/guide/query", json=QUESTION, headers=headers)


def photo(client, headers=CLIENT, data=CONSENT, **files):
    return client.post(
        "/identify",
        headers=headers,
        data=data,
        files={"file": ("p.png", png(), "image/png"), **files},
    )


def voice_start(**fields):
    return {"type": "start", "adult_confirmed": True, "rights_confirmed": True, **fields}


def test_all_four_routes_work_without_authorization_and_store_nothing(database, meta):  # noqa: F811
    client = public_client(database)
    assert ask(client).status_code == 502  # the fake provider answered: admitted without a token
    audio = {"file": ("q.wav", wav(), "audio/wav")}
    assert (
        client.post("/guide/transcribe", headers=CLIENT, data=EXTERNAL, files=audio).status_code
        == 502
    )
    assert client.post("/guide/ask", headers=CLIENT, data=EXTERNAL, files=audio).status_code == 502
    assert photo(client).status_code == 502
    assert len(meta) == 4
    identities = {r[0] for r in rows(database)}
    assert len(identities) == 1 and identities.pop().startswith("anon-")
    assert {r[1] for r in rows(database)} == {"public_demo"}
    assert rows(database, "SELECT count(*) FROM identifications")[0][0] == 0
    assert rows(database, "SELECT count(*) FROM observations")[0][0] == 0


def test_private_routes_stay_private_and_old_sessions_keep_working(database, meta):  # noqa: F811
    client = public_client(database)
    for method, path in (
        ("GET", "/admin/cohorts"),
        ("GET", "/me/quota"),
        ("GET", "/sessions/me"),
        ("POST", "/captures"),
        ("POST", "/observations"),
        ("GET", "/layers"),
        ("POST", "/forest/analyze"),
    ):
        assert client.request(method, path, headers=CLIENT).status_code == 401, path
    assert (
        client.post("/admin/campaign/close", json={"reason": "xxx"}, headers=CLIENT).status_code
        == 401
    )
    # A capture belongs to an account: an anonymous caller cannot name one.
    denied = client.post(
        "/guide/ask",
        headers=CLIENT,
        data={"question": "x", **EXTERNAL, "capture_id": "00000000-0000-4000-8000-000000000001"},
    )
    assert denied.status_code == 403 and meta == []
    sessions = {**session_headers(client), **ORIGIN}
    assert client.get("/sessions/me", headers=sessions).json()["auth"] == "session"
    enable_qa(client)
    assert ask(client, sessions).status_code == 502
    assert {r[1] for r in rows(database)} == {"internal_qa"}


def session_headers(client):
    invitation = client.post(
        "/admin/invitations",
        json={"identity": "beta-77", "scopes": ["guide", "transcribe", "identify"]},
        headers=ADMIN_ORIGIN,
    ).json()["invitation"]
    token = client.post("/sessions/exchange", json={"invitation": invitation}, headers=ORIGIN)
    return {"Authorization": "Bearer " + token.json()["access_token"]}


def enable_qa(client):
    response = client.put(
        "/admin/cohorts/internal_qa",
        json={
            "cap_units": 5_000_000,
            "identity_cap_units": 5_000_000,
            "daily_requests_per_identity": 60,
            "ai_enabled": True,
            "reason": "test",
        },
        headers=ADMIN_ORIGIN,
    )
    assert response.status_code == 200, response.text


def test_off_by_default_and_with_public_mode_off_nothing_opens(database, meta):  # noqa: F811
    client = public_client(database, public_demo_enabled=False)
    assert ask(client).status_code == 401
    assert client.get("/demo/status", headers=ORIGIN).json()["status"] == "temporarily_disabled"
    assert meta == [] and rows(database) == []
    assert settings(database).public_demo_enabled is False


def test_cors_is_open_without_credentials_and_origin_guard_stays(database):  # noqa: F811
    client = public_client(database)
    for origin in ("https://evaluator.example", "http://localhost:19006", "capacitor://app"):
        response = client.options(
            "/guide/query",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )
        assert response.headers["access-control-allow-origin"] == "*"
        assert "access-control-allow-credentials" not in response.headers
    direct = {"CF-Connecting-IP": "203.0.113.7", "CF-IPCountry": "CL"}
    assert client.post("/guide/query", json=QUESTION, headers=direct).status_code == 403
    assert client.get("/parks", headers=direct).status_code == 403


@pytest.mark.parametrize(
    "country", ["RU", "CN", "HK", "IR", "KP", "UA", "VE", "XX", "T1", "", "ru"]
)
def test_restricted_or_unknown_territories_never_reach_meta(database, meta, country):  # noqa: F811
    assert ask(public_client(database), {**CLIENT, "CF-IPCountry": country}).status_code == 403
    assert meta == [] and rows(database) == []


def test_missing_verified_ip_or_key_fails_closed(database, meta):  # noqa: F811
    client = public_client(database)
    assert ask(client, {**ORIGIN, "CF-IPCountry": "CL"}).status_code == 403
    assert ask(public_client(database, public_ip_hmac_key="")).status_code == 503
    assert meta == []
    with pytest.raises(HTTPException):  # never without the origin guard, where headers are forged
        admit_anonymous(settings(database, **{**PUBLIC, "origin_auth_token": ""}), CLIENT, "guide")


def test_feature_allowlist_consent_and_size_limits(database, meta, monkeypatch):  # noqa: F811
    client = public_client(database, public_demo_features=["guide"])
    assert photo(client).status_code == 403
    assert (
        client.post(
            "/guide/transcribe",
            headers=CLIENT,
            data=EXTERNAL,
            files={"file": ("q.wav", wav(), "audio/wav")},
        ).status_code
        == 403
    )
    client = public_client(database)
    no_adult = {**QUESTION, "adult_confirmed": False}
    assert client.post("/guide/query", json=no_adult, headers=CLIENT).status_code == 422
    no_external = {**QUESTION, "external_processing_confirmed": False}
    assert client.post("/guide/query", json=no_external, headers=CLIENT).status_code == 422
    assert (
        photo(client, data={"adult_confirmed": "true", "rights_confirmed": "false"}).status_code
        == 422
    )
    extra = {"additional_files": ("b.png", png(), "image/png")}
    assert photo(client, **extra).status_code == 422
    assert photo(client, data={**CONSENT, "use_segmentation": "true"}).status_code == 422
    monkeypatch.setattr("bosque_api.main.MAX_IMAGE_BYTES", 10)
    assert photo(client).status_code == 413
    assert meta == [] and rows(database) == []


def test_anonymous_photos_are_downscaled():
    from io import BytesIO

    from PIL import Image

    out = BytesIO()
    Image.new("RGB", (4000, 2000), "green").save(out, "PNG")
    prepared = images.prepare_image(out.getvalue(), "image/png", images.PUBLIC_IMAGE_SIDE)
    assert max(Image.open(BytesIO(prepared)).size) == images.PUBLIC_IMAGE_SIDE


def test_rate_limits_by_verified_ip_shared_and_not_spoofable(database, meta):  # noqa: F811
    client = public_client(database, public_requests_per_minute=2, public_requests_per_day=3)
    assert [ask(client).status_code for _ in range(2)] == [502, 502]
    limited = ask(client)
    assert limited.status_code == 429 and limited.headers["Retry-After"]
    # Two people behind one address share the limit (documented); other headers do not help.
    spoofed = {**CLIENT, "X-Forwarded-For": "198.51.100.1", "X-Real-IP": "198.51.100.2"}
    assert ask(client, spoofed).status_code == 429
    assert ask(client, {**CLIENT, "X-User-Id": "someone-else"}).status_code == 429
    other = {**CLIENT, "CF-Connecting-IP": "203.0.113.8"}
    assert ask(client, other).status_code == 502
    assert len(meta) == 3
    run(database, "DELETE FROM rate_limit_hits")  # the minute passed: the daily count remains
    assert ask(client).status_code == 502
    run(database, "DELETE FROM rate_limit_hits")
    assert ask(client).status_code == 429
    assert len(meta) == 4


def test_postgres_down_fails_closed_before_meta(database, meta):  # noqa: F811
    down = "postgresql://nobody:x@127.0.0.1:1/none?connect_timeout=1"
    client = public_client(database, database_url=down)
    assert ask(client).status_code == 503
    assert client.get("/demo/status", headers=ORIGIN).json()["status"] == "temporarily_disabled"
    assert meta == []


def test_budget_edge_and_concurrent_workers_across_identities(database, meta):  # noqa: F811
    run(database, "UPDATE campaign_state SET reservation_cap_units=200000")
    client = public_client(database)
    assert ask(client).status_code == 502
    assert ask(client).status_code == 502  # exactly at the cap: 200 000 of 200 000
    refused = ask(client)
    assert refused.status_code == 429 and len(meta) == 2
    status = client.get("/demo/status", headers=ORIGIN).json()
    assert status["status"] == "budget_exhausted" and "units" not in str(status)
    # The same pool stops sessions and operators, whatever their cohort cap says.
    run(database, "INSERT INTO identities VALUES ('team-x','team_developer','team_developer')")
    run(database, "UPDATE budget_cohorts SET ai_enabled=true")
    config = settings(database, **PUBLIC)
    with pytest.raises(HTTPException) as exc:
        ExecutionStore(config).reserve("team-x", "guide")
    assert exc.value.status_code == 429

    run(database, "UPDATE campaign_state SET reservation_cap_units=500000")
    store = ExecutionStore(config.model_copy(update={"budget_concurrency": 100}))

    def attempt(n):
        principal = admit_anonymous(
            config, {"cf-connecting-ip": f"198.51.100.{n}", "cf-ipcountry": "CL"}, "guide"
        )
        try:
            store.finish(store.reserve(principal, "guide"), "completed", {})
            return 1
        except HTTPException:
            return 0

    with ThreadPoolExecutor(12) as pool:
        assert sum(pool.map(attempt, range(12))) == 3
    code = (
        "import sys; from fastapi import HTTPException; from bosque_api.execution import "
        "ExecutionStore; from bosque_api.public import admit_anonymous; from test_public_demo "
        "import PUBLIC; from test_meta_controls import settings\n"
        "c=settings(sys.argv[1], **PUBLIC)\n"
        "s=ExecutionStore(c.model_copy(update={'budget_concurrency':100}))\n"
        "ok=0\n"
        "for n in sys.argv[2:]:\n"
        "    p=admit_anonymous(c,{'cf-connecting-ip':'192.0.2.'+n,'cf-ipcountry':'CL'},'guide')\n"
        "    try: s.finish(s.reserve(p,'guide'),'completed',{}); ok+=1\n"
        "    except HTTPException: pass\n"
        "print(ok)"
    )
    run(database, "UPDATE campaign_state SET reservation_cap_units=900000")
    processes = [
        subprocess.Popen(
            [sys.executable, "-c", code, database, *[str(n) for n in range(start, start + 6)]],
            stdout=subprocess.PIPE,
            text=True,
            cwd=str(Path(__file__).parent),
        )
        for start in (1, 101)
    ]
    assert sum(int(p.communicate(timeout=120)[0].strip().splitlines()[-1]) for p in processes) == 4
    assert sum(r[3] for r in rows(database)) == 900_000


@pytest.mark.parametrize(
    ("offset", "admitted"), [(60, True), (0, False), (-60, False)], ids=["-1m", "exact", "+1m"]
)
def test_deadline_in_postgres_binds_everyone(database, meta, offset, admitted):  # noqa: F811
    client = public_client(database)
    enable_qa(client)
    headers = {**session_headers(client), **ORIGIN}
    run(
        database,
        "UPDATE campaign_state SET expires_at = clock_timestamp() + make_interval(secs => %s)",
        offset,
    )
    expected = 502 if admitted else 410
    assert ask(client).status_code == expected
    assert ask(client, headers).status_code == expected
    if not admitted:
        assert len(meta) == 0
        closed = rows(database, "SELECT closed_at IS NOT NULL, closed_reason FROM campaign_state")
        assert closed == [(True, "expired")]
        run_operator = ExecutionStore(settings(database, **PUBLIC))
        with pytest.raises(HTTPException) as exc:
            run_operator.reserve("cloud-demo", "guide")
        assert exc.value.status_code == 410
        assert client.get("/demo/status", headers=ORIGIN).json()["status"] == "expired"
        assert client.get("/parks", headers=ORIGIN).status_code == 200


def test_closed_campaign_survives_restart_and_stale_variables(database, meta):  # noqa: F811
    run(
        database,
        "INSERT INTO execution_reservations(id,identity_id,operation,reserved_units) "
        "VALUES (gen_random_uuid(),'old','guide',400000)",
    )
    client = public_client(database)
    assert (
        client.post(
            "/admin/campaign/close", json={"reason": "cierre preventivo"}, headers=ADMIN_ORIGIN
        ).status_code
        == 204
    )
    assert ask(client).status_code == 410
    restarted = public_client(database, public_demo_enabled=True, meta_enabled=True)
    assert ask(restarted).status_code == 410
    assert restarted.get("/demo/status", headers=ORIGIN).json()["status"] == "expired"
    with pytest.raises(psycopg.errors.RaiseException):
        run(database, "UPDATE campaign_state SET closed_at=NULL")
    with pytest.raises(psycopg.errors.RaiseException):
        run(database, "DELETE FROM campaign_state")
    assert len(meta) == 0
    # History stays: closing changes no reservation.
    assert (
        rows(database, "SELECT sum(reserved_units)::bigint FROM execution_reservations")[0][0]
        == 400000
    )


def test_in_process_deadline_answers_410_even_with_meta_switched_off(database, meta):  # noqa: F811
    past = datetime.now(UTC) - timedelta(minutes=1)
    client = public_client(database, campaign_expires_at=past, meta_enabled=False)
    assert ask(client).status_code == 410
    assert photo(client).status_code == 410
    assert meta == [] and rows(database) == []


def test_migration_forbids_extending_deadline_or_cap(database):  # noqa: F811
    # conftest lifts the limit for the suite; this restores the table exactly as 009 creates it.
    up = (Path(__file__).parents[1] / "sql/009_public_campaign.up.sql").read_text()
    with psycopg.connect(database, autocommit=True) as conn:
        conn.execute("DROP TABLE campaign_state CASCADE")
        conn.execute(up[up.index("CREATE TABLE") : up.index("-- A closed campaign")])
        for change in ("expires_at='2026-11-10T05:00:01Z'", "reservation_cap_units=90000001"):
            with pytest.raises(psycopg.errors.CheckViolation):
                conn.execute(f"UPDATE campaign_state SET {change}")


def test_no_retries_and_status_is_public_without_financial_data(database, meta):  # noqa: F811
    client = public_client(database)
    assert ask(client).status_code == 502
    assert len(meta) == 1  # a failed inference is never retried by the backend
    status = client.get("/demo/status", headers={**ORIGIN, "CF-IPCountry": "CL"}).json()
    assert status["status"] == "active" and status["seconds_remaining"] > 0
    assert status["features"] == ["guide", "transcribe", "identify", "voice"]
    assert status["territory_eligible"] is True
    assert not {"reserved", "cap", "units", "spent"} & set(status)
    blocked = client.get("/demo/status", headers={**ORIGIN, "CF-IPCountry": "RU"}).json()
    assert blocked["territory_eligible"] is False


def test_logs_hold_no_ip_question_or_token(database, meta, caplog):  # noqa: F811
    secret_question = {**QUESTION, "question": "Mi telefono privado es 555-0100"}
    with caplog.at_level(logging.DEBUG):
        client = public_client(database)
        client.post("/guide/query", json=secret_question, headers=CLIENT)
    assert "203.0.113.7" not in caplog.text and "555-0100" not in caplog.text
    stored = rows(database, "SELECT identity_id, reported_usage::text FROM execution_reservations")
    assert "203.0.113.7" not in str(stored) and "555-0100" not in str(stored)


def test_anonymous_voice_stream_cancel_and_old_token_format(database, meta, monkeypatch):  # noqa: F811
    async def connect(handshake):
        return SilentUpstream()

    monkeypatch.setattr(wilo, "connect_upstream", connect)
    client = public_client(database)
    start = voice_start(external_processing_confirmed=True)
    with client.websocket_connect("/guide/voice/stream", headers=CLIENT) as ws:
        ws.send_json(start)
        assert ws.receive_json()["type"] == "ready"
        ws.send_bytes(b"\x00" * 3200)
        ws.send_json({"type": "cancel"})
        assert ws.receive_json()["type"] == "cancelled"
    assert [(r[1], r[2], r[3]) for r in rows(database)] == [("public_demo", "cancelled", 5_000)]

    enable_qa(client)
    token = session_headers(client)["Authorization"].removeprefix("Bearer ")
    with client.websocket_connect("/guide/voice/stream", headers=ORIGIN) as ws:
        ws.send_json({**start, "token": token})
        assert ws.receive_json()["type"] == "ready"
        ws.send_json({"type": "cancel"})
        assert ws.receive_json()["type"] == "cancelled"
    with client.websocket_connect("/guide/voice/stream", headers=ORIGIN) as ws:
        ws.send_json({**start, "token": "bvs_invalid"})
        assert ws.receive_json()["code"] == "unauthorized"

    for headers, code in (
        ({**CLIENT, "CF-IPCountry": "RU"}, "forbidden"),
        (ORIGIN, "forbidden"),
    ):
        with client.websocket_connect("/guide/voice/stream", headers=headers) as ws:
            ws.send_json(start)
            assert ws.receive_json()["code"] == code
    with client.websocket_connect("/guide/voice/stream", headers=CLIENT) as ws:
        ws.send_json(voice_start())
        assert ws.receive_json()["code"] == "permissions"

    off = public_client(database, public_demo_enabled=False)
    with off.websocket_connect("/guide/voice/stream", headers=CLIENT) as ws:
        ws.send_json(start)
        assert ws.receive_json()["code"] == "unauthorized"


def test_stream_ends_when_the_deadline_arrives_mid_stream(database, meta, monkeypatch):  # noqa: F811
    closed = []

    class Tracked(SilentUpstream):
        async def close(self):
            closed.append(True)

    async def connect(handshake):
        return Tracked()

    monkeypatch.setattr(wilo, "connect_upstream", connect)
    deadline = datetime.now(UTC) + timedelta(seconds=2)
    client = public_client(database, campaign_expires_at=deadline)
    with client.websocket_connect("/guide/voice/stream", headers=CLIENT) as ws:
        ws.send_json(voice_start(external_processing_confirmed=True))
        assert ws.receive_json()["type"] == "ready"
        assert ws.receive_json()["code"] == "expired"
    assert closed == [True]
    assert [r[2] for r in rows(database)] == ["cancelled"]
    past = public_client(database, campaign_expires_at=deadline)
    with past.websocket_connect("/guide/voice/stream", headers=CLIENT) as ws:
        ws.send_json(voice_start(external_processing_confirmed=True))
        assert ws.receive_json()["code"] == "expired"


def test_openapi_marks_only_the_public_operations(database):  # noqa: F811
    spec = public_client(database).get("/openapi.json", headers=ORIGIN).json()
    assert spec["paths"]["/guide/query"]["post"]["security"] == [{}, {"DemoBearer": []}]
    assert spec["paths"]["/identify"]["post"]["x-public-demo"] is True
    assert "410" in spec["paths"]["/guide/ask"]["post"]["responses"]
    assert spec["paths"]["/admin/cohorts"]["get"]["security"] == [{"DemoBearer": []}]
    assert spec["paths"]["/me/quota"]["get"]["security"] == [{"DemoBearer": []}]
    forbidden = ("/v1/", "/proxy", "/models/", "chat/completions", "/responses")
    assert not [path for path in spec["paths"] if any(f in path for f in forbidden)]
