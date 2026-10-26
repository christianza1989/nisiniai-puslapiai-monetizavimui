import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { CommerceService } from '../src/service.mjs';
import { CommerceAnalytics } from '../src/analytics.mjs';
import { productionMigrationSources } from '../src/node-production-d1.mjs';
import { applyMigrations } from '../src/migrations.mjs';
import { fixtureStore, fixtureProducts, cart, key, fakeCheckout, payment } from './fixtures.mjs';

test('native D1 additive migration, lease and Worker MP transport preserve business state and send once', async () => {
  const clock = Date.now(),
    sid = String(Math.floor(clock / 1000)),
    requests = [];
  let redirect = false;
  const built = await build({
    stdin: {
      resolveDir: fileURLToPath(new URL('../', import.meta.url)),
      contents: `import {CommerceService} from './src/service.mjs';import {CommerceAnalytics,Ga4MeasurementAdapter} from './src/analytics.mjs';export default{async fetch(_request,env){if(env.TEST_HARNESS!=='isolated-analytics')return new Response(null,{status:403});const service=new CommerceService(env.COMMERCE_DB);const adapter=new Ga4MeasurementAdapter({environment:'sandbox',measurementId:'G-TEST000001',apiSecret:'fixture_native_secret_only',consentVersion:2,countries:['LT']});return Response.json(await new CommerceAnalytics(service,{store_a:adapter}).dispatch('store_a','sandbox'));}};`,
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
  });
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          name: 'analytics-isolated',
          modules: true,
          compatibilityDate: '2026-10-11',
          script: built.outputFiles[0].text,
          bindings: { TEST_HARNESS: 'isolated-analytics' },
          d1Databases: { COMMERCE_DB: '00000000-0000-0000-0000-000000000026' },
          outboundService: async (request) => {
            const url = new URL(request.url);
            assert.equal(url.origin, 'https://region1.google-analytics.com');
            assert.equal(url.pathname, '/mp/collect');
            assert.equal(url.searchParams.get('api_secret'), 'fixture_native_secret_only');
            requests.push(await request.json());
            if (redirect)
              return new Response(null, {
                status: 302,
                headers: { location: 'https://foreign.example/must-never-receive-secret' },
              });
            return new Response(null, { status: 204 });
          },
        },
      ],
    }),
  );
  try {
    const db = await mf.getD1Database('COMMERCE_DB');
    await applyMigrations(db, await productionMigrationSources());
    const s = new CommerceService(db);
    await s.provisionStore(fixtureStore(), fixtureProducts());
    const { order } = await s.createOrder('store_a', 'sandbox', cart(), key(26));
    const a = new CommerceAnalytics(s, {
      store_a: {
        environment: 'sandbox',
        measurementId: 'G-TEST000001',
        consentVersion: 2,
        countries: ['LT'],
      },
    });
    await a.capture('store_a', 'sandbox', order, {
      choice: 'granted',
      version: 2,
      at: clock - 1000,
      expiresAt: clock + 86400000,
      clientId: '12345678.' + sid,
      sessionId: sid,
      measurementId: 'G-TEST000001',
      language: 'lt',
    });
    await s.checkout('store_a', 'sandbox', order.id, fakeCheckout);
    await s.acceptPayment(
      'store_a',
      'sandbox',
      payment(await s.getOrder('store_a', 'sandbox', order.id)),
    );
    const before = await s.getOrder('store_a', 'sandbox', order.id),
      inventory = await s.rows('SELECT * FROM inventory');
    let response = await mf.dispatchFetch('http://localhost/dispatch');
    assert.equal(response.status, 200);
    const first = await response.json();
    assert.equal(
      first.sent,
      1,
      JSON.stringify({
        first,
        delivery: await s.rows('SELECT state,last_code FROM analytics_delivery'),
      }),
    );
    assert.equal(requests.length, 1);
    assert.equal(requests[0].events[0].params.value, 32);
    response = await mf.dispatchFetch('http://localhost/dispatch');
    assert.equal(response.status, 200);
    assert.equal((await response.json()).sent, 0);
    assert.equal(requests.length, 1);
    assert.deepEqual(await s.getOrder('store_a', 'sandbox', order.id), before);
    assert.deepEqual(await s.rows('SELECT * FROM inventory'), inventory);
    assert.equal((await s.one('SELECT COUNT(*) n FROM commerce_migrations')).n, 30);
    assert.equal((await s.one('SELECT state FROM analytics_delivery')).state, 'sent');
    redirect = true;
    const second = (await s.createOrder('store_a', 'sandbox', cart(), key(27))).order;
    await a.capture('store_a', 'sandbox', second, {
      choice: 'granted',
      version: 2,
      at: clock - 1000,
      expiresAt: clock + 86400000,
      clientId: '12345678.' + sid,
      sessionId: sid,
      measurementId: 'G-TEST000001',
      language: 'lt',
    });
    await s.checkout('store_a', 'sandbox', second.id, fakeCheckout);
    await s.acceptPayment(
      'store_a',
      'sandbox',
      payment(await s.getOrder('store_a', 'sandbox', second.id), 'store_a', 'evt_native_redirect'),
    );
    response = await mf.dispatchFetch('http://localhost/dispatch');
    assert.equal((await response.json()).pending, 1);
    assert.equal(
      requests.length,
      2,
      'a redirect must never forward the API secret to another host',
    );
  } finally {
    await mf.dispose();
  }
});
