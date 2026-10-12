import { SendparcelAdapter } from './sendparcel-adapter.mjs';
import { requireValue, integer, canonical } from './validation.mjs';
import { completeSender } from './shipment-commands.mjs';
const text = (value) =>
  typeof value === 'string' &&
  value.length >= 3 &&
  value.length <= 500 &&
  !/[\x00-\x1f\x7f]/.test(value);
export class SendparcelBookingAdapter extends SendparcelAdapter {
  constructor(options) {
    super(options);
    const a = options.bookingAdmission;
    // A key alone is insufficient. The currently published create response has
    // no amount and cannot prove a cost ceiling, reference or idempotency.
    requireValue(
      a?.approved === true &&
        a.protocol === 'legacy_single_attempt' &&
        text(a.contractReference) &&
        a.costCeilingGuaranteed === true &&
        Array.isArray(a.serviceIds) &&
        a.serviceIds.length > 0 &&
        a.serviceIds.every((id) => typeof id === 'string' && /^\d{1,12}$/.test(id)) &&
        (!a.lockerBindings ||
          (typeof a.lockerBindings === 'object' &&
            !Array.isArray(a.lockerBindings) &&
            Object.values(a.lockerBindings).every((v) => ['address2', 'terminalid'].includes(v)))),
      'carrier_booking_contract_missing',
      503,
    );
    this.admission = a;
    this.supportsBooking = true;
    this.supportsIdempotentCreate = false;
  }
  allowedPaths() {
    return { ...super.allowedPaths(), '/rest-api/orders/creates': 'POST' };
  }
  async validateCost(payload) {
    this.address(payload.sender);
    this.address(payload.recipient);
    if (!this.admission.serviceIds.includes(payload.serviceId)) return false;
    const offers = await this.quote(payload);
    return offers.some(
      (o) =>
        o.serviceId === payload.serviceId &&
        o.currency === payload.currency &&
        o.amount <= payload.maxCost,
    );
  }
  address(input) {
    requireValue(completeSender(input), 'shipment_sender_incomplete');
    const result = {
      name: input.name,
      country: input.country,
      city: input.city,
      postal_code: input.postalCode,
      address1: input.line1,
      phone: input.phone,
      email: input.email,
      ...(input.line2 ? { address2: input.line2 } : {}),
      ...(input.isCompany
        ? {
            companyName: input.companyName || input.name,
            ...(input.companyCode ? { companyEcode: input.companyCode } : {}),
          }
        : {}),
    };
    if (input.locker) {
      const field = this.admission.lockerBindings?.[input.locker.courier];
      requireValue(
        field &&
          this.admission.lockerVerificationFields?.[input.locker.courier] === field &&
          input.locker.providerId,
        'carrier_locker_booking_not_admitted',
        503,
      );
      result[field] = input.locker.providerId;
    }
    return result;
  }
  async createBooking(payload) {
    requireValue(
      payload.currency === 'EUR' &&
        integer(payload.value, 1) &&
        integer(payload.maxCost, 1) &&
        this.admission.serviceIds.includes(payload.serviceId),
      'invalid_shipment_command',
    );
    const request = {
      packageType: 'c_deze',
      product_id: payload.serviceId,
      contents: 'Hand casting kits',
      value: payload.value / 100,
      shipper: this.address(payload.sender),
      recipient: this.address(payload.recipient),
      parcels: payload.parcels.map((p) => ({
        weight: p.weightGrams / 1000,
        length: p.dimensionsMm[0] / 10,
        width: p.dimensionsMm[1] / 10,
        height: p.dimensionsMm[2] / 10,
      })),
    };
    const row = await this.request('/rest-api/orders/creates', { orderCreate: request });
    return this.fact(row);
  }
  fact(row) {
    requireValue(
      /^\d{1,12}$/.test(String(row.id)) &&
        integer(row.status, 0, 4) &&
        row.status !== 4 &&
        Array.isArray(row.parcels),
      'shipment_response_invalid',
      502,
    );
    const address = (a) => ({
      name: a?.name,
      country: a?.country,
      city: a?.city,
      line1: a?.address1,
      line2: a?.address2 || '',
      terminalId: a?.terminalid === undefined ? null : String(a.terminalid),
      postalCode: a?.postal_code,
      phone: a?.phone,
    });
    return {
      id: String(row.id),
      providerStatus: row.status,
      sender: address(row.shipper),
      recipient: address(row.recipient),
      parcels: row.parcels.map((p) => ({
        weightGrams: Math.round(p.weight * 1000),
        dimensionsMm: [p.length, p.width, p.height].map((n) => Math.round(n * 10)),
      })),
      tracking: row.tracking_number || undefined,
      costVerifiedByResponse: false,
    };
  }
  async bookingInformation(id) {
    return this.fact(await this.information(id));
  }
  verifyBooking(payload, fact) {
    const comparable = (a) => ({
      name: a.name,
      country: a.country,
      city: a.city,
      line1: a.line1,
      line2: a.line2 || '',
      postalCode: a.postalCode.replace(/^(LT-|LV-)/, ''),
      phone: a.phone,
    });
    try {
      let recipient = payload.recipient;
      if (recipient.locker) {
        const field = this.admission.lockerBindings?.[recipient.locker.courier];
        if (this.admission.lockerVerificationFields?.[recipient.locker.courier] !== field)
          return false;
        if (field === 'terminalid' && fact.recipient.terminalId !== recipient.locker.providerId)
          return false;
        if (field === 'address2') recipient = { ...recipient, line2: recipient.locker.providerId };
      }
      return (
        canonical(comparable(payload.sender)) === canonical(comparable(fact.sender)) &&
        canonical(comparable(recipient)) === canonical(comparable(fact.recipient)) &&
        canonical(
          payload.parcels.map((p) => ({
            weightGrams: p.weightGrams,
            dimensionsMm: p.dimensionsMm,
          })),
        ) === canonical(fact.parcels)
      );
    } catch {
      return false;
    }
  }
}
