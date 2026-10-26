import { csvRows } from './finance-io.mjs';
import { requireValue, digest, canonical } from './validation.mjs';
export async function prepareReviewImport(service, store, env, input) {
  await service.store(store, env);
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
      'SELECT fingerprint FROM product_reviews WHERE store_id=? AND (fingerprint=? OR (source=? AND source_id=?))',
      store,
      item.fingerprint,
      'shopify_import',
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
    hash: await digest(canonical(items)),
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
            'shopify_import',
            i.sourceId,
            i.fingerprint,
            service.now(),
          ),
          ...service.event(store, 'ReviewImported', id, { actorRef: actor }),
        ];
      }),
    );
  return {
    imported: items.length,
    duplicates: preview.items.length - items.length,
    state: 'pending',
  };
}
