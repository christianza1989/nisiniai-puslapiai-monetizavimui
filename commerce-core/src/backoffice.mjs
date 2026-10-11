import {
  CommerceError,
  requireValue,
  identifier,
  integer,
  digest,
  canonical,
} from './validation.mjs';

const text = (v) =>
  typeof v === 'string' &&
  v.trim().length >= 2 &&
  v.trim().length <= 160 &&
  !/[\x00-\x1f\x7f]/.test(v);
const hash = (v) => digest(canonical(v));
const view = (row) =>
  row ? { ...row, payload: row.payload_json ? JSON.parse(row.payload_json) : undefined } : null;

export class Backoffice {
  constructor(service) {
    this.s = service;
  }
  async guard(store, env, actor) {
    const config = await this.s.store(store, env);
    requireValue(identifier(actor), 'operator_identity_required', 403);
    return config;
  }
  async immutableInsert(store, table, id, valueHash, sql, args, actor, event) {
    // Table is a code-owned constant; never accepted from a request.
    const get = () => this.s.one(`SELECT * FROM ${table} WHERE store_id=? AND id=?`, store, id);
    const replay = (row) => {
      requireValue(row.payload_hash === valueHash, 'record_conflict', 409);
      return { record: row, replayed: true };
    };
    const prior = await get();
    if (prior) return replay(prior);
    try {
      await this.s.db.batch([
        this.s.stmt(sql, ...args),
        ...this.s.event(store, event, id, { actorRef: actor }),
      ]);
    } catch (error) {
      const concurrent = await get();
      if (concurrent) return replay(concurrent);
      throw error;
    }
    return { record: await get(), replayed: false };
  }
  async component(store, env, input, actor) {
    await this.guard(store, env, actor);
    requireValue(
      input && identifier(input.id) && text(input.name) && ['unit', 'g', 'ml'].includes(input.unit),
      'invalid_component',
    );
    const p = { id: input.id, name: input.name.trim(), unit: input.unit };
    const h = await hash(p);
    return this.immutableInsert(
      store,
      'components',
      p.id,
      h,
      'INSERT INTO components VALUES(?,?,?,?,?)',
      [store, p.id, p.name, p.unit, h],
      actor,
      'ComponentDefined',
    );
  }
  async receive(store, env, input, actor) {
    await this.guard(store, env, actor);
    requireValue(
      input &&
        identifier(input.id) &&
        identifier(input.componentId) &&
        text(input.supplierRef) &&
        integer(input.quantity, 1) &&
        (input.expiresAt == null || integer(input.expiresAt, 1, 9999999999999)),
      'invalid_lot',
    );
    requireValue(
      await this.s.one(
        'SELECT id FROM components WHERE store_id=? AND id=?',
        store,
        input.componentId,
      ),
      'component_not_found',
      404,
    );
    const p = {
      id: input.id,
      componentId: input.componentId,
      supplierRef: input.supplierRef.trim(),
      quantity: input.quantity,
      expiresAt: input.expiresAt ?? null,
      actor,
    };
    const h = await hash(p);
    return this.immutableInsert(
      store,
      'component_lots',
      p.id,
      h,
      'INSERT INTO component_lots(store_id,id,component_id,supplier_ref,received,available,expires_at,payload_hash,actor_ref,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
      [
        store,
        p.id,
        p.componentId,
        p.supplierRef,
        p.quantity,
        p.quantity,
        p.expiresAt,
        h,
        actor,
        this.s.now(),
      ],
      actor,
      'ComponentReceived',
    );
  }
  async controlLot(store, env, input, actor) {
    await this.guard(store, env, actor);
    requireValue(
      input &&
        identifier(input.id) &&
        identifier(input.lotId) &&
        ['adjust', 'quarantine', 'release'].includes(input.kind) &&
        integer(input.delta, -100000000, 100000000) &&
        integer(input.expectedAvailable, 0) &&
        integer(input.expectedVersion, 0) &&
        text(input.reason) &&
        input.reason.trim().length >= 3 &&
        (input.kind === 'adjust' ? input.delta !== 0 : input.delta === 0),
      'invalid_lot_control',
    );
    requireValue(
      await this.s.one(
        'SELECT id FROM component_lots WHERE store_id=? AND id=?',
        store,
        input.lotId,
      ),
      'lot_not_found',
      404,
    );
    const p = {
        id: input.id,
        lotId: input.lotId,
        kind: input.kind,
        delta: input.delta,
        expectedAvailable: input.expectedAvailable,
        expectedVersion: input.expectedVersion,
        reason: input.reason.trim(),
        actor,
      },
      h = await hash(p);
    try {
      return await this.immutableInsert(
        store,
        'lot_controls',
        p.id,
        h,
        'INSERT INTO lot_controls VALUES(?,?,?,?,?,?,?,?,?,?,?)',
        [
          store,
          p.id,
          p.lotId,
          p.kind,
          p.delta,
          p.expectedAvailable,
          p.expectedVersion,
          p.reason,
          h,
          actor,
          this.s.now(),
        ],
        actor,
        'MaterialLotControlled',
      );
    } catch (error) {
      if (String(error.message).includes('lot_state_conflict'))
        throw new CommerceError('lot_state_conflict', 409);
      throw error;
    }
  }
  async recipe(store, env, input, actor) {
    await this.guard(store, env, actor);
    requireValue(
      input &&
        identifier(input.id) &&
        identifier(input.sku) &&
        Array.isArray(input.components) &&
        input.components.length > 0 &&
        input.components.length <= 30,
      'invalid_recipe',
    );
    requireValue(
      await this.s.one('SELECT sku FROM products WHERE store_id=? AND sku=?', store, input.sku),
      'product_unavailable',
      404,
    );
    const seen = new Set(),
      components = [];
    for (const line of input.components) {
      requireValue(
        identifier(line?.id) && integer(line.quantity, 1) && !seen.has(line.id),
        'invalid_recipe',
      );
      seen.add(line.id);
      const c = await this.s.one(
        'SELECT * FROM components WHERE store_id=? AND id=?',
        store,
        line.id,
      );
      requireValue(c && c.unit === line.unit, 'component_unit_mismatch');
      components.push({ id: line.id, quantity: line.quantity, unit: c.unit });
    }
    components.sort((a, b) => a.id.localeCompare(b.id));
    const p = { id: input.id, sku: input.sku, components },
      h = await hash(p);
    return this.immutableInsert(
      store,
      'recipes',
      p.id,
      h,
      'INSERT INTO recipes VALUES(?,?,?,?,?)',
      [store, p.id, p.sku, JSON.stringify(p), h],
      actor,
      'RecipeDefined',
    );
  }
  async assemble(store, env, input, actor) {
    await this.guard(store, env, actor);
    requireValue(
      input &&
        identifier(input.id) &&
        identifier(input.recipeId) &&
        integer(input.quantity, 1, 1000),
      'invalid_assembly',
    );
    const p = { id: input.id, recipeId: input.recipeId, quantity: input.quantity, actor },
      h = await hash(p);
    const get = () => this.s.one('SELECT * FROM assemblies WHERE store_id=? AND id=?', store, p.id);
    const replay = (row) => {
      requireValue(row.request_hash === h, 'record_conflict', 409);
      return { assembly: view(row), replayed: true };
    };
    const prior = await get();
    if (prior) return replay(prior);
    const row = await this.s.one(
      'SELECT * FROM recipes WHERE store_id=? AND id=?',
      store,
      p.recipeId,
    );
    requireValue(row, 'recipe_not_found', 404);
    const recipe = JSON.parse(row.definition_json),
      consumed = [],
      at = this.s.now();
    for (const line of recipe.components) {
      let left = line.quantity * p.quantity;
      requireValue(integer(left, 1), 'invalid_assembly');
      const lots = await this.s.rows(
        'SELECT * FROM component_lots WHERE store_id=? AND component_id=? AND available>0 AND quarantined=0 AND (expires_at IS NULL OR expires_at>?) ORDER BY expires_at IS NULL,expires_at,created_at,id',
        store,
        line.id,
        at,
      );
      for (const lot of lots) {
        if (!left) break;
        const quantity = Math.min(left, lot.available);
        consumed.push({ lotId: lot.id, componentId: line.id, quantity, unit: line.unit });
        left -= quantity;
      }
      requireValue(left === 0, 'component_stock_conflict', 409);
    }
    try {
      await this.s.db.batch([
        this.s.stmt(
          'INSERT INTO assemblies VALUES(?,?,?,?,?,?,?,?,?)',
          store,
          p.id,
          p.recipeId,
          recipe.sku,
          p.quantity,
          h,
          JSON.stringify({ recipe, consumed }),
          actor,
          at,
        ),
        ...consumed.map((l) =>
          this.s.stmt(
            'INSERT INTO assembly_lots VALUES(?,?,?,?)',
            store,
            p.id,
            l.lotId,
            l.quantity,
          ),
        ),
        ...this.s.event(store, 'KitsAssembled', p.id, {
          sku: recipe.sku,
          quantity: p.quantity,
          actorRef: actor,
        }),
      ]);
    } catch (error) {
      const concurrent = await get();
      if (concurrent) return replay(concurrent);
      if (String(error.message).includes('component_stock_conflict'))
        throw new CommerceError('component_stock_conflict', 409);
      throw error;
    }
    return { assembly: view(await get()), replayed: false };
  }
  async inventory(store, env) {
    await this.s.store(store, env);
    return {
      components: await this.s.rows('SELECT * FROM components WHERE store_id=? ORDER BY id', store),
      lots: await this.s.rows(
        'SELECT * FROM component_lots WHERE store_id=? ORDER BY created_at DESC,id LIMIT 100',
        store,
      ),
      lotControls: await this.s.rows(
        'SELECT * FROM lot_controls WHERE store_id=? ORDER BY created_at DESC,id DESC LIMIT 100',
        store,
      ),
      recipes: (await this.s.rows('SELECT * FROM recipes WHERE store_id=? ORDER BY id', store)).map(
        (r) => ({ ...r, definition: JSON.parse(r.definition_json) }),
      ),
      assemblies: (
        await this.s.rows(
          'SELECT * FROM assemblies WHERE store_id=? ORDER BY created_at DESC,id LIMIT 50',
          store,
        )
      ).map(view),
    };
  }
  async importSources(store, env, input, actor) {
    await this.guard(store, env, actor);
    requireValue(
      input &&
        identifier(input.origin) &&
        Array.isArray(input.rows) &&
        input.rows.length > 0 &&
        input.rows.length <= 100,
      'invalid_financial_import',
    );
    const statements = [],
      seen = new Set();
    for (const r of input.rows) {
      requireValue(
        r &&
          identifier(r.reference) &&
          !seen.has(r.reference) &&
          ['payment', 'refund', 'fee', 'payout', 'bank'].includes(r.kind) &&
          /^[A-Z]{3}$/.test(r.currency) &&
          integer(r.amount, -100000000, 100000000) &&
          r.amount !== 0 &&
          integer(r.occurredAt, 1, 9999999999999) &&
          (r.transactionRef == null || identifier(r.transactionRef)),
        'invalid_financial_source',
      );
      requireValue(
        (r.kind !== 'payment' || r.amount > 0) &&
          (!['refund', 'fee', 'payout'].includes(r.kind) || r.amount < 0),
        'financial_sign_invalid',
      );
      seen.add(r.reference);
      const p = {
          origin: input.origin,
          reference: r.reference,
          kind: r.kind,
          currency: r.currency,
          amount: r.amount,
          transactionRef: r.transactionRef ?? null,
          occurredAt: r.occurredAt,
        },
        h = await hash(p),
        id = await hash({ origin: p.origin, reference: p.reference });
      statements.push(
        this.s.stmt(
          'INSERT INTO financial_sources VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(store_id,origin,reference) DO UPDATE SET payload_hash=excluded.payload_hash WHERE financial_sources.payload_hash!=excluded.payload_hash',
          store,
          id,
          p.origin,
          p.reference,
          p.kind,
          p.currency,
          p.amount,
          p.transactionRef,
          p.occurredAt,
          h,
          actor,
          this.s.now(),
        ),
      );
      // Exact replays are skipped; a changed source never overwrites the original.
      const old = await this.s.one(
        'SELECT payload_hash FROM financial_sources WHERE store_id=? AND origin=? AND reference=?',
        store,
        p.origin,
        p.reference,
      );
      if (old) {
        requireValue(old.payload_hash === h, 'financial_source_conflict', 409);
        statements.pop();
      }
    }
    // The immutable trigger protects a concurrent conflicting import too.
    let imported = 0;
    try {
      if (statements.length)
        imported = (
          await this.s.db.batch([
            ...statements,
            ...this.s.event(store, 'FinancialSourcesImported', await hash(input), {
              actorRef: actor,
              count: statements.length,
            }),
          ])
        )
          .slice(0, statements.length)
          .reduce((sum, result) => sum + (result.meta?.changes ?? 0), 0);
    } catch (error) {
      if (String(error.message).includes('financial_source_immutable')) {
        // A same-payload concurrent request can replay only after every row is present.
        for (const r of input.rows) {
          const old = await this.s.one(
            'SELECT payload_hash FROM financial_sources WHERE store_id=? AND origin=? AND reference=?',
            store,
            input.origin,
            r.reference,
          );
          const h = await hash({
            origin: input.origin,
            reference: r.reference,
            kind: r.kind,
            currency: r.currency,
            amount: r.amount,
            transactionRef: r.transactionRef ?? null,
            occurredAt: r.occurredAt,
          });
          requireValue(old?.payload_hash === h, 'financial_source_conflict', 409);
        }
        return { imported: 0, replayed: true };
      }
      throw error;
    }
    return { imported, replayed: imported === 0 };
  }
  async candidate(store, source) {
    if (source.kind === 'payment') {
      const order = await this.s.one(
        'SELECT id,currency,amount,payment_state FROM orders WHERE store_id=? AND payment_id=?',
        store,
        source.transaction_ref,
      );
      if (!order) return { state: 'unmatched', reason: 'order_not_found' };
      if (
        !['paid', 'partially_refunded', 'refunded'].includes(order.payment_state) ||
        order.currency !== source.currency ||
        order.amount !== source.amount
      )
        return { state: 'exception', reason: 'payment_facts_mismatch' };
      return { state: 'candidate', targetKind: 'payment', targetRef: order.id };
    }
    if (source.kind === 'refund') {
      const refund = await this.s.one(
        'SELECT r.amount,r.provider_id,o.currency FROM refunds r JOIN orders o ON o.store_id=r.store_id AND o.id=r.order_id WHERE r.store_id=? AND r.provider_id=?',
        store,
        source.transaction_ref,
      );
      if (!refund) return { state: 'unmatched', reason: 'refund_not_found' };
      if (refund.currency !== source.currency || refund.amount !== -source.amount)
        return { state: 'exception', reason: 'refund_facts_mismatch' };
      return { state: 'candidate', targetKind: 'refund', targetRef: refund.provider_id };
    }
    return {
      state: 'unmatched',
      reason: source.kind === 'fee' ? 'posting_policy_required' : 'transfer_peer_required',
    };
  }
  async financials(store, env) {
    await this.s.store(store, env);
    const sources = await this.s.rows(
        'SELECT * FROM financial_sources WHERE store_id=? ORDER BY occurred_at DESC,id LIMIT 100',
        store,
      ),
      rows = [];
    for (const source of sources) {
      const matched = await this.s.one(
        'SELECT * FROM reconciliations WHERE store_id=? AND (source_id=? OR peer_id=?)',
        store,
        source.id,
        source.id,
      );
      rows.push({
        ...source,
        reconciliation: matched ?? null,
        ...(matched ? { state: 'matched' } : await this.candidate(store, source)),
      });
    }
    return {
      sources: rows,
      journals: await this.s.rows(
        'SELECT * FROM journal_entries WHERE store_id=? ORDER BY created_at DESC LIMIT 50',
        store,
      ),
      limit: 100,
    };
  }
  async reconcile(store, env, input, actor) {
    await this.guard(store, env, actor);
    requireValue(
      input &&
        identifier(input.sourceId) &&
        (input.peerId === undefined || identifier(input.peerId)),
      'invalid_reconciliation',
    );
    const source = await this.s.one(
      'SELECT * FROM financial_sources WHERE store_id=? AND id=?',
      store,
      input.sourceId,
    );
    requireValue(source, 'financial_source_not_found', 404);
    const old = await this.s.one(
      'SELECT * FROM reconciliations WHERE store_id=? AND (source_id=? OR peer_id=?)',
      store,
      source.id,
      source.id,
    );
    if (old) {
      requireValue(
        old.source_id === source.id && (old.peer_id ?? undefined) === input.peerId,
        'reconciliation_conflict',
        409,
      );
      return { match: old, replayed: true };
    }
    let target;
    if (input.peerId) {
      const peer = await this.s.one(
        'SELECT * FROM financial_sources WHERE store_id=? AND id=?',
        store,
        input.peerId,
      );
      requireValue(
        source.kind === 'payout' &&
          peer?.kind === 'bank' &&
          source.transaction_ref &&
          source.transaction_ref === peer.transaction_ref &&
          source.currency === peer.currency &&
          source.amount === -peer.amount,
        'transfer_facts_mismatch',
        409,
      );
      target = { targetKind: 'transfer', targetRef: source.transaction_ref };
    } else {
      target = await this.candidate(store, source);
      requireValue(target.state === 'candidate', 'reconciliation_facts_mismatch', 409);
    }
    try {
      await this.s.db.batch([
        this.s.stmt(
          'INSERT INTO reconciliations VALUES(?,?,?,?,?,?,?)',
          store,
          source.id,
          target.targetKind,
          target.targetRef,
          input.peerId ?? null,
          actor,
          this.s.now(),
        ),
        ...this.s.event(store, 'SourceReconciled', source.id, { actorRef: actor }),
      ]);
    } catch (error) {
      const duplicate = await this.s.one(
        'SELECT * FROM reconciliations WHERE store_id=? AND source_id=?',
        store,
        source.id,
      );
      if (
        duplicate &&
        duplicate.target_ref === target.targetRef &&
        duplicate.peer_id === (input.peerId ?? null)
      )
        return { match: duplicate, replayed: true };
      throw new CommerceError('reconciliation_conflict', 409);
    }
    return {
      match: await this.s.one(
        'SELECT * FROM reconciliations WHERE store_id=? AND source_id=?',
        store,
        source.id,
      ),
      replayed: false,
    };
  }
}
