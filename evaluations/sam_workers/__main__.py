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
            "resolve",
            "doctor",
            "dry-run",
            "report",
            "start",
            "stop",
            "drain",
            "resume",
            "register-authorization",
        ],
    )
    parser.add_argument("--spec", type=Path)
    parser.add_argument("--campaign")
    parser.add_argument("--root", type=Path)
    parser.add_argument("--job")
    parser.add_argument("--decision", choices=["completed", "no_matches"])
    parser.add_argument("--reviewer")
    parser.add_argument("--reason")
    parser.add_argument("--registry", type=Path)
    parser.add_argument("--config", type=Path)
    parser.add_argument("--authorization", type=Path)
    parser.add_argument("--evidence", type=Path)
    parser.add_argument("--simulated", action="store_true")
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
    if args.action == "register-authorization":
        if not all((args.config, args.authorization, args.evidence, args.campaign)):
            parser.error(
                "--config, --authorization, --evidence and --campaign are required"
            )
        from evaluations.sam_workers.schemas import register_financial_authorization
        from tools.meta_sam_api_lab.lab import (
            campaign_from_private,
            config_from_private,
        )

        config = config_from_private(args.config)
        campaign = campaign_from_private(args.config)
        if (
            not campaign
            or "I" not in campaign.phase_caps_usd
            or config.database_url.get_secret_value() != database
        ):
            raise ValueError("Shared phase I ledger is required")
        identifier = register_financial_authorization(
            queue,
            args.authorization,
            args.evidence,
            args.campaign,
            campaign.phase_caps_usd["I"],
        )
        print(
            json.dumps(
                {
                    "authorization_id": str(identifier) if identifier else None,
                    "duplicate": identifier is None,
                }
            )
        )
    elif args.action in ("start", "stop", "drain", "resume"):
        if not args.campaign:
            parser.error("--campaign is required")
        from evaluations.sam_workers.control import serve, set_state

        if args.action == "start":
            if not args.registry or not args.root:
                parser.error("--registry and --root are required")
            if not args.simulated and not all(
                (args.config, args.authorization, args.evidence)
            ):
                parser.error("--config, --authorization and --evidence are required")
            serve(
                queue,
                args.campaign,
                args.registry,
                args.root,
                simulated=args.simulated,
                config=args.config,
                authorization=args.authorization,
                evidence=args.evidence,
            )
        else:
            set_state(
                queue,
                args.campaign,
                {"stop": "stopped", "drain": "draining", "resume": "running"}[
                    args.action
                ],
            )
            print(json.dumps({"campaign": args.campaign, "command": args.action}))
    elif args.action == "migrate":
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
    elif args.action == "resolve":
        if not all((args.root, args.job, args.decision, args.reviewer, args.reason)):
            parser.error(
                "--root, --job, --decision, --reviewer and --reason are required"
            )
        from evaluations.sam_workers.reconcile import resolve

        print(
            json.dumps(
                resolve(
                    queue,
                    args.job,
                    args.root,
                    args.decision,
                    args.reviewer,
                    args.reason,
                )
            )
        )
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
