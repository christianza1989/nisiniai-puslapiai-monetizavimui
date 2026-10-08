// Git-safe per-upgrade journal and reversible, exact-file quarantine. No bulk deletion.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { inspectRepository } from './git-freshness.mjs';

const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const idPattern = /^upgrade-[a-f0-9-]{36}$/;
const statuses = ['finding', 'fixing', 'local-verified', 'pr', 'merged', 'adopted'];
function git(root, args) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('git_check_failed');
  return r.stdout.trim();
}
function nonempty(value) { return typeof value === 'string' && value.trim().length > 0; }
function validRelative(file) {
  if (!nonempty(file) || file.includes('\\') || file.includes(':') || /[\x00-\x1f]/.test(file)
    || path.isAbsolute(file) || file.split('/').some(s => !s || s === '.' || s === '..'
      || /[. ]$/.test(s) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(s)))
    throw new Error('unsafe_relative_path');
  return file;
}
async function safePath(root, relative) {
  validRelative(relative);
  const realRoot = await fs.realpath(root);
  let target = realRoot;
  for (const component of relative.split('/')) {
    target = path.join(target, component);
    try { if ((await fs.lstat(target)).isSymbolicLink()) throw new Error('symlink_path'); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  if (!target.startsWith(realRoot + path.sep)) throw new Error('outside_workspace');
  return target;
}
async function json(file) { return JSON.parse(await fs.readFile(file, 'utf8')); }
async function exclusive(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data, { flag: 'wx' });
}
async function atomic(file, value) {
  const temporary = file + '.' + crypto.randomUUID() + '.tmp';
  try { await fs.writeFile(temporary, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); await fs.rename(temporary, file); }
  finally { await fs.rm(temporary, { force: true }); }
}
export function validateRecord(record) {
  const allowed = ['siteId', 'summary', 'category', 'evidence', 'paths', 'issue', 'rollback'];
  if (Object.keys(record).some(k => !allowed.includes(k))) throw new Error('unknown_record_field');
  if (!['rules', 'skills', 'prompt', 'code', 'cleanup', 'workflow'].includes(record.category)
    || !nonempty(record.summary) || !nonempty(record.siteId) || !nonempty(record.issue)
    || !nonempty(record.rollback) || !Array.isArray(record.evidence) || !record.evidence.length
    || record.evidence.some(v => !nonempty(v)) || !Array.isArray(record.paths) || !record.paths.length)
    throw new Error('incomplete_record');
  record.paths.forEach(validRelative);
  return record;
}
async function entryDirectory(root, id) {
  if (!idPattern.test(id ?? '')) throw new Error('invalid_upgrade_id');
  return safePath(root, 'core-improvements/entries/' + id);
}
async function recordFor(root, id) {
  const dir = await entryDirectory(root, id);
  const r = await json(await safePath(root, 'core-improvements/entries/' + id + '/record.json'));
  if (r.id !== id || !Array.isArray(r.paths)) throw new Error('invalid_record');
  return { dir, r };
}
async function locked(root, id, operation) {
  const { dir, r } = await recordFor(root, id);
  const lock = await safePath(root, 'core-improvements/entries/' + id + '/operation.lock');
  const handle = await fs.open(lock, 'wx'); // Never reclaim another process's lock.
  try { return await operation(dir, r); }
  finally { await handle.close(); await fs.unlink(lock); }
}
export async function createRecord(root, input) {
  validateRecord(input);
  const branch = git(root, ['branch', '--show-current']);
  if (!branch || branch === 'main') throw new Error('own_branch_required');
  const id = 'upgrade-' + crypto.randomUUID();
  const dir = await entryDirectory(root, id);
  const record = { ...input, id, branch, baseSha: git(root, ['rev-parse', 'HEAD']), createdAt: new Date().toISOString() };
  await exclusive(path.join(dir, 'record.json'), JSON.stringify(record, null, 2) + '\n');
  await appendEvent(root, id, { status: 'finding', note: 'Record created; evidence is agent-supplied, not semantic verification.' });
  return record;
}
export async function appendEvent(root, id, event) {
  if (!statuses.includes(event.status) || !nonempty(event.note)
    || Object.keys(event).some(k => !['status', 'note', 'checks', 'pr', 'commit'].includes(k)))
    throw new Error('invalid_event');
  if (event.status === 'local-verified' && (!Array.isArray(event.checks) || !event.checks.length
    || event.checks.some(v => !nonempty(v.command) || v.result !== 'PASS' || !nonempty(v.evidence))))
    throw new Error('checks_required');
  if (['pr', 'merged', 'adopted'].includes(event.status) && !/^https:\/\/github\.com\/christianza1989\/(nisiniai-puslapiai-monetizavimui|niche-public-core)\/pull\/\d+$/.test(event.pr ?? ''))
    throw new Error('pr_reference_required');
  if (['merged', 'adopted'].includes(event.status) && !/^[a-f0-9]{40}$/.test(event.commit ?? ''))
    throw new Error('commit_required');
  return locked(root, id, async dir => {
    const folder = await safePath(root, 'core-improvements/entries/' + id + '/events');
    await fs.mkdir(folder, { recursive: true });
    const previous = await Promise.all((await fs.readdir(folder)).filter(n => /^[a-f0-9-]{36}\.json$/.test(n))
      .map(n => json(path.join(folder, n))));
    const sequence = Math.max(0, ...previous.map(e => e.sequence)) + 1;
    const eventId = crypto.randomUUID();
    const file = await safePath(root, 'core-improvements/entries/' + id + '/events/' + eventId + '.json');
    await exclusive(file, JSON.stringify({ ...event, eventId, sequence, at: new Date().toISOString() }, null, 2) + '\n');
    return { id, eventId, status: event.status };
  });
}
async function checkSource(root, file) {
  validRelative(file);
  // Keep history, migrations, secrets, data and bootstrap out of mechanical cleanup.
  if (/(?:^|\/)(?:\.git(?:hub)?|\.env[^/]*|\.dev\.vars[^/]*|data|runtime|artifacts|quarantine|core-improvements|migrations|history)(?:\/|$)/i.test(file)
    || /(?:^|\/)(?:AGENTS\.md|WORKSTREAMS\.md|catalog\.json|SOURCE_[^/]*|[^/]*(?:approval|fingerprint|benchmark)[^/]*)$/i.test(file)
    || /(?:password|credential|secret|customer|client-data)/i.test(file)
    || !/\.(?:md|txt|json|mjs|cjs|js|ts|tsx|jsx|py|css|html|yml|yaml|ps1|sh)$/.test(file))
    throw new Error('protected_or_nontext_file');
  const target = await safePath(root, file);
  const stat = await fs.lstat(target);
  if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error('unsupported_file');
  const mode = git(root, ['ls-files', '--stage', '--', file]);
  if (!/^100(?:644|755) /.test(mode)) throw new Error('tracked_regular_file_required');
  if (git(root, ['status', '--porcelain', '--', file])) throw new Error('source_has_uncommitted_changes');
  const bytes = await fs.readFile(target);
  new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return { target, bytes, sha256: hash(bytes) };
}
export async function planQuarantine(root, id, file, reason) {
  if (!nonempty(reason)) throw new Error('reason_required');
  return locked(root, id, async (dir, r) => {
    if (!r.paths.includes(file)) throw new Error('outside_record_scope');
    const source = await checkSource(root, file);
    const plan = { version: 1, id, file, reason, sha256: source.sha256, baseSha: git(root, ['rev-parse', 'HEAD']),
      createdAt: new Date().toISOString(), bytes: source.bytes.length };
    await exclusive(path.join(dir, 'quarantine-plan.json'), JSON.stringify(plan, null, 2) + '\n');
    return plan; // Source unchanged. References/dynamic consumers must be reviewed before apply.
  });
}
async function quarantineContext(root, id, r) {
  const dir = await entryDirectory(root, id);
  const plan = await json(await safePath(root, 'core-improvements/entries/' + id + '/quarantine-plan.json'));
  if (plan.id !== id || plan.version !== 1 || !r.paths.includes(plan.file)
    || !/^[a-f0-9]{64}$/.test(plan.sha256) || !/^[a-f0-9]{40}$/.test(plan.baseSha)) throw new Error('invalid_plan');
  git(root, ['merge-base', '--is-ancestor', plan.baseSha, 'HEAD']);
  const source = await safePath(root, plan.file);
  const payload = await safePath(root, 'core-improvements/entries/' + id + '/quarantine/source.txt');
  const statePath = await safePath(root, 'core-improvements/entries/' + id + '/quarantine-state.json');
  let state;
  try { state = await json(statePath); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  return { dir, plan, source, payload, statePath, state };
}
export async function applyQuarantine(root, id) {
  return locked(root, id, async (dir, r) => {
    const c = await quarantineContext(root, id, r);
    if (c.state && !['prepared', 'quarantined'].includes(c.state.status)) throw new Error('invalid_quarantine_state');
    if (!c.state) {
      const s = await checkSource(root, c.plan.file);
      if (s.sha256 !== c.plan.sha256) throw new Error('source_changed_since_plan');
      await atomic(c.statePath, { status: 'prepared', at: new Date().toISOString() });
    }
    // Resume an interrupted prepared write without discarding either source or payload.
    try { await fs.access(c.payload); } catch (e) {
      if (e.code !== 'ENOENT') throw e;
      const s = await checkSource(root, c.plan.file);
      if (s.sha256 !== c.plan.sha256) throw new Error('source_changed_since_plan');
      await exclusive(c.payload, s.bytes);
    }
    if (hash(await fs.readFile(c.payload)) !== c.plan.sha256) throw new Error('payload_corrupt');
    let sourceBytes;
    try { sourceBytes = await fs.readFile(c.source); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (sourceBytes) {
      if (c.state?.status === 'quarantined' || hash(sourceBytes) !== c.plan.sha256) throw new Error('source_collision');
      // A clean source recheck before unlink prevents removing intervening edits.
      await checkSource(root, c.plan.file);
      await fs.unlink(c.source);
    }
    await atomic(c.statePath, { status: 'quarantined', at: new Date().toISOString() });
    return { id, status: 'quarantined', file: c.plan.file, sha256: c.plan.sha256 };
  });
}
export async function restoreQuarantine(root, id) {
  return locked(root, id, async (dir, r) => {
    const c = await quarantineContext(root, id, r);
    if (!['prepared', 'quarantined', 'restored'].includes(c.state?.status)) throw new Error('nothing_to_restore');
    const bytes = await fs.readFile(c.payload);
    if (hash(bytes) !== c.plan.sha256) throw new Error('payload_corrupt');
    // Exclusive create: never overwrite a new implementation or symlink.
    await exclusive(c.source, bytes);
    await atomic(c.statePath, { status: 'restored', at: new Date().toISOString() });
    return { id, status: 'restored', file: c.plan.file, sha256: c.plan.sha256 };
  });
}
export async function listRecords(root) {
  const base = await safePath(root, 'core-improvements/entries');
  let names;
  try { names = await fs.readdir(base); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  return Promise.all(names.filter(n => idPattern.test(n)).sort().map(async id => {
    const { dir, r } = await recordFor(root, id);
    const events = await Promise.all((await fs.readdir(path.join(dir, 'events'))).filter(n => /^[a-f0-9-]{36}\.json$/.test(n))
      .map(async n => json(await safePath(root, 'core-improvements/entries/' + id + '/events/' + n))));
    const latest = events.sort((a, b) => a.sequence - b.sequence).at(-1);
    const relative = 'core-improvements/entries/' + id;
    const committed = git(root, ['log', '-1', '--format=%H', '--', relative]);
    let delivery = 'uncommitted';
    if (committed) {
      delivery = 'branch-only';
      const main = spawnSync('git', ['merge-base', '--is-ancestor', committed, 'origin/main'], { cwd: root, windowsHide: true });
      if (main.status === 0 && !git(root, ['status', '--porcelain', '--', relative])) delivery = 'on-fetched-main';
    }
    return { id, siteId: r.siteId, summary: r.summary, status: latest?.status ?? 'finding', issue: r.issue,
      sourceDelivery: delivery, committedRevision: committed || null };
  }));
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const [command, ...args] = process.argv.slice(2);
    const opts = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!['--root', '--id', '--input', '--file', '--reason'].includes(args[i]) || !args[i + 1]) throw new Error('invalid_arguments');
      opts[args[i].slice(2)] = args[i + 1];
    }
    const root = path.resolve(opts.root ?? '.');
    if (await fs.realpath(root) !== await fs.realpath(git(root, ['rev-parse', '--show-toplevel'])))
      throw new Error('repository_root_required');
    if (command !== 'list') {
      const fresh = inspectRepository(root, 'continue');
      if (fresh.status !== 'PASS_FRESH_BASE') throw new Error('freshness_' + fresh.reason);
      if (fresh.repository !== 'christianza1989/nisiniai-puslapiai-monetizavimui') throw new Error('canonical_core_required');
      if (!fresh.branch || fresh.branch === 'main') throw new Error('own_branch_required');
    }
    let result;
    if (command === 'record') result = await createRecord(root, await json(opts.input));
    else if (command === 'event') result = await appendEvent(root, opts.id, await json(opts.input));
    else if (command === 'plan') result = await planQuarantine(root, opts.id, opts.file, opts.reason);
    else if (command === 'apply') result = await applyQuarantine(root, opts.id);
    else if (command === 'restore') result = await restoreQuarantine(root, opts.id);
    else if (command === 'list') result = await listRecords(root);
    else throw new Error('unknown_command');
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(JSON.stringify({ status: 'BLOCKED', reason: e.code ?? e.message }));
    process.exitCode = 1;
  }
}
