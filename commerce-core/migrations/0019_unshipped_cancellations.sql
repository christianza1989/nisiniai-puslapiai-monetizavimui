CREATE TABLE unshipped_cancellations (
 store_id TEXT NOT NULL, order_id TEXT NOT NULL, id TEXT NOT NULL,
 actor_ref TEXT NOT NULL, reason TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,order_id), UNIQUE(store_id,id),
 FOREIGN KEY(store_id,order_id) REFERENCES orders(store_id,id)
);
CREATE TRIGGER unshipped_cancel_guard BEFORE INSERT ON unshipped_cancellations
BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM orders WHERE store_id=NEW.store_id AND id=NEW.order_id
 AND payment_state='refunded' AND stock_state='allocated' AND fulfillment_state IN ('pending','ready'))
 OR EXISTS(SELECT 1 FROM shipments WHERE store_id=NEW.store_id AND order_id=NEW.order_id)
 OR EXISTS(SELECT 1 FROM shipment_commands WHERE store_id=NEW.store_id AND order_id=NEW.order_id
 AND (first_attempt_at IS NOT NULL OR state NOT IN ('planned','canceled') OR lease_until>NEW.created_at))
 THEN RAISE(ABORT,'unshipped_cancel_not_allowed') END;
END;
CREATE TRIGGER unshipped_cancel_apply AFTER INSERT ON unshipped_cancellations
BEGIN
 UPDATE inventory SET available=available+(SELECT quantity FROM order_lines
 WHERE store_id=NEW.store_id AND order_id=NEW.order_id AND sku=inventory.sku)
 WHERE store_id=NEW.store_id AND sku IN (SELECT sku FROM order_lines WHERE store_id=NEW.store_id AND order_id=NEW.order_id);
 UPDATE shipment_commands SET state='canceled' WHERE store_id=NEW.store_id AND order_id=NEW.order_id AND state='planned' AND first_attempt_at IS NULL;
 UPDATE orders SET fulfillment_state='canceled' WHERE store_id=NEW.store_id AND id=NEW.order_id;
END;
CREATE TRIGGER unshipped_cancel_immutable BEFORE UPDATE ON unshipped_cancellations
BEGIN
 SELECT RAISE(ABORT,'unshipped_cancel_immutable');
END;
CREATE TRIGGER unshipped_cancel_no_delete BEFORE DELETE ON unshipped_cancellations
BEGIN
 SELECT RAISE(ABORT,'unshipped_cancel_immutable');
END;
