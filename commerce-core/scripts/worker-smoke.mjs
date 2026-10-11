import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import Stripe from 'stripe';
import { CommerceService } from '../src/service.mjs';
import { CommerceOperations } from '../src/operations.mjs';
import { Backoffice } from '../src/backoffice.mjs';
import { Wholesale } from '../src/wholesale.mjs';
import { applyMigrations } from '../src/migrations.mjs';
import { fixtureStore, fixtureProducts, cart, key, payment } from '../test/fixtures.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = mkdtempSync(join(tmpdir(), 'commerce-workerd-'));
const options = {
  modules: true,
  compatibilityDate: '2026-10-11',
  d1Databases: { COMMERCE_DB: '00000000-0000-0000-0000-000000000001' },
  bindings: { COMMERCE_ENV: 'sandbox', TEST_HARNESS: 'fixture-only' },
  resourcePersistencePath: directory,
};
let mf;
async function start(entry, bindings = {}) {
  const bundle = await build({
    entryPoints: [join(root, entry)],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    conditions: ['workerd', 'worker', 'browser'],
  });
  mf = new Miniflare(
    convertV4MiniflareOptions({
      ...options,
      bindings: { ...options.bindings, ...bindings },
      script: bundle.outputFiles[0].text,
    }),
  );
  await mf.ready;
  return mf.getD1Database('COMMERCE_DB');
}
const token = 'test_' + crypto.randomUUID().replaceAll('-', '');
const dispatch = (host, path, method = 'GET', body, headers = {}) =>
  mf.dispatchFetch('https://' + host + path, {
    method,
    headers: { 'content-type': 'application/json', 'order-access-token': token, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
try {
  let db = await start('src/worker.mjs');
  await applyMigrations(
    db,
    readdirSync(join(root, 'migrations'))
      .filter((n) => n.endsWith('.sql'))
      .map((name) => ({ name, source: readFileSync(join(root, 'migrations', name), 'utf8') })),
  );
  let service = new CommerceService(db);
  await service.provisionStore(fixtureStore(), fixtureProducts(1));
  await service.provisionStore(fixtureStore('store_b'), fixtureProducts(3));
  assert.equal((await dispatch('unknown.example', '/api/catalog')).status, 404);
  assert.equal((await dispatch('store-a.example', '/api/catalog')).status, 200);
  const conflict = await dispatch(
    'store-a.example',
    '/api/orders',
    'POST',
    {
      ...cart(),
      lines: [
        { sku: 'couple', quantity: 1 },
        { sku: 'family', quantity: 2 },
      ],
    },
    { 'idempotency-key': key(1) },
  );
  assert.equal(conflict.status, 409);
  assert.equal((await service.rows('SELECT * FROM orders')).length, 0);
  assert.equal((await service.catalog('store_a', 'sandbox'))[0].available, 1);
  const concurrent = await Promise.all(
    [1, 2].map((n) =>
      dispatch('store-a.example', '/api/orders', 'POST', cart(), { 'idempotency-key': key(n) }),
    ),
  );
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [201, 409]);
  const result = await concurrent.find((r) => r.status === 201).json();
  assert.equal((await dispatch('store-a.example', '/api/orders/' + result.order.id)).status, 403);
  assert.equal(
    (
      await dispatch('store-b.example', '/api/orders/' + result.order.id, 'GET', undefined, {
        authorization: 'Bearer ' + token,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await dispatch('store-a.example', '/api/orders/' + result.order.id, 'GET', undefined, {
        authorization: 'Bearer ' + token,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await dispatch(
        'store-a.example',
        '/api/orders/' + result.order.id + '/checkout',
        'POST',
        undefined,
        { authorization: 'Bearer ' + token },
      )
    ).status,
    503,
  );
  const replay = await dispatch('store-a.example', '/api/orders', 'POST', cart(), {
    'idempotency-key': result.order.request_key,
  });
  assert.equal((await replay.json()).order.id, result.order.id);
  await mf.dispose();
  mf = undefined;

  db = await start('test/worker-harness.mjs');
  service = new CommerceService(db);
  assert.equal((await service.getOrder('store_a', 'sandbox', result.order.id)).amount, 3200);
  const checkout = await dispatch(
    'store-a.example',
    '/api/orders/' + result.order.id + '/checkout',
    'POST',
    undefined,
    { authorization: 'Bearer ' + token },
  );
  assert.equal(checkout.status, 200);
  const session = await checkout.json();
  const raw = JSON.stringify({
    id: 'evt_workerd',
    livemode: false,
    type: 'checkout.session.async_payment_succeeded',
    data: {
      object: {
        id: session.id,
        payment_status: 'paid',
        payment_intent: 'pi_workerd',
        currency: 'eur',
        amount_total: 3200,
        metadata: { store_id: 'store_a', order_id: result.order.id, environment: 'sandbox' },
      },
    },
  });
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload: raw,
    secret: 'fixture-webhook-secret',
  });
  const webhook = () =>
    mf.dispatchFetch('https://store-a.example/api/stripe/webhook', {
      method: 'POST',
      body: raw,
      headers: { 'stripe-signature': signature },
    });
  assert.equal((await webhook()).status, 200);
  assert.equal((await webhook()).status, 200);
  assert.equal(
    (
      await mf.dispatchFetch('https://store-a.example/api/stripe/webhook', {
        method: 'POST',
        body: raw,
        headers: { 'stripe-signature': 'invalid' },
      })
    ).status,
    400,
  );
  assert.equal(
    (await service.rows("SELECT * FROM outbox WHERE kind='PaymentConfirmed'")).length,
    1,
  );
  assert.equal(
    (await dispatch('store-a.example', '/api/operator/orders/' + result.order.id + '/pack', 'POST'))
      .status,
    403,
  );
  assert.equal(
    (
      await dispatch(
        'store-a.example',
        '/api/operator/orders/' + result.order.id + '/pack',
        'POST',
        undefined,
        { 'x-fixture-operator': 'store_a' },
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await dispatch(
        'store-a.example',
        '/api/operator/orders/' + result.order.id + '/ship',
        'POST',
        undefined,
        { 'x-fixture-operator': 'store_a' },
      )
    ).status,
    200,
  );
  const operations = new CommerceOperations(service);
  assert.equal((await dispatch('store-a.example', '/api/operator/overview')).status, 403);
  assert.equal(
    (
      await dispatch('store-a.example', '/api/operator/overview', 'GET', undefined, {
        'x-fixture-operator': 'store_b',
      })
    ).status,
    403,
  );
  const issued = await Promise.all(
    [1, 2].map(() =>
      dispatch(
        'store-a.example',
        '/api/operator/orders/' + result.order.id + '/documents',
        'POST',
        { kind: 'sale' },
        { 'x-fixture-operator': 'store_a' },
      ),
    ),
  );
  assert.ok(issued.every((r) => r.status === 200));
  const docs = await Promise.all(issued.map((r) => r.json()));
  assert.equal(docs[0].document.id, docs[1].document.id);
  assert.equal(
    (await service.one("SELECT next_number FROM document_sequences WHERE series='TEST-S'"))
      .next_number,
    2,
  );
  await assert.rejects(service.stmt('UPDATE documents SET number=99').run(), /document_immutable/);
  const adjustment = {
    id: 'stock_workerd',
    sku: 'couple',
    delta: 2,
    expectedAvailable: 0,
    reason: 'Native D1 test',
  };
  await operations.adjustStock('store_a', 'sandbox', adjustment, 'fixture_operator');
  assert.equal(
    (await operations.adjustStock('store_a', 'sandbox', adjustment, 'fixture_operator')).replayed,
    true,
  );
  await assert.rejects(
    operations.adjustStock(
      'store_a',
      'sandbox',
      { ...adjustment, id: 'stock_stale' },
      'fixture_operator',
    ),
    /stock_adjustment_conflict/,
  );
  const refundRaw = JSON.stringify({
    id: 'evt_refund_workerd',
    livemode: false,
    type: 'refund.created',
    data: {
      object: {
        id: 're_workerd',
        payment_intent: 'pi_workerd',
        amount: 1000,
        currency: 'eur',
        status: 'succeeded',
      },
    },
  });
  const refundSignature = Stripe.webhooks.generateTestHeaderString({
    payload: refundRaw,
    secret: 'fixture-webhook-secret',
  });
  const sendRefund = () =>
    mf.dispatchFetch('https://store-a.example/api/stripe/webhook', {
      method: 'POST',
      body: refundRaw,
      headers: { 'stripe-signature': refundSignature },
    });
  assert.equal((await sendRefund()).status, 200);
  assert.equal((await sendRefund()).status, 200);
  assert.equal(
    (await service.getOrder('store_a', 'sandbox', result.order.id)).refunded_amount,
    1000,
  );
  const credit = await operations.issueDocument(
    'store_a',
    'sandbox',
    result.order.id,
    { kind: 'credit', refundId: 're_workerd' },
    'fixture_operator',
  );
  assert.equal(credit.document.payload.originalDocument.id, docs[0].document.id);
  assert.equal(credit.document.payload.amount, 1000);
  await assert.rejects(
    service.confirmRefund('store_a', 'sandbox', result.order.id, {
      providerId: 're_over',
      amount: 3000,
      currency: 'EUR',
    }),
    /refund_invalid/,
  );
  await service.postJournal('store_a', 'sandbox', {
    sourceId: 'sale_workerd',
    currency: 'EUR',
    lines: [
      { account: 'stripe', debit: 3200, credit: 0 },
      { account: 'sales', debit: 0, credit: 3200 },
    ],
  });
  const leased = await service.claimOutbox('store_a', 'sandbox', 1);
  assert.equal(leased.length, 1);
  await service.completeOutbox('store_a', 'sandbox', leased[0].id, leased[0].lease_token);
  const back = new Backoffice(service),
    wholesale = new Wholesale(service),
    actor = 'fixture_operator';
  await back.component(
    'store_a',
    'sandbox',
    { id: 'material', name: 'Testinė medžiaga', unit: 'unit' },
    actor,
  );
  await back.receive(
    'store_a',
    'sandbox',
    { id: 'lot', componentId: 'material', supplierRef: 'TEST-D1', quantity: 1 },
    actor,
  );
  for (const sku of ['couple', 'family'])
    await back.recipe(
      'store_a',
      'sandbox',
      { id: 'recipe_' + sku, sku, components: [{ id: 'material', quantity: 1, unit: 'unit' }] },
      actor,
    );
  const assemblies = await Promise.allSettled(
    ['couple', 'family'].map((sku) =>
      back.assemble(
        'store_a',
        'sandbox',
        { id: 'assembly_' + sku, recipeId: 'recipe_' + sku, quantity: 1 },
        actor,
      ),
    ),
  );
  assert.equal(assemblies.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal((await back.inventory('store_a', 'sandbox')).assemblies.length, 1);
  assert.equal((await back.inventory('store_a', 'sandbox')).lots[0].available, 0);
  const finance = {
    origin: 'test_stripe',
    rows: [
      {
        reference: 'balance_payment',
        kind: 'payment',
        amount: 3200,
        currency: 'EUR',
        transactionRef: 'pi_workerd',
        occurredAt: 100,
      },
    ],
  };
  await Promise.all([
    back.importSources('store_a', 'sandbox', finance, actor),
    back.importSources('store_a', 'sandbox', finance, actor),
  ]);
  const financial = (await back.financials('store_a', 'sandbox')).sources[0];
  assert.equal(financial.state, 'candidate');
  await Promise.all([
    back.reconcile('store_a', 'sandbox', { sourceId: financial.id }, actor),
    back.reconcile('store_a', 'sandbox', { sourceId: financial.id }, actor),
  ]);
  await assert.rejects(
    back.importSources(
      'store_a',
      'sandbox',
      { origin: 'test_stripe', rows: [{ ...finance.rows[0], amount: 3201 }] },
      actor,
    ),
    /financial_source_conflict/,
  );
  const familyStock = (await service.catalog('store_a', 'sandbox')).find(
    (p) => p.sku === 'family',
  ).available;
  await operations.adjustStock(
    'store_a',
    'sandbox',
    {
      id: 'wholesale_fixture_stock',
      sku: 'family',
      delta: 2,
      expectedAvailable: familyStock,
      reason: 'Explicit native D1 wholesale fixture stock',
    },
    actor,
  );
  await wholesale.priceList(
    'store_a',
    'sandbox',
    {
      id: 'test_prices',
      currency: 'EUR',
      lines: [{ sku: 'family', unitAmount: 3000, moq: 2, casepack: 2 }],
    },
    actor,
  );
  await wholesale.partner(
    'store_a',
    'sandbox',
    {
      id: 'partner',
      name: 'Testinis partneris',
      priceListId: 'test_prices',
      country: 'LT',
      currency: 'EUR',
      approved: true,
      customer: {
        name: 'Testinis Partneris',
        email: 'partner@example.test',
        phone: '+37060000000',
        address: { country: 'LT', line1: 'Testinė g. 1', city: 'Vilnius', postalCode: '01101' },
      },
    },
    actor,
  );
  const q = await wholesale.quote(
    'store_a',
    'sandbox',
    {
      id: 'quote_d1',
      partnerId: 'partner',
      lines: [{ sku: 'family', quantity: 2 }],
      deliveryId: 'test_delivery',
    },
    actor,
  );
  assert.equal(q.quote.snapshot.amount, 6000);
  const accepted = await Promise.all([
    wholesale.accept('store_a', 'sandbox', 'quote_d1', actor),
    wholesale.accept('store_a', 'sandbox', 'quote_d1', actor),
  ]);
  assert.equal(new Set(accepted.map((r) => r.order.id)).size, 1);
  const pause = { id: 'pause_d1', partnerId: 'partner', expectedVersion: 0, approved: false };
  await wholesale.approval('store_a', 'sandbox', pause, actor);
  assert.equal((await wholesale.approval('store_a', 'sandbox', pause, actor)).replayed, true);
  await assert.rejects(
    wholesale.approval('store_a', 'sandbox', { ...pause, id: 'stale_pause_d1' }, actor),
    /partner_state_conflict/,
  );
  await assert.rejects(
    wholesale.quote(
      'store_a',
      'sandbox',
      {
        id: 'paused_quote_d1',
        partnerId: 'partner',
        lines: [{ sku: 'family', quantity: 2 }],
        deliveryId: 'test_delivery',
      },
      actor,
    ),
    /partner_not_approved/,
  );
  // Historical acceptance replays its one existing order even after partner revocation.
  assert.equal(
    (await wholesale.accept('store_a', 'sandbox', 'quote_d1', actor)).order.id,
    accepted[0].order.id,
  );
  await assert.rejects(
    service.stmt('UPDATE wholesale_partner_changes SET approved=1').run(),
    /partner_change_immutable/,
  );
  const privateFinancial = await dispatch(
    'store-a.example',
    '/api/operator/financials',
    'GET',
    undefined,
    { 'x-fixture-operator': 'store_a' },
  );
  assert.equal(privateFinancial.status, 200);

  // Late-payment triggers are exercised against native D1, not the Node SQLite shim.
  let clock = Date.now();
  const timed = new CommerceService(db, { now: () => clock });
  const late = await timed.createOrder('store_b', 'sandbox', cart(), key(8));
  await timed.checkout('store_b', 'sandbox', late.order.id, {
    createSession: async () => ({ id: 'cs_late', url: 'https://fixture.example' }),
  });
  clock += 3600001;
  await timed.expire('store_b', 'sandbox');
  const lateOrder = await timed.getOrder('store_b', 'sandbox', late.order.id);
  assert.equal(
    (await timed.acceptPayment('store_b', 'sandbox', payment(lateOrder, 'store_b', 'evt_late')))
      .order.stock_state,
    'allocated',
  );
  await mf.dispose();
  mf = undefined;
  await start('src/worker.mjs', { COMMERCE_ENV: 'production' });
  assert.equal((await dispatch('store-a.example', '/api/catalog')).status, 503);
  console.log(
    'PASS workerd/native D1: ordered migrations, multi-SKU rollback, concurrent HTTP stock, store/token isolation, replay, restart persistence, signed Stripe async/refund/replay, operator gate, stock adjustments, concurrent immutable numbered sale/credit documents, shared-component assembly race, immutable financial imports/reconciliation, wholesale pricing and concurrent acceptance, fixture shipment, journal, outbox, expiry/late payment. No remote API calls.',
  );
} finally {
  if (mf) await mf.dispose();
  // Only the mkdtemp directory created by this test may be removed.
  assert.ok(directory.startsWith(join(tmpdir(), 'commerce-workerd-')));
  rmSync(directory, { recursive: true });
}
