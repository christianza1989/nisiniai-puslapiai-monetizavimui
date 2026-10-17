CREATE TABLE IF NOT EXISTS components (
 store_id TEXT NOT NULL REFERENCES stores(id), id TEXT NOT NULL, name TEXT NOT NULL, unit TEXT NOT NULL CHECK(unit IN ('unit','g','ml')),
 payload_hash TEXT NOT NULL, PRIMARY KEY(store_id,id)
);
CREATE TABLE IF NOT EXISTS component_lots (
 store_id TEXT NOT NULL, id TEXT NOT NULL, component_id TEXT NOT NULL, supplier_ref TEXT NOT NULL,
 received INTEGER NOT NULL CHECK(received>0), available INTEGER NOT NULL CHECK(available>=0), expires_at INTEGER,
 payload_hash TEXT NOT NULL, actor_ref TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,id), FOREIGN KEY(store_id,component_id) REFERENCES components(store_id,id)
);
CREATE TABLE IF NOT EXISTS recipes (
 store_id TEXT NOT NULL, id TEXT NOT NULL, sku TEXT NOT NULL, definition_json TEXT NOT NULL, payload_hash TEXT NOT NULL,
 PRIMARY KEY(store_id,id), FOREIGN KEY(store_id,sku) REFERENCES products(store_id,sku)
);
CREATE TABLE IF NOT EXISTS assemblies (
 store_id TEXT NOT NULL, id TEXT NOT NULL, recipe_id TEXT NOT NULL, sku TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity>0),
 request_hash TEXT NOT NULL, payload_json TEXT NOT NULL, actor_ref TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,id), FOREIGN KEY(store_id,recipe_id) REFERENCES recipes(store_id,id), FOREIGN KEY(store_id,sku) REFERENCES inventory(store_id,sku)
);
CREATE TABLE IF NOT EXISTS assembly_lots (
 store_id TEXT NOT NULL, assembly_id TEXT NOT NULL, lot_id TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity>0),
 PRIMARY KEY(store_id,assembly_id,lot_id), FOREIGN KEY(store_id,assembly_id) REFERENCES assemblies(store_id,id),
 FOREIGN KEY(store_id,lot_id) REFERENCES component_lots(store_id,id)
);
CREATE TRIGGER IF NOT EXISTS consume_assembly_lot BEFORE INSERT ON assembly_lots BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM component_lots WHERE store_id=NEW.store_id AND id=NEW.lot_id AND available>=NEW.quantity)
 THEN RAISE(ABORT,'component_stock_conflict') END;
 UPDATE component_lots SET available=available-NEW.quantity WHERE store_id=NEW.store_id AND id=NEW.lot_id;
END;
CREATE TRIGGER IF NOT EXISTS finish_assembly AFTER INSERT ON assemblies BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM inventory WHERE store_id=NEW.store_id AND sku=NEW.sku AND available+NEW.quantity<=100000)
 THEN RAISE(ABORT,'assembly_limit') END;
 UPDATE inventory SET available=available+NEW.quantity WHERE store_id=NEW.store_id AND sku=NEW.sku;
END;
CREATE TABLE IF NOT EXISTS financial_sources (
 store_id TEXT NOT NULL REFERENCES stores(id), id TEXT NOT NULL, origin TEXT NOT NULL, reference TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('payment','refund','fee','payout','bank')), currency TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount!=0),
 transaction_ref TEXT, occurred_at INTEGER NOT NULL, payload_hash TEXT NOT NULL, actor_ref TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,id), UNIQUE(store_id,origin,reference)
);
CREATE TABLE IF NOT EXISTS reconciliations (
 store_id TEXT NOT NULL, source_id TEXT NOT NULL, target_kind TEXT NOT NULL CHECK(target_kind IN ('payment','refund','transfer')),
 target_ref TEXT NOT NULL, peer_id TEXT, actor_ref TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,source_id), UNIQUE(store_id,target_kind,target_ref), UNIQUE(store_id,peer_id),
 FOREIGN KEY(store_id,source_id) REFERENCES financial_sources(store_id,id), FOREIGN KEY(store_id,peer_id) REFERENCES financial_sources(store_id,id)
);
CREATE TRIGGER IF NOT EXISTS check_reconciliation BEFORE INSERT ON reconciliations BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM reconciliations WHERE store_id=NEW.store_id AND
 (source_id IN (NEW.source_id,NEW.peer_id) OR peer_id IN (NEW.source_id,NEW.peer_id)))
 THEN RAISE(ABORT,'reconciliation_conflict') END;
END;
CREATE TRIGGER IF NOT EXISTS immutable_source_update BEFORE UPDATE ON financial_sources BEGIN
 SELECT RAISE(ABORT,'financial_source_immutable');
END;
CREATE TRIGGER IF NOT EXISTS immutable_source_delete BEFORE DELETE ON financial_sources BEGIN
 SELECT RAISE(ABORT,'financial_source_immutable');
END;
CREATE TABLE IF NOT EXISTS wholesale_partners (
 store_id TEXT NOT NULL REFERENCES stores(id), id TEXT NOT NULL, name TEXT NOT NULL, price_list_id TEXT NOT NULL,
 country TEXT NOT NULL, currency TEXT NOT NULL, customer_json TEXT NOT NULL, approved INTEGER NOT NULL CHECK(approved IN (0,1)), payload_hash TEXT NOT NULL,
 PRIMARY KEY(store_id,id)
);
CREATE TABLE IF NOT EXISTS wholesale_price_lists (
 store_id TEXT NOT NULL REFERENCES stores(id), id TEXT NOT NULL, currency TEXT NOT NULL, definition_json TEXT NOT NULL,
 payload_hash TEXT NOT NULL, PRIMARY KEY(store_id,id)
);
CREATE TABLE IF NOT EXISTS wholesale_quotes (
 store_id TEXT NOT NULL, id TEXT NOT NULL, partner_id TEXT NOT NULL, request_hash TEXT NOT NULL, snapshot_json TEXT NOT NULL,
 expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL, actor_ref TEXT NOT NULL,
 PRIMARY KEY(store_id,id), FOREIGN KEY(store_id,partner_id) REFERENCES wholesale_partners(store_id,id)
);
CREATE TABLE IF NOT EXISTS wholesale_orders (
 store_id TEXT NOT NULL, quote_id TEXT NOT NULL, order_id TEXT NOT NULL,
 PRIMARY KEY(store_id,quote_id), UNIQUE(store_id,order_id), FOREIGN KEY(store_id,quote_id) REFERENCES wholesale_quotes(store_id,id),
 FOREIGN KEY(store_id,order_id) REFERENCES orders(store_id,id)
);
CREATE TRIGGER IF NOT EXISTS immutable_quote_update BEFORE UPDATE ON wholesale_quotes BEGIN
 SELECT RAISE(ABORT,'wholesale_quote_immutable');
END;
CREATE TRIGGER IF NOT EXISTS immutable_quote_delete BEFORE DELETE ON wholesale_quotes BEGIN
 SELECT RAISE(ABORT,'wholesale_quote_immutable');
END;
