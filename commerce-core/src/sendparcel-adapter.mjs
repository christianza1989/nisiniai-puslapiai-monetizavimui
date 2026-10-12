import { CommerceError, requireValue, integer, identifier } from './validation.mjs';

// Current official SP OpenAPI2.0.1, inspected 2026-10-12. This connector is
// sandbox/read-only until order-create price/idempotency contracts are verified.
const STAGING = 'https://staging.sendparcel.com';
export const SENDPARCEL_PRODUCTION = 'https://api.sendparcel.com';
const shortText = (v, max = 200) =>
  typeof v === 'string' && v.length > 0 && v.length <= max && !/[\x00-\x1f\x7f]/.test(v);
const optionalText = (v, max = 200) => v === undefined || v === '' || shortText(v, max);
const validDate = (v) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v)) return false;
  const iso = v.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) && d.toISOString().replace('.000', '') === iso;
};
export class SendparcelAdapter {
  constructor({
    environment,
    accountRef,
    apiPassword,
    accessToken,
    baseUrl = STAGING,
    productionReadAdmission,
    fetchImpl = (...args) => fetch(...args),
  }) {
    requireValue(
      (environment === 'sandbox' && baseUrl === STAGING) ||
        (environment === 'production' &&
          baseUrl === SENDPARCEL_PRODUCTION &&
          productionReadAdmission === true),
      'carrier_environment_not_admitted',
      403,
    );
    requireValue(
      identifier(accountRef) &&
        (apiPassword === undefined || (shortText(apiPassword, 500) && apiPassword.length >= 8)) &&
        typeof accessToken === 'string' &&
        accessToken.length <= 4096 &&
        /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(accessToken),
      'carrier_credentials_missing',
      503,
    );
    this.environment = environment;
    this.accountRef = accountRef;
    this.apiPassword = apiPassword;
    this.accessToken = accessToken;
    this.fetch = fetchImpl;
    this.provider = 'sendparcel';
    this.baseUrl = baseUrl;
    this.supportsIdempotentCreate = false;
    this.supportsBooking = false;
  }
  allowedPaths() {
    return {
      '/rest-api/quotes': 'POST',
      '/rest-api/returns/postboxes': 'POST',
      '/rest-api/services': 'GET',
      '/rest-api/orders/infos': 'POST',
      '/rest-api/orders/documents': 'POST',
      '/rest-api/tracks': 'POST',
    };
  }
  async request(path, body, query = {}, maxBytes = 5 * 1024 * 1024, timeoutMs = 15000) {
    const paths = this.allowedPaths();
    requireValue(paths[path], 'carrier_operation_not_admitted', 403);
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
    let response;
    try {
      response = await this.fetch(url, {
        method: paths[path],
        redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...(this.apiPassword ? { password: this.apiPassword } : {}),
          ...(this.accessToken ? { authorization: 'Bearer ' + this.accessToken } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new CommerceError('carrier_transport_failed', 503);
    }
    requireValue(response.ok, 'carrier_request_failed', 503);
    requireValue(
      response.headers.get('content-type')?.toLowerCase().includes('json'),
      'carrier_response_invalid',
      502,
    );
    const chunks = [];
    let size = 0;
    const reader = response.body?.getReader();
    requireValue(reader, 'carrier_response_invalid', 502);
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        requireValue(size <= maxBytes, 'carrier_response_too_large', 502);
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of chunks) {
      bytes.set(part, offset);
      offset += part.length;
    }
    try {
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new CommerceError('carrier_response_invalid', 502);
    }
  }
  async quote({ sender, recipient, parcels, value, currency }) {
    requireValue(
      currency === 'EUR' &&
        integer(value, 1) &&
        Array.isArray(parcels) &&
        parcels.length > 0 &&
        parcels.length <= 100,
      'carrier_quote_input_invalid',
    );
    const address = (a) => {
      requireValue(
        a && /^[A-Z]{2}$/.test(a.country) && shortText(a.city, 100) && shortText(a.postalCode, 20),
        'carrier_quote_address_invalid',
      );
      return {
        country: a.country,
        postal_code: a.postalCode,
        city: a.city,
        is_a_company: a.isCompany === true,
      };
    };
    const packages = parcels.map((p) => {
      requireValue(
        integer(p.weightGrams, 1, 1000000) &&
          Array.isArray(p.dimensionsMm) &&
          p.dimensionsMm.length === 3 &&
          p.dimensionsMm.every((d) => integer(d, 1, 10000)),
        'carrier_parcel_invalid',
      );
      return {
        weight: p.weightGrams / 1000,
        length: p.dimensionsMm[0] / 10,
        width: p.dimensionsMm[1] / 10,
        height: p.dimensionsMm[2] / 10,
      };
    });
    const result = await this.request('/rest-api/quotes', {
      quote: {
        packageType: 'c_deze',
        value: value / 100,
        shipper: address(sender),
        recipient: address(recipient),
        parcels: packages,
      },
    });
    requireValue(
      Array.isArray(result.offers) && result.offers.length <= 500,
      'carrier_response_invalid',
      502,
    );
    return result.offers.map((offer) => {
      requireValue(
        integer(offer.product?.id, 1) &&
          shortText(offer.product.name) &&
          optionalText(offer.product.courier_name) &&
          optionalText(offer.delivery, 500) &&
          optionalText(offer.saddresstype, 50) &&
          optionalText(offer.raddresstype, 50) &&
          offer.total_price?.currency === 'EUR' &&
          integer(offer.total_price.amount_in_cents, 1),
        'carrier_offer_invalid',
        502,
      );
      return {
        serviceId: String(offer.product.id),
        name: offer.product.name,
        courier: typeof offer.product.courier_name === 'string' ? offer.product.courier_name : '',
        amount: offer.total_price.amount_in_cents,
        currency: 'EUR',
        deliveryText: typeof offer.delivery === 'string' ? offer.delivery : '',
        senderAddressType: offer.saddresstype || '',
        recipientAddressType: offer.raddresstype || '',
        pickupAvailable: offer.allow_pickup === true,
        insuranceAvailable: offer.allow_insurance === true,
      };
    });
  }
  async lockers(country, courier) {
    requireValue(
      /^[A-Z]{2}$/.test(country) &&
        ['dpd', 'posti', 'unisend', 'novaPost', 'omniva', 'venipak'].includes(courier),
      'carrier_locker_filter_invalid',
    );
    const result = [];
    const deadline = Date.now() + 45000;
    let totalPages;
    for (let page = 1; page <= 100; page++) {
      const remaining = deadline - Date.now();
      requireValue(remaining > 0, 'carrier_search_incomplete', 503);
      const data = await this.request(
        '/rest-api/returns/postboxes',
        undefined,
        {
          page,
          perPage: 100,
          'filter[type][]': courier,
        },
        5 * 1024 * 1024,
        Math.min(remaining, 15000),
      );
      requireValue(
        data.page === page &&
          integer(data.totalPages, 0, 100) &&
          Array.isArray(data.postboxes) &&
          data.postboxes.length <= 100,
        'carrier_response_invalid',
        502,
      );
      if (page === 1 && data.totalPages === 0 && data.postboxes.length === 0) return [];
      requireValue(data.totalPages >= page, 'carrier_search_incomplete', 503);
      totalPages ??= data.totalPages;
      requireValue(totalPages === data.totalPages, 'carrier_search_incomplete', 503);
      for (const row of data.postboxes)
        if (row.country === country) {
          requireValue(
            integer(row.id, 1) &&
              shortText(row.name) &&
              shortText(row.address) &&
              shortText(row.zip, 20) &&
              optionalText(row.cityName, 100) &&
              row.termtype === courier &&
              (row.postbox_id === undefined ||
                row.postbox_id === null ||
                shortText(row.postbox_id, 100)),
            'carrier_locker_invalid',
            502,
          );
          result.push({
            id: String(row.id),
            country: row.country,
            name: row.name,
            address: row.address,
            postalCode: row.zip,
            city: row.cityName || '',
            carrier: row.termtype,
            carrierLockerId: row.postbox_id || null,
          });
        }
      if (page === data.totalPages) {
        requireValue(
          new Set(result.map((r) => r.id)).size === result.length,
          'carrier_search_incomplete',
          503,
        );
        return result;
      }
    }
    throw new CommerceError('carrier_search_incomplete', 503);
  }
  providerId(id) {
    requireValue(
      typeof id === 'string' && /^[1-9][0-9]{0,14}$/.test(id) && Number.isSafeInteger(Number(id)),
      'carrier_order_id_invalid',
    );
    return Number(id);
  }
  async information(id) {
    const row = await this.request('/rest-api/orders/infos', {
      orderInfo: { id: this.providerId(id) },
    });
    requireValue(
      String(row.id) === id && integer(row.status, 0, 4),
      'carrier_response_invalid',
      502,
    );
    return row;
  }
  async documents(id) {
    const rows = await this.request(
      '/rest-api/orders/documents',
      { orderFiles: { id: this.providerId(id) } },
      {},
      15 * 1024 * 1024,
    );
    requireValue(Array.isArray(rows) && rows.length <= 5, 'carrier_document_invalid', 502);
    return rows.map((row, index) => {
      requireValue(
        row.ftype === 'application/pdf' &&
          typeof row.file_data === 'string' &&
          row.file_data.length > 0 &&
          row.file_data.length <= 2800000 &&
          /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(row.file_data),
        'carrier_document_invalid',
        502,
      );
      const bytes = Uint8Array.from(atob(row.file_data), (c) => c.charCodeAt(0));
      requireValue(
        bytes.byteLength <= 2 * 1024 * 1024 &&
          new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-',
        'carrier_document_invalid',
        502,
      );
      // The API may return several PDFs. Do not identify a label from its filename.
      return {
        filename: 'shipment-document-' + (index + 1) + '.pdf',
        contentType: 'application/pdf',
        bytes,
        private: true,
      };
    });
  }
  async tracking(id) {
    const row = await this.request('/rest-api/tracks', { orderTrack: { id: this.providerId(id) } });
    requireValue(
      Array.isArray(row.info) && row.info.length <= 1000,
      'carrier_tracking_invalid',
      502,
    );
    return row.info.map((event) => {
      requireValue(
        validDate(event.date) && shortText(event.event, 500) && shortText(event.location, 200),
        'carrier_tracking_invalid',
        502,
      );
      return {
        providerDate: event.date,
        text: event.event,
        location: event.location,
        timezone: null,
      };
    });
  }
}
