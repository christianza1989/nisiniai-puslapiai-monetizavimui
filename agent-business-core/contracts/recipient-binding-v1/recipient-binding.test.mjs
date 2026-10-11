import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { canonicalNativeEmail, createRecipientCodec } from './recipient-binding.mjs';
const vector = JSON.parse(await fs.readFile(new URL('./recipient-vector.json', import.meta.url), 'utf8'));
const config = { secret: Uint8Array.from(vector.key_hex.match(/../g), value => parseInt(value, 16)),
  scope: vector.scope, adapterId: vector.adapter_id, keyId: vector.key_id };
const input = { invitationRef: vector.invitation_ref, challengeNonce: vector.challenge_nonce,
  canonicalRecipient: vector.cases[0].canonical_email };

test('actual native JS canonical bytes and Web Crypto match all Python vectors', async () => {
  const codec = await createRecipientCodec(config);
  for (const value of vector.cases) {
    assert.equal(canonicalNativeEmail(value.native_input), value.canonical_email);
    const fields = { ...input, canonicalRecipient: value.canonical_email };
    assert.equal(new TextDecoder().decode(codec.bytes(fields)), value.input_utf8);
    assert.equal(await codec.digest(fields), value.recipient_digest);
    assert.equal(await codec.matches(fields, value.recipient_digest), true);
  }
  assert.notEqual(canonicalNativeEmail('a.b@example.test'), canonicalNativeEmail('ab@example.test'));
  assert.throws(() => canonicalNativeEmail(false));
});
test('recipient MAC separates binding inputs and registered scope/key', async () => {
  const codec = await createRecipientCodec(config), digest = await codec.digest(input);
  for (const change of [{ canonicalRecipient: 'other@example.test' }, { invitationRef: 'J'.repeat(32) },
    { challengeNonce: 'D'.repeat(32) }]) assert.equal(await codec.matches({ ...input, ...change }, digest), false);
  for (const change of [{ keyId: 'other-key' }, { adapterId: 'other-native' },
    { scope: { ...config.scope, business_id: 'other-business' } },
    { scope: { ...config.scope, environment_class: 'production' } }])
    assert.equal(await (await createRecipientCodec({ ...config, ...change })).matches(input, digest), false);
});
test('invalid inputs and final-newline metadata fail closed', async () => {
  await assert.rejects(createRecipientCodec({ ...config, secret: new Uint8Array(31) }));
  await assert.rejects(createRecipientCodec({ ...config, keyId: config.keyId + '\n' }));
  const codec = await createRecipientCodec(config);
  for (const change of [{ invitationRef: input.invitationRef + '\n' },
    { challengeNonce: input.challengeNonce + '\n' }, { canonicalRecipient: '\ud800' }])
    await assert.rejects(codec.digest({ ...input, ...change }));
  assert.equal(await codec.matches(input, 'v1=' + 'A'.repeat(64)), false);
  assert.equal(await codec.matches(input, vector.cases[0].recipient_digest + '\n'), false);
});
