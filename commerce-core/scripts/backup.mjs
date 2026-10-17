import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NodeDatabase } from '../src/node-db.mjs';
import { NodePrivateStorage } from '../src/node-private-storage.mjs';
import { createNodeBackup, restoreNodeBackup } from '../src/node-backup.mjs';
const [mode, input, keyPath, output, storagePath] = process.argv.slice(2);
if (
  !['create', 'restore'].includes(mode) ||
  !input ||
  !keyPath ||
  !output ||
  (mode === 'create' && !storagePath)
)
  throw new Error(
    'Usage: backup.mjs create DB KEY_FILE OUTPUT_DIRECTORY PRIVATE_STORAGE | restore BACKUP KEY_FILE NEW_DIRECTORY',
  );
const key = new Uint8Array(readFileSync(resolve(keyPath)));
if (mode === 'create') {
  const db = new NodeDatabase(resolve(input));
  try {
    const result = await createNodeBackup(
      db,
      new NodePrivateStorage(resolve(storagePath)),
      resolve(output),
      key,
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    db.close();
  }
} else
  console.log(
    JSON.stringify(
      await restoreNodeBackup(
        JSON.parse(readFileSync(resolve(input), 'utf8')),
        key,
        resolve(output),
      ),
      null,
      2,
    ),
  );
