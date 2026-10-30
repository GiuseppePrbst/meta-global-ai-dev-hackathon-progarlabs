-- Explicit rollback, only for the context tables; observations remain untouched.
DROP TABLE IF EXISTS context_features;
DROP TABLE IF EXISTS context_layers;
