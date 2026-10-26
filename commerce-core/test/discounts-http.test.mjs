import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { createHandler } from '../src/http.mjs';
import { fixtureStore, fixtureProducts } from './fixtures.mjs';
test('discount operator CRUD needs catalogue permission; public preview has no provider dependency and shares abuse protection', async (t) => {
  const db = new NodeDatabase();
  db.migrate();
  t.after(() => db.close());
  const service = new CommerceService(db);
  await service.provisionStore(fixtureStore(), fixtureProducts());
  const scopes = [];
  const handler = createHandler({
    service,
    environment: 'sandbox',
    paymentAdapters: {
      store_a: {
        isReady() {
          throw Error('No provider read during preview');
        },
      },
    },
    publicAbuseGuard: async (_r, _s, scope) => scopes.push(scope),
    operatorAuthorize: async (r) =>
      r.headers.get('authorization') === 'Bearer local-owner'
        ? { id: 'owner', storeId: 'store_a', permissions: ['catalog', 'read'] }
        : r.headers.get('authorization') === 'Bearer local-reader'
          ? { id: 'reader', storeId: 'store_a', permissions: ['read'] }
          : null,
  });
  const request = (
    path,
    {
      body,
      token,
      origin = 'https://store-a.example',
      method = body === undefined ? 'GET' : 'POST',
    } = {},
  ) =>
    new Request('https://store-a.example' + path, {
      method,
      headers: {
        origin,
        ...(token ? { authorization: 'Bearer ' + token } : {}),
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  const input = {
    id: crypto.randomUUID(),
    commandId: crypto.randomUUID(),
    expectedVersion: 0,
    code: 'VIENAS10',
    kind: 'percent',
    value: 10,
    enabled: true,
    freeShipping: true,
  };
  assert.equal((await handler(request('/api/operator/discounts'))).status, 403);
  assert.equal(
    (await handler(request('/api/operator/discounts', { body: input, token: 'local-reader' })))
      .status,
    403,
  );
  const created = await handler(
    request('/api/operator/discounts', { body: input, token: 'local-owner' }),
  );
  assert.equal(created.status, 200);
  const saved = (await created.json()).discount;
  assert.equal(saved.version, 1);
  assert.equal(saved.freeShipping, true);
  const listing = await (
    await handler(request('/api/operator/discounts', { token: 'local-owner' }))
  ).json();
  assert.equal(listing.length, 1);
  assert.equal(listing[0].code, 'VIENAS10');
  assert.equal(listing[0].freeShipping, true);
  const preview = {
    lines: [{ sku: 'couple', quantity: 1 }],
    country: 'LT',
    currency: 'EUR',
    code: 'vienas10',
  };
  const r = await handler(request('/api/discount-preview', { body: preview }));
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  const checked = await r.json();
  assert.equal(checked.amount, 2880);
  assert.equal(checked.discount.freeShipping, true);
  assert.deepEqual(scopes, ['quote']);
  assert.equal(
    (
      await handler(
        request('/api/discount-preview', { body: preview, origin: 'https://outside.example' }),
      )
    ).status,
    403,
  );
  assert.equal((await handler(request('/api/discount-preview'))).status, 404);
  assert.equal(
    (await handler(request('/api/discount-preview', { body: { ...preview, code: 'MISSING' } })))
      .status,
    409,
  );
});
