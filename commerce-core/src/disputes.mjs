import { requireValue, identifier, integer, canonical, digest } from './validation.mjs';
export class PaymentDisputes {
  constructor(service) {
    this.s = service;
  }
  async accept(store, env, event) {
    const config = await this.s.store(store, env);
    requireValue(
      event?.environment === env && event.accountRef === config.paymentAccountRef,
      'dispute_account_mismatch',
      403,
    );
    requireValue(
      identifier(event.id) &&
        /^dp_[A-Za-z0-9]+$/.test(event.disputeId) &&
        /^pi_[A-Za-z0-9]+$/.test(event.paymentId) &&
        integer(event.amount, 1) &&
        /^[A-Z]{3}$/.test(event.currency) &&
        [
          'warning_needs_response',
          'warning_under_review',
          'warning_closed',
          'needs_response',
          'under_review',
          'won',
          'lost',
          'prevented',
        ].includes(event.status) &&
        typeof event.reason === 'string' &&
        /^[a-z_]{1,80}$/.test(event.reason) &&
        integer(event.createdAt, 0, 8640000000000000) &&
        (event.evidenceDueAt === null || integer(event.evidenceDueAt, 0, 8640000000000000)),
      'invalid_dispute_event',
    );
    const factHash = await digest(canonical(event));
    const prior = await this.s.one(
      'SELECT payload_hash FROM payment_dispute_events WHERE store_id=? AND event_id=?',
      store,
      event.id,
    );
    if (prior) {
      requireValue(prior.payload_hash === factHash, 'dispute_event_conflict', 409);
      return { replayed: true };
    }
    const order = await this.s.one(
      'SELECT id,currency FROM orders WHERE store_id=? AND payment_id=?',
      store,
      event.paymentId,
    );
    requireValue(!order || order.currency === event.currency, 'dispute_currency_mismatch', 409);
    await this.s.db.batch([
      this.s.stmt(
        'INSERT OR IGNORE INTO payment_dispute_events VALUES(?,?,?,?,?,?,?,?,?)',
        store,
        event.id,
        event.disputeId,
        order?.id || null,
        event.paymentId,
        JSON.stringify(event),
        factHash,
        event.createdAt,
        this.s.now(),
      ),
      ...this.s.event(store, 'PaymentDisputeObserved', order?.id || event.disputeId, {
        providerId: event.id,
      }),
    ]);
    const saved = await this.s.one(
      'SELECT payload_hash FROM payment_dispute_events WHERE store_id=? AND event_id=?',
      store,
      event.id,
    );
    requireValue(saved.payload_hash === factHash, 'dispute_event_conflict', 409);
    return { replayed: false, matched: Boolean(order) };
  }
  async list(store, env, orderId) {
    await this.s.store(store, env);
    return (
      await this.s.rows(
        'SELECT d.payload_json,COALESCE(d.order_id,o.id) order_id FROM payment_dispute_events d LEFT JOIN orders o ON o.store_id=d.store_id AND o.payment_id=d.payment_id WHERE d.store_id=?' +
          (orderId ? ' AND COALESCE(d.order_id,o.id)=?' : '') +
          ' ORDER BY d.provider_created_at DESC,d.event_id DESC LIMIT 100',
        store,
        ...(orderId ? [orderId] : []),
      )
    ).map((r) => ({ ...JSON.parse(r.payload_json), orderId: r.order_id }));
  }
}
