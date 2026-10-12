import { readFileSync } from 'node:fs';
import { SendparcelAdapter } from './sendparcel-adapter.mjs';

// Explicit, private staging-only credentials. Browser session cookies are never read.
export function localShippingSandbox(path) {
  let config;
  try {
    config = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    throw new Error('shipping_sandbox_configuration_unreadable');
  }
  return new SendparcelAdapter({ ...config, environment: 'sandbox' });
}
