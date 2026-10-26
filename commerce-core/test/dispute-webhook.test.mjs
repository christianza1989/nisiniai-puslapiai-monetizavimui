import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { StripeCheckoutAdapter } from '../src/stripe-adapter.mjs';
import { createHandler } from '../src/http.mjs';
import { fixtureStore, fixtureProducts } from './fixtures.mjs';
test('actual SDK-signed dispute webhook persists an unmatched fact once and rejects same-event mutation before financial effects', async () => {
  const db = new NodeDatabase();
  db.migrate();
  const s = new CommerceService(db);
  await s.provisionStore(fixtureStore(), fixtureProducts());
  const secret = 'fixture_webhook_secret';
  const adapter = new StripeCheckoutAdapter({
    apiKey: 'sk_test_fixture',
    webhookSecret: secret,
    accountRef: 'store_a_sandbox',
    environment: 'sandbox',
  });
  const handler = createHandler({
    service: s,
    environment: 'sandbox',
    paymentAdapters: { store_a: adapter },
  });
  const event = {
    id: 'evt_signed_dispute',
    created: 1791777000,
    livemode: false,
    type: 'charge.dispute.created',
    data: {
      object: {
        id: 'dp_fixture',
        payment_intent: 'pi_fixture',
        amount: 3200,
        currency: 'eur',
        status: 'needs_response',
        reason: 'product_not_received',
        evidence_details: { due_by: 1792377000 },
      },
    },
  };
  const send = async (e) => {
    const body = JSON.stringify(e);
    return handler(
      new Request('https://store-a.example/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': Stripe.webhooks.generateTestHeaderString({ payload: body, secret }),
        },
        body,
      }),
    );
  };
  assert.equal((await send(event)).status, 200);
  assert.equal((await send(event)).status, 200);
  assert.equal((await s.one('SELECT COUNT(*) n FROM payment_dispute_events')).n, 1);
  assert.equal(
    (await send({ ...event, data: { object: { ...event.data.object, amount: 3000 } } })).status,
    409,
  );
  assert.equal((await s.one('SELECT COUNT(*) n FROM refunds')).n, 0);
  assert.equal((await s.one('SELECT COUNT(*) n FROM journal_entries')).n, 0);
  db.close();
});
