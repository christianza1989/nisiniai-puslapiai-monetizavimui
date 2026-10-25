import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { PublicAbuseGuard } from '../src/public-guard.mjs';
import { fixtureStore, fixtureProducts } from './fixtures.mjs';
test('public request limits are persistent, store/IP/action scoped, private-hashed and atomic under concurrency', async () => {
  const db = new NodeDatabase();
  db.migrate();
  let now = Date.now();
  const s = new CommerceService(db, { now: () => now }),
    store = fixtureStore();
  await s.provisionStore(store, fixtureProducts());
  const req = new Request('https://store-a.example/api/orders', {
      headers: { 'cf-connecting-ip': '192.0.2.1' },
    }),
    salt = 'fixture_salt_only_12345678901234567890';
  const guard = new PublicAbuseGuard(s, salt);
  const results = await Promise.allSettled(
    Array.from({ length: 12 }, () => guard.allow(req, store, 'order')),
  );
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 10);
  assert.equal((await s.one('SELECT count FROM public_request_limits')).count, 10);
  await new PublicAbuseGuard(s, salt).allow(req, store, 'quote');
  await assert.rejects(
    new PublicAbuseGuard(s, salt).allow(req, store, 'order'),
    /public_rate_limit/,
  );
  assert.doesNotMatch(
    JSON.stringify(await s.rows('SELECT * FROM public_request_limits')),
    /192\.0\.2/,
  );
  now += 600001;
  await guard.allow(req, store, 'order');
  db.close();
});
