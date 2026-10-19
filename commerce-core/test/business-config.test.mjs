import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareBusiness } from '../src/business-config.mjs';
test('business preparation keeps unconfirmed packages and address explicit, prices in cents and all live gates closed', () => {
  const business = JSON.parse(
    readFileSync(new URL('../config/memocasting-business.json', import.meta.url), 'utf8'),
  );
  // This is the unconfirmed-business fixture, not a claim that today's owner
  // facts are still unknown. Confirmed facts must not invalidate this regression.
  business.legal.address = null;
  business.products.forEach((p) => {
    p.package = null;
    delete p.lotTrackingRequired;
  });
  const prepared = prepareBusiness(business);
  assert.equal(prepared.products[0].prices.LT, 3200);
  assert.equal(prepared.products[1].prices.LT, 4800);
  assert.ok(
    prepared.products
      .slice(0, 2)
      .every((p) => p.package === null && p.included.includes('Balti dažai')),
  );
  assert.ok(
    prepared.missing.includes('couple_packed_measurements') &&
      prepared.missing.includes('family_packed_measurements'),
  );
  assert.equal(business.products[1].previousPackage.weightGrams, 4000);
  assert.equal(prepared.products.find((p) => p.sku === 'wooden_base').prices.LT, 1000);
  assert.equal(
    prepared.products.find((p) => p.sku === 'white_paint'),
    undefined,
  );
  assert.equal(prepared.store.checkout.successUrl, 'https://memocasting.lt/cart');
  assert.ok(prepared.products.every((p) => p.stock === 0));
  assert.ok(prepared.products.slice(0, 2).every((p) => p.lotTrackingRequired === true));
  assert.equal(prepared.store.dispatch.postalCode, '02211');
  assert.equal(prepared.store.legalSnapshot.address, null);
  assert.equal(prepared.store.enabled, false);
  assert.ok(prepared.store.markets.every((m) => m.currency === 'EUR' && !m.checkoutEnabled));
  assert.deepEqual(prepared.connections, {});
});

test('owner-confirmed document series survive preparation while all operation gates stay closed', () => {
  const business = JSON.parse(
    readFileSync(new URL('../config/memocasting-business.json', import.meta.url), 'utf8'),
  );
  business.documentSeries = { sale: 'WEB26', credit: 'WEB26K', packing: 'WEB26P' };
  const prepared = prepareBusiness(business);
  assert.deepEqual(prepared.store.documentPolicy.series, business.documentSeries);
  assert.notEqual(prepared.store.documentPolicy.series, business.documentSeries);
  assert.equal(prepared.store.documentPolicy.approved, false);
  assert.equal(prepared.store.operationalAdmission.approved, false);
  assert.equal(prepared.store.productionAdmission.approved, false);
});

test('malformed, colliding or incomplete explicit document series fail instead of silently falling back', () => {
  const business = JSON.parse(
    readFileSync(new URL('../config/memocasting-business.json', import.meta.url), 'utf8'),
  );
  for (const documentSeries of [
    null,
    [],
    { sale: 'A', credit: 'A', packing: 'B' },
    { sale: 'A', credit: 'B' },
    { sale: 'A', credit: 'B', packing: 'C', other: 'D' },
    { sale: 'A', credit: 'B', packing: 'bad/name' },
    { sale: 'A'.repeat(17), credit: 'B', packing: 'C' },
  ]) {
    assert.throws(
      () => prepareBusiness({ ...business, documentSeries }),
      /business_document_series_invalid/,
    );
  }
  const legacy = { ...business };
  delete legacy.documentSeries;
  assert.deepEqual(prepareBusiness(legacy).store.documentPolicy.series, {
    sale: 'MC',
    credit: 'MCK',
    packing: 'MCP',
  });
});
