// Private evidence adapter. No providers, payments, writes or publication here.
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const RESEARCH_KINDS = ['keywords', 'serp', 'backlinks', 'geo', 'analytics', 'crawl', 'source'];
const statuses = new Set(['observed', 'empty', 'unsupported', 'failed', 'not_connected', 'not_measured']);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const host = value => String(value || '').toLowerCase().replace(/\.$/, '');
const language = value => String(value || '').toLowerCase().split(/[-_]/)[0];
const instant = value => typeof value === 'string' && /(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
export const researchRoot = () => path.resolve(process.env.STUDIO_DATA_DIR || path.resolve(import.meta.dirname, '../data'), 'seo-research');
export function siteResearchDirectory(siteId, root = researchRoot()) {
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(siteId || '')) throw new Error('Neteisingas SEO tyrimo siteId.');
  return path.join(root, siteId);
}
export function artifactBytes(directory, relative) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || relative.includes('\\') || relative.split('/').some(p => !p || p === '..' || p === '.')) throw new Error('SEO artefakto kelias turi būti vietinis ir santykinis.');
  const root = realpathSync(directory), target = realpathSync(path.join(root, relative));
  const relation = path.relative(root, target);
  if (relation.startsWith('..') || path.isAbsolute(relation) || !statSync(target).isFile()) throw new Error('SEO artefaktas išeina už savo tyrimo katalogo.');
  if (statSync(target).size > 8 * 1024 * 1024) throw new Error('SEO artefaktas per didelis.');
  return readFileSync(target);
}
export function validateResearch(bundle) {
  if (!bundle || bundle.version !== 1 || !bundle.siteId || !/^[a-z0-9][a-z0-9-]{1,62}$/.test(bundle.siteId)) throw new Error('Neteisingas SEO tyrimo formatas / siteId.');
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(bundle.domain || '') || bundle.domain.includes('..')) throw new Error('Neteisingas SEO tyrimo domenas.');
  if (!/^[A-Za-z]{2,3}(?:[-_][A-Za-z]{2})?$/.test(bundle.language || '') || !/^[A-Z]{2}$/.test(bundle.country || '')) throw new Error('Reikia tyrimo rinkos ir kalbos.');
  if (!Array.isArray(bundle.observations) || bundle.observations.length > 500) throw new Error('Tyrime gali būti iki 500 stebėjimų.');
  const ids = new Set();
  for (const item of bundle.observations) {
    if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(item.id) || ids.has(item.id)) throw new Error('Neunikalus / netinkamas tyrimo stebėjimo ID.');
    ids.add(item.id);
    if (!RESEARCH_KINDS.includes(item.kind) || !statuses.has(item.status)) throw new Error('Neteisingas stebėjimo tipas / būsena.');
    if (!instant(item.observedAt) || !instant(item.freshUntil) || Date.parse(item.freshUntil) < Date.parse(item.observedAt)) throw new Error('Reikia tikro stebėjimo laiko ir pagrįsto freshUntil.');
    if (!item.source || typeof item.source.artifact !== 'string' || !/^[a-f0-9]{64}$/.test(item.source.sha256 || '')) throw new Error('Reikia raw artefakto ir SHA-256.');
    if (item.status === 'observed' && item.value === undefined) throw new Error('Stebėjimui trūksta reikšmės; null ir 0 skirtingi.');
    if (item.status === 'observed' && (!item.country || !item.language)) throw new Error('Stebėjimui reikia actual country/language arba GLOBAL/und.');
    if (typeof item.limitations !== 'string' || item.limitations.length > 4000) throw new Error('Reikia stebėjimo ribų paaiškinimo.');
  }
  return bundle;
}
export function assessResearch(bundle, site, { now = Date.now(), directory } = {}) {
  validateResearch(bundle);
  if (bundle.siteId !== site.id || host(bundle.domain) !== host(site.domain || site.canonicalHost)) throw new Error('SEO tyrimas priklauso kitam siteId / domenui.');
  const expectedCountry = String(site.researchCountry || String(site.locale || '').split(/[-_]/)[1] || '').toUpperCase();
  if (language(bundle.language) !== language(site.locale) || expectedCountry && bundle.country !== expectedCountry) throw new Error('SEO tyrimo rinka / kalba neatitinka svetainės.');
  const observations = bundle.observations.map(item => {
    let state = item.status === 'observed' ? 'current' : item.status;
    const global = item.country === 'GLOBAL' && item.language === 'und' && ['crawl', 'backlinks', 'source'].includes(item.kind);
    if (item.status === 'observed' && !global && (item.country !== bundle.country || language(item.language) !== language(bundle.language))) state = 'unsupported_market';
    if (Date.parse(item.observedAt) > now) state = 'future_observation';
    else if (Date.parse(item.freshUntil) <= now && state === 'current') state = 'stale';
    if (directory) {
      try { if (sha(artifactBytes(directory, item.source.artifact)) !== item.source.sha256) state = 'artifact_mismatch'; }
      catch { state = 'artifact_unavailable'; }
    }
    return { ...item, state, usable: state === 'current', freshSample: state === 'current' && !item.replay };
  });
  const currentKinds = [...new Set(observations.filter(o => o.usable).map(o => o.kind))];
  const refreshKinds = [...new Set(observations.filter(o => ['stale', 'artifact_mismatch', 'artifact_unavailable', 'future_observation'].includes(o.state)).map(o => o.kind))];
  return { status: refreshKinds.length ? 'refresh_due' : observations.some(o => o.usable) ? 'available' : 'unverified',
    siteId: bundle.siteId, domain: bundle.domain, country: bundle.country, language: bundle.language,
    assessedAt: new Date(now).toISOString(), currentKinds, refreshKinds,
    missingKinds: RESEARCH_KINDS.filter(k => !currentKinds.includes(k)), observations };
}
export function researchContext(site, { root = researchRoot(), now = Date.now() } = {}) {
  const directory = siteResearchDirectory(site.id, root), file = path.join(directory, 'current.json');
  const base = { siteId: site.id, domain: site.domain || site.canonicalHost, assessedAt: new Date(now).toISOString(),
    paidExecution: 'disabled-in-generation', budgetUsd: 0, observations: [], currentKinds: [], refreshKinds: [], missingKinds: RESEARCH_KINDS,
    limitation: 'Private evidence and source hashes support review; they do not certify semantic truth, indexing, revenue or completed research.' };
  let bytes;
  try { bytes = readFileSync(file); }
  catch (error) { if (error.code === 'ENOENT') return { ...base, status: 'missing' }; throw error; }
  if (bytes.length > 256 * 1024) throw new Error('Privatus SEO tyrimo manifestas per didelis.');
  const bundle = validateResearch(JSON.parse(bytes.toString('utf8')));
  return { ...base, ...assessResearch(bundle, site, { now, directory }), evidenceSha256: sha(bytes) };
}
