"""PostgreSQL queue. Expired running jobs require manual reconciliation."""

import hashlib
import json
from pathlib import Path
from uuid import uuid4

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from evaluations.sam_workers.schemas import Experiment


def fingerprint(specification):
    canonical = json.dumps(
        specification, sort_keys=True, separators=(",", ":"), allow_nan=False
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class Queue:
    def __init__(self, database_url):
        self.database_url = database_url

    def connect(self):
        return psycopg.connect(
            self.database_url,
            row_factory=dict_row,
            connect_timeout=3,
            client_encoding="UTF8",
        )

    def migrate(self):
        with self.connect() as conn:
            conn.execute(
                Path(__file__).with_name("schema.sql").read_text(encoding="utf-8")
            )

    def enqueue(self, campaign_id, specification, priority=0, max_attempts=1):
        specification = Experiment.model_validate(specification).model_dump(mode="json")
        key = fingerprint(
            {k: v for k, v in specification.items() if k != "protocol_approved_by"}
        )
        with self.connect() as conn:
            if (
                specification["replica"] == 0
                and conn.execute(
                    "SELECT 1 FROM sam_historical_results WHERE media_sha256=%s LIMIT 1",
                    (specification["media_sha256"],),
                ).fetchone()
            ):
                raise ValueError(
                    "Historical media requires manual experimental reconciliation"
                )
            row = conn.execute(
                """INSERT INTO sam_experiment_jobs
                (job_id,campaign_id,experiment_fingerprint,specification,status,priority,max_attempts)
                VALUES (%s,%s,%s,%s,'queued',%s,%s)
                ON CONFLICT (experiment_fingerprint) DO NOTHING RETURNING job_id""",
                (
                    uuid4(),
                    campaign_id,
                    key,
                    Jsonb(specification),
                    priority,
                    max_attempts,
                ),
            ).fetchone()
        return row["job_id"] if row else None

    def recover(self):
        with self.connect() as conn:
            conn.execute("""UPDATE sam_experiment_jobs SET status=CASE WHEN status='leased'
                THEN 'queued' ELSE 'reconciliation_required' END, lease_owner=NULL,
                lease_expires_at=NULL WHERE status IN ('leased','running') AND lease_expires_at < now()""")

    def claim(self, owner, lease_seconds=120, campaign_id=None):
        with self.connect() as conn:
            return conn.execute(
                """WITH candidate AS (
                SELECT job_id FROM sam_experiment_jobs WHERE status='queued' AND attempt_count < max_attempts
                AND (%s::text IS NULL OR campaign_id=%s)
                ORDER BY priority DESC,created_at FOR UPDATE SKIP LOCKED LIMIT 1)
                UPDATE sam_experiment_jobs j SET status='leased', lease_owner=%s,
                lease_expires_at=now()+(%s * interval '1 second'), heartbeat_at=now()
                FROM candidate WHERE j.job_id=candidate.job_id RETURNING j.*""",
                (campaign_id, campaign_id, owner, lease_seconds),
            ).fetchone()

    def start(self, job_id, owner):
        with self.connect() as conn:
            return bool(
                conn.execute(
                    """UPDATE sam_experiment_jobs SET status='running',
                attempt_count=attempt_count+1, started_at=now() WHERE job_id=%s AND
                status='leased' AND lease_owner=%s AND lease_expires_at>now() RETURNING job_id""",
                    (job_id, owner),
                ).fetchone()
            )

    def heartbeat(self, job_id, owner, lease_seconds=120):
        with self.connect() as conn:
            return bool(
                conn.execute(
                    """UPDATE sam_experiment_jobs SET heartbeat_at=now(),
                lease_expires_at=now()+(%s * interval '1 second') WHERE job_id=%s AND
                lease_owner=%s AND status IN ('leased','running') AND lease_expires_at>now()
                RETURNING job_id""",
                    (lease_seconds, job_id, owner),
                ).fetchone()
            )

    def finish(self, job_id, owner, status):
        if status not in {
            "completed",
            "no_matches",
            "permanent_failure",
            "budget_blocked",
            "rights_blocked",
            "reconciliation_required",
        }:
            raise ValueError("Invalid final state")
        with self.connect() as conn:
            return bool(
                conn.execute(
                    """UPDATE sam_experiment_jobs SET status=%s, finished_at=now(),
                lease_owner=NULL,lease_expires_at=NULL WHERE job_id=%s AND lease_owner=%s
                AND status='running' AND lease_expires_at>now() RETURNING job_id""",
                    (status, job_id, owner),
                ).fetchone()
            )

    def status(self):
        with self.connect() as conn:
            return {
                row["status"]: row["count"]
                for row in conn.execute(
                    "SELECT status,count(*) FROM sam_experiment_jobs GROUP BY status"
                )
            }

    def get(self, job_id):
        with self.connect() as conn:
            return conn.execute(
                "SELECT job_id,status,specification,experiment_fingerprint FROM sam_experiment_jobs WHERE job_id=%s",
                (job_id,),
            ).fetchone()
