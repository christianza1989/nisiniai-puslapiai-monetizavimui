import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { NodeDatabase } from '../src/node-db.mjs';
import { digest } from '../src/validation.mjs';
import {
  appendDeliveryService,
  appendProductionDeliveryService,
} from '../src/node-delivery-service.mjs';
import { runCommand } from '../scripts/append-delivery-service.mjs';

const cfg = () => ({
  id: 'fixture',
  environment: 'production',
  enabled: true,
  requireCustomer: true,
  legalEntityId: 'fixture_entity',
  legalSnapshot: { name: 'TEST' },
  hosts: ['fixture.example'],
  productionAdmission: { approved: true },
  foreign: { unchanged: [1, 2, 3] },
  markets: [
    {
      country: 'LT',
      currency: 'EUR',
      policyVersion: '1'.repeat(64),
      delivery: [
        {
          id: 'locker',
          label: 'TEST locker',
          amount: 0,
          pricing: 'carrier',
          serviceIds: ['93', '228', '94'],
        },
        { id: 'courier', label: 'TEST courier', amount: 0, pricing: 'carrier', serviceIds: ['55'] },
      ],
    },
    {
      country: 'PL',
      currency: 'EUR',
      policyVersion: 'closed',
      checkoutEnabled: false,
      delivery: [{ id: 'locker', label: 'TEST closed', amount: 10 }],
    },
  ],
});
async function setup() {
  const db = new NodeDatabase();
  db.migrate();
  const original = cfg(),
    raw = JSON.stringify(original, null, 2);
  await db.prepare('INSERT INTO stores VALUES(?,?,?)').bind('fixture', 'production', raw).run();
  return {
    db,
    original,
    raw,
    command: {
      storeId: 'fixture',
      country: 'LT',
      deliveryId: 'locker',
      serviceId: '400',
      expectedConfigHash: await digest(raw),
    },
  };
}
test('append touches only the explicitly selected method and existing orders are untouched; stale replay fails', async () => {
  const { db, original, command } = await setup();
  try {
    const result = await appendDeliveryService(db, command);
    const actual = JSON.parse(
      (await db.prepare('SELECT config_json FROM stores').first()).config_json,
    );
    const expected = structuredClone(original);
    expected.markets[0].delivery[0].serviceIds.push('400');
    assert.deepEqual(actual, expected);
    assert.equal(result.existingOrdersChanged, false);
    await assert.rejects(appendDeliveryService(db, command), /delivery_service_changed/);
    await assert.rejects(
      appendDeliveryService(db, { ...command, expectedConfigHash: result.nextConfigHash }),
      /delivery_service_already_present/,
    );
  } finally {
    db.close();
  }
});
test('missing, disabled or ambiguous methods, malformed ID and stale config fail without writes', async () => {
  const { db, raw, command } = await setup();
  try {
    for (const bad of [
      { serviceId: '04' },
      { serviceId: 'bad' },
      { country: 'PL' },
      { deliveryId: 'absent' },
      { expectedConfigHash: '2'.repeat(64) },
    ])
      await assert.rejects(appendDeliveryService(db, { ...command, ...bad }));
    assert.equal((await db.prepare('SELECT config_json FROM stores').first()).config_json, raw);
  } finally {
    db.close();
  }
});
test('disabled and duplicate targeted methods cannot be updated', async () => {
  for (const kind of ['disabled', 'duplicate-method', 'duplicate-market']) {
    const { db, original, command } = await setup();
    try {
      if (kind === 'disabled') original.markets[0].delivery[0].enabled = false;
      if (kind === 'duplicate-method')
        original.markets[0].delivery.push(structuredClone(original.markets[0].delivery[0]));
      if (kind === 'duplicate-market') original.markets.push(structuredClone(original.markets[0]));
      const raw = JSON.stringify(original);
      await db.prepare('UPDATE stores SET config_json=? WHERE id=?').bind(raw, 'fixture').run();
      await assert.rejects(
        appendDeliveryService(db, { ...command, expectedConfigHash: await digest(raw) }),
      );
      assert.equal((await db.prepare('SELECT config_json FROM stores').first()).config_json, raw);
    } finally {
      db.close();
    }
  }
});
test('full configuration compare-and-swap does not clobber a concurrent foreign change', async () => {
  const { db, raw, command } = await setup();
  try {
    const changed = JSON.stringify({ ...JSON.parse(raw), foreign: { unchanged: ['concurrent'] } });
    const wrapped = {
      prepare(sql) {
        if (!sql.startsWith('UPDATE stores')) return db.prepare(sql);
        return {
          bind(...args) {
            const stmt = db.prepare(sql).bind(...args);
            return {
              async run() {
                await db
                  .prepare('UPDATE stores SET config_json=? WHERE id=?')
                  .bind(changed, 'fixture')
                  .run();
                return stmt.run();
              },
            };
          },
        };
      },
    };
    await assert.rejects(appendDeliveryService(wrapped, command), /delivery_service_changed/);
    assert.equal((await db.prepare('SELECT config_json FROM stores').first()).config_json, changed);
  } finally {
    db.close();
  }
});
test('default command does not connect to production and rejects ambiguous flags', async () => {
  const args = [
    '--account',
    '1'.repeat(32),
    '--database',
    '11111111-1111-4111-8111-111111111111',
    '--database-name',
    'fixture-production',
    '--confirm-database',
    '11111111-1111-4111-8111-111111111111',
    '--store',
    'fixture',
    '--country',
    'LT',
    '--expected-config-hash',
    '1'.repeat(64),
    '--delivery',
    'locker',
    '--service',
    '400',
  ];
  let calls = 0;
  const update = async () => {
    calls++;
    throw Error('must not connect');
  };
  assert.equal((await runCommand(args, { update })).state, 'PLAN_ONLY_NO_REMOTE_CONNECTION');
  await assert.rejects(runCommand([...args, '--service', '401'], { update }), /arguments_invalid/);
  assert.equal(calls, 0);
});
test('remote proxy requires matching confirmation, binds only the selected database and disposes on success and failure', async () => {
  const { db, command } = await setup();
  const target = {
    accountId: '1'.repeat(32),
    databaseId: '11111111-1111-4111-8111-111111111111',
    databaseName: 'fixture-production',
  };
  let calls = 0,
    disposed = 0,
    path;
  const proxyFactory = async (options) => {
    calls++;
    path = options.configPath;
    assert.equal(options.remoteBindings, true);
    assert.equal(options.persist, false);
    assert.deepEqual(options.envFiles, []);
    const configuration = JSON.parse(await readFile(path, 'utf8'));
    assert.equal(configuration.account_id, target.accountId);
    assert.equal(configuration.d1_databases.length, 1);
    assert.equal(configuration.d1_databases[0].database_id, target.databaseId);
    assert.equal(configuration.services, undefined);
    assert.equal(configuration.vars, undefined);
    return {
      env: { COMMERCE_DB: db },
      dispose: async () => {
        disposed++;
      },
    };
  };
  try {
    await assert.rejects(
      appendProductionDeliveryService(target, command, { confirmation: 'wrong', proxyFactory }),
      /target_not_confirmed/,
    );
    assert.equal(calls, 0);
    await appendProductionDeliveryService(target, command, {
      confirmation: target.databaseId,
      proxyFactory,
    });
    assert.equal(disposed, 1);
    await assert.rejects(access(path), { code: 'ENOENT' });
    await assert.rejects(
      appendProductionDeliveryService(target, command, {
        confirmation: target.databaseId,
        proxyFactory,
      }),
      /delivery_service_changed/,
    );
    assert.equal(disposed, 2);
    await assert.rejects(access(path), { code: 'ENOENT' });
  } finally {
    db.close();
  }
});
