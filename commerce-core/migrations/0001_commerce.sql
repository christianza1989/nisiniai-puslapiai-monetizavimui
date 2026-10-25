PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS stores (
 id TEXT PRIMARY KEY, environment TEXT NOT NULL CHECK(environment IN ('sandbox','production')),
 config_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
 store_id TEXT NOT NULL REFERENCES stores(id), sku TEXT NOT NULL, definition_json TEXT NOT NULL,
 PRIMARY KEY(store_id,sku)
);
CREATE TABLE IF NOT EXISTS inventory (
 store_id TEXT NOT NULL, sku TEXT NOT NULL, available INTEGER NOT NULL CHECK(available>=0),
 PRIMARY KEY(store_id,sku), FOREIGN KEY(store_id,sku) REFERENCES products(store_id,sku)
);
CREATE TABLE IF NOT EXISTS orders (
 store_id TEXT NOT NULL REFERENCES stores(id), id TEXT NOT NULL, request_key TEXT NOT NULL,
 request_hash TEXT NOT NULL, currency TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount>0),
 snapshot_json TEXT NOT NULL, access_hash TEXT NOT NULL,
 payment_state TEXT NOT NULL DEFAULT 'pending' CHECK(payment_state IN ('pending','paid','failed','partially_refunded','refunded')),
 stock_state TEXT NOT NULL DEFAULT 'reserved' CHECK(stock_state IN ('reserved','released','allocated')),
 fulfillment_state TEXT NOT NULL DEFAULT 'pending',
 expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL,
 checkout_id TEXT, payment_id TEXT, refunded_amount INTEGER NOT NULL DEFAULT 0 CHECK(refunded_amount>=0 AND refunded_amount<=amount),
 PRIMARY KEY(store_id,id), UNIQUE(store_id,request_key), UNIQUE(store_id,checkout_id), UNIQUE(store_id,payment_id)
);
CREATE TABLE IF NOT EXISTS order_lines (
 store_id TEXT NOT NULL, order_id TEXT NOT NULL, sku TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 100),
 PRIMARY KEY(store_id,order_id,sku), FOREIGN KEY(store_id,order_id) REFERENCES orders(store_id,id),
 FOREIGN KEY(store_id,sku) REFERENCES inventory(store_id,sku)
);
CREATE TRIGGER IF NOT EXISTS reserve_stock BEFORE INSERT ON order_lines BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM inventory WHERE store_id=NEW.store_id AND sku=NEW.sku AND available>=NEW.quantity)
 THEN RAISE(ABORT,'stock_unavailable') END;
 UPDATE inventory SET available=available-NEW.quantity WHERE store_id=NEW.store_id AND sku=NEW.sku;
END;
CREATE TRIGGER IF NOT EXISTS release_stock AFTER UPDATE OF stock_state ON orders
WHEN OLD.stock_state='reserved' AND NEW.stock_state='released' BEGIN
 UPDATE inventory SET available=available+(
 SELECT quantity FROM order_lines WHERE store_id=OLD.store_id AND order_id=OLD.id AND sku=inventory.sku
 ) WHERE store_id=OLD.store_id AND sku IN (SELECT sku FROM order_lines WHERE store_id=OLD.store_id AND order_id=OLD.id);
END;
CREATE TRIGGER IF NOT EXISTS late_allocate BEFORE UPDATE OF stock_state ON orders
WHEN OLD.stock_state='released' AND NEW.stock_state='allocated' BEGIN
 SELECT CASE WHEN EXISTS(
 SELECT 1 FROM order_lines l JOIN inventory i ON i.store_id=l.store_id AND i.sku=l.sku
 WHERE l.store_id=OLD.store_id AND l.order_id=OLD.id AND i.available<l.quantity
 ) THEN RAISE(ABORT,'stock_unavailable') END;
 UPDATE inventory SET available=available-(
 SELECT quantity FROM order_lines WHERE store_id=OLD.store_id AND order_id=OLD.id AND sku=inventory.sku
 ) WHERE store_id=OLD.store_id AND sku IN (SELECT sku FROM order_lines WHERE store_id=OLD.store_id AND order_id=OLD.id);
END;
CREATE TABLE IF NOT EXISTS event_inbox (
 store_id TEXT NOT NULL, provider TEXT NOT NULL, event_id TEXT NOT NULL, payload_hash TEXT NOT NULL, received_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,provider,event_id)
);
CREATE TABLE IF NOT EXISTS outbox (
 store_id TEXT NOT NULL, id TEXT NOT NULL, kind TEXT NOT NULL, aggregate_id TEXT NOT NULL, payload_json TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','leased','done')),
 lease_token TEXT, lease_until INTEGER NOT NULL DEFAULT 0, attempts INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,id)
);
CREATE TABLE IF NOT EXISTS audit (
 store_id TEXT NOT NULL, id TEXT NOT NULL, kind TEXT NOT NULL, aggregate_id TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,id)
);
CREATE TABLE IF NOT EXISTS shipments (
 store_id TEXT NOT NULL, order_id TEXT NOT NULL, reference TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('creating','registered','unknown')),
 provider_id TEXT, label_json TEXT, tracking TEXT,
 PRIMARY KEY(store_id,order_id), UNIQUE(store_id,reference), FOREIGN KEY(store_id,order_id) REFERENCES orders(store_id,id)
);
CREATE TABLE IF NOT EXISTS withdrawals (
 store_id TEXT NOT NULL, order_id TEXT NOT NULL, requested_at INTEGER NOT NULL, PRIMARY KEY(store_id,order_id),
 FOREIGN KEY(store_id,order_id) REFERENCES orders(store_id,id)
);
CREATE TABLE IF NOT EXISTS refunds (
 store_id TEXT NOT NULL, order_id TEXT NOT NULL, provider_id TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount>0),
 PRIMARY KEY(store_id,provider_id), FOREIGN KEY(store_id,order_id) REFERENCES orders(store_id,id)
);
CREATE TRIGGER IF NOT EXISTS confirm_refund BEFORE INSERT ON refunds BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM orders WHERE store_id=NEW.store_id AND id=NEW.order_id
 AND payment_state IN ('paid','partially_refunded') AND refunded_amount+NEW.amount<=amount)
 THEN RAISE(ABORT,'refund_invalid') END;
 UPDATE orders SET refunded_amount=refunded_amount+NEW.amount,
 payment_state=CASE WHEN refunded_amount+NEW.amount=amount THEN 'refunded' ELSE 'partially_refunded' END
 WHERE store_id=NEW.store_id AND id=NEW.order_id;
END;
CREATE TABLE IF NOT EXISTS journal_entries (
 store_id TEXT NOT NULL, id TEXT NOT NULL, source_id TEXT NOT NULL, currency TEXT NOT NULL, payload_hash TEXT NOT NULL,
 created_at INTEGER NOT NULL, PRIMARY KEY(store_id,id), UNIQUE(store_id,source_id)
);
CREATE TABLE IF NOT EXISTS journal_lines (
 store_id TEXT NOT NULL, entry_id TEXT NOT NULL, line_number INTEGER NOT NULL,
 account TEXT NOT NULL, debit INTEGER NOT NULL CHECK(debit>=0), credit INTEGER NOT NULL CHECK(credit>=0),
 PRIMARY KEY(store_id,entry_id,line_number), FOREIGN KEY(store_id,entry_id) REFERENCES journal_entries(store_id,id),
 CHECK((debit>0 AND credit=0) OR (credit>0 AND debit=0))
);
