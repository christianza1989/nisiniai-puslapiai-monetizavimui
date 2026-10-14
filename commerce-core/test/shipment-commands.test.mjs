import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { ShippingOperations } from '../src/shipping.mjs';
import { ShipmentCommands } from '../src/shipment-commands.mjs';
import { SendparcelBookingAdapter } from '../src/sendparcel-booking.mjs';
import { FinishedStock } from '../src/finished-stock.mjs';
import { fixtureStore, fixtureProducts, cart, key, fakeCheckout, payment } from './fixtures.mjs';
const origin = {
  id: 'origin',
  country: 'LT',
  name: 'Fixture MB',
  line1: 'Testinė g. 1',
  city: 'Vilnius',
  postalCode: '02211',
  phone: '+37060000000',
  email: 'sender@example.test',
  isCompany: true,
  reason: 'Fixture complete sender',
};
async function setup(tracked = false) {
  let clock = Date.now(),
    creates = 0,
    lose = false,
    price = 799;
  const db = new NodeDatabase();
  db.migrate();
  const s = new CommerceService(db, { now: () => clock }),
    shipping = new ShippingOperations(s);
  await s.provisionStore(
    { ...fixtureStore(), shippingAccountRef: 'carrier_fixture', requireCustomer: true },
    fixtureProducts(tracked ? 0 : 10).map((p) => ({
      ...p,
      ...(tracked ? { lotTrackingRequired: true } : {}),
    })),
  );
  if (tracked)
    await new FinishedStock(s).receive(
      'store_a',
      'sandbox',
      {
        id: 'shipping_lot',
        sku: 'couple',
        mode: 'receive',
        quantity: 1,
        expectedAvailable: 0,
        supplierRef: 'TEST batch',
        reason: 'TEST inspected stock',
        qualityChecked: true,
        expiresAt: clock + 100000,
        quarantined: false,
      },
      'operator',
    );
  const { order } = await s.createOrder(
    'store_a',
    'sandbox',
    {
      ...cart(),
      customer: {
        name: 'Test Pirkėjas',
        email: 'buyer@example.test',
        phone: '+37060000001',
        address: { country: 'LT', line1: 'Testinė g. 2', city: 'Kaunas', postalCode: '44001' },
      },
    },
    key(1),
  );
  await s.checkout('store_a', 'sandbox', order.id, fakeCheckout);
  await s.acceptPayment(
    'store_a',
    'sandbox',
    payment(await s.getOrder('store_a', 'sandbox', order.id)),
  );
  await s.markPacked('store_a', 'sandbox', order.id);
  const bookings = new Map();
  const adapter = new SendparcelBookingAdapter({
    environment: 'sandbox',
    accountRef: 'carrier_fixture',
    apiPassword: 'fixture_api_password',
    rateLimiter: { run: (_scope, perform) => perform() },
    bookingAdmission: {
      approved: true,
      protocol: 'legacy_single_attempt',
      contractReference: 'EXPLICIT TEST FIXTURE',
      costCeilingGuaranteed: true,
      serviceIds: ['42'],
    },
    fetchImpl: async (url, options) => {
      const p = new URL(url).pathname,
        b = JSON.parse(options.body);
      if (p.endsWith('/quotes'))
        return Response.json({
          offers: [
            {
              product: { id: 42, name: 'TEST' },
              total_price: { amount_in_cents: price, currency: 'EUR' },
            },
          ],
        });
      if (p.endsWith('/creates')) {
        creates++;
        const q = b.orderCreate,
          fact = {
            id: '1001',
            status: 1,
            tracking_number: 'TEST1001',
            shipper: q.shipper,
            recipient: q.recipient,
            parcels: q.parcels,
          };
        bookings.set('1001', fact);
        if (lose) {
          lose = false;
          throw new Error('lost');
        }
        return Response.json(fact);
      }
      if (p.endsWith('/infos')) return Response.json(bookings.get(String(b.orderInfo.id)) || {});
      if (p.endsWith('/documents'))
        return Response.json([
          {
            file_name: 'fixture.pdf',
            ftype: 'application/pdf',
            file_data: btoa('%PDF-1.7\nfixture'),
          },
        ]);
      if (p.endsWith('/tracks'))
        return Response.json({
          info: [{ date: '2026-10-12 10:00:00', event: 'Fixture scanned', location: 'Vilnius' }],
        });
      throw new Error('unplanned fixture operation');
    },
  });
  await shipping.origin('store_a', 'sandbox', origin, 'operator');
  await shipping.prepare(
    'store_a',
    'sandbox',
    order.id,
    { id: 'plan', originId: 'origin', recipientIsCompany: false, mode: 'individual' },
    'operator',
  );
  await shipping.quote('store_a', 'sandbox', 'plan', { id: 'quote' }, adapter, 'operator');
  const blobs = new Map(),
    vault = {
      put: async (k, b) => {
        blobs.set(k, b);
      },
      get: async (k) => blobs.get(k),
    },
    commands = new ShipmentCommands(s, vault);
  const input = { id: 'command', planId: 'plan', quoteId: 'quote', serviceId: '42', maxCost: 799 };
  await commands.prepare('store_a', 'sandbox', order.id, input, 'operator');
  return {
    db,
    s,
    commands,
    adapter,
    order,
    input,
    bookings,
    blobs,
    creates: () => creates,
    lose: () => {
      lose = true;
    },
    price: (n) => {
      price = n;
    },
    tick: (ms) => {
      clock += ms;
    },
  };
}
test('a quarantine racing the final booking mark is rejected by SQL before any carrier POST', async () => {
  const x = await setup(true);
  try {
    const original = x.s.stmt.bind(x.s);
    let injected = false;
    x.s.stmt = (sql, ...args) => {
      const statement = original(sql, ...args);
      if (sql.startsWith('UPDATE shipment_commands SET first_attempt_at=')) {
        const run = statement.run.bind(statement);
        statement.run = async () => {
          if (!injected) {
            injected = true;
            await new FinishedStock(x.s).control(
              'store_a',
              'sandbox',
              {
                id: 'racing_quarantine',
                sku: 'couple',
                lotId: 'shipping_lot',
                kind: 'quarantine',
                delta: 0,
                expectedAvailable: 0,
                expectedVersion: 1,
                reason: 'TEST concurrent supplier hold',
              },
              'operator',
            );
          }
          return run();
        };
      }
      return statement;
    };
    await assert.rejects(
      x.commands.execute('store_a', 'sandbox', 'command', x.adapter, 'operator'),
      /stock_quality_hold/,
    );
    assert.equal(injected, true);
    assert.equal(x.creates(), 0);
    const command = await x.commands.get('store_a', 'sandbox', 'command');
    assert.equal(command.first_attempt_at, null);
    assert.equal(command.state, 'planned');
    assert.equal(command.review_reason, 'stock_quality_hold');
  } finally {
    x.db.close();
  }
});
test('non-idempotent carrier gets one POST; timeout survives retry, facts reconciliation and private document/tracking replay', async () => {
  const x = await setup();
  x.lose();
  await assert.rejects(
    x.commands.execute('store_a', 'sandbox', 'command', x.adapter, 'operator'),
    /carrier_transport_failed/,
  );
  assert.equal((await x.commands.get('store_a', 'sandbox', 'command')).state, 'unknown');
  x.tick(60001);
  await assert.rejects(
    x.commands.execute('store_a', 'sandbox', 'command', x.adapter, 'operator'),
    /shipment_reconciliation_required/,
  );
  assert.equal(x.creates(), 1);
  const fact = x.bookings.get('1001');
  x.bookings.set('1002', {
    ...fact,
    id: '1002',
    recipient: { ...fact.recipient, address1: 'Wrong g. 99' },
  });
  await assert.rejects(
    x.commands.reconcile(
      'store_a',
      'sandbox',
      'command',
      { providerId: '1002', reason: 'Fixture check' },
      x.adapter,
      'operator',
    ),
    /shipment_facts_mismatch/,
  );
  const r = await x.commands.reconcile(
    'store_a',
    'sandbox',
    'command',
    { providerId: '1001', reason: 'Matched in carrier account' },
    x.adapter,
    'operator',
  );
  assert.equal(r.command.state, 'registered');
  assert.equal(
    (await x.s.getOrder('store_a', 'sandbox', x.order.id)).fulfillment_state,
    'labelled',
  );
  await x.commands.refresh('store_a', 'sandbox', 'command', x.adapter, 'operator');
  await x.commands.refresh('store_a', 'sandbox', 'command', x.adapter, 'operator');
  assert.equal(x.blobs.size, 1);
  assert.equal(
    (await x.s.one("SELECT COUNT(*) n FROM shipment_observations WHERE kind='tracking'")).n,
    1,
  );
  assert.equal(
    (await x.commands.execute('store_a', 'sandbox', 'command', x.adapter, 'operator')).replayed,
    true,
  );
  assert.equal(x.creates(), 1);
  await assert.rejects(
    x.s.stmt('UPDATE shipment_commands SET first_attempt_at=NULL').run(),
    /shipment_command_immutable/,
  );
  x.db.close();
});
test('concurrent execution registers once; changed price is stopped before POST and unsubmitted cancellation permits replacement', async () => {
  const x = await setup();
  x.price(999);
  await assert.rejects(
    x.commands.execute('store_a', 'sandbox', 'command', x.adapter, 'operator'),
    /shipment_price_changed/,
  );
  assert.equal(x.creates(), 0);
  assert.equal((await x.commands.get('store_a', 'sandbox', 'command')).first_attempt_at, null);
  await x.commands.cancel('store_a', 'sandbox', 'command', 'operator');
  await x.commands.prepare(
    'store_a',
    'sandbox',
    x.order.id,
    { ...x.input, id: 'replacement' },
    'operator',
  );
  x.price(799);
  const results = await Promise.allSettled(
    [1, 2].map(() =>
      x.commands.execute('store_a', 'sandbox', 'replacement', x.adapter, 'operator'),
    ),
  );
  assert.ok(results.some((r) => r.status === 'fulfilled'));
  assert.equal(x.creates(), 1);
  await assert.rejects(
    x.commands.cancel('store_a', 'sandbox', 'replacement', 'operator'),
    /shipment_execution_not_allowed/,
  );
  x.db.close();
});
test('booking needs a documented ceiling contract and approved service; staging keys alone remain read-only', () => {
  const config = {
    environment: 'sandbox',
    accountRef: 'carrier',
    apiPassword: 'fixture_api_password',
    rateLimiter: { run: (_scope, perform) => perform() },
  };
  assert.throws(() => new SendparcelBookingAdapter(config), /carrier_booking_contract_missing/);
  assert.throws(
    () =>
      new SendparcelBookingAdapter({
        ...config,
        bookingAdmission: {
          approved: true,
          protocol: 'legacy_single_attempt',
          contractReference: 'Fixture',
          serviceIds: ['42'],
        },
      }),
    /carrier_booking_contract_missing/,
  );
});

test('locker multi-parcel limits reject before quote or create; only DPD Estonia permits up to five', async () => {
  const x = await setup();
  x.adapter.admission.serviceCouriers = { 42: 'dpd' };
  const payload = (country, courier, count) => ({
    serviceId: '42',
    sender: origin,
    recipient: { country, locker: { courier } },
    parcels: Array.from({ length: count }, () => ({
      weightGrams: 2000,
      dimensionsMm: [200, 200, 170],
    })),
  });
  assert.throws(
    () => x.adapter.validateParcels(payload('LT', 'dpd', 2)),
    /carrier_locker_parcel_limit/,
  );
  assert.throws(
    () => x.adapter.validateParcels(payload('EE', 'omniva', 2)),
    /carrier_locker_parcel_limit/,
  );
  assert.throws(
    () => x.adapter.validateParcels(payload('EE', 'dpd', 6)),
    /carrier_locker_parcel_limit/,
  );
  assert.doesNotThrow(() => x.adapter.validateParcels(payload('EE', 'dpd', 5)));
  x.adapter.admission.serviceCouriers['42'] = 'omniva';
  assert.throws(
    () => x.adapter.validateParcels(payload('EE', 'dpd', 5)),
    /carrier_locker_parcel_limit/,
  );
  await assert.rejects(
    x.adapter.createBooking(payload('LT', 'dpd', 2)),
    /carrier_locker_parcel_limit/,
  );
  assert.equal(x.creates(), 0);
  x.db.close();
});

test('admitted v1 fresh-quote protocol supports one booking without insurance or a false absolute-cost claim', async () => {
  const x = await setup();
  const sent = [];
  const adapter = new SendparcelBookingAdapter({
    environment: 'sandbox',
    accountRef: 'carrier_fixture',
    apiPassword: 'fixture_api_password',
    rateLimiter: { run: (_scope, f) => f() },
    bookingAdmission: {
      approved: true,
      protocol: 'legacy_single_attempt',
      pricingProtocol: 'v1_fresh_quote_no_insurance',
      contractReference: 'Provider IT protocol fixture',
      serviceIds: ['42'],
    },
    fetchImpl: async (url, options) => {
      sent.push({ path: new URL(url).pathname, body: JSON.parse(options.body) });
      return x.adapter.fetch(url, options);
    },
  });
  assert.equal(adapter.costCeilingGuaranteed, false);
  const command = await x.commands.get('store_a', 'sandbox', x.input.id);
  x.price(800);
  assert.equal(await adapter.validateCost(command.payload), false);
  assert.equal(x.creates(), 0);
  x.price(799);
  await x.commands.execute('store_a', 'sandbox', x.input.id, adapter, 'operator');
  assert.equal(x.creates(), 1);
  const create = sent.find((s) => s.path.endsWith('/creates')).body.orderCreate;
  assert.equal(create.product_id, '42');
  assert.equal('insurance' in create, false);
  assert.equal('idempotency_key' in create, false);
  assert.equal((await x.commands.get('store_a', 'sandbox', x.input.id)).state, 'registered');
  x.db.close();
});

test('private provider response and filename evidence bind labels to complete parcel tracking order; incomplete sequences stay unmapped', async () => {
  const x = await setup();
  await x.commands.execute('store_a', 'sandbox', x.input.id, x.adapter, 'operator');
  const fact = x.adapter.fact({
    id: '1001',
    status: 1,
    tracking_number: 'ORDER_TRACK',
    shipper: {},
    recipient: {},
    parcels: [
      { weight: 2, length: 20, width: 20, height: 17, tracking_number: 'PACK_ONE' },
      { weight: 4, length: 25, width: 25, height: 20, tracking_number: 'PACK_TWO' },
    ],
  });
  assert.deepEqual(fact.trackingNumbers, ['PACK_ONE', 'PACK_TWO']);
  assert.equal(fact.providerResponse.tracking_number, 'ORDER_TRACK');
  const incomplete = structuredClone(fact.providerResponse);
  delete incomplete.parcels[1].tracking_number;
  assert.equal(x.adapter.fact(incomplete).trackingNumbers, null);
  x.adapter.labelFileNames.add('label.pdf');
  const actualFetch = x.adapter.fetch;
  x.adapter.fetch = async (url, options) =>
    new URL(url).pathname.endsWith('/documents')
      ? Response.json([
          { file_name: 'terms.pdf', ftype: 'application/pdf', file_data: btoa('%PDF-1.7\nterms') },
          { file_name: 'label.pdf', ftype: 'application/pdf', file_data: btoa('%PDF-1.7\nlabel') },
        ])
      : actualFetch(url, options);
  const result = await x.commands.refresh('store_a', 'sandbox', x.input.id, x.adapter, 'operator');
  assert.equal(result.files.length, 2);
  assert.equal(result.documents[0].kind, 'document');
  assert.equal(result.documents[1].kind, 'label');
  assert.equal(result.documents[1].trackingNumber, 'TEST1001');
  const rows = await x.s.rows(
    "SELECT payload_json FROM shipment_observations WHERE kind='document' ORDER BY received_at,id",
  );
  const labels = rows.map((r) => JSON.parse(r.payload_json)).filter((r) => r.kind === 'label');
  assert.equal(labels.length, 1);
  assert.equal(labels[0].providerFilename, 'label.pdf');
  assert.equal(labels[0].parcelIndex, 0);
  assert.equal(labels[0].trackingNumber, 'TEST1001');
  assert.equal(labels[0].labelMappingVerified, true);
  x.db.close();
});
