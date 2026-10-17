CREATE TABLE IF NOT EXISTS stock_adjustments (
 store_id TEXT NOT NULL, id TEXT NOT NULL, sku TEXT NOT NULL, delta INTEGER NOT NULL CHECK(delta!=0),
 expected_available INTEGER NOT NULL, reason TEXT NOT NULL, actor_ref TEXT NOT NULL,
 payload_hash TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(store_id,id),
 FOREIGN KEY(store_id,sku) REFERENCES inventory(store_id,sku)
);
CREATE TRIGGER IF NOT EXISTS check_stock_adjustment BEFORE INSERT ON stock_adjustments BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM inventory WHERE store_id=NEW.store_id AND sku=NEW.sku
 AND available=NEW.expected_available AND available+NEW.delta BETWEEN 0 AND 100000)
 THEN RAISE(ABORT,'stock_adjustment_conflict') END;
END;
CREATE TRIGGER IF NOT EXISTS apply_stock_adjustment AFTER INSERT ON stock_adjustments BEGIN
 UPDATE inventory SET available=available+NEW.delta WHERE store_id=NEW.store_id AND sku=NEW.sku;
END;
CREATE TABLE IF NOT EXISTS document_sequences (
 legal_entity_id TEXT NOT NULL, year INTEGER NOT NULL, series TEXT NOT NULL, next_number INTEGER NOT NULL DEFAULT 1,
 PRIMARY KEY(legal_entity_id,year,series)
);
CREATE TABLE IF NOT EXISTS documents (
 store_id TEXT NOT NULL, id TEXT NOT NULL, order_id TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('sale','credit','packing')),
 source_id TEXT NOT NULL, legal_entity_id TEXT NOT NULL, year INTEGER NOT NULL, series TEXT NOT NULL,
 number INTEGER NOT NULL CHECK(number>0), payload_json TEXT NOT NULL, payload_hash TEXT NOT NULL,
 actor_ref TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(store_id,id), UNIQUE(store_id,kind,source_id),
 UNIQUE(legal_entity_id,year,series,number), FOREIGN KEY(store_id,order_id) REFERENCES orders(store_id,id)
);
CREATE TRIGGER IF NOT EXISTS immutable_document_update BEFORE UPDATE ON documents BEGIN
 SELECT RAISE(ABORT,'document_immutable');
END;
CREATE TRIGGER IF NOT EXISTS immutable_document_delete BEFORE DELETE ON documents BEGIN
 SELECT RAISE(ABORT,'document_immutable');
END;
CREATE INDEX IF NOT EXISTS orders_created ON orders(store_id,created_at DESC,id);
CREATE INDEX IF NOT EXISTS documents_created ON documents(store_id,created_at DESC,id);
