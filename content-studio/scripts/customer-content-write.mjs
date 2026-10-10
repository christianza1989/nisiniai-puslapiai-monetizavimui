// Server-only prepare/apply bridge. It never invokes a model, verifies evidence or publishes.
import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { stableV2, normalizeV2Blocks, inlineNodes, bodyPlainText } from '../src/content-package-v2.mjs';
import { loadEditorialSkill, buildEditorialPrompt } from '../src/editorial-skill.mjs';
import { workflowOverview } from '../src/content-workflow.mjs';
import { researchContext } from '../src/seo-research.mjs';

const VERSION = 'customer-content-write.v1';
const sha = value => createHash('sha256').update(value).digest('hex');
const digest = value => sha(stableV2(value));
const fail = code => { throw Object.assign(new Error(code), { code }); };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const boundedText = (value, minimum, maximum) => typeof value === 'string' && value.trim().length >= minimum && value.length <= maximum;
const native = JSON.parse(readFileSync(new URL('../schemas/content-package.v2.schema.json', import.meta.url), 'utf8'));

// Native block/inline/target definitions are reused verbatim, never a second public schema.
export const writerOutputSchema = {
  type: 'object', additionalProperties: false, required: ['title', 'description', 'intent', 'body', 'factChecks'],
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 160 },
    description: { type: 'string', minLength: 30, maxLength: 220 },
    intent: { type: 'string', minLength: 10, maxLength: 300 },
    body: { type: 'array', minItems: 1, maxItems: 300, items: { $ref: '#/$defs/block' } },
    factChecks: { type: 'array', maxItems: 30, items: { type: 'string', minLength: 1, maxLength: 600 } },
  },
  $defs: { block: native.$defs.block, inline: native.$defs.inline,
    target: { oneOf: native.$defs.target.oneOf.filter(branch => ['page', 'external'].includes(branch.properties.kind.const)) } },
};
const task = `Parenk pilną naudingą šio puslapio juodraštį svetainės kalba pagal jo konkretų klausimą ir visą planningBrief.
Grąžink tik pateiktos native V2 JSON schemos title, description, intent, body ir factChecks. Leidžiami tik tikros V2 schemos blokai; neatkurk V1 blocks formato, HTML, JS ar tariamų įrankių.
Pradėk aiškiu atsakymu, pateik konkrečius pasirinkimo kriterijus ar aiškiai pažymėtą pavyzdį, paaiškink ribas. Neišgalvok vykdymo, kainų, ekspertų, klientų, kontaktų, datų ar atsisiuntimų.
businessProposal ir sourceCandidates yra hipotezės bei nepatikrinti kandidatai. verifiedFacts – tik atskirai pateikti verslo duomenys, o ne nepriklausomas išorinių teiginių įrodymas. Neišspręstą faktą praleisk tekste ir tiksliai nurodyk factChecks.
Vidinės rich nuorodos naudoja tik pateiktus tikrus tos pačios svetainės pageId. Išorinė rich nuoroda galima tik į existingVerifiedExternalUrls. Kandidato URL nėra perskaityto šaltinio įrodymas. Naujos commerce nuorodos neleidžiamos. Image blokas gali naudoti tik jau priskirtą page.media assetId; promptas nėra vaizdas.
Neįrašyk atliktos šaltinių, vaizdų, redakcinės, SEO/GEO ar publikavimo patikros, kurios neatlikai. Nekelk publikavimo, approval, release ar deployment laukų. Po rašymo atskirai perskaityk visą tekstą, pataisyk kalbą ir išsaugok faktinę prasmę. Ši saviredakcija nesukuria bendro workflow review ar PASS.`;

async function bytes(file, limit) {
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > limit) fail('writer_unsafe_artifact');
  return readFile(file);
}
async function noLinks(root, target) {
  const relative = path.relative(root, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) fail('writer_path_outside_artifacts');
  let cursor = root;
  for (const segment of ['', ...relative.split(path.sep).filter(Boolean)]) {
    if (segment) cursor = path.join(cursor, segment);
    const stat = await lstat(cursor);
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail('writer_unsafe_artifact');
  }
}
async function loadContext(input) {
  if (!object(input) || !['prepare', 'apply'].includes(input.command)
      || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(input.creationId)
      || !Number.isSafeInteger(input.acceptedRevision) || input.acceptedRevision < 1 || !hash(input.sourceHash)
      || !/^page-[a-f0-9]{24}$/.test(input.pageId) || !boundedText(input.canonicalHost, 1, 253)) fail('writer_invalid_identity');
  for (const key of ['artifactsRoot', 'dataDir', 'outputDir']) {
    if (typeof input[key] !== 'string' || !path.isAbsolute(input[key])) fail('writer_absolute_paths_required');
  }
  const root = path.resolve(input.artifactsRoot);
  if (path.basename(root) !== 'artifacts' || path.basename(path.dirname(root)) !== 'runtime') fail('writer_runtime_artifacts_required');
  const directory = path.join(root, 'customer-content', input.creationId, 'revision-' + input.acceptedRevision);
  const data = path.join(directory, 'data'), output = path.join(directory, 'output');
  if (path.resolve(input.dataDir) !== data || path.resolve(input.outputDir) !== output) fail('writer_revision_directory_mismatch');
  await noLinks(root, path.join(data, 'sites')); await noLinks(root, output);
  if (await realpath(root) !== root) fail('writer_artifacts_alias');
  try { await lstat(path.join(directory, '.intake.lock')); fail('writer_intake_busy'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const manifestBytes = await bytes(path.join(directory, 'intake-manifest.json'), 1000000);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const siteId = 'creation-' + input.creationId.replaceAll('-', '');
  if (manifest.version !== 'customer-content-intake.v1' || manifest.state !== 'private-draft-imported'
      || manifest.creationId !== input.creationId || manifest.acceptedRevision !== input.acceptedRevision
      || manifest.sourceHash !== input.sourceHash || manifest.siteId !== siteId || manifest.canonicalHost !== input.canonicalHost
      || manifest.fullF1 !== 'UNVERIFIED' || manifest.launch !== 'UNVERIFIED' || manifest.deployment !== 'not-performed') fail('writer_intake_binding_mismatch');
  const original = await bytes(path.join(directory, 'source-draft.json'), 200000);
  const contextBytes = await bytes(path.join(directory, 'intake-context.json'), 300000);
  if (sha(original) !== input.sourceHash || sha(contextBytes) !== manifest.requestHash) fail('writer_original_hash_mismatch');
  const intake = JSON.parse(contextBytes.toString('utf8')), proposal = JSON.parse(original.toString('utf8'));
  if (intake.creationId !== input.creationId || intake.acceptedRevision !== input.acceptedRevision
      || intake.sourceHash !== input.sourceHash || intake.siteId !== siteId || intake.canonicalHost !== input.canonicalHost
      || intake.version !== manifest.version || intake.importerHash !== manifest.importerHash
      || intake.dataDir !== data || intake.outputDir !== output) fail('writer_intake_binding_mismatch');
  const mapping = manifest.pageMappings?.find(item => item.pageId === input.pageId);
  if (!mapping || mapping.pageId !== 'page-' + sha(mapping.path).slice(0, 24)) fail('writer_page_not_in_intake');
  await bytes(path.join(data, 'sites', siteId + '.json'), 2000000);
  process.env.STUDIO_DATA_DIR = data; process.env.STUDIO_OUTPUT_DIR = output;
  const model = await import('../src/model.mjs');
  if (model.DATA !== data || model.OUTPUT !== output) fail('writer_studio_context_conflict');
  const site = await model.getSite(siteId);
  const page = site.pages.find(item => item.id === input.pageId && item.siteId === siteId && item.status !== 'revoked');
  if (site.id !== siteId || site.canonicalHost !== input.canonicalHost || site.schemaVersion !== 2 || site.contentWorkflowVersion !== 1
      || !page || page.contentVersion !== 2 || (page.type === 'home' ? '/' : '/' + page.slug + '/') !== mapping.path) fail('writer_page_binding_mismatch');
  if (!page.planningBrief) fail('writer_planning_brief_required');
  const brief = model.normalizePlanningBrief(page.planningBrief);
  if (brief.path !== mapping.path) fail('writer_page_binding_mismatch');
  const skill = await loadEditorialSkill('draft');
  const research = researchContext(site);
  skill.researchSnapshots.set(`${site.id}:${site.canonicalHost}:${site.locale}`, research);
  // Assessment time is volatile; exact evidence bytes and actual usable/stale
  // states are context. A changed research snapshot requires fresh preparation.
  const { assessedAt, ...researchSnapshot } = research;
  const researchSnapshotHash = digest(researchSnapshot);
  const instructionHash = sha(skill.instructions + '\n' + task + '\n' + stableV2(writerOutputSchema));
  const expectedRevisionHash = model.revisionHash(page), expectedPlanningHash = model.planningContextHash(page), expectedSiteHash = model.studioContextHash(site);
  const expectedContextHash = digest({ manifestHash: sha(manifestBytes), siteId, pageId: page.id,
    expectedRevisionHash, expectedPlanningHash, expectedSiteHash, researchSnapshotHash, instructionHash });
  return { model, site, page, brief, intake, proposal, manifest, skill, instructionHash,
    expectedRevisionHash, expectedPlanningHash, expectedSiteHash, expectedContextHash, researchSnapshotHash };
}

function validateOutput(value, context) {
  const { site, page } = context;
  if (!object(value) || Object.keys(value).length !== 5 || ['title', 'description', 'intent', 'body', 'factChecks'].some(key => !(key in value))
      || !boundedText(value.title, 1, 160) || !boundedText(value.description, 30, 220) || !boundedText(value.intent, 10, 300)
      || !Array.isArray(value.body) || !value.body.length || value.body.length > 300 || Buffer.byteLength(stableV2(value)) > 200000
      || !Array.isArray(value.factChecks) || value.factChecks.length > 30 || value.factChecks.some(note => !boundedText(note, 1, 600))) fail('writer_output_invalid');
  let body;
  try { body = normalizeV2Blocks(value.body); } catch { fail('writer_output_invalid'); }
  if (!bodyPlainText(body).trim()) fail('writer_output_invalid');
  const verified = new Set((page.externalLinks || []).filter(item => item.verified === true).map(item => item.url));
  for (const node of inlineNodes({ body })) {
    if (node.type !== 'link') continue;
    if (node.target.kind === 'page') {
      if (node.target.pageId === page.id || !site.pages.some(item => item.id === node.target.pageId && item.siteId === site.id && item.status !== 'revoked')) fail('writer_unknown_link');
    } else if (node.target.kind !== 'external' || !verified.has(node.target.url)) fail('writer_unverified_external_link');
  }
  if (body.some(block => block.type === 'image' && !page.media.some(asset => asset.id === block.assetId))) fail('writer_unknown_asset');
  // The full public page validator also requires a known operator/contact snapshot.
  // Private writing may proceed with those unknowns; native rich/body and real IDs
  // are validated here, and canonical review/approval retains every public gate.
  const factChecks = [...new Set([...(page.factChecks || []), ...value.factChecks])];
  if (factChecks.length > 40 || factChecks.some(note => !boundedText(note, 1, 600))) fail('writer_notes_overflow');
  return { ...value, body, factChecks };
}

export async function customerContentWrite(input) {
  // Authentication, current creation/job/lease fencing and provider budgets are caller responsibilities.
  const context = await loadContext(input);
  const { model, site, page, brief } = context;
  const binding = { version: VERSION, creationId: input.creationId, acceptedRevision: input.acceptedRevision,
    sourceHash: input.sourceHash, canonicalHost: input.canonicalHost, siteId: site.id, pageId: page.id,
    expectedRevisionHash: context.expectedRevisionHash, expectedPlanningHash: context.expectedPlanningHash,
    expectedContextHash: context.expectedContextHash, instructionHash: context.instructionHash,
    researchSnapshotHash: context.researchSnapshotHash,
    fullF1: 'UNVERIFIED', launch: 'UNVERIFIED', deployment: 'not-performed' };
  if (input.command === 'prepare') {
    const siteData = { id: site.id, domain: site.canonicalHost, locale: site.locale, timezone: site.timezone,
      name: site.name, offer: site.offer, audience: site.audience, verifiedFacts: context.intake.verifiedFacts,
      currentSiteFacts: site.facts, contact: site.contact, operatorName: site.operatorName,
      businessProposal: context.proposal.business, assumptions: context.proposal.assumptions,
      openQuestions: context.proposal.open_questions, sourceCandidates: context.proposal.research,
      inventory: site.pages.filter(item => item.status !== 'revoked').map(item => ({ pageId: item.id, type: item.type,
        path: item.type === 'home' ? '/' : '/' + item.slug + '/', title: item.title, intent: item.intent,
        hasApprovedRevision: Boolean(item.publishedRevision), revisionHash: model.revisionHash(item) })) };
    const pageData = { pageId: page.id, title: page.title, description: page.description, intent: page.intent, body: page.body,
      planningBrief: brief, sourceQueries: page.sourceQueries, sourceCandidates: brief.source_urls,
      existingVerifiedExternalUrls: (page.externalLinks || []).filter(item => item.verified).map(item => item.url),
      externalLinks: page.externalLinks, media: page.media, editorial: page.editorial, factChecks: page.factChecks,
      pillarPageId: page.pillarPageId, linkSuggestions: page.linkSuggestions, links: page.links };
    return { ...binding, state: 'prepared', siteData, pageData, outputSchema: writerOutputSchema,
      instructions: buildEditorialPrompt(context.skill, { mode: 'draft', instruction: task, siteData, pageData }),
      instructionMetadata: context.skill.metadata, workflow: workflowOverview(site, model.revisionHash) };
  }
  if (!hash(input.expectedRevisionHash) || !hash(input.expectedPlanningHash) || !hash(input.expectedContextHash)
      || input.expectedRevisionHash !== context.expectedRevisionHash || input.expectedPlanningHash !== context.expectedPlanningHash
      || input.expectedContextHash !== context.expectedContextHash) fail('writer_context_stale');
  const output = validateOutput(input.output, context);
  const updated = await model.editPage(site.id, page.id, output, { expectedRevisionHash: context.expectedRevisionHash,
    expectedPlanningHash: context.expectedPlanningHash, expectedSiteHash: context.expectedSiteHash });
  return { ...binding, state: 'private-draft-written', observedAt: new Date().toISOString(), outputHash: digest(input.output),
    appliedRevisionHash: model.revisionHash(updated), appliedPlanningHash: model.planningContextHash(updated),
    approval: 'not-performed', sourceVerification: 'not-performed', mediaVerification: 'not-performed',
    workflow: await model.getContentWorkflow(site.id) };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const chunks = []; let size = 0;
    for await (const chunk of process.stdin) { size += chunk.length; if (size > 500000) fail('writer_input_too_large'); chunks.push(chunk); }
    process.stdout.write(JSON.stringify(await customerContentWrite(JSON.parse(Buffer.concat(chunks).toString('utf8')))) + '\n');
  } catch (error) {
    process.stderr.write(JSON.stringify({ version: VERSION, state: 'failed', code: /^[a-z_]{1,80}$/.test(error.code || '') ? error.code : 'writer_failed' }) + '\n');
    process.exitCode = 1;
  }
}
