import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { NodeDatabase } from '../src/node-db.mjs';
import { NodePrivateStorage } from '../src/node-private-storage.mjs';
import { CommerceService } from '../src/service.mjs';
import { PrivateFiles } from '../src/private-storage.mjs';
import { createNodeBackup, restoreNodeBackup, decryptBackup } from '../src/node-backup.mjs';
import { fixtureStore, fixtureProducts, cart, key } from './fixtures.mjs';
test('encrypted exact SQLite/attachment backup restores a new candidate without retriggering stock or overwriting data', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'commerce-backup-'));
  let db, restored;
  try {
    db = new NodeDatabase(join(directory, 'source.sqlite'));
    db.migrate();
    const s = new CommerceService(db);
    await s.provisionStore(fixtureStore(), fixtureProducts());
    const { order } = await s.createOrder('store_a', 'sandbox', cart(), key(1));
    const vault = new NodePrivateStorage(join(directory, 'files'));
    await new PrivateFiles(s, vault).put(
      'store_a',
      'sandbox',
      order.id,
      {
        id: 'fixture_file',
        filename: 'fixture.pdf',
        bytes: new TextEncoder().encode('%PDF-1.7\nfixture'),
      },
      'operator',
    );
    const secret = randomBytes(32),
      backup = await createNodeBackup(db, vault, join(directory, 'backups'), secret),
      envelope = JSON.parse(await readFile(backup.path, 'utf8'));
    assert.equal((await readFile(backup.path, 'utf8')).includes('Test couple kit'), false);
    await assert.rejects(decryptBackup(envelope, randomBytes(32)), /backup_authentication_failed/);
    const target = join(directory, 'restored'),
      result = await restoreNodeBackup(envelope, secret, target);
    assert.equal(result.activated, false);
    restored = new NodeDatabase(result.databasePath);
    restored.migrate();
    const recovered = new CommerceService(restored);
    await assert.rejects(recovered.getOrder('store_a', 'sandbox', order.id), /store_disabled/);
    assert.equal(
      (await recovered.one('SELECT amount FROM orders WHERE id=?', order.id)).amount,
      3200,
    );
    assert.equal(
      (await recovered.one("SELECT available FROM inventory WHERE sku='couple'")).available,
      4,
    );
    // Explicit fixture-only re-admission checks the recovered download path.
    const cfg = JSON.parse((await recovered.one('SELECT config_json FROM stores')).config_json);
    cfg.enabled = true;
    await recovered.stmt('UPDATE stores SET config_json=?', JSON.stringify(cfg)).run();
    assert.equal(
      (
        await new PrivateFiles(recovered, new NodePrivateStorage(result.privateStoragePath)).get(
          'store_a',
          'sandbox',
          'fixture_file',
        )
      ).bytes.length,
      16,
    );
    await assert.rejects(restoreNodeBackup(envelope, secret, target), /EEXIST/);
    const changed = {
      ...envelope,
      ciphertext: (envelope.ciphertext[0] === 'A' ? 'B' : 'A') + envelope.ciphertext.slice(1),
    };
    await assert.rejects(decryptBackup(changed, secret), /backup_authentication_failed/);
  } finally {
    restored?.close();
    db?.close();
    assert.ok(directory.startsWith(join(tmpdir(), 'commerce-backup-')));
    await rm(directory, { recursive: true });
  }
});
