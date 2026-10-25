import { requireValue, identifier, canonical, digest } from './validation.mjs';
import { operationallyAdmitted } from './admission.mjs';
import { CommerceOperations } from './operations.mjs';
import { DocumentFiles } from './document-pdf.mjs';
import { ShipmentCommands } from './shipment-commands.mjs';
import { CustomerNotifications } from './notifications.mjs';
import { ShippingAutomation } from './shipping-automation.mjs';
import { PaymentRecovery } from './payment-recovery.mjs';
const notifyKinds = [
  'OrderPlaced',
  'PaymentConfirmed',
  'RefundConfirmed',
  'ShipmentRegistered',
  'WithdrawalRequested',
];
const documentPollDelayMs = 60_000;
const documentPollWindowMs = 24 * 3600_000;
export class CommerceJobs {
  constructor(service, options = {}) {
    this.s = service;
    this.options = options;
    this.ops = new CommerceOperations(service);
    this.docs = new DocumentFiles(service, options.privateStorage, options.loadDocumentFont);
  }
  async notification(store, env, event) {
    const order = await this.s.getOrder(store, env, event.aggregate_id);
    if (!order.snapshot.customer?.email) return;
    const payload = {
      version: 1,
      storeId: store,
      environment: env,
      orderId: order.id,
      eventId: event.id,
      kind: event.kind,
      recipient: order.snapshot.customer.email,
      language: { LT: 'lt', PL: 'pl', LV: 'lv', EE: 'et' }[order.snapshot.country] || 'en',
      legalName: order.snapshot.legal.name,
      amount: order.amount,
      currency: order.currency,
      paymentState: order.payment_state,
      fulfillmentState: order.fulfillment_state,
      replyTo: order.snapshot.legal.email || null,
      ...(event.resumeUrl ? { resumeUrl: event.resumeUrl } : {}),
    };
    const hash = await digest(canonical(payload));
    const old = await this.s.one(
      'SELECT payload_hash FROM customer_notifications WHERE store_id=? AND event_id=?',
      store,
      event.id,
    );
    // The first event-specific snapshot remains immutable as later payment and
    // shipment state changes. Replays do not compose a new message body.
    if (old) return;
    await this.s
      .stmt(
        'INSERT OR IGNORE INTO customer_notifications(store_id,event_id,order_id,kind,payload_json,payload_hash,created_at) VALUES(?,?,?,?,?,?,?)',
        store,
        event.id,
        order.id,
        event.kind,
        JSON.stringify(payload),
        hash,
        this.s.now(),
      )
      .run();
  }
  async consume(store, env, event) {
    const payload = JSON.parse(event.payload_json);
    requireValue(
      payload.storeId === store &&
        payload.eventId === event.id &&
        payload.aggregateId === event.aggregate_id,
      'outbox_context_mismatch',
      409,
    );
    if (this.options.handlers?.[event.kind])
      return this.options.handlers[event.kind](payload, event);
    if (
      event.kind === 'PaymentConfirmed' ||
      event.kind === 'PackingConfirmed' ||
      event.kind === 'RefundConfirmed'
    ) {
      const sale = await this.ops.issueDocument(
        store,
        env,
        event.aggregate_id,
        { kind: 'sale' },
        'commerce_automation',
      );
      await this.docs.ensure(store, env, sale.document, 'commerce_automation');
      if (event.kind !== 'PaymentConfirmed') {
        const result = await this.ops.issueDocument(
          store,
          env,
          event.aggregate_id,
          event.kind === 'PackingConfirmed'
            ? { kind: 'packing' }
            : { kind: 'credit', refundId: payload.providerId },
          'commerce_automation',
        );
        await this.docs.ensure(store, env, result.document, 'commerce_automation');
      }
    }
    if (notifyKinds.includes(event.kind)) await this.notification(store, env, event);
    const automaticShipping = new ShippingAutomation(this.s, this.options);
    if (event.kind === 'PackingConfirmed')
      await automaticShipping.preparePacked(store, env, event.aggregate_id);
    if (event.kind === 'ShipmentRegistered')
      await automaticShipping.collectRegistered(store, env, event.aggregate_id);
    // Remaining domain events are already persisted/audited by their producer.
    // They are acknowledged here; optional consumers subscribe via handlers.
  }
  async dispatch(store, env, limit = 20) {
    const config = await this.s.store(store, env);
    requireValue(
      operationallyAdmitted(config, env) &&
        (env === 'sandbox' || config.automationPolicy?.approved === true),
      'automation_not_admitted',
      403,
    );
    const events = await this.s.claimOutbox(store, env, limit),
      results = [];
    for (const event of events) {
      try {
        await this.consume(store, env, event);
        const acknowledged = await this.s.db.batch([
          this.s.stmt(
            "INSERT INTO outbox_delivery SELECT ?,?,'done',0,NULL,? WHERE EXISTS(SELECT 1 FROM outbox WHERE store_id=? AND id=? AND lease_token=? AND state='leased' AND lease_until>?) ON CONFLICT(store_id,event_id) DO UPDATE SET state='done',next_attempt_at=0,last_error=NULL,updated_at=excluded.updated_at",
            store,
            event.id,
            this.s.now(),
            store,
            event.id,
            event.lease_token,
            this.s.now(),
          ),
          this.s.stmt(
            "UPDATE outbox SET state='done',lease_until=0 WHERE store_id=? AND id=? AND lease_token=? AND state='leased' AND lease_until>?",
            store,
            event.id,
            event.lease_token,
            this.s.now(),
          ),
        ]);
        requireValue(acknowledged[1].meta.changes === 1, 'lease_conflict', 409);
        results.push({ id: event.id, state: 'done' });
      } catch (error) {
        const errorCode =
            typeof error.code === 'string' && /^[a-z_]{1,80}$/.test(error.code)
              ? error.code
              : 'consumer_failed',
          pendingDocuments =
            event.kind === 'ShipmentRegistered' && errorCode === 'carrier_documents_pending',
          deferred = pendingDocuments && this.s.now() - event.created_at < documentPollWindowMs,
          code = pendingDocuments && !deferred ? 'carrier_documents_timeout' : errorCode,
          dead = pendingDocuments ? !deferred : event.attempts >= 5;
        const next =
          this.s.now() +
          (deferred
            ? documentPollDelayMs
            : Math.min(3600000, 1000 * 2 ** Math.min(event.attempts, 12)));
        await this.s.db.batch([
          this.s.stmt(
            "INSERT INTO outbox_delivery SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM outbox WHERE store_id=? AND id=? AND lease_token=? AND state='leased' AND lease_until>?) ON CONFLICT(store_id,event_id) DO UPDATE SET state=excluded.state,next_attempt_at=excluded.next_attempt_at,last_error=excluded.last_error,updated_at=excluded.updated_at",
            store,
            event.id,
            dead ? 'dead' : 'waiting',
            next,
            code,
            this.s.now(),
            store,
            event.id,
            event.lease_token,
            this.s.now(),
          ),
          this.s.stmt(
            "UPDATE outbox SET state='pending',lease_until=?,attempts=CASE WHEN ? THEN MAX(0,attempts-1) ELSE attempts END WHERE store_id=? AND id=? AND lease_token=? AND state='leased' AND lease_until>?",
            next,
            deferred ? 1 : 0,
            store,
            event.id,
            event.lease_token,
            this.s.now(),
          ),
        ]);
        results.push({ id: event.id, state: dead ? 'dead' : 'waiting', code });
      }
    }
    return results;
  }
  async retry(store, env, id, actor) {
    await this.s.store(store, env);
    requireValue(identifier(actor) && identifier(id), 'operator_identity_required', 403);
    const event = await this.s.one(
      'SELECT state FROM outbox_delivery WHERE store_id=? AND event_id=?',
      store,
      id,
    );
    requireValue(event?.state === 'dead', 'outbox_retry_conflict', 409);
    await this.s.db.batch([
      this.s.stmt(
        "UPDATE outbox_delivery SET state='waiting',next_attempt_at=0,last_error=NULL WHERE store_id=? AND event_id=? AND state='dead'",
        store,
        id,
      ),
      this.s.stmt(
        "UPDATE outbox SET state='pending',attempts=0,lease_token=NULL,lease_until=0 WHERE store_id=? AND id=? AND NOT EXISTS(SELECT 1 FROM outbox_delivery WHERE store_id=? AND event_id=? AND state='dead')",
        store,
        id,
        store,
        id,
      ),
      ...this.s.event(store, 'OutboxRetryRequested', crypto.randomUUID(), {
        sourceId: id,
        actorRef: actor,
      }),
    ]);
  }
  async overview(store, env) {
    await this.s.store(store, env);
    return {
      outbox: await this.s.rows(
        'SELECT o.id,o.kind,o.state,o.attempts,d.state deliveryState,d.next_attempt_at,d.last_error FROM outbox o LEFT JOIN outbox_delivery d ON d.store_id=o.store_id AND d.event_id=o.id WHERE o.store_id=? ORDER BY o.created_at DESC,o.id LIMIT 100',
        store,
      ),
      notifications: await this.s.rows(
        'SELECT event_id,order_id,kind,state,created_at,transport_ref FROM customer_notifications WHERE store_id=? ORDER BY created_at DESC LIMIT 100',
        store,
      ),
    };
  }
  async scheduled(store, env) {
    const admitted = await this.s.store(store, env);
    requireValue(
      operationallyAdmitted(admitted, env) &&
        (env === 'sandbox' || admitted.automationPolicy?.approved === true),
      'automation_not_admitted',
      403,
    );
    const expired = await this.s.expire(store, env);
    await this.ops.applyPendingRefunds(store, env);
    const events = await this.dispatch(store, env);
    const config = await this.s.store(store, env),
      carrier = this.options.shippingAdapters?.[store];
    if (config.automationPolicy?.autoExecutePreparedShipments === true && carrier) {
      const commands = new ShipmentCommands(this.s, this.options.privateStorage);
      for (const c of await this.s.rows(
        "SELECT id FROM shipment_commands WHERE store_id=? AND state='planned' AND first_attempt_at IS NULL ORDER BY created_at LIMIT 20",
        store,
      ))
        await commands.execute(store, env, c.id, carrier, 'commerce_automation').catch(() => {});
    }
    if (
      config.automationPolicy?.sendNotifications === true &&
      config.notificationPolicy?.approved === true
    ) {
      const recovery = new PaymentRecovery(this.s, this.options);
      if (config.paymentRecovery?.enabled === true) {
        for (const order of await this.s.rows(
          "SELECT id FROM orders WHERE store_id=? AND payment_state='pending' AND stock_state='reserved' AND created_at>=? AND created_at<=? AND expires_at>? AND NOT EXISTS(SELECT 1 FROM customer_notifications n WHERE n.store_id=orders.store_id AND n.order_id=orders.id AND n.kind='PaymentReminder') ORDER BY created_at LIMIT 20",
          store,
          Math.max(config.paymentRecovery.enabledAt, this.s.now() - 86400000 + 1),
          this.s.now() - config.paymentRecovery.reminderAfterHours * 3600000,
          this.s.now(),
        )) {
          try {
            if (!(await recovery.canRemind(store, env, order.id))) continue;
            const current = await this.s.getOrder(store, env, order.id);
            await this.notification(store, env, {
              id: 'PaymentReminder_' + order.id,
              aggregate_id: order.id,
              kind: 'PaymentReminder',
              resumeUrl:
                config.paymentRecovery.origin +
                '/cart#resume=' +
                (await recovery.token(store, env, current)),
            });
          } catch {
            /* Unknown provider state defers; it never authorizes sending. */
          }
        }
      }
      const notifications = new CustomerNotifications(this.s, this.options.notificationAdapters, {
        reminderCheck: (...args) => recovery.canRemind(...args),
      });
      for (const n of await this.s.rows(
        "SELECT event_id FROM customer_notifications WHERE store_id=? AND state IN ('prepared','unknown','sending') ORDER BY created_at LIMIT 20",
        store,
      ))
        await notifications.execute(store, env, n.event_id, 'commerce_automation').catch(() => {});
    }
    return { expired, events };
  }
}
