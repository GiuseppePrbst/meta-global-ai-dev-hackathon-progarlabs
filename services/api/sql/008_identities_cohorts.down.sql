-- Refuses while 008 data exists: financial and audit history is never dropped.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM federated_subjects)
        OR EXISTS (SELECT 1 FROM execution_reservations WHERE cohort IS NOT NULL)
        OR EXISTS (SELECT 1 FROM auth_events WHERE detail IS NOT NULL
                   OR event NOT IN ('invitation_created', 'session_issued',
                                    'session_refreshed', 'session_revoked', 'identity_revoked'))
        OR EXISTS (SELECT 1 FROM access_sessions WHERE invitation_id IS NULL) THEN
        RAISE EXCEPTION '008 rollback refused: federated identities, cohort reservations or audit exist';
    END IF;
END $$;
ALTER TABLE auth_events DROP CONSTRAINT IF EXISTS auth_events_event_check;
ALTER TABLE auth_events ADD CONSTRAINT auth_events_event_check CHECK (event IN (
    'invitation_created', 'session_issued', 'session_refreshed',
    'session_revoked', 'identity_revoked'
));
ALTER TABLE auth_events DROP COLUMN IF EXISTS detail;
ALTER TABLE access_sessions DROP COLUMN IF EXISTS provider;
ALTER TABLE access_sessions ALTER COLUMN invitation_id SET NOT NULL;
ALTER TABLE execution_reservations DROP COLUMN IF EXISTS cohort;
DROP TABLE IF EXISTS federated_subjects;
DROP TABLE IF EXISTS identities;
DROP TABLE IF EXISTS budget_cohorts;
