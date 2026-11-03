"""Inspect persisted evidence without resubmitting or guessing ledger identity."""

import json
from pathlib import Path
from uuid import UUID, uuid4

from tools.meta_sam_api_lab.media import digest, private_path


def inspect(queue, job_id, output_root):
    job_id = UUID(str(job_id))
    job = queue.get(job_id)
    if not job:
        raise ValueError("Unknown job")
    path = private_path(Path(output_root)) / str(job_id) / "result.json"
    if not path.is_file():
        return {
            "job_status": job["status"],
            "evidence": "missing",
            "action": "manual_review",
        }
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {
            "job_status": job["status"],
            "evidence": "unreadable",
            "action": "manual_review",
        }
    matches = (
        data.get("source_sha256") == job["specification"]["media_sha256"]
        and data.get("model") == job["specification"]["model"]
        and bool(job["specification"].get("prompt"))
        and data.get("concept") == job["specification"].get("prompt")
    )
    reservation = data.get("reservation_id")
    ledger = "missing_reservation_id"
    ledger_state = None
    reserved_units = None
    if data.get("simulated") is True:
        ledger = "not_applicable_synthetic"
    elif reservation:
        try:
            reservation_id = UUID(reservation)
            with queue.connect() as conn:
                row = conn.execute(
                    "SELECT r.identity_id,r.status,r.reserved_units,r.reported_usage, "
                    "l.job_id AS linked_job,l.attempt AS linked_attempt FROM execution_reservations r "
                    "LEFT JOIN sam_job_reservations l ON l.reservation_id=r.id WHERE r.id=%s",
                    (reservation_id,),
                ).fetchone()
            ledger = (
                "missing"
                if not row
                else (
                    "linked"
                    if row["identity_id"] == "sam-api-lab:I"
                    and row["linked_job"] == job_id
                    and row["linked_attempt"] == data.get("job_attempt")
                    else "phase_matches_unlinked"
                    if row["identity_id"] == "sam-api-lab:I"
                    else "identity_mismatch"
                )
            )
            if row:
                ledger_state = row["status"]
                reserved_units = row["reserved_units"]
        except (TypeError, ValueError):
            ledger = "invalid_reservation_id"
    return {
        "job_status": job["status"],
        "evidence": "matching" if matches else "mismatch",
        "result_status": data.get("status"),
        "cleanup": data.get("cleanup"),
        "ledger": ledger,
        "ledger_status": ledger_state,
        "reserved_units": reserved_units,
        "estimated_usd": data.get("estimated_usd"),
        "fingerprint": job.get("experiment_fingerprint"),
        "identity_complete": bool(
            matches
            and ledger == "linked"
            and data.get("job_id") == str(job_id)
            and data.get("experiment_fingerprint") == job.get("experiment_fingerprint")
            and job.get("experiment_fingerprint")
        ),
        "action": "manual_review",
    }


def resolve(queue, job_id, output_root, decision, reviewer, reason):
    """Resolve only terminal results corroborated by the linked completed ledger row."""
    if (
        decision not in ("completed", "no_matches")
        or len(reviewer.strip()) < 3
        or len(reason.strip()) < 10
    ):
        raise ValueError("Decision, reviewer and reason are required")
    job_id = UUID(str(job_id))
    path = private_path(Path(output_root)) / str(job_id) / "result.json"
    evidence_hash = digest(path)
    report = inspect(queue, job_id, output_root)
    if (
        not report.get("identity_complete")
        or report.get("result_status") != decision
        or report.get("ledger_status") != "completed"
        or report.get("cleanup") not in ("not_uploaded", "deleted")
        or digest(path) != evidence_hash
    ):
        raise ValueError("Insufficient matching result, ledger or cleanup evidence")
    data = json.loads(path.read_text(encoding="utf-8"))
    with queue.connect() as conn:
        row = conn.execute(
            """SELECT j.status FROM sam_experiment_jobs j
            JOIN sam_job_reservations l ON l.job_id=j.job_id AND l.attempt=%s
            JOIN execution_reservations r ON r.id=l.reservation_id
            WHERE j.job_id=%s AND r.id=%s AND r.identity_id='sam-api-lab:I'
            AND r.status='completed' FOR UPDATE OF j,r""",
            (data["job_attempt"], job_id, UUID(data["reservation_id"])),
        ).fetchone()
        if not row or row["status"] != "reconciliation_required":
            raise ValueError("Job is not eligible for reconciliation")
        if digest(path) != evidence_hash:
            raise ValueError("Evidence changed during reconciliation")
        conn.execute(
            "UPDATE sam_experiment_jobs SET status=%s,finished_at=now(),lease_owner=NULL,"
            "lease_expires_at=NULL WHERE job_id=%s",
            (decision, job_id),
        )
        conn.execute(
            "INSERT INTO sam_reconciliation_audit(audit_id,job_id,previous_status,new_status,reviewer,reason,evidence_sha256) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s)",
            (
                uuid4(),
                job_id,
                row["status"],
                decision,
                reviewer.strip(),
                reason.strip(),
                evidence_hash,
            ),
        )
    return {"job_status": decision, "evidence_sha256": evidence_hash}
