PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS accounts (
 id TEXT PRIMARY KEY, site_id TEXT NOT NULL, email TEXT NOT NULL, name TEXT NOT NULL,
 operator INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL,
 UNIQUE(site_id,email)
) STRICT;
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, site_id TEXT NOT NULL, account_id TEXT REFERENCES accounts(id),
 csrf TEXT NOT NULL, created_at INTEGER NOT NULL, touched_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS email_challenges (
 id TEXT PRIMARY KEY, site_id TEXT NOT NULL, session_hash TEXT NOT NULL,
 email TEXT NOT NULL, code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0, consumed INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS rate_limits (
 bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS platform_state (
 site_id TEXT PRIMARY KEY, version INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data))
) STRICT;
CREATE TABLE IF NOT EXISTS mail_outbox (
 id TEXT PRIMARY KEY, site_id TEXT NOT NULL, account_id TEXT, organization_id TEXT,
 booking_id TEXT, challenge_id TEXT, recipient TEXT NOT NULL, type TEXT NOT NULL,
 payload TEXT NOT NULL CHECK(json_valid(payload)), state TEXT NOT NULL,
 created_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, delivered_at INTEGER
) STRICT;
CREATE INDEX IF NOT EXISTS outbox_site ON mail_outbox(site_id,created_at);
CREATE TABLE IF NOT EXISTS notification_jobs (
 id TEXT PRIMARY KEY, site_id TEXT NOT NULL, organization_id TEXT NOT NULL,
 booking_id TEXT NOT NULL, booking_version INTEGER NOT NULL, lead_min INTEGER NOT NULL,
 due_at INTEGER NOT NULL, state TEXT NOT NULL, outbox_id TEXT, created_at INTEGER NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS notification_due ON notification_jobs(site_id,state,due_at);
CREATE INDEX IF NOT EXISTS notification_booking ON notification_jobs(site_id,booking_id,booking_version);
CREATE TABLE IF NOT EXISTS state_rows (
 site_id TEXT NOT NULL, collection TEXT NOT NULL, record_key TEXT NOT NULL,
 position INTEGER NOT NULL, organization_id TEXT, practitioner_id TEXT, resource_id TEXT,
 client_id TEXT, start_at TEXT, end_at TEXT, status TEXT,
 data TEXT NOT NULL CHECK(json_valid(data)),
 PRIMARY KEY(site_id,collection,record_key)
) STRICT;
CREATE INDEX IF NOT EXISTS state_rows_org ON state_rows(site_id,collection,organization_id,position);
CREATE INDEX IF NOT EXISTS state_rows_staff ON state_rows(site_id,collection,practitioner_id,start_at,end_at);
CREATE INDEX IF NOT EXISTS state_rows_resource ON state_rows(site_id,collection,resource_id,start_at,end_at);
CREATE INDEX IF NOT EXISTS state_rows_client ON state_rows(site_id,collection,client_id,position);
CREATE TABLE IF NOT EXISTS state_row_metadata (
 site_id TEXT PRIMARY KEY, version INTEGER NOT NULL, fields TEXT NOT NULL CHECK(json_valid(fields)),
 records INTEGER NOT NULL, bytes INTEGER NOT NULL, legacy_mirrored INTEGER NOT NULL, legacy_version INTEGER NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS state_migration_checkpoints (
 site_id TEXT PRIMARY KEY, source_version INTEGER NOT NULL, sha256 TEXT NOT NULL,
 data TEXT NOT NULL CHECK(json_valid(data)), migrated_at INTEGER NOT NULL
) STRICT;
