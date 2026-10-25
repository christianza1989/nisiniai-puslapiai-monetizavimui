ALTER TABLE orders ADD COLUMN stock_checked_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN stock_generation INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN stock_provenance_unknown INTEGER NOT NULL DEFAULT 0;
ALTER TABLE shipments ADD COLUMN first_attempt_at INTEGER;
UPDATE shipments SET first_attempt_at=0;
UPDATE orders SET stock_checked_at=created_at;
CREATE TABLE finished_lots (
 store_id TEXT NOT NULL, id TEXT NOT NULL, sku TEXT NOT NULL, assembly_id TEXT,
 received INTEGER NOT NULL CHECK(received>0), available INTEGER NOT NULL CHECK(available>=0),
 receipt_mode TEXT NOT NULL CHECK(receipt_mode IN ('assembly','receive','adopt')),
 expires_at INTEGER, quarantined INTEGER NOT NULL DEFAULT 0 CHECK(quarantined IN (0,1)),
 control_version INTEGER NOT NULL DEFAULT 0, supplier_ref TEXT NOT NULL,
 request_hash TEXT NOT NULL, actor_ref TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,id), UNIQUE(store_id,id,sku), UNIQUE(store_id,assembly_id),
 FOREIGN KEY(store_id,sku) REFERENCES inventory(store_id,sku),
 FOREIGN KEY(store_id,assembly_id) REFERENCES assemblies(store_id,id)
);
CREATE VIEW finished_lot_quality AS
SELECT f.*, CASE WHEN f.quarantined=1 OR EXISTS(
 SELECT 1 FROM assembly_lots a JOIN component_lots c ON c.store_id=a.store_id AND c.id=a.lot_id
 WHERE a.store_id=f.store_id AND a.assembly_id=f.assembly_id AND c.quarantined=1
) THEN 1 ELSE 0 END AS blocked
FROM finished_lots f;
CREATE TRIGGER finished_lot_budget BEFORE INSERT ON finished_lots
BEGIN
 SELECT CASE WHEN NEW.available!=NEW.received OR NOT EXISTS(
 SELECT 1 FROM inventory i WHERE i.store_id=NEW.store_id AND i.sku=NEW.sku
 AND i.available>=NEW.available+COALESCE((SELECT SUM(f.available) FROM finished_lots f WHERE f.store_id=i.store_id AND f.sku=i.sku),0))
 THEN RAISE(ABORT,'finished_stock_conflict') END;
END;
CREATE TABLE finished_stock_holds (
 store_id TEXT NOT NULL, sku TEXT NOT NULL, held INTEGER NOT NULL DEFAULT 1 CHECK(held IN (0,1)),
 reason TEXT NOT NULL, PRIMARY KEY(store_id,sku),
 FOREIGN KEY(store_id,sku) REFERENCES inventory(store_id,sku)
);
INSERT INTO finished_stock_holds(store_id,sku,reason)
SELECT i.store_id,i.sku,'Legacy assembly stock provenance requires inspected reconciliation'
FROM inventory i WHERE i.available>0 AND EXISTS(
 SELECT 1 FROM assemblies a WHERE a.store_id=i.store_id AND a.sku=i.sku
);
UPDATE orders SET stock_provenance_unknown=1
WHERE stock_state IN ('reserved','allocated') AND fulfillment_state IN ('pending','ready','stock_exception')
AND EXISTS(SELECT 1 FROM order_lines l JOIN assemblies a ON a.store_id=l.store_id AND a.sku=l.sku
 WHERE l.store_id=orders.store_id AND l.order_id=orders.id);
CREATE TABLE finished_allocations (
 store_id TEXT NOT NULL, order_id TEXT NOT NULL, generation INTEGER NOT NULL, sku TEXT NOT NULL,
 lot_id TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity>0),
 state TEXT NOT NULL CHECK(state IN ('reserved','allocated','released','canceled')),
 PRIMARY KEY(store_id,order_id,generation,sku,lot_id),
 FOREIGN KEY(store_id,order_id) REFERENCES orders(store_id,id),
 FOREIGN KEY(store_id,lot_id,sku) REFERENCES finished_lots(store_id,id,sku)
);
CREATE TABLE finished_controls (
 store_id TEXT NOT NULL, id TEXT NOT NULL, lot_id TEXT, sku TEXT NOT NULL,
 kind TEXT NOT NULL, request_hash TEXT NOT NULL, payload_json TEXT NOT NULL,
 actor_ref TEXT NOT NULL, reason TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,id), FOREIGN KEY(store_id,sku) REFERENCES inventory(store_id,sku)
);
CREATE TRIGGER protect_finished_stock_adjustment BEFORE INSERT ON stock_adjustments
BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM products WHERE store_id=NEW.store_id AND sku=NEW.sku AND json_extract(definition_json,'$.lotTrackingRequired')=1)
 OR NEW.expected_available+NEW.delta<COALESCE((SELECT SUM(available) FROM finished_lots WHERE store_id=NEW.store_id AND sku=NEW.sku),0)
 THEN RAISE(ABORT,'stock_adjustment_conflict') END;
END;
CREATE TRIGGER protect_finished_tracking_policy BEFORE UPDATE OF definition_json ON products
BEGIN
 SELECT CASE WHEN json_extract(OLD.definition_json,'$.lotTrackingRequired')=1 AND COALESCE(json_extract(NEW.definition_json,'$.lotTrackingRequired'),0)!=1
 THEN RAISE(ABORT,'stock_policy_immutable') END;
 SELECT CASE WHEN COALESCE(json_extract(OLD.definition_json,'$.lotTrackingRequired'),0)!=1 AND json_extract(NEW.definition_json,'$.lotTrackingRequired')=1
 AND ((SELECT available FROM inventory WHERE store_id=OLD.store_id AND sku=OLD.sku)!=0 OR EXISTS(
 SELECT 1 FROM order_lines l JOIN orders o ON o.store_id=l.store_id AND o.id=l.order_id
 WHERE l.store_id=OLD.store_id AND l.sku=OLD.sku AND o.stock_state IN ('reserved','allocated') AND o.fulfillment_state IN ('pending','ready','stock_exception')))
 THEN RAISE(ABORT,'stock_tracking_transition_requires_empty') END;
END;
ALTER TABLE return_receipt_lines ADD COLUMN finished_lot_id TEXT;
CREATE TRIGGER returned_finished_quality BEFORE INSERT ON return_receipt_lines
BEGIN
 SELECT CASE WHEN NEW.finished_lot_id IS NULL AND NEW.quantity+COALESCE((SELECT SUM(quantity) FROM return_receipt_lines WHERE store_id=NEW.store_id AND order_id=NEW.order_id AND sku=NEW.sku AND finished_lot_id IS NULL),0)>
 (SELECT quantity FROM order_lines WHERE store_id=NEW.store_id AND order_id=NEW.order_id AND sku=NEW.sku)-COALESCE((SELECT SUM(a.quantity) FROM finished_allocations a JOIN orders o ON o.store_id=a.store_id AND o.id=a.order_id WHERE a.store_id=NEW.store_id AND a.order_id=NEW.order_id AND a.sku=NEW.sku AND a.generation=o.stock_generation AND a.state='allocated'),0)
 THEN RAISE(ABORT,'returned_lot_identity_required') END;
 SELECT CASE WHEN NEW.finished_lot_id IS NOT NULL AND NOT EXISTS(
 SELECT 1 FROM finished_allocations a JOIN orders o ON o.store_id=a.store_id AND o.id=a.order_id JOIN finished_lot_quality f ON f.store_id=a.store_id AND f.id=a.lot_id
 JOIN return_receipts r ON r.store_id=NEW.store_id AND r.id=NEW.receipt_id
 WHERE a.store_id=NEW.store_id AND a.order_id=NEW.order_id AND a.sku=NEW.sku AND a.lot_id=NEW.finished_lot_id AND a.generation=o.stock_generation AND a.state='allocated'
 AND NEW.quantity+COALESCE((SELECT SUM(quantity) FROM return_receipt_lines WHERE store_id=NEW.store_id AND order_id=NEW.order_id AND sku=NEW.sku AND finished_lot_id=NEW.finished_lot_id),0)<=a.quantity
 AND (NEW.disposition!='resalable' OR (f.blocked=0 AND (f.expires_at IS NULL OR f.expires_at>r.created_at))))
 THEN RAISE(ABORT,'returned_lot_not_eligible') END;
END;
CREATE TRIGGER restore_returned_finished AFTER INSERT ON return_receipt_lines
WHEN NEW.finished_lot_id IS NOT NULL AND NEW.disposition='resalable'
BEGIN
 UPDATE finished_lots SET available=available+NEW.quantity,control_version=control_version+1 WHERE store_id=NEW.store_id AND id=NEW.finished_lot_id AND sku=NEW.sku;
END;
DROP TRIGGER unshipped_cancel_guard;
CREATE TRIGGER unshipped_cancel_guard BEFORE INSERT ON unshipped_cancellations
BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM orders WHERE store_id=NEW.store_id AND id=NEW.order_id AND payment_state='refunded'
 AND ((stock_state='allocated' AND fulfillment_state IN ('pending','ready')) OR (stock_state='released' AND fulfillment_state='stock_exception')))
 OR EXISTS(SELECT 1 FROM shipments WHERE store_id=NEW.store_id AND order_id=NEW.order_id AND (first_attempt_at IS NOT NULL OR state='registered'))
 OR EXISTS(SELECT 1 FROM shipment_commands WHERE store_id=NEW.store_id AND order_id=NEW.order_id AND (first_attempt_at IS NOT NULL OR state NOT IN ('planned','canceled') OR lease_until>NEW.created_at))
 THEN RAISE(ABORT,'unshipped_cancel_not_allowed') END;
END;
DROP TRIGGER unshipped_cancel_apply;
CREATE TRIGGER unshipped_cancel_apply AFTER INSERT ON unshipped_cancellations
BEGIN
 UPDATE inventory SET available=available+(SELECT quantity FROM order_lines WHERE store_id=NEW.store_id AND order_id=NEW.order_id AND sku=inventory.sku)
 WHERE store_id=NEW.store_id AND sku IN(SELECT sku FROM order_lines WHERE store_id=NEW.store_id AND order_id=NEW.order_id)
 AND EXISTS(SELECT 1 FROM orders WHERE store_id=NEW.store_id AND id=NEW.order_id AND stock_state='allocated');
 UPDATE finished_lots SET available=available+COALESCE((SELECT SUM(a.quantity) FROM finished_allocations a JOIN orders o ON o.store_id=a.store_id AND o.id=a.order_id
 WHERE a.store_id=NEW.store_id AND a.order_id=NEW.order_id AND a.generation=o.stock_generation AND a.lot_id=finished_lots.id AND a.state='allocated'),0),control_version=control_version+1
 WHERE store_id=NEW.store_id AND id IN(SELECT lot_id FROM finished_allocations WHERE store_id=NEW.store_id AND order_id=NEW.order_id AND state='allocated');
 UPDATE finished_allocations SET state='canceled' WHERE store_id=NEW.store_id AND order_id=NEW.order_id AND state='allocated';
 UPDATE shipment_commands SET state='canceled' WHERE store_id=NEW.store_id AND order_id=NEW.order_id AND state='planned' AND first_attempt_at IS NULL;
 UPDATE orders SET fulfillment_state='canceled' WHERE store_id=NEW.store_id AND id=NEW.order_id;
END;
CREATE TRIGGER finished_allocation_consume BEFORE INSERT ON finished_allocations
BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM finished_lot_quality f JOIN orders o ON o.store_id=NEW.store_id AND o.id=NEW.order_id
 WHERE f.store_id=NEW.store_id AND f.id=NEW.lot_id AND f.sku=NEW.sku AND f.available>=NEW.quantity
 AND f.blocked=0 AND (f.expires_at IS NULL OR f.expires_at>o.stock_checked_at))
 THEN RAISE(ABORT,'stock_unavailable') END;
 UPDATE finished_lots SET available=available-NEW.quantity,control_version=control_version+1
 WHERE store_id=NEW.store_id AND id=NEW.lot_id;
END;
CREATE TRIGGER finished_allocation_identity BEFORE UPDATE ON finished_allocations
WHEN NEW.store_id!=OLD.store_id OR NEW.order_id!=OLD.order_id OR NEW.generation!=OLD.generation
 OR NEW.sku!=OLD.sku OR NEW.lot_id!=OLD.lot_id OR NEW.quantity!=OLD.quantity
BEGIN
 SELECT RAISE(ABORT,'finished_allocation_immutable');
END;
CREATE TRIGGER finished_allocation_history BEFORE DELETE ON finished_allocations
BEGIN
 SELECT RAISE(ABORT,'finished_allocation_immutable');
END;
DROP TRIGGER reserve_stock;
CREATE TRIGGER reserve_stock BEFORE INSERT ON order_lines
BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM finished_stock_holds WHERE store_id=NEW.store_id AND sku=NEW.sku AND held=1)
 OR NOT EXISTS(
 SELECT 1 FROM inventory i JOIN products p ON p.store_id=i.store_id AND p.sku=i.sku JOIN orders o ON o.store_id=NEW.store_id AND o.id=NEW.order_id
 WHERE i.store_id=NEW.store_id AND i.sku=NEW.sku AND o.stock_checked_at>0
 AND CASE WHEN json_extract(p.definition_json,'$.lotTrackingRequired')=1
 THEN COALESCE((SELECT SUM(f.available) FROM finished_lot_quality f WHERE f.store_id=i.store_id AND f.sku=i.sku AND f.blocked=0 AND (f.expires_at IS NULL OR f.expires_at>o.stock_checked_at)),0)
 ELSE i.available-COALESCE((SELECT SUM(f.available) FROM finished_lot_quality f WHERE f.store_id=i.store_id AND f.sku=i.sku AND (f.blocked=1 OR f.expires_at<=o.stock_checked_at)),0)
 END>=NEW.quantity
 ) THEN RAISE(ABORT,'stock_unavailable') END;
 INSERT INTO finished_allocations(store_id,order_id,generation,sku,lot_id,quantity,state)
 SELECT NEW.store_id,NEW.order_id,o.stock_generation,NEW.sku,f.id,MIN(f.available,NEW.quantity-COALESCE(f.prior,0)),'reserved'
 FROM (SELECT q.*,SUM(q.available) OVER(ORDER BY q.expires_at IS NULL,q.expires_at,q.created_at,q.id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prior
 FROM finished_lot_quality q WHERE q.store_id=NEW.store_id AND q.sku=NEW.sku AND q.available>0 AND q.blocked=0
 AND (q.expires_at IS NULL OR q.expires_at>(SELECT stock_checked_at FROM orders WHERE store_id=NEW.store_id AND id=NEW.order_id))) f
 JOIN orders o ON o.store_id=NEW.store_id AND o.id=NEW.order_id
 WHERE COALESCE(f.prior,0)<NEW.quantity;
 UPDATE inventory SET available=available-NEW.quantity WHERE store_id=NEW.store_id AND sku=NEW.sku;
END;
CREATE TRIGGER release_finished_reservation AFTER UPDATE OF stock_state ON orders
WHEN OLD.stock_state='reserved' AND NEW.stock_state='released'
BEGIN
 UPDATE finished_lots SET available=available+COALESCE((SELECT SUM(a.quantity) FROM finished_allocations a
 WHERE a.store_id=OLD.store_id AND a.order_id=OLD.id AND a.generation=OLD.stock_generation AND a.lot_id=finished_lots.id AND a.state='reserved'),0),
 control_version=control_version+1
 WHERE store_id=OLD.store_id AND id IN(SELECT lot_id FROM finished_allocations WHERE store_id=OLD.store_id AND order_id=OLD.id AND generation=OLD.stock_generation AND state='reserved');
 UPDATE finished_allocations SET state='released' WHERE store_id=OLD.store_id AND order_id=OLD.id AND generation=OLD.stock_generation AND state='reserved';
END;
DROP TRIGGER late_allocate;
CREATE TRIGGER late_allocate BEFORE UPDATE OF stock_state ON orders
WHEN OLD.stock_state='released' AND NEW.stock_state='allocated'
BEGIN
 SELECT CASE WHEN NEW.stock_generation!=OLD.stock_generation+1 OR NEW.stock_checked_at<=0 OR OLD.stock_provenance_unknown=1
 OR EXISTS(SELECT 1 FROM order_lines l JOIN inventory i ON i.store_id=l.store_id AND i.sku=l.sku JOIN products p ON p.store_id=l.store_id AND p.sku=l.sku
 WHERE l.store_id=OLD.store_id AND l.order_id=OLD.id AND (
 EXISTS(SELECT 1 FROM finished_stock_holds h WHERE h.store_id=l.store_id AND h.sku=l.sku AND h.held=1)
 OR CASE WHEN json_extract(p.definition_json,'$.lotTrackingRequired')=1
 THEN COALESCE((SELECT SUM(f.available) FROM finished_lot_quality f WHERE f.store_id=l.store_id AND f.sku=l.sku AND f.blocked=0 AND (f.expires_at IS NULL OR f.expires_at>NEW.stock_checked_at)),0)
 ELSE i.available-COALESCE((SELECT SUM(f.available) FROM finished_lot_quality f WHERE f.store_id=l.store_id AND f.sku=l.sku AND (f.blocked=1 OR f.expires_at<=NEW.stock_checked_at)),0)
 END<l.quantity))
 THEN RAISE(ABORT,'stock_unavailable') END;
 INSERT INTO finished_allocations(store_id,order_id,generation,sku,lot_id,quantity,state)
 SELECT OLD.store_id,OLD.id,NEW.stock_generation,f.sku,f.id,MIN(f.available,l.quantity-COALESCE(f.prior,0)),'allocated'
 FROM (SELECT q.*,SUM(q.available) OVER(PARTITION BY q.sku ORDER BY q.expires_at IS NULL,q.expires_at,q.created_at,q.id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prior
 FROM finished_lot_quality q WHERE q.store_id=OLD.store_id AND q.available>0 AND q.blocked=0 AND (q.expires_at IS NULL OR q.expires_at>NEW.stock_checked_at)) f
 JOIN order_lines l ON l.store_id=OLD.store_id AND l.order_id=OLD.id AND l.sku=f.sku
 WHERE COALESCE(f.prior,0)<l.quantity;
 UPDATE inventory SET available=available-(SELECT quantity FROM order_lines WHERE store_id=OLD.store_id AND order_id=OLD.id AND sku=inventory.sku)
 WHERE store_id=OLD.store_id AND sku IN(SELECT sku FROM order_lines WHERE store_id=OLD.store_id AND order_id=OLD.id);
END;
CREATE TRIGGER confirm_finished_quality BEFORE UPDATE OF stock_state ON orders
WHEN OLD.stock_state='reserved' AND NEW.stock_state='allocated'
BEGIN
 SELECT CASE WHEN OLD.stock_provenance_unknown=1 OR EXISTS(SELECT 1 FROM finished_allocations a JOIN finished_lot_quality f ON f.store_id=a.store_id AND f.id=a.lot_id
 WHERE a.store_id=OLD.store_id AND a.order_id=OLD.id AND a.generation=OLD.stock_generation AND a.state='reserved' AND (f.blocked=1 OR f.expires_at<=NEW.stock_checked_at))
 THEN RAISE(ABORT,'stock_unavailable') END;
END;
CREATE TRIGGER confirm_finished_allocation AFTER UPDATE OF stock_state ON orders
WHEN OLD.stock_state='reserved' AND NEW.stock_state='allocated'
BEGIN
 UPDATE finished_allocations SET state='allocated' WHERE store_id=OLD.store_id AND order_id=OLD.id AND generation=OLD.stock_generation AND state='reserved';
END;
CREATE TRIGGER pack_finished_quality BEFORE UPDATE OF fulfillment_state ON orders
WHEN NEW.fulfillment_state='ready' AND OLD.fulfillment_state!='ready'
BEGIN
 SELECT CASE WHEN NEW.stock_provenance_unknown=1 OR EXISTS(SELECT 1 FROM finished_allocations a JOIN finished_lot_quality f ON f.store_id=a.store_id AND f.id=a.lot_id
 WHERE a.store_id=NEW.store_id AND a.order_id=NEW.id AND a.generation=NEW.stock_generation AND a.state='allocated' AND (f.blocked=1 OR f.expires_at<=NEW.stock_checked_at))
 THEN RAISE(ABORT,'stock_quality_hold') END;
END;
CREATE TRIGGER book_finished_quality BEFORE UPDATE OF first_attempt_at ON shipment_commands
WHEN OLD.first_attempt_at IS NULL AND NEW.first_attempt_at IS NOT NULL
BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM orders WHERE store_id=NEW.store_id AND id=NEW.order_id AND stock_provenance_unknown=1)
 OR EXISTS(SELECT 1 FROM finished_allocations a JOIN orders o ON o.store_id=a.store_id AND o.id=a.order_id JOIN finished_lot_quality f ON f.store_id=a.store_id AND f.id=a.lot_id
 WHERE a.store_id=NEW.store_id AND a.order_id=NEW.order_id AND a.generation=o.stock_generation AND a.state='allocated' AND (f.blocked=1 OR f.expires_at<=NEW.first_attempt_at))
 THEN RAISE(ABORT,'stock_quality_hold') END;
END;
CREATE TRIGGER legacy_book_finished_quality BEFORE UPDATE OF first_attempt_at ON shipments
WHEN OLD.first_attempt_at IS NULL AND NEW.first_attempt_at IS NOT NULL
BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM orders WHERE store_id=NEW.store_id AND id=NEW.order_id AND payment_state='paid' AND stock_state='allocated' AND fulfillment_state='ready' AND stock_provenance_unknown=0)
 OR EXISTS(SELECT 1 FROM finished_allocations a JOIN orders o ON o.store_id=a.store_id AND o.id=a.order_id JOIN finished_lot_quality f ON f.store_id=a.store_id AND f.id=a.lot_id
 WHERE a.store_id=NEW.store_id AND a.order_id=NEW.order_id AND a.generation=o.stock_generation AND a.state='allocated' AND (f.blocked=1 OR f.expires_at<=NEW.first_attempt_at))
 THEN RAISE(ABORT,'stock_quality_hold') END;
END;
CREATE TRIGGER finished_lot_identity BEFORE UPDATE ON finished_lots
WHEN NEW.store_id!=OLD.store_id OR NEW.id!=OLD.id OR NEW.sku!=OLD.sku OR NEW.assembly_id IS NOT OLD.assembly_id
 OR NEW.received!=OLD.received OR NEW.receipt_mode!=OLD.receipt_mode OR NEW.expires_at IS NOT OLD.expires_at OR NEW.supplier_ref!=OLD.supplier_ref
 OR NEW.request_hash!=OLD.request_hash OR NEW.actor_ref!=OLD.actor_ref OR NEW.created_at!=OLD.created_at
BEGIN
 SELECT RAISE(ABORT,'finished_lot_immutable');
END;
CREATE TRIGGER finished_lot_history BEFORE DELETE ON finished_lots
BEGIN
 SELECT RAISE(ABORT,'finished_lot_immutable');
END;
CREATE TRIGGER finished_control_immutable BEFORE UPDATE ON finished_controls
BEGIN
 SELECT RAISE(ABORT,'finished_control_immutable');
END;
CREATE TRIGGER finished_control_history BEFORE DELETE ON finished_controls
BEGIN
 SELECT RAISE(ABORT,'finished_control_immutable');
END;
CREATE TRIGGER finished_control_cas BEFORE INSERT ON finished_controls
BEGIN
 SELECT CASE WHEN changes()!=1 THEN RAISE(ABORT,'finished_state_conflict') END;
 SELECT CASE WHEN NEW.kind='reconcile' AND NOT EXISTS(
 SELECT 1 FROM inventory i JOIN finished_stock_holds h ON h.store_id=i.store_id AND h.sku=i.sku
 WHERE i.store_id=NEW.store_id AND i.sku=NEW.sku AND h.held=0
 AND i.available=json_extract(NEW.payload_json,'$.expectedAvailable')
 AND i.available=COALESCE((SELECT SUM(f.available) FROM finished_lots f WHERE f.store_id=i.store_id AND f.sku=i.sku),0))
 THEN RAISE(ABORT,'finished_reconciliation_incomplete') END;
 SELECT CASE WHEN NEW.kind!='reconcile' AND NOT EXISTS(
 SELECT 1 FROM finished_lots WHERE store_id=NEW.store_id AND id=NEW.lot_id AND sku=NEW.sku
 AND available=json_extract(NEW.payload_json,'$.expectedAvailable')+json_extract(NEW.payload_json,'$.delta')
 AND control_version=json_extract(NEW.payload_json,'$.expectedVersion')+1)
 THEN RAISE(ABORT,'finished_state_conflict') END;
END;
