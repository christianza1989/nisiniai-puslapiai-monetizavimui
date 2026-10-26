// Scoped operator configuration update; not imported by the Worker.
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { productionD1Target } from './node-production-d1.mjs';
import { identifier, requireValue, validateStore, digest } from './validation.mjs';
export function deliveryPricingCommand(input) {
  requireValue(
    input &&
      identifier(input.storeId) &&
      /^[A-Z]{2}$/.test(input.country) &&
      /^[a-f0-9]{64}$/.test(input.expectedConfigHash) &&
      ['single_parcel', 'all_parcels'].includes(input.customerCharge) &&
      Array.isArray(input.deliveryIds) &&
      input.deliveryIds.length > 0 &&
      input.deliveryIds.length <= 20 &&
      input.deliveryIds.every(identifier) &&
      new Set(input.deliveryIds).size === input.deliveryIds.length,
    'delivery_pricing_command_invalid',
  );
  return {
    storeId: input.storeId,
    country: input.country,
    expectedConfigHash: input.expectedConfigHash,
    customerCharge: input.customerCharge,
    deliveryIds: [...input.deliveryIds].sort(),
  };
}
export async function updateDeliveryPricing(db, input) {
  const c = deliveryPricingCommand(input),
    row = await db
      .prepare('SELECT environment,config_json FROM stores WHERE id=?')
      .bind(c.storeId)
      .first();
  requireValue(row?.environment === 'production', 'delivery_pricing_store_invalid', 409);
  requireValue(
    (await digest(row.config_json)) === c.expectedConfigHash,
    'delivery_pricing_changed',
    409,
  );
  const config = JSON.parse(row.config_json);
  validateStore(config);
  requireValue(
    config.id === c.storeId && config.enabled === true && config.environment === 'production',
    'delivery_pricing_store_invalid',
    409,
  );
  const market = config.markets.find((m) => m.country === c.country);
  requireValue(
    market?.checkoutEnabled !== false && market?.currency === 'EUR',
    'delivery_pricing_market_invalid',
    409,
  );
  const prior = [];
  for (const id of c.deliveryIds) {
    const method = market.delivery.find((d) => d.id === id);
    requireValue(
      method?.enabled !== false && method?.pricing === 'carrier',
      'delivery_pricing_method_invalid',
      409,
    );
    prior.push({ id, customerCharge: method.customerCharge ?? 'all_parcels' });
    if (c.customerCharge === 'all_parcels') delete method.customerCharge;
    else method.customerCharge = c.customerCharge;
  }
  validateStore(config);
  const next = JSON.stringify(config);
  const result = await db
    .prepare(
      "UPDATE stores SET config_json=? WHERE id=? AND environment='production' AND config_json=?",
    )
    .bind(next, c.storeId, row.config_json)
    .run();
  requireValue(result?.meta?.changes === 1, 'delivery_pricing_changed', 409);
  return {
    state: 'DELIVERY_PRICING_UPDATED',
    ...c,
    prior,
    nextConfigHash: await digest(next),
    existingOrdersChanged: false,
  };
}
export async function updateProductionDeliveryPricing(
  target,
  input,
  { confirmation, proxyFactory } = {},
) {
  const checked = productionD1Target(target, confirmation),
    command = deliveryPricingCommand(input),
    dir = await mkdtemp(join(tmpdir(), 'commerce-delivery-proxy-')),
    configPath = join(dir, 'wrangler.jsonc');
  let proxy;
  try {
    await writeFile(
      configPath,
      JSON.stringify({
        name: 'commerce-delivery-update-proxy',
        compatibility_date: '2026-10-15',
        account_id: checked.accountId,
        d1_databases: [
          {
            binding: 'COMMERCE_DB',
            database_id: checked.databaseId,
            database_name: checked.databaseName,
            remote: true,
          },
        ],
      }),
      { flag: 'wx', mode: 0o600 },
    );
    const factory = proxyFactory || (await import('wrangler')).getPlatformProxy;
    proxy = await factory({ configPath, remoteBindings: true, persist: false, envFiles: [] });
    requireValue(proxy?.env?.COMMERCE_DB?.prepare, 'production_d1_binding_missing', 503);
    return { ...(await updateDeliveryPricing(proxy.env.COMMERCE_DB, command)), ...checked };
  } finally {
    try {
      if (proxy) await proxy.dispose();
    } finally {
      await unlink(configPath).catch((e) => {
        if (e.code !== 'ENOENT') throw e;
      });
      await rmdir(dir);
    }
  }
}
