import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { CommerceJobs } from '../src/jobs.mjs';
import { fixtureStore, fixtureProducts, cart, key, fakeCheckout, payment } from './fixtures.mjs';
async function setup() {
  let now = Date.now();
  const db = new NodeDatabase();
  db.migrate();
  const s = new CommerceService(db, { now: () => now });
  await s.provisionStore({ ...fixtureStore(), requireCustomer: true }, fixtureProducts());
  const { order } = await s.createOrder(
    'store_a',
    'sandbox',
    {
      ...cart(),
      customer: {
        name: 'Test User',
        email: 'buyer@example.test',
        phone: '+37060000000',
        address: { country: 'LT', line1: 'Testinė g. 1', city: 'Vilnius', postalCode: '01101' },
      },
    },
    key(1),
  );
  const blobs = new Map();
  return {
    db,
    s,
    order,
    tick: (ms) => {
      now += ms;
    },
    options: {
      privateStorage: {
        put: async (k, b) => {
          blobs.set(k, b);
        },
        get: async (k) => blobs.get(k),
      },
      loadDocumentFont: async () =>
        new Uint8Array(
          readFileSync(new URL('../public/fonts/NotoSans-Regular.ttf', import.meta.url)),
        ),
    },
    blobs,
  };
}
test('jobs create one immutable sale/credit PDF and event notification across replay and retries', async () => {
  const x = await setup();
  await x.s.checkout('store_a', 'sandbox', x.order.id, fakeCheckout);
  await x.s.acceptPayment(
    'store_a',
    'sandbox',
    payment(await x.s.getOrder('store_a', 'sandbox', x.order.id)),
  );
  const jobs = new CommerceJobs(x.s, x.options);
  await jobs.scheduled('store_a', 'sandbox');
  await jobs.scheduled('store_a', 'sandbox');
  assert.equal((await x.s.one("SELECT COUNT(*) n FROM documents WHERE kind='sale'")).n, 1);
  assert.equal(x.blobs.size, 1);
  await x.s.confirmRefund('store_a', 'sandbox', x.order.id, {
    providerId: 're_fixture',
    currency: 'EUR',
    amount: 500,
  });
  await jobs.scheduled('store_a', 'sandbox');
  await jobs.scheduled('store_a', 'sandbox');
  assert.equal((await x.s.one("SELECT COUNT(*) n FROM documents WHERE kind='credit'")).n, 1);
  assert.equal(x.blobs.size, 2);
  assert.equal((await x.s.one('SELECT COUNT(*) n FROM customer_notifications')).n, 3);
  assert.ok(
    (await jobs.overview('store_a', 'sandbox')).notifications.every((n) => n.state === 'prepared'),
  );
  x.db.close();
});
test('outbox backoff/dead queue suppresses runaway retry and operator retry preserves event identity', async () => {
  const x = await setup();
  let calls = 0;
  const jobs = new CommerceJobs(x.s, {
    handlers: {
      OrderPlaced: async () => {
        calls++;
        throw new Error('fixture failure');
      },
    },
  });
  for (let i = 0; i < 5; i++) {
    await jobs.dispatch('store_a', 'sandbox');
    assert.equal(calls, i + 1);
    await jobs.dispatch('store_a', 'sandbox');
    assert.equal(calls, i + 1);
    x.tick(3600001);
  }
  const dead = (await jobs.overview('store_a', 'sandbox')).outbox.find(
    (e) => e.kind === 'OrderPlaced',
  );
  assert.equal(dead.deliveryState, 'dead');
  await jobs.dispatch('store_a', 'sandbox');
  assert.equal(calls, 5);
  await jobs.retry('store_a', 'sandbox', dead.id, 'operator');
  jobs.options.handlers.OrderPlaced = async () => {
    calls++;
  };
  await jobs.dispatch('store_a', 'sandbox');
  assert.equal(calls, 6);
  assert.equal((await x.s.one('SELECT state FROM outbox WHERE id=?', dead.id)).state, 'done');
  x.db.close();
});
test('expired consumer cannot acknowledge or dead-letter a successor lease', async () => {
  const x = await setup();
  let release;
  const barrier = new Promise((resolve) => {
    release = resolve;
  });
  const stale = new CommerceJobs(x.s, { handlers: { OrderPlaced: async () => barrier } });
  const run = stale.dispatch('store_a', 'sandbox');
  await new Promise((resolve) => setTimeout(resolve, 10));
  x.tick(60001);
  const claimed = await x.s.claimOutbox('store_a', 'sandbox');
  assert.equal(claimed.length, 1);
  release();
  await run;
  const row = await x.s.one('SELECT * FROM outbox WHERE id=?', claimed[0].id);
  assert.equal(row.lease_token, claimed[0].lease_token);
  assert.equal(row.state, 'leased');
  assert.equal(await x.s.one('SELECT * FROM outbox_delivery'), null);
  await x.s.completeOutbox('store_a', 'sandbox', row.id, row.lease_token);
  x.db.close();
});
