import { requireValue, identifier, integer, canonical, digest } from './validation.mjs';
import { planParcels } from './parcels.mjs';
import { Backoffice } from './backoffice.mjs';
import { requireOperation } from './admission.mjs';

const text = (value, min, max) =>
  typeof value === 'string' &&
  value.trim().length >= min &&
  value.trim().length <= max &&
  !/[\x00-\x1f\x7f]/.test(value);
const view = (row) =>
  row && { ...row, payload: JSON.parse(row.payload_json), payload_json: undefined };
const couriers = ['dpd', 'posti', 'unisend', 'novaPost', 'omniva', 'venipak'];
export class ShippingOperations {
  constructor(service) {
    this.s = service;
    this.records = new Backoffice(service);
  }
  async guard(store, env, actor) {
    const config = await this.s.store(store, env);
    requireOperation(config, env, 'shipping_not_admitted');
    if (actor !== undefined) requireValue(identifier(actor), 'operator_identity_required', 403);
    return config;
  }
  async eligible(store, env, id) {
    const order = await this.s.getOrder(store, env, id);
    requireValue(
      order.payment_state === 'paid' &&
        order.stock_state === 'allocated' &&
        ['pending', 'ready'].includes(order.fulfillment_state),
      'shipping_plan_not_allowed',
      409,
    );
    requireValue(order.snapshot.customer?.address, 'shipment_customer_missing', 409);
    return order;
  }
  async insert(store, table, input, actor, event, extraColumns = [], extraValues = []) {
    const requestHash = await digest(canonical(input.request));
    const columns = [
      'store_id',
      'id',
      ...extraColumns,
      'payload_hash',
      'payload_json',
      'actor_ref',
      'created_at',
    ];
    const result = await this.records.immutableInsert(
      store,
      table,
      input.id,
      requestHash,
      `INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map(() => '?').join(',')})`,
      [
        store,
        input.id,
        ...extraValues,
        requestHash,
        JSON.stringify(input.payload),
        actor,
        this.s.now(),
      ],
      actor,
      event,
    );
    return { record: view(result.record), replayed: result.replayed };
  }
  async prior(store, table, id, request) {
    const row = await this.s.one(`SELECT * FROM ${table} WHERE store_id=? AND id=?`, store, id);
    if (!row) return null;
    requireValue(row.payload_hash === (await digest(canonical(request))), 'record_conflict', 409);
    return { record: view(row), replayed: true };
  }
  async origin(store, env, input, actor) {
    await this.guard(store, env, actor);
    requireValue(
      input &&
        identifier(input.id) &&
        input.country === 'LT' &&
        text(input.city, 1, 100) &&
        /^(?:LT-)?\d{5}$/.test(input.postalCode) &&
        typeof input.isCompany === 'boolean' &&
        text(input.reason, 3, 200),
      'invalid_shipping_origin',
    );
    const p = {
      country: input.country,
      city: input.city.trim(),
      postalCode: input.postalCode.replace(/^LT-/, ''),
      isCompany: input.isCompany,
      reason: input.reason.trim(),
    };
    return this.insert(
      store,
      'shipping_origins',
      { id: input.id, request: p, payload: p },
      actor,
      'ShippingOriginDefined',
    );
  }
  async prepare(store, env, orderId, input, actor) {
    await this.guard(store, env, actor);
    requireValue(
      input &&
        identifier(input.id) &&
        identifier(input.originId) &&
        typeof input.recipientIsCompany === 'boolean',
      'invalid_shipping_plan',
    );
    const order = await this.s.getOrder(store, env, orderId);
    const origin = view(
      await this.s.one(
        'SELECT * FROM shipping_origins WHERE store_id=? AND id=?',
        store,
        input.originId,
      ),
    );
    requireValue(origin, 'shipping_origin_not_found', 404);
    const packages = planParcels(order, input);
    const request = {
      orderId,
      originId: input.originId,
      recipientIsCompany: input.recipientIsCompany,
      ...packages,
    };
    const old = await this.prior(store, 'shipping_plans', input.id, request);
    if (old) return old;
    await this.eligible(store, env, orderId);
    return this.insert(
      store,
      'shipping_plans',
      {
        id: input.id,
        request,
        payload: {
          ...request,
          origin: origin.payload,
          recipient: { ...order.snapshot.customer.address, isCompany: input.recipientIsCompany },
          value: order.snapshot.lines.reduce((sum, l) => sum + l.unitAmount * l.quantity, 0),
          currency: order.currency,
        },
      },
      actor,
      'ShippingPlanPrepared',
      ['order_id', 'origin_id'],
      [orderId, input.originId],
    );
  }
  binding(adapter, env, method) {
    requireValue(
      adapter &&
        adapter.environment === env &&
        identifier(adapter.accountRef) &&
        identifier(adapter.provider) &&
        typeof adapter[method] === 'function',
      'carrier_quotes_not_connected',
      503,
    );
    return { provider: adapter.provider, accountRef: adapter.accountRef, environment: env };
  }
  async quote(store, env, planId, input, adapter, actor) {
    await this.guard(store, env, actor);
    requireValue(identifier(input?.id), 'invalid_shipping_quote');
    const binding = this.binding(adapter, env, 'quote');
    const request = { planId, ...binding };
    const old = await this.prior(store, 'shipping_quotes', input.id, request);
    if (old) return old;
    const plan = view(
      await this.s.one('SELECT * FROM shipping_plans WHERE store_id=? AND id=?', store, planId),
    );
    requireValue(plan, 'shipping_plan_not_found', 404);
    await this.eligible(store, env, plan.order_id);
    const p = plan.payload;
    requireValue(
      p.currency === 'EUR' && integer(p.value, 1),
      'carrier_currency_not_supported',
      409,
    );
    const offers = await adapter.quote({
      sender: p.origin,
      recipient: p.recipient,
      parcels: p.parcels,
      value: p.value,
      currency: p.currency,
    });
    requireValue(
      Array.isArray(offers) &&
        offers.length <= 500 &&
        offers.every(
          (o) =>
            identifier(o.serviceId) &&
            text(o.name, 1, 200) &&
            integer(o.amount, 1) &&
            o.currency === p.currency,
        ),
      'carrier_offer_invalid',
      502,
    );
    const payload = {
      ...request,
      offers,
      quotedAt: this.s.now(),
      providerExpiresAt: null,
      bookingAvailable: false,
      purpose: 'operator_cost_estimate',
    };
    return this.insert(
      store,
      'shipping_quotes',
      { id: input.id, request, payload },
      actor,
      'ShippingCostQuoted',
      ['plan_id'],
      [planId],
    );
  }
  async lockers(store, env, input, adapter, actor) {
    const config = await this.guard(store, env, actor);
    requireValue(
      identifier(input?.id) &&
        config.markets.some((m) => m.country === input.country) &&
        couriers.includes(input.courier),
      'invalid_locker_search',
    );
    const request = {
      country: input.country,
      courier: input.courier,
      ...this.binding(adapter, env, 'lockers'),
    };
    const old = await this.prior(store, 'shipping_locker_snapshots', input.id, request);
    if (old) return old;
    const lockers = await adapter.lockers(input.country, input.courier);
    requireValue(
      Array.isArray(lockers) &&
        lockers.length <= 10000 &&
        lockers.every(
          (l) =>
            identifier(l.id) &&
            l.country === input.country &&
            text(l.name, 1, 200) &&
            text(l.address, 1, 200) &&
            text(l.postalCode, 1, 20),
        ) &&
        new Set(lockers.map((l) => l.id)).size === lockers.length,
      'carrier_locker_invalid',
      502,
    );
    return this.insert(
      store,
      'shipping_locker_snapshots',
      { id: input.id, request, payload: { ...request, lockers, receivedAt: this.s.now() } },
      actor,
      'ShippingLockersFetched',
    );
  }
  async detail(store, env, orderId) {
    await this.guard(store, env);
    await this.s.getOrder(store, env, orderId);
    return {
      origins: (
        await this.s.rows(
          'SELECT * FROM shipping_origins WHERE store_id=? ORDER BY created_at DESC,id DESC LIMIT 100',
          store,
        )
      ).map(view),
      plans: (
        await this.s.rows(
          'SELECT * FROM shipping_plans WHERE store_id=? AND order_id=? ORDER BY created_at DESC,id DESC LIMIT 30',
          store,
          orderId,
        )
      ).map(view),
      quotes: (
        await this.s.rows(
          'SELECT q.* FROM shipping_quotes q JOIN shipping_plans p ON q.store_id=p.store_id AND q.plan_id=p.id WHERE p.store_id=? AND p.order_id=? ORDER BY q.created_at DESC,q.id DESC LIMIT 30',
          store,
          orderId,
        )
      ).map(view),
      bookingAvailable: false,
    };
  }
}
