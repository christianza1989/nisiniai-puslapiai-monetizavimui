import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
// A local adapter for the D1 prepare/bind/batch contract. Runtime parity is tested separately.
export class NodeDatabase {
  constructor(filename = ':memory:') {
    this.db = new DatabaseSync(filename);
    this.db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  }
  migrate() {
    this.db.exec(readFileSync(new URL('../migrations/0001_commerce.sql', import.meta.url), 'utf8'));
  }
  prepare(sql) {
    const statement = this.db.prepare(sql);
    const bound = (args) => ({
      first: async () => statement.get(...args) ?? null,
      all: async () => ({ results: statement.all(...args) }),
      run: async () => ({ success: true, meta: { changes: statement.run(...args).changes } }),
      _run: () => statement.run(...args),
    });
    return { bind: (...args) => bound(args), ...bound([]) };
  }
  async batch(statements) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const results = statements.map((s) => ({
        success: true,
        meta: { changes: s._run().changes },
      }));
      this.db.exec('COMMIT');
      return results;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  close() {
    this.db.close();
  }
}
