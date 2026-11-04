"""Federated login (Firebase ID tokens signed by a local test key) and the cohort ledger
(migration 008) against real PostgreSQL. Meta is the counting MockTransport of
test_meta_controls: nothing reaches the network and every call ends as provider_error.
"""

import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor

import jwt
import psycopg
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from fastapi.testclient import TestClient
from test_meta_controls import ADMIN, QUESTION, database, meta, session, settings  # noqa: F401

from bosque_api import accounts
from bosque_api.execution import ExecutionStore
from bosque_api.main import create_app

PROJECT = "bosque-test"
KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
OTHER = rsa.generate_private_key(public_exponent=65537, key_size=2048)
COHORTS = dict(
    budget_cohorts_enabled=True,
    firebase_project_id=PROJECT,
    guide_reservation_units=100_000,
    budget_identity_units=0,
    budget_units=20_000_000,
    budget_lifetime_units=90_000_000,
    budget_requests=500,
)


def firebase_token(uid="fb-user-1", key=KEY, **override):
    now = int(time.time())
    claims = {
        "iss": f"https://securetoken.google.com/{PROJECT}",
        "aud": PROJECT,
        "sub": uid,
        "iat": now,
        "exp": now + 3600,
        "auth_time": now,
        "email": "someone@progarlabs.com",  # never proof of team membership
        "firebase": {"sign_in_provider": "facebook.com", "identities": {}},
    }
    claims.update(override)
    return jwt.encode(claims, key, algorithm="RS256", headers={"kid": "test"})


@pytest.fixture
def client(database, meta, monkeypatch):  # noqa: F811
    monkeypatch.setattr(accounts, "signing_key", lambda token: KEY.public_key())
    with TestClient(create_app(settings(database, **COHORTS))) as test_client:
        yield test_client


def exchange(client, token):
    return client.post("/sessions/federated/exchange", json={"id_token": token})


def bearer(response):
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def enable(client, cohort, cap, identity_cap, daily=100, on=True):
    response = client.put(
        f"/admin/cohorts/{cohort}",
        json={
            "cap_units": cap,
            "identity_cap_units": identity_cap,
            "daily_requests_per_identity": daily,
            "ai_enabled": on,
            "reason": "test",
        },
        headers=ADMIN,
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_federated_token_verification_rejects_forgeries(client):
    now = int(time.time())
    forged = {
        "otra clave": firebase_token(key=OTHER),
        "audiencia": firebase_token(aud="other-project"),
        "emisor": firebase_token(iss="https://securetoken.google.com/other-project"),
        "expirado": firebase_token(exp=now - 120, iat=now - 3700),
        "auth_time futuro": firebase_token(auth_time=now + 600),
        "sin sujeto": firebase_token(sub=""),
        "HS256": jwt.encode({"sub": "x", "aud": PROJECT}, "secret" * 8, algorithm="HS256"),
        "basura": "x" * 200,
    }
    for name, token in forged.items():
        assert exchange(client, token).status_code == 401, name
    assert (
        exchange(client, firebase_token(firebase={"sign_in_provider": "password"})).status_code
        == 403
    )
    # The client cannot choose its role, UID or cohort.
    extra = {"id_token": firebase_token(), "role": "team_developer"}
    assert client.post("/sessions/federated/exchange", json=extra).status_code == 422


def test_federated_identity_is_stable_pseudonymous_and_public_by_default(client, database):  # noqa: F811
    first = exchange(client, firebase_token("fb-user-1"))
    assert first.status_code == 201, first.text
    identity = first.json()["identity"]
    assert identity.startswith("u-") and "fb-user-1" not in identity
    again = exchange(client, firebase_token("fb-user-1"))
    assert again.json()["identity"] == identity
    assert again.json()["access_token"] != first.json()["access_token"]
    assert exchange(client, firebase_token("fb-user-2")).json()["identity"] != identity

    me = client.get("/me/permissions", headers=bearer(again)).json()
    # An @progarlabs.com e-mail claim grants nothing: the role comes from the database.
    assert me["role"] == "public_trial" and not me["administrator"]
    assert client.get("/admin/cohorts", headers=bearer(again)).status_code == 403
    refreshed = client.post("/sessions/refresh", headers=bearer(again))
    assert refreshed.status_code == 201 and refreshed.json()["identity"] == identity
    assert client.get("/sessions/me", headers=bearer(again)).status_code == 401
    deleted = client.delete("/me", headers=bearer(refreshed))
    assert deleted.status_code == 200 and deleted.json()["sessions_revoked"] == 2
    assert client.get("/sessions/me", headers=bearer(refreshed)).status_code == 401
    # Logging in again returns the same identity (and its consumption): no new trial.
    assert exchange(client, firebase_token("fb-user-1")).json()["identity"] == identity
    with psycopg.connect(database) as conn:
        stored = conn.execute("SELECT count(*) FROM federated_subjects").fetchone()[0]
        clear = conn.execute(
            "SELECT count(*) FROM auth_events WHERE actor LIKE '%%fb-user%%' "
            "OR identity_id LIKE '%%fb-user%%'"
        ).fetchone()[0]
    assert stored == 2 and clear == 0  # only hashes of the UID are stored


def test_public_quota_is_once_per_identity_and_cohorts_are_independent(client, meta, database):  # noqa: F811
    public = bearer(exchange(client, firebase_token("fb-public")))
    assert client.get("/me/quota", headers=public).json()["status"] == "ai_disabled"
    assert client.post("/guide/query", json=QUESTION, headers=public).status_code == 503
    enable(client, "public_trial", 60_000_000, 300_000, daily=8)
    assert client.get("/me/quota", headers=public).json()["status"] == "available"

    # Three Wilo reservations (100 000 each) exhaust USD 0.30; provider errors still count.
    statuses = [
        client.post("/guide/query", json=QUESTION, headers=public).status_code for _ in range(4)
    ]
    assert statuses == [502, 502, 502, 429]
    # A new token, logout or refresh never renews the trial.
    fresh = bearer(exchange(client, firebase_token("fb-public")))
    assert client.post("/guide/query", json=QUESTION, headers=fresh).status_code == 429
    quota = client.get("/me/quota", headers=fresh).json()
    assert quota["units_reserved"] == 300_000 and quota["units_available"] == 0
    assert "cap_units" not in quota and quota["plan"] == "Prueba gratuita"

    # The team cohort is assigned only by an admin, and charges its own pool.
    developer = exchange(client, firebase_token("fb-dev"))
    dev_id, dev = developer.json()["identity"], bearer(developer)
    assert client.post("/guide/query", json=QUESTION, headers=dev).status_code == 502  # public
    promoted = client.put(
        f"/admin/identities/{dev_id}",
        json={"role": "team_developer", "reason": "integrante verificado"},
        headers=ADMIN,
    )
    assert promoted.status_code == 200 and promoted.json()["role"] == "team_developer"
    assert client.post("/guide/query", json=QUESTION, headers=dev).status_code == 503  # off
    enable(client, "team_developer", 200_000, 8_000_000)
    assert client.post("/guide/query", json=QUESTION, headers=dev).status_code == 502
    assert client.post("/guide/query", json=QUESTION, headers=dev).status_code == 502
    # Cohorts share the campaign pool (migration 009): a cohort cap no longer stops the team.
    assert client.post("/guide/query", json=QUESTION, headers=dev).status_code == 502

    overview = client.get("/admin/cohorts", headers=ADMIN).json()
    used = {c["cohort"]: c["reserved_units"] for c in overview["cohorts"]}
    assert used == {
        "public_trial": 400_000,
        "team_developer": 300_000,
        "internal_qa": 0,
        "public_demo": 0,
    }
    # The promoted developer's earlier public reservation stays in the public pool.
    assert client.get("/me/quota", headers=dev).json()["units_reserved"] == 400_000

    # Budget moves are audited and bounded by the lifetime cap and by what is reserved.
    too_much = {"cap_units": 90_000_000, "identity_cap_units": 1, "daily_requests_per_identity": 1}
    assert (
        client.put(
            "/admin/cohorts/internal_qa",
            json={**too_much, "ai_enabled": True, "reason": "x" * 3},
            headers=ADMIN,
        ).status_code
        == 422
    )
    below = {"cap_units": 100_000, "identity_cap_units": 1, "daily_requests_per_identity": 1}
    assert (
        client.put(
            "/admin/cohorts/team_developer",
            json={**below, "ai_enabled": True, "reason": "baja"},
            headers=ADMIN,
        ).status_code
        == 422
    )
    with psycopg.connect(database) as conn:
        audit = conn.execute(
            "SELECT event, detail->>'reason' FROM auth_events "
            "WHERE event IN ('cohort_updated','identity_updated') ORDER BY id"
        ).fetchall()
    assert [e for e, _ in audit] == ["cohort_updated", "identity_updated", "cohort_updated"]
    assert len(meta) > 0 and all(r[2] == "provider_error" for r in ledger_rows(database))


def ledger_rows(url):
    with psycopg.connect(url) as conn:
        return conn.execute(
            "SELECT identity_id, cohort, status, reserved_units FROM execution_reservations"
        ).fetchall()


def test_suspension_unknown_identities_and_global_cap(client, database):  # noqa: F811
    enable(client, "public_trial", 60_000_000, 300_000)
    member = exchange(client, firebase_token("fb-suspended"))
    name, headers = member.json()["identity"], bearer(member)
    suspend = {"role": "public_trial", "suspended": True, "reason": "abuso"}
    assert client.put(f"/admin/identities/{name}", json=suspend, headers=ADMIN).status_code == 200
    assert client.get("/sessions/me", headers=headers).status_code == 401  # sessions revoked
    assert exchange(client, firebase_token("fb-suspended")).status_code == 403
    # Static operator tokens have no cohort row: they cannot spend until an admin assigns one.
    refused = client.post("/guide/query", json=QUESTION, headers=ADMIN)
    assert (
        refused.status_code == 403
        and refused.json()["detail"] == "Identidad sin grupo presupuestario"
    )


def test_cohort_caps_hold_under_concurrent_workers_and_processes(database):  # noqa: F811
    config = settings(database, **COHORTS)
    with psycopg.connect(database) as conn:
        conn.execute("UPDATE budget_cohorts SET ai_enabled=true, identity_cap_units=300000")
        for n in range(6):
            conn.execute(
                "INSERT INTO identities VALUES (%s,'public_trial','public_trial')", (f"u-par-{n}",)
            )
    store = ExecutionStore(config.model_copy(update={"budget_concurrency": 8}))

    def attempt(owner):
        try:
            identifier = store.reserve(owner, "guide")
            store.finish(identifier, "completed", {})
            return 1
        except HTTPException:
            return 0

    with psycopg.connect(database) as conn:
        conn.execute("UPDATE campaign_state SET reservation_cap_units=500000")
    # One identity: exactly 3 of 12 (USD 0.30 cap); the campaign (USD 0.50) admits 2 more.
    with ThreadPoolExecutor(12) as pool:
        assert sum(pool.map(attempt, ["u-par-0"] * 12)) == 3
    code = (
        "import sys; from fastapi import HTTPException; from bosque_api.execution import "
        "ExecutionStore; from test_federated_cohorts import COHORTS; from "
        "test_meta_controls import settings\n"
        "c=settings(sys.argv[1], **COHORTS)\n"
        "s=ExecutionStore(c.model_copy(update={'budget_concurrency':8}))\n"
        "ok=0\n"
        "for owner in sys.argv[2:]:\n"
        "    try: s.finish(s.reserve(owner,'guide'),'completed',{}); ok+=1\n"
        "    except HTTPException: pass\n"
        "print(ok)"
    )
    owners = [f"u-par-{n}" for n in range(1, 6)] * 2
    processes = [
        subprocess.Popen(
            [sys.executable, "-c", code, database, *owners[i::2]],
            stdout=subprocess.PIPE,
            text=True,
            cwd=str(__import__("pathlib").Path(__file__).parent),
        )
        for i in range(2)
    ]
    admitted = sum(int(p.communicate(timeout=120)[0].strip().splitlines()[-1]) for p in processes)
    assert admitted == 2
    assert sum(r[3] for r in ledger_rows(database)) == 500_000


def test_invitation_identity_links_federated_login_without_new_quota(client, database):  # noqa: F811
    invited = session(client, "beta-07")
    token = firebase_token("fb-beta-07")
    assert (
        client.post(
            "/sessions/federated/link", json={"id_token": token}, headers=invited
        ).status_code
        == 204
    )
    assert exchange(client, token).json()["identity"] == "beta-07"
    linked_again = client.post(
        "/sessions/federated/link", json={"id_token": token}, headers=invited
    )
    assert linked_again.status_code == 409
    with psycopg.connect(database) as conn:
        role = conn.execute("SELECT role FROM identities WHERE id='beta-07'").fetchone()[0]
    assert role == "internal_qa"
    # A federated session cannot link (no merging of existing identities).
    federated = bearer(exchange(client, firebase_token("fb-other")))
    third = client.post(
        "/sessions/federated/link", json={"id_token": firebase_token("fb-x")}, headers=federated
    )
    assert third.status_code == 400


def test_new_registrations_are_rate_limited_per_ip(client):
    codes = [exchange(client, firebase_token(f"fb-burst-{n}")).status_code for n in range(6)]
    assert codes == [201] * 5 + [429]
    assert exchange(client, firebase_token("fb-burst-0")).status_code == 201  # known: allowed
