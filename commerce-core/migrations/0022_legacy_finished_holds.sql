-- A zero free legacy balance may still have reserved/allocated unknown stock.
-- Do not allow a later release/cancellation to create untracked sellable kits.
INSERT OR IGNORE INTO finished_stock_holds(store_id,sku,held,reason)
SELECT DISTINCT a.store_id,a.sku,1,'Legacy assembly stock provenance requires inspected reconciliation'
FROM assemblies a WHERE NOT EXISTS(
 SELECT 1 FROM finished_lots f WHERE f.store_id=a.store_id AND f.assembly_id=a.id
);
CREATE TRIGGER hold_legacy_released_stock AFTER UPDATE OF stock_state ON orders
WHEN OLD.stock_provenance_unknown=1 AND OLD.stock_state='reserved' AND NEW.stock_state='released'
BEGIN
 INSERT INTO finished_stock_holds(store_id,sku,held,reason)
 SELECT l.store_id,l.sku,1,'Released legacy order stock requires inspected provenance'
 FROM order_lines l WHERE l.store_id=NEW.store_id AND l.order_id=NEW.id
 ON CONFLICT(store_id,sku) DO UPDATE SET held=1,reason=excluded.reason;
END;
CREATE TRIGGER hold_legacy_canceled_stock AFTER UPDATE OF fulfillment_state ON orders
WHEN OLD.stock_provenance_unknown=1 AND OLD.stock_state='allocated' AND NEW.fulfillment_state='canceled' AND OLD.fulfillment_state!='canceled'
BEGIN
 INSERT INTO finished_stock_holds(store_id,sku,held,reason)
 SELECT l.store_id,l.sku,1,'Canceled legacy order stock requires inspected provenance'
 FROM order_lines l WHERE l.store_id=NEW.store_id AND l.order_id=NEW.id
 ON CONFLICT(store_id,sku) DO UPDATE SET held=1,reason=excluded.reason;
END;
CREATE TRIGGER protect_legacy_reconciliation BEFORE INSERT ON finished_controls
WHEN NEW.kind='reconcile'
BEGIN
 SELECT CASE WHEN EXISTS(
 SELECT 1 FROM orders o JOIN order_lines l ON l.store_id=o.store_id AND l.order_id=o.id
 WHERE l.store_id=NEW.store_id AND l.sku=NEW.sku AND o.stock_provenance_unknown=1
 AND o.stock_state IN ('reserved','allocated') AND o.fulfillment_state IN ('pending','ready','stock_exception')
 ) THEN RAISE(ABORT,'finished_legacy_order_unresolved') END;
END;
