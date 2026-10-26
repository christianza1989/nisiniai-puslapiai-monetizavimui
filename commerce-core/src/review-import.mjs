import { csvRows } from './finance-io.mjs';
import { requireValue, digest, canonical, identifier } from './validation.mjs';
function collectionOrigin(config, input) {
  if (input.collectionOrigin === undefined) return null;
  let url;
  try {
    url = new URL(input.collectionOrigin);
  } catch {
    requireValue(false, 'invalid_review_origin');
  }
  requireValue(
    input.sameStoreCollectionConfirmed === true &&
      url.protocol === 'https:' &&
      url.origin === input.collectionOrigin &&
      config.hosts.includes(url.host),
    'invalid_review_origin',
  );
  return url.origin;
}
export async function prepareReviewImport(service, store, env, input) {
  const config = await service.store(store, env),
    origin = collectionOrigin(config, input);
  const [headers, ...rows] = csvRows(input.csv);
  const mapping = input.mapping || Object.fromEntries(headers.map((h) => [h, h]));
  requireValue(
    ['product_sku', 'rating', 'author_name', 'review_date', 'review_text'].every((k) =>
      headers.includes(mapping[k]),
    ),
    'review_csv_mapping_invalid',
  );
  const products = await service.catalog(store, env),
    seen = new Set(),
    items = [];
  for (const [index, cells] of rows.entries()) {
    const get = (k) => cells[headers.indexOf(mapping[k])] || '';
    const sku = get('product_sku').trim(),
      date = get('review_date').trim();
    const item = {
      sku,
      rating: Number(get('rating')),
      authorName: get('author_name').trim(),
      date,
      body: get('review_text').trim(),
      title: get('review_title').trim(),
      images: get('image_urls').split('|').filter(Boolean),
      sourceId: get('review_id').trim(),
    };
    const validDate =
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      Number.isFinite(Date.parse(date)) &&
      new Date(date).toISOString().slice(0, 10) === date &&
      Date.parse(date) <= service.now();
    item.error = !products.some((p) => p.sku === sku)
      ? 'Neatpažinta prekė'
      : !Number.isInteger(item.rating) || item.rating < 1 || item.rating > 5
        ? 'Įvertinimas turi būti 1–5'
        : !validDate
          ? 'Netaisyklinga arba ateities data'
          : item.authorName.length < 2 ||
              item.authorName.length > 80 ||
              item.body.length > 5000 ||
              item.title.length > 160
            ? 'Patikrinkite vardo ir teksto ilgį'
            : '';
    item.warning = item.images.length
      ? 'Nuotraukos įkeliamos atskirai; dabar importuojamas įvertinimas ir tekstas.'
      : '';
    item.fingerprint = await digest(
      canonical({
        sku,
        date,
        rating: item.rating,
        name: item.authorName,
        title: item.title,
        body: item.body,
      }),
    );
    item.sourceId ||= item.fingerprint;
    const old = await service.one(
      "SELECT fingerprint FROM product_reviews WHERE store_id=? AND (fingerprint=? OR (source IN ('shopify_import','storefront_import') AND source_id=?))",
      store,
      item.fingerprint,
      item.sourceId,
    );
    item.duplicate = seen.has(item.fingerprint) || old?.fingerprint === item.fingerprint;
    if (old && old.fingerprint !== item.fingerprint)
      item.error = 'Tas pats šaltinio ID jau turi kitą tekstą';
    seen.add(item.fingerprint);
    item.row = index + 2;
    // A CSV flag is not purchase evidence. Historical imports remain honestly unverified.
    item.verifiedPurchase = false;
    items.push(item);
  }
  return {
    headers,
    items,
    collectionOrigin: origin,
    hash: await digest(canonical({ items, collectionOrigin: origin })),
    ready: items.filter((i) => !i.error && !i.duplicate).length,
  };
}
export async function importReviews(service, store, env, input, actor) {
  const preview = await prepareReviewImport(service, store, env, input);
  requireValue(
    input.hash === preview.hash &&
      input.ownStoreConfirmed === true &&
      preview.items.every((i) => !i.error),
    'review_import_not_confirmed',
    409,
  );
  const items = preview.items.filter((i) => !i.duplicate);
  if (items.length)
    await service.db.batch(
      items.flatMap((i) => {
        const id = crypto.randomUUID();
        return [
          service.stmt(
            'INSERT OR IGNORE INTO product_reviews(store_id,id,sku,author_name,rating,title,body,review_date,source,source_id,fingerprint,verified,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,0,?)',
            store,
            id,
            i.sku,
            i.authorName,
            i.rating,
            i.title,
            i.body,
            i.date,
            preview.collectionOrigin ? 'storefront_import' : 'shopify_import',
            i.sourceId,
            i.fingerprint,
            service.now(),
          ),
          ...service.event(store, 'ReviewImported', id, {
            actorRef: actor,
            collectionOrigin: preview.collectionOrigin,
          }),
        ];
      }),
    );
  return {
    imported: items.length,
    duplicates: preview.items.length - items.length,
    state: 'pending',
  };
}

// Explicit operator attestation for an already uploaded, still-unpublished migration.
// Preserve its text, dates, photo IDs, fingerprint and unverified purchase status.
export async function attestReviewImportOrigin(service, store, env, input, actor) {
  const origin = collectionOrigin(await service.store(store, env), input);
  requireValue(
    origin &&
      identifier(actor) &&
      Array.isArray(input.reviewIds) &&
      input.reviewIds.length > 0 &&
      input.reviewIds.length <= 50 &&
      input.reviewIds.every(identifier) &&
      new Set(input.reviewIds).size === input.reviewIds.length,
    'review_import_not_confirmed',
  );
  const rows = await service.rows(
    'SELECT id,source,state,version FROM product_reviews WHERE store_id=? AND id IN (' +
      input.reviewIds.map(() => '?').join(',') +
      ')',
    store,
    ...input.reviewIds,
  );
  requireValue(
    rows.length === input.reviewIds.length &&
      rows.every(
        (r) => r.state === 'pending' && ['shopify_import', 'storefront_import'].includes(r.source),
      ),
    'review_import_not_confirmed',
  );
  const changed = rows.filter((r) => r.source === 'shopify_import');
  const results = changed.length
    ? await service.db.batch(
        changed.flatMap((r) => [
          service.stmt(
            "UPDATE product_reviews SET source='storefront_import',version=version+1 WHERE store_id=? AND id=? AND source='shopify_import' AND state='pending' AND version=?",
            store,
            r.id,
            r.version,
          ),
          service.stmt(
            'INSERT INTO review_moderations SELECT ?,?,?,?,?,?,? WHERE changes()=1',
            store,
            crypto.randomUUID(),
            r.id,
            'origin_attested',
            'Owner confirms collection on ' + origin,
            actor,
            service.now(),
          ),
        ]),
      )
    : [];
  return {
    attested: results.filter((_, i) => i % 2 === 0).reduce((n, r) => n + r.meta.changes, 0),
    collectionOrigin: origin,
  };
}
