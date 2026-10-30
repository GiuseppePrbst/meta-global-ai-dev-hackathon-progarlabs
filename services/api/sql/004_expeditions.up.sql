CREATE TABLE IF NOT EXISTS identifications (
    id uuid PRIMARY KEY,
    owner_id text NOT NULL,
    result jsonb NOT NULL CHECK (jsonb_typeof(result) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS identifications_owner_idx ON identifications(owner_id, created_at);
ALTER TABLE observations ADD COLUMN IF NOT EXISTS identification_id uuid REFERENCES identifications(id);
ALTER TABLE observations ADD COLUMN IF NOT EXISTS expedition_id text CHECK (expedition_id = 'puyehue');
ALTER TABLE observations ADD COLUMN IF NOT EXISTS capture_key text;
ALTER TABLE observations ADD COLUMN IF NOT EXISTS capture_request_hash text;
ALTER TABLE observations ADD COLUMN IF NOT EXISTS observed_at timestamptz;
ALTER TABLE observations ADD COLUMN IF NOT EXISTS spatial_status text;
CREATE UNIQUE INDEX IF NOT EXISTS capture_key_idx ON observations(owner_id, capture_key);
CREATE UNIQUE INDEX IF NOT EXISTS capture_identification_idx ON observations(owner_id, identification_id);
ALTER TABLE execution_reservations DROP CONSTRAINT IF EXISTS execution_reservations_operation_check;
ALTER TABLE execution_reservations ADD CONSTRAINT execution_reservations_operation_check
    CHECK (operation IN ('identify', 'raster', 'transcribe', 'guide'));
