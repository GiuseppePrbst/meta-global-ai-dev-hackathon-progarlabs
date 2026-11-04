-- 009: the single campaign that bounds every Meta reservation, whoever makes it.
-- Additive: reservations, cohorts and identities keep their rows. Anonymous reservations use
-- the new public_demo cohort; cohorts no longer have separate pools, only this shared cap.
CREATE TABLE IF NOT EXISTS campaign_state (
    id text PRIMARY KEY CHECK (id = 'hackathon-2026'),
    expires_at timestamptz NOT NULL,
    reservation_cap_units bigint NOT NULL,
    closed_at timestamptz,
    closed_reason text,
    -- Extending the deadline or the cap needs a new migration, hence a new owner decision.
    CONSTRAINT campaign_state_limits CHECK (
        expires_at <= '2026-11-10T05:00:00Z' AND reservation_cap_units <= 90000000
    )
);
INSERT INTO campaign_state(id, expires_at, reservation_cap_units)
VALUES ('hackathon-2026', '2026-11-10T05:00:00Z', 90000000)
ON CONFLICT (id) DO NOTHING;

-- A closed campaign stays closed: no UPDATE can reopen it and its row cannot be deleted.
CREATE OR REPLACE FUNCTION campaign_state_guard() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'campaign_state cannot be deleted';
    END IF;
    IF OLD.closed_at IS NOT NULL AND NEW.closed_at IS NULL THEN
        RAISE EXCEPTION 'a closed campaign cannot be reopened';
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS campaign_state_guard ON campaign_state;
CREATE TRIGGER campaign_state_guard BEFORE UPDATE OR DELETE ON campaign_state
    FOR EACH ROW EXECUTE FUNCTION campaign_state_guard();

ALTER TABLE budget_cohorts DROP CONSTRAINT IF EXISTS budget_cohorts_cohort_check;
ALTER TABLE budget_cohorts ADD CONSTRAINT budget_cohorts_cohort_check CHECK (
    cohort IN ('public_trial', 'team_developer', 'internal_qa', 'public_demo')
);
INSERT INTO budget_cohorts(cohort, cap_units, identity_cap_units, daily_requests_per_identity)
VALUES ('public_demo', 0, 0, 0) ON CONFLICT (cohort) DO NOTHING;

ALTER TABLE auth_events DROP CONSTRAINT IF EXISTS auth_events_event_check;
ALTER TABLE auth_events ADD CONSTRAINT auth_events_event_check CHECK (event IN (
    'invitation_created', 'session_issued', 'session_refreshed',
    'session_revoked', 'identity_revoked',
    'federated_registered', 'federated_session_issued', 'identity_linked',
    'identity_updated', 'cohort_updated', 'account_deleted', 'campaign_closed'
));
