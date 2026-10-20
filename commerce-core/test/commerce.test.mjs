import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import { once } from 'node:events';
import Stripe from 'stripe';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { StripeCheckoutAdapter } from '../src/stripe-adapter.mjs';
import { createHandler } from '../src/http.mjs';
import {
  fixtureStore,
  fixtureProducts,
  cart,
  key,
  fakeCheckout,
  payment,
  fixtureCarrier,
} from './fixtures.mjs';
async function setup(stock = 5, db = new NodeDatabase(), clock) {
  db.migrate();
  const service = new CommerceService(db, clock);
  await service.provisionStore(fixtureStore(), fixtureProducts(stock));
  await service.provisionStore(fixtureStore('store_b'), fixtureProducts(stock));
  return { db, service };
}
async function paid(service, n = 1) {
  const result = await service.createOrder('store_a', 'sandbox', cart(), key(n));
  await service.checkout('store_a', 'sandbox', result.order.id, fakeCheckout);
  const order = await service.getOrder('store_a', 'sandbox', result.order.id);
  await service.acceptPayment('store_a', 'sandbox', payment(order, 'store_a', 'evt_' + n));
  return service.getOrder('store_a', 'sandbox', order.id);
}
test('server price, consolidation and snapshot survive request replay', async () => {
  const { db, service } = await setup();
  const result = await service.createOrder(
    'store_a',
    'sandbox',
    {
      ...cart(),
      amount: 1,
      lines: [
        { sku: 'couple', quantity: 1 },
        { sku: 'couple', quantity: 2 },
      ],
    },
    key(1),
  );
  assert.equal(result.order.amount, 9600);
  assert.equal(result.order.snapshot.lines.length, 1);
  const replay = await service.createOrder(
    'store_a',
    'sandbox',
    { ...cart(), lines: [{ sku: 'couple', quantity: 3 }] },
    key(1),
  );
  assert.equal(replay.order.id, result.order.id);
  assert.equal(replay.replayed, true);
  await assert.rejects(
    service.createOrder('store_a', 'sandbox', cart('family'), key(1)),
    /idempotency_conflict/,
  );
  db.close();
});
test('all-or-nothing cart rollback leaves no order, stock or outbox', async () => {
  const { db, service } = await setup(1);
  await assert.rejects(
    service.createOrder(
      'store_a',
      'sandbox',
      {
        ...cart(),
        lines: [
          { sku: 'couple', quantity: 1 },
          { sku: 'family', quantity: 2 },
        ],
      },
      key(2),
    ),
    /stock_unavailable/,
  );
  assert.equal((await service.catalog('store_a', 'sandbox'))[0].available, 1);
  assert.equal((await service.rows('SELECT * FROM orders')).length, 0);
  assert.equal((await service.rows('SELECT * FROM outbox')).length, 0);
  db.close();
});
test('concurrent last-unit claims only succeed once; concurrent same key replays', async () => {
  const { db, service } = await setup(1);
  const res = await Promise.allSettled([
    service.createOrder('store_a', 'sandbox', cart(), key(1)),
    service.createOrder('store_a', 'sandbox', cart(), key(2)),
  ]);
  assert.equal(res.filter((x) => x.status === 'fulfilled').length, 1);
  assert.equal((await service.catalog('store_a', 'sandbox'))[0].available, 0);
  const replay = await Promise.all([
    service.createOrder('store_b', 'sandbox', cart(), key(9)),
    service.createOrder('store_b', 'sandbox', cart(), key(9)),
  ]);
  assert.equal(replay[0].order.id, replay[1].order.id);
  db.close();
});
test('store/environment/host/order/token boundaries fail closed', async () => {
  const { db, service } = await setup();
  const result = await service.createOrder('store_a', 'sandbox', cart(), key(1));
  await assert.rejects(service.getOrder('store_b', 'sandbox', result.order.id), /order_not_found/);
  await assert.rejects(service.getOrder('store_a', 'production', result.order.id), /unknown_store/);
  await assert.rejects(service.resolveHost('unknown.example', 'sandbox'), /unknown_host/);
  await assert.rejects(
    service.authorizeOrder('store_a', 'sandbox', result.order.id, 'wrong'),
    /order_forbidden/,
  );
  assert.equal(
    (await service.authorizeOrder('store_a', 'sandbox', result.order.id, result.accessToken)).id,
    result.order.id,
  );
  await assert.rejects(
    service.quote('store_a', 'sandbox', { ...cart(), currency: 'PLN' }),
    /market_not_enabled/,
  );
  db.close();
});
test('database restart preserves order and second connection cannot oversell', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'commerce-')),
    file = join(dir, 'state.sqlite');
  const first = new NodeDatabase(file),
    { service } = await setup(1, first);
  const result = await service.createOrder('store_a', 'sandbox', cart(), key(1));
  first.close();
  const second = new NodeDatabase(file),
    s = new CommerceService(second);
  assert.equal((await s.getOrder('store_a', 'sandbox', result.order.id)).amount, 3200);
  await assert.rejects(s.createOrder('store_a', 'sandbox', cart(), key(2)), /stock_unavailable/);
  second.close();
  rmSync(dir, { recursive: true });
});
test('payment replay and differing event IDs create one fulfillment/accounting event', async () => {
  const { db, service } = await setup();
  const order = await paid(service);
  const event = payment(order, 'store_a', 'evt_1');
  assert.equal((await service.acceptPayment('store_a', 'sandbox', event)).replayed, true);
  await service.acceptPayment('store_a', 'sandbox', { ...event, id: 'evt_second' });
  assert.equal(
    (await service.rows("SELECT * FROM outbox WHERE kind='PaymentConfirmed'")).length,
    1,
  );
  await assert.rejects(
    service.acceptPayment('store_a', 'sandbox', { ...event, id: 'evt_bad', amount: 1 }),
    /payment_mismatch/,
  );
  await assert.rejects(
    service.acceptPayment('store_a', 'sandbox', {
      ...event,
      id: 'evt_bad',
      accountRef: 'store_b_sandbox',
    }),
    /payment_account_mismatch/,
  );
  await assert.rejects(
    service.acceptPayment('store_a', 'sandbox', { ...event, id: 'evt_currency', currency: 'PLN' }),
    /payment_mismatch/,
  );
  await assert.rejects(
    service.acceptPayment('store_a', 'sandbox', {
      ...event,
      id: 'evt_session',
      sessionId: 'cs_wrong',
    }),
    /payment_mismatch/,
  );
  await assert.rejects(
    service.acceptPayment('store_a', 'sandbox', {
      ...event,
      id: 'evt_live',
      environment: 'production',
    }),
    /payment_account_mismatch/,
  );
  db.close();
});
test('late payment reclaims stock or records paid stock exception durably', async () => {
  let time = 1000000;
  const { db, service } = await setup(1, undefined, { now: () => time });
  const a = await service.createOrder('store_a', 'sandbox', cart(), key(1));
  await service.checkout('store_a', 'sandbox', a.order.id, fakeCheckout);
  time += 3600001;
  await service.expire('store_a', 'sandbox');
  assert.equal((await service.catalog('store_a', 'sandbox'))[0].available, 1);
  await service.createOrder('store_a', 'sandbox', cart(), key(2));
  const expired = await service.getOrder('store_a', 'sandbox', a.order.id);
  const result = await service.acceptPayment('store_a', 'sandbox', payment(expired));
  assert.equal(result.order.payment_state, 'paid');
  assert.equal(result.order.stock_state, 'released');
  assert.equal(result.order.fulfillment_state, 'stock_exception');
  await assert.rejects(service.markPacked('store_a', 'sandbox', a.order.id), /packing_not_allowed/);
  const b = await service.createOrder('store_b', 'sandbox', cart(), key(3));
  await service.checkout('store_b', 'sandbox', b.order.id, fakeCheckout);
  time += 3600001;
  await service.expire('store_b', 'sandbox');
  const bo = await service.getOrder('store_b', 'sandbox', b.order.id);
  assert.equal(
    (await service.acceptPayment('store_b', 'sandbox', payment(bo, 'store_b'))).order.stock_state,
    'allocated',
  );
  db.close();
});
test('shipment timeout recovery uses same reference and never creates twice', async () => {
  const { db, service } = await setup();
  const order = await paid(service),
    carrier = fixtureCarrier();
  await assert.rejects(
    service.registerShipment('store_a', 'sandbox', order.id, carrier),
    /shipping_not_allowed/,
  );
  await service.markPacked('store_a', 'sandbox', order.id);
  carrier.timeoutOnce();
  await assert.rejects(
    service.registerShipment('store_a', 'sandbox', order.id, carrier),
    /shipment_outcome_unknown/,
  );
  const shipment = await service.registerShipment('store_a', 'sandbox', order.id, carrier);
  assert.equal(shipment.state, 'registered');
  assert.equal(carrier.calls, 1);
  await service.registerShipment('store_a', 'sandbox', order.id, carrier);
  assert.equal(carrier.calls, 1);
  assert.equal(
    (await service.getOrder('store_a', 'sandbox', order.id)).fulfillment_state,
    'labelled',
  );
  await assert.rejects(
    service.registerShipment('store_b', 'sandbox', order.id, carrier),
    /order_not_found/,
  );
  db.close();
});
test('withdrawal is durable without silently approving refund; refund sum and replay guarded', async () => {
  const { db, service } = await setup();
  const order = await paid(service);
  await service.requestWithdrawal('store_a', 'sandbox', order.id);
  await service.requestWithdrawal('store_a', 'sandbox', order.id);
  assert.equal((await service.rows('SELECT * FROM withdrawals')).length, 1);
  assert.equal((await service.getOrder('store_a', 'sandbox', order.id)).payment_state, 'paid');
  await service.confirmRefund('store_a', 'sandbox', order.id, {
    providerId: 're_1',
    amount: 1000,
    currency: 'EUR',
  });
  assert.equal(
    (
      await service.confirmRefund('store_a', 'sandbox', order.id, {
        providerId: 're_1',
        amount: 1000,
        currency: 'EUR',
      })
    ).replayed,
    true,
  );
  await assert.rejects(
    service.confirmRefund('store_a', 'sandbox', order.id, {
      providerId: 're_2',
      amount: 3000,
      currency: 'EUR',
    }),
    /refund_invalid/,
  );
  await service.confirmRefund('store_a', 'sandbox', order.id, {
    providerId: 're_2',
    amount: 2200,
    currency: 'EUR',
  });
  assert.equal((await service.getOrder('store_a', 'sandbox', order.id)).payment_state, 'refunded');
  db.close();
});
test('balanced journals isolate stores and reject source mutation', async () => {
  const { db, service } = await setup();
  const entry = {
    sourceId: 'sale_order_1',
    currency: 'EUR',
    lines: [
      { account: 'stripe_clearing', debit: 3200, credit: 0 },
      { account: 'sales', debit: 0, credit: 3200 },
    ],
  };
  const first = await service.postJournal('store_a', 'sandbox', entry);
  assert.equal((await service.postJournal('store_a', 'sandbox', entry)).id, first.id);
  await assert.rejects(
    service.postJournal('store_a', 'sandbox', {
      ...entry,
      lines: [entry.lines[0], { ...entry.lines[1], credit: 3100 }],
    }),
    /journal_unbalanced/,
  );
  const b = await service.postJournal('store_b', 'sandbox', entry);
  assert.notEqual(b.id, first.id);
  const fee = { ...entry, lines: [{ account: 'fees', debit: 3200, credit: 0 }, entry.lines[1]] };
  await assert.rejects(service.postJournal('store_a', 'sandbox', fee), /journal_conflict/);
  db.close();
});
test('outbox lease survives worker loss and stale acknowledgement cannot steal it', async () => {
  let time = 100;
  const { db, service } = await setup(5, undefined, { now: () => time });
  await service.createOrder('store_a', 'sandbox', cart(), key(1));
  const first = await service.claimOutbox('store_a', 'sandbox');
  assert.equal(first.length, 1);
  assert.equal((await service.claimOutbox('store_a', 'sandbox')).length, 0);
  time += 60001;
  const second = await service.claimOutbox('store_a', 'sandbox');
  assert.equal(second[0].attempts, 2);
  await assert.rejects(
    service.completeOutbox('store_a', 'sandbox', first[0].id, first[0].lease_token),
    /lease_conflict/,
  );
  await service.completeOutbox('store_a', 'sandbox', second[0].id, second[0].lease_token);
  assert.equal((await service.claimOutbox('store_a', 'sandbox')).length, 0);
  db.close();
});
test('Stripe SDK verifies signatures and gates unpaid/asynchronous environment', async () => {
  const secret = 'fixture-webhook-secret-only';
  const client = { webhooks: Stripe.webhooks };
  const adapter = new StripeCheckoutAdapter({
    webhookSecret: secret,
    accountRef: 'store_a_sandbox',
    environment: 'sandbox',
    client,
  });
  const object = {
    id: 'cs_test',
    currency: 'eur',
    amount_total: 3200,
    payment_status: 'paid',
    payment_intent: 'pi_test',
    metadata: { environment: 'sandbox', store_id: 'store_a', order_id: 'order_test' },
  };
  const payload = JSON.stringify({
    id: 'evt_test',
    livemode: false,
    type: 'checkout.session.async_payment_succeeded',
    data: { object },
  });
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  assert.equal((await adapter.verifyEvent(payload, header)).amount, 3200);
  await assert.rejects(adapter.verifyEvent(payload + ' ', header));
  const live = JSON.stringify({ ...JSON.parse(payload), livemode: true });
  await assert.rejects(
    adapter.verifyEvent(live, Stripe.webhooks.generateTestHeaderString({ payload: live, secret })),
    /stripe_environment_mismatch/,
  );
  const unpaid = JSON.stringify({
    id: 'evt_2',
    livemode: false,
    type: 'checkout.session.completed',
    data: { object: { ...object, payment_status: 'unpaid' } },
  });
  assert.equal(
    await adapter.verifyEvent(
      unpaid,
      Stripe.webhooks.generateTestHeaderString({ payload: unpaid, secret }),
    ),
    null,
  );
});
test('Stripe Checkout payload is stable across retries, dynamic and authoritative', async () => {
  const { db, service } = await setup();
  const order = (await service.createOrder('store_a', 'sandbox', cart(), key(1))).order;
  const calls = [],
    client = {
      checkout: {
        sessions: {
          create: async (data, opts) => {
            calls.push({ data, opts });
            return { id: 'cs_test', url: 'https://checkout.stripe.com/test' };
          },
        },
      },
    };
  const adapter = new StripeCheckoutAdapter({
    webhookSecret: 'fixture-secret',
    accountRef: 'store_a_sandbox',
    environment: 'sandbox',
    client,
  });
  await adapter.createSession(order, fixtureStore());
  await adapter.createSession(order, fixtureStore());
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(calls[0].data.line_items[0].price_data.unit_amount, 3200);
  assert.equal('payment_method_types' in calls[0].data, false);
  assert.equal('automatic_tax' in calls[0].data, false);
  db.close();
});
test('HTTP quote/order/token/origin/body/operator boundaries', async () => {
  const { db, service } = await setup();
  const handler = createHandler({ service, environment: 'sandbox' });
  const req = (path, method = 'GET', body, headers = {}) =>
    new Request('https://store-a.example' + path, {
      method,
      headers: {
        'content-type': 'application/json',
        'order-access-token': 'test_' + crypto.randomUUID().replaceAll('-', ''),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const created = await handler(req('/api/orders', 'POST', cart(), { 'idempotency-key': key(1) }));
  assert.equal(created.status, 201);
  const result = await created.json();
  assert.ok(result.accessToken);
  assert.equal((await handler(req('/api/orders/' + result.order.id))).status, 403);
  assert.equal(
    (
      await handler(
        req('/api/orders/' + result.order.id, 'GET', undefined, {
          authorization: 'Bearer ' + result.accessToken,
        }),
      )
    ).status,
    200,
  );
  assert.equal(
    (await handler(req('/api/operator/orders/' + result.order.id + '/pack', 'POST', {}))).status,
    403,
  );
  assert.equal(
    (
      await handler(
        req('/api/orders', 'POST', cart(), {
          origin: 'https://evil.example',
          'idempotency-key': key(2),
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await handler(
        req('/api/orders', 'POST', { data: 'x'.repeat(70000) }, { 'idempotency-key': key(2) }),
      )
    ).status,
    413,
  );
  assert.equal((await handler(new Request('https://unknown.example/api/catalog'))).status, 404);
  db.close();
});

test('two independent SQLite writers race for the same last unit', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'commerce-writers-')),
    file = join(dir, 'state.sqlite');
  const db = new NodeDatabase(file);
  await setup(1, db);
  db.close();
  const workers = [1, 2].map(
    (n) =>
      new Worker(new URL('./concurrent-writer.mjs', import.meta.url), {
        workerData: { file, key: n },
      }),
  );
  try {
    await Promise.all(workers.map((w) => once(w, 'message')));
    const pending = workers.map((w) => once(w, 'message'));
    workers.forEach((w) => w.postMessage('go'));
    const results = (await Promise.all(pending)).map(([r]) => r);
    assert.equal(results.filter((r) => r.ok).length, 1);
    assert.equal(results.find((r) => !r.ok).error, 'stock_unavailable');
  } finally {
    await Promise.all(workers.map((w) => w.terminate()));
    assert.ok(dir.startsWith(join(tmpdir(), 'commerce-writers-')));
    rmSync(dir, { recursive: true });
  }
});

test('lost create response recovers with the client token, and key theft fails', async () => {
  const { db, service } = await setup();
  const token = 'test_' + crypto.randomUUID().replaceAll('-', '');
  const first = await service.createOrder('store_a', 'sandbox', cart(), key(1), token);
  const replay = await service.createOrder('store_a', 'sandbox', cart(), key(1), token);
  assert.equal(replay.order.id, first.order.id);
  assert.equal(replay.accessToken, undefined);
  assert.equal(
    (await service.authorizeOrder('store_a', 'sandbox', replay.order.id, token)).id,
    first.order.id,
  );
  await assert.rejects(
    service.createOrder(
      'store_a',
      'sandbox',
      cart(),
      key(1),
      'test_' + crypto.randomUUID().replaceAll('-', ''),
    ),
    /idempotency_conflict/,
  );
  await assert.rejects(service.quote('store_a', 'sandbox', null), /invalid_payload/);
  db.close();
});

test('invalid package/market/test-to-production admission fails before persistence', async () => {
  const db = new NodeDatabase();
  db.migrate();
  const service = new CommerceService(db);
  await assert.rejects(
    service.provisionStore(
      { ...fixtureStore(), environment: 'production', productionAdmission: { approved: true } },
      fixtureProducts(),
    ),
    /production_not_admitted/,
  );
  await assert.rejects(
    service.provisionStore(
      { ...fixtureStore(), markets: [...fixtureStore().markets, fixtureStore().markets[0]] },
      fixtureProducts(),
    ),
    /duplicate_market/,
  );
  await assert.rejects(
    service.provisionStore(fixtureStore(), [
      { ...fixtureProducts()[0], package: { weightGrams: 0, dimensionsMm: [1, 2, 3] } },
    ]),
    /invalid_package/,
  );
  assert.equal((await service.rows('SELECT * FROM stores')).length, 0);
  db.close();
});

test('racing duplicate payment events produce one event; mismatched payment ID fails', async () => {
  const { db, service } = await setup();
  const placed = await service.createOrder('store_a', 'sandbox', cart(), key(1));
  await service.checkout('store_a', 'sandbox', placed.order.id, fakeCheckout);
  const order = await service.getOrder('store_a', 'sandbox', placed.order.id);
  await Promise.all([
    service.acceptPayment('store_a', 'sandbox', payment(order, 'store_a', 'evt_one')),
    service.acceptPayment('store_a', 'sandbox', payment(order, 'store_a', 'evt_two')),
  ]);
  assert.equal(
    (await service.rows("SELECT * FROM outbox WHERE kind='PaymentConfirmed'")).length,
    1,
  );
  await assert.rejects(
    service.acceptPayment('store_a', 'sandbox', {
      ...payment(order, 'store_a', 'evt_wrong_pi'),
      paymentId: 'pi_different',
    }),
    /payment_conflict/,
  );
  db.close();
});

test('expiry rechecks payment inside the transaction before recording an event', async () => {
  let time = Date.now();
  const { db, service } = await setup(1, undefined, { now: () => time });
  const placed = await service.createOrder('store_a', 'sandbox', cart(), key(1));
  await service.checkout('store_a', 'sandbox', placed.order.id, fakeCheckout);
  const order = await service.getOrder('store_a', 'sandbox', placed.order.id);
  time += 3600001;
  const originalBatch = db.batch.bind(db);
  let race = true;
  db.batch = async (statements) => {
    if (race) {
      race = false;
      await service.acceptPayment('store_a', 'sandbox', payment(order));
    }
    return originalBatch(statements);
  };
  assert.equal(await service.expire('store_a', 'sandbox'), 0);
  assert.equal(
    (await service.rows("SELECT * FROM outbox WHERE kind='ReservationExpired'")).length,
    0,
  );
  assert.equal((await service.getOrder('store_a', 'sandbox', order.id)).stock_state, 'allocated');
  db.close();
});

test('new checkout refuses the last 30 minutes of a reservation', async () => {
  let time = Date.now();
  const { db, service } = await setup(1, undefined, { now: () => time });
  const placed = await service.createOrder('store_a', 'sandbox', cart(), key(1));
  time += 1800001;
  await assert.rejects(
    service.checkout('store_a', 'sandbox', placed.order.id, fakeCheckout),
    /checkout_window_elapsed/,
  );
  db.close();
});
