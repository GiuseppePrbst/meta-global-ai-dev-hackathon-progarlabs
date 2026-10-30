DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM observations WHERE identification_id IS NOT NULL)
       OR EXISTS (SELECT 1 FROM identifications)
       OR EXISTS (SELECT 1 FROM execution_reservations WHERE operation IN ('transcribe','guide')) THEN
        RAISE EXCEPTION 'Archive private capture evidence and new ledger entries before rollback';
    END IF;
END $$;
ALTER TABLE observations DROP COLUMN IF EXISTS identification_id;
ALTER TABLE observations DROP COLUMN IF EXISTS expedition_id;
DROP INDEX IF EXISTS capture_key_idx;
DROP INDEX IF EXISTS capture_identification_idx;
ALTER TABLE observations DROP COLUMN IF EXISTS capture_key;
ALTER TABLE observations DROP COLUMN IF EXISTS capture_request_hash;
ALTER TABLE observations DROP COLUMN IF EXISTS observed_at;
ALTER TABLE observations DROP COLUMN IF EXISTS spatial_status;
DROP TABLE IF EXISTS identifications;
ALTER TABLE execution_reservations DROP CONSTRAINT IF EXISTS execution_reservations_operation_check;
ALTER TABLE execution_reservations ADD CONSTRAINT execution_reservations_operation_check
    CHECK (operation IN ('identify', 'raster'));
