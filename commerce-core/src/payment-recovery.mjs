import { requireValue, canonical } from './validation.mjs';

const DAY = 86400000;
const encoder = new TextEncoder();
const tokenPattern = /^r1_([a-f0-9-]{36})_([a-z0-9]{8,11})_([a-f0-9]{64})$/;
const hex = (bytes) =>
  Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');

// This capability is purpose-bound and never replaces the buyer's original
// access hash. HTTP permits it only for read/receipt/payment continuation.
export class PaymentRecovery {
  constructor(service, { recoveryKeys = {}, paymentAdapters = {} } = {}) {
    this.s = service;
    this.keys = recoveryKeys;
    this.payments = paymentAdapters;
  }
  async policy(store, env) {
    const config = await this.s.store(store, env);
    const policy = config.paymentRecovery;
    requireValue(policy?.enabled === true, 'payment_recovery_unavailable', 404);
    return { config, policy };
  }
  async key(store) {
    const secret = this.keys[store];
    requireValue(
      typeof secret === 'string' && /^[a-f0-9]{64}$/.test(secret),
      'payment_recovery_not_configured',
      503,
    );
    return crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    );
  }
  message(store, env, id, until) {
    return encoder.encode(['commerce-payment-continuation-v1', store, env, id, until].join('\n'));
  }
  async token(store, env, order) {
    const until = order.created_at + 30 * DAY;
    const signature = await crypto.subtle.sign(
      'HMAC',
      await this.key(store),
      this.message(store, env, order.id, until),
    );
    return `r1_${order.id}_${until.toString(36)}_${hex(signature)}`;
  }
  async authorize(store, env, token, expectedId) {
    const match = typeof token === 'string' && token.match(tokenPattern);
    requireValue(
      match && (!expectedId || match[1] === expectedId),
      'payment_recovery_forbidden',
      403,
    );
    const until = parseInt(match[2], 36);
    requireValue(
      Number.isSafeInteger(until) && until > this.s.now(),
      'payment_recovery_expired',
      410,
    );
    const bytes = Uint8Array.from(match[3].match(/../g), (v) => parseInt(v, 16));
    requireValue(
      await crypto.subtle.verify(
        'HMAC',
        await this.key(store),
        bytes,
        this.message(store, env, match[1], until),
      ),
      'payment_recovery_forbidden',
      403,
    );
    const { policy } = await this.policy(store, env);
    const order = await this.s.getOrder(store, env, match[1]);
    requireValue(
      order.created_at >= policy.enabledAt &&
        until === order.created_at + 30 * DAY &&
        order.snapshot.paymentRecoveryNotice?.version === policy.noticeVersion,
      'payment_recovery_forbidden',
      403,
    );
    return order;
  }
  async replaced(store, order) {
    // No global email list or cross-store lookup. Compare actual configured
    // basket identity, not a name/address or inferred customer profile.
    const email = order.snapshot.customer?.email?.toLowerCase();
    if (!email) return false;
    const siblings = await this.s.rows(
      "SELECT id,snapshot_json FROM orders WHERE store_id=? AND id!=? AND created_at>=? AND created_at<=? AND lower(json_extract(snapshot_json,'$.customer.email'))=? ORDER BY created_at DESC LIMIT 100",
      store,
      order.id,
      order.created_at,
      order.created_at + DAY,
      email,
    );
    const identity = (snapshot) =>
      canonical({
        country: snapshot.country,
        currency: snapshot.currency,
        lines: snapshot.lines.map(({ sku, quantity, choices }) => ({
          sku,
          quantity,
          ...(choices ? { choices } : {}),
        })),
      });
    return siblings.some(
      (row) => identity(JSON.parse(row.snapshot_json)) === identity(order.snapshot),
    );
  }
  async observe(store, env, order) {
    if (!order.checkout_id) return { status: 'uncreated', paymentStatus: 'unpaid' };
    const { config } = await this.policy(store, env);
    const adapter = this.payments[store];
    requireValue(
      typeof adapter?.inspectSession === 'function',
      'payment_recovery_provider_unavailable',
      503,
    );
    return adapter.inspectSession(order.checkout_id, order, config);
  }
  async canRemind(store, env, id) {
    const { policy } = await this.policy(store, env);
    const order = await this.s.getOrder(store, env, id);
    const age = this.s.now() - order.created_at;
    if (
      !order.checkout_id ||
      order.snapshot.country !== 'LT' ||
      order.created_at < policy.enabledAt ||
      order.snapshot.paymentRecoveryNotice?.version !== policy.noticeVersion ||
      age < policy.reminderAfterHours * 3600000 ||
      age >= DAY ||
      order.payment_state !== 'pending' ||
      order.stock_state !== 'reserved' ||
      order.expires_at <= this.s.now() ||
      (await this.s.one(
        'SELECT order_id FROM withdrawals WHERE store_id=? AND order_id=?',
        store,
        id,
      )) ||
      (await this.replaced(store, order))
    )
      return false;
    const observed = await this.observe(store, env, order);
    return (
      ['open', 'uncreated'].includes(observed.status) &&
      observed.paymentStatus === 'unpaid' &&
      !observed.paymentProcessing
    );
  }
  async resolve(store, env, token) {
    const order = await this.authorize(store, env, token);
    if (order.payment_state !== 'pending') return { state: 'completed', order };
    if (
      (await this.s.one(
        'SELECT order_id FROM withdrawals WHERE store_id=? AND order_id=?',
        store,
        order.id,
      )) ||
      (await this.replaced(store, order))
    )
      return { state: 'unavailable', order: null };
    const observed = await this.observe(store, env, order);
    if (
      observed.paymentStatus !== 'unpaid' ||
      observed.paymentProcessing ||
      observed.status === 'complete'
    )
      return { state: 'processing', order };
    if (
      order.stock_state === 'reserved' &&
      order.expires_at > this.s.now() &&
      ['open', 'uncreated'].includes(observed.status)
    )
      return { state: 'open', order };
    // Never revive a Stripe Session. The UI must request fresh stock, prices,
    // shipping and terms before a buyer can create a replacement order.
    requireValue(observed.status === 'expired', 'payment_recovery_wait', 409);
    return { state: 'restore', order };
  }
}
