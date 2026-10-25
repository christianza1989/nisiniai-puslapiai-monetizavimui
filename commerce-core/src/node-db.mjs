import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { migrationStatements } from './migrations.mjs';
import { createHash } from 'node:crypto';
// A local adapter for the D1 prepare/bind/batch contract. Runtime parity is tested separately.
export class NodeDatabase {
  constructor(filename = ':memory:') {
    this.db = new DatabaseSync(filename);
    this.db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  }
  migrate() {
    this.db.exec(
      'CREATE TABLE IF NOT EXISTS commerce_migrations (name TEXT PRIMARY KEY, content_hash TEXT NOT NULL)',
    );
    const directory = new URL('../migrations/', import.meta.url);
    for (const name of readdirSync(directory)
      .filter((n) => /^\d{4}_[a-z_]+\.sql$/.test(n))
      .sort()) {
      const source = readFileSync(new URL(name, directory), 'utf8').replaceAll('\r\n', '\n');
      const contentHash = createHash('sha256').update(source).digest('hex');
      const old = this.db
        .prepare('SELECT content_hash FROM commerce_migrations WHERE name=?')
        .get(name);
      if (old) {
        if (old.content_hash !== contentHash) throw new Error('migration_changed');
        continue;
      }
      this.db.exec('BEGIN IMMEDIATE');
      try {
        for (const sql of migrationStatements(source)) this.db.exec(sql);
        this.db.prepare('INSERT INTO commerce_migrations VALUES(?,?)').run(name, contentHash);
        this.db.exec('COMMIT');
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
      }
    }
  }
  prepare(sql) {
    const statement = () => this.db.prepare(sql);
    const bound = (args) => ({
      first: async () => statement().get(...args) ?? null,
      all: async () => ({ results: statement().all(...args) }),
      run: async () => ({ success: true, meta: { changes: statement().run(...args).changes } }),
      _run: () => statement().run(...args),
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
