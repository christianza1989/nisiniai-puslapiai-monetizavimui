import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const stable = value => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value);
export const textSnapshot = page => ({ title: page.title || '', description: page.description || '', body: page.body || [] });
const textEqual = (a, b) => stable(textSnapshot(a)) === stable(textSnapshot(b));
const baselineFile = (directory, siteId) => {
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(siteId)) throw new Error('Neteisingas svetainės ID.');
  return path.join(directory, `${siteId}.json`);
};

// An explicit offline import creates a private, immutable comparison baseline.
// It never calls editPage, writes active sites, or exports archived bodies.
export async function importRevisionBaseline(directory, site, { label, capturedAt, sourceSha256 }) {
  if (!site?.id || !Array.isArray(site.pages) || !label?.trim() || !Number.isFinite(Date.parse(capturedAt)) || !/^[a-f0-9]{64}$/.test(sourceSha256 || '')) throw new Error('Reikia svetainės kopijos, datos, pavadinimo ir šaltinio SHA-256.');
  const pages = {};
  for (const page of site.pages) {
    // Prefer the then-published text; otherwise preserve the old editable body.
    const source = page.publishedRevision?.body?.length ? page.publishedRevision : page;
    if (source.body?.length) pages[page.id] = textSnapshot(source);
  }
  const baseline = { version: 1, siteId: site.id, label: label.trim(), capturedAt, sourceSha256, pages };
  await mkdir(directory, { recursive: true });
  await writeFile(baselineFile(directory, site.id), `${JSON.stringify(baseline, null, 2)}\n`, { flag: 'wx' });
  return { siteId: site.id, pages: Object.keys(pages).length, sourceSha256 };
}

export async function readRevisionBaseline(directory, siteId) {
  try {
    const baseline = JSON.parse((await readFile(baselineFile(directory, siteId), 'utf8')).replace(/^\uFEFF/, ''));
    if (baseline.version !== 1 || baseline.siteId !== siteId || !baseline.pages || Array.isArray(baseline.pages)) throw new Error('Netinkama palyginimo kopija.');
    return baseline;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error; // A damaged archive must not masquerade as an absent archive.
  }
}

export function revisionState(page, baseline, reviewed = false) {
  const archived = baseline?.pages[page.id];
  const previous = archived || (page.publishedRevision?.body?.length ? page.publishedRevision : null);
  const hasDraft = Boolean(page.body?.length);
  const changed = hasDraft && (!previous || !textEqual(page, previous));
  return { hasDraft, changed, rewritten: changed && Boolean(previous), hasBaseline: Boolean(previous), reviewed: hasDraft && Boolean(reviewed), checkedAt: reviewed ? page.editorialReview?.checkedAt || null : null, beforeLabel: archived ? baseline.label : previous ? 'Ankstesnė patvirtinta versija' : null, capturedAt: archived ? baseline.capturedAt : null };
}

export function revisionComparison(page, baseline, reviewed = false) {
  const state = revisionState(page, baseline, reviewed);
  const previous = baseline?.pages[page.id] || (page.publishedRevision?.body?.length ? page.publishedRevision : null);
  return { pageId: page.id, slug: page.slug, ...state, before: previous ? textSnapshot(previous) : null, after: textSnapshot(page) };
}

export const baselineSha256 = bytes => createHash('sha256').update(bytes).digest('hex');
