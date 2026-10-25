import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { NodeDatabase } from '../src/node-db.mjs';
import { NodePrivateStorage } from '../src/node-private-storage.mjs';
import { CommerceService } from '../src/service.mjs';
import { CatalogOperations } from '../src/catalog.mjs';
import { CatalogMedia, webpDimensions } from '../src/catalog-media.mjs';
import { createHandler } from '../src/http.mjs';
import { fixtureStore, fixtureProducts } from './fixtures.mjs';
const image = new Uint8Array(
  Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64'),
);
test('catalog media and draft persist through restart, remain private before publication and isolate stores', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'commerce-editor-'));
  let db = new NodeDatabase(join(directory, 'editor.sqlite'));
  db.migrate();
  let s = new CommerceService(db);
  await s.provisionStore(fixtureStore(), fixtureProducts());
  await s.provisionStore(fixtureStore('store_b'), fixtureProducts());
  const storage = new NodePrivateStorage(join(directory, 'files'));
  try {
    let media = new CatalogMedia(s, storage),
      editor = new CatalogOperations(s);
    const m = await media.put('store_a', 'sandbox', image, 'owner');
    assert.equal(m.width, 1);
    assert.equal((await media.put('store_a', 'sandbox', image, 'owner')).id, m.id);
    await assert.rejects(media.get('store_a', 'sandbox', m.id), /catalog_image_missing/);
    await assert.rejects(media.get('store_b', 'sandbox', m.id, false), /catalog_image_missing/);
    const p = (await editor.list('store_a', 'sandbox')).find((p) => p.sku === 'couple');
    const definition = {
      ...p,
      enabled: true,
      content: {
        description: 'Originalus aprašymas.\n\nAntra pastraipa.',
        summary: 'Trumpas aprašymas.',
        images: [{ ...m, alt: 'Baltas rankų liejinys' }],
      },
    };
    const draft = await editor.saveDraft(
      'store_a',
      'sandbox',
      { definition, basisHash: p.basisHash },
      'owner',
    );
    db.close();
    db = new NodeDatabase(join(directory, 'editor.sqlite'));
    db.migrate();
    s = new CommerceService(db);
    editor = new CatalogOperations(s);
    media = new CatalogMedia(s, storage);
    assert.equal((await editor.draft('store_a', 'sandbox', 'couple')).draftHash, draft.draftHash);
    const handler = createHandler({
      service: s,
      environment: 'sandbox',
      privateStorage: storage,
      operatorAuthorize: async (request, store, action) =>
        request.headers.get('x-test-role') === 'owner'
          ? { id: 'owner', storeId: store.id, permissions: ['read', 'catalog'] }
          : false,
    });
    const request = (path, init = {}) =>
      handler(new Request('https://store-a.example' + path, init));
    assert.equal((await request('/api/operator/catalog-drafts/couple')).status, 403);
    assert.equal((await request('/api/operator/catalog-media/' + m.id)).status, 403);
    assert.equal(
      (
        await request('/api/operator/catalog-media/' + m.id, {
          headers: { 'x-test-role': 'owner' },
        })
      ).status,
      200,
    );
    assert.equal((await request('/api/catalog-media/' + m.id)).status, 404);
    await editor.revise(
      'store_a',
      'sandbox',
      { id: 'publish', definition, basisHash: p.basisHash, draftHash: draft.draftHash },
      'owner',
    );
    const response = await request('/api/catalog-media/' + m.id);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/webp');
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), image);
    assert.equal(await editor.draft('store_a', 'sandbox', 'couple'), null);
    assert.throws(
      () => webpDimensions(new TextEncoder().encode('<svg onload="alert(1)"></svg>')),
      /invalid_catalog_image/,
    );
    const foreign = (await editor.list('store_b', 'sandbox')).find((p) => p.sku === 'couple');
    await assert.rejects(
      editor.saveDraft(
        'store_b',
        'sandbox',
        { definition: { ...definition, sku: 'couple' }, basisHash: foreign.basisHash },
        'owner',
      ),
      /invalid_product_images/,
    );
  } finally {
    db.close();
    assert.ok(
      resolve(directory).startsWith(resolve(tmpdir()) + '\\commerce-editor-') ||
        resolve(directory).startsWith(resolve(tmpdir()) + '/commerce-editor-'),
    );
    await rm(directory, { recursive: true });
  }
});
