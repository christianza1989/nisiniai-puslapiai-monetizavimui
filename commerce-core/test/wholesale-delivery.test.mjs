import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { Wholesale } from '../src/wholesale.mjs';
import { fixtureStore, fixtureProducts } from './fixtures.mjs';
test('approved private wholesale offer derives carrier price from partner address while replacing retail unit prices and preserving replay', async () => {
  const db = new NodeDatabase();
  db.migrate();
  const s = new CommerceService(db),
    config = fixtureStore();
  config.shippingAccountRef = 'fixture_carrier';
  config.dispatch = { country: 'LT', city: 'Vilnius', postalCode: '02211' };
  config.markets[0].delivery = [
    {
      id: 'courier',
      kind: 'door',
      pricing: 'carrier',
      amount: 0,
      serviceIds: ['42'],
      label: 'TEST courier',
    },
  ];
  await s.provisionStore(config, fixtureProducts(100));
  let quotes = 0;
  const b = new Wholesale(s, {
    shippingReadAdapters: {
      store_a: {
        accountRef: 'fixture_carrier',
        environment: 'sandbox',
        provider: 'fixture',
        quote: async (payload) => {
          assert.equal(payload.value, 8000);
          assert.equal(payload.recipient.isCompany, true);
          quotes++;
          return [{ serviceId: '42', amount: 799, currency: 'EUR', name: 'TEST carrier' }];
        },
      },
    },
  });
  await b.priceList(
    'store_a',
    'sandbox',
    {
      id: 'private_list',
      currency: 'EUR',
      lines: [{ sku: 'couple', unitAmount: 2000, moq: 2, casepack: 2 }],
    },
    'operator',
  );
  await b.partner(
    'store_a',
    'sandbox',
    {
      id: 'private_partner',
      name: 'TEST partner',
      country: 'LT',
      currency: 'EUR',
      priceListId: 'private_list',
      approved: true,
      customer: {
        name: 'TEST partner',
        isCompany: true,
        companyCode: '123456789',
        contactName: 'TEST contact',
        email: 'partner@example.test',
        phone: '+37060000000',
        address: { country: 'LT', line1: 'Test g. 1', city: 'Vilnius', postalCode: '02211' },
      },
    },
    'operator',
  );
  const input = {
    id: 'bulk_quote',
    partnerId: 'private_partner',
    deliveryId: 'courier',
    lines: [{ sku: 'couple', quantity: 4 }],
  };
  const result = await b.quote('store_a', 'sandbox', input, 'operator');
  assert.equal(result.quote.snapshot.amount, 8799);
  assert.equal((await b.quote('store_a', 'sandbox', input, 'operator')).replayed, true);
  assert.equal(quotes, 1);
  const accepted = await b.accept('store_a', 'sandbox', 'bulk_quote', 'operator');
  assert.equal(accepted.order.amount, 8799);
  assert.equal(accepted.order.snapshot.customer.name, 'TEST partner');
  assert.equal(accepted.order.snapshot.customer.contactName, 'TEST contact');
  assert.equal(accepted.order.snapshot.customer.companyCode, '123456789');
  db.close();
});
