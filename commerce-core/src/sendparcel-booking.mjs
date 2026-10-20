import { SendparcelAdapter, sendparcelStatus } from './sendparcel-adapter.mjs';
import { requireValue, integer, canonical } from './validation.mjs';
import { completeSender } from './shipment-commands.mjs';
const text = (value) =>
  typeof value === 'string' &&
  value.length >= 3 &&
  value.length <= 500 &&
  !/[\x00-\x1f\x7f]/.test(value);
// Actual v1 infos transliterates LT street accents after create echoed them.
// Normalize only those letters; building/apartment digits and all other fields
// stay exact, and original inputs/provider responses remain unchanged.
const ltStreetLetters = Object.fromEntries(
  [...'ąčęėįšųūžĄČĘĖĮŠŲŪŽ'].map((letter, i) => [letter, 'aceeisuuzACEEISUUZ'[i]]),
);
const comparableStreet = (address) =>
  address.country === 'LT' && typeof address.line1 === 'string'
    ? address.line1.replace(/[ąčęėįšųūžĄČĘĖĮŠŲŪŽ]/g, (letter) => ltStreetLetters[letter])
    : address.line1;
const trackingCandidates = (values, count) =>
  Array.isArray(values) &&
  values.length === count &&
  values.every(
    (value) => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._/-]{2,199}$/.test(value),
  ) &&
  new Set(values).size === values.length
    ? [...values]
    : null;
export class SendparcelBookingAdapter extends SendparcelAdapter {
  constructor(options) {
    super(options);
    const a = options.bookingAdmission;
    // A key alone is insufficient. V1 fresh-quote pricing is supported without
    // pretending its create response proves an absolute final-charge ceiling.
    requireValue(
      a?.approved === true &&
        a.protocol === 'legacy_single_attempt' &&
        text(a.contractReference) &&
        (a.costCeilingGuaranteed === true || a.pricingProtocol === 'v1_fresh_quote_no_insurance') &&
        Array.isArray(a.serviceIds) &&
        a.serviceIds.length > 0 &&
        a.serviceIds.every((id) => typeof id === 'string' && /^\d{1,12}$/.test(id)) &&
        (!a.serviceCouriers ||
          (typeof a.serviceCouriers === 'object' &&
            !Array.isArray(a.serviceCouriers) &&
            Object.entries(a.serviceCouriers).every(
              ([id, courier]) =>
                /^\d{1,12}$/.test(id) && /^[A-Za-z][A-Za-z0-9]{1,30}$/.test(courier),
            ))) &&
        (!a.lockerBindings ||
          (typeof a.lockerBindings === 'object' &&
            !Array.isArray(a.lockerBindings) &&
            Object.values(a.lockerBindings).every((v) => ['address2', 'terminalid'].includes(v)))),
      'carrier_booking_contract_missing',
      503,
    );
    this.admission = a;
    this.costCeilingGuaranteed = a.costCeilingGuaranteed === true;
    this.pricingProtocol = this.costCeilingGuaranteed
      ? 'contractual_ceiling'
      : 'v1_fresh_quote_no_insurance';
    this.supportsBooking = true;
    this.supportsIdempotentCreate = false;
  }
  allowedPaths() {
    return { ...super.allowedPaths(), '/rest-api/orders/creates': 'POST' };
  }
  async validateCost(payload) {
    this.validateParcels(payload);
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
  validateParcels(payload) {
    requireValue(
      Array.isArray(payload.parcels) && integer(payload.parcels.length, 1, 100),
      'carrier_parcel_invalid',
    );
    for (const address of [payload.sender, payload.recipient]) {
      if (!address?.locker) continue;
      const limit =
        address.country === 'EE' &&
        address.locker.courier === 'dpd' &&
        this.admission.serviceCouriers?.[payload.serviceId] === 'dpd'
          ? 5
          : 1;
      requireValue(payload.parcels.length <= limit, 'carrier_locker_parcel_limit', 409);
    }
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
    this.validateParcels(payload);
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
    // No client reference, idempotency key, insurance or v2 quote ID is invented.
    const row = await this.request(
      '/rest-api/orders/creates',
      { orderCreate: request },
      {},
      256 * 1024,
    );
    return this.fact(row);
  }
  bookingDisposition(fact) {
    requireValue(sendparcelStatus(fact.providerStatus), 'shipment_response_invalid', 502);
    const providerState = {
      0: 'pending',
      1: 'processing',
      2: 'confirmed',
      3: 'rejected',
      4: 'canceled',
      5: 'unpaid',
      6: 'pending',
      8: 'payment_canceled',
    }[fact.providerStatus];
    const registered = [1, 2].includes(fact.providerStatus),
      pending = [0, 6].includes(fact.providerStatus);
    return {
      state: registered ? 'registered' : pending ? 'unknown' : 'review',
      reason: registered ? null : 'carrier_booking_' + providerState,
      providerState,
    };
  }
  fact(row) {
    requireValue(
      /^\d{1,12}$/.test(String(row.id)) &&
        sendparcelStatus(row.status) &&
        Array.isArray(row.parcels) &&
        integer(row.parcels.length, 1, 100),
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
    const numbers = row.parcels.map((p) => p.tracking_number ?? null);
    if (numbers.length === 1 && numbers[0] === null) numbers[0] = row.tracking_number ?? null;
    requireValue(
      numbers.every((n) => n === null || (typeof n === 'string' && text(n))),
      'shipment_response_invalid',
      502,
    );
    const trackingNumbers =
      numbers.every((n) => n !== null) && new Set(numbers).size === numbers.length ? numbers : null;
    const parcelCandidates = trackingCandidates(
      row.parcels.map((p) => p.tracking_number ?? null),
      row.parcels.length,
    );
    const singleOrderCandidate =
      row.parcels.length === 1 ? trackingCandidates([row.tracking_number], 1) : null;
    const csvCandidates =
      typeof row.tracking_number === 'string' &&
      row.tracking_number.length <= 20100 &&
      row.tracking_number.includes(',') &&
      !/[\x00-\x1f\x7f]/.test(row.tracking_number)
        ? trackingCandidates(
            row.tracking_number.split(',').map((value) => value.trim()),
            row.parcels.length,
          )
        : null;
    return {
      id: String(row.id),
      providerStatus: row.status,
      bookingState: this.bookingDisposition({ providerStatus: row.status }).providerState,
      sender: address(row.shipper),
      recipient: address(row.recipient),
      parcels: row.parcels.map((p) => ({
        weightGrams: Math.round(p.weight * 1000),
        dimensionsMm: [p.length, p.width, p.height].map((n) => Math.round(n * 10)),
      })),
      tracking: row.tracking_number || undefined,
      trackingNumbers,
      // Ordered provider reports are candidates, never proof of printed pages.
      trackingCandidates: parcelCandidates || singleOrderCandidate || csvCandidates,
      trackingCandidateSource: parcelCandidates
        ? 'parcel_fields'
        : singleOrderCandidate
          ? 'order_single'
          : csvCandidates
            ? 'order_csv'
            : null,
      // Durable private observation stores the actual response for reconciliation.
      providerResponse: row,
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
      line1: comparableStreet(a),
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
