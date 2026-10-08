// Read-only clone preflight. No DB, models, private artifacts, or channel activation.
import { readFile, stat, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const sha = value => createHash('sha256').update(value).digest('hex');
const read = file => readFile(file, 'utf8');
const pythonText = value => value.replace(/\r\n?/g, '\n');

export async function checkInputs(root, selectedSite) {
  const issues = [], sites = [];
  const skill = path.join(root, 'SKILLS/business-agent-calibration');
  const runtime = path.join(root, 'agent-business-core/runtime');
  const catalog = JSON.parse(await read(path.join(root, 'SKILLS/catalog.json')));
  const entry = catalog.skills.find(item => item.id === 'business-agent-calibration');
  if (!entry || entry.entrySha256 !== sha(await readFile(path.join(skill, 'SKILL.md'))))
    issues.push('calibration_skill_catalog_hash_conflict');
  const profileText = await read(path.join(runtime, 'src/pinet_core/profiles.py'));
  const profiles = [...profileText.matchAll(/["']([a-z0-9-]+)["']\s*:\s*Profile\(/g)].map(match => match[1]);
  if (!profiles.length) issues.push('no_static_profiles_found_inspect_profile_format');
  if (selectedSite && !profiles.includes(selectedSite)) issues.push('unknown_site_profile');
  const registry = JSON.parse(await read(path.join(runtime, 'evals/learning-v2/registry.json')));
  for (const site of selectedSite ? profiles.filter(id => id === selectedSite) : profiles) {
    const errors = [];
    for (const fragment of ['core/common.md', 'core/conversation.md', 'core/sales.md',
      'core/supplier.md', 'core/quality.md', 'core/email.md',
      ...['conversation', 'sales', 'supplier'].map(role => `niches/${site}/${role}.md`)]) {
      try {
        if (!(await read(path.join(runtime, 'src/pinet_core/instructions', fragment))).trim())
          errors.push('empty_instruction:' + fragment);
      } catch { errors.push('missing_instruction:' + fragment); }
    }
    try {
      const text = pythonText(await read(path.join(runtime, 'evals/learning-v2', site + '.json')));
      if (sha(text) !== registry.corpus_hashes?.[site]) errors.push('protected_corpus_hash_conflict');
      const corpus = JSON.parse(text), clients = corpus.clients;
      if (corpus.site_id !== site) errors.push('corpus_site_conflict');
      if (!Array.isArray(clients) || clients.length !== registry.cases_per_site)
        errors.push('registry_case_count_conflict');
      if (Array.isArray(clients)) {
        const ids = clients.map(client => client.id);
        if (ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length)
          errors.push('unique_case_ids_required');
        if (clients.filter(client => client.split === 'train').length !== registry.train ||
          clients.filter(client => client.split === 'holdout').length !== registry.reserve_holdout)
          errors.push('protected_split_count_conflict');
        if (clients.filter(client => client.split === 'holdout').length < registry.minimum_unseen_holdout)
          errors.push('insufficient_holdout');
        if (clients.some(client => !Array.isArray(client.messages) || !client.messages.length ||
          client.messages.some(message => typeof message !== 'string' || !message.trim()) ||
          typeof client.contact !== 'boolean' || !client.expected_need ||
          typeof client.expected_need !== 'object' || Array.isArray(client.expected_need)))
          errors.push('invalid_client_fixture');
      }
    } catch { errors.push('protected_corpus_missing_or_invalid'); }
    sites.push({ site_id: site, status: errors.length ? 'FAIL' : 'PASS_INPUTS', issues: errors });
    issues.push(...errors.map(error => site + ':' + error));
  }
  async function links(directory) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name);
      if (item.isDirectory()) await links(file);
      else if (item.name.endsWith('.md')) {
        const prose = (await read(file)).replace(/^```[^\n]*\n[\s\S]*?^```[^\n]*$/gm, '');
        for (const match of prose.matchAll(/\[[^\]\n]+\]\(([^)\n]+)\)/g)) {
          const href = match[1];
          if (/^(?:https?:|#)/.test(href) || /[<>*${}]/.test(href)) continue;
          try { await stat(path.resolve(directory, href.split('#')[0])); }
          catch { issues.push('broken_skill_link:' + path.relative(root, file) + ':' + href); }
        }
      }
    }
  }
  await links(skill);
  return { status: issues.length ? 'FAIL_INPUTS' : 'PASS_INPUTS', sites, issues,
    scope: 'Git skill links/catalog, packaged fragments and protected learning-v2 fixture integrity',
    behaviour_verified: false, knowledge_verified: false, channels_verified: false,
    private_data_read: false, model_calls: 0 };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--site' || !/^[a-z0-9-]{1,80}$/.test(args[1])))
    throw new Error('Usage: node check-inputs.mjs [--site SITE_ID]');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const report = await checkInputs(root, args[1]);
  console.log(JSON.stringify(report, null, 2));
  if (report.issues.length) process.exitCode = 1;
}
