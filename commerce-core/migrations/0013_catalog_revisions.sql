CREATE TABLE catalog_revisions (
 store_id TEXT NOT NULL, id TEXT NOT NULL, sku TEXT NOT NULL,
 request_hash TEXT NOT NULL, prior_json TEXT, definition_json TEXT NOT NULL,
 actor_ref TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,id), FOREIGN KEY(store_id,sku) REFERENCES products(store_id,sku)
);
CREATE TRIGGER catalog_revision_immutable BEFORE UPDATE ON catalog_revisions
BEGIN
 SELECT RAISE(ABORT,'catalog_revision_immutable');
END;
CREATE TRIGGER catalog_revision_history BEFORE DELETE ON catalog_revisions
BEGIN
 SELECT RAISE(ABORT,'catalog_revision_immutable');
END;
