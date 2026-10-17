import {
  CommerceError,
  requireValue,
  identifier,
  integer,
  digest,
  canonical,
  customerSnapshot,
} from './validation.mjs';
import { Backoffice } from './backoffice.mjs';
import { BuyerDeliveryQuotes } from './buyer-delivery.mjs';
const hash = (p) => digest(canonical(p));
export class Wholesale extends Backoffice {
  constructor(service, { shippingReadAdapters = {} } = {}) {
    super(service);
    this.shippingReadAdapters = shippingReadAdapters;
  }
  async priceList(store, env, input, actor) {
    await this.guard(store, env, actor);
    requireValue(
      input &&
        identifier(input.id) &&
        /^[A-Z]{3}$/.test(input.currency) &&
        Array.isArray(input.lines) &&
        input.lines.length > 0 &&
        input.lines.length <= 100,
      'invalid_price_list',
    );
    const seen = new Set(),
      lines = [];
    for (const l of input.lines) {
      requireValue(
        identifier(l?.sku) &&
          !seen.has(l.sku) &&
          integer(l.unitAmount, 1) &&
          integer(l.moq, 1, 100) &&
          integer(l.casepack, 1, 100) &&
          l.moq % l.casepack === 0,
        'invalid_wholesale_price',
      );
      seen.add(l.sku);
      requireValue(
        await this.s.one('SELECT sku FROM products WHERE store_id=? AND sku=?', store, l.sku),
        'product_unavailable',
        404,
      );
      lines.push({ sku: l.sku, unitAmount: l.unitAmount, moq: l.moq, casepack: l.casepack });
    }
    lines.sort((a, b) => a.sku.localeCompare(b.sku));
    const p = { id: input.id, currency: input.currency, lines },
      h = await hash(p);
    return this.immutableInsert(
      store,
      'wholesale_price_lists',
      p.id,
      h,
      'INSERT INTO wholesale_price_lists VALUES(?,?,?,?,?)',
      [store, p.id, p.currency, JSON.stringify(p), h],
      actor,
      'WholesalePriceListDefined',
    );
  }
  async partner(store, env, input, actor) {
    const config = await this.guard(store, env, actor);
    requireValue(
      input &&
        identifier(input.id) &&
        typeof input.name === 'string' &&
        input.name.trim().length >= 2 &&
        input.name.trim().length <= 160 &&
        identifier(input.priceListId) &&
        typeof input.approved === 'boolean',
      'invalid_partner',
    );
    const market = config.markets.find(
      (m) => m.country === input.country && m.currency === input.currency,
    );
    requireValue(market, 'market_not_enabled');
    const customer = customerSnapshot(input.customer, input.country, { kind: 'door' });
    const list = await this.s.one(
      'SELECT currency FROM wholesale_price_lists WHERE store_id=? AND id=?',
      store,
      input.priceListId,
    );
    requireValue(list?.currency === input.currency, 'partner_price_list_mismatch');
    const p = {
        id: input.id,
        name: input.name.trim(),
        priceListId: input.priceListId,
        country: input.country,
        currency: input.currency,
        customer,
        approved: input.approved,
      },
      h = await hash(p);
    return this.immutableInsert(
      store,
      'wholesale_partners',
      p.id,
      h,
      'INSERT INTO wholesale_partners(store_id,id,name,price_list_id,country,currency,customer_json,approved,payload_hash) VALUES(?,?,?,?,?,?,?,?,?)',
      [
        store,
        p.id,
        p.name,
        p.priceListId,
        p.country,
        p.currency,
        JSON.stringify(customer),
        Number(p.approved),
        h,
      ],
      actor,
      'WholesalePartnerDefined',
    );
  }
  async quote(store, env, input, actor) {
    await this.guard(store, env, actor);
    requireValue(
      input && identifier(input.id) && identifier(input.partnerId),
      'invalid_wholesale_quote',
    );
    const request = {
        id: input.id,
        partnerId: input.partnerId,
        lines: input.lines,
        deliveryId: input.deliveryId,
        ...(input.deliveryQuoteId ? { deliveryQuoteId: input.deliveryQuoteId } : {}),
      },
      h = await hash(request);
    const old = await this.s.one(
      'SELECT * FROM wholesale_quotes WHERE store_id=? AND id=?',
      store,
      input.id,
    );
    const replay = (r) => {
      requireValue(r.request_hash === h, 'record_conflict', 409);
      return { quote: this.quoteView(r), replayed: true };
    };
    if (old) return replay(old);
    const partner = await this.s.one(
      'SELECT * FROM wholesale_partners WHERE store_id=? AND id=?',
      store,
      input.partnerId,
    );
    requireValue(partner?.approved === 1, 'partner_not_approved', 403);
    const list = await this.s.one(
      'SELECT * FROM wholesale_price_lists WHERE store_id=? AND id=?',
      store,
      partner.price_list_id,
    );
    requireValue(list?.currency === partner.currency, 'partner_price_list_mismatch');
    const prices = JSON.parse(list.definition_json).lines;
    const privatePrices = Object.fromEntries(prices.map((p) => [p.sku, p.unitAmount]));
    const customer = JSON.parse(partner.customer_json);
    const quoteInput = {
      lines: input.lines,
      country: partner.country,
      currency: partner.currency,
      deliveryId: input.deliveryId,
      customer,
      ...(input.deliveryQuoteId ? { deliveryQuoteId: input.deliveryQuoteId } : {}),
    };
    const config = await this.s.store(store, env),
      method = config.markets
        .find((m) => m.country === partner.country)
        ?.delivery.find((d) => d.id === input.deliveryId);
    if (method?.pricing === 'carrier' && !input.deliveryQuoteId) {
      const rate = await new BuyerDeliveryQuotes(this.s).create(
        store,
        env,
        { ...quoteInput, id: 'b2b_' + h },
        this.shippingReadAdapters[store],
        { privatePrices },
      );
      quoteInput.deliveryQuoteId = rate.id;
    }
    const snapshot = await this.s.quote(store, env, quoteInput, { privatePrices });
    requireValue(snapshot.delivery.kind !== 'locker', 'wholesale_door_delivery_required');
    for (const l of snapshot.lines) {
      const p = prices.find((p) => p.sku === l.sku);
      requireValue(
        p && l.quantity >= p.moq && l.quantity % p.casepack === 0,
        'wholesale_quantity_invalid',
      );
      l.unitAmount = p.unitAmount;
      l.lineAmount = p.unitAmount * l.quantity;
    }
    snapshot.amount = snapshot.lines.reduce(
      (sum, l) => sum + l.lineAmount,
      snapshot.delivery.amount,
    );
    requireValue(integer(snapshot.amount, 1), 'invalid_quote_total');
    snapshot.schemaVersion = 2;
    snapshot.customer = JSON.parse(partner.customer_json);
    snapshot.wholesale = {
      partnerId: partner.id,
      partnerName: partner.name,
      priceListId: list.id,
      priceListHash: list.payload_hash,
      paymentTerms: 'prepaid',
    };
    delete snapshot.quoteHash;
    snapshot.quoteHash = await hash(snapshot);
    const at = this.s.now();
    try {
      await this.s.db.batch([
        this.s.stmt(
          'INSERT INTO wholesale_quotes VALUES(?,?,?,?,?,?,?,?)',
          store,
          input.id,
          partner.id,
          h,
          JSON.stringify(snapshot),
          at + 7 * 86400000,
          at,
          actor,
        ),
        ...this.s.event(store, 'WholesaleQuoteIssued', input.id, { actorRef: actor }),
      ]);
    } catch (error) {
      const concurrent = await this.s.one(
        'SELECT * FROM wholesale_quotes WHERE store_id=? AND id=?',
        store,
        input.id,
      );
      if (concurrent) return replay(concurrent);
      throw error;
    }
    return {
      quote: this.quoteView(
        await this.s.one(
          'SELECT * FROM wholesale_quotes WHERE store_id=? AND id=?',
          store,
          input.id,
        ),
      ),
      replayed: false,
    };
  }
  async approval(store, env, input, actor) {
    await this.guard(store, env, actor);
    requireValue(
      input &&
        identifier(input.id) &&
        identifier(input.partnerId) &&
        typeof input.approved === 'boolean' &&
        integer(input.expectedVersion, 0),
      'invalid_partner_state',
    );
    const p = {
        id: input.id,
        partnerId: input.partnerId,
        approved: input.approved,
        expectedVersion: input.expectedVersion,
        actor,
      },
      h = await hash(p);
    try {
      return await this.immutableInsert(
        store,
        'wholesale_partner_changes',
        p.id,
        h,
        'INSERT INTO wholesale_partner_changes VALUES(?,?,?,?,?,?,?,?)',
        [store, p.id, p.partnerId, p.expectedVersion, Number(p.approved), h, actor, this.s.now()],
        actor,
        'WholesalePartnerStateChanged',
      );
    } catch (error) {
      if (String(error.message).includes('partner_state_conflict'))
        throw new CommerceError('partner_state_conflict', 409);
      throw error;
    }
  }
  quoteView(row) {
    return { ...row, snapshot: JSON.parse(row.snapshot_json), snapshot_json: undefined };
  }
  async accept(store, env, quoteId, actor) {
    await this.guard(store, env, actor);
    requireValue(
      env === 'sandbox' || (await this.s.store(store, env)).operationalAdmission?.approved === true,
      'wholesale_production_not_configured',
      503,
    );
    const existing = () =>
      this.s.one(
        'SELECT order_id FROM wholesale_orders WHERE store_id=? AND quote_id=?',
        store,
        quoteId,
      );
    const old = await existing();
    if (old) return { order: await this.s.getOrder(store, env, old.order_id), replayed: true };
    const quote = await this.s.one(
      'SELECT * FROM wholesale_quotes WHERE store_id=? AND id=?',
      store,
      quoteId,
    );
    requireValue(quote, 'quote_not_found', 404);
    requireValue(quote.expires_at > this.s.now(), 'quote_expired', 409);
    const partner = await this.s.one(
      'SELECT approved FROM wholesale_partners WHERE store_id=? AND id=?',
      store,
      quote.partner_id,
    );
    requireValue(partner?.approved === 1, 'partner_not_approved', 403);
    const snapshot = JSON.parse(quote.snapshot_json),
      id = crypto.randomUUID(),
      at = this.s.now(),
      accessHash = await digest(crypto.randomUUID() + crypto.randomUUID());
    const requestKey = 'wholesale_' + id;
    requireValue(identifier(requestKey), 'invalid_wholesale_quote');
    try {
      await this.s.db.batch([
        this.s.stmt(
          'INSERT INTO orders(store_id,id,request_key,request_hash,currency,amount,snapshot_json,access_hash,expires_at,created_at,stock_checked_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
          store,
          id,
          requestKey,
          quote.request_hash,
          snapshot.currency,
          snapshot.amount,
          JSON.stringify(snapshot),
          accessHash,
          at + 3600000,
          at,
          at,
        ),
        ...snapshot.lines.map((l) =>
          this.s.stmt('INSERT INTO order_lines VALUES(?,?,?,?)', store, id, l.sku, l.quantity),
        ),
        this.s.stmt('INSERT INTO wholesale_orders VALUES(?,?,?)', store, quoteId, id),
        ...this.s.event(store, 'OrderPlaced', id, { quoteId, actorRef: actor }),
      ]);
    } catch (error) {
      const concurrent = await existing();
      if (concurrent)
        return { order: await this.s.getOrder(store, env, concurrent.order_id), replayed: true };
      if (String(error.message).includes('stock_unavailable'))
        throw new CommerceError('stock_unavailable', 409);
      if (String(error.message).includes('partner_not_approved'))
        throw new CommerceError('partner_not_approved', 403);
      throw error;
    }
    return { order: await this.s.getOrder(store, env, id), replayed: false };
  }
  async reorder(store, env, input, actor) {
    await this.guard(store, env, actor);
    requireValue(
      input && identifier(input.quoteId) && identifier(input.id),
      'invalid_wholesale_quote',
    );
    const row = await this.s.one(
      'SELECT * FROM wholesale_quotes WHERE store_id=? AND id=?',
      store,
      input.quoteId,
    );
    requireValue(row, 'quote_not_found', 404);
    const snapshot = JSON.parse(row.snapshot_json);
    return this.quote(
      store,
      env,
      {
        id: input.id,
        partnerId: row.partner_id,
        lines: snapshot.lines.map((l) => ({ sku: l.sku, quantity: l.quantity })),
        deliveryId: snapshot.delivery.id,
        ...(input.deliveryQuoteId ? { deliveryQuoteId: input.deliveryQuoteId } : {}),
      },
      actor,
    );
  }
  async overview(store, env) {
    await this.s.store(store, env);
    return {
      partners: await this.s.rows(
        'SELECT id,name,price_list_id,country,currency,approved,approval_version FROM wholesale_partners WHERE store_id=? ORDER BY name',
        store,
      ),
      priceLists: (
        await this.s.rows('SELECT * FROM wholesale_price_lists WHERE store_id=? ORDER BY id', store)
      ).map((r) => ({ ...r, definition: JSON.parse(r.definition_json) })),
      quotes: (
        await this.s.rows(
          'SELECT q.*,o.order_id FROM wholesale_quotes q LEFT JOIN wholesale_orders o ON o.store_id=q.store_id AND o.quote_id=q.id WHERE q.store_id=? ORDER BY q.created_at DESC,q.id LIMIT 50',
          store,
        )
      ).map((r) => this.quoteView(r)),
    };
  }
}
