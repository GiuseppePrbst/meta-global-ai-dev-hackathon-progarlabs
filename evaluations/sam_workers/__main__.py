"""Foreground commands; no inference is performed by plan or status."""

import argparse
import json
import os
from pathlib import Path

from evaluations.sam_workers.queue import Queue, fingerprint
from evaluations.sam_workers.schemas import Experiment
from tools.meta_sam_api_lab.media import digest, private_path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "action",
        choices=[
            "migrate",
            "status",
            "plan",
            "enqueue",
            "recover",
            "import-history",
            "reconcile",
            "doctor",
            "dry-run",
            "report",
        ],
    )
    parser.add_argument("--spec", type=Path)
    parser.add_argument("--campaign")
    parser.add_argument("--root", type=Path)
    parser.add_argument("--job")
    parser.add_argument("--registry", type=Path)
    args = parser.parse_args()
    if args.action in ("plan", "enqueue", "dry-run"):
        if not args.spec:
            parser.error("--spec is required")
        spec = Experiment.model_validate_json(
            private_path(args.spec).read_text("utf-8")
        )
        if spec.parameters:
            parser.error("only concept prompts without extra parameters are supported")
        if args.action == "plan":
            print(
                json.dumps(
                    {
                        "fingerprint": fingerprint(
                            spec.model_dump(
                                mode="json", exclude={"protocol_approved_by"}
                            )
                        ),
                        "requests": 1,
                    }
                )
            )
            return
        if args.action == "dry-run":
            if not args.registry:
                parser.error("--registry is required")
            registry = json.loads(
                private_path(args.registry).read_text(encoding="utf-8")
            )
            entry = registry.get(spec.media_sha256, {})
            if entry.get(
                "external_processing_permission"
            ) != "approved" or not entry.get("path"):
                raise ValueError("Media rights not approved")
            if digest(private_path(Path(entry["path"]))) != spec.media_sha256:
                raise ValueError("Media digest mismatch")
            print(
                json.dumps(
                    {
                        "media": "verified",
                        "rights": "approved",
                        "requests": 0,
                        "financial_authorization": "not_checked",
                    }
                )
            )
            return
    database = os.environ.get("SAM_WORKERS_DATABASE_URL")
    if not database:
        parser.error("SAM_WORKERS_DATABASE_URL is required")
    queue = Queue(database)
    if args.action == "migrate":
        queue.migrate()
    elif args.action == "status":
        print(json.dumps(queue.status()))
    elif args.action in ("doctor", "report"):
        with queue.connect() as conn:
            tables = conn.execute(
                "SELECT to_regclass('sam_experiment_jobs') IS NOT NULL AS queue, "
                "to_regclass('execution_reservations') IS NOT NULL AS ledger"
            ).fetchone()
            if args.action == "doctor":
                print(
                    json.dumps(
                        {
                            "database": "connected",
                            **tables,
                            "billing": "not_checked",
                            "provider": "not_checked",
                        }
                    )
                )
            else:
                rows = conn.execute(
                    "SELECT status,count(*) FROM sam_experiment_jobs GROUP BY status"
                ).fetchall()
                print(
                    json.dumps(
                        {
                            "jobs": {r["status"]: r["count"] for r in rows},
                            "billing": "not_checked",
                        }
                    )
                )
    elif args.action == "recover":
        queue.recover()
    elif args.action == "reconcile":
        if not args.root or not args.job:
            parser.error("--root and --job are required")
        from evaluations.sam_workers.reconcile import inspect

        print(json.dumps(inspect(queue, args.job, args.root)))
    elif args.action == "import-history":
        if not args.root or not args.campaign:
            parser.error("--root and --campaign are required")
        from evaluations.sam_workers.history import import_history

        print(json.dumps(import_history(queue, args.root, args.campaign)))
    elif args.action == "enqueue":
        if not args.campaign:
            parser.error("--campaign is required")
        job = queue.enqueue(args.campaign, spec.model_dump(mode="json"))
        print(
            json.dumps({"job_id": str(job) if job else None, "duplicate": job is None})
        )


if __name__ == "__main__":
    main()
