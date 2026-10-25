import { requireValue, identifier, integer } from './validation.mjs';
export async function hashBytes(bytes) {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export async function limitedBytes(stream, limit = 2 * 1024 * 1024) {
  const reader = stream?.getReader();
  requireValue(reader, 'file_body_missing');
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      requireValue(length <= limit, 'file_too_large', 413);
      chunks.push(part.value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of chunks) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}
export class R2PrivateStorage {
  constructor(bucket) {
    requireValue(bucket?.put && bucket?.get, 'private_storage_missing', 503);
    this.bucket = bucket;
  }
  async put(key, bytes, hash, contentType) {
    const result = await this.bucket.put(key, bytes, {
      onlyIf: { etagDoesNotMatch: '*' },
      httpMetadata: { contentType },
      customMetadata: { sha256: hash },
    });
    if (!result) {
      const old = await this.get(key);
      requireValue((await hashBytes(old)) === hash, 'private_file_conflict', 409);
    }
  }
  async get(key) {
    const object = await this.bucket.get(key);
    requireValue(object, 'private_file_missing', 404);
    requireValue(integer(object.size, 1, 2 * 1024 * 1024), 'private_file_invalid', 502);
    return limitedBytes(object.body);
  }
}

export class PrivateFiles {
  constructor(service, storage) {
    this.s = service;
    this.storage = storage;
  }
  async put(
    store,
    environment,
    orderId,
    { id, bytes, filename, kind = 'operator_attachment', sourceId = null },
    actor,
  ) {
    await this.s.getOrder(store, environment, orderId);
    requireValue(
      identifier(id) &&
        identifier(actor) &&
        bytes instanceof Uint8Array &&
        integer(bytes.byteLength, 1, 2 * 1024 * 1024) &&
        typeof filename === 'string' &&
        /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,98}\.pdf$/.test(filename) &&
        [
          'operator_attachment',
          'shipment_document',
          'sale_document',
          'credit_document',
          'packing_document',
        ].includes(kind) &&
        (sourceId === null || identifier(sourceId)),
      'invalid_private_file',
    );
    requireValue(new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-', 'invalid_private_file');
    requireValue(this.storage, 'private_storage_missing', 503);
    const hash = await hashBytes(bytes),
      key = `${store}/private/${id}/${hash}.pdf`;
    const prior = await this.s.one(
      'SELECT * FROM private_files WHERE store_id=? AND id=?',
      store,
      id,
    );
    const matches = (row) => {
      requireValue(
        row.order_id === orderId &&
          row.content_hash === hash &&
          row.filename === filename &&
          row.kind === kind &&
          row.source_id === sourceId,
        'private_file_conflict',
        409,
      );
      return { file: row, replayed: true };
    };
    if (prior) return matches(prior);
    await this.storage.put(key, bytes, hash, 'application/pdf');
    try {
      await this.s.db.batch([
        this.s.stmt(
          'INSERT INTO private_files(store_id,id,order_id,kind,source_id,filename,storage_key,content_hash,byte_length,actor_ref,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
          store,
          id,
          orderId,
          kind,
          sourceId,
          filename,
          key,
          hash,
          bytes.byteLength,
          actor,
          this.s.now(),
        ),
        ...this.s.event(store, 'PrivateFileStored', id, { orderId, actorRef: actor }),
      ]);
    } catch (error) {
      const concurrent = await this.s.one(
        'SELECT * FROM private_files WHERE store_id=? AND id=?',
        store,
        id,
      );
      if (concurrent) return matches(concurrent);
      throw error;
    }
    return {
      file: await this.s.one('SELECT * FROM private_files WHERE store_id=? AND id=?', store, id),
      replayed: false,
    };
  }
  async list(store, environment, orderId) {
    await this.s.getOrder(store, environment, orderId);
    return this.s.rows(
      'SELECT id,order_id,kind,source_id,filename,content_hash,byte_length,actor_ref,created_at FROM private_files WHERE store_id=? AND order_id=? ORDER BY created_at,id LIMIT 100',
      store,
      orderId,
    );
  }
  async get(store, environment, id) {
    await this.s.store(store, environment);
    const file = await this.s.one(
      'SELECT * FROM private_files WHERE store_id=? AND id=?',
      store,
      id,
    );
    requireValue(file, 'private_file_missing', 404);
    requireValue(this.storage, 'private_storage_missing', 503);
    const bytes = await this.storage.get(file.storage_key);
    requireValue(
      bytes.byteLength === file.byte_length && (await hashBytes(bytes)) === file.content_hash,
      'private_file_integrity_failed',
      502,
    );
    return { file, bytes };
  }
}
