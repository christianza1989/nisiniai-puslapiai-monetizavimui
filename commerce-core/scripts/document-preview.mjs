// Explicit test-only PDF acceptance fixture, not an operating company's invoice.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { CommerceOperations } from '../src/operations.mjs';
import { documentPdf } from '../src/document-pdf.mjs';
import {
  fixtureStore,
  fixtureProducts,
  cart,
  key,
  fakeCheckout,
  payment,
} from '../test/fixtures.mjs';
const db = new NodeDatabase();
db.migrate();
const s = new CommerceService(db),
  ops = new CommerceOperations(s);
const config = {
  ...fixtureStore(),
  requireCustomer: true,
  legalSnapshot: {
    name: 'Bandomoji įmonė - Ąžuolas',
    companyCode: '123456789',
    vatRegistered: false,
    address: { country: 'LT', line1: 'Bandomoji g. 1', city: 'Vilnius', postalCode: '01101' },
    email: 'fixture@example.test',
  },
};
const products = fixtureProducts().map((p) => ({
  ...p,
  title: p.sku === 'couple' ? 'Rankų liejimo rinkinys porai - Pamiątka, Ģimene, Perekond' : p.title,
}));
await s.provisionStore(config, products);
const { order } = await s.createOrder(
  'store_a',
  'sandbox',
  {
    ...cart(),
    customer: {
      name: 'Živilė Ąžuolaitė',
      email: 'buyer@example.test',
      phone: '+37060000000',
      address: { country: 'LT', line1: 'Bandomoji g. 2', city: 'Šiauliai', postalCode: '76001' },
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
const sale = (
  await ops.issueDocument('store_a', 'sandbox', order.id, { kind: 'sale' }, 'fixture_operator')
).document;
await s.confirmRefund('store_a', 'sandbox', order.id, {
  providerId: 'fixture_refund',
  currency: 'EUR',
  amount: 500,
});
const credit = (
  await ops.issueDocument(
    'store_a',
    'sandbox',
    order.id,
    { kind: 'credit', refundId: 'fixture_refund' },
    'fixture_operator',
  )
).document;
const directory = new URL('../tmp/pdfs/', import.meta.url);
mkdirSync(directory, { recursive: true });
const font = new Uint8Array(
  readFileSync(new URL('../public/fonts/NotoSans-Regular.ttf', import.meta.url)),
);
for (const [name, record] of [
  ['sandbox-sale.pdf', sale],
  ['sandbox-credit.pdf', credit],
])
  writeFileSync(new URL(name, directory), await documentPdf(record, font));
db.close();
process.stdout.write('2 explicit sandbox PDFs generated for visual acceptance.\n');
