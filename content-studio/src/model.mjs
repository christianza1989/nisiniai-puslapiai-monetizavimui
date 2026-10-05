import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, writeFile, copyFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { normalizeNetworkSuggestions, targetCatalog, networkOverview, networkStatus, checkTarget } from './network-links.mjs';
import { optimizeRaster } from './image-pipeline.mjs';
import {v2RevisionPayload,v2RevisionHash,normalizeV2Blocks,validateV2Draft,validateV2Package,bodyPlainText} from './content-package-v2.mjs';
import { withStudioWriteLock } from './write-lock.mjs';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const DATA = path.resolve(process.env.STUDIO_DATA_DIR || path.join(ROOT, 'data'));
export const OUTPUT = path.resolve(process.env.STUDIO_OUTPUT_DIR || path.join(ROOT, 'output'));
const SITE_DIR = path.join(DATA, 'sites');
const MEDIA_DIR = path.join(DATA, 'media');
const JOB_FILE = path.join(DATA, 'jobs.json');
const networkSettingsFile = process.env.STUDIO_NETWORK_SETTINGS || path.resolve(ROOT, '../../dovanos-memorycasting/config/niche-network.json');
const defaultContact = siteId => {
  const settings = JSON.parse(readFileSync(networkSettingsFile, 'utf8'));
  return { email: settings.contactsBySite?.[siteId]?.email || settings.defaultEmail, phone: '' };
};
export const PAGE_TYPES = new Set(['home', 'service', 'product', 'guide', 'faq', 'location']);
const V2_PAGE_TYPES = new Set([...PAGE_TYPES,'article','index','author','policy','about','contact']);
const publicSite = site => ({id:site.id,name:site.name,canonicalHost:site.canonicalHost,locale:site.locale,timezone:site.timezone,brand:site.brand,offer:site.offer,contact:site.contact,...(site.schemaVersion===2?{renderer:site.renderer,operatorName:site.operatorName}: {})});
const emptyEditorial = () => ({category:'',readingMinutes:0,authors:[],sources:[],datePublished:null,dateModified:null,productRecommendation:false,featuredImageId:null,relatedPageIds:[],commerceTargets:[]});
export const MAX_PAGE_MEDIA = 60;
let mutation = Promise.resolve();

const seeds = [
  ['greitossvetaines.lt', 'Greitos svetainės', 'Svetainės smulkiems paslaugų verslams'],
  ['roletaiklaipedoje.lt', 'Roletai Klaipėdoje', 'Roletų pasirinkimas ir užklausos Klaipėdoje'],
  ['traktoriupadangos.lt', 'Traktorių padangos', 'Traktorių padangų parinkimo užklausos'],
  ['autoelektrikaivilniuje.lt', 'Auto elektrikai Vilniuje', 'Auto elektros darbų užklausos Vilniuje'],
  ['tvirti-pamatai.lt', 'Tvirti pamatai', 'Pamatų darbų pasiūlymo užklausos'],
  ['laiptucentras.lt', 'Laiptų centras', 'Laiptų projektavimo ir gamybos užklausos'],
  ['akmenas.lt', 'Akmuo', 'Akmens stalviršių užklausos'],
  ['businessintelligence.lt', 'Business Intelligence', 'Verslo ataskaitų automatizavimo užklausos'],
  ['pliusstatyba.lt', 'Plius statyba', 'Vonios atnaujinimo užklausos'],
  ['mtaisykla.lt', 'M taisykla', 'Telefonų remonto užklausos'],
  ['klaidu-taisymas.lt', 'Klaidų taisymas', 'El. parduotuvių klaidų taisymo užklausos'],
  ['e-statybai.lt', 'E statybai', 'Terasų medžiagų užklausos'],
  ['smulkusurmas.lt', 'Smulkus urmas', 'Mažų pakuočių partijų užklausos'],
  ['namudekoravimas.lt', 'Namų dekoravimas', 'Kambarių atnaujinimo planų užklausos'],
  ['apartmentstrakai.lt', 'Apartamentai Trakuose', 'Apgyvendinimo Trakuose užklausos'],
  ['tiknamams.lt', 'Tik namams', 'Būsto paruošimo nuomai užklausos'],
  ['rentbook.lt', 'Rentbook', 'Nuomos užklausų administravimo paslauga'],
  ['auksarankiams.lt', 'Auksarankiams', 'Rankdarbių šablonai ir idėjos'],
  ['storyline.lt', 'Storyline', 'Klientų istorijų kūrimo paslauga verslams'],
  ['estrategija.lt', 'E strategija', 'Užklausų procesų auditas ir automatizavimas']
];

const plain = (value, max = 4000) => String(value ?? '').trim().slice(0, max);
const losslessString=(value,max)=>{if(value===undefined)return '';if(typeof value!=='string'||value.length>max)throw new Error('V2 tekstas viršija ribą arba nėra eilutė; jis netrumpinamas.');return value;};
const siteIdFromDomain = domain => domain.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 60);
const safeId = id => /^[a-z0-9][a-z0-9-]{1,62}$/.test(id);
const iso = value => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Neteisinga data. Naudokite ISO laiką.');
  return date.toISOString();
};
const writeJson = async (file, value) => {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(value, null, 2) + '\n', 'utf8');
  // Windows readers/antivirus can briefly lock the destination. Preserve the
  // atomic replacement; never truncate the current good JSON as a fallback.
  for (let attempt = 0; ; attempt++) {
    try { await rename(temp, file); break; }
    catch (error) {
      if (process.platform !== 'win32' || !['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt >= 8) throw error;
      await new Promise(resolve => setTimeout(resolve, 25 * (attempt + 1)));
    }
  }
};
const readJson = async (file, fallback = null) => {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
};
const locked = task => {
  const result = mutation.then(()=>withStudioWriteLock(DATA,task));
  mutation = result.catch(() => {});
  return result;
};
const siteFile = id => {
  if (!safeId(id)) throw new Error('Neteisingas svetainės ID.');
  return path.join(SITE_DIR, `${id}.json`);
};
const normalizedHost = value => {
  const host = plain(value, 253).toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(host) || host.includes('..')) throw new Error('Neteisingas domenas.');
  return host;
};
export function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function revisionPayload(page) {
  if(page.contentVersion===2)return v2RevisionPayload(page);
  const { siteId, type, slug, title, description, intent, body, publishAt, media, links } = page;
  const payload = { siteId, type, slug, title, description, intent, body, publishAt, media, links };
  if (page.externalLinks?.length) payload.externalLinks = page.externalLinks.map(({ url, label, reason }) => ({ url, label, reason }));
  return payload;
}
export function revisionHash(page) { return page.contentVersion===2?v2RevisionHash(page):createHash('sha256').update(stable(revisionPayload(page))).digest('hex'); }
export function isPublic(page, now = Date.now()) {
  return page?.approval?.status === 'approved'
    && page.approval.revisionHash === page.revisionHash
    && revisionHash(page) === page.revisionHash
    && Date.parse(page.publishAt) <= now;
}
export function normalizeBlocks(input) {
  if (!Array.isArray(input)) throw new Error('Turinys turi būti blokų sąrašas.');
  if (input.length > 100) throw new Error('Per daug turinio blokų.');
  return input.map(block => {
    if (block.type === 'heading') return { type: 'heading', level: block.level === 3 ? 3 : 2, text: plain(block.text, 500) };
    if (block.type === 'list') return { type: 'list', items: (Array.isArray(block.items) ? block.items : []).slice(0, 30).map(item => plain(item, 700)) };
    if (block.type === 'image') return { type: 'image', assetId: plain(block.assetId, 80) };
    if (block.type === 'paragraph') return { type: 'paragraph', text: plain(block.text, 3000) };
    throw new Error('Nežinomas turinio bloko tipas.');
  });
}
const normalizeSlug = (value, type) => {
  const slug = plain(value, 150).replace(/^\/+|\/+$/g, '').toLowerCase();
  if (type === 'home') return '';
  if (!/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(slug) || slug.startsWith('niche/') || slug.startsWith('api/')) throw new Error('Netinkamas URL kelias. Naudokite mažąsias lotyniškas raides, skaičius ir vidinius brūkšnelius.');
  return slug;
};
const makeSite = (domain, name, offer = '') => ({
  id: siteIdFromDomain(domain), canonicalHost: domain, name,
  locale: 'lt-LT', timezone: 'Europe/Vilnius',
  brand: { accent: '#246f74' }, offer,
  audience: '', facts: '', contact: defaultContact(siteIdFromDomain(domain)),
  stage: 'planning', pages: [], assets: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
});

export async function initialize({ recoverJobs = false } = {}) {
  await mkdir(SITE_DIR, { recursive: true });
  await mkdir(MEDIA_DIR, { recursive: true });
  return locked(async()=>{
  const jobs = await readJson(JOB_FILE, []);
  let recovered = false;
  for (const job of jobs) if (recoverJobs && (job.status === 'queued' || job.status === 'running')) {
    job.status = 'failed'; job.error = 'Studija buvo paleista iš naujo. Pradėkite šį darbą dar kartą.';
    job.finishedAt = new Date().toISOString(); recovered = true;
  }
  if (recovered) await writeJson(JOB_FILE, jobs);
  const existing = (await readdir(SITE_DIR)).filter(file => file.endsWith('.json'));
  if (existing.length) return;
  for (const [domain, name, offer] of seeds) await writeJson(siteFile(siteIdFromDomain(domain)), makeSite(domain, name, offer));
  });
}
export async function listSites() {
  const files = (await readdir(SITE_DIR)).filter(file => file.endsWith('.json'));
  const sites = await Promise.all(files.map(file => readJson(path.join(SITE_DIR, file))));
  return sites.map(site => ({ id: site.id, name: site.name, canonicalHost: site.canonicalHost, offer: site.offer, stage: site.stage,
    pages: site.pages.length, approved: site.pages.filter(page => page.publishedRevision).length,
    ready: Boolean(site.facts && site.contact.email) })).sort((a, b) => a.canonicalHost.localeCompare(b.canonicalHost));
}
export async function listCalendar() {
  const files = (await readdir(SITE_DIR)).filter(file => file.endsWith('.json'));
  const sites = await Promise.all(files.map(file => readJson(path.join(SITE_DIR, file))));
  return sites.flatMap(site => site.pages.map(page => {
    const approved = Boolean(page.publishedRevision);
    const live = approved && isPublic(page.publishedRevision);
    const scheduled = approved && !live;
    return {
      siteId: site.id, siteName: site.name, canonicalHost: site.canonicalHost, timezone: site.timezone, siteStage: site.stage,
      pageId: page.id, title: page.title, slug: page.slug, type: page.type,
      publishAt: approved ? page.publishedRevision.publishAt : page.publishAt,
      cluster: page.cluster || '', seasonalHook: page.seasonalHook || '', status: live ? 'due' : scheduled ? 'scheduled' : page.body.length ? 'draft' : 'planned',
      hasDraft: page.body.length > 0, approved, public: live,
      draftChanged: approved && revisionHash(page) !== page.publishedRevision.revisionHash,
      linkCounts: { internal: (page.links || []).length, external: (page.externalLinks || []).length, networkPlanned: (page.networkLinkSuggestions || []).length },
    };
  })).sort((a, b) => a.publishAt.localeCompare(b.publishAt) || a.canonicalHost.localeCompare(b.canonicalHost));
}
export async function getSite(id) {
  const site = await readJson(siteFile(id));
  if (!site) throw Object.assign(new Error('Svetainė nerasta.'), { status: 404 });
  return site;
}
async function networkSites() {
  const files = (await readdir(SITE_DIR)).filter(file => file.endsWith('.json'));
  return Promise.all(files.map(file => readJson(path.join(SITE_DIR, file))));
}
export async function listNetworkLinks() { return networkOverview(await networkSites(), isPublic); }
export async function networkCatalog() { return targetCatalog(await networkSites(), isPublic); }

// May be invoked by the orchestrating agent or GUI. No public approval is granted.
export async function verifyNetworkLinks(siteId, pageId) {
  const site = await getSite(siteId);
  const page = site.pages.find(item => item.id === pageId);
  if (!page) throw new Error('Puslapis nerastas.');
  const previous = JSON.stringify(page);
  const catalog = await networkCatalog();
  const results = [];
  for (const link of page.networkLinkSuggestions || []) {
    const item = networkStatus(siteId, page, link, catalog);
    const checked = { ...normalizeNetworkSuggestions([link])[0] };
    if (['ready', 'needs-check'].includes(item.status)) {
      try { checked.evidence = await checkTarget(item.target); }
      catch (error) { checked.checkError = String(error.message).slice(0, 180); }
    }
    results.push(checked);
  }
  return locked(async () => {
    const current = await getSite(siteId);
    const currentPage = current.pages.find(item => item.id === pageId);
    if (!currentPage || JSON.stringify(currentPage) !== previous) throw new Error('Juodraštis pasikeitė patikros metu; pakartokite patikrą.');
    const ready = results.map(link => networkStatus(siteId, currentPage, link, catalog)).filter(link => link.status === 'ready');
    const previousNetworkUrls = new Set((page.networkLinkSuggestions || []).map(link => catalog.find(item => item.siteId === link.targetSiteId && item.pageId === link.targetPageId)?.url).filter(Boolean));
    currentPage.networkLinkSuggestions = results;
    // Failed checks remove the candidate from the new draft. Saved approved versions
    // remain immutable until explicitly reviewed/revoked through the normal workflow.
    currentPage.externalLinks = (currentPage.externalLinks || []).filter(link => !previousNetworkUrls.has(link.url));
    currentPage.externalLinks.push(...ready.map(link => ({ url: link.target.url, label: link.label, reason: link.reason, verified: true })));
    currentPage.status = 'review'; currentPage.approval = null; currentPage.updatedAt = new Date().toISOString();
    await writeJson(siteFile(siteId), current);
    return { checked: results.length, ready: ready.length, pending: results.length - ready.length };
  });
}
export async function createSite(input) {
  return locked(async () => {
    const domain = normalizedHost(input.canonicalHost);
    const all = await listSites();
    if (all.some(site => site.canonicalHost === domain)) throw new Error('Domenas jau yra registre.');
    const site = makeSite(domain, plain(input.name, 120) || domain, plain(input.offer, 500));
    if(input.schemaVersion===2){site.schemaVersion=2;site.renderer=input.renderer==='gift'?'gift':'niche';site.operatorName=JSON.parse(readFileSync(networkSettingsFile,'utf8')).contactsBySite?.[site.id]?.operatorName||JSON.parse(readFileSync(networkSettingsFile,'utf8')).operatorName;}
    if (all.some(item => item.id === site.id)) throw new Error('Svetainės ID jau naudojamas.');
    await writeJson(siteFile(site.id), site);
    return site;
  });
}
export async function editSite(id, input) {
  return locked(async () => {
    const site = await getSite(id);
    if (input.canonicalHost && normalizedHost(input.canonicalHost) !== site.canonicalHost) throw new Error('Pirminio domeno keitimui sukurkite naują svetainės įrašą.');
    for (const key of ['name', 'offer', 'audience', 'facts']) if (key in input) site[key] = plain(input[key], key === 'facts' ? 12000 : 1000);
    if(site.schemaVersion===2&&'operatorName'in input)site.operatorName=losslessString(input.operatorName,300);
    if (input.contact) site.contact = { email: plain(input.contact.email, 250), phone: plain(input.contact.phone, 80) };
    if (input.brand?.accent && /^#[a-f\d]{6}$/i.test(input.brand.accent)) site.brand = { accent: input.brand.accent };
    if (input.stage && ['planning', 'ready', 'live', 'paused'].includes(input.stage)) site.stage = input.stage;
    site.updatedAt = new Date().toISOString();
    await writeJson(siteFile(id), site);
    return site;
  });
}
const makePage = (site, input) => {
  const v2=site.schemaVersion===2;
  const type = (v2?V2_PAGE_TYPES:PAGE_TYPES).has(input.type) ? input.type : 'guide';
  if(v2&&input.id!==undefined&&!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(input.id))throw new Error('Neteisingas stabilus puslapio ID.');
  return {
    id: v2&&input.id?input.id:randomUUID(), siteId: site.id, type, slug: normalizeSlug(input.slug, type),
    title: v2?losslessString(input.title,1000):plain(input.title, 180), description: v2?losslessString(input.description,1000):plain(input.description, 300),
    intent: v2?losslessString(input.intent,1000):plain(input.intent, 300), body: v2?normalizeV2Blocks(input.body||[]):normalizeBlocks(input.body || []),
    ...(v2?{contentVersion:2,editorial:structuredClone(input.editorial||emptyEditorial()),siteSnapshot:structuredClone(publicSite(site))}:{}),
    publishAt: iso(input.publishAt || new Date().toISOString()), media: [], links: [],
    externalLinks: [], linkSuggestions: [], networkLinkSuggestions: normalizeNetworkSuggestions(input.networkLinks), cluster: plain(input.cluster, 120), seasonalHook: plain(input.seasonalHook, 300),
    pillarPageId: site.pages.some(item => item.id === input.pillarPageId) ? input.pillarPageId : '',
    editorialReason: plain(input.reason, 1000), sourceQueries: (Array.isArray(input.sourceQueries) ? input.sourceQueries : []).slice(0, 8).map(item => plain(item, 200)),
    status: 'draft', factChecks: [], approval: null, publishedRevision: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
};
export async function addPage(siteId, input) {
  return locked(async () => {
    const site = await getSite(siteId);
    const page = makePage(site, input);
    if(site.pages.some(item=>item.id===page.id))throw new Error('Puslapio ID jau naudojamas.');
    if (site.pages.some(item => item.slug === page.slug)) throw new Error('Toks URL jau suplanuotas šioje svetainėje.');
    site.pages.push(page);
    await writeJson(siteFile(siteId), site);
    return page;
  });
}
export async function mergePlan(siteId, proposals, months = 0) {
  return locked(async () => {
    const site = await getSite(siteId);
    let added = 0;
    const candidates = proposals.slice(0, months ? 24 : 12);
    const timed = candidates.filter(item => item.type !== 'home');
    let scheduleIndex = 0;
    const today = new Date();
    const horizon = new Date(today); horizon.setUTCMonth(horizon.getUTCMonth() + months);
    const usedDates = new Set(site.pages.map(page => page.publishAt.slice(0, 10)));
    for (const input of candidates) {
      const scheduledInput = { ...input };
      if (months && input.type !== 'home') {
        scheduleIndex++;
        const proposed = /^\d{4}-\d{2}-\d{2}$/.test(input.publishDate || '') ? new Date(`${input.publishDate}T08:00:00.000Z`) : null;
        const valid = proposed && !Number.isNaN(proposed.getTime()) && proposed.toISOString().slice(0, 10) === input.publishDate
          && proposed.getTime() > Date.now() + 86400000 && proposed.getTime() <= horizon.getTime();
        const date = valid ? proposed : new Date(Date.now() + Math.round((7 + (months * 30 - 7) * scheduleIndex / Math.max(timed.length, 1)) * 86400000));
        date.setUTCHours(8, 0, 0, 0);
        while (usedDates.has(date.toISOString().slice(0, 10)) && date.getTime() + 86400000 <= horizon.getTime()) date.setUTCDate(date.getUTCDate() + 1);
        scheduledInput.publishAt = date.toISOString();
        usedDates.add(date.toISOString().slice(0, 10));
      }
      const page = makePage(site, scheduledInput);
      if (site.pages.some(item => item.slug === page.slug)) continue;
      site.pages.push(page); added++;
    }
    for (const input of candidates) {
      const page = site.pages.find(item => item.slug === input.slug);
      if (!page || page.type === 'home') continue;
      const pillar = input.pillarSlug
        ? site.pages.find(item => item.slug === input.pillarSlug && item.id !== page.id)
        : site.pages.slice(0, site.pages.indexOf(page)).find(item => item.cluster && item.cluster === page.cluster && item.type !== 'home');
      if (page && pillar && !page.pillarPageId) page.pillarPageId = pillar.id;
    }
    await writeJson(siteFile(siteId), site);
    return { added, total: site.pages.length };
  });
}
export async function editPage(siteId, pageId, input) {
  return locked(async () => {
    const site = await getSite(siteId);
    const page = site.pages.find(item => item.id === pageId);
    if (!page) throw Object.assign(new Error('Puslapis nerastas.'), { status: 404 });
    const v2=site.schemaVersion===2;
    const type = input.type && (v2?V2_PAGE_TYPES:PAGE_TYPES).has(input.type) ? input.type : page.type;
    const slug = 'slug' in input || type !== page.type ? normalizeSlug(input.slug ?? page.slug, type) : page.slug;
    if (site.pages.some(item => item.id !== pageId && item.slug === slug)) throw new Error('Toks URL jau suplanuotas.');
    page.type = type; page.slug = slug;
    for (const key of ['title', 'description', 'intent']) if (key in input) page[key] = v2?losslessString(input[key],1000):plain(input[key], key === 'description' ? 300 : 300);
    if ('body' in input) page.body = v2?normalizeV2Blocks(input.body):normalizeBlocks(input.body);
    if(v2&&'editorial'in input)page.editorial=structuredClone(input.editorial);
    if(v2)page.siteSnapshot=structuredClone(publicSite(site));
    if ('factChecks' in input) page.factChecks = (Array.isArray(input.factChecks) ? input.factChecks : []).slice(0, 40).map(item => plain(item, 600));
    if ('publishAt' in input) page.publishAt = iso(input.publishAt);
    if ('cluster' in input) page.cluster = plain(input.cluster, 120);
    if ('seasonalHook' in input) page.seasonalHook = plain(input.seasonalHook, 300);
    if ('pillarPageId' in input) {
      const pillarId = plain(input.pillarPageId, 80);
      if (pillarId && !site.pages.some(item => item.id === pillarId && item.id !== page.id)) throw new Error('Klasterio pagrindinis puslapis nerastas šioje svetainėje.');
      page.pillarPageId = pillarId;
    }
    if ('externalLinks' in input) page.externalLinks = (Array.isArray(input.externalLinks) ? input.externalLinks : []).slice(0, 20).map(item => ({
      url: plain(item.url, 2048), label: plain(item.label, 180), reason: plain(item.reason, 500), verified: item.verified === true,
    }));
    if ('linkSuggestions' in input) page.linkSuggestions = (Array.isArray(input.linkSuggestions) ? input.linkSuggestions : []).slice(0, 30).map(item => ({
      targetPageId: plain(item.targetPageId, 80), label: plain(item.label, 160), reason: plain(item.reason, 500),
    })).filter(item => item.targetPageId !== page.id && site.pages.some(target => target.id === item.targetPageId));
    if ('links' in input) page.links = (Array.isArray(input.links) ? input.links : []).slice(0, 30).map(item => ({ targetPageId: plain(item.targetPageId, 80), label: plain(item.label, 160) }));
    if ('networkLinkSuggestions' in input) page.networkLinkSuggestions = normalizeNetworkSuggestions(input.networkLinkSuggestions);
    if ('media' in input) {
      const media=[];const seen=new Set();
      for(const item of Array.isArray(input.media)?input.media:[]){
        const asset=site.assets.find(a=>a.id===item.id);
        if(!asset)throw new Error('Vaizdas nepriklauso šiai svetainei.');
        const family=asset.groupId?site.assets.filter(a=>a.groupId===asset.groupId).sort((a,b)=>b.width-a.width):[asset];
        for(const member of family){if(seen.has(member.id))continue;seen.add(member.id);const {id,src,alt,width,height,credit,rights}=member;media.push({id,src,alt,width,height,credit,rights});}
      }
      if(media.length>MAX_PAGE_MEDIA)throw new Error('Puslapyje telpa iki 60 medijos variantų. Priskirkite mažiau atskirų vaizdų; variantai netrumpinami tyliai.');
      page.media=media;
    }
    page.status = 'review'; page.approval = null; page.updatedAt = new Date().toISOString();
    await writeJson(siteFile(siteId), site);
    return page;
  });
}
export async function deleteDraftPage(siteId, pageId) {
  return locked(async () => {
    const site = await getSite(siteId);
    const index = site.pages.findIndex(item => item.id === pageId);
    if (index === -1) throw Object.assign(new Error('Puslapis nerastas.'), { status: 404 });
    const page = site.pages[index];
    if (page.publishedRevision) throw new Error('Patvirtintą puslapį pirmiausia atšaukite; jo juodraščio tiesiogiai šalinti negalima.');
    if (site.pages.some(item => item.id !== pageId && item.links.some(link => link.targetPageId === pageId))) throw new Error('Puslapį nurodo kita vidinė nuoroda. Pirma pašalinkite tą nuorodą.');
    site.pages.splice(index, 1);
    await writeJson(siteFile(siteId), site);
    return { deleted: pageId };
  });
}
export async function approvePage(siteId, pageId, actorId) {
  return locked(async () => {
    const site = await getSite(siteId);
    const page = site.pages.find(item => item.id === pageId);
    if (!page) throw Object.assign(new Error('Puslapis nerastas.'), { status: 404 });
    if (page.factChecks?.length) throw new Error('Išspręskite faktų patikros pastabas ir išsaugokite naują versiją prieš tvirtinimą.');
    if (!site.name || !site.offer || !site.facts?.trim() || !page.title || !page.description || !page.intent || !page.body.length) throw new Error('Patvirtinimui reikia patikrintų svetainės verslo faktų, pasiūlymo, puslapio antraštės, aprašymo, ketinimo ir turinio.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(site.contact.email || '')) throw new Error('Prieš publikavimą įrašykite taisyklingą veikiančio el. pašto adresą.');
    if (site.contact.phone && !/^\+?[\d\s().-]{7,30}$/.test(site.contact.phone)) throw new Error('Neteisingas telefono numeris. Palikite lauką tuščią arba įrašykite tikrą numerį.');
    if(page.contentVersion===2){
      page.siteSnapshot=structuredClone(publicSite(site));
      validateV2Draft(page,publicSite(site));
      if(['article','guide'].includes(page.type)&&!page.editorial.authors.length)throw new Error('Straipsniui reikia tikro redakcinio autoriaus snapshot.');
    }
    const text = page.contentVersion===2?bodyPlainText(page.body):page.body.map(block => block.text || block.items?.join(' ') || '').join(' ');
    if (text.length < 120) throw new Error('Turinyje per mažai naudingos informacijos.');
    for (const block of page.body) {
      if ((block.type === 'paragraph' || block.type === 'heading') && !block.text) throw new Error('Puslapyje yra tuščias teksto blokas.');
      if (block.type === 'list' && (!block.items.length || block.items.some(item => !item))) throw new Error('Puslapyje yra tuščias sąrašas.');
    }
    if(page.media.length>MAX_PAGE_MEDIA)throw new Error('Puslapyje telpa iki 60 medijos variantų.');
    for (const item of page.media) if (!item.alt || !item.rights || !item.width || !item.height) throw new Error('Vaizdams reikia alt teksto, matmenų ir naudojimo teisių.');
    for (const block of page.body) if (block.type === 'image' && !page.media.some(item => item.id === block.assetId)) throw new Error('Turinio vaizdas nėra priskirtas puslapio medijai.');
    for (const link of page.links) if (!link.label || !site.pages.some(item => item.id === link.targetPageId && (page.contentVersion===2||item.publishedRevision))) throw new Error('Vidinė nuoroda nurodo nepatvirtintą arba nežinomą puslapį.');
    const networkIndex = await networkCatalog();
    const networkDomains = new Set((await listSites()).map(item => item.canonicalHost));
    for (const source of page.externalLinks || []) {
      let url;
      try { url = new URL(source.url); } catch { throw new Error('Išorinio šaltinio URL neteisingas.'); }
      if (!source.url.startsWith('https://') || url.protocol !== 'https:' || !url.hostname || url.username || url.password || !source.label || !source.reason || !source.verified) throw new Error('Išoriniam šaltiniui reikia viešo HTTPS adreso be prisijungimo duomenų, pavadinimo, paaiškinimo ir patikros.');
      if (networkDomains.has(url.hostname)) {
        const proposed = (page.networkLinkSuggestions || []).find(link => networkIndex.some(target => target.siteId === link.targetSiteId && target.pageId === link.targetPageId && target.url === source.url));
        if (!proposed || proposed.label !== source.label || networkStatus(siteId, page, proposed, networkIndex).status !== 'ready') throw new Error('Tinklo nuoroda dar nepatikrinta, jos tikslas neviešas arba tekste nėra numatyto konteksto.');
      }
    }
    const hash = revisionHash(page);
    const approval = { status: 'approved', revisionHash: hash, approvedAt: new Date().toISOString(), actorId: plain(actorId, 120) || 'local-editor' };
    page.status = 'approved'; page.approval = approval; page.revisionHash = hash;
    page.publishedRevision = structuredClone({ ...revisionPayload(page), id: page.id, revisionHash: hash, approval });
    for (const asset of site.assets) if (page.media.some(item => item.id === asset.id)) asset.metadataPublished = true;
    page.updatedAt = new Date().toISOString();
    await writeJson(siteFile(siteId), site);
    return page;
  });
}
export async function revokePage(siteId, pageId) {
  return locked(async () => {
    const site = await getSite(siteId);
    const page = site.pages.find(item => item.id === pageId);
    if (!page) throw Object.assign(new Error('Puslapis nerastas.'), { status: 404 });
    // Preserve media immutability even when the public page snapshot is revoked.
    for (const asset of site.assets) if (page.publishedRevision?.media?.some(item => item.id === asset.id)) asset.metadataPublished = true;
    page.status = 'revoked'; page.approval = null; page.publishedRevision = null; page.updatedAt = new Date().toISOString();
    await writeJson(siteFile(siteId), site);
    return page;
  });
}
export function packageForSite(site) {
  const pages = site.pages.map(item => item.publishedRevision).filter(Boolean);
  const pageIds = new Set(pages.map(page => page.id));
  for (const page of pages) if (page.siteId !== site.id || page.approval?.revisionHash !== page.revisionHash || revisionHash(page) !== page.revisionHash) throw new Error('Patvirtintos versijos kontrolinė suma nesutampa.');
  for (const page of pages) for (const link of page.links) if (!pageIds.has(link.targetPageId)) throw new Error('Patvirtintas puslapis nukreipia į atšauktą arba nepatvirtintą puslapį.');
  const pkg={
    schemaVersion: site.schemaVersion===2?2:1, siteId: site.id, canonicalHost: site.canonicalHost, locale: site.locale,
    site: publicSite(site),
    pages, generatedAt: new Date().toISOString()
  };
  if(pkg.schemaVersion===2)validateV2Package(pkg);
  return pkg;
}
export async function exportPackage(siteId) {
  const site = await getSite(siteId);
  const content = packageForSite(site);
  if (!content.pages.length) throw new Error('Nėra patvirtintų puslapių eksportui.');
  if (!content.pages.some(page => page.type === 'home' && page.slug === '')) throw new Error('Eksportui reikia patvirtinto pagrindinio puslapio.');
  const target = path.join(OUTPUT, siteId);
  await mkdir(path.join(target, 'assets'), { recursive: true });
  for (const page of content.pages) for (const media of page.media) {
    const file = path.basename(media.src);
    const source = path.join(MEDIA_DIR, siteId, file);
    await stat(source);
    await copyFile(source, path.join(target, 'assets', file));
  }
  await writeJson(path.join(target, 'content-package.json'), content);
  return { path: path.join(target, 'content-package.json'), pages: content.pages.length, assets: new Set(content.pages.flatMap(page => page.media.map(item => item.src))).size };
}
export async function listJobs() { return (await readJson(JOB_FILE, [])).slice(-100).reverse(); }
export async function createJob(type, siteId, pageId = null) {
  return locked(async () => {
    const jobs = await readJson(JOB_FILE, []);
    const job = { id: randomUUID(), type, siteId, pageId, status: 'queued', startedAt: null, finishedAt: null, error: null, detail: '' };
    jobs.push(job); await writeJson(JOB_FILE, jobs.slice(-200)); return job;
  });
}
export async function updateJob(id, update) {
  return locked(async () => {
    const jobs = await readJson(JOB_FILE, []);
    const job = jobs.find(item => item.id === id);
    if (!job) throw new Error('Darbas nerastas.');
    Object.assign(job, update); await writeJson(JOB_FILE, jobs); return job;
  });
}
export async function saveAsset(siteId, asset, bytes) {
  return locked(async () => {
    const site = await getSite(siteId);
    if (asset.mime !== 'image/webp') throw new Error('Prieš importą konvertuokite vaizdą į WebP.');
    if (bytes.length > 8 * 1024 * 1024) throw new Error('Vaizdas viršija 8 MB ribą.');
    if (!asset.alt || !asset.rights) throw new Error('Vaizdui reikia alt teksto ir naudojimo teisių.');
    const id = randomUUID(); const filename = `${id}.webp`;
    const width = Number(asset.width), height = Number(asset.height);
    if (!(width > 0 && height > 0 && width <= 8192 && height <= 8192)) throw new Error('Neteisingi vaizdo matmenys.');
    const validMagic = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    if (!validMagic) throw new Error('Failo turinys neatitinka nurodyto vaizdo formato.');
    await mkdir(path.join(MEDIA_DIR, siteId), { recursive: true });
    await writeFile(path.join(MEDIA_DIR, siteId, filename), bytes);
    const record = { id, src: `/content-assets/${siteId}/${filename}`, alt: plain(asset.alt, 300), width, height,
      credit: plain(asset.credit, 200), rights: plain(asset.rights, 300), prompt: plain(asset.prompt, 1500) };
    site.assets.push(record); await writeJson(siteFile(siteId), site);
    return record;
  });
}
// Default for all new image imports, including agents and the studio GUI.
// saveAsset above remains a low-level legacy adapter for already-optimized bytes.
export async function saveResponsiveAsset(siteId, input, bytes) {
  await getSite(siteId);
  const alt=plain(input.alt,300),rights=plain(input.rights,300);
  if(!alt||!rights)throw new Error('Vaizdui reikia alt teksto ir naudojimo teisių.');
  const optimized=await optimizeRaster(bytes,input.mime);
  return locked(async()=>{
    const site=await getSite(siteId),groupId=randomUUID();
    const mediaDir=path.join(MEDIA_DIR,siteId),sourceDir=path.join(DATA,'media-originals',siteId);
    await mkdir(mediaDir,{recursive:true});await mkdir(sourceDir,{recursive:true});
    const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[input.mime];
    await writeFile(path.join(sourceDir,`${groupId}.${ext}`),bytes);
    const records=[];
    for(const v of optimized.variants){
      const id=randomUUID(),filename=`${id}.webp`;await writeFile(path.join(mediaDir,filename),v.bytes);
      records.push({id,groupId,src:`/content-assets/${siteId}/${filename}`,alt,width:v.width,height:v.height,credit:plain(input.credit,200),rights,prompt:plain(input.prompt,1500),bytes:v.bytes.length,sha256:createHash('sha256').update(v.bytes).digest('hex')});
    }
    const original={groupId,policy:optimized.policy,filename:`${groupId}.${ext}`,sourceSha256:createHash('sha256').update(bytes).digest('hex'),sourceBytes:bytes.length,...optimized.source,prompt:String(input.prompt??''),createdAt:new Date().toISOString()};
    await writeJson(path.join(sourceDir,`${groupId}.json`),original);
    site.assets.push(...records);await writeJson(siteFile(siteId),site);
    return {...records[0],variants:records,optimization:{policy:optimized.policy,sourceBytes:bytes.length,variantBytes:records.map(v=>({width:v.width,bytes:v.bytes})),originalStoredPrivately:true}};
  });
}
// Metadata correction for never-approved media only. Published snapshots and
// binary/provenance fields are immutable; change those through a new asset.
export async function editDraftAssetMetadata(siteId, assetId, input, actorId = 'local-editor') {
  return locked(async () => {
    const site = await getSite(siteId);
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['alt', 'credit'].includes(key)) || !Object.keys(input).length) throw new Error('Galima keisti tik juodraščio vaizdo alt ir credit.');
    const asset = site.assets.find(item => item.id === assetId);
    if (!asset) throw new Error('Vaizdas nepriklauso šiai svetainei.');
    const family = asset.groupId ? site.assets.filter(item => item.groupId === asset.groupId) : [asset];
    const ids = new Set(family.map(item => item.id));
    if (family.some(item => item.metadataPublished === true) || site.pages.some(page => page.publishedRevision?.media?.some(item => ids.has(item.id)) || page.approval?.status === 'approved' && page.media.some(item => ids.has(item.id)))) throw new Error('Patvirtinto vaizdo metaduomenys nekintami; importuokite naują vaizdo šeimą ir peržiūrėkite naują puslapio reviziją.');
    const changes = {};
    for (const key of Object.keys(input)) {
      const value = losslessString(input[key], key === 'alt' ? 300 : 200).trim();
      if (key === 'alt' && !value) throw new Error('Vaizdui reikia aprašomojo alt teksto.');
      changes[key] = value;
    }
    const updatedAt = new Date().toISOString();
    for (const member of family) {
      member.metadataHistory = [...(member.metadataHistory || []), { updatedAt, actorId: plain(actorId, 120), before: { alt: member.alt, credit: member.credit || '' } }];
      Object.assign(member, changes);
    }
    const affectedPageIds = [];
    for (const page of site.pages) if (page.media.some(item => ids.has(item.id))) {
      for (const member of page.media) if (ids.has(member.id)) Object.assign(member, changes);
      page.status = 'review'; page.approval = null; page.updatedAt = updatedAt;
      page.revisionHash = revisionHash(page);
      affectedPageIds.push(page.id);
    }
    site.updatedAt = updatedAt;
    await writeJson(siteFile(siteId), site);
    return { assetId, variantIds: [...ids], affectedPageIds, updatedAt, privateOnly: true };
  });
}
export async function getAssetFile(siteId, filename) {
  if (!safeId(siteId) || !/^[a-f0-9-]{36}\.webp$/.test(filename)) throw new Error('Neteisingas vaizdo adresas.');
  const site = await getSite(siteId);
  if (!site.assets.some(item => path.basename(item.src) === filename)) throw Object.assign(new Error('Vaizdas nerastas.'), { status: 404 });
  return path.join(MEDIA_DIR, siteId, filename);
}
