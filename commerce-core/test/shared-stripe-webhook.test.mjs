import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { StripeCheckoutAdapter } from '../src/stripe-adapter.mjs';
import { createHandler } from '../src/http.mjs';
import { validateStore } from '../src/validation.mjs';
import { fixtureStore, fixtureProducts, cart, key, fakeCheckout } from './fixtures.mjs';
const secret = 'shared-account-fixture-signing-secret';
async function setup() {
  const db = new NodeDatabase();
  db.migrate();
  const service = new CommerceService(db);
  await service.provisionStore(fixtureStore(), fixtureProducts());
  await service.provisionStore(fixtureStore('store_b'), fixtureProducts());
  const adapter = new StripeCheckoutAdapter({
    environment: 'sandbox',
    accountRef: 'store_a_sandbox',
    webhookSecret: secret,
    client: { webhooks: Stripe.webhooks },
  });
  const handler = createHandler({
    service,
    environment: 'sandbox',
    paymentAdapters: { store_a: adapter },
  });
  const order = (await service.createOrder('store_a', 'sandbox', cart(), key(1))).order;
  await service.checkout('store_a', 'sandbox', order.id, fakeCheckout);
  const pending = await service.getOrder('store_a', 'sandbox', order.id);
  const object = {
    id: pending.checkout_id,
    currency: 'eur',
    amount_total: pending.amount,
    payment_status: 'paid',
    payment_intent: 'pi_shared_fixture',
    client_reference_id: order.id,
    metadata: { store_id: 'store_a', environment: 'sandbox', order_id: order.id },
  };
  const post = async (
    object,
    {
      type = 'checkout.session.completed',
      livemode = false,
      tamper = false,
      eventId = 'evt_shared_fixture',
    } = {},
  ) => {
    const body = JSON.stringify({ id: eventId, type, livemode, data: { object } });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload: body, secret });
    return handler(
      new Request('https://store-a.example/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': signature },
        body: body + (tamper ? ' ' : ''),
      }),
    );
  };
  const snapshot = async () => {
    const result = {};
    for (const { name } of (
      await db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all()
    ).results) {
      assert.match(name, /^[a-z_]+$/);
      // Preserve every business table's complete rows, not just row counts.
      result[name] = (await db.prepare('SELECT * FROM ' + name + ' ORDER BY rowid').all()).results;
    }
    return result;
  };
  return { db, service, post, object, order, snapshot };
}
test('signed foreign Checkout events acknowledge without any business/ledger changes; signature and mode are verified before scope lookup', async () => {
  const f = await setup();
  try {
    const before = await f.snapshot();
    const foreign = {
      id: 'cs_foreign_fixture',
      currency: 'eur',
      amount_total: 999,
      payment_status: 'paid',
      payment_intent: 'pi_foreign_fixture',
      client_reference_id: 'foreign_app_ref',
    };
    for (const object of [
      foreign,
      {
        ...foreign,
        metadata: { store_id: 'store_b', environment: 'sandbox', order_id: 'foreign_order' },
      },
    ]) {
      const response = await f.post(object);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { received: true });
    }
    assert.deepEqual(await f.snapshot(), before);
    let lookups = 0;
    const original = f.service.one.bind(f.service);
    f.service.one = async (sql, ...params) => {
      if (sql.startsWith('SELECT o.id FROM orders o JOIN stores s')) lookups++;
      return original(sql, ...params);
    };
    assert.equal((await f.post(foreign, { tamper: true })).status, 400);
    assert.equal((await f.post(foreign, { livemode: true })).status, 403);
    assert.equal(lookups, 0);
    assert.deepEqual(await f.snapshot(), before);
  } finally {
    f.db.close();
  }
});
test('known own Checkout never disappears as foreign when metadata or references conflict; ambiguous own markers remain errors', async () => {
  const f = await setup();
  try {
    const before = await f.snapshot();
    for (const change of [
      { metadata: {} },
      { metadata: { store_id: 'store_b', environment: 'sandbox', order_id: f.order.id } },
      { id: 'cs_unknown_fixture', metadata: {}, client_reference_id: f.order.id },
      { id: 'cs_unknown_fixture', client_reference_id: null, metadata: { order_id: f.order.id } },
      { id: 'cs_unknown_fixture', client_reference_id: null, metadata: { environment: 'sandbox' } },
      { id: 'cs_unknown_fixture', client_reference_id: null, metadata: { store_id: 123 } },
      { id: 'cs_unknown_fixture', client_reference_id: null, metadata: { store_id: 0 } },
      { metadata: { ...f.object.metadata, environment: 'production' } },
      { metadata: { ...f.object.metadata, order_id: 'missing_order' } },
      { metadata: { store_id: 'store_a', environment: 'sandbox' } },
      { id: null },
      { amount_total: 1 },
      { payment_intent: null },
    ]) {
      const response = await f.post({ ...f.object, ...change });
      assert.ok([400, 403, 404, 409].includes(response.status), JSON.stringify(change));
      assert.deepEqual(await f.snapshot(), before);
    }
  } finally {
    f.db.close();
  }
});

test('closed production store acknowledges signed LIVE-shaped foreign Checkout without admitting checkout or seeding business data', async () => {
  const db = new NodeDatabase();
  db.migrate();
  const service = new CommerceService(db);
  try {
    const config = validateStore({
      ...fixtureStore('store_live'),
      environment: 'production',
      testOnly: false,
      requireCustomer: true,
      productionAdmission: { approved: true },
      operationalAdmission: { approved: false },
      documentPolicy: { approved: false },
      paymentAccountRef: 'acct_fixture',
      markets: [
        {
          country: 'LT',
          currency: 'EUR',
          policyVersion: 'fixture_policy',
          checkoutEnabled: false,
          delivery: [{ id: 'inactive', amount: 0, label: 'Inactive fixture', enabled: false }],
        },
      ],
    });
    await service
      .stmt(
        'INSERT INTO stores(id,environment,config_json) VALUES(?,?,?)',
        config.id,
        config.environment,
        JSON.stringify(config),
      )
      .run();
    const adapter = new StripeCheckoutAdapter({
      environment: 'production',
      accountRef: 'acct_fixture',
      webhookSecret: secret,
      client: { webhooks: Stripe.webhooks },
    });
    const handler = createHandler({
      service,
      environment: 'production',
      paymentAdapters: { store_live: adapter },
      publicAbuseGuard: async () => {},
    });
    const raw = JSON.stringify({
      id: 'evt_fixture_live_foreign',
      livemode: true,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_foreign_fixture',
          payment_status: 'paid',
          payment_intent: 'pi_foreign_fixture',
        },
      },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload: raw, secret });
    const response = await handler(
      new Request('https://store-live.example/api/stripe/webhook', {
        method: 'POST',
        body: raw,
        headers: { 'stripe-signature': signature },
      }),
    );
    assert.equal(response.status, 200);
    const context = await (
      await handler(new Request('https://store-live.example/api/storefront-context'))
    ).json();
    assert.equal(context.productionReady, false);
    assert.equal(context.publishOffers, false);
    assert.equal(
      (
        await handler(
          new Request('https://store-live.example/api/orders', { method: 'POST', body: '{}' }),
        )
      ).status,
      503,
    );
    for (const name of ['products', 'inventory', 'orders', 'event_inbox', 'outbox'])
      assert.equal((await db.prepare('SELECT COUNT(*) n FROM ' + name).first()).n, 0);
  } finally {
    db.close();
  }
});
test('own paid asynchronous Checkout still allocates once, replays once and protects its payment ID after metadata removal', async () => {
  const f = await setup();
  try {
    assert.equal(
      (await f.post(f.object, { type: 'checkout.session.async_payment_succeeded' })).status,
      200,
    );
    const paid = await f.service.getOrder('store_a', 'sandbox', f.order.id);
    assert.equal(paid.payment_state, 'paid');
    assert.equal(paid.payment_id, 'pi_shared_fixture');
    const snapshot = await f.snapshot();
    assert.equal(
      (await f.post(f.object, { type: 'checkout.session.async_payment_succeeded' })).status,
      200,
    );
    assert.deepEqual(await f.snapshot(), snapshot);
    const removed = {
      ...f.object,
      id: 'cs_unknown_fixture',
      client_reference_id: null,
      metadata: {},
    };
    assert.equal((await f.post(removed, { eventId: 'evt_removed_fixture' })).status, 403);
    assert.deepEqual(await f.snapshot(), snapshot);
  } finally {
    f.db.close();
  }
});
