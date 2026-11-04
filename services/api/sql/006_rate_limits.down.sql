-- Transient counters only (no ledger, no audit). Roll back the application first: code from
-- before 006 does not read this table, code from 006 on returns 503 without it (fail closed).
DROP TABLE IF EXISTS rate_limit_hits;
