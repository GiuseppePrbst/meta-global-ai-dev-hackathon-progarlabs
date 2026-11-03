"""Foreground worker control; no installation or automatic restart."""

import json
import os
from pathlib import Path
from uuid import uuid4

from tools.meta_sam_api_lab.media import digest, private_path


def set_state(queue, campaign, state):
    with queue.connect() as conn:
        conn.execute(
            """INSERT INTO sam_worker_controls(campaign_id,desired_state)
            VALUES (%s,%s) ON CONFLICT(campaign_id) DO UPDATE SET desired_state=excluded.desired_state,
            updated_at=now()""",
            (campaign, state),
        )


def simulate_one(queue, campaign, registry_path, output_root):
    owner = uuid4()
    job = queue.claim(owner, campaign_id=campaign)
    if not job:
        return False
    job_id = job["job_id"]
    if not queue.start(job_id, owner):
        raise RuntimeError("Lease lost before start")
    final = "reconciliation_required"
    try:
        registry = json.loads(
            private_path(Path(registry_path)).read_text(encoding="utf-8")
        )
        spec = job["specification"]
        entry = registry[spec["media_sha256"]]
        if entry.get("external_processing_permission") != "approved":
            final = "rights_blocked"
            return final
        source = private_path(Path(entry["path"]))
        if digest(source) != spec["media_sha256"]:
            final = "permanent_failure"
            return final
        output = private_path(Path(output_root)) / str(job_id)
        output.mkdir(parents=True, exist_ok=False)
        (output / "result.json").write_text(
            json.dumps(
                {
                    "source_sha256": spec["media_sha256"],
                    "model": spec["model"],
                    "status": "completed",
                    "cleanup": "not_uploaded",
                    "provider": "synthetic",
                    "simulated": True,
                    "concept": spec["prompt"],
                }
            ),
            encoding="utf-8",
        )
        final = "completed"
    finally:
        if not queue.finish(job_id, owner, final):
            raise RuntimeError("Final state not persisted; reconcile evidence")
    return final


def serve(
    queue,
    campaign,
    registry,
    output,
    *,
    simulated=False,
    config=None,
    authorization=None,
    evidence=None,
):
    worker_id = uuid4()
    if not simulated:
        from evaluations.sam_workers.schemas import FinancialAuthorization

        auth = FinancialAuthorization.model_validate_json(
            private_path(Path(authorization)).read_text("utf-8")
        )
        auth.validate_current(campaign)
    with queue.connect() as conn:
        database = conn.execute("SELECT current_database() AS name").fetchone()["name"]
        if simulated and database != "sam_workers_offline_test":
            raise ValueError(
                "Simulation requires isolated sam_workers_offline_test database"
            )
        locked = conn.execute(
            "SELECT pg_try_advisory_lock(hashtextextended(%s, 0)) AS acquired",
            ("sam-workers:" + campaign,),
        ).fetchone()["acquired"]
        if not locked:
            raise ValueError("A worker for this campaign is already running")
        conn.execute(
            """INSERT INTO sam_worker_controls(campaign_id,desired_state,worker_id,process_id)
            VALUES (%s,'running',%s,%s) ON CONFLICT(campaign_id) DO UPDATE SET desired_state='running',
            worker_id=excluded.worker_id,process_id=excluded.process_id,updated_at=now()""",
            (campaign, worker_id, os.getpid()),
        )
        conn.commit()
        try:
            while True:
                state = conn.execute(
                    "SELECT desired_state FROM sam_worker_controls WHERE campaign_id=%s",
                    (campaign,),
                ).fetchone()["desired_state"]
                conn.commit()
                if state != "running":
                    break
                if simulated:
                    result = simulate_one(queue, campaign, registry, output)
                else:
                    from evaluations.sam_workers.worker import run_one

                    result = run_one(
                        queue, config, registry, output, authorization, evidence
                    )
                if result is False:
                    break
                print(
                    json.dumps(
                        {
                            "event": "job_finished",
                            "state": result,
                            "worker_id": str(worker_id),
                        }
                    ),
                    flush=True,
                )
        finally:
            conn.execute(
                "UPDATE sam_worker_controls SET desired_state='stopped',worker_id=NULL,process_id=NULL, "
                "updated_at=now() WHERE campaign_id=%s AND worker_id=%s",
                (campaign, worker_id),
            )
