CREATE TABLE discount_codes (
 store_id TEXT NOT NULL REFERENCES stores(id), id TEXT NOT NULL, code TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('percent','fixed')), value INTEGER NOT NULL CHECK(value>0),
 currency TEXT NOT NULL CHECK(currency='EUR'), minimum_subtotal INTEGER NOT NULL CHECK(minimum_subtotal>=0),
 starts_at INTEGER, ends_at INTEGER, max_uses INTEGER CHECK(max_uses IS NULL OR max_uses>0),
 uses INTEGER NOT NULL DEFAULT 0 CHECK(uses>=0), enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
 version INTEGER NOT NULL CHECK(version>0), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,id), UNIQUE(store_id,code),
 CHECK((kind='percent' AND value BETWEEN 1 AND 99) OR kind='fixed'),
 CHECK(ends_at IS NULL OR starts_at IS NULL OR ends_at>starts_at)
);
CREATE TABLE discount_code_changes (
 store_id TEXT NOT NULL REFERENCES stores(id), id TEXT NOT NULL, discount_id TEXT NOT NULL,
 expected_version INTEGER NOT NULL CHECK(expected_version>=0), definition_json TEXT NOT NULL,
 payload_hash TEXT NOT NULL, actor_id TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,id)
);
CREATE TRIGGER discount_change_guard BEFORE INSERT ON discount_code_changes BEGIN
 SELECT CASE WHEN COALESCE((SELECT version FROM discount_codes WHERE store_id=NEW.store_id AND id=NEW.discount_id),0)<>NEW.expected_version THEN RAISE(ABORT,'discount_version_conflict') END;
 SELECT CASE WHEN json_extract(NEW.definition_json,'$.maxUses') IS NOT NULL AND json_extract(NEW.definition_json,'$.maxUses')<COALESCE((SELECT uses FROM discount_codes WHERE store_id=NEW.store_id AND id=NEW.discount_id),0) THEN RAISE(ABORT,'discount_limit_below_uses') END;
END;
CREATE TRIGGER discount_change_apply AFTER INSERT ON discount_code_changes BEGIN
 INSERT INTO discount_codes(store_id,id,code,kind,value,currency,minimum_subtotal,starts_at,ends_at,max_uses,enabled,version,created_at,updated_at)
 VALUES(NEW.store_id,NEW.discount_id,json_extract(NEW.definition_json,'$.code'),json_extract(NEW.definition_json,'$.kind'),json_extract(NEW.definition_json,'$.value'),'EUR',json_extract(NEW.definition_json,'$.minimumSubtotal'),json_extract(NEW.definition_json,'$.startsAt'),json_extract(NEW.definition_json,'$.endsAt'),json_extract(NEW.definition_json,'$.maxUses'),json_extract(NEW.definition_json,'$.enabled'),NEW.expected_version+1,NEW.created_at,NEW.created_at)
 ON CONFLICT(store_id,id) DO UPDATE SET code=excluded.code,kind=excluded.kind,value=excluded.value,minimum_subtotal=excluded.minimum_subtotal,starts_at=excluded.starts_at,ends_at=excluded.ends_at,max_uses=excluded.max_uses,enabled=excluded.enabled,version=excluded.version,updated_at=excluded.updated_at;
END;
CREATE TABLE order_discounts (
 store_id TEXT NOT NULL, order_id TEXT NOT NULL, discount_id TEXT NOT NULL, version INTEGER NOT NULL,
 code TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount>0), created_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,order_id), FOREIGN KEY(store_id,order_id) REFERENCES orders(store_id,id),
 FOREIGN KEY(store_id,discount_id) REFERENCES discount_codes(store_id,id)
);
CREATE INDEX order_discounts_code ON order_discounts(store_id,discount_id);
CREATE TRIGGER discount_order_guard BEFORE INSERT ON order_discounts BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM discount_codes WHERE store_id=NEW.store_id AND id=NEW.discount_id AND version=NEW.version AND code=NEW.code AND enabled=1 AND (starts_at IS NULL OR starts_at<=NEW.created_at) AND (ends_at IS NULL OR ends_at>NEW.created_at)) THEN RAISE(ABORT,'discount_changed') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM discount_codes WHERE store_id=NEW.store_id AND id=NEW.discount_id AND max_uses IS NOT NULL AND uses>=max_uses) THEN RAISE(ABORT,'discount_limit_reached') END;
END;
CREATE TRIGGER discount_order_count AFTER INSERT ON order_discounts BEGIN
 UPDATE discount_codes SET uses=uses+1 WHERE store_id=NEW.store_id AND id=NEW.discount_id;
END;
