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
    enabled: input.enabled,
    prices: input.prices,
    package: pack ? { weightGrams: pack.weightGrams, dimensionsMm: [...pack.dimensionsMm] } : null,
    ...(input.titles ? { titles: input.titles } : {}),
    ...(input.addonFor ? { addonFor: input.addonFor } : {}),
    stock: 0,
  };
}
export class CatalogOperations {
  constructor(service) {
    this.s = service;
  }
  async list(store, env) {
    await this.s.store(store, env);
    const rows = await this.s.rows(
      'SELECT p.sku,p.definition_json,i.available FROM products p JOIN inventory i ON i.store_id=p.store_id AND i.sku=p.sku WHERE p.store_id=? ORDER BY p.sku',
      store,
    );
    return Promise.all(
      rows.map(async (r) => ({
        ...JSON.parse(r.definition_json),
        available: r.available,
        basisHash: await digest(r.definition_json),
      })),
    );
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
            'INSERT INTO catalog_revisions SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM products WHERE store_id=? AND sku=? AND definition_json=?)',
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
          this.s.stmt('INSERT INTO products VALUES(?,?,?)', store, sku, after),
          this.s.stmt('INSERT INTO inventory VALUES(?,?,0)', store, sku),
          this.s.stmt(
            'INSERT INTO catalog_revisions VALUES(?,?,?,?,?,?,?,?)',
            store,
            input.id,
            sku,
            requestHash,
            null,
            after,
            actor,
            this.s.now(),
          ),
        ];
    try {
      const result = await this.s.db.batch([
        ...statements,
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
