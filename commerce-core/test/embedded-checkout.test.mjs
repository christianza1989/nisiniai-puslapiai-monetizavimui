import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { StripeCheckoutAdapter } from '../src/stripe-adapter.mjs';
import { createHandler } from '../src/http.mjs';
import { CommerceClient } from '../public/commerce-client.mjs';
import { runtimeOptions } from '../src/runtime.mjs';
import { fixtureStore, fixtureProducts, cart } from './fixtures.mjs';

const account = 'acct_embeddedfixture';
const pk = 'pk_test_embeddedfixture1234567890';
const secret = 'embedded_fixture_webhook';
function provider() {
  const sessions = new Map(),
    keys = new Map(),
    calls = [],
    reads = [];
  let creates = 0,
    lose = false,
    raceGate,
    releaseRace;
  const client = {
    accounts: { retrieveCurrent: async () => ({ id: account, charges_enabled: true }) },
    webhooks: new Stripe('fixture_api_key').webhooks,
    checkout: {
      sessions: {
        create: async (data, opts) => {
          calls.push(structuredClone({ data, opts }));
          if (raceGate) {
            if (calls.length >= 2) releaseRace();
            await raceGate;
          }
          const old = keys.get(opts.idempotencyKey);
          if (old && old.body !== JSON.stringify(data)) {
            const error = Error('fixture idempotency parameters differ');
            error.type = 'StripeIdempotencyError';
            throw error;
          }
          let row;
          if (old) row = sessions.get(old.id);
          else {
            const id = 'cs_test_fixture' + ++creates,
              mode = data.ui_mode || 'hosted_page';
            row = {
              id,
              ui_mode: mode,
              status: 'open',
              livemode: false,
              expires_at: data.expires_at,
              amount_total: data.line_items.reduce(
                (sum, l) => sum + l.quantity * l.price_data.unit_amount,
                0,
              ),
              currency: data.line_items[0].price_data.currency,
              metadata: data.metadata,
              client_reference_id: data.client_reference_id,
              url: mode === 'hosted_page' ? 'https://checkout.stripe.com/c/pay/' + id : null,
              client_secret: mode === 'embedded_page' ? id + '_secret_embeddedfixture123456' : null,
              private_provider_field: 'not for the browser',
            };
            sessions.set(id, row);
            keys.set(opts.idempotencyKey, { id, body: JSON.stringify(data) });
          }
          if (lose) {
            lose = false;
            throw Error('fixture reply lost after provider creation');
          }
          return structuredClone(row);
        },
        retrieve: async (id) => {
          reads.push(id);
          return structuredClone(sessions.get(id));
        },
      },
    },
  };
  return {
    client,
    sessions,
    calls,
    reads,
    creates: () => creates,
    lose: () => {
      lose = true;
    },
    race: () => {
      raceGate = new Promise((resolve) => {
        releaseRace = resolve;
      });
    },
  };
}
async function setup({ publishableKey = pk } = {}) {
  const db = new NodeDatabase();
  db.migrate();
  const s = new CommerceService(db),
    p = provider();
  await s.provisionStore({ ...fixtureStore(), paymentAccountRef: account }, fixtureProducts());
  const adapter = new StripeCheckoutAdapter({
    environment: 'sandbox',
    accountRef: account,
    webhookSecret: secret,
    publishableKey,
    client: p.client,
  });
  const handler = createHandler({
    service: s,
    environment: 'sandbox',
    paymentAdapters: { store_a: adapter },
  });
  const values = new Map(),
    storage = {
      getItem: (k) => values.get(k) || null,
      setItem: (k, v) => values.set(k, v),
      removeItem: (k) => values.delete(k),
    };
  let loseHttp = false;
  const fetchImpl = async (path, options) => {
    const result = await handler(new Request('https://store-a.example' + path, options));
    if (loseHttp && path.endsWith('/checkout')) {
      loseHttp = false;
      throw Error('fixture HTTP reply lost');
    }
    return result;
  };
  const buyer = new CommerceClient({ fetchImpl, storage });
  await buyer.initialize();
  const order = await buyer.create(cart());
  const post = (body, token = buyer.attempt.token) =>
    handler(
      new Request('https://store-a.example/api/orders/' + order.id + '/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
        body: JSON.stringify(body),
      }),
    );
  return {
    db,
    s,
    p,
    adapter,
    handler,
    buyer,
    order,
    post,
    values,
    storage,
    fetchImpl,
    loseHttp: () => {
      loseHttp = true;
    },
  };
}

test('embedded HTTP returns only owner-scoped client details and uses pinned provider enum with authoritative price', async () => {
  const x = await setup();
  assert.equal(x.buyer.context.embeddedCheckoutConfigured, true);
  const response = await x.post({ uiMode: 'embedded' }),
    details = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(details).sort(), ['clientSecret', 'publishableKey', 'uiMode']);
  assert.equal(details.uiMode, 'embedded');
  assert.equal(details.publishableKey, pk);
  const call = x.p.calls[0];
  assert.equal(call.data.ui_mode, 'embedded_page');
  assert.equal(call.data.redirect_on_completion, 'if_required');
  assert.equal(call.data.return_url, 'https://store-a.example/success');
  for (const field of [
    'success_url',
    'cancel_url',
    'payment_method_types',
    'allowed_payment_method_types',
    'automatic_tax',
  ])
    assert.equal(field in call.data, false);
  assert.equal(call.data.line_items[0].price_data.unit_amount, 3200);
  assert.equal(call.opts.idempotencyKey, 'checkout-store_a-' + x.order.id);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await x.post({ uiMode: 'embedded' }, 'wrong_token')).status, 403);
  assert.equal(x.p.creates(), 1);
  assert.equal((await x.s.getOrder('store_a', 'sandbox', x.order.id)).payment_state, 'pending');
  x.db.close();
});

test('lost HTTP and provider responses resume one Session and do not persist the client secret in tab or database', async () => {
  const x = await setup();
  x.loseHttp();
  await assert.rejects(x.buyer.checkoutDetails({ uiMode: 'embedded' }), /network/);
  const reloaded = new CommerceClient({ fetchImpl: x.fetchImpl, storage: x.storage });
  await reloaded.initialize();
  const details = await reloaded.checkoutDetails({ uiMode: 'embedded' });
  assert.equal(details.uiMode, 'embedded');
  assert.equal(x.p.creates(), 1);
  assert.equal(x.p.reads.length, 1);
  assert.equal([...x.values.values()].join('').includes('_secret_'), false);
  const row = await x.s.one(
    'SELECT * FROM orders WHERE store_id=? AND id=?',
    'store_a',
    x.order.id,
  );
  assert.equal(JSON.stringify(row).includes('_secret_'), false);
  assert.equal(JSON.stringify(await x.s.rows('SELECT * FROM audit')).includes('_secret_'), false);
  x.db.close();
  const y = await setup();
  y.p.lose();
  await assert.rejects(y.buyer.checkoutDetails({ uiMode: 'embedded' }));
  assert.equal((await y.s.getOrder('store_a', 'sandbox', y.order.id)).checkout_id, null);
  const resumed = await y.buyer.checkoutDetails({ uiMode: 'embedded' });
  assert.equal(resumed.uiMode, 'embedded');
  assert.equal(y.p.creates(), 1);
  assert.deepEqual(y.p.calls[0], y.p.calls[1]);
  y.db.close();
});

test('existing hosted mode is retrieved and recovered for embedded requests, and concurrent initial modes cannot duplicate a Session', async () => {
  const x = await setup();
  const empty = await x.handler(
    new Request('https://store-a.example/api/orders/' + x.order.id + '/checkout', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + x.buyer.attempt.token },
      body: new Uint8Array(0),
    }),
  );
  assert.equal(
    empty.status,
    200,
    'legacy empty streams remain valid even when Request.body is non-null',
  );
  const legacy = await x.buyer.checkout();
  assert.match(legacy, /^https:\/\/checkout\.stripe\.com\//);
  const recovered = await x.buyer.checkoutDetails({ uiMode: 'embedded' });
  assert.equal(recovered.uiMode, 'hosted');
  assert.equal(recovered.url, legacy);
  assert.equal(x.p.creates(), 1);
  assert.equal(x.p.calls.length, 1);
  assert.equal(
    'ui_mode' in x.p.calls[0].data,
    false,
    'old hosted idempotent payload remains unchanged',
  );
  x.db.close();
  const y = await setup();
  y.p.race();
  const responses = await Promise.all([
    y.post({ uiMode: 'hosted' }),
    y.post({ uiMode: 'embedded' }),
  ]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  assert.equal(y.p.creates(), 1);
  const actual = await (await y.post({ uiMode: 'embedded' })).json();
  assert.equal(
    actual.uiMode,
    [...y.p.sessions.values()][0].ui_mode === 'hosted_page' ? 'hosted' : 'embedded',
  );
  assert.equal(y.p.creates(), 1);
  y.db.close();
});

test('missing or wrong-mode publishable keys block new embedded creation but retain hosted recovery', async () => {
  for (const publishableKey of [null, 'pk_live_wrongenvironment12345', 'rk_test_notpublic12345']) {
    const x = await setup({ publishableKey });
    assert.equal(x.buyer.context.embeddedCheckoutConfigured, false);
    assert.equal((await x.post({ uiMode: 'embedded' })).status, 503);
    assert.equal(x.p.creates(), 0);
    const hosted = await x.buyer.checkout();
    const recovered = await x.buyer.checkoutDetails({ uiMode: 'embedded' });
    assert.equal(recovered.url, hosted);
    assert.equal(x.p.creates(), 1);
    x.db.close();
  }
});

test('retrieval binds Session to exact order, amount, currency, environment and secret instead of accepting foreign provider data', async () => {
  const x = await setup();
  await x.buyer.checkoutDetails({ uiMode: 'embedded' });
  const original = structuredClone([...x.p.sessions.values()][0]);
  const changes = [
    [
      { metadata: { ...original.metadata, store_id: 'store_b' } },
      502,
      'stripe_checkout_session_invalid',
    ],
    [{ client_reference_id: 'another_order' }, 502, 'stripe_checkout_session_invalid'],
    [{ amount_total: original.amount_total + 1 }, 502, 'stripe_checkout_session_invalid'],
    [{ currency: 'usd' }, 502, 'stripe_checkout_session_invalid'],
    [{ livemode: true }, 502, 'stripe_checkout_session_invalid'],
    [{ expires_at: original.expires_at + 60 }, 502, 'stripe_checkout_session_invalid'],
    [{ client_secret: null }, 502, 'checkout_client_secret_invalid'],
    [{ client_secret: '   ' }, 502, 'checkout_client_secret_invalid'],
    [{ client_secret: 'x'.repeat(16385) }, 502, 'checkout_client_secret_invalid'],
    [{ ui_mode: 'elements' }, 502, 'checkout_mode_unsupported'],
    [{ status: 'expired' }, 409, 'checkout_session_unavailable'],
  ];
  for (const [change, status, code] of changes) {
    x.p.sessions.set(original.id, { ...original, ...change });
    const response = await x.post({ uiMode: 'embedded' });
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), { error: code });
  }
  x.p.sessions.set(original.id, original);
  assert.equal((await x.post({ uiMode: 'custom' })).status, 400);
  assert.equal(
    (await x.post({ uiMode: 'embedded', returnUrl: 'https://evil.example' })).status,
    400,
  );
  assert.equal(x.p.creates(), 1);
  x.db.close();
});

test('foreign callbacks and wrong new Session modes are rejected without a second Session or a fake redirect', async () => {
  const x = await setup();
  const config = await x.s.store('store_a', 'sandbox');
  await assert.rejects(
    x.adapter.createSession(
      x.order,
      { ...config, checkout: { ...config.checkout, returnUrl: 'https://evil.example/return' } },
      { uiMode: 'embedded' },
    ),
    /checkout_origin_invalid/,
  );
  assert.equal(x.p.creates(), 0);
  const create = x.p.client.checkout.sessions.create;
  x.p.client.checkout.sessions.create = async (...args) => ({
    ...(await create(...args)),
    ui_mode: 'hosted_page',
    url: 'https://checkout.stripe.com/not-an-embedded-response',
    client_secret: null,
  });
  const bad = await x.post({ uiMode: 'embedded' });
  assert.equal(bad.status, 502);
  assert.deepEqual(await bad.json(), { error: 'stripe_checkout_session_invalid' });
  assert.equal((await x.s.getOrder('store_a', 'sandbox', x.order.id)).checkout_id, null);
  x.p.client.checkout.sessions.create = create;
  assert.equal((await x.post({ uiMode: 'embedded' })).status, 200);
  assert.equal(x.p.creates(), 1);
  x.db.close();
});

test('duplicate browser mounts retain one attempt and reset the busy guard after completion', async () => {
  const x = await setup();
  const results = await Promise.allSettled([
    x.buyer.checkoutDetails({ uiMode: 'embedded' }),
    x.buyer.checkoutDetails({ uiMode: 'embedded' }),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(results.find((r) => r.status === 'rejected').reason.message, 'checkout_busy');
  assert.equal(x.p.creates(), 1);
  assert.equal(x.buyer.busy, false);
  assert.equal((await x.buyer.checkoutDetails({ uiMode: 'embedded' })).uiMode, 'embedded');
  assert.equal(x.p.creates(), 1);
  x.db.close();
});

test('browser validates modes, public-key environment and bounded opaque secrets while keeping admission', async () => {
  const x = await setup();
  x.buyer.context.productionReady = false;
  x.buyer.context.canCreateTestOrder = false;
  await assert.rejects(x.buyer.checkoutDetails({ uiMode: 'embedded' }), /stripe_not_connected/);
  assert.equal(x.p.calls.length, 0);
  x.buyer.context.canCreateTestOrder = true;
  for (const details of [
    null,
    [],
    { uiMode: '', url: 'https://checkout.stripe.com/test' },
    {
      uiMode: 'embedded',
      publishableKey: 'pk_live_wrong12345',
      clientSecret: 'cs_test_fixture_secret_1234567890',
    },
    { uiMode: 'embedded', publishableKey: pk, clientSecret: null },
    { uiMode: 'embedded', publishableKey: pk, clientSecret: '   ' },
    { uiMode: 'embedded', publishableKey: pk, clientSecret: 'x'.repeat(16385) },
    { uiMode: 'custom', publishableKey: pk, clientSecret: 'cs_test_fixture_secret_1234567890' },
    { uiMode: 'hosted', url: 'https://evil.example/payment' },
  ]) {
    x.buyer.fetch = async () => Response.json(details);
    await assert.rejects(x.buyer.checkoutDetails({ uiMode: 'embedded' }));
  }
  x.db.close();
});

test('embedded completion still waits for a signed paid webhook; browser details never mark or duplicate payment', async () => {
  const x = await setup();
  await x.buyer.checkoutDetails({ uiMode: 'embedded' });
  assert.equal((await x.buyer.receipt()).paymentState, 'pending');
  const row = [...x.p.sessions.values()][0];
  const payload = JSON.stringify({
    id: 'evt_embeddedfixture',
    livemode: false,
    type: 'checkout.session.completed',
    data: { object: { ...row, payment_status: 'paid', payment_intent: 'pi_embeddedfixture' } },
  });
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  const send = (header) =>
    x.handler(
      new Request('https://store-a.example/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': header },
        body: payload,
      }),
    );
  assert.equal((await send('wrong')).status, 400);
  assert.equal((await send(signature)).status, 200);
  assert.equal((await send(signature)).status, 200);
  assert.equal((await x.buyer.receipt()).paymentState, 'paid');
  assert.equal((await x.s.one('SELECT COUNT(*) n FROM event_inbox')).n, 1);
  assert.equal(x.p.creates(), 1);
  x.db.close();
});

test('runtime passes only the optional configured publishable key without enabling a provider or store admission', () => {
  const env = {
    COMMERCE_ENV: 'sandbox',
    COMMERCE_CONNECTIONS: JSON.stringify({
      store_a: {
        stripe: {
          apiKey: 'rk_test_fixture1234567890',
          accountRef: account,
          webhookSecret: secret,
          publishableKey: pk,
        },
      },
    }),
  };
  const opts = runtimeOptions(env);
  assert.equal(opts.paymentAdapters.store_a.publishableKey, pk);
  assert.equal(opts.shippingAdapters.store_a, undefined);
});
test('SDK client secret is opaque, including encoded delimiters, and remains bound to the validated Session', async () => {
  const x = await setup();
  const create = x.p.client.checkout.sessions.create;
  const opaque = 'fixture-opaque%2Fencoded%3Dvalue+with/slash=and.delimiters';
  x.p.client.checkout.sessions.create = async (...args) => {
    const row = await create(...args);
    row.client_secret = opaque;
    x.p.sessions.set(row.id, structuredClone(row));
    return row;
  };
  try {
    const details = await x.buyer.checkoutDetails({ uiMode: 'embedded' });
    assert.equal(details.clientSecret, opaque);
    const recovered = await x.buyer.checkoutDetails({ uiMode: 'embedded' });
    assert.equal(recovered.clientSecret, opaque);
    assert.equal(x.p.creates(), 1);
    assert(![...x.values.values()].join('').includes(opaque));
  } finally {
    x.db.close();
  }
});
test('read-only recovery inspection accepts actual expiry but rejects foreign facts and flags processing intents', async () => {
  const x = await setup();
  await x.buyer.checkoutDetails({ uiMode: 'embedded' });
  const order = await x.s.getOrder('store_a', 'sandbox', x.order.id),
    config = await x.s.store('store_a', 'sandbox');
  const row = x.p.sessions.get(order.checkout_id);
  row.status = 'expired';
  row.payment_status = 'unpaid';
  row.payment_intent = null;
  assert.deepEqual(await x.adapter.inspectSession(row.id, order, config), {
    status: 'expired',
    paymentStatus: 'unpaid',
    paymentProcessing: false,
  });
  row.status = 'open';
  row.payment_intent = { status: 'processing' };
  assert.equal((await x.adapter.inspectSession(row.id, order, config)).paymentProcessing, true);
  row.amount_total++;
  await assert.rejects(
    x.adapter.inspectSession(row.id, order, config),
    /stripe_checkout_session_invalid/,
  );
  x.db.close();
});
test('a mailbox identity override cannot alter Stripe keys or target an unconfigured store', () => {
  const env = {
    COMMERCE_ENV: 'sandbox',
    COMMERCE_MAIL: { fetch() {} },
    COMMERCE_CONNECTIONS: JSON.stringify({
      store_a: { mail: { sender: 'old@example.test', transportRef: 'mail_fixture' } },
    }),
    COMMERCE_MAIL_CONNECTIONS: JSON.stringify({
      store_a: { sender: 'new@example.test', transportRef: 'mail_fixture' },
    }),
  };
  assert.equal(runtimeOptions(env).notificationAdapters.store_a.sender, 'new@example.test');
  assert.deepEqual(runtimeOptions(env).paymentAdapters, {});
  assert.throws(
    () =>
      runtimeOptions({
        ...env,
        COMMERCE_MAIL_CONNECTIONS: JSON.stringify({
          foreign: { sender: 'new@example.test', transportRef: 'mail_fixture' },
        }),
      }),
    /runtime_mail_configuration_invalid/,
  );
});
