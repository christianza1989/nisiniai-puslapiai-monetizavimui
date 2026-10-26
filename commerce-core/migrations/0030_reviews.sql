ALTER TABLE orders ADD COLUMN public_number INTEGER;
CREATE UNIQUE INDEX order_public_numbers ON orders(store_id,public_number) WHERE public_number IS NOT NULL;
CREATE TABLE order_number_counters(store_id TEXT PRIMARY KEY REFERENCES stores(id),last_number INTEGER NOT NULL CHECK(last_number>0));
CREATE TRIGGER assign_order_public_number AFTER INSERT ON orders WHEN EXISTS(SELECT 1 FROM order_number_counters WHERE store_id=NEW.store_id) BEGIN
 UPDATE order_number_counters SET last_number=last_number+1 WHERE store_id=NEW.store_id;
 UPDATE orders SET public_number=(SELECT last_number FROM order_number_counters WHERE store_id=NEW.store_id) WHERE store_id=NEW.store_id AND id=NEW.id;
END;
CREATE TABLE review_settings(store_id TEXT PRIMARY KEY REFERENCES stores(id),version INTEGER NOT NULL,enabled INTEGER NOT NULL DEFAULT 0,delay_days INTEGER NOT NULL DEFAULT 30 CHECK(delay_days BETWEEN 1 AND 180),origin TEXT NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE review_grants(store_id TEXT NOT NULL,id TEXT NOT NULL,order_id TEXT NOT NULL,token_hash TEXT NOT NULL,expires_at INTEGER NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(store_id,id),UNIQUE(store_id,token_hash),FOREIGN KEY(store_id,order_id) REFERENCES orders(store_id,id));
CREATE TABLE review_optouts(store_id TEXT NOT NULL,order_id TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(store_id,order_id),FOREIGN KEY(store_id,order_id) REFERENCES orders(store_id,id));
CREATE TABLE product_reviews(store_id TEXT NOT NULL,id TEXT NOT NULL,sku TEXT NOT NULL,order_id TEXT,author_name TEXT NOT NULL,rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),title TEXT NOT NULL,body TEXT NOT NULL,review_date TEXT NOT NULL,source TEXT NOT NULL,source_id TEXT NOT NULL,fingerprint TEXT NOT NULL,verified INTEGER NOT NULL DEFAULT 0,state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','published','hidden','deleted')),version INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,PRIMARY KEY(store_id,id),UNIQUE(store_id,source,source_id),UNIQUE(store_id,fingerprint),UNIQUE(store_id,order_id,sku),FOREIGN KEY(store_id,sku) REFERENCES products(store_id,sku),FOREIGN KEY(store_id,order_id) REFERENCES orders(store_id,id));
CREATE INDEX reviews_public ON product_reviews(store_id,sku,state,review_date);
CREATE TABLE review_photos(store_id TEXT NOT NULL,id TEXT NOT NULL,grant_id TEXT NOT NULL,review_id TEXT,storage_key TEXT NOT NULL,sha256 TEXT NOT NULL,width INTEGER NOT NULL,height INTEGER NOT NULL,byte_length INTEGER NOT NULL,created_at INTEGER NOT NULL,hidden INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(store_id,id),FOREIGN KEY(store_id,grant_id) REFERENCES review_grants(store_id,id),FOREIGN KEY(store_id,review_id) REFERENCES product_reviews(store_id,id));
CREATE TRIGGER review_photo_limit BEFORE INSERT ON review_photos BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM review_photos WHERE store_id=NEW.store_id AND grant_id=NEW.grant_id)>=10 THEN RAISE(ABORT,'review_photo_limit') END;
END;
CREATE TABLE review_moderations(store_id TEXT NOT NULL,id TEXT NOT NULL,review_id TEXT NOT NULL,state TEXT NOT NULL,reason TEXT NOT NULL,actor TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(store_id,id),FOREIGN KEY(store_id,review_id) REFERENCES product_reviews(store_id,id));
