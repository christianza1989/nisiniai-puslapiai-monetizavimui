// Node operator tooling only. The caller must verify the approved public terms revision.
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { productionD1Target } from './node-production-d1.mjs';
import { identifier, requireValue, validateStore } from './validation.mjs';

export function marketPolicyCommand(input) {
  requireValue(
    input &&
      identifier(input.storeId) &&
      /^[A-Z]{2}$/.test(input.country) &&
      /^[a-f0-9]{64}$/.test(input.expectedPolicyVersion) &&
      /^[a-f0-9]{64}$/.test(input.nextPolicyVersion) &&
      input.expectedPolicyVersion !== input.nextPolicyVersion,
    'market_policy_command_invalid',
  );
  return {
    storeId: input.storeId,
    country: input.country,
    expectedPolicyVersion: input.expectedPolicyVersion,
    nextPolicyVersion: input.nextPolicyVersion,
  };
}

export async function updateMarketPolicy(db, input) {
  const command = marketPolicyCommand(input);
  const row = await db
    .prepare('SELECT environment,config_json FROM stores WHERE id=?')
    .bind(command.storeId)
    .first();
  requireValue(row && row.environment === 'production', 'market_policy_store_invalid', 409);
  let config;
  try {
    config = JSON.parse(row.config_json);
  } catch {
    requireValue(false, 'market_policy_store_invalid', 409);
  }
  validateStore(config);
  requireValue(
    config.id === command.storeId && config.environment === 'production' && config.enabled === true,
    'market_policy_store_invalid',
    409,
  );
  const matches = config.markets.filter((market) => market.country === command.country);
  requireValue(
    matches.length === 1 && matches[0].checkoutEnabled !== false,
    'market_policy_market_invalid',
    409,
  );
  const market = matches[0];
  requireValue(
    market.policyVersion === command.expectedPolicyVersion,
    'market_policy_changed',
    409,
  );
  market.policyVersion = command.nextPolicyVersion;
  validateStore(config);
  const updated = await db
    .prepare(
      "UPDATE stores SET config_json=? WHERE id=? AND environment='production' AND config_json=?",
    )
    .bind(JSON.stringify(config), command.storeId, row.config_json)
    .run();
  requireValue(updated?.meta?.changes === 1, 'market_policy_changed', 409);
  return { state: 'MARKET_POLICY_UPDATED', ...command, existingOrdersChanged: false };
}

export async function updateProductionMarketPolicy(
  target,
  input,
  { confirmation, proxyFactory } = {},
) {
  const checked = productionD1Target(target, confirmation);
  const command = marketPolicyCommand(input);
  const directory = await mkdtemp(join(tmpdir(), 'commerce-policy-proxy-'));
  const configPath = join(directory, 'wrangler.jsonc');
  let proxy;
  try {
    await writeFile(
      configPath,
      JSON.stringify({
        name: 'commerce-policy-update-proxy',
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
    return { ...(await updateMarketPolicy(proxy.env.COMMERCE_DB, command)), ...checked };
  } finally {
    try {
      if (proxy) await proxy.dispose();
    } finally {
      await unlink(configPath).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
      await rmdir(directory);
    }
  }
}
