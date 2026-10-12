import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { createHandler } from '../src/http.mjs';
import { localOperatorAuthorize } from '../src/local-identity.mjs';
import { fixtureStore, fixtureProducts, fixtureShippingRead } from '../test/fixtures.mjs';
import { localStripeSandbox } from '../src/local-stripe.mjs';
import { localShippingSandbox } from '../src/local-shipping.mjs';
import { NodePrivateStorage } from '../src/node-private-storage.mjs';
import { requireValue } from '../src/validation.mjs';
import {
  foundationStore,
  foundationProducts,
  foundationPayment,
  foundationCarrier,
} from '../test/foundation-fixtures.mjs';
import { CommerceJobs } from '../src/jobs.mjs';
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
const foundation = args.includes('--foundation-fixture');
requireValue(
  !foundation || (stripeIndex < 0 && shippingIndex < 0 && !args.includes('--shipping-fixture')),
  'fixture_configuration_conflict',
);
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
const storeId = foundation ? 'store_foundation' : stripe ? 'store_stripe' : 'store_a';
mkdirSync(new URL('../runtime/', import.meta.url), { recursive: true });
const db = new NodeDatabase(
  fileURLToPath(
    new URL(
      foundation
        ? '../runtime/foundation-local.sqlite'
        : stripe
          ? '../runtime/stripe-local.sqlite'
          : '../runtime/local.sqlite',
      import.meta.url,
    ),
  ),
);
db.migrate();
const service = new CommerceService(db);
if (!(await service.one('SELECT id FROM stores WHERE id=?', storeId)))
  await service.provisionStore(
    {
      ...(foundation ? foundationStore(host) : fixtureStore(storeId)),
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
    foundation ? foundationProducts() : fixtureProducts(),
  );
const existing = await service.store(storeId, 'sandbox');
requireValue(
  existing.hosts.includes(host) && (!stripe || existing.paymentAccountRef === stripe.accountRef),
  'stripe_local_store_context_changed',
);
const foundationAdapter = foundation
  ? foundationCarrier({
      load: async () => {
        try {
          return JSON.parse(
            readFileSync(new URL('../runtime/foundation-carrier.json', import.meta.url), 'utf8'),
          );
        } catch (e) {
          if (e.code === 'ENOENT') return {};
          throw e;
        }
      },
      save: async (ledger) =>
        writeFileSync(
          new URL('../runtime/foundation-carrier.json', import.meta.url),
          JSON.stringify(ledger),
          { mode: 0o600 },
        ),
      loadPdf: async () =>
        new Uint8Array(readFileSync(new URL('../tmp/pdfs/sandbox-sale.pdf', import.meta.url))),
    })
  : null;
const handler = createHandler({
  service,
  environment: 'sandbox',
  paymentAdapters: foundation
    ? { [storeId]: foundationPayment(host) }
    : stripe
      ? { [storeId]: stripe }
      : {},
  shippingAdapters: foundationAdapter ? { [storeId]: foundationAdapter } : {},
  notificationAdapters: foundation
    ? {
        [storeId]: {
          environment: 'sandbox',
          accountRef: 'fixture_core_mail',
          sender: 'fixture@example.test',
          send: async (message) => ({
            status: 'accepted',
            reference: 'LOCAL-MAIL-FIXTURE-' + message.id,
          }),
          find: async () => ({ status: 'unknown' }),
        },
      }
    : {},
  shippingReadAdapters: foundationAdapter
    ? { [storeId]: foundationAdapter }
    : shipping
      ? { [storeId]: shipping }
      : {},
  privateStorage: new NodePrivateStorage(
    fileURLToPath(new URL('../runtime/private-files', import.meta.url)),
  ),
  loadDocumentFont: async () =>
    new Uint8Array(readFileSync(new URL('../public/fonts/NotoSans-Regular.ttf', import.meta.url))),
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
  '/private-files-ui.mjs': ['private-files-ui.mjs', 'text/javascript; charset=utf-8'],
  '/shipment-commands-ui.mjs': ['shipment-commands-ui.mjs', 'text/javascript; charset=utf-8'],
  '/jobs-ui.mjs': ['jobs-ui.mjs', 'text/javascript; charset=utf-8'],
  '/catalog-ui.mjs': ['catalog-ui.mjs', 'text/javascript; charset=utf-8'],
  '/finance-io-ui.mjs': ['finance-io-ui.mjs', 'text/javascript; charset=utf-8'],
  '/returns-ui.mjs': ['returns-ui.mjs', 'text/javascript; charset=utf-8'],
  '/commerce': ['commerce.html', 'text/html; charset=utf-8'],
  '/commerce-client.mjs': ['commerce-client.mjs', 'text/javascript; charset=utf-8'],
  '/checkout-ui.mjs': ['checkout-ui.mjs', 'text/javascript; charset=utf-8'],
  '/checkout.css': ['checkout.css', 'text/css; charset=utf-8'],
  '/commerce-preview.mjs': ['commerce-preview.mjs', 'text/javascript; charset=utf-8'],
};
createServer(async (req, res) => {
  if (req.headers.host !== host) {
    res.writeHead(404);
    res.end();
    return;
  }
  const path = new URL(req.url, 'http://' + host).pathname;
  const fixtureCheckout = foundation && /^\/qa\/checkout\/[a-zA-Z0-9_-]+$/.test(path);
  const asset = fixtureCheckout
    ? ['../test/fixture-checkout.html', 'text/html; charset=utf-8']
    : foundation && path === '/fixture-checkout.mjs'
      ? ['../test/fixture-checkout.mjs', 'text/javascript; charset=utf-8']
      : assets[path];
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
      if (size > (req.url?.includes('/files/') ? 2 * 1024 * 1024 : 65536)) {
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
  let response;
  const fixturePayment = foundation && path.match(/^\/qa\/checkout\/([a-zA-Z0-9_-]+)\/pay$/);
  if (fixturePayment && req.method === 'POST') {
    try {
      requireValue(
        !request.headers.get('origin') || request.headers.get('origin') === 'http://' + host,
        'origin_forbidden',
        403,
      );
      const order = await service.authorizeOrder(
        storeId,
        'sandbox',
        fixturePayment[1],
        request.headers.get('authorization')?.replace(/^Bearer /, ''),
      );
      await service.acceptPayment(storeId, 'sandbox', {
        id: 'evt_fixture_' + order.id.replaceAll('-', ''),
        orderId: order.id,
        environment: 'sandbox',
        accountRef: storeId + '_sandbox',
        sessionId: order.checkout_id,
        paymentId: 'pi_fixture_' + order.id.replaceAll('-', ''),
        currency: order.currency,
        amount: order.amount,
        paid: true,
      });
      await new CommerceJobs(service, {
        privateStorage: new NodePrivateStorage(
          fileURLToPath(new URL('../runtime/private-files', import.meta.url)),
        ),
        loadDocumentFont: async () =>
          new Uint8Array(
            readFileSync(new URL('../public/fonts/NotoSans-Regular.ttf', import.meta.url)),
          ),
      }).scheduled(storeId, 'sandbox');
      response = Response.json(
        { fixture: true, recorded: true },
        { headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } },
      );
    } catch (error) {
      response = Response.json(
        { error: error.code || 'fixture_failed' },
        { status: error.status || 500 },
      );
    }
  } else response = await handler(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, '127.0.0.1', () =>
  console.log(
    `Vietinis administravimas: http://${host}/admin. Store: ${storeId}. Stripe: ${stripe ? 'atskira bandymų aplinka' : 'neaktyvus'}. Vežėjas neaktyvus.`,
  ),
);
