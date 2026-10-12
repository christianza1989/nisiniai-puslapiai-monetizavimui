import { FinishedStock } from './finished-stock.mjs';
import {
  requireValue,
  identifier,
  integer,
  canonical,
  digest,
  CommerceError,
} from './validation.mjs';
import { requireOperation } from './admission.mjs';
import { PrivateFiles, hashBytes } from './private-storage.mjs';
const view = (row) =>
  row && { ...row, payload: JSON.parse(row.payload_json), payload_json: undefined };
export function completeSender(sender) {
  return (
    sender &&
    ['name', 'line1', 'city', 'postalCode', 'country', 'email', 'phone'].every(
      (k) =>
        typeof sender[k] === 'string' &&
        sender[k].length > 0 &&
        sender[k].length <= 254 &&
        !/[\x00-\x1f\x7f]/.test(sender[k]),
    ) &&
    /^[A-Z]{2}$/.test(sender.country) &&
    /^\+[1-9][0-9]{6,14}$/.test(sender.phone) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender.email)
  );
}
export class ShipmentCommands {
  constructor(service, storage) {
    this.s = service;
    this.files = new PrivateFiles(service, storage);
  }
  async get(store, env, id) {
    await this.s.store(store, env);
    const row = await this.s.one(
      'SELECT * FROM shipment_commands WHERE store_id=? AND id=?',
      store,
      id,
    );
    requireValue(row && row.environment === env, 'shipment_command_missing', 404);
    return view(row);
  }
  async list(store, env, orderId) {
    await this.s.getOrder(store, env, orderId);
    return (
      await this.s.rows(
        'SELECT * FROM shipment_commands WHERE store_id=? AND order_id=? ORDER BY created_at,id',
        store,
        orderId,
      )
    ).map(view);
  }
  async prepare(store, env, orderId, input, actor) {
    const config = await this.s.store(store, env);
    requireOperation(config, env, 'shipping_not_admitted');
    requireValue(
      identifier(actor) &&
        identifier(input?.id) &&
        identifier(input.planId) &&
        identifier(input.quoteId) &&
        identifier(input.serviceId) &&
        integer(input.maxCost, 1),
      'invalid_shipment_command',
    );
    const request = {
      orderId,
      planId: input.planId,
      quoteId: input.quoteId,
      serviceId: input.serviceId,
      maxCost: input.maxCost,
      actor,
    };
    const hash = await digest(canonical(request));
    const old = await this.s.one(
      'SELECT * FROM shipment_commands WHERE store_id=? AND id=?',
      store,
      input.id,
    );
    if (old) {
      requireValue(old.payload_hash === hash, 'shipment_command_conflict', 409);
      return { command: view(old), replayed: true };
    }
    const plan = view(
      await this.s.one(
        'SELECT * FROM shipping_plans WHERE store_id=? AND id=? AND order_id=?',
        store,
        input.planId,
        orderId,
      ),
    );
    const quote = view(
      await this.s.one(
        'SELECT * FROM shipping_quotes WHERE store_id=? AND id=? AND plan_id=?',
        store,
        input.quoteId,
        input.planId,
      ),
    );
    requireValue(plan && quote, 'shipping_plan_not_found', 404);
    const offer = quote.payload.offers.find((o) => o.serviceId === input.serviceId);
    requireValue(
      offer &&
        offer.amount <= input.maxCost &&
        offer.currency === plan.payload.currency &&
        quote.payload.environment === env &&
        quote.payload.accountRef === config.shippingAccountRef,
      'shipment_quote_mismatch',
      409,
    );
    requireValue(this.s.now() - quote.created_at <= 15 * 60000, 'shipment_quote_stale', 409);
    const order = await this.s.getOrder(store, env, orderId);
    requireValue(
      !(await this.s.one(
        'SELECT order_id FROM shipments WHERE store_id=? AND order_id=?',
        store,
        orderId,
      )),
      'shipment_command_conflict',
      409,
    );
    requireValue(
      order.payment_state === 'paid' &&
        order.stock_state === 'allocated' &&
        order.fulfillment_state === 'ready',
      'shipping_not_allowed',
      409,
    );
    const sender = plan.payload.origin,
      customer = order.snapshot.customer;
    requireValue(completeSender(sender) && customer?.address, 'shipment_sender_incomplete', 409);
    const payload = {
      ...request,
      sender,
      recipient: {
        ...customer.address,
        name: customer.contactName || customer.name,
        ...(customer.isCompany
          ? { companyName: customer.name, companyCode: customer.companyCode }
          : {}),
        phone: customer.phone,
        email: customer.email,
        isCompany: plan.payload.recipient.isCompany,
        ...(customer.locker ? { locker: customer.locker } : {}),
      },
      parcels: plan.payload.parcels,
      value: plan.payload.value,
      currency: plan.payload.currency,
      serviceId: offer.serviceId,
      quoteAmount: offer.amount,
    };
    try {
      await this.s.db.batch([
        this.s.stmt(
          'INSERT INTO shipment_commands(store_id,id,order_id,plan_id,account_ref,environment,provider,payload_hash,payload_json,actor_ref,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
          store,
          input.id,
          orderId,
          input.planId,
          quote.payload.accountRef,
          env,
          quote.payload.provider,
          hash,
          JSON.stringify(payload),
          actor,
          this.s.now(),
        ),
        ...this.s.event(store, 'ShipmentPrepared', input.id, { orderId, actorRef: actor }),
      ]);
    } catch (error) {
      const raced = await this.s.one(
        'SELECT * FROM shipment_commands WHERE store_id=? AND id=?',
        store,
        input.id,
      );
      if (raced && raced.payload_hash === hash) return { command: view(raced), replayed: true };
      if (String(error.message).includes('UNIQUE'))
        throw new CommerceError('shipment_command_conflict', 409);
      throw error;
    }
    return { command: await this.get(store, env, input.id), replayed: false };
  }
  binding(command, env, adapter) {
    requireValue(
      adapter?.environment === env &&
        adapter.accountRef === command.account_ref &&
        adapter.provider === command.provider &&
        adapter.supportsBooking === true &&
        adapter.createBooking &&
        adapter.verifyBooking,
      'shipping_not_connected',
      503,
    );
  }
  async observe(command, kind, payload) {
    const id = await digest(canonical({ commandId: command.id, kind, payload }));
    await this.s
      .stmt(
        'INSERT OR IGNORE INTO shipment_observations VALUES(?,?,?,?,?,?)',
        command.store_id,
        command.id,
        id,
        kind,
        JSON.stringify(payload),
        this.s.now(),
      )
      .run();
  }
  async finish(command, fact, adapter, actor, lease) {
    requireValue(
      await adapter.verifyBooking(command.payload, fact),
      'shipment_facts_mismatch',
      409,
    );
    requireValue(
      identifier(fact.id) &&
        (fact.tracking === undefined ||
          (typeof fact.tracking === 'string' &&
            fact.tracking.length <= 200 &&
            !/[\x00-\x1f\x7f]/.test(fact.tracking))),
      'shipment_response_invalid',
      502,
    );
    await this.observe(command, 'booking', { ...fact, actorRef: actor });
    await this.s.db.batch([
      this.s.stmt(
        "UPDATE shipment_commands SET state='registered',provider_id=?,review_reason=NULL WHERE store_id=? AND id=? AND lease_token=? AND lease_until>?",
        fact.id,
        command.store_id,
        command.id,
        lease,
        this.s.now(),
      ),
      this.s.stmt(
        "INSERT OR IGNORE INTO shipments(store_id,order_id,reference,state,provider_id,tracking) SELECT ?,?,?,'registered',?,? WHERE EXISTS(SELECT 1 FROM shipment_commands WHERE store_id=? AND id=? AND state='registered' AND provider_id=? AND lease_token=?)",
        command.store_id,
        command.order_id,
        'command_' + command.id,
        fact.id,
        fact.tracking || null,
        command.store_id,
        command.id,
        fact.id,
        lease,
      ),
      this.s.stmt(
        "UPDATE orders SET fulfillment_state='labelled' WHERE store_id=? AND id=? AND EXISTS(SELECT 1 FROM shipment_commands WHERE store_id=? AND id=? AND state='registered' AND lease_token=?)",
        command.store_id,
        command.order_id,
        command.store_id,
        command.id,
        lease,
      ),
      ...this.s.event(
        command.store_id,
        'ShipmentRegistered',
        command.order_id,
        { providerId: fact.id },
        {
          sql: "EXISTS(SELECT 1 FROM shipment_commands WHERE store_id=? AND id=? AND state='registered' AND lease_token=?)",
          args: [command.store_id, command.id, lease],
        },
      ),
    ]);
    const finished = await this.get(command.store_id, command.environment, command.id);
    requireValue(
      finished.state === 'registered' && finished.provider_id === fact.id,
      'shipment_execution_busy',
      409,
    );
    const projection = await this.s.one(
      'SELECT provider_id FROM shipments WHERE store_id=? AND order_id=?',
      command.store_id,
      command.order_id,
    );
    requireValue(projection.provider_id === fact.id, 'shipment_projection_conflict', 409);
    return { command: finished, replayed: false };
  }
  async execute(store, env, id, adapter, actor) {
    const config = await this.s.store(store, env);
    requireOperation(config, env, 'shipping_not_admitted');
    requireValue(identifier(actor), 'operator_identity_required', 403);
    const command = await this.get(store, env, id);
    this.binding(command, env, adapter);
    if (command.state === 'registered') return { command, replayed: true };
    requireValue(
      !['canceled', 'review'].includes(command.state),
      'shipment_execution_not_allowed',
      409,
    );
    // Non-idempotent APIs get at most one POST, even after timeout/restart.
    requireValue(
      command.first_attempt_at === null || adapter.supportsIdempotentCreate === true,
      'shipment_reconciliation_required',
      409,
    );
    const order = await this.s.getOrder(store, env, command.order_id);
    await new FinishedStock(this.s).requireOrder(store, env, order.id);
    requireValue(
      order.payment_state === 'paid' &&
        order.fulfillment_state === 'ready' &&
        order.stock_state === 'allocated',
      'shipping_not_allowed',
      409,
    );
    const lease = crypto.randomUUID(),
      now = this.s.now();
    const claimed = await this.s
      .stmt(
        "UPDATE shipment_commands SET state='executing',lease_token=?,lease_until=? WHERE store_id=? AND id=? AND state IN ('planned','unknown','executing') AND lease_until<=? AND (first_attempt_at IS NULL OR ?=1)",
        lease,
        now + 60000,
        store,
        id,
        now,
        adapter.supportsIdempotentCreate === true ? 1 : 0,
      )
      .run();
    requireValue(claimed.meta.changes === 1, 'shipment_execution_busy', 409);
    try {
      // Read-only price validation precedes the irreversible request. The
      // admitted provider contract must also enforce the actual cost ceiling.
      requireValue(
        adapter.validateCost && (await adapter.validateCost(command.payload)),
        'shipment_price_changed',
        409,
      );
      await new FinishedStock(this.s).requireOrder(store, env, command.order_id);
      const marked = await this.s
        .stmt(
          "UPDATE shipment_commands SET first_attempt_at=COALESCE(first_attempt_at,?) WHERE store_id=? AND id=? AND lease_token=? AND lease_until>? AND EXISTS(SELECT 1 FROM orders WHERE store_id=? AND id=? AND payment_state='paid' AND stock_state='allocated' AND fulfillment_state='ready')",
          this.s.now(),
          store,
          id,
          lease,
          this.s.now(),
          store,
          command.order_id,
        )
        .run();
      requireValue(marked.meta.changes === 1, 'shipment_execution_busy', 409);
      const fact = await adapter.createBooking({
        ...command.payload,
        reference: store + '_' + command.id,
      });
      return await this.finish(command, fact, adapter, actor, lease);
    } catch (error) {
      await this.s
        .stmt(
          "UPDATE shipment_commands SET state=CASE WHEN first_attempt_at IS NULL THEN 'planned' ELSE 'unknown' END,review_reason=?,lease_until=0 WHERE store_id=? AND id=? AND lease_token=?",
          String(error.message).includes('stock_quality_hold')
            ? 'stock_quality_hold'
            : error instanceof CommerceError
              ? error.code
              : 'provider_outcome_unknown',
          store,
          id,
          lease,
        )
        .run();
      if (error instanceof CommerceError) throw error;
      if (String(error.message).includes('stock_quality_hold'))
        throw new CommerceError('stock_quality_hold', 409);
      throw new CommerceError('shipment_outcome_unknown', 503);
    }
  }
  async reconcile(store, env, id, input, adapter, actor) {
    const config = await this.s.store(store, env);
    requireOperation(config, env, 'shipping_not_admitted');
    requireValue(
      identifier(actor) &&
        identifier(input?.providerId) &&
        typeof input.reason === 'string' &&
        input.reason.trim().length >= 3 &&
        input.reason.length <= 200,
      'invalid_shipment_reconciliation',
    );
    const command = await this.get(store, env, id);
    this.binding(command, env, adapter);
    if (command.state === 'registered') {
      requireValue(command.provider_id === input.providerId, 'shipment_facts_mismatch', 409);
      return { command, replayed: true };
    }
    requireValue(
      command.first_attempt_at !== null && !['canceled'].includes(command.state),
      'shipment_reconciliation_required',
      409,
    );
    const lease = crypto.randomUUID(),
      now = this.s.now();
    const claim = await this.s
      .stmt(
        "UPDATE shipment_commands SET lease_token=?,lease_until=? WHERE store_id=? AND id=? AND state IN ('unknown','executing','review') AND lease_until<=?",
        lease,
        now + 60000,
        store,
        id,
        now,
      )
      .run();
    requireValue(claim.meta.changes === 1, 'shipment_execution_busy', 409);
    try {
      const fact = await adapter.bookingInformation(input.providerId);
      await this.observe(command, 'manual_reconciliation', {
        providerId: input.providerId,
        reason: input.reason.trim(),
        actorRef: actor,
      });
      return await this.finish(command, fact, adapter, actor, lease);
    } finally {
      await this.s
        .stmt(
          'UPDATE shipment_commands SET lease_until=0 WHERE store_id=? AND id=? AND lease_token=?',
          store,
          id,
          lease,
        )
        .run();
    }
  }
  async cancel(store, env, id, actor) {
    const config = await this.s.store(store, env);
    requireOperation(config, env, 'shipping_not_admitted');
    requireValue(identifier(actor), 'operator_identity_required', 403);
    await this.s.db.batch([
      this.s.stmt(
        "UPDATE shipment_commands SET state='canceled' WHERE store_id=? AND id=? AND state='planned' AND first_attempt_at IS NULL AND lease_until<=?",
        store,
        id,
        this.s.now(),
      ),
      ...this.s.event(
        store,
        'ShipmentCanceledBeforeSubmission',
        id,
        { actorRef: actor },
        {
          sql: "EXISTS(SELECT 1 FROM shipment_commands WHERE store_id=? AND id=? AND state='canceled')",
          args: [store, id],
        },
      ),
    ]);
    const command = await this.get(store, env, id);
    requireValue(command.state === 'canceled', 'shipment_execution_not_allowed', 409);
    return command;
  }
  async refresh(store, env, id, adapter, actor) {
    const command = await this.get(store, env, id);
    this.binding(command, env, adapter);
    requireValue(
      command.state === 'registered' && identifier(actor),
      'shipment_execution_not_allowed',
      409,
    );
    const documents = await adapter.documents(command.provider_id);
    requireValue(
      Array.isArray(documents) && documents.length <= 5,
      'carrier_document_invalid',
      502,
    );
    const stored = [];
    for (const d of documents) {
      const hash = await hashBytes(d.bytes),
        fileId = 'ship_' + command.id.slice(0, 35) + '_' + hash.slice(0, 32);
      stored.push(
        (
          await this.files.put(
            store,
            env,
            command.order_id,
            {
              id: fileId,
              bytes: d.bytes,
              filename: 'shipment-' + hash.slice(0, 16) + '.pdf',
              kind: 'shipment_document',
              sourceId: command.id,
            },
            actor,
          )
        ).file.id,
      );
    }
    const events = await adapter.tracking(command.provider_id);
    requireValue(Array.isArray(events) && events.length <= 1000, 'carrier_tracking_invalid', 502);
    for (const event of events) await this.observe(command, 'tracking', event);
    return { files: stored, tracking: events };
  }
}
