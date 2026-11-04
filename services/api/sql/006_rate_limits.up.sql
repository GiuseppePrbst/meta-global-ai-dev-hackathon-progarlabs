-- 006: shared HTTP rate limits (per stable identity, failed exchanges per IP pseudonym).
-- Additive. Independent from the Meta ledger: no money, no audit, only transient hits.
-- Rows are inserted only for admitted requests or failed exchanges, so each bucket holds at
-- most its limit; expired rows are deleted per bucket and stale buckets after 24 h.
CREATE TABLE IF NOT EXISTS rate_limit_hits (
    id bigserial PRIMARY KEY,
    bucket text NOT NULL CHECK (length(bucket) BETWEEN 1 AND 120),
    at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_limit_hits_bucket_at_idx ON rate_limit_hits(bucket, at);
CREATE INDEX IF NOT EXISTS rate_limit_hits_at_idx ON rate_limit_hits(at);
