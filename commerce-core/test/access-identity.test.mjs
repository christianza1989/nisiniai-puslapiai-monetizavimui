import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } from 'jose';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { CatalogOperations } from '../src/catalog.mjs';
import { digest, validateStore } from '../src/validation.mjs';
import { AccessOperatorSessions, composeOperatorAuthorize } from '../src/access-identity.mjs';
import { runtimeOptions, runtimeHandler } from '../src/runtime.mjs';
import { fixtureStore } from './fixtures.mjs';
import { productionMigrationSources } from '../src/node-production-d1.mjs';
import { applyMigrations } from '../src/migrations.mjs';
const keys = await generateKeyPair('RS256', { extractable: true }),
  other = await generateKeyPair('RS256', { extractable: true });
const publicJwk = {
    ...(await exportJWK(keys.publicKey)),
    kid: 'fixture-key',
    alg: 'RS256',
    use: 'sig',
  },
  secondJwk = {
    ...(await exportJWK(other.publicKey)),
    kid: 'rotated-key',
    alg: 'RS256',
    use: 'sig',
  };
const issuer = 'https://fixture-team.cloudflareaccess.com',
  audience = 'fixture_app_audience_1234567890',
  subject = 'fixture-verified-owner',
  host = 'admin.store-a.example';
const at = Math.floor(Date.now() / 1000) * 1000,
  bearerToken = 'fixture_bearer_owner_12345678901234567890';
const config = () => ({
  ...fixtureStore(),
  environment: 'production',
  testOnly: false,
  requireCustomer: true,
  hosts: ['store-a.example', host, 'alternate.example'],
  productionAdmission: { approved: true },
  operationalAdmission: { approved: false },
  documentPolicy: { approved: false },
  markets: [
    {
      country: 'LT',
      currency: 'EUR',
      checkoutEnabled: false,
      policyVersion: 'fixture',
      delivery: [{ id: 'disabled', amount: 0, label: 'Disabled', enabled: false }],
    },
  ],
});
const member = () => ({
  id: 'fixture_owner',
  issuer,
  subject,
  storeId: 'store_a',
  legalEntityId: 'store_a_entity',
  environment: 'production',
  permissions: ['read', 'stock', 'catalog'],
  revoked: false,
});
const access = () => ({
  issuer,
  audience,
  adminHosts: [host],
  memberships: [member()],
  allowBearerBootstrap: false,
});
async function sign(changes = {}, key = keys.privateKey, header = {}) {
  return new SignJWT({
    iss: issuer,
    aud: [audience],
    sub: subject,
    email: 'owner@example.test',
    type: 'app',
    iat: at / 1000,
    exp: at / 1000 + 3600,
    ...changes,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'fixture-key', ...header })
    .sign(key);
}
function request(
  path,
  token,
  {
    method = 'GET',
    origin,
    hostname = host,
    bearer,
    headers = {},
    protocol = 'https:',
    body = '{}',
  } = {},
) {
  return new Request(protocol + '//' + hostname + path, {
    method,
    headers: {
      ...(token !== null ? { 'cf-access-jwt-assertion': token } : {}),
      ...(origin ? { origin } : {}),
      ...(bearer ? { authorization: 'Bearer ' + bearer } : {}),
      ...headers,
    },
    ...(method !== 'GET' && method !== 'HEAD' ? { body } : {}),
  });
}
async function setup(
  t,
  {
    settings = access(),
    raw,
    keyResolverFactory = () => createLocalJWKSet({ keys: [publicJwk] }),
  } = {},
) {
  const db = new NodeDatabase();
  db.migrate();
  t.after(() => db.close());
  const service = new CommerceService(db),
    store = validateStore(config());
  await service
    .stmt(
      'INSERT INTO stores(id,environment,config_json) VALUES(?,?,?)',
      store.id,
      store.environment,
      JSON.stringify(store),
    )
    .run();
  const grant = {
    id: 'fixture_bootstrap',
    storeId: store.id,
    legalEntityId: store.legalEntityId,
    environment: 'production',
    tokenHash: await digest(bearerToken),
    issuedAt: at,
    expiresAt: at + 3600000,
    permissions: ['read'],
    revoked: false,
  };
  const base = runtimeOptions({
    COMMERCE_ENV: 'production',
    COMMERCE_RUNTIME_ADMISSION: 'approved',
    COMMERCE_DB: db,
    COMMERCE_CORE_GRANTS: JSON.stringify([grant]),
  });
  const sessions = new AccessOperatorSessions({
    configuration: raw !== undefined ? raw : JSON.stringify({ [store.id]: settings }),
    db,
    now: () => at,
    keyResolverFactory,
  });
  const options = {
    ...base,
    operatorSessions: sessions,
    operatorAuthorize: composeOperatorAuthorize(base.operatorAuthorize, sessions),
  };
  const handler = runtimeHandler(service, options, {
    fetch: async () => new Response('private admin fixture'),
  });
  return { db, service, store, sessions, handler, base };
}
test('verified Access user maps only to exact core membership and resumes private admin without returning credentials', async (t) => {
  const f = await setup(t),
    token = await sign();
  const principal = await f.sessions.authorize(
    request('/api/operator/session', token),
    f.store,
    'read',
  );
  assert.equal(principal.id, 'fixture_owner');
  assert.equal(principal.authentication, 'access');
  assert.equal(principal.expiresAt, at + 3600000);
  assert.equal(await f.sessions.authorize(request('/', token), f.store, 'finance'), false);
  const session = await f.handler(request('/api/operator/session', token));
  assert.equal(session.status, 200);
  const json = await session.json();
  assert.equal(json.method, 'access');
  assert.ok(!JSON.stringify(json).includes(token));
  assert.equal(json.email, undefined);
  assert.equal((await f.handler(request('/admin', token))).status, 200);
  assert.equal((await f.handler(request('/admin.mjs', token))).status, 200);
  assert.equal(
    (
      await f.handler(
        request('/admin', null, {
          headers: { 'cf-access-authenticated-user-email': 'owner@example.test' },
        }),
      )
    ).status,
    403,
  );
  const context = await (
    await f.handler(request('/api/storefront-context', null, { hostname: 'store-a.example' }))
  ).json();
  assert.equal(context.productionReady, false);
  assert.equal(context.publishOffers, false);
});
test('forged, wrong issuer/audience, expired/future/overlong and service/global JWTs never authorize', async (t) => {
  const f = await setup(t);
  const invalid = [
    await sign({}, other.privateKey),
    await sign({ iss: 'https://foreign.cloudflareaccess.com' }),
    await sign({ aud: ['foreign_app_audience_1234567890'] }),
    await sign({ iat: at / 1000 - 60, exp: at / 1000 - 1 }),
    await sign({ iat: at / 1000 + 1 }),
    await sign({ exp: at / 1000 + 8 * 3600 + 1 }),
    await sign({ nbf: at / 1000 + 60 }),
    await sign({ sub: 'foreign-subject', email: 'owner@example.test' }),
    await sign({ sub: '', common_name: 'fixture-service.access', email: undefined }),
    await sign({ type: 'org' }),
    await sign({ email: undefined }),
    await sign({}, keys.privateKey, { kid: 'unknown-key' }),
    'not.a.valid-token',
  ];
  const hs = await new SignJWT({
    iss: issuer,
    aud: [audience],
    sub: subject,
    iat: at / 1000,
    exp: at / 1000 + 60,
    type: 'app',
    email: 'owner@example.test',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(new TextEncoder().encode('fixture-signing-secret-never-production'));
  invalid.push(hs);
  for (const token of invalid)
    assert.equal(
      await f.sessions.authorize(request('/api/operator/session', token), f.store, 'read'),
      false,
    );
  assert.equal((await f.service.one('SELECT COUNT(*) n FROM operator_access_revocations')).n, 0);
  assert.ok(
    await f.sessions.authorize(
      request('/', await sign({ exp: at / 1000 + 8 * 3600 })),
      f.store,
      'read',
    ),
  );
});
test('revoked, ambiguous and cross-store/legal/environment memberships cannot choose a principal', async (t) => {
  const token = await sign();
  for (const memberships of [
    [{ ...member(), revoked: true }],
    [member(), { ...member(), id: 'ambiguous' }],
    [{ ...member(), legalEntityId: 'different_entity' }],
    [{ ...member(), environment: 'sandbox' }],
    [{ ...member(), storeId: 'different_store' }],
  ]) {
    const f = await setup(t, { settings: { ...access(), memberships } });
    assert.equal(await f.sessions.authorize(request('/', token), f.store, 'read'), false);
  }
  const f = await setup(t);
  assert.equal(
    await f.sessions.authorize(request('/', token), { ...f.store, id: 'different_store' }, 'read'),
    false,
  );
});
test('Access mutations require exact same origin; alternate worker hostname cannot bypass admin verification', async (t) => {
  const f = await setup(t),
    token = await sign();
  for (const url of ['/admin', '/api/operator/session'])
    assert.equal(
      (await f.handler(request(url, token, { hostname: 'alternate.example' }))).status,
      403,
    );
  assert.equal(
    await f.sessions.authorize(request('/', token, { protocol: 'http:' }), f.store, 'read'),
    false,
  );
  await new CatalogOperations(f.service).revise(
    f.store.id,
    'production',
    {
      id: 'fixture_catalog',
      basisHash: null,
      definition: {
        sku: 'couple',
        title: 'Fixture product',
        enabled: true,
        lotTrackingRequired: false,
        prices: { LT: 3200 },
        package: { weightGrams: 2200, dimensionsMm: [200, 200, 170] },
      },
    },
    'fixture_owner',
  );
  const body = JSON.stringify({
    id: 'fixture_stock',
    sku: 'couple',
    delta: 5,
    expectedAvailable: 0,
    reason: 'Isolated configured count fixture',
  });
  for (const origin of [undefined, 'https://evil.example'])
    assert.equal(
      (
        await f.handler(
          request('/api/operator/stock-adjustments', token, { method: 'POST', origin, body }),
        )
      ).status,
      403,
    );
  assert.equal((await f.service.one('SELECT available FROM inventory')).available, 0);
  assert.equal(
    (
      await f.handler(
        request('/api/operator/stock-adjustments', token, {
          method: 'POST',
          origin: 'https://' + host,
          body,
        }),
      )
    ).status,
    200,
  );
  assert.equal((await f.service.one('SELECT available FROM inventory')).available, 5);
});
test('logout is same-origin, stores only a hash, immediately revokes that JWT and replays without duplicate records', async (t) => {
  const f = await setup(t),
    token = await sign();
  assert.equal(
    (await f.handler(request('/api/operator/logout', token, { method: 'POST' }))).status,
    403,
  );
  for (let n = 0; n < 2; n++) {
    const result = await f.handler(
      request('/api/operator/logout', token, { method: 'POST', origin: 'https://' + host }),
    );
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), {
      loggedOut: true,
      logoutUrl: 'https://' + host + '/cdn-cgi/access/logout',
    });
  }
  assert.equal((await f.handler(request('/api/operator/session', token))).status, 403);
  const rows = await f.service.rows('SELECT * FROM operator_access_revocations');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].token_hash, await digest(token));
  assert.ok(!JSON.stringify(rows).includes(token));
  const fresh = await sign({ identity_nonce: 'fixture-new-signed-session' });
  assert.equal((await f.handler(request('/api/operator/session', fresh))).status, 200);
});
test('Bearer remains compatible only when unconfigured or explicitly admitted; invalid JWT never falls back', async (t) => {
  const f = await setup(t, { settings: { ...access(), allowBearerBootstrap: true } });
  assert.equal(
    (await f.handler(request('/api/operator/session', null, { bearer: bearerToken }))).status,
    200,
  );
  assert.equal(
    (await f.handler(request('/api/operator/session', 'invalid-token', { bearer: bearerToken })))
      .status,
    403,
  );
  const strict = await setup(t);
  assert.equal(
    (await strict.handler(request('/api/operator/session', null, { bearer: bearerToken }))).status,
    403,
  );
  const legacy = runtimeHandler(f.service, f.base, {
    fetch: async () => new Response('legacy login fixture'),
  });
  assert.equal((await legacy(request('/admin', null))).status, 200);
  assert.equal(
    (await legacy(request('/api/operator/session', null, { bearer: bearerToken }))).status,
    200,
  );
});
test('bad Access configuration fails admin closed without blocking buyer catalog/context or the independent Stripe route', async (t) => {
  for (const raw of [
    '{invalid',
    '[]',
    JSON.stringify({ store_a: { ...access(), issuer: 'https://evil.example' } }),
    JSON.stringify({ store_a: { ...access(), memberships: [{ ...member(), disabled: true }] } }),
  ]) {
    let keysRequested = 0;
    const f = await setup(t, {
      raw,
      keyResolverFactory: () => {
        keysRequested++;
        throw Error('must not fetch');
      },
    });
    assert.equal((await f.handler(request('/admin', null, { bearer: bearerToken }))).status, 403);
    assert.equal(
      (await f.handler(request('/api/catalog', null, { hostname: 'store-a.example' }))).status,
      200,
    );
    assert.equal(
      (await f.handler(request('/api/storefront-context', null, { hostname: 'store-a.example' })))
        .status,
      200,
    );
    assert.equal(
      (
        await f.handler(
          request('/api/stripe/webhook', null, { hostname: 'store-a.example', method: 'POST' }),
        )
      ).status,
      503,
    );
    assert.equal(keysRequested, 0);
  }
});
test('trusted key rotation works; token-supplied JWKS locations are ignored and resolver failures close authorization', async (t) => {
  const issuers = [];
  const f = await setup(t, {
    keyResolverFactory: (value) => {
      issuers.push(value);
      return createLocalJWKSet({ keys: [publicJwk, secondJwk] });
    },
  });
  assert.ok(
    await f.sessions.authorize(
      request(
        '/',
        await sign({}, other.privateKey, { kid: 'rotated-key', jku: 'https://evil.example/jwks' }),
      ),
      f.store,
      'read',
    ),
  );
  assert.deepEqual(issuers, [issuer]);
  const closed = await setup(t, {
    keyResolverFactory: () => {
      throw Error('fixture JWKS unavailable');
    },
  });
  assert.equal(
    await closed.sessions.authorize(request('/', await sign()), closed.store, 'read'),
    false,
  );
});
test('legacy Bearer works before the new migration; configured Access without its revocation table fails closed only for admin', async (t) => {
  const db = new NodeDatabase();
  t.after(() => db.close());
  await applyMigrations(db, (await productionMigrationSources()).slice(0, 23));
  const service = new CommerceService(db),
    store = validateStore(config());
  await service
    .stmt(
      'INSERT INTO stores(id,environment,config_json) VALUES(?,?,?)',
      store.id,
      store.environment,
      JSON.stringify(store),
    )
    .run();
  const grant = {
    id: 'fixture_bootstrap',
    storeId: store.id,
    legalEntityId: store.legalEntityId,
    environment: 'production',
    issuedAt: at,
    expiresAt: at + 3600000,
    tokenHash: await digest(bearerToken),
    permissions: ['read'],
  };
  const options = runtimeOptions({
    COMMERCE_ENV: 'production',
    COMMERCE_RUNTIME_ADMISSION: 'approved',
    COMMERCE_DB: db,
    COMMERCE_CORE_GRANTS: JSON.stringify([grant]),
  });
  const legacy = runtimeHandler(service, options, { fetch: async () => new Response('legacy') });
  assert.equal(
    (await legacy(request('/api/operator/session', null, { bearer: bearerToken }))).status,
    200,
  );
  const sessions = new AccessOperatorSessions({
    configuration: JSON.stringify({ [store.id]: access() }),
    db,
    now: () => at,
    keyResolverFactory: () => createLocalJWKSet({ keys: [publicJwk] }),
  });
  const handler = runtimeHandler(
    service,
    {
      ...options,
      operatorSessions: sessions,
      operatorAuthorize: composeOperatorAuthorize(options.operatorAuthorize, sessions),
    },
    { fetch: async () => new Response('private') },
  );
  assert.equal((await handler(request('/api/operator/session', await sign()))).status, 403);
  assert.equal(
    (await handler(request('/api/catalog', null, { hostname: 'store-a.example' }))).status,
    200,
  );
  assert.equal(
    await service.one("SELECT name FROM sqlite_master WHERE name='operator_access_revocations'"),
    null,
  );
});
