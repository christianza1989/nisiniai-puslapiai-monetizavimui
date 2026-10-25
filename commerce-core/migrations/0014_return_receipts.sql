CREATE TABLE return_receipts (
 store_id TEXT NOT NULL, id TEXT NOT NULL, order_id TEXT NOT NULL, request_hash TEXT NOT NULL,
 reason TEXT NOT NULL, actor_ref TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,id), UNIQUE(store_id,id,order_id), FOREIGN KEY(store_id,order_id) REFERENCES orders(store_id,id)
);
CREATE TABLE return_receipt_lines (
 store_id TEXT NOT NULL, receipt_id TEXT NOT NULL, order_id TEXT NOT NULL, sku TEXT NOT NULL,
 quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 100),
 disposition TEXT NOT NULL CHECK(disposition IN ('resalable','quarantine','disposed')),
 expiry_checked INTEGER NOT NULL CHECK(expiry_checked IN (0,1)),
 PRIMARY KEY(store_id,receipt_id,sku), FOREIGN KEY(store_id,receipt_id,order_id) REFERENCES return_receipts(store_id,id,order_id),
 FOREIGN KEY(store_id,order_id,sku) REFERENCES order_lines(store_id,order_id,sku)
);
CREATE TRIGGER return_quantity_guard BEFORE INSERT ON return_receipt_lines
BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM orders WHERE store_id=NEW.store_id AND id=NEW.order_id AND stock_state='allocated' AND fulfillment_state='labelled' AND payment_state IN ('paid','partially_refunded','refunded'))
 THEN RAISE(ABORT,'return_order_not_eligible') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM order_lines l WHERE l.store_id=NEW.store_id AND l.order_id=NEW.order_id AND l.sku=NEW.sku
 AND NEW.quantity+COALESCE((SELECT SUM(quantity) FROM return_receipt_lines WHERE store_id=NEW.store_id AND order_id=NEW.order_id AND sku=NEW.sku),0)<=l.quantity)
 THEN RAISE(ABORT,'return_quantity_conflict') END;
 SELECT CASE WHEN NEW.disposition='resalable' AND NEW.expiry_checked!=1 THEN RAISE(ABORT,'return_quality_required') END;
 UPDATE inventory SET available=available+NEW.quantity WHERE store_id=NEW.store_id AND sku=NEW.sku AND NEW.disposition='resalable';
END;
CREATE TRIGGER return_receipt_immutable BEFORE UPDATE ON return_receipts
BEGIN
 SELECT RAISE(ABORT,'return_receipt_immutable');
END;
CREATE TRIGGER return_receipt_history BEFORE DELETE ON return_receipts
BEGIN
 SELECT RAISE(ABORT,'return_receipt_immutable');
END;
CREATE TRIGGER return_line_immutable BEFORE UPDATE ON return_receipt_lines
BEGIN
 SELECT RAISE(ABORT,'return_receipt_immutable');
END;
CREATE TRIGGER return_line_history BEFORE DELETE ON return_receipt_lines
BEGIN
 SELECT RAISE(ABORT,'return_receipt_immutable');
END;
