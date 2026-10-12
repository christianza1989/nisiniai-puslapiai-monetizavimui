CREATE TABLE financial_import_files (
 store_id TEXT NOT NULL REFERENCES stores(id), id TEXT NOT NULL, origin TEXT NOT NULL,
 content_hash TEXT NOT NULL, raw_text TEXT NOT NULL, mapping_json TEXT NOT NULL,
 actor_ref TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,id)
);
CREATE TRIGGER financial_file_immutable BEFORE UPDATE ON financial_import_files
BEGIN
 SELECT RAISE(ABORT,'financial_file_immutable');
END;
CREATE TRIGGER financial_file_history BEFORE DELETE ON financial_import_files
BEGIN
 SELECT RAISE(ABORT,'financial_file_immutable');
END;
