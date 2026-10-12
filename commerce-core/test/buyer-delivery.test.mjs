import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { BuyerDeliveryQuotes } from '../src/buyer-delivery.mjs';
import { CatalogOperations } from '../src/catalog.mjs';
import { fixtureStore, fixtureProducts, cart, key } from './fixtures.mjs';
test('buyer shipping price is provider-bound, address/cart/profile scoped and persists into one replayable order after quote expiry', async () => {
  let now = Date.now(),
    calls = 0;
  const db = new NodeDatabase();
  db.migrate();
  const s = new CommerceService(db, { now: () => now });
  const config = {
    ...fixtureStore(),
    shippingAccountRef: 'carrier_fixture',
    requireQuote: true,
    requireTerms: true,
    requireCustomer: true,
    dispatch: { country: 'LT', city: 'Vilnius', postalCode: '02211' },
    markets: [
      {
        country: 'LT',
        currency: 'EUR',
        policyVersion: 'terms_v1',
        delivery: [
          {
            id: 'door',
            kind: 'door',
            amount: 0,
            pricing: 'carrier',
            serviceIds: ['42'],
            label: 'Kurjeris',
          },
        ],
      },
    ],
  };
  await s.provisionStore(
    config,
    fixtureProducts().map((p) => ({ ...p, prices: { LT: p.prices.LT } })),
  );
  const input = {
    ...cart(),
    deliveryId: 'door',
    customer: {
      name: 'Test User',
      email: 'buyer@example.test',
      phone: '+37060000000',
      address: { country: 'LT', line1: 'Testinė g. 1', city: 'Vilnius', postalCode: '01101' },
    },
  };
  const adapter = {
    environment: 'sandbox',
    accountRef: 'carrier_fixture',
    provider: 'fixture',
    quote: async (p) => {
      calls++;
      assert.equal(p.parcels[0].weightGrams, 2000);
      return [{ serviceId: '42', name: 'Actual fixture quote', amount: 699, currency: 'EUR' }];
    },
  };
  const delivery = new BuyerDeliveryQuotes(s),
    offered = await delivery.create('store_a', 'sandbox', { ...input, id: 'rate_1' }, adapter);
  await delivery.create('store_a', 'sandbox', { ...input, id: 'rate_1' }, adapter);
  assert.equal(calls, 1);
  assert.equal(offered.amount, 699);
  const priced = { ...input, deliveryQuoteId: offered.id },
    q = await s.quote('store_a', 'sandbox', priced);
  assert.equal(q.amount, 3899);
  const body = { ...priced, quoteHash: q.quoteHash, acceptedPolicyVersion: 'terms_v1' };
  const made = await s.createOrder('store_a', 'sandbox', body, key(1));
  now += 300001;
  assert.equal((await s.createOrder('store_a', 'sandbox', body, key(1))).order.id, made.order.id);
  await assert.rejects(s.quote('store_a', 'sandbox', priced), /delivery_quote_conflict/);
  const offered2 = await delivery.create('store_a', 'sandbox', { ...input, id: 'rate_2' }, adapter);
  const original = (await new CatalogOperations(s).list('store_a', 'sandbox')).find(
    (p) => p.sku === 'couple',
  );
  await new CatalogOperations(s).revise(
    'store_a',
    'sandbox',
    {
      id: 'price_change',
      basisHash: original.basisHash,
      definition: { ...original, enabled: true, prices: { LT: 3500 } },
    },
    'operator',
  );
  await assert.rejects(
    s.quote('store_a', 'sandbox', { ...input, deliveryQuoteId: offered2.id }),
    /delivery_quote_conflict/,
  );
  await assert.rejects(
    delivery.create(
      'store_a',
      'sandbox',
      { ...input, id: 'wrong_account' },
      { ...adapter, accountRef: 'other' },
    ),
    /carrier_quotes_not_connected/,
  );
  db.close();
});
