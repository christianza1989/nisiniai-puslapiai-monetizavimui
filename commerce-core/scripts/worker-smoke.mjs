import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import Stripe from 'stripe';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { PDFDocument } from 'pdf-lib';
import { CommerceService } from '../src/service.mjs';
import { CommerceOperations } from '../src/operations.mjs';
import { Backoffice } from '../src/backoffice.mjs';
import { FinishedStock } from '../src/finished-stock.mjs';
import { Wholesale } from '../src/wholesale.mjs';
import { ShippingOperations } from '../src/shipping.mjs';
import { ShipmentCommands } from '../src/shipment-commands.mjs';
import { R2PrivateStorage } from '../src/private-storage.mjs';
import { CatalogOperations } from '../src/catalog.mjs';
import { BuyerDeliveryQuotes } from '../src/buyer-delivery.mjs';
import { ReturnOperations } from '../src/returns.mjs';
import { PublicAbuseGuard } from '../src/public-guard.mjs';
import { ProviderPacing } from '../src/provider-pacing.mjs';
import { CustomerNotifications } from '../src/notifications.mjs';
import { CommerceJobs } from '../src/jobs.mjs';
import {
  foundationStore,
  foundationProducts,
  foundationPayment,
  foundationCarrier,
} from '../test/foundation-fixtures.mjs';
import { applyMigrations } from '../src/migrations.mjs';
import { digest } from '../src/validation.mjs';
import {
  fixtureStore,
  fixtureProducts,
  cart,
  key,
  payment,
  fakeCheckout,
} from '../test/fixtures.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = mkdtempSync(join(tmpdir(), 'commerce-workerd-'));
const coreToken = 'fixture_core_worker_12345678901234567890';
const options = {
  modules: true,
  compatibilityDate: '2026-10-11',
  d1Databases: { COMMERCE_DB: '00000000-0000-0000-0000-000000000001' },
  r2Buckets: { COMMERCE_FILES: 'commerce-private-fixture' },
  queueProducers: { COMMERCE_QUEUE: 'commerce-fixture-jobs' },
  queueConsumers: {
    'commerce-fixture-jobs': { maxBatchSize: 1, maxBatchTimeout: 1, maxRetries: 2 },
  },
  serviceBindings: {
    ASSETS: async (request) => {
      const asset = new URL(request.url).pathname.slice(1);
      if (
        ![
          'admin.html',
          'admin.css',
          'admin.mjs',
          'backoffice-ui.mjs',
          'finished-stock-ui.mjs',
          'shipping-ui.mjs',
          'private-files-ui.mjs',
          'shipment-commands-ui.mjs',
          'jobs-ui.mjs',
          'catalog-ui.mjs',
          'finance-io-ui.mjs',
          'returns-ui.mjs',
          'commerce.html',
          'commerce-client.mjs',
          'checkout-ui.mjs',
          'checkout.css',
          'commerce-preview.mjs',
          'fonts/NotoSans-Regular.ttf',
        ].includes(asset)
      )
        return new Response('Not found', { status: 404 });
      return new Response(readFileSync(join(root, 'public', asset)), {
        headers: {
          'content-type': asset.endsWith('.html')
            ? 'text/html; charset=utf-8'
            : asset.endsWith('.css')
              ? 'text/css; charset=utf-8'
              : 'text/javascript; charset=utf-8',
        },
      });
    },
  },
  bindings: {
    COMMERCE_ENV: 'sandbox',
    TEST_HARNESS: 'fixture-only',
    COMMERCE_CORE_GRANTS: JSON.stringify([
      {
        id: 'fixture_core_operator',
        storeId: 'store_a',
        legalEntityId: 'store_a_entity',
        environment: 'sandbox',
        tokenHash: await digest(coreToken),
        issuedAt: Date.now() - 1000,
        expiresAt: Date.now() + 3600000,
        permissions: ['read', 'document'],
      },
    ]),
  },
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
  const pacingScope = await digest('fixture_shared_provider_key');
  const pacingStarts = [];
  await Promise.all(
    [new ProviderPacing(db), new ProviderPacing(db)].map((gate) =>
      gate.run(pacingScope, async () => {
        pacingStarts.push(Date.now());
      }),
    ),
  );
  assert.equal(pacingStarts.length, 2);
  assert.ok(pacingStarts[1] - pacingStarts[0] >= 1000);
  assert.equal(
    (
      await db
        .prepare('SELECT lease_token FROM provider_request_pacing WHERE scope_hash=?')
        .bind(pacingScope)
        .first()
    ).lease_token,
    null,
  );
  await service.provisionStore(fixtureStore(), fixtureProducts(1));
  await service.provisionStore(fixtureStore('store_b'), fixtureProducts(3));
  assert.equal((await dispatch('unknown.example', '/api/catalog')).status, 404);
  assert.equal((await dispatch('store-a.example', '/api/catalog')).status, 200);
  assert.equal((await dispatch('unknown.example', '/admin')).status, 404);
  const adminAsset = await dispatch('store-a.example', '/admin');
  assert.equal(adminAsset.status, 200);
  assert.equal(adminAsset.headers.get('cache-control'), 'no-store');
  assert.match(await adminAsset.text(), /Prekybos valdymas/);
  const storefrontContext = await (
    await dispatch('store-a.example', '/api/storefront-context')
  ).json();
  assert.equal(storefrontContext.publishOffers, false);
  assert.equal(storefrontContext.environment, 'sandbox');
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
  const pdf = await mf.dispatchFetch(
    'https://store-a.example/api/operator/orders/' + result.order.id + '/files/file_worker',
    {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + coreToken,
        'content-type': 'application/pdf',
        'x-file-name': 'worker-fixture.pdf',
      },
      body: '%PDF-1.7\nworker fixture',
    },
  );
  assert.equal(pdf.status, 200);
  const privateMeta = await pdf.json();
  const privateResponse = await dispatch(
    'store-a.example',
    '/api/operator/files/file_worker',
    'GET',
    undefined,
    { authorization: 'Bearer ' + coreToken },
  );
  assert.equal(privateResponse.status, 200);
  assert.equal(await privateResponse.text(), '%PDF-1.7\nworker fixture');
  assert.equal((await dispatch('store-a.example', '/api/operator/files/file_worker')).status, 403);
  assert.equal(
    (await (await mf.getR2Bucket('COMMERCE_FILES')).get(privateMeta.file.storage_key)).size,
    23,
  );
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
  const fixtureContext = await (
    await dispatch('store-a.example', '/api/storefront-context')
  ).json();
  assert.equal(fixtureContext.paymentProvider, 'fixture');
  assert.equal(fixtureContext.paymentAccountVerified, false);
  assert.equal(fixtureContext.paymentEnvironment, null);
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
  assert.deepEqual(Object.keys(session).sort(), ['uiMode', 'url']);
  assert.equal(session.uiMode, 'hosted');
  const nativeEmbeddedCreated = await dispatch('store-b.example', '/api/orders', 'POST', cart(), {
    'idempotency-key': key(909),
  });
  assert.equal(nativeEmbeddedCreated.status, 201);
  const nativeEmbeddedOrder = (await nativeEmbeddedCreated.json()).order;
  const embeddedPath = '/api/orders/' + nativeEmbeddedOrder.id + '/checkout';
  const embeddedResponse = await dispatch(
    'store-b.example',
    embeddedPath,
    'POST',
    { uiMode: 'embedded' },
    { authorization: 'Bearer ' + token },
  );
  assert.equal(embeddedResponse.status, 200);
  const embeddedDetails = await embeddedResponse.json();
  assert.deepEqual(Object.keys(embeddedDetails).sort(), [
    'clientSecret',
    'publishableKey',
    'uiMode',
  ]);
  assert.equal(embeddedDetails.uiMode, 'embedded');
  assert.match(embeddedDetails.clientSecret, /^cs_test_[a-z0-9]+_secret_/);
  assert.ok(embeddedDetails.clientSecret.includes('%2F123%3D456'));
  assert.equal(
    (await service.getOrder('store_b', 'sandbox', nativeEmbeddedOrder.id)).payment_state,
    'pending',
  );
  // Recreate the actual Worker; Session mode/identity is recovered from the
  // fixture provider's immutable parameters, with no secret in the order row.
  await mf.dispose();
  mf = undefined;
  db = await start('test/worker-harness.mjs');
  service = new CommerceService(db);
  const nativeEmbeddedRecovered = await dispatch(
    'store-b.example',
    embeddedPath,
    'POST',
    { uiMode: 'hosted' },
    { authorization: 'Bearer ' + token },
  );
  assert.equal(nativeEmbeddedRecovered.status, 200);
  assert.deepEqual(await nativeEmbeddedRecovered.json(), embeddedDetails);
  assert.equal(
    (
      await dispatch(
        'store-b.example',
        embeddedPath,
        'POST',
        { uiMode: 'embedded' },
        { authorization: 'Bearer wrong_token' },
      )
    ).status,
    403,
  );
  const recoveredHosted = await dispatch(
    'store-a.example',
    '/api/orders/' + result.order.id + '/checkout',
    'POST',
    { uiMode: 'embedded' },
    { authorization: 'Bearer ' + token },
  );
  assert.equal(recoveredHosted.status, 200);
  assert.deepEqual(await recoveredHosted.json(), session);
  const hostedCheckoutId = (await service.getOrder('store_a', 'sandbox', result.order.id))
    .checkout_id;
  assert.equal(
    JSON.stringify(
      await service.one(
        'SELECT * FROM orders WHERE store_id=? AND id=?',
        'store_b',
        nativeEmbeddedOrder.id,
      ),
    ).includes('_secret_'),
    false,
  );
  const raw = JSON.stringify({
    id: 'evt_workerd',
    livemode: false,
    type: 'checkout.session.async_payment_succeeded',
    data: {
      object: {
        id: hostedCheckoutId,
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
  const count = {
    id: 'count_d1',
    lotId: 'lot',
    kind: 'adjust',
    delta: 1,
    expectedAvailable: 0,
    expectedVersion: 1,
    reason: 'Testinė native D1 inventorizacija',
  };
  await Promise.all([
    back.controlLot('store_a', 'sandbox', count, actor),
    back.controlLot('store_a', 'sandbox', count, actor),
  ]);
  const lotPause = {
    id: 'lot_pause_d1',
    lotId: 'lot',
    kind: 'quarantine',
    delta: 0,
    expectedAvailable: 1,
    expectedVersion: 2,
    reason: 'Testinis native D1 karantinas',
  };
  await back.controlLot('store_a', 'sandbox', lotPause, actor);
  await assert.rejects(
    back.controlLot('store_a', 'sandbox', { ...lotPause, id: 'stale_lot_d1' }, actor),
    /lot_state_conflict/,
  );
  await assert.rejects(
    back.assemble(
      'store_a',
      'sandbox',
      { id: 'paused_assembly_d1', recipeId: 'recipe_couple', quantity: 1 },
      actor,
    ),
    /component_stock_conflict/,
  );
  assert.equal((await back.inventory('store_a', 'sandbox')).assemblies.length, 1);
  await back.controlLot(
    'store_a',
    'sandbox',
    {
      ...lotPause,
      id: 'lot_release_d1',
      kind: 'release',
      expectedVersion: 3,
      reason: 'Baigta native D1 patikra',
    },
    actor,
  );
  await back.assemble(
    'store_a',
    'sandbox',
    { id: 'released_assembly_d1', recipeId: 'recipe_couple', quantity: 1 },
    actor,
  );
  const controlled = (await back.inventory('store_a', 'sandbox')).lots[0];
  assert.equal(controlled.available, 0);
  assert.equal(controlled.control_version, 5);
  await assert.rejects(service.stmt('DELETE FROM lot_controls').run(), /lot_control_immutable/);
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
  await service.checkout('store_a', 'sandbox', accepted[0].order.id, {
    createSession: async () => ({
      id: 'cs_shipping_d1',
      url: 'https://checkout.stripe.test/shipping',
    }),
  });
  await service.acceptPayment(
    'store_a',
    'sandbox',
    payment(
      await service.getOrder('store_a', 'sandbox', accepted[0].order.id),
      'store_a',
      'evt_shipping_d1',
    ),
  );
  const shippingHeaders = { 'x-fixture-operator': 'store_a' };
  assert.equal(
    (
      await dispatch(
        'store-a.example',
        '/api/operator/shipping-origins',
        'POST',
        {
          id: 'origin_d1',
          country: 'LT',
          city: 'Vilnius',
          postalCode: '02211',
          isCompany: true,
          reason: 'Patvirtinta testinė vieta',
        },
        shippingHeaders,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await dispatch(
        'store-a.example',
        '/api/operator/orders/' + accepted[0].order.id + '/shipping-plans',
        'POST',
        { id: 'plan_d1', originId: 'origin_d1', mode: 'individual', recipientIsCompany: true },
        shippingHeaders,
      )
    ).status,
    200,
  );
  const shippingQuote = await dispatch(
    'store-a.example',
    '/api/operator/shipping-plans/plan_d1/quotes',
    'POST',
    { id: 'shipping_quote_d1' },
    shippingHeaders,
  );
  assert.equal(shippingQuote.status, 200);
  assert.equal((await shippingQuote.json()).record.payload.offers[0].amount, 799);
  const shippingReplay = await dispatch(
    'store-a.example',
    '/api/operator/shipping-plans/plan_d1/quotes',
    'POST',
    { id: 'shipping_quote_d1' },
    shippingHeaders,
  );
  assert.equal((await shippingReplay.json()).replayed, true);
  await assert.rejects(
    service.stmt('UPDATE shipping_quotes SET payload_json=?', '{}').run(),
    /shipping_record_immutable/,
  );
  const shippingDetail = await dispatch(
    'store-a.example',
    '/api/operator/orders/' + accepted[0].order.id,
    'GET',
    undefined,
    shippingHeaders,
  );
  assert.equal(
    (await shippingDetail.json()).shippingPreparation.plans[0].payload.parcels.length,
    2,
  );
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
  const refundHeaders = { 'x-fixture-operator': 'store_a' };
  const prepared = await Promise.all(
    ['one', 'two', 'three'].map((id) =>
      dispatch(
        'store-a.example',
        '/api/operator/orders/' + result.order.id + '/refund-commands',
        'POST',
        { id: 'native_' + id, amount: 1000, reason: 'Native refund test' },
        refundHeaders,
      ),
    ),
  );
  assert.deepEqual(prepared.map((r) => r.status).sort(), [200, 200, 409]);
  const refundCommand = (await prepared.find((r) => r.status === 200).json()).command;
  const executions = await Promise.all(
    [1, 2].map(() =>
      dispatch(
        'store-a.example',
        '/api/operator/refund-commands/' + refundCommand.id + '/execute',
        'POST',
        {},
        refundHeaders,
      ),
    ),
  );
  assert.ok(executions.some((r) => r.status === 200));
  assert.equal(
    (
      await service.one(
        'SELECT state FROM refund_commands WHERE store_id=? AND id=?',
        'store_a',
        refundCommand.id,
      )
    ).state,
    'succeeded',
  );
  assert.equal(
    (await service.getOrder('store_a', 'sandbox', result.order.id)).refunded_amount,
    2000,
  );
  const unsubmitted = (
    await prepared
      .filter((r) => r.status === 200)
      .find((r) => r.bodyUsed === false)
      .json()
  ).command;
  assert.equal(
    (
      await dispatch(
        'store-a.example',
        '/api/operator/refund-commands/' + unsubmitted.id + '/cancel',
        'POST',
        {},
        refundHeaders,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await service.one(
        'SELECT review_reason FROM refund_commands WHERE store_id=? AND id=?',
        'store_a',
        unsubmitted.id,
      )
    ).review_reason,
    'canceled_before_submission',
  );
  await assert.rejects(
    service.stmt('UPDATE refund_commands SET amount=1').run(),
    /refund_command_immutable/,
  );

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
  const nativeStore = 'store_native';
  await service.provisionStore(
    foundationStore('store-native.example', nativeStore),
    foundationProducts(),
  );
  const nativeCustomer = {
    name: 'Native Test User',
    email: 'buyer@example.test',
    phone: '+37060000000',
    address: { country: 'LT', line1: 'Testinė g. 2', city: 'Vilnius', postalCode: '01101' },
  };
  const nativeOrder = (
    await service.createOrder(
      nativeStore,
      'sandbox',
      { ...cart(), deliveryId: 'fixture_door', customer: nativeCustomer },
      key(100),
    )
  ).order;
  await service.checkout(
    nativeStore,
    'sandbox',
    nativeOrder.id,
    foundationPayment('store-native.example', nativeStore),
  );
  await service.acceptPayment(
    nativeStore,
    'sandbox',
    payment(
      await service.getOrder(nativeStore, 'sandbox', nativeOrder.id),
      nativeStore,
      'evt_native_commands',
    ),
  );
  await service.markPacked(nativeStore, 'sandbox', nativeOrder.id);
  let fixtureLedger = {};
  const nativeCarrier = foundationCarrier({
    load: async () => fixtureLedger,
    save: async (value) => {
      fixtureLedger = value;
    },
    loadPdf: async () => new TextEncoder().encode('%PDF-1.7\nnative fixture'),
  });
  const nativeShipping = new ShippingOperations(service);
  await nativeShipping.origin(
    nativeStore,
    'sandbox',
    {
      id: 'native_origin',
      country: 'LT',
      name: 'Native Test MB',
      line1: 'Testinė g. 1',
      city: 'Vilnius',
      postalCode: '02211',
      phone: '+37060000001',
      email: 'sender@example.test',
      isCompany: true,
      reason: 'Native fixture origin',
    },
    'fixture_operator',
  );
  await nativeShipping.prepare(
    nativeStore,
    'sandbox',
    nativeOrder.id,
    { id: 'native_plan', originId: 'native_origin', recipientIsCompany: false, mode: 'individual' },
    'fixture_operator',
  );
  await nativeShipping.quote(
    nativeStore,
    'sandbox',
    'native_plan',
    { id: 'native_quote' },
    nativeCarrier,
    'fixture_operator',
  );
  const nativeCommands = new ShipmentCommands(
    service,
    new R2PrivateStorage(await mf.getR2Bucket('COMMERCE_FILES')),
  );
  await nativeCommands.prepare(
    nativeStore,
    'sandbox',
    nativeOrder.id,
    {
      id: 'native_command',
      planId: 'native_plan',
      quoteId: 'native_quote',
      serviceId: '42',
      maxCost: 799,
    },
    'fixture_operator',
  );
  const nativeExecution = await Promise.allSettled(
    [1, 2].map(() =>
      nativeCommands.execute(
        nativeStore,
        'sandbox',
        'native_command',
        nativeCarrier,
        'fixture_operator',
      ),
    ),
  );
  assert.ok(nativeExecution.some((r) => r.status === 'fulfilled'));
  assert.equal(Object.keys(fixtureLedger).length, 1);
  await nativeCommands.refresh(
    nativeStore,
    'sandbox',
    'native_command',
    nativeCarrier,
    'fixture_operator',
  );
  assert.equal(
    (await service.getOrder(nativeStore, 'sandbox', nativeOrder.id)).fulfillment_state,
    'labelled',
  );
  assert.equal(
    (
      await service.one(
        "SELECT COUNT(*) n FROM private_files WHERE store_id=? AND kind='shipment_document'",
        nativeStore,
      )
    ).n,
    1,
  );
  await assert.rejects(
    service
      .stmt('UPDATE shipment_commands SET first_attempt_at=NULL WHERE store_id=?', nativeStore)
      .run(),
    /shipment_command_immutable/,
  );
  await mf.dispose();
  mf = undefined;
  db = await start('src/worker.mjs', { COMMERCE_AUTOMATION_ENABLED: '1' });
  const storedDocument = await new CommerceService(db).one(
    "SELECT id FROM documents WHERE store_id='store_a' AND kind='sale' ORDER BY created_at LIMIT 1",
  );
  const nativePdf = await dispatch(
    'store-a.example',
    '/api/operator/documents/' + storedDocument.id + '/pdf',
    'GET',
    undefined,
    { authorization: 'Bearer ' + coreToken },
  );
  assert.equal(nativePdf.status, 200);
  assert.equal(nativePdf.headers.get('content-type'), 'application/pdf');
  const nativeBytes = new Uint8Array(await nativePdf.arrayBuffer());
  assert.equal(new TextDecoder().decode(nativeBytes.slice(0, 5)), '%PDF-');
  assert.ok(nativeBytes.length > 10000);
  assert.equal(
    (
      await dispatch(
        'store-b.example',
        '/api/operator/documents/' + storedDocument.id + '/pdf',
        'GET',
        undefined,
        { authorization: 'Bearer ' + coreToken },
      )
    ).status,
    403,
  );
  const exportedFile = await new CommerceService(db).one(
    'SELECT storage_key FROM private_files WHERE source_id=?',
    storedDocument.id,
  );
  assert.equal(
    (await (await mf.getR2Bucket('COMMERCE_FILES')).get(exportedFile.storage_key)).size,
    nativeBytes.length,
  );
  const producer = await mf.getQueueProducer('COMMERCE_QUEUE');
  await producer.send({ schemaVersion: 1, storeId: 'store_a', environment: 'sandbox' });
  let nativeJobs = 0;
  for (let attempt = 0; attempt < 60; attempt++) {
    nativeJobs = (
      await new CommerceService(db).one("SELECT COUNT(*) n FROM outbox_delivery WHERE state='done'")
    ).n;
    if (nativeJobs > 0) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(nativeJobs > 0, 'native Queue must actually dispatch the worker job consumer');
  const newest = new CommerceService(db);
  let qualityClock = Date.now();
  const qualityService = new CommerceService(db, { now: () => qualityClock }),
    qualityStore = 'store_finished_native',
    qualityBack = new Backoffice(qualityService),
    qualityStock = new FinishedStock(qualityService);
  await qualityService.provisionStore(
    { ...fixtureStore(qualityStore), hosts: ['finished-native.example'] },
    fixtureProducts(0).map((p) => ({ ...p, lotTrackingRequired: true })),
  );
  await qualityBack.component(
    qualityStore,
    'sandbox',
    { id: 'powder', name: 'TEST native powder', unit: 'unit' },
    'fixture_operator',
  );
  await qualityBack.recipe(
    qualityStore,
    'sandbox',
    { id: 'recipe', sku: 'couple', components: [{ id: 'powder', quantity: 1, unit: 'unit' }] },
    'fixture_operator',
  );
  await qualityBack.receive(
    qualityStore,
    'sandbox',
    {
      id: 'native_raw',
      componentId: 'powder',
      supplierRef: 'TEST native batch',
      quantity: 2,
      expiresAt: qualityClock + 1000,
    },
    'fixture_operator',
  );
  await qualityBack.assemble(
    qualityStore,
    'sandbox',
    { id: 'native_kit', recipeId: 'recipe', quantity: 2 },
    'fixture_operator',
  );
  const qualityOrder = (await qualityService.createOrder(qualityStore, 'sandbox', cart(), key(912)))
    .order;
  await qualityService.checkout(qualityStore, 'sandbox', qualityOrder.id, fakeCheckout);
  assert.equal(
    (await qualityStock.order(qualityStore, 'sandbox', qualityOrder.id)).allocations[0].lot_id,
    'native_kit',
  );
  qualityClock += 1001;
  assert.equal((await qualityService.catalog(qualityStore, 'sandbox'))[0].available, 0);
  await assert.rejects(
    qualityService.createOrder(qualityStore, 'sandbox', cart(), key(913)),
    /stock_unavailable/,
  );
  await qualityService.acceptPayment(
    qualityStore,
    'sandbox',
    payment(
      await qualityService.getOrder(qualityStore, 'sandbox', qualityOrder.id),
      qualityStore,
      'evt_native_quality',
    ),
  );
  const heldOrder = await qualityService.getOrder(qualityStore, 'sandbox', qualityOrder.id);
  assert.equal(heldOrder.payment_state, 'paid');
  assert.equal(heldOrder.fulfillment_state, 'stock_exception');
  assert.equal(heldOrder.stock_state, 'released');
  assert.equal((await qualityStock.list(qualityStore, 'sandbox')).lots[0].available, 2);
  await assert.rejects(
    qualityService.markPacked(qualityStore, 'sandbox', qualityOrder.id, 'fixture_operator'),
    /packing_not_allowed/,
  );
  const nativeCatalog = new CatalogOperations(newest),
    originalSku = (await nativeCatalog.list(nativeStore, 'sandbox')).find(
      (p) => p.sku === 'couple',
    );
  await nativeCatalog.revise(
    nativeStore,
    'sandbox',
    {
      id: 'native_revision',
      basisHash: originalSku.basisHash,
      definition: { ...originalSku, enabled: true, title: 'TEST native revised kit' },
    },
    'fixture_operator',
  );
  assert.equal(
    (await nativeCatalog.list(nativeStore, 'sandbox')).find((p) => p.sku === 'couple').title,
    'TEST native revised kit',
  );
  const dynamicInput = {
    country: 'LT',
    currency: 'EUR',
    deliveryId: 'fixture_dynamic',
    lines: [{ sku: 'couple', quantity: 1 }],
    customer: {
      name: 'Fixture Buyer',
      email: 'buyer@example.test',
      phone: '+37060000000',
      address: { country: 'LT', line1: 'Test g. 1', city: 'Vilnius', postalCode: '02211' },
    },
  };
  const publicRate = await new BuyerDeliveryQuotes(newest).create(
    nativeStore,
    'sandbox',
    { ...dynamicInput, id: 'native_buyer_rate' },
    nativeCarrier,
  );
  assert.equal(
    (
      await newest.quote(nativeStore, 'sandbox', {
        ...dynamicInput,
        deliveryQuoteId: publicRate.id,
      })
    ).delivery.amount,
    799,
  );
  const guard = new PublicAbuseGuard(newest, 'fixture_native_salt_12345678901234567890');
  await guard.allow(
    new Request('https://fixture.example', { headers: { 'cf-connecting-ip': '192.0.2.3' } }),
    { id: nativeStore },
    'quote',
  );
  const returned = await new ReturnOperations(newest).receive(
    nativeStore,
    'sandbox',
    nativeOrder.id,
    {
      id: 'native_return',
      reason: 'TEST inspected return',
      lines: nativeOrder.snapshot.lines.map((l) => ({
        sku: l.sku,
        quantity: l.quantity,
        disposition: 'resalable',
        expiryChecked: true,
      })),
    },
    'fixture_operator',
  );
  assert.ok(returned);
  const mailEvent = await newest.one(
    "SELECT * FROM outbox WHERE store_id=? AND aggregate_id=? AND kind='OrderPlaced'",
    nativeStore,
    nativeOrder.id,
  );
  await new CommerceJobs(newest).notification(nativeStore, 'sandbox', mailEvent);
  let nativeMailCalls = 0;
  const mail = new CustomerNotifications(newest, {
    [nativeStore]: {
      environment: 'sandbox',
      accountRef: 'fixture_core_mail',
      sender: 'fixture@example.test',
      send: async () => {
        nativeMailCalls++;
        return { status: 'accepted', reference: 'LOCAL NATIVE MAIL ACCEPTANCE' };
      },
    },
  });
  assert.equal(
    (await mail.execute(nativeStore, 'sandbox', mailEvent.id, 'fixture_operator')).state,
    'accepted',
  );
  await mail.execute(nativeStore, 'sandbox', mailEvent.id, 'fixture_operator');
  assert.equal(nativeMailCalls, 1);
  const automaticStore = 'store_auto_native';
  const automaticConfig = foundationStore('store-auto-native.example', automaticStore);
  automaticConfig.dispatch = {
    country: 'LT',
    city: 'Vilnius',
    postalCode: '02211',
    name: 'Native Test Sender',
    line1: 'Testinė g. 1',
    phone: '+37060000001',
    email: 'sender@example.test',
    isCompany: true,
  };
  automaticConfig.automationPolicy = {
    autoPrepareIndividualShipments: true,
    autoExecutePreparedShipments: true,
    autoCollectShipmentDocuments: true,
    maxCarrierSubsidyMinor: 0,
  };
  await newest.provisionStore(automaticConfig, foundationProducts());
  let autoLedger = {},
    automaticPosts = 0;
  const automaticCarrier = foundationCarrier({
    load: async () => autoLedger,
    save: async (value) => {
      autoLedger = value;
      automaticPosts++;
    },
    loadPdf: async () => nativeBytes, // valid existing TEST invoice used only as generic provider-PDF fixture
  });
  automaticCarrier.labelFileNames.add('fixture.pdf');
  const availableAutomaticDocuments = automaticCarrier.documents.bind(automaticCarrier);
  let automaticLabelsAvailable = false,
    automaticTime = Date.now() + 1000;
  automaticCarrier.documents = async (...args) =>
    automaticLabelsAvailable ? availableAutomaticDocuments(...args) : [];
  const autoRate = await new BuyerDeliveryQuotes(newest).create(
    automaticStore,
    'sandbox',
    { ...dynamicInput, id: 'auto_native_rate' },
    automaticCarrier,
  );
  const automaticOrder = (
    await newest.createOrder(
      automaticStore,
      'sandbox',
      { ...dynamicInput, deliveryQuoteId: autoRate.id },
      key(200),
    )
  ).order;
  await newest.checkout(
    automaticStore,
    'sandbox',
    automaticOrder.id,
    foundationPayment('store-auto-native.example', automaticStore),
  );
  await newest.acceptPayment(
    automaticStore,
    'sandbox',
    payment(
      await newest.getOrder(automaticStore, 'sandbox', automaticOrder.id),
      automaticStore,
      'evt_auto_native',
    ),
  );
  await newest.markPacked(automaticStore, 'sandbox', automaticOrder.id, 'fixture_operator');
  const automaticService = () => new CommerceService(db, { now: () => automaticTime });
  const runAutomaticJobs = async () =>
    new CommerceJobs(automaticService(), {
      privateStorage: new R2PrivateStorage(await mf.getR2Bucket('COMMERCE_FILES')),
      loadDocumentFont: async () =>
        new Uint8Array(readFileSync(join(root, 'public/fonts/NotoSans-Regular.ttf'))),
      shippingReadAdapters: { [automaticStore]: automaticCarrier },
      shippingAdapters: { [automaticStore]: automaticCarrier },
    }).scheduled(automaticStore, 'sandbox');
  await runAutomaticJobs();
  await runAutomaticJobs();
  const nativePendingDocumentEvent = await automaticService().one(
    "SELECT id FROM outbox WHERE store_id=? AND kind='ShipmentRegistered'",
    automaticStore,
  );
  assert.equal(
    (
      await automaticService().one(
        'SELECT state FROM outbox_delivery WHERE store_id=? AND event_id=?',
        automaticStore,
        nativePendingDocumentEvent.id,
      )
    ).state,
    'waiting',
  );
  // Dispose/recreate the actual workerd process; the waiting job lives in D1.
  await mf.dispose();
  mf = undefined;
  db = await start('src/worker.mjs', { COMMERCE_AUTOMATION_ENABLED: '1' });
  for (let i = 0; i < 7; i++) {
    automaticTime += 60001;
    await runAutomaticJobs();
    assert.equal(
      (
        await automaticService().one(
          'SELECT state,attempts FROM outbox WHERE store_id=? AND id=?',
          automaticStore,
          nativePendingDocumentEvent.id,
        )
      ).attempts,
      0,
    );
  }
  automaticLabelsAvailable = true;
  automaticTime += 60001;
  await runAutomaticJobs();
  await runAutomaticJobs();
  assert.equal(
    (
      await automaticService().one(
        'SELECT state FROM outbox_delivery WHERE store_id=? AND event_id=?',
        automaticStore,
        nativePendingDocumentEvent.id,
      )
    ).state,
    'done',
  );
  assert.equal(automaticPosts, 1);
  assert.equal(
    (await automaticService().getOrder(automaticStore, 'sandbox', automaticOrder.id))
      .fulfillment_state,
    'labelled',
  );
  assert.equal(
    (
      await automaticService().one(
        "SELECT COUNT(*) n FROM private_files WHERE store_id=? AND kind='shipment_document'",
        automaticStore,
      )
    ).n,
    1,
  );
  // A separate two-parcel order gets one POST and one intact multipage bundle.
  // CSV candidates do not prove printed parcel-to-page identity.
  const nativeBundleInput = { ...dynamicInput, lines: [{ sku: 'couple', quantity: 2 }] };
  const nativeBundleRate = await new BuyerDeliveryQuotes(automaticService()).create(
    automaticStore,
    'sandbox',
    { ...nativeBundleInput, id: 'native_bundle_rate' },
    automaticCarrier,
  );
  const nativeBundleOrder = (
    await automaticService().createOrder(
      automaticStore,
      'sandbox',
      { ...nativeBundleInput, deliveryQuoteId: nativeBundleRate.id },
      key(201),
    )
  ).order;
  await automaticService().checkout(
    automaticStore,
    'sandbox',
    nativeBundleOrder.id,
    foundationPayment('store-auto-native.example', automaticStore),
  );
  await automaticService().acceptPayment(
    automaticStore,
    'sandbox',
    payment(
      await automaticService().getOrder(automaticStore, 'sandbox', nativeBundleOrder.id),
      automaticStore,
      'evt_native_bundle',
    ),
  );
  await automaticService().markPacked(
    automaticStore,
    'sandbox',
    nativeBundleOrder.id,
    'fixture_operator',
  );
  await runAutomaticJobs();
  const nativeBundleCommand = await automaticService().one(
    'SELECT id,provider_id FROM shipment_commands WHERE store_id=? AND order_id=?',
    automaticStore,
    nativeBundleOrder.id,
  );
  autoLedger[nativeBundleCommand.provider_id].tracking_number = 'NATIVE_TRACK_A,NATIVE_TRACK_B';
  const nativeBundlePdf = await PDFDocument.create();
  nativeBundlePdf.addPage().drawText('NATIVE_TRACK_A fixture printed label');
  nativeBundlePdf.addPage().drawText('NATIVE_TRACK_B fixture printed label');
  const nativeBundleBytes = await nativeBundlePdf.save();
  automaticCarrier.documents = async (id) =>
    id === nativeBundleCommand.provider_id
      ? [
          {
            filename: 'native-stickers.pdf',
            providerFilename: 'Stickers.pdf',
            kind: 'label',
            bytes: nativeBundleBytes,
            contentType: 'application/pdf',
            private: true,
          },
        ]
      : availableAutomaticDocuments(id);
  await runAutomaticJobs();
  const nativeBundleVault = new R2PrivateStorage(await mf.getR2Bucket('COMMERCE_FILES'));
  const nativeBundleReceipt = await new ShipmentCommands(
    automaticService(),
    nativeBundleVault,
  ).refresh(
    automaticStore,
    'sandbox',
    nativeBundleCommand.id,
    automaticCarrier,
    'fixture_operator',
  );
  assert.deepEqual(nativeBundleReceipt.trackingCandidates, ['NATIVE_TRACK_A', 'NATIVE_TRACK_B']);
  assert.equal(nativeBundleReceipt.trackingCandidateSource, 'order_csv');
  assert.equal(nativeBundleReceipt.files.length, 1);
  assert.equal(nativeBundleReceipt.documents[0].unverifiedBundle, true);
  assert.equal(nativeBundleReceipt.documents[0].parcelIndex, null);
  assert.equal(nativeBundleReceipt.documents[0].trackingNumber, null);
  assert.equal(nativeBundleReceipt.documents[0].labelMappingVerified, false);
  const nativeBundleFile = await automaticService().one(
    'SELECT storage_key FROM private_files WHERE store_id=? AND id=?',
    automaticStore,
    nativeBundleReceipt.files[0],
  );
  const nativeStoredBundle = await nativeBundleVault.get(nativeBundleFile.storage_key);
  assert.deepEqual(nativeStoredBundle, nativeBundleBytes);
  assert.equal((await PDFDocument.load(nativeStoredBundle)).getPageCount(), 2);
  await runAutomaticJobs();
  assert.equal(automaticPosts, 2, 'one POST each for two distinct fixture orders');
  // Provider5 is a known unpaid original order, not a failed create to repeat.
  const nativeHeldFetch = automaticCarrier.fetch;
  automaticCarrier.fetch = async (url, options) => {
    const response = await nativeHeldFetch(url, options);
    if (!new URL(url).pathname.endsWith('/creates')) return response;
    const fact = await response.json();
    fact.status = 5;
    autoLedger[String(fact.id)] = fact;
    return Response.json(fact);
  };
  const nativeHeldRate = await new BuyerDeliveryQuotes(automaticService()).create(
    automaticStore,
    'sandbox',
    { ...dynamicInput, id: 'native_held_rate' },
    automaticCarrier,
  );
  const nativeHeldOrder = (
    await automaticService().createOrder(
      automaticStore,
      'sandbox',
      { ...dynamicInput, deliveryQuoteId: nativeHeldRate.id },
      key(202),
    )
  ).order;
  await automaticService().checkout(
    automaticStore,
    'sandbox',
    nativeHeldOrder.id,
    foundationPayment('store-auto-native.example', automaticStore),
  );
  await automaticService().acceptPayment(
    automaticStore,
    'sandbox',
    payment(
      await automaticService().getOrder(automaticStore, 'sandbox', nativeHeldOrder.id),
      automaticStore,
      'evt_native_held',
    ),
  );
  await automaticService().markPacked(
    automaticStore,
    'sandbox',
    nativeHeldOrder.id,
    'fixture_operator',
  );
  await runAutomaticJobs();
  const heldBeforeRestart = await automaticService().one(
    'SELECT * FROM shipment_commands WHERE store_id=? AND order_id=?',
    automaticStore,
    nativeHeldOrder.id,
  );
  assert.equal(heldBeforeRestart.state, 'review');
  assert.equal(heldBeforeRestart.review_reason, 'carrier_booking_unpaid');
  assert.ok(heldBeforeRestart.provider_id);
  assert.equal(
    (await automaticService().getOrder(automaticStore, 'sandbox', nativeHeldOrder.id))
      .fulfillment_state,
    'ready',
  );
  assert.equal(
    (
      await automaticService().one(
        'SELECT COUNT(*) n FROM shipments WHERE store_id=? AND order_id=?',
        automaticStore,
        nativeHeldOrder.id,
      )
    ).n,
    0,
  );
  await mf.dispose();
  mf = undefined;
  db = await start('src/worker.mjs', { COMMERCE_AUTOMATION_ENABLED: '1' });
  const restoredCommands = () =>
    new ShipmentCommands(automaticService(), new R2PrivateStorage(nativeHeldBucket));
  const nativeHeldBucket = await mf.getR2Bucket('COMMERCE_FILES');
  autoLedger[heldBeforeRestart.provider_id].status = 6;
  const waiting = await restoredCommands().refresh(
    automaticStore,
    'sandbox',
    heldBeforeRestart.id,
    automaticCarrier,
    'fixture_operator',
  );
  assert.equal(waiting.pending, true);
  assert.equal(waiting.labelsAvailable, false);
  assert.equal(
    (await restoredCommands().get(automaticStore, 'sandbox', heldBeforeRestart.id)).provider_id,
    heldBeforeRestart.provider_id,
  );
  autoLedger[heldBeforeRestart.provider_id].status = 8;
  const paymentCanceled = await restoredCommands().refresh(
    automaticStore,
    'sandbox',
    heldBeforeRestart.id,
    automaticCarrier,
    'fixture_operator',
  );
  assert.equal(paymentCanceled.requiresReview, true);
  assert.equal(paymentCanceled.providerState, 'payment_canceled');
  assert.equal(paymentCanceled.labelsAvailable, false);
  await assert.rejects(
    restoredCommands().execute(
      automaticStore,
      'sandbox',
      heldBeforeRestart.id,
      automaticCarrier,
      'fixture_operator',
    ),
    /shipment_execution_not_allowed/,
  );
  autoLedger[heldBeforeRestart.provider_id].status = 1;
  const originalReady = await restoredCommands().refresh(
    automaticStore,
    'sandbox',
    heldBeforeRestart.id,
    automaticCarrier,
    'fixture_operator',
  );
  assert.equal(originalReady.labelsAvailable, true);
  assert.equal(
    (await restoredCommands().get(automaticStore, 'sandbox', heldBeforeRestart.id)).provider_id,
    heldBeforeRestart.provider_id,
  );
  assert.equal(
    (
      await automaticService().one(
        "SELECT COUNT(*) n FROM outbox WHERE store_id=? AND aggregate_id=? AND kind='ShipmentRegistered'",
        automaticStore,
        nativeHeldOrder.id,
      )
    ).n,
    1,
  );
  assert.equal(
    automaticPosts,
    3,
    'one POST for each original fixture order even across unpaid/pending/canceled recovery and real restart',
  );
  // Explicit per-product simple balances use the same native reservation triggers.
  let simpleTime = Date.now();
  const simpleService = new CommerceService(db, { now: () => simpleTime }),
    simpleStore = 'store_counts',
    simpleConfig = fixtureStore(simpleStore);
  await simpleService
    .stmt(
      'INSERT INTO stores(id,environment,config_json) VALUES(?,?,?)',
      simpleStore,
      'sandbox',
      JSON.stringify(simpleConfig),
    )
    .run();
  const simpleCatalog = new CatalogOperations(simpleService),
    simpleOps = new CommerceOperations(simpleService);
  for (const product of fixtureProducts(0).slice(0, 2)) {
    await simpleCatalog.revise(
      simpleStore,
      'sandbox',
      {
        id: 'native_simple_' + product.sku,
        basisHash: null,
        definition: { ...product, enabled: true, lotTrackingRequired: false },
      },
      'fixture_operator',
    );
    const adjustment = {
      id: 'native_balance_' + product.sku,
      sku: product.sku,
      delta: 999,
      expectedAvailable: 0,
      reason: 'Owner configured temporary balance; not a physical count',
    };
    await simpleOps.adjustStock(simpleStore, 'sandbox', adjustment, 'fixture_operator');
    assert.equal(
      (await simpleOps.adjustStock(simpleStore, 'sandbox', adjustment, 'fixture_operator'))
        .replayed,
      true,
    );
  }
  const simpleOrder = (
    await simpleService.createOrder(simpleStore, 'sandbox', cart('couple', 2), key(9901))
  ).order;
  assert.equal(
    (await simpleService.catalog(simpleStore, 'sandbox')).find((p) => p.sku === 'couple').available,
    997,
  );
  await simpleService.checkout(simpleStore, 'sandbox', simpleOrder.id, fakeCheckout);
  const simpleEvent = payment(
    await simpleService.getOrder(simpleStore, 'sandbox', simpleOrder.id),
    simpleStore,
    'evt_simple_native',
  );
  await simpleService.acceptPayment(simpleStore, 'sandbox', simpleEvent);
  await simpleService.acceptPayment(simpleStore, 'sandbox', simpleEvent);
  await simpleService.markPacked(simpleStore, 'sandbox', simpleOrder.id, 'fixture_operator');
  await simpleService.createOrder(simpleStore, 'sandbox', cart('family', 3), key(9902));
  simpleTime += 3600000;
  assert.equal(await simpleService.expire(simpleStore, 'sandbox'), 1);
  assert.equal(await simpleService.expire(simpleStore, 'sandbox'), 0);
  assert.equal(
    (await simpleService.catalog(simpleStore, 'sandbox')).find((p) => p.sku === 'couple').available,
    997,
  );
  assert.equal(
    (await simpleService.catalog(simpleStore, 'sandbox')).find((p) => p.sku === 'family').available,
    999,
  );
  assert.equal(
    (await simpleService.one('SELECT COUNT(*) n FROM finished_lots WHERE store_id=?', simpleStore))
      .n,
    0,
  );
  assert.equal(
    (
      await simpleService.one(
        'SELECT COUNT(*) n FROM finished_allocations WHERE store_id=?',
        simpleStore,
      )
    ).n,
    0,
  );
  assert.ok(
    (await simpleOps.overview(simpleStore, 'sandbox')).catalog.every(
      (p) => p.stockMode === 'simple',
    ),
  );
  await mf.dispose();
  mf = undefined;
  const accessKeys = await generateKeyPair('RS256', { extractable: true }),
    accessPublic = { ...(await exportJWK(accessKeys.publicKey)), kid: 'native_fixture' };
  const accessStoreId = 'store_access',
    adminHost = 'admin-access.example',
    publicHost = 'store-access.example',
    alternateHost = 'alternate-access.example';
  const accessIssuer = 'https://native-fixture.cloudflareaccess.com',
    accessAudience = 'fixture_native_application_audience_123',
    accessSubject = 'native-access-owner';
  const accessStore = {
    ...fixtureStore(accessStoreId),
    environment: 'production',
    testOnly: false,
    requireCustomer: true,
    hosts: [adminHost, publicHost, alternateHost],
    productionAdmission: { approved: true },
    operationalAdmission: { approved: false },
    documentPolicy: { approved: false },
    markets: [
      {
        country: 'LT',
        currency: 'EUR',
        policyVersion: 'fixture',
        checkoutEnabled: false,
        delivery: [{ id: 'inactive', amount: 0, label: 'Inactive', enabled: false }],
      },
    ],
  };
  const accessConfig = {
    [accessStoreId]: {
      issuer: accessIssuer,
      audience: accessAudience,
      adminHosts: [adminHost],
      memberships: [
        {
          id: 'native_access_owner',
          issuer: accessIssuer,
          subject: accessSubject,
          storeId: accessStoreId,
          legalEntityId: accessStore.legalEntityId,
          environment: 'production',
          permissions: ['read'],
          revoked: false,
        },
      ],
    },
  };
  db = await start('test/access-worker-harness.mjs', {
    COMMERCE_ENV: 'production',
    COMMERCE_RUNTIME_ADMISSION: 'approved',
    TEST_HARNESS: 'access-fixture-only',
    TEST_ACCESS_CONFIG: JSON.stringify(accessConfig),
    TEST_ACCESS_JWKS: JSON.stringify({ keys: [accessPublic] }),
  });
  const accessService = new CommerceService(db);
  await accessService
    .stmt(
      'INSERT INTO stores(id,environment,config_json) VALUES(?,?,?)',
      accessStoreId,
      'production',
      JSON.stringify(accessStore),
    )
    .run();
  const accessIssuedSec = Math.floor(Date.now() / 1000),
    accessJwt = await new SignJWT({
      iss: accessIssuer,
      aud: [accessAudience],
      sub: accessSubject,
      email: 'owner@example.test',
      type: 'app',
      iat: accessIssuedSec,
      exp: accessIssuedSec + 3600,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'native_fixture' })
      .sign(accessKeys.privateKey);
  const accessHeaders = { 'cf-access-jwt-assertion': accessJwt };
  assert.equal((await dispatch(adminHost, '/admin')).status, 403);
  assert.equal((await dispatch(adminHost, '/admin', 'GET', undefined, accessHeaders)).status, 200);
  const nativeSession = await dispatch(
    adminHost,
    '/api/operator/session',
    'GET',
    undefined,
    accessHeaders,
  );
  assert.equal(nativeSession.status, 200);
  assert.equal((await nativeSession.json()).method, 'access');
  assert.equal(
    (await dispatch(alternateHost, '/api/operator/session', 'GET', undefined, accessHeaders))
      .status,
    403,
  );
  assert.equal(
    (
      await dispatch(adminHost, '/api/operator/session', 'GET', undefined, {
        'cf-access-jwt-assertion': 'forged-fixture',
      })
    ).status,
    403,
  );
  assert.equal((await dispatch(publicHost, '/api/catalog')).status, 200);
  assert.equal((await dispatch(publicHost, '/api/stripe/webhook', 'POST', {})).status, 503);
  assert.equal(
    (await dispatch(adminHost, '/api/operator/logout', 'POST', {}, accessHeaders)).status,
    403,
  );
  assert.equal(
    (
      await dispatch(
        adminHost,
        '/api/operator/logout',
        'POST',
        {},
        { ...accessHeaders, origin: 'https://' + adminHost },
      )
    ).status,
    200,
  );
  assert.equal(
    (await dispatch(adminHost, '/api/operator/session', 'GET', undefined, accessHeaders)).status,
    403,
  );
  assert.equal(
    (
      await accessService.one(
        'SELECT COUNT(*) n FROM operator_access_revocations WHERE store_id=?',
        accessStoreId,
      )
    ).n,
    1,
  );
  await mf.dispose();
  mf = undefined;
  await start('src/worker.mjs', { COMMERCE_ENV: 'production' });
  assert.equal((await dispatch('store-a.example', '/api/catalog')).status, 503);
  console.log(
    'PASS workerd/native D1: ordered migrations, multi-SKU rollback, concurrent HTTP stock, store/token isolation, replay, restart persistence, signed Stripe async/refund/replay, operator gate, stock adjustments, concurrent immutable numbered sale/credit documents, shared-component assembly race, immutable financial imports/reconciliation, wholesale pricing and concurrent acceptance, durable concurrent refund budgets/execution, fixture shipment, journal, outbox, expiry/late payment. No remote API calls.',
  );
} finally {
  if (mf) await mf.dispose();
  // Only the mkdtemp directory created by this test may be removed.
  assert.ok(directory.startsWith(join(tmpdir(), 'commerce-workerd-')));
  rmSync(directory, { recursive: true });
}
