-- Removes beta access only; execution_reservations (the ledger) is untouched.
DO $$ BEGIN
    IF to_regclass('auth_events') IS NOT NULL AND EXISTS (SELECT 1 FROM auth_events) THEN
        RAISE EXCEPTION 'Archive auth_events (audit trail) before rollback';
    END IF;
END $$;
DROP TABLE IF EXISTS auth_events;
DROP TABLE IF EXISTS access_sessions;
DROP TABLE IF EXISTS access_invitations;
