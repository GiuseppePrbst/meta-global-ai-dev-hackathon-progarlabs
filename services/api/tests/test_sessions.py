import os
from pathlib import Path
from uuid import uuid4

import psycopg
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from psycopg import sql
from psycopg.conninfo import make_conninfo

from bosque_api.config import Settings
from bosque_api.execution import ExecutionStore, identity
from bosque_api.main import create_app
from bosque_api.sessions import Principal, authorize, cleanup_rate_limits

ADMIN = {"Authorization": "Bearer test-operator"}


def settings(**kwargs):
    return Settings(
        _env_file=None,
        service_mode="demo",
        demo_tokens={"operator": "test-operator", "viewer": "test-viewer"},
        admin_identities=["operator"],
        **kwargs,
    )


def test_scopes_without_database():
    authorize(Principal("operator"), "identify")  # static token: every operation
    limited = Principal("beta-01")
    limited.scopes = frozenset({"guide"})
    authorize(limited, "guide")
    with pytest.raises(HTTPException) as denied:
        authorize(limited, "identify")
    assert denied.value.status_code == 403
    # Without PostgreSQL a session token is never accepted.
    with pytest.raises(HTTPException) as missing:
        identity(settings(), "Bearer bvs_" + "x" * 43)
    assert missing.value.status_code == 401
    client = TestClient(create_app(settings()))
    assert client.get("/sessions/me", headers=ADMIN).json()["auth"] == "operator"
    assert client.get("/sessions/me").status_code == 401
    viewer = {"Authorization": "Bearer test-viewer"}
    payload = {"identity": "beta-01", "scopes": ["guide"]}
    assert client.post("/admin/invitations", json=payload, headers=viewer).status_code == 403
    assert (
        client.post("/sessions/exchange", json={"invitation": "bvi_" + "x" * 40}).status_code == 503
    )


@pytest.fixture
def database():
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL required")
    schema = "sessions_test_" + uuid4().hex
    scripts = Path(__file__).parents[1] / "sql"
    with psycopg.connect(url, autocommit=True) as conn:
        conn.execute("CREATE EXTENSION IF NOT EXISTS postgis")
        conn.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
    scoped = make_conninfo(url, options=f"-csearch_path={schema},public")
    try:
        with psycopg.connect(scoped) as conn:
            for name in (
                "001_init",
                "003_execution.up",
                "004_expeditions.up",
                "005_sessions.up",
                "006_rate_limits.up",
            ):
                conn.execute((scripts / f"{name}.sql").read_text())
        yield scoped
    finally:
        with psycopg.connect(url, autocommit=True) as conn:
            conn.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))


def invite(client, identity="beta-01", scopes=("guide", "transcribe")):
    response = client.post(
        "/admin/invitations", json={"identity": identity, "scopes": list(scopes)}, headers=ADMIN
    )
    assert response.status_code == 201, response.text
    return response.json()["invitation"]


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.integration
def test_invitation_session_lifecycle(database):
    client = TestClient(create_app(settings(database_url=database)))
    invitation = invite(client)
    session = client.post("/sessions/exchange", json={"invitation": invitation})
    assert session.status_code == 201, session.text
    body = session.json()
    token = body["access_token"]
    assert token.startswith("bvs_") and body["identity"] == "beta-01"
    assert 3500 <= body["expires_in"] <= 3600
    assert body["scopes"] == ["guide", "transcribe"]
    # Single use: the same invitation never yields a second session.
    assert client.post("/sessions/exchange", json={"invitation": invitation}).status_code == 401
    assert (
        client.post("/sessions/exchange", json={"invitation": "bvi_" + "y" * 43}).status_code == 401
    )
    me = client.get("/sessions/me", headers=bearer(token)).json()
    assert me["auth"] == "session" and me["identity"] == "beta-01"
    # Out of scope: rejected before the body is parsed and before any reservation.
    assert client.post("/identify", content=b"x", headers=bearer(token)).status_code == 403
    assert client.post("/admin/invitations", json={}, headers=bearer(token)).status_code in (
        403,
        422,
    )
    payload = {"identity": "beta-02", "scopes": ["guide"]}
    assert client.post("/admin/invitations", json=payload, headers=bearer(token)).status_code == 403
    # Records are owned by the stable identity.
    saved = client.post("/observations", json={"notes": "SINTÉTICO"}, headers=bearer(token))
    assert saved.status_code == 201
    # Refresh rotates: the old token stops working, identity and scopes stay.
    renewed = client.post("/sessions/refresh", headers=bearer(token))
    assert renewed.status_code == 201
    new = renewed.json()["access_token"]
    assert client.get("/sessions/me", headers=bearer(token)).status_code == 401
    listed = client.get("/observations", headers=bearer(new)).json()
    assert [item["id"] for item in listed] == [saved.json()["id"]]
    # Logout revokes.
    assert client.post("/sessions/logout", headers=bearer(new)).status_code == 204
    assert client.get("/sessions/me", headers=bearer(new)).status_code == 401
    # Expired invitation and expired session.
    late = invite(client, "beta-03")
    third = client.post("/sessions/exchange", json={"invitation": invite(client, "beta-04")})
    with psycopg.connect(database) as conn:
        conn.execute("UPDATE access_invitations SET expires_at=now() WHERE identity_id='beta-03'")
        conn.execute(
            "UPDATE access_sessions SET expires_at=created_at + interval '1 millisecond' "
            "WHERE identity_id='beta-04'"
        )
        stored = conn.execute("SELECT token_hash FROM access_sessions").fetchall()
        events = [r[0] for r in conn.execute("SELECT event FROM auth_events ORDER BY id")]
    assert client.post("/sessions/exchange", json={"invitation": late}).status_code == 401
    expired = third.json()["access_token"]
    assert client.get("/sessions/me", headers=bearer(expired)).status_code == 401
    assert client.post("/sessions/refresh", headers=bearer(expired)).status_code == 401
    assert all(len(row[0]) == 32 for row in stored)  # hashes only, never tokens
    assert {"invitation_created", "session_issued", "session_refreshed", "session_revoked"} <= set(
        events
    )
    # Operator revocation cuts every session and pending invitation of the identity.
    fresh = client.post("/sessions/exchange", json={"invitation": invite(client, "beta-05")})
    pending = invite(client, "beta-05")
    revoked = client.post("/admin/identities/beta-05/revoke", headers=ADMIN).json()
    assert revoked == {"identity": "beta-05", "sessions_revoked": 1, "invitations_revoked": 1}
    token5 = fresh.json()["access_token"]
    assert client.get("/sessions/me", headers=bearer(token5)).status_code == 401
    assert client.post("/sessions/exchange", json={"invitation": pending}).status_code == 401
    # An identity cannot shadow an operator credential.
    payload = {"identity": "operator", "scopes": ["guide"]}
    assert client.post("/admin/invitations", json=payload, headers=ADMIN).status_code == 422


@pytest.mark.integration
def test_brute_force_and_session_rate_limits(database):
    config = settings(
        database_url=database,
        exchange_failures_per_ip=3,
        session_requests_per_minute=3,
        origin_auth_token="test-origin",  # CF-Connecting-IP is trusted only behind the guard
    )
    client = TestClient(create_app(config), headers={"X-Bosque-Origin": "test-origin"})
    wrong = {"invitation": "bvi_" + "z" * 43}
    assert [client.post("/sessions/exchange", json=wrong).status_code for _ in range(3)] == [
        401
    ] * 3
    blocked = client.post("/sessions/exchange", json={"invitation": invite(client)})
    assert blocked.status_code == 429 and int(blocked.headers["Retry-After"]) > 0
    other_ip = {"CF-Connecting-IP": "203.0.113.9"}
    token = client.post(
        "/sessions/exchange", json={"invitation": invite(client, "beta-02")}, headers=other_ip
    ).json()["access_token"]
    codes = [client.get("/sessions/me", headers=bearer(token)).status_code for _ in range(4)]
    assert codes == [200, 200, 200, 429]


@pytest.mark.integration
def test_quota_follows_identity_across_sessions(database):
    config = settings(
        database_url=database,
        budget_units=1000,
        budget_identity_units=100,
        guide_reservation_units=60,
        budget_requests=10,
        budget_requests_per_identity=10,
        budget_concurrency=8,
    )
    client = TestClient(create_app(config))
    first = client.post("/sessions/exchange", json={"invitation": invite(client)}).json()
    owner = identity(config, "Bearer " + first["access_token"])
    ExecutionStore(config).reserve(owner, "guide")
    # A refreshed session or a second invitation for the same identity shares the cap.
    renewed = client.post("/sessions/refresh", headers=bearer(first["access_token"])).json()
    second = client.post("/sessions/exchange", json={"invitation": invite(client)}).json()
    for token in (renewed["access_token"], second["access_token"]):
        with pytest.raises(HTTPException) as limit:
            ExecutionStore(config).reserve(identity(config, "Bearer " + token), "guide")
        assert limit.value.status_code == 429
    # Out-of-scope operations and invalid sessions never create a reservation.
    with pytest.raises(HTTPException) as denied:
        ExecutionStore(config).reserve(owner, "identify")
    assert denied.value.status_code == 403
    with pytest.raises(HTTPException):
        identity(config, "Bearer bvs_" + "n" * 43)
    with psycopg.connect(database) as conn:
        rows = conn.execute("SELECT identity_id, operation FROM execution_reservations").fetchall()
    assert rows == [("beta-01", "guide")]


@pytest.mark.integration
def test_websocket_accepts_sessions_and_rejects_others(database):
    client = TestClient(create_app(settings(database_url=database, ai_provider="mock")))
    token = client.post("/sessions/exchange", json={"invitation": invite(client)}).json()[
        "access_token"
    ]
    start = {"type": "start", "adult_confirmed": True, "rights_confirmed": True}
    with client.websocket_connect("/guide/voice/stream") as ws:
        ws.send_json({**start, "token": token})
        assert ws.receive_json()["type"] == "ready"
    with client.websocket_connect("/guide/voice/stream") as ws:
        ws.send_json({**start, "token": "bvs_" + "q" * 43})
        assert ws.receive_json()["code"] == "unauthorized"
    guide_only = client.post(
        "/sessions/exchange", json={"invitation": invite(client, "beta-02", ["guide"])}
    ).json()["access_token"]
    with client.websocket_connect("/guide/voice/stream") as ws:
        ws.send_json({**start, "token": guide_only})
        assert ws.receive_json()["code"] == "forbidden"


@pytest.mark.integration
def test_rate_limits_are_shared_persistent_and_fail_closed(database):
    from concurrent.futures import ThreadPoolExecutor

    config = settings(
        database_url=database,
        session_requests_per_minute=3,
        exchange_failures_per_ip=3,
        origin_auth_token="test-origin",
    )
    guard = {"X-Bosque-Origin": "test-origin"}
    # Two app instances = two independent in-memory states; only PostgreSQL is shared.
    one, two = (TestClient(create_app(config), headers=guard) for _ in range(2))
    first = one.post("/sessions/exchange", json={"invitation": invite(one, "beta-a")}).json()
    second = two.post("/sessions/exchange", json={"invitation": invite(two, "beta-a")}).json()
    assert one.get("/sessions/me", headers=bearer(first["access_token"])).status_code == 200
    assert two.get("/sessions/me", headers=bearer(second["access_token"])).status_code == 200
    renewed = one.post("/sessions/refresh", headers=bearer(first["access_token"]))
    assert renewed.status_code == 201  # third request of beta-a in this minute
    # Renewal, the other session and the other instance all share beta-a's counter.
    blocked = two.get("/sessions/me", headers=bearer(renewed.json()["access_token"]))
    assert blocked.status_code == 429 and 1 <= int(blocked.headers["Retry-After"]) <= 60
    assert one.get("/sessions/me", headers=bearer(second["access_token"])).status_code == 429
    # Another identity is independent.
    other = one.post("/sessions/exchange", json={"invitation": invite(one, "beta-b")}).json()
    assert two.get("/sessions/me", headers=bearer(other["access_token"])).status_code == 200
    # A restarted backend (new app) does not reset the window early.
    restarted = TestClient(create_app(config), headers=guard)
    assert restarted.get("/sessions/me", headers=bearer(second["access_token"])).status_code == 429
    # An expired window admits requests again.
    with psycopg.connect(database) as conn:
        conn.execute(
            "UPDATE rate_limit_hits SET at = at - interval '61 seconds' "
            "WHERE bucket = 'identity:beta-a'"
        )
    assert restarted.get("/sessions/me", headers=bearer(second["access_token"])).status_code == 200
    # Concurrent bursts across instances never exceed the limit (per-bucket advisory lock).
    burst = one.post("/sessions/exchange", json={"invitation": invite(one, "beta-c")}).json()
    clients = [one, two, restarted]
    with ThreadPoolExecutor(max_workers=12) as pool:
        codes = list(
            pool.map(
                lambda i: (
                    clients[i % 3]
                    .get("/sessions/me", headers=bearer(burst["access_token"]))
                    .status_code
                ),
                range(12),
            )
        )
    assert sorted(codes) == [200] * 3 + [429] * 9
    # Failed exchanges accumulate per IP across instances and restarts.
    ip = {"CF-Connecting-IP": "198.51.100.23"}
    wrong = {"invitation": "bvi_" + "f" * 43}
    for client in (one, two, restarted):
        assert client.post("/sessions/exchange", json=wrong, headers=ip).status_code == 401
    late = TestClient(create_app(config), headers=guard)
    stopped = late.post(
        "/sessions/exchange", json={"invitation": invite(late, "beta-d")}, headers=ip
    )
    assert stopped.status_code == 429 and int(stopped.headers["Retry-After"]) > 800
    # Old rows can be purged; only transient counters live in this table.
    with psycopg.connect(database) as conn:
        conn.execute(
            "INSERT INTO rate_limit_hits(bucket, at) VALUES ('stale', now() - interval '25 hours')"
        )
        assert cleanup_rate_limits(conn) == 1
        buckets = {row[0] for row in conn.execute("SELECT DISTINCT bucket FROM rate_limit_hits")}
    assert "stale" not in buckets and "identity:beta-a" in buckets
    assert all(not b.endswith("198.51.100.23") for b in buckets)  # IP stored only as pseudonym
    # PostgreSQL down: protected routes fail closed (503), never open.
    down = settings(
        database_url="postgresql://x:y@127.0.0.1:1/none", origin_auth_token="test-origin"
    )
    broken = TestClient(create_app(down), headers=guard)
    assert broken.get("/sessions/me", headers=bearer(burst["access_token"])).status_code == 503
    assert (
        broken.post("/guide/query", json={}, headers=bearer(burst["access_token"])).status_code
        == 503
    )
    assert broken.post("/sessions/exchange", json=wrong).status_code == 503
