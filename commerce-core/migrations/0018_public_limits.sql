CREATE TABLE public_request_limits (
 store_id TEXT NOT NULL, scope_hash TEXT NOT NULL, window_start INTEGER NOT NULL, count INTEGER NOT NULL,
 PRIMARY KEY(store_id,scope_hash,window_start), FOREIGN KEY(store_id) REFERENCES stores(id)
);
