import { createServer } from 'node:http';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { createHandler } from '../src/http.mjs';
import { localOperatorAuthorize } from '../src/local-identity.mjs';
import { fixtureStore, fixtureProducts, fixtureShippingRead } from '../test/fixtures.mjs';
import { localStripeSandbox } from '../src/local-stripe.mjs';
import { localShippingSandbox } from '../src/local-shipping.mjs';
import { requireValue } from '../src/validation.mjs';
const args = process.argv.slice(2),
  portIndex = args.indexOf('--port'),
  stripeIndex = args.indexOf('--stripe-sandbox'),
  shippingIndex = args.indexOf('--shipping-sandbox');
const port = portIndex < 0 ? 8795 : Number(args[portIndex + 1]);
requireValue(
  Number.isSafeInteger(port) && port >= 1024 && port <= 65535,
  'invalid_development_port',
);
const host = '127.0.0.1:' + port;
const stripe = stripeIndex < 0 ? null : localStripeSandbox(args[stripeIndex + 1]);
requireValue(
  !(shippingIndex >= 0 && args.includes('--shipping-fixture')),
  'shipping_configuration_conflict',
);
const shipping =
  shippingIndex >= 0
    ? localShippingSandbox(args[shippingIndex + 1])
    : args.includes('--shipping-fixture')
      ? fixtureShippingRead()
      : null;
const storeId = stripe ? 'store_stripe' : 'store_a';
mkdirSync(new URL('../runtime/', import.meta.url), { recursive: true });
const db = new NodeDatabase(
  fileURLToPath(
    new URL(stripe ? '../runtime/stripe-local.sqlite' : '../runtime/local.sqlite', import.meta.url),
  ),
);
db.migrate();
const service = new CommerceService(db);
if (!(await service.one('SELECT id FROM stores WHERE id=?', storeId)))
  await service.provisionStore(
    {
      ...fixtureStore(storeId),
      hosts: [host],
      ...(stripe
        ? {
            paymentAccountRef: stripe.accountRef,
            checkout: {
              successUrl: 'http://' + host + '/qa/payment-return',
              cancelUrl: 'http://' + host + '/qa/payment-return',
            },
          }
        : {}),
    },
    fixtureProducts(),
  );
const existing = await service.store(storeId, 'sandbox');
requireValue(
  existing.hosts.includes(host) && (!stripe || existing.paymentAccountRef === stripe.accountRef),
  'stripe_local_store_context_changed',
);
const handler = createHandler({
  service,
  environment: 'sandbox',
  paymentAdapters: stripe ? { [storeId]: stripe } : {},
  shippingReadAdapters: shipping ? { [storeId]: shipping } : {},
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
  '/shipping-ui.mjs': ['shipping-ui.mjs', 'text/javascript; charset=utf-8'],
};
createServer(async (req, res) => {
  if (req.headers.host !== host) {
    res.writeHead(404);
    res.end();
    return;
  }
  const asset = assets[req.url];
  if (req.method === 'GET' && req.url === '/qa/payment-return') {
    res.writeHead(200, {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    });
    res.end(
      'Bandomojo mokėjimo grįžimo puslapis. Užsakymo būseną patvirtina Stripe pranešimas serveriui.',
    );
    return;
  }
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
  const request = new Request('http://' + host + req.url, {
    method: req.method,
    headers: req.headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
  });
  const response = await handler(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, '127.0.0.1', () =>
  console.log(
    `Vietinis administravimas: http://${host}/admin. Store: ${storeId}. Stripe: ${stripe ? 'atskira bandymų aplinka' : 'neaktyvus'}. Vežėjas neaktyvus.`,
  ),
);
