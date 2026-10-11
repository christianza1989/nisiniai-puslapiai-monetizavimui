// Test entrypoint only. Never imported by src/worker.mjs or used for deployment.
import Stripe from 'stripe';
import { CommerceService } from '../src/service.mjs';
import { createHandler } from '../src/http.mjs';
import { StripeCheckoutAdapter } from '../src/stripe-adapter.mjs';
import { fixtureCarrier } from './fixtures.mjs';

const carrier = fixtureCarrier();
export default {
  async fetch(request, env) {
    if (env.TEST_HARNESS !== 'fixture-only')
      return new Response('Test harness disabled', { status: 403 });
    const service = new CommerceService(env.COMMERCE_DB);
    const client = new Stripe('fixture-api-key', { httpClient: Stripe.createFetchHttpClient() });
    client.checkout.sessions.create = async (data) => ({
      id: 'cs_' + data.metadata.order_id.replaceAll('-', ''),
      url: 'https://checkout.stripe.test/fixture',
    });
    const paymentAdapters = {};
    for (const store of ['store_a', 'store_b'])
      paymentAdapters[store] = new StripeCheckoutAdapter({
        client,
        webhookSecret: 'fixture-webhook-secret',
        accountRef: store + '_sandbox',
        environment: 'sandbox',
      });
    return createHandler({
      service,
      environment: 'sandbox',
      paymentAdapters,
      shippingAdapters: { store_a: carrier, store_b: carrier },
      operatorAuthorize: async (req, store) => req.headers.get('x-fixture-operator') === store.id,
    })(request);
  },
};
