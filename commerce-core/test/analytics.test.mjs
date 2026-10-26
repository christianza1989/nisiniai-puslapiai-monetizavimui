import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import {
  CommerceAnalytics,
  Ga4MeasurementAdapter,
  analyticsConnections,
  analyticsSale,
} from '../src/analytics.mjs';
import { createHandler } from '../src/http.mjs';
import Stripe from 'stripe';
import { StripeCheckoutAdapter } from '../src/stripe-adapter.mjs';
import { fixtureStore, fixtureProducts, cart, key, fakeCheckout, payment } from './fixtures.mjs';
const store = 'store_a',
  env = 'sandbox',
  now = 1792926000000;
async function setup() {
  const db = new NodeDatabase();
  db.migrate();
  let time = now;
  const s = new CommerceService(db, { now: () => time });
  await s.provisionStore(fixtureStore(), fixtureProducts());
  await s.provisionStore(fixtureStore('store_b'), fixtureProducts());
  const sent = [],
    adapter = {
      environment: env,
      measurementId: 'G-TEST000001',
      consentVersion: 2,
      countries: ['LT'],
      send: async (payload) => {
        sent.push(payload);
        return { accepted: true, code: 'http_204' };
      },
    };
  const analytics = new CommerceAnalytics(s, { [store]: adapter });
  const { order, accessToken } = await s.createOrder(store, env, cart(), key(1));
  const context = {
    choice: 'granted',
    version: 2,
    at: now - 1000,
    expiresAt: now + 86400000,
    clientId: '12345678.1792926000',
    sessionId: String(Math.floor(now / 1000)),
    measurementId: adapter.measurementId,
    language: 'lt',
  };
  const paid = async () => {
    await s.checkout(store, env, order.id, fakeCheckout);
    time += 100;
    const current = await s.getOrder(store, env, order.id);
    await s.acceptPayment(store, env, payment(current));
    return s.getOrder(store, env, order.id);
  };
  return {
    db,
    s,
    adapter,
    analytics,
    order,
    accessToken,
    context,
    sent,
    paid,
    setTime: (v) => (time = v),
  };
}
test('optional config is off/isolated by default and malformed optional settings never break commerce', () => {
  for (const value of [undefined, '{', 'null', '[]', '"x"'])
    assert.deepEqual(analyticsConnections(value, 'production'), {});
  const config = {
    store_a: {
      enabled: true,
      environment: 'sandbox',
      measurementId: 'G-TEST000001',
      apiSecret: 'fixture_secret_not_real',
      consentVersion: 2,
      countries: ['LT'],
    },
  };
  assert.equal(Object.keys(analyticsConnections(JSON.stringify(config), 'production')).length, 0);
  assert.equal(Object.keys(analyticsConnections(JSON.stringify(config), 'sandbox')).length, 1);
});
test('unpaid order never queues, signed paid fact emits exact money once and replay is deduplicated', async () => {
  const f = await setup();
  await f.analytics.capture(store, env, f.order, f.context);
  await f.analytics.dispatch(store, env);
  assert.equal(f.sent.length, 0);
  const order = await f.paid();
  await Promise.all([f.analytics.dispatch(store, env), f.analytics.dispatch(store, env)]);
  assert.equal(f.sent.length, 1);
  const p = f.sent[0],
    e = p.events[0];
  assert.equal(e.name, 'purchase');
  assert.equal(e.params.value, 32);
  assert.equal(e.params.shipping, 0);
  assert.equal(e.params.currency, 'EUR');
  assert.equal(e.params.session_id, 1792926000);
  assert.equal(e.params.items[0].quantity, 1);
  assert.match(e.params.transaction_id, /^MC-[0-9a-f]{40}$/);
  assert.equal(p.client_id, f.context.clientId);
  assert.doesNotMatch(
    JSON.stringify(p),
    /email|customer|accessToken|payment_id|address|pi_|cs_|Test couple/,
  );
  await f.s.acceptPayment(store, env, payment(order));
  await f.analytics.dispatch(store, env);
  assert.equal(f.sent.length, 1);
  f.db.close();
});
test('no consent, revoked consent, expired consent, wrong tenant/version/locale and old paid backfill are closed', async () => {
  const f = await setup();
  for (const bad of [
    { ...f.context, version: 1 },
    { ...f.context, clientId: 'private@example.test' },
    { ...f.context, at: now + 1 },
    { ...f.context, expiresAt: now - 1 },
    { ...f.context, measurementId: 'G-FOREIGN001' },
    { ...f.context, language: 'pl' },
    { ...f.context, extra: 'private' },
  ])
    await assert.rejects(f.analytics.capture(store, env, f.order, bad));
  await f.analytics.capture(store, env, f.order, f.context);
  await f.analytics.capture(store, env, f.order, { choice: 'denied', version: 2 });
  await f.paid();
  await f.analytics.dispatch(store, env);
  assert.equal(f.sent.length, 0);
  await assert.rejects(
    f.analytics.capture(store, env, await f.s.getOrder(store, env, f.order.id), f.context),
    /analytics_context_closed/,
  );
  f.db.close();
  const none = await setup();
  await none.paid();
  await none.analytics.dispatch(store, env);
  assert.equal(none.sent.length, 0);
  none.db.close();
});
test('purchase network failure retries same transaction; server refund facts use money and do not invent item quantities', async () => {
  const f = await setup();
  await f.analytics.capture(store, env, f.order, f.context);
  await f.paid();
  let attempt = 0;
  f.adapter.send = async (payload) => {
    f.sent.push(payload);
    return { accepted: ++attempt > 1, code: attempt > 1 ? 'http_204' : 'transport_unknown' };
  };
  assert.equal((await f.analytics.dispatch(store, env)).pending, 1);
  f.setTime(now + 120000);
  await f.analytics.dispatch(store, env);
  assert.equal(f.sent.length, 2);
  assert.equal(
    f.sent[0].events[0].params.transaction_id,
    f.sent[1].events[0].params.transaction_id,
  );
  await f.s.confirmRefund(store, env, f.order.id, {
    providerId: 're_fixture_1',
    amount: 500,
    currency: 'EUR',
  });
  await f.analytics.dispatch(store, env);
  assert.equal(f.sent[2].events[0].name, 'refund');
  assert.equal(f.sent[2].events[0].params.value, 5);
  assert.equal(f.sent[2].events[0].params.items, undefined);
  await f.analytics.dispatch(store, env);
  assert.equal(f.sent.length, 3);
  f.db.close();
});
test('expired/withdrawn context and uncertain refund do not silently retry external refunds', async () => {
  const f = await setup();
  await f.analytics.capture(store, env, f.order, f.context);
  await f.paid();
  await f.analytics.dispatch(store, env);
  await f.s.confirmRefund(store, env, f.order.id, {
    providerId: 're_fixture_unknown',
    amount: 500,
    currency: 'EUR',
  });
  f.adapter.send = async () => ({ accepted: false, code: 'transport_unknown' });
  assert.equal((await f.analytics.dispatch(store, env)).review, 1);
  f.setTime(now + 3600000);
  assert.equal((await f.analytics.dispatch(store, env)).review, 0);
  assert.equal(
    (await f.s.one("SELECT state FROM analytics_delivery WHERE kind='refund'")).state,
    'review',
  );
  await f.analytics.capture(store, env, await f.s.getOrder(store, env, f.order.id), {
    choice: 'denied',
    version: 2,
  });
  assert.equal((await f.s.one('SELECT client_id FROM order_analytics')).client_id, null);
  f.db.close();
});
test('paid projection checks cents; configured variants included but editable names and PII never leave', () => {
  const order = {
    amount: 4024,
    currency: 'EUR',
    snapshot: {
      schemaVersion: 2,
      currency: 'EUR',
      customer: { email: 'private@example.test' },
      delivery: { amount: 524 },
      lines: [
        {
          sku: 'couple',
          quantity: 1,
          unitAmount: 3500,
          lineAmount: 3500,
          title: 'private@example.test',
          choices: { paint: 'gold' },
        },
      ],
    },
  };
  const sale = analyticsSale(order);
  assert.equal(sale.value, 35);
  assert.equal(sale.shipping, 5.24);
  assert.equal(sale.items[0].item_variant, 'paint:gold');
  assert.doesNotMatch(JSON.stringify(sale), /private|title|customer/);
  assert.throws(() => analyticsSale({ ...order, amount: 4000 }), /analytics_total_mismatch/);
});
test('HTTP attribution requires order bearer and same origin; disabled integration is not available', async () => {
  const f = await setup(),
    api = createHandler({
      service: f.s,
      environment: env,
      analyticsAdapters: { [store]: f.adapter },
    });
  const req = (token, origin = 'https://store-a.example') =>
    new Request('https://store-a.example/api/orders/' + f.order.id + '/analytics', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token, origin },
      body: JSON.stringify(f.context),
    });
  assert.equal((await api(req('wrong'))).status, 403);
  assert.equal((await api(req(f.accessToken, 'https://evil.test'))).status, 403);
  assert.equal((await api(req(f.accessToken))).status, 200);
  const disabled = createHandler({ service: f.s, environment: env });
  assert.equal((await disabled(req(f.accessToken))).status, 503);
  f.db.close();
});
test('MP transport fixes EU destination, forbids redirects, bounds errors and validates without recording a fake purchase', async () => {
  const calls = [],
    adapter = new Ga4MeasurementAdapter(
      { measurementId: 'G-TEST000001', apiSecret: 'fixture_secret_not_real', environment: env },
      async (url, init) => {
        calls.push({ url, init });
        return Response.json({ validationMessages: [] });
      },
    );
  const payload = {
    client_id: '1.1',
    events: [
      {
        name: 'purchase',
        params: {
          currency: 'EUR',
          value: 32,
          transaction_id: 'TEST_ONLY',
          items: [{ item_id: 'couple', price: 32, quantity: 1 }],
        },
      },
    ],
  };
  assert.deepEqual(await adapter.send(payload, { validate: true }), {
    accepted: true,
    validationMessages: [],
  });
  assert.equal(calls[0].url.origin, 'https://region1.google-analytics.com');
  assert.equal(calls[0].url.pathname, '/debug/mp/collect');
  assert.equal(calls[0].init.redirect, 'manual');
  assert.equal(JSON.parse(calls[0].init.body).validation_behavior, 'ENFORCE_RECOMMENDATIONS');
});
test('real SDK signature through HTTP rejects unsigned/unpaid facts; paid asynchronous replay reaches one analytics event', async () => {
  const f = await setup(),
    secret = 'analytics_signed_fixture_only';
  await f.analytics.capture(store, env, f.order, f.context);
  await f.s.checkout(store, env, f.order.id, fakeCheckout);
  const order = await f.s.getOrder(store, env, f.order.id);
  const adapter = new StripeCheckoutAdapter({
      environment: env,
      accountRef: 'store_a_sandbox',
      webhookSecret: secret,
      client: { webhooks: Stripe.webhooks },
    }),
    api = createHandler({ service: f.s, environment: env, paymentAdapters: { [store]: adapter } });
  const object = {
    id: order.checkout_id,
    currency: 'eur',
    amount_total: order.amount,
    payment_status: 'unpaid',
    payment_intent: 'pi_analytics_fixture',
    client_reference_id: order.id,
    metadata: { store_id: store, environment: env, order_id: order.id },
  };
  async function send(id, type, paid, tamper = false) {
    const raw = JSON.stringify({
      id,
      type,
      livemode: false,
      data: { object: { ...object, payment_status: paid ? 'paid' : 'unpaid' } },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload: raw, secret });
    return api(
      new Request('https://store-a.example/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': tamper ? 'invalid' : signature },
        body: raw,
      }),
    );
  }
  assert.equal((await send('evt_invalid', 'checkout.session.completed', true, true)).status, 400);
  assert.equal((await send('evt_unpaid', 'checkout.session.completed', false)).status, 200);
  await f.analytics.dispatch(store, env);
  assert.equal(f.sent.length, 0);
  assert.equal(
    (await send('evt_asyncpaid', 'checkout.session.async_payment_succeeded', true)).status,
    200,
  );
  assert.equal(
    (await send('evt_asyncpaid', 'checkout.session.async_payment_succeeded', true)).status,
    200,
  );
  assert.equal((await send('evt_paidcompleted', 'checkout.session.completed', true)).status, 200);
  await f.analytics.dispatch(store, env);
  assert.equal(f.sent.length, 1);
  assert.equal(f.sent[0].events[0].params.value, 32);
  assert.equal((await f.s.one('SELECT COUNT(*) n FROM analytics_delivery')).n, 1);
  f.db.close();
});
