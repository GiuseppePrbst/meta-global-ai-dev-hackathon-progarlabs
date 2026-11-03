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


def test_worker_requires_verified_billing_before_claim():
    from evaluations.sam_workers.worker import run_one

    with pytest.raises(ValueError, match="balance must be verified"):
        run_one(None, None, None, None)


def test_worker_delegates_to_runner_and_preserves_result(tmp_path, monkeypatch):
    import hashlib
    import json
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

    class FakeQueue:
        database_url = "synthetic"

        def claim(self, owner):
            return {
                "job_id": job_id,
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

    async def runner(config, source, output, prompt, **kwargs):
        assert source == image and not output.exists() and kwargs["phase"] == "I"
        return {"status": "no_matches"}

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
    queue = FakeQueue()
    assert worker.run_one(
        queue,
        tmp_path / "config",
        registry,
        tmp_path / "results",
        billing_verified=True,
    )
    assert queue.result == "no_matches"


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
