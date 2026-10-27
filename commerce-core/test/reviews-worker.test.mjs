import {
  prepareReviewImport,
  importReviews,
  attestReviewImportOrigin,
  attestReviewImportPurchase,
} from '../src/review-import.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { CommerceService } from '../src/service.mjs';
import { ProductReviews, REVIEW_CONSENT } from '../src/reviews.mjs';
import { CustomerNotifications } from '../src/notifications.mjs';
import { R2PrivateStorage } from '../src/private-storage.mjs';
import { applyMigrations } from '../src/migrations.mjs';
import { productionMigrationSources } from '../src/node-production-d1.mjs';
import { fixtureStore, fixtureProducts, cart, key } from './fixtures.mjs';
test('native D1/R2 additive reviews preserve historical orders and atomically number, moderate photos and deliver one invitation', async () => {
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          name: 'isolated-reviews',
          modules: true,
          compatibilityDate: '2026-10-11',
          script: 'export default {fetch(){return new Response("isolated review fixture")}}',
          d1Databases: { COMMERCE_DB: '00000000-0000-0000-0000-000000000030' },
          r2Buckets: { FILES: 'isolated-review-files' },
          outboundService: () => {
            throw Error('No external providers in review fixture');
          },
        },
      ],
    }),
  );
  try {
    const db = await mf.getD1Database('COMMERCE_DB'),
      sources = await productionMigrationSources();
    await applyMigrations(db, sources.slice(0, 29));
    let now = Date.parse('2026-10-26T00:00:00Z');
    const s = new CommerceService(db, { now: () => now });
    const config = fixtureStore();
    config.notificationPolicy = {
      approved: true,
      from: 'owner@example.test',
      transportRef: 'fixture_mail',
    };
    await s.provisionStore(config, fixtureProducts(100));
    const old = (await s.createOrder('store_a', 'sandbox', cart(), key(1))).order;
    const before = await s.one('SELECT * FROM orders WHERE id=?', old.id);
    await applyMigrations(db, sources);
    const after = await s.one('SELECT * FROM orders WHERE id=?', old.id),
      { public_number, ...retained } = after;
    assert.equal(public_number, null);
    assert.deepEqual(retained, before);
    const r = new ProductReviews(s, new R2PrivateStorage(await mf.getR2Bucket('FILES')));
    await r.saveSettings(
      'store_a',
      'sandbox',
      {
        version: 0,
        enabled: true,
        delayDays: 30,
        origin: 'https://store-a.example',
        lastOrderNumber: 9877,
      },
      'owner',
    );
    const created = await Promise.all(
      [2, 3, 4].map((n) =>
        s.createOrder(
          'store_a',
          'sandbox',
          { ...cart(), reviewRequestConsent: REVIEW_CONSENT },
          key(n),
        ),
      ),
    );
    assert.deepEqual(created.map((x) => x.order.public_number).sort(), [9878, 9879, 9880]);
    const o = created[0].order,
      snapshot = {
        ...o.snapshot,
        customer: { email: 'buyer@example.test', name: 'Fixture buyer' },
      };
    await s
      .stmt(
        "UPDATE orders SET payment_state='paid',payment_id='pi_fixture',fulfillment_state='labelled',snapshot_json=? WHERE id=?",
        JSON.stringify(snapshot),
        o.id,
      )
      .run();
    await r.markShipped('store_a', 'sandbox', o.id, 'owner');
    now += 30 * 86400000;
    await r.schedule('store_a', 'sandbox');
    const mail = await s.one("SELECT * FROM customer_notifications WHERE kind='ReviewInvitation'");
    assert.ok(mail);
    let sent = 0;
    const adapter = {
      accountRef: 'fixture_mail',
      sender: 'owner@example.test',
      environment: 'sandbox',
      send: async (m) => {
        sent++;
        assert.equal(m.to, 'buyer@example.test');
        assert.match(m.html, /Palikti atsiliepimą/);
        return { status: 'accepted', reference: 'fixture_receipt' };
      },
    };
    const notifications = new CustomerNotifications(
      s,
      { store_a: adapter },
      { reviewCheck: (...args) => r.canInvite(...args) },
    );
    await Promise.all([
      notifications.execute('store_a', 'sandbox', mail.event_id, 'owner'),
      notifications.execute('store_a', 'sandbox', mail.event_id, 'owner'),
    ]);
    assert.equal(sent, 1);
    await notifications.execute('store_a', 'sandbox', mail.event_id, 'owner');
    assert.equal(sent, 1);
    const g = await r.grant('store_a', 'sandbox', o.id),
      bytes = new Uint8Array(
        Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64'),
      );
    const photo = await r.upload('store_a', 'sandbox', g.token, bytes);
    const review = await r.submit('store_a', 'sandbox', {
      token: g.token,
      sku: 'couple',
      rating: 3,
      authorName: 'Fixture Buyer',
      body: 'Native R2 review regression only.',
      publicationConsent: true,
      photoIds: [photo.id],
    });
    await r.moderate(
      'store_a',
      'sandbox',
      review.id,
      { version: 1, state: 'published', reason: 'Reviewed isolated fixture' },
      'owner',
    );
    assert.deepEqual(await r.photo('store_a', 'sandbox', photo.id), bytes);
    await r.moderatePhoto(
      'store_a',
      'sandbox',
      photo.id,
      { hidden: true, reason: 'Remove isolated photo' },
      'owner',
    );
    await assert.rejects(r.photo('store_a', 'sandbox', photo.id), /review_photo_missing/);
    const csv =
      'product_sku,rating,author_name,review_date,review_text,review_id\nfamily,4,Historic Native Buyer,2024-01-01,Puiku,old-native-review';
    const initialOrders = (await s.one('SELECT COUNT(*) n FROM orders')).n,
      initialGrants = (await s.one('SELECT COUNT(*) n FROM review_grants')).n;
    const preview = await prepareReviewImport(s, 'store_a', 'sandbox', { csv });
    await importReviews(
      s,
      'store_a',
      'sandbox',
      { csv, hash: preview.hash, ownStoreConfirmed: true },
      'owner',
    );
    const legacy = await s.one(
      "SELECT id FROM product_reviews WHERE source_id='old-native-review'",
    );
    const importedPhoto = await r.importPhoto(
      'store_a',
      'sandbox',
      legacy.id,
      bytes,
      'native-old.webp',
      'owner',
    );
    assert.equal(
      (
        await attestReviewImportOrigin(
          s,
          'store_a',
          'sandbox',
          {
            reviewIds: [legacy.id],
            collectionOrigin: 'https://store-a.example',
            sameStoreCollectionConfirmed: true,
          },
          'owner',
        )
      ).attested,
      1,
    );
    await r.moderate(
      'store_a',
      'sandbox',
      legacy.id,
      { state: 'published', version: 2, reason: 'Native historic media reviewed' },
      'owner',
    );
    assert.deepEqual(await r.photo('store_a', 'sandbox', importedPhoto.id), bytes);
    assert.equal((await s.one('SELECT COUNT(*) n FROM orders')).n, initialOrders);
    assert.equal((await s.one('SELECT COUNT(*) n FROM review_grants')).n, initialGrants);
    const restart = new ProductReviews(new CommerceService(await mf.getD1Database('COMMERCE_DB')));
    assert.equal((await restart.list('store_a', 'sandbox')).stats[0].average, 3);
    const migratedStats = (await restart.list('store_a', 'sandbox')).stats.find(
      (x) => x.sku === 'family',
    );
    assert.equal(migratedStats.directCount, 1);
    assert.equal(migratedStats.directAverage, 4);
    const importedBefore = await s.one('SELECT * FROM product_reviews WHERE id=?', legacy.id);
    const proof = {
      reviews: [{ id: legacy.id, version: importedBefore.version }],
      collectionOrigin: 'https://store-a.example',
      sameStoreCollectionConfirmed: true,
      paidPurchasesConfirmed: true,
      priorStoreVerificationConfirmed: true,
      evidence: 'Human owner confirms prior store paid and verified purchases.',
    };
    await assert.rejects(
      attestReviewImportPurchase(
        s,
        'store_a',
        'sandbox',
        { ...proof, paidPurchasesConfirmed: false },
        'owner',
      ),
      /review_purchase_not_confirmed/,
    );
    await assert.rejects(
      attestReviewImportPurchase(
        s,
        'store_a',
        'sandbox',
        { ...proof, reviews: [{ id: legacy.id, version: 1 }] },
        'owner',
      ),
      /review_purchase_not_confirmed/,
    );
    await assert.rejects(
      attestReviewImportPurchase(
        s,
        'store_a',
        'sandbox',
        { ...proof, reviews: [{ id: review.id, version: 2 }] },
        'owner',
      ),
      /review_purchase_not_confirmed/,
    );
    assert.equal(
      (await attestReviewImportPurchase(s, 'store_a', 'sandbox', proof, 'owner')).attested,
      1,
    );
    assert.equal(
      (await attestReviewImportPurchase(s, 'store_a', 'sandbox', proof, 'owner')).attested,
      0,
    );
    const importedAfter = await s.one('SELECT * FROM product_reviews WHERE id=?', legacy.id);
    assert.deepEqual(
      { ...importedAfter, verified: importedBefore.verified, version: importedBefore.version },
      importedBefore,
    );
    assert.equal(importedAfter.verified, 1);
    assert.equal(importedAfter.order_id, null);
    assert.equal(
      (await restart.list('store_a', 'sandbox', { sku: 'family' })).items[0].verifiedPurchase,
      true,
    );
    assert.deepEqual(await r.photo('store_a', 'sandbox', importedPhoto.id), bytes);
    assert.equal((await s.one('SELECT COUNT(*) n FROM orders')).n, initialOrders);
    assert.equal((await s.one('SELECT COUNT(*) n FROM review_grants')).n, initialGrants);
    assert.equal(
      (
        await s.one(
          "SELECT COUNT(*) n FROM review_moderations WHERE review_id=? AND state='purchase_attested'",
          legacy.id,
        )
      ).n,
      1,
    );
    assert.equal((await s.one('SELECT count(*) n FROM commerce_migrations')).n, 31);
  } finally {
    await mf.dispose();
  }
});
