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
