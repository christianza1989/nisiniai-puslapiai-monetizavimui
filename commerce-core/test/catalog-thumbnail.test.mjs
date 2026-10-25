import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NodeDatabase } from '../src/node-db.mjs';
import { NodePrivateStorage } from '../src/node-private-storage.mjs';
import { CommerceService } from '../src/service.mjs';
import { CatalogMedia } from '../src/catalog-media.mjs';
import { CatalogOperations } from '../src/catalog.mjs';
import { createHandler } from '../src/http.mjs';
import { fixtureStore, fixtureProducts } from './fixtures.mjs';
// Real encoded synthetic rasters (320x400 and192x240), no external service.
const original = new Uint8Array(
  Buffer.from(
    'UklGRlABAABXRUJQVlA4WAoAAAAQAAAAPwEAjwEAQUxQSBQAAAABB1DziAgAKNL//xTR/9T//vd/oFZQOCAWAQAAEB4AnQEqQAGQAT5tNplJpCMioSAoAIANiWlu4XdhG0AJ7APfbJyHvtlAy8XJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIbwAP7/402/0HxNTD+/ozyAAAAAAAAAAAAAAAAAAAA=',
    'base64',
  ),
);
const thumbnail = new Uint8Array(
  Buffer.from(
    'UklGRrwAAABXRUJQVlA4WAoAAAAQAAAAvwAA7wAAQUxQSBIAAAABB1DziAgISBL//48i+p/2vz9WUDgghAAAAPAMAJ0BKsAA8AA+bTaZSaQjIqEgKACADYlpbuF2sRtACewD32yc4iLk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtWAAA/v/Gm3+g+JqYf3+8zgAAAAAAAA==',
    'base64',
  ),
);
test('catalog thumbnail inherits original publication, revocation and store isolation; HTTP requires catalog actor', async () => {
  const root = await mkdtemp(join(tmpdir(), 'commerce-thumbnail-')),
    db = new NodeDatabase(join(root, 'test.sqlite'));
  db.migrate();
  try {
    const s = new CommerceService(db),
      storage = new NodePrivateStorage(join(root, 'files')),
      media = new CatalogMedia(s, storage),
      editor = new CatalogOperations(s);
    await s.provisionStore(fixtureStore(), fixtureProducts());
    await s.provisionStore(fixtureStore('store_b'), fixtureProducts());
    const m = await media.put('store_a', 'sandbox', original, 'owner');
    assert.deepEqual(
      await media.get('store_a', 'sandbox', m.id, false, { thumbnail: true }),
      original,
      'legacy fallback',
    );
    await assert.rejects(
      media.putThumbnail('store_b', 'sandbox', m.id, thumbnail, 'owner'),
      /catalog_image_missing/,
    );
    await assert.rejects(
      media.putThumbnail('store_a', 'sandbox', m.id, original, 'owner'),
      /invalid_catalog_thumbnail/,
    );
    const handler = createHandler({
      service: s,
      environment: 'sandbox',
      privateStorage: storage,
      operatorAuthorize: async (request) =>
        request.headers.get('x-test-role') === 'owner'
          ? { id: 'owner', storeId: 'store_a', permissions: ['read', 'catalog'] }
          : false,
    });
    const request = (path, init = {}) =>
      handler(new Request('https://store-a.example' + path, init));
    const upload = '/api/operator/catalog-media/' + m.id + '/thumbnail';
    assert.equal(
      (
        await request(upload, {
          method: 'POST',
          headers: { 'content-type': 'image/webp' },
          body: thumbnail,
        })
      ).status,
      403,
    );
    const response = await request(upload, {
      method: 'POST',
      headers: { 'content-type': 'image/webp', 'x-test-role': 'owner' },
      body: thumbnail,
    });
    assert.equal(response.status, 200);
    assert.equal(
      (await media.putThumbnail('store_a', 'sandbox', m.id, thumbnail, 'owner')).id,
      m.id + '_t192',
      'idempotent',
    );
    assert.deepEqual(
      await media.get('store_a', 'sandbox', m.id, false, { thumbnail: true }),
      thumbnail,
    );
    assert.equal(
      (await request('/api/catalog-media/' + m.id + '?size=192')).status,
      404,
      'draft thumbnail hidden',
    );
    const p = (await editor.list('store_a', 'sandbox')).find((p) => p.sku === 'couple');
    const definition = {
      ...p,
      enabled: true,
      content: {
        summary: 'Tikras bandomasis rinkinys.',
        images: [{ ...m, alt: 'Sintetinis testinis rastras' }],
      },
    };
    await editor.revise(
      'store_a',
      'sandbox',
      { id: 'publish-thumb', definition, basisHash: p.basisHash },
      'owner',
    );
    const read = await request('/api/catalog-media/' + m.id + '?size=192');
    assert.equal(read.status, 200);
    assert.deepEqual(new Uint8Array(await read.arrayBuffer()), thumbnail);
    assert.ok(thumbnail.length < original.length);
    assert.deepEqual(
      new Uint8Array(await (await request('/api/catalog-media/' + m.id)).arrayBuffer()),
      original,
      'original unchanged',
    );
    assert.equal(
      (await request('/api/catalog-media/' + m.id + '_t192')).status,
      404,
      'derivative ID not a published image',
    );
    assert.equal(
      (await request('/api/catalog-media/' + m.id + '?size=3000')).status,
      400,
      'only bounded size',
    );
    const current = (await editor.list('store_a', 'sandbox')).find((p) => p.sku === 'couple');
    await editor.revise(
      'store_a',
      'sandbox',
      {
        id: 'revoke-thumb',
        definition: { ...current, content: { summary: 'Be nuotraukos.', images: [] } },
        basisHash: current.basisHash,
      },
      'owner',
    );
    assert.equal(
      (await request('/api/catalog-media/' + m.id + '?size=192')).status,
      404,
      'revocation applies to thumbnail',
    );
  } finally {
    db.close();
    assert.ok(root.startsWith(join(tmpdir(), 'commerce-thumbnail-')));
    await rm(root, { recursive: true });
  }
});
