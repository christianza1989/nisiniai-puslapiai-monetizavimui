export class CommerceError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
export const requireValue = (condition, code, status = 400) => {
  if (!condition) throw new CommerceError(code, status);
};
export const integer = (value, min = 0, max = 100000000) =>
  Number.isSafeInteger(value) && value >= min && value <= max;
export function identifier(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
}
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.keys(value)
        .sort()
        .map((k) => JSON.stringify(k) + ':' + canonical(value[k]))
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
}
export async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}
export function normalizeCart(lines) {
  requireValue(Array.isArray(lines) && lines.length > 0 && lines.length <= 20, 'invalid_cart');
  const combined = new Map();
  for (const line of lines) {
    requireValue(identifier(line?.sku) && integer(line.quantity, 1, 100), 'invalid_cart_line');
    const quantity = (combined.get(line.sku) || 0) + line.quantity;
    requireValue(quantity <= 100, 'quantity_limit');
    combined.set(line.sku, quantity);
  }
  return [...combined]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sku, quantity]) => ({ sku, quantity }));
}
export function validateStore(store) {
  requireValue(identifier(store?.id) && identifier(store.legalEntityId), 'invalid_store');
  requireValue(['sandbox', 'production'].includes(store.environment), 'invalid_environment');
  requireValue(store.enabled === false || store.enabled === true, 'invalid_admission');
  requireValue(
    Array.isArray(store.hosts) &&
      store.hosts.length > 0 &&
      store.hosts.every((h) => /^[a-z0-9.-]+(?::[0-9]+)?$/.test(h)),
    'invalid_hosts',
  );
  requireValue(
    Array.isArray(store.markets) &&
      store.markets.length > 0 &&
      store.markets.every(
        (m) =>
          /^[A-Z]{2}$/.test(m.country) &&
          /^[A-Z]{3}$/.test(m.currency) &&
          identifier(m.policyVersion) &&
          Array.isArray(m.delivery) &&
          m.delivery.length > 0 &&
          m.delivery.every(
            (d) =>
              identifier(d.id) &&
              integer(d.amount) &&
              typeof d.label === 'string' &&
              d.label.length > 0,
          ) &&
          new Set(m.delivery.map((d) => d.id)).size === m.delivery.length,
      ),
    'invalid_markets',
  );
  requireValue(
    new Set(store.markets.map((m) => m.country)).size === store.markets.length,
    'duplicate_market',
  );
  requireValue(
    typeof store.legalSnapshot?.name === 'string' && store.legalSnapshot.name.length > 0,
    'legal_snapshot_missing',
  );
  if (store.environment === 'production')
    requireValue(
      store.testOnly !== true && store.productionAdmission?.approved === true,
      'production_not_admitted',
      403,
    );
  return store;
}
