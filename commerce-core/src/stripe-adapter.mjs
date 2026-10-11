import Stripe from 'stripe';
import { requireValue, CommerceError } from './validation.mjs';
export class StripeCheckoutAdapter {
  constructor({ apiKey, webhookSecret, accountRef, environment, client }) {
    requireValue(
      ['sandbox', 'production'].includes(environment) && accountRef && webhookSecret,
      'stripe_config_missing',
    );
    this.environment = environment;
    this.accountRef = accountRef;
    this.webhookSecret = webhookSecret;
    this.client =
      client ??
      new Stripe(apiKey, { httpClient: Stripe.createFetchHttpClient(), maxNetworkRetries: 2 });
  }
  async createSession(order, config) {
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
  async verifyEvent(body, signature) {
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
      };
    }
    if (
      !['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(
        event.type,
      )
    )
      return null;
    const session = event.data.object;
    if (session.payment_status !== 'paid') return null;
    requireValue(
      session.metadata?.environment === this.environment &&
        typeof session.payment_intent === 'string',
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
