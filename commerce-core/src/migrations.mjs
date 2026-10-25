import { requireValue, digest } from './validation.mjs';

// Each migration contains complete statements. A trigger body remains one statement.
export function migrationStatements(source) {
  const statements = [];
  let current = '',
    trigger = false;
  for (const line of source.split(/\r?\n/)) {
    if (!line.trim() || (!current && /^\s*--/.test(line))) continue;
    if (!current) trigger = /^CREATE TRIGGER/i.test(line);
    current += line + '\n';
    if ((trigger && /^END;\s*$/.test(line)) || (!trigger && /;\s*$/.test(line))) {
      statements.push(current);
      current = '';
    }
  }
  requireValue(current === '', 'migration_incomplete', 500);
  return statements;
}

export async function applyMigrations(db, sources) {
  await db
    .prepare(
      'CREATE TABLE IF NOT EXISTS commerce_migrations (name TEXT PRIMARY KEY, content_hash TEXT NOT NULL)',
    )
    .run();
  for (const { name, source } of [...sources].sort((a, b) => a.name.localeCompare(b.name))) {
    requireValue(/^\d{4}_[a-z_]+\.sql$/.test(name), 'migration_name_invalid', 500);
    const contentHash = await digest(source.replaceAll('\r\n', '\n'));
    const prior = await db
      .prepare('SELECT content_hash FROM commerce_migrations WHERE name=?')
      .bind(name)
      .first();
    if (prior) {
      requireValue(prior.content_hash === contentHash, 'migration_changed', 500);
      continue;
    }
    await db.batch([
      ...migrationStatements(source).map((sql) => db.prepare(sql)),
      db.prepare('INSERT INTO commerce_migrations VALUES(?,?)').bind(name, contentHash),
    ]);
  }
}
