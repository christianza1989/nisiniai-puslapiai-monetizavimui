import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { NodeDatabase } from '../src/node-db.mjs';
import { applyMigrations } from '../src/migrations.mjs';
import { migrateProductionD1, productionMigrationSources } from '../src/node-production-d1.mjs';
const target = {
  accountId: '11111111111111111111111111111111',
  databaseId: '11111111-1111-4111-8111-111111111111',
  databaseName: 'fixture-production',
};
function fixture(db) {
  let disposed = 0,
    called = 0;
  return {
    get disposed() {
      return disposed;
    },
    get called() {
      return called;
    },
    factory: async (options) => {
      called++;
      assert.equal(options.remoteBindings, true);
      assert.equal(options.persist, false);
      assert.deepEqual(options.envFiles, []);
      const cfg = JSON.parse(await readFile(options.configPath, 'utf8'));
      assert.equal(cfg.account_id, target.accountId);
      assert.deepEqual(cfg.d1_databases, [
        {
          binding: 'COMMERCE_DB',
          database_id: target.databaseId,
          database_name: target.databaseName,
          remote: true,
        },
      ]);
      assert.equal(cfg.vars, undefined);
      assert.equal(cfg.services, undefined);
      return {
        env: { COMMERCE_DB: db },
        dispose: async () => {
          disposed++;
        },
      };
    },
  };
}
test('remote schema tool refuses unconfirmed or placeholder targets before loading a proxy', async () => {
  const db = new NodeDatabase(),
    f = fixture(db);
  await assert.rejects(
    migrateProductionD1(target, { confirmation: 'wrong', proxyFactory: f.factory }),
    /production_d1_target_not_confirmed/,
  );
  await assert.rejects(
    migrateProductionD1(
      { ...target, databaseId: '00000000-0000-0000-0000-000000000001' },
      { confirmation: '00000000-0000-0000-0000-000000000001', proxyFactory: f.factory },
    ),
    /production_d1_target_not_confirmed/,
  );
  assert.equal(f.called, 0);
  db.close();
});
test('native binding migration preserves complete triggers, all hashes and replay without creating business rows', async () => {
  const db = new NodeDatabase(),
    f = fixture(db);
  const first = await migrateProductionD1(target, {
    confirmation: target.databaseId,
    proxyFactory: f.factory,
  });
  const count = (await productionMigrationSources()).length;
  assert.equal(first.before.applied, 0);
  assert.equal(first.after.applied, count);
  assert.equal(first.after.pending, 0);
  assert.ok(
    (await db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE type='trigger'").first()).n > 0,
  );
  for (const name of ['stores', 'products', 'inventory', 'orders'])
    assert.equal((await db.prepare('SELECT COUNT(*) n FROM ' + name).first()).n, 0);
  const repeat = await migrateProductionD1(target, {
    confirmation: target.databaseId,
    proxyFactory: f.factory,
  });
  assert.equal(repeat.before.applied, count);
  assert.equal(repeat.after.applied, count);
  assert.equal(f.disposed, 2);
  db.close();
});
test('failed raw-migration partial tables are preserved and blocked before adding a canonical ledger', async () => {
  const db = new NodeDatabase(),
    f = fixture(db);
  await db.prepare('CREATE TABLE preserved_fixture(value TEXT)').run();
  await db.prepare("INSERT INTO preserved_fixture VALUES('keep')").run();
  await assert.rejects(
    migrateProductionD1(target, { confirmation: target.databaseId, proxyFactory: f.factory }),
    /production_d1_unmanaged_schema/,
  );
  assert.equal((await db.prepare('SELECT value FROM preserved_fixture').first()).value, 'keep');
  assert.equal(
    await db.prepare("SELECT name FROM sqlite_master WHERE name='commerce_migrations'").first(),
    null,
  );
  assert.equal(f.disposed, 1);
  db.close();
  const viewDb = new NodeDatabase(),
    viewFixture = fixture(viewDb);
  await viewDb.prepare('CREATE VIEW preserved_view AS SELECT 1 AS n').run();
  await assert.rejects(
    migrateProductionD1(target, {
      confirmation: target.databaseId,
      proxyFactory: viewFixture.factory,
    }),
    /production_d1_unmanaged_schema/,
  );
  assert.equal((await viewDb.prepare('SELECT n FROM preserved_view').first()).n, 1);
  viewDb.close();
});
test('empty Wrangler ledger may precede fresh migration but a claimed foreign migration cannot be silently adopted', async () => {
  const db = new NodeDatabase(),
    f = fixture(db);
  await db.prepare('CREATE TABLE d1_migrations(name TEXT)').run();
  await db.prepare("INSERT INTO d1_migrations VALUES('fixture_claimed.sql')").run();
  await assert.rejects(
    migrateProductionD1(target, { confirmation: target.databaseId, proxyFactory: f.factory }),
    /production_d1_unmanaged_schema/,
  );
  assert.equal(
    await db.prepare("SELECT name FROM sqlite_master WHERE name='commerce_migrations'").first(),
    null,
  );
  db.close();
  const clean = new NodeDatabase(),
    g = fixture(clean);
  await clean.prepare('CREATE TABLE d1_migrations(name TEXT)').run();
  assert.equal(
    (
      await migrateProductionD1(target, {
        confirmation: target.databaseId,
        proxyFactory: g.factory,
      })
    ).after.pending,
    0,
  );
  clean.close();
});
test('existing hash mismatch and unknown future history are rejected before schema writes; a valid prefix resumes', async () => {
  const sources = await productionMigrationSources();
  const db = new NodeDatabase(),
    f = fixture(db);
  await applyMigrations(db, sources.slice(0, 1));
  await db.prepare('UPDATE commerce_migrations SET content_hash=?').bind('0'.repeat(64)).run();
  const tablesBefore = (
    await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()
  ).results;
  await assert.rejects(
    migrateProductionD1(target, { confirmation: target.databaseId, proxyFactory: f.factory }),
    /production_d1_history_mismatch/,
  );
  assert.deepEqual(
    (await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all())
      .results,
    tablesBefore,
  );
  db.close();
  const future = new NodeDatabase(),
    g = fixture(future);
  await applyMigrations(future, sources);
  await future
    .prepare("INSERT INTO commerce_migrations VALUES('9999_future.sql',?)")
    .bind('0'.repeat(64))
    .run();
  await assert.rejects(
    migrateProductionD1(target, { confirmation: target.databaseId, proxyFactory: g.factory }),
    /production_d1_history_mismatch/,
  );
  future.close();
  const prefix = new NodeDatabase(),
    h = fixture(prefix);
  await applyMigrations(prefix, sources.slice(0, 1));
  const resumed = await migrateProductionD1(target, {
    confirmation: target.databaseId,
    proxyFactory: h.factory,
  });
  assert.equal(resumed.before.applied, 1);
  assert.equal(resumed.after.applied, sources.length);
  prefix.close();
});
