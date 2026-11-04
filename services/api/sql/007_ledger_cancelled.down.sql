DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM execution_reservations WHERE status = 'cancelled') THEN
        RAISE EXCEPTION 'Archive cancelled ledger entries before rollback';
    END IF;
END $$;
ALTER TABLE execution_reservations DROP CONSTRAINT IF EXISTS execution_reservations_status_check;
ALTER TABLE execution_reservations ADD CONSTRAINT execution_reservations_status_check
    CHECK (status IN ('reserved', 'completed', 'provider_error', 'validation_error', 'expired'));
