import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import Stripe from 'stripe';
import { CommerceService } from '../src/service.mjs';
import { fixtureStore, fixtureProducts, cart, key, payment } from '../test/fixtures.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = mkdtempSync(join(tmpdir(), 'commerce-workerd-'));
const options = {
  modules: true,
  compatibilityDate: '2026-10-11',
  d1Databases: { COMMERCE_DB: '00000000-0000-0000-0000-000000000001' },
  bindings: { COMMERCE_ENV: 'sandbox', TEST_HARNESS: 'fixture-only' },
  resourcePersistencePath: directory,
};
let mf;
async function start(entry, bindings = {}) {
  const bundle = await build({
    entryPoints: [join(root, entry)],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    conditions: ['workerd', 'worker', 'browser'],
  });
  mf = new Miniflare(
    convertV4MiniflareOptions({
      ...options,
      bindings: { ...options.bindings, ...bindings },
      script: bundle.outputFiles[0].text,
    }),
  );
  await mf.ready;
  return mf.getD1Database('COMMERCE_DB');
}
// The migration format allows one complete DDL statement per block; trigger bodies
// stay intact. D1 .batch prepares each complete statement, never arbitrary fragments.
function migrationStatements(source) {
  const statements = [];
  let current = '',
    trigger = false;
  for (const line of source.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (!current) trigger = /^CREATE TRIGGER/i.test(line);
    current += line + '\n';
    if ((trigger && /^END;\s*$/.test(line)) || (!trigger && /;\s*$/.test(line))) {
      statements.push(current);
      current = '';
    }
  }
  assert.equal(current, '', 'Migration contains an incomplete statement');
  return statements;
}
const token = 'test_' + crypto.randomUUID().replaceAll('-', '');
const dispatch = (host, path, method = 'GET', body, headers = {}) =>
  mf.dispatchFetch('https://' + host + path, {
    method,
    headers: { 'content-type': 'application/json', 'order-access-token': token, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
try {
  let db = await start('src/worker.mjs');
  await db.batch(
    migrationStatements(readFileSync(join(root, 'migrations/0001_commerce.sql'), 'utf8')).map(
      (sql) => db.prepare(sql),
    ),
  );
  let service = new CommerceService(db);
  await service.provisionStore(fixtureStore(), fixtureProducts(1));
  await service.provisionStore(fixtureStore('store_b'), fixtureProducts(3));
  assert.equal((await dispatch('unknown.example', '/api/catalog')).status, 404);
  assert.equal((await dispatch('store-a.example', '/api/catalog')).status, 200);
  const conflict = await dispatch(
    'store-a.example',
    '/api/orders',
    'POST',
    {
      ...cart(),
      lines: [
        { sku: 'couple', quantity: 1 },
        { sku: 'family', quantity: 2 },
      ],
    },
    { 'idempotency-key': key(1) },
  );
  assert.equal(conflict.status, 409);
  assert.equal((await service.rows('SELECT * FROM orders')).length, 0);
  assert.equal((await service.catalog('store_a', 'sandbox'))[0].available, 1);
  const concurrent = await Promise.all(
    [1, 2].map((n) =>
      dispatch('store-a.example', '/api/orders', 'POST', cart(), { 'idempotency-key': key(n) }),
    ),
  );
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [201, 409]);
  const result = await concurrent.find((r) => r.status === 201).json();
  assert.equal((await dispatch('store-a.example', '/api/orders/' + result.order.id)).status, 403);
  assert.equal(
    (
      await dispatch('store-b.example', '/api/orders/' + result.order.id, 'GET', undefined, {
        authorization: 'Bearer ' + token,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await dispatch('store-a.example', '/api/orders/' + result.order.id, 'GET', undefined, {
        authorization: 'Bearer ' + token,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await dispatch(
        'store-a.example',
        '/api/orders/' + result.order.id + '/checkout',
        'POST',
        undefined,
        { authorization: 'Bearer ' + token },
      )
    ).status,
    503,
  );
  const replay = await dispatch('store-a.example', '/api/orders', 'POST', cart(), {
    'idempotency-key': result.order.request_key,
  });
  assert.equal((await replay.json()).order.id, result.order.id);
  await mf.dispose();
  mf = undefined;

  db = await start('test/worker-harness.mjs');
  service = new CommerceService(db);
  assert.equal((await service.getOrder('store_a', 'sandbox', result.order.id)).amount, 3200);
  const checkout = await dispatch(
    'store-a.example',
    '/api/orders/' + result.order.id + '/checkout',
    'POST',
    undefined,
    { authorization: 'Bearer ' + token },
  );
  assert.equal(checkout.status, 200);
  const session = await checkout.json();
  const raw = JSON.stringify({
    id: 'evt_workerd',
    livemode: false,
    type: 'checkout.session.async_payment_succeeded',
    data: {
      object: {
        id: session.id,
        payment_status: 'paid',
        payment_intent: 'pi_workerd',
        currency: 'eur',
        amount_total: 3200,
        metadata: { store_id: 'store_a', order_id: result.order.id, environment: 'sandbox' },
      },
    },
  });
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload: raw,
    secret: 'fixture-webhook-secret',
  });
  const webhook = () =>
    mf.dispatchFetch('https://store-a.example/api/stripe/webhook', {
      method: 'POST',
      body: raw,
      headers: { 'stripe-signature': signature },
    });
  assert.equal((await webhook()).status, 200);
  assert.equal((await webhook()).status, 200);
  assert.equal(
    (
      await mf.dispatchFetch('https://store-a.example/api/stripe/webhook', {
        method: 'POST',
        body: raw,
        headers: { 'stripe-signature': 'invalid' },
      })
    ).status,
    400,
  );
  assert.equal(
    (await service.rows("SELECT * FROM outbox WHERE kind='PaymentConfirmed'")).length,
    1,
  );
  assert.equal(
    (await dispatch('store-a.example', '/api/operator/orders/' + result.order.id + '/pack', 'POST'))
      .status,
    403,
  );
  assert.equal(
    (
      await dispatch(
        'store-a.example',
        '/api/operator/orders/' + result.order.id + '/pack',
        'POST',
        undefined,
        { 'x-fixture-operator': 'store_a' },
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await dispatch(
        'store-a.example',
        '/api/operator/orders/' + result.order.id + '/ship',
        'POST',
        undefined,
        { 'x-fixture-operator': 'store_a' },
      )
    ).status,
    200,
  );
  await service.confirmRefund('store_a', 'sandbox', result.order.id, {
    providerId: 're_workerd',
    amount: 1000,
    currency: 'EUR',
  });
  await assert.rejects(
    service.confirmRefund('store_a', 'sandbox', result.order.id, {
      providerId: 're_over',
      amount: 3000,
      currency: 'EUR',
    }),
    /refund_invalid/,
  );
  await service.postJournal('store_a', 'sandbox', {
    sourceId: 'sale_workerd',
    currency: 'EUR',
    lines: [
      { account: 'stripe', debit: 3200, credit: 0 },
      { account: 'sales', debit: 0, credit: 3200 },
    ],
  });
  const leased = await service.claimOutbox('store_a', 'sandbox', 1);
  assert.equal(leased.length, 1);
  await service.completeOutbox('store_a', 'sandbox', leased[0].id, leased[0].lease_token);

  // Late-payment triggers are exercised against native D1, not the Node SQLite shim.
  let clock = Date.now();
  const timed = new CommerceService(db, { now: () => clock });
  const late = await timed.createOrder('store_b', 'sandbox', cart(), key(8));
  await timed.checkout('store_b', 'sandbox', late.order.id, {
    createSession: async () => ({ id: 'cs_late', url: 'https://fixture.example' }),
  });
  clock += 3600001;
  await timed.expire('store_b', 'sandbox');
  const lateOrder = await timed.getOrder('store_b', 'sandbox', late.order.id);
  assert.equal(
    (await timed.acceptPayment('store_b', 'sandbox', payment(lateOrder, 'store_b', 'evt_late')))
      .order.stock_state,
    'allocated',
  );
  await mf.dispose();
  mf = undefined;
  await start('src/worker.mjs', { COMMERCE_ENV: 'production' });
  assert.equal((await dispatch('store-a.example', '/api/catalog')).status, 503);
  console.log(
    'PASS workerd/native D1: migration, multi-SKU rollback, concurrent HTTP stock, store/token isolation, replay, restart persistence, signed Stripe async/replay, operator gate, fixture shipment, refunds, journal, outbox, expiry/late payment. No remote API calls.',
  );
} finally {
  if (mf) await mf.dispose();
  // Only the mkdtemp directory created by this test may be removed.
  assert.ok(directory.startsWith(join(tmpdir(), 'commerce-workerd-')));
  rmSync(directory, { recursive: true });
}
