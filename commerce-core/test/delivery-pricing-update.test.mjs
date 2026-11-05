import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { digest } from '../src/validation.mjs';
import { updateDeliveryPricing } from '../src/node-delivery-pricing.mjs';
import { runDeliveryPricingCommand } from '../scripts/update-delivery-pricing.mjs';
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
        { id: 'courier', label: 'TEST courier', amount: 0, pricing: 'carrier', serviceIds: ['42'] },
      ],
    },
    {
      country: 'PL',
      currency: 'EUR',
      policyVersion: 'closed',
      checkoutEnabled: false,
      delivery: [{ id: 'courier', label: 'TEST closed', amount: 10 }],
    },
  ],
});
test('single-parcel pricing CAS preserves other fields and supports scoped rollback without old-snapshot restore', async () => {
  const db = new NodeDatabase();
  db.migrate();
  try {
    const config = cfg(),
      raw = JSON.stringify(config, null, 2);
    await db.prepare('INSERT INTO stores VALUES(?,?,?)').bind('fixture', 'production', raw).run();
    const command = {
      storeId: 'fixture',
      country: 'LT',
      expectedConfigHash: await digest(raw),
      deliveryIds: ['courier'],
      customerCharge: 'single_parcel',
    };
    const result = await updateDeliveryPricing(db, command);
    const current = JSON.parse(
      (await db.prepare('SELECT config_json FROM stores').first()).config_json,
    );
    const expected = structuredClone(config);
    expected.markets[0].delivery[0].customerCharge = 'single_parcel';
    assert.deepEqual(current, expected);
    assert.equal(result.existingOrdersChanged, false);
    await assert.rejects(updateDeliveryPricing(db, command), /delivery_pricing_changed/);
    await updateDeliveryPricing(db, {
      ...command,
      expectedConfigHash: result.nextConfigHash,
      customerCharge: 'all_parcels',
    });
    assert.deepEqual(
      JSON.parse((await db.prepare('SELECT config_json FROM stores').first()).config_json),
      config,
    );
  } finally {
    db.close();
  }
});
test('pricing default plan never connects remotely and rejects duplicate flags/closed markets/unknown methods', async () => {
  let calls = 0;
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
    'courier',
    '--charge',
    'single_parcel',
  ];
  const update = async () => {
    calls++;
    throw Error('must not connect');
  };
  assert.equal(
    (await runDeliveryPricingCommand(args, { update })).state,
    'PLAN_ONLY_NO_REMOTE_CONNECTION',
  );
  await assert.rejects(
    runDeliveryPricingCommand([...args, '--store', 'other'], { update }),
    /arguments_invalid/,
  );
  assert.equal(calls, 0);
  const db = new NodeDatabase();
  db.migrate();
  try {
    const raw = JSON.stringify(cfg());
    await db.prepare('INSERT INTO stores VALUES(?,?,?)').bind('fixture', 'production', raw).run();
    const base = {
      storeId: 'fixture',
      country: 'PL',
      expectedConfigHash: await digest(raw),
      deliveryIds: ['courier'],
      customerCharge: 'single_parcel',
    };
    await assert.rejects(updateDeliveryPricing(db, base), /market_invalid/);
    await assert.rejects(
      updateDeliveryPricing(db, { ...base, country: 'LT', deliveryIds: ['absent'] }),
      /method_invalid/,
    );
    assert.equal((await db.prepare('SELECT config_json FROM stores').first()).config_json, raw);
  } finally {
    db.close();
  }
});

test('flat rates use per-method cents, scoped CAS, explicit removal and preserve unrelated data', async () => {
  const db = new NodeDatabase();
  db.migrate();
  try {
    const config = cfg();
    config.markets[0].delivery.push({
      id: 'locker',
      label: 'TEST locker',
      amount: 0,
      pricing: 'carrier',
      serviceIds: ['42'],
    });
    const raw = JSON.stringify(config);
    await db.prepare('INSERT INTO stores VALUES(?,?,?)').bind('fixture', 'production', raw).run();
    const command = {
      storeId: 'fixture',
      country: 'LT',
      expectedConfigHash: await digest(raw),
      deliveryIds: ['courier', 'locker'],
      customerCharge: 'single_parcel',
      customerFlatAmounts: { courier: 524, locker: 375 },
    };
    const result = await updateDeliveryPricing(db, command);
    const current = JSON.parse(
      (await db.prepare('SELECT config_json FROM stores').first()).config_json,
    );
    assert.equal(current.markets[0].delivery[0].customerFlatAmount, 524);
    assert.equal(current.markets[0].delivery[1].customerFlatAmount, 375);
    assert.deepEqual(current.foreign, config.foreign);
    assert.deepEqual(current.markets[1], config.markets[1]);
    await assert.rejects(updateDeliveryPricing(db, command), /delivery_pricing_changed/);
    await assert.rejects(
      updateDeliveryPricing(db, {
        ...command,
        expectedConfigHash: result.nextConfigHash,
        customerFlatAmounts: { courier: 524 },
      }),
      /delivery_pricing_command_invalid/,
    );
    await assert.rejects(
      updateDeliveryPricing(db, {
        ...command,
        expectedConfigHash: result.nextConfigHash,
        customerFlatAmounts: { courier: -1, locker: 375 },
      }),
      /delivery_pricing_command_invalid/,
    );
    await updateDeliveryPricing(db, {
      ...command,
      expectedConfigHash: result.nextConfigHash,
      customerCharge: 'all_parcels',
      customerFlatAmounts: { courier: null, locker: null },
    });
    assert.deepEqual(
      JSON.parse((await db.prepare('SELECT config_json FROM stores').first()).config_json),
      config,
    );
  } finally {
    db.close();
  }
});

test('flat-rate CLI parses exact cents and remains plan-only without explicit apply', async () => {
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
    'courier,locker',
    '--charge',
    'single_parcel',
    '--flat-amounts',
    'courier=524,locker=375',
  ];
  const plan = await runDeliveryPricingCommand(args, {
    update: async () => {
      throw Error('must not connect');
    },
  });
  assert.equal(plan.state, 'PLAN_ONLY_NO_REMOTE_CONNECTION');
  assert.deepEqual(plan.customerFlatAmounts, { courier: 524, locker: 375 });
  const invalid = args.slice(0, -1).concat('courier=5.24,locker=375');
  await assert.rejects(runDeliveryPricingCommand(invalid), /arguments_invalid/);
});

test('flat-rate-only update preserves each method customer charge independently', async () => {
  const db = new NodeDatabase();
  db.migrate();
  try {
    const config = cfg();
    config.markets[0].delivery.push({
      id: 'locker',
      label: 'TEST locker',
      amount: 0,
      pricing: 'carrier',
      serviceIds: ['42'],
      customerCharge: 'single_parcel',
    });
    const raw = JSON.stringify(config);
    await db.prepare('INSERT INTO stores VALUES(?,?,?)').bind('fixture', 'production', raw).run();
    const result = await updateDeliveryPricing(db, {
      storeId: 'fixture',
      country: 'LT',
      expectedConfigHash: await digest(raw),
      deliveryIds: ['courier', 'locker'],
      customerCharge: 'preserve',
      customerFlatAmounts: { courier: 524, locker: 375 },
    });
    const current = JSON.parse(
      (await db.prepare('SELECT config_json FROM stores').first()).config_json,
    );
    const expected = structuredClone(config);
    expected.markets[0].delivery[0].customerFlatAmount = 524;
    expected.markets[0].delivery[1].customerFlatAmount = 375;
    assert.deepEqual(current, expected);
    assert.deepEqual(
      result.prior.map((v) => [v.id, v.customerCharge]),
      [
        ['courier', 'all_parcels'],
        ['locker', 'single_parcel'],
      ],
    );
  } finally {
    db.close();
  }
});
