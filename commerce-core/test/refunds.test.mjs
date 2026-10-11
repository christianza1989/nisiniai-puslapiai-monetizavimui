import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { RefundCommands, REFUND_RETRY_WINDOW } from '../src/refunds.mjs';
import { StripeCheckoutAdapter } from '../src/stripe-adapter.mjs';
import { createHandler } from '../src/http.mjs';
import { fixtureStore, fixtureProducts, cart, key, fakeCheckout, payment } from './fixtures.mjs';
const store = 'store_a',
  env = 'sandbox',
  actor = 'fixture_operator';
async function setup(clock) {
  const db = new NodeDatabase();
  db.migrate();
  const s = new CommerceService(db, clock);
  await s.provisionStore(fixtureStore(), fixtureProducts());
  const { order } = await s.createOrder(store, env, cart(), key(1));
  await s.checkout(store, env, order.id, fakeCheckout);
  await s.acceptPayment(store, env, payment(await s.getOrder(store, env, order.id)));
  return { db, s, r: new RefundCommands(s), order: await s.getOrder(store, env, order.id) };
}
function adapter() {
  const records = new Map();
  let calls = 0,
    lose = false,
    status = 'succeeded';
  return {
    environment: env,
    accountRef: 'store_a_sandbox',
    records,
    get calls() {
      return calls;
    },
    lose() {
      lose = true;
    },
    setStatus(value) {
      status = value;
    },
    findRefund: async (c) => ({ complete: true, refund: records.get(c.id) || null }),
    createRefund: async (c) => {
      calls++;
      const fact = {
        environment: env,
        accountRef: 'store_a_sandbox',
        providerId: 're_' + c.id,
        paymentId: c.payment_id,
        amount: c.amount,
        currency: c.currency,
        status,
        commandId: c.id,
      };
      records.set(c.id, fact);
      if (lose) {
        lose = false;
        throw new Error('response lost');
      }
      return fact;
    },
  };
}
const input = (id, amount = 500) => ({ id, amount, reason: 'Kliento prašymas' });
test('refund preparation reserves remaining amount atomically; replay and immutable facts are scoped', async () => {
  const { db, s, r, order } = await setup();
  const concurrent = await Promise.allSettled(
    ['a', 'b'].map((id) => r.prepare(store, env, order.id, input(id, 2000), actor)),
  );
  assert.equal(concurrent.filter((x) => x.status === 'fulfilled').length, 1);
  assert.match(
    concurrent.find((x) => x.status === 'rejected').reason.message,
    /refund_budget_conflict/,
  );
  const c = concurrent.find((x) => x.status === 'fulfilled').value.command;
  assert.equal((await r.prepare(store, env, order.id, input(c.id, 2000), actor)).replayed, true);
  await assert.rejects(
    r.prepare(store, env, order.id, input(c.id, 100), actor),
    /refund_command_conflict/,
  );
  await assert.rejects(
    s.stmt('UPDATE refund_commands SET amount=1').run(),
    /refund_command_immutable/,
  );
  await assert.rejects(s.stmt('DELETE FROM refund_commands').run(), /refund_command_immutable/);
  await s.provisionStore(fixtureStore('store_b'), fixtureProducts());
  await assert.rejects(r.get('store_b', env, c.id), /refund_command_not_found/);
  db.close();
});
test('lost provider response is reconciled once; pending money remains reserved; success and replay do not refund twice', async () => {
  const { db, s, r, order } = await setup();
  const a = adapter();
  a.lose();
  await r.prepare(store, env, order.id, input('lost'), actor);
  assert.equal((await r.execute(store, env, 'lost', a, actor)).command.state, 'unknown');
  assert.equal((await s.getOrder(store, env, order.id)).refunded_amount, 0);
  assert.equal((await r.execute(store, env, 'lost', a, actor)).command.state, 'succeeded');
  assert.equal(a.calls, 1);
  await r.execute(store, env, 'lost', a, actor);
  assert.equal(a.calls, 1);
  assert.equal((await s.getOrder(store, env, order.id)).refunded_amount, 500);
  a.setStatus('pending');
  await r.prepare(store, env, order.id, input('pending', 2700), actor);
  assert.equal((await r.execute(store, env, 'pending', a, actor)).command.state, 'pending');
  await assert.rejects(
    r.prepare(store, env, order.id, input('extra', 1), actor),
    /refund_budget_conflict/,
  );
  const fact = { ...a.records.get('pending'), status: 'succeeded' };
  a.records.set('pending', fact);
  assert.equal((await r.execute(store, env, 'pending', a, actor)).command.state, 'succeeded');
  assert.equal((await s.getOrder(store, env, order.id)).refunded_amount, 3200);
  db.close();
});
test('unknown result past retry window and incomplete provider search never cause another POST', async () => {
  let now = Date.now();
  const { db, r, order } = await setup({ now: () => now });
  const a = adapter();
  a.createRefund = async () => {
    throw new Error('timeout');
  };
  await r.prepare(store, env, order.id, input('old'), actor);
  await r.execute(store, env, 'old', a, actor);
  now += REFUND_RETRY_WINDOW;
  let posts = 0;
  a.createRefund = async () => {
    posts++;
  };
  assert.equal((await r.execute(store, env, 'old', a, actor)).command.state, 'review');
  assert.equal(posts, 0);
  await r.prepare(store, env, order.id, input('incomplete'), actor);
  a.findRefund = async () => ({ complete: false, refund: null });
  assert.equal(
    (await r.execute(store, env, 'incomplete', a, actor)).command.review_reason,
    'provider_search_incomplete',
  );
  assert.equal(posts, 0);
  db.close();
});
test('one lease executes across concurrent callers and mismatching money facts require review', async () => {
  const { db, r, s, order } = await setup();
  const a = adapter();
  await r.prepare(store, env, order.id, input('leased'), actor);
  let release;
  const barrier = new Promise((resolve) => {
    release = resolve;
  });
  const find = a.findRefund;
  a.findRefund = async (c) => {
    await barrier;
    return find(c);
  };
  const first = r.execute(store, env, 'leased', a, actor);
  while (!(await r.get(store, env, 'leased')).lease_token)
    await new Promise((resolve) => setImmediate(resolve));
  await assert.rejects(r.execute(store, env, 'leased', a, actor), /refund_execution_busy/);
  release();
  assert.equal((await first).command.state, 'succeeded');
  assert.equal(a.calls, 1);
  await r.prepare(store, env, order.id, input('wrong'), actor);
  a.createRefund = async (c) => ({
    ...a.records.get('leased'),
    providerId: 're_wrong',
    commandId: c.id,
    amount: 1,
  });
  assert.equal((await r.execute(store, env, 'wrong', a, actor)).command.state, 'review');
  assert.equal((await s.getOrder(store, env, order.id)).refunded_amount, 500);
  db.close();
});
test('confirmation crash recovers durable response; signed webhook can complete before API returns', async () => {
  const { db, r, s, order } = await setup();
  const a = adapter();
  await r.prepare(store, env, order.id, input('crash'), actor);
  const confirm = s.confirmRefund.bind(s);
  let fail = true;
  s.confirmRefund = async (...args) => {
    if (fail) {
      fail = false;
      throw new Error('storage failed');
    }
    return confirm(...args);
  };
  assert.equal((await r.execute(store, env, 'crash', a, actor)).command.state, 'unknown');
  assert.equal((await r.execute(store, env, 'crash', a, actor)).command.state, 'succeeded');
  assert.equal(a.calls, 1);
  await r.prepare(store, env, order.id, input('webhook'), actor);
  const fact = {
    environment: env,
    accountRef: 'store_a_sandbox',
    providerId: 're_webhook',
    paymentId: order.payment_id,
    amount: 500,
    currency: 'EUR',
    status: 'succeeded',
    commandId: 'webhook',
  };
  await r.operations.acceptRefundEvent(store, env, { kind: 'refund', id: 'evt_webhook', ...fact });
  await r.observe(store, env, fact);
  assert.equal((await r.get(store, env, 'webhook')).accounted, 1);
  assert.equal((await r.execute(store, env, 'webhook', a, actor)).replayed, true);
  assert.equal(a.calls, 1);
  await r.observe(store, env, { ...fact, status: 'pending' });
  assert.equal((await r.get(store, env, 'webhook')).state, 'succeeded');
  await r.observe(store, env, { ...fact, status: 'failed' });
  assert.equal((await r.get(store, env, 'webhook')).state, 'review');
  assert.equal((await s.getOrder(store, env, order.id)).refunded_amount, 1000);
  db.close();
});
test('refund permission, provider context and production admission are independent server gates', async () => {
  const { db, s, r, order } = await setup();
  const a = adapter();
  const h = createHandler({
    service: s,
    environment: env,
    paymentAdapters: { store_a: a },
    operatorAuthorize: async () => ({ id: actor, storeId: store, permissions: ['read'] }),
  });
  assert.equal(
    (
      await h(
        new Request(
          'https://store-a.example/api/operator/orders/' + order.id + '/refund-commands',
          { method: 'POST', body: JSON.stringify(input('denied')) },
        ),
      )
    ).status,
    403,
  );
  await r.prepare(store, env, order.id, input('context'), actor);
  await assert.rejects(
    r.execute(store, env, 'context', { ...a, accountRef: 'other' }, actor),
    /refund_provider_not_connected/,
  );
  const config = fixtureStore();
  config.environment = 'production';
  config.testOnly = false;
  config.productionAdmission = { approved: true };
  config.requireCustomer = true;
  await s
    .stmt(
      'UPDATE stores SET environment=?,config_json=? WHERE id=?',
      'production',
      JSON.stringify(config),
      store,
    )
    .run();
  await assert.rejects(
    r.execute(store, 'production', 'context', a, actor),
    /refund_execution_not_admitted/,
  );
  db.close();
});
test('Stripe adapter rejects wrong key mode and bounded duplicate/incomplete refund searches', async () => {
  const base = { environment: env, accountRef: 'store_a_sandbox', webhookSecret: 'fixture' };
  assert.throws(
    () => new StripeCheckoutAdapter({ ...base, apiKey: 'sk_live_fixture' }),
    /stripe_key_environment_mismatch/,
  );
  assert.throws(
    () =>
      new StripeCheckoutAdapter({
        ...base,
        environment: 'production',
        apiKey: 'rkcs_test_fixture',
      }),
    /stripe_key_environment_mismatch/,
  );
  const c = {
    store_id: store,
    id: 'c',
    account_ref: base.accountRef,
    environment: env,
    payment_id: 'pi_fixture',
    amount: 500,
  };
  const response = {
    id: 're_fixture',
    payment_intent: c.payment_id,
    amount: 500,
    currency: 'eur',
    status: 'succeeded',
    livemode: false,
    metadata: { commerce_command_id: 'c', store_id: store, environment: env },
  };
  let args;
  const client = {
    refunds: {
      create: async (...v) => {
        args = v;
        return response;
      },
      list: async () => ({ data: [response], has_more: false }),
    },
  };
  const adapter = new StripeCheckoutAdapter({ ...base, client });
  assert.equal((await adapter.createRefund(c)).providerId, 're_fixture');
  assert.equal(args[1].idempotencyKey, 'refund-store_a-c');
  assert.equal((await adapter.findRefund(c)).complete, true);
  client.refunds.list = async () => ({ data: [response, response], has_more: false });
  assert.equal((await adapter.findRefund(c)).complete, false);
  client.refunds.list = async () => ({ data: [response], has_more: true });
  assert.equal((await adapter.findRefund(c)).complete, false);
  client.refunds.create = async () => ({ ...response, livemode: true });
  await assert.rejects(adapter.createRefund(c), /stripe_environment_mismatch/);
});
test('cancel releases only an unsubmitted command; provider failure and external refund budgets are checked', async () => {
  const { db, r, s, order } = await setup();
  const a = adapter();
  await r.prepare(store, env, order.id, input('cancel', 3200), actor);
  assert.equal(
    (await r.cancel(store, env, 'cancel', actor)).command.review_reason,
    'canceled_before_submission',
  );
  assert.equal((await r.cancel(store, env, 'cancel', actor)).replayed, true);
  await r.execute(store, env, 'cancel', a, actor);
  assert.equal(a.calls, 0);
  await r.prepare(store, env, order.id, input('failed', 500), actor);
  a.setStatus('failed');
  assert.equal((await r.execute(store, env, 'failed', a, actor)).command.state, 'failed');
  await assert.rejects(r.cancel(store, env, 'failed', actor), /refund_cancel_conflict/);
  await r.prepare(store, env, order.id, input('changed', 3200), actor);
  await s.confirmRefund(store, env, order.id, {
    providerId: 're_external',
    amount: 100,
    currency: 'EUR',
  });
  assert.equal(
    (await r.execute(store, env, 'changed', a, actor)).command.review_reason,
    'refund_budget_changed',
  );
  assert.equal(a.calls, 1);
  db.close();
});
test('expired lease cannot execute or clear a successor command lease', async () => {
  let now = Date.now();
  const { db, r, order } = await setup({ now: () => now });
  const a = adapter();
  await r.prepare(store, env, order.id, input('stale'), actor);
  let release;
  let reads = 0;
  const barrier = new Promise((resolve) => {
    release = resolve;
  });
  const find = a.findRefund;
  a.findRefund = async (c) => {
    if (reads++ === 0) await barrier;
    return find(c);
  };
  const first = r.execute(store, env, 'stale', a, actor);
  while (!(await r.get(store, env, 'stale')).lease_token)
    await new Promise((resolve) => setImmediate(resolve));
  now += 60001;
  await r.execute(store, env, 'stale', a, actor);
  release();
  await first;
  assert.equal(a.calls, 1);
  const c = await r.get(store, env, 'stale');
  assert.equal(c.state, 'succeeded');
  assert.equal(c.lease_token, null);
  db.close();
});
test('cancel between execution read and lease claim cannot resurrect a canceled command', async () => {
  const { db, r, s, order } = await setup();
  const a = adapter();
  await r.prepare(store, env, order.id, input('cancel_race'), actor);
  const stmt = s.stmt.bind(s);
  let race = true;
  s.stmt = (sql, ...args) => {
    const bound = stmt(sql, ...args);
    if (race && sql.includes('first_attempt_at=COALESCE')) {
      race = false;
      return {
        ...bound,
        run: async () => {
          await r.cancel(store, env, 'cancel_race', actor);
          return bound.run();
        },
      };
    }
    return bound;
  };
  const result = await r.execute(store, env, 'cancel_race', a, actor);
  assert.equal(result.command.review_reason, 'canceled_before_submission');
  assert.equal(result.command.first_attempt_at, null);
  assert.equal(a.calls, 0);
  db.close();
});
