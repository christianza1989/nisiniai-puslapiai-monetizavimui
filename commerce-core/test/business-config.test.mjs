import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareBusiness } from '../src/business-config.mjs';
test('owner business template keeps prices in cents, inactive unknown add-ons, real contacts and zero invented stock with all live gates closed', () => {
  const business = JSON.parse(
      readFileSync(new URL('../config/memocasting-business.json', import.meta.url), 'utf8'),
    ),
    prepared = prepareBusiness(business);
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
