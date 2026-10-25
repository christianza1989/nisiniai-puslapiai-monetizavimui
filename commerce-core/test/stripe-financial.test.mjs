import test from 'node:test';
import assert from 'node:assert/strict';
import { StripeCheckoutAdapter } from '../src/stripe-adapter.mjs';
const adapter = (client) =>
  new StripeCheckoutAdapter({
    environment: 'production',
    accountRef: 'acct_fixture',
    webhookSecret: 'fixture',
    client,
  });
test('production Stripe admission uses the key-owning account, not a supplied label or retrievable other account', async () => {
  const a = adapter({
    accounts: { retrieveCurrent: async () => ({ id: 'acct_other', charges_enabled: true }) },
  });
  assert.equal(await a.isReady(), false);
  await assert.rejects(a.verifyAccount(), /stripe_account_not_verified/);
  const b = adapter({
    accounts: { retrieveCurrent: async () => ({ id: 'acct_fixture', charges_enabled: false }) },
  });
  assert.equal(await b.isReady(), false);
});
test('Stripe financial page separates actual gross/fee facts, binds charge to PaymentIntent and rejects unsupported or inconsistent net data', async () => {
  let page = {
    data: [
      {
        id: 'txn_fixture',
        type: 'charge',
        source: 'ch_fixture',
        amount: 3200,
        fee: 73,
        net: 3127,
        currency: 'eur',
        created: 1791799200,
      },
    ],
    has_more: false,
  };
  const a = adapter({
    accounts: { retrieveCurrent: async () => ({ id: 'acct_fixture', charges_enabled: true }) },
    balanceTransactions: { list: async () => page },
    charges: {
      retrieve: async () => ({
        id: 'ch_fixture',
        paid: true,
        currency: 'eur',
        payment_intent: 'pi_fixture',
        amount_captured: 3200,
      }),
    },
  });
  const result = await a.financialPage();
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].transactionRef, 'pi_fixture');
  assert.equal(result.rows[1].amount, -73);
  assert.equal(
    result.rows.reduce((n, r) => n + r.amount, 0),
    3127,
  );
  page = { ...page, data: [{ ...page.data[0], net: 3199 }] };
  await assert.rejects(a.financialPage(), /stripe_financial_response_invalid/);
  page = { ...page, data: [{ ...page.data[0], net: 3127, type: 'adjustment' }] };
  await assert.rejects(a.financialPage(), /stripe_financial_type_requires_review/);
});
