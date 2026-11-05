// Scoped operator configuration update; not imported by the Worker.
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { productionD1Target } from './node-production-d1.mjs';
import { identifier, requireValue, validateStore, digest } from './validation.mjs';

export function deliveryServiceCommand(input) {
  requireValue(
    input &&
      identifier(input.storeId) &&
      /^[A-Z]{2}$/.test(input.country) &&
      identifier(input.deliveryId) &&
      /^[a-f0-9]{64}$/.test(input.expectedConfigHash) &&
      typeof input.serviceId === 'string' &&
      /^[1-9][0-9]{0,11}$/.test(input.serviceId),
    'delivery_service_command_invalid',
  );
  return {
    storeId: input.storeId,
    country: input.country,
    deliveryId: input.deliveryId,
    serviceId: input.serviceId,
    expectedConfigHash: input.expectedConfigHash,
  };
}

export async function appendDeliveryService(db, input) {
  const c = deliveryServiceCommand(input);
  const row = await db
    .prepare('SELECT environment,config_json FROM stores WHERE id=?')
    .bind(c.storeId)
    .first();
  requireValue(row?.environment === 'production', 'delivery_service_store_invalid', 409);
  requireValue(
    (await digest(row.config_json)) === c.expectedConfigHash,
    'delivery_service_changed',
    409,
  );
  const config = JSON.parse(row.config_json);
  validateStore(config);
  requireValue(
    config.id === c.storeId && config.enabled === true && config.environment === 'production',
    'delivery_service_store_invalid',
    409,
  );
  const markets = config.markets.filter((m) => m.country === c.country);
  requireValue(
    markets.length === 1 && markets[0].checkoutEnabled !== false && markets[0].currency === 'EUR',
    'delivery_service_market_invalid',
    409,
  );
  const methods = markets[0].delivery.filter((d) => d.id === c.deliveryId);
  const method = methods[0];
  requireValue(
    methods.length === 1 &&
      method.enabled !== false &&
      method.pricing === 'carrier' &&
      Array.isArray(method.serviceIds) &&
      method.serviceIds.length > 0 &&
      method.serviceIds.every(identifier),
    'delivery_service_method_invalid',
    409,
  );
  requireValue(!method.serviceIds.includes(c.serviceId), 'delivery_service_already_present', 409);
  const prior = [...method.serviceIds];
  method.serviceIds.push(c.serviceId);
  validateStore(config);
  const next = JSON.stringify(config);
  const result = await db
    .prepare(
      "UPDATE stores SET config_json=? WHERE id=? AND environment='production' AND config_json=?",
    )
    .bind(next, c.storeId, row.config_json)
    .run();
  requireValue(result?.meta?.changes === 1, 'delivery_service_changed', 409);
  return {
    state: 'DELIVERY_SERVICE_APPENDED',
    ...c,
    priorServiceIds: prior,
    nextConfigHash: await digest(next),
    existingOrdersChanged: false,
  };
}

export async function appendProductionDeliveryService(
  target,
  input,
  { confirmation, proxyFactory } = {},
) {
  const checked = productionD1Target(target, confirmation),
    command = deliveryServiceCommand(input),
    dir = await mkdtemp(join(tmpdir(), 'commerce-service-update-proxy-')),
    configPath = join(dir, 'wrangler.jsonc');
  let proxy;
  try {
    await writeFile(
      configPath,
      JSON.stringify({
        name: 'commerce-service-update-proxy',
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
    return { ...(await appendDeliveryService(proxy.env.COMMERCE_DB, command)), ...checked };
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
