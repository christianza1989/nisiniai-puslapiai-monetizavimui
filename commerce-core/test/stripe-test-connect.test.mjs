import test from 'node:test';
import assert from 'node:assert/strict';
import { stripeTestConnectionHandler } from '../src/stripe-test-connect.mjs';
import { StripeCheckoutAdapter } from '../src/stripe-adapter.mjs';
const origin = 'http://127.0.0.1:8837',
  accountRef = 'acct_fixture',
  key = 'rk_test_fixturekey12345678';
async function form(handler) {
  const result = await handler(new Request(origin, { headers: { host: '127.0.0.1:8837' } }));
  const html = await result.text();
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.ok(!html.includes(key));
  return html.match(/nonce:'([^']+)'/)[1];
}
const post = (nonce, keyValue = key, requestOrigin = origin) =>
  new Request(origin + '/connect', {
    method: 'POST',
    headers: { host: '127.0.0.1:8837', origin: requestOrigin, 'content-type': 'application/json' },
    body: JSON.stringify({ nonce, key: keyValue }),
  });
test('restricted test key input rejects live keys, foreign origins, wrong accounts and replay without returning secrets', async () => {
  const writes = [];
  const handler = stripeTestConnectionHandler({
    origin,
    accountRef,
    save: async (c) => writes.push(c),
    clientFactory: () => ({ accounts: { retrieveCurrent: async () => ({ id: accountRef }) } }),
  });
  const nonce = await form(handler);
  assert.equal((await handler(post(nonce, 'rk_live_fixturekey12345678'))).status, 400);
  assert.equal((await handler(post(nonce, key, 'https://outside.example'))).status, 403);
  assert.equal((await handler(post('wrong'))).status, 400);
  const result = await handler(post(nonce));
  assert.equal(result.status, 200);
  assert.ok(!(await result.text()).includes(key));
  assert.deepEqual(writes, [
    { secretKey: key, accountRef, connectionState: 'api_verified_webhook_pending' },
  ]);
  assert.equal((await handler(post(nonce))).status, 400);
  const wrong = stripeTestConnectionHandler({
    origin,
    accountRef,
    save: async () => assert.fail('must not save'),
    clientFactory: () => ({ accounts: { retrieveCurrent: async () => ({ id: 'acct_other' }) } }),
  });
  assert.equal((await wrong(post(await form(wrong)))).status, 400);
});
test('simultaneous input cannot unlock another request or save more than one credential', async () => {
  let complete,
    calls = 0,
    writes = 0;
  const handler = stripeTestConnectionHandler({
    origin,
    accountRef,
    save: async () => writes++,
    clientFactory: () => ({
      accounts: {
        retrieveCurrent: async () => {
          calls++;
          return new Promise((r) => {
            complete = r;
          });
        },
      },
    }),
  });
  const nonce = await form(handler);
  const first = handler(post(nonce));
  await new Promise((r) => setTimeout(r, 0));
  assert.equal((await handler(post(nonce))).status, 400);
  assert.equal((await handler(post(nonce))).status, 400);
  assert.equal(calls, 1);
  complete({ id: accountRef });
  assert.equal((await first).status, 200);
  assert.equal(writes, 1);
});
test('real sandbox account identity must be checked; fixture clients cannot claim verified Stripe TEST', async () => {
  const adapter = new StripeCheckoutAdapter({
    environment: 'sandbox',
    accountRef,
    apiKey: key,
    webhookSecret: 'whsec_fixture',
    client: { accounts: { retrieveCurrent: async () => ({ id: 'acct_other' }) } },
  });
  await assert.rejects(adapter.verifyAccount(), /stripe_account_not_verified/);
  adapter.client.accounts.retrieveCurrent = async () => ({ id: accountRef });
  assert.deepEqual(await adapter.verifyAccount(), { ready: true, id: accountRef, verified: true });
  const fixture = new StripeCheckoutAdapter({
    environment: 'sandbox',
    accountRef,
    webhookSecret: 'whsec_fixture',
    client: {},
  });
  assert.equal((await fixture.verifyAccount()).verified, false);
});
