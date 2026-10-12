// Explicit test-only provider simulation. Never import into production runtime.
import { SendparcelBookingAdapter } from '../src/sendparcel-booking.mjs';
import { fixtureStore, fixtureProducts } from './fixtures.mjs';
export function foundationStore(host, id = 'store_foundation') {
  return {
    ...fixtureStore(id),
    hosts: [host],
    requireCustomer: true,
    shippingAccountRef: 'fixture_sendparcel',
    markets: ['LT', 'PL', 'LV', 'EE'].map((country) => ({
      country,
      currency: 'EUR',
      policyVersion: 'fixture_v1',
      delivery: [
        { id: 'fixture_door', amount: 799, label: 'TEST kurjeris', kind: 'door' },
        {
          id: 'fixture_locker',
          amount: 499,
          label: 'TEST paštomatas',
          kind: 'locker',
          lockers: [{ id: 'fixture_' + country, label: 'TEST terminal - ' + country, country }],
        },
      ],
    })),
    checkout: {
      successUrl: 'http://' + host + '/commerce',
      cancelUrl: 'http://' + host + '/commerce',
    },
  };
}
export function foundationProducts() {
  return fixtureProducts(100)
    .filter((p) => p.sku !== 'couple_white')
    .map((p) => ({
      ...p,
      prices: Object.fromEntries(
        ['LT', 'PL', 'LV', 'EE'].map((c) => [c, p.sku === 'couple' ? 3200 : 4800]),
      ),
    }));
}
export function foundationPayment(host, id = 'store_foundation') {
  return {
    environment: 'sandbox',
    accountRef: id + '_sandbox',
    fixture: true,
    createSession: async (order) => ({
      id: 'cs_fixture_' + order.id.replaceAll('-', ''),
      url: 'http://' + host + '/qa/checkout/' + order.id,
    }),
  };
}
export function foundationCarrier({ load, save, loadPdf }) {
  return new SendparcelBookingAdapter({
    environment: 'sandbox',
    accountRef: 'fixture_sendparcel',
    accessToken: 'fixture.jwt.signature',
    bookingAdmission: {
      approved: true,
      protocol: 'legacy_single_attempt',
      contractReference: 'LOCAL PROVIDER FIXTURE, not a real carrier contract',
      costCeilingGuaranteed: true,
      serviceIds: ['42'],
    },
    fetchImpl: async (url, options) => {
      const body = JSON.parse(options.body || '{}'),
        path = new URL(url).pathname;
      if (path.endsWith('/quotes'))
        return Response.json({
          offers: [
            {
              product: { id: 42, name: 'TEST vežėjas', courier_name: 'TEST' },
              total_price: { amount_in_cents: 799, currency: 'EUR' },
              delivery: 'Vietinis bandymas; tikra siunta nekuriama',
            },
          ],
        });
      const ledger = await load();
      if (path.endsWith('/creates')) {
        const q = body.orderCreate,
          id = String(1001 + Object.keys(ledger).length),
          fact = {
            id,
            status: 1,
            created_date: '2026-10-12 10:00:00',
            tracking_number: 'TEST' + id,
            shipper: q.shipper,
            recipient: q.recipient,
            parcels: q.parcels,
          };
        ledger[id] = fact;
        await save(ledger);
        return Response.json(fact);
      }
      if (path.endsWith('/infos')) return Response.json(ledger[String(body.orderInfo.id)] || {});
      if (path.endsWith('/documents')) {
        const bytes = await loadPdf();
        let binary = '';
        for (const byte of bytes) binary += String.fromCharCode(byte);
        return Response.json([{ ftype: 'application/pdf', file_data: btoa(binary) }]);
      }
      if (path.endsWith('/tracks'))
        return Response.json({
          info: [
            {
              date: '2026-10-12 10:00:00',
              event: 'TEST siunta priimta',
              location: 'Vietinis bandymas',
            },
          ],
        });
      return Response.json({ error: 'fixture_route_missing' }, { status: 404 });
    },
  });
}
