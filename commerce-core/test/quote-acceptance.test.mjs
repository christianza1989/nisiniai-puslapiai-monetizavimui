import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { CatalogOperations } from '../src/catalog.mjs';
import { fixtureStore, fixtureProducts, cart, key, fakeCheckout, payment } from './fixtures.mjs';
test('one Stripe PaymentIntent cannot allocate or confirm two different orders', async () => {
  const db = new NodeDatabase();
  db.migrate();
  const s = new CommerceService(db);
  await s.provisionStore(fixtureStore(), fixtureProducts());
  const a = (await s.createOrder('store_a', 'sandbox', cart(), key(1))).order;
  const b = (await s.createOrder('store_a', 'sandbox', cart(), key(2))).order;
  await s.checkout('store_a', 'sandbox', a.id, fakeCheckout);
  await s.checkout('store_a', 'sandbox', b.id, fakeCheckout);
  const first = payment(await s.getOrder('store_a', 'sandbox', a.id));
  await s.acceptPayment('store_a', 'sandbox', first);
  await assert.rejects(
    s.acceptPayment('store_a', 'sandbox', {
      ...payment(await s.getOrder('store_a', 'sandbox', b.id), 'store_a', 'evt_other'),
      paymentId: first.paymentId,
    }),
    /payment_conflict/,
  );
  assert.equal((await s.getOrder('store_a', 'sandbox', b.id)).payment_state, 'pending');
  assert.equal((await s.one("SELECT COUNT(*) n FROM event_inbox WHERE event_id='evt_other'")).n, 0);
  db.close();
});
test('accepted terms and server quote reject a changed price before stock/order writes, while accepted order replays', async () => {
  const db = new NodeDatabase();
  db.migrate();
  const s = new CommerceService(db),
    cfg = { ...fixtureStore(), requireQuote: true, requireTerms: true };
  await s.provisionStore(cfg, fixtureProducts());
  const input = cart(),
    quote = await s.quote('store_a', 'sandbox', input);
  await assert.rejects(
    s.createOrder('store_a', 'sandbox', { ...input, quoteHash: quote.quoteHash }, key(1)),
    /terms_acceptance_required/,
  );
  const body = { ...input, quoteHash: quote.quoteHash, acceptedPolicyVersion: 'fixture_v1' };
  const made = await s.createOrder('store_a', 'sandbox', body, key(1));
  const c = new CatalogOperations(s),
    p = (await c.list('store_a', 'sandbox')).find((p) => p.sku === 'couple');
  await c.revise(
    'store_a',
    'sandbox',
    {
      id: 'price_2',
      basisHash: p.basisHash,
      definition: { ...p, enabled: true, prices: { LT: 3300, PL: 13900 } },
    },
    'operator',
  );
  await assert.rejects(s.createOrder('store_a', 'sandbox', body, key(2)), /quote_price_changed/);
  assert.equal((await s.one('SELECT COUNT(*) n FROM orders')).n, 1);
  assert.equal((await s.createOrder('store_a', 'sandbox', body, key(1))).order.id, made.order.id);
  const fresh = await s.quote('store_a', 'sandbox', input);
  assert.equal(fresh.amount, 3300);
  db.close();
});
