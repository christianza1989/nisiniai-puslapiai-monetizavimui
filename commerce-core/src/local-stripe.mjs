import { readFileSync } from 'node:fs';
import { requireValue } from './validation.mjs';
import { StripeCheckoutAdapter } from './stripe-adapter.mjs';

// Explicit, private local development configuration. Never imported by the Worker.
export function localStripeSandbox(path) {
  let config;
  try {
    config = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    throw new Error('stripe_sandbox_configuration_unreadable');
  }
  requireValue(
    typeof config.secretKey === 'string' &&
      /^(?:sk|rk|rkcs)_test_[A-Za-z0-9]+$/.test(config.secretKey) &&
      /^acct_[A-Za-z0-9]+$/.test(config.accountRef) &&
      /^whsec_[A-Za-z0-9]+$/.test(config.webhookSecret),
    'stripe_sandbox_configuration_invalid',
  );
  return new StripeCheckoutAdapter({
    apiKey: config.secretKey,
    accountRef: config.accountRef,
    webhookSecret: config.webhookSecret,
    environment: 'sandbox',
  });
}
