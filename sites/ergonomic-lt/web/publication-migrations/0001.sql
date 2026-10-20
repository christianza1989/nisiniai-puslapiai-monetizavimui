CREATE TABLE IF NOT EXISTS admin_documents (
 name TEXT PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 0,
 payload TEXT NOT NULL CHECK(json_valid(payload)), token TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS publication_audit (
 id INTEGER PRIMARY KEY, document TEXT NOT NULL, revision INTEGER NOT NULL,
 actor TEXT NOT NULL, action TEXT NOT NULL, model_key TEXT,
 token TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL
);
INSERT OR IGNORE INTO admin_documents VALUES('priorities.json',0,'{"version":1,"order":[],"writer":{"provider":"Gemini App","model":"4 Argon","thinking":"low"}}','initial',CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO admin_documents VALUES('workflow.json',0,'{"version":1,"models":{},"released":{},"releaseId":null}','initial',CURRENT_TIMESTAMP);
