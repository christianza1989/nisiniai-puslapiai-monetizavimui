import { readFileSync } from 'node:fs';
import { SendparcelAdapter } from './sendparcel-adapter.mjs';
import { ProviderPacing } from './provider-pacing.mjs';

// Explicit, private staging-only credentials. Browser session cookies are never read.
export function localShippingSandbox(path, db) {
  let config;
  try {
    config = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    throw new Error('shipping_sandbox_configuration_unreadable');
  }
  return new SendparcelAdapter({
    ...config,
    rateLimiter: new ProviderPacing(db),
    environment: 'sandbox',
  });
}
