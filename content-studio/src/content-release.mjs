import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { assertScopedDiff, stable } from './scoped-content-release.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export async function verifyContentRelease(directory, validatePackage) {
  const manifest = JSON.parse(await readFile(path.join(directory, 'release-manifest.json'), 'utf8'));
  const bytes = await readFile(path.join(directory, 'content-package.json'));
  const pkg = JSON.parse(bytes);
  if (manifest.version !== 1 || manifest.state !== 'exported-not-deployed' || manifest.siteId !== pkg.siteId || manifest.canonicalHost !== pkg.canonicalHost || manifest.packageSha256 !== sha(bytes)) throw new Error('Release manifest / paketo kontrolinė suma nesutampa.');
  validatePackage(pkg);
  let scoped = null;
  if (manifest.scope) {
    if (manifest.scope.kind !== 'reviewed-overlay' || manifest.scope.baseline?.file !== 'baseline-content-package.json') throw new Error('Unknown scoped release/baseline path.');
    const baseBytes = await readFile(path.join(directory, manifest.scope.baseline.file));
    if (sha(baseBytes) !== manifest.scope.baseline.sha256) throw new Error('Scoped baseline bytes/hash mismatch.');
    const base = JSON.parse(baseBytes); validatePackage(base);
    scoped = assertScopedDiff(base, pkg, manifest.scope.pageIds);
    const source = manifest.scope.baseline.evidence;
    if (!source?.sourceVersion || !source?.deploymentId || !Number.isFinite(Date.parse(source.observedAt))) throw new Error('Missing observed baseline evidence.');
    const baseNames = new Set(base.pages.flatMap(p => p.media.map(m => path.basename(m.src))));
    const pinnedAssets = manifest.scope.baseline.assets;
    if (!Array.isArray(pinnedAssets) || pinnedAssets.length !== baseNames.size || new Set(pinnedAssets.map(a => a.name)).size !== baseNames.size || pinnedAssets.some(a => !baseNames.has(a.name) || !/^[a-f0-9]{64}$/.test(a.sha256))) throw new Error('Invalid baseline media inventory.');
    if (sha(stable(pinnedAssets)) !== manifest.scope.baseline.assetsSha256) throw new Error('Baseline media inventory hash mismatch.');
    for (const asset of manifest.assets) {
      const original = pinnedAssets.find(a => a.name === asset.name);
      if (original && original.sha256 !== asset.sha256) throw new Error('Baseline media was overwritten.');
    }
  }
  if (!Array.isArray(manifest.pages) || manifest.pages.length !== pkg.pages.length) throw new Error('Release puslapių inventorius nesutampa.');
  for (const page of pkg.pages) {
    const entry = manifest.pages.find(p => p.pageId === page.id);
    if (!entry || entry.revisionHash !== page.revisionHash || entry.publishAt !== page.publishAt) throw new Error('Release revizija / peržiūra nesutampa.');
    if (scoped && !scoped.has(page.id)) {
      if (entry.review || entry.inheritedApproval?.kind !== 'pinned-baseline' || entry.inheritedApproval?.packageSha256 !== manifest.scope.baseline.sha256) throw new Error('Unselected page needs inherited pinned-baseline approval, not fake fresh review.');
    } else if (entry.review?.revisionHash !== page.revisionHash || entry.inheritedApproval) throw new Error('Release selected/current review mismatch.');
  }
  const expected = new Set(pkg.pages.flatMap(p => p.media.map(m => path.basename(m.src))));
  if (!Array.isArray(manifest.assets) || manifest.assets.length !== expected.size || new Set(manifest.assets.map(a => a.name)).size !== expected.size) throw new Error('Release medijos inventorius nesutampa.');
  for (const asset of manifest.assets) {
    if (!expected.has(asset.name) || path.basename(asset.name) !== asset.name || !/^[a-zA-Z0-9._-]+\.(webp|avif)$/.test(asset.name)) throw new Error('Release medijos kelias neteisingas.');
    if (sha(await readFile(path.join(directory, 'assets', asset.name))) !== asset.sha256) throw new Error('Release medijos kontrolinė suma nesutampa.');
  }
  return { siteId: pkg.siteId, canonicalHost: pkg.canonicalHost, pages: pkg.pages.length, assets: expected.size, state: 'verified-export-not-deployed' };
}
