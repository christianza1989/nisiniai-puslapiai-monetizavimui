// Node operator tooling only; never imported by the production Worker.
import { mkdtemp, readFile, readdir, writeFile, unlink, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { applyMigrations } from './migrations.mjs';
import { requireValue, digest } from './validation.mjs';

export function productionD1Target(target, confirmation) {
  requireValue(
    target &&
      /^[a-f0-9]{32}$/.test(target.accountId) &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(target.databaseId) &&
      target.databaseId !== '00000000-0000-0000-0000-000000000001' &&
      target.databaseId !== '00000000-0000-0000-0000-000000000000' &&
      /^[a-z][a-z0-9_-]{2,63}$/.test(target.databaseName) &&
      confirmation === target.databaseId,
    'production_d1_target_not_confirmed',
    403,
  );
  return {
    accountId: target.accountId,
    databaseId: target.databaseId,
    databaseName: target.databaseName,
  };
}
export async function productionMigrationSources() {
  const directory = new URL('../migrations/', import.meta.url);
  return Promise.all(
    (await readdir(directory))
      .filter((name) => /^\d{4}_[a-z_]+\.sql$/.test(name))
      .sort()
      .map(async (name) => ({ name, source: await readFile(new URL(name, directory), 'utf8') })),
  );
}
export async function inspectProductionD1(db, sources) {
  const objects = (
    await db.prepare('SELECT name,type,tbl_name FROM sqlite_master ORDER BY name').all()
  ).results;
  const tables = objects.filter((r) => r.type === 'table').map((r) => r.name);
  const ledger = tables.includes('commerce_migrations')
    ? (await db.prepare('SELECT name,content_hash FROM commerce_migrations ORDER BY name').all())
        .results
    : [];
  const wranglerRows = tables.includes('d1_migrations')
    ? (await db.prepare('SELECT COUNT(*) n FROM d1_migrations').first()).n
    : 0;
  if (!ledger.length) {
    const unmanaged = objects.filter(
      ({ name, tbl_name }) =>
        !name.startsWith('sqlite_') &&
        !name.startsWith('_cf_') &&
        !['commerce_migrations', 'd1_migrations'].includes(tbl_name),
    );
    requireValue(
      unmanaged.length === 0 && wranglerRows === 0,
      'production_d1_unmanaged_schema',
      409,
    );
  }
  // Validate the complete existing prefix before any CREATE or migration write.
  requireValue(ledger.length <= sources.length, 'production_d1_history_mismatch', 409);
  for (let index = 0; index < ledger.length; index++) {
    requireValue(
      ledger[index].name === sources[index].name &&
        ledger[index].content_hash ===
          (await digest(sources[index].source.replaceAll('\r\n', '\n'))),
      'production_d1_history_mismatch',
      409,
    );
  }
  return {
    applied: ledger.length,
    pending: sources.length - ledger.length,
    wranglerLedgerRows: wranglerRows,
  };
}
export async function migrateProductionD1(target, { confirmation, proxyFactory } = {}) {
  const checked = productionD1Target(target, confirmation);
  const sources = await productionMigrationSources();
  const directory = await mkdtemp(join(tmpdir(), 'commerce-d1-proxy-'));
  const configPath = join(directory, 'wrangler.jsonc');
  let proxy;
  try {
    await writeFile(
      configPath,
      JSON.stringify({
        name: 'commerce-d1-migration-proxy',
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
    const db = proxy?.env?.COMMERCE_DB;
    requireValue(db?.prepare && db?.batch, 'production_d1_binding_missing', 503);
    const before = await inspectProductionD1(db, sources);
    // Native D1 binding: each complete trigger stays one prepared statement.
    await applyMigrations(db, sources);
    const after = await inspectProductionD1(db, sources);
    requireValue(after.pending === 0, 'production_d1_migration_incomplete', 503);
    return {
      state: 'SCHEMA_VERIFIED',
      ...checked,
      before,
      after,
      customerDataCreated: false,
      storeCreated: false,
    };
  } finally {
    try {
      if (proxy) await proxy.dispose();
    } finally {
      await unlink(configPath).catch((e) => {
        if (e.code !== 'ENOENT') throw e;
      });
      await rmdir(directory);
    }
  }
}
