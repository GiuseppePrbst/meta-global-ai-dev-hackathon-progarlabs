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
