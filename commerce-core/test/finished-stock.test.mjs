import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { Backoffice } from '../src/backoffice.mjs';
import { FinishedStock } from '../src/finished-stock.mjs';
import { ReturnOperations } from '../src/returns.mjs';
import { CommerceOperations } from '../src/operations.mjs';
import { applyMigrations } from '../src/migrations.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import {
  fixtureStore,
  fixtureProducts,
  cart,
  key,
  fakeCheckout,
  payment,
  fixtureCarrier,
} from './fixtures.mjs';
const store = 'store_a',
  env = 'sandbox',
  actor = 'operator';
test('legacy assembled stock stays held until inspected adoption and full reconciliation without inventing history', async () => {
  const db = new NodeDatabase();
  try {
    const sources = readdirSync(new URL('../migrations/', import.meta.url))
      .filter((n) => n.endsWith('.sql'))
      .sort()
      .map((name) => ({
        name,
        source: readFileSync(new URL('../migrations/' + name, import.meta.url), 'utf8'),
      }));
    await applyMigrations(db, sources.slice(0, 20));
    const s = new CommerceService(db);
    await s.provisionStore(fixtureStore(), fixtureProducts(0));
    await s
      .stmt(
        'INSERT INTO recipes VALUES(?,?,?,?,?)',
        store,
        'old_recipe',
        'couple',
        '{}',
        'old_hash',
      )
      .run();
    await s
      .stmt(
        'INSERT INTO assemblies VALUES(?,?,?,?,?,?,?,?,?)',
        store,
        'old_assembly',
        'old_recipe',
        'couple',
        3,
        'old_hash',
        '{}',
        actor,
        100,
      )
      .run();
    await applyMigrations(db, sources);
    const f = new FinishedStock(s);
    assert.equal((await s.catalog(store, env))[0].available, 0);
    assert.equal((await f.list(store, env)).holds[0].held, 1);
    await assert.rejects(
      f.control(
        store,
        env,
        {
          id: 'early_reconcile',
          sku: 'couple',
          kind: 'reconcile',
          expectedAvailable: 3,
          qualityChecked: true,
          reason: 'TEST incomplete provenance',
        },
        actor,
      ),
      /finished_reconciliation_incomplete/,
    );
    await f.receive(
      store,
      env,
      {
        id: 'inspected_legacy',
        sku: 'couple',
        mode: 'adopt',
        quantity: 3,
        expectedAvailable: 3,
        supplierRef: 'TEST actual inspected batch',
        reason: 'TEST physical count and origin verified',
        qualityChecked: true,
        expiresAt: null,
        quarantined: false,
      },
      actor,
    );
    assert.equal((await f.list(store, env)).lots[0].sellable, 0);
    assert.equal((await f.list(store, env)).lots[0].assembly_id, null);
    await f.control(
      store,
      env,
      {
        id: 'reconciled',
        sku: 'couple',
        kind: 'reconcile',
        expectedAvailable: 3,
        qualityChecked: true,
        reason: 'TEST complete inspected provenance',
      },
      actor,
    );
    assert.equal((await s.catalog(store, env))[0].available, 3);
    assert.equal((await f.list(store, env)).lots[0].sellable, 3);
    assert.equal((await s.one('SELECT COUNT(*) n FROM assemblies')).n, 1);
    assert.equal((await s.one('SELECT quantity FROM assemblies')).quantity, 3);
    db.migrate();
    assert.equal((await s.catalog(store, env))[0].available, 3);
  } finally {
    db.close();
  }
});
async function setup(tracked = false) {
  const db = new NodeDatabase();
  db.migrate();
  let clock = 1791800000000;
  const s = new CommerceService(db, { now: () => clock }),
    b = new Backoffice(s),
    f = new FinishedStock(s);
  await s.provisionStore(
    fixtureStore(),
    fixtureProducts(0).map((p) => ({ ...p, ...(tracked ? { lotTrackingRequired: true } : {}) })),
  );
  await b.component(store, env, { id: 'powder', name: 'TEST powder', unit: 'unit' }, actor);
  await b.recipe(
    store,
    env,
    { id: 'recipe', sku: 'couple', components: [{ id: 'powder', unit: 'unit', quantity: 1 }] },
    actor,
  );
  return {
    db,
    s,
    b,
    f,
    at: () => clock,
    advance: (delta) => {
      clock += delta;
    },
  };
}
test('zero free legacy stock cannot be reconciled before unresolved orders or become sellable through their cancellation', async () => {
  const db = new NodeDatabase();
  try {
    const sources = readdirSync(new URL('../migrations/', import.meta.url))
      .filter((n) => n.endsWith('.sql'))
      .sort()
      .map((name) => ({
        name,
        source: readFileSync(new URL('../migrations/' + name, import.meta.url), 'utf8'),
      }));
    await applyMigrations(db, sources.slice(0, 20));
    const s = new CommerceService(db);
    await s.provisionStore(fixtureStore(), fixtureProducts(0));
    await s
      .stmt(
        'INSERT INTO recipes VALUES(?,?,?,?,?)',
        store,
        'old_recipe',
        'couple',
        '{}',
        'old_hash',
      )
      .run();
    await s
      .stmt(
        'INSERT INTO assemblies VALUES(?,?,?,?,?,?,?,?,?)',
        store,
        'old_assembly',
        'old_recipe',
        'couple',
        3,
        'old_hash',
        '{}',
        actor,
        100,
      )
      .run();
    const id = 'old_order';
    await s
      .stmt(
        'INSERT INTO orders(store_id,id,request_key,request_hash,currency,amount,snapshot_json,access_hash,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
        store,
        id,
        key(1),
        'old_hash',
        'EUR',
        9600,
        JSON.stringify({ lines: [{ sku: 'couple', quantity: 3 }], currency: 'EUR', country: 'LT' }),
        'old_access',
        9999999999999,
        100,
      )
      .run();
    await s.stmt('INSERT INTO order_lines VALUES(?,?,?,?)', store, id, 'couple', 3).run();
    await s
      .stmt(
        "UPDATE orders SET payment_state='refunded',stock_state='allocated',refunded_amount=amount WHERE id=?",
        id,
      )
      .run();
    assert.equal(
      (await s.one('SELECT available FROM inventory WHERE sku=?', 'couple')).available,
      0,
    );
    await applyMigrations(db, sources);
    const f = new FinishedStock(s);
    assert.equal((await f.list(store, env)).holds[0].held, 1);
    await assert.rejects(
      f.control(
        store,
        env,
        {
          id: 'empty_reconcile',
          sku: 'couple',
          kind: 'reconcile',
          expectedAvailable: 0,
          qualityChecked: true,
          reason: 'TEST empty but unresolved',
        },
        actor,
      ),
      /finished_legacy_order_unresolved/,
    );
    await new ReturnOperations(s).cancelUnshipped(
      store,
      env,
      id,
      {
        id: 'cancel_legacy',
        qualityChecked: true,
        reason: 'TEST legacy fully refunded cancellation',
      },
      actor,
    );
    assert.equal(
      (await s.one('SELECT available FROM inventory WHERE sku=?', 'couple')).available,
      3,
    );
    assert.equal((await s.catalog(store, env))[0].available, 0);
    await f.receive(
      store,
      env,
      {
        id: 'observed_canceled',
        sku: 'couple',
        mode: 'adopt',
        quantity: 3,
        expectedAvailable: 3,
        supplierRef: 'TEST actual batch',
        reason: 'TEST actual inspected returned stock',
        qualityChecked: true,
        expiresAt: null,
        quarantined: false,
      },
      actor,
    );
    await f.control(
      store,
      env,
      {
        id: 'full_reconcile',
        sku: 'couple',
        kind: 'reconcile',
        expectedAvailable: 3,
        qualityChecked: true,
        reason: 'TEST inspected full free stock',
      },
      actor,
    );
    assert.equal((await s.catalog(store, env))[0].available, 3);
  } finally {
    db.close();
  }
});
async function produce(c, id, quantity, expiresAt) {
  await c.b.receive(
    store,
    env,
    { id: 'raw_' + id, componentId: 'powder', supplierRef: 'TEST-' + id, quantity, expiresAt },
    actor,
  );
  await c.b.assemble(store, env, { id, recipeId: 'recipe', quantity }, actor);
}
const available = async (c) =>
  (await c.s.catalog(store, env)).find((p) => p.sku === 'couple').available;
async function paid(c, number = 1, quantity = 1) {
  const order = (await c.s.createOrder(store, env, cart('couple', quantity), key(number))).order;
  await c.s.checkout(store, env, order.id, fakeCheckout);
  await c.s.acceptPayment(
    store,
    env,
    payment(await c.s.getOrder(store, env, order.id), store, 'evt_' + number),
  );
  return c.s.getOrder(store, env, order.id);
}

test('assembled kit inherits expiry and a later component quarantine; no order, allocation or stock mutation on rejection', async () => {
  const c = await setup();
  try {
    await produce(c, 'expires', 1, c.at() + 1000);
    assert.equal((await c.f.list(store, env)).lots[0].expires_at, c.at() + 1000);
    c.advance(1001);
    assert.equal(await available(c), 0);
    await assert.rejects(c.s.createOrder(store, env, cart(), key(1)), /stock_unavailable/);
    assert.equal((await c.s.rows('SELECT * FROM orders')).length, 0);
    assert.equal((await c.s.rows('SELECT * FROM finished_allocations')).length, 0);
    assert.equal(
      (await c.s.one('SELECT available FROM inventory WHERE sku=?', 'couple')).available,
      1,
    );
    await produce(c, 'good', 1, c.at() + 10000);
    await c.b.controlLot(
      store,
      env,
      {
        id: 'quarantine_raw',
        lotId: 'raw_good',
        kind: 'quarantine',
        delta: 0,
        expectedAvailable: 0,
        expectedVersion: 1,
        reason: 'TEST supplier quarantine',
      },
      actor,
    );
    assert.equal(await available(c), 0);
    assert.equal((await c.f.list(store, env)).lots.find((l) => l.id === 'good').blocked, 1);
  } finally {
    c.db.close();
  }
});

test('finished FEFO allocates exact batches once, concurrent last-unit purchase and multi-SKU failure preserve whole ledger', async () => {
  const c = await setup(true);
  try {
    await produce(c, 'early', 2, c.at() + 10000);
    await produce(c, 'later', 3, c.at() + 20000);
    const order = (await c.s.createOrder(store, env, cart('couple', 3), key(1))).order;
    assert.deepEqual(
      (await c.f.order(store, env, order.id)).allocations.map((a) => [a.lot_id, a.quantity]),
      [
        ['early', 2],
        ['later', 1],
      ],
    );
    assert.equal((await c.s.createOrder(store, env, cart('couple', 3), key(1))).replayed, true);
    const mixed = {
      ...cart(),
      lines: [
        { sku: 'couple', quantity: 1 },
        { sku: 'family', quantity: 1 },
      ],
    };
    await assert.rejects(c.s.createOrder(store, env, mixed, key(2)), /stock_unavailable/);
    assert.equal(await available(c), 2);
    const race = await Promise.allSettled([
      c.s.createOrder(store, env, cart('couple', 2), key(3)),
      c.s.createOrder(store, env, cart('couple', 2), key(4)),
    ]);
    assert.equal(race.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(await available(c), 0);
    assert.equal((await c.s.one('SELECT SUM(quantity) AS n FROM finished_allocations')).n, 5);
  } finally {
    c.db.close();
  }
});

test('expiry during reservation keeps a genuine paid fact, releases bad stock and cancellation never restocks it twice', async () => {
  const c = await setup(true);
  try {
    await produce(c, 'short', 1, c.at() + 1000);
    const order = (await c.s.createOrder(store, env, cart(), key(1))).order;
    await c.s.checkout(store, env, order.id, fakeCheckout);
    c.advance(1001);
    await c.s.acceptPayment(store, env, payment(await c.s.getOrder(store, env, order.id)));
    const held = await c.s.getOrder(store, env, order.id);
    assert.equal(held.payment_state, 'paid');
    assert.equal(held.stock_state, 'released');
    assert.equal(held.fulfillment_state, 'stock_exception');
    assert.equal((await c.f.list(store, env)).lots[0].available, 1);
    assert.equal(await available(c), 0);
    await assert.rejects(c.s.markPacked(store, env, order.id, actor), /packing_not_allowed/);
    await c.s.confirmRefund(store, env, order.id, {
      providerId: 're_held',
      amount: held.amount,
      currency: held.currency,
    });
    const returns = new ReturnOperations(c.s),
      input = {
        id: 'cancel_bad',
        reason: 'TEST full refund and physical stock confirmed',
        qualityChecked: true,
      };
    await returns.cancelUnshipped(store, env, order.id, input, actor);
    assert.equal(
      (await returns.cancelUnshipped(store, env, order.id, input, actor)).replayed,
      true,
    );
    assert.equal((await c.f.list(store, env)).lots[0].available, 1);
    assert.equal(
      (await c.s.one('SELECT available FROM inventory WHERE sku=?', 'couple')).available,
      1,
    );
  } finally {
    c.db.close();
  }
});

test('late payment allocates fresh lot with a new generation after an expired reservation', async () => {
  const c = await setup(true);
  try {
    await produce(c, 'old', 1, c.at() + 1000);
    const order = (await c.s.createOrder(store, env, cart(), key(1))).order;
    await c.s.checkout(store, env, order.id, fakeCheckout);
    c.advance(3600001);
    await c.s.expire(store, env);
    await produce(c, 'fresh', 1, c.at() + 10000);
    await c.s.acceptPayment(store, env, payment(await c.s.getOrder(store, env, order.id)));
    const quality = await c.f.order(store, env, order.id);
    assert.deepEqual(
      quality.allocations.map((a) => [a.generation, a.lot_id, a.state]),
      [
        [0, 'old', 'released'],
        [1, 'fresh', 'allocated'],
      ],
    );
    assert.equal(quality.blocked, false);
    assert.equal(await available(c), 0);
    await c.s.markPacked(store, env, order.id, actor);
  } finally {
    c.db.close();
  }
});

test('quarantine after payment blocks packing and expiry after packing causes zero legacy carrier creates', async () => {
  const c = await setup(true);
  try {
    await produce(c, 'ship', 1, c.at() + 10000);
    const order = await paid(c);
    const control = {
      id: 'hold',
      lotId: 'ship',
      sku: 'couple',
      kind: 'quarantine',
      delta: 0,
      expectedAvailable: 0,
      expectedVersion: 1,
      reason: 'TEST inspection',
    };
    await c.f.control(store, env, control, actor);
    await assert.rejects(c.s.markPacked(store, env, order.id, actor), /stock_quality_hold/);
    await c.f.control(
      store,
      env,
      { ...control, id: 'release', kind: 'release', expectedVersion: 2, qualityChecked: true },
      actor,
    );
    await c.s.markPacked(store, env, order.id, actor);
    c.advance(10001);
    let creates = 0;
    const carrier = {
      supportsIdempotentCreate: true,
      requiresCustomer: false,
      find: async () => null,
      create: async () => {
        creates++;
        throw Error('must not post');
      },
    };
    await assert.rejects(c.s.registerShipment(store, env, order.id, carrier));
    assert.equal(creates, 0);
    assert.equal((await c.s.one('SELECT first_attempt_at FROM shipments')).first_attempt_at, null);
  } finally {
    c.db.close();
  }
});

test('traced returns require the actual original eligible lot and cannot launder expired goods into generic stock', async () => {
  const c = await setup(true);
  try {
    await produce(c, 'returns', 2, c.at() + 10000);
    const order = await paid(c, 1, 2);
    await c.s.markPacked(store, env, order.id, actor);
    await c.s.registerShipment(store, env, order.id, fixtureCarrier());
    const returns = new ReturnOperations(c.s),
      base = {
        id: 'return_one',
        reason: 'TEST inspected return',
        lines: [{ sku: 'couple', quantity: 1, disposition: 'resalable', expiryChecked: true }],
      };
    await assert.rejects(
      returns.receive(store, env, order.id, base, actor),
      /returned_lot_identity_required/,
    );
    const original = { ...base, lines: [{ ...base.lines[0], finishedLotId: 'returns' }] };
    await returns.receive(store, env, order.id, original, actor);
    assert.equal((await returns.receive(store, env, order.id, original, actor)).replayed, true);
    assert.equal(await available(c), 1);
    c.advance(10001);
    await assert.rejects(
      returns.receive(store, env, order.id, { ...original, id: 'return_expired' }, actor),
      /returned_lot_not_eligible/,
    );
    await returns.receive(
      store,
      env,
      order.id,
      {
        ...original,
        id: 'return_quarantine',
        lines: [{ ...original.lines[0], disposition: 'quarantine' }],
      },
      actor,
    );
    assert.equal(await available(c), 0);
    assert.equal((await c.f.list(store, env)).lots[0].available, 1);
  } finally {
    c.db.close();
  }
});

test('manual inspected lot receipt/adoption, CAS counts and quarantine preserve original evidence and enforce tracking policy', async () => {
  const c = await setup(true);
  try {
    const receipt = {
      id: 'observed',
      sku: 'couple',
      mode: 'receive',
      quantity: 3,
      expectedAvailable: 0,
      supplierRef: 'TEST observed batch',
      reason: 'TEST inspected original stock',
      qualityChecked: true,
      expiresAt: c.at() + 10000,
      quarantined: false,
    };
    const race = await Promise.all([
      c.f.receive(store, env, receipt, actor),
      c.f.receive(store, env, receipt, actor),
    ]);
    assert.equal(race.filter((r) => r.replayed).length, 1);
    assert.equal(await available(c), 3);
    await assert.rejects(
      c.f.receive(
        store,
        env,
        { ...receipt, id: 'over_adopt', mode: 'adopt', expectedAvailable: 3, quantity: 1 },
        actor,
      ),
      /finished_stock_conflict/,
    );
    const input = {
      id: 'count',
      sku: 'couple',
      lotId: 'observed',
      kind: 'adjust',
      delta: -1,
      expectedAvailable: 3,
      expectedVersion: 0,
      reason: 'TEST physical discrepancy',
    };
    await c.f.control(store, env, input, actor);
    assert.equal(await available(c), 2);
    assert.equal((await c.f.control(store, env, input, actor)).replayed, true);
    await assert.rejects(
      c.f.control(store, env, { ...input, id: 'stale' }, actor),
      /finished_state_conflict/,
    );
    await assert.rejects(
      new CommerceOperations(c.s).adjustStock(
        store,
        env,
        {
          id: 'bypass',
          sku: 'couple',
          delta: 1,
          expectedAvailable: 2,
          reason: 'TEST bypass forbidden',
        },
        actor,
      ),
      /stock_adjustment_conflict/,
    );
    assert.equal((await c.f.list(store, env)).lots[0].received, 3);
    await assert.rejects(
      c.s.stmt("UPDATE finished_lots SET expires_at=NULL WHERE id='observed'").run(),
      /finished_lot_immutable/,
    );
  } finally {
    c.db.close();
  }
});
