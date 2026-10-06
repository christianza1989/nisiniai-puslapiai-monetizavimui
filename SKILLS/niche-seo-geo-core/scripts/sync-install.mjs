// Distribute the versioned source; do not maintain a separate installed fork.
import { readdir, readFile, mkdir, copyFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
const source = path.resolve(import.meta.dirname, '..');
const target = path.resolve(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'skills', 'niche-seo-geo-core');
const check = process.argv.includes('--check');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const records = [];
async function walk(relative = '') {
  for (const entry of await readdir(path.join(source, relative), { withFileTypes: true })) {
    if (entry.name === '__pycache__' || entry.name.endsWith('.pyc')) continue;
    const file = path.join(relative, entry.name);
    if (entry.isDirectory()) { await walk(file); continue; }
    if (!entry.isFile()) throw new Error('Only ordinary source files are distributed');
    const bytes = await readFile(path.join(source, file));
    if (!check && source !== target) {
      await mkdir(path.dirname(path.join(target, file)), { recursive: true });
      await copyFile(path.join(source, file), path.join(target, file));
    }
    const installed = await readFile(path.join(target, file));
    if (sha(installed) !== sha(bytes)) throw new Error(`Installed skill differs: ${file}`);
    records.push({ file, sha256: sha(bytes) });
  }
}
await walk();
console.log(JSON.stringify({ status: 'MATCH', mode: check ? 'check' : 'synchronize', source, target, files: records.length, fingerprints: records }, null, 2));
