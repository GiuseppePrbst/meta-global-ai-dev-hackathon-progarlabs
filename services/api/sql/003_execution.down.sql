DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM observations WHERE owner_id IS NOT NULL) THEN
        RAISE EXCEPTION 'Archive private observation ownership before rollback';
    END IF;
END $$;
DROP INDEX IF EXISTS observations_owner_idx;
ALTER TABLE observations DROP COLUMN IF EXISTS owner_id;
DROP TABLE IF EXISTS execution_reservations;
