CREATE TABLE IF NOT EXISTS text_review_edits (
 key TEXT PRIMARY KEY,
 source_hash TEXT NOT NULL,
 draft TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('draft','approved','kept')),
 revision INTEGER NOT NULL DEFAULT 0,
 published TEXT,
 published_hash TEXT,
 updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS text_review_history (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 key TEXT NOT NULL,
 action TEXT NOT NULL,
 source_hash TEXT NOT NULL,
 text TEXT NOT NULL,
 revision INTEGER NOT NULL,
 actor TEXT NOT NULL,
 at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS text_review_history_key ON text_review_history(key,id);
