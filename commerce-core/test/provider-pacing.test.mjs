import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { ProviderPacing } from '../src/provider-pacing.mjs';
import { SendparcelAdapter } from '../src/sendparcel-adapter.mjs';
import { digest } from '../src/validation.mjs';

test('shared durable per-key pacing separates starts, retains only hashes and applies across adapters while quotes remain exempt', async () => {
  const db = new NodeDatabase();
  db.migrate();
  const starts = [];
  const make = (accountRef) =>
    new SendparcelAdapter({
      environment: 'sandbox',
      accountRef,
      apiPassword: 'fixture_shared_key',
      rateLimiter: new ProviderPacing(db),
      fetchImpl: async (url) => {
        starts.push({ path: new URL(url).pathname, at: Date.now() });
        return Response.json({});
      },
    });
  const a = make('store_one'),
    b = make('store_two');
  await Promise.all([
    a.request('/rest-api/services'),
    b.request('/rest-api/services'),
    a.request('/rest-api/quotes', {}),
  ]);
  const limited = starts.filter((s) => s.path.endsWith('/services'));
  assert.equal(limited.length, 2);
  assert.ok(limited[1].at - limited[0].at >= 1000);
  assert.equal(starts.filter((s) => s.path.endsWith('/quotes')).length, 1);
  const rows = (await db.prepare('SELECT * FROM provider_request_pacing').all()).results;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].scope_hash.length, 64);
  assert.equal(rows[0].lease_token, null);
  assert.ok(!JSON.stringify(rows).includes('fixture_shared_key'));
  db.close();
});

test('rate limit response is sanitized and never retries a non-idempotent operation; exhausted or crashed lease blocks before transmission', async () => {
  const db = new NodeDatabase();
  db.migrate();
  const scope = await digest('fixture-scope');
  const gate = new ProviderPacing(db, { maxWaitMs: 0 });
  let calls = 0;
  const adapter = new SendparcelAdapter({
    environment: 'sandbox',
    accountRef: 'fixture',
    apiPassword: 'fixture_key',
    rateLimiter: gate,
    fetchImpl: async () => {
      calls++;
      return new Response('private provider body', { status: 429 });
    },
  });
  adapter.allowedPaths = () => ({ '/rest-api/orders/creates': 'POST' });
  await assert.rejects(adapter.request('/rest-api/orders/creates', {}), /carrier_rate_limited/);
  assert.equal(calls, 1);
  await assert.rejects(adapter.request('/rest-api/orders/creates', {}), /carrier_pacing_busy/);
  assert.equal(calls, 1);
  await db
    .prepare('INSERT INTO provider_request_pacing VALUES(?,0,?,?)')
    .bind(scope, 'crashed', Date.now() + 90000)
    .run();
  await assert.rejects(
    gate.run(scope, () => {
      throw new Error('must not transmit');
    }),
    /carrier_pacing_busy/,
  );
  db.close();
});

test('v1 API requires an API password and rejects a JWT-only connection', () => {
  assert.throws(
    () =>
      new SendparcelAdapter({
        environment: 'sandbox',
        accountRef: 'fixture',
        accessToken: 'fixture.jwt.signature',
        rateLimiter: { run: (_s, f) => f() },
      }),
    /carrier_credentials_missing/,
  );
});
