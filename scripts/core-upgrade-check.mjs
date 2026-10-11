// Read committed Git blobs only. A provenance check, not a semantic reviewer or auto-merger.
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { validateRecord } from './core-upgrade.mjs';

const uuid = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
const entryPattern = new RegExp(`^core-improvements/entries/(upgrade-${uuid})/(record\\.json|events/(${uuid})\\.json)$`);
const shaPattern = /^[a-f0-9]{40}$/;
const statuses = new Set(['finding', 'fixing', 'local-verified', 'pr', 'merged', 'adopted']);
const dependencyManifests = new Set(['package.json', 'package-lock.json', 'npm-shrinkwrap.json',
  'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb', 'pyproject.toml', 'uv.lock',
  'poetry.lock', 'Pipfile', 'Pipfile.lock', 'pdm.lock', 'setup.py', 'setup.cfg']);

function git(root, args, allowMissing = false) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true,
    maxBuffer: 8 * 1024 * 1024, timeout: 30000 });
  if (result.status !== 0) {
    if (allowMissing && result.status === 128) return null;
    throw new Error('git_object_read_failed');
  }
  return result.stdout;
}

export function requiresUpgrade(file) {
  if (file === 'WORKSTREAMS.md' || /(?:^|\/)SOURCE_[^/]+$/.test(file)
      || /(?:^|\/)(?:tests?|offline_tests|evals|fixtures)(?:\/|$)/.test(file)
      || /\.(?:test|spec)\.[^.]+$/.test(file)) return false;
  const name = file.slice(file.lastIndexOf('/') + 1);
  const sharedManifest = (!file.includes('/') || /^(?:content-studio|agent-business-core\/runtime)\//.test(file))
    && (dependencyManifests.has(name) || /^requirements(?:[-.][a-z0-9_-]+)?\.txt$/.test(name));
  return sharedManifest || /(?:^|\/)AGENTS(?:\.override)?\.md$/.test(file)
    || /^(?:CORE_[A-Z_]+|[A-Z_]+_CORE|CORE_IMPROVEMENT|START_HERE|PLATFORM_BUILD_CONTRACT)\.md$/.test(file)
    || file.startsWith('SKILLS/')
    || file.startsWith('scripts/')
    || file.startsWith('.github/workflows/')
    || file.startsWith('content-studio/src/') || file.startsWith('content-studio/scripts/')
    || file.startsWith('content-studio/schemas/')
    || file.startsWith('agent-business-core/runtime/src/')
    || file.startsWith('agent-business-core/runtime/scripts/')
    || file.startsWith('agent-business-core/runtime/migrations/')
    || file.startsWith('agent-business-core/contracts/');
}

function jsonBlob(root, ref, file) {
  const value = git(root, ['show', `${ref}:${file}`]);
  if (Buffer.byteLength(value) > 1024 * 1024) throw new Error('journal_blob_too_large');
  return JSON.parse(value);
}

function covers(root, head, scope, file) {
  if (scope === file) return true; // Includes a deleted source, whose rollback still matters.
  // A declared directory covers its children only if it is a real committed tree.
  return file.startsWith(scope + '/') && git(root, ['cat-file', '-t', `${head}:${scope}`], true)?.trim() === 'tree';
}

export function checkUpgradeCoverage(root, base, head) {
  if (!shaPattern.test(base ?? '') || !shaPattern.test(head ?? '')) throw new Error('full_commit_sha_required');
  root = path.resolve(root);
  const ancestor = git(root, ['merge-base', base, head]).trim();
  const changed = git(root, ['diff', '--name-status', '-z', '--no-renames', ancestor, head]).split('\0');
  const modifications = [];
  for (let i = 0; i + 1 < changed.length; i += 2) modifications.push({ status: changed[i], file: changed[i + 1] });
  const required = modifications.map(x => x.file).filter(requiresUpgrade);
  const errors = [];
  const touched = new Set();
  for (const item of modifications) {
    const match = entryPattern.exec(item.file);
    if (match) {
      touched.add(match[1]);
      if (item.status !== 'A') errors.push({ path: item.file, reason: 'journal_history_is_append_only' });
    }
    if (/(?:^|\/)SOURCE_[^/]+$/.test(item.file) && item.status !== 'A')
      errors.push({ path: item.file, reason: 'source_archive_is_immutable' });
  }
  const records = [];
  for (const id of [...touched].sort()) {
    const directory = `core-improvements/entries/${id}`;
    try {
      const record = jsonBlob(root, head, `${directory}/record.json`);
      const { id: storedId, branch, baseSha, createdAt, ...input } = record;
      validateRecord(input);
      const issueMatch = record.issue.match(/^https:\/\/github\.com\/(christianza1989\/(?:nisiniai-puslapiai-monetizavimui|niche-public-core))\/(?:issues|pull)\/[1-9]\d*$/);
      if (!issueMatch || issueMatch[0] !== record.issue) throw new Error('canonical_issue_url_required');
      const repository = issueMatch[1];
      if (storedId !== id || !branch || branch === 'main' || !shaPattern.test(baseSha ?? '')
          || !Number.isFinite(Date.parse(createdAt))) throw new Error('invalid_record_identity');
      if (record.paths.some(p => /[*?\[\]]/.test(p))) throw new Error('scope_must_be_exact_path_or_directory');
      const paths = git(root, ['ls-tree', '-r', '--name-only', head, '--', `${directory}/events`])
        .trim().split('\n').filter(Boolean);
      const events = paths.map(file => {
        const match = entryPattern.exec(file);
        if (!match?.[3]) throw new Error('invalid_event_path');
        const event = jsonBlob(root, head, file);
        if (event.eventId !== match[3] || !statuses.has(event.status) || typeof event.note !== 'string'
            || !event.note.trim() || !Number.isSafeInteger(event.sequence) || event.sequence < 1
            || !Number.isFinite(Date.parse(event.at))) throw new Error('invalid_event');
        return { ...event, file };
      }).sort((a, b) => a.sequence - b.sequence);
      if (!events.length || events.some((e, i) => e.sequence !== i + 1)) throw new Error('invalid_event_sequence');
      const verified = events.filter(e => e.status === 'local-verified');
      if (!verified.length || verified.some(e => !Array.isArray(e.checks) || !e.checks.length
          || e.checks.some(c => typeof c.command !== 'string' || !c.command.trim() || c.result !== 'PASS'
            || typeof c.evidence !== 'string' || !c.evidence.trim()))) throw new Error('verified_checks_required');
      if (!verified.some(e => modifications.some(m => m.status === 'A' && m.file === e.file)))
        throw new Error('fresh_verification_event_required');
      if (['finding', 'fixing'].includes(events.at(-1).status)) throw new Error('upgrade_still_unverified');
      // A public renderer record with the same relative filenames cannot attest a private-core patch.
      if (repository === 'christianza1989/nisiniai-puslapiai-monetizavimui') records.push(record);
    } catch (e) { errors.push({ path: directory, reason: e.message }); }
  }
  const uncovered = required.filter(file => !records.some(r => r.paths.some(scope => covers(root, head, scope, file))));
  return { status: errors.length || uncovered.length ? 'BLOCKED' : 'PASS',
    base_sha: base, merge_base_sha: ancestor, head_sha: head, shared_changes: required.length,
    verified_upgrade_ids: records.map(r => r.id), uncovered_paths: uncovered, errors,
    limitations: 'Checks provenance and declared PASS evidence in committed blobs; does not execute those commands, judge repair quality, merge code, or prove another PC/runtime adopted it.' };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const args = process.argv.slice(2), options = { root: process.cwd() };
    for (let i = 0; i < args.length; i += 2) {
      const key = { '--root': 'root', '--base': 'base', '--head': 'head' }[args[i]];
      if (!key || !args[i + 1]) throw new Error('invalid_arguments');
      options[key] = args[i + 1];
    }
    const base = options.base ?? git(options.root, ['rev-parse', 'origin/main']).trim();
    const head = options.head ?? git(options.root, ['rev-parse', 'HEAD']).trim();
    const result = checkUpgradeCoverage(options.root, base, head);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== 'PASS') process.exitCode = 1;
  } catch (e) {
    console.error(JSON.stringify({ status: 'BLOCKED', reason: e.message }));
    process.exitCode = 1;
  }
}
