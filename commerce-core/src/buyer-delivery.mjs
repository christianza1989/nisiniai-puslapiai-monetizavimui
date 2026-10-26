import {
  requireValue,
  identifier,
  normalizeCart,
  canonical,
  digest,
  integer,
} from './validation.mjs';
import { configuredDispatch, selectedLocker, lockerLocation } from './delivery-lockers.mjs';
import { planParcels, customerPricedParcel, shipmentPart } from './parcels.mjs';
export function deliveryFingerprint(input, method) {
  const address =
    method?.kind === 'locker' && method.senderMode === 'locker'
      ? lockerLocation(selectedLocker(method, input.customer?.lockerId))
      : input.customer?.address;
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
      ...(input.customer?.lockerId ? { lockerId: input.customer.lockerId } : {}),
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
    const method = config.markets
      .find((m) => m.country === input.country && m.currency === input.currency)
      ?.delivery.find((d) => d.id === input.deliveryId);
    const dispatch = configuredDispatch(config, method);
    const requestHash = await deliveryFingerprint(input, method);
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
    requireValue(
      method?.pricing === 'carrier' &&
        method.enabled !== false &&
        Array.isArray(method.serviceIds) &&
        method.serviceIds.length > 0 &&
        method.serviceIds.every(identifier),
      'delivery_not_enabled',
    );
    // Shipping is priced from the actual parcels/gross product facts. Applying
    // or removing a promotion must not change this independent quote identity.
    const base = await this.s.quote(
      store,
      env,
      { ...input, discountCode: undefined },
      { ...quoteOptions, draftDelivery: true },
    );
    const packages = planParcels({ snapshot: base }, { mode: 'individual' });
    requireValue(
      config.dispatch?.country === 'LT' &&
        config.dispatch.city &&
        config.dispatch.postalCode &&
        base.currency === 'EUR',
      'shipping_origin_not_found',
      503,
    );
    const singleCharge = method.customerCharge === 'single_parcel';
    if (!singleCharge && (method.kind === 'locker' || dispatch?.locker))
      requireValue(
        packages.parcels.length <= (method.maxParcels ?? 1),
        'carrier_locker_parcel_limit',
        409,
      );
    const target =
      method.senderMode === 'locker'
        ? lockerLocation(selectedLocker(method, input.customer?.lockerId))
        : input.customer.address;
    const chargedPart = singleCharge
      ? shipmentPart(
          { snapshot: base },
          { ...packages, value: base.amount },
          customerPricedParcel(packages).index,
        )
      : { parcels: packages.parcels, value: base.amount };
    const offers = await adapter.quote({
      sender: { ...dispatch, isCompany: dispatch.isCompany !== false },
      recipient: {
        country: input.country,
        city: target.city.trim(),
        postalCode: target.postalCode.trim(),
        isCompany: input.customer.isCompany === true,
      },
      parcels: chargedPart.parcels,
      value: chargedPart.value,
      currency: base.currency,
    });
    const selected = offers
      .filter(
        (o) =>
          method.serviceIds.includes(o.serviceId) &&
          (method.senderMode !== 'locker' ||
            (o.senderAddressType === method.courier.toUpperCase() &&
              o.recipientAddressType === method.courier.toUpperCase())) &&
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
      ...(singleCharge
        ? {
            customerCharge: 'single_parcel',
            pricedParcelIndex: chargedPart.parcelIndex,
            totalParcels: packages.parcels.length,
          }
        : {}),
      itemsHash: await digest(canonical(base.lines)),
      dispatchHash: await digest(canonical(dispatch)),
      ...(method.senderMode === 'locker' ? { dispatch } : {}),
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
