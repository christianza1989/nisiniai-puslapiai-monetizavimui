import { configuredDispatch } from './delivery-lockers.mjs';
import { configureProduct } from './product-config.mjs';
import {
  CommerceError,
  requireValue,
  integer,
  identifier,
  normalizeCart,
  canonical,
  digest,
  validateStore,
  customerSnapshot,
} from './validation.mjs';
import { deliveryFingerprint } from './buyer-delivery.mjs';
import { FinishedStock } from './finished-stock.mjs';
export class CommerceService {
  constructor(db, { now = () => Date.now() } = {}) {
    this.db = db;
    this.now = now;
  }
  stmt(sql, ...args) {
    return this.db.prepare(sql).bind(...args);
  }
  async one(sql, ...args) {
    return this.stmt(sql, ...args).first();
  }
  async rows(sql, ...args) {
    return (await this.stmt(sql, ...args).all()).results;
  }
  event(store, kind, id, payload = {}, condition) {
    const eventId = kind + '_' + id + (payload.providerId ? '_' + payload.providerId : ''),
      at = this.now();
    const gate = condition ? ' WHERE ' + condition.sql : '';
    const args = condition?.args ?? [];
    return [
      this.stmt(
        'INSERT OR IGNORE INTO outbox(store_id,id,kind,aggregate_id,payload_json,created_at) SELECT ?,?,?,?,?,?' +
          gate,
        store,
        eventId,
        kind,
        id,
        JSON.stringify({
          schemaVersion: 1,
          storeId: store,
          aggregateId: id,
          eventId,
          occurredAt: at,
          ...payload,
        }),
        at,
        ...args,
      ),
      this.stmt(
        'INSERT OR IGNORE INTO audit(store_id,id,kind,aggregate_id,created_at) SELECT ?,?,?,?,?' +
          gate,
        store,
        eventId,
        kind,
        id,
        at,
        ...args,
      ),
    ];
  }
  async provisionStore(config, products) {
    validateStore(config);
    requireValue(
      Array.isArray(products) && products.length > 0 && products.length <= 1000,
      'invalid_catalog',
    );
    const ids = new Set();
    for (const p of products) {
      requireValue(
        p &&
          identifier(p.sku) &&
          !ids.has(p.sku) &&
          typeof p.title === 'string' &&
          p.title.length > 0 &&
          integer(p.stock, 0, 100000),
        'invalid_product',
      );
      ids.add(p.sku);
      requireValue(
        (p.lotTrackingRequired === undefined || typeof p.lotTrackingRequired === 'boolean') &&
          (p.lotTrackingRequired !== true || p.stock === 0),
        'invalid_stock_policy',
      );
      requireValue(
        p.prices && Object.values(p.prices).every((v) => integer(v, 1)),
        'invalid_prices',
      );
      requireValue(
        Object.keys(p.prices).length > 0 &&
          Object.keys(p.prices).every((country) =>
            config.markets.some((m) => m.country === country),
          ),
        'invalid_prices',
      );
      requireValue(
        integer(p.package?.weightGrams, 1, 100000) &&
          Array.isArray(p.package.dimensionsMm) &&
          p.package.dimensionsMm.length === 3 &&
          p.package.dimensionsMm.every((n) => integer(n, 1, 3000)),
        'invalid_package',
      );
    }
    // Bootstrap is explicit and refuses to rewrite an operating store's inventory/history.
    await this.db.batch([
      this.stmt(
        'INSERT INTO stores(id,environment,config_json) VALUES(?,?,?)',
        config.id,
        config.environment,
        JSON.stringify(config),
      ),
      ...products.flatMap((p) => [
        this.stmt(
          'INSERT INTO products(store_id,sku,definition_json) VALUES(?,?,?)',
          config.id,
          p.sku,
          JSON.stringify(p),
        ),
        this.stmt(
          'INSERT INTO inventory(store_id,sku,available) VALUES(?,?,?)',
          config.id,
          p.sku,
          p.stock,
        ),
      ]),
    ]);
  }
  async store(id, environment) {
    requireValue(identifier(id), 'unknown_store', 404);
    const row = await this.one('SELECT config_json,environment FROM stores WHERE id=?', id);
    requireValue(row && row.environment === environment, 'unknown_store', 404);
    const store = validateStore(JSON.parse(row.config_json));
    requireValue(store.enabled, 'store_disabled', 403);
    return store;
  }
  async resolveHost(host, environment) {
    const rows = await this.rows('SELECT config_json FROM stores WHERE environment=?', environment);
    const matches = rows
      .map((r) => JSON.parse(r.config_json))
      .filter((s) => s.hosts.includes(host.toLowerCase()));
    requireValue(matches.length === 1, 'unknown_host', 404);
    return this.store(matches[0].id, environment);
  }
  async catalog(id, environment) {
    await this.store(id, environment);
    return (
      await this.rows(
        "SELECT p.definition_json,CASE WHEN EXISTS(SELECT 1 FROM finished_stock_holds h WHERE h.store_id=p.store_id AND h.sku=p.sku AND h.held=1) THEN 0 WHEN json_extract(p.definition_json,'$.lotTrackingRequired')=1 THEN COALESCE((SELECT SUM(f.available) FROM finished_lot_quality f WHERE f.store_id=p.store_id AND f.sku=p.sku AND f.blocked=0 AND (f.expires_at IS NULL OR f.expires_at>?)),0) ELSE i.available-COALESCE((SELECT SUM(f.available) FROM finished_lot_quality f WHERE f.store_id=p.store_id AND f.sku=p.sku AND (f.blocked=1 OR f.expires_at<=?)),0) END AS available FROM products p JOIN inventory i ON i.store_id=p.store_id AND i.sku=p.sku WHERE p.store_id=?",
        this.now(),
        this.now(),
        id,
      )
    ).map((r) => {
      const p = JSON.parse(r.definition_json);
      return {
        sku: p.sku,
        title: p.title,
        ...(p.titles ? { titles: p.titles } : {}),
        ...(p.addonFor ? { addonFor: p.addonFor } : {}),
        enabled: p.enabled !== false,
        prices: p.prices,
        available: p.enabled === false ? 0 : r.available,
        package: p.package,
        ...(p.content ? { content: p.content } : {}),
        ...(p.optionGroups ? { optionGroups: p.optionGroups } : {}),
      };
    });
  }
  async quote(id, environment, input, options = {}) {
    requireValue(input && typeof input === 'object' && !Array.isArray(input), 'invalid_payload');
    const store = await this.store(id, environment),
      lines = normalizeCart(input.lines);
    const market = store.markets.find(
      (m) => m.country === input.country && m.currency === input.currency,
    );
    requireValue(market && market.checkoutEnabled !== false, 'market_not_enabled');
    const catalog = await this.catalog(id, environment);
    const priced = lines.map((line) => {
      const p = catalog.find((p) => p.sku === line.sku);
      const baseAmount = options.privatePrices?.[line.sku] ?? p?.prices[market.country];
      const configured = p ? configureProduct(p, market.country, line.choices) : null;
      const unitAmount = baseAmount + (configured?.extra ?? 0);
      requireValue(p && p.enabled !== false && integer(unitAmount, 1), 'product_unavailable', 409);
      return {
        ...line,
        title:
          (p.titles?.[market.country] || p.title) +
          (configured.labels.length ? ' — ' + configured.labels.join(' � ') : ''),
        ...(configured.image ? { image: configured.image } : {}),
        unitAmount,
        lineAmount: unitAmount * line.quantity,
        package: configured.package,
      };
    });
    for (const line of lines) {
      const product = catalog.find((p) => p.sku === line.sku);
      if (product.addonFor)
        requireValue(
          line.quantity <=
            lines
              .filter(
                (l) =>
                  product.addonFor.includes(l.sku) &&
                  !catalog.find((p) => p.sku === l.sku)?.addonFor,
              )
              .reduce((n, l) => n + l.quantity, 0),
          'addon_requires_kit',
        );
    }
    // Delivery selectors are authoritative configured methods; no arbitrary browser tariff.
    const delivery = market.delivery.find((d) => d.id === input.deliveryId);
    requireValue(
      delivery && delivery.enabled !== false && integer(delivery.amount, 0),
      'delivery_not_enabled',
    );
    let deliveryAmount = delivery.amount,
      deliveryLabel = delivery.label,
      providerServiceId;
    if (delivery.pricing === 'carrier') {
      if (options.draftDelivery === true) deliveryAmount = 0;
      else {
        requireValue(identifier(input.deliveryQuoteId), 'delivery_quote_required');
        const row = await this.one(
          'SELECT * FROM buyer_delivery_quotes WHERE store_id=? AND id=?',
          id,
          input.deliveryQuoteId,
        );
        requireValue(
          row &&
            row.environment === environment &&
            row.expires_at > this.now() &&
            row.request_hash === (await deliveryFingerprint(input, delivery)),
          'delivery_quote_conflict',
          409,
        );
        const q = JSON.parse(row.payload_json);
        requireValue(
          q.accountRef === store.shippingAccountRef &&
            delivery.serviceIds?.includes(q.providerServiceId) &&
            q.dispatchHash === (await digest(canonical(configuredDispatch(store, delivery)))) &&
            q.public.currency === market.currency &&
            q.itemsHash === (await digest(canonical(priced))),
          'delivery_quote_conflict',
          409,
        );
        deliveryAmount = q.public.amount;
        deliveryLabel = q.public.label;
        providerServiceId = q.providerServiceId;
      }
    }
    const amount = priced.reduce((a, l) => a + l.lineAmount, deliveryAmount);
    requireValue(integer(amount, 1), 'invalid_total');
    const quotedSnapshot = {
      schemaVersion: 1,
      storeId: id,
      environment,
      legalEntityId: store.legalEntityId,
      legal: store.legalSnapshot,
      country: market.country,
      currency: market.currency,
      policyVersion: market.policyVersion,
      lines: priced,
      delivery: {
        id: delivery.id,
        amount: deliveryAmount,
        label: deliveryLabel,
        ...(providerServiceId ? { providerServiceId, quoteId: input.deliveryQuoteId } : {}),
        kind: delivery.kind || 'door',
        ...(delivery.senderMode === 'locker'
          ? { dispatch: configuredDispatch(store, delivery) }
          : {}),
      },
      amount,
    };
    return { ...quotedSnapshot, quoteHash: await digest(canonical(quotedSnapshot)) };
  }
  async createOrder(id, environment, input, key, clientToken) {
    requireValue(input && typeof input === 'object' && !Array.isArray(input), 'invalid_payload');
    requireValue(
      typeof key === 'string' && /^[a-zA-Z0-9_-]{16,100}$/.test(key),
      'invalid_idempotency_key',
    );
    requireValue(
      clientToken === undefined ||
        (typeof clientToken === 'string' && /^[a-zA-Z0-9_-]{32,128}$/.test(clientToken)),
      'invalid_order_token',
    );
    const config = await this.store(id, environment);
    const existing = await this.one(
      'SELECT * FROM orders WHERE store_id=? AND request_key=?',
      id,
      key,
    );
    const priorSnapshot = existing ? JSON.parse(existing.snapshot_json) : null;
    if (
      (existing ? priorSnapshot.termsAcceptance !== undefined : config.requireTerms === true) ||
      input.acceptedPolicyVersion !== undefined
    ) {
      const version =
        priorSnapshot?.policyVersion ||
        config.markets.find((m) => m.country === input.country && m.currency === input.currency)
          ?.policyVersion;
      requireValue(input.acceptedPolicyVersion === version, 'terms_acceptance_required');
    }
    const method =
      priorSnapshot?.delivery.id === input.deliveryId
        ? {
            ...priorSnapshot.delivery,
            lockers: priorSnapshot.customer?.locker ? [priorSnapshot.customer.locker] : [],
          }
        : config.markets
            .find((m) => m.country === input.country && m.currency === input.currency)
            ?.delivery.find((d) => d.id === input.deliveryId);
    let customer;
    if (input.customer !== undefined || (!existing && config.requireCustomer === true)) {
      requireValue(method, 'delivery_not_enabled');
      customer = customerSnapshot(input.customer, input.country, method);
    }
    const clientHash = clientToken === undefined ? null : await digest(clientToken);
    const requestHash = await digest(
      canonical({
        lines: normalizeCart(input.lines),
        country: input.country,
        currency: input.currency,
        deliveryId: input.deliveryId,
        ...(input.deliveryQuoteId !== undefined ? { deliveryQuoteId: input.deliveryQuoteId } : {}),
        accessHash: clientHash,
        ...(input.quoteHash !== undefined ? { quoteHash: input.quoteHash } : {}),
        ...(input.acceptedPolicyVersion !== undefined
          ? { acceptedPolicyVersion: input.acceptedPolicyVersion }
          : {}),
        ...(input.paymentRecoveryNotice !== undefined
          ? { paymentRecoveryNotice: input.paymentRecoveryNotice }
          : {}),
        ...(customer
          ? {
              customer: customer.locker
                ? {
                    ...customer,
                    locker: { id: customer.locker.id, country: customer.locker.country },
                  }
                : customer,
            }
          : {}),
      }),
    );
    if (existing) {
      requireValue(existing.request_hash === requestHash, 'idempotency_conflict', 409);
      return { order: this.view(existing), replayed: true };
    }
    const snapshot = await this.quote(id, environment, input);
    if (config.paymentRecovery?.enabled === true) {
      requireValue(
        input.paymentRecoveryNotice === config.paymentRecovery.noticeVersion,
        'payment_recovery_notice_required',
      );
      snapshot.paymentRecoveryNotice = {
        version: config.paymentRecovery.noticeVersion,
        shownAt: this.now(),
      };
    }
    if (config.requireQuote === true || input.quoteHash !== undefined)
      requireValue(input.quoteHash === snapshot.quoteHash, 'quote_price_changed', 409);
    if (customer) {
      snapshot.schemaVersion = 2;
      snapshot.customer = customer;
    }
    if (input.acceptedPolicyVersion !== undefined)
      snapshot.termsAcceptance = {
        policyVersion: input.acceptedPolicyVersion,
        acceptedAt: this.now(),
      };
    const orderId = crypto.randomUUID(),
      token = clientToken ?? crypto.randomUUID() + crypto.randomUUID(),
      at = this.now();
    const accessHash = clientHash ?? (await digest(token));
    const statements = [
      this.stmt(
        'INSERT INTO orders(store_id,id,request_key,request_hash,currency,amount,snapshot_json,access_hash,expires_at,created_at,stock_checked_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
        id,
        orderId,
        key,
        requestHash,
        snapshot.currency,
        snapshot.amount,
        JSON.stringify(snapshot),
        accessHash,
        at +
          (config.paymentRecovery?.enabled === true ? config.paymentRecovery.reservationHours : 1) *
            3600000,
        at,
        at,
      ),
      ...normalizeCart(snapshot.lines.map(({ sku, quantity }) => ({ sku, quantity }))).map((l) =>
        this.stmt(
          'INSERT INTO order_lines(store_id,order_id,sku,quantity) VALUES(?,?,?,?)',
          id,
          orderId,
          l.sku,
          l.quantity,
        ),
      ),
      ...this.event(id, 'OrderPlaced', orderId),
    ];
    try {
      await this.db.batch(statements);
    } catch (error) {
      if (String(error.message).includes('stock_unavailable'))
        throw new CommerceError('stock_unavailable', 409);
      const concurrent = await this.one(
        'SELECT * FROM orders WHERE store_id=? AND request_key=?',
        id,
        key,
      );
      if (concurrent) {
        requireValue(concurrent.request_hash === requestHash, 'idempotency_conflict', 409);
        return { order: this.view(concurrent), replayed: true };
      }
      throw error;
    }
    return {
      order: this.view(
        await this.one('SELECT * FROM orders WHERE store_id=? AND id=?', id, orderId),
      ),
      accessToken: token,
      replayed: false,
    };
  }
  view(row) {
    const { access_hash, request_hash, ...safe } = row;
    return { ...safe, snapshot: JSON.parse(row.snapshot_json), snapshot_json: undefined };
  }
  async getOrder(store, environment, id) {
    await this.store(store, environment);
    const row = await this.one('SELECT * FROM orders WHERE store_id=? AND id=?', store, id);
    requireValue(row, 'order_not_found', 404);
    return this.view(row);
  }
  async authorizeOrder(store, environment, id, token) {
    const row = await this.getOrder(store, environment, id);
    const auth = await this.one(
      'SELECT access_hash FROM orders WHERE store_id=? AND id=?',
      store,
      id,
    );
    requireValue(
      typeof token === 'string' &&
        token.length <= 200 &&
        (await digest(token)) === auth.access_hash,
      'order_forbidden',
      403,
    );
    return row;
  }
  async expire(store, environment) {
    await this.store(store, environment);
    const due = await this.rows(
      "SELECT id FROM orders WHERE store_id=? AND payment_state='pending' AND stock_state='reserved' AND expires_at<=?",
      store,
      this.now(),
    );
    let count = 0;
    for (const o of due) {
      const results = await this.db.batch([
        this.stmt(
          "UPDATE orders SET stock_state='released' WHERE store_id=? AND id=? AND payment_state='pending' AND stock_state='reserved' AND expires_at<=? RETURNING id",
          store,
          o.id,
          this.now(),
        ),
        ...this.event(
          store,
          'ReservationExpired',
          o.id,
          {},
          {
            sql: "EXISTS(SELECT 1 FROM orders WHERE store_id=? AND id=? AND payment_state='pending' AND stock_state='released')",
            args: [store, o.id],
          },
        ),
      ]);
      // Native D1 changes includes restoration triggers; count affected orders.
      // The Node adapter reports direct changes and does not return batch rows.
      count += results[0].results?.length ?? results[0].meta.changes;
    }
    return count;
  }
  async checkout(store, environment, id, paymentAdapter, { uiMode = 'hosted' } = {}) {
    requireValue(['hosted', 'embedded'].includes(uiMode), 'checkout_mode_invalid');
    const order = await this.getOrder(store, environment, id);
    requireValue(
      order.payment_state === 'pending' &&
        order.stock_state === 'reserved' &&
        order.expires_at > this.now(),
      'checkout_unavailable',
      409,
    );
    const config = await this.store(store, environment);
    requireValue(
      order.checkout_id || order.expires_at - this.now() >= 1800000,
      'checkout_window_elapsed',
      409,
    );
    await new FinishedStock(this).requireOrder(store, environment, id);
    // Recover the actual provider mode when an earlier HTTP response was lost.
    // A stable original idempotency key also fences an ambiguous initial create.
    let session;
    if (order.checkout_id && typeof paymentAdapter.retrieveSession === 'function')
      session = await paymentAdapter.retrieveSession(order.checkout_id, order, config);
    else {
      if (!order.checkout_id && uiMode === 'embedded')
        requireValue(
          paymentAdapter.supportsEmbeddedCheckout === true,
          'embedded_checkout_not_supported',
          503,
        );
      session = await paymentAdapter.createSession(order, config, {
        uiMode: order.checkout_id ? 'hosted' : uiMode,
      });
    }
    const details =
      typeof paymentAdapter.publicSession === 'function'
        ? paymentAdapter.publicSession(session)
        : { uiMode: 'hosted', url: session?.url };
    requireValue(
      identifier(session?.id) && (details.uiMode === 'embedded' || typeof details.url === 'string'),
      'invalid_checkout_response',
      502,
    );
    await this.stmt(
      'UPDATE orders SET checkout_id=? WHERE store_id=? AND id=? AND (checkout_id IS NULL OR checkout_id=?)',
      session.id,
      store,
      id,
      session.id,
    ).run();
    const current = await this.getOrder(store, environment, id);
    requireValue(current.checkout_id === session.id, 'checkout_conflict', 409);
    return details;
  }
  // Internal adapter boundary: callers MUST have verified the Stripe signature/account.
  async acceptPayment(store, environment, event) {
    const config = await this.store(store, environment);
    requireValue(
      event.accountRef === config.paymentAccountRef && event.environment === environment,
      'payment_account_mismatch',
      403,
    );
    const order = await this.getOrder(store, environment, event.orderId);
    requireValue(
      event.currency === order.currency &&
        event.amount === order.amount &&
        event.sessionId === order.checkout_id &&
        event.paid === true &&
        identifier(event.paymentId),
      'payment_mismatch',
      409,
    );
    requireValue(
      order.payment_state === 'pending' || order.payment_id === event.paymentId,
      'payment_conflict',
      409,
    );
    requireValue(identifier(event.id), 'invalid_payment_event');
    const hash = await digest(canonical(event));
    const otherPaidOrder = await this.one(
      'SELECT id FROM orders WHERE store_id=? AND payment_id=? AND id!=?',
      store,
      event.paymentId,
      order.id,
    );
    requireValue(!otherPaidOrder, 'payment_conflict', 409);
    const prior = await this.one(
      "SELECT payload_hash FROM event_inbox WHERE store_id=? AND provider='stripe' AND event_id=?",
      store,
      event.id,
    );
    if (prior) {
      requireValue(prior.payload_hash === hash, 'event_conflict', 409);
      return { replayed: true, order };
    }
    const inbox = this.stmt(
      "INSERT INTO event_inbox VALUES(?,'stripe',?,?,?)",
      store,
      event.id,
      hash,
      this.now(),
    );
    if (order.payment_state !== 'pending') {
      requireValue(order.payment_id === event.paymentId, 'payment_conflict', 409);
      await inbox.run();
      return { replayed: true, order };
    }
    const update = this.stmt(
      "UPDATE orders SET payment_state='paid',payment_id=?,stock_state='allocated',stock_checked_at=?,stock_generation=stock_generation+CASE WHEN stock_state='released' THEN 1 ELSE 0 END WHERE store_id=? AND id=? AND payment_state='pending'",
      event.paymentId,
      this.now(),
      store,
      order.id,
    );
    try {
      await this.db.batch([
        inbox,
        update,
        ...this.event(
          store,
          'PaymentConfirmed',
          order.id,
          { paymentId: event.paymentId, amount: order.amount, currency: order.currency },
          {
            sql: "EXISTS(SELECT 1 FROM orders WHERE store_id=? AND id=? AND payment_state='paid' AND stock_state='allocated' AND payment_id=?)",
            args: [store, order.id, event.paymentId],
          },
        ),
      ]);
    } catch (error) {
      if (!String(error.message).includes('stock_unavailable')) {
        const done = await this.one(
          "SELECT payload_hash FROM event_inbox WHERE store_id=? AND provider='stripe' AND event_id=?",
          store,
          event.id,
        );
        if (done?.payload_hash === hash)
          return { replayed: true, order: await this.getOrder(store, environment, order.id) };
        if (
          String(error.message).includes(
            'UNIQUE constraint failed: orders.store_id, orders.payment_id',
          )
        )
          throw new CommerceError('payment_conflict', 409);
        throw error;
      }
      await this.db.batch([
        inbox,
        this.stmt(
          "UPDATE orders SET payment_state='paid',payment_id=?,stock_state='released',fulfillment_state='stock_exception' WHERE store_id=? AND id=? AND payment_state='pending'",
          event.paymentId,
          store,
          order.id,
        ),
        ...this.event(
          store,
          'PaidStockException',
          order.id,
          { paymentId: event.paymentId, amount: order.amount, currency: order.currency },
          {
            sql: "EXISTS(SELECT 1 FROM orders WHERE store_id=? AND id=? AND payment_state='paid' AND fulfillment_state='stock_exception' AND payment_id=?)",
            args: [store, order.id, event.paymentId],
          },
        ),
      ]);
    }
    const current = await this.getOrder(store, environment, order.id);
    requireValue(current.payment_id === event.paymentId, 'payment_conflict', 409);
    return { replayed: false, order: current };
  }
  async markPacked(store, environment, id, actorRef) {
    requireValue(
      environment === 'sandbox' || identifier(actorRef),
      'operator_identity_required',
      403,
    );
    const order = await this.getOrder(store, environment, id);
    requireValue(
      order.payment_state === 'paid' &&
        order.stock_state === 'allocated' &&
        ['pending', 'ready'].includes(order.fulfillment_state),
      'packing_not_allowed',
      409,
    );
    await new FinishedStock(this).requireOrder(store, environment, id);
    if (order.fulfillment_state === 'ready') return order;
    await this.db.batch([
      this.stmt(
        "UPDATE orders SET fulfillment_state='ready',stock_checked_at=? WHERE store_id=? AND id=? AND fulfillment_state='pending'",
        this.now(),
        store,
        id,
      ),
      ...this.event(store, 'PackingConfirmed', id, actorRef ? { actorRef } : {}),
    ]);
    return this.getOrder(store, environment, id);
  }
  async registerShipment(store, environment, id, adapter) {
    requireValue(adapter.supportsIdempotentCreate === true, 'carrier_idempotency_required', 503);
    const order = await this.getOrder(store, environment, id);
    requireValue(
      adapter.requiresCustomer === false || order.snapshot.customer,
      'shipment_customer_missing',
      409,
    );
    requireValue(
      order.payment_state === 'paid' &&
        order.stock_state === 'allocated' &&
        ['ready', 'labelled'].includes(order.fulfillment_state),
      'shipping_not_allowed',
      409,
    );
    const reference = store + '_' + id;
    await this.stmt(
      "INSERT OR IGNORE INTO shipments(store_id,order_id,reference,state) VALUES(?,?,?,'creating')",
      store,
      id,
      reference,
    ).run();
    let row = await this.one('SELECT * FROM shipments WHERE store_id=? AND order_id=?', store, id);
    if (row.state === 'registered') return row;
    // Never blindly create again after an uncertain result. Provider must deduplicate reference.
    const found = await adapter.find(reference);
    let result;
    try {
      if (!found) {
        await new FinishedStock(this).requireOrder(store, environment, id);
        await this.stmt(
          'UPDATE shipments SET first_attempt_at=COALESCE(first_attempt_at,?) WHERE store_id=? AND order_id=?',
          this.now(),
          store,
          id,
        ).run();
      }
      result = found || (await adapter.create({ reference, order }));
    } catch (error) {
      await this.stmt(
        "UPDATE shipments SET state=CASE WHEN first_attempt_at IS NULL THEN 'creating' ELSE 'unknown' END WHERE store_id=? AND order_id=?",
        store,
        id,
      ).run();
      if (error instanceof CommerceError && error.code === 'stock_quality_hold') throw error;
      if (String(error.message).includes('stock_quality_hold'))
        throw new CommerceError('stock_quality_hold', 409);
      throw new CommerceError('shipment_outcome_unknown', 503);
    }
    requireValue(result?.id && result?.label?.private === true, 'shipment_response_invalid', 502);
    await this.db.batch([
      this.stmt(
        "UPDATE shipments SET state='registered',provider_id=?,label_json=?,tracking=? WHERE store_id=? AND order_id=?",
        result.id,
        JSON.stringify(result.label),
        result.tracking || null,
        store,
        id,
      ),
      this.stmt(
        "UPDATE orders SET fulfillment_state='labelled' WHERE store_id=? AND id=?",
        store,
        id,
      ),
      ...this.event(store, 'ShipmentRegistered', id, { providerId: result.id }),
    ]);
    return this.one('SELECT * FROM shipments WHERE store_id=? AND order_id=?', store, id);
  }
  async requestWithdrawal(store, environment, id) {
    await this.getOrder(store, environment, id);
    const old = await this.one(
      'SELECT * FROM withdrawals WHERE store_id=? AND order_id=?',
      store,
      id,
    );
    if (old) return old;
    await this.db.batch([
      this.stmt('INSERT OR IGNORE INTO withdrawals VALUES(?,?,?)', store, id, this.now()),
      ...this.event(store, 'WithdrawalRequested', id),
    ]);
    // Request recording is not an automatic legal eligibility/refund decision.
    return this.one('SELECT * FROM withdrawals WHERE store_id=? AND order_id=?', store, id);
  }
  async confirmRefund(store, environment, id, { providerId, amount, currency }) {
    const order = await this.getOrder(store, environment, id);
    requireValue(
      identifier(providerId) && integer(amount, 1) && currency === order.currency,
      'invalid_refund',
    );
    const prior = await this.one(
      'SELECT * FROM refunds WHERE store_id=? AND provider_id=?',
      store,
      providerId,
    );
    if (prior) {
      requireValue(prior.order_id === id && prior.amount === amount, 'refund_conflict', 409);
      return { replayed: true };
    }
    try {
      await this.db.batch([
        this.stmt('INSERT INTO refunds VALUES(?,?,?,?)', store, id, providerId, amount),
        ...this.event(store, 'RefundConfirmed', id, { providerId, amount, currency }),
      ]);
    } catch (error) {
      const concurrent = await this.one(
        'SELECT * FROM refunds WHERE store_id=? AND provider_id=?',
        store,
        providerId,
      );
      if (concurrent) {
        requireValue(
          concurrent.order_id === id && concurrent.amount === amount,
          'refund_conflict',
          409,
        );
        return { replayed: true };
      }
      if (String(error.message).includes('refund_invalid'))
        throw new CommerceError('refund_invalid', 409);
      throw error;
    }
    return { replayed: false };
  }
  async postJournal(store, environment, { sourceId, currency, lines }) {
    await this.store(store, environment);
    requireValue(
      identifier(sourceId) &&
        /^[A-Z]{3}$/.test(currency) &&
        Array.isArray(lines) &&
        lines.length >= 2 &&
        lines.length <= 100,
      'invalid_journal',
    );
    for (const l of lines)
      requireValue(
        identifier(l.account) &&
          integer(l.debit) &&
          integer(l.credit) &&
          ((l.debit > 0 && l.credit === 0) || (l.credit > 0 && l.debit === 0)),
        'invalid_journal_line',
      );
    const debit = lines.reduce((a, l) => a + l.debit, 0),
      credit = lines.reduce((a, l) => a + l.credit, 0);
    requireValue(integer(debit, 1) && debit === credit, 'journal_unbalanced');
    const hash = await digest(canonical({ sourceId, currency, lines }));
    const prior = await this.one(
      'SELECT * FROM journal_entries WHERE store_id=? AND source_id=?',
      store,
      sourceId,
    );
    if (prior) {
      requireValue(prior.payload_hash === hash, 'journal_conflict', 409);
      return { id: prior.id, replayed: true };
    }
    const id = crypto.randomUUID();
    await this.db.batch([
      this.stmt(
        'INSERT INTO journal_entries VALUES(?,?,?,?,?,?)',
        store,
        id,
        sourceId,
        currency,
        hash,
        this.now(),
      ),
      ...lines.map((l, i) =>
        this.stmt(
          'INSERT INTO journal_lines VALUES(?,?,?,?,?,?)',
          store,
          id,
          i,
          l.account,
          l.debit,
          l.credit,
        ),
      ),
      ...this.event(store, 'JournalPosted', id, { sourceId, currency }),
    ]);
    return { id, replayed: false };
  }
  async claimOutbox(store, environment, limit = 20) {
    await this.store(store, environment);
    requireValue(integer(limit, 1, 100), 'invalid_limit');
    const token = crypto.randomUUID(),
      now = this.now();
    await this.stmt(
      "UPDATE outbox SET state='leased',lease_token=?,lease_until=?,attempts=attempts+1 WHERE store_id=? AND id IN (SELECT o.id FROM outbox o WHERE o.store_id=? AND o.state!='done' AND o.lease_until<=? AND NOT EXISTS(SELECT 1 FROM outbox_delivery d WHERE d.store_id=o.store_id AND d.event_id=o.id AND (d.state='dead' OR d.next_attempt_at>?)) ORDER BY o.created_at,o.id LIMIT ?)",
      token,
      now + 60000,
      store,
      store,
      now,
      now,
      limit,
    ).run();
    return this.rows('SELECT * FROM outbox WHERE store_id=? AND lease_token=?', store, token);
  }
  async completeOutbox(store, environment, id, token) {
    await this.store(store, environment);
    const result = await this.stmt(
      "UPDATE outbox SET state='done' WHERE store_id=? AND id=? AND lease_token=? AND state='leased' AND lease_until>?",
      store,
      id,
      token,
      this.now(),
    ).run();
    requireValue(result.meta.changes === 1, 'lease_conflict', 409);
  }
}
