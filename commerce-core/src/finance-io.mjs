import { requireValue, identifier, integer, digest, canonical } from './validation.mjs';
import { Backoffice } from './backoffice.mjs';
export function csvRows(source) {
  requireValue(
    typeof source === 'string' && source.length <= 50000 && !source.includes('\0'),
    'financial_csv_invalid',
  );
  if (source.startsWith('\uFEFF')) source = source.slice(1);
  const rows = [];
  let row = [],
    cell = '',
    quoted = false,
    closed = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
      continue;
    }
    if (c === '"') {
      requireValue(cell === '' && !closed, 'financial_csv_invalid');
      quoted = true;
    } else if (c === ',') {
      row.push(cell);
      cell = '';
      closed = false;
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && source[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
      cell = '';
      closed = false;
    } else {
      requireValue(!closed, 'financial_csv_invalid');
      cell += c;
    }
  }
  requireValue(!quoted, 'financial_csv_invalid');
  row.push(cell);
  if (row.some((x) => x !== '')) rows.push(row);
  requireValue(
    rows.length >= 2 &&
      rows.length <= 101 &&
      rows[0].length <= 30 &&
      new Set(rows[0]).size === rows[0].length &&
      rows.every((r) => r.length === rows[0].length),
    'financial_csv_invalid',
  );
  return rows;
}
export function financialCsv(source, mapping) {
  const [headers, ...rows] = csvRows(source);
  const required = ['reference', 'kind', 'currency', 'amount', 'occurredAt'];
  requireValue(
    mapping &&
      required.every((k) => typeof mapping[k] === 'string' && headers.includes(mapping[k])) &&
      (!mapping.transactionRef || headers.includes(mapping.transactionRef)),
    'financial_csv_mapping_invalid',
  );
  return rows.map((row) => {
    const get = (key) => row[headers.indexOf(mapping[key])];
    const amount = get('amount'),
      date = get('occurredAt');
    requireValue(['EUR', 'PLN'].includes(get('currency')), 'financial_csv_currency_not_supported');
    requireValue(
      /^-?\d{1,8}(?:\.\d{1,2})?$/.test(amount) &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(date),
      'financial_csv_value_invalid',
    );
    const at = Date.parse(date),
      [whole, decimal = ''] = amount.replace('-', '').split('.');
    const cents =
      (Number(whole) * 100 + Number(decimal.padEnd(2, '0'))) * (amount.startsWith('-') ? -1 : 1);
    requireValue(
      Number.isFinite(at) &&
        new Date(at).toISOString() === date.replace(/Z$/, date.includes('.') ? 'Z' : '.000Z') &&
        integer(cents, -100000000, 100000000) &&
        cents !== 0,
      'financial_csv_value_invalid',
    );
    return {
      reference: get('reference'),
      kind: get('kind'),
      currency: get('currency'),
      amount: cents,
      occurredAt: at,
      transactionRef: mapping.transactionRef ? get('transactionRef') || null : null,
    };
  });
}
const csvCell = (value) => {
  let s = String(value ?? '');
  if (typeof value === 'string' && /^[\s]*[=+\-@]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
};
export function exportCsv(columns, rows) {
  return (
    [
      columns.map(csvCell).join(','),
      ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(',')),
    ].join('\r\n') + '\r\n'
  );
}
export class FinanceIO {
  constructor(service) {
    this.s = service;
    this.backoffice = new Backoffice(service);
  }
  async importStripe(store, env, input, adapter, actor) {
    const config = await this.s.store(store, env);
    requireValue(
      identifier(actor) &&
        adapter?.environment === env &&
        adapter.accountRef === config.paymentAccountRef &&
        adapter.financialPage,
      'financial_provider_not_connected',
      503,
    );
    const page = await adapter.financialPage(input || {});
    requireValue(
      page.environment === env &&
        page.accountRef === config.paymentAccountRef &&
        Array.isArray(page.rows) &&
        page.rows.length <= 80,
      'stripe_financial_response_invalid',
      502,
    );
    const origin = 'stripe_' + (await digest(page.accountRef)).slice(0, 24),
      text = JSON.stringify(page),
      contentHash = await digest(text),
      id = await digest(canonical({ origin, contentHash }));
    await this.s
      .stmt(
        'INSERT OR IGNORE INTO financial_import_files VALUES(?,?,?,?,?,?,?,?)',
        store,
        id,
        origin,
        contentHash,
        text,
        JSON.stringify({
          format: 'stripe_balance_v1',
          environment: env,
          accountRef: page.accountRef,
        }),
        actor,
        this.s.now(),
      )
      .run();
    const result = page.rows.length
      ? await this.backoffice.importSources(store, env, { origin, rows: page.rows }, actor)
      : { imported: 0, replayed: true };
    return { ...result, fileId: id, next: page.next, complete: page.complete };
  }
  async import(store, env, input, actor) {
    await this.s.store(store, env);
    requireValue(identifier(actor) && identifier(input?.origin), 'invalid_financial_import');
    const rows = financialCsv(input.text, input.mapping),
      contentHash = await digest(input.text),
      id = await digest(canonical({ origin: input.origin, contentHash, mapping: input.mapping }));
    const old = await this.s.one(
      'SELECT id FROM financial_import_files WHERE store_id=? AND id=?',
      store,
      id,
    );
    if (!old)
      await this.s
        .stmt(
          'INSERT OR IGNORE INTO financial_import_files VALUES(?,?,?,?,?,?,?,?)',
          store,
          id,
          input.origin,
          contentHash,
          input.text,
          JSON.stringify(input.mapping),
          actor,
          this.s.now(),
        )
        .run();
    // Original bytes survive even a later normalization/import failure. A retry
    // imports the same immutable source file and the existing deduplicated rows.
    const result = await this.backoffice.importSources(
      store,
      env,
      { origin: input.origin, rows },
      actor,
    );
    return { fileId: id, contentHash, ...result };
  }
  async original(store, env, id) {
    await this.s.store(store, env);
    requireValue(identifier(id), 'financial_file_not_found', 404);
    const file = await this.s.one(
      'SELECT id,raw_text,content_hash,mapping_json FROM financial_import_files WHERE store_id=? AND id=?',
      store,
      id,
    );
    requireValue(file, 'financial_file_not_found', 404);
    return { ...file, mapping: JSON.parse(file.mapping_json) };
  }
  async export(store, env, kind, { from, to } = {}) {
    await this.s.store(store, env);
    const sources = {
      financials: [
        'SELECT origin,reference,kind,currency,amount,transaction_ref,occurred_at FROM financial_sources WHERE store_id=? ORDER BY occurred_at,id LIMIT 10001',
        ['origin', 'reference', 'kind', 'currency', 'amount', 'transaction_ref', 'occurred_at'],
      ],
      documents: [
        'SELECT id,order_id,kind,series,year,number,payload_hash,created_at FROM documents WHERE store_id=? ORDER BY created_at,id LIMIT 10001',
        ['id', 'order_id', 'kind', 'series', 'year', 'number', 'payload_hash', 'created_at'],
      ],
      journals: [
        'SELECT e.source_id,e.currency,l.account,l.debit,l.credit,e.created_at FROM journal_entries e JOIN journal_lines l ON l.store_id=e.store_id AND l.entry_id=e.id WHERE e.store_id=? ORDER BY e.created_at,e.id,l.line_number LIMIT 10001',
        ['source_id', 'currency', 'account', 'debit', 'credit', 'created_at'],
      ],
    };
    requireValue(sources[kind], 'financial_export_invalid');
    requireValue(
      (from === undefined && to === undefined) ||
        (Number.isSafeInteger(from) &&
          Number.isSafeInteger(to) &&
          from >= 0 &&
          to > from &&
          to <= 8640000000000000),
      'financial_export_period_invalid',
    );
    let [sql, columns] = sources[kind];
    const args = [store];
    if (from !== undefined) {
      const column =
        kind === 'financials' ? 'occurred_at' : kind === 'journals' ? 'e.created_at' : 'created_at';
      sql = sql.replace(' ORDER BY', ' AND ' + column + '>=? AND ' + column + '<? ORDER BY');
      args.push(from, to);
    }
    const rows = await this.s.rows(sql, ...args);
    requireValue(rows.length <= 10000, 'financial_export_requires_period');
    return {
      filename: kind + '.csv',
      text: exportCsv(columns, rows),
      rows: rows.length,
      amountUnit: 'minor_currency_units',
    };
  }
}
