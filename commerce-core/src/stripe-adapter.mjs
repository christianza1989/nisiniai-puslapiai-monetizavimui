import Stripe from 'stripe';
import { requireValue, CommerceError, integer, identifier } from './validation.mjs';
export class StripeCheckoutAdapter {
  constructor({ apiKey, webhookSecret, accountRef, environment, client }) {
    requireValue(
      ['sandbox', 'production'].includes(environment) && accountRef && webhookSecret,
      'stripe_config_missing',
    );
    this.environment = environment;
    this.accountRef = accountRef;
    this.webhookSecret = webhookSecret;
    this.provider = 'stripe';
    this.fixture = !apiKey && Boolean(client) && !client.accounts?.retrieveCurrent;
    if (!client)
      requireValue(
        typeof apiKey === 'string' &&
          (environment === 'sandbox'
            ? /^(?:sk|rk|rkcs)_test_[A-Za-z0-9]+$/.test(apiKey)
            : /^(?:sk|rk)_live_[A-Za-z0-9]+$/.test(apiKey)),
        'stripe_key_environment_mismatch',
        403,
      );
    this.client =
      client ??
      new Stripe(apiKey, { httpClient: Stripe.createFetchHttpClient(), maxNetworkRetries: 2 });
  }
  refundFact(refund) {
    // Refund objects do not have a livemode field. The mode comes from the
    // admitted API key; webhook events are independently checked above it.
    requireValue(
      refund.livemode === undefined || refund.livemode === (this.environment === 'production'),
      'stripe_environment_mismatch',
      403,
    );
    return {
      environment: this.environment,
      accountRef: this.accountRef,
      providerId: refund.id,
      paymentId: refund.payment_intent,
      amount: refund.amount,
      currency: refund.currency?.toUpperCase(),
      status: refund.status,
      commandId: refund.metadata?.commerce_command_id,
    };
  }
  async verifyAccount() {
    if (this.environment === 'sandbox' && this.fixture)
      return { ready: true, id: this.accountRef, verified: false };
    requireValue(/^acct_[A-Za-z0-9]+$/.test(this.accountRef), 'stripe_account_not_verified', 503);
    const account = await this.client.accounts.retrieveCurrent();
    requireValue(
      account.id === this.accountRef &&
        (this.environment === 'sandbox' || account.charges_enabled === true),
      'stripe_account_not_verified',
      503,
    );
    return { ready: true, id: account.id, verified: true };
  }
  async isReady() {
    try {
      return (await this.verifyAccount()).ready;
    } catch {
      return false;
    }
  }
  async financialPage({ since, after } = {}) {
    await this.verifyAccount();
    requireValue(
      (since === undefined || integer(since, 0, 9999999999)) &&
        (after === undefined || /^txn_[A-Za-z0-9]+$/.test(after)),
      'invalid_financial_cursor',
    );
    const page = await this.client.balanceTransactions.list({
      limit: 40,
      ...(since === undefined ? {} : { created: { gte: since } }),
      ...(after ? { starting_after: after } : {}),
    });
    requireValue(
      Array.isArray(page.data) && page.data.length <= 40 && typeof page.has_more === 'boolean',
      'stripe_financial_response_invalid',
      502,
    );
    const rows = [];
    for (const bt of page.data) {
      requireValue(
        /^txn_[A-Za-z0-9]+$/.test(bt.id) &&
          integer(bt.amount, -100000000, 100000000) &&
          integer(bt.fee, 0, 100000000) &&
          integer(bt.net, -100000000, 100000000) &&
          bt.net === bt.amount - bt.fee &&
          integer(bt.created, 1, 9999999999) &&
          /^[a-z]{3}$/.test(bt.currency),
        'stripe_financial_response_invalid',
        502,
      );
      let kind, transactionRef;
      if (
        ['charge', 'payment'].includes(bt.type) &&
        bt.amount > 0 &&
        typeof bt.source === 'string' &&
        bt.source.startsWith('ch_')
      ) {
        const charge = await this.client.charges.retrieve(bt.source);
        requireValue(
          charge.id === bt.source &&
            charge.paid === true &&
            charge.currency === bt.currency &&
            typeof charge.payment_intent === 'string' &&
            (charge.amount_captured === undefined || charge.amount_captured === bt.amount),
          'stripe_financial_response_invalid',
          502,
        );
        kind = 'payment';
        transactionRef = charge.payment_intent;
      } else if (bt.type === 'refund' && bt.amount < 0 && /^re_[A-Za-z0-9]+$/.test(bt.source)) {
        kind = 'refund';
        transactionRef = bt.source;
      } else if (bt.type === 'payout' && bt.amount < 0 && /^po_[A-Za-z0-9]+$/.test(bt.source)) {
        kind = 'payout';
        transactionRef = bt.source;
      } else if (bt.type === 'stripe_fee' && bt.amount < 0) {
        kind = 'fee';
        transactionRef = null;
      } else throw new CommerceError('stripe_financial_type_requires_review', 409);
      rows.push({
        reference: bt.id,
        kind,
        currency: bt.currency.toUpperCase(),
        amount: bt.amount,
        transactionRef,
        occurredAt: bt.created * 1000,
      });
      if (bt.fee > 0)
        rows.push({
          reference: bt.id + '_fee',
          kind: 'fee',
          currency: bt.currency.toUpperCase(),
          amount: -bt.fee,
          transactionRef: bt.id,
          occurredAt: bt.created * 1000,
        });
    }
    requireValue(!page.has_more || page.data.length > 0, 'stripe_financial_response_invalid', 502);
    return {
      environment: this.environment,
      accountRef: this.accountRef,
      rows,
      next: page.has_more ? page.data.at(-1).id : null,
      complete: !page.has_more,
    };
  }
  async createRefund(command) {
    await this.verifyAccount();
    requireValue(
      command.environment === this.environment && command.account_ref === this.accountRef,
      'stripe_context_mismatch',
      403,
    );
    const refund = await this.client.refunds.create(
      {
        payment_intent: command.payment_id,
        amount: command.amount,
        reason: 'requested_by_customer',
        metadata: {
          commerce_command_id: command.id,
          store_id: command.store_id,
          environment: this.environment,
        },
      },
      { idempotencyKey: 'refund-' + command.store_id + '-' + command.id },
    );
    return this.refundFact(refund);
  }
  async findRefund(command) {
    requireValue(
      command.environment === this.environment && command.account_ref === this.accountRef,
      'stripe_context_mismatch',
      403,
    );
    if (command.provider_id)
      return {
        complete: true,
        refund: this.refundFact(await this.client.refunds.retrieve(command.provider_id)),
      };
    let after,
      matches = [];
    for (let page = 0; page < 10; page++) {
      const result = await this.client.refunds.list({
        payment_intent: command.payment_id,
        limit: 100,
        ...(after ? { starting_after: after } : {}),
      });
      matches.push(
        ...result.data.filter(
          (r) =>
            r.metadata?.commerce_command_id === command.id &&
            r.metadata?.store_id === command.store_id &&
            r.metadata?.environment === this.environment,
        ),
      );
      if (matches.length > 1) return { complete: false, refund: null };
      if (!result.has_more)
        return { complete: true, refund: matches.length ? this.refundFact(matches[0]) : null };
      after = result.data.at(-1)?.id;
      if (!after) break;
    }
    return { complete: false, refund: null };
  }
  async createSession(order, config) {
    await this.verifyAccount();
    requireValue(
      order.snapshot.environment === this.environment &&
        config.paymentAccountRef === this.accountRef,
      'stripe_context_mismatch',
      403,
    );
    requireValue(
      config.checkout?.successUrl && config.checkout?.cancelUrl,
      'checkout_urls_missing',
    );
    const base = new URL(config.checkout.successUrl);
    requireValue(
      config.hosts.includes(base.host) &&
        (base.protocol === 'https:' || this.environment === 'sandbox'),
      'checkout_origin_invalid',
    );
    const cancel = new URL(config.checkout.cancelUrl);
    requireValue(cancel.origin === base.origin, 'checkout_origin_invalid');
    const items = order.snapshot.lines.map((l) => ({
      price_data: {
        currency: order.currency.toLowerCase(),
        unit_amount: l.unitAmount,
        product_data: { name: l.title },
      },
      quantity: l.quantity,
    }));
    if (order.snapshot.delivery.amount)
      items.push({
        price_data: {
          currency: order.currency.toLowerCase(),
          unit_amount: order.snapshot.delivery.amount,
          product_data: { name: order.snapshot.delivery.label },
        },
        quantity: 1,
      });
    // Order IDs are cryptographically random. Keep this label stable across idempotent retries.
    const suffix = order.id
      .replaceAll('-', '')
      .slice(0, 8)
      .split('')
      .map((v) => String.fromCharCode(97 + parseInt(v, 16)))
      .join('');
    return this.client.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: items,
        client_reference_id: order.id,
        metadata: { store_id: order.store_id, order_id: order.id, environment: this.environment },
        success_url: config.checkout.successUrl,
        cancel_url: config.checkout.cancelUrl,
        expires_at: Math.floor(order.expires_at / 1000),
        integration_identifier: 'pinet-commerce-' + suffix,
        ...(order.snapshot.customer ? { customer_email: order.snapshot.customer.email } : {}),
        // Dynamic payment methods: configured in Dashboard. automatic_tax requires separate validated admission.
      },
      { idempotencyKey: 'checkout-' + order.store_id + '-' + order.id },
    );
  }
  async verifyEvent(body, signature, { checkoutInScope } = {}) {
    let event;
    try {
      event = await this.client.webhooks.constructEventAsync(
        body,
        signature,
        this.webhookSecret,
        300,
        Stripe.createSubtleCryptoProvider(),
      );
    } catch {
      throw new CommerceError('stripe_signature_invalid');
    }
    requireValue(
      event.livemode === (this.environment === 'production'),
      'stripe_environment_mismatch',
      403,
    );
    if (
      [
        'charge.dispute.created',
        'charge.dispute.updated',
        'charge.dispute.closed',
        'charge.dispute.funds_withdrawn',
        'charge.dispute.funds_reinstated',
      ].includes(event.type)
    ) {
      const dispute = event.data.object;
      requireValue(typeof dispute.payment_intent === 'string', 'stripe_dispute_payment_missing');
      return {
        kind: 'dispute',
        id: event.id,
        environment: this.environment,
        accountRef: this.accountRef,
        disputeId: dispute.id,
        paymentId: dispute.payment_intent,
        amount: dispute.amount,
        currency: dispute.currency?.toUpperCase(),
        status: dispute.status,
        reason: dispute.reason,
        createdAt: event.created * 1000,
        evidenceDueAt: dispute.evidence_details?.due_by
          ? dispute.evidence_details.due_by * 1000
          : null,
      };
    }
    if (['refund.created', 'refund.updated', 'refund.failed'].includes(event.type)) {
      const refund = event.data.object;
      requireValue(typeof refund.payment_intent === 'string', 'stripe_refund_payment_missing');
      return {
        kind: 'refund',
        id: event.id,
        environment: this.environment,
        accountRef: this.accountRef,
        providerId: refund.id,
        paymentId: refund.payment_intent,
        status: refund.status,
        amount: refund.amount,
        currency: refund.currency?.toUpperCase(),
        ...(refund.metadata?.commerce_command_id
          ? { commandId: refund.metadata.commerce_command_id }
          : {}),
      };
    }
    if (
      !['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(
        event.type,
      )
    )
      return null;
    const session = event.data.object;
    requireValue(session && typeof session === 'object', 'stripe_event_invalid');
    // Only signed, mode-checked Checkout events may reach this read-only scope gate.
    // Other event kinds retain their independent refund/dispute ledger contracts.
    if (checkoutInScope && !(await checkoutInScope(session))) return null;
    if (session.payment_status !== 'paid') return null;
    requireValue(
      session.metadata?.environment === this.environment &&
        identifier(session.metadata.store_id) &&
        identifier(session.metadata.order_id) &&
        identifier(session.id) &&
        identifier(session.payment_intent),
      'stripe_metadata_invalid',
    );
    return {
      id: event.id,
      orderId: session.metadata.order_id,
      storeId: session.metadata.store_id,
      environment: this.environment,
      accountRef: this.accountRef,
      sessionId: session.id,
      paymentId: session.payment_intent,
      currency: session.currency?.toUpperCase(),
      amount: session.amount_total,
      paid: true,
    };
  }
}
