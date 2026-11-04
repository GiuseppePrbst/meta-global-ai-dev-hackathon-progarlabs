-- 005: closed-beta invitations and short-lived sessions. Additive: no existing table changes.
-- Only SHA-256 hashes of tokens are stored; the identity is the stable ledger identity.
CREATE TABLE IF NOT EXISTS access_invitations (
    id uuid PRIMARY KEY,
    token_hash bytea NOT NULL UNIQUE CHECK (octet_length(token_hash) = 32),
    identity_id text NOT NULL CHECK (identity_id ~ '^[a-z0-9][a-z0-9-]{2,40}$'),
    scopes text[] NOT NULL CHECK (
        cardinality(scopes) > 0
        AND scopes <@ ARRAY['guide', 'transcribe', 'identify', 'raster']::text[]
    ),
    created_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    access_expires_at timestamptz NOT NULL,
    redeemed_at timestamptz,
    revoked_at timestamptz,
    CHECK (expires_at > created_at AND access_expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS access_invitations_identity_idx ON access_invitations(identity_id);

CREATE TABLE IF NOT EXISTS access_sessions (
    id uuid PRIMARY KEY,
    token_hash bytea NOT NULL UNIQUE CHECK (octet_length(token_hash) = 32),
    identity_id text NOT NULL,
    invitation_id uuid NOT NULL REFERENCES access_invitations(id),
    scopes text[] NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    access_expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    CHECK (expires_at > created_at AND expires_at <= access_expires_at)
);
CREATE INDEX IF NOT EXISTS access_sessions_identity_idx
    ON access_sessions(identity_id) WHERE revoked_at IS NULL;

-- Sanitized audit trail: no tokens, no IPs, no request content.
CREATE TABLE IF NOT EXISTS auth_events (
    id bigserial PRIMARY KEY,
    at timestamptz NOT NULL DEFAULT now(),
    event text NOT NULL CHECK (event IN (
        'invitation_created', 'session_issued', 'session_refreshed',
        'session_revoked', 'identity_revoked'
    )),
    identity_id text,
    session_id uuid,
    actor text
);
CREATE INDEX IF NOT EXISTS auth_events_identity_idx ON auth_events(identity_id, at);
