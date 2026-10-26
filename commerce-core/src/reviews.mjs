import { requireValue, identifier, digest, canonical } from './validation.mjs';
import { hashBytes } from './private-storage.mjs';
import { webpDimensions } from './catalog-media.mjs';

export const REVIEW_CONSENT = 'review-request-v1';
const email = (v) =>
  typeof v === 'string' &&
  /^[^\s<>@\r\n]+@[^\s<>@\r\n]+\.[^\s<>@\r\n]+$/.test(v) &&
  v.length <= 254;
const text = (v, min, max) =>
  typeof v === 'string' &&
  v.trim().length >= min &&
  v.length <= max &&
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
const reference = (o) => String(o.public_number || o.id.slice(0, 8).toUpperCase());
const purchased = (o) =>
  ['paid', 'partially_refunded', 'refunded'].includes(o.payment_state) && !!o.payment_id;
// Native selections keep their authoritative SKU and carry options separately.
const rootSku = (l) => l.sku;

// Browser re-encoding removes metadata. Enforce a bounded, static WebP container
// again at the trust boundary; never serve arbitrary uploaded MIME or SVG.
export function reviewPhotoDimensions(bytes) {
  const dimensions = webpDimensions(bytes);
  requireValue(
    bytes.length <= 1024 * 1024 && Math.max(dimensions.width, dimensions.height) <= 1600,
    'invalid_review_photo',
  );
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = 12,
    image = false;
  while (at < bytes.length) {
    requireValue(at + 8 <= bytes.length, 'invalid_review_photo');
    const kind = String.fromCharCode(...bytes.slice(at, at + 4));
    const len = dv.getUint32(at + 4, true);
    requireValue(
      ['VP8X', 'ALPH', 'VP8 ', 'VP8L'].includes(kind) && len > 0 && at + 8 + len <= bytes.length,
      'invalid_review_photo',
    );
    if (kind === 'VP8X')
      requireValue(len === 10 && !(bytes[at + 8] & 0x2e), 'invalid_review_photo');
    if (kind === 'VP8 ' || kind === 'VP8L') {
      requireValue(!image, 'invalid_review_photo');
      image = true;
    }
    at += 8 + len + (len % 2);
  }
  requireValue(image && at === bytes.length, 'invalid_review_photo');
  return dimensions;
}
// Chrome canvas can emit an sRGB ICCP chunk even after re-encoding. Strip that
// bounded colour profile without touching pixel chunks. EXIF/XMP/animation still
// fail the strict validator below and never enter storage.
export function stripReviewColourProfile(bytes) {
  webpDimensions(bytes);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = 12,
    profiles = 0;
  const parts = [bytes.slice(0, 12)];
  while (at < bytes.length) {
    requireValue(at + 8 <= bytes.length, 'invalid_review_photo');
    const kind = String.fromCharCode(...bytes.slice(at, at + 4)),
      length = dv.getUint32(at + 4, true),
      end = at + 8 + length + (length % 2);
    requireValue(length > 0 && end <= bytes.length, 'invalid_review_photo');
    if (kind === 'ICCP') {
      profiles++;
      requireValue(profiles === 1 && length <= 32768, 'invalid_review_photo');
    } else {
      const part = bytes.slice(at, end);
      if (kind === 'VP8X' && length === 10) part[8] &= ~0x20;
      parts.push(part);
    }
    at = end;
  }
  requireValue(at === bytes.length, 'invalid_review_photo');
  if (!profiles) return bytes;
  const result = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  new DataView(result.buffer).setUint32(4, result.length - 8, true);
  return result;
}
export class ProductReviews {
  constructor(service, storage) {
    this.s = service;
    this.storage = storage;
  }
  async settings(store, env) {
    const config = await this.s.store(store, env);
    const row = await this.s.one('SELECT * FROM review_settings WHERE store_id=?', store);
    const counter = await this.s.one(
      'SELECT last_number FROM order_number_counters WHERE store_id=?',
      store,
    );
    return {
      version: row?.version || 0,
      enabled: row?.enabled === 1,
      delayDays: row?.delay_days || 30,
      origin: row?.origin || '',
      nextOrderNumber: counter ? counter.last_number + 1 : null,
      consentVersion: REVIEW_CONSENT,
      storeName: config.legalSnapshot.name,
    };
  }
  async saveSettings(store, env, input, actor) {
    const config = await this.s.store(store, env);
    requireValue(
      identifier(actor) &&
        Number.isSafeInteger(input.version) &&
        typeof input.enabled === 'boolean' &&
        Number.isSafeInteger(input.delayDays) &&
        input.delayDays >= 1 &&
        input.delayDays <= 180,
      'invalid_review_settings',
    );
    let origin;
    try {
      origin = new URL(input.origin);
    } catch {
      requireValue(false, 'invalid_review_origin');
    }
    requireValue(
      origin.origin === input.origin &&
        origin.protocol === 'https:' &&
        config.hosts.includes(origin.host),
      'invalid_review_origin',
    );
    const current = await this.settings(store, env);
    requireValue(current.version === input.version, 'review_version_conflict', 409);
    if (input.lastOrderNumber !== undefined)
      requireValue(
        current.nextOrderNumber === null &&
          Number.isSafeInteger(input.lastOrderNumber) &&
          input.lastOrderNumber > 0 &&
          input.lastOrderNumber < 1e9,
        'order_number_already_configured',
        409,
      );
    const saved = await this.s
      .stmt(
        'INSERT INTO review_settings VALUES(?,1,?,?,?,?) ON CONFLICT(store_id) DO UPDATE SET version=version+1,enabled=excluded.enabled,delay_days=excluded.delay_days,origin=excluded.origin,updated_at=excluded.updated_at WHERE review_settings.version=? RETURNING version',
        store,
        +input.enabled,
        input.delayDays,
        input.origin,
        this.s.now(),
        input.version,
      )
      .first();
    requireValue(saved && saved.version === input.version + 1, 'review_version_conflict', 409);
    if (input.lastOrderNumber !== undefined)
      await this.s
        .stmt(
          'INSERT OR IGNORE INTO order_number_counters VALUES(?,?)',
          store,
          input.lastOrderNumber,
        )
        .run();
    await this.s.db.batch(
      this.s.event(store, 'ReviewSettingsChanged', crypto.randomUUID(), {
        actorRef: actor,
        version: saved.version,
      }),
    );
    return this.settings(store, env);
  }
  async grant(store, env, orderId) {
    const o = await this.s.getOrder(store, env, orderId);
    requireValue(purchased(o), 'review_order_ineligible', 403);
    const id = crypto.randomUUID(),
      token =
        'rv1_' +
        Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
          b.toString(16).padStart(2, '0'),
        ).join('');
    await this.s
      .stmt(
        'INSERT INTO review_grants VALUES(?,?,?,?,?,?)',
        store,
        id,
        orderId,
        await digest(token),
        this.s.now() + 90 * 86400000,
        this.s.now(),
      )
      .run();
    return { id, token, order: o };
  }
  async proof(store, env, token) {
    await this.s.store(store, env);
    requireValue(
      typeof token === 'string' && /^rv1_[a-f0-9]{64}$/.test(token),
      'review_link_invalid',
      403,
    );
    const row = await this.s.one(
      'SELECT * FROM review_grants WHERE store_id=? AND token_hash=? AND expires_at>?',
      store,
      await digest(token),
      this.s.now(),
    );
    requireValue(row, 'review_link_invalid', 403);
    const o = await this.s.getOrder(store, env, row.order_id);
    requireValue(purchased(o), 'review_order_ineligible', 403);
    return { ...row, order: o };
  }
  async access(store, env, token) {
    const p = await this.proof(store, env, token);
    const done = await this.s.rows(
      'SELECT sku,state FROM product_reviews WHERE store_id=? AND order_id=?',
      store,
      p.order_id,
    );
    return {
      orderNumber: reference(p.order),
      products: [
        ...new Map(
          p.order.snapshot.lines.map((l) => [
            rootSku(l),
            { sku: rootSku(l), title: l.title, submitted: done.some((r) => r.sku === rootSku(l)) },
          ]),
        ).values(),
      ],
      photoLimit: 5,
    };
  }
  async queueMail(store, env, grant, kind, eventId) {
    const settings = await this.settings(store, env),
      o = grant.order;
    requireValue(
      settings.origin && email(o.snapshot.customer?.email),
      'review_mail_unavailable',
      503,
    );
    const payload = {
      version: 1,
      storeId: store,
      environment: env,
      orderId: o.id,
      orderNumber: reference(o),
      legalName: settings.storeName,
      eventId,
      kind,
      recipient: o.snapshot.customer.email,
      language: 'lt',
      reviewUrl: settings.origin + '/atsiliepimas#token=' + grant.token,
      stopUrl: settings.origin + '/atsiliepimas#stop=' + grant.token,
      grantId: grant.id,
    };
    await this.s
      .stmt(
        'INSERT OR IGNORE INTO customer_notifications(store_id,event_id,order_id,kind,payload_json,payload_hash,created_at) VALUES(?,?,?,?,?,?,?)',
        store,
        eventId,
        o.id,
        kind,
        JSON.stringify(payload),
        await digest(canonical(payload)),
        this.s.now(),
      )
      .run();
  }
  async requestLink(store, env, input) {
    await this.s.store(store, env);
    requireValue(text(input.orderNumber, 1, 40) && email(input.email), 'invalid_review_request');
    // Never return whether an order/email pair exists. Only send to the stored address.
    const o = await this.s.one(
      "SELECT * FROM orders WHERE store_id=? AND (CAST(public_number AS TEXT)=? OR UPPER(SUBSTR(id,1,8))=?) AND lower(json_extract(snapshot_json,'$.customer.email'))=? LIMIT 1",
      store,
      input.orderNumber.trim().replace(/^#/, ''),
      input.orderNumber.trim().toUpperCase(),
      input.email.trim().toLowerCase(),
    );
    if (o && purchased(o)) {
      const recent = await this.s.one(
        'SELECT COUNT(*) n FROM review_grants WHERE store_id=? AND order_id=? AND created_at>?',
        store,
        o.id,
        this.s.now() - 86400000,
      );
      if (recent.n < 3) {
        const g = await this.grant(store, env, o.id);
        await this.queueMail(store, env, g, 'ReviewAccess', 'ReviewAccess_' + g.id);
      }
    }
    return { accepted: true };
  }
  async upload(store, env, token, bytes) {
    const p = await this.proof(store, env, token);
    requireValue(this.storage, 'private_storage_missing', 503);
    bytes = stripReviewColourProfile(bytes);
    const dimensions = reviewPhotoDimensions(bytes),
      hash = await hashBytes(bytes);
    const id = crypto.randomUUID(),
      key = `${store}/reviews/${id}.webp`;
    // Allocate before writing storage: a proof can never create unbounded orphans.
    await this.s
      .stmt(
        'INSERT INTO review_photos(store_id,id,grant_id,review_id,storage_key,sha256,width,height,byte_length,created_at) VALUES(?,?,?,NULL,?,?,?,?,?,?)',
        store,
        id,
        p.id,
        key,
        hash,
        dimensions.width,
        dimensions.height,
        bytes.length,
        this.s.now(),
      )
      .run();
    try {
      await this.storage.put(key, bytes, hash, 'image/webp');
    } catch (e) {
      await this.s
        .stmt(
          'DELETE FROM review_photos WHERE store_id=? AND id=? AND review_id IS NULL',
          store,
          id,
        )
        .run();
      throw e;
    }
    return { id, ...dimensions };
  }
  async submit(store, env, input) {
    const p = await this.proof(store, env, input.token);
    requireValue(
      identifier(input.sku) && p.order.snapshot.lines.some((l) => rootSku(l) === input.sku),
      'review_product_not_purchased',
      403,
    );
    requireValue(
      Number.isInteger(input.rating) &&
        input.rating >= 1 &&
        input.rating <= 5 &&
        text(input.authorName, 2, 80) &&
        text(input.title || '', 0, 160) &&
        text(input.body, 10, 5000) &&
        input.publicationConsent === true,
      'invalid_review',
    );
    const photos = input.photoIds || [];
    requireValue(
      Array.isArray(photos) &&
        photos.length <= 5 &&
        new Set(photos).size === photos.length &&
        photos.every(identifier),
      'invalid_review_photos',
    );
    for (const id of photos)
      requireValue(
        await this.s.one(
          'SELECT id FROM review_photos WHERE store_id=? AND id=? AND grant_id=? AND review_id IS NULL',
          store,
          id,
          p.id,
        ),
        'invalid_review_photos',
      );
    const existing = await this.s.one(
      'SELECT id FROM product_reviews WHERE store_id=? AND order_id=? AND sku=?',
      store,
      p.order_id,
      input.sku,
    );
    if (existing) return { id: existing.id, state: 'pending', replayed: true };
    const id = crypto.randomUUID(),
      date = new Date(this.s.now()).toISOString().slice(0, 10);
    await this.s.db.batch([
      this.s.stmt(
        'INSERT INTO product_reviews(store_id,id,sku,order_id,author_name,rating,title,body,review_date,source,source_id,fingerprint,verified,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1,?)',
        store,
        id,
        input.sku,
        p.order_id,
        input.authorName.trim(),
        input.rating,
        (input.title || '').trim(),
        input.body.trim(),
        date,
        'purchase',
        p.order_id + ':' + input.sku,
        await digest(p.order_id + ':' + input.sku),
        this.s.now(),
      ),
      ...photos.map((photo) =>
        this.s.stmt(
          'UPDATE review_photos SET review_id=? WHERE store_id=? AND id=? AND grant_id=? AND review_id IS NULL',
          id,
          store,
          photo,
          p.id,
        ),
      ),
      ...this.s.event(store, 'ReviewSubmitted', id),
    ]);
    return { id, state: 'pending', replayed: false };
  }
  async photo(store, env, id, operator = false) {
    await this.s.store(store, env);
    requireValue(identifier(id), 'review_photo_missing', 404);
    const row = await this.s.one(
      'SELECT p.* FROM review_photos p JOIN product_reviews r ON r.store_id=p.store_id AND r.id=p.review_id WHERE p.store_id=? AND p.id=?' +
        (operator ? '' : " AND r.state='published' AND p.hidden=0"),
      store,
      id,
    );
    requireValue(row && this.storage, 'review_photo_missing', 404);
    const bytes = await this.storage.get(row.storage_key);
    requireValue((await hashBytes(bytes)) === row.sha256, 'review_photo_integrity', 502);
    return bytes;
  }
  async list(store, env, { sku, operator = false, page = 1, deleted = false } = {}) {
    await this.s.store(store, env);
    requireValue(!sku || identifier(sku), 'invalid_review_product');
    const where =
      'store_id=?' +
      (operator
        ? deleted
          ? " AND state='deleted'"
          : " AND state!='deleted'"
        : " AND state='published'") +
      (sku ? ' AND sku=?' : '');
    const args = sku ? [store, sku] : [store];
    const items = await this.s.rows(
      'SELECT * FROM product_reviews WHERE ' +
        where +
        ' ORDER BY review_date DESC,id DESC LIMIT 20 OFFSET ?',
      ...args,
      (Math.max(1, Math.min(500, Number(page) || 1)) - 1) * 20,
    );
    const stats = await this.s.rows(
      "SELECT sku,COUNT(*) count,ROUND(AVG(rating),2) average FROM product_reviews WHERE store_id=? AND state='published' GROUP BY sku",
      store,
    );
    const photos = items.length
      ? await this.s.rows(
          'SELECT id,review_id,width,height,hidden FROM review_photos WHERE store_id=? AND review_id IN (' +
            items.map(() => '?').join(',') +
            ')' +
            (operator ? '' : ' AND hidden=0'),
          store,
          ...items.map((r) => r.id),
        )
      : [];
    for (const r of items)
      r.photos = photos
        .filter((p) => p.review_id === r.id)
        .map(({ review_id, ...p }) => ({ ...p, src: '/prekyba/reviews/photos/' + p.id }));
    return {
      items: items.map((r) =>
        operator
          ? r
          : {
              id: r.id,
              sku: r.sku,
              authorName: r.author_name,
              rating: r.rating,
              title: r.title,
              body: r.body,
              date: r.review_date,
              verifiedPurchase: r.verified === 1,
              photos: r.photos,
            },
      ),
      stats,
      total: (await this.s.one('SELECT COUNT(*) n FROM product_reviews WHERE ' + where, ...args)).n,
    };
  }
  async moderate(store, env, id, input, actor) {
    await this.s.store(store, env);
    requireValue(
      identifier(actor) &&
        identifier(id) &&
        ['published', 'hidden', 'pending', 'deleted'].includes(input.state) &&
        text(input.reason, 3, 500) &&
        Number.isSafeInteger(input.version),
      'invalid_review_moderation',
    );
    const record = crypto.randomUUID();
    const results = await this.s.db.batch([
      this.s.stmt(
        'INSERT INTO review_moderations SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM product_reviews WHERE store_id=? AND id=? AND version=?)',
        store,
        record,
        id,
        input.state,
        input.reason.trim(),
        actor,
        this.s.now(),
        store,
        id,
        input.version,
      ),
      this.s.stmt(
        'UPDATE product_reviews SET state=?,version=version+1 WHERE store_id=? AND id=? AND version=?',
        input.state,
        store,
        id,
        input.version,
      ),
    ]);
    requireValue(results[1].meta.changes === 1, 'review_version_conflict', 409);
    return { saved: true };
  }
  async stop(store, env, token) {
    const p = await this.proof(store, env, token);
    await this.s
      .stmt('INSERT OR IGNORE INTO review_optouts VALUES(?,?,?)', store, p.order_id, this.s.now())
      .run();
    return { stopped: true };
  }
  async moderatePhoto(store, env, id, input, actor) {
    await this.s.store(store, env);
    requireValue(
      identifier(actor) &&
        identifier(id) &&
        typeof input.hidden === 'boolean' &&
        text(input.reason, 3, 500),
      'invalid_review_moderation',
    );
    const current = await this.s.one(
      'SELECT review_id FROM review_photos WHERE store_id=? AND id=? AND review_id IS NOT NULL',
      store,
      id,
    );
    requireValue(current, 'review_photo_missing', 404);
    await this.s.db.batch([
      this.s.stmt(
        'UPDATE review_photos SET hidden=? WHERE store_id=? AND id=?',
        +input.hidden,
        store,
        id,
      ),
      this.s.stmt(
        'INSERT INTO review_moderations VALUES(?,?,?,?,?,?,?)',
        store,
        crypto.randomUUID(),
        current.review_id,
        input.hidden ? 'photo_removed' : 'photo_restored',
        input.reason.trim(),
        actor,
        this.s.now(),
      ),
    ]);
    return { hidden: input.hidden };
  }
  async canInvite(store, env, orderId) {
    const settings = await this.settings(store, env),
      o = await this.s.getOrder(store, env, orderId);
    return (
      settings.enabled &&
      purchased(o) &&
      o.snapshot.reviewRequestConsent?.version === REVIEW_CONSENT &&
      !(await this.s.one(
        'SELECT 1 FROM review_optouts WHERE store_id=? AND order_id=?',
        store,
        orderId,
      )) &&
      !(await this.s.one(
        'SELECT 1 FROM product_reviews WHERE store_id=? AND order_id=?',
        store,
        orderId,
      ))
    );
  }
  async markShipped(store, env, orderId, actor) {
    const o = await this.s.getOrder(store, env, orderId);
    requireValue(
      identifier(actor) &&
        purchased(o) &&
        ['labelled', 'shipped', 'delivered'].includes(o.fulfillment_state),
      'review_shipment_not_ready',
      409,
    );
    await this.s.db.batch([
      this.s.stmt(
        "UPDATE orders SET fulfillment_state='shipped' WHERE store_id=? AND id=? AND fulfillment_state='labelled'",
        store,
        orderId,
      ),
      ...this.s.event(store, 'ShipmentHandedOver', orderId, { actorRef: actor }),
    ]);
    return { shipped: true };
  }
  async schedule(store, env) {
    const settings = await this.settings(store, env);
    if (!settings.enabled) return;
    const due = await this.s.rows(
      "SELECT aggregate_id id,MIN(created_at) shipped_at FROM outbox o WHERE store_id=? AND kind='ShipmentHandedOver' AND NOT EXISTS(SELECT 1 FROM customer_notifications n WHERE n.store_id=o.store_id AND n.order_id=o.aggregate_id AND n.kind='ReviewInvitation') AND NOT EXISTS(SELECT 1 FROM review_optouts x WHERE x.store_id=o.store_id AND x.order_id=o.aggregate_id) AND NOT EXISTS(SELECT 1 FROM product_reviews pr WHERE pr.store_id=o.store_id AND pr.order_id=o.aggregate_id) AND EXISTS(SELECT 1 FROM orders v WHERE v.store_id=o.store_id AND v.id=o.aggregate_id AND v.payment_state IN ('paid','partially_refunded','refunded') AND v.payment_id IS NOT NULL AND json_extract(v.snapshot_json,'$.reviewRequestConsent.version')=?) GROUP BY aggregate_id HAVING MIN(created_at)<=? LIMIT 50",
      store,
      REVIEW_CONSENT,
      this.s.now() - settings.delayDays * 86400000,
    );
    for (const o of due) {
      if (
        await this.s.one(
          "SELECT 1 FROM customer_notifications WHERE store_id=? AND order_id=? AND kind='ReviewInvitation'",
          store,
          o.id,
        )
      )
        continue;
      if (await this.canInvite(store, env, o.id)) {
        const g = await this.grant(store, env, o.id);
        await this.queueMail(store, env, g, 'ReviewInvitation', 'ReviewInvitation_' + o.id);
      }
    }
  }
}
