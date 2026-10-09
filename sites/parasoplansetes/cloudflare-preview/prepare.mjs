import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const privateRoot = path.resolve(here, '../../..');
const publicRoot = path.resolve(privateRoot, '../dovanos-memorycasting');
const server = path.join(publicRoot, 'dist/server');
const dryRun = process.argv.includes('--dry-run');
const host = process.env.PARASOPLANSETES_PREVIEW_HOST;
const dbId = process.env.PARASOPLANSETES_PREVIEW_D1_ID;
if (!dryRun && (!/^parasoplansetes-preview\.[a-z0-9-]+\.workers\.dev$/.test(host || '') || !/^[0-9a-f-]{36}$/i.test(dbId || '') || dbId === '00000000-0000-4000-8000-000000000000')) {
  throw new Error('Set the verified PREVIEW_HOST and dedicated preview D1 UUID before preparing a remote deployment.');
}
const packagePath = path.join(publicRoot, 'content-packages/parasoplansetes/content-package.json');
const packageSha = createHash('sha256').update(fs.readFileSync(packagePath)).digest('hex');
if (packageSha !== 'ed39a2769c2fdd1732696f39076bf827972cc81bb98d385d30d9620149012e7b') throw new Error('Approved package changed: rebuild and review deployment evidence first.');
const base = JSON.parse(fs.readFileSync(path.join(server, 'wrangler.json'), 'utf8'));
fs.copyFileSync(path.join(here, 'adapter.mjs'), path.join(server, 'parasoplansetes-preview-adapter.mjs'));
fs.writeFileSync(path.join(server, 'parasoplansetes-preview.mjs'), "import application from './index.js';\nimport { createPreviewHandler } from './parasoplansetes-preview-adapter.mjs';\nexport default createPreviewHandler(application);\n");
const output = path.join(privateRoot, 'output/parasoplansetes-cloudflare-preview');
fs.mkdirSync(output, { recursive: true });
const config = {
  name: 'parasoplansetes-preview',
  account_id: '1c0a7407abfb959d5ff46540f5f7009d',
  main: path.join(server, 'parasoplansetes-preview.mjs'),
  base_dir: server,
  no_bundle: true,
  find_additional_modules: true,
  rules: base.rules,
  // Preserve the compiled application's runtime date; no incidental migration.
  compatibility_date: base.compatibility_date,
  compatibility_flags: base.compatibility_flags,
  workers_dev: true,
  preview_urls: false,
  assets: { binding: 'ASSETS', directory: path.join(publicRoot, 'dist/client'), run_worker_first: true },
  d1_databases: [{ binding: 'DB', database_name: 'parasoplansetes-preview', database_id: dbId || '00000000-0000-4000-8000-000000000000' }],
  vars: { PREVIEW_HOST: host || 'parasoplansetes-preview.not-configured.workers.dev', LEAD_SMTP_ENABLED: '0', LEAD_EMAIL_ENABLED: '0', VOICE_WIDGET_ENABLED: '0' },
  observability: { enabled: true },
};
const configPath = path.join(output, 'wrangler.json');
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
fs.writeFileSync(path.join(output, 'source.json'), JSON.stringify({ preparedAt: new Date().toISOString(), dryRunOnly: dryRun, packageSha,
  privateHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: privateRoot, encoding: 'utf8' }).trim(),
  publicHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: publicRoot, encoding: 'utf8' }).trim(),
  adapterSha: createHash('sha256').update(fs.readFileSync(path.join(here, 'adapter.mjs'))).digest('hex'),
}, null, 2) + '\n');
console.log(JSON.stringify({ configPath, dryRunOnly: dryRun, packageSha }));
