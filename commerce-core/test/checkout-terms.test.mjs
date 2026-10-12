import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTermsLink } from '../public/checkout-ui.mjs';
test('terms resolver binds selected market/version and refuses missing or foreign links instead of silently accepting unrelated terms', () => {
  const versions = { LT: 'lt_approved', PL: 'pl_approved' };
  const paths = { LT: '/pirkimo-taisykles', PL: '/pl/warunki-zakupu' };
  const resolver = ({ country, policyVersion }) =>
    versions[country] === policyVersion ? paths[country] : null;
  assert.equal(
    resolveTermsLink(
      resolver,
      { country: 'LT', language: 'lt', policyVersion: 'lt_approved' },
      'https://memocasting.lt',
    ),
    paths.LT,
  );
  assert.equal(
    resolveTermsLink(
      resolver,
      { country: 'PL', language: 'lt', policyVersion: 'pl_approved' },
      'https://memocasting.lt',
    ),
    paths.PL,
  );
  assert.equal(
    resolveTermsLink(
      resolver,
      { country: 'PL', language: 'pl', policyVersion: 'old_version' },
      'https://memocasting.lt',
    ),
    null,
  );
  for (const input of [
    '',
    undefined,
    () => undefined,
    () => {
      throw Error('missing');
    },
    'https://foreign.example/terms',
    'javascript:alert(1)',
    'https://user:pass@memocasting.lt/terms',
  ])
    assert.equal(
      resolveTermsLink(
        input,
        { country: 'LT', language: 'lt', policyVersion: 'x' },
        'https://memocasting.lt',
      ),
      null,
    );
  assert.equal(
    resolveTermsLink('/terms?v=2#rules', {}, 'https://memocasting.lt'),
    '/terms?v=2#rules',
  );
});
