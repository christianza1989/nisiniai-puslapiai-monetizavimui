import { CommerceError, requireValue, identifier } from './validation.mjs';
import { CommerceOperations } from './operations.mjs';
import { Backoffice } from './backoffice.mjs';
import { Wholesale } from './wholesale.mjs';
const json = (value, status = 200) =>
  Response.json(value, {
    status,
    headers: {
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
      'x-content-type-options': 'nosniff',
    },
  });
export async function boundedBody(request, max = 65536) {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      requireValue(size <= max, 'body_too_large', 413);
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(bytes);
}
export function createHandler({
  service,
  environment,
  paymentAdapters = {},
  shippingAdapters = {},
  operatorAuthorize,
}) {
  const operations = new CommerceOperations(service);
  const backoffice = new Backoffice(service);
  const wholesale = new Wholesale(service);
  return async (request) => {
    try {
      const url = new URL(request.url);
      const store = await service.resolveHost(url.host, environment);
      if (request.method !== 'GET' && url.pathname !== '/api/stripe/webhook') {
        const origin = request.headers.get('origin');
        requireValue(!origin || origin === url.origin, 'origin_forbidden', 403);
      }
      const path = url.pathname;
      const read = async () => {
        try {
          return JSON.parse(await boundedBody(request));
        } catch (error) {
          if (error instanceof CommerceError) throw error;
          throw new CommerceError('invalid_json');
        }
      };
      const authorize = async (action) => {
        const principal = operatorAuthorize && (await operatorAuthorize(request, store, action));
        requireValue(
          principal &&
            identifier(principal.id) &&
            principal.storeId === store.id &&
            Array.isArray(principal.permissions) &&
            principal.permissions.includes(action),
          'operator_forbidden',
          403,
        );
        return principal;
      };
      if (request.method === 'GET' && path === '/api/markets')
        return json(await operations.markets(store.id, environment));
      if (path.startsWith('/api/operator/')) {
        const reads = {
          '/api/operator/components': () => backoffice.inventory(store.id, environment),
          '/api/operator/financials': () => backoffice.financials(store.id, environment),
          '/api/operator/wholesale': () => wholesale.overview(store.id, environment),
        };
        if (request.method === 'GET' && reads[path]) {
          await authorize('read');
          return json(await reads[path]());
        }
        const writes = {
          '/api/operator/wholesale-approvals': [
            'wholesale',
            (input, actor) => wholesale.approval(store.id, environment, input, actor),
          ],
          '/api/operator/components': [
            'stock',
            (input, actor) => backoffice.component(store.id, environment, input, actor),
          ],
          '/api/operator/lots': [
            'stock',
            (input, actor) => backoffice.receive(store.id, environment, input, actor),
          ],
          '/api/operator/recipes': [
            'stock',
            (input, actor) => backoffice.recipe(store.id, environment, input, actor),
          ],
          '/api/operator/assemblies': [
            'stock',
            (input, actor) => backoffice.assemble(store.id, environment, input, actor),
          ],
          '/api/operator/financial-imports': [
            'finance',
            (input, actor) => backoffice.importSources(store.id, environment, input, actor),
          ],
          '/api/operator/reconciliations': [
            'finance',
            (input, actor) => backoffice.reconcile(store.id, environment, input, actor),
          ],
          '/api/operator/wholesale-price-lists': [
            'wholesale',
            (input, actor) => wholesale.priceList(store.id, environment, input, actor),
          ],
          '/api/operator/wholesale-partners': [
            'wholesale',
            (input, actor) => wholesale.partner(store.id, environment, input, actor),
          ],
          '/api/operator/wholesale-quotes': [
            'wholesale',
            (input, actor) => wholesale.quote(store.id, environment, input, actor),
          ],
          '/api/operator/wholesale-reorders': [
            'wholesale',
            (input, actor) => wholesale.reorder(store.id, environment, input, actor),
          ],
        };
        if (request.method === 'POST' && writes[path]) {
          const [grant, run] = writes[path],
            principal = await authorize(grant);
          return json(await run(await read(), principal.id));
        }
        const wholesaleAccept = path.match(
          /^\/api\/operator\/wholesale-quotes\/([a-zA-Z0-9_-]+)\/accept$/,
        );
        if (request.method === 'POST' && wholesaleAccept) {
          const principal = await authorize('wholesale');
          return json(
            await wholesale.accept(store.id, environment, wholesaleAccept[1], principal.id),
          );
        }
        if (request.method === 'GET' && path === '/api/operator/overview') {
          const principal = await authorize('read');
          return json({
            ...(await operations.overview(store.id, environment)),
            permissions: principal.permissions || [],
            integrations: {
              payments: Boolean(paymentAdapters[store.id]),
              shipping: Boolean(shippingAdapters[store.id]),
            },
          });
        }
        if (request.method === 'GET' && path === '/api/operator/orders') {
          await authorize('read');
          return json(
            await operations.ordersPage(store.id, environment, {
              ...(url.searchParams.has('before')
                ? { before: Number(url.searchParams.get('before')) }
                : {}),
              ...(url.searchParams.has('beforeId')
                ? { beforeId: url.searchParams.get('beforeId') }
                : {}),
            }),
          );
        }
        if (request.method === 'POST' && path === '/api/operator/stock-adjustments') {
          const principal = await authorize('stock');
          return json(
            await operations.adjustStock(store.id, environment, await read(), principal.id),
          );
        }
        const detail = path.match(/^\/api\/operator\/orders\/([a-zA-Z0-9_-]+)(?:\/(documents))?$/);
        if (detail && request.method === 'GET') {
          await authorize('read');
          const order = await service.getOrder(store.id, environment, detail[1]);
          return json({
            order,
            documents: await operations.listDocuments(store.id, environment, order.id),
            refunds: await service.rows(
              'SELECT * FROM refunds WHERE store_id=? AND order_id=?',
              store.id,
              order.id,
            ),
            shipment: await service.one(
              'SELECT * FROM shipments WHERE store_id=? AND order_id=?',
              store.id,
              order.id,
            ),
          });
        }
        if (detail?.[2] === 'documents' && request.method === 'POST') {
          const principal = await authorize('document');
          return json(
            await operations.issueDocument(
              store.id,
              environment,
              detail[1],
              await read(),
              principal.id,
            ),
          );
        }
        const document = path.match(/^\/api\/operator\/documents\/([a-zA-Z0-9_-]+)$/);
        if (document && request.method === 'GET') {
          await authorize('read');
          return json(await operations.getDocument(store.id, environment, document[1]));
        }
      }
      if (request.method === 'GET' && path === '/api/catalog')
        return json(await service.catalog(store.id, environment));
      if (request.method === 'POST' && path === '/api/quote')
        return json(await service.quote(store.id, environment, await read()));
      if (request.method === 'POST' && path === '/api/orders') {
        const token = request.headers.get('order-access-token');
        requireValue(
          typeof token === 'string' && /^[a-zA-Z0-9_-]{32,128}$/.test(token),
          'invalid_order_token',
        );
        const result = await service.createOrder(
          store.id,
          environment,
          await read(),
          request.headers.get('idempotency-key'),
          token,
        );
        return json(result, result.replayed ? 200 : 201);
      }
      if (request.method === 'POST' && path === '/api/stripe/webhook') {
        const adapter = paymentAdapters[store.id];
        requireValue(adapter, 'stripe_not_connected', 503);
        const event = await adapter.verifyEvent(
          await boundedBody(request),
          request.headers.get('stripe-signature'),
        );
        if (event) {
          if (event.kind === 'refund')
            await operations.acceptRefundEvent(store.id, environment, event);
          else {
            requireValue(event.storeId === store.id, 'stripe_store_mismatch', 403);
            await service.acceptPayment(store.id, environment, event);
            await operations.applyPendingRefunds(store.id, environment);
          }
        }
        return json({ received: true });
      }
      const match = path.match(/^\/api\/orders\/([a-zA-Z0-9_-]+)(?:\/(checkout|withdrawal))?$/);
      if (match) {
        const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
        const order = await service.authorizeOrder(store.id, environment, match[1], token);
        if (request.method === 'GET' && !match[2]) return json(order);
        if (request.method === 'POST' && match[2] === 'checkout') {
          requireValue(paymentAdapters[store.id], 'stripe_not_connected', 503);
          return json(
            await service.checkout(store.id, environment, order.id, paymentAdapters[store.id]),
          );
        }
        if (request.method === 'POST' && match[2] === 'withdrawal')
          return json(await service.requestWithdrawal(store.id, environment, order.id), 202);
      }
      const admin = path.match(/^\/api\/operator\/orders\/([a-zA-Z0-9_-]+)\/(pack|ship)$/);
      if (request.method === 'POST' && admin) {
        await authorize(admin[2]);
        if (admin[2] === 'pack')
          return json(await service.markPacked(store.id, environment, admin[1]));
        requireValue(shippingAdapters[store.id], 'shipping_not_connected', 503);
        return json(
          await service.registerShipment(
            store.id,
            environment,
            admin[1],
            shippingAdapters[store.id],
          ),
        );
      }
      return json({ error: 'route_not_found' }, 404);
    } catch (error) {
      if (error instanceof CommerceError) return json({ error: error.code }, error.status);
      // Do not expose provider errors, SQL, webhook secrets or customer data.
      return json({ error: 'operation_failed' }, 500);
    }
  };
}
