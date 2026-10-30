CREATE TABLE IF NOT EXISTS context_layers (
    id text PRIMARY KEY,
    metadata jsonb NOT NULL CHECK (jsonb_typeof(metadata) = 'object')
);
CREATE TABLE IF NOT EXISTS context_features (
    source_id text NOT NULL REFERENCES context_layers(id),
    feature_id text NOT NULL,
    attributes jsonb NOT NULL CHECK (jsonb_typeof(attributes) = 'object'),
    geom geometry(MultiPolygon, 4326) NOT NULL,
    PRIMARY KEY (source_id, feature_id),
    CHECK (ST_IsValid(geom) AND NOT ST_IsEmpty(geom))
);
CREATE INDEX IF NOT EXISTS context_features_geom_idx ON context_features USING gist (geom);
