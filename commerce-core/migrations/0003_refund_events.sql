CREATE TABLE IF NOT EXISTS provider_refund_events (
 store_id TEXT NOT NULL REFERENCES stores(id), event_id TEXT NOT NULL, payload_hash TEXT NOT NULL,
 provider_id TEXT NOT NULL, payment_id TEXT NOT NULL, currency TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount>0),
 status TEXT NOT NULL CHECK(status IN ('pending','requires_action','succeeded','failed','canceled')),
 processing_state TEXT NOT NULL DEFAULT 'pending' CHECK(processing_state IN ('pending','applied','observed','exception')),
 reason TEXT, created_at INTEGER NOT NULL, PRIMARY KEY(store_id,event_id)
);
CREATE INDEX IF NOT EXISTS refund_event_payment ON provider_refund_events(store_id,payment_id,processing_state);
