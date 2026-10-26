import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { NodeDatabase } from '../src/node-db.mjs';
import { updateMarketPolicy, updateProductionMarketPolicy } from '../src/node-market-policy.mjs';
import { runMarketPolicyCommand } from '../scripts/update-market-policy.mjs';

const target = {
  accountId: '11111111111111111111111111111111',
  databaseId: '11111111-1111-4111-8111-111111111111',
  databaseName: 'fixture-production',
};
const command = {
  storeId: 'policy_fixture',
  country: 'LT',
  expectedPolicyVersion: '1'.repeat(64),
  nextPolicyVersion: '2'.repeat(64),
};
const config = () => ({
  id: command.storeId,
  environment: 'production',
  enabled: true,
  requireCustomer: true,
  requireTerms: true,
  legalEntityId: 'fixture_entity',
  legalSnapshot: { name: 'Fixture company' },
  hosts: ['fixture.example'],
  productionAdmission: { approved: true },
  foreignExtension: { preserve: 'exact nested value', list: [1, 2, 3] },
  markets: [
    {
      country: 'LT',
      currency: 'EUR',
      policyVersion: command.expectedPolicyVersion,
      checkoutEnabled: true,
      delivery: [{ id: 'courier', amount: 472, label: 'Fixture courier' }],
    },
    {
      country: 'PL',
      currency: 'EUR',
      policyVersion: 'closed_market_policy',
      checkoutEnabled: false,
      delivery: [{ id: 'courier', amount: 500, label: 'Fixture courier' }],
    },
  ],
});
async function fixture(t, change = () => {}) {
  const db = new NodeDatabase();
  db.migrate();
  t.after(() => db.close());
  const c = config();
  change(c);
  const raw = JSON.stringify(c, null, 2);
  await db
    .prepare('INSERT INTO stores(id,environment,config_json) VALUES(?,?,?)')
    .bind(command.storeId, c.environment, raw)
    .run();
  return { db, c, raw };
}
const args = () => [
  '--account',
  target.accountId,
  '--database',
  target.databaseId,
  '--database-name',
  target.databaseName,
  '--confirm-database',
  target.databaseId,
  '--store',
  command.storeId,
  '--country',
  command.country,
  '--expected-old',
  command.expectedPolicyVersion,
  '--next',
  command.nextPolicyVersion,
];

test('default CLI plan never opens a remote connection and rejects ambiguous or unconfirmed targets', async () => {
  let called = 0;
  const update = async () => {
    called++;
    throw Error('must not connect');
  };
  const plan = await runMarketPolicyCommand(args(), { update });
  assert.equal(plan.state, 'PLAN_ONLY_NO_REMOTE_CONNECTION');
  assert.equal(called, 0);
  await assert.rejects(
    runMarketPolicyCommand([...args(), '--apply-remote', '--apply-remote'], { update }),
    /arguments_invalid/,
  );
  await assert.rejects(
    runMarketPolicyCommand([...args(), '--store', 'another'], { update }),
    /arguments_invalid/,
  );
  const wrong = args();
  wrong[wrong.indexOf('--confirm-database') + 1] = 'wrong';
  await assert.rejects(
    runMarketPolicyCommand([...wrong, '--apply-remote'], { update }),
    /target_not_confirmed/,
  );
  const invalid = args();
  invalid[invalid.indexOf('--next') + 1] = 'arbitrary_policy';
  await assert.rejects(runMarketPolicyCommand(invalid, { update }), /command_invalid/);
  assert.equal(called, 0);
});

test('one policy changes while closed markets, foreign configuration and existing orders are preserved', async (t) => {
  const { db, c } = await fixture(t);
  const snapshot = JSON.stringify({
    policyVersion: command.expectedPolicyVersion,
    termsAcceptance: { policyVersion: command.expectedPolicyVersion, acceptedAt: 1 },
  });
  await db
    .prepare(
      'INSERT INTO orders(store_id,id,request_key,request_hash,currency,amount,snapshot_json,access_hash,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
    )
    .bind(command.storeId, 'prior_order', 'request', 'hash', 'EUR', 3200, snapshot, 'access', 10, 1)
    .run();
  const result = await updateMarketPolicy(db, command);
  assert.equal(result.state, 'MARKET_POLICY_UPDATED');
  const next = JSON.parse(
    (await db.prepare('SELECT config_json FROM stores WHERE id=?').bind(command.storeId).first())
      .config_json,
  );
  c.markets[0].policyVersion = command.nextPolicyVersion;
  assert.deepEqual(next, c);
  assert.equal(
    (await db.prepare('SELECT snapshot_json FROM orders WHERE id=?').bind('prior_order').first())
      .snapshot_json,
    snapshot,
  );
  await assert.rejects(updateMarketPolicy(db, command), /market_policy_changed/);
});

test('stale versions, disabled/missing markets and invalid complete stores never mutate configuration', async (t) => {
  for (const change of [
    (c) => {
      c.markets[0].policyVersion = '3'.repeat(64);
    },
    (c) => {
      c.markets[0].checkoutEnabled = false;
    },
    (c) => {
      c.markets[0].country = 'EE';
    },
    (c) => {
      c.enabled = false;
    },
    (c) => {
      c.requireCustomer = false;
    },
    (c) => {
      c.markets.push(structuredClone(c.markets[0]));
    },
  ]) {
    const { db, raw } = await fixture(t, change);
    await assert.rejects(updateMarketPolicy(db, command));
    assert.equal(
      (await db.prepare('SELECT config_json FROM stores WHERE id=?').bind(command.storeId).first())
        .config_json,
      raw,
    );
  }
});

test('a concurrent foreign config change causes CAS failure and is never overwritten', async (t) => {
  const { db, c } = await fixture(t);
  let injected = false;
  const concurrent = structuredClone(c);
  concurrent.foreignExtension.preserve = 'owner edited concurrently';
  const wrapper = {
    prepare(sql) {
      const statement = db.prepare(sql);
      if (!sql.startsWith('UPDATE stores')) return statement;
      return {
        bind(...values) {
          return {
            async run() {
              if (!injected) {
                injected = true;
                await db
                  .prepare('UPDATE stores SET config_json=? WHERE id=?')
                  .bind(JSON.stringify(concurrent), command.storeId)
                  .run();
              }
              return statement.bind(...values).run();
            },
          };
        },
      };
    },
  };
  await assert.rejects(updateMarketPolicy(wrapper, command), /market_policy_changed/);
  assert.deepEqual(
    JSON.parse(
      (await db.prepare('SELECT config_json FROM stores WHERE id=?').bind(command.storeId).first())
        .config_json,
    ),
    concurrent,
  );
});

test('native remote proxy is confirmed, has only the intended binding, and is disposed on success and failure', async (t) => {
  const { db } = await fixture(t);
  let disposed = 0,
    called = 0,
    temporary;
  const proxyFactory = async (options) => {
    called++;
    temporary = options.configPath;
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
  };
  await assert.rejects(
    updateProductionMarketPolicy(target, command, { confirmation: 'wrong', proxyFactory }),
    /target_not_confirmed/,
  );
  assert.equal(called, 0);
  await updateProductionMarketPolicy(target, command, {
    confirmation: target.databaseId,
    proxyFactory,
  });
  assert.equal(disposed, 1);
  await assert.rejects(access(temporary), { code: 'ENOENT' });
  await assert.rejects(
    updateProductionMarketPolicy(target, command, {
      confirmation: target.databaseId,
      proxyFactory,
    }),
    /market_policy_changed/,
  );
  assert.equal(disposed, 2);
  await assert.rejects(access(temporary), { code: 'ENOENT' });
});
