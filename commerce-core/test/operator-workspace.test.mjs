import test from 'node:test';
import assert from 'node:assert/strict';
import { orderMatches } from '../public/operator-workspace.mjs';
const now = 100000,
  base = {
    id: 'Aa1234',
    payment_state: 'pending',
    stock_state: 'reserved',
    fulfillment_state: 'pending',
    expires_at: now + 1,
    snapshot: {
      customer: { name: 'Ąžuolas Žilinskas', email: 'owner@example.test' },
      lines: [{ title: 'Šeimos rinkinys' }],
    },
  };
test('operator filters distinguish active/expired/withdrawn and paid fulfillment without changing records', () => {
  assert.equal(orderMatches(base, 'active', '', now), true);
  assert.equal(orderMatches({ ...base, expires_at: now }, 'active', '', now), false);
  assert.equal(
    orderMatches({ ...base, expires_at: now, stock_state: 'released' }, 'expired', '', now),
    true,
  );
  assert.equal(
    orderMatches(
      { ...base, expires_at: now, stock_state: 'released', fulfillment_state: 'canceled' },
      'expired',
      '',
      now,
    ),
    false,
  );
  assert.equal(
    orderMatches(
      { ...base, payment_state: 'paid', stock_state: 'allocated' },
      'fulfillment',
      '',
      now,
    ),
    true,
  );
  assert.equal(orderMatches(base, 'fulfillment', '', now), false);
  assert.equal(orderMatches({ ...base, payment_state: 'refunded' }, 'paid', '', now), false);
  assert.equal(orderMatches({ ...base, payment_state: 'refunded' }, 'refunds', '', now), true);
  assert.equal(base.stock_state, 'reserved');
});
test('operator local search retains Lithuanian case, numeric IDs, product and email matching', () => {
  for (const query of ['ąŽUOLAS', '  AA1234  ', 'šeimos', 'owner@'])
    assert.equal(orderMatches(base, 'all', query, now), true);
  assert.equal(orderMatches(base, 'paid', 'šeimos', now), false);
  assert.equal(orderMatches(base, 'all', 'missing', now), false);
  assert.equal(orderMatches({ ...base, snapshot: undefined }, 'all', 'Aa1234', now), true);
});
