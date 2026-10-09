import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreviewHandler } from './adapter.mjs';
const host = 'parasoplansetes-preview.example.workers.dev';
const env = { PREVIEW_HOST: host };

test('Only the explicitly configured preview host is admitted; robots disallows indexing', async () => {
  let calls = 0;
  const handler = createPreviewHandler({ fetch: () => { calls++; return new Response('app'); } });
  assert.equal((await handler.fetch(new Request('https://other.example/'), env)).status, 404);
  assert.equal((await handler.fetch(new Request(`https://${host}/`), {})).status, 404);
  const robots = await handler.fetch(new Request(`https://${host}/robots.txt`), env);
  assert.match(await robots.text(), /Disallow: \/\n/);
  assert.equal(robots.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal(calls, 0);
});

test('Native request keeps path/body and rewrites only same-preview origins; spoofed routing headers are removed', async () => {
  const handler = createPreviewHandler({ async fetch(request) {
    assert.equal(request.url, 'https://parasoplansetes.lt/uzklausa?qa=1');
    assert.equal(request.headers.get('host'), 'parasoplansetes.lt');
    assert.equal(request.headers.get('origin'), 'https://parasoplansetes.lt');
    assert.equal(request.headers.get('referer'), 'https://parasoplansetes.lt/kontaktai');
    for (const name of ['x-niche-original-path', 'x-gift-original-path', 'x-forwarded-host', 'forwarded']) assert.equal(request.headers.get(name), null);
    assert.equal(await request.text(), 'name=QA');
    return new Response('saved', { headers: { 'content-type': 'text/plain', 'cache-control': 'public' } });
  } });
  const response = await handler.fetch(new Request(`https://${host}/uzklausa?qa=1`, { method: 'POST', body: 'name=QA', headers: {
    origin: `https://${host}`, referer: `https://${host}/kontaktai`, 'x-niche-original-path': '/fake', 'x-gift-original-path': '/fake', 'x-forwarded-host': 'evil.example', forwarded: 'host=evil.example',
  } }), env);
  assert.equal(await response.text(), 'saved');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
});

test('External/malformed/canonical origins cannot bypass the preview-origin boundary', async () => {
  let calls = 0;
  const handler = createPreviewHandler({ async fetch() { calls++; return new Response('unexpected'); } });
  for (const origin of ['https://evil.example', 'https://parasoplansetes.lt', 'null', 'malformed']) {
    const response = await handler.fetch(new Request(`https://${host}/uzklausa`, { method: 'POST', body: 'x', headers: { origin } }), env);
    assert.equal(response.status, 403);
    assert.equal(await response.text(), 'Forbidden');
  }
  assert.equal((await handler.fetch(new Request(`https://${host}/uzklausa`, { method: 'POST', body: 'x', headers: { referer: 'https://parasoplansetes.lt/kontaktai' } }), env)).status, 403);
  assert.equal(calls, 0);
});

test('Same-site redirects stay on preview while external redirects retain their destination', async () => {
  for (const [location, expected] of [['https://parasoplansetes.lt/gidai?a=1', `https://${host}/gidai?a=1`], ['https://stepover.com/', 'https://stepover.com/']]) {
    const handler = createPreviewHandler({ fetch: () => new Response(null, { status: 307, headers: { location } }) });
    const response = await handler.fetch(new Request(`https://${host}/`), env);
    assert.equal(response.headers.get('location'), expected);
    assert.equal(response.status, 307);
  }
});
