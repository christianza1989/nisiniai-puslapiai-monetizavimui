import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ROOT, DATA, getSite, editSite, editPage, mergePlan, saveResponsiveAsset, createJob, updateJob, normalizeBlocks, networkCatalog, verifyNetworkLinks } from './model.mjs';
import { loadEditorialSkill, buildEditorialPrompt } from './editorial-skill.mjs';
import { contentPolicy, planningWindow, localDate as scheduleDate } from './content-schedule.mjs';

const SCHEMAS = path.join(ROOT, 'schemas');
const IMAGE_CLI = process.env.IMAGEGEN_CLI || path.join(process.env.USERPROFILE || '', '.codex', 'skills', '.system', 'imagegen', 'scripts', 'image_gen.py');
let queue = Promise.resolve();

function run(command, args, input, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = ''; let settled = false;
    const timer = setTimeout(() => { child.kill(); finish(new Error(`Darbas viršijo ${Math.round(timeoutMs / 1000)} s ribą.`)); }, timeoutMs);
    function finish(error, result) {
      if (settled) return; settled = true; clearTimeout(timer);
      error ? reject(error) : resolve(result);
    }
    child.stdout.on('data', data => { stdout = (stdout + data.toString()).slice(-12000); });
    child.stderr.on('data', data => { stderr = (stderr + data.toString()).slice(-12000); });
    child.on('error', error => finish(error));
    child.on('close', code => code === 0 ? finish(null, { stdout, stderr }) : finish(new Error(`${command} grąžino kodą ${code}. ${(stderr || stdout).slice(-1400)}`)));
    child.stdin.on('error', () => {});
    child.stdin.end(input || '');
  });
}

async function codexJson(prompt, schemaFile) {
  const temp = path.join(DATA, 'tmp'); await mkdir(temp, { recursive: true });
  const resultFile = path.join(temp, `${randomUUID()}.json`);
  const args = [
    '--ask-for-approval', 'never', 'exec', '--ephemeral', '--ignore-user-config', '--skip-git-repo-check',
    '--sandbox', 'read-only',
    '--output-schema', path.join(SCHEMAS, schemaFile), '--output-last-message', resultFile, '-'
  ];
  try {
    const codexJs = process.env.CODEX_JS || path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
    const command = process.platform === 'win32' && existsSync(codexJs) ? process.execPath : (process.env.CODEX_BIN || 'codex');
    await run(command, command === process.execPath ? [codexJs, ...args] : args, prompt, 300000);
    const data = JSON.parse(await readFile(resultFile, 'utf8'));
    return data;
  } finally { await rm(resultFile, { force: true }); }
}

const contextForSite = site => ({
  id: site.id, domain: site.canonicalHost, name: site.name, locale: site.locale,
  timezone: site.timezone, stage: site.stage, offerHypothesis: site.offer, audience: site.audience,
  verifiedFacts: site.facts, suppliedContact: site.contact,
  contentPolicy: contentPolicy(site.contentPolicy, site.timezone),
  existingPages: site.pages.map(page => ({ id: page.id, type: page.type, slug: page.slug, title: page.title, intent: page.intent,
    cluster: page.cluster || '', pillarPageId: page.pillarPageId || '', publishAt: page.publishAt,
    approved: Boolean(page.publishedRevision), status: page.status }))
});

async function planSite(siteId, months = 0, skill, requestedCount = null) {
  const site = await getSite(siteId);
  const policy = contentPolicy({ ...site.contentPolicy, ...(months ? { months } : {}) }, site.timezone);
  const count = requestedCount || (months ? Math.min(24, policy.months * policy.articlesPerMonth) : '5-10');
  const localDate = scheduleDate(Date.now(), policy.timezone);
  const instruction = `Autonomously choose up to ${count} distinct useful new URLs for ${months ? `a ${policy.months}-month calendar with target ${policy.articlesPerMonth} articles/month` : 'an initial demand-test site'}. Fewer substantive topics are better than filler. Use the site's locale. Include home only if absent. Today in ${policy.timezone} is ${localDate}. ${months ? `Every new publishDate must be at least seven days after today and no later than ${planningWindow(policy).end}; spread substantive pages across this horizon, respect existing dates and seasonal dependencies. Publication local time is ${policy.localTime} in ${policy.timezone}.` : 'Set home publishDate to today; give other pages sensible tentative dates. The initial scheduler may adjust them.'} Reconcile existing intents. Return plan-result.schema.json fields only; self-review before returning.`;
  const prompt = buildEditorialPrompt(skill, { mode: 'plan', instruction, siteData: { ...contextForSite(site), networkCatalog: await networkCatalog() } });
  const result = await codexJson(prompt, 'plan-result.schema.json');
  if (!Array.isArray(result.pages)) throw new Error('Codex negrąžino puslapių plano.');
  return mergePlan(siteId, result.pages, months);
}

async function draftPage(siteId, pageId, skill) {
  const site = await getSite(siteId);
  const page = site.pages.find(item => item.id === pageId);
  if (!page) throw new Error('Puslapis nerastas.');
  const prompt = buildEditorialPrompt(skill, { mode: 'draft',
    instruction: 'Write an original useful first draft for this page in the site locale. Honour its specific intent and actual deliverables. Source candidates remain unverified. Return draft-result.schema.json fields only; self-review and identify precise remaining fact/asset dependencies.',
    siteData: { ...contextForSite(site), networkCatalog: await networkCatalog() },
    pageData: { id: page.id, type: page.type, slug: page.slug, title: page.title, description: page.description,
      intent: page.intent, reason: page.editorialReason || '', cluster: page.cluster || '', pillarPageId: page.pillarPageId || '',
      sourceQueries: page.sourceQueries || [], plannedInternalLinks: page.linkSuggestions || [], sourceCandidates: page.externalLinks || [],
      plannedNetworkLinks: page.networkLinkSuggestions || [],
      availableAssets: site.assets.map(({ id, alt, credit, rights }) => ({ id, alt, credit, rights })) }
  });
  const result = await codexJson(prompt, 'draft-result.schema.json');
  if (!Array.isArray(result.blocks)) throw new Error('Codex negrąžino teksto blokų.');
  const body = normalizeBlocks(result.blocks.map(block => ({ type: block.type, text: block.text, level: block.level, items: block.items })));
  const suggestions = [...(page.linkSuggestions || []), ...(result.internalLinks || [])]
    .filter((link, index, all) => all.findIndex(other => other.targetPageId === link.targetPageId) === index)
    .filter(link => site.pages.some(target => target.id === link.targetPageId && target.id !== pageId));
  const links = suggestions.filter(link => site.pages.some(target => target.id === link.targetPageId && target.publishedRevision))
    .map(({ targetPageId, label }) => ({ targetPageId, label }));
  const externalLinks = [...(page.externalLinks || []), ...(result.externalSources || []).map(source => ({ ...source, verified: false }))]
    .filter((source, index, all) => all.findIndex(other => other.url === source.url) === index)
    .filter(source => /^https:\/\//i.test(source.url || ''));
  const updated = await editPage(siteId, pageId, { title: result.title, description: result.description, body,
    factChecks: result.factChecks, links, linkSuggestions: suggestions, externalLinks,
    networkLinkSuggestions: [...(page.networkLinkSuggestions || []), ...(result.networkLinks || [])] });
  // Fact checks are editorial notes and cannot be part of an approved public package.
  if (updated.networkLinkSuggestions?.length) await verifyNetworkLinks(siteId, pageId);
  return { blocks: body.length, factChecks: updated.factChecks, internalSuggestions: suggestions.length, externalSourcesToVerify: externalLinks.length };
}

async function draftBatch(siteId, jobId, skill) {
  const site = await getSite(siteId);
  const pages = site.pages.filter(page => page.body.length === 0 && page.status !== 'revoked').slice(0, 24);
  if (!pages.length) return { generated: 0, failed: 0, detail: 'Tuščių planų nėra.' };
  let generated = 0; const failures = [];
  for (const page of pages) {
    try { await draftPage(siteId, page.id, skill); generated++; }
    catch (error) { failures.push(`${page.slug || '/'}: ${String(error.message || error).slice(0, 180)}`); }
    await updateJob(jobId, { detail: `${generated + failures.length}/${pages.length} parengta; ${generated} juodraščiai, ${failures.length} klaidos` });
  }
  return { generated, failed: failures.length, failures };
}

async function autopilot(siteId, jobId, skill) {
  let site = await getSite(siteId);
  const policy = contentPolicy(site.contentPolicy, site.timezone), window = planningWindow(policy);
  const countUpcoming = value => value.pages.filter(page => ['guide','article'].includes(page.type) && page.status !== 'revoked' && Date.parse(page.publishAt) > Date.now() && scheduleDate(page.publishAt, policy.timezone) <= window.end).length;
  let plan = { added: 0, total: site.pages.length, targetArticles: window.target };
  // Bound work and stop on lack of progress; no repeated filler prompts to hit a quota.
  for (let batch = 0; batch < Math.ceil(window.target / 24); batch++) {
    const remaining = window.target - countUpcoming(site);
    if (remaining <= 0 && site.pages.some(page => page.type === 'home')) break;
    await updateJob(jobId, { detail: `Planuojama partija ${batch + 1}; tikslas ${window.target} straipsnių per ${policy.months} mėn.` });
    const next = await planSite(siteId, policy.months, skill, Math.min(24, Math.max(remaining, 1)));
    plan.added += next.added; plan.total = next.total;
    if (!next.added) break;
    site = await getSite(siteId);
  }
  plan.remainingArticles = Math.max(0, window.target - countUpcoming(site));
  await updateJob(jobId, { detail: `Plane ${plan.total} puslapių, pridėta ${plan.added}; rengiami tušti juodraščiai.` });
  const drafts = { generated: 0, failed: 0, failures: [] };
  const emptyCount = (await getSite(siteId)).pages.filter(page => page.body.length === 0 && page.status !== 'revoked').length;
  for (let batch = 0; batch < Math.ceil(emptyCount / 24); batch++) {
    const next = await draftBatch(siteId, jobId, skill);
    drafts.generated += next.generated; drafts.failed += next.failed; drafts.failures.push(...(next.failures || []));
    if (next.failed || !next.generated) break;
  }
  drafts.remaining = (await getSite(siteId)).pages.filter(page => page.body.length === 0 && page.status !== 'revoked').length;
  return { plan, drafts, nextGate: 'Faktų ir šaltinių patikra prieš viešinimą' };
}

async function generateImage(siteId, input) {
  if (!process.env.OPENAI_API_KEY) throw new Error('ImageGen CLI reikia OPENAI_API_KEY šiame kompiuteryje. Be jo užduokite vaizdą Codex imagegen įrankiui ir importuokite failą per GUI.');
  const site = await getSite(siteId);
  const prompt = String(input.prompt || '').trim();
  const alt = String(input.alt || '').trim();
  if (prompt.length < 20 || !alt) throw new Error('Reikia aiškaus vaizdo aprašo ir alt teksto.');
  const temp = path.join(DATA, 'tmp'); await mkdir(temp, { recursive: true });
  const out = path.join(temp, `${randomUUID()}.webp`);
  const fullPrompt = `${prompt}\n\nWebsite context: ${site.offer}. Make a visually useful original image. Avoid fake logos, branded products, misleading product photography, text in image, and identifiable real people. `;
  try {
    await run(process.env.PYTHON_BIN || 'python', [IMAGE_CLI, 'generate', '--prompt', fullPrompt, '--size', '1536x1024', '--quality', 'medium', '--output-format', 'webp', '--out', out], '', 360000);
    const bytes = await readFile(out);
    const asset = await saveResponsiveAsset(siteId, { mime: 'image/webp', alt, rights: 'OpenAI ImageGen: original generated asset; review before publication', credit: 'Sugeneruota su ImageGen', prompt:fullPrompt }, bytes);
    return { assetId: asset.id, variants:asset.variants.map(a=>a.id), optimization:asset.optimization };
  } finally { await rm(out, { force: true }); }
}

export async function enqueue(type, siteId, pageId, input = {}) {
  if(['autopilot','plan','draft','draft-batch'].includes(type)&&(await getSite(siteId)).schemaVersion===2)throw new Error('V2 generavimo kontraktas dar nepriimtas. Importuokite arba redaguokite struktūrizuotą v2 juodraštį; legacy generatorius jo neperrašo.');
  if (['autopilot','plan','draft','draft-batch'].includes(type)) {
    const site = await getSite(siteId);
    if (site.contentWorkflowVersion !== 1) await editSite(siteId, { contentPolicy: contentPolicy(site.contentPolicy, site.timezone) });
  }
  return createJob(type, siteId, pageId).then(job => {
    const work = async () => {
      await updateJob(job.id, { status: 'running', startedAt: new Date().toISOString() });
      try {
        const skill = ['autopilot', 'plan', 'draft', 'draft-batch'].includes(type)
          ? await loadEditorialSkill(['autopilot', 'plan'].includes(type) ? 'plan' : 'draft') : null;
        if (skill) await updateJob(job.id, { editorialSkill: skill.metadata });
        const detail = type === 'autopilot' ? await autopilot(siteId, job.id, skill)
          : type === 'plan' ? await planSite(siteId, input.months ? contentPolicy({ ...((await getSite(siteId)).contentPolicy), months: Number(input.months) }).months : 0, skill)
          : type === 'draft' ? await draftPage(siteId, pageId, skill)
          : type === 'draft-batch' ? await draftBatch(siteId, job.id, skill)
          : type === 'network-check' ? await verifyNetworkLinks(siteId, pageId)
          : type === 'image' ? await generateImage(siteId, input)
          : (() => { throw new Error('Nežinomas užduoties tipas.'); })();
        await updateJob(job.id, { status: 'complete', detail: JSON.stringify(detail), finishedAt: new Date().toISOString() });
      } catch (error) {
        await updateJob(job.id, { status: 'failed', error: String(error.message || error).slice(0, 1000), finishedAt: new Date().toISOString() });
      }
    };
    queue = queue.then(work, work);
    return job;
  });
}
