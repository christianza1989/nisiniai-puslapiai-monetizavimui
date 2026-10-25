import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { CatalogOperations } from '../src/catalog.mjs';
import { fixtureStore, fixtureProducts, cart, key } from './fixtures.mjs';
import { planParcels } from '../src/parcels.mjs';
const setup = async () => {
  const db = new NodeDatabase();
  db.migrate();
  const s = new CommerceService(db);
  await s.provisionStore(fixtureStore(), fixtureProducts());
  const editor = new CatalogOperations(s);
  const product = (await editor.list('store_a', 'sandbox')).find((p) => p.sku === 'couple');
  const definition = {
    ...product,
    enabled: true,
    content: { summary: 'Pasirinkite spalvą.', description: 'Redaguojamas aprašymas.', images: [] },
    optionGroups: [
      {
        id: 'finish',
        label: 'Spalva',
        defaultValue: 'white',
        values: [
          { id: 'white', label: 'Balta', enabled: true, prices: { LT: 0 } },
          { id: 'gold', label: 'Auksinė', enabled: true, prices: { LT: 300 } },
        ],
      },
    ],
  };
  return { db, s, editor, product, definition };
};
test('multi-option order titles retain readable separators and the immutable first snapshot', async () => {
  const x = await setup();
  x.definition.optionGroups.push({
    id: 'presentation',
    label: 'Pateikimas',
    defaultValue: 'standard',
    values: [{ id: 'standard', label: 'Įprastas', enabled: true, prices: { LT: 0 } }],
  });
  const draft = await x.editor.saveDraft(
    'store_a',
    'sandbox',
    { definition: x.definition, basisHash: x.product.basisHash },
    'owner',
  );
  await x.editor.revise(
    'store_a',
    'sandbox',
    {
      id: 'publish_readable_title',
      basisHash: x.product.basisHash,
      draftHash: draft.draftHash,
      definition: x.definition,
    },
    'owner',
  );
  const input = {
    ...cart(),
    lines: [{ sku: 'couple', quantity: 1, choices: { finish: 'gold', presentation: 'standard' } }],
  };
  const order = (await x.s.createOrder('store_a', 'sandbox', input, key(992))).order;
  assert.equal(
    order.snapshot.lines[0].title,
    'Test couple kit — Spalva: Auksinė · Pateikimas: Įprastas',
  );
  assert.equal(
    (await x.s.getOrder('store_a', 'sandbox', order.id)).snapshot.lines[0].title,
    order.snapshot.lines[0].title,
  );
  x.db.close();
});
test('draft is private, revisioned and survives a new editor; mixed finishes reserve shared kit stock once', async () => {
  const x = await setup();
  const saved = await x.editor.saveDraft(
    'store_a',
    'sandbox',
    { definition: x.definition, basisHash: x.product.basisHash },
    'owner',
  );
  assert.equal((await x.s.catalog('store_a', 'sandbox'))[0].content, undefined);
  assert.equal(
    (await new CatalogOperations(x.s).draft('store_a', 'sandbox', 'couple')).draftHash,
    saved.draftHash,
  );
  await assert.rejects(
    x.editor.saveDraft(
      'store_a',
      'sandbox',
      { definition: { ...x.definition, title: 'Changed title' }, basisHash: x.product.basisHash },
      'owner',
    ),
    /catalog_draft_conflict/,
  );
  await x.editor.revise(
    'store_a',
    'sandbox',
    {
      id: 'publish_options',
      basisHash: x.product.basisHash,
      draftHash: saved.draftHash,
      definition: x.definition,
    },
    'owner',
  );
  const input = {
    ...cart(),
    lines: [
      { sku: 'couple', quantity: 1, choices: { finish: 'white' } },
      { sku: 'couple', quantity: 2, choices: { finish: 'gold' } },
    ],
  };
  const quote = await x.s.quote('store_a', 'sandbox', input);
  assert.equal(quote.amount, 10200);
  assert.equal(quote.lines.length, 2);
  assert.match(quote.lines.find((l) => l.choices.finish === 'gold').title, /Auksinė/);
  const order = (await x.s.createOrder('store_a', 'sandbox', input, key(9))).order;
  assert.equal(order.snapshot.lines.length, 2);
  assert.equal(
    (await x.s.catalog('store_a', 'sandbox')).find((p) => p.sku === 'couple').available,
    2,
  );
  assert.equal(planParcels(order, { mode: 'individual' }).parcels.length, 3);
  await assert.rejects(
    x.s.quote('store_a', 'sandbox', {
      ...input,
      lines: [{ sku: 'couple', quantity: 1, choices: { finish: 'fake' } }],
    }),
    /product_option_unavailable/,
  );
  await assert.rejects(
    x.s.quote('store_a', 'sandbox', {
      ...input,
      lines: [{ sku: 'couple', quantity: 1, choices: { unknown: 'gold' } }],
    }),
    /product_option_unavailable/,
  );
  x.db.close();
});
test('unmeasured physical option remains a draft-only disabled choice; buyer cannot set the price', async () => {
  const x = await setup();
  x.definition.optionGroups.push({
    id: 'base',
    label: 'Padėklas',
    defaultValue: 'none',
    values: [
      { id: 'none', label: 'Be padėklo', enabled: true, prices: { LT: 0 } },
      { id: 'wood', label: 'Medinis', enabled: true, prices: { LT: 1200 }, extraWeightGrams: 300 },
    ],
  });
  await assert.rejects(
    x.editor.saveDraft(
      'store_a',
      'sandbox',
      { definition: x.definition, basisHash: x.product.basisHash },
      'owner',
    ),
    /option_package_required/,
  );
  x.definition.optionGroups[1].values[1].enabled = false;
  await x.editor.revise(
    'store_a',
    'sandbox',
    { id: 'publish_disabled_base', definition: x.definition, basisHash: x.product.basisHash },
    'owner',
  );
  assert.equal(
    (
      await x.s.quote('store_a', 'sandbox', {
        ...cart(),
        lines: [{ sku: 'couple', quantity: 1, choices: { finish: 'gold' }, unitAmount: 1 }],
      })
    ).amount,
    3500,
  );
  await assert.rejects(
    x.s.quote('store_a', 'sandbox', {
      ...cart(),
      lines: [{ sku: 'couple', quantity: 1, choices: { base: 'wood' } }],
    }),
    /product_option_unavailable/,
  );
  x.db.close();
});
