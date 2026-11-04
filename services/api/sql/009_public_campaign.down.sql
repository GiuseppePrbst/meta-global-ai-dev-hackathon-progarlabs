-- Refuses once anonymous reservations or a closure exist: financial history is never dropped.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM execution_reservations WHERE cohort = 'public_demo')
        OR EXISTS (SELECT 1 FROM campaign_state WHERE closed_at IS NOT NULL)
        OR EXISTS (SELECT 1 FROM auth_events WHERE event = 'campaign_closed') THEN
        RAISE EXCEPTION '009 rollback refused: public reservations or a closure exist';
    END IF;
END $$;
ALTER TABLE auth_events DROP CONSTRAINT IF EXISTS auth_events_event_check;
ALTER TABLE auth_events ADD CONSTRAINT auth_events_event_check CHECK (event IN (
    'invitation_created', 'session_issued', 'session_refreshed',
    'session_revoked', 'identity_revoked',
    'federated_registered', 'federated_session_issued', 'identity_linked',
    'identity_updated', 'cohort_updated', 'account_deleted'
));
DELETE FROM budget_cohorts WHERE cohort = 'public_demo';
ALTER TABLE budget_cohorts DROP CONSTRAINT IF EXISTS budget_cohorts_cohort_check;
ALTER TABLE budget_cohorts ADD CONSTRAINT budget_cohorts_cohort_check CHECK (
    cohort IN ('public_trial', 'team_developer', 'internal_qa')
);
DROP TRIGGER IF EXISTS campaign_state_guard ON campaign_state;
DROP FUNCTION IF EXISTS campaign_state_guard();
DROP TABLE IF EXISTS campaign_state;
