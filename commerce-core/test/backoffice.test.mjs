import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { Backoffice } from '../src/backoffice.mjs';
import { Wholesale } from '../src/wholesale.mjs';
import { createHandler } from '../src/http.mjs';
import { fixtureStore, fixtureProducts, cart, key, fakeCheckout, payment } from './fixtures.mjs';
const actor = 'test_operator',
  env = 'sandbox',
  store = 'store_a';
const customer = {
  name: 'Testinis Partneris',
  email: 'partner@example.test',
  phone: '+37060000000',
  address: { country: 'LT', line1: 'Testinė g. 1', city: 'Vilnius', postalCode: '01101' },
};
async function setup() {
  const db = new NodeDatabase();
  db.migrate();
  const s = new CommerceService(db),
    back = new Backoffice(s),
    whole = new Wholesale(s);
  await s.provisionStore(fixtureStore(), fixtureProducts());
  await s.provisionStore(fixtureStore('store_b'), fixtureProducts());
  return { db, s, back, whole };
}
async function materials(b) {
  for (const id of ['a', 'b']) {
    await b.component(store, env, { id, name: 'Testinė medžiaga ' + id, unit: 'unit' }, actor);
    await b.receive(
      store,
      env,
      { id: id + '_lot', componentId: id, supplierRef: 'TEST-' + id, quantity: 2 },
      actor,
    );
  }
  for (const sku of ['couple', 'family'])
    await b.recipe(
      store,
      env,
      {
        id: sku + '_recipe',
        sku,
        components: [
          { id: 'a', unit: 'unit', quantity: 1 },
          { id: 'b', unit: 'unit', quantity: 1 },
        ],
      },
      actor,
    );
}
async function paid(s) {
  const o = (await s.createOrder(store, env, cart(), key(71))).order;
  await s.checkout(store, env, o.id, fakeCheckout);
  await s.acceptPayment(
    store,
    env,
    payment(await s.getOrder(store, env, o.id), store, 'evt_backoffice'),
  );
  return s.getOrder(store, env, o.id);
}
async function partner(w) {
  await w.priceList(
    store,
    env,
    {
      id: 'test_prices',
      currency: 'EUR',
      lines: [{ sku: 'couple', unitAmount: 2000, moq: 2, casepack: 2 }],
    },
    actor,
  );
  await w.partner(
    store,
    env,
    {
      id: 'partner',
      name: 'Testinis partneris',
      priceListId: 'test_prices',
      country: 'LT',
      currency: 'EUR',
      customer,
      approved: true,
    },
    actor,
  );
}

test('assembly consumes shared lots once and rolls back output, lot lines and events on shortage/race', async () => {
  const { db, s, back: b } = await setup();
  await materials(b);
  const input = { id: 'assembly_1', recipeId: 'couple_recipe', quantity: 1 };
  const results = await Promise.all([
    b.assemble(store, env, input, actor),
    b.assemble(store, env, input, actor),
  ]);
  assert.equal(new Set(results.map((r) => r.assembly.id)).size, 1);
  assert.equal((await s.catalog(store, env)).find((p) => p.sku === 'couple').available, 6);
  assert.equal(
    (await b.inventory(store, env)).lots.every((l) => l.available === 1),
    true,
  );
  await assert.rejects(b.assemble(store, env, { ...input, quantity: 2 }, actor), /record_conflict/);
  const race = await Promise.allSettled([
    b.assemble(store, env, { id: 'race_a', recipeId: 'couple_recipe', quantity: 1 }, actor),
    b.assemble(store, env, { id: 'race_b', recipeId: 'family_recipe', quantity: 1 }, actor),
  ]);
  assert.equal(race.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(race.find((r) => r.status === 'rejected').reason.code, 'component_stock_conflict');
  assert.equal((await b.inventory(store, env)).assemblies.length, 2);
  assert.equal(
    (await b.inventory(store, env)).lots.every((l) => l.available === 0),
    true,
  );
  assert.equal((await s.rows("SELECT * FROM audit WHERE kind='KitsAssembled'")).length, 2);
  await assert.rejects(b.assemble('store_b', env, input, actor), /recipe_not_found/);
  db.close();
});

test('lot receipt/recipe replay is immutable; FEFO skips expired lots and enforces the unit', async () => {
  const { db, s, back: b } = await setup();
  await b.component(store, env, { id: 'a', name: 'Testinė medžiaga', unit: 'g' }, actor);
  const receipt = {
    id: 'expired',
    componentId: 'a',
    supplierRef: 'TEST-expired',
    quantity: 100,
    expiresAt: Date.now() - 1000,
  };
  await b.receive(store, env, receipt, actor);
  assert.equal((await b.receive(store, env, receipt, actor)).replayed, true);
  await assert.rejects(
    b.receive(store, env, { ...receipt, quantity: 101 }, actor),
    /record_conflict/,
  );
  await assert.rejects(
    b.recipe(
      store,
      env,
      { id: 'bad_unit', sku: 'couple', components: [{ id: 'a', quantity: 10, unit: 'unit' }] },
      actor,
    ),
    /component_unit_mismatch/,
  );
  await b.recipe(
    store,
    env,
    { id: 'recipe', sku: 'couple', components: [{ id: 'a', quantity: 10, unit: 'g' }] },
    actor,
  );
  await assert.rejects(
    b.assemble(store, env, { id: 'shortage', recipeId: 'recipe', quantity: 1 }, actor),
    /component_stock_conflict/,
  );
  await b.receive(
    store,
    env,
    {
      id: 'late',
      componentId: 'a',
      supplierRef: 'TEST-late',
      quantity: 10,
      expiresAt: Date.now() + 100000,
    },
    actor,
  );
  await b.receive(
    store,
    env,
    {
      id: 'early',
      componentId: 'a',
      supplierRef: 'TEST-early',
      quantity: 6,
      expiresAt: Date.now() + 50000,
    },
    actor,
  );
  const result = await b.assemble(
    store,
    env,
    { id: 'fefo', recipeId: 'recipe', quantity: 1 },
    actor,
  );
  assert.deepEqual(
    result.assembly.payload.consumed.map((l) => [l.lotId, l.quantity]),
    [
      ['early', 6],
      ['late', 4],
    ],
  );
  assert.equal(
    (await s.one('SELECT available FROM component_lots WHERE id=?', 'expired')).available,
    100,
  );
  db.close();
});

test('financial import is atomic, deduplicated and immutable across conflicting/concurrent batches', async () => {
  const { db, s, back: b } = await setup();
  const row = {
    reference: 'balance_1',
    kind: 'payment',
    amount: 3200,
    currency: 'EUR',
    transactionRef: 'pi_unknown',
    occurredAt: 100,
  };
  const input = { origin: 'stripe_balance', rows: [row] };
  await Promise.all([
    b.importSources(store, env, input, actor),
    b.importSources(store, env, input, actor),
  ]);
  assert.equal((await b.financials(store, env)).sources.length, 1);
  await assert.rejects(
    b.importSources(
      store,
      env,
      {
        origin: input.origin,
        rows: [
          { ...row, reference: 'new_row' },
          { ...row, amount: 3201 },
        ],
      },
      actor,
    ),
    /financial_source_conflict/,
  );
  assert.equal((await b.financials(store, env)).sources.length, 1);
  await assert.rejects(
    b.importSources(store, env, { origin: 'test', rows: [{ ...row, kind: 'refund' }] }, actor),
    /financial_sign_invalid/,
  );
  await assert.rejects(
    s.stmt('UPDATE financial_sources SET amount=999').run(),
    /financial_source_immutable/,
  );
  await b.importSources('store_b', env, input, actor);
  assert.equal((await b.financials('store_b', env)).sources.length, 1);
  db.close();
});

test('reconciliation requires independent paid/refund facts and prevents duplicate source/target matches', async () => {
  const { db, s, back: b } = await setup();
  const order = await paid(s);
  await s.confirmRefund(store, env, order.id, {
    providerId: 're_test',
    amount: 500,
    currency: 'EUR',
  });
  await b.importSources(
    store,
    env,
    {
      origin: 'stripe_balance',
      rows: [
        {
          reference: 'payment',
          kind: 'payment',
          amount: 3200,
          currency: 'EUR',
          transactionRef: order.payment_id,
          occurredAt: 100,
        },
        {
          reference: 'wrong',
          kind: 'payment',
          amount: 3201,
          currency: 'EUR',
          transactionRef: order.payment_id,
          occurredAt: 101,
        },
        {
          reference: 'refund',
          kind: 'refund',
          amount: -500,
          currency: 'EUR',
          transactionRef: 're_test',
          occurredAt: 102,
        },
        {
          reference: 'duplicate_target',
          kind: 'payment',
          amount: 3200,
          currency: 'EUR',
          transactionRef: order.payment_id,
          occurredAt: 103,
        },
      ],
    },
    actor,
  );
  const rows = (await b.financials(store, env)).sources,
    get = (ref) => rows.find((r) => r.reference === ref);
  assert.equal(get('wrong').state, 'exception');
  await assert.rejects(
    b.reconcile(store, env, { sourceId: get('wrong').id }, actor),
    /reconciliation_facts_mismatch/,
  );
  const matches = await Promise.all([
    b.reconcile(store, env, { sourceId: get('payment').id }, actor),
    b.reconcile(store, env, { sourceId: get('payment').id }, actor),
  ]);
  assert.equal(
    matches.some((r) => r.replayed),
    true,
  );
  await assert.rejects(
    b.reconcile(store, env, { sourceId: get('duplicate_target').id }, actor),
    /reconciliation_conflict/,
  );
  await b.reconcile(store, env, { sourceId: get('refund').id }, actor);
  assert.equal(
    (await b.financials(store, env)).sources.filter((r) => r.state === 'matched').length,
    2,
  );
  assert.equal((await s.getOrder(store, env, order.id)).refunded_amount, 500);
  assert.equal((await s.rows('SELECT * FROM journal_entries')).length, 0);
  db.close();
});

test('payout/bank reconciliation checks sign, currency and payout ID and consumes each source once', async () => {
  const { db, back: b } = await setup();
  await b.importSources(
    store,
    env,
    {
      origin: 'test',
      rows: [
        {
          reference: 'payout',
          kind: 'payout',
          amount: -1234,
          currency: 'EUR',
          transactionRef: 'po_test',
          occurredAt: 100,
        },
        {
          reference: 'bank',
          kind: 'bank',
          amount: 1234,
          currency: 'EUR',
          transactionRef: 'po_test',
          occurredAt: 100,
        },
        {
          reference: 'wrong_bank',
          kind: 'bank',
          amount: 1234,
          currency: 'PLN',
          transactionRef: 'po_test',
          occurredAt: 100,
        },
        {
          reference: 'second_payout',
          kind: 'payout',
          amount: -1234,
          currency: 'EUR',
          transactionRef: 'po_test',
          occurredAt: 100,
        },
      ],
    },
    actor,
  );
  const rows = (await b.financials(store, env)).sources,
    get = (ref) => rows.find((r) => r.reference === ref).id;
  await assert.rejects(
    b.reconcile(store, env, { sourceId: get('payout'), peerId: get('wrong_bank') }, actor),
    /transfer_facts_mismatch/,
  );
  const input = { sourceId: get('payout'), peerId: get('bank') };
  await b.reconcile(store, env, input, actor);
  assert.equal((await b.reconcile(store, env, input, actor)).replayed, true);
  await assert.rejects(
    b.reconcile(store, env, { sourceId: get('second_payout'), peerId: get('bank') }, actor),
    /reconciliation_conflict/,
  );
  db.close();
});

test('wholesale applies private MOQ/casepack prices, immutable quotes and one atomic order on acceptance', async () => {
  const { db, s, whole: w } = await setup();
  await partner(w);
  const input = {
    id: 'quote_1',
    partnerId: 'partner',
    lines: [{ sku: 'couple', quantity: 2 }],
    deliveryId: 'test_delivery',
  };
  await assert.rejects(
    w.quote(store, env, { ...input, lines: [{ sku: 'couple', quantity: 3 }] }, actor),
    /wholesale_quantity_invalid/,
  );
  const q = await w.quote(store, env, { ...input, unitAmount: 1, amount: 1 }, actor);
  assert.equal(q.quote.snapshot.amount, 4000);
  assert.equal(q.quote.snapshot.lines[0].unitAmount, 2000);
  assert.equal((await s.catalog(store, env))[0].prices.LT, 3200);
  assert.equal((await w.quote(store, env, input, actor)).replayed, true);
  await assert.rejects(
    w.quote(store, env, { ...input, lines: [{ sku: 'couple', quantity: 4 }] }, actor),
    /record_conflict/,
  );
  await assert.rejects(
    s.stmt('UPDATE wholesale_quotes SET expires_at=0').run(),
    /wholesale_quote_immutable/,
  );
  const results = await Promise.all([
    w.accept(store, env, input.id, actor),
    w.accept(store, env, input.id, actor),
  ]);
  assert.equal(new Set(results.map((r) => r.order.id)).size, 1);
  assert.equal((await s.catalog(store, env)).find((p) => p.sku === 'couple').available, 3);
  assert.equal((await s.rows('SELECT * FROM orders')).length, 1);
  assert.equal(results[0].order.snapshot.wholesale.paymentTerms, 'prepaid');
  const re = await w.reorder(store, env, { quoteId: input.id, id: 'quote_2' }, actor);
  assert.equal(re.quote.snapshot.amount, 4000);
  await assert.rejects(w.accept('store_b', env, input.id, actor), /quote_not_found/);
  db.close();
});

test('wholesale expiry, approval and stock failures never orphan an order or reserve partial lines', async () => {
  const { db, s, whole: w } = await setup();
  await partner(w);
  const input = {
    id: 'quote_large',
    partnerId: 'partner',
    lines: [{ sku: 'couple', quantity: 6 }],
    deliveryId: 'test_delivery',
  };
  await w.quote(store, env, input, actor);
  await assert.rejects(w.accept(store, env, input.id, actor), /stock_unavailable/);
  assert.equal((await s.rows('SELECT * FROM orders')).length, 0);
  const expired = new Wholesale(new CommerceService(db, { now: () => Date.now() + 8 * 86400000 }));
  await assert.rejects(expired.accept(store, env, input.id, actor), /quote_expired/);
  await w.partner(
    store,
    env,
    {
      id: 'unapproved',
      name: 'Nepatvirtintas partneris',
      priceListId: 'test_prices',
      country: 'LT',
      currency: 'EUR',
      customer,
      approved: false,
    },
    actor,
  );
  await assert.rejects(
    w.quote(store, env, { ...input, id: 'other_quote', partnerId: 'unapproved' }, actor),
    /partner_not_approved/,
  );
  db.close();
});

test('partner approval is versioned, replay-safe and revocation rolls back an acceptance racing its read', async () => {
  const { db, s, whole: w } = await setup();
  await partner(w);
  const pause = { id: 'pause', partnerId: 'partner', expectedVersion: 0, approved: false };
  const race = await Promise.allSettled([
    w.approval(store, env, pause, actor),
    w.approval(store, env, { ...pause, id: 'other_pause' }, actor),
  ]);
  assert.equal(race.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(race.find((r) => r.status === 'rejected').reason.code, 'partner_state_conflict');
  const winner = race.find((r) => r.status === 'fulfilled').value.record.id;
  assert.equal((await w.approval(store, env, { ...pause, id: winner }, actor)).replayed, true);
  await partner(w); // Replaying the original definition must not reapprove a paused partner.
  assert.equal((await w.overview(store, env)).partners[0].approved, 0);
  await assert.rejects(
    w.approval('store_b', env, { ...pause, id: 'foreign' }, actor),
    /partner_state_conflict/,
  );
  await assert.rejects(
    s.stmt('DELETE FROM wholesale_partner_changes').run(),
    /partner_change_immutable/,
  );
  await w.approval(
    store,
    env,
    { id: 'resume', partnerId: 'partner', expectedVersion: 1, approved: true },
    actor,
  );
  await w.quote(
    store,
    env,
    {
      id: 'approval_quote',
      partnerId: 'partner',
      lines: [{ sku: 'couple', quantity: 2 }],
      deliveryId: 'test_delivery',
    },
    actor,
  );
  const before = (await s.catalog(store, env)).find((p) => p.sku === 'couple').available;
  const batch = db.batch.bind(db);
  let intercepted = false;
  db.batch = async (statements) => {
    if (!intercepted) {
      intercepted = true;
      db.batch = batch;
      await w.approval(
        store,
        env,
        { id: 'pause_during_accept', partnerId: 'partner', expectedVersion: 2, approved: false },
        actor,
      );
    }
    return batch(statements);
  };
  await assert.rejects(w.accept(store, env, 'approval_quote', actor), /partner_not_approved/);
  assert.equal((await s.rows('SELECT * FROM orders')).length, 0);
  assert.equal((await s.catalog(store, env)).find((p) => p.sku === 'couple').available, before);
  assert.equal((await s.rows("SELECT * FROM audit WHERE kind='OrderPlaced'")).length, 0);
  db.close();
});

test('private finance/wholesale actions require independent server grants and never expose price lists publicly', async () => {
  const { db, s, whole: w } = await setup();
  await partner(w);
  const handler = createHandler({
    service: s,
    environment: env,
    operatorAuthorize: async () => ({ id: actor, storeId: store, permissions: ['read'] }),
  });
  const call = (path, body) =>
    handler(
      new Request('https://store-a.example' + path, {
        method: body ? 'POST' : 'GET',
        body: body ? JSON.stringify(body) : undefined,
      }),
    );
  assert.equal((await call('/api/operator/financial-imports', {})).status, 403);
  assert.equal((await call('/api/operator/wholesale-quotes', {})).status, 403);
  assert.equal((await call('/api/operator/wholesale-approvals', {})).status, 403);
  const publicCatalog = await (await call('/api/catalog')).text();
  assert.equal(publicCatalog.includes('test_prices'), false);
  assert.equal((await call('/api/operator/wholesale')).status, 200);
  db.close();
});
