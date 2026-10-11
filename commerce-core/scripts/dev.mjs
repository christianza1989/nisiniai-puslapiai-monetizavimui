import { createServer } from 'node:http';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { createHandler } from '../src/http.mjs';
import { localOperatorAuthorize } from '../src/local-identity.mjs';
import { fixtureStore, fixtureProducts } from '../test/fixtures.mjs';
mkdirSync(new URL('../runtime/', import.meta.url), { recursive: true });
const db = new NodeDatabase(fileURLToPath(new URL('../runtime/local.sqlite', import.meta.url)));
db.migrate();
const service = new CommerceService(db);
if (!(await service.one('SELECT id FROM stores WHERE id=?', 'store_a')))
  await service.provisionStore({ ...fixtureStore(), hosts: ['127.0.0.1:8795'] }, fixtureProducts());
const handler = createHandler({
  service,
  environment: 'sandbox',
  operatorAuthorize: localOperatorAuthorize(async () => {
    try {
      return JSON.parse(
        readFileSync(new URL('../runtime/operators.json', import.meta.url), 'utf8'),
      );
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }),
});
const assets = {
  '/admin': ['admin.html', 'text/html; charset=utf-8'],
  '/admin.css': ['admin.css', 'text/css; charset=utf-8'],
  '/admin.mjs': ['admin.mjs', 'text/javascript; charset=utf-8'],
  '/backoffice-ui.mjs': ['backoffice-ui.mjs', 'text/javascript; charset=utf-8'],
};
createServer(async (req, res) => {
  if (req.headers.host !== '127.0.0.1:8795') {
    res.writeHead(404);
    res.end();
    return;
  }
  const asset = assets[req.url];
  if (req.method === 'GET' && req.url === '/qa/admin-spacing') {
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    });
    res.end(
      readFileSync(new URL('../public/admin.html', import.meta.url), 'utf8').replace(
        '</head>',
        '<link rel="stylesheet" href="/qa/spacing.css"></head>',
      ),
    );
    return;
  }
  if (req.method === 'GET' && req.url === '/qa/spacing.css') {
    res.writeHead(200, {
      'content-type': 'text/css; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    });
    res.end(readFileSync(new URL('../test/spacing.css', import.meta.url)));
    return;
  }
  if (req.method === 'GET' && asset) {
    res.writeHead(200, {
      'content-type': asset[1],
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
      'x-content-type-options': 'nosniff',
      'content-security-policy':
        "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    });
    res.end(readFileSync(new URL('../public/' + asset[0], import.meta.url)));
    return;
  }
  const body = await new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 65536) {
        reject(new Error('body limit'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  }).catch(() => null);
  if (body === null) {
    res.writeHead(413);
    res.end();
    return;
  }
  const request = new Request('http://127.0.0.1:8795' + req.url, {
    method: req.method,
    headers: req.headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
  });
  const response = await handler(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(8795, '127.0.0.1', () =>
  console.log(
    'Vietinis administravimas: http://127.0.0.1:8795/admin. Prisijungimas: npm run operator:token. Stripe ir vežėjas neaktyvūs.',
  ),
);
