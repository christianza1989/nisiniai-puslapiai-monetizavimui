import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { ReturnOperations } from '../src/returns.mjs';
import {
  fixtureStore,
  fixtureProducts,
  cart,
  key,
  fakeCheckout,
  payment,
  fixtureCarrier,
} from './fixtures.mjs';
test('fully refunded unshipped order returns inspected stock once while existing provider shipment blocks cancellation', async () => {
  const db = new NodeDatabase();
  db.migrate();
  const s = new CommerceService(db),
    returns = new ReturnOperations(s);
  await s.provisionStore(fixtureStore(), fixtureProducts());
  const order = (await s.createOrder('store_a', 'sandbox', cart(), key(1))).order;
  await s.checkout('store_a', 'sandbox', order.id, fakeCheckout);
  await s.acceptPayment(
    'store_a',
    'sandbox',
    payment(await s.getOrder('store_a', 'sandbox', order.id)),
  );
  const input = {
    id: 'cancel_fixture',
    reason: 'TEST goods inspected in stock',
    qualityChecked: true,
  };
  await assert.rejects(
    returns.cancelUnshipped('store_a', 'sandbox', order.id, input, 'operator'),
    /unshipped_cancel_not_allowed/,
  );
  await s.confirmRefund('store_a', 'sandbox', order.id, {
    providerId: 're_cancel1',
    amount: 3200,
    currency: 'EUR',
  });
  await Promise.all(
    [1, 2].map(() => returns.cancelUnshipped('store_a', 'sandbox', order.id, input, 'operator')),
  );
  assert.equal((await s.one("SELECT available FROM inventory WHERE sku='couple'")).available, 5);
  assert.equal((await s.getOrder('store_a', 'sandbox', order.id)).fulfillment_state, 'canceled');
  await assert.rejects(s.markPacked('store_a', 'sandbox', order.id), /packing_not_allowed/);
  const shipped = (await s.createOrder('store_a', 'sandbox', cart(), key(2))).order;
  await s.checkout('store_a', 'sandbox', shipped.id, fakeCheckout);
  await s.acceptPayment(
    'store_a',
    'sandbox',
    payment(await s.getOrder('store_a', 'sandbox', shipped.id), 'store_a', 'evt_shipped'),
  );
  await s.markPacked('store_a', 'sandbox', shipped.id);
  await s.registerShipment('store_a', 'sandbox', shipped.id, fixtureCarrier());
  await s.confirmRefund('store_a', 'sandbox', shipped.id, {
    providerId: 're_cancel2',
    amount: 3200,
    currency: 'EUR',
  });
  await assert.rejects(
    returns.cancelUnshipped(
      'store_a',
      'sandbox',
      shipped.id,
      { ...input, id: 'cancel_shipped' },
      'operator',
    ),
    /unshipped_cancel_not_allowed/,
  );
  db.close();
});
test('physical return inspection restores stock once, leaves money alone and concurrent excess receipt rolls back', async () => {
  const db = new NodeDatabase();
  db.migrate();
  const s = new CommerceService(db),
    returns = new ReturnOperations(s);
  await s.provisionStore(fixtureStore(), fixtureProducts());
  const { order } = await s.createOrder('store_a', 'sandbox', cart(), key(1));
  await s.checkout('store_a', 'sandbox', order.id, fakeCheckout);
  await s.acceptPayment(
    'store_a',
    'sandbox',
    payment(await s.getOrder('store_a', 'sandbox', order.id)),
  );
  await s.markPacked('store_a', 'sandbox', order.id);
  await s.registerShipment('store_a', 'sandbox', order.id, fixtureCarrier());
  const receipt = {
    id: 'receipt',
    reason: 'Physically received, sealed and expiry inspected',
    lines: [{ sku: 'couple', quantity: 1, disposition: 'resalable', expiryChecked: true }],
  };
  const result = await Promise.allSettled(
    ['receipt', 'excess'].map((id) =>
      returns.receive('store_a', 'sandbox', order.id, { ...receipt, id }, 'operator'),
    ),
  );
  assert.equal(result.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(
    (await s.catalog('store_a', 'sandbox')).find((p) => p.sku === 'couple').available,
    5,
  );
  assert.equal((await s.getOrder('store_a', 'sandbox', order.id)).refunded_amount, 0);
  assert.equal((await s.one('SELECT COUNT(*) n FROM return_receipts')).n, 1);
  const record = (await returns.list('store_a', 'sandbox', order.id))[0];
  assert.equal(
    (
      await returns.receive(
        'store_a',
        'sandbox',
        order.id,
        { ...receipt, id: record.id },
        'operator',
      )
    ).replayed,
    true,
  );
  await assert.rejects(
    returns.receive(
      'store_a',
      'sandbox',
      order.id,
      { ...receipt, id: 'uninspected', lines: [{ ...receipt.lines[0], expiryChecked: false }] },
      'operator',
    ),
    /invalid_return_receipt/,
  );
  await assert.rejects(
    s.stmt('UPDATE return_receipt_lines SET quantity=2').run(),
    /return_receipt_immutable/,
  );
  db.close();
});
