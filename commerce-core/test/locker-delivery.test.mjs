import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { BuyerDeliveryQuotes, deliveryFingerprint } from '../src/buyer-delivery.mjs';
import { ShippingOperations } from '../src/shipping.mjs';
import { ShipmentCommands } from '../src/shipment-commands.mjs';
import { fixtureStore, fixtureProducts, cart, key, fakeCheckout, payment } from './fixtures.mjs';
const point = {
  id: 'terminal_1',
  country: 'LT',
  label: 'Vilnius · Testinė g. 1',
  courier: 'dpd',
  providerId: 'LT_TEST_1',
  address: 'Testinė g. 1',
  city: 'Vilnius',
  postalCode: '01111',
};
async function setup() {
  const db = new NodeDatabase();
  db.migrate();
  const s = new CommerceService(db);
  const method = {
    id: 'locker_dpd',
    kind: 'locker',
    courier: 'dpd',
    senderMode: 'locker',
    amount: 0,
    label: 'DPD paštomatas',
    pricing: 'carrier',
    serviceIds: ['42'],
    maxParcels: 1,
    lockers: [point, { ...point, id: 'terminal_2', providerId: 'LT_TEST_2', postalCode: '02222' }],
  };
  const cfg = {
    ...fixtureStore(),
    shippingAccountRef: 'test_carrier',
    dispatch: {
      name: 'Test Seller',
      country: 'LT',
      city: 'Vilnius',
      line1: 'Seller g. 1',
      postalCode: '01100',
      phone: '+37060000000',
      email: 'seller@example.test',
      isCompany: true,
    },
    dispatchLockers: { dpd: { ...point, id: 'sender_1', providerId: 'LT_SENDER' } },
    markets: [{ country: 'LT', currency: 'EUR', policyVersion: 'test_v1', delivery: [method] }],
  };
  await s.provisionStore(
    cfg,
    fixtureProducts().map((p) => ({
      ...p,
      prices: { LT: p.prices.LT },
      package: { weightGrams: 2200, dimensionsMm: [200, 200, 170] },
    })),
  );
  const input = {
    ...cart(),
    deliveryId: method.id,
    customer: {
      name: 'Test Buyer',
      email: 'buyer@example.test',
      phone: '+37060000001',
      lockerId: 'terminal_1',
      address: { country: 'LT', line1: 'Forged g. 9', city: 'Other city', postalCode: '99999' },
    },
  };
  return { db, s, cfg, method, input };
}
test('locker quote binds selected recipient and configured sender, retains parcel facts and invalidates changed terminal', async () => {
  const x = await setup();
  try {
    let sent;
    const a = {
      environment: 'sandbox',
      accountRef: 'test_carrier',
      provider: 'fixture',
      quote: async (p) => {
        sent = p;
        return [
          {
            serviceId: '42',
            name: 'Locker to locker',
            amount: 491,
            currency: 'EUR',
            senderAddressType: 'DPD',
            recipientAddressType: 'DPD',
            courier: 'DPD',
          },
        ];
      },
    };
    const q = await new BuyerDeliveryQuotes(x.s).create(
      'store_a',
      'sandbox',
      { ...x.input, id: 'locker_quote_1' },
      a,
    );
    assert.equal(sent.recipient.city, 'Vilnius');
    assert.equal(sent.recipient.postalCode, '01111');
    assert.equal(sent.sender.locker.providerId, 'LT_SENDER');
    const priced = await x.s.quote('store_a', 'sandbox', { ...x.input, deliveryQuoteId: q.id });
    assert.equal(priced.delivery.dispatch.locker.providerId, 'LT_SENDER');
    assert.notEqual(
      await deliveryFingerprint(x.input, x.method),
      await deliveryFingerprint(
        { ...x.input, customer: { ...x.input.customer, lockerId: 'terminal_2' } },
        x.method,
      ),
    );
    await assert.rejects(
      x.s.quote('store_a', 'sandbox', {
        ...x.input,
        customer: { ...x.input.customer, lockerId: 'terminal_2' },
        deliveryQuoteId: q.id,
      }),
      /delivery_quote_conflict/,
    );
    const changed = {
      ...x.cfg,
      dispatchLockers: { dpd: { ...point, id: 'sender_2', providerId: 'OTHER' } },
    };
    await x.s.db
      .prepare('UPDATE stores SET config_json=? WHERE id=?')
      .bind(JSON.stringify(changed), 'store_a')
      .run();
    await assert.rejects(
      x.s.quote('store_a', 'sandbox', { ...x.input, deliveryQuoteId: q.id }),
      /delivery_quote_conflict/,
    );
  } finally {
    x.db.close();
  }
});
test('locker cart with multiple individual parcels fails before contacting carrier', async () => {
  const x = await setup();
  try {
    let calls = 0;
    const a = {
      environment: 'sandbox',
      accountRef: 'test_carrier',
      quote: async () => {
        calls++;
        return [];
      },
    };
    await assert.rejects(
      new BuyerDeliveryQuotes(x.s).create(
        'store_a',
        'sandbox',
        { ...x.input, id: 'multiple', lines: [{ sku: 'couple', quantity: 2 }] },
        a,
      ),
      /carrier_locker_parcel_limit/,
    );
    assert.equal(calls, 0);
  } finally {
    x.db.close();
  }
});

test('paid fixture order preserves locker through order replay, packing, origin plan and registration payload', async () => {
  const x = await setup();
  try {
    const adapter = {
      environment: 'sandbox',
      accountRef: 'test_carrier',
      provider: 'fixture',
      quote: async () => [
        {
          serviceId: '42',
          name: 'Fixture DPD',
          amount: 491,
          currency: 'EUR',
          senderAddressType: 'DPD',
          recipientAddressType: 'DPD',
          courier: 'DPD',
        },
      ],
    };
    const shipping = new ShippingOperations(x.s);
    const rate = await new BuyerDeliveryQuotes(x.s).create(
      'store_a',
      'sandbox',
      { ...x.input, id: 'paid_fixture_rate' },
      adapter,
    );
    const input = { ...x.input, deliveryQuoteId: rate.id };
    const quote = await x.s.quote('store_a', 'sandbox', input);
    const request = { ...input, quoteHash: quote.quoteHash, acceptedPolicyVersion: 'test_v1' };
    const made = await x.s.createOrder('store_a', 'sandbox', request, key(7));
    assert.equal(made.order.snapshot.customer.address.line1, point.address);
    assert.equal(
      (await x.s.createOrder('store_a', 'sandbox', request, key(7))).order.id,
      made.order.id,
    );
    await x.s.checkout('store_a', 'sandbox', made.order.id, fakeCheckout);
    await x.s.acceptPayment(
      'store_a',
      'sandbox',
      payment(await x.s.getOrder('store_a', 'sandbox', made.order.id)),
    );
    await x.s.markPacked('store_a', 'sandbox', made.order.id);
    const dispatch = quote.delivery.dispatch;
    await shipping.origin(
      'store_a',
      'sandbox',
      { ...dispatch, id: 'locker_origin', reason: 'Test confirmed sender terminal' },
      'operator',
    );
    const plan = await shipping.prepare(
      'store_a',
      'sandbox',
      made.order.id,
      {
        id: 'locker_plan',
        originId: 'locker_origin',
        mode: 'individual',
        recipientIsCompany: false,
      },
      'operator',
    );
    assert.equal(plan.record.payload.origin.locker.providerId, 'LT_SENDER');
    assert.equal(plan.record.payload.recipient.locker.providerId, 'LT_TEST_1');
    await shipping.quote(
      'store_a',
      'sandbox',
      'locker_plan',
      { id: 'locker_shipping_quote' },
      adapter,
      'operator',
    );
    const command = await new ShipmentCommands(x.s).prepare(
      'store_a',
      'sandbox',
      made.order.id,
      {
        id: 'locker_command',
        planId: 'locker_plan',
        quoteId: 'locker_shipping_quote',
        serviceId: '42',
        maxCost: 491,
      },
      'operator',
    );
    assert.equal(command.command.payload.sender.locker.providerId, 'LT_SENDER');
    assert.equal(command.command.payload.recipient.locker.providerId, 'LT_TEST_1');
    assert.equal(command.command.payload.parcels.length, 1);
  } finally {
    x.db.close();
  }
});
