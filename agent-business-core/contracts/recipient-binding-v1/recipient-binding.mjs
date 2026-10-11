// Server-only registered Madbeauty identity codec. No keys, routes or storage installed.
export const ADDRESS_RULE = 'madbeauty-email-v1-js-trim-lower';
export const MAC_DOMAIN = 'madbeauty-recipient-binding-v1';
export const RECIPIENT_VERSION = '0.1.0';
const encoder = new TextEncoder();
const fullMatch = (value, pattern) => typeof value === 'string' && value.match(pattern)?.[0] === value;
const identifier = value => fullMatch(value, /^[A-Za-z0-9_-]{1,100}$/);
const token = (value, max) => fullMatch(value, new RegExp(`^[A-Za-z0-9_-]{32,${max}}$`));
const hex = value => Array.from(new Uint8Array(value), byte => byte.toString(16).padStart(2, '0')).join('');

export function canonicalNativeEmail(email) {
  if (typeof email !== 'string') throw new TypeError('native_email_string_required');
  const value = email.trim().toLowerCase();
  if (value.length > 254 || !/^([^\s@]+)@([^\s@]+)\.([^\s@]+)$/.test(value))
    throw new TypeError('invalid_native_email');
  return value;
}

export async function createRecipientCodec({ secret, scope, adapterId, keyId }) {
  if (!(secret instanceof Uint8Array) || secret.byteLength < 32 || secret.byteLength > 1024)
    throw new TypeError('dedicated_recipient_key_required');
  if (!scope || Object.keys(scope).sort().join(',') !== 'business_id,environment_class,environment_id,site_id'
      || !['business_id', 'site_id', 'environment_id'].every(name => identifier(scope[name]))
      || !['test', 'production'].includes(scope.environment_class) || !identifier(adapterId) || !identifier(keyId))
    throw new TypeError('trusted_recipient_scope_required');
  const frozen = Object.freeze({ ...scope });
  const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  function bytes({ invitationRef, challengeNonce, canonicalRecipient }) {
    if (!token(invitationRef, 96) || !token(challengeNonce, 32) || typeof canonicalRecipient !== 'string'
        || !canonicalRecipient || encoder.encode(canonicalRecipient).length > 1024
        || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(canonicalRecipient))
      throw new TypeError('invalid_recipient_mac_input');
    return encoder.encode(JSON.stringify([MAC_DOMAIN, ADDRESS_RULE, frozen.business_id, frozen.site_id,
      frozen.environment_id, frozen.environment_class, adapterId, keyId, invitationRef, challengeNonce, canonicalRecipient]));
  }
  return Object.freeze({
    addressRule: ADDRESS_RULE,
    bytes,
    async digest(input) { return 'v1=' + hex(await crypto.subtle.sign('HMAC', key, bytes(input))); },
    async matches(input, digest) {
      if (typeof digest !== 'string' || !/^v1=[a-f0-9]{64}$/.test(digest) || digest.length !== 67) return false;
      try {
        return await crypto.subtle.verify('HMAC', key,
          Uint8Array.from(digest.slice(3).match(/../g), part => parseInt(part, 16)), bytes(input));
      } catch { return false; }
    },
  });
}
