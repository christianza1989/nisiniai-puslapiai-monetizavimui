import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { createHandler } from '../src/http.mjs';
import { fixtureStore, fixtureProducts } from './fixtures.mjs';

test('shipping diagnostic is authorization-bound, strictly scoped and never invokes provider or writes', async () => {
  const db = new NodeDatabase();
  db.migrate();
  const service = new CommerceService(db);
  try {
    const method = {
      id: 'locker_omniva',
      label: 'Omniva',
      amount: 0,
      pricing: 'carrier',
      kind: 'locker',
      courier: 'omniva',
      serviceIds: ['601'],
      lockers: [{ id: 'fixture_locker', country: 'LT', label: 'Test locker' }],
    };
    const store = {
      ...fixtureStore(),
      shippingAccountRef: 'fixture_carrier',
      markets: [{ country: 'LT', currency: 'EUR', policyVersion: 'test_v1', delivery: [method] }],
    };
    await service.provisionStore(
      store,
      fixtureProducts().map((p) => ({ ...p, prices: { LT: p.prices.LT } })),
    );
    let calls = 0;
    const adapter = {
      environment: 'sandbox',
      provider: 'sendparcel',
      accountRef: 'fixture_carrier',
      supportsBooking: true,
      admission: {
        approved: true,
        serviceIds: ['601', 'secret_not_returned'],
        lockerBindings: { omniva: 'terminalid' },
        lockerVerificationFields: { omniva: 'terminalid' },
      },
      quote: async () => {
        calls++;
        throw Error('not allowed');
      },
      createBooking: async () => {
        calls++;
        throw Error('not allowed');
      },
    };
    const handler = createHandler({
      service,
      environment: 'sandbox',
      shippingAdapters: { store_a: adapter },
      operatorAuthorize: async (request) =>
        request.headers.get('x-role') === 'ship'
          ? { id: 'owner', storeId: 'store_a', permissions: ['ship'] }
          : request.headers.get('x-role') === 'read'
            ? { id: 'reader', storeId: 'store_a', permissions: ['read'] }
            : false,
    });
    const url =
      'https://store-a.example/api/operator/shipping-capability?country=LT&delivery=locker_omniva&service=601';
    const get = (u, role) => handler(new Request(u, { headers: role ? { 'x-role': role } : {} }));
    assert.equal((await get(url)).status, 403);
    assert.equal((await get(url, 'read')).status, 403);
    const result = await get(url, 'ship');
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await result.json(), {
      bookingConnected: true,
      serviceAdmitted: true,
      lockerBindingReady: true,
      lockerUsesTerminalId: true,
    });
    assert.equal((await get(url.replace('601', '602'), 'ship')).status, 404);
    assert.equal((await get(url + '&service=601', 'ship')).status, 400);
    assert.equal((await get(url.replace('country=LT', 'country=PL'), 'ship')).status, 404);
    assert.equal((await get(url.replace('locker_omniva', 'unknown'), 'ship')).status, 404);
    adapter.admission.serviceIds = ['602'];
    adapter.admission.lockerVerificationFields.omniva = 'address2';
    assert.deepEqual(await (await get(url, 'ship')).json(), {
      bookingConnected: true,
      serviceAdmitted: false,
      lockerBindingReady: false,
      lockerUsesTerminalId: false,
    });
    adapter.accountRef = 'other';
    assert.deepEqual(await (await get(url, 'ship')).json(), {
      bookingConnected: false,
      serviceAdmitted: false,
      lockerBindingReady: false,
      lockerUsesTerminalId: false,
    });
    assert.equal(calls, 0);
    assert.equal(
      (await db.prepare('SELECT COUNT(*) AS count FROM shipping_quotes').first()).count,
      0,
    );
    assert.equal(
      (await db.prepare('SELECT COUNT(*) AS count FROM shipment_commands').first()).count,
      0,
    );
  } finally {
    db.close();
  }
});

test('locker catalogue search is restricted, bounded, strips extras and has no writes or booking calls', async () => {
  const db = new NodeDatabase();
  db.migrate();
  const service = new CommerceService(db);
  try {
    await service.provisionStore(
      { ...fixtureStore(), shippingAccountRef: 'fixture_carrier' },
      fixtureProducts(),
    );
    let calls = 0;
    const adapter = {
      environment: 'sandbox',
      provider: 'sendparcel',
      accountRef: 'fixture_carrier',
      lockers: async (country, courier) => {
        calls++;
        assert.equal(country, 'LT');
        assert.equal(courier, 'dpd');
        return Array.from({ length: 35 }, (_, i) => ({
          id: String(i + 1),
          country: 'LT',
          carrier: 'dpd',
          name: 'Salininkų NORFA ' + i,
          address: 'Salininkų g. 129',
          city: 'Vilnius',
          postalCode: '02100',
          carrierLockerId: 'point' + i,
          secret: 'must-not-return',
        }));
      },
      createBooking: async () => {
        throw Error('booking not allowed');
      },
    };
    const handler = createHandler({
      service,
      environment: 'sandbox',
      shippingReadAdapters: { store_a: adapter },
      operatorAuthorize: async (req) =>
        req.headers.get('x-role') === 'ship'
          ? { id: 'owner', storeId: 'store_a', permissions: ['ship'] }
          : false,
    });
    const url =
      'https://store-a.example/api/operator/shipping-locker-catalog?courier=dpd&q=salinink';
    const get = (u, role) => handler(new Request(u, { headers: role ? { 'x-role': role } : {} }));
    assert.equal((await get(url)).status, 403);
    assert.equal(calls, 0);
    assert.equal((await get(url.replace('dpd', 'omniva'), 'ship')).status, 400);
    assert.equal(calls, 0);
    assert.equal((await get(url.replace('salinink', 's'), 'ship')).status, 400);
    assert.equal(calls, 0);
    const response = await get(url, 'ship');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const result = await response.json();
    assert.equal(result.truncated, true);
    assert.equal(result.lockers.length, 30);
    assert.equal(JSON.stringify(result).includes('must-not-return'), false);
    assert.equal(calls, 1);
    assert.equal(
      (await db.prepare('SELECT COUNT(*) AS count FROM shipping_quotes').first()).count,
      0,
    );
    assert.equal(
      (await db.prepare('SELECT COUNT(*) AS count FROM shipment_commands').first()).count,
      0,
    );
  } finally {
    db.close();
  }
});
