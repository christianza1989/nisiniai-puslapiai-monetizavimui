import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { PaymentDisputes } from '../src/disputes.mjs';
import { fixtureStore, fixtureProducts, cart, key, payment } from './fixtures.mjs';
test('payment dispute facts are account-bound, immutable and ordered by provider time without refund/stock side effects', async () => {
  const db = new NodeDatabase();
  db.migrate();
  const s = new CommerceService(db);
  await s.provisionStore(fixtureStore(), fixtureProducts());
  await s.provisionStore(fixtureStore('store_b'), fixtureProducts());
  const order = (await s.createOrder('store_a', 'sandbox', cart(), key(1))).order;
  await s.acceptPayment('store_a', 'sandbox', payment(order));
  const d = new PaymentDisputes(s),
    fact = {
      kind: 'dispute',
      id: 'evt_dispute1',
      environment: 'sandbox',
      accountRef: 'store_a_sandbox',
      disputeId: 'dp_fixture1',
      paymentId: (await s.getOrder('store_a', 'sandbox', order.id)).payment_id,
      amount: 3200,
      currency: 'EUR',
      status: 'needs_response',
      reason: 'product_not_received',
      createdAt: 10000,
      evidenceDueAt: 90000,
    };
  await d.accept('store_a', 'sandbox', fact);
  await d.accept('store_a', 'sandbox', {
    ...fact,
    id: 'evt_dispute2',
    status: 'won',
    createdAt: 20000,
  });
  await d.accept('store_a', 'sandbox', { ...fact, id: 'evt_dispute3', createdAt: 15000 });
  assert.equal((await d.list('store_a', 'sandbox', order.id))[0].status, 'won');
  assert.equal((await d.accept('store_a', 'sandbox', fact)).replayed, true);
  await assert.rejects(
    d.accept('store_a', 'sandbox', { ...fact, amount: 3100 }),
    /dispute_event_conflict/,
  );
  await assert.rejects(d.accept('store_b', 'sandbox', fact), /dispute_account_mismatch/);
  assert.deepEqual(await d.list('store_b', 'sandbox'), []);
  const current = await s.getOrder('store_a', 'sandbox', order.id);
  assert.equal(current.payment_state, 'paid');
  assert.equal(current.refunded_amount, 0);
  assert.equal(current.stock_state, 'allocated');
  assert.equal((await s.one('SELECT COUNT(*) n FROM refunds')).n, 0);
  db.close();
});
