// Recreate ignored local content state from the exact approved, versioned release.
// Uses the common importer; does not copy sessions, accounts, mail or databases.
import {mkdir, copyFile, readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {verifyContentRelease} from '../../../content-studio/src/content-release.mjs';

const workspace = path.resolve(import.meta.dirname, '../../..');
const source = path.resolve(workspace, '../dovanos-memorycasting');
const sandbox = path.resolve(import.meta.dirname, '../runtime/output/content-core');
const release = path.join(import.meta.dirname, 'initial-release');
const expectedPackageHash = 'dba452bae4c613cc91b2da0d67addd221e405f30c594992553f3009bfc809579';
const packageBytes = await readFile(path.join(release, 'content-package.json'));
if (createHash('sha256').update(packageBytes).digest('hex') !== expectedPackageHash) {
  throw new Error('Initial approved release changed; create and review a new release instead.');
}
const {validateContentPackage} = await import(pathToFileURL(path.join(source, 'scripts/content-package-core.mjs')));
const verification = await verifyContentRelease(release, validateContentPackage);
// The same bounded common-import sandbox used by the original local acceptance.
const files = ['scripts/import-content-package.mjs', 'scripts/compile-content-packages.mjs',
  'scripts/content-package-core.mjs', 'scripts/content-package-v2.mjs', 'scripts/content-v2-admission.mjs',
  'schemas/content-package.v2.schema.json', 'tests/seo-core-smoke.mjs', 'lib/niche-links.mjs',
  'config/niche-network.json', 'public/favicon.svg'];
const sources = [];
for (const relative of files) {
  const destination = path.join(sandbox, relative);
  await mkdir(path.dirname(destination), {recursive: true});
  await copyFile(path.join(source, relative), destination);
  sources.push({file: relative, sha256: createHash('sha256').update(await readFile(destination)).digest('hex')});
}
await mkdir(path.join(sandbox, 'content-packages'), {recursive: true});
for (const [script, args] of [['scripts/import-content-package.mjs', [release, '--replace']],
  ['scripts/compile-content-packages.mjs', []]]) {
  const result = spawnSync(process.execPath, [script, ...args], {cwd: sandbox, encoding: 'utf8', windowsHide: true});
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr || result.stdout || script + ' failed');
}
await mkdir(path.join(workspace, 'research/madbeauty-implementation'), {recursive: true});
const receipt = {at: new Date().toISOString(), state: 'local-checkout-restored-not-deployed',
  packageSha256: expectedPackageHash, verification, sources,
  accountsCopied: false, databasesCopied: false, mailSent: false};
await writeFile(path.resolve(import.meta.dirname, '../runtime/checkout-bootstrap.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({state: receipt.state, packageSha256: expectedPackageHash, accountsCopied: false, mailSent: false}));
