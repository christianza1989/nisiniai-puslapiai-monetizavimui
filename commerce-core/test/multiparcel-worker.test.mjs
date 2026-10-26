import test from 'node:test';
import assert from 'node:assert/strict';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { productionMigrationSources } from '../src/node-production-d1.mjs';
import { applyMigrations } from '../src/migrations.mjs';
import { CommerceService } from '../src/service.mjs';
import { ShippingOperations } from '../src/shipping.mjs';
import { fixtureStore, fixtureProducts, key, cart, fakeCheckout, payment } from './fixtures.mjs';
import { proveParcelSlots } from './multiparcel-fixtures.mjs';
test('native D1 additive29 preserves a historical command and enforces durable per-parcel registration and label collection', async () => {
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          name: 'isolated-parcels',
          modules: true,
          compatibilityDate: '2026-10-11',
          script: 'export default {fetch(){return new Response("fixture")}}',
          d1Databases: { COMMERCE_DB: '00000000-0000-0000-0000-000000000029' },
          outboundService: () => {
            throw Error('No external provider');
          },
        },
      ],
    }),
  );
  try {
    const db = await mf.getD1Database('COMMERCE_DB'),
      sources = await productionMigrationSources();
    await applyMigrations(db, sources.slice(0, 28));
    const s = new CommerceService(db);
    await s.provisionStore(
      { ...fixtureStore('store_legacy'), requireCustomer: true },
      fixtureProducts(),
    );
    const order = (
      await s.createOrder(
        'store_legacy',
        'sandbox',
        {
          ...cart(),
          customer: {
            name: 'TEST legacy buyer',
            email: 'legacy@example.test',
            phone: '+37060000000',
            address: { country: 'LT', city: 'Vilnius', postalCode: '02211', line1: 'Test g. 1' },
          },
        },
        key(10),
      )
    ).order;
    await s.checkout('store_legacy', 'sandbox', order.id, fakeCheckout);
    await s.acceptPayment(
      'store_legacy',
      'sandbox',
      payment(await s.getOrder('store_legacy', 'sandbox', order.id), 'store_legacy'),
    );
    const ops = new ShippingOperations(s);
    await ops.origin(
      'store_legacy',
      'sandbox',
      {
        id: 'legacy_origin',
        country: 'LT',
        city: 'Vilnius',
        postalCode: '02211',
        isCompany: true,
        reason: 'TEST legacy fixture',
      },
      'operator',
    );
    await ops.prepare(
      'store_legacy',
      'sandbox',
      order.id,
      {
        id: 'legacy_plan',
        originId: 'legacy_origin',
        mode: 'individual',
        recipientIsCompany: false,
      },
      'operator',
    );
    await db
      .prepare(
        'INSERT INTO shipment_commands(store_id,id,order_id,plan_id,account_ref,environment,provider,payload_hash,payload_json,actor_ref,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
      )
      .bind(
        'store_legacy',
        'legacy_command',
        order.id,
        'legacy_plan',
        'fixture_account',
        'sandbox',
        'fixture',
        'legacy_hash',
        '{"historical":true}',
        'operator',
        1,
      )
      .run();
    const before = await s.one('SELECT * FROM shipment_commands WHERE id=?', 'legacy_command');
    await applyMigrations(db, sources);
    const after = await s.one('SELECT * FROM shipment_commands WHERE id=?', 'legacy_command');
    const { parcel_index, parcel_count, ...retained } = after;
    assert.deepEqual(retained, before);
    assert.equal(parcel_index, -1);
    assert.equal(parcel_count, 1);
    await proveParcelSlots(db);
    assert.equal((await s.one('SELECT count(*) n FROM commerce_migrations')).n, 31);
  } finally {
    await mf.dispose();
  }
});
