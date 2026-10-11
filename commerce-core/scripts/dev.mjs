import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { createHandler } from '../src/http.mjs';
import { fixtureStore, fixtureProducts } from '../test/fixtures.mjs';
mkdirSync(new URL('../runtime/', import.meta.url), { recursive: true });
const db = new NodeDatabase(fileURLToPath(new URL('../runtime/local.sqlite', import.meta.url)));
db.migrate();
const service = new CommerceService(db);
if (!(await service.one('SELECT id FROM stores WHERE id=?', 'store_a')))
  await service.provisionStore({ ...fixtureStore(), hosts: ['127.0.0.1:8795'] }, fixtureProducts());
const handler = createHandler({ service, environment: 'sandbox' });
createServer(async (req, res) => {
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
    'Local sandbox API: http://127.0.0.1:8795/api/catalog. Stripe/carrier/operator not connected.',
  ),
);
