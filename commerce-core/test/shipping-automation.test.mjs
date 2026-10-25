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
  carrier.labelFileNames.add('fixture.pdf'); // Explicit fixture label contract.
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

test('delayed labels remain durable across job instances without spending failure retries or repeating create', async () => {
  const x = await setup();
  const documents = x.carrier.documents.bind(x.carrier);
  let ready = false,
    polls = 0;
  x.carrier.documents = async (...args) => {
    polls++;
    if (ready) return documents(...args);
    // A manifest can arrive before any label; it is not label readiness.
    return polls % 2 ? [] : (await documents(...args)).map((d) => ({ ...d, kind: 'document' }));
  };
  await x.s.markPacked('store_a', 'sandbox', x.order.id, 'fixture_operator');
  await new CommerceJobs(x.s, x.options).scheduled('store_a', 'sandbox');
  await new CommerceJobs(x.s, x.options).scheduled('store_a', 'sandbox');
  const event = await x.s.one("SELECT id FROM outbox WHERE kind='ShipmentRegistered'");
  const receipt = () =>
    x.s.one('SELECT state,last_error FROM outbox_delivery WHERE event_id=?', event.id);
  assert.deepEqual(
    { ...(await receipt()) },
    { state: 'waiting', last_error: 'carrier_documents_pending' },
  );
  assert.equal(
    (await x.s.one('SELECT state,attempts FROM outbox WHERE id=?', event.id)).attempts,
    0,
  );
  for (let i = 0; i < 7; i++) {
    const before = polls;
    await new CommerceJobs(x.s, x.options).scheduled('store_a', 'sandbox');
    assert.equal(polls, before, 'a refresh before its persisted deadline cannot poll again');
    x.tick(60001);
    await new CommerceJobs(new CommerceService(x.db, { now: x.s.now }), x.options).scheduled(
      'store_a',
      'sandbox',
    );
    assert.equal((await receipt()).state, 'waiting');
  }
  x.carrier.documents = async () => {
    throw Error('transient fixture failure');
  };
  x.tick(60001);
  await new CommerceJobs(x.s, x.options).scheduled('store_a', 'sandbox');
  assert.equal(
    (await receipt()).state,
    'waiting',
    'pending waits have not exhausted ordinary errors',
  );
  assert.equal((await x.s.one('SELECT attempts FROM outbox WHERE id=?', event.id)).attempts, 1);
  ready = true;
  x.carrier.documents = documents;
  x.tick(60001);
  await new CommerceJobs(x.s, x.options).scheduled('store_a', 'sandbox');
  assert.equal((await receipt()).state, 'done');
  assert.equal((await x.s.one('SELECT state FROM outbox WHERE id=?', event.id)).state, 'done');
  const count = (
    await x.s.one("SELECT COUNT(*) n FROM private_files WHERE kind='shipment_document'")
  ).n;
  await new CommerceJobs(x.s, x.options).scheduled('store_a', 'sandbox');
  assert.equal(
    (await x.s.one("SELECT COUNT(*) n FROM private_files WHERE kind='shipment_document'")).n,
    count,
  );
  assert.equal(x.creates(), 1);
  x.db.close();
});

test('a provider that never makes labels available reaches a bounded operator-visible timeout without another create', async () => {
  const x = await setup();
  x.carrier.documents = async () => [];
  await x.s.markPacked('store_a', 'sandbox', x.order.id, 'fixture_operator');
  await new CommerceJobs(x.s, x.options).scheduled('store_a', 'sandbox');
  await new CommerceJobs(x.s, x.options).scheduled('store_a', 'sandbox');
  x.tick(24 * 3600000 + 1);
  await new CommerceJobs(x.s, x.options).scheduled('store_a', 'sandbox');
  const receipt = await x.s.one(
    "SELECT d.state,d.last_error FROM outbox_delivery d JOIN outbox o ON o.id=d.event_id AND o.store_id=d.store_id WHERE o.kind='ShipmentRegistered'",
  );
  assert.deepEqual({ ...receipt }, { state: 'dead', last_error: 'carrier_documents_timeout' });
  assert.equal(x.creates(), 1);
  x.db.close();
});

test('manual packing workflow issues documents while every automatic shipment switch is off', async () => {
  const x = await setup();
  try {
    const cfg = await x.s.store('store_a', 'sandbox');
    Object.assign(cfg.automationPolicy, {
      autoPrepareIndividualShipments: false,
      autoExecutePreparedShipments: false,
      autoCollectShipmentDocuments: false,
    });
    await x.s
      .stmt('UPDATE stores SET config_json=? WHERE id=?', JSON.stringify(cfg), 'store_a')
      .run();
    await x.s.markPacked('store_a', 'sandbox', x.order.id, 'fixture_operator');
    await new CommerceJobs(x.s, x.options).scheduled('store_a', 'sandbox');
    assert.equal(
      (await x.s.one("SELECT COUNT(*) n FROM documents WHERE kind IN ('sale','packing')")).n,
      2,
    );
    assert.equal((await x.s.one('SELECT COUNT(*) n FROM shipment_commands')).n, 0);
    assert.equal((await x.s.getOrder('store_a', 'sandbox', x.order.id)).fulfillment_state, 'ready');
    assert.equal(x.creates(), 0);
  } finally {
    x.db.close();
  }
});

for (const [status, pending] of [
  [6, true],
  [5, false],
  [8, false],
])
  test(`automatic label collection holds provider${status} without another POST and resumes original order`, async () => {
    const x = await setup();
    try {
      await x.s.markPacked('store_a', 'sandbox', x.order.id, 'fixture_operator');
      await new CommerceJobs(x.s, x.options).scheduled('store_a', 'sandbox');
      const information = x.carrier.bookingInformation.bind(x.carrier);
      const documents = x.carrier.documents.bind(x.carrier);
      let statusNow = status,
        documentReads = 0;
      x.carrier.bookingInformation = async (id) => ({
        ...(await information(id)),
        providerStatus: statusNow,
      });
      x.carrier.documents = async (id) => {
        documentReads++;
        return documents(id);
      };
      await new CommerceJobs(x.s, x.options).scheduled('store_a', 'sandbox');
      const receipt = await x.s.one(
        "SELECT d.state,d.last_error,o.attempts FROM outbox_delivery d JOIN outbox o ON o.store_id=d.store_id AND o.id=d.event_id WHERE o.kind='ShipmentRegistered'",
      );
      assert.equal(receipt.state, 'waiting');
      assert.equal(
        receipt.last_error,
        pending ? 'carrier_documents_pending' : 'carrier_booking_requires_review',
      );
      assert.equal(receipt.attempts, pending ? 0 : 1);
      assert.equal(
        (await x.s.getOrder('store_a', 'sandbox', x.order.id)).fulfillment_state,
        'ready',
      );
      assert.equal(documentReads, 0);
      assert.equal(x.creates(), 1);
      statusNow = 1;
      x.tick(60001);
      await new CommerceJobs(x.s, x.options).scheduled('store_a', 'sandbox');
      assert.equal(
        (
          await x.s.one(
            "SELECT d.state FROM outbox_delivery d JOIN outbox o ON o.store_id=d.store_id AND o.id=d.event_id WHERE o.kind='ShipmentRegistered'",
          )
        ).state,
        'done',
      );
      assert.equal(documentReads, 1);
      assert.equal(
        (await x.s.one("SELECT COUNT(*) n FROM outbox WHERE kind='ShipmentRegistered'")).n,
        1,
      );
      assert.equal(x.creates(), 1);
    } finally {
      x.db.close();
    }
  });
