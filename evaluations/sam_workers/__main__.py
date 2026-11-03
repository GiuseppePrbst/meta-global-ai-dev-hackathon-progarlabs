"""Foreground commands; no inference is performed by plan or status."""

import argparse
import json
import os
from pathlib import Path

from evaluations.sam_workers.queue import Queue, fingerprint
from evaluations.sam_workers.schemas import Experiment
from tools.meta_sam_api_lab.media import private_path


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
        ],
    )
    parser.add_argument("--spec", type=Path)
    parser.add_argument("--campaign")
    parser.add_argument("--root", type=Path)
    parser.add_argument("--job")
    args = parser.parse_args()
    if args.action in ("plan", "enqueue"):
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
    database = os.environ.get("SAM_WORKERS_DATABASE_URL")
    if not database:
        parser.error("SAM_WORKERS_DATABASE_URL is required")
    queue = Queue(database)
    if args.action == "migrate":
        queue.migrate()
    elif args.action == "status":
        print(json.dumps(queue.status()))
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
