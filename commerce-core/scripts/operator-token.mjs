import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { digest, identifier, requireValue } from '../src/validation.mjs';
const storeId = process.argv[2] || 'store_a';
requireValue(identifier(storeId), 'invalid_store');
const token = randomBytes(32).toString('base64url');
const path = new URL('../runtime/operators.json', import.meta.url);
mkdirSync(new URL('../runtime/', import.meta.url), { recursive: true });
let records = [];
try {
  records = JSON.parse(readFileSync(path, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
records = records.filter((r) => r.expiresAt > Date.now());
records.push({
  id: 'local_' + crypto.randomUUID(),
  storeId,
  tokenHash: await digest(token),
  permissions: [
    'read',
    'stock',
    'document',
    'pack',
    'ship',
    'finance',
    'wholesale',
    'refund',
    'operate',
  ],
  expiresAt: Date.now() + 8 * 3600000,
});
writeFileSync(path, JSON.stringify(records, null, 2) + '\n', { mode: 0o600 });
console.log(
  'Vietinis 8 valandų operatoriaus žetonas (' +
    storeId +
    '). Įveskite /admin prisijungime:\n' +
    token,
);
