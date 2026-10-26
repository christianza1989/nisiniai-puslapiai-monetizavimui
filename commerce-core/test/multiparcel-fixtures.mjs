import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { ShippingAutomation } from '../src/shipping-automation.mjs';
import { CommerceService } from '../src/service.mjs';
import { BuyerDeliveryQuotes } from '../src/buyer-delivery.mjs';
import { ShippingOperations } from '../src/shipping.mjs';
import { ShipmentCommands } from '../src/shipment-commands.mjs';
import { fixtureStore, fixtureProducts, key, fakeCheckout, payment } from './fixtures.mjs';
export const terminal = {
  id: 'salininkai',
  country: 'LT',
  courier: 'omniva',
  providerId: 'TEST_TERMINAL',
  label: 'TEST Salininkų NORFA paštomatas',
  address: 'Testinė g. 1',
  city: 'Vilnius',
  postalCode: '01111',
};
export async function multiparcelFixture(db, { quantity = 3, paid = true, planned = true } = {}) {
  const config = {
    ...fixtureStore(),
    requireCustomer: true,
    shippingAccountRef: 'carrier_fixture',
    dispatch: {
      country: 'LT',
      city: 'Vilnius',
      postalCode: '02211',
      line1: 'Siuntėjo g. 1',
      name: 'TEST sender',
      phone: '+37060000000',
      email: 'sender@example.test',
      isCompany: true,
    },
    dispatchLockers: { omniva: { ...terminal, id: 'sender', providerId: 'TEST_SENDER' } },
    markets: [
      {
        country: 'LT',
        currency: 'EUR',
        policyVersion: 'fixture_v1',
        delivery: [
          {
            id: 'door',
            label: 'Kurjeris',
            pricing: 'carrier',
            amount: 0,
            serviceIds: ['42'],
            customerCharge: 'single_parcel',
          },
          {
            id: 'omniva',
            label: 'Omniva paštomatas',
            kind: 'locker',
            courier: 'omniva',
            senderMode: 'locker',
            pricing: 'carrier',
            amount: 0,
            serviceIds: ['42'],
            maxParcels: 1,
            customerCharge: 'single_parcel',
            lockers: [terminal],
          },
        ],
      },
    ],
  };
  const s = new CommerceService(db);
  await s.provisionStore(
    config,
    fixtureProducts(100).map((p) => ({ ...p, prices: { LT: p.prices.LT } })),
  );
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText('LOCAL FIXTURE LABEL');
  const bytes = await pdf.save();
  const bookings = new Map(),
    blobs = new Map(),
    quoteCalls = [];
  let calls = 0,
    lose = false;
  const adapter = {
    environment: 'sandbox',
    accountRef: 'carrier_fixture',
    provider: 'fixture_carrier',
    supportsBooking: true,
    supportsIdempotentCreate: false,
    costCeilingGuaranteed: true,
    quote: async (payload) => {
      quoteCalls.push(structuredClone(payload));
      return [
        {
          serviceId: '42',
          name: 'TEST delivery',
          currency: 'EUR',
          amount: payload.parcels[0].weightGrams >= 4000 ? 599 : 472,
          senderAddressType: 'OMNIVA',
          recipientAddressType: 'OMNIVA',
        },
      ];
    },
    validateCost: async (p) => (await adapter.quote(p)).some((o) => o.amount <= p.maxCost),
    createBooking: async (p) => {
      assert.equal(p.parcels.length, 1);
      const fact = {
        id: 'fixture_' + ++calls,
        tracking: 'TEST' + calls,
        sender: p.sender,
        recipient: p.recipient,
        parcels: p.parcels,
      };
      bookings.set(fact.id, fact);
      if (lose) {
        lose = false;
        throw Error('fixture reply lost');
      }
      return fact;
    },
    verifyBooking: async (p, f) =>
      JSON.stringify([p.sender, p.recipient, p.parcels]) ===
      JSON.stringify([f.sender, f.recipient, f.parcels]),
    bookingInformation: async (id) => bookings.get(id),
    documents: async () => [{ bytes, kind: 'label', providerFilename: 'fixture.pdf' }],
    tracking: async () => [{ text: 'TEST scanned', providerDate: '2026-10-26' }],
  };
  const storage = { put: async (k, b) => blobs.set(k, b), get: async (k) => blobs.get(k) };
  const input = {
    country: 'LT',
    currency: 'EUR',
    deliveryId: 'omniva',
    lines: [{ sku: 'couple', quantity }],
    customer: {
      name: 'TEST buyer',
      email: 'buyer@example.test',
      phone: '+37060000001',
      lockerId: terminal.id,
      address: { country: 'LT', line1: 'ignored', city: 'ignored', postalCode: '00000' },
    },
  };
  const q = await new BuyerDeliveryQuotes(s).create(
    'store_a',
    'sandbox',
    { ...input, id: 'buyer_fixture' },
    adapter,
  );
  const order = (
    await s.createOrder('store_a', 'sandbox', { ...input, deliveryQuoteId: q.id }, key(91))
  ).order;
  if (paid) {
    await s.checkout('store_a', 'sandbox', order.id, fakeCheckout);
    await s.acceptPayment(
      'store_a',
      'sandbox',
      payment(await s.getOrder('store_a', 'sandbox', order.id)),
    );
    await s.markPacked('store_a', 'sandbox', order.id);
  }
  const ops = new ShippingOperations(s),
    dispatch = (await s.getOrder('store_a', 'sandbox', order.id)).snapshot.delivery.dispatch;
  await ops.origin(
    'store_a',
    'sandbox',
    { ...dispatch, id: 'origin', reason: 'TEST fixture sender' },
    'operator',
  );
  const plan =
    paid && planned
      ? await ops.prepare(
          'store_a',
          'sandbox',
          order.id,
          { id: 'plan', originId: 'origin', mode: 'individual', recipientIsCompany: false },
          'operator',
        )
      : null;
  const commands = new ShipmentCommands(s, storage);
  const prepare = async (index, id = 'part_' + index, planId = 'plan') => {
    const quoteId = 'quote_' + id;
    await ops.quote(
      'store_a',
      'sandbox',
      planId,
      { id: quoteId, parcelIndex: index },
      adapter,
      'operator',
    );
    return commands.prepare(
      'store_a',
      'sandbox',
      order.id,
      { id, planId, quoteId, serviceId: '42', maxCost: 472, parcelIndex: index },
      'operator',
    );
  };
  return {
    s,
    db,
    config,
    input,
    order,
    ops,
    commands,
    plan,
    adapter,
    storage,
    bookings,
    blobs,
    quoteCalls,
    prepare,
    creates: () => calls,
    loseOnce: () => {
      lose = true;
    },
  };
}

export async function proveParcelSlots(db) {
  const x = await multiparcelFixture(db);
  const { s, order, commands, adapter } = x;
  await assert.rejects(
    x.ops.quote('store_a', 'sandbox', 'plan', { id: 'whole_plan' }, adapter, 'operator'),
    /carrier_locker_parcel_limit/,
  );
  await assert.rejects(x.prepare(3), /invalid_shipment_parcel/);
  await Promise.all([x.prepare(0, 'first'), x.prepare(1, 'second')]);
  await assert.rejects(x.prepare(0, 'duplicate'), /shipment_command_conflict/);
  await assert.rejects(
    commands.prepare(
      'store_a',
      'sandbox',
      order.id,
      {
        id: 'wrong_index',
        planId: 'plan',
        quoteId: 'quote_first',
        serviceId: '42',
        maxCost: 472,
        parcelIndex: 2,
      },
      'operator',
    ),
    /shipment_quote_mismatch/,
  );
  await x.ops.prepare(
    'store_a',
    'sandbox',
    order.id,
    { id: 'other_plan', originId: 'origin', mode: 'individual', recipientIsCompany: false },
    'operator',
  );
  await assert.rejects(x.prepare(2, 'foreign_plan', 'other_plan'), /shipment_command_conflict/);
  await Promise.allSettled(
    Array.from({ length: 5 }, () =>
      commands.execute('store_a', 'sandbox', 'first', adapter, 'operator'),
    ),
  );
  assert.equal(x.creates(), 1);
  assert.equal((await s.getOrder('store_a', 'sandbox', order.id)).fulfillment_state, 'ready');
  assert.equal((await s.rows("SELECT * FROM outbox WHERE kind='ShipmentRegistered'")).length, 0);
  await assert.rejects(
    s.registerShipment('store_a', 'sandbox', order.id, {
      supportsIdempotentCreate: true,
      requiresCustomer: false,
    }),
    /shipment_command_conflict/,
  );
  x.loseOnce();
  await assert.rejects(
    commands.execute('store_a', 'sandbox', 'second', adapter, 'operator'),
    /shipment_outcome_unknown/,
  );
  assert.equal(x.creates(), 2);
  const restarted = new ShipmentCommands(new CommerceService(db), x.storage);
  await assert.rejects(
    restarted.execute('store_a', 'sandbox', 'second', adapter, 'operator'),
    /shipment_reconciliation_required/,
  );
  assert.equal(x.creates(), 2);
  await restarted.reconcile(
    'store_a',
    'sandbox',
    'second',
    { providerId: 'fixture_2', reason: 'TEST lookup exact provider facts' },
    adapter,
    'operator',
  );
  assert.equal((await s.getOrder('store_a', 'sandbox', order.id)).fulfillment_state, 'ready');
  await x.prepare(2, 'third');
  await restarted.execute('store_a', 'sandbox', 'third', adapter, 'operator');
  assert.equal(x.creates(), 3);
  assert.equal((await s.getOrder('store_a', 'sandbox', order.id)).fulfillment_state, 'labelled');
  assert.equal((await s.rows("SELECT * FROM outbox WHERE kind='ShipmentRegistered'")).length, 1);
  assert.equal(
    (await restarted.execute('store_a', 'sandbox', 'third', adapter, 'operator')).replayed,
    true,
  );
  assert.equal(x.creates(), 3);
  const configs = structuredClone(x.config);
  configs.automationPolicy = { autoCollectShipmentDocuments: true };
  await db
    .prepare('UPDATE stores SET config_json=? WHERE id=?')
    .bind(JSON.stringify(configs), 'store_a')
    .run();
  const result = await new ShippingAutomation(s, {
    shippingAdapters: { store_a: adapter },
    privateStorage: x.storage,
  }).collectRegistered('store_a', 'sandbox', order.id);
  assert.equal(result.labelsAvailable, true);
  assert.equal(result.results.length, 3);
  assert.equal(
    (await s.rows("SELECT * FROM private_files WHERE kind='shipment_document'")).length,
    3,
  );
  assert.equal(x.creates(), 3);
  assert.equal((await s.getOrder('store_a', 'sandbox', order.id)).amount, 10072);
  assert.equal(
    (await commands.list('store_a', 'sandbox', order.id)).filter((c) => c.state === 'registered')
      .length,
    3,
  );
  return x;
}
