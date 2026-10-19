import { requireValue, integer, digest, canonical, CommerceError } from './validation.mjs';
import { ShippingOperations } from './shipping.mjs';
import { ShipmentCommands, completeSender } from './shipment-commands.mjs';
export class ShippingAutomation {
  constructor(service, options = {}) {
    this.s = service;
    this.options = options;
  }
  async preparePacked(store, env, orderId) {
    const config = await this.s.store(store, env),
      policy = config.automationPolicy;
    if (policy?.autoPrepareIndividualShipments !== true) return { skipped: true };
    const order = await this.s.getOrder(store, env, orderId);
    if (
      order.payment_state !== 'paid' ||
      order.stock_state !== 'allocated' ||
      order.fulfillment_state !== 'ready'
    )
      return { skipped: true };
    // An operator's own plan/command/cancellation wins; never replace it.
    if (
      await this.s.one(
        'SELECT id FROM shipment_commands WHERE store_id=? AND order_id=?',
        store,
        orderId,
      )
    )
      return { skipped: true };
    const planId = 'auto_' + orderId;
    if (
      await this.s.one(
        'SELECT id FROM shipping_plans WHERE store_id=? AND order_id=? AND id!=?',
        store,
        orderId,
        planId,
      )
    )
      return { skipped: true, manualPlan: true };
    requireValue(
      completeSender(config.dispatch) && typeof config.dispatch.isCompany === 'boolean',
      'shipment_sender_incomplete',
      409,
    );
    const method = config.markets
      .find((m) => m.country === order.snapshot.country)
      ?.delivery.find((d) => d.id === order.snapshot.delivery.id);
    const serviceId = order.snapshot.delivery.providerServiceId || method?.serviceIds?.[0];
    requireValue(
      serviceId && method?.enabled !== false && method?.serviceIds?.includes(serviceId),
      'automatic_shipping_service_missing',
      409,
    );
    const subsidy = policy.maxCarrierSubsidyMinor ?? 0;
    requireValue(integer(subsidy, 0, 50000), 'automatic_shipping_budget_invalid');
    const maxCost = order.snapshot.delivery.amount + subsidy;
    requireValue(integer(maxCost, 1), 'automatic_shipping_budget_invalid', 409);
    const read = this.options.shippingReadAdapters?.[store];
    requireValue(
      read && read.accountRef === config.shippingAccountRef && read.environment === env,
      'shipping_quotes_not_connected',
      503,
    );
    const actor = 'commerce_automation',
      originId = 'dispatch_' + (await digest(canonical(config.dispatch))).slice(0, 64);
    const ops = new ShippingOperations(this.s);
    await ops.origin(
      store,
      env,
      {
        ...config.dispatch,
        id: originId,
        reason: 'Configured dispatch for automatic individual parcels',
      },
      actor,
    );
    await ops.prepare(
      store,
      env,
      orderId,
      {
        id: planId,
        originId,
        mode: 'individual',
        recipientIsCompany: order.snapshot.customer.isCompany === true,
      },
      actor,
    );
    const quoteId = 'autoq_' + orderId + '_' + Math.floor(this.s.now() / 60000);
    const quote = await ops.quote(store, env, planId, { id: quoteId }, read, actor);
    requireValue(
      quote.record.payload.offers.some((o) => o.serviceId === serviceId && o.amount <= maxCost),
      'automatic_shipping_cost_exceeded',
      409,
    );
    return new ShipmentCommands(this.s, this.options.privateStorage).prepare(
      store,
      env,
      orderId,
      { id: 'auto_' + orderId, planId, quoteId, serviceId, maxCost },
      actor,
    );
  }
  async collectRegistered(store, env, orderId) {
    const config = await this.s.store(store, env);
    if (config.automationPolicy?.autoCollectShipmentDocuments !== true) return { skipped: true };
    const command = await this.s.one(
      "SELECT id FROM shipment_commands WHERE store_id=? AND order_id=? AND state='registered'",
      store,
      orderId,
    );
    if (!command) return { skipped: true }; // Legacy or unmatched carrier fact requires operator review.
    const adapter = this.options.shippingAdapters?.[store];
    requireValue(adapter, 'shipping_not_connected', 503);
    const result = await new ShipmentCommands(this.s, this.options.privateStorage).refresh(
      store,
      env,
      command.id,
      adapter,
      'commerce_automation',
    );
    // Registration can precede labels by several provider processing cycles.
    // Keep the durable event waiting; never submit a replacement shipment.
    if (!result.labelsAvailable) throw new CommerceError('carrier_documents_pending', 409);
    return result;
  }
}
