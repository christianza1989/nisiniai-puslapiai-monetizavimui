import {
  requireValue,
  identifier,
  integer,
  canonical,
  digest,
  CommerceError,
} from './validation.mjs';
const text = (v) =>
  typeof v === 'string' && v.trim().length >= 3 && v.length <= 200 && !/[\x00-\x1f\x7f]/.test(v);
export class FinishedStock {
  constructor(service) {
    this.s = service;
  }
  async guard(store, env, actor) {
    await this.s.store(store, env);
    requireValue(identifier(actor), 'operator_identity_required', 403);
  }
  async list(store, env) {
    await this.s.store(store, env);
    const at = this.s.now();
    return {
      lots: await this.s.rows(
        'SELECT f.*,CASE WHEN f.expires_at<=? THEN 1 ELSE 0 END AS expired,COALESCE(h.held,0) AS held,CASE WHEN COALESCE(h.held,0)=1 OR f.blocked=1 OR f.expires_at<=? THEN 0 ELSE f.available END AS sellable FROM finished_lot_quality f LEFT JOIN finished_stock_holds h ON h.store_id=f.store_id AND h.sku=f.sku WHERE f.store_id=? ORDER BY f.created_at DESC,f.id LIMIT 200',
        at,
        at,
        store,
      ),
      holds: await this.s.rows(
        'SELECT * FROM finished_stock_holds WHERE store_id=? ORDER BY sku',
        store,
      ),
      controls: await this.s.rows(
        'SELECT * FROM finished_controls WHERE store_id=? ORDER BY created_at DESC,id DESC LIMIT 100',
        store,
      ),
      inventory: await this.s.rows(
        'SELECT sku,available FROM inventory WHERE store_id=? ORDER BY sku',
        store,
      ),
    };
  }
  async order(store, env, orderId) {
    const order = await this.s.getOrder(store, env, orderId);
    const allocations = await this.s.rows(
      'SELECT a.*,f.expires_at,f.supplier_ref,f.assembly_id,f.blocked FROM finished_allocations a JOIN finished_lot_quality f ON f.store_id=a.store_id AND f.id=a.lot_id WHERE a.store_id=? AND a.order_id=? ORDER BY a.generation,a.sku,a.lot_id',
      store,
      orderId,
    );
    const at = this.s.now();
    const blocked =
      order.stock_provenance_unknown === 1 ||
      allocations.some(
        (a) =>
          a.generation === order.stock_generation &&
          ['reserved', 'allocated'].includes(a.state) &&
          (a.blocked === 1 || (a.expires_at !== null && a.expires_at <= at)),
      );
    return { blocked, provenanceUnknown: order.stock_provenance_unknown === 1, allocations };
  }
  async requireOrder(store, env, orderId) {
    const quality = await this.order(store, env, orderId);
    requireValue(!quality.blocked, 'stock_quality_hold', 409);
    return quality;
  }
  async receive(store, env, input, actor) {
    await this.guard(store, env, actor);
    requireValue(
      identifier(input?.id) &&
        identifier(input.sku) &&
        ['receive', 'adopt'].includes(input.mode) &&
        integer(input.quantity, 1, 100000) &&
        integer(input.expectedAvailable, 0, 100000) &&
        text(input.supplierRef) &&
        text(input.reason) &&
        input.qualityChecked === true &&
        (input.expiresAt === null || integer(input.expiresAt, 1, 9999999999999)) &&
        typeof input.quarantined === 'boolean',
      'invalid_finished_receipt',
    );
    const p = {
      id: input.id,
      sku: input.sku,
      mode: input.mode,
      quantity: input.quantity,
      expectedAvailable: input.expectedAvailable,
      supplierRef: input.supplierRef.trim(),
      reason: input.reason.trim(),
      qualityChecked: true,
      expiresAt: input.expiresAt,
      quarantined: input.quarantined,
      actor,
    };
    const h = await digest(canonical(p));
    const old = await this.s.one(
      'SELECT * FROM finished_lots WHERE store_id=? AND id=?',
      store,
      p.id,
    );
    if (old) {
      requireValue(old.request_hash === h, 'finished_receipt_conflict', 409);
      return { lot: old, replayed: true };
    }
    const delta = p.mode === 'receive' ? p.quantity : 0,
      at = this.s.now();
    try {
      await this.s.db.batch([
        this.s.stmt(
          'UPDATE inventory SET available=available+? WHERE store_id=? AND sku=? AND available=? AND available+?<=100000',
          delta,
          store,
          p.sku,
          p.expectedAvailable,
          delta,
        ),
        this.s.stmt(
          'INSERT INTO finished_lots(store_id,id,sku,assembly_id,received,available,receipt_mode,expires_at,quarantined,supplier_ref,request_hash,actor_ref,created_at) SELECT ?,?,?,NULL,?,?,?,?,?,?,?,?,? WHERE changes()=1',
          store,
          p.id,
          p.sku,
          p.quantity,
          p.quantity,
          p.mode,
          p.expiresAt,
          p.quarantined ? 1 : 0,
          p.supplierRef,
          h,
          actor,
          at,
        ),
        ...this.s.event(
          store,
          'FinishedLotReceived',
          p.id,
          { sku: p.sku, actorRef: actor },
          {
            sql: 'EXISTS(SELECT 1 FROM finished_lots WHERE store_id=? AND id=?)',
            args: [store, p.id],
          },
        ),
      ]);
    } catch (error) {
      const raced = await this.s.one(
        'SELECT * FROM finished_lots WHERE store_id=? AND id=?',
        store,
        p.id,
      );
      if (raced?.request_hash === h) return { lot: raced, replayed: true };
      if (String(error.message).includes('finished_stock_conflict'))
        throw new CommerceError('finished_stock_conflict', 409);
      throw error;
    }
    const lot = await this.s.one(
      'SELECT * FROM finished_lots WHERE store_id=? AND id=?',
      store,
      p.id,
    );
    requireValue(lot, 'finished_stock_conflict', 409);
    return { lot, replayed: false };
  }
  async control(store, env, input, actor) {
    await this.guard(store, env, actor);
    requireValue(
      identifier(input?.id) &&
        identifier(input.sku) &&
        ['adjust', 'quarantine', 'release', 'reconcile'].includes(input.kind) &&
        text(input.reason) &&
        integer(input.expectedAvailable, 0, 100000),
      'invalid_finished_control',
    );
    if (input.kind !== 'reconcile')
      requireValue(
        identifier(input.lotId) &&
          integer(input.expectedVersion, 0) &&
          integer(input.delta, -100000, 100000) &&
          (input.kind === 'adjust' ? input.delta !== 0 : input.delta === 0) &&
          (input.kind !== 'release' || input.qualityChecked === true),
        'invalid_finished_control',
      );
    else requireValue(input.qualityChecked === true, 'finished_quality_required');
    const p = {
        id: input.id,
        sku: input.sku,
        kind: input.kind,
        ...(input.kind === 'reconcile'
          ? {}
          : { lotId: input.lotId, expectedVersion: input.expectedVersion, delta: input.delta }),
        expectedAvailable: input.expectedAvailable,
        qualityChecked: input.qualityChecked === true,
        reason: input.reason.trim(),
        actor,
      },
      h = await digest(canonical(p)),
      at = this.s.now();
    const old = await this.s.one(
      'SELECT request_hash FROM finished_controls WHERE store_id=? AND id=?',
      store,
      input.id,
    );
    if (old) {
      requireValue(old.request_hash === h, 'finished_control_conflict', 409);
      return { replayed: true };
    }
    const statements = [];
    if (input.kind === 'reconcile') {
      requireValue(
        !(await this.s.one(
          "SELECT 1 FROM orders o JOIN order_lines l ON l.store_id=o.store_id AND l.order_id=o.id WHERE l.store_id=? AND l.sku=? AND o.stock_provenance_unknown=1 AND o.stock_state IN ('reserved','allocated') AND o.fulfillment_state IN ('pending','ready','stock_exception') LIMIT 1",
          store,
          input.sku,
        )),
        'finished_legacy_order_unresolved',
        409,
      );
      const row = await this.s.one(
        'SELECT i.available,COALESCE((SELECT SUM(f.available) FROM finished_lots f WHERE f.store_id=i.store_id AND f.sku=i.sku),0) AS tracked FROM inventory i WHERE i.store_id=? AND i.sku=?',
        store,
        input.sku,
      );
      requireValue(
        row && row.available === input.expectedAvailable && row.available === row.tracked,
        'finished_reconciliation_incomplete',
        409,
      );
      statements.push(
        this.s.stmt(
          'UPDATE finished_stock_holds SET held=0 WHERE store_id=? AND sku=? AND EXISTS(SELECT 1 FROM inventory i WHERE i.store_id=? AND i.sku=? AND i.available=? AND i.available=COALESCE((SELECT SUM(f.available) FROM finished_lots f WHERE f.store_id=i.store_id AND f.sku=i.sku),0))',
          store,
          input.sku,
          store,
          input.sku,
          input.expectedAvailable,
        ),
      );
    } else {
      const row = await this.s.one(
        'SELECT * FROM finished_lots WHERE store_id=? AND id=? AND sku=?',
        store,
        input.lotId,
        input.sku,
      );
      requireValue(
        row &&
          row.available === input.expectedAvailable &&
          row.control_version === input.expectedVersion &&
          row.available + input.delta >= 0 &&
          row.available + input.delta <= 100000,
        'finished_state_conflict',
        409,
      );
      statements.push(
        this.s.stmt(
          'UPDATE finished_lots SET available=available+?,quarantined=?,control_version=control_version+1 WHERE store_id=? AND id=? AND sku=? AND available=? AND control_version=?',
          input.delta,
          input.kind === 'quarantine' ? 1 : input.kind === 'release' ? 0 : row.quarantined,
          store,
          input.lotId,
          input.sku,
          input.expectedAvailable,
          input.expectedVersion,
        ),
      );
      if (input.kind === 'adjust')
        statements.push(
          this.s.stmt(
            'UPDATE inventory SET available=available+? WHERE store_id=? AND sku=? AND changes()=1 AND available+? BETWEEN 0 AND 100000',
            input.delta,
            store,
            input.sku,
            input.delta,
          ),
        );
    }
    // A failed CAS must not write a misleading control/audit. The insert trigger
    // added below validates current version/count before admitting the record.
    statements.push(
      this.s.stmt(
        'INSERT INTO finished_controls VALUES(?,?,?,?,?,?,?,?,?,?)',
        store,
        input.id,
        input.kind === 'reconcile' ? null : input.lotId,
        input.sku,
        input.kind,
        h,
        JSON.stringify(p),
        actor,
        p.reason,
        at,
      ),
    );
    statements.push(
      ...this.s.event(store, 'FinishedStockControlled', input.id, {
        sku: input.sku,
        actorRef: actor,
      }),
    );
    try {
      await this.s.db.batch(statements);
    } catch (error) {
      const raced = await this.s.one(
        'SELECT request_hash FROM finished_controls WHERE store_id=? AND id=?',
        store,
        input.id,
      );
      if (raced?.request_hash === h) return { replayed: true };
      if (String(error.message).includes('finished_legacy_order_unresolved'))
        throw new CommerceError('finished_legacy_order_unresolved', 409);
      if (/finished_(state_conflict|reconciliation_incomplete)/.test(String(error.message)))
        throw new CommerceError('finished_state_conflict', 409);
      throw error;
    }
    return { replayed: false };
  }
}
