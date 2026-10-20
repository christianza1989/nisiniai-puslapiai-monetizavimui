import { backup, DatabaseSync } from 'node:sqlite';
import { readFile, writeFile, mkdir, mkdtemp, unlink, rmdir, lstat } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import { requireValue, canonical, digest } from './validation.mjs';
import { hashBytes } from './private-storage.mjs';
import { NodePrivateStorage } from './node-private-storage.mjs';
const MAX_BACKUP = 256 * 1024 * 1024;
const keyFor = async (bytes) => {
  requireValue(bytes instanceof Uint8Array && bytes.length === 32, 'backup_key_invalid');
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
};
export async function encryptBackup(payload, keyBytes) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  requireValue(bytes.length <= MAX_BACKUP, 'backup_too_large');
  const iv = randomBytes(12),
    key = await keyFor(keyBytes),
    ciphertext = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode('commerce-backup-v1') },
        key,
        bytes,
      ),
    );
  return {
    version: 1,
    algorithm: 'AES-256-GCM',
    iv: iv.toString('base64'),
    ciphertext: Buffer.from(ciphertext).toString('base64'),
  };
}
export async function decryptBackup(envelope, keyBytes) {
  requireValue(
    envelope?.version === 1 &&
      envelope.algorithm === 'AES-256-GCM' &&
      typeof envelope.ciphertext === 'string' &&
      envelope.ciphertext.length <= MAX_BACKUP * 1.4 &&
      typeof envelope.iv === 'string',
    'backup_invalid',
  );
  const iv = Buffer.from(envelope.iv, 'base64');
  requireValue(iv.length === 12, 'backup_invalid');
  try {
    return JSON.parse(
      new TextDecoder().decode(
        await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode('commerce-backup-v1') },
          await keyFor(keyBytes),
          Buffer.from(envelope.ciphertext, 'base64'),
        ),
      ),
    );
  } catch {
    throw new Error('backup_authentication_failed');
  }
}
function facts(db) {
  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all()
    .map((r) => r.name);
  requireValue(
    tables.every((n) => /^[a-z_]+$/.test(n)),
    'backup_schema_invalid',
  );
  const counts = Object.fromEntries(
    tables.map((n) => [n, db.prepare('SELECT COUNT(*) n FROM ' + n).get().n]),
  );
  const inventory = db
    .prepare('SELECT store_id,sku,available FROM inventory ORDER BY store_id,sku')
    .all();
  const journal = db
    .prepare(
      'SELECT store_id,currency,COUNT(*) entries FROM journal_entries GROUP BY store_id,currency ORDER BY store_id,currency',
    )
    .all();
  return { counts, inventory, journal };
}
export async function createNodeBackup(database, storage, directory, keyBytes) {
  const root = resolve(directory);
  await mkdir(root, { recursive: true });
  requireValue(!(await lstat(root)).isSymbolicLink(), 'backup_path_invalid');
  const scratch = await mkdtemp(join(root, 'snapshot-')),
    snapshotPath = join(scratch, 'snapshot.sqlite');
  requireValue(snapshotPath.startsWith(root + sep), 'backup_path_invalid');
  await backup(database.db, snapshotPath);
  let snapshot;
  try {
    snapshot = new DatabaseSync(snapshotPath, { readOnly: true });
    requireValue(
      snapshot.prepare('PRAGMA integrity_check').get().integrity_check === 'ok',
      'backup_database_invalid',
    );
    const databaseBytes = new Uint8Array(await readFile(snapshotPath)),
      privateFiles = [];
    for (const file of snapshot
      .prepare(
        'SELECT storage_key,content_hash,byte_length FROM private_files ORDER BY storage_key',
      )
      .all()) {
      const bytes = await storage.get(file.storage_key);
      requireValue(
        bytes.length === file.byte_length && (await hashBytes(bytes)) === file.content_hash,
        'backup_file_integrity_failed',
      );
      privateFiles.push({
        key: file.storage_key,
        hash: file.content_hash,
        size: file.byte_length,
        data: Buffer.from(bytes).toString('base64'),
      });
    }
    const payload = {
      version: 1,
      createdAt: Date.now(),
      database: {
        hash: await hashBytes(databaseBytes),
        data: Buffer.from(databaseBytes).toString('base64'),
      },
      privateFiles,
      facts: facts(snapshot),
    };
    const envelope = await encryptBackup(payload, keyBytes),
      output = join(root, 'commerce-' + crypto.randomUUID() + '.backup.json');
    await writeFile(output, JSON.stringify(envelope), { flag: 'wx', mode: 0o600 });
    return {
      path: output,
      databaseHash: payload.database.hash,
      facts: payload.facts,
      privateFileCount: privateFiles.length,
    };
  } finally {
    snapshot?.close();
    await unlink(snapshotPath);
    await rmdir(scratch);
  }
}
export async function restoreNodeBackup(envelope, keyBytes, targetDirectory) {
  const payload = await decryptBackup(envelope, keyBytes);
  requireValue(
    payload.version === 1 &&
      payload.database &&
      Array.isArray(payload.privateFiles) &&
      payload.privateFiles.length <= 100000 &&
      payload.facts,
    'backup_invalid',
  );
  const bytes = Buffer.from(payload.database.data, 'base64');
  requireValue(
    bytes.length <= MAX_BACKUP &&
      (await hashBytes(bytes)) === payload.database.hash &&
      bytes.subarray(0, 16).toString() === 'SQLite format 3\0',
    'backup_database_invalid',
  );
  const root = resolve(targetDirectory);
  // Refuse even an existing empty directory: each restore gets a new candidate.
  await mkdir(root, { recursive: false });
  const target = join(root, 'commerce.sqlite');
  await writeFile(target, bytes, { flag: 'wx', mode: 0o600 });
  const db = new DatabaseSync(target);
  try {
    requireValue(
      db.prepare('PRAGMA integrity_check').get().integrity_check === 'ok' &&
        db.prepare('PRAGMA foreign_key_check').all().length === 0 &&
        (await digest(canonical(facts(db)))) === (await digest(canonical(payload.facts))),
      'backup_restore_facts_mismatch',
    );
    const files = db
      .prepare(
        'SELECT storage_key,content_hash,byte_length FROM private_files ORDER BY storage_key',
      )
      .all();
    requireValue(
      files.length === payload.privateFiles.length &&
        new Set(payload.privateFiles.map((f) => f.key)).size === files.length,
      'backup_restore_files_mismatch',
    );
    const storage = new NodePrivateStorage(join(root, 'private-files'));
    for (const file of files) {
      const input = payload.privateFiles.find((f) => f.key === file.storage_key);
      requireValue(
        input && input.hash === file.content_hash && input.size === file.byte_length,
        'backup_restore_files_mismatch',
      );
      const content = new Uint8Array(Buffer.from(input.data, 'base64'));
      requireValue(
        content.length === file.byte_length && (await hashBytes(content)) === file.content_hash,
        'backup_file_integrity_failed',
      );
      await storage.put(file.storage_key, content, file.content_hash, 'application/pdf');
    }
    // A snapshot cannot prove that a provider action did not happen after it.
    // Restored stores therefore remain disabled until read-only provider and
    // finance reconciliation; no automatic booking/payment replay on restart.
    for (const store of db.prepare('SELECT id,config_json FROM stores').all()) {
      const config = JSON.parse(store.config_json);
      config.enabled = false;
      db.prepare('UPDATE stores SET config_json=? WHERE id=?').run(
        JSON.stringify(config),
        store.id,
      );
    }
    await writeFile(
      join(root, 'RESTORE_VERIFIED.json'),
      JSON.stringify(
        {
          version: 1,
          restoredAt: Date.now(),
          sourceDatabaseHash: payload.database.hash,
          facts: payload.facts,
          privateFileCount: files.length,
          activated: false,
          allStoresDisabled: true,
        },
        null,
        2,
      ),
      { flag: 'wx', mode: 0o600 },
    );
    return {
      databasePath: target,
      privateStoragePath: join(root, 'private-files'),
      facts: payload.facts,
      privateFileCount: files.length,
      activated: false,
    };
  } finally {
    db.close();
  }
}
