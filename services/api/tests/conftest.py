"""The suite must outlive the campaign: tests run against a far-future deadline unless a test
sets its own. Production keeps the deadline of migration 009, which no variable can extend."""

import os

os.environ["CAMPAIGN_EXPIRES_AT"] = "2099-01-01T00:00:00Z"

# Run after a fixture's migrations. Creates the table for fixtures that stop before 009, and
# lifts the migration's deadline for those that apply it.
OPEN_CAMPAIGN = """
CREATE TABLE IF NOT EXISTS campaign_state (
    id text PRIMARY KEY, expires_at timestamptz NOT NULL, reservation_cap_units bigint NOT NULL,
    closed_at timestamptz, closed_reason text
);
ALTER TABLE campaign_state DROP CONSTRAINT IF EXISTS campaign_state_limits;
INSERT INTO campaign_state(id, expires_at, reservation_cap_units)
VALUES ('hackathon-2026', '2099-01-01T00:00:00Z', 90000000)
ON CONFLICT (id) DO UPDATE SET expires_at = EXCLUDED.expires_at;
"""
