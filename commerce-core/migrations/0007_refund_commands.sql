CREATE TABLE refund_commands (
 store_id TEXT NOT NULL REFERENCES stores(id), id TEXT NOT NULL, order_id TEXT NOT NULL,
 payment_id TEXT NOT NULL, account_ref TEXT NOT NULL, environment TEXT NOT NULL,
 amount INTEGER NOT NULL CHECK(amount>0), currency TEXT NOT NULL, reason TEXT NOT NULL,
 actor_ref TEXT NOT NULL, request_hash TEXT NOT NULL, created_at INTEGER NOT NULL,
 state TEXT NOT NULL DEFAULT 'planned' CHECK(state IN ('planned','submitting','unknown','pending','succeeded','failed','review')),
 first_attempt_at INTEGER, lease_token TEXT, lease_until INTEGER,
 provider_id TEXT, provider_status TEXT, review_reason TEXT, accounted INTEGER NOT NULL DEFAULT 0 CHECK(accounted IN (0,1)),
 PRIMARY KEY(store_id,id), FOREIGN KEY(store_id,order_id) REFERENCES orders(store_id,id), UNIQUE(store_id,provider_id)
);
CREATE INDEX refund_command_order ON refund_commands(store_id,order_id);
CREATE TRIGGER refund_command_budget BEFORE INSERT ON refund_commands
BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM orders o WHERE o.store_id=NEW.store_id AND o.id=NEW.order_id AND o.payment_id=NEW.payment_id AND o.currency=NEW.currency AND o.payment_state IN ('paid','partially_refunded') AND o.refunded_amount+NEW.amount+COALESCE((SELECT SUM(c.amount) FROM refund_commands c WHERE c.store_id=o.store_id AND c.order_id=o.id AND c.accounted=0 AND c.state!='failed'),0)<=o.amount) THEN RAISE(ABORT,'refund_budget_conflict') END;
END;
CREATE TRIGGER refund_command_immutable BEFORE UPDATE OF store_id,id,order_id,payment_id,account_ref,environment,amount,currency,reason,actor_ref,request_hash,created_at ON refund_commands
BEGIN
 SELECT RAISE(ABORT,'refund_command_immutable');
END;
CREATE TRIGGER refund_command_no_delete BEFORE DELETE ON refund_commands
BEGIN
 SELECT RAISE(ABORT,'refund_command_immutable');
END;
