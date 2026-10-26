import {
  CommerceError,
  requireValue,
  identifier,
  integer,
  canonical,
  digest,
} from './validation.mjs';
import { documentPolicy } from './admission.mjs';

export class CommerceOperations {
  constructor(service) {
    this.s = service;
  }
  async markets(store, environment) {
    const config = await this.s.store(store, environment);
    return {
      requireCustomer: config.requireCustomer === true,
      markets: config.markets.map((m) => ({
        country: m.country,
        currency: m.currency,
        policyVersion: m.policyVersion,
        checkoutEnabled: m.checkoutEnabled !== false,
        delivery: m.checkoutEnabled === false ? [] : m.delivery.filter((d) => d.enabled !== false),
      })),
    };
  }
  async listOrders(store, environment, { before, beforeId, state, limit = 30 } = {}) {
    await this.s.store(store, environment);
    requireValue(
      integer(limit, 1, 100) &&
        ((before === undefined && beforeId === undefined) ||
          (integer(before, 0) && identifier(beforeId))) &&
        (state === undefined ||
          ['pending', 'paid', 'failed', 'partially_refunded', 'refunded'].includes(state)),
      'invalid_order_filter',
    );
    const conditions = ['store_id=?'],
      args = [store];
    if (before !== undefined) {
      conditions.push('(created_at<? OR (created_at=? AND id<?))');
      args.push(before, before, beforeId);
    }
    if (state !== undefined) {
      conditions.push('payment_state=?');
      args.push(state);
    }
    const rows = await this.s.rows(
      'SELECT * FROM orders WHERE ' +
        conditions.join(' AND ') +
        ' ORDER BY created_at DESC,id DESC LIMIT ?',
      ...args,
      limit,
    );
    return rows.map((r) => this.s.view(r));
  }
  async ordersPage(store, environment, options = {}) {
    const limit = options.limit ?? 30;
    const rows = await this.listOrders(store, environment, { ...options, limit });
    const last = rows.at(-1);
    return {
      orders: rows,
      nextCursor: rows.length === limit ? { before: last.created_at, beforeId: last.id } : null,
    };
  }
  async overview(store, environment) {
    const config = await this.s.store(store, environment);
    const counts = await this.s.one(
      "SELECT COUNT(*) total,COALESCE(SUM(payment_state='pending'),0) pending,COALESCE(SUM(payment_state='paid' AND stock_state='allocated' AND fulfillment_state IN ('pending','ready')),0) to_pack,COALESCE(SUM(fulfillment_state='stock_exception'),0) exceptions FROM orders WHERE store_id=?",
      store,
    );
    const page = await this.ordersPage(store, environment);
    const inventory = await this.s.rows(
      'SELECT i.sku,i.available,p.definition_json FROM inventory i JOIN products p ON p.store_id=i.store_id AND p.sku=i.sku WHERE i.store_id=?',
      store,
    );
    const catalog = (await this.s.catalog(store, environment)).map((p) => {
      const row = inventory.find((i) => i.sku === p.sku),
        definition = JSON.parse(row.definition_json);
      return {
        ...p,
        sellableAvailable: p.available,
        available: row.available,
        lotTrackingRequired: definition.lotTrackingRequired === true,
        stockMode:
          definition.lotTrackingRequired === false
            ? 'simple'
            : definition.lotTrackingRequired === true
              ? 'lots'
              : 'legacy',
      };
    });
    return {
      storeId: store,
      environment,
      legalName: config.legalSnapshot.name,
      testOnly: config.testOnly === true,
      counts,
      catalog,
      orders: page.orders,
      nextOrderCursor: page.nextCursor,
      documents: await this.listDocuments(store, environment),
      adjustments: await this.s.rows(
        'SELECT * FROM stock_adjustments WHERE store_id=? ORDER BY created_at DESC,id DESC LIMIT 30',
        store,
      ),
      refundExceptions: await this.s.rows(
        "SELECT event_id,provider_id,payment_id,status,reason,created_at FROM provider_refund_events WHERE store_id=? AND processing_state='exception' ORDER BY created_at DESC LIMIT 30",
        store,
      ),
      pendingRefundEvents: (
        await this.s.one(
          "SELECT COUNT(*) count FROM provider_refund_events WHERE store_id=? AND processing_state='pending'",
          store,
        )
      ).count,
    };
  }
  async acceptRefundEvent(store, environment, event) {
    const s = this.s,
      config = await s.store(store, environment);
    requireValue(
      event?.environment === environment && event.accountRef === config.paymentAccountRef,
      'payment_account_mismatch',
      403,
    );
    requireValue(
      identifier(event.id) &&
        identifier(event.providerId) &&
        identifier(event.paymentId) &&
        integer(event.amount, 1) &&
        /^[A-Z]{3}$/.test(event.currency) &&
        ['pending', 'requires_action', 'succeeded', 'failed', 'canceled'].includes(event.status),
      'invalid_refund_event',
    );
    // Command metadata is only a lookup hint; keep the established money-fact
    // fingerprint stable for events accepted before refund commands existed.
    const { commandId: _commandId, ...moneyEvent } = event;
    const hash = await digest(canonical(moneyEvent));
    const compatibleHash = _commandId === undefined ? hash : await digest(canonical(event));
    const old = await s.one(
      'SELECT payload_hash FROM event_inbox WHERE store_id=? AND provider=? AND event_id=?',
      store,
      'stripe',
      event.id,
    );
    if (old)
      requireValue(
        [hash, compatibleHash].includes(old.payload_hash),
        'provider_event_conflict',
        409,
      );
    else {
      try {
        await s.db.batch([
          s.stmt(
            'INSERT INTO event_inbox VALUES(?,?,?,?,?)',
            store,
            'stripe',
            event.id,
            hash,
            s.now(),
          ),
          s.stmt(
            'INSERT INTO provider_refund_events(store_id,event_id,payload_hash,provider_id,payment_id,currency,amount,status,created_at) VALUES(?,?,?,?,?,?,?,?,?)',
            store,
            event.id,
            hash,
            event.providerId,
            event.paymentId,
            event.currency,
            event.amount,
            event.status,
            s.now(),
          ),
        ]);
      } catch (error) {
        const concurrent = await s.one(
          'SELECT payload_hash FROM event_inbox WHERE store_id=? AND provider=? AND event_id=?',
          store,
          'stripe',
          event.id,
        );
        if (!concurrent) throw error;
        requireValue(
          [hash, compatibleHash].includes(concurrent.payload_hash),
          'provider_event_conflict',
          409,
        );
      }
    }
    await this.applyPendingRefunds(store, environment);
    return {
      replayed: Boolean(old),
      event: await s.one(
        'SELECT processing_state,reason FROM provider_refund_events WHERE store_id=? AND event_id=?',
        store,
        event.id,
      ),
    };
  }
  async refundException(store, row, reason) {
    const s = this.s;
    await s.db.batch([
      s.stmt(
        "UPDATE provider_refund_events SET processing_state='exception',reason=? WHERE store_id=? AND event_id=?",
        reason,
        store,
        row.event_id,
      ),
      ...s.event(store, 'RefundReviewNeeded', row.provider_id, {
        paymentId: row.payment_id,
        reason,
      }),
    ]);
  }
  async applyPendingRefunds(store, environment) {
    const s = this.s;
    await s.store(store, environment);
    const rows = await s.rows(
      "SELECT * FROM provider_refund_events e WHERE store_id=? AND processing_state='pending' AND (status!='succeeded' OR EXISTS(SELECT 1 FROM orders o WHERE o.store_id=e.store_id AND o.payment_id=e.payment_id)) ORDER BY created_at,event_id LIMIT 100",
      store,
    );
    for (const row of rows) {
      if (['failed', 'canceled'].includes(row.status)) {
        await this.refundException(store, row, 'provider_refund_' + row.status);
        continue;
      }
      if (row.status !== 'succeeded') {
        await s
          .stmt(
            "UPDATE provider_refund_events SET processing_state='observed' WHERE store_id=? AND event_id=?",
            store,
            row.event_id,
          )
          .run();
        continue;
      }
      const conflicting = await s.one(
        "SELECT event_id FROM provider_refund_events WHERE store_id=? AND provider_id=? AND (status IN ('failed','canceled') OR payment_id!=? OR amount!=? OR currency!=?) LIMIT 1",
        store,
        row.provider_id,
        row.payment_id,
        row.amount,
        row.currency,
      );
      if (conflicting) {
        await this.refundException(store, row, 'provider_facts_conflict');
        continue;
      }
      const order = await s.one(
        'SELECT * FROM orders WHERE store_id=? AND payment_id=?',
        store,
        row.payment_id,
      );
      if (!order) continue; // Refund can arrive before the Checkout payment event. Keep it durable.
      if (order.currency !== row.currency) {
        await this.refundException(store, row, 'refund_currency_mismatch');
        continue;
      }
      try {
        await s.confirmRefund(store, environment, order.id, {
          providerId: row.provider_id,
          amount: row.amount,
          currency: row.currency,
        });
        await s
          .stmt(
            "UPDATE provider_refund_events SET processing_state='applied' WHERE store_id=? AND event_id=?",
            store,
            row.event_id,
          )
          .run();
      } catch (error) {
        if (
          error instanceof CommerceError &&
          ['refund_invalid', 'refund_conflict'].includes(error.code)
        )
          await this.refundException(store, row, error.code);
        else throw error;
      }
    }
    return {
      pending: (
        await s.one(
          "SELECT COUNT(*) count FROM provider_refund_events WHERE store_id=? AND processing_state='pending'",
          store,
        )
      ).count,
    };
  }
  async adjustStock(store, environment, input, actorRef) {
    const s = this.s;
    await s.store(store, environment);
    requireValue(identifier(actorRef), 'operator_identity_required', 403);
    requireValue(
      input &&
        identifier(input.id) &&
        identifier(input.sku) &&
        integer(input.delta, -100000, 100000) &&
        input.delta !== 0 &&
        integer(input.expectedAvailable, 0, 100000) &&
        typeof input.reason === 'string' &&
        input.reason.trim().length >= 3 &&
        input.reason.trim().length <= 200 &&
        !/[\x00-\x1f\x7f]/.test(input.reason),
      'invalid_stock_adjustment',
    );
    const payload = {
      id: input.id,
      sku: input.sku,
      delta: input.delta,
      expectedAvailable: input.expectedAvailable,
      reason: input.reason.trim(),
      actorRef,
    };
    const hash = await digest(canonical(payload));
    const get = () =>
      s.one('SELECT * FROM stock_adjustments WHERE store_id=? AND id=?', store, input.id);
    const replay = (row) => {
      requireValue(row.payload_hash === hash, 'stock_adjustment_id_conflict', 409);
      return { adjustment: row, replayed: true };
    };
    const old = await get();
    if (old) return replay(old);
    try {
      await s.db.batch([
        s.stmt(
          'INSERT INTO stock_adjustments VALUES(?,?,?,?,?,?,?,?,?)',
          store,
          input.id,
          input.sku,
          input.delta,
          input.expectedAvailable,
          payload.reason,
          actorRef,
          hash,
          s.now(),
        ),
        ...s.event(store, 'StockAdjusted', input.id, {
          sku: input.sku,
          delta: input.delta,
          actorRef,
        }),
      ]);
    } catch (error) {
      const concurrent = await get();
      if (concurrent) return replay(concurrent);
      if (String(error.message).includes('stock_adjustment_conflict'))
        throw new CommerceError('stock_adjustment_conflict', 409);
      throw error;
    }
    return { adjustment: await get(), replayed: false };
  }
  documentView(row) {
    if (!row) return null;
    const { payload_json, ...safe } = row;
    return {
      ...safe,
      numberLabel: `${row.series}-${row.year}-${String(row.number).padStart(6, '0')}`,
      payload: JSON.parse(payload_json),
    };
  }
  async listDocuments(store, environment, orderId) {
    await this.s.store(store, environment);
    requireValue(orderId === undefined || identifier(orderId), 'invalid_order_id');
    return (
      await this.s.rows(
        'SELECT * FROM documents WHERE store_id=?' +
          (orderId ? ' AND order_id=?' : '') +
          ' ORDER BY created_at DESC,id DESC LIMIT 100',
        ...[store, ...(orderId ? [orderId] : [])],
      )
    ).map((r) => this.documentView(r));
  }
  async getDocument(store, environment, id) {
    await this.s.store(store, environment);
    const row = await this.s.one('SELECT * FROM documents WHERE store_id=? AND id=?', store, id);
    requireValue(row, 'document_not_found', 404);
    return this.documentView(row);
  }
  async issueDocument(store, environment, orderId, { kind, refundId } = {}, actorRef) {
    const s = this.s,
      config = await s.store(store, environment);
    const policy = documentPolicy(config, environment);
    requireValue(identifier(actorRef), 'operator_identity_required', 403);
    requireValue(['sale', 'credit', 'packing'].includes(kind), 'invalid_document_kind');
    const order = await s.getOrder(store, environment, orderId);
    requireValue(
      config.legalEntityId === order.snapshot.legalEntityId,
      'document_legal_entity_changed',
      409,
    );
    requireValue(
      ['paid', 'partially_refunded', 'refunded'].includes(order.payment_state),
      'document_order_unpaid',
      409,
    );
    if (kind === 'packing')
      requireValue(order.stock_state === 'allocated', 'document_stock_exception', 409);
    let refund, original;
    if (kind === 'credit') {
      requireValue(identifier(refundId), 'invalid_refund');
      refund = await s.one(
        'SELECT * FROM refunds WHERE store_id=? AND order_id=? AND provider_id=?',
        store,
        orderId,
        refundId,
      );
      requireValue(refund, 'refund_not_found', 404);
      original = await s.one(
        "SELECT id,series,year,number FROM documents WHERE store_id=? AND order_id=? AND kind='sale'",
        store,
        orderId,
      );
      requireValue(original, 'original_document_required', 409);
    } else requireValue(refundId === undefined, 'invalid_document_source');
    const sourceId = kind === 'credit' ? refundId : orderId;
    const existing = () =>
      s.one(
        'SELECT * FROM documents WHERE store_id=? AND kind=? AND source_id=?',
        store,
        kind,
        sourceId,
      );
    const prior = await existing();
    if (prior) return { document: this.documentView(prior), replayed: true };
    const at = s.now(),
      year = Number(
        new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: policy.timeZone }).format(
          new Date(at),
        ),
      ),
      series = policy.series[kind],
      id = crypto.randomUUID();
    const payload = {
      schemaVersion: 1,
      internalTestDocument: policy.testOnly,
      documentMode: policy.testOnly ? 'internal_test' : policy.mode,
      timeZone: policy.timeZone,
      legalEntityId: order.snapshot.legalEntityId,
      legal: order.snapshot.legal,
      orderId,
      currency: order.currency,
      amount: kind === 'credit' ? refund.amount : order.amount,
      snapshot: order.snapshot,
      ...(refund ? { refund, originalDocument: original } : {}),
    };
    const hash = await digest(canonical(payload));
    try {
      await s.db.batch([
        s.stmt(
          'INSERT OR IGNORE INTO document_sequences(legal_entity_id,year,series) VALUES(?,?,?)',
          config.legalEntityId,
          year,
          series,
        ),
        s.stmt(
          'INSERT INTO documents SELECT ?,?,?,?,?,legal_entity_id,year,series,next_number,?,?,?,? FROM document_sequences WHERE legal_entity_id=? AND year=? AND series=?',
          store,
          id,
          orderId,
          kind,
          sourceId,
          JSON.stringify(payload),
          hash,
          actorRef,
          at,
          config.legalEntityId,
          year,
          series,
        ),
        s.stmt(
          'UPDATE document_sequences SET next_number=next_number+1 WHERE legal_entity_id=? AND year=? AND series=?',
          config.legalEntityId,
          year,
          series,
        ),
        ...s.event(store, 'DocumentIssued', id, { orderId, kind, actorRef }),
      ]);
    } catch (error) {
      const concurrent = await existing();
      if (concurrent) return { document: this.documentView(concurrent), replayed: true };
      throw error;
    }
    return { document: await this.getDocument(store, environment, id), replayed: false };
  }
}
