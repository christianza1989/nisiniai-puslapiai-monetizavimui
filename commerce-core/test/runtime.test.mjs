import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { coreOperatorAuthorize } from '../src/identity.mjs';
import { PrivateFiles, hashBytes } from '../src/private-storage.mjs';
import { createHandler } from '../src/http.mjs';
import { runtimeOptions, runtimeHandler } from '../src/runtime.mjs';
import { fixtureStore, fixtureProducts, cart, key } from './fixtures.mjs';
import { digest } from '../src/validation.mjs';
import { StripeCheckoutAdapter } from '../src/stripe-adapter.mjs';
const store = 'store_a',
  environment = 'sandbox',
  token = 'fixture_core_token_12345678901234567890';
async function setup() {
  const db = new NodeDatabase();
  db.migrate();
  const s = new CommerceService(db);
  await s.provisionStore(fixtureStore(), fixtureProducts());
  const { order } = await s.createOrder(store, environment, cart(), key(1));
  return { db, s, order };
}
function storage() {
  const blobs = new Map();
  return {
    blobs,
    put: async (k, b, h) => {
      if (blobs.has(k)) assert.equal(await hashBytes(blobs.get(k)), h);
      else blobs.set(k, new Uint8Array(b));
    },
    get: async (k) => {
      assert.ok(blobs.has(k));
      return new Uint8Array(blobs.get(k));
    },
  };
}
test('shared core credential admission binds entity/environment/store/grant/time and rejects ambiguous grants', async () => {
  const at = Date.now(),
    config = fixtureStore();
  const grant = {
    id: 'operator',
    storeId: store,
    legalEntityId: config.legalEntityId,
    environment,
    tokenHash: await digest(token),
    issuedAt: at - 1000,
    expiresAt: at + 3600000,
    permissions: ['read', 'document'],
  };
  let records = [grant];
  const authorize = coreOperatorAuthorize(
    async () => records,
    () => at,
  );
  const request = new Request('https://store-a.example/api/operator/overview', {
    headers: { authorization: 'Bearer ' + token },
  });
  assert.equal((await authorize(request, config, 'read')).id, 'operator');
  assert.equal(await authorize(request, config, 'refund'), false);
  assert.equal(await authorize(request, { ...config, environment: 'production' }, 'read'), false);
  assert.equal(await authorize(request, { ...config, legalEntityId: 'another' }, 'read'), false);
  for (const change of [
    { revoked: true },
    { expiresAt: at },
    { issuedAt: at + 1 },
    { expiresAt: at + 9 * 3600000 },
  ]) {
    records = [{ ...grant, ...change }];
    assert.equal(await authorize(request, config, 'read'), false);
  }
  records = [grant, { ...grant, id: 'other' }];
  assert.equal(await authorize(request, config, 'read'), false);
});
test('private PDF metadata and bytes are immutable, order/store scoped and hash verified', async () => {
  const { db, s, order } = await setup(),
    vault = storage(),
    files = new PrivateFiles(s, vault),
    bytes = new TextEncoder().encode('%PDF-1.7\nfixture');
  const input = { id: 'file_1', bytes, filename: 'fixture.pdf' };
  const result = await files.put(store, environment, order.id, input, 'operator');
  assert.equal(result.replayed, false);
  assert.equal((await files.put(store, environment, order.id, input, 'operator')).replayed, true);
  assert.equal(vault.blobs.size, 1);
  assert.deepEqual((await files.get(store, environment, 'file_1')).bytes, bytes);
  await assert.rejects(
    files.put(store, environment, order.id, { ...input, filename: 'changed.pdf' }, 'operator'),
    /private_file_conflict/,
  );
  await assert.rejects(
    files.put(
      store,
      environment,
      order.id,
      { ...input, id: 'file_2', bytes: new TextEncoder().encode('<html>') },
      'operator',
    ),
    /invalid_private_file/,
  );
  await assert.rejects(
    s.stmt('UPDATE private_files SET filename=?', 'changed.pdf').run(),
    /private_file_immutable/,
  );
  vault.blobs.set(result.file.storage_key, new TextEncoder().encode('%PDF-1.7\nchanged'));
  await assert.rejects(files.get(store, environment, 'file_1'), /private_file_integrity_failed/);
  await s.provisionStore(fixtureStore('store_b'), fixtureProducts());
  await assert.rejects(files.get('store_b', environment, 'file_1'), /private_file_missing/);
  db.close();
});
test('runtime resolves host before static assets and rejects unadmitted production/configuration', async () => {
  assert.throws(() => runtimeOptions({ COMMERCE_ENV: 'production' }), /runtime_not_admitted/);
  assert.throws(
    () => runtimeOptions({ COMMERCE_ENV: 'sandbox', COMMERCE_CONNECTIONS: 'wrong' }),
    /runtime_configuration_invalid/,
  );
  const { db, s } = await setup();
  let calls = 0;
  const handler = runtimeHandler(
    s,
    { environment },
    {
      fetch: async () => {
        calls++;
        return new Response('<html>fixture</html>', { headers: { 'content-type': 'text/html' } });
      },
    },
  );
  assert.equal((await handler(new Request('https://unknown.example/admin'))).status, 404);
  assert.equal(calls, 0);
  const response = await handler(new Request('https://store-a.example/admin'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(calls, 1);
  db.close();
});
test('context publishes no offers in tests; private file upload/download needs a scoped principal and same origin', async () => {
  const { db, s, order } = await setup(),
    vault = storage();
  let permissions = ['read'];
  const handler = createHandler({
    service: s,
    environment,
    privateStorage: vault,
    operatorAuthorize: async () => ({ id: 'operator', storeId: store, permissions }),
  });
  const context = await (
    await handler(new Request('https://store-a.example/api/storefront-context'))
  ).json();
  assert.equal(context.publishOffers, false);
  assert.equal(context.canCreateTestOrder, true);
  const put = (origin = 'https://store-a.example') =>
    handler(
      new Request('https://store-a.example/api/operator/orders/' + order.id + '/files/file_1', {
        method: 'POST',
        headers: { origin, 'content-type': 'application/pdf', 'x-file-name': 'fixture.pdf' },
        body: '%PDF-1.7\nfixture',
      }),
    );
  assert.equal((await put()).status, 403);
  permissions = ['read', 'document'];
  assert.equal((await put('https://attacker.example')).status, 403);
  assert.equal((await put()).status, 200);
  const file = await handler(new Request('https://store-a.example/api/operator/files/file_1'));
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('content-disposition'), 'attachment; filename="fixture.pdf"');
  assert.equal(await file.text(), '%PDF-1.7\nfixture');
  permissions = [];
  assert.equal(
    (await handler(new Request('https://store-a.example/api/operator/files/file_1'))).status,
    403,
  );
  db.close();
});

test('context distinguishes verified merchant TEST from fixtures and wrong-account credentials without enabling production or shipping', async () => {
  const { db, s } = await setup();
  // This isolated fixture has a synthetic account ID; inject account evidence.
  const config = await s.store(store, environment);
  const payment = new StripeCheckoutAdapter({
    environment,
    accountRef: 'acct_fixture',
    apiKey: 'rk_test_fixturekey12345678',
    webhookSecret: 'whsec_fixture',
    client: { accounts: { retrieveCurrent: async () => ({ id: 'acct_fixture' }) } },
  });
  payment.accountRef = config.paymentAccountRef;
  payment.verifyAccount = async () => ({
    ready: true,
    id: config.paymentAccountRef,
    verified: true,
  });
  const context = async () =>
    (
      await createHandler({ service: s, environment, paymentAdapters: { [store]: payment } })(
        new Request('https://store-a.example/api/storefront-context'),
      )
    ).json();
  const verified = await context();
  assert.equal(verified.paymentProvider, 'stripe');
  assert.equal(verified.paymentEnvironment, 'test');
  assert.equal(verified.paymentAccountVerified, true);
  for (const field of [
    'shippingConnected',
    'shippingQuotesConnected',
    'productionReady',
    'publishOffers',
  ])
    assert.equal(verified[field], false);
  payment.verifyAccount = async () => {
    throw new Error('wrong actual account');
  };
  const blocked = await context();
  assert.equal(blocked.paymentConnected, false);
  assert.equal(blocked.paymentAccountVerified, false);
  assert.equal(blocked.paymentEnvironment, null);
  db.close();
});
