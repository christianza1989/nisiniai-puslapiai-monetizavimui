CREATE TABLE private_files (
  store_id TEXT NOT NULL,
  id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  source_id TEXT,
  filename TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  byte_length INTEGER NOT NULL CHECK(byte_length BETWEEN 1 AND 2097152),
  actor_ref TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(store_id,id),
  UNIQUE(storage_key),
  FOREIGN KEY(store_id,order_id) REFERENCES orders(store_id,id)
);
CREATE INDEX private_file_order ON private_files(store_id,order_id,created_at);
CREATE TRIGGER private_file_immutable BEFORE UPDATE ON private_files BEGIN
  SELECT RAISE(ABORT,'private_file_immutable');
END;
CREATE TRIGGER private_file_history BEFORE DELETE ON private_files BEGIN
  SELECT RAISE(ABORT,'private_file_immutable');
END;
