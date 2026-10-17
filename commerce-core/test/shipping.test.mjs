import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { ShippingOperations } from '../src/shipping.mjs';
import { SendparcelAdapter } from '../src/sendparcel-adapter.mjs';
import { planParcels } from '../src/parcels.mjs';
import { createHandler } from '../src/http.mjs';
import { fixtureStore, fixtureProducts, cart, key, fakeCheckout, payment } from './fixtures.mjs';
const env = 'sandbox',
  store = 'store_a',
  actor = 'fixture_operator';
const origin = {
  id: 'origin_1',
  country: 'LT',
  city: 'Vilnius',
  postalCode: '02211',
  isCompany: true,
  reason: 'Patvirtinta siuntimo vieta',
};
const customer = {
  name: 'Testinis Pirkėjas',
  email: 'buyer@example.test',
  phone: '+37060000000',
  address: { country: 'LT', line1: 'Testinė g. 1', city: 'Vilnius', postalCode: '02211' },
};
async function setup(quantity = 1) {
  const db = new NodeDatabase();
  db.migrate();
  const s = new CommerceService(db);
  await s.provisionStore({ ...fixtureStore(), requireCustomer: true }, fixtureProducts(100));
  const result = await s.createOrder(store, env, { ...cart('couple', quantity), customer }, key(1));
  await s.checkout(store, env, result.order.id, fakeCheckout);
  await s.acceptPayment(store, env, payment(await s.getOrder(store, env, result.order.id)));
  const shipping = new ShippingOperations(s);
  await shipping.origin(store, env, origin, actor);
  return { db, s, shipping, order: await s.getOrder(store, env, result.order.id) };
}
function connector(responseFn) {
  const calls = [];
  const adapter = new SendparcelAdapter({
    environment: env,
    accountRef: 'fixture_sendparcel',
    apiPassword: 'fixture_api_password',
    rateLimiter: { run: (_scope, perform) => perform() },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), ...options, body: options.body && JSON.parse(options.body) });
      return Response.json(await responseFn(url, options, calls.length));
    },
  });
  return { adapter, calls };
}
const offer = {
  product: { id: 42, name: 'Fixture shipping', courier_name: 'Test' },
  total_price: { amount_in_cents: 799, currency: 'EUR' },
  delivery: 'Fixture estimate',
  saddresstype: 'door',
  raddresstype: 'door',
};
test('parcel planning handles 30 units and requires exact measured coverage without guessed box sizes', async () => {
  const { db, order } = await setup(30);
  const p = planParcels(order, { mode: 'individual' });
  assert.equal(p.parcels.length, 30);
  assert.equal(p.totalWeightGrams, 60000);
  assert.deepEqual(p.parcels[0].dimensionsMm, [200, 200, 170]);
  assert.throws(
    () =>
      planParcels(order, {
        mode: 'measured',
        measurementNote: 'Pasverta',
        parcels: [
          {
            weightGrams: 62000,
            dimensionsMm: [600, 400, 400],
            lines: [{ sku: 'couple', quantity: 29 }],
          },
        ],
      }),
    /parcel_contents_mismatch/,
  );
  assert.throws(
    () =>
      planParcels(order, {
        mode: 'measured',
        measurementNote: 'Pasverta',
        parcels: [
          {
            weightGrams: 0,
            dimensionsMm: [600, 400, 400],
            lines: [{ sku: 'couple', quantity: 30 }],
          },
        ],
      }),
    /invalid_parcel_dimensions/,
  );
  assert.throws(
    () => planParcels(order, { mode: 'measured', parcels: [] }),
    /invalid_parcel_measurement/,
  );
  assert.equal(
    planParcels(order, {
      mode: 'measured',
      measurementNote: 'Pasverta ir išmatuota',
      parcels: [
        {
          weightGrams: 62000,
          dimensionsMm: [600, 400, 400],
          lines: [{ sku: 'couple', quantity: 30 }],
        },
      ],
    }).parcels.length,
    1,
  );
  db.close();
});
test('immutable parcel plans preserve contents, actor and origin; replay, isolation and payment gates', async () => {
  const { db, s, shipping, order } = await setup();
  const input = {
    id: 'plan_1',
    originId: origin.id,
    mode: 'individual',
    recipientIsCompany: false,
  };
  const first = await shipping.prepare(store, env, order.id, input, actor);
  assert.equal(first.record.payload.value, 3200);
  assert.equal(first.record.payload.recipient.postalCode, '02211');
  assert.equal(first.record.actor_ref, actor);
  assert.equal((await shipping.prepare(store, env, order.id, input, actor)).replayed, true);
  await assert.rejects(
    shipping.origin(store, env, { ...origin, city: 'Kaunas' }, actor),
    /record_conflict/,
  );
  await assert.rejects(
    shipping.prepare(
      store,
      env,
      order.id,
      {
        ...input,
        mode: 'measured',
        measurementNote: 'Pasverta',
        parcels: [
          {
            weightGrams: 2200,
            dimensionsMm: [200, 200, 200],
            lines: [{ sku: 'couple', quantity: 1 }],
          },
        ],
      },
      actor,
    ),
    /record_conflict/,
  );
  await s.provisionStore({ ...fixtureStore('store_b'), requireCustomer: true }, fixtureProducts());
  await assert.rejects(shipping.detail('store_b', env, order.id), /order_not_found/);
  await assert.rejects(
    s.stmt('UPDATE shipping_plans SET payload_json=?', '{}').run(),
    /shipping_record_immutable/,
  );
  await assert.rejects(s.stmt('DELETE FROM shipping_origins').run(), /shipping_record_immutable/);
  await s.confirmRefund(store, env, order.id, {
    providerId: 're_fixture',
    amount: 100,
    currency: 'EUR',
  });
  await assert.rejects(
    shipping.prepare(store, env, order.id, { ...input, id: 'plan_2' }, actor),
    /shipping_plan_not_allowed/,
  );
  assert.equal((await shipping.prepare(store, env, order.id, input, actor)).replayed, true);
  db.close();
});
test('current SP quote protocol converts grams/mm/cents and persists an estimate without changing paid order', async () => {
  const { db, s, shipping, order } = await setup();
  const plan = (
    await shipping.prepare(
      store,
      env,
      order.id,
      { id: 'plan_1', originId: origin.id, mode: 'individual', recipientIsCompany: false },
      actor,
    )
  ).record;
  const { adapter, calls } = connector(() => ({ offers: [offer] }));
  const quote = await shipping.quote(store, env, plan.id, { id: 'quote_1' }, adapter, actor);
  assert.equal(quote.record.payload.offers[0].amount, 799);
  assert.equal(quote.record.payload.bookingAvailable, false);
  assert.equal(quote.record.payload.providerExpiresAt, null);
  assert.deepEqual(calls[0].body.quote.parcels, [{ weight: 2, length: 20, width: 20, height: 17 }]);
  assert.equal(calls[0].body.quote.value, 32);
  assert.equal(calls[0].body.quote.shipper.postal_code, '02211');
  assert.equal(calls[0].redirect, 'error');
  assert.equal(calls[0].headers.authorization, undefined);
  assert.equal(calls[0].headers.password, 'fixture_api_password');
  assert.equal(
    (await shipping.quote(store, env, plan.id, { id: 'quote_1' }, adapter, actor)).replayed,
    true,
  );
  assert.equal(calls.length, 1);
  assert.equal((await s.getOrder(store, env, order.id)).amount, 3200);
  await assert.rejects(
    shipping.quote(
      store,
      env,
      plan.id,
      { id: 'quote_1' },
      { ...adapter, accountRef: 'another_account', quote: adapter.quote },
      actor,
    ),
    /record_conflict/,
  );
  await assert.rejects(
    shipping.quote(
      store,
      env,
      plan.id,
      { id: 'quote_2' },
      { ...adapter, environment: 'production', quote: adapter.quote },
      actor,
    ),
    /carrier_quotes_not_connected/,
  );
  const detail = await shipping.detail(store, env, order.id);
  assert.equal(detail.quotes.length, 1);
  assert.ok(!JSON.stringify(detail).includes('fixture.jwt.signature'));
  db.close();
});
test('SP locker pagination filters country and rejects changing or duplicate pages', async () => {
  const row = {
    id: 1,
    name: 'Fixture locker',
    address: 'Testinė g. 1',
    zip: '02211',
    country: 'LT',
    cityName: 'Vilnius',
    termtype: 'dpd',
    postbox_id: 'LT001',
  };
  const { adapter, calls } = connector((_u, _o, n) => ({
    page: n,
    totalPages: 2,
    perPage: 100,
    postboxes: [{ ...row, id: n, country: n === 1 ? 'LV' : 'LT' }],
  }));
  assert.equal((await adapter.lockers('LT', 'dpd')).length, 1);
  assert.equal(new URL(calls[0].url).searchParams.get('filter[type][]'), 'dpd');
  assert.equal(calls[0].method, 'POST');
  await assert.rejects(
    connector((_u, _o, n) => ({
      page: n,
      totalPages: n === 1 ? 2 : 3,
      postboxes: [{ ...row, id: n }],
    })).adapter.lockers('LT', 'dpd'),
    /carrier_search_incomplete/,
  );
  await assert.rejects(
    connector((_u, _o, n) => ({ page: n, totalPages: 2, postboxes: [row] })).adapter.lockers(
      'LT',
      'dpd',
    ),
    /carrier_search_incomplete/,
  );
  const { db, shipping } = await setup();
  const c = connector(() => ({ page: 1, totalPages: 1, postboxes: [row] }));
  const snapshot = await shipping.lockers(
    store,
    env,
    { id: 'locker_1', country: 'LT', courier: 'dpd' },
    c.adapter,
    actor,
  );
  assert.equal(snapshot.record.payload.lockers[0].carrierLockerId, 'LT001');
  assert.equal(
    (
      await shipping.lockers(
        store,
        env,
        { id: 'locker_1', country: 'LT', courier: 'dpd' },
        c.adapter,
        actor,
      )
    ).replayed,
    true,
  );
  assert.equal(c.calls.length, 1);
  db.close();
});
test('SP credentials and read-only operation allowlist reject production, redirects, invalid response and price facts', async () => {
  assert.throws(
    () =>
      new SendparcelAdapter({
        environment: 'production',
        accountRef: 'a',
        apiPassword: 'fixture_api_password',
        rateLimiter: { run: (_scope, perform) => perform() },
      }),
    /carrier_environment_not_admitted/,
  );
  assert.throws(
    () =>
      new SendparcelAdapter({
        environment: env,
        baseUrl: 'https://attacker.example',
        accountRef: 'a',
        apiPassword: 'fixture_api_password',
        rateLimiter: { run: (_scope, perform) => perform() },
      }),
    /carrier_environment_not_admitted/,
  );
  const { adapter, calls } = connector(() => ({ offers: [] }));
  await assert.rejects(
    adapter.request('/rest-api/orders/creates', {}),
    /carrier_operation_not_admitted/,
  );
  assert.equal(calls.length, 0);
  adapter.fetch = async () => new Response('private error credential material', { status: 401 });
  await assert.rejects(adapter.request('/rest-api/quotes', {}), /carrier_request_failed/);
  adapter.fetch = async () =>
    new Response('<html>wrong</html>', { headers: { 'content-type': 'text/html' } });
  await assert.rejects(adapter.request('/rest-api/quotes', {}), /carrier_response_invalid/);
  adapter.fetch = async () =>
    Response.json({
      offers: [{ ...offer, total_price: { amount_in_cents: 7.99, currency: 'EUR' } }],
    });
  await assert.rejects(
    adapter.quote({
      sender: { country: 'LT', city: 'Vilnius', postalCode: '02211' },
      recipient: { country: 'LT', city: 'Vilnius', postalCode: '02211' },
      parcels: [{ weightGrams: 2000, dimensionsMm: [200, 200, 170] }],
      value: 3200,
      currency: 'EUR',
    }),
    /carrier_offer_invalid/,
  );
  adapter.fetch = async () => Response.json({ large: '0123456789012345' });
  await assert.rejects(
    adapter.request('/rest-api/quotes', {}, {}, 4),
    /carrier_response_too_large/,
  );
});
test('SP documents are private PDF bytes, tracking retains unknown timezone and validates real calendar dates', async () => {
  const { adapter } = connector(() => [
    { file_name: 'terms.pdf', ftype: 'application/pdf', file_data: btoa('%PDF-1.7\nfixture') },
  ]);
  const docs = await adapter.documents('123');
  assert.equal(docs[0].private, true);
  assert.equal(docs[0].filename, 'shipment-document-1.pdf');
  assert.equal(docs[0].providerFilename, 'terms.pdf');
  assert.equal(docs[0].kind, 'document');
  assert.equal(new TextDecoder().decode(docs[0].bytes).slice(0, 5), '%PDF-');
  adapter.fetch = async () =>
    Response.json([{ ftype: 'application/pdf', file_data: btoa('<html>wrong') }]);
  await assert.rejects(adapter.documents('123'), /carrier_document_invalid/);
  adapter.fetch = async () =>
    Response.json({
      info: [{ date: '2026-10-12 12:00:00', event: 'Fixture scan', location: 'Vilnius' }],
    });
  assert.equal((await adapter.tracking('123'))[0].timezone, null);
  adapter.fetch = async () =>
    Response.json({
      info: [{ date: '2026-02-30 12:00:00', event: 'Fixture scan', location: 'Vilnius' }],
    });
  await assert.rejects(adapter.tracking('123'), /carrier_tracking_invalid/);
});
test('SP route-only no-scan tracking is empty history while errors and malformed bodies remain invalid', async () => {
  const { adapter } = connector(() => ({ from: 'Vilnius, Lithuania', to: 'Kaunas, Lithuania' }));
  assert.deepEqual(await adapter.tracking('123'), []);
  for (const row of [
    {},
    { from: 'Vilnius' },
    { from: '', to: 'Kaunas' },
    { from: 'Vilnius', to: 'Kaunas', error: 'private provider error' },
    { from: 'Vilnius', to: 'Kaunas', info: null },
    { from: 'Vilnius', to: 'Kaunas', info: {} },
  ]) {
    adapter.fetch = async () => Response.json(row);
    await assert.rejects(adapter.tracking('123'), /carrier_tracking_invalid/);
  }
});

test('shipping HTTP mutations require ship grant, same origin and test environment; missing provider blocks only quotes', async () => {
  const { db, s, order } = await setup();
  let grants = ['read'];
  const h = createHandler({
    service: s,
    environment: env,
    operatorAuthorize: async () => ({ id: actor, storeId: store, permissions: grants }),
  });
  const post = (path, body, headers = {}) =>
    h(
      new Request('https://store-a.example' + path, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(body),
      }),
    );
  assert.equal(
    (await post('/api/operator/shipping-origins', { ...origin, id: 'origin_2' })).status,
    403,
  );
  grants = ['read', 'ship'];
  assert.equal(
    (
      await post(
        '/api/operator/shipping-origins',
        { ...origin, id: 'origin_2' },
        { origin: 'https://attacker.example' },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await post('/api/operator/orders/' + order.id + '/shipping-plans', {
        id: 'plan_1',
        originId: origin.id,
        mode: 'individual',
        recipientIsCompany: false,
      })
    ).status,
    200,
  );
  assert.equal(
    (await post('/api/operator/shipping-plans/plan_1/quotes', { id: 'quote_1' })).status,
    503,
  );
  const response = await h(new Request('https://store-a.example/api/operator/orders/' + order.id));
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).shippingPreparation.plans.length, 1);
  db.close();
});
