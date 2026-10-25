import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { PaymentRecovery } from '../src/payment-recovery.mjs';
import { CommerceJobs } from '../src/jobs.mjs';
import { CustomerNotifications, notificationMessage } from '../src/notifications.mjs';
import { createHandler } from '../src/http.mjs';
import { fixtureStore, fixtureProducts, cart, key, fakeCheckout } from './fixtures.mjs';
import {
  paymentLabel,
  fulfillmentLabel,
  refundableAmount,
} from '../public/operator-order-status.mjs';

const HOUR = 3600000;
const buyer = {
  name: 'Fixture Customer',
  email: 'buyer@example.test',
  phone: '+37060000000',
  address: { country: 'LT', line1: 'Test g. 1', city: 'Vilnius', postalCode: '02211' },
};
async function setup({ enabled = true } = {}) {
  let now = Date.UTC(2026, 9, 25, 10);
  const db = new NodeDatabase();
  db.migrate();
  const s = new CommerceService(db, { now: () => now });
  const config = {
    ...fixtureStore(),
    requireCustomer: true,
    notificationPolicy: {
      approved: true,
      from: 'sender@example.test',
      transportRef: 'fixture_mail',
    },
    automationPolicy: { sendNotifications: true },
    ...(enabled
      ? {
          paymentRecovery: {
            enabled: true,
            reservationHours: 24,
            reminderAfterHours: 12,
            enabledAt: now,
            noticeVersion: 'recovery_v1',
            origin: 'https://store-a.example',
          },
        }
      : {}),
  };
  await s.provisionStore(config, fixtureProducts(100));
  const input = {
    ...cart(),
    customer: buyer,
    ...(enabled ? { paymentRecoveryNotice: 'recovery_v1' } : {}),
  };
  const created = await s.createOrder('store_a', 'sandbox', input, key(1));
  let observed = { status: 'open', paymentStatus: 'unpaid', paymentProcessing: false };
  let reads = 0;
  const adapter = {
    ...fakeCheckout,
    environment: 'sandbox',
    accountRef: config.paymentAccountRef,
    inspectSession: async () => {
      reads++;
      return structuredClone(observed);
    },
  };
  const options = {
    recoveryKeys: { store_a: 'ab'.repeat(32) },
    paymentAdapters: { store_a: adapter },
  };
  const r = new PaymentRecovery(s, options);
  return {
    db,
    s,
    config,
    input,
    created,
    options,
    r,
    tick: (ms) => {
      now += ms;
    },
    setObserved: (v) => {
      observed = v;
    },
    reads: () => reads,
  };
}

test('opt-in reservation lasts24h; old default remains1h and notice cannot be skipped', async () => {
  const x = await setup(),
    old = await setup({ enabled: false });
  assert.equal(x.created.order.expires_at - x.created.order.created_at, 24 * HOUR);
  assert.equal(old.created.order.expires_at - old.created.order.created_at, HOUR);
  await assert.rejects(
    x.s.createOrder('store_a', 'sandbox', { ...x.input, paymentRecoveryNotice: undefined }, key(2)),
    /payment_recovery_notice_required/,
  );
  x.tick(HOUR + 1);
  assert.equal(await x.s.expire('store_a', 'sandbox'), 0);
  x.tick(23 * HOUR);
  assert.equal(await x.s.expire('store_a', 'sandbox'), 1);
  assert.equal(
    (await x.s.getOrder('store_a', 'sandbox', x.created.order.id)).stock_state,
    'released',
  );
  assert.equal(
    (await x.s.one("SELECT available FROM inventory WHERE sku='couple'")).available,
    100,
  );
  const replay = await x.s.createOrder('store_a', 'sandbox', x.input, key(1));
  assert.equal(replay.order.id, x.created.order.id);
});

test('recovery capability is store/environment/order/purpose/expiry bound; original credential unchanged', async () => {
  const x = await setup(),
    token = await x.r.token('store_a', 'sandbox', x.created.order);
  assert.equal((await x.r.authorize('store_a', 'sandbox', token)).id, x.created.order.id);
  assert.equal(
    (await x.s.authorizeOrder('store_a', 'sandbox', x.created.order.id, x.created.accessToken)).id,
    x.created.order.id,
  );
  for (const bad of [
    token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a'),
    token.replace('r1_', 'r2_'),
    token + 'x',
  ])
    await assert.rejects(x.r.authorize('store_a', 'sandbox', bad));
  await assert.rejects(x.r.authorize('store_a', 'production', token), /forbidden/);
  await assert.rejects(x.r.authorize('other', 'sandbox', token));
  await assert.rejects(
    x.r.authorize('store_a', 'sandbox', token, crypto.randomUUID()),
    /forbidden/,
  );
  x.tick(30 * 24 * HOUR);
  await assert.rejects(x.r.authorize('store_a', 'sandbox', token), /expired/);
});

test('reminder boundary and Stripe truth suppress paid, processing, withdrawn, replaced and old orders', async () => {
  const x = await setup();
  await x.s.checkout('store_a', 'sandbox', x.created.order.id, x.options.paymentAdapters.store_a);
  x.tick(12 * HOUR - 1);
  assert.equal(await x.r.canRemind('store_a', 'sandbox', x.created.order.id), false);
  x.tick(1);
  assert.equal(await x.r.canRemind('store_a', 'sandbox', x.created.order.id), true);
  for (const state of [
    { status: 'complete', paymentStatus: 'paid' },
    { status: 'open', paymentStatus: 'unpaid', paymentProcessing: true },
    { status: 'expired', paymentStatus: 'unpaid' },
  ]) {
    x.setObserved(state);
    assert.equal(await x.r.canRemind('store_a', 'sandbox', x.created.order.id), false);
  }
  x.setObserved({ status: 'open', paymentStatus: 'unpaid' });
  await x.s.createOrder('store_a', 'sandbox', x.input, key(2));
  assert.equal(await x.r.canRemind('store_a', 'sandbox', x.created.order.id), false);
  const y = await setup();
  y.tick(12 * HOUR);
  await y.s.requestWithdrawal('store_a', 'sandbox', y.created.order.id);
  assert.equal(await y.r.canRemind('store_a', 'sandbox', y.created.order.id), false);
  const z = await setup();
  z.tick(24 * HOUR);
  assert.equal(await z.r.canRemind('store_a', 'sandbox', z.created.order.id), false);
  await z.s
    .stmt("UPDATE orders SET snapshot_json=json_remove(snapshot_json,'$.paymentRecoveryNotice')")
    .run();
  await assert.rejects(
    z.r.authorize('store_a', 'sandbox', await z.r.token('store_a', 'sandbox', z.created.order)),
    /forbidden/,
  );
});

test('expired recovery restores only after provider expiry/unpaid; ambiguous and complete sessions cannot create another payment', async () => {
  const x = await setup();
  await x.s.checkout('store_a', 'sandbox', x.created.order.id, x.options.paymentAdapters.store_a);
  const token = await x.r.token('store_a', 'sandbox', x.created.order);
  assert.equal((await x.r.resolve('store_a', 'sandbox', token)).state, 'open');
  x.tick(24 * HOUR + 1);
  await x.s.expire('store_a', 'sandbox');
  await assert.rejects(x.r.resolve('store_a', 'sandbox', token), /payment_recovery_wait/);
  x.setObserved({ status: 'complete', paymentStatus: 'unpaid', paymentProcessing: true });
  assert.equal((await x.r.resolve('store_a', 'sandbox', token)).state, 'processing');
  x.setObserved({ status: 'expired', paymentStatus: 'unpaid', paymentProcessing: false });
  const result = await x.r.resolve('store_a', 'sandbox', token);
  assert.equal(result.state, 'restore');
  assert.deepEqual(result.order.snapshot.customer, x.created.order.snapshot.customer);
  assert.equal((await x.s.one('SELECT COUNT(*) n FROM orders')).n, 1);
  await assert.rejects(
    x.s.checkout('store_a', 'sandbox', x.created.order.id, x.options.paymentAdapters.store_a),
    /checkout_unavailable/,
  );
});

test('durable cron prepares and sends exactly one reminder under overlap/restart; unknown is never resent', async () => {
  const x = await setup();
  await x.s.checkout('store_a', 'sandbox', x.created.order.id, x.options.paymentAdapters.store_a);
  let reminders = 0;
  const adapter = {
    environment: 'sandbox',
    accountRef: 'fixture_mail',
    sender: 'sender@example.test',
    send: async (message) => {
      if (message.id.includes('PaymentReminder')) {
        reminders++;
        assert(message.html.includes('Tęsti apmokėjimą'));
        throw Error('lost acceptance');
      }
      return { status: 'accepted', reference: 'fixture' };
    },
    find: async () => ({ status: 'unknown' }),
  };
  x.options.notificationAdapters = { store_a: adapter };
  const jobs = new CommerceJobs(x.s, x.options);
  await jobs.scheduled('store_a', 'sandbox');
  x.tick(12 * HOUR);
  await Promise.all([jobs.scheduled('store_a', 'sandbox'), jobs.scheduled('store_a', 'sandbox')]);
  await new CommerceJobs(x.s, x.options).scheduled('store_a', 'sandbox');
  assert.equal(
    reminders,
    1,
    JSON.stringify(await x.s.rows('SELECT kind,state FROM customer_notifications')),
  );
  assert.equal(
    (await x.s.one("SELECT COUNT(*) n FROM customer_notifications WHERE kind='PaymentReminder'")).n,
    1,
  );
  const row = await x.s.one("SELECT * FROM customer_notifications WHERE kind='PaymentReminder'");
  assert.equal(row.state, 'unknown');
  const msg = notificationMessage(JSON.parse(row.payload_json), x.config.notificationPolicy);
  assert(!msg.text.includes(buyer.name));
  assert(!msg.text.includes('nuolaid'));
  assert(!msg.html.includes('<img'));
});

test('payment confirmation between provider read and durable claim suppresses send', async () => {
  const x = await setup();
  x.tick(12 * HOUR);
  let sends = 0;
  const jobs = new CommerceJobs(x.s, x.options),
    order = x.created.order;
  await jobs.notification('store_a', 'sandbox', {
    id: 'PaymentReminder_' + order.id,
    aggregate_id: order.id,
    kind: 'PaymentReminder',
    resumeUrl:
      x.config.paymentRecovery.origin +
      '/cart#resume=' +
      (await x.r.token('store_a', 'sandbox', order)),
  });
  const n = new CustomerNotifications(
    x.s,
    {
      store_a: {
        accountRef: 'fixture_mail',
        environment: 'sandbox',
        sender: x.config.notificationPolicy.from,
        send: async () => {
          sends++;
        },
      },
    },
    {
      reminderCheck: async () => {
        await x.s
          .stmt(
            "UPDATE orders SET payment_state='paid',stock_state='allocated',payment_id='pi_fixture'",
          )
          .run();
        return true;
      },
    },
  );
  await n.execute('store_a', 'sandbox', 'PaymentReminder_' + order.id, 'fixture_actor');
  assert.equal(sends, 0);
});

test('HTTP recovery cannot withdraw, capture analytics or access other orders; safe expired endpoint returns no payment secrets', async () => {
  const x = await setup();
  const token = await x.r.token('store_a', 'sandbox', x.created.order);
  const handler = createHandler({ service: x.s, environment: 'sandbox', ...x.options });
  const base = 'https://store-a.example/api/orders/' + x.created.order.id;
  for (const action of ['withdrawal', 'analytics'])
    assert.equal(
      (
        await handler(
          new Request(base + '/' + action, {
            method: 'POST',
            headers: { authorization: 'Bearer ' + token },
            body: '{}',
          }),
        )
      ).status,
      403,
    );
  const response = await handler(
    new Request('https://store-a.example/api/payment-recovery', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  );
  assert.equal(response.status, 200);
  const value = await response.json();
  assert.equal(value.state, 'open');
  assert.equal(value.order.access_hash, undefined);
  assert.equal(
    (
      await handler(
        new Request('https://store-a.example/api/payment-recovery', {
          method: 'POST',
          headers: { origin: 'https://foreign.example' },
          body: JSON.stringify({ token }),
        }),
      )
    ).status,
    403,
  );
});

test('operator labels distinguish expiry and never offer refunds on unpaid reservations', () => {
  const order = {
    payment_state: 'pending',
    stock_state: 'released',
    expires_at: 100,
    fulfillment_state: 'pending',
    amount: 5272,
    refunded_amount: 0,
  };
  assert.equal(
    paymentLabel(order, { pending: 'Laukia mokėjimo' }, 100),
    'Neapmokėta – rezervacija baigėsi',
  );
  assert.equal(
    paymentLabel({ ...order, stock_state: 'reserved' }, { pending: 'Laukia mokėjimo' }, 99),
    'Laukia mokėjimo',
  );
  assert.equal(fulfillmentLabel(order, {}), 'Laukiama apmokėjimo');
  assert.equal(refundableAmount(order), 0);
  assert.equal(
    refundableAmount({ ...order, payment_state: 'paid', payment_id: 'pi_fixture' }, 100),
    5172,
  );
});
