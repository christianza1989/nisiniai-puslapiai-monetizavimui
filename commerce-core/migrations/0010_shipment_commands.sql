CREATE TABLE shipment_commands (
 store_id TEXT NOT NULL, id TEXT NOT NULL, order_id TEXT NOT NULL, plan_id TEXT NOT NULL,
 account_ref TEXT NOT NULL, environment TEXT NOT NULL, provider TEXT NOT NULL,
 payload_hash TEXT NOT NULL, payload_json TEXT NOT NULL, actor_ref TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'planned' CHECK(state IN ('planned','executing','unknown','registered','review','canceled')),
 lease_token TEXT, lease_until INTEGER NOT NULL DEFAULT 0, first_attempt_at INTEGER,
 provider_id TEXT, review_reason TEXT, created_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,id), UNIQUE(store_id,provider_id),
 FOREIGN KEY(store_id,order_id) REFERENCES orders(store_id,id),
 FOREIGN KEY(store_id,plan_id) REFERENCES shipping_plans(store_id,id)
);
CREATE UNIQUE INDEX one_active_shipment_command ON shipment_commands(store_id,order_id) WHERE state!='canceled';
CREATE TRIGGER shipment_command_facts BEFORE UPDATE ON shipment_commands
WHEN OLD.order_id!=NEW.order_id OR OLD.plan_id!=NEW.plan_id OR OLD.account_ref!=NEW.account_ref
 OR OLD.environment!=NEW.environment OR OLD.provider!=NEW.provider OR OLD.payload_hash!=NEW.payload_hash
 OR OLD.payload_json!=NEW.payload_json OR OLD.actor_ref!=NEW.actor_ref OR OLD.created_at!=NEW.created_at
 OR (OLD.first_attempt_at IS NOT NULL AND NEW.first_attempt_at IS NOT OLD.first_attempt_at)
BEGIN
 SELECT RAISE(ABORT,'shipment_command_immutable');
END;
CREATE TRIGGER shipment_command_history BEFORE DELETE ON shipment_commands
BEGIN
 SELECT RAISE(ABORT,'shipment_command_immutable');
END;
CREATE TRIGGER shipment_projection_guard BEFORE UPDATE OF state ON shipment_commands
WHEN NEW.state='registered' AND EXISTS(SELECT 1 FROM shipments WHERE store_id=NEW.store_id AND order_id=NEW.order_id AND (provider_id IS NULL OR provider_id!=NEW.provider_id))
BEGIN
 SELECT RAISE(ABORT,'shipment_projection_conflict');
END;
CREATE TABLE shipment_observations (
 store_id TEXT NOT NULL, command_id TEXT NOT NULL, id TEXT NOT NULL, kind TEXT NOT NULL,
 payload_json TEXT NOT NULL, received_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,id), FOREIGN KEY(store_id,command_id) REFERENCES shipment_commands(store_id,id)
);
CREATE TRIGGER shipment_observation_facts BEFORE UPDATE ON shipment_observations
BEGIN
 SELECT RAISE(ABORT,'shipment_observation_immutable');
END;
CREATE TRIGGER shipment_observation_history BEFORE DELETE ON shipment_observations
BEGIN
 SELECT RAISE(ABORT,'shipment_observation_immutable');
END;
