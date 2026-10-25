CREATE TABLE IF NOT EXISTS product_edits(id TEXT PRIMARY KEY,data TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS supplier_import(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS quotes(id TEXT PRIMARY KEY,submission_key TEXT NOT NULL UNIQUE,payload TEXT NOT NULL,created_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'new',delivery_status TEXT NOT NULL DEFAULT 'pending',delivery_error TEXT,delivery_attempts INTEGER NOT NULL DEFAULT 0,delivery_started_at INTEGER);
CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,window_start INTEGER NOT NULL,count INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS audit_events(id INTEGER PRIMARY KEY,event TEXT NOT NULL,object_id TEXT,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS quotes_created_at ON quotes(created_at DESC);
