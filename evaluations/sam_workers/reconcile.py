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
    )
    return {
        "job_status": job["status"],
        "evidence": "matching" if matches else "mismatch",
        "result_status": data.get("status"),
        "cleanup": data.get("cleanup"),
        "action": "manual_review",
    }
