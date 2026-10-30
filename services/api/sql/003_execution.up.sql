CREATE TABLE IF NOT EXISTS execution_reservations (
    id uuid PRIMARY KEY,
    identity_id text NOT NULL,
    operation text NOT NULL CHECK (operation IN ('identify', 'raster')),
    window_date date NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date,
    reserved_units bigint NOT NULL CHECK (reserved_units >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
    status text NOT NULL DEFAULT 'reserved'
        CHECK (status IN ('reserved','completed','provider_error','validation_error','expired')),
    reported_usage jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS execution_window_idx ON execution_reservations(window_date);
ALTER TABLE observations ADD COLUMN IF NOT EXISTS owner_id text;
ALTER TABLE observations ADD COLUMN IF NOT EXISTS accuracy_m double precision
    CHECK (accuracy_m >= 0 AND accuracy_m <= 200);
CREATE INDEX IF NOT EXISTS observations_owner_idx ON observations(owner_id, created_at);
