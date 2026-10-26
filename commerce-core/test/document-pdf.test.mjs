import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { CommerceOperations } from '../src/operations.mjs';
import { DocumentFiles, documentPdf } from '../src/document-pdf.mjs';
import { documentPolicy } from '../src/admission.mjs';
import { fixtureStore, fixtureProducts, cart, key, fakeCheckout, payment } from './fixtures.mjs';
import { PDFDocument } from 'pdf-lib';
import { Discounts } from '../src/discounts.mjs';
const font = new Uint8Array(
  readFileSync(new URL('../public/fonts/NotoSans-Regular.ttf', import.meta.url)),
);

test('discounted sale invoice retains gross lines, coupon facts and the actual paid net amount', async (t) => {
  const db = new NodeDatabase();
  db.migrate();
  t.after(() => db.close());
  const s = new CommerceService(db),
    ops = new CommerceOperations(s);
  await s.provisionStore(fixtureStore(), fixtureProducts());
  await new Discounts(s).save(
    'store_a',
    'sandbox',
    {
      id: crypto.randomUUID(),
      commandId: crypto.randomUUID(),
      expectedVersion: 0,
      code: 'PDF10',
      kind: 'percent',
      value: 10,
      enabled: true,
    },
    'owner',
  );
  const created = await s.createOrder(
    'store_a',
    'sandbox',
    { ...cart(), discountCode: 'PDF10' },
    key(100),
  );
  await s.checkout('store_a', 'sandbox', created.order.id, fakeCheckout);
  const o = await s.getOrder('store_a', 'sandbox', created.order.id);
  await s.acceptPayment('store_a', 'sandbox', payment(o));
  const { document } = await ops.issueDocument(
    'store_a',
    'sandbox',
    o.id,
    { kind: 'sale' },
    'owner',
  );
  assert.equal(document.payload.amount, 2880);
  assert.equal(document.payload.snapshot.discount.code, 'PDF10');
  assert.equal(document.payload.snapshot.discount.amount, 320);
  assert.equal(document.payload.snapshot.lines[0].lineAmount, 3200);
  const bytes = await documentPdf(document, font);
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1);
});
test('Unicode documents render from immutable paid sources and PDF persistence replays concurrent exports', async () => {
  const db = new NodeDatabase();
  db.migrate();
  const s = new CommerceService(db),
    ops = new CommerceOperations(s);
  await s.provisionStore(fixtureStore(), fixtureProducts());
  const created = await s.createOrder('store_a', 'sandbox', cart(), key(1));
  await s.checkout('store_a', 'sandbox', created.order.id, fakeCheckout);
  const o = await s.getOrder('store_a', 'sandbox', created.order.id);
  await s.acceptPayment('store_a', 'sandbox', payment(o));
  const { document } = await ops.issueDocument(
    'store_a',
    'sandbox',
    o.id,
    { kind: 'sale' },
    'operator',
  );
  const bytes = await documentPdf(document, font);
  assert.ok(bytes.length > 10000);
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1);
  await assert.rejects(documentPdf(document, new Uint8Array(10)), /document_font_invalid/);
  const blobs = new Map(),
    storage = {
      put: async (k, b) => {
        blobs.set(k, b);
      },
      get: async (k) => blobs.get(k),
    };
  const files = new DocumentFiles(s, storage, async () => font);
  const [a, b] = await Promise.all([
    files.ensure('store_a', 'sandbox', document, 'operator'),
    files.ensure('store_a', 'sandbox', document, 'operator'),
  ]);
  assert.equal(a.id, b.id);
  assert.equal((await s.one('SELECT COUNT(*) count FROM private_files')).count, 1);
  db.close();
});
test('production document series, legal facts, tax mode and operational admission are mandatory', () => {
  const config = {
    ...fixtureStore(),
    testOnly: false,
    productionAdmission: { approved: true },
    operationalAdmission: { approved: true },
    documentPolicy: {
      approved: true,
      mode: 'invoice_non_vat',
      timeZone: 'Europe/Vilnius',
      series: { sale: 'MC', credit: 'MCC', packing: 'MCP' },
    },
    legalSnapshot: {
      name: 'Test MB',
      companyCode: '123456789',
      vatRegistered: false,
      address: { country: 'LT', line1: 'Testinė g. 1', city: 'Vilnius', postalCode: '01101' },
    },
  };
  assert.equal(documentPolicy(config, 'production').testOnly, false);
  for (const change of [
    { operationalAdmission: null },
    { documentPolicy: null },
    { legalSnapshot: { ...config.legalSnapshot, vatRegistered: true } },
  ])
    assert.throws(() => documentPolicy({ ...config, ...change }, 'production'));
});
