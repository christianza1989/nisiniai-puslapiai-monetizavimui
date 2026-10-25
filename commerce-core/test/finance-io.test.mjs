import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { csvRows, financialCsv, exportCsv, FinanceIO } from '../src/finance-io.mjs';
import { fixtureStore, fixtureProducts } from './fixtures.mjs';
const mapping = Object.fromEntries(
  ['reference', 'kind', 'currency', 'amount', 'occurredAt', 'transactionRef'].map((k) => [k, k]),
);
const header = 'reference,kind,currency,amount,occurredAt,transactionRef\r\n';
const csv = header + 'bank_1,bank,EUR,31.10,2026-10-12T10:00:00Z,po_fixture\r\n';
test('CSV parsing handles quoted newlines/BOM and exact signed decimal amounts without locale/date guessing', () => {
  assert.deepEqual(csvRows('\uFEFFa,b\n"line\nsecond","double""quote"'), [
    ['a', 'b'],
    ['line\nsecond', 'double"quote'],
  ]);
  assert.equal(financialCsv(csv, mapping)[0].amount, 3110);
  for (const invalid of [
    csv.replace('31.10', '31,10'),
    csv.replace('31.10', '1e3'),
    csv.replace('2026-10-12T10:00:00Z', '2026-02-30T10:00:00Z'),
    csv.replace('2026-10-12T10:00:00Z', '12/10/2026'),
  ])
    assert.throws(() => financialCsv(invalid, mapping));
  assert.match(
    exportCsv(['reference', 'amount'], [{ reference: '=HYPERLINK("x")', amount: -100 }]),
    /"'=HYPERLINK/,
  );
  assert.match(exportCsv(['amount'], [{ amount: -100 }]), /"-100"/);
});
test('financial CSV source archive and normalized rows replay immutably with isolated private exports', async () => {
  const db = new NodeDatabase();
  db.migrate();
  const s = new CommerceService(db);
  await s.provisionStore(fixtureStore(), fixtureProducts());
  await s.provisionStore(fixtureStore('store_b'), fixtureProducts());
  const io = new FinanceIO(s),
    result = await io.import(
      'store_a',
      'sandbox',
      { origin: 'bank_fixture', text: csv, mapping },
      'operator',
    );
  const replay = await io.import(
    'store_a',
    'sandbox',
    { origin: 'bank_fixture', text: csv, mapping },
    'operator',
  );
  assert.equal(result.fileId, replay.fileId);
  assert.equal((await s.one('SELECT COUNT(*) n FROM financial_sources')).n, 1);
  assert.equal((await s.one('SELECT COUNT(*) n FROM financial_import_files')).n, 1);
  await assert.rejects(
    io.import(
      'store_a',
      'sandbox',
      { origin: 'bank_fixture', text: csv.replace('31.10', '32.10'), mapping },
      'operator',
    ),
    /financial_source_conflict/,
  );
  assert.match((await io.export('store_a', 'sandbox', 'financials')).text, /bank_1/);
  assert.equal((await io.original('store_a', 'sandbox', result.fileId)).raw_text, csv);
  assert.equal(
    (
      await io.export('store_a', 'sandbox', 'financials', {
        from: Date.parse('2026-10-12T00:00:00Z'),
        to: Date.parse('2026-10-13T00:00:00Z'),
      })
    ).rows,
    1,
  );
  assert.equal((await io.export('store_a', 'sandbox', 'financials', { from: 0, to: 1 })).rows, 0);
  await assert.rejects(
    io.original('store_b', 'sandbox', result.fileId),
    /financial_file_not_found/,
  );
  assert.doesNotMatch((await io.export('store_b', 'sandbox', 'financials')).text, /bank_1/);
  assert.equal((await io.export('store_a', 'sandbox', 'documents')).rows, 0);
  assert.equal((await io.export('store_a', 'sandbox', 'journals')).rows, 0);
  await assert.rejects(
    s.stmt("UPDATE financial_import_files SET raw_text='changed'").run(),
    /financial_file_immutable/,
  );
  db.close();
});
