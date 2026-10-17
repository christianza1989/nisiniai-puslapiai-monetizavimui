import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { CatalogOperations } from '../src/catalog.mjs';
import { fixtureStore, fixtureProducts, cart, key } from './fixtures.mjs';
async function setup() {
  const db = new NodeDatabase();
  db.migrate();
  const s = new CommerceService(db);
  await s.provisionStore(fixtureStore(), fixtureProducts());
  return { db, s, catalog: new CatalogOperations(s) };
}
test('catalog revisions use CAS/replay, leave inventory/history intact and keep old order prices immutable', async () => {
  const x = await setup();
  const order = (await x.s.createOrder('store_a', 'sandbox', cart(), key(1))).order;
  const original = (await x.catalog.list('store_a', 'sandbox')).find((p) => p.sku === 'couple');
  const definition = { ...original, enabled: true, prices: { LT: 3500, PL: 13900 } };
  const input = { id: 'revision', basisHash: original.basisHash, definition };
  const concurrent = await Promise.all(
    [1, 2].map(() => x.catalog.revise('store_a', 'sandbox', input, 'operator')),
  );
  assert.equal(concurrent.filter((r) => !r.replayed).length, 1);
  assert.equal((await x.s.quote('store_a', 'sandbox', cart())).amount, 3500);
  assert.equal((await x.s.getOrder('store_a', 'sandbox', order.id)).amount, 3200);
  assert.equal(
    (await x.s.catalog('store_a', 'sandbox')).find((p) => p.sku === 'couple').available,
    4,
  );
  await assert.rejects(
    x.catalog.revise('store_a', 'sandbox', { ...input, id: 'stale' }, 'operator'),
    /catalog_revision_conflict/,
  );
  await assert.rejects(
    x.s.stmt('UPDATE catalog_revisions SET actor_ref=?', 'other').run(),
    /catalog_revision_immutable/,
  );
  x.db.close();
});
test('unmeasured extras can be recorded privately but cannot sell; enabled extras require a kit and server prices', async () => {
  const x = await setup(),
    definition = {
      sku: 'wooden_base',
      title: 'Medinis pagrindas',
      enabled: false,
      prices: { LT: 1000 },
      package: null,
      addonFor: ['couple', 'family'],
    };
  await x.catalog.revise('store_a', 'sandbox', { id: 'draft', definition }, 'operator');
  await assert.rejects(x.s.quote('store_a', 'sandbox', cart('wooden_base')), /product_unavailable/);
  const draft = (await x.catalog.list('store_a', 'sandbox')).find((p) => p.sku === 'wooden_base');
  await x.catalog.revise(
    'store_a',
    'sandbox',
    {
      id: 'measured_fixture',
      basisHash: draft.basisHash,
      definition: {
        ...definition,
        enabled: true,
        package: { weightGrams: 300, dimensionsMm: [200, 200, 50] },
      },
    },
    'operator',
  );
  await assert.rejects(x.s.quote('store_a', 'sandbox', cart('wooden_base')), /addon_requires_kit/);
  const quote = await x.s.quote('store_a', 'sandbox', {
    ...cart(),
    lines: [
      { sku: 'couple', quantity: 1 },
      { sku: 'wooden_base', quantity: 1 },
    ],
  });
  assert.equal(quote.amount, 4200);
  assert.equal(
    (await x.s.catalog('store_a', 'sandbox')).find((p) => p.sku === 'wooden_base').available,
    0,
  );
  x.db.close();
});
