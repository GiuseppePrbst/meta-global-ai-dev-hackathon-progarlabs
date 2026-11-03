CREATE TABLE IF NOT EXISTS sam_experiment_jobs (
    job_id uuid PRIMARY KEY,
    campaign_id text NOT NULL,
    experiment_fingerprint text NOT NULL UNIQUE CHECK (experiment_fingerprint ~ '^[0-9a-f]{64}$'),
    specification jsonb NOT NULL,
    status text NOT NULL CHECK (status IN ('queued', 'leased', 'running', 'completed', 'no_matches', 'retry_pending', 'budget_blocked', 'rights_blocked', 'permanent_failure', 'cancelled', 'reconciliation_required')),
    priority integer NOT NULL DEFAULT 0,
    attempt_count integer NOT NULL DEFAULT 0,
    max_attempts integer NOT NULL CHECK (max_attempts > 0),
    lease_owner uuid,
    lease_expires_at timestamptz,
    heartbeat_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    started_at timestamptz,
    finished_at timestamptz,
    last_error text
);
CREATE INDEX IF NOT EXISTS sam_jobs_claim_idx ON sam_experiment_jobs (status, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS sam_jobs_lease_idx ON sam_experiment_jobs (lease_expires_at) WHERE status IN ('leased', 'running');
CREATE TABLE IF NOT EXISTS sam_job_reservations (
    job_id uuid NOT NULL REFERENCES sam_experiment_jobs(job_id),
    attempt integer NOT NULL CHECK (attempt > 0),
    reservation_id uuid NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(job_id, attempt)
);
DO $$
BEGIN
    IF to_regclass('execution_reservations') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conrelid='sam_job_reservations'::regclass
        AND conname='sam_job_reservations_ledger_fk'
    ) THEN
        ALTER TABLE sam_job_reservations ADD CONSTRAINT sam_job_reservations_ledger_fk
        FOREIGN KEY (reservation_id) REFERENCES execution_reservations(id) NOT VALID;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS sam_reconciliation_audit (
    audit_id uuid PRIMARY KEY,
    job_id uuid NOT NULL REFERENCES sam_experiment_jobs(job_id),
    previous_status text NOT NULL,
    new_status text NOT NULL,
    reviewer text NOT NULL,
    reason text NOT NULL,
    evidence_sha256 text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sam_worker_controls (
    campaign_id text PRIMARY KEY,
    desired_state text NOT NULL CHECK (desired_state IN ('running', 'draining', 'stopped')),
    worker_id uuid,
    process_id integer,
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sam_historical_results (
    evidence_sha256 text PRIMARY KEY CHECK (evidence_sha256 ~ '^[0-9a-f]{64}$'),
    historical_id text NOT NULL,
    campaign_id text NOT NULL,
    media_sha256 text,
    model text,
    prompt text,
    result_status text NOT NULL,
    created_at text,
    identity_reconstructed boolean NOT NULL DEFAULT false,
    UNIQUE (campaign_id, historical_id)
);
