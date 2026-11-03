"""Tests use only a separately provisioned PostgreSQL database."""

import os
import subprocess
import sys
from pathlib import Path
from uuid import uuid4

import pytest

sys.path.insert(0, str(Path(__file__).parents[3]))
from evaluations.sam_workers.queue import Queue, fingerprint


def test_fingerprint_is_canonical_and_sensitive_to_parameters():
    assert fingerprint({"a": 1, "b": 2}) == fingerprint({"b": 2, "a": 1})
    assert fingerprint({"prompt": "fern"}) != fingerprint({"prompt": "tree"})


def test_expired_financial_authorization_is_rejected():
    from evaluations.sam_workers.schemas import FinancialAuthorization

    auth = FinancialAuthorization.model_validate(
        {
            "campaign_id": "test",
            "responsible": "owner",
            "source_kind": "owner_declared",
            "source": "billing snapshot",
            "evidence_sha256": "a" * 64,
            "observed_usd": 140,
            "limit_usd": 130,
            "margin_usd": 10,
            "ledger_phase": "I",
            "checked_at": "2026-01-01T00:00:00Z",
            "expires_at": "2026-01-02T00:00:00Z",
        }
    )
    with pytest.raises(ValueError, match="expired"):
        auth.validate_current("test")


def test_worker_delegates_to_runner_and_preserves_result(tmp_path, monkeypatch):
    import hashlib
    import json
    from datetime import UTC, datetime, timedelta
    from types import SimpleNamespace

    from evaluations.sam_workers import worker

    image = tmp_path / "image.jpg"
    image.write_bytes(b"synthetic")
    sha = hashlib.sha256(image.read_bytes()).hexdigest()
    registry = tmp_path / "registry.json"
    registry.write_text(
        json.dumps(
            {sha: {"path": str(image), "external_processing_permission": "approved"}}
        )
    )
    job_id = uuid4()
    evidence = tmp_path / "billing-evidence"
    evidence.write_bytes(b"synthetic evidence")
    now = datetime.now(UTC)
    authorization = tmp_path / "authorization.json"
    authorization.write_text(
        json.dumps(
            {
                "campaign_id": "test",
                "responsible": "owner",
                "source_kind": "provider_verified",
                "source": "billing snapshot",
                "evidence_sha256": hashlib.sha256(evidence.read_bytes()).hexdigest(),
                "observed_usd": 140,
                "limit_usd": 130,
                "margin_usd": 10,
                "ledger_phase": "I",
                "checked_at": now.isoformat(),
                "expires_at": (now + timedelta(hours=1)).isoformat(),
            }
        )
    )

    class FakeQueue:
        database_url = "synthetic"

        def claim(self, owner, campaign_id=None):
            assert campaign_id == "test"
            return {
                "job_id": job_id,
                "attempt_count": 0,
                "experiment_fingerprint": "f" * 64,
                "specification": {
                    "media_sha256": sha,
                    "model": "sam-3.1",
                    "mode": "concept",
                    "protocol_approved_by": "test",
                    "prompt": "fern",
                },
            }

        def start(self, job, owner):
            return True

        def finish(self, job, owner, status):
            self.result = status
            return True

    async def runner(config, source, output, prompt, **kwargs):
        assert source == image and not output.exists() and kwargs["phase"] == "I"
        output.mkdir(parents=True)
        result = {
            "status": "no_matches",
            "source_sha256": sha,
            "model": "sam-3.1",
            "concept": prompt,
            "cleanup": "not_uploaded",
            "reservation_id": str(uuid4()),
            "experiment_fingerprint": kwargs["experiment_fingerprint"],
            "job_id": str(kwargs["job_context"][0]),
            "job_attempt": kwargs["job_context"][2],
        }
        (output / "result.json").write_text(json.dumps(result))
        return result

    monkeypatch.setattr(
        worker,
        "campaign_from_private",
        lambda _: SimpleNamespace(phase_caps_usd={"I": 130}),
    )
    monkeypatch.setattr(
        worker,
        "config_from_private",
        lambda _: SimpleNamespace(
            database_url=SimpleNamespace(get_secret_value=lambda: "synthetic")
        ),
    )
    monkeypatch.setattr(worker, "run_experiment", runner)
    monkeypatch.setattr(worker, "ledger_completed", lambda *_: True)
    queue = FakeQueue()
    assert (
        worker.run_one(
            queue,
            tmp_path / "config",
            registry,
            tmp_path / "results",
            authorization,
            evidence,
        )
        == "no_matches"
    )
    assert queue.result == "no_matches"
    monkeypatch.setattr(queue, "finish", lambda *args: False)
    with pytest.raises(worker.PersistenceUnconfirmed, match="Lease lost"):
        worker.run_one(
            queue,
            tmp_path / "config",
            registry,
            tmp_path / "results",
            authorization,
            evidence,
        )


@pytest.fixture
def queue():
    url = os.getenv("SAM_WORKERS_TEST_DATABASE_URL")
    if not url:
        pytest.skip("isolated SAM_WORKERS_TEST_DATABASE_URL required")
    q = Queue(url)
    q.migrate()
    with q.connect() as conn:
        conn.execute("DELETE FROM sam_experiment_jobs")
    yield q
    with q.connect() as conn:
        conn.execute("DELETE FROM sam_experiment_jobs")


def test_claim_across_processes_and_recover_ambiguous_execution(queue):
    spec = {
        "media_sha256": "a" * 64,
        "prompt": "fern",
        "model_version": "1",
        "protocol_version": "1",
        "protocol_approved_by": "test",
        "preprocessing_version": "1",
    }
    job = queue.enqueue("synthetic", spec)
    assert (
        queue.enqueue("other", spec | {"protocol_approved_by": "another reviewer"})
        is None
    )
    script = (
        "import os; from uuid import uuid4; from evaluations.sam_workers.queue import Queue; "
        "x=Queue(os.environ['SAM_WORKERS_TEST_DATABASE_URL']).claim(uuid4()); "
        "print('claimed' if x else 'empty')"
    )
    children = [
        subprocess.Popen(
            [sys.executable, "-c", script], stdout=subprocess.PIPE, text=True
        )
        for _ in range(2)
    ]
    assert sorted(p.communicate(timeout=15)[0].strip() for p in children) == [
        "claimed",
        "empty",
    ]
    with queue.connect() as conn:
        row = conn.execute(
            "SELECT lease_owner FROM sam_experiment_jobs WHERE job_id=%s", (job,)
        ).fetchone()
    assert queue.start(job, row["lease_owner"])
    with queue.connect() as conn:
        conn.execute(
            "UPDATE sam_experiment_jobs SET lease_expires_at=now()-interval '1 second'"
        )
    queue.recover()
    assert queue.status() == {"reconciliation_required": 1}
    assert queue.claim(uuid4()) is None


def test_priority_expired_lease_and_terminal_no_matches(queue):
    spec = {
        "media_sha256": "b" * 64,
        "prompt": "fern",
        "model_version": "1",
        "protocol_version": "1",
        "protocol_approved_by": "test",
        "preprocessing_version": "1",
    }
    low = queue.enqueue("synthetic", spec, priority=0)
    high = queue.enqueue("synthetic", spec | {"prompt": "tree"}, priority=9)
    owner = uuid4()
    assert queue.claim(owner)["job_id"] == high
    with queue.connect() as conn:
        conn.execute(
            "UPDATE sam_experiment_jobs SET lease_expires_at=now()-interval '1 second' WHERE job_id=%s",
            (high,),
        )
    queue.recover()
    assert queue.claim(owner)["job_id"] == high
    assert queue.start(high, owner)
    assert queue.finish(high, owner, "no_matches")
    assert queue.claim(owner)["job_id"] == low


def test_history_import_twice_preserves_evidence(queue, tmp_path):
    from evaluations.sam_workers.history import import_history

    directory = tmp_path / ("v2-test-" + uuid4().hex)
    directory.mkdir()
    result = directory / "result.json"
    content = (
        '{"status":"completed","source_sha256":"' + "c" * 64 + '","model":"sam-3.1"}'
    )
    result.write_text(content, encoding="utf-8")
    campaign = "test-" + uuid4().hex
    assert import_history(queue, tmp_path, campaign)["inserted"] == 1
    assert import_history(queue, tmp_path, campaign)["existing"] == 1
    assert result.read_text(encoding="utf-8") == content
    with queue.connect() as conn:
        conn.execute(
            "DELETE FROM sam_historical_results WHERE campaign_id=%s", (campaign,)
        )


def test_reconcile_inspects_evidence_without_changing_job(tmp_path):
    import json

    from evaluations.sam_workers.reconcile import inspect

    job_id = uuid4()

    class FakeQueue:
        def get(self, identifier):
            return {
                "job_id": identifier,
                "status": "reconciliation_required",
                "specification": {
                    "media_sha256": "a" * 64,
                    "model": "sam-3.1",
                    "prompt": "fern",
                },
            }

    result = tmp_path / str(job_id) / "result.json"
    result.parent.mkdir()
    result.write_text(
        json.dumps(
            {
                "source_sha256": "a" * 64,
                "model": "sam-3.1",
                "concept": "fern",
                "status": "completed",
                "cleanup": "not_uploaded",
            }
        )
    )
    report = inspect(FakeQueue(), job_id, tmp_path)
    assert report["evidence"] == "matching" and report["action"] == "manual_review"


def test_ten_offline_jobs_finish_once(queue):
    owner = uuid4()
    for index in range(10):
        spec = {
            "media_sha256": f"{index + 1:064x}",
            "prompt": "fern",
            "model_version": "1",
            "protocol_version": "1",
            "protocol_approved_by": "test",
            "preprocessing_version": "1",
        }
        assert queue.enqueue("offline-ten", spec)
    for _ in range(10):
        job = queue.claim(owner, campaign_id="offline-ten")
        assert queue.start(job["job_id"], owner)
        assert queue.finish(job["job_id"], owner, "completed")
    assert queue.claim(owner, campaign_id="offline-ten") is None
    assert queue.status() == {"completed": 10}


def test_ten_offline_workers_persist_results_and_resume(queue, tmp_path, monkeypatch):
    import hashlib
    import json
    from datetime import UTC, datetime, timedelta
    from types import SimpleNamespace

    from evaluations.sam_workers import worker
    from evaluations.sam_workers.reconcile import inspect

    registry = {}
    for index in range(10):
        media = tmp_path / f"synthetic-{index}.jpg"
        media.write_bytes(f"synthetic-{index}".encode())
        sha = hashlib.sha256(media.read_bytes()).hexdigest()
        registry[sha] = {
            "path": str(media),
            "external_processing_permission": "approved",
        }
        assert queue.enqueue(
            "offline-worker",
            {
                "media_sha256": sha,
                "prompt": "fern",
                "model_version": "1",
                "protocol_version": "1",
                "protocol_approved_by": "test",
                "preprocessing_version": "1",
            },
        )
    registry_file = tmp_path / "registry.json"
    registry_file.write_text(json.dumps(registry))
    evidence = tmp_path / "synthetic-billing"
    evidence.write_bytes(b"synthetic evidence")
    now = datetime.now(UTC)
    authorization = tmp_path / "authorization.json"
    authorization.write_text(
        json.dumps(
            {
                "campaign_id": "offline-worker",
                "responsible": "test",
                "source_kind": "provider_verified",
                "source": "synthetic evidence",
                "evidence_sha256": hashlib.sha256(evidence.read_bytes()).hexdigest(),
                "observed_usd": 139.26,
                "limit_usd": 130,
                "margin_usd": 10.86,
                "ledger_phase": "I",
                "checked_at": now.isoformat(),
                "expires_at": (now + timedelta(hours=1)).isoformat(),
            }
        )
    )
    monkeypatch.setattr(
        worker,
        "campaign_from_private",
        lambda _: SimpleNamespace(phase_caps_usd={"I": 130}),
    )
    monkeypatch.setattr(
        worker,
        "config_from_private",
        lambda _: SimpleNamespace(
            database_url=SimpleNamespace(get_secret_value=lambda: queue.database_url)
        ),
    )

    async def fake_runner(config, source, output, prompt, **kwargs):
        output.mkdir(parents=True)
        result = {
            "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "model": "sam-3.1",
            "concept": prompt,
            "status": "completed",
            "cleanup": "not_uploaded",
            "reservation_id": str(uuid4()),
            "experiment_fingerprint": kwargs["experiment_fingerprint"],
            "job_id": str(kwargs["job_context"][0]),
            "job_attempt": kwargs["job_context"][2],
            "simulated": True,
        }
        (output / "result.json").write_text(json.dumps(result))
        return result

    monkeypatch.setattr(worker, "run_experiment", fake_runner)
    monkeypatch.setattr(worker, "ledger_completed", lambda *_: True)
    output = tmp_path / "outputs"
    for _ in range(10):
        assert (
            worker.run_one(
                Queue(queue.database_url),
                tmp_path / "config",
                registry_file,
                output,
                authorization,
                evidence,
            )
            == "completed"
        )
    assert (
        worker.run_one(
            Queue(queue.database_url),
            tmp_path / "config",
            registry_file,
            output,
            authorization,
            evidence,
        )
        is False
    )
    assert queue.status() == {"completed": 10}
    for result in output.glob("*/result.json"):
        assert inspect(queue, result.parent.name, output)["evidence"] == "matching"
    assert len(list(output.glob("*/result.json"))) == 10


@pytest.mark.parametrize("command", ["drain", "stop", "crash"])
def test_cli_stop_drain_and_crash_during_active_job_and_resume(tmp_path, command):
    import hashlib
    import json
    import time

    import psycopg
    from psycopg import sql
    from psycopg.conninfo import make_conninfo

    url = os.getenv("SAM_WORKERS_CONTROL_TEST_DATABASE_URL")
    if not url:
        pytest.skip("isolated sam_workers_offline_test database required")
    schema = "worker_test_" + uuid4().hex
    with psycopg.connect(url, autocommit=True) as conn:
        conn.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
    scoped = make_conninfo(url, options=f"-csearch_path={schema},public")
    queue = Queue(scoped)
    try:
        queue.migrate()
        registry = {}
        for index in range(2):
            media = tmp_path / f"synthetic-{index}.jpg"
            media.write_bytes(f"fake-image-{index}".encode())
            sha = hashlib.sha256(media.read_bytes()).hexdigest()
            registry[sha] = {
                "path": str(media),
                "external_processing_permission": "approved",
            }
            assert queue.enqueue(
                "drain-test",
                {
                    "media_sha256": sha,
                    "model_version": "1",
                    "protocol_version": "1",
                    "protocol_approved_by": "test",
                    "preprocessing_version": "1",
                    "prompt": "fern",
                },
            )
        registry_file = tmp_path / "registry.json"
        registry_file.write_text(json.dumps(registry))
        sentinel = tmp_path / "active"
        script = (
            "import sys,time; from pathlib import Path; import evaluations.sam_workers.control as c; "
            "old=c.simulate_one; "
            "exec('def delayed(q,*a,**k):\\n original=q.start\\n def start(*args):\\n  value=original(*args)\\n  Path(sys.argv[1]).write_text(\"active\")\\n  time.sleep(3)\\n  return value\\n q.start=start\\n return old(q,*a,**k)'); "
            "c.simulate_one=delayed; c.serve(c.Queue(sys.argv[2]),'drain-test',sys.argv[3],sys.argv[4],simulated=True)"
        )
        script = script.replace(
            "c.Queue(",
            "__import__('evaluations.sam_workers.queue',fromlist=['Queue']).Queue(",
        )
        process = subprocess.Popen(
            [
                sys.executable,
                "-c",
                script,
                str(sentinel),
                scoped,
                str(registry_file),
                str(tmp_path / "out"),
            ]
        )
        deadline = time.monotonic() + 15
        while (
            not sentinel.exists()
            and time.monotonic() < deadline
            and process.poll() is None
        ):
            time.sleep(0.05)
        assert sentinel.exists(), "worker did not enter the simulated operation"
        assert queue.status() == {"running": 1, "queued": 1}
        env = dict(os.environ, SAM_WORKERS_DATABASE_URL=scoped)
        if command == "crash":
            process.terminate()
            process.wait(timeout=15)
            with queue.connect() as conn:
                conn.execute(
                    "UPDATE sam_experiment_jobs SET lease_expires_at=now()-interval '1 second' "
                    "WHERE status='running'"
                )
            queue.recover()
            assert queue.status() == {"reconciliation_required": 1, "queued": 1}
        else:
            subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "evaluations.sam_workers",
                    command,
                    "--campaign",
                    "drain-test",
                ],
                env=env,
                check=True,
                capture_output=True,
            )
            assert process.wait(timeout=15) == 0
            assert queue.status() == {"completed": 1, "queued": 1}
        subprocess.run(
            [
                sys.executable,
                "-m",
                "evaluations.sam_workers",
                "resume",
                "--campaign",
                "drain-test",
            ],
            env=env,
            check=True,
            capture_output=True,
        )
        subprocess.run(
            [
                sys.executable,
                "-m",
                "evaluations.sam_workers",
                "start",
                "--simulated",
                "--campaign",
                "drain-test",
                "--registry",
                str(registry_file),
                "--root",
                str(tmp_path / "out"),
            ],
            env=env,
            check=True,
            capture_output=True,
        )
        expected = (
            {"completed": 1, "reconciliation_required": 1}
            if command == "crash"
            else {"completed": 2}
        )
        assert queue.status() == expected
    finally:
        if "process" in locals() and process.poll() is None:
            process.terminate()
            process.wait(timeout=10)
        with psycopg.connect(url, autocommit=True) as conn:
            conn.execute(
                sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema))
            )
