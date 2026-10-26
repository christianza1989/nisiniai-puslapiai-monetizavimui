import {
  CommerceError,
  requireValue,
  integer,
  identifier,
  canonical,
  digest,
} from './validation.mjs';

export function normalizeDiscountCode(value) {
  if (value === undefined || value === null || value === '') return undefined;
  requireValue(typeof value === 'string' && value.length <= 80, 'invalid_discount_code');
  const code = value.trim().toUpperCase();
  requireValue(/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(code), 'invalid_discount_code');
  return code;
}
const nullableTime = (value) => (value === undefined || value === null ? null : value);
export function discountDefinition(input) {
  requireValue(input && typeof input === 'object' && !Array.isArray(input), 'invalid_discount');
  const startsAt = nullableTime(input.startsAt),
    endsAt = nullableTime(input.endsAt),
    maxUses = input.maxUses ?? null;
  requireValue(
    identifier(input.id) &&
      identifier(input.commandId) &&
      integer(input.expectedVersion, 0, 1000000) &&
      ['percent', 'fixed'].includes(input.kind) &&
      typeof input.enabled === 'boolean' &&
      integer(input.value, 1, input.kind === 'percent' ? 99 : 100000000) &&
      integer(input.minimumSubtotal ?? 0, 0) &&
      [startsAt, endsAt].every((t) => t === null || integer(t, 0, 8640000000000000)) &&
      (endsAt === null || startsAt === null || endsAt > startsAt) &&
      (maxUses === null || integer(maxUses, 1, 1000000)),
    'invalid_discount',
  );
  const code = normalizeDiscountCode(input.code);
  requireValue(code, 'invalid_discount_code');
  return {
    id: input.id,
    code,
    kind: input.kind,
    value: input.value,
    currency: 'EUR',
    enabled: input.enabled,
    minimumSubtotal: input.minimumSubtotal ?? 0,
    startsAt,
    endsAt,
    maxUses,
  };
}
export function allocateDiscount(lines, amount) {
  const subtotal = lines.reduce((n, l) => n + l.lineAmount, 0);
  requireValue(
    integer(subtotal, 1) && integer(amount, 1) && amount < subtotal,
    'discount_basket_too_small',
    409,
  );
  const divisor = BigInt(subtotal),
    shares = lines.map((line, index) => {
      const scaled = BigInt(line.lineAmount) * BigInt(amount);
      return { index, amount: Number(scaled / divisor), remainder: scaled % divisor };
    });
  let remaining = amount - shares.reduce((n, s) => n + s.amount, 0);
  for (const share of [...shares].sort((a, b) =>
    a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
  )) {
    if (!remaining) break;
    share.amount++;
    remaining--;
  }
  return lines.map((line, index) => ({
    ...line,
    discountAmount: shares[index].amount,
    netLineAmount: line.lineAmount - shares[index].amount,
  }));
}
// Split at most twice per cart line to preserve exact cents AND actual quantities
// for Stripe and analytics. The existing cart limit20 keeps this below100 items.
export function settledLines(snapshot) {
  const lines = snapshot.lines;
  if (!snapshot.discount) return lines;
  requireValue(
    Array.isArray(lines) && lines.length > 0 && lines.length <= 20,
    'invalid_discount_snapshot',
  );
  let discountSum = 0;
  const result = lines.flatMap((line) => {
    requireValue(
      integer(line.unitAmount, 1) &&
        integer(line.quantity, 1, 100) &&
        line.lineAmount === line.unitAmount * line.quantity,
      'invalid_discount_snapshot',
    );
    if (!snapshot.discount) return [line];
    requireValue(
      integer(line.discountAmount, 0) &&
        line.discountAmount <= line.lineAmount &&
        line.netLineAmount === line.lineAmount - line.discountAmount,
      'invalid_discount_snapshot',
    );
    discountSum += line.discountAmount;
    const low = Math.floor(line.netLineAmount / line.quantity),
      highCount = line.netLineAmount % line.quantity;
    return [
      [low, line.quantity - highCount],
      [low + 1, highCount],
    ]
      .filter(([, quantity]) => quantity > 0)
      .map(([unitAmount, quantity]) => ({
        ...line,
        unitAmount,
        quantity,
        lineAmount: unitAmount * quantity,
      }));
  });
  if (snapshot.discount)
    requireValue(
      integer(snapshot.discount.amount, 1) && discountSum === snapshot.discount.amount,
      'invalid_discount_snapshot',
    );
  return result;
}
const view = (row) => ({
  id: row.id,
  code: row.code,
  kind: row.kind,
  value: row.value,
  currency: row.currency,
  enabled: row.enabled === 1,
  minimumSubtotal: row.minimum_subtotal,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  maxUses: row.max_uses,
  uses: row.uses,
  version: row.version,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
export class Discounts {
  constructor(service) {
    this.s = service;
  }
  async list(store, environment) {
    await this.s.store(store, environment);
    return (
      await this.s.rows(
        'SELECT * FROM discount_codes WHERE store_id=? ORDER BY updated_at DESC,id LIMIT 1000',
        store,
      )
    ).map(view);
  }
  async save(store, environment, input, actor) {
    await this.s.store(store, environment);
    requireValue(identifier(actor), 'operator_forbidden', 403);
    const definition = discountDefinition(input),
      hash = await digest(canonical({ definition, expectedVersion: input.expectedVersion }));
    const prior = await this.s.one(
      'SELECT * FROM discount_code_changes WHERE store_id=? AND id=?',
      store,
      input.commandId,
    );
    if (prior) {
      requireValue(prior.payload_hash === hash, 'discount_save_conflict', 409);
      return {
        discount: view(
          await this.s.one(
            'SELECT * FROM discount_codes WHERE store_id=? AND id=?',
            store,
            definition.id,
          ),
        ),
        replayed: true,
      };
    }
    const at = this.s.now();
    try {
      await this.s.db.batch([
        this.s.stmt(
          'INSERT INTO discount_code_changes(store_id,id,discount_id,expected_version,definition_json,payload_hash,actor_id,created_at) VALUES(?,?,?,?,?,?,?,?)',
          store,
          input.commandId,
          definition.id,
          input.expectedVersion,
          JSON.stringify(definition),
          hash,
          actor,
          at,
        ),
        ...this.s.event(store, 'DiscountCodeChanged', input.commandId, {
          discountId: definition.id,
          actor,
        }),
      ]);
    } catch (error) {
      const again = await this.s.one(
        'SELECT payload_hash FROM discount_code_changes WHERE store_id=? AND id=?',
        store,
        input.commandId,
      );
      if (again) {
        requireValue(again.payload_hash === hash, 'discount_save_conflict', 409);
        return {
          discount: view(
            await this.s.one(
              'SELECT * FROM discount_codes WHERE store_id=? AND id=?',
              store,
              definition.id,
            ),
          ),
          replayed: true,
        };
      }
      for (const code of ['discount_version_conflict', 'discount_limit_below_uses'])
        if (String(error.message).includes(code)) throw new CommerceError(code, 409);
      if (
        /UNIQUE constraint failed: discount_codes.store_id, discount_codes.code/.test(
          String(error.message),
        )
      )
        throw new CommerceError('discount_code_exists', 409);
      throw error;
    }
    return {
      discount: view(
        await this.s.one(
          'SELECT * FROM discount_codes WHERE store_id=? AND id=?',
          store,
          definition.id,
        ),
      ),
      replayed: false,
    };
  }
  async price(store, environment, input, priced, market) {
    const code = normalizeDiscountCode(input.discountCode);
    if (!code) return { lines: priced };
    const config = await this.s.store(store, environment),
      row = await this.s.one(
        'SELECT * FROM discount_codes WHERE store_id=? AND code=?',
        store,
        code,
      ),
      at = this.s.now();
    requireValue(
      config.environment === environment &&
        row &&
        row.enabled === 1 &&
        row.currency === market.currency &&
        (row.starts_at === null || row.starts_at <= at) &&
        (row.ends_at === null || row.ends_at > at) &&
        (row.max_uses === null || row.uses < row.max_uses),
      'discount_unavailable',
      409,
    );
    const subtotal = priced.reduce((n, l) => n + l.lineAmount, 0);
    requireValue(subtotal >= row.minimum_subtotal, 'discount_minimum_not_met', 409);
    const amount = row.kind === 'fixed' ? row.value : Math.round((subtotal * row.value) / 100);
    const lines = allocateDiscount(priced, amount);
    return {
      lines,
      discount: {
        id: row.id,
        version: row.version,
        code: row.code,
        kind: row.kind,
        value: row.value,
        amount,
        currency: row.currency,
      },
    };
  }
  async preview(store, environment, input) {
    requireValue(input && typeof input === 'object' && !Array.isArray(input), 'invalid_payload');
    requireValue(normalizeDiscountCode(input.code), 'invalid_discount_code');
    const { priced, market } = await this.s.cartPricing(store, environment, input);
    const result = await this.price(
        store,
        environment,
        { discountCode: input.code },
        priced,
        market,
      ),
      subtotal = priced.reduce((n, l) => n + l.lineAmount, 0);
    return {
      currency: market.currency,
      subtotal,
      amount: subtotal - result.discount.amount,
      lines: result.lines,
      discount: { code: result.discount.code, amount: result.discount.amount },
    };
  }
  reservation(store, snapshot, orderId, at) {
    const d = snapshot.discount;
    if (!d) return [];
    return [
      this.s.stmt(
        'INSERT INTO order_discounts(store_id,order_id,discount_id,version,code,amount,created_at) VALUES(?,?,?,?,?,?,?)',
        store,
        orderId,
        d.id,
        d.version,
        d.code,
        d.amount,
        at,
      ),
    ];
  }
}
