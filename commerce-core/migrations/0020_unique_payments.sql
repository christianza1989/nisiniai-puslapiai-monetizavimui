CREATE UNIQUE INDEX order_payment_identity ON orders(store_id,payment_id) WHERE payment_id IS NOT NULL;
