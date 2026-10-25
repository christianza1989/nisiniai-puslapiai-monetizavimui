CREATE TABLE shipping_origins (
  store_id TEXT NOT NULL REFERENCES stores(id),
  id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  actor_ref TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(store_id,id)
);
CREATE TABLE shipping_plans (
  store_id TEXT NOT NULL,
  id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  origin_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  actor_ref TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(store_id,id),
  FOREIGN KEY(store_id,order_id) REFERENCES orders(store_id,id),
  FOREIGN KEY(store_id,origin_id) REFERENCES shipping_origins(store_id,id)
);
CREATE INDEX shipping_plan_order ON shipping_plans(store_id,order_id,created_at);
CREATE TABLE shipping_quotes (
  store_id TEXT NOT NULL,
  id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  actor_ref TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(store_id,id),
  FOREIGN KEY(store_id,plan_id) REFERENCES shipping_plans(store_id,id)
);
CREATE INDEX shipping_quote_plan ON shipping_quotes(store_id,plan_id,created_at);
CREATE TABLE shipping_locker_snapshots (
  store_id TEXT NOT NULL REFERENCES stores(id),
  id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  actor_ref TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(store_id,id)
);
CREATE TRIGGER shipping_origin_immutable BEFORE UPDATE ON shipping_origins BEGIN
  SELECT RAISE(ABORT,'shipping_record_immutable');
END;
CREATE TRIGGER shipping_origin_history BEFORE DELETE ON shipping_origins BEGIN
  SELECT RAISE(ABORT,'shipping_record_immutable');
END;
CREATE TRIGGER shipping_plan_immutable BEFORE UPDATE ON shipping_plans BEGIN
  SELECT RAISE(ABORT,'shipping_record_immutable');
END;
CREATE TRIGGER shipping_plan_history BEFORE DELETE ON shipping_plans BEGIN
  SELECT RAISE(ABORT,'shipping_record_immutable');
END;
CREATE TRIGGER shipping_quote_immutable BEFORE UPDATE ON shipping_quotes BEGIN
  SELECT RAISE(ABORT,'shipping_record_immutable');
END;
CREATE TRIGGER shipping_quote_history BEFORE DELETE ON shipping_quotes BEGIN
  SELECT RAISE(ABORT,'shipping_record_immutable');
END;
CREATE TRIGGER shipping_locker_immutable BEFORE UPDATE ON shipping_locker_snapshots BEGIN
  SELECT RAISE(ABORT,'shipping_record_immutable');
END;
CREATE TRIGGER shipping_locker_history BEFORE DELETE ON shipping_locker_snapshots BEGIN
  SELECT RAISE(ABORT,'shipping_record_immutable');
END;
