import { requireValue, identifier } from './validation.mjs';
import { hashBytes } from './private-storage.mjs';

export function webpDimensions(bytes) {
  requireValue(
    bytes instanceof Uint8Array && bytes.length >= 30 && bytes.length <= 2 * 1024 * 1024,
    'invalid_catalog_image',
  );
  const name = (at) => String.fromCharCode(...bytes.slice(at, at + 4));
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  requireValue(
    name(0) === 'RIFF' && name(8) === 'WEBP' && dv.getUint32(4, true) + 8 === bytes.length,
    'invalid_catalog_image',
  );
  let width, height;
  if (name(12) === 'VP8X') {
    requireValue(!(bytes[20] & 2), 'animated_catalog_image');
    width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
    height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
  } else if (name(12) === 'VP8L' && bytes[20] === 0x2f) {
    const bits = dv.getUint32(21, true);
    width = (bits & 0x3fff) + 1;
    height = ((bits >>> 14) & 0x3fff) + 1;
  } else if (name(12) === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 1 && bytes[25] === 0x2a) {
    width = dv.getUint16(26, true) & 0x3fff;
    height = dv.getUint16(28, true) & 0x3fff;
  }
  requireValue(
    width >= 1 && height >= 1 && width <= 3000 && height <= 3000,
    'invalid_catalog_image',
  );
  return { width, height };
}
export class CatalogMedia {
  constructor(service, storage) {
    this.s = service;
    this.storage = storage;
  }
  async put(store, env, bytes, actor) {
    await this.s.store(store, env);
    requireValue(identifier(actor), 'operator_identity_required', 403);
    requireValue(this.storage, 'private_storage_missing', 503);
    const size = webpDimensions(bytes),
      hash = await hashBytes(bytes),
      id = 'img_' + hash;
    const key = `${store}/catalog/${id}.webp`;
    await this.storage.put(key, bytes, hash, 'image/webp');
    await this.s
      .stmt(
        'INSERT OR IGNORE INTO catalog_media VALUES(?,?,?,?,?,?,?,?,?)',
        store,
        id,
        key,
        hash,
        size.width,
        size.height,
        bytes.length,
        actor,
        this.s.now(),
      )
      .run();
    return { id, src: '/prekyba/catalog-media/' + id, ...size };
  }
  async get(store, env, id, publishedOnly = true) {
    await this.s.store(store, env);
    requireValue(identifier(id), 'catalog_image_missing', 404);
    const row = await this.s.one(
      'SELECT * FROM catalog_media WHERE store_id=? AND id=?',
      store,
      id,
    );
    requireValue(row && this.storage, 'catalog_image_missing', 404);
    if (publishedOnly) {
      const catalog = await this.s.catalog(store, env);
      requireValue(
        catalog.some((p) =>
          p.content?.images.some((m) => m.id === id && m.src === '/prekyba/catalog-media/' + id),
        ),
        'catalog_image_missing',
        404,
      );
    }
    const bytes = await this.storage.get(row.storage_key);
    requireValue((await hashBytes(bytes)) === row.sha256, 'invalid_catalog_image', 502);
    return bytes;
  }
}
