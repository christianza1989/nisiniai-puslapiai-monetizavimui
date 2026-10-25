import test from 'node:test';
import assert from 'node:assert/strict';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { CommerceService } from '../src/service.mjs';
import { Discounts } from '../src/discounts.mjs';
import { applyMigrations } from '../src/migrations.mjs';
import { productionMigrationSources } from '../src/node-production-d1.mjs';
import { fixtureStore, fixtureProducts, cart, key } from './fixtures.mjs';
test('native D1 migration and atomic discount cap roll back competing order stock, then survive service restart', async () => {
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          name: 'isolated-discounts',
          modules: true,
          compatibilityDate: '2026-10-11',
          script: 'export default {fetch(){return new Response("isolated discount fixture")}}',
          d1Databases: { COMMERCE_DB: '00000000-0000-0000-0000-000000000027' },
          outboundService: () => {
            throw Error('No external provider in discount fixture');
          },
        },
      ],
    }),
  );
  try {
    const db = await mf.getD1Database('COMMERCE_DB');
    await applyMigrations(db, await productionMigrationSources());
    const s = new CommerceService(db),
      d = new Discounts(s);
    await s.provisionStore(fixtureStore(), fixtureProducts(5));
    const p = {
      id: crypto.randomUUID(),
      commandId: crypto.randomUUID(),
      expectedVersion: 0,
      code: 'NATIVE10',
      kind: 'fixed',
      value: 1000,
      enabled: true,
      maxUses: 1,
    };
    await d.save('store_a', 'sandbox', p, 'owner');
    const results = await Promise.allSettled(
      [1, 2].map((n) =>
        s.createOrder('store_a', 'sandbox', { ...cart(), discountCode: p.code }, key(n)),
      ),
    );
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(results.filter((r) => r.status === 'rejected').length, 1);
    const stored = new CommerceService(await mf.getD1Database('COMMERCE_DB')),
      rows = await stored.rows('SELECT * FROM orders WHERE store_id=?', 'store_a');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].amount, 2200);
    assert.equal((await new Discounts(stored).list('store_a', 'sandbox'))[0].uses, 1);
    assert.equal(
      (
        await stored.one(
          'SELECT available FROM inventory WHERE store_id=? AND sku=?',
          'store_a',
          'couple',
        )
      ).available,
      4,
    );
    assert.equal((await stored.one('SELECT COUNT(*) n FROM order_discounts')).n, 1);
    assert.equal((await stored.one('SELECT COUNT(*) n FROM commerce_migrations')).n, 27);
  } finally {
    await mf.dispose();
  }
});
