import { requireValue, digest, integer } from './validation.mjs';
import { settledLines } from './discounts.mjs';

const day = 86400000,
  lifetime = 180 * day,
  retention = 60 * day;
const ownKeys = (v, keys) =>
  v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).every((k) => keys.includes(k));
const clientId = /^[0-9]{1,20}\.[0-9]{1,20}$/;
const sessionId = /^[0-9]{1,16}$/;

// Optional configuration must never disable the functional shop on a bad value.
export function analyticsConnections(raw, environment) {
  try {
    if (typeof raw !== 'string' || raw.length > 16384) return {};
    const values = JSON.parse(raw),
      out = {};
    if (!ownKeys(values, Object.keys(values)) || Object.keys(values).length > 100) return {};
    for (const [store, value] of Object.entries(values)) {
      if (
        !/^[a-zA-Z0-9_-]{1,100}$/.test(store) ||
        value?.enabled !== true ||
        value.environment !== environment ||
        !/^G-[A-Z0-9]{6,20}$/.test(value.measurementId || '') ||
        !/^[a-zA-Z0-9_-]{16,128}$/.test(value.apiSecret || '') ||
        !integer(value.consentVersion, 1, 100) ||
        !Array.isArray(value.countries) ||
        !value.countries.length ||
        !value.countries.every((c) => /^[A-Z]{2}$/.test(c))
      )
        continue;
      out[store] = new Ga4MeasurementAdapter(value);
    }
    return out;
  } catch {
    return {};
  }
}

export class Ga4MeasurementAdapter {
  constructor(
    { measurementId, apiSecret, environment, consentVersion, countries },
    fetchImpl = (...args) => fetch(...args),
  ) {
    Object.assign(this, {
      measurementId,
      apiSecret,
      environment,
      consentVersion,
      countries,
      fetchImpl,
    });
  }
  async send(payload, { validate = false } = {}) {
    const url = new URL(
      validate
        ? 'https://region1.google-analytics.com/debug/mp/collect'
        : 'https://region1.google-analytics.com/mp/collect',
    );
    url.searchParams.set('measurement_id', this.measurementId);
    url.searchParams.set('api_secret', this.apiSecret);
    try {
      const response = await this.fetchImpl(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          validate ? { ...payload, validation_behavior: 'ENFORCE_RECOMMENDATIONS' } : payload,
        ),
        redirect: 'manual',
        signal: AbortSignal.timeout(8000),
      });
      if (validate) {
        const result = await response.json();
        return { accepted: response.ok, validationMessages: result.validationMessages || [] };
      }
      await response.body?.cancel();
      return {
        accepted: response.status >= 200 && response.status < 300,
        code: 'http_' + response.status,
      };
    } catch {
      return { accepted: false, code: 'transport_unknown' };
    }
  }
}

// The only money source is an immutable order + existing confirmed domain facts.
export function analyticsSale(order) {
  const snapshot = order.snapshot;
  requireValue(
    snapshot?.schemaVersion >= 1 &&
      /^[A-Z]{3}$/.test(order.currency) &&
      snapshot.currency === order.currency &&
      integer(order.amount, 1) &&
      Array.isArray(snapshot.lines) &&
      snapshot.lines.length > 0 &&
      snapshot.lines.length <= 100,
    'analytics_order_invalid',
  );
  let value = 0;
  const items = settledLines(snapshot).map((line) => {
    requireValue(
      /^[a-zA-Z0-9_-]{1,100}$/.test(line.sku) &&
        integer(line.quantity, 1, 1000) &&
        integer(line.unitAmount, 0) &&
        line.lineAmount === line.quantity * line.unitAmount,
      'analytics_order_invalid',
    );
    value += line.lineAmount;
    // Never send editable titles or labels: they can contain personalisation.
    const variant = Object.entries(line.choices || {})
      .filter(
        ([key, v]) =>
          /^[a-zA-Z0-9_-]{1,30}$/.test(key) &&
          typeof v === 'string' &&
          /^[a-zA-Z0-9_-]{1,30}$/.test(v),
      )
      .sort()
      .map(([k, v]) => k + ':' + v)
      .join('|')
      .slice(0, 100);
    return {
      item_id: line.sku,
      price: line.unitAmount / 100,
      quantity: line.quantity,
      ...(variant ? { item_variant: variant } : {}),
    };
  });
  const shipping = snapshot.delivery?.amount;
  requireValue(
    integer(shipping, 0) && value + shipping === order.amount,
    'analytics_total_mismatch',
  );
  return { currency: order.currency, value: value / 100, shipping: shipping / 100, items };
}

export class CommerceAnalytics {
  constructor(service, adapters = {}) {
    this.s = service;
    this.adapters = adapters;
  }
  async capture(store, environment, order, input) {
    const adapter = this.adapters[store];
    requireValue(adapter && adapter.environment === environment, 'analytics_unavailable', 503);
    requireValue(
      ownKeys(input, [
        'choice',
        'version',
        'at',
        'expiresAt',
        'clientId',
        'sessionId',
        'measurementId',
        'language',
      ]) &&
        ['granted', 'denied'].includes(input.choice) &&
        input.version === adapter.consentVersion,
      'analytics_context_invalid',
    );
    if (input.choice === 'denied') {
      await this.s.db.batch([
        this.s.stmt(
          'UPDATE order_analytics SET client_id=NULL,session_id=NULL,revoked_at=? WHERE store_id=? AND order_id=?',
          this.s.now(),
          store,
          order.id,
        ),
        this.s.stmt(
          "UPDATE analytics_delivery SET state='skipped',last_code='consent_revoked',lease_token=NULL,lease_until=NULL WHERE store_id=? AND order_id=? AND state IN ('pending','sending')",
          store,
          order.id,
        ),
      ]);
      return { state: 'revoked' };
    }
    const at = this.s.now();
    requireValue(
      order.store_id === store &&
        input.language === 'lt' &&
        adapter.countries.includes(order.snapshot.country) &&
        input.measurementId === adapter.measurementId &&
        clientId.test(input.clientId || '') &&
        sessionId.test(String(input.sessionId || '')) &&
        Number(input.sessionId) > 0 &&
        integer(input.at, 0, Number.MAX_SAFE_INTEGER) &&
        input.at <= at &&
        integer(input.expiresAt, input.at + 1, Number.MAX_SAFE_INTEGER) &&
        input.expiresAt <= input.at + lifetime &&
        input.expiresAt > at,
      'analytics_context_invalid',
    );
    // Do not backfill old paid orders using a new visitor/session.
    requireValue(
      order.payment_state === 'pending' && order.expires_at > at,
      'analytics_context_closed',
      409,
    );
    const captured = await this.s
      .stmt(
        "INSERT INTO order_analytics(store_id,order_id,environment,consent_version,consent_at,expires_at,client_id,session_id,captured_at,revoked_at) SELECT ?,?,?,?,?,?,?,?,?,NULL WHERE EXISTS(SELECT 1 FROM orders WHERE store_id=? AND id=? AND payment_state='pending' AND expires_at>?) ON CONFLICT(store_id,order_id) DO UPDATE SET consent_version=excluded.consent_version,consent_at=excluded.consent_at,expires_at=excluded.expires_at,client_id=excluded.client_id,session_id=excluded.session_id,captured_at=excluded.captured_at,revoked_at=NULL RETURNING order_id",
        store,
        order.id,
        environment,
        input.version,
        input.at,
        input.expiresAt,
        input.clientId,
        String(input.sessionId),
        at,
        store,
        order.id,
        at,
      )
      .first();
    requireValue(captured, 'analytics_context_closed', 409);
    return { state: 'ready' };
  }
  async enqueue(store, environment) {
    const adapter = this.adapters[store];
    if (!adapter || adapter.environment !== environment) return;
    const events = await this.s.rows(
      "SELECT o.* FROM outbox o JOIN order_analytics a ON a.store_id=o.store_id AND a.order_id=o.aggregate_id WHERE o.store_id=? AND a.environment=? AND a.client_id IS NOT NULL AND a.revoked_at IS NULL AND a.expires_at>? AND a.captured_at>=? AND o.created_at>=a.captured_at AND o.kind IN ('PaymentConfirmed','PaidStockException','RefundConfirmed') AND NOT EXISTS(SELECT 1 FROM analytics_delivery d WHERE d.store_id=o.store_id AND d.event_id=o.id) ORDER BY o.created_at,o.id LIMIT 100",
      store,
      environment,
      this.s.now(),
      this.s.now() - retention,
    );
    for (const event of events) {
      const kind = event.kind === 'RefundConfirmed' ? 'refund' : 'purchase',
        transaction = 'MC-' + (await digest(store + '\n' + event.aggregate_id)).slice(0, 40);
      // The two paid domain outcomes are one transaction, never two purchases.
      if (
        kind === 'purchase' &&
        (await this.s.one(
          "SELECT event_id FROM analytics_delivery WHERE store_id=? AND order_id=? AND kind='purchase'",
          store,
          event.aggregate_id,
        ))
      )
        continue;
      await this.s
        .stmt(
          'INSERT OR IGNORE INTO analytics_delivery(store_id,event_id,order_id,kind,transaction_id,occurred_at) VALUES(?,?,?,?,?,?)',
          store,
          event.id,
          event.aggregate_id,
          kind,
          transaction,
          event.created_at,
        )
        .run();
    }
  }
  async payload(store, environment, event, context) {
    const order = await this.s.getOrder(store, environment, event.order_id);
    requireValue(
      order.payment_id && ['paid', 'partially_refunded', 'refunded'].includes(order.payment_state),
      'analytics_not_paid',
    );
    const sale = analyticsSale(order),
      params = { transaction_id: event.transaction_id, ...sale };
    if (event.kind === 'refund') {
      const domain = await this.s.one(
        "SELECT payload_json FROM outbox WHERE store_id=? AND id=? AND kind='RefundConfirmed'",
        store,
        event.event_id,
      );
      const fact = JSON.parse(domain?.payload_json || 'null');
      const refund =
        fact &&
        (await this.s.one(
          'SELECT amount FROM refunds WHERE store_id=? AND order_id=? AND provider_id=?',
          store,
          order.id,
          fact.providerId,
        ));
      requireValue(
        refund && refund.amount === fact.amount && fact.currency === order.currency,
        'analytics_refund_invalid',
      );
      const previous = await this.s.one(
        "SELECT COALESCE(SUM(CAST(json_extract(payload_json,'$.amount') AS INTEGER)),0) n FROM outbox WHERE store_id=? AND aggregate_id=? AND kind='RefundConfirmed' AND (created_at<? OR (created_at=? AND id<?))",
        store,
        order.id,
        event.occurred_at,
        event.occurred_at,
        event.event_id,
      );
      const productCents = Math.round(sale.value * 100),
        before = previous.n,
        after = before + refund.amount;
      requireValue(after <= order.amount, 'analytics_refund_invalid');
      params.value = (Math.min(after, productCents) - Math.min(before, productCents)) / 100;
      params.shipping =
        (Math.max(0, after - productCents) - Math.max(0, before - productCents)) / 100;
      delete params.items; // Monetary partial refunds do not invent item quantities.
      params.event_id = 'refund_' + (await digest(event.event_id)).slice(0, 40);
    }
    const sessionAge = this.s.now() - Number(context.session_id) * 1000;
    if (sessionAge >= 0 && sessionAge <= day) params.session_id = Number(context.session_id);
    params.engagement_time_msec = 1;
    return {
      client_id: context.client_id,
      timestamp_micros: event.occurred_at * 1000,
      consent: { ad_user_data: 'DENIED', ad_personalization: 'DENIED' },
      events: [{ name: event.kind, params }],
    };
  }
  async dispatch(store, environment) {
    const adapter = this.adapters[store];
    if (!adapter || adapter.environment !== environment) return { enabled: false };
    await this.enqueue(store, environment);
    // Retain only a non-identifying delivery tombstone after withdrawal/retention.
    await this.s
      .stmt(
        'UPDATE order_analytics SET client_id=NULL,session_id=NULL,revoked_at=COALESCE(revoked_at,?) WHERE store_id=? AND (expires_at<=? OR captured_at<?)',
        this.s.now(),
        store,
        this.s.now(),
        this.s.now() - retention,
      )
      .run();
    const rows = await this.s.rows(
      "SELECT * FROM analytics_delivery WHERE store_id=? AND ((state='pending' AND next_attempt_at<=?) OR (state='sending' AND lease_until<=?)) ORDER BY occurred_at,CASE kind WHEN 'purchase' THEN 0 ELSE 1 END,event_id LIMIT 20",
      store,
      this.s.now(),
      this.s.now(),
    );
    const result = { enabled: true, sent: 0, skipped: 0, pending: 0, review: 0 };
    for (const candidate of rows) {
      if (candidate.state === 'sending' && candidate.kind === 'refund') {
        await this.s
          .stmt(
            "UPDATE analytics_delivery SET state='review',last_code='previous_result_unknown' WHERE store_id=? AND event_id=? AND state='sending' AND lease_until<=?",
            store,
            candidate.event_id,
            this.s.now(),
          )
          .run();
        result.review++;
        continue;
      }
      const lease = crypto.randomUUID(),
        at = this.s.now();
      const claim = await this.s
        .stmt(
          "UPDATE analytics_delivery SET state='sending',lease_token=?,lease_until=?,attempts=attempts+1 WHERE store_id=? AND event_id=? AND ((state='pending' AND next_attempt_at<=?) OR (state='sending' AND lease_until<=?)) RETURNING event_id",
          lease,
          at + 30000,
          store,
          candidate.event_id,
          at,
          at,
        )
        .first();
      if (!claim) continue;
      const finish = async (state, code) =>
        this.s
          .stmt(
            "UPDATE analytics_delivery SET state=?,last_code=?,sent_at=CASE WHEN ?='sent' THEN ? ELSE sent_at END,next_attempt_at=?,lease_token=NULL,lease_until=NULL WHERE store_id=? AND event_id=? AND lease_token=?",
            state,
            code,
            state,
            this.s.now(),
            this.s.now() + Math.min(3600000, 60000 * 2 ** Math.min(candidate.attempts, 6)),
            store,
            candidate.event_id,
            lease,
          )
          .run();
      try {
        const context = await this.s.one(
          'SELECT * FROM order_analytics WHERE store_id=? AND order_id=?',
          store,
          candidate.order_id,
        );
        if (
          !context ||
          context.environment !== environment ||
          context.consent_version !== adapter.consentVersion ||
          context.revoked_at !== null ||
          !context.client_id ||
          context.expires_at <= this.s.now() ||
          at - candidate.occurred_at > 72 * 3600000
        ) {
          await finish('skipped', 'consent_or_time_expired');
          result.skipped++;
          continue;
        }
        if (
          candidate.kind === 'refund' &&
          !(await this.s.one(
            "SELECT event_id FROM analytics_delivery WHERE store_id=? AND order_id=? AND kind='purchase' AND state='sent'",
            store,
            candidate.order_id,
          ))
        ) {
          await finish('pending', 'purchase_not_sent');
          result.pending++;
          continue;
        }
        const payload = await this.payload(store, environment, candidate, context);
        // Re-read withdrawal immediately before the external send.
        const still = await this.s.one(
          'SELECT client_id FROM order_analytics WHERE store_id=? AND order_id=? AND revoked_at IS NULL AND expires_at>?',
          store,
          candidate.order_id,
          this.s.now(),
        );
        if (!still?.client_id) {
          await finish('skipped', 'consent_revoked');
          result.skipped++;
          continue;
        }
        const sent = await adapter.send(payload);
        if (sent.accepted) {
          await finish('sent', sent.code);
          result.sent++;
        } else {
          const state = candidate.kind === 'refund' ? 'review' : 'pending';
          await finish(state, sent.code);
          result[state]++;
        }
      } catch {
        await finish('review', 'payload_or_storage_error');
        result.review++;
      }
    }
    return result;
  }
}
