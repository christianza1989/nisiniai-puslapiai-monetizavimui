import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import {
  ProductReviews,
  REVIEW_CONSENT,
  reviewPhotoDimensions,
  stripReviewColourProfile,
} from '../src/reviews.mjs';
import { importReviews, prepareReviewImport } from '../src/review-import.mjs';
import { notificationMessage, CustomerNotifications } from '../src/notifications.mjs';
import { createHandler } from '../src/http.mjs';
import { NodePrivateStorage } from '../src/node-private-storage.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const image = new Uint8Array(
  Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64'),
);
test('Chrome canvas ICC profile is removed while pixel bytes remain and private metadata still fails', () => {
  const extended = Buffer.alloc(18);
  extended.write('VP8X');
  extended.writeUInt32LE(10, 4);
  extended[8] = 0x20;
  const icc = Buffer.alloc(12);
  icc.write('ICCP');
  icc.writeUInt32LE(4, 4);
  icc.write('sRGB', 8);
  const source = Buffer.concat([
    Buffer.from(image.slice(0, 12)),
    extended,
    icc,
    Buffer.from(image.slice(12)),
  ]);
  source.writeUInt32LE(source.length - 8, 4);
  assert.throws(() => reviewPhotoDimensions(source), /invalid_review_photo/);
  const normal = stripReviewColourProfile(source);
  assert.deepEqual(reviewPhotoDimensions(normal), { width: 1, height: 1 });
  assert.equal(Buffer.from(normal).includes(Buffer.from('ICCP')), false);
  assert.deepEqual(normal.slice(30), image.slice(12));
  const privateBytes = Buffer.from(source);
  privateBytes.write('EXIF', 30);
  assert.throws(
    () => reviewPhotoDimensions(stripReviewColourProfile(privateBytes)),
    /invalid_review_photo/,
  );
});
test('real Node private storage accepts only the scoped review namespace and retrieves the integrity-checked photo', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'reviews-node-'));
  assert.ok(
    path.resolve(directory).startsWith(path.resolve(tmpdir()) + path.sep + 'reviews-node-'),
  );
  t.after(() => rm(directory, { recursive: true, force: true }));
  const { s } = await setup(t),
    r = new ProductReviews(s, new NodePrivateStorage(directory)),
    o = await paid(s, 98),
    g = await r.grant('store_a', 'sandbox', o.id);
  const photo = await r.upload('store_a', 'sandbox', g.token, image),
    review = await r.submit('store_a', 'sandbox', {
      token: g.token,
      sku: 'couple',
      rating: 4,
      authorName: 'Fixture buyer',
      body: 'Isolated real storage fixture.',
      publicationConsent: true,
      photoIds: [photo.id],
    });
  await r.moderate(
    'store_a',
    'sandbox',
    review.id,
    { version: 1, state: 'published', reason: 'Fixture publication' },
    'owner',
  );
  assert.deepEqual(await r.photo('store_a', 'sandbox', photo.id), image);
  const storage = new NodePrivateStorage(directory);
  await assert.rejects(storage.target('../reviews/' + photo.id + '.webp'), /private_key_invalid/);
  await assert.rejects(storage.target('store_a/reviews/../../file.webp'), /private_key_invalid/);
});
import { fixtureStore, fixtureProducts, cart, key } from './fixtures.mjs';
async function setup(t) {
  const db = new NodeDatabase();
  db.migrate();
  t.after(() => db.close());
  let now = Date.parse('2026-10-26T08:00:00Z');
  const s = new CommerceService(db, { now: () => now });
  for (const id of ['store_a', 'store_b'])
    await s.provisionStore(fixtureStore(id), fixtureProducts(100));
  const blobs = new Map(),
    storage = { put: async (k, b) => blobs.set(k, b), get: async (k) => blobs.get(k) };
  const r = new ProductReviews(s, storage);
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
  return { s, r, clock: (v) => (now = v), now: () => now, blobs };
}
async function paid(s, n, consent = true) {
  const result = await s.createOrder(
    'store_a',
    'sandbox',
    { ...cart(), ...(consent ? { reviewRequestConsent: REVIEW_CONSENT } : {}) },
    key(n),
  );
  // Isolated SQLite acceptance fixture only; production never fabricates payments.
  const snap = {
    ...result.order.snapshot,
    customer: { name: 'Fixture Buyer', email: 'buyer@example.test' },
  };
  await s
    .stmt(
      "UPDATE orders SET payment_state='paid',payment_id=?,fulfillment_state='labelled',snapshot_json=? WHERE store_id=? AND id=?",
      'pi_fixture_' + n,
      JSON.stringify(snap),
      'store_a',
      result.order.id,
    )
    .run();
  return s.getOrder('store_a', 'sandbox', result.order.id);
}
test('photos remain private until publication; photo and whole-review removals disappear immediately and are restorable', async (t) => {
  const { s, r } = await setup(t),
    o = await paid(s, 99),
    g = await r.grant('store_a', 'sandbox', o.id);
  assert.deepEqual(reviewPhotoDimensions(image), { width: 1, height: 1 });
  assert.throws(() =>
    reviewPhotoDimensions(new TextEncoder().encode('<svg onload="alert(1)"></svg>')),
  );
  const photo = await r.upload('store_a', 'sandbox', g.token, image);
  await assert.rejects(r.photo('store_a', 'sandbox', photo.id), /review_photo_missing/);
  const review = await r.submit('store_a', 'sandbox', {
    token: g.token,
    sku: 'couple',
    rating: 5,
    authorName: 'Fixture Buyer',
    body: 'Only isolated regression fixture.',
    publicationConsent: true,
    photoIds: [photo.id],
  });
  await assert.rejects(r.photo('store_a', 'sandbox', photo.id), /review_photo_missing/);
  await r.moderate(
    'store_a',
    'sandbox',
    review.id,
    { state: 'published', version: 1, reason: 'Reviewed fixture' },
    'owner',
  );
  assert.deepEqual(await r.photo('store_a', 'sandbox', photo.id), image);
  await r.moderatePhoto(
    'store_a',
    'sandbox',
    photo.id,
    { hidden: true, reason: 'Owner removes photo' },
    'owner',
  );
  await assert.rejects(r.photo('store_a', 'sandbox', photo.id), /review_photo_missing/);
  assert.equal((await r.list('store_a', 'sandbox')).items[0].photos.length, 0);
  assert.equal((await r.list('store_a', 'sandbox')).stats[0].count, 1);
  await r.moderate(
    'store_a',
    'sandbox',
    review.id,
    { state: 'deleted', version: 2, reason: 'Owner removes review' },
    'owner',
  );
  assert.equal((await r.list('store_a', 'sandbox')).total, 0);
  assert.equal((await r.list('store_a', 'sandbox', { operator: true, deleted: true })).total, 1);
  await r.moderate(
    'store_a',
    'sandbox',
    review.id,
    { state: 'published', version: 3, reason: 'Owner restores review' },
    'owner',
  );
  await assert.rejects(r.photo('store_a', 'sandbox', photo.id), /review_photo_missing/);
  await r.moderatePhoto(
    'store_a',
    'sandbox',
    photo.id,
    { hidden: false, reason: 'Owner restores photo' },
    'owner',
  );
  assert.deepEqual(await r.photo('store_a', 'sandbox', photo.id), image);
});
test('HTTP keeps verification generic, operator routes private, media unpublished, and all review writes rate guarded', async (t) => {
  const { s, r } = await setup(t);
  let checks = 0;
  const handler = createHandler({
    service: s,
    environment: 'sandbox',
    publicAbuseGuard: async () => {
      checks++;
    },
  });
  let response = await handler(
    new Request('https://store-a.example/api/reviews/request', {
      method: 'POST',
      body: JSON.stringify({ orderNumber: '9878', email: 'nobody@example.test' }),
      headers: { 'content-type': 'application/json' },
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(checks, 1);
  response = await handler(new Request('https://store-a.example/api/operator/reviews'));
  assert.equal(response.status, 403);
  response = await handler(
    new Request('https://store-a.example/api/reviews/access', {
      method: 'POST',
      body: '{"token":"9878"}',
      headers: { 'content-type': 'application/json' },
    }),
  );
  assert.equal(response.status, 403);
  response = await handler(new Request('https://store-a.example/api/reviews'));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).items, []);
});
test('numbering starts after9877, concurrent creates and replay preserve unique numbers without renumbering old stores', async (t) => {
  const { s, r } = await setup(t);
  const created = await Promise.all(
    [1, 2, 3].map((n) => s.createOrder('store_a', 'sandbox', cart(), key(n))),
  );
  assert.deepEqual(created.map((x) => x.order.public_number).sort(), [9878, 9879, 9880]);
  assert.equal(
    (await s.createOrder('store_a', 'sandbox', cart(), key(1))).order.orderNumber,
    created[0].order.orderNumber,
  );
  const other = await s.createOrder('store_b', 'sandbox', cart(), key(4));
  assert.equal(other.order.public_number, null);
  assert.match(other.order.orderNumber, /^[A-F0-9]{8}$/);
  assert.equal((await r.settings('store_a', 'sandbox')).nextOrderNumber, 9881);
  await assert.rejects(
    r.saveSettings(
      'store_a',
      'sandbox',
      {
        version: 1,
        enabled: true,
        delayDays: 30,
        origin: 'https://store-a.example',
        lastOrderNumber: 1,
      },
      'owner',
    ),
    /order_number_already_configured/,
  );
});
test('number alone cannot authenticate; email link is scoped, expiring and its raw secret is not stored in grants', async (t) => {
  const { s, r, clock, now } = await setup(t),
    o = await paid(s, 1);
  assert.deepEqual(
    await r.requestLink('store_a', 'sandbox', {
      orderNumber: o.orderNumber,
      email: 'wrong@example.test',
    }),
    { accepted: true },
  );
  assert.equal((await s.rows('SELECT * FROM review_grants')).length, 0);
  await r.requestLink('store_a', 'sandbox', {
    orderNumber: o.orderNumber,
    email: 'buyer@example.test',
  });
  const mail = JSON.parse(
    (await s.one('SELECT payload_json FROM customer_notifications')).payload_json,
  );
  const token = mail.reviewUrl.split('#token=')[1];
  const g = await s.one('SELECT * FROM review_grants');
  assert.equal(JSON.stringify(g).includes(token), false);
  assert.equal((await r.access('store_a', 'sandbox', token)).orderNumber, '9878');
  await assert.rejects(r.access('store_b', 'sandbox', token), /review_link_invalid/);
  await assert.rejects(r.access('store_a', 'sandbox', o.orderNumber), /review_link_invalid/);
  clock(now() + 91 * 86400000);
  await assert.rejects(r.access('store_a', 'sandbox', token), /review_link_invalid/);
});
test('only paid purchased items, one review per product/order, moderation and public statistics share the same pool', async (t) => {
  const { s, r } = await setup(t),
    o = await paid(s, 1),
    g = await r.grant('store_a', 'sandbox', o.id);
  const input = {
    token: g.token,
    sku: 'couple',
    rating: 2,
    authorName: 'Test Buyer',
    title: 'Patirtis',
    body: 'Tikra izoliuoto bandymo patirtis.',
    publicationConsent: true,
  };
  await assert.rejects(
    r.submit('store_a', 'sandbox', { ...input, sku: 'family' }),
    /review_product_not_purchased/,
  );
  await assert.rejects(
    r.submit('store_a', 'sandbox', { ...input, publicationConsent: false }),
    /invalid_review/,
  );
  const saved = await r.submit('store_a', 'sandbox', input);
  assert.equal((await r.list('store_a', 'sandbox')).items.length, 0);
  await r.moderate(
    'store_a',
    'sandbox',
    saved.id,
    { state: 'published', version: 1, reason: 'Originalus tinkamas tekstas' },
    'owner',
  );
  const pub = await r.list('store_a', 'sandbox');
  assert.equal(pub.stats[0].average, 2);
  assert.equal(pub.items[0].verifiedPurchase, true);
  assert.equal(pub.items[0].order_id, undefined);
  assert.equal(pub.items[0].store_id, undefined);
  assert.equal((await r.submit('store_a', 'sandbox', input)).id, saved.id);
  assert.equal((await r.list('store_b', 'sandbox')).total, 0);
  await assert.rejects(
    r.moderate(
      'store_a',
      'sandbox',
      saved.id,
      { state: 'hidden', version: 1, reason: 'Sena versija' },
      'owner',
    ),
    /review_version_conflict/,
  );
  await r.moderate(
    'store_a',
    'sandbox',
    saved.id,
    { state: 'hidden', version: 2, reason: 'Asmeninė informacija' },
    'owner',
  );
  assert.equal((await r.list('store_a', 'sandbox')).stats.length, 0);
});
test('invitations wait30days after actual dispatch, require separate consent, are one-per-order and stop before send', async (t) => {
  const { s, r, clock, now } = await setup(t),
    o = await paid(s, 1),
    no = await paid(s, 2, false),
    start = now();
  await r.markShipped('store_a', 'sandbox', o.id, 'owner');
  await r.markShipped('store_a', 'sandbox', no.id, 'owner');
  await r.schedule('store_a', 'sandbox');
  assert.equal((await s.rows('SELECT * FROM customer_notifications')).length, 0);
  clock(start + 30 * 86400000);
  await Promise.all([r.schedule('store_a', 'sandbox'), r.schedule('store_a', 'sandbox')]);
  const mails = await s.rows("SELECT * FROM customer_notifications WHERE kind='ReviewInvitation'");
  assert.equal(mails.length, 1);
  const p = JSON.parse(mails[0].payload_json);
  const message = notificationMessage(p, { from: 'info@example.test' });
  assert.match(message.text, /9878/);
  assert.match(message.html, /Palikti atsiliepimą/);
  await r.stop('store_a', 'sandbox', p.reviewUrl.split('#token=')[1]);
  assert.equal(await r.canInvite('store_a', 'sandbox', o.id), false);
});
test('historical CSV preserves dates and all rating levels, never trusts a CSV verified flag, and deduplicates', async (t) => {
  const { s, r } = await setup(t);
  const csv =
    'product_sku,rating,author_name,review_date,review_text,verified_purchase\ncouple,1,Test Buyer,2024-01-01,"Originalus tekstas, su kableliu.",true';
  const input = { csv, ownStoreConfirmed: true };
  const p = await prepareReviewImport(s, 'store_a', 'sandbox', input);
  assert.equal(p.ready, 1);
  assert.equal(
    (await importReviews(s, 'store_a', 'sandbox', { ...input, hash: p.hash }, 'owner')).imported,
    1,
  );
  const second = await prepareReviewImport(s, 'store_a', 'sandbox', input);
  assert.equal(second.ready, 0);
  const list = await r.list('store_a', 'sandbox', { operator: true });
  assert.equal(list.items[0].review_date, '2024-01-01');
  assert.equal(list.items[0].verified, 0);
  assert.equal((await r.list('store_a', 'sandbox')).total, 0);
});

test('historic rating-only reviews import private WebP without inventing orders or grants, retain moderation and replay safely', async (t) => {
  const { s, r } = await setup(t),
    csv =
      'product_sku,rating,author_name,review_date,review_text,review_title,review_id,image_urls\ncouple,4,Historical Buyer,2024-01-01,,Original title,historic001,original.jpg';
  const input = { csv, ownStoreConfirmed: true },
    p = await prepareReviewImport(s, 'store_a', 'sandbox', input);
  assert.equal(p.ready, 1);
  assert.ok(p.items[0].warning);
  await importReviews(s, 'store_a', 'sandbox', { ...input, hash: p.hash }, 'owner');
  const review = (await r.list('store_a', 'sandbox', { operator: true })).items[0];
  assert.equal(review.body, '');
  assert.equal(review.verified, 0);
  assert.equal(review.order_id, null);
  assert.equal((await s.one('SELECT COUNT(*) n FROM orders')).n, 0);
  assert.equal((await s.one('SELECT COUNT(*) n FROM review_grants')).n, 0);
  const photo = await r.importPhoto(
    'store_a',
    'sandbox',
    review.id,
    image,
    'original.webp',
    'owner',
  );
  assert.equal(
    (await r.importPhoto('store_a', 'sandbox', review.id, image, 'original.webp', 'owner'))
      .replayed,
    true,
  );
  await assert.rejects(r.photo('store_a', 'sandbox', photo.id), /review_photo_missing/);
  await assert.rejects(
    r.importPhoto('store_b', 'sandbox', review.id, image, 'foreign.webp', 'owner'),
    /review_not_found/,
  );
  await r.moderate(
    'store_a',
    'sandbox',
    review.id,
    { version: 1, state: 'published', reason: 'Historical owner data reviewed' },
    'owner',
  );
  assert.equal((await r.list('store_a', 'sandbox')).items[0].photos.length, 1);
  assert.deepEqual(await r.photo('store_a', 'sandbox', photo.id), image);
  await r.moderatePhoto(
    'store_a',
    'sandbox',
    photo.id,
    { hidden: true, reason: 'Operator photo removal' },
    'owner',
  );
  await assert.rejects(r.photo('store_a', 'sandbox', photo.id), /review_photo_missing/);
  await r.moderatePhoto(
    'store_a',
    'sandbox',
    photo.id,
    { hidden: false, reason: 'Operator photo restore' },
    'owner',
  );
  assert.deepEqual(await r.photo('store_a', 'sandbox', photo.id), image);
});
