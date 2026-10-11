import { CommerceError, requireValue } from './validation.mjs';
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
          requireValue(event.storeId === store.id, 'stripe_store_mismatch', 403);
          await service.acceptPayment(store.id, environment, event);
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
        requireValue(
          operatorAuthorize && (await operatorAuthorize(request, store, admin[2])),
          'operator_forbidden',
          403,
        );
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
