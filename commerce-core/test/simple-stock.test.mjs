import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { CommerceOperations } from '../src/operations.mjs';
import { CatalogOperations } from '../src/catalog.mjs';
import { FinishedStock } from '../src/finished-stock.mjs';
import { prepareBusiness } from '../src/business-config.mjs';
import { renderFinishedStock, usesOnlySimpleStock } from '../public/finished-stock-ui.mjs';
import { fixtureStore, cart, key, fakeCheckout, payment } from './fixtures.mjs';
const actor = 'fixture_owner',
  env = 'sandbox';
const definitions = [
  {
    sku: 'couple',
    title: 'Couple fixture',
    enabled: true,
    prices: { LT: 3200 },
    package: { weightGrams: 2200, dimensionsMm: [200, 200, 170] },
  },
  {
    sku: 'family',
    title: 'Family fixture',
    enabled: true,
    prices: { LT: 4800 },
    package: { weightGrams: 4500, dimensionsMm: [250, 250, 200] },
  },
];
async function setup(t, { mode = false, seed = 999, id = 'store_counts' } = {}) {
  const db = new NodeDatabase();
  db.migrate();
  t.after(() => db.close());
  let at = Date.now();
  const s = new CommerceService(db, { now: () => at }),
    ops = new CommerceOperations(s),
    catalog = new CatalogOperations(s),
    config = fixtureStore(id);
  await s
    .stmt(
      'INSERT INTO stores(id,environment,config_json) VALUES(?,?,?)',
      id,
      env,
      JSON.stringify(config),
    )
    .run();
  for (const definition of definitions) {
    await catalog.revise(
      id,
      env,
      {
        id: 'revision_' + definition.sku,
        basisHash: null,
        definition: { ...definition, ...(mode === 'legacy' ? {} : { lotTrackingRequired: mode }) },
      },
      actor,
    );
    assert.equal(
      (
        await s.one(
          'SELECT available FROM inventory WHERE store_id=? AND sku=?',
          id,
          definition.sku,
        )
      ).available,
      0,
    );
    if (seed && mode !== true)
      await ops.adjustStock(
        id,
        env,
        {
          id: 'initial_' + definition.sku,
          sku: definition.sku,
          delta: seed,
          expectedAvailable: 0,
          reason: 'Owner configured temporary balance; not a physical count',
        },
        actor,
      );
  }
  return {
    db,
    s,
    ops,
    catalog,
    id,
    advance: (ms) => {
      at += ms;
    },
    available: async (sku) =>
      (await s.one('SELECT available FROM inventory WHERE store_id=? AND sku=?', id, sku))
        .available,
  };
}
test('explicit simple count catalog plus optimistic/idempotent adjustments needs no lot, expiry or quality record', async (t) => {
  const f = await setup(t);
  assert.equal(await f.available('couple'), 999);
  assert.equal(await f.available('family'), 999);
  assert.deepEqual(
    (await f.ops.overview(f.id, env)).catalog.map((p) => p.stockMode),
    ['simple', 'simple'],
  );
  const input = {
    id: 'initial_couple',
    sku: 'couple',
    delta: 999,
    expectedAvailable: 0,
    reason: 'Owner configured temporary balance; not a physical count',
  };
  assert.equal((await f.ops.adjustStock(f.id, env, input, actor)).replayed, true);
  assert.equal(await f.available('couple'), 999);
  await assert.rejects(
    f.ops.adjustStock(f.id, env, { ...input, reason: 'Changed meaning' }, actor),
    /stock_adjustment_id_conflict/,
  );
  await assert.rejects(
    f.ops.adjustStock(f.id, env, { ...input, id: 'stale_initial' }, actor),
    /stock_adjustment_conflict/,
  );
  await assert.rejects(
    f.ops.adjustStock(
      f.id,
      env,
      { ...input, id: 'negative', delta: -1000, expectedAvailable: 999 },
      actor,
    ),
    /stock_adjustment_conflict/,
  );
  for (const name of [
    'finished_lots',
    'finished_allocations',
    'finished_controls',
    'component_lots',
    'assemblies',
  ])
    assert.equal(
      (await f.s.one('SELECT COUNT(*) n FROM ' + name + ' WHERE store_id=?', f.id)).n,
      0,
    );
});
test('simple multi-SKU reservation decrements at order creation only, payment/packing/replays never decrement again', async (t) => {
  const f = await setup(t),
    input = {
      ...cart(),
      lines: [
        { sku: 'couple', quantity: 2 },
        { sku: 'family', quantity: 3 },
      ],
    };
  const first = await f.s.createOrder(f.id, env, input, key(701));
  assert.equal(await f.available('couple'), 997);
  assert.equal(await f.available('family'), 996);
  assert.equal((await f.s.createOrder(f.id, env, input, key(701))).replayed, true);
  await f.s.checkout(f.id, env, first.order.id, fakeCheckout);
  const event = payment(await f.s.getOrder(f.id, env, first.order.id), f.id, 'evt_simple_paid');
  await f.s.acceptPayment(f.id, env, event);
  assert.equal((await f.s.acceptPayment(f.id, env, event)).replayed, true);
  await f.s.markPacked(f.id, env, first.order.id, actor);
  await f.s.markPacked(f.id, env, first.order.id, actor);
  assert.equal(await f.available('couple'), 997);
  assert.equal(await f.available('family'), 996);
  const quality = await new FinishedStock(f.s).order(f.id, env, first.order.id);
  assert.equal(quality.blocked, false);
  assert.deepEqual(quality.allocations, []);
  f.advance(3600000);
  assert.equal(await f.s.expire(f.id, env), 0);
});
test('last simple unit is reserved once across concurrent orders and expiration releases it once; late paid reallocation is guarded', async (t) => {
  const f = await setup(t, { seed: 1 });
  const results = await Promise.allSettled(
    [701, 702].map((n) => f.s.createOrder(f.id, env, cart(), key(n))),
  );
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(await f.available('couple'), 0);
  assert.equal(await f.available('family'), 1);
  const order = results.find((r) => r.status === 'fulfilled').value.order;
  await f.s.checkout(f.id, env, order.id, fakeCheckout);
  f.advance(3600000);
  assert.equal(await f.s.expire(f.id, env), 1);
  assert.equal(await f.s.expire(f.id, env), 0);
  assert.equal(await f.available('couple'), 1);
  const event = payment(await f.s.getOrder(f.id, env, order.id), f.id, 'evt_late_simple');
  await f.s.acceptPayment(f.id, env, event);
  await f.s.acceptPayment(f.id, env, event);
  assert.equal(await f.available('couple'), 0);
  assert.equal(await f.available('family'), 1);
});
test('insufficient simple multi-SKU order rolls back every line; tracked policy and quarantine stay enforced', async (t) => {
  const simple = await setup(t, { seed: 1 });
  await assert.rejects(
    simple.s.createOrder(
      simple.id,
      env,
      {
        ...cart(),
        lines: [
          { sku: 'couple', quantity: 1 },
          { sku: 'family', quantity: 2 },
        ],
      },
      key(703),
    ),
    /stock_unavailable/,
  );
  const legacy = await setup(t, { mode: 'legacy', seed: 1, id: 'store_legacy' });
  assert.equal((await legacy.ops.overview(legacy.id, env)).catalog[0].stockMode, 'legacy');
  assert.equal(await simple.available('couple'), 1);
  assert.equal(await simple.available('family'), 1);
  assert.equal((await simple.s.one('SELECT COUNT(*) n FROM orders')).n, 0);
  const tracked = await setup(t, { mode: true, seed: 0, id: 'store_tracked' }),
    finished = new FinishedStock(tracked.s);
  await finished.receive(
    tracked.id,
    env,
    {
      id: 'actual_fixture_batch',
      sku: 'couple',
      mode: 'receive',
      quantity: 5,
      expectedAvailable: 0,
      supplierRef: 'fixture_supplier_batch',
      reason: 'Isolated traced fixture',
      qualityChecked: true,
      expiresAt: null,
      quarantined: true,
    },
    actor,
  );
  assert.equal((await tracked.ops.overview(tracked.id, env)).catalog[0].stockMode, 'lots');
  assert.equal(
    (await tracked.s.catalog(tracked.id, env)).find((p) => p.sku === 'couple').available,
    0,
  );
  await assert.rejects(
    tracked.ops.adjustStock(
      tracked.id,
      env,
      {
        id: 'cannot_bypass_lots',
        sku: 'couple',
        delta: 999,
        expectedAvailable: 5,
        reason: 'Invalid bypass fixture',
      },
      actor,
    ),
    /stock_adjustment_conflict/,
  );
  const prior = (await tracked.catalog.list(tracked.id, env)).find((p) => p.sku === 'couple');
  await assert.rejects(
    tracked.catalog.revise(
      tracked.id,
      env,
      {
        id: 'cannot_disable_tracking',
        basisHash: prior.basisHash,
        definition: { ...definitions[0], lotTrackingRequired: false },
      },
      actor,
    ),
    /stock_policy_immutable/,
  );
  await assert.rejects(
    tracked.s.createOrder(tracked.id, env, cart(), key(704)),
    /stock_unavailable/,
  );
  assert.equal(await simple.available('couple'), 1);
});
test('business preparation honors explicit simple products, defaults other products to lots and still invents no stock', () => {
  const business = JSON.parse(
    readFileSync(new URL('../config/memocasting-business.json', import.meta.url), 'utf8'),
  );
  const original = prepareBusiness(business);
  assert.ok(original.products.slice(0, 2).every((p) => p.lotTrackingRequired === true));
  business.products.forEach((p) => {
    p.lotTrackingRequired = false;
  });
  const counts = prepareBusiness(business);
  assert.ok(
    counts.products.slice(0, 2).every((p) => p.lotTrackingRequired === false && p.stock === 0),
  );
  assert.ok(!counts.missing.includes('actual_inventory_and_lots'));
  assert.ok(counts.missing.includes('apply_owner_configured_stock_balances'));
  business.products[1].lotTrackingRequired = true;
  const mixed = prepareBusiness(business);
  assert.ok(mixed.missing.includes('actual_inventory_and_lots'));
  assert.ok(mixed.missing.includes('apply_owner_configured_stock_balances'));
  business.products[0].lotTrackingRequired = 'false';
  assert.throws(() => prepareBusiness(business), /business_facts_invalid/);
});
test('simple-only UI has no batch fields; mixed/legacy selectors and historical holds remain visible', async () => {
  const n = (tag, attrs = {}, ...children) => ({
    tag,
    attrs,
    children: children.flat(Infinity),
    addEventListener() {},
    append(...items) {
      this.children.push(...items);
    },
  });
  const data = { lots: [], holds: [], controls: [], inventory: [] };
  const render = async (catalog, override = {}) => {
    const content = n('main');
    await renderFinishedStock(
      content,
      {
        catalog,
        node: n,
        table: (headers, rows) => n('table', { headers }, rows),
        cell: (v) => n('td', {}, v),
        api: async () => ({ ...data, ...override }),
        action() {},
        has: () => true,
        date: () => 'fixture',
      },
      async () => {},
    );
    return content;
  };
  const simple = [{ sku: 'couple', title: 'Couple', stockMode: 'simple' }];
  assert.equal(usesOnlySimpleStock(simple), true);
  assert.equal(usesOnlySimpleStock([...simple, { enabled: false, stockMode: 'legacy' }]), true);
  assert.equal(usesOnlySimpleStock([...simple, { enabled: false, stockMode: 'lots' }]), false);
  assert.equal((await render(simple)).children.length, 0);
  const walk = (node) => [
    node,
    ...(node?.children || []).filter((c) => typeof c === 'object').flatMap(walk),
  ];
  const mixed = await render([
    ...simple,
    { sku: 'tracked', title: 'Tracked', stockMode: 'lots' },
    { sku: 'legacy', title: 'Legacy' },
  ]);
  const options = walk(mixed)
    .filter((node) => node.tag === 'option')
    .map((node) => node.attrs.value);
  assert.ok(!options.includes('couple'));
  assert.ok(options.includes('tracked'));
  assert.ok(options.includes('legacy'));
  assert.equal(usesOnlySimpleStock([{ stockMode: 'legacy' }]), false);
  const history = await render(simple, {
    controls: [
      {
        sku: 'couple',
        lot_id: null,
        kind: 'quarantine',
        reason: 'Historical fixture',
        created_at: 1,
      },
    ],
  });
  assert.ok(history.children.length > 0);
});
