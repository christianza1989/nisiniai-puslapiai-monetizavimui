export function fixtureStore(id = 'store_a') {
  return {
    id,
    environment: 'sandbox',
    enabled: true,
    testOnly: true,
    legalEntityId: id + '_entity',
    legalSnapshot: { name: 'Commerce test entity ' + id },
    hosts: [id.replace('_', '-') + '.example'],
    paymentAccountRef: id + '_sandbox',
    markets: [
      {
        country: 'LT',
        currency: 'EUR',
        policyVersion: 'fixture_v1',
        delivery: [{ id: 'test_delivery', amount: 0, label: 'Test delivery' }],
      },
      {
        country: 'PL',
        currency: 'PLN',
        policyVersion: 'fixture_v1',
        delivery: [{ id: 'test_delivery', amount: 1000, label: 'Test delivery' }],
      },
    ],
    checkout: {
      successUrl: 'https://' + id.replace('_', '-') + '.example/success',
      cancelUrl: 'https://' + id.replace('_', '-') + '.example/cart',
    },
  };
}
export function fixtureProducts(stock = 5) {
  return [
    {
      sku: 'couple',
      title: 'Test couple kit',
      stock,
      prices: { LT: 3200, PL: 13900 },
      package: { weightGrams: 2000, dimensionsMm: [200, 200, 170] },
    },
    {
      sku: 'family',
      title: 'Test family kit',
      stock,
      prices: { LT: 4800, PL: 20900 },
      package: { weightGrams: 4000, dimensionsMm: [250, 250, 200] },
    },
    {
      sku: 'couple_white',
      title: 'Test couple kit with paint',
      stock,
      prices: { LT: 3500, PL: 14900 },
      package: { weightGrams: 2100, dimensionsMm: [200, 200, 170] },
    },
  ];
}
export const cart = (sku = 'couple', quantity = 1) => ({
  lines: [{ sku, quantity }],
  country: 'LT',
  currency: 'EUR',
  deliveryId: 'test_delivery',
});
export const key = (n) => 'test_order_key_' + String(n).padStart(8, '0');
export const fakeCheckout = {
  createSession: async (o) => ({
    id: 'cs_' + o.id.replaceAll('-', ''),
    url: 'https://checkout.stripe.test/' + o.id,
  }),
};
export function payment(order, store = 'store_a', id = 'evt_test') {
  return {
    id,
    orderId: order.id,
    environment: 'sandbox',
    accountRef: store + '_sandbox',
    sessionId: order.checkout_id,
    paymentId: 'pi_' + order.id.replaceAll('-', ''),
    currency: order.currency,
    amount: order.amount,
    paid: true,
  };
}
export function fixtureCarrier() {
  const records = new Map();
  let calls = 0;
  let loseResponse = false;
  return {
    supportsIdempotentCreate: true,
    requiresCustomer: false,
    records,
    get calls() {
      return calls;
    },
    timeoutOnce() {
      loseResponse = true;
    },
    find: async (ref) => records.get(ref) || null,
    create: async ({ reference }) => {
      if (records.has(reference)) return records.get(reference);
      calls++;
      const r = {
        id: 'parcel_' + calls,
        label: { private: true, storageKey: 'fixture/' + reference + '.pdf' },
        tracking: 'TEST' + calls,
      };
      records.set(reference, r);
      if (loseResponse) {
        loseResponse = false;
        throw new Error('fixture response lost');
      }
      return r;
    },
  };
}
