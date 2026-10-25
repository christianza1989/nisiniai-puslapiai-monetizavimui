CREATE TABLE IF NOT EXISTS publication_model_documents (
 document TEXT NOT NULL, model_key TEXT NOT NULL,
 payload TEXT NOT NULL CHECK(json_valid(payload)),
 view_payload TEXT NOT NULL CHECK(json_valid(view_payload)),
 token TEXT NOT NULL, updated_at TEXT NOT NULL,
 PRIMARY KEY(document,model_key)
);
CREATE TABLE IF NOT EXISTS publication_versions (
 document TEXT NOT NULL, revision INTEGER NOT NULL, model_key TEXT,
 payload TEXT NOT NULL CHECK(json_valid(payload)), token TEXT NOT NULL UNIQUE,
 created_at TEXT NOT NULL, PRIMARY KEY(document,revision)
);
