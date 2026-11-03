"""Execute a leased image job using the existing runner and ledger."""

import asyncio
import json
import threading
from pathlib import Path
from uuid import uuid4

import psycopg

from tools.meta_sam_api_lab.lab import (
    campaign_from_private,
    config_from_private,
    run_experiment,
)
from tools.meta_sam_api_lab.media import digest, private_path


def run_one(queue, config_file, registry_file, output_root, *, billing_verified=False):
    """The caller must first independently verify current free-credit availability."""
    if not billing_verified:
        raise ValueError(
            "Current free-credit balance must be verified before execution"
        )
    owner = uuid4()
    job = queue.claim(owner)
    if not job:
        return False
    job_id = job["job_id"]
    if not queue.start(job_id, owner):
        return False
    stop = threading.Event()

    def heartbeat():
        while not stop.wait(30):
            try:
                if not queue.heartbeat(job_id, owner):
                    return
            except psycopg.Error:
                return

    thread = threading.Thread(target=heartbeat, daemon=True)
    thread.start()
    final = "reconciliation_required"
    try:
        spec = job["specification"]
        registry = json.loads(
            private_path(Path(registry_file)).read_text(encoding="utf-8")
        )
        entry = registry[spec["media_sha256"]]
        if entry.get("external_processing_permission") != "approved":
            final = "rights_blocked"
            return True
        source = private_path(Path(entry["path"]))
        if digest(source) != spec["media_sha256"]:
            final = "permanent_failure"
            return True
        if (
            spec.get("model") != "sam-3.1"
            or spec.get("mode") != "concept"
            or not spec.get("protocol_approved_by")
            or spec.get("parameters")
        ):
            final = "permanent_failure"
            return True
        campaign = campaign_from_private(Path(config_file))
        if not campaign or "I" not in campaign.phase_caps_usd:
            final = "budget_blocked"
            return True
        config = config_from_private(Path(config_file))
        if config.database_url.get_secret_value() != queue.database_url:
            final = "budget_blocked"
            return True
        output = private_path(Path(output_root)) / str(job_id)
        if output.exists():
            return True
        result = asyncio.run(
            run_experiment(
                config,
                source,
                output,
                spec["prompt"],
                authorized=True,
                phase="I",
                phase_cap_usd=campaign.phase_caps_usd["I"],
            )
        )
        if result.get("status") in ("completed", "no_matches"):
            final = result["status"]
        return True
    finally:
        stop.set()
        thread.join()
        queue.finish(job_id, owner, final)
