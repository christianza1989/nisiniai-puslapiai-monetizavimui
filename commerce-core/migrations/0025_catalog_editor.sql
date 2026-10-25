CREATE TABLE catalog_drafts (
 store_id TEXT NOT NULL REFERENCES stores(id), sku TEXT NOT NULL,
 definition_json TEXT NOT NULL, published_hash TEXT, draft_hash TEXT NOT NULL,
 actor_ref TEXT NOT NULL, updated_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,sku)
);
CREATE TABLE catalog_media (
 store_id TEXT NOT NULL REFERENCES stores(id), id TEXT NOT NULL,
 storage_key TEXT NOT NULL, sha256 TEXT NOT NULL,
 width INTEGER NOT NULL, height INTEGER NOT NULL, byte_length INTEGER NOT NULL,
 actor_ref TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,id)
);
