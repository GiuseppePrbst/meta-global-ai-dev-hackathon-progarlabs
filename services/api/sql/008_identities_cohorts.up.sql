-- 008: stable identities with backend-managed roles, federated subjects and budget cohorts.
-- Additive: no row is deleted; reservations keep their history (cohort is NULL before 008).
CREATE TABLE IF NOT EXISTS budget_cohorts (
    cohort text PRIMARY KEY CHECK (cohort IN ('public_trial', 'team_developer', 'internal_qa')),
    cap_units bigint NOT NULL CHECK (cap_units >= 0),
    identity_cap_units bigint NOT NULL CHECK (identity_cap_units >= 0),
    daily_requests_per_identity integer NOT NULL
        CHECK (daily_requests_per_identity BETWEEN 0 AND 1000),
    ai_enabled boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL DEFAULT now()
);
-- Authorized 04-11-2026 (owner, USD 100 campaign): 60 + 25 + 5 USD, 10 USD unassigned margin.
-- Every cohort starts with AI disabled; enabling one is an audited admin action.
INSERT INTO budget_cohorts(cohort, cap_units, identity_cap_units, daily_requests_per_identity)
VALUES ('public_trial', 60000000, 300000, 8),
       ('team_developer', 25000000, 8000000, 100),
       ('internal_qa', 5000000, 5000000, 60)
ON CONFLICT (cohort) DO NOTHING;

CREATE TABLE IF NOT EXISTS identities (
    id text PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9-]{2,40}$'),
    role text NOT NULL
        CHECK (role IN ('public_trial', 'team_developer', 'internal_qa', 'administrator')),
    cohort text NOT NULL REFERENCES budget_cohorts(cohort),
    created_at timestamptz NOT NULL DEFAULT now(),
    suspended_at timestamptz
);

-- SHA-256 of "<firebase project>:<uid>": the UID itself is never stored. Several subjects may
-- point to one identity (linking); never merged automatically by e-mail.
CREATE TABLE IF NOT EXISTS federated_subjects (
    subject_hash bytea PRIMARY KEY CHECK (octet_length(subject_hash) = 32),
    provider text NOT NULL CHECK (length(provider) BETWEEN 1 AND 40),
    identity_id text NOT NULL REFERENCES identities(id),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS federated_subjects_identity_idx ON federated_subjects(identity_id);

-- Closed-beta identities existing before 008 are controlled QA identities.
INSERT INTO identities(id, role, cohort)
SELECT DISTINCT identity_id, 'internal_qa', 'internal_qa' FROM access_invitations
ON CONFLICT (id) DO NOTHING;

ALTER TABLE execution_reservations
    ADD COLUMN IF NOT EXISTS cohort text REFERENCES budget_cohorts(cohort);
CREATE INDEX IF NOT EXISTS execution_reservations_cohort_idx ON execution_reservations(cohort);
CREATE INDEX IF NOT EXISTS execution_reservations_identity_idx
    ON execution_reservations(identity_id);

ALTER TABLE access_sessions ALTER COLUMN invitation_id DROP NOT NULL;
ALTER TABLE access_sessions
    ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'invitation';

ALTER TABLE auth_events ADD COLUMN IF NOT EXISTS detail jsonb;
ALTER TABLE auth_events DROP CONSTRAINT IF EXISTS auth_events_event_check;
ALTER TABLE auth_events ADD CONSTRAINT auth_events_event_check CHECK (event IN (
    'invitation_created', 'session_issued', 'session_refreshed',
    'session_revoked', 'identity_revoked',
    'federated_registered', 'federated_session_issued', 'identity_linked',
    'identity_updated', 'cohort_updated', 'account_deleted'
));
