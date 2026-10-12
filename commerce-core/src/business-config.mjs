import { requireValue, identifier, integer } from './validation.mjs';
export function prepareBusiness(
  business,
  { id = 'store_memocasting', registeredAddress = business.legal.address } = {},
) {
  requireValue(
    identifier(id) &&
      business.amountUnit === 'EUR_cents' &&
      /^\d{9}$/.test(business.legal.companyCode),
    'business_facts_invalid',
  );
  const missing = [
    ...(!registeredAddress ? ['registered_address'] : []),
    'actual_inventory_and_lots',
    'optional_extras_package_measurements',
    'foreign_market_price_and_language_approval',
    'supplier_safety_and_instructions',
    'stripe_account_and_webhook_connection',
    'sendparcel_services_and_booking_contract',
    'existing_core_mail_binding',
    'hosting_domain_and_runtime_admission',
  ];
  const store = {
    id,
    environment: 'production',
    enabled: false,
    testOnly: false,
    legalEntityId: 'lt_' + business.legal.companyCode,
    legalSnapshot: { ...business.legal, address: registeredAddress },
    hosts: ['memocasting.lt', 'www.memocasting.lt'],
    requireCustomer: true,
    requireQuote: true,
    requireTerms: true,
    dispatch: { ...business.dispatch, companyCode: business.legal.companyCode },
    returns: business.returns,
    paymentAccountRef: 'unconnected_stripe',
    shippingAccountRef: 'unconnected_sendparcel',
    markets: business.markets.map((country) => ({
      country,
      currency: 'EUR',
      checkoutEnabled: false,
      policyVersion: 'memocasting_terms_v1',
      delivery: [
        {
          id: 'courier',
          amount: 0,
          label: 'Pristatymas kurjeriu',
          kind: 'door',
          pricing: 'carrier',
          serviceIds: [],
          enabled: false,
        },
      ],
    })),
    checkout: {
      successUrl: 'https://memocasting.lt/krepselis',
      cancelUrl: 'https://memocasting.lt/krepselis',
    },
    productionAdmission: { approved: false },
    operationalAdmission: { approved: false },
    automationPolicy: {
      approved: false,
      autoExecutePreparedShipments: false,
      autoPrepareIndividualShipments: false,
      autoCollectShipmentDocuments: false,
      maxCarrierSubsidyMinor: 0,
      sendNotifications: false,
    },
    notificationPolicy: {
      approved: false,
      from: 'info@pinet.lt',
      transportRef: 'existing_core_mail',
    },
    documentPolicy: {
      approved: false,
      mode: 'invoice_non_vat',
      timeZone: 'Europe/Vilnius',
      series: { sale: 'MC', credit: 'MCK', packing: 'MCP' },
    },
  };
  const products = [
    ...business.products.map((p) => ({
      sku: p.sku,
      title: p.title,
      enabled: true,
      stock: 0,
      prices: Object.fromEntries(business.markets.map((c) => [c, p.baseAmountEur])),
      package: p.package,
      included: p.included,
    })),
    ...business.optionalExtras.map((p) => ({
      sku: p.id,
      title: p.title,
      enabled: false,
      stock: 0,
      prices: Object.fromEntries(business.markets.map((c) => [c, p.amountEur])),
      package: p.package,
      addonFor: business.products.map((p) => p.sku),
    })),
  ];
  requireValue(
    products.every((p) => integer(p.stock) && Object.values(p.prices).every((v) => integer(v, 1))),
    'business_facts_invalid',
  );
  return {
    schemaVersion: 1,
    readyForLive: false,
    missing,
    store,
    products,
    connections: {},
    operatorGrants: [],
  };
}
export function configurationReadiness(prepared) {
  return {
    schemaVersion: 1,
    storeId: prepared.store.id,
    readyForLive: false,
    known: {
      legalEntity: prepared.store.legalEntityId,
      products: prepared.products.map((p) => ({
        sku: p.sku,
        amount: p.prices.LT,
        currency: 'EUR',
        stock: p.stock,
        active: p.enabled,
        packageKnown: Boolean(p.package),
      })),
    },
    missing: prepared.missing,
    automaticMoneyOperationsEnabled: false,
  };
}
