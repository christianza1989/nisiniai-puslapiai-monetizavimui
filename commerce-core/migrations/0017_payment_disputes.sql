CREATE TABLE payment_dispute_events (
 store_id TEXT NOT NULL, event_id TEXT NOT NULL, dispute_id TEXT NOT NULL,
 order_id TEXT, payment_id TEXT NOT NULL, payload_json TEXT NOT NULL,
 payload_hash TEXT NOT NULL, provider_created_at INTEGER NOT NULL, received_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,event_id), FOREIGN KEY(store_id) REFERENCES stores(id),
 FOREIGN KEY(store_id,order_id) REFERENCES orders(store_id,id)
);
CREATE INDEX dispute_order ON payment_dispute_events(store_id,order_id,provider_created_at);
CREATE TRIGGER dispute_event_immutable BEFORE UPDATE ON payment_dispute_events
BEGIN
 SELECT RAISE(ABORT,'dispute_event_immutable');
END;
CREATE TRIGGER dispute_event_no_delete BEFORE DELETE ON payment_dispute_events
BEGIN
 SELECT RAISE(ABORT,'dispute_event_immutable');
END;
