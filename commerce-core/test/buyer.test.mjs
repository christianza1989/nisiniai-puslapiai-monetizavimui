import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { createHandler } from '../src/http.mjs';
import { CommerceClient } from '../public/commerce-client.mjs';
import { fixtureStore, fixtureProducts, cart } from './fixtures.mjs';
test('delivery request deadline includes the carrier pacing and provider budget without extending order writes', async (t) => {
  const deadlines = [];
  t.mock.method(AbortSignal, 'timeout', (ms) => {
    deadlines.push(ms);
    return new AbortController().signal;
  });
  const client = new CommerceClient({ storage: {}, fetchImpl: async () => Response.json({}) });
  await client.deliveryQuote({ country: 'LT' });
  await client.request('/api/orders', { body: {} });
  assert.deepEqual(deadlines, [35000, 20000]);
});
const tabStorage = () => {
  const values = new Map();
  return {
    getItem: (k) => values.get(k) || null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
    values,
  };
};
async function setup() {
  const db = new NodeDatabase();
  db.migrate();
  const service = new CommerceService(db);
  await service.provisionStore({ ...fixtureStore(), requireCustomer: true }, fixtureProducts());
  const handler = createHandler({ service, environment: 'sandbox' });
  let lose = false;
  const fetchImpl = async (url, options) => {
    const result = await handler(new Request('https://store-a.example' + url, options));
    if (url === '/api/orders' && lose) {
      lose = false;
      throw new Error('lost response');
    }
    return result;
  };
  const storage = tabStorage(),
    client = new CommerceClient({ fetchImpl, storage });
  await client.initialize();
  return {
    db,
    service,
    client,
    storage,
    fetchImpl,
    loseResponse: () => {
      lose = true;
    },
  };
}
const input = () => ({
  ...cart(),
  customer: {
    name: 'Test Pirkėjas',
    email: 'buyer@example.test',
    phone: '+37060000000',
    address: { country: 'LT', line1: 'Testinė g. 1', city: 'Vilnius', postalCode: '01101' },
  },
});
test('buyer lost create response survives reload and replays a single reservation without PII after recovery', async () => {
  const x = await setup();
  x.loseResponse();
  await assert.rejects(x.client.create(input()), /network/);
  assert.equal((await x.service.one('SELECT COUNT(*) count FROM orders')).count, 1);
  const key = x.client.attempt.requestKey,
    token = x.client.attempt.token;
  const reloaded = new CommerceClient({ fetchImpl: x.fetchImpl, storage: x.storage });
  await reloaded.initialize();
  const order = await reloaded.resume();
  assert.equal(reloaded.attempt.requestKey, key);
  assert.equal(reloaded.attempt.token, token);
  assert.equal((await x.service.one('SELECT COUNT(*) count FROM orders')).count, 1);
  assert.equal(order.snapshot.customer.name, 'Test Pirkėjas');
  assert.equal([...x.storage.values.values()][0].includes('buyer@example.test'), false);
  await assert.rejects(
    reloaded.create({ ...input(), lines: [{ sku: 'family', quantity: 1 }] }),
    /checkout_attempt_exists/,
  );
  assert.equal((await reloaded.receipt()).paymentState, 'pending');
  await reloaded.withdrawal();
  await reloaded.withdrawal();
  assert.equal((await x.service.one('SELECT COUNT(*) count FROM withdrawals')).count, 1);
  await assert.rejects(reloaded.checkout(), /stripe_not_connected/);
  x.db.close();
});
test('buyer refuses writes when context is closed or persistent retry storage fails', async () => {
  const x = await setup();
  x.client.context.canCreateTestOrder = false;
  await assert.rejects(x.client.create(input()), /checkout_not_admitted/);
  x.client.context.canCreateTestOrder = true;
  x.client.storage.setItem = () => {};
  await assert.rejects(x.client.create(input()), /checkout_storage_unavailable/);
  assert.equal((await x.service.one('SELECT COUNT(*) count FROM orders')).count, 0);
  x.db.close();
});
test('definitive validation rejection unlocks the form while unknown outcomes retain the replay identity', async () => {
  const x = await setup();
  const bad = input();
  bad.customer.phone = 'wrong';
  await assert.rejects(x.client.create(bad), /invalid_customer_phone/);
  assert.equal(x.client.attempt, undefined);
  assert.equal(x.storage.values.size, 0);
  const order = await x.client.create(input());
  assert.ok(order.id);
  assert.equal((await x.service.one('SELECT COUNT(*) count FROM orders')).count, 1);
  x.db.close();
});
