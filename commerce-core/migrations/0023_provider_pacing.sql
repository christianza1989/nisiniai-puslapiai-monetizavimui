-- Account-key-wide pacing shared by stores, adapters and Worker isolates.
-- Only a SHA-256 scope is retained; never credentials or provider response bodies.
CREATE TABLE provider_request_pacing (
  scope_hash TEXT PRIMARY KEY CHECK(length(scope_hash)=64),
  next_allowed_at INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT,
  lease_until INTEGER NOT NULL DEFAULT 0
);
