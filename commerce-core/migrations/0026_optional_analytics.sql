-- Optional measurement only. No triggers or changes to money, stock or orders.
CREATE TABLE IF NOT EXISTS order_analytics (
 store_id TEXT NOT NULL, order_id TEXT NOT NULL, environment TEXT NOT NULL,
 consent_version INTEGER NOT NULL, consent_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
 client_id TEXT, session_id TEXT, captured_at INTEGER NOT NULL, revoked_at INTEGER,
 PRIMARY KEY(store_id,order_id),
 FOREIGN KEY(store_id,order_id) REFERENCES orders(store_id,id)
);
CREATE TABLE IF NOT EXISTS analytics_delivery (
 store_id TEXT NOT NULL, event_id TEXT NOT NULL, order_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('purchase','refund')),
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','sent','skipped','review')),
 transaction_id TEXT NOT NULL, occurred_at INTEGER NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at INTEGER NOT NULL DEFAULT 0,
 lease_token TEXT, lease_until INTEGER, last_code TEXT, sent_at INTEGER,
 PRIMARY KEY(store_id,event_id),
 FOREIGN KEY(store_id,order_id) REFERENCES orders(store_id,id)
);
CREATE INDEX IF NOT EXISTS analytics_due ON analytics_delivery(store_id,state,next_attempt_at);
CREATE UNIQUE INDEX IF NOT EXISTS analytics_one_purchase ON analytics_delivery(store_id,order_id) WHERE kind='purchase';
