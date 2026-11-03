"""Execute a leased image job using the existing runner and ledger."""

import asyncio
import json
import threading
from pathlib import Path
from uuid import uuid4

import psycopg

from evaluations.sam_workers.schemas import FinancialAuthorization, financial_snapshot
from tools.meta_sam_api_lab.lab import (
    campaign_from_private,
    config_from_private,
    run_experiment,
)
from tools.meta_sam_api_lab.media import digest, private_path


class PersistenceUnconfirmed(RuntimeError):
    """The private result may exist; reconcile it before any retry."""


def ledger_completed(queue, reservation_id, job_id, attempt):
    with queue.connect() as conn:
        row = conn.execute(
            "SELECT r.identity_id, r.status FROM execution_reservations r "
            "JOIN sam_job_reservations l ON l.reservation_id=r.id "
            "WHERE r.id=%s AND l.job_id=%s AND l.attempt=%s",
            (reservation_id, job_id, attempt),
        ).fetchone()
    return bool(
        row and row["identity_id"] == "sam-api-lab:I" and row["status"] == "completed"
    )


def run_one(
    queue, config_file, registry_file, output_root, authorization_file, evidence_file
):
    """Execute one job only with current, independently recorded provider evidence."""
    auth = FinancialAuthorization.model_validate_json(
        private_path(Path(authorization_file)).read_text(encoding="utf-8")
    )
    campaign = campaign_from_private(Path(config_file))
    config = config_from_private(Path(config_file))
    if (
        not campaign
        or "I" not in campaign.phase_caps_usd
        or campaign.phase_caps_usd["I"] > auth.limit_usd
        or config.database_url.get_secret_value() != queue.database_url
    ):
        raise ValueError("Authorization does not match shared phase I ledger")
    financial_snapshot(
        authorization_file,
        evidence_file,
        auth.campaign_id,
        campaign.phase_caps_usd["I"],
    )
    private_config = json.loads(
        private_path(Path(config_file)).read_text(encoding="utf-8")
    )
    credit_snapshot = {
        "authorization_id": private_config["financial_authorization_id"],
        "authorization_file": str(authorization_file),
        "evidence_file": str(evidence_file),
        "campaign_id": auth.campaign_id,
    }
    owner = uuid4()
    job = queue.claim(owner, campaign_id=auth.campaign_id)
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
            return final
        source = private_path(Path(entry["path"]))
        if digest(source) != spec["media_sha256"]:
            final = "permanent_failure"
            return final
        if (
            spec.get("model") != "sam-3.1"
            or spec.get("mode") != "concept"
            or not spec.get("protocol_approved_by")
            or spec.get("parameters")
        ):
            final = "permanent_failure"
            return final
        output = private_path(Path(output_root)) / str(job_id)
        if output.exists():
            return final
        result = asyncio.run(
            run_experiment(
                config,
                source,
                output,
                spec["prompt"],
                authorized=True,
                phase="I",
                phase_cap_usd=campaign.phase_caps_usd["I"],
                job_context=(job_id, owner, job["attempt_count"] + 1),
                experiment_fingerprint=job["experiment_fingerprint"],
                credit_snapshot=credit_snapshot,
            )
        )
        if result.get("status") in ("completed", "no_matches"):
            persisted = json.loads((output / "result.json").read_text(encoding="utf-8"))
            try:
                from uuid import UUID

                reservation_id = UUID(persisted.get("reservation_id", ""))
                evidence_complete = (
                    persisted.get("source_sha256") == spec["media_sha256"]
                    and persisted.get("model") == spec["model"]
                    and persisted.get("concept") == spec["prompt"]
                    and persisted.get("status") == result["status"]
                    and persisted.get("experiment_fingerprint")
                    == job["experiment_fingerprint"]
                    and persisted.get("job_id") == str(job_id)
                    and persisted.get("job_attempt") == job["attempt_count"] + 1
                    and persisted.get("cleanup") in ("not_uploaded", "deleted")
                    and ledger_completed(
                        queue, reservation_id, job_id, job["attempt_count"] + 1
                    )
                )
            except (ValueError, TypeError):
                evidence_complete = False
            if evidence_complete:
                final = result["status"]
    finally:
        stop.set()
        thread.join()
        try:
            confirmed = queue.finish(job_id, owner, final)
        except psycopg.Error as exc:
            raise PersistenceUnconfirmed(
                "Final state not persisted; reconcile private evidence"
            ) from exc
        if not confirmed:
            raise PersistenceUnconfirmed(
                "Lease lost; reconcile private evidence before retry"
            )
    return final
