CREATE TABLE buyer_delivery_quotes (
 store_id TEXT NOT NULL REFERENCES stores(id), id TEXT NOT NULL, environment TEXT NOT NULL,
 request_hash TEXT NOT NULL, payload_json TEXT NOT NULL, expires_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL, PRIMARY KEY(store_id,id)
);
CREATE TRIGGER buyer_quote_immutable BEFORE UPDATE ON buyer_delivery_quotes
BEGIN
 SELECT RAISE(ABORT,'buyer_quote_immutable');
END;
CREATE TRIGGER buyer_quote_history BEFORE DELETE ON buyer_delivery_quotes
BEGIN
 SELECT RAISE(ABORT,'buyer_quote_immutable');
END;
