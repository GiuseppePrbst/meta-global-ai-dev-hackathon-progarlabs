"""Inspect persisted evidence without resubmitting or guessing ledger identity."""

import json
from pathlib import Path
from uuid import UUID

from tools.meta_sam_api_lab.media import private_path


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
    if data.get("simulated") is True:
        ledger = "not_applicable_synthetic"
    elif reservation:
        try:
            reservation_id = UUID(reservation)
            with queue.connect() as conn:
                row = conn.execute(
                    "SELECT identity_id,status,reserved_units,reported_usage FROM execution_reservations WHERE id=%s",
                    (reservation_id,),
                ).fetchone()
            ledger = (
                "missing"
                if not row
                else (
                    "matching"
                    if row["identity_id"] == "sam-api-lab:I"
                    else "identity_mismatch"
                )
            )
        except (TypeError, ValueError):
            ledger = "invalid_reservation_id"
    return {
        "job_status": job["status"],
        "evidence": "matching" if matches else "mismatch",
        "result_status": data.get("status"),
        "cleanup": data.get("cleanup"),
        "ledger": ledger,
        "action": "manual_review",
    }
