import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { Discounts, settledLines, normalizeDiscountCode } from '../src/discounts.mjs';
import { analyticsSale } from '../src/analytics.mjs';
import { StripeCheckoutAdapter } from '../src/stripe-adapter.mjs';
import { fixtureStore, fixtureProducts, key, fakeCheckout } from './fixtures.mjs';
const cart = () => ({
  lines: [{ sku: 'couple', quantity: 1 }],
  country: 'LT',
  currency: 'EUR',
  deliveryId: 'test_delivery',
});
async function setup(t) {
  const db = new NodeDatabase();
  db.migrate();
  t.after(() => db.close());
  let now = Date.parse('2026-10-26T08:00:00Z');
  const s = new CommerceService(db, { now: () => now });
  for (const id of ['store_a', 'store_b'])
    await s.provisionStore(fixtureStore(id), fixtureProducts(100));
  return { s, d: new Discounts(s), clock: (v) => (now = v) };
}
const definition = (patch = {}) => ({
  id: crypto.randomUUID(),
  commandId: crypto.randomUUID(),
  expectedVersion: 0,
  code: 'DOVANA10',
  kind: 'percent',
  value: 10,
  enabled: true,
  minimumSubtotal: 0,
  ...patch,
});
const save = (d, p, store = 'store_a') => d.save(store, 'sandbox', p, 'owner');

test('percentage and EUR coupons quote server prices, shipping stays separate and tenants are isolated', async (t) => {
  const { s, d } = await setup(t);
  await save(d, definition());
  const q = await s.quote('store_a', 'sandbox', {
    ...cart(),
    discountCode: ' dovana10 ',
    amount: 1,
  });
  assert.equal(q.amount, 2880);
  assert.equal(q.discount.amount, 320);
  assert.equal(q.lines[0].unitAmount, 3200);
  assert.equal(q.lines[0].netLineAmount, 2880);
  const preview = await d.preview('store_a', 'sandbox', {
    lines: cart().lines,
    country: 'LT',
    currency: 'EUR',
    code: 'DOVANA10',
  });
  assert.equal(preview.amount, 2880);
  assert.equal(preview.discount.code, 'DOVANA10');
  assert.equal(preview.discount.id, undefined);
  await assert.rejects(
    s.quote('store_b', 'sandbox', { ...cart(), discountCode: 'DOVANA10' }),
    /discount_unavailable/,
  );
  const fixed = definition({ code: 'PENKI', kind: 'fixed', value: 500 });
  await save(d, fixed);
  assert.equal(
    (await s.quote('store_a', 'sandbox', { ...cart(), discountCode: 'PENKI' })).amount,
    2700,
  );
  await assert.rejects(
    s.quote('store_a', 'sandbox', {
      ...cart(),
      country: 'PL',
      currency: 'PLN',
      discountCode: 'PENKI',
    }),
    /discount_unavailable/,
  );
  assert.equal((await s.quote('store_a', 'sandbox', cart())).discount, undefined);
  const shipping = fixtureStore('store_shipping');
  shipping.markets[0].delivery[0].amount = 450;
  await s.provisionStore(shipping, fixtureProducts());
  await save(d, definition(), 'store_shipping');
  const delivered = await s.quote('store_shipping', 'sandbox', {
    ...cart(),
    discountCode: 'DOVANA10',
  });
  assert.equal(delivered.amount, 3330);
  assert.equal(delivered.delivery.amount, 450);
  assert.equal(delivered.discount.amount, 320);
});
test('dates, minimum, disabled codes and zero-total cases fail explicitly before reserving stock', async (t) => {
  const { s, d, clock } = await setup(t),
    now = Date.parse('2026-10-26T08:00:00Z');
  for (const [code, patch, error] of [
    ['FUTURE', { startsAt: now + 1000 }, 'discount_unavailable'],
    ['ENDED', { endsAt: now }, 'discount_unavailable'],
    ['CLOSED', { enabled: false }, 'discount_unavailable'],
    ['BASKET', { minimumSubtotal: 4000 }, 'discount_minimum_not_met'],
    ['TOOBIG', { kind: 'fixed', value: 3200 }, 'discount_basket_too_small'],
  ]) {
    await save(d, definition({ code, ...patch }));
    await assert.rejects(
      s.quote('store_a', 'sandbox', { ...cart(), discountCode: code }),
      new RegExp(error),
    );
  }
  const p = definition({ code: 'TIMED', endsAt: now + 1000 });
  await save(d, p);
  const created = await s.createOrder(
    'store_a',
    'sandbox',
    { ...cart(), discountCode: 'TIMED' },
    key(1),
  );
  clock(now + 2000);
  await assert.rejects(
    s.quote('store_a', 'sandbox', { ...cart(), discountCode: 'TIMED' }),
    /discount_unavailable/,
  );
  await s.checkout('store_a', 'sandbox', created.order.id, fakeCheckout);
  assert.equal((await s.getOrder('store_a', 'sandbox', created.order.id)).amount, 2880);
});
test('atomic usage cap, request replay and rollback preserve one redemption and stock', async (t) => {
  const { s, d } = await setup(t),
    p = definition({ maxUses: 1 });
  await save(d, p);
  const results = await Promise.allSettled(
    [1, 2].map((n) =>
      s.createOrder('store_a', 'sandbox', { ...cart(), discountCode: p.code }, key(n)),
    ),
  );
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.match(
    results.find((r) => r.status === 'rejected').reason.message,
    /discount_(limit_reached|unavailable)/,
  );
  const index = results.findIndex((r) => r.status === 'fulfilled'),
    order = results[index].value.order;
  assert.equal(
    (await s.createOrder('store_a', 'sandbox', { ...cart(), discountCode: p.code }, key(index + 1)))
      .order.id,
    order.id,
  );
  assert.equal((await d.list('store_a', 'sandbox'))[0].uses, 1);
  assert.equal((await s.one('SELECT COUNT(*) n FROM orders WHERE store_id=?', 'store_a')).n, 1);
  assert.equal(
    (await s.one('SELECT available FROM inventory WHERE store_id=? AND sku=?', 'store_a', 'couple'))
      .available,
    99,
  );
  await assert.rejects(
    save(d, { ...p, commandId: crypto.randomUUID(), expectedVersion: 1, maxUses: 0 }),
    /invalid_discount/,
  );
  await assert.rejects(
    s.createOrder('store_a', 'sandbox', cart(), key(index + 1)),
    /idempotency_conflict/,
  );
});
test('saved code changes are versioned and idempotent; stale quotes cannot alter order pricing', async (t) => {
  const { s, d } = await setup(t),
    p = definition();
  const first = await save(d, p);
  assert.equal(first.discount.version, 1);
  assert.equal((await save(d, p)).replayed, true);
  await assert.rejects(save(d, { ...p, value: 20 }), /discount_save_conflict/);
  const quote = await s.quote('store_a', 'sandbox', { ...cart(), discountCode: p.code });
  await save(d, { ...p, commandId: crypto.randomUUID(), expectedVersion: 1, value: 20 });
  await assert.rejects(
    save(d, { ...p, commandId: crypto.randomUUID(), expectedVersion: 1, value: 15 }),
    /discount_version_conflict/,
  );
  await assert.rejects(
    s.createOrder(
      'store_a',
      'sandbox',
      { ...cart(), discountCode: p.code, quoteHash: quote.quoteHash },
      key(1),
    ),
    /quote_price_changed/,
  );
  await assert.rejects(save(d, definition({ code: p.code })), /discount_code_exists/);
  assert.equal((await s.one('SELECT COUNT(*) n FROM orders')).n, 0);
});
test('a saved maximum cannot be lowered below already claimed orders, including unpaid ones', async (t) => {
  const { s, d } = await setup(t),
    p = definition();
  await save(d, p);
  for (const n of [1, 2])
    await s.createOrder('store_a', 'sandbox', { ...cart(), discountCode: p.code }, key(n));
  await assert.rejects(
    save(d, { ...p, commandId: crypto.randomUUID(), expectedVersion: 1, maxUses: 1 }),
    /discount_limit_below_uses/,
  );
  assert.equal((await d.list('store_a', 'sandbox'))[0].uses, 2);
});
test('proportional cents stay exact across quantities, Stripe items and GA4 net revenue', async (t) => {
  const { s, d } = await setup(t),
    p = definition({ code: 'CENTAI', kind: 'fixed', value: 501 });
  await save(d, p);
  const input = {
    ...cart(),
    lines: [
      { sku: 'couple', quantity: 3 },
      { sku: 'family', quantity: 1 },
    ],
    discountCode: p.code,
  };
  const { order } = await s.createOrder('store_a', 'sandbox', input, key(1));
  assert.equal(order.amount, 13899);
  const net = settledLines(order.snapshot);
  assert.equal(
    net.reduce((n, l) => n + l.lineAmount, 0),
    13899,
  );
  assert.equal(
    net.reduce((n, l) => n + l.quantity, 0),
    4,
  );
  const ga = analyticsSale(order);
  assert.equal(ga.value, 138.99);
  assert.equal(
    ga.items.reduce((n, l) => n + l.quantity, 0),
    4,
  );
  let captured;
  const adapter = new StripeCheckoutAdapter({
    accountRef: 'store_a_sandbox',
    webhookSecret: 'whsec_fixture',
    environment: 'sandbox',
    client: {
      checkout: {
        sessions: {
          create: async (p) => {
            captured = p;
            return { id: 'cs_discount_fixture', url: 'https://checkout.stripe.test/fixture' };
          },
        },
      },
    },
  });
  await s.checkout('store_a', 'sandbox', order.id, adapter);
  assert.equal(
    captured.line_items.reduce((n, l) => n + l.price_data.unit_amount * l.quantity, 0),
    order.amount,
  );
  assert.equal(
    captured.line_items.reduce((n, l) => n + l.quantity, 0),
    4,
  );
  assert.equal(captured.allow_promotion_codes, undefined);
  assert.ok(captured.line_items.length <= 41);
});
test('normalization and definition reject invalid percentages and malformed codes', async (t) => {
  const { d } = await setup(t);
  assert.equal(normalizeDiscountCode(' dovana-10 '), 'DOVANA-10');
  for (const code of ['a', '<script>', {}, 'A'.repeat(41)])
    assert.throws(() => normalizeDiscountCode(code), /invalid_discount_code/);
  for (const patch of [
    { value: 100 },
    { value: 0 },
    { value: 10.5 },
    { endsAt: 1, startsAt: 2 },
    { enabled: 'true' },
    { minimumSubtotal: -1 },
  ])
    await assert.rejects(save(d, definition(patch)), /invalid_discount/);
});

test('an extreme coupon cannot create a sub-50-cent EUR payment, while paid delivery can satisfy the floor', async (t) => {
  const { s, d } = await setup(t);
  await save(d, definition({ code: 'NINETY9', value: 99 }));
  const input = { ...cart(), discountCode: 'NINETY9' };
  assert.equal((await d.preview('store_a', 'sandbox', { ...cart(), code: 'NINETY9' })).amount, 32);
  await assert.rejects(
    s.createOrder('store_a', 'sandbox', input, key(1)),
    /discount_basket_too_small/,
  );
  assert.equal((await s.one('SELECT COUNT(*) n FROM orders')).n, 0);
  const config = fixtureStore('store_floor');
  config.markets[0].delivery[0].amount = 450;
  await s.provisionStore(config, fixtureProducts());
  await save(d, definition({ code: 'NINETY9', value: 99 }), 'store_floor');
  assert.equal((await s.quote('store_floor', 'sandbox', input)).amount, 482);
});
