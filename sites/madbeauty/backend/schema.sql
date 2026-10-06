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
