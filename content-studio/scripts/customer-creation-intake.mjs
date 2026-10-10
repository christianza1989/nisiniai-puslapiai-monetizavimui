// Server-only private intake. One fresh Node process owns one isolated model context.
import { createHash } from 'node:crypto';
import { lstat, mkdir, open, readFile, readdir, realpath, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { stableV2, normalizeV2Blocks } from '../src/content-package-v2.mjs';

const VERSION = 'customer-content-intake.v1';
const sha = value => createHash('sha256').update(value).digest('hex');
const fail = code => { throw Object.assign(new Error(code), { code }); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, max, empty = false) => typeof value === 'string' && value.length <= max && (empty || value.trim().length > 0);
const pageId = pathname => 'page-' + sha(pathname).slice(0, 24);
const pagePath = value => typeof value === 'string' && value.length <= 150
  && /^\/(?:[a-z0-9]+(?:[-/][a-z0-9]+)*\/)?$/.test(value) && !/^\/(?:api|niche)(?:\/|$)/.test(value);
const json = value => Buffer.from(stableV2(value), 'utf8');
const accent = { indigo: '#3730a3', teal: '#115e59', clay: '#9a3412', forest: '#166534', cobalt: '#1e40af', plum: '#6b21a8' };

async function noLinks(root, target) {
  const relative = path.relative(root, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) fail('path_outside_artifacts');
  let cursor = root;
  for (const segment of ['', ...relative.split(path.sep).filter(Boolean)]) {
    if (segment) cursor = path.join(cursor, segment);
    try { const stat = await lstat(cursor); if (stat.isSymbolicLink() || !stat.isDirectory()) fail('unsafe_artifact_directory'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
async function exclusive(file, bytes) { await writeFile(file, bytes, { flag: 'wx', mode: 0o600 }); }
async function regularBytes(file) {
  const stat = await lstat(file);
  if (stat.isSymbolicLink() || !stat.isFile()) fail('unsafe_artifact_file');
  return readFile(file);
}
async function load(file) { return JSON.parse((await regularBytes(file)).toString('utf8')); }

function validate(input) {
  if (!object(input) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(input.creationId)
      || !Number.isSafeInteger(input.acceptedRevision) || input.acceptedRevision < 1
      || !/^[a-f0-9]{64}$/.test(input.sourceHash)) fail('invalid_creation_identity');
  const draft = input.draft;
  if (!object(draft) || !object(draft.business) || !text(draft.business_name, 100) || !text(draft.tagline, 200)
      || !text(draft.business.customer, 800) || !object(draft.brand) || !accent[draft.brand.accent]
      || !Array.isArray(draft.pages) || draft.pages.length < 3 || draft.pages.length > 8) fail('invalid_server_draft');
  const bytes = json(draft);
  if (bytes.length > 200000 || sha(bytes) !== input.sourceHash) fail('source_hash_mismatch');
  const paths = new Set();
  for (const [index, page] of draft.pages.entries()) {
    if (!object(page) || !pagePath(page.path) || (index === 0) !== (page.path === '/') || paths.has(page.path)
        || !text(page.title, 160) || !text(page.navigation_label, 50) || !text(page.meta_description, 220)
        || !text(page.intent, 300) || !Array.isArray(page.sections) || page.sections.length < 2 || page.sections.length > 7) fail('invalid_server_page');
    paths.add(page.path);
    for (const section of page.sections) {
      if (!object(section) || !text(section.heading, 160) || !text(section.body, 1800) || !Array.isArray(section.items)
          || section.items.length > 8 || section.items.some(item => !text(item, 800))) fail('invalid_server_section');
    }
  }
  const verifiedFacts = input.verifiedFacts ?? [];
  if (!Array.isArray(verifiedFacts) || verifiedFacts.length > 15 || verifiedFacts.some(item => !text(item, 800)) || verifiedFacts.join('\n').length > 12000) fail('invalid_verified_facts');
  const knownContact = input.knownContact ?? { email: '', phone: '' };
  if (!object(knownContact) || Object.keys(knownContact).some(key => !['email', 'phone'].includes(key))
      || !text(knownContact.email ?? '', 250, true) || !text(knownContact.phone ?? '', 80, true)) fail('invalid_known_contact');
  if (knownContact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(knownContact.email)) fail('invalid_known_contact');
  if (knownContact.phone && !/^\+?[\d\s().-]{7,30}$/.test(knownContact.phone)) fail('invalid_known_contact');
  if (!text(input.operatorName ?? '', 300, true)) fail('invalid_operator');
  if (!text(input.canonicalHost, 253) || input.canonicalHost !== input.canonicalHost.trim().toLowerCase()
      || /[:/\\\s]/.test(input.canonicalHost)) fail('canonical_host_required');
  for (const key of ['artifactsRoot', 'dataDir', 'outputDir']) if (!text(input[key], 32767) || !path.isAbsolute(input[key])) fail('absolute_artifact_paths_required');
  const artifactsRoot = path.resolve(input.artifactsRoot);
  if (path.basename(artifactsRoot) !== 'artifacts' || path.basename(path.dirname(artifactsRoot)) !== 'runtime') fail('runtime_artifacts_required');
  const revisionDir = path.join(artifactsRoot, 'customer-content', input.creationId, 'revision-' + input.acceptedRevision);
  const dataDir = path.join(revisionDir, 'data'), outputDir = path.join(revisionDir, 'output');
  if (path.resolve(input.dataDir) !== dataDir || path.resolve(input.outputDir) !== outputDir) fail('revision_directory_mismatch');
  const contentPlan = input.contentPlan ?? draft.content_plan ?? [];
  if (!Array.isArray(contentPlan) || contentPlan.length > 24) fail('invalid_content_plan');
  return { draft, bytes, artifactsRoot, revisionDir, dataDir, outputDir, contentPlan, verifiedFacts,
    contact: { email: knownContact.email ?? '', phone: knownContact.phone ?? '' }, operatorName: input.operatorName ?? '',
    siteId: 'creation-' + input.creationId.replaceAll('-', '') };
}

function planProjection(items, importedAt, normalizeBrief) {
  const proposals = [], issues = [], byPath = new Map();
  for (const [index, source] of items.entries()) {
    let item;
    try { item = normalizeBrief(source); } catch { issues.push(`Turinio plano įrašas ${index + 1} neturi pilnos palaikomos planavimo užduoties; reikia peržiūrėti jo laukus ir ribas.`); continue; }
    if (!object(item) || !pagePath(item.path) || item.path === '/' || byPath.has(item.path)
        || !text(item.title, 160) || !text(item.intent, 300) || !text(item.audience_problem, 1000)
        || !text(item.business_goal, 1000) || !text(item.primary_topic, 120)
        || !text(item.reason, 1000)
        || !(item.month === '' || /^\d{4}-(?:0[1-9]|1[0-2])$/.test(item.month ?? ''))
        || !text(item.seasonal_hook ?? item.seasonalHook ?? '', 300, true)
        || (item.month === '' && (item.seasonal_hook ?? item.seasonalHook ?? '') !== '')
        || !Array.isArray(item.internal_links) || item.internal_links.length > 8 || item.internal_links.some(value => !pagePath(value))
        || !Array.isArray(item.source_urls) || item.source_urls.length > 6
        || item.source_urls.some(value => { try { const url = new URL(value); return url.protocol !== 'https:' || !!url.username || !!url.password || !!url.port || !url.hostname.includes('.'); } catch { return true; } })) {
      issues.push(`Turinio plano įrašas ${index + 1} netinka bendram importui; reikia taisyklingo URL, apimties, mėnesio ir priklausomybių.`); continue;
    }
    byPath.set(item.path, item);
    proposals.push({ id: pageId(item.path), type: 'guide', slug: item.path.slice(1, -1), title: item.title,
      description: item.audience_problem, intent: item.intent, reason: item.reason, cluster: item.primary_topic,
      pillarSlug: item.pillar_path.slice(1, -1), sourceQueries: item.source_queries, planningBrief: item,
      seasonalHook: item.seasonal_hook, networkLinks: [], body: [], publishAt: importedAt });
  }
  if (!items.length) issues.push('Dar nėra tikro turinio plano su atskirais klausimais, šaltinių poreikiais, ryšiais ir medijos užduotimis.');
  else if (items.length < 3) issues.push('Pradinis platformos turinio planas dalinis; dar trūksta atskirų pagrįstų gidų užduočių.');
  return { proposals, issues, byPath, state: !items.length ? 'not-provided' : issues.length ? 'partial' : 'imported-unscheduled' };
}

export async function intakeCreationDraft(input) {
  // These are trusted server inputs. Authentication and accepted-revision fencing belong to the caller.
  const context = validate(input);
  const { draft, artifactsRoot, revisionDir, dataDir, outputDir, siteId } = context;
  await noLinks(artifactsRoot, revisionDir);
  if (await realpath(artifactsRoot) !== artifactsRoot) fail('artifacts_root_alias');
  process.env.STUDIO_DATA_DIR = dataDir; process.env.STUDIO_OUTPUT_DIR = outputDir;
  const model = await import('../src/model.mjs');
  if (model.DATA !== dataDir || model.OUTPUT !== outputDir) fail('studio_context_conflict');
  // The maintained model requires its companion settings even though client defaults are cleared.
  // Preflight before claiming the immutable revision; the caller configures this environment path.
  try { JSON.parse(await readFile(process.env.STUDIO_NETWORK_SETTINGS || path.resolve(model.ROOT, '../../dovanos-memorycasting/config/niche-network.json'), 'utf8')); }
  catch { fail('studio_network_settings_unavailable'); }
  const importerHash = sha(await readFile(new URL(import.meta.url)));
  const request = { version: VERSION, importerHash, creationId: input.creationId, acceptedRevision: input.acceptedRevision,
    sourceHash: input.sourceHash, canonicalHost: input.canonicalHost, siteId, dataDir, outputDir,
    verifiedFacts: context.verifiedFacts, knownContact: context.contact, operatorName: context.operatorName, contentPlan: context.contentPlan };
  const requestBytes = json(request), requestHash = sha(requestBytes);
  if (requestBytes.length > 300000) fail('input_too_large');
  await mkdir(revisionDir, { recursive: true });
  await noLinks(artifactsRoot, revisionDir);
  const lockPath = path.join(revisionDir, '.intake.lock');
  let lock;
  try { lock = await open(lockPath, 'wx', 0o600); } catch (error) { if (error.code === 'EEXIST') fail('intake_busy'); throw error; }
  const manifestPath = path.join(revisionDir, 'intake-manifest.json');
  try {
    const existing = (await readdir(revisionDir)).filter(name => name !== '.intake.lock');
    if (existing.length) {
      if (!existing.includes('intake-manifest.json')) fail('intake_interrupted');
      const manifest = await load(manifestPath);
      if (manifest.version !== VERSION || manifest.requestHash !== requestHash || manifest.sourceHash !== input.sourceHash
          || manifest.acceptedRevision !== input.acceptedRevision || manifest.siteId !== siteId
          || manifest.creationId !== input.creationId || manifest.canonicalHost !== input.canonicalHost
          || manifest.state !== 'private-draft-imported' || manifest.fullF1 !== 'UNVERIFIED'
          || manifest.launch !== 'UNVERIFIED' || manifest.deployment !== 'not-performed') fail('intake_revision_conflict');
      await noLinks(artifactsRoot, path.join(dataDir, 'sites')); await noLinks(artifactsRoot, outputDir);
      if (sha(await regularBytes(path.join(revisionDir, 'source-draft.json'))) !== input.sourceHash
          || sha(await regularBytes(path.join(revisionDir, 'intake-context.json'))) !== requestHash
          || sha(await regularBytes(path.join(dataDir, 'sites', siteId + '.json'))) !== manifest.siteFileHash) fail('intake_artifact_changed');
      return { ...manifest, manifestPath, dataDir, outputDir, replayed: true, workflow: await model.getContentWorkflow(siteId) };
    }
    await exclusive(path.join(revisionDir, 'source-draft.json'), context.bytes);
    await exclusive(path.join(revisionDir, 'intake-context.json'), requestBytes);
    await mkdir(path.join(dataDir, 'sites'), { recursive: true });
    await mkdir(path.join(dataDir, 'media'), { recursive: true });
    await mkdir(outputDir);
    const site = await model.createSite({ siteId, canonicalHost: input.canonicalHost, schemaVersion: 2, renderer: 'niche', name: draft.business_name, offer: draft.tagline });
    if (site.canonicalHost !== input.canonicalHost) fail('canonical_host_changed');
    await model.editSite(siteId, { audience: draft.business.customer, facts: context.verifiedFacts.join('\n'),
      contact: context.contact, operatorName: context.operatorName, stage: 'planning', brand: { accent: accent[draft.brand.accent] }, contentPolicy: {} });
    const importedAt = new Date().toISOString();
    const plan = planProjection(context.contentPlan, importedAt, model.normalizePlanningBrief);
    const pageMappings = [];
    for (const page of draft.pages) {
      const item = plan.byPath.get(page.path);
      const body = page.sections.flatMap(section => [{ type: 'heading', level: 2, text: section.heading },
        { type: 'paragraph', text: section.body }, ...(section.items.length ? [{ type: 'list', items: section.items }] : [])]);
      await model.addPage(siteId, { id: pageId(page.path), type: page.path === '/' ? 'home' : 'guide', slug: page.path.slice(1, -1),
        title: page.title, description: page.meta_description, intent: page.intent, body: normalizeV2Blocks(body), publishAt: importedAt,
        ...(item ? { planningBrief: item, sourceQueries: item.source_queries, reason: item.reason, cluster: item.primary_topic } : {}) });
      pageMappings.push({ path: page.path, pageId: pageId(page.path), origin: 'draft' });
    }
    // mergePlan's un-timed transport limit is 12; chunks do not invent a planning cadence.
    for (let index = 0; index < plan.proposals.length; index += 12) await model.mergePlan(siteId, plan.proposals.slice(index, index + 12), 0);
    const importedSite = await model.getSite(siteId);
    const planningBriefs = [];
    for (const page of importedSite.pages) {
      const pathname = page.type === 'home' ? '/' : '/' + page.slug + '/';
      const item = plan.byPath.get(pathname);
      if (!pageMappings.some(mapping => mapping.pageId === page.id)) pageMappings.push({ path: pathname, pageId: page.id, origin: 'content-plan' });
      const factChecks = [
        'Privatus importas dar neįrodo puslapio faktų, autoriaus, dizaino, vaizdų ar SEO / GEO patikros.',
        'Publikavimo laikas yra importo žyma; tikras kalendorius ir turinio politika dar nepatvirtinti.',
        'Puslapio teiginiai dar nesusieti su iš tikrųjų perskaitytais ir patikrintais šaltiniais.',
        'Native V2 rašytojo prijungimas dar nepatikrintas; legacy generatorius V2 juodraščių nekuria.',
        ...(!context.verifiedFacts.length ? ['Nėra nepriklausomai patvirtintų verslo faktų; AI įvardyti faktai lieka kandidatais.'] : []),
        ...(!context.contact.email ? ['Nežinomas patvirtintas kliento kontaktinis el. pašto adresas.'] : ['Kontaktinio laiško pristatymas dar nepatikrintas.']),
        ...plan.issues,
        ...(item ? [item.month ? `Turinio plane numatytas ${item.month} mėnuo yra hipotezė; reikia tikros dienos ir planavimo sprendimo.` : 'Turinio planas neturi datos; publikavimo laikas parenkamas tik po tikro planavimo sprendimo.'] : []),
        ...(item && (item.title !== page.title || item.intent !== page.intent) ? ['Juodraščio pavadinimas arba ketinimas nesutampa su turinio planu; reikia suderintos revizijos.'] : []),
      ];
      const candidates = item?.source_urls ?? (page.id === pageId(draft.pages[1].path) ? (draft.research ?? []).map(source => source.url) : []);
      const externalLinks = candidates.map((url, index) => ({ url, label: 'Šaltinio kandidatas ' + (index + 1),
        reason: 'Kandidatas tikrai šaltinio ir susijusių teiginių patikrai; turinys dar neperskaitytas ir nepatvirtintas.', verified: false }));
      const targets = item?.internal_links ?? (page.type === 'home' ? draft.pages.slice(1).map(candidate => candidate.path) : ['/']);
      const linkSuggestions = [];
      for (const target of new Set(targets)) {
        const targetPage = importedSite.pages.find(candidate => candidate.id === pageId(target));
        if (!targetPage || targetPage.id === page.id) { factChecks.push('Planuotos nuorodos tikslas netinka šiam importui: ' + target); continue; }
        linkSuggestions.push({ targetPageId: targetPage.id, label: draft.pages.find(candidate => candidate.path === target)?.navigation_label ?? targetPage.title,
          reason: item ? 'Turinio plane numatytas skaitytojo perėjimas; jo kontekstą dar reikia patikrinti.' : 'Pradinis navigacijos kelias padeda rasti pasiūlymą ir jo paaiškinimus; ryšys dar nepatikrintas.' });
      }
      if (factChecks.length > 40 || factChecks.some(note => note.length > 600)) fail('intake_notes_overflow');
      await model.editPage(siteId, page.id, { factChecks, externalLinks, linkSuggestions, ...(item ? { cluster: item.primary_topic } : {}) });
    }
    // The typed plan places broad parents before supports; draft inventory can have a different order.
    for (const [pathname, item] of plan.byPath) {
      const page = (await model.getSite(siteId)).pages.find(candidate => candidate.id === pageId(pathname));
      try {
        const receipt = await model.reconcilePlanningBrief(siteId, page.id, { expectedRevisionHash: model.revisionHash(page),
          expectedPlanningHash: model.planningContextHash(page), planningBrief: item });
        planningBriefs.push({ pageId: page.id, state: 'attached', planningHash: receipt.planningHash });
      } catch {
        const factChecks = [...page.factChecks, 'Pilnai planavimo užduočiai dar trūksta tinkamų tikrų šios svetainės ryšių; writer negali laikyti jos suderinta.'];
        if (factChecks.length > 40) fail('intake_notes_overflow');
        await model.editPage(siteId, page.id, { factChecks });
        planningBriefs.push({ pageId: page.id, state: 'blocked' });
      }
    }
    const finalSite = await model.getSite(siteId);
    if (finalSite.contentWorkflowVersion !== 1 || finalSite.pages.some(page => page.approval || page.publishedRevision)) fail('unexpected_public_approval');
    const workflow = await model.getContentWorkflow(siteId);
    const manifest = { version: VERSION, state: 'private-draft-imported', creationId: input.creationId, acceptedRevision: input.acceptedRevision,
      sourceHash: input.sourceHash, requestHash, importerHash, siteId, canonicalHost: input.canonicalHost, importedAt,
      siteFileHash: sha(await readFile(path.join(dataDir, 'sites', siteId + '.json'))),
      contentPlanState: plan.state, planItems: context.contentPlan.length, planImported: plan.proposals.length, planIssues: plan.issues,
      planningBriefState: !context.contentPlan.length ? 'not-provided' : plan.issues.length || planningBriefs.some(item => item.state === 'blocked') ? 'partial' : 'attached',
      planningBriefs, writer: 'not-executed', dependencies: ['native-v2-writer-integration-unverified'],
      scheduling: 'unverified-import-placeholder', policyDecision: 'unverified-studio-defaults', pageMappings,
      fullF1: 'UNVERIFIED', launch: 'UNVERIFIED', deployment: 'not-performed' };
    await exclusive(manifestPath, json(manifest));
    return { ...manifest, manifestPath, dataDir, outputDir, replayed: false, workflow };
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const chunks = []; let size = 0;
    for await (const chunk of process.stdin) { size += chunk.length; if (size > 500000) fail('input_too_large'); chunks.push(chunk); }
    const result = await intakeCreationDraft(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    process.stdout.write(JSON.stringify(result) + '\n');
  } catch (error) {
    // Never echo customer text, paths, model output or underlying filesystem diagnostics.
    process.stderr.write(JSON.stringify({ version: VERSION, state: 'failed', code: /^[a-z_]+$/.test(error.code ?? '') ? error.code : 'intake_failed' }) + '\n');
    process.exitCode = 1;
  }
}
