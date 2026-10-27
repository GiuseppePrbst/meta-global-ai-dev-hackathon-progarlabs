CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS observations (
    id uuid PRIMARY KEY,
    species_id text,
    notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
    location geometry(Point, 4326),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS observations_location_idx ON observations USING gist(location);
