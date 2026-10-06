import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export async function verifyContentRelease(directory, validatePackage) {
  const manifest = JSON.parse(await readFile(path.join(directory, 'release-manifest.json'), 'utf8'));
  const bytes = await readFile(path.join(directory, 'content-package.json'));
  const pkg = JSON.parse(bytes);
  if (manifest.version !== 1 || manifest.state !== 'exported-not-deployed' || manifest.siteId !== pkg.siteId || manifest.canonicalHost !== pkg.canonicalHost || manifest.packageSha256 !== sha(bytes)) throw new Error('Release manifest / paketo kontrolinė suma nesutampa.');
  validatePackage(pkg);
  if (!Array.isArray(manifest.pages) || manifest.pages.length !== pkg.pages.length) throw new Error('Release puslapių inventorius nesutampa.');
  for (const page of pkg.pages) {
    const entry = manifest.pages.find(p => p.pageId === page.id);
    if (!entry || entry.revisionHash !== page.revisionHash || entry.publishAt !== page.publishAt || entry.review?.revisionHash !== page.revisionHash) throw new Error('Release revizija / peržiūra nesutampa.');
  }
  const expected = new Set(pkg.pages.flatMap(p => p.media.map(m => path.basename(m.src))));
  if (!Array.isArray(manifest.assets) || manifest.assets.length !== expected.size || new Set(manifest.assets.map(a => a.name)).size !== expected.size) throw new Error('Release medijos inventorius nesutampa.');
  for (const asset of manifest.assets) {
    if (!expected.has(asset.name) || path.basename(asset.name) !== asset.name || !/^[a-zA-Z0-9._-]+\.(webp|avif)$/.test(asset.name)) throw new Error('Release medijos kelias neteisingas.');
    if (sha(await readFile(path.join(directory, 'assets', asset.name))) !== asset.sha256) throw new Error('Release medijos kontrolinė suma nesutampa.');
  }
  return { siteId: pkg.siteId, canonicalHost: pkg.canonicalHost, pages: pkg.pages.length, assets: expected.size, state: 'verified-export-not-deployed' };
}
