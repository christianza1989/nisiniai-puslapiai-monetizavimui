ALTER TABLE discount_codes ADD COLUMN free_shipping INTEGER NOT NULL DEFAULT 0 CHECK(free_shipping IN (0,1));
ALTER TABLE order_discounts ADD COLUMN shipping_amount INTEGER NOT NULL DEFAULT 0 CHECK(shipping_amount>=0);
DROP TRIGGER discount_change_apply;
CREATE TRIGGER discount_change_apply AFTER INSERT ON discount_code_changes BEGIN
 INSERT INTO discount_codes(store_id,id,code,kind,value,currency,minimum_subtotal,starts_at,ends_at,max_uses,enabled,version,created_at,updated_at,free_shipping)
 VALUES(NEW.store_id,NEW.discount_id,json_extract(NEW.definition_json,'$.code'),json_extract(NEW.definition_json,'$.kind'),json_extract(NEW.definition_json,'$.value'),'EUR',json_extract(NEW.definition_json,'$.minimumSubtotal'),json_extract(NEW.definition_json,'$.startsAt'),json_extract(NEW.definition_json,'$.endsAt'),json_extract(NEW.definition_json,'$.maxUses'),json_extract(NEW.definition_json,'$.enabled'),NEW.expected_version+1,NEW.created_at,NEW.created_at,COALESCE(json_extract(NEW.definition_json,'$.freeShipping'),0))
 ON CONFLICT(store_id,id) DO UPDATE SET code=excluded.code,kind=excluded.kind,value=excluded.value,minimum_subtotal=excluded.minimum_subtotal,starts_at=excluded.starts_at,ends_at=excluded.ends_at,max_uses=excluded.max_uses,enabled=excluded.enabled,version=excluded.version,updated_at=excluded.updated_at,free_shipping=CASE WHEN json_type(NEW.definition_json,'$.freeShipping') IS NULL THEN discount_codes.free_shipping ELSE excluded.free_shipping END;
END;
