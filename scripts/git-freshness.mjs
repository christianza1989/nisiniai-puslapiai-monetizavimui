// Fetch and verify a coherent Git base; never pull, reset, stash, rebase, or edit source.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repositories = new Set(['christianza1989/nisiniai-puslapiai-monetizavimui',
  'christianza1989/niche-public-core']);
function git(root, args) {
  return spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout: 30000,
    windowsHide: true, maxBuffer: 1024 * 1024 });
}
function value(root, args) {
  const result = git(root, args);
  if (result.status !== 0) throw new Error('git_read_failed');
  return result.stdout.trim();
}
function identity(remote) {
  const match = remote.match(/^(?:https:\/\/github\.com\/|git@github\.com:)([^\s]+?)\/?$/);
  return match?.[1].replace(/\.git$/, '').toLowerCase();
}

export function inspectRepository(root, phase = 'start', { allowFixtureRemote = false } = {}) {
  if (!['start', 'continue', 'handoff'].includes(phase)) throw new Error('invalid_phase');
  try {
    const repository = identity(value(root, ['remote', 'get-url', 'origin']));
    if (!allowFixtureRemote && !repositories.has(repository))
      return { status: 'BLOCKED', reason: 'unexpected_origin_repository', phase };
    // A failed fetch must never validate a cached origin/main. Suppress raw URLs/errors.
    const fetched = git(root, ['fetch', '--no-tags', 'origin',
      '+refs/heads/main:refs/remotes/origin/main']);
    if (fetched.status !== 0) return { status: 'BLOCKED', reason: 'fetch_failed', phase };
    const main = value(root, ['rev-parse', 'origin/main']);
    const head = value(root, ['rev-parse', 'HEAD']);
    const branch = value(root, ['branch', '--show-current']);
    const contains = git(root, ['merge-base', '--is-ancestor', main, head]);
    if (![0, 1].includes(contains.status)) throw new Error('git_ancestry_failed');
    const status = value(root, ['status', '--porcelain', '--untracked-files=normal']);
    const changed = status ? status.split('\n').length : 0;
    const [behind, ahead] = value(root, ['rev-list', '--left-right', '--count', 'origin/main...HEAD'])
      .split(/\s+/).map(Number);
    const reason = contains.status === 1 ? 'main_not_in_current_base'
      : phase === 'start' && changed ? 'dirty_start_checkout'
      : phase === 'handoff' && !branch ? 'detached_head_handoff'
      : phase === 'handoff' && branch === 'main' && changed ? 'use_own_branch_for_main_changes' : null;
    return { status: reason ? 'BLOCKED' : 'PASS_FRESH_BASE', reason, phase,
      repository: repository || 'local-test-fixture', branch: branch || null,
      head_sha: head, fetched_main_sha: main, main_commits_missing: behind,
      branch_commits_ahead: ahead, changed_entries: changed,
      checked_at: new Date().toISOString(), source_modified: false };
  } catch {
    return { status: 'BLOCKED', reason: 'git_checkout_unavailable', phase };
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2), options = { phase: 'start', repo: process.cwd() };
  let command = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--') { command = args.slice(i + 1); break; }
    const key = { '--phase': 'phase', '--repo': 'repo', '--companion': 'companion' }[args[i]];
    if (!key || !args[i + 1] || args[i + 1].startsWith('--'))
      throw new Error('Usage: git-freshness.mjs [--repo PATH] [--companion PATH] [--phase start|continue|handoff] [-- EXECUTABLE ARG...]');
    options[key] = args[++i];
  }
  const reports = [inspectRepository(path.resolve(options.repo), options.phase)];
  if (options.companion) reports.push(inspectRepository(path.resolve(options.companion), options.phase));
  const blocked = reports.some(report => report.status === 'BLOCKED');
  console.log(JSON.stringify({ status: blocked ? 'BLOCKED' : 'PASS_FRESH_BASE', reports,
    guarantee: 'Fetched main is in HEAD now; own changes are allowed only for continue/handoff. No automatic source rewrite.' }, null, 2));
  if (blocked) process.exitCode = 1;
  else if (command.length) {
    // Direct executable only, no shell interpolation. Prefer node/uv/python executables.
    const child = spawnSync(command[0], command.slice(1), {
      cwd: path.resolve(options.repo), stdio: 'inherit', shell: false, windowsHide: true,
      env: { ...process.env, PINET_SOURCE_HEAD_SHA: reports[0].head_sha,
        PINET_SOURCE_MAIN_SHA: reports[0].fetched_main_sha },
    });
    process.exitCode = child.status ?? 1;
  }
}
