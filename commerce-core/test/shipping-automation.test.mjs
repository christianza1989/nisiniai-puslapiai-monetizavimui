import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { CommerceJobs } from '../src/jobs.mjs';
import { BuyerDeliveryQuotes } from '../src/buyer-delivery.mjs';
import { foundationStore, foundationProducts, foundationCarrier } from './foundation-fixtures.mjs';
import { fakeCheckout, payment, key } from './fixtures.mjs';
import { PDFDocument } from 'pdf-lib';
async function setup() {
  const db = new NodeDatabase();
  db.migrate();
  let now = Date.now();
  const s = new CommerceService(db, { now: () => now }),
    cfg = foundationStore('fixture.example', 'store_a');
  cfg.dispatch = {
    country: 'LT',
    city: 'Vilnius',
    postalCode: '02211',
    name: 'TEST sender',
    line1: 'Test g. 1',
    phone: '+37060000000',
    email: 'sender@example.test',
    isCompany: true,
  };
  cfg.automationPolicy = {
    autoPrepareIndividualShipments: true,
    autoExecutePreparedShipments: true,
    autoCollectShipmentDocuments: true,
    maxCarrierSubsidyMinor: 0,
  };
  await s.provisionStore(cfg, foundationProducts());
  let ledger = {},
    creates = 0;
  const blobs = new Map();
  const font = () =>
    new Uint8Array(readFileSync(new URL('../public/fonts/NotoSans-Regular.ttf', import.meta.url)));
  const providerDocument = await PDFDocument.create();
  providerDocument.addPage().drawText('LOCAL PROVIDER PDF FIXTURE');
  const providerBytes = await providerDocument.save();
  const carrier = foundationCarrier({
    load: async () => ledger,
    save: async (l) => {
      ledger = l;
      creates++;
    },
    loadPdf: async () => providerBytes,
  });
  const options = {
    shippingAdapters: { store_a: carrier },
    shippingReadAdapters: { store_a: carrier },
    privateStorage: { put: async (k, b) => blobs.set(k, b), get: async (k) => blobs.get(k) },
    loadDocumentFont: async () => font(),
  };
  const input = {
    country: 'LT',
    currency: 'EUR',
    deliveryId: 'fixture_dynamic',
    lines: [{ sku: 'couple', quantity: 1 }],
    customer: {
      name: 'TEST buyer',
      email: 'buyer@example.test',
      phone: '+37060000000',
      address: { country: 'LT', line1: 'Test g. 2', city: 'Vilnius', postalCode: '02211' },
    },
  };
  const rate = await new BuyerDeliveryQuotes(s).create(
    'store_a',
    'sandbox',
    { ...input, id: 'auto_buyer_rate' },
    carrier,
  );
  const order = (
    await s.createOrder('store_a', 'sandbox', { ...input, deliveryQuoteId: rate.id }, key(1))
  ).order;
  await s.checkout('store_a', 'sandbox', order.id, fakeCheckout);
  await s.acceptPayment(
    'store_a',
    'sandbox',
    payment(await s.getOrder('store_a', 'sandbox', order.id)),
  );
  return {
    db,
    s,
    options,
    carrier,
    order,
    creates: () => creates,
    tick: (ms) => {
      now += ms;
    },
  };
}
test('paid and physically packed individual parcels prepare/register/collect private provider PDF once through durable jobs, without guessed packaging or another POST', async () => {
  const x = await setup(),
    { db, s, options, order } = x;
  const jobs = new CommerceJobs(s, options);
  await jobs.scheduled('store_a', 'sandbox');
  assert.equal(x.creates(), 0);
  await s.markPacked('store_a', 'sandbox', order.id, 'fixture_operator');
  await jobs.scheduled('store_a', 'sandbox');
  await jobs.scheduled('store_a', 'sandbox');
  await jobs.scheduled('store_a', 'sandbox');
  assert.equal(x.creates(), 1);
  assert.equal((await s.getOrder('store_a', 'sandbox', order.id)).fulfillment_state, 'labelled');
  assert.equal(
    (await s.one("SELECT COUNT(*) n FROM private_files WHERE kind='shipment_document'")).n,
    1,
  );
  assert.equal((await s.one('SELECT COUNT(*) n FROM shipment_commands')).n, 1);
  db.close();
});
test('automatic shipping holds a raised cost, then retries the same packed plan with a fresh quote without exceeding the paid delivery budget', async () => {
  const x = await setup(),
    quote = x.carrier.quote.bind(x.carrier);
  x.carrier.quote = async (input) => (await quote(input)).map((o) => ({ ...o, amount: 999 }));
  await x.s.markPacked('store_a', 'sandbox', x.order.id, 'fixture_operator');
  const jobs = new CommerceJobs(x.s, x.options);
  await jobs.scheduled('store_a', 'sandbox');
  assert.equal(x.creates(), 0);
  assert.equal((await x.s.one('SELECT COUNT(*) n FROM shipment_commands')).n, 0);
  assert.equal(
    (await x.s.one("SELECT last_error FROM outbox_delivery WHERE state='waiting'")).last_error,
    'automatic_shipping_cost_exceeded',
  );
  x.carrier.quote = quote;
  x.tick(60001);
  await jobs.scheduled('store_a', 'sandbox');
  assert.equal(x.creates(), 1);
  assert.equal((await x.s.one('SELECT COUNT(*) n FROM shipping_plans')).n, 1);
  x.db.close();
});
test('automatic jobs never repeat a non-idempotent booking after a lost provider reply', async () => {
  const x = await setup(),
    create = x.carrier.createBooking.bind(x.carrier);
  x.carrier.createBooking = async (input) => {
    await create(input);
    throw Error('fixture response lost');
  };
  await x.s.markPacked('store_a', 'sandbox', x.order.id, 'fixture_operator');
  const jobs = new CommerceJobs(x.s, x.options);
  for (let i = 0; i < 4; i++) await jobs.scheduled('store_a', 'sandbox');
  assert.equal(x.creates(), 1);
  assert.equal((await x.s.one('SELECT state FROM shipment_commands')).state, 'unknown');
  assert.equal((await x.s.one('SELECT COUNT(*) n FROM shipment_commands')).n, 1);
  x.db.close();
});
