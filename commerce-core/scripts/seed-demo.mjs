// Explicit, repeatable local fixtures. Never loaded by the deployable Worker.
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { CommerceOperations } from '../src/operations.mjs';
import { Backoffice } from '../src/backoffice.mjs';
import { Wholesale } from '../src/wholesale.mjs';
import { requireValue } from '../src/validation.mjs';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureStore, fixtureProducts, cart, fakeCheckout, payment } from '../test/fixtures.mjs';
mkdirSync(new URL('../runtime/', import.meta.url), { recursive: true });
const db = new NodeDatabase(fileURLToPath(new URL('../runtime/local.sqlite', import.meta.url)));
db.migrate();
const s = new CommerceService(db),
  op = new CommerceOperations(s);
if (!(await s.one('SELECT id FROM stores WHERE id=?', 'store_a')))
  await s.provisionStore({ ...fixtureStore(), hosts: ['127.0.0.1:8795'] }, fixtureProducts(20));
const config = await s.store('store_a', 'sandbox');
requireValue(
  config.testOnly === true && config.hosts.length === 1 && config.hosts[0] === '127.0.0.1:8795',
  'fixture_target_required',
  403,
);
const customer = {
  name: 'Testinis Pirkėjas',
  email: 'buyer@example.test',
  phone: '+37060000000',
  address: { country: 'LT', line1: 'Testinė g. 1', city: 'Vilnius', postalCode: '01101' },
};
for (let n = 1; n <= 3; n++) {
  const result = await s.createOrder(
    'store_a',
    'sandbox',
    { ...cart(n === 2 ? 'family' : 'couple'), customer },
    'fixture_demo_order_' + n,
  );
  if (n === 3) continue;
  let order = await s.getOrder('store_a', 'sandbox', result.order.id);
  if (order.payment_state === 'pending') {
    await s.checkout('store_a', 'sandbox', order.id, fakeCheckout);
    order = await s.getOrder('store_a', 'sandbox', order.id);
    await s.acceptPayment('store_a', 'sandbox', payment(order, 'store_a', 'evt_demo_' + n));
  }
  await op.issueDocument('store_a', 'sandbox', order.id, { kind: 'sale' }, 'fixture_seed');
  if (n === 2) await s.markPacked('store_a', 'sandbox', order.id);
}
const back = new Backoffice(s),
  wholesale = new Wholesale(s),
  actor = 'fixture_seed';
for (const id of ['test_powder_a', 'test_powder_b', 'test_bucket']) {
  await back.component(
    'store_a',
    'sandbox',
    {
      id,
      name: {
        test_powder_a: 'Testiniai A pakeliai',
        test_powder_b: 'Testiniai B pakeliai',
        test_bucket: 'Testiniai indai',
      }[id],
      unit: 'unit',
    },
    actor,
  );
  await back.receive(
    'store_a',
    'sandbox',
    { id: id + '_lot', componentId: id, supplierRef: 'TEST-' + id, quantity: 20 },
    actor,
  );
}
await back.recipe(
  'store_a',
  'sandbox',
  {
    id: 'test_couple_recipe',
    sku: 'couple',
    components: [
      { id: 'test_powder_a', quantity: 1, unit: 'unit' },
      { id: 'test_powder_b', quantity: 1, unit: 'unit' },
      { id: 'test_bucket', quantity: 1, unit: 'unit' },
    ],
  },
  actor,
);
await back.recipe(
  'store_a',
  'sandbox',
  {
    id: 'test_family_recipe',
    sku: 'family',
    components: [
      { id: 'test_powder_a', quantity: 2, unit: 'unit' },
      { id: 'test_powder_b', quantity: 2, unit: 'unit' },
      { id: 'test_bucket', quantity: 1, unit: 'unit' },
    ],
  },
  actor,
);
const demo = await s.one(
  'SELECT * FROM orders WHERE store_id=? AND request_key=?',
  'store_a',
  'fixture_demo_order_1',
);
await back.importSources(
  'store_a',
  'sandbox',
  {
    origin: 'fixture_stripe_balance',
    rows: [
      {
        reference: 'test_balance_payment',
        kind: 'payment',
        currency: demo.currency,
        amount: demo.amount,
        transactionRef: demo.payment_id,
        occurredAt: demo.created_at,
      },
      {
        reference: 'test_balance_mismatch',
        kind: 'payment',
        currency: 'EUR',
        amount: demo.amount + 1,
        transactionRef: demo.payment_id,
        occurredAt: demo.created_at,
      },
      {
        reference: 'test_fee',
        kind: 'fee',
        currency: 'EUR',
        amount: -99,
        occurredAt: demo.created_at,
      },
    ],
  },
  actor,
);
await wholesale.priceList(
  'store_a',
  'sandbox',
  {
    id: 'TEST_WHOLESALE_EUR',
    currency: 'EUR',
    lines: [
      { sku: 'couple', unitAmount: 2000, moq: 2, casepack: 2 },
      { sku: 'family', unitAmount: 3000, moq: 2, casepack: 2 },
    ],
  },
  actor,
);
await wholesale.partner(
  'store_a',
  'sandbox',
  {
    id: 'test_partner',
    name: 'Testinis didmenos partneris',
    priceListId: 'TEST_WHOLESALE_EUR',
    country: 'LT',
    currency: 'EUR',
    approved: true,
    customer,
  },
  actor,
);
console.log(
  'Išsaugoti testiniai užsakymai, dokumentai, medžiagos, finansiniai šaltiniai ir didmenos partneris. Tai nėra patvirtintas Memocasting BOM ar komercinės didmenos kainos. Realios operacijos neatliktos.',
);
db.close();
