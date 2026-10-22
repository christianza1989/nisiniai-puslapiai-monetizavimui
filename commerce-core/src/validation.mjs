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
export function normalizeChoices(value) {
  if (value === undefined) return {};
  requireValue(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length <= 8 &&
      Object.entries(value).every(
        ([k, v]) =>
          identifier(k) && identifier(v) && !['__proto__', 'constructor', 'prototype'].includes(k),
      ),
    'invalid_product_choices',
  );
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
}
export const cartLineKey = (line) => line.sku + ':' + canonical(normalizeChoices(line.choices));
export function normalizeCart(lines) {
  requireValue(Array.isArray(lines) && lines.length > 0 && lines.length <= 20, 'invalid_cart');
  const combined = new Map(),
    totals = new Map();
  for (const line of lines) {
    requireValue(identifier(line?.sku) && integer(line.quantity, 1, 100), 'invalid_cart_line');
    const choices = normalizeChoices(line.choices),
      key = cartLineKey(line);
    const total = (totals.get(line.sku) || 0) + line.quantity;
    requireValue(total <= 100, 'quantity_limit');
    totals.set(line.sku, total);
    combined.set(key, {
      sku: line.sku,
      quantity: (combined.get(key)?.quantity || 0) + line.quantity,
      ...(Object.keys(choices).length ? { choices } : {}),
    });
  }
  return [...combined.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, line]) => line);
}
const text = (value, min, max) =>
  typeof value === 'string' &&
  value.trim().length >= min &&
  value.trim().length <= max &&
  !/[\x00-\x1f\x7f]/.test(value);
export function customerSnapshot(input, country, delivery) {
  requireValue(input && typeof input === 'object' && !Array.isArray(input), 'customer_required');
  requireValue(text(input.name, 2, 120), 'invalid_customer_name');
  requireValue(
    text(input.email, 3, 254) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()),
    'invalid_customer_email',
  );
  requireValue(
    typeof input.phone === 'string' && /^\+[1-9][0-9]{6,14}$/.test(input.phone),
    'invalid_customer_phone',
  );
  const selected =
    delivery.kind === 'locker'
      ? delivery.lockers?.find((l) => l.id === input.lockerId && l.country === country)
      : null;
  if (delivery.kind === 'locker') requireValue(selected, 'locker_not_enabled');
  const address = selected?.address
    ? {
        country: selected.country,
        line1: selected.address,
        city: selected.city,
        postalCode: selected.postalCode,
      }
    : input.address;
  requireValue(
    address &&
      address.country === country &&
      text(address.line1, 2, 150) &&
      text(address.city, 1, 100) &&
      text(address.postalCode, 2, 20) &&
      (address.line2 === undefined || text(address.line2, 0, 150)),
    'invalid_delivery_address',
  );
  const patterns = {
    LT: /^(?:LT-)?\d{5}$/,
    PL: /^\d{2}-\d{3}$/,
    LV: /^(?:LV-)?\d{4}$/,
    EE: /^\d{5}$/,
  };
  requireValue(
    !patterns[country] || patterns[country].test(address.postalCode.trim()),
    'invalid_postal_code',
  );
  const result = {
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone,
    address: {
      country,
      line1: address.line1.trim(),
      line2: address.line2?.trim() || '',
      city: address.city.trim(),
      postalCode: address.postalCode.trim(),
    },
  };
  if (input.isCompany === true) {
    requireValue(text(input.companyCode, 3, 40), 'invalid_customer_company');
    result.isCompany = true;
    result.companyCode = input.companyCode.trim();
    if (input.contactName !== undefined) {
      requireValue(text(input.contactName, 2, 120), 'invalid_customer_company');
      result.contactName = input.contactName.trim();
    }
    if (input.vatCode !== undefined) {
      requireValue(text(input.vatCode, 3, 40), 'invalid_customer_company');
      result.vatCode = input.vatCode.trim();
    }
  }
  if (delivery.kind === 'locker') {
    const locker = delivery.lockers?.find((l) => l.id === input.lockerId && l.country === country);
    requireValue(locker, 'locker_not_enabled');
    result.locker = {
      id: locker.id,
      label: locker.label,
      country: locker.country,
      ...(locker.address
        ? { address: locker.address, city: locker.city, postalCode: locker.postalCode }
        : {}),
    };
    if (locker.courier !== undefined || locker.providerId !== undefined) {
      requireValue(
        identifier(locker.courier) && text(locker.providerId, 1, 100),
        'locker_not_enabled',
      );
      result.locker.courier = locker.courier;
      result.locker.providerId = locker.providerId;
    }
  } else requireValue(input.lockerId === undefined, 'locker_not_enabled');
  return result;
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
          m &&
          /^[A-Z]{2}$/.test(m.country) &&
          /^[A-Z]{3}$/.test(m.currency) &&
          identifier(m.policyVersion) &&
          Array.isArray(m.delivery) &&
          m.delivery.length > 0 &&
          m.delivery.every(
            (d) =>
              d &&
              identifier(d.id) &&
              integer(d.amount) &&
              typeof d.label === 'string' &&
              d.label.length > 0 &&
              (d.kind === undefined || ['door', 'locker'].includes(d.kind)) &&
              (d.kind !== 'locker' ||
                (Array.isArray(d.lockers) &&
                  d.lockers.length > 0 &&
                  d.lockers.every(
                    (l) =>
                      l && identifier(l.id) && l.country === m.country && text(l.label, 1, 200),
                  ) &&
                  new Set(d.lockers.map((l) => l.id)).size === d.lockers.length)),
          ) &&
          new Set(m.delivery.map((d) => d.id)).size === m.delivery.length,
      ),
    'invalid_markets',
  );
  for (const market of store.markets)
    for (const d of market.delivery) {
      if (d.senderMode !== undefined) {
        const origin = store.dispatchLockers?.[d.courier];
        requireValue(
          d.senderMode === 'locker' &&
            d.kind === 'locker' &&
            d.maxParcels === 1 &&
            identifier(d.courier) &&
            origin?.courier === d.courier &&
            origin.country === 'LT' &&
            d.lockers.every(
              (l) =>
                l.courier === d.courier &&
                identifier(l.id) &&
                text(l.providerId, 1, 100) &&
                text(l.address, 2, 150) &&
                text(l.city, 1, 100) &&
                text(l.postalCode, 2, 20),
            ),
          'invalid_markets',
        );
      }
    }
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
      store.testOnly !== true &&
        store.productionAdmission?.approved === true &&
        store.requireCustomer === true,
      'production_not_admitted',
      403,
    );
  return store;
}
