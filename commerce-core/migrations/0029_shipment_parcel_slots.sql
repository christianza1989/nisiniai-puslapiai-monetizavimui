ALTER TABLE shipment_commands ADD COLUMN parcel_index INTEGER NOT NULL DEFAULT -1 CHECK(parcel_index>=-1 AND parcel_index<100);
ALTER TABLE shipment_commands ADD COLUMN parcel_count INTEGER NOT NULL DEFAULT 1 CHECK(parcel_count>=1 AND parcel_count<=100);
DROP INDEX one_active_shipment_command;
CREATE UNIQUE INDEX one_active_shipment_parcel ON shipment_commands(store_id,order_id,parcel_index) WHERE state!='canceled';
CREATE TRIGGER shipment_parcel_identity BEFORE UPDATE OF parcel_index,parcel_count ON shipment_commands
WHEN OLD.parcel_index!=NEW.parcel_index OR OLD.parcel_count!=NEW.parcel_count
BEGIN
 SELECT RAISE(ABORT,'shipment_command_immutable');
END;
CREATE TRIGGER shipment_parcel_plan_guard BEFORE INSERT ON shipment_commands
WHEN (NEW.parcel_index=-1 AND NEW.parcel_count!=1)
 OR (NEW.parcel_index>=0 AND (NEW.parcel_index>=NEW.parcel_count
  OR NEW.parcel_count!=(SELECT json_array_length(payload_json,'$.parcels') FROM shipping_plans WHERE store_id=NEW.store_id AND id=NEW.plan_id)))
 OR EXISTS(SELECT 1 FROM shipment_commands c WHERE c.store_id=NEW.store_id AND c.order_id=NEW.order_id AND c.state!='canceled'
  AND (c.plan_id!=NEW.plan_id OR c.account_ref!=NEW.account_ref OR c.environment!=NEW.environment OR c.provider!=NEW.provider
   OR c.parcel_count!=NEW.parcel_count OR c.parcel_index=-1 OR NEW.parcel_index=-1))
BEGIN
 SELECT RAISE(ABORT,'shipment_parcel_plan_conflict');
END;
CREATE TRIGGER shipment_no_resurrection BEFORE UPDATE OF state ON shipment_commands
WHEN OLD.state='canceled' AND NEW.state!='canceled'
BEGIN
 SELECT RAISE(ABORT,'shipment_command_immutable');
END;
DROP TRIGGER shipment_projection_guard;
CREATE TRIGGER shipment_projection_guard BEFORE UPDATE OF state ON shipment_commands
WHEN NEW.state='registered' AND EXISTS(SELECT 1 FROM shipments s WHERE s.store_id=NEW.store_id AND s.order_id=NEW.order_id
 AND (s.provider_id IS NULL OR (s.provider_id!=NEW.provider_id AND (NEW.parcel_index=-1 OR NOT EXISTS(
  SELECT 1 FROM shipment_commands c WHERE c.store_id=NEW.store_id AND c.order_id=NEW.order_id AND c.plan_id=NEW.plan_id
   AND c.parcel_index>=0 AND c.state='registered' AND c.provider_id=s.provider_id AND s.reference='command_'||c.id)))))
BEGIN
 SELECT RAISE(ABORT,'shipment_projection_conflict');
END;
CREATE TRIGGER shipment_legacy_projection_guard BEFORE INSERT ON shipments
WHEN EXISTS(SELECT 1 FROM shipment_commands c WHERE c.store_id=NEW.store_id AND c.order_id=NEW.order_id AND c.state!='canceled')
 AND NOT EXISTS(SELECT 1 FROM shipment_commands c WHERE c.store_id=NEW.store_id AND c.order_id=NEW.order_id
  AND c.state='registered' AND c.provider_id=NEW.provider_id AND NEW.reference='command_'||c.id)
BEGIN
 SELECT RAISE(ABORT,'shipment_projection_conflict');
END;
