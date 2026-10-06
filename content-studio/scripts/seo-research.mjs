// Import reviewed private observations; never calls a paid provider.
import { readFile, mkdir, writeFile, rename, copyFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { researchRoot, siteResearchDirectory, validateResearch, artifactBytes, researchContext, assessResearch } from '../src/seo-research.mjs';
import { withStudioWriteLock } from '../src/write-lock.mjs';
const [command, siteId, domain, locale, input] = process.argv.slice(2);
if (!['status', 'import'].includes(command) || !siteId || !domain || !locale || command === 'import' && !input) {
  throw new Error('Usage: node content-studio/scripts/seo-research.mjs <status|import> <siteId> <canonicalHost> <locale> [bundle.json]');
}
const site = { id: siteId, domain, locale }, root = researchRoot(), directory = siteResearchDirectory(siteId, root);
if (command === 'import') {
  const file = path.resolve(input), raw = await readFile(file);
  if (raw.length > 256 * 1024) throw new Error('Research manifest too large');
  const bundle = validateResearch(JSON.parse(raw.toString('utf8')));
  assessResearch(bundle, site);
  const sources = new Map();
  for (const item of bundle.observations) {
    const bytes = artifactBytes(path.dirname(file), item.source.artifact);
    if (createHash('sha256').update(bytes).digest('hex') !== item.source.sha256) throw new Error('Raw artifact hash does not match reviewed observation');
    sources.set(item.source.artifact, bytes);
  }
  await withStudioWriteLock(path.dirname(root), async () => {
    const snapshot = `snapshots/${randomUUID()}`;
    const saved = { ...bundle, importedAt: new Date().toISOString(), observations: bundle.observations.map(o => ({ ...o, source: { ...o.source, artifact: `${snapshot}/${o.source.artifact}` } })) };
    const bytes = JSON.stringify(saved, null, 2) + '\n';
    if (Buffer.byteLength(bytes) > 256 * 1024) throw new Error('Expanded research manifest too large; keep normalized values compact and preserve detail in raw artifacts');
    for (const [relative, bytes] of sources) {
      const destination = path.join(directory, snapshot, relative);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, bytes, { flag: 'wx' });
    }
    await mkdir(directory, { recursive: true });
    const temporary = path.join(directory, `current.${randomUUID()}.tmp`);
    await writeFile(temporary, bytes, { flag: 'wx' });
    await copyFile(temporary, path.join(directory, snapshot, 'bundle.json'));
    await rename(temporary, path.join(directory, 'current.json'));
  });
}
console.log(JSON.stringify(researchContext(site), null, 2));
