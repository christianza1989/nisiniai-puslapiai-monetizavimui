CREATE TABLE operator_access_revocations (
 store_id TEXT NOT NULL REFERENCES stores(id), token_hash TEXT NOT NULL CHECK(length(token_hash)=64),
 expires_at INTEGER NOT NULL CHECK(expires_at>0), revoked_at INTEGER NOT NULL CHECK(revoked_at>=0), actor_ref TEXT NOT NULL,
 PRIMARY KEY(store_id,token_hash)
);
CREATE INDEX operator_access_revocations_expiry ON operator_access_revocations(store_id,expires_at);
