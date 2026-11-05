import test from 'node:test';
import assert from 'node:assert/strict';
import { memocastingOmnivaAdmission, runtimeOptions } from '../src/runtime.mjs';
import { SendparcelBookingAdapter } from '../src/sendparcel-booking.mjs';
import { SENDPARCEL_PRODUCTION } from '../src/sendparcel-adapter.mjs';

const carrier = () => ({
  accountRef: 'sendparcel_memocasting_production',
  bookingAdmission: {
    approved: true,
    protocol: 'legacy_single_attempt',
    contractReference: 'FIXTURE ONLY',
    pricingProtocol: 'v1_fresh_quote_no_insurance',
    serviceIds: ['55', '228', '94'],
    lockerBindings: { omniva: 'terminalid' },
    lockerVerificationFields: { omniva: 'terminalid' },
  },
});
test('verified service migration applies only to exact authorized production identity and retains all secret inputs untouched', () => {
  const original = carrier(),
    before = structuredClone(original);
  const admission = memocastingOmnivaAdmission('production', 'store_memocasting', original);
  assert.deepEqual(admission.serviceIds, ['55', '228', '94', '601']);
  assert.equal(admission.memocastingRestricted601, true);
  assert.deepEqual(original, before);
  const variants = [
    ['sandbox', 'store_memocasting', carrier()],
    ['production', 'other_store', carrier()],
    ['production', 'store_memocasting', { ...carrier(), accountRef: 'other_account' }],
    [
      'production',
      'store_memocasting',
      { ...carrier(), bookingAdmission: { ...carrier().bookingAdmission, approved: false } },
    ],
    [
      'production',
      'store_memocasting',
      { ...carrier(), bookingAdmission: { ...carrier().bookingAdmission, serviceIds: ['94'] } },
    ],
    [
      'production',
      'store_memocasting',
      {
        ...carrier(),
        bookingAdmission: { ...carrier().bookingAdmission, lockerBindings: { omniva: 'address2' } },
      },
    ],
    [
      'production',
      'store_memocasting',
      {
        ...carrier(),
        bookingAdmission: {
          ...carrier().bookingAdmission,
          lockerVerificationFields: { omniva: 'address2' },
        },
      },
    ],
  ];
  for (const [env, store, value] of variants)
    assert.equal(memocastingOmnivaAdmission(env, store, value), value.bookingAdmission);
  const existing = carrier();
  existing.bookingAdmission.serviceIds.push('601');
  assert.equal(
    memocastingOmnivaAdmission('production', 'store_memocasting', existing),
    existing.bookingAdmission,
  );
});

test('runtime wires only the authorized adapter copy and does not rewrite the original secret string', () => {
  const config = carrier();
  config.apiPassword = 'fixture_key';
  config.productionReadAdmission = true;
  const connections = JSON.stringify({ store_memocasting: { sendparcel: config } });
  const env = {
    COMMERCE_ENV: 'production',
    COMMERCE_RUNTIME_ADMISSION: 'approved',
    COMMERCE_CONNECTIONS: connections,
    COMMERCE_DB: {
      prepare() {
        throw Error('no runtime query expected');
      },
    },
  };
  const adapter = runtimeOptions(env).shippingAdapters.store_memocasting;
  assert.ok(adapter.admission.serviceIds.includes('601'));
  assert.equal(adapter.admission.memocastingRestricted601, true);
  assert.equal(env.COMMERCE_CONNECTIONS, connections);
  assert.equal(
    JSON.parse(connections).store_memocasting.sendparcel.bookingAdmission.serviceIds.includes(
      '601',
    ),
    false,
  );
});
test('new service only passes validation for Omniva locker-to-locker and keeps existing IDs unchanged', async () => {
  const admission = memocastingOmnivaAdmission('production', 'store_memocasting', carrier());
  const adapter = new SendparcelBookingAdapter({
    environment: 'production',
    baseUrl: SENDPARCEL_PRODUCTION,
    productionReadAdmission: true,
    accountRef: 'sendparcel_memocasting_production',
    apiPassword: 'fixture_key',
    rateLimiter: { run: (_key, fn) => fn() },
    bookingAdmission: admission,
  });
  const address = {
    country: 'LT',
    name: 'Test Fixture',
    city: 'Vilnius',
    line1: 'Test g. 1',
    postalCode: '02100',
    phone: '+37060000000',
    email: 'fixture@example.test',
    isCompany: false,
    locker: { courier: 'omniva', providerId: '02100' },
  };
  const payload = {
    sender: address,
    recipient: address,
    serviceId: '601',
    parcels: [{ weightGrams: 2200, dimensionsMm: [200, 200, 170] }],
    value: 3200,
    currency: 'EUR',
    maxCost: 500,
  };
  let calls = 0;
  adapter.quote = async () => {
    calls++;
    return [{ serviceId: '601', currency: 'EUR', amount: 400 }];
  };
  assert.equal(await adapter.validateCost(payload), true);
  assert.equal(calls, 1);
  for (const changed of [
    { sender: { ...address, locker: undefined } },
    { recipient: { ...address, locker: undefined } },
    { recipient: { ...address, locker: { courier: 'dpd', providerId: 'x' } } },
    { sender: { ...address, country: 'LV' } },
    { recipient: { ...address, country: 'EE' } },
  ]) {
    const input = { ...payload, ...changed };
    assert.equal(adapter.serviceAdmitted(input), false);
    await assert.rejects(adapter.createBooking(input), /invalid_shipment_command/);
  }
  assert.equal(calls, 1);
  assert.equal(
    adapter.serviceAdmitted({
      ...payload,
      serviceId: '228',
      sender: { ...address, locker: undefined },
    }),
    true,
  );
});
