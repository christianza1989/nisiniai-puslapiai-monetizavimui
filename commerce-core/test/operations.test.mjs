import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { CommerceOperations } from '../src/operations.mjs';
import { applyMigrations } from '../src/migrations.mjs';
import { localOperatorAuthorize } from '../src/local-identity.mjs';
import { digest } from '../src/validation.mjs';
import { createHandler } from '../src/http.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import Stripe from 'stripe';
import { StripeCheckoutAdapter } from '../src/stripe-adapter.mjs';
import { fixtureStore, fixtureProducts, cart, key, fakeCheckout, payment } from './fixtures.mjs';
const actor = 'operator_fixture_a';
export const customer = (country = 'LT') => ({
  name: 'Testinis Pirkėjas',
  email: 'buyer@example.test',
  phone: '+37060000000',
  address: {
    country,
    line1: 'Testinė g. 1',
    city: 'Vilnius',
    postalCode: country === 'LT' ? '01101' : '00-001',
  },
});
async function setup(config = fixtureStore(), clock) {
  const db = new NodeDatabase();
  db.migrate();
  const service = new CommerceService(db, clock),
    operations = new CommerceOperations(service);
  await service.provisionStore(config, fixtureProducts());
  await service.provisionStore(fixtureStore('store_b'), fixtureProducts());
  return { db, service, operations };
}
async function paid(s, n = 1) {
  const { order } = await s.createOrder(
    'store_a',
    'sandbox',
    { ...cart(), customer: customer() },
    key(n),
  );
  await s.checkout('store_a', 'sandbox', order.id, fakeCheckout);
  const checkout = await s.getOrder('store_a', 'sandbox', order.id);
  await s.acceptPayment('store_a', 'sandbox', payment(checkout, 'store_a', 'evt_' + n));
  return s.getOrder('store_a', 'sandbox', order.id);
}
test('customer validation and server locker allowlist bind immutable country/delivery snapshot', async () => {
  const config = fixtureStore();
  config.requireCustomer = true;
  config.markets[0].delivery.push({
    id: 'locker',
    kind: 'locker',
    amount: 299,
    label: 'Testinis paštomatas',
    lockers: [{ id: 'lt_test_1', country: 'LT', label: 'Testinė vieta' }],
  });
  const { db, service: s } = await setup(config);
  await assert.rejects(s.createOrder('store_a', 'sandbox', cart(), key(1)), /customer_required/);
  await assert.rejects(
    s.createOrder(
      'store_a',
      'sandbox',
      { ...cart(), customer: { ...customer(), address: { ...customer().address, country: 'PL' } } },
      key(1),
    ),
    /invalid_delivery_address/,
  );
  await assert.rejects(
    s.createOrder(
      'store_a',
      'sandbox',
      { ...cart(), customer: { ...customer(), phone: '60000000' } },
      key(1),
    ),
    /invalid_customer_phone/,
  );
  await assert.rejects(
    s.createOrder(
      'store_a',
      'sandbox',
      {
        ...cart(),
        customer: { ...customer(), address: { ...customer().address, postalCode: 'anything' } },
      },
      key(1),
    ),
    /invalid_postal_code/,
  );
  const input = {
    ...cart(),
    deliveryId: 'locker',
    customer: { ...customer(), lockerId: 'lt_test_1', locker: { label: 'Browser lie' } },
  };
  const result = await s.createOrder('store_a', 'sandbox', input, key(1));
  assert.equal(result.order.amount, 3499);
  assert.deepEqual(result.order.snapshot.customer.locker, {
    id: 'lt_test_1',
    country: 'LT',
    label: 'Testinė vieta',
  });
  assert.equal(result.order.snapshot.schemaVersion, 2);
  await assert.rejects(
    s.createOrder(
      'store_a',
      'sandbox',
      { ...input, customer: { ...input.customer, email: 'other@example.test' } },
      key(1),
    ),
    /idempotency_conflict/,
  );
  await assert.rejects(
    s.createOrder(
      'store_a',
      'sandbox',
      { ...input, customer: { ...input.customer, lockerId: 'pl_foreign' } },
      key(2),
    ),
    /locker_not_enabled/,
  );
  assert.equal((await s.rows('SELECT * FROM orders')).length, 1);
  db.close();
});
test('stock adjustments replay safely and stale operators cannot overwrite a new reservation', async () => {
  const { db, service: s, operations: op } = await setup();
  const input = {
    id: 'adjustment_fixture_1',
    sku: 'couple',
    delta: 2,
    expectedAvailable: 5,
    reason: 'Testinė gavimo partija',
  };
  assert.equal((await op.adjustStock('store_a', 'sandbox', input, actor)).replayed, false);
  assert.equal((await op.adjustStock('store_a', 'sandbox', input, actor)).replayed, true);
  await assert.rejects(
    op.adjustStock('store_a', 'sandbox', { ...input, delta: 3 }, actor),
    /stock_adjustment_id_conflict/,
  );
  const races = await Promise.allSettled([
    s.createOrder('store_a', 'sandbox', cart('couple', 1), key(1)),
    op.adjustStock(
      'store_a',
      'sandbox',
      { ...input, id: 'adjustment_fixture_2', expectedAvailable: 7, delta: -7 },
      actor,
    ),
  ]);
  assert.equal(races.filter((r) => r.status === 'fulfilled').length, 1);
  const stock = (await s.catalog('store_a', 'sandbox')).find((p) => p.sku === 'couple').available;
  assert.ok(stock === 6 || stock === 0);
  await assert.rejects(
    op.adjustStock('store_b', 'sandbox', { ...input, expectedAvailable: 0, delta: -1 }, actor),
    /stock_adjustment_conflict/,
  );
  assert.equal((await s.catalog('store_b', 'sandbox'))[0].available, 5);
  assert.equal(
    (await s.rows("SELECT * FROM outbox WHERE kind='StockAdjusted'")).length,
    races[1].status === 'fulfilled' ? 2 : 1,
  );
  db.close();
});
test('numbered immutable documents deduplicate concurrent issue, preserve credit source and isolate stores', async () => {
  const { db, service: s, operations: op } = await setup();
  const order = await paid(s);
  const issued = await Promise.all(
    [1, 2].map(() => op.issueDocument('store_a', 'sandbox', order.id, { kind: 'sale' }, actor)),
  );
  assert.equal(issued[0].document.id, issued[1].document.id);
  assert.deepEqual(issued.map((r) => r.replayed).sort(), [false, true]);
  assert.equal(issued[0].document.number, 1);
  assert.equal(issued[0].document.payload.internalTestDocument, true);
  assert.equal(
    (await s.one("SELECT next_number FROM document_sequences WHERE series='TEST-S'")).next_number,
    2,
  );
  await assert.rejects(
    s.stmt('UPDATE documents SET actor_ref=? WHERE store_id=?', 'forged', 'store_a').run(),
    /document_immutable/,
  );
  await assert.rejects(
    s.stmt('DELETE FROM documents WHERE store_id=?', 'store_a').run(),
    /document_immutable/,
  );
  await assert.rejects(
    op.getDocument('store_b', 'sandbox', issued[0].document.id),
    /document_not_found/,
  );
  await s.confirmRefund('store_a', 'sandbox', order.id, {
    providerId: 're_test',
    amount: 500,
    currency: 'EUR',
  });
  const credit = await op.issueDocument(
    'store_a',
    'sandbox',
    order.id,
    { kind: 'credit', refundId: 're_test' },
    actor,
  );
  assert.equal(credit.document.payload.amount, 500);
  assert.equal(credit.document.payload.originalDocument.id, issued[0].document.id);
  assert.equal(
    (
      await op.issueDocument(
        'store_a',
        'sandbox',
        order.id,
        { kind: 'credit', refundId: 're_test' },
        actor,
      )
    ).replayed,
    true,
  );
  const second = await paid(s, 2);
  assert.equal(
    (await op.issueDocument('store_a', 'sandbox', second.id, { kind: 'sale' }, actor)).document
      .number,
    2,
  );
  db.close();
});
test('document guard and transaction failure leave no orphan document or consumed number', async () => {
  const { db, service: s, operations: op } = await setup();
  const { order: unpaid } = await s.createOrder('store_a', 'sandbox', cart(), key(1));
  await assert.rejects(
    op.issueDocument('store_a', 'sandbox', unpaid.id, { kind: 'sale' }, actor),
    /document_order_unpaid/,
  );
  const order = await paid(s, 2);
  await s.confirmRefund('store_a', 'sandbox', order.id, {
    providerId: 're_test',
    amount: 100,
    currency: 'EUR',
  });
  await assert.rejects(
    op.issueDocument(
      'store_a',
      'sandbox',
      order.id,
      { kind: 'credit', refundId: 're_test' },
      actor,
    ),
    /original_document_required/,
  );
  const batch = db.batch.bind(db);
  db.batch = (statements) =>
    batch([
      ...statements,
      s.stmt(
        "INSERT INTO stock_adjustments VALUES('store_a','failed_fixture','couple',-100,0,'test','actor','hash',0)",
      ),
    ]);
  await assert.rejects(op.issueDocument('store_a', 'sandbox', order.id, { kind: 'sale' }, actor));
  db.batch = batch;
  assert.equal((await s.rows('SELECT * FROM documents')).length, 0);
  assert.equal((await s.rows('SELECT * FROM document_sequences')).length, 0);
  assert.equal(
    (await op.issueDocument('store_a', 'sandbox', order.id, { kind: 'sale' }, actor)).document
      .number,
    1,
  );
  db.close();
});
test('ordered migrations adopt a legacy database, repeat without data loss and reject changed history', async () => {
  const db = new NodeDatabase();
  const sources = readdirSync(new URL('../migrations/', import.meta.url))
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => ({
      name,
      source: readFileSync(new URL('../migrations/' + name, import.meta.url), 'utf8'),
    }));
  db.db.exec(sources[0].source);
  const s = new CommerceService(db);
  await s.provisionStore(fixtureStore(), fixtureProducts());
  const result = await s.createOrder('store_a', 'sandbox', cart(), key(1));
  await applyMigrations(db, sources);
  db.migrate();
  await applyMigrations(db, sources);
  assert.equal((await s.getOrder('store_a', 'sandbox', result.order.id)).amount, 3200);
  assert.equal((await s.catalog('store_a', 'sandbox'))[0].available, 4);
  assert.equal((await s.rows('SELECT * FROM commerce_migrations')).length, sources.length);
  await assert.rejects(
    applyMigrations(db, [{ ...sources[0], source: sources[0].source + '\n-- changed\n' }]),
    /migration_changed/,
  );
  await assert.rejects(
    applyMigrations(db, [
      {
        name: '0003_invalid.sql',
        source: 'CREATE TABLE should_rollback (id TEXT);\nINSERT INTO no_table VALUES(1);\n',
      },
    ]),
  );
  assert.equal(await s.one("SELECT name FROM sqlite_master WHERE name='should_rollback'"), null);
  db.close();
});
test('local identity is store/grant/expiry bound; operator API has no unauthenticated customer data', async () => {
  let now = 100;
  const token = 'local_fixture_operator_12345678901234567890';
  const records = [
    {
      id: actor,
      storeId: 'store_a',
      tokenHash: await digest(token),
      permissions: ['read', 'stock', 'document'],
      expiresAt: 200,
    },
  ];
  const authorize = localOperatorAuthorize(
    async () => records,
    () => now,
  );
  const { db, service: s } = await setup();
  const order = await paid(s);
  const handler = createHandler({
    service: s,
    environment: 'sandbox',
    operatorAuthorize: authorize,
  });
  const request = (host, path, method = 'GET', body, authorized = true) =>
    handler(
      new Request('https://' + host + path, {
        method,
        headers: {
          ...(authorized ? { authorization: 'Bearer ' + token } : {}),
          'content-type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  assert.equal(
    (await request('store-a.example', '/api/operator/overview', 'GET', undefined, false)).status,
    403,
  );
  assert.equal((await request('store-b.example', '/api/operator/overview')).status, 403);
  const overview = await (await request('store-a.example', '/api/operator/overview')).json();
  assert.equal(overview.orders[0].snapshot.customer.email, customer().email);
  assert.equal(overview.orders[0].access_hash, undefined);
  const markets = await (await request('store-a.example', '/api/markets')).json();
  assert.equal(JSON.stringify(markets).includes(customer().email), false);
  assert.equal(
    (await request('store-a.example', '/api/operator/orders/' + order.id + '/pack', 'POST', {}))
      .status,
    403,
  );
  const stock = await (
    await request('store-a.example', '/api/operator/stock-adjustments', 'POST', {
      id: 'stock_http_fixture',
      sku: 'couple',
      expectedAvailable: 4,
      delta: 1,
      reason: 'HTTP testas',
      actorRef: 'forged',
    })
  ).json();
  assert.equal(stock.adjustment.actor_ref, actor);
  const document = await (
    await request('store-a.example', '/api/operator/orders/' + order.id + '/documents', 'POST', {
      kind: 'sale',
    })
  ).json();
  assert.equal(document.document.payload.orderId, order.id);
  assert.equal(
    (await request('store-b.example', '/api/operator/documents/' + document.document.id)).status,
    403,
  );
  now = 201;
  assert.equal((await request('store-a.example', '/api/operator/overview')).status, 403);
  db.close();
});

test('signed refund arriving before payment remains durable and different event IDs refund once', async () => {
  const { db, service: s, operations: op } = await setup();
  const { order } = await s.createOrder(
    'store_a',
    'sandbox',
    { ...cart(), customer: customer() },
    key(1),
  );
  await s.checkout('store_a', 'sandbox', order.id, fakeCheckout);
  const checkout = await s.getOrder('store_a', 'sandbox', order.id);
  const client = new Stripe('fixture_api_key');
  const adapter = new StripeCheckoutAdapter({
    client,
    webhookSecret: 'fixture_refund_secret',
    accountRef: 'store_a_sandbox',
    environment: 'sandbox',
  });
  const handler = createHandler({
    service: s,
    environment: 'sandbox',
    paymentAdapters: { store_a: adapter },
  });
  const send = async (event) => {
    const raw = JSON.stringify(event),
      signature = client.webhooks.generateTestHeaderString({
        payload: raw,
        secret: 'fixture_refund_secret',
      });
    return handler(
      new Request('https://store-a.example/api/stripe/webhook', {
        method: 'POST',
        body: raw,
        headers: { 'stripe-signature': signature },
      }),
    );
  };
  const refund = {
    id: 'evt_refund_first',
    type: 'refund.created',
    livemode: false,
    data: {
      object: {
        id: 're_early',
        payment_intent: payment(checkout).paymentId,
        amount: 500,
        currency: 'eur',
        status: 'succeeded',
        metadata: { store_id: 'store_b', order_id: 'forged' },
      },
    },
  };
  assert.equal((await send(refund)).status, 200);
  assert.equal((await op.overview('store_a', 'sandbox')).pendingRefundEvents, 1);
  assert.equal((await s.getOrder('store_a', 'sandbox', order.id)).refunded_amount, 0);
  const session = {
    id: checkout.checkout_id,
    metadata: { store_id: 'store_a', order_id: order.id, environment: 'sandbox' },
    payment_intent: payment(checkout).paymentId,
    payment_status: 'paid',
    currency: 'eur',
    amount_total: checkout.amount,
  };
  assert.equal(
    (
      await send({
        id: 'evt_payment_after',
        type: 'checkout.session.completed',
        livemode: false,
        data: { object: session },
      })
    ).status,
    200,
  );
  assert.equal((await s.getOrder('store_a', 'sandbox', order.id)).refunded_amount, 500);
  assert.equal((await op.overview('store_a', 'sandbox')).pendingRefundEvents, 0);
  await send({ ...refund, id: 'evt_refund_second', type: 'refund.updated' });
  await send(refund);
  assert.equal((await s.rows("SELECT * FROM outbox WHERE kind='RefundConfirmed'")).length, 1);
  assert.equal(
    (await send({ ...refund, data: { object: { ...refund.data.object, amount: 600 } } })).status,
    409,
  );
  assert.equal(await s.getOrder('store_b', 'sandbox', order.id).catch(() => null), null);
  db.close();
});

test('order pagination keeps all rows when timestamps tie and rejects an incomplete cursor', async () => {
  const { db, service: s, operations: op } = await setup(fixtureStore(), { now: () => 1000 });
  for (let n = 1; n <= 5; n++) await s.createOrder('store_a', 'sandbox', cart(), key(n));
  const ids = [];
  let cursor = {};
  do {
    const page = await op.ordersPage('store_a', 'sandbox', { ...cursor, limit: 2 });
    ids.push(...page.orders.map((o) => o.id));
    cursor = page.nextCursor;
  } while (cursor);
  assert.equal(ids.length, 5);
  assert.equal(new Set(ids).size, 5);
  await assert.rejects(
    op.ordersPage('store_a', 'sandbox', { before: 1000 }),
    /invalid_order_filter/,
  );
  await assert.rejects(op.ordersPage('store_a', 'sandbox', { limit: 0 }), /invalid_order_filter/);
  const handler = createHandler({
    service: s,
    environment: 'sandbox',
    operatorAuthorize: async () => ({ id: 'forged', storeId: 'store_b', permissions: ['read'] }),
  });
  assert.equal(
    (await handler(new Request('https://store-a.example/api/operator/overview'))).status,
    403,
  );
  db.close();
});
test('pending, failed and contradictory refund events require review without silently reversing money', async () => {
  const { db, service: s, operations: op } = await setup();
  const order = await paid(s);
  const event = {
    kind: 'refund',
    id: 'evt_refund_pending',
    environment: 'sandbox',
    accountRef: 'store_a_sandbox',
    providerId: 're_later',
    paymentId: order.payment_id,
    amount: 100,
    currency: 'EUR',
    status: 'pending',
  };
  await op.acceptRefundEvent('store_a', 'sandbox', event);
  assert.equal((await s.getOrder('store_a', 'sandbox', order.id)).refunded_amount, 0);
  await op.acceptRefundEvent('store_a', 'sandbox', {
    ...event,
    id: 'evt_refund_ok',
    status: 'succeeded',
  });
  assert.equal((await s.getOrder('store_a', 'sandbox', order.id)).refunded_amount, 100);
  await op.acceptRefundEvent('store_a', 'sandbox', {
    ...event,
    id: 'evt_refund_failed',
    status: 'failed',
  });
  await op.acceptRefundEvent('store_a', 'sandbox', {
    ...event,
    id: 'evt_refund_stale_success',
    status: 'succeeded',
  });
  assert.equal((await s.getOrder('store_a', 'sandbox', order.id)).refunded_amount, 100);
  assert.equal((await op.overview('store_a', 'sandbox')).refundExceptions.length, 2);
  assert.equal((await s.rows("SELECT * FROM outbox WHERE kind='RefundReviewNeeded'")).length, 1);
  await op.acceptRefundEvent('store_a', 'sandbox', {
    ...event,
    id: 'evt_refund_currency',
    providerId: 're_other',
    currency: 'PLN',
    status: 'succeeded',
  });
  assert.equal(
    (await s.one("SELECT reason FROM provider_refund_events WHERE event_id='evt_refund_currency'"))
      .reason,
    'refund_currency_mismatch',
  );
  await assert.rejects(
    op.acceptRefundEvent('store_a', 'sandbox', {
      ...event,
      id: 'evt_foreign',
      accountRef: 'store_b_sandbox',
    }),
    /payment_account_mismatch/,
  );
  db.close();
});
test('refund confirmation crash recovers from the same durable provider event without a second refund', async () => {
  const { db, service: s, operations: op } = await setup();
  const order = await paid(s),
    event = {
      kind: 'refund',
      id: 'evt_refund_crash',
      environment: 'sandbox',
      accountRef: 'store_a_sandbox',
      providerId: 're_crash',
      paymentId: order.payment_id,
      amount: 100,
      currency: 'EUR',
      status: 'succeeded',
    };
  const stmt = s.stmt.bind(s);
  let crash = true;
  s.stmt = (sql, ...args) => {
    if (crash && sql.includes("processing_state='applied'")) {
      crash = false;
      throw new Error('fixture crash after confirmation');
    }
    return stmt(sql, ...args);
  };
  await assert.rejects(op.acceptRefundEvent('store_a', 'sandbox', event), /fixture crash/);
  assert.equal((await s.getOrder('store_a', 'sandbox', order.id)).refunded_amount, 100);
  s.stmt = stmt;
  await new CommerceOperations(new CommerceService(db)).applyPendingRefunds('store_a', 'sandbox');
  assert.equal((await s.getOrder('store_a', 'sandbox', order.id)).refunded_amount, 100);
  assert.equal((await s.rows('SELECT * FROM refunds')).length, 1);
  assert.equal(
    (
      await s.one(
        "SELECT processing_state FROM provider_refund_events WHERE event_id='evt_refund_crash'",
      )
    ).processing_state,
    'applied',
  );
  db.close();
});
