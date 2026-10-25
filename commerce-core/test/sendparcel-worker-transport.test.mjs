import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

test('native Worker carrier fetch accepts supported redirect mode and never follows a credential-bearing redirect', async () => {
  const source = await build({
    stdin: {
      contents: `import {SendparcelAdapter} from './src/sendparcel-adapter.mjs';export default{async fetch(){const adapter=new SendparcelAdapter({environment:'sandbox',accountRef:'fixture_carrier',apiPassword:'FIXTURE_PASSWORD_NOT_A_CREDENTIAL',rateLimiter:{run:async(_scope,fn)=>fn()}});try{return Response.json({value:await adapter.request('/rest-api/services')});}catch(e){return Response.json({error:e.code},{status:e.status||500});}}};`,
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
  });
  let count = 0,
    redirect = false;
  const runtime = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          name: 'carrier-native',
          modules: true,
          compatibilityDate: '2026-10-11',
          script: source.outputFiles[0].text,
          outboundService: async (request) => {
            count++;
            assert.equal(request.url, 'https://staging.sendparcel.com/rest-api/services');
            assert.equal(request.headers.get('password'), 'FIXTURE_PASSWORD_NOT_A_CREDENTIAL');
            return redirect
              ? new Response(null, {
                  status: 302,
                  headers: { location: 'https://foreign.example/never-fetch' },
                })
              : Response.json({ services: [] });
          },
        },
      ],
    }),
  );
  try {
    let r = await runtime.dispatchFetch('http://localhost/');
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { value: { services: [] } });
    assert.equal(count, 1);
    redirect = true;
    count = 0;
    r = await runtime.dispatchFetch('http://localhost/');
    assert.equal(r.status, 503);
    assert.deepEqual(await r.json(), { error: 'carrier_request_failed' });
    assert.equal(count, 1, 'redirect must not make a second credential-bearing request');
  } finally {
    await runtime.dispose();
  }
});
