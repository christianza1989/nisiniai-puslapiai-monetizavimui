ALTER TABLE component_lots ADD COLUMN quarantined INTEGER NOT NULL DEFAULT 0 CHECK(quarantined IN (0,1));
ALTER TABLE component_lots ADD COLUMN control_version INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS lot_controls (
 store_id TEXT NOT NULL, id TEXT NOT NULL, lot_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('adjust','quarantine','release')), delta INTEGER NOT NULL,
 expected_available INTEGER NOT NULL, expected_version INTEGER NOT NULL,
 reason TEXT NOT NULL, payload_hash TEXT NOT NULL, actor_ref TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,id), FOREIGN KEY(store_id,lot_id) REFERENCES component_lots(store_id,id)
);
CREATE TRIGGER IF NOT EXISTS check_lot_control BEFORE INSERT ON lot_controls BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM component_lots WHERE store_id=NEW.store_id AND id=NEW.lot_id
 AND available=NEW.expected_available AND control_version=NEW.expected_version
 AND available+NEW.delta BETWEEN 0 AND 100000000
 AND ((NEW.kind='adjust' AND NEW.delta!=0) OR (NEW.kind='quarantine' AND NEW.delta=0 AND quarantined=0)
 OR (NEW.kind='release' AND NEW.delta=0 AND quarantined=1)))
 THEN RAISE(ABORT,'lot_state_conflict') END;
END;
CREATE TRIGGER IF NOT EXISTS apply_lot_control AFTER INSERT ON lot_controls BEGIN
 UPDATE component_lots SET available=available+NEW.delta,
 quarantined=CASE NEW.kind WHEN 'quarantine' THEN 1 WHEN 'release' THEN 0 ELSE quarantined END
 WHERE store_id=NEW.store_id AND id=NEW.lot_id;
END;
CREATE TRIGGER IF NOT EXISTS version_lot_control AFTER UPDATE OF available,quarantined ON component_lots BEGIN
 UPDATE component_lots SET control_version=OLD.control_version+1 WHERE store_id=NEW.store_id AND id=NEW.id;
END;
CREATE TRIGGER IF NOT EXISTS immutable_lot_control_update BEFORE UPDATE ON lot_controls BEGIN
 SELECT RAISE(ABORT,'lot_control_immutable');
END;
CREATE TRIGGER IF NOT EXISTS immutable_lot_control_delete BEFORE DELETE ON lot_controls BEGIN
 SELECT RAISE(ABORT,'lot_control_immutable');
END;
CREATE TRIGGER IF NOT EXISTS immutable_lot_receipt BEFORE UPDATE OF store_id,id,component_id,supplier_ref,received,expires_at,payload_hash,actor_ref,created_at ON component_lots BEGIN
 SELECT RAISE(ABORT,'lot_receipt_immutable');
END;
CREATE TRIGGER IF NOT EXISTS check_assembly_lot_state BEFORE INSERT ON assembly_lots BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM component_lots l JOIN assemblies a ON a.store_id=l.store_id
 WHERE l.store_id=NEW.store_id AND l.id=NEW.lot_id AND a.id=NEW.assembly_id
 AND l.quarantined=0 AND (l.expires_at IS NULL OR l.expires_at>a.created_at))
 THEN RAISE(ABORT,'component_stock_conflict') END;
END;
