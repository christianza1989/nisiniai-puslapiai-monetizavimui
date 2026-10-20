import { digest, identifier, integer } from './validation.mjs';

export const OPERATOR_GRANTS = [
  'read',
  'stock',
  'catalog',
  'document',
  'pack',
  'ship',
  'finance',
  'wholesale',
  'refund',
  'operate',
  'restore',
];
export const OPERATOR_MAX_LIFETIME_MS = 8 * 3600000;
export function operatorGrantAllows(record, store, action, at) {
  return Boolean(
    record &&
    identifier(record.id) &&
    OPERATOR_GRANTS.includes(action) &&
    record.storeId === store.id &&
    record.environment === store.environment &&
    record.legalEntityId === store.legalEntityId &&
    integer(record.issuedAt, 0, 9999999999999) &&
    integer(record.expiresAt, 0, 9999999999999) &&
    record.issuedAt <= at &&
    record.expiresAt > at &&
    record.expiresAt > record.issuedAt &&
    record.expiresAt - record.issuedAt <= OPERATOR_MAX_LIFETIME_MS &&
    Array.isArray(record.permissions) &&
    record.permissions.includes(action) &&
    record.permissions.every((g) => OPERATOR_GRANTS.includes(g)) &&
    record.revoked !== true,
  );
}
const bytes = (hex) => Uint8Array.from(hex.match(/../g), (v) => parseInt(v, 16));
async function equalHash(candidate, expected) {
  if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected)) return false;
  const a = bytes(candidate),
    b = bytes(expected);
  if (typeof crypto.subtle.timingSafeEqual === 'function')
    return crypto.subtle.timingSafeEqual(a, b);
  // Standard WebCrypto verify provides the portable constant-time comparison.
  // The public zero key authenticates no principal; only equality of SHA256 bytes.
  const key = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(32),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, a);
  return crypto.subtle.verify('HMAC', key, signature, b);
}

// Adapter for credentials/memberships admitted by the shared core. It does not
// create accounts or infer verified identity from an email or browser request.
export function coreOperatorAuthorize(load, now = () => Date.now()) {
  return async (request, store, action) => {
    const token = request.headers
      .get('authorization')
      ?.match(/^Bearer ([a-zA-Z0-9_-]{32,128})$/)?.[1];
    if (!token || !OPERATOR_GRANTS.includes(action)) return false;
    const records = await load();
    if (!Array.isArray(records) || records.length > 128) return false;
    const hash = await digest(token),
      at = now();
    const admitted = [];
    for (const record of records) {
      if (!operatorGrantAllows(record, store, action, at)) continue;
      if (await equalHash(hash, record.tokenHash)) admitted.push(record);
    }
    // Ambiguous credentials cannot choose a principal from source order.
    if (admitted.length !== 1) return false;
    const record = admitted[0];
    return {
      id: record.id,
      storeId: store.id,
      legalEntityId: store.legalEntityId,
      environment: store.environment,
      permissions: [...record.permissions],
    };
  };
}
