import { productContent } from './product-config.mjs';
import {
  requireValue,
  identifier,
  integer,
  digest,
  canonical,
  CommerceError,
} from './validation.mjs';
export function productDefinition(input, config) {
  requireValue(
    input &&
      identifier(input.sku) &&
      typeof input.title === 'string' &&
      input.title.trim().length >= 2 &&
      input.title.length <= 200 &&
      !/[\x00-\x1f\x7f]/.test(input.title) &&
      typeof input.enabled === 'boolean',
    'invalid_product',
  );
  requireValue(
    input.lotTrackingRequired === undefined || typeof input.lotTrackingRequired === 'boolean',
    'invalid_stock_policy',
  );
  const countries = config.markets.map((m) => m.country);
  requireValue(
    input.prices &&
      typeof input.prices === 'object' &&
      !Array.isArray(input.prices) &&
      Object.keys(input.prices).length > 0 &&
      Object.entries(input.prices).every(
        ([country, amount]) => countries.includes(country) && integer(amount, 1),
      ),
    'invalid_prices',
  );
  const pack = input.package;
  requireValue(
    (input.enabled === false && pack === null) ||
      (integer(pack?.weightGrams, 1, 100000) &&
        Array.isArray(pack.dimensionsMm) &&
        pack.dimensionsMm.length === 3 &&
        pack.dimensionsMm.every((v) => integer(v, 1, 3000))),
    'invalid_package',
  );
  requireValue(
    input.titles === undefined ||
      (input.titles &&
        typeof input.titles === 'object' &&
        !Array.isArray(input.titles) &&
        Object.entries(input.titles).every(
          ([country, title]) =>
            countries.includes(country) &&
            typeof title === 'string' &&
            title.length >= 2 &&
            title.length <= 200 &&
            !/[\x00-\x1f\x7f]/.test(title),
        )),
    'invalid_product_titles',
  );
  requireValue(
    input.addonFor === undefined ||
      (Array.isArray(input.addonFor) &&
        input.addonFor.length > 0 &&
        input.addonFor.length <= 20 &&
        input.addonFor.every(identifier) &&
        !input.addonFor.includes(input.sku)),
    'invalid_product_options',
  );
  return {
    sku: input.sku,
    title: input.title.trim(),
    ...(input.lotTrackingRequired !== undefined
      ? { lotTrackingRequired: input.lotTrackingRequired }
      : {}),
    enabled: input.enabled,
    prices: input.prices,
    package: pack ? { weightGrams: pack.weightGrams, dimensionsMm: [...pack.dimensionsMm] } : null,
    ...(input.titles ? { titles: input.titles } : {}),
    ...(input.addonFor ? { addonFor: input.addonFor } : {}),
    ...productContent(input, countries),
    stock: 0,
  };
}
export class CatalogOperations {
  constructor(service) {
    this.s = service;
  }
  async validateMedia(store, definition) {
    for (const image of definition.content?.images ?? []) {
      if (!image.src.startsWith('/prekyba/catalog-media/')) continue;
      const row = await this.s.one(
        'SELECT width,height FROM catalog_media WHERE store_id=? AND id=?',
        store,
        image.id,
      );
      requireValue(
        row &&
          image.src === '/prekyba/catalog-media/' + image.id &&
          row.width === image.width &&
          row.height === image.height,
        'invalid_product_images',
      );
    }
  }
  async draft(store, env, sku) {
    await this.s.store(store, env);
    requireValue(identifier(sku), 'invalid_product');
    const row = await this.s.one(
      'SELECT * FROM catalog_drafts WHERE store_id=? AND sku=?',
      store,
      sku,
    );
    return row
      ? {
          definition: JSON.parse(row.definition_json),
          draftHash: row.draft_hash,
          basisHash: row.published_hash,
          updatedAt: row.updated_at,
        }
      : null;
  }
  async saveDraft(store, env, input, actor) {
    const config = await this.s.store(store, env);
    requireValue(identifier(actor), 'operator_identity_required', 403);
    const definition = productDefinition(input.definition, config),
      sku = definition.sku;
    await this.validateMedia(store, definition);
    const published = await this.s.one(
      'SELECT definition_json FROM products WHERE store_id=? AND sku=?',
      store,
      sku,
    );
    const publishedHash = published ? await digest(published.definition_json) : null;
    requireValue((input.basisHash ?? null) === publishedHash, 'catalog_revision_conflict', 409);
    const old = await this.draft(store, env, sku),
      json = JSON.stringify(definition),
      hash = await digest(json);
    if (old?.draftHash === hash && old.basisHash === publishedHash)
      return { ...old, replayed: true };
    requireValue(
      (input.draftHash ?? null) === (old?.draftHash ?? null),
      'catalog_draft_conflict',
      409,
    );
    try {
      const result = old
        ? await this.s
            .stmt(
              'UPDATE catalog_drafts SET definition_json=?,published_hash=?,draft_hash=?,actor_ref=?,updated_at=? WHERE store_id=? AND sku=? AND draft_hash=?',
              json,
              publishedHash,
              hash,
              actor,
              this.s.now(),
              store,
              sku,
              old.draftHash,
            )
            .run()
        : await this.s
            .stmt(
              'INSERT INTO catalog_drafts VALUES(?,?,?,?,?,?,?)',
              store,
              sku,
              json,
              publishedHash,
              hash,
              actor,
              this.s.now(),
            )
            .run();
      requireValue(result.meta.changes === 1, 'catalog_draft_conflict', 409);
    } catch (error) {
      if (String(error.message).includes('UNIQUE'))
        throw new CommerceError('catalog_draft_conflict', 409);
      throw error;
    }
    return this.draft(store, env, sku);
  }
  async list(store, env) {
    await this.s.store(store, env);
    const rows = await this.s.rows(
      'SELECT p.sku,p.definition_json,i.available FROM products p JOIN inventory i ON i.store_id=p.store_id AND i.sku=p.sku WHERE p.store_id=? ORDER BY p.sku',
      store,
    );
    const products = await Promise.all(
      rows.map(async (r) => ({
        ...JSON.parse(r.definition_json),
        available: r.available,
        basisHash: await digest(r.definition_json),
      })),
    );
    const drafts = await this.s.rows(
      'SELECT d.definition_json FROM catalog_drafts d WHERE d.store_id=? AND NOT EXISTS(SELECT 1 FROM products p WHERE p.store_id=d.store_id AND p.sku=d.sku)',
      store,
    );
    return [
      ...products,
      ...drafts.map((r) => ({
        ...JSON.parse(r.definition_json),
        available: 0,
        basisHash: null,
        published: false,
      })),
    ];
  }
  async revise(store, env, input, actor) {
    const config = await this.s.store(store, env);
    requireValue(identifier(actor) && identifier(input?.id), 'operator_identity_required', 403);
    const definition = productDefinition(input.definition, config),
      sku = definition.sku;
    const requestHash = await digest(
      canonical({ definition, basisHash: input.basisHash ?? null, actor }),
    );
    const priorRevision = await this.s.one(
      'SELECT request_hash FROM catalog_revisions WHERE store_id=? AND id=?',
      store,
      input.id,
    );
    if (priorRevision) {
      requireValue(priorRevision.request_hash === requestHash, 'catalog_revision_conflict', 409);
      return { replayed: true };
    }
    await this.validateMedia(store, definition);
    if (input.draftHash !== undefined) {
      const draft = await this.draft(store, env, sku);
      requireValue(
        draft?.draftHash === input.draftHash &&
          canonical(draft.definition) === canonical(definition),
        'catalog_draft_conflict',
        409,
      );
    }
    const old = await this.s.one(
      'SELECT definition_json FROM products WHERE store_id=? AND sku=?',
      store,
      sku,
    );
    requireValue(
      old ? input.basisHash === (await digest(old.definition_json)) : input.basisHash == null,
      'catalog_revision_conflict',
      409,
    );
    const value = {
        ...definition,
        revision: (old ? JSON.parse(old.definition_json).revision || 0 : 0) + 1,
      },
      after = JSON.stringify(value);
    const statements = old
      ? [
          this.s.stmt(
            'INSERT INTO catalog_revisions SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM products WHERE store_id=? AND sku=? AND definition_json=?) AND (? IS NULL OR EXISTS(SELECT 1 FROM catalog_drafts WHERE store_id=? AND sku=? AND draft_hash=?))',
            store,
            input.id,
            sku,
            requestHash,
            old.definition_json,
            after,
            actor,
            this.s.now(),
            store,
            sku,
            old.definition_json,
            input.draftHash ?? null,
            store,
            sku,
            input.draftHash ?? null,
          ),
          this.s.stmt(
            'UPDATE products SET definition_json=? WHERE store_id=? AND sku=? AND definition_json=? AND EXISTS(SELECT 1 FROM catalog_revisions WHERE store_id=? AND id=?)',
            after,
            store,
            sku,
            old.definition_json,
            store,
            input.id,
          ),
        ]
      : [
          this.s.stmt(
            'INSERT INTO products SELECT ?,?,? WHERE ? IS NULL OR EXISTS(SELECT 1 FROM catalog_drafts WHERE store_id=? AND sku=? AND draft_hash=?)',
            store,
            sku,
            after,
            input.draftHash ?? null,
            store,
            sku,
            input.draftHash ?? null,
          ),
          this.s.stmt(
            'INSERT INTO inventory SELECT ?,?,0 WHERE EXISTS(SELECT 1 FROM products WHERE store_id=? AND sku=? AND definition_json=?)',
            store,
            sku,
            store,
            sku,
            after,
          ),
          this.s.stmt(
            'INSERT INTO catalog_revisions SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM products WHERE store_id=? AND sku=? AND definition_json=?)',
            store,
            input.id,
            sku,
            requestHash,
            null,
            after,
            actor,
            this.s.now(),
            store,
            sku,
            after,
          ),
        ];
    try {
      const result = await this.s.db.batch([
        ...statements,
        ...(input.draftHash
          ? [
              this.s.stmt(
                'DELETE FROM catalog_drafts WHERE store_id=? AND sku=? AND draft_hash=? AND EXISTS(SELECT 1 FROM catalog_revisions WHERE store_id=? AND id=?)',
                store,
                sku,
                input.draftHash,
                store,
                input.id,
              ),
            ]
          : []),
        ...this.s.event(
          store,
          'CatalogRevised',
          input.id,
          { sku, actorRef: actor },
          {
            sql: 'EXISTS(SELECT 1 FROM catalog_revisions WHERE store_id=? AND id=?)',
            args: [store, input.id],
          },
        ),
      ]);
      requireValue(result[0].meta.changes === 1, 'catalog_revision_conflict', 409);
    } catch (error) {
      const raced = await this.s.one(
        'SELECT request_hash FROM catalog_revisions WHERE store_id=? AND id=?',
        store,
        input.id,
      );
      if (raced?.request_hash === requestHash) return { replayed: true };
      if (String(error.message).includes('UNIQUE'))
        throw new CommerceError('catalog_revision_conflict', 409);
      throw error;
    }
    return { replayed: false };
  }
}
