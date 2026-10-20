// Test entrypoint only. Never imported by src/worker.mjs or used for deployment.
import Stripe from 'stripe';
import { CommerceService } from '../src/service.mjs';
import { createHandler } from '../src/http.mjs';
import { StripeCheckoutAdapter } from '../src/stripe-adapter.mjs';
import { fixtureCarrier } from './fixtures.mjs';
import { SendparcelAdapter } from '../src/sendparcel-adapter.mjs';

const carrier = fixtureCarrier();
export default {
  async fetch(request, env) {
    if (env.TEST_HARNESS !== 'fixture-only')
      return new Response('Test harness disabled', { status: 403 });
    const service = new CommerceService(env.COMMERCE_DB);
    const client = new Stripe('fixture-api-key', { httpClient: Stripe.createFetchHttpClient() });
    // This deployed-test entrypoint never contacts an account endpoint and must
    // remain explicitly unverified; production Worker does not import it.
    client.accounts = undefined;
    // R2 holds TEST provider parameters, never a stored client secret. This mock
    // emulates Stripe's stable idempotency/retrieval across workerd restarts.
    const fixtureKey = (orderId) => 'TEST/provider-checkout/' + orderId + '.json';
    const fixtureSession = (receipt) => ({
      id: receipt.id,
      ui_mode: receipt.data.ui_mode || 'hosted_page',
      status: 'open',
      livemode: false,
      expires_at: receipt.data.expires_at,
      metadata: receipt.data.metadata,
      client_reference_id: receipt.data.client_reference_id,
      amount_total: receipt.data.line_items.reduce(
        (sum, l) => sum + l.quantity * l.price_data.unit_amount,
        0,
      ),
      currency: receipt.data.line_items[0].price_data.currency,
      url: receipt.data.ui_mode === 'embedded_page' ? null : 'https://checkout.stripe.test/fixture',
      client_secret:
        receipt.data.ui_mode === 'embedded_page'
          ? receipt.id + '_secret_nativefixture123456'
          : null,
    });
    client.checkout.sessions.create = async (data) => {
      const mode = data.ui_mode || 'hosted_page',
        id =
          (mode === 'embedded_page' ? 'cs_test_' : 'cs_') +
          data.metadata.order_id.replaceAll('-', ''),
        key = fixtureKey(data.metadata.order_id),
        proposal = { id, data };
      const put = await env.COMMERCE_FILES.put(key, JSON.stringify(proposal), {
        onlyIf: { etagDoesNotMatch: '*' },
      });
      const receipt = put ? proposal : JSON.parse(await (await env.COMMERCE_FILES.get(key)).text());
      if (JSON.stringify(receipt.data) !== JSON.stringify(data)) {
        const error = Error('TEST provider idempotency conflict');
        error.type = 'StripeIdempotencyError';
        throw error;
      }
      return fixtureSession(receipt);
    };
    client.checkout.sessions.retrieve = async (id) => {
      const order = await env.COMMERCE_DB.prepare('SELECT id FROM orders WHERE checkout_id=?')
        .bind(id)
        .first();
      if (!order) throw Error('TEST provider unknown Session');
      const receipt = JSON.parse(await (await env.COMMERCE_FILES.get(fixtureKey(order.id))).text());
      return fixtureSession(receipt);
    };
    client.refunds.list = async () => ({ data: [], has_more: false });
    client.refunds.create = async (data) => ({
      ...data,
      id: 're_' + data.metadata.commerce_command_id.replaceAll('-', ''),
      currency: 'eur',
      status: 'succeeded',
      livemode: false,
    });
    const paymentAdapters = {};
    for (const store of ['store_a', 'store_b'])
      paymentAdapters[store] = new StripeCheckoutAdapter({
        client,
        webhookSecret: 'fixture-webhook-secret',
        accountRef: store + '_sandbox',
        environment: 'sandbox',
        publishableKey: 'pk_test_nativeembeddedfixture123456',
      });
    return createHandler({
      service,
      environment: 'sandbox',
      paymentAdapters,
      shippingAdapters: { store_a: carrier, store_b: carrier },
      shippingReadAdapters: {
        store_a: new SendparcelAdapter({
          environment: 'sandbox',
          accountRef: 'fixture_sendparcel',
          apiPassword: 'fixture_api_password',
          rateLimiter: { run: (_scope, perform) => perform() },
          fetchImpl: async () =>
            Response.json({
              offers: [
                {
                  product: { id: 42, name: 'Fixture carrier', courier_name: 'Test' },
                  total_price: { amount_in_cents: 799, currency: 'EUR' },
                },
              ],
            }),
        }),
      },
      operatorAuthorize: async (req, store) =>
        req.headers.get('x-fixture-operator') === store.id
          ? {
              id: 'fixture_operator',
              storeId: store.id,
              permissions: [
                'read',
                'stock',
                'document',
                'pack',
                'ship',
                'finance',
                'wholesale',
                'refund',
              ],
            }
          : false,
    })(request);
  },
};
