CREATE TABLE review_import_photos(store_id TEXT NOT NULL,id TEXT NOT NULL,review_id TEXT NOT NULL,source_key TEXT NOT NULL,storage_key TEXT NOT NULL,sha256 TEXT NOT NULL,width INTEGER NOT NULL,height INTEGER NOT NULL,byte_length INTEGER NOT NULL,created_at INTEGER NOT NULL,hidden INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(store_id,id),UNIQUE(store_id,review_id,source_key),UNIQUE(store_id,review_id,sha256),FOREIGN KEY(store_id,review_id) REFERENCES product_reviews(store_id,id));
CREATE VIEW review_media AS SELECT store_id,id,review_id,storage_key,sha256,width,height,byte_length,created_at,hidden FROM review_photos UNION ALL SELECT store_id,id,review_id,storage_key,sha256,width,height,byte_length,created_at,hidden FROM review_import_photos;
CREATE TRIGGER review_import_photo_limit BEFORE INSERT ON review_import_photos BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM review_media WHERE store_id=NEW.store_id AND review_id=NEW.review_id)>=10 THEN RAISE(ABORT,'review_photo_limit') END;
END;
