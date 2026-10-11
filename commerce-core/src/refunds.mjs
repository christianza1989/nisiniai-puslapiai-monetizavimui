import {
  CommerceError,
  requireValue,
  identifier,
  integer,
  canonical,
  digest,
} from './validation.mjs';
import { CommerceOperations } from './operations.mjs';

// Stripe retains v1 idempotency keys for at least 24 hours. Stop POST retries early;
// a missing result after this window needs read-only reconciliation, never a new key.
export const REFUND_RETRY_WINDOW = 23 * 3600000;
export class RefundCommands {
  constructor(service) {
    this.s = service;
    this.operations = new CommerceOperations(service);
  }
  async get(store, environment, id) {
    await this.s.store(store, environment);
    const command = await this.s.one(
      'SELECT * FROM refund_commands WHERE store_id=? AND id=?',
      store,
      id,
    );
    requireValue(command && command.environment === environment, 'refund_command_not_found', 404);
    return command;
  }
  async list(store, environment, orderId) {
    await this.s.getOrder(store, environment, orderId);
    return this.s.rows(
      'SELECT * FROM refund_commands WHERE store_id=? AND order_id=? ORDER BY created_at,id',
      store,
      orderId,
    );
  }
  async prepare(store, environment, orderId, input, actor) {
    const s = this.s,
      config = await s.store(store, environment);
    requireValue(
      environment === 'sandbox' && config.testOnly === true,
      'refund_execution_not_admitted',
      403,
    );
    requireValue(identifier(actor), 'operator_identity_required', 403);
    requireValue(
      identifier(input?.id) &&
        integer(input.amount, 1) &&
        typeof input.reason === 'string' &&
        input.reason.trim().length >= 3 &&
        input.reason.trim().length <= 160 &&
        !/[\x00-\x1f\x7f]/.test(input.reason),
      'invalid_refund_command',
    );
    const hash = await digest(
      canonical({ orderId, amount: input.amount, reason: input.reason.trim(), actor }),
    );
    const old = await s.one(
      'SELECT * FROM refund_commands WHERE store_id=? AND id=?',
      store,
      input.id,
    );
    if (old) {
      requireValue(old.request_hash === hash, 'refund_command_conflict', 409);
      return { command: old, replayed: true };
    }
    const order = await s.getOrder(store, environment, orderId);
    requireValue(
      identifier(order.payment_id) && ['paid', 'partially_refunded'].includes(order.payment_state),
      'refund_order_unpaid',
      409,
    );
    try {
      await s.db.batch([
        s.stmt(
          'INSERT INTO refund_commands(store_id,id,order_id,payment_id,account_ref,environment,amount,currency,reason,actor_ref,request_hash,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
          store,
          input.id,
          orderId,
          order.payment_id,
          config.paymentAccountRef,
          environment,
          input.amount,
          order.currency,
          input.reason.trim(),
          actor,
          hash,
          s.now(),
        ),
        ...s.event(store, 'RefundPrepared', input.id, {
          orderId,
          amount: input.amount,
          currency: order.currency,
          actor,
        }),
      ]);
    } catch (error) {
      const concurrent = await s.one(
        'SELECT * FROM refund_commands WHERE store_id=? AND id=?',
        store,
        input.id,
      );
      if (concurrent) {
        requireValue(concurrent.request_hash === hash, 'refund_command_conflict', 409);
        return { command: concurrent, replayed: true };
      }
      if (String(error.message).includes('refund_budget_conflict'))
        throw new CommerceError('refund_budget_conflict', 409);
      throw error;
    }
    return { command: await this.get(store, environment, input.id), replayed: false };
  }
  async review(command, reason, lease) {
    await this.s
      .stmt(
        "UPDATE refund_commands SET state='review',review_reason=? WHERE store_id=? AND id=?" +
          (lease ? ' AND lease_token=?' : ''),
        reason,
        command.store_id,
        command.id,
        ...(lease ? [lease] : []),
      )
      .run();
  }
  async cancel(store, environment, id, actor) {
    const s = this.s,
      config = await s.store(store, environment);
    requireValue(
      environment === 'sandbox' && config.testOnly === true,
      'refund_execution_not_admitted',
      403,
    );
    requireValue(identifier(actor), 'operator_identity_required', 403);
    const current = await this.get(store, environment, id);
    if (current.state === 'failed' && current.review_reason === 'canceled_before_submission')
      return { command: current, replayed: true };
    await s.db.batch([
      s.stmt(
        "UPDATE refund_commands SET state='failed',review_reason='canceled_before_submission' WHERE store_id=? AND id=? AND state='planned' AND first_attempt_at IS NULL AND lease_token IS NULL",
        store,
        id,
      ),
      ...s.event(
        store,
        'RefundCanceledBeforeSubmission',
        id,
        { actor },
        {
          sql: "EXISTS(SELECT 1 FROM refund_commands WHERE store_id=? AND id=? AND state='failed' AND review_reason='canceled_before_submission')",
          args: [store, id],
        },
      ),
    ]);
    const command = await this.get(store, environment, id);
    requireValue(
      command.review_reason === 'canceled_before_submission',
      'refund_cancel_conflict',
      409,
    );
    return { command, replayed: false };
  }
  async observe(store, environment, fact, { api = false, commandId } = {}) {
    const s = this.s;
    const command = commandId
      ? await this.get(store, environment, commandId)
      : await s.one(
          'SELECT * FROM refund_commands WHERE store_id=? AND (provider_id=? OR id=?)',
          store,
          fact.providerId,
          fact.commandId || '',
        );
    if (!command) return;
    const config = await s.store(store, environment);
    if (
      command.environment !== environment ||
      command.account_ref !== config.paymentAccountRef ||
      fact.accountRef !== command.account_ref ||
      fact.environment !== environment ||
      fact.paymentId !== command.payment_id ||
      fact.amount !== command.amount ||
      fact.currency !== command.currency ||
      !identifier(fact.providerId) ||
      (fact.commandId && fact.commandId !== command.id) ||
      (command.provider_id && command.provider_id !== fact.providerId) ||
      !['pending', 'requires_action', 'succeeded', 'failed', 'canceled'].includes(fact.status)
    ) {
      await this.review(command, 'provider_facts_mismatch');
      return;
    }
    if (
      ['failed', 'canceled'].includes(fact.status) &&
      (command.accounted || command.provider_status === 'succeeded')
    ) {
      await this.review(command, 'provider_facts_conflict');
      return;
    }
    if (command.accounted && ['pending', 'requires_action'].includes(fact.status)) return;
    await s
      .stmt(
        'UPDATE refund_commands SET provider_id=?,provider_status=? WHERE store_id=? AND id=?',
        fact.providerId,
        fact.status,
        store,
        command.id,
      )
      .run();
    if (api) {
      const event = {
        kind: 'refund',
        id: 'api_refund_' + (await digest(canonical(fact))),
        environment,
        accountRef: fact.accountRef,
        providerId: fact.providerId,
        paymentId: fact.paymentId,
        status: fact.status,
        amount: fact.amount,
        currency: fact.currency,
      };
      await this.operations.acceptRefundEvent(store, environment, event);
    }
    const confirmed = await s.one(
      'SELECT * FROM refunds WHERE store_id=? AND provider_id=?',
      store,
      fact.providerId,
    );
    if (confirmed) {
      requireValue(
        confirmed.order_id === command.order_id && confirmed.amount === command.amount,
        'refund_conflict',
        409,
      );
      await s
        .stmt(
          "UPDATE refund_commands SET state=CASE WHEN state='review' AND review_reason IN ('provider_facts_mismatch','provider_facts_conflict') THEN state ELSE 'succeeded' END,accounted=1,review_reason=CASE WHEN review_reason IN ('provider_facts_mismatch','provider_facts_conflict') THEN review_reason ELSE NULL END WHERE store_id=? AND id=?",
          store,
          command.id,
        )
        .run();
    } else if (fact.status === 'succeeded')
      await this.review(command, 'refund_confirmation_pending');
    else if (command.state !== 'review') {
      await s
        .stmt(
          "UPDATE refund_commands SET state=?,review_reason=NULL WHERE store_id=? AND id=? AND accounted=0 AND state!='review'",
          ['failed', 'canceled'].includes(fact.status) ? 'failed' : 'pending',
          store,
          command.id,
        )
        .run();
    }
  }
  async execute(store, environment, id, adapter, actor) {
    const s = this.s,
      config = await s.store(store, environment);
    requireValue(
      environment === 'sandbox' && config.testOnly === true,
      'refund_execution_not_admitted',
      403,
    );
    requireValue(identifier(actor), 'operator_identity_required', 403);
    requireValue(
      adapter?.environment === environment &&
        adapter.accountRef === config.paymentAccountRef &&
        adapter.createRefund &&
        adapter.findRefund,
      'refund_provider_not_connected',
      503,
    );
    const command = await this.get(store, environment, id);
    requireValue(command.account_ref === config.paymentAccountRef, 'payment_account_mismatch', 403);
    if (command.state === 'succeeded' || command.state === 'failed')
      return { command, replayed: true };
    const lease = crypto.randomUUID(),
      now = s.now();
    await s
      .stmt(
        "UPDATE refund_commands SET lease_token=?,lease_until=?,first_attempt_at=COALESCE(first_attempt_at,?),state=CASE WHEN state='review' THEN state ELSE 'submitting' END WHERE store_id=? AND id=? AND state NOT IN ('succeeded','failed') AND (lease_until IS NULL OR lease_until<=?)",
        lease,
        now + 60000,
        now,
        store,
        id,
        now,
      )
      .run();
    let current = await this.get(store, environment, id);
    if (['succeeded', 'failed'].includes(current.state))
      return { command: current, replayed: true };
    requireValue(current.lease_token === lease, 'refund_execution_busy', 409);
    try {
      await s.db.batch(
        s.event(
          store,
          'RefundExecutionAttempt',
          lease,
          { commandId: id, actor },
          {
            sql: 'EXISTS(SELECT 1 FROM refund_commands WHERE store_id=? AND id=? AND lease_token=?)',
            args: [store, id, lease],
          },
        ),
      );
      // Read before retry. An incomplete provider search cannot prove a refund is absent.
      const found = await adapter.findRefund(current);
      current = await this.get(store, environment, id);
      if (current.lease_token !== lease) return { command: current, replayed: true };
      if (current.accounted) return { command: current, replayed: true };
      if (!found.complete) await this.review(current, 'provider_search_incomplete', lease);
      else if (found.refund)
        await this.observe(store, environment, found.refund, { api: true, commandId: id });
      else if (
        command.state === 'review' ||
        current.provider_id ||
        s.now() - current.first_attempt_at >= REFUND_RETRY_WINDOW
      )
        await this.review(current, 'provider_result_unknown', lease);
      else {
        const order = await s.getOrder(store, environment, current.order_id);
        const held = await s.one(
          "SELECT COALESCE(SUM(amount),0) amount FROM refund_commands WHERE store_id=? AND order_id=? AND accounted=0 AND state!='failed'",
          store,
          current.order_id,
        );
        if (
          order.refunded_amount + held.amount > order.amount ||
          order.payment_id !== current.payment_id
        ) {
          await this.review(current, 'refund_budget_changed', lease);
          return { command: await this.get(store, environment, id), replayed: false };
        }
        const fact = await adapter.createRefund(current);
        const active = await this.get(store, environment, id);
        if (active.lease_token === lease)
          await this.observe(store, environment, fact, { api: true, commandId: id });
      }
    } catch {
      // Even a provider 4xx/5xx may follow a side effect. Never release reserved money
      // or invent a fresh idempotency key because the request threw an exception.
      await s
        .stmt(
          "UPDATE refund_commands SET state='unknown',review_reason='provider_response_unknown' WHERE store_id=? AND id=? AND lease_token=? AND accounted=0 AND state NOT IN ('review','failed')",
          store,
          id,
          lease,
        )
        .run();
    } finally {
      await s
        .stmt(
          'UPDATE refund_commands SET lease_token=NULL,lease_until=NULL WHERE store_id=? AND id=? AND lease_token=?',
          store,
          id,
          lease,
        )
        .run();
    }
    return { command: await this.get(store, environment, id), replayed: false };
  }
}
