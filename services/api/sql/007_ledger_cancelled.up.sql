-- 007: the voice stream closes a reservation as 'cancelled' when the client stops early, but
-- 003 never allowed that status, so ExecutionStore.finish failed and the reservation stayed
-- 'reserved' (holding the concurrency slot) until it expired. Additive: widens the CHECK only;
-- no row changes, and cancelled reservations stay charged like any other.
ALTER TABLE execution_reservations DROP CONSTRAINT IF EXISTS execution_reservations_status_check;
ALTER TABLE execution_reservations ADD CONSTRAINT execution_reservations_status_check
    CHECK (status IN ('reserved', 'completed', 'provider_error', 'validation_error', 'expired',
                      'cancelled'));
