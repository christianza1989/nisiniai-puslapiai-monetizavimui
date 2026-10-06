// Transport for independent websites. No renderer, new approval or publishing policy.
import { readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { verifyContentRelease } from './content-release.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const SDK_FILES = ['scripts/content-package-core.mjs', 'scripts/content-package-v2.mjs',
  'schemas/content-package.v2.schema.json', 'lib/niche-links.mjs',
  'lib/content-projection-v2.mjs', 'lib/niche-media.mjs'];

async function regularBytes(file) {
  if (!(await lstat(file)).isFile()) throw new Error('Only regular release files are allowed.');
  return readFile(file);
}

/** Fresh immutable directory only. Private review notes never leave the studio. */
export async function exportExternalContent({ releaseDirectory, destination, publicCoreDirectory,
  expectedSiteId, expectedCanonicalHost }) {
  if (!expectedSiteId || !expectedCanonicalHost) throw new Error('Expected site ID and canonical host are required.');
  const source = path.resolve(releaseDirectory), target = path.resolve(destination);
  if (target === source || target.startsWith(source + path.sep) || source.startsWith(target + path.sep)) {
    throw new Error('Source and destination must be separate directories.');
  }
  const core = path.resolve(publicCoreDirectory);
  const { validateContentPackage } = await import(pathToFileURL(path.join(core, 'scripts/content-package-core.mjs')));
  await verifyContentRelease(source, validateContentPackage);
  const manifest = JSON.parse(await regularBytes(path.join(source, 'release-manifest.json')));
  const bytes = await regularBytes(path.join(source, 'content-package.json'));
  const pkg = JSON.parse(bytes);
  validateContentPackage(pkg);
  if (pkg.siteId !== expectedSiteId || pkg.canonicalHost !== expectedCanonicalHost) throw new Error('External site identity mismatch.');
  if (sha(bytes) !== manifest.packageSha256) throw new Error('Release changed during export.');
  const files = [{ name: 'content-package.json', bytes }], assets = [];
  const expectedAssets = new Set(pkg.pages.flatMap(p => p.media.map(m => path.basename(m.src))));
  if (manifest.assets.length !== expectedAssets.size) throw new Error('Release asset inventory changed.');
  for (const asset of manifest.assets) {
    if (!expectedAssets.delete(asset.name) || !/^[a-zA-Z0-9._-]+\.(webp|avif)$/.test(asset.name)) throw new Error('Unsafe or duplicate release asset.');
    const data = await regularBytes(path.join(source, 'assets', asset.name));
    if (sha(data) !== asset.sha256) throw new Error('Release asset changed during export.');
    files.push({ name: 'assets/' + asset.name, bytes: data });
    assets.push({ name: asset.name, sha256: asset.sha256, bytes: data.length });
  }
  const sdk = [];
  for (const relative of SDK_FILES) {
    const data = await regularBytes(path.join(core, relative));
    files.push({ name: 'sdk/' + relative, bytes: data });
    sdk.push({ path: relative, sha256: sha(data) });
  }
  // Identity is independent of the transport's timestamp and absolute workstation paths.
  const inventory = { packageSha256: sha(bytes), assets, sdk };
  const receipt = { version: 1, kind: 'external-content-bundle', siteId: pkg.siteId,
    canonicalHost: pkg.canonicalHost, schemaVersion: pkg.schemaVersion,
    createdAt: new Date().toISOString(), bundleId: sha(JSON.stringify(inventory)), ...inventory,
    state: 'exported-not-imported-not-deployed',
    pages: pkg.pages.map(p => ({ pageId: p.id, revisionHash: p.revisionHash, publishAt: p.publishAt })),
    sdkSource: 'niche-public-core; exact source bytes; no renderer or business runtime' };
  await mkdir(path.dirname(target), { recursive: true });
  await mkdir(target); // EEXIST fails: no replacement, merge or overwrite.
  for (const file of files) {
    const output = path.join(target, file.name);
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, file.bytes, { flag: 'wx' });
  }
  // A failed/incomplete copy cannot have this final receipt. Importers verify all bytes.
  await writeFile(path.join(target, 'external-content-receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  return receipt;
}
