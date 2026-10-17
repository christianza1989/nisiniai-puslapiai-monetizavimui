import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { CommerceJobs } from '../src/jobs.mjs';
import { CustomerNotifications, notificationMessage } from '../src/notifications.mjs';
import { fixtureStore, fixtureProducts, cart, key } from './fixtures.mjs';
test('transactional message sends once on timeout/concurrency/restart and recovers by transport evidence only', async () => {
  const db = new NodeDatabase();
  db.migrate();
  const s = new CommerceService(db),
    config = {
      ...fixtureStore(),
      notificationPolicy: { approved: true, from: 'info@pinet.lt', transportRef: 'core_mail' },
    };
  await s.provisionStore(config, fixtureProducts());
  const order = (
    await s.createOrder(
      'store_a',
      'sandbox',
      {
        ...cart(),
        customer: {
          name: 'Test User',
          email: 'buyer@example.test',
          phone: '+37060000000',
          address: { country: 'LT', line1: 'Test g. 1', city: 'Vilnius', postalCode: '02211' },
        },
      },
      key(1),
    )
  ).order;
  const event = await s.one("SELECT * FROM outbox WHERE kind='OrderPlaced'");
  await new CommerceJobs(s).notification('store_a', 'sandbox', event);
  let sends = 0,
    accepted = false;
  const adapter = {
    accountRef: 'core_mail',
    environment: 'sandbox',
    sender: 'info@pinet.lt',
    send: async () => {
      sends++;
      throw Error('lost acceptance');
    },
    find: async () => ({
      status: accepted ? 'accepted' : 'unknown',
      reference: 'fixture-250-' + event.id,
    }),
  };
  const n = new CustomerNotifications(s, { store_a: adapter });
  const outcomes = await Promise.all([
    n.execute('store_a', 'sandbox', event.id, 'operator'),
    n.execute('store_a', 'sandbox', event.id, 'operator'),
  ]);
  assert.equal(sends, 1);
  assert.ok(outcomes.some((r) => r.state === 'unknown'));
  await new CustomerNotifications(new CommerceService(db), { store_a: adapter }).execute(
    'store_a',
    'sandbox',
    event.id,
    'operator',
  );
  assert.equal(sends, 1);
  accepted = true;
  assert.equal((await n.execute('store_a', 'sandbox', event.id, 'operator')).state, 'accepted');
  assert.equal((await n.execute('store_a', 'sandbox', event.id, 'operator')).replayed, true);
  assert.equal(sends, 1);
  await assert.rejects(n.preview('store_a', 'sandbox', 'other'), /notification_not_found/);
  await assert.rejects(
    s.stmt("UPDATE notification_commands SET message_json='{}'").run(),
    /notification_command_immutable/,
  );
  assert.match(
    (await n.preview('store_a', 'sandbox', event.id)).message.text,
    new RegExp(order.id),
  );
  for (const language of ['lt', 'pl', 'lv', 'et'])
    assert.match(
      notificationMessage(
        JSON.parse(
          (await s.one('SELECT payload_json FROM customer_notifications')).payload_json,
        ) && {
          ...JSON.parse(
            (await s.one('SELECT payload_json FROM customer_notifications')).payload_json,
          ),
          language,
        },
        config.notificationPolicy,
      ).messageId,
      /^<commerce-/,
    );
  db.close();
});
