ALTER TABLE wholesale_partners ADD COLUMN approval_version INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS wholesale_partner_changes (
 store_id TEXT NOT NULL, id TEXT NOT NULL, partner_id TEXT NOT NULL, expected_version INTEGER NOT NULL,
 approved INTEGER NOT NULL CHECK(approved IN (0,1)), payload_hash TEXT NOT NULL, actor_ref TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,id), FOREIGN KEY(store_id,partner_id) REFERENCES wholesale_partners(store_id,id)
);
CREATE TRIGGER IF NOT EXISTS check_partner_change BEFORE INSERT ON wholesale_partner_changes BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM wholesale_partners WHERE store_id=NEW.store_id AND id=NEW.partner_id AND approval_version=NEW.expected_version)
 THEN RAISE(ABORT,'partner_state_conflict') END;
END;
CREATE TRIGGER IF NOT EXISTS immutable_partner_change_update BEFORE UPDATE ON wholesale_partner_changes BEGIN
 SELECT RAISE(ABORT,'partner_change_immutable');
END;
CREATE TRIGGER IF NOT EXISTS immutable_partner_change_delete BEFORE DELETE ON wholesale_partner_changes BEGIN
 SELECT RAISE(ABORT,'partner_change_immutable');
END;
CREATE TRIGGER IF NOT EXISTS apply_partner_change AFTER INSERT ON wholesale_partner_changes BEGIN
 UPDATE wholesale_partners SET approved=NEW.approved,approval_version=approval_version+1 WHERE store_id=NEW.store_id AND id=NEW.partner_id;
END;
CREATE TRIGGER IF NOT EXISTS check_wholesale_partner BEFORE INSERT ON wholesale_orders BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM wholesale_quotes q JOIN wholesale_partners p ON p.store_id=q.store_id AND p.id=q.partner_id
 WHERE q.store_id=NEW.store_id AND q.id=NEW.quote_id AND p.approved=1)
 THEN RAISE(ABORT,'partner_not_approved') END;
END;
