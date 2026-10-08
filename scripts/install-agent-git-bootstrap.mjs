// Install one project-scoped managed block without replacing personal instructions.
import { readFile, writeFile, mkdir, open, rename, lstat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

const BEGIN = '<!-- PINET_GIT_BOOTSTRAP_BEGIN -->';
const END = '<!-- PINET_GIT_BOOTSTRAP_END -->';
export const BLOCK = `${BEGIN}
## Pinet project Git bootstrap
Only for repositories whose origin is christianza1989/nisiniai-puslapiai-monetizavimui or christianza1989/niche-public-core on github.com:
- Before project work in every new Codex session/task, after resuming an old task, and before Git handoff, fetch origin/main successfully. A cached remote ref, old conversation, installed skill mirror, or local WORKSTREAMS is not current authority.
- Run the canonical core scripts/git-freshness.mjs for the current repo and relevant companion: --phase start for a new clean workspace, --phase continue for your in-progress branch, --phase handoff before delivery. It fetches, verifies current main is an ancestor of HEAD, and never rewrites your work. Use the core checkout's Git SKILLS, not a personal copied skill.
- If that script is missing in an old clone: run git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main; inspect latest AGENTS and docs/MULTI_MACHINE via git show origin/main:<path>. Do not execute stale source. Create your own fresh worktree from fetched origin/main; preserve the old checkout. For the public repo, obtain the companion core first.
- If fetch fails or main is absent from this branch base, do not claim latest instructions or continue writing from stale core. Preserve/commit your scoped work, integrate current main in your own branch with conflicts resolved and proportionate checks, or start a fresh worktree. Never reset/stash another agent's files or force-push main. Read updated AGENTS/contracts/relevant SKILL files explicitly after integration; session instructions do not hot-reload themselves.
- Each agent has its own branch/worktree and records exact core/companion SHA. Coordinate shared paths via GitHub issue/PR and WORKSTREAMS. Improvements reach other PCs only after reviewed PR merge to main and their next freshness check; unsent local changes and private runtime learning releases do not synchronize through Git.
- Run ongoing generation/CLI tasks through the freshness gate's -- executable args wrapper when possible. A live job/conversation retains its instruction snapshot; fetch again before the next task or meaningful batch, not halfway through one operation. No continuous background pull.
${END}
`;

export function mergeBlock(text) {
  const begin = text.indexOf(BEGIN), end = text.indexOf(END);
  if ((begin < 0) !== (end < 0) || (begin >= 0 && (end < begin ||
    text.indexOf(BEGIN, begin + BEGIN.length) >= 0 || text.indexOf(END, end + END.length) >= 0)))
    throw new Error('ambiguous_managed_block_preserve_file');
  if (begin >= 0) return text.slice(0, begin) + BLOCK.trimEnd() + text.slice(end + END.length);
  return text + (text && !text.endsWith('\n') ? '\n' : '') + BLOCK;
}

async function optional(file) {
  try { return await readFile(file, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return ''; throw error; }
}
export async function installBootstrap(home) {
  home = path.resolve(home);
  await mkdir(home, { recursive: true });
  const lockPath = path.join(home, '.pinet-git-bootstrap.lock');
  const lock = await open(lockPath, 'wx');
  let pending;
  try {
    const override = path.join(home, 'AGENTS.override.md');
    const overrideText = await optional(override);
    const target = overrideText.trim() ? override : path.join(home, 'AGENTS.md');
    const before = target === override ? overrideText : await optional(target);
    const after = mergeBlock(before);
    if (after === before) return { status: 'UNCHANGED', target, fresh_session_required: true };
    const info = await lstat(target).catch(error => {
      if (error.code === 'ENOENT') return null; throw error;
    });
    if (info && !info.isFile()) throw new Error('regular_instruction_file_required');
    const backupDir = path.join(home, '.pinet-git-bootstrap');
    await mkdir(backupDir, { recursive: true });
    if (before) await writeFile(path.join(backupDir, 'instructions-' + randomUUID() + '.bak'), before, { flag: 'wx' });
    pending = path.join(home, '.pinet-git-bootstrap-' + randomUUID() + '.pending');
    await writeFile(pending, after, { flag: 'wx' });
    if (await optional(target) !== before) throw new Error('concurrent_instruction_update_preserve_file');
    await rename(pending, target);
    pending = undefined;
    return { status: 'INSTALLED', target, existing_instructions_preserved: true,
      fresh_session_required: true, remote_computers_configured: false };
  } finally {
    await lock.close();
    const { unlink } = await import('node:fs/promises');
    await unlink(lockPath);
    if (pending) await unlink(pending).catch(() => {});
  }
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--home'))
    throw new Error('Usage: install-agent-git-bootstrap.mjs [--home CODEX_HOME_PATH]');
  const home = args[1] || process.env.CODEX_HOME || path.join(homedir(), '.codex');
  console.log(JSON.stringify(await installBootstrap(home), null, 2));
}
