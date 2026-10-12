import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { localStripeSandbox } from '../src/local-stripe.mjs';
import { REFUND_RETRY_WINDOW } from '../src/refunds.mjs';

// Explicit remote test only; excluded from npm verify and production entrypoints.
const args = process.argv.slice(2),
  value = (flag) => args[args.indexOf(flag) + 1];
let db;
try {
  assert.ok(args.includes('--config') && args.includes('--database') && args.includes('--order'));
  assert.ok(existsSync(value('--database')));
  const adapter = localStripeSandbox(value('--config'));
  db = new NodeDatabase(value('--database'));
  db.migrate();
  const s = new CommerceService(db);
  const stored = await s.one('SELECT store_id FROM orders WHERE id=?', value('--order'));
  assert.ok(stored);
  const config = await s.store(stored.store_id, 'sandbox');
  assert.equal(config.testOnly, true);
  assert.equal(config.paymentAccountRef, adapter.accountRef);
  const order = await s.getOrder(config.id, 'sandbox', value('--order'));
  const session = await adapter.client.checkout.sessions.retrieve(order.checkout_id);
  assert.equal(session.livemode, false);
  assert.equal(session.status, 'complete');
  assert.equal(session.payment_status, 'paid');
  assert.equal(session.amount_total, order.amount);
  assert.equal(session.payment_intent, order.payment_id);
  assert.equal(session.metadata.order_id, order.id);
  assert.equal(session.metadata.store_id, config.id);
  assert.equal(session.metadata.environment, 'sandbox');
  const intent = await adapter.client.paymentIntents.retrieve(order.payment_id);
  assert.equal(intent.livemode, false);
  assert.equal(intent.status, 'succeeded');
  const commands = await s.rows(
    "SELECT * FROM refund_commands WHERE store_id=? AND order_id=? AND state='succeeded'",
    config.id,
    order.id,
  );
  assert.ok(commands.length > 0);
  for (const command of commands) {
    const { complete, refund } = await adapter.findRefund(command);
    assert.equal(complete, true);
    assert.equal(refund.status, 'succeeded');
    assert.equal(refund.amount, command.amount);
    assert.equal(refund.currency, command.currency);
    assert.equal(refund.paymentId, order.payment_id);
    assert.equal(command.accounted, 1);
    if (args.includes('--prove-idempotency')) {
      assert.ok(
        command.first_attempt_at && Date.now() - command.first_attempt_at < REFUND_RETRY_WINDOW,
      );
      const replay = await adapter.createRefund(command);
      assert.equal(replay.providerId, command.provider_id);
      assert.equal(replay.amount, command.amount);
    }
  }
  const provider = await adapter.client.refunds.list({
    payment_intent: order.payment_id,
    limit: 100,
  });
  assert.equal(provider.has_more, false);
  assert.equal(
    provider.data.filter((r) => r.status === 'succeeded').reduce((sum, r) => sum + r.amount, 0),
    order.refunded_amount,
  );
  assert.equal(provider.data.length, commands.length);
  console.log(
    JSON.stringify({
      result: 'PASS',
      testMode: true,
      checkout: 'complete/paid',
      amount: order.amount,
      refundedAmount: order.refunded_amount,
      refundCount: commands.length,
      idempotencyReplay: args.includes('--prove-idempotency'),
      providerMatchesLocal: true,
    }),
  );
} catch (error) {
  // Never emit SDK messages, request bodies, client secrets, credentials or PII.
  console.error(JSON.stringify({ result: 'FAIL', errorType: error.constructor.name }));
  process.exitCode = 1;
} finally {
  db?.close();
}
