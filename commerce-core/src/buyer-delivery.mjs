import {
  requireValue,
  identifier,
  normalizeCart,
  canonical,
  digest,
  integer,
} from './validation.mjs';
import { planParcels } from './parcels.mjs';
export function deliveryFingerprint(input) {
  const address = input.customer?.address;
  requireValue(
    address &&
      address.country === input.country &&
      typeof address.city === 'string' &&
      address.city.trim().length >= 1 &&
      address.city.length <= 100 &&
      typeof address.postalCode === 'string' &&
      address.postalCode.trim().length >= 2 &&
      address.postalCode.length <= 20 &&
      !/[\x00-\x1f\x7f]/.test(address.city + address.postalCode),
    'invalid_delivery_address',
  );
  return digest(
    canonical({
      lines: normalizeCart(input.lines),
      country: input.country,
      currency: input.currency,
      deliveryId: input.deliveryId,
      city: address.city.trim(),
      postalCode: address.postalCode.trim(),
      isCompany: input.customer.isCompany === true,
    }),
  );
}
export class BuyerDeliveryQuotes {
  constructor(service) {
    this.s = service;
  }
  async create(store, env, input, adapter, quoteOptions = {}) {
    const config = await this.s.store(store, env);
    requireValue(identifier(input?.id), 'invalid_delivery_quote_id');
    requireValue(
      adapter?.environment === env &&
        adapter.accountRef === config.shippingAccountRef &&
        adapter.quote,
      'carrier_quotes_not_connected',
      503,
    );
    const requestHash = await deliveryFingerprint(input);
    const old = await this.s.one(
      'SELECT * FROM buyer_delivery_quotes WHERE store_id=? AND id=?',
      store,
      input.id,
    );
    if (old) {
      requireValue(
        old.environment === env &&
          old.request_hash === requestHash &&
          old.expires_at > this.s.now(),
        'delivery_quote_conflict',
        409,
      );
      return { id: old.id, ...JSON.parse(old.payload_json).public, replayed: true };
    }
    const method = config.markets
      .find((m) => m.country === input.country && m.currency === input.currency)
      ?.delivery.find((d) => d.id === input.deliveryId);
    requireValue(
      method?.pricing === 'carrier' &&
        method.enabled !== false &&
        Array.isArray(method.serviceIds) &&
        method.serviceIds.length > 0 &&
        method.serviceIds.every(identifier),
      'delivery_not_enabled',
    );
    const base = await this.s.quote(store, env, input, { ...quoteOptions, draftDelivery: true });
    const packages = planParcels({ snapshot: base }, { mode: 'individual' });
    requireValue(
      config.dispatch?.country === 'LT' &&
        config.dispatch.city &&
        config.dispatch.postalCode &&
        base.currency === 'EUR',
      'shipping_origin_not_found',
      503,
    );
    const offers = await adapter.quote({
      sender: { ...config.dispatch, isCompany: config.dispatch.isCompany !== false },
      recipient: {
        country: input.country,
        city: input.customer.address.city.trim(),
        postalCode: input.customer.address.postalCode.trim(),
        isCompany: input.customer.isCompany === true,
      },
      parcels: packages.parcels,
      value: base.amount,
      currency: base.currency,
    });
    const selected = offers
      .filter(
        (o) =>
          method.serviceIds.includes(o.serviceId) &&
          o.currency === base.currency &&
          integer(o.amount, 1),
      )
      .sort((a, b) => a.amount - b.amount || a.serviceId.localeCompare(b.serviceId))[0];
    requireValue(selected, 'carrier_offer_unavailable', 409);
    const publicQuote = {
      deliveryId: input.deliveryId,
      amount: selected.amount,
      currency: selected.currency,
      label: selected.name,
      expiresAt: this.s.now() + 300000,
    };
    const payload = {
      public: publicQuote,
      providerServiceId: selected.serviceId,
      provider: adapter.provider,
      accountRef: adapter.accountRef,
      packageMode: 'individual',
      itemsHash: await digest(canonical(base.lines)),
      dispatchHash: await digest(canonical(config.dispatch)),
      providerExpiresAt: null,
    };
    await this.s
      .stmt(
        'INSERT OR IGNORE INTO buyer_delivery_quotes VALUES(?,?,?,?,?,?,?)',
        store,
        input.id,
        env,
        requestHash,
        JSON.stringify(payload),
        publicQuote.expiresAt,
        this.s.now(),
      )
      .run();
    const stored = await this.s.one(
      'SELECT * FROM buyer_delivery_quotes WHERE store_id=? AND id=?',
      store,
      input.id,
    );
    requireValue(stored.request_hash === requestHash, 'delivery_quote_conflict', 409);
    return { id: stored.id, ...JSON.parse(stored.payload_json).public, replayed: false };
  }
}
