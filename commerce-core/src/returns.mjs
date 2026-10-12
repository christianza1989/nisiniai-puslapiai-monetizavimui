import {
  requireValue,
  identifier,
  integer,
  canonical,
  digest,
  CommerceError,
} from './validation.mjs';
export class ReturnOperations {
  constructor(service) {
    this.s = service;
  }
  async list(store, env, orderId) {
    await this.s.getOrder(store, env, orderId);
    const receipts = await this.s.rows(
      'SELECT * FROM return_receipts WHERE store_id=? AND order_id=? ORDER BY created_at,id',
      store,
      orderId,
    );
    for (const receipt of receipts)
      receipt.lines = await this.s.rows(
        'SELECT sku,quantity,disposition,expiry_checked FROM return_receipt_lines WHERE store_id=? AND receipt_id=? ORDER BY sku',
        store,
        receipt.id,
      );
    return receipts;
  }
  async receive(store, env, orderId, input, actor) {
    const order = await this.s.getOrder(store, env, orderId);
    requireValue(
      identifier(actor) &&
        identifier(input?.id) &&
        typeof input.reason === 'string' &&
        input.reason.trim().length >= 3 &&
        input.reason.length <= 200 &&
        !/[\x00-\x1f\x7f]/.test(input.reason) &&
        Array.isArray(input.lines) &&
        input.lines.length > 0 &&
        input.lines.length <= 20,
      'invalid_return_receipt',
    );
    const seen = new Set(),
      lines = input.lines
        .map((l) => {
          requireValue(
            identifier(l?.sku) &&
              !seen.has(l.sku) &&
              integer(l.quantity, 1, 100) &&
              ['resalable', 'quarantine', 'disposed'].includes(l.disposition) &&
              typeof l.expiryChecked === 'boolean' &&
              (l.disposition !== 'resalable' || l.expiryChecked),
            'invalid_return_receipt',
          );
          seen.add(l.sku);
          return {
            sku: l.sku,
            quantity: l.quantity,
            disposition: l.disposition,
            expiryChecked: l.expiryChecked,
          };
        })
        .sort((a, b) => a.sku.localeCompare(b.sku));
    const hash = await digest(canonical({ orderId, lines, reason: input.reason.trim(), actor }));
    const existing = await this.s.one(
      'SELECT request_hash FROM return_receipts WHERE store_id=? AND id=?',
      store,
      input.id,
    );
    if (existing) {
      requireValue(existing.request_hash === hash, 'return_receipt_conflict', 409);
      return { replayed: true };
    }
    requireValue(
      order.stock_state === 'allocated' &&
        ['paid', 'partially_refunded', 'refunded'].includes(order.payment_state) &&
        order.fulfillment_state === 'labelled',
      'return_order_not_eligible',
      409,
    );
    try {
      await this.s.db.batch([
        this.s.stmt(
          'INSERT INTO return_receipts VALUES(?,?,?,?,?,?,?)',
          store,
          input.id,
          orderId,
          hash,
          input.reason.trim(),
          actor,
          this.s.now(),
        ),
        ...lines.map((l) =>
          this.s.stmt(
            'INSERT INTO return_receipt_lines VALUES(?,?,?,?,?,?,?)',
            store,
            input.id,
            orderId,
            l.sku,
            l.quantity,
            l.disposition,
            l.expiryChecked ? 1 : 0,
          ),
        ),
        this.s.stmt(
          "UPDATE orders SET fulfillment_state='return_received' WHERE store_id=? AND id=? AND (SELECT SUM(quantity) FROM order_lines WHERE store_id=? AND order_id=?)=(SELECT SUM(quantity) FROM return_receipt_lines WHERE store_id=? AND order_id=?)",
          store,
          orderId,
          store,
          orderId,
          store,
          orderId,
        ),
        ...this.s.event(store, 'ReturnReceived', input.id, { orderId, actorRef: actor }),
      ]);
    } catch (error) {
      const raced = await this.s.one(
        'SELECT request_hash FROM return_receipts WHERE store_id=? AND id=?',
        store,
        input.id,
      );
      if (raced?.request_hash === hash) return { replayed: true };
      if (String(error.message).includes('return_quantity_conflict'))
        throw new CommerceError('return_quantity_conflict', 409);
      if (String(error.message).includes('return_order_not_eligible'))
        throw new CommerceError('return_order_not_eligible', 409);
      throw error;
    }
    return { replayed: false };
  }
  async cancelUnshipped(store, env, orderId, input, actor) {
    await this.s.getOrder(store, env, orderId);
    requireValue(
      identifier(actor) &&
        identifier(input?.id) &&
        input.qualityChecked === true &&
        typeof input.reason === 'string' &&
        input.reason.trim().length >= 3 &&
        input.reason.length <= 200 &&
        !/[\x00-\x1f\x7f]/.test(input.reason),
      'invalid_unshipped_cancellation',
    );
    const old = await this.s.one(
      'SELECT * FROM unshipped_cancellations WHERE store_id=? AND order_id=?',
      store,
      orderId,
    );
    if (old) {
      requireValue(
        old.id === input.id && old.actor_ref === actor && old.reason === input.reason.trim(),
        'unshipped_cancel_conflict',
        409,
      );
      return { replayed: true };
    }
    try {
      await this.s.db.batch([
        this.s.stmt(
          'INSERT INTO unshipped_cancellations VALUES(?,?,?,?,?,?)',
          store,
          orderId,
          input.id,
          actor,
          input.reason.trim(),
          this.s.now(),
        ),
        ...this.s.event(store, 'UnshippedOrderCanceled', orderId, { actorRef: actor }),
      ]);
    } catch (error) {
      const concurrent = await this.s.one(
        'SELECT * FROM unshipped_cancellations WHERE store_id=? AND order_id=?',
        store,
        orderId,
      );
      if (
        concurrent?.id === input.id &&
        concurrent.actor_ref === actor &&
        concurrent.reason === input.reason.trim()
      )
        return { replayed: true };
      if (String(error.message).includes('unshipped_cancel_not_allowed'))
        throw new CommerceError('unshipped_cancel_not_allowed', 409);
      throw error;
    }
    return { replayed: false };
  }
}
