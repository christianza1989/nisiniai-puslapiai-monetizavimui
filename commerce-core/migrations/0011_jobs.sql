CREATE TABLE outbox_delivery (
 store_id TEXT NOT NULL, event_id TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('waiting','done','dead')),
 next_attempt_at INTEGER NOT NULL DEFAULT 0, last_error TEXT,
 updated_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,event_id), FOREIGN KEY(store_id,event_id) REFERENCES outbox(store_id,id)
);
CREATE TABLE customer_notifications (
 store_id TEXT NOT NULL, event_id TEXT NOT NULL, order_id TEXT NOT NULL,
 kind TEXT NOT NULL, payload_json TEXT NOT NULL, payload_hash TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'prepared' CHECK(state IN ('prepared','sending','accepted','unknown','review')),
 first_attempt_at INTEGER, transport_ref TEXT, created_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,event_id), FOREIGN KEY(store_id,order_id) REFERENCES orders(store_id,id)
);
CREATE TRIGGER notification_immutable BEFORE UPDATE ON customer_notifications
WHEN OLD.order_id!=NEW.order_id OR OLD.kind!=NEW.kind OR OLD.payload_json!=NEW.payload_json
 OR OLD.payload_hash!=NEW.payload_hash OR OLD.created_at!=NEW.created_at
 OR (OLD.first_attempt_at IS NOT NULL AND NEW.first_attempt_at IS NOT OLD.first_attempt_at)
BEGIN
 SELECT RAISE(ABORT,'notification_immutable');
END;
