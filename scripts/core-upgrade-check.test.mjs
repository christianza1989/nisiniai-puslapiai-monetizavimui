import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRecord, appendEvent } from './core-upgrade.mjs';
import { checkUpgradeCoverage, requiresUpgrade } from './core-upgrade-check.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pinet-upgrade-gate-'));
  t.after(async () => {
    const target = path.resolve(root);
    assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
    assert(path.basename(target).startsWith('pinet-upgrade-gate-'));
    await fs.rm(target, { recursive: true, force: true });
  });
  const git = (...args) => {
    const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
    assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
  };
  const write = async (file, value) => {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.writeFile(path.join(root, file), value);
  };
  const commit = () => { git('add', '.'); git('commit', '-m', 'synthetic fixture'); return git('rev-parse', 'HEAD'); };
  git('init', '-b', 'codex/fixture'); git('config', 'user.name', 'Fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  await write('scripts/tool.mjs', 'export const v = 1;\n');
  const base = commit();
  const record = async (paths = ['scripts/tool.mjs'], issue = 'https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/1') => createRecord(root, {
    siteId: 'core', summary: 'Synthetic shared defect with a regression', category: 'code',
    evidence: ['isolated fixture only'], paths, issue, rollback: 'scoped fixture revert',
  });
  const verify = r => appendEvent(root, r.id, { status: 'local-verified', note: 'Fixture regression passed',
    checks: [{ command: 'synthetic regression', result: 'PASS', evidence: 'fixture only' }] });
  return { root, git, write, commit, base, record, verify };
}

test('shared source without a journal blocks; planning/site-only changes need no artificial upgrade', async t => {
  const f = await fixture(t);
  await f.write('docs/PLAN.md', 'Proposed roadmap only\n');
  assert.equal(checkUpgradeCoverage(f.root, f.base, f.commit()).status, 'PASS');
  await f.write('scripts/tool.mjs', 'export const v = 2;\n');
  const result = checkUpgradeCoverage(f.root, f.base, f.commit());
  assert.equal(result.status, 'BLOCKED'); assert.deepEqual(result.uncovered_paths, ['scripts/tool.mjs']);
  assert.throws(() => checkUpgradeCoverage(f.root, '--bad-ref', result.head_sha), /full_commit_sha/);
});

test('finding and wrong scope cannot pass; a verified declared repair passes from committed blobs', async t => {
  const f = await fixture(t), r = await f.record(['scripts/other.mjs']);
  await f.write('scripts/tool.mjs', 'export const v = 2;\n');
  assert.equal(checkUpgradeCoverage(f.root, f.base, f.commit()).status, 'BLOCKED');
  await f.verify(r);
  const wrong = checkUpgradeCoverage(f.root, f.base, f.commit());
  assert.equal(wrong.status, 'BLOCKED'); assert.deepEqual(wrong.uncovered_paths, ['scripts/tool.mjs']);
  const correct = await f.record(); await f.verify(correct);
  assert.equal(checkUpgradeCoverage(f.root, f.base, f.commit()).status, 'PASS');
  await f.write('scripts/tool.mjs', 'uncommitted work must not change the audited commit\n');
  assert.equal(checkUpgradeCoverage(f.root, f.base, f.git('rev-parse', 'HEAD')).status, 'PASS');
});

test('a changed old entry needs fresh verification and cannot rewrite previous history', async t => {
  const f = await fixture(t), r = await f.record(); await f.verify(r);
  const baseline = f.commit();
  await f.write('scripts/tool.mjs', 'export const v = 3;\n');
  assert.equal(checkUpgradeCoverage(f.root, baseline, f.commit()).status, 'BLOCKED');
  await appendEvent(f.root, r.id, { status: 'fixing', note: 'A new actual regression is being repaired' });
  const fixing = checkUpgradeCoverage(f.root, baseline, f.commit());
  assert(fixing.errors.some(e => e.reason === 'fresh_verification_event_required'));
  await f.verify(r);
  assert.equal(checkUpgradeCoverage(f.root, baseline, f.commit()).status, 'PASS');
  const file = `core-improvements/entries/${r.id}/record.json`;
  const old = JSON.parse(await fs.readFile(path.join(f.root, file), 'utf8'));
  await f.write(file, JSON.stringify({ ...old, summary: 'rewritten history' }));
  const corrupt = checkUpgradeCoverage(f.root, baseline, f.commit());
  assert.equal(corrupt.status, 'BLOCKED');
  assert(corrupt.errors.some(e => e.reason === 'journal_history_is_append_only'));
});

test('directory scope covers committed descendants; wildcard scope and fabricated checks block', async t => {
  const f = await fixture(t), r = await f.record(['scripts']); await f.verify(r);
  await f.write('scripts/tool.mjs', 'export const v = 2;\n');
  assert.equal(checkUpgradeCoverage(f.root, f.base, f.commit()).status, 'PASS');
  const bad = await f.record(['scripts/**']); await f.verify(bad);
  const wildcard = checkUpgradeCoverage(f.root, f.base, f.commit());
  assert(wildcard.errors.some(e => e.reason === 'scope_must_be_exact_path_or_directory'));
  const folder = path.join(f.root, `core-improvements/entries/${r.id}/events`);
  const files = await fs.readdir(folder);
  for (const file of files) {
    const event = JSON.parse(await fs.readFile(path.join(folder, file), 'utf8'));
    if (event.status === 'local-verified') {
      event.checks[0].result = 'FAIL'; await fs.writeFile(path.join(folder, file), JSON.stringify(event));
    }
  }
  assert(checkUpgradeCoverage(f.root, f.base, f.commit()).errors.some(e => e.reason === 'verified_checks_required'));
});

test('deletion still needs provenance; immutable SOURCE archives and events cannot be rewritten', async t => {
  const f = await fixture(t);
  await f.write('SKILLS/fixture/SOURCE_SKILL.md', 'immutable imported bytes\n');
  const base = f.commit();
  await fs.unlink(path.join(f.root, 'scripts/tool.mjs'));
  let result = checkUpgradeCoverage(f.root, base, f.commit());
  assert.deepEqual(result.uncovered_paths, ['scripts/tool.mjs']);
  const r = await f.record(); await f.verify(r);
  assert.equal(checkUpgradeCoverage(f.root, base, f.commit()).status, 'PASS');
  await f.write('SKILLS/fixture/SOURCE_SKILL.md', 'modified archive\n');
  result = checkUpgradeCoverage(f.root, base, f.commit());
  assert(result.errors.some(e => e.reason === 'source_archive_is_immutable'));
});

test('classification includes agent/core/skill/CI paths and excludes private site plans and test-only work', () => {
  for (const file of ['.gitattributes', 'SKILLS/.gitattributes', 'AGENTS.md', 'CORE_IMPROVEMENT.md', 'SKILLS/PROJECT_CONTRACT.md',
    'agent-business-core/runtime/src/pinet_core/control/router.py', '.github/workflows/agent-workflow.yml'])
    assert.equal(requiresUpgrade(file), true, file);
  for (const file of ['sites/fixture/BUSINESS.md', 'WORKSTREAMS.md', 'docs/PLAN.md',
    'scripts/core-upgrade-check.test.mjs', 'agent-business-core/runtime/offline_tests/test_fixture.py',
    'SKILLS/niche-site-audit/scripts/rendered-site_test.py', 'scripts/test_fixture.py'])
    assert.equal(requiresUpgrade(file), false, file);
});

async function replacementFixture(t,{fragment=false,wrongTree=false,wrongScope=false,foreign=false,verify=true}={}) {
 const f=await fixture(t);
 const old=await f.record(['scripts/tool.mjs'],
  'https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/1'+(fragment?'#historical-proof':''));
 if(fragment) await f.verify(old);
 await f.write('scripts/tool.mjs','export const v = 2;\n');
 const original=f.commit(),treeSha=f.git('rev-parse',`${original}:core-improvements/entries/${old.id}`);
 const replacement=await createRecord(f.root,{
  siteId:'core',summary:'Fresh scoped verification replacing defective historical provenance',category:'workflow',
  evidence:['Historical tree is immutable; source is rechecked now.'],
  paths:[wrongScope?'scripts/elsewhere.mjs':'scripts/tool.mjs'],
  issue:foreign?'https://github.com/christianza1989/niche-public-core/pull/1':'https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/1',
  rollback:'Remove only the new replacement statement',
  supersedes:[{id:old.id,treeSha:wrongTree?'0'.repeat(40):treeSha}],
 });
 if(verify)await f.verify(replacement);
 return {...f,old,replacement,original};
}

test('fresh exact-tree verification replaces malformed historical checks without rewriting their bytes',async t=>{
 const f=await replacementFixture(t),result=checkUpgradeCoverage(f.root,f.base,f.commit());
 assert.equal(result.status,'PASS');assert.equal(result.superseded_legacy_validation.length,1);
 assert.equal(result.superseded_legacy_validation[0].original_error,'verified_checks_required');
 assert(!result.verified_upgrade_ids.includes(f.old.id));
 assert.equal(f.git('rev-parse',`${f.original}:core-improvements/entries/${f.old.id}`),
  f.git('rev-parse',`HEAD:core-improvements/entries/${f.old.id}`));
});

test('a canonical fresh replacement preserves the original fragment issue error as diagnostics',async t=>{
 const f=await replacementFixture(t,{fragment:true}),result=checkUpgradeCoverage(f.root,f.base,f.commit());
 assert.equal(result.status,'PASS');assert.equal(result.superseded_legacy_validation[0].original_error,'canonical_issue_url_required');
});

for(const option of ['wrongTree','wrongScope','foreign','verify'])test(`replacement cannot bypass ${option}`,async t=>{
 const f=await replacementFixture(t,{[option]:option==='verify'?false:true});
 assert.equal(checkUpgradeCoverage(f.root,f.base,f.commit()).status,'BLOCKED');
});

test('replacement cannot waive a historical record edit or an immutable SOURCE change',async t=>{
 const f=await replacementFixture(t);
 const oldBase=f.original;
 const oldFile=`core-improvements/entries/${f.old.id}/record.json`;
 const original=JSON.parse(await fs.readFile(path.join(f.root,oldFile),'utf8'));
 await f.write(oldFile,JSON.stringify({...original,summary:'Rewritten history'}));
 const result=checkUpgradeCoverage(f.root,oldBase,f.commit());
 assert.equal(result.status,'BLOCKED');assert(result.errors.some(e=>e.reason==='journal_history_is_append_only'));
});

const archiveProtection='**/SOURCE_SKILL.md -text -filter -working-tree-encoding\n**/SOURCE_PROMPT.md -text -filter -working-tree-encoding\n';
async function archiveFixture(t){
 const f=await fixture(t),file='SKILLS/fixture/SOURCE_SKILL.md',original=Buffer.from('Original imported UTF-8: žodis.\r\nExact preserved bytes.\r\n');
 const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
 await f.write('.gitattributes','*.md text eol=lf\n');
 const catalog={skills:[{id:'fixture',archives:[{file:'fixture/SOURCE_SKILL.md',sha256:sha(original)}]}]};
 await f.write('SKILLS/catalog.json',JSON.stringify(catalog)+'\n');
 await f.write(file,Buffer.from(original.toString().replaceAll('\r\n','\n')));
 f.git('config','core.autocrlf','true');
 const base=f.commit();
 const raw=(...args)=>{const result=spawnSync('git',args,{cwd:f.root,encoding:null});assert.equal(result.status,0,result.stderr?.toString());return result.stdout;};
 return {...f,file,original,sha,catalog,base,raw};
}

test('a journalled exact original archive restoration survives index and fresh Git checkout byte-for-byte',async t=>{
 const f=await archiveFixture(t);
 await f.write('.gitattributes','*.md text eol=lf\n'+archiveProtection);await f.write(f.file,f.original);
 const unverified=f.commit(),blocked=checkUpgradeCoverage(f.root,f.base,unverified);
 assert.equal(blocked.status,'BLOCKED');assert.ok(blocked.uncovered_paths.includes(f.file),'restored bytes still require a verified scoped journal');
 const r=await f.record(['.gitattributes',f.file]);await f.verify(r);const head=f.commit();
 assert.deepEqual(f.raw('show',head+':'+f.file),f.original);
 assert.equal(checkUpgradeCoverage(f.root,f.base,head).status,'PASS');
 const clone=path.join(f.root,'fresh-checkout'),result=spawnSync('git',['-c','core.autocrlf=true','clone','--no-hardlinks',f.root,clone],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);assert.deepEqual(await fs.readFile(path.join(clone,f.file)),f.original);
});

test('archive restoration never accepts semantic/catalog changes, working-only attributes or nested/mode overrides',async t=>{
 for(const kind of ['semantic','catalog','working-attributes','nested-attributes','mode','symlink'])await t.test(kind,async child=>{
  const f=await archiveFixture(child);await f.write('.gitattributes','*.md text eol=lf\n'+archiveProtection);
  let restored=f.original;
  if(kind==='semantic')restored=Buffer.concat([f.original,Buffer.from('Changed source.\r\n')]);
  if(kind==='catalog'){restored=Buffer.concat([f.original,Buffer.from('Changed source.\r\n')]);f.catalog.skills[0].archives[0].sha256=f.sha(restored);await f.write('SKILLS/catalog.json',JSON.stringify(f.catalog)+'\n');}
  if(kind==='working-attributes'){await f.write('.gitattributes','*.md text eol=lf\n');await f.write('.git/info/attributes','SKILLS/fixture/SOURCE_SKILL.md -text\n');}
  if(kind==='nested-attributes')await f.write('SKILLS/fixture/.gitattributes','SOURCE_SKILL.md text\n');
  await f.write(f.file,restored);
  const r=await f.record(['.gitattributes','SKILLS']);await f.verify(r);f.git('add','.');
  // Deliberately bypass working-tree clean filters to test committed protection,
  // not merely a failed hash caused by the hostile nested attribute override.
  const object=spawnSync('git',['hash-object','-w','--stdin'],{cwd:f.root,input:restored,encoding:'utf8'});assert.equal(object.status,0);
  f.git('update-index','--cacheinfo',kind==='mode'?'100755':kind==='symlink'?'120000':'100644',object.stdout.trim(),f.file);
  f.git('commit','-m','synthetic hostile restoration');
  const result=checkUpgradeCoverage(f.root,f.base,f.git('rev-parse','HEAD'));
  assert.ok(result.errors.some(error=>error.path===f.file&&error.reason==='source_archive_is_immutable'),kind);
 });
});

test('a companion record with identical filenames cannot attest a private core change', async t => {
  const f = await fixture(t);
  await f.write('scripts/tool.mjs', 'export const v = 2;\n');
  const publicRecord = await f.record(['scripts/tool.mjs'], 'https://github.com/christianza1989/niche-public-core/issues/1');
  await f.verify(publicRecord);
  const result = checkUpgradeCoverage(f.root, f.base, f.commit());
  assert.equal(result.status, 'BLOCKED');
  assert.deepEqual(result.uncovered_paths, ['scripts/tool.mjs']);
});

test('companion literal routes are reported separately instead of being looked up in the private tree', async t => {
  const f = await fixture(t);
  const r = await f.record(['app/niche/memocasting/instagram/[...path]/route.ts'],
    'https://github.com/christianza1989/niche-public-core/issues/30');
  await f.verify(r);
  const result = checkUpgradeCoverage(f.root, f.base, f.commit());
  assert.equal(result.status, 'PASS');
  assert.deepEqual(result.verified_upgrade_ids, []);
  assert.deepEqual(result.foreign_scope_ids, [r.id]);
  const bad = await f.record(['app/niche/*/route.ts'],
    'https://github.com/christianza1989/niche-public-core/issues/30');
  await f.verify(bad);
  assert.equal(checkUpgradeCoverage(f.root, f.base, f.commit()).status, 'BLOCKED');
});

test('shared dependency manifests need verified provenance in the actual committed diff', async t => {
  const f = await fixture(t);
  const files = ['package.json', 'content-studio/package-lock.json',
    'agent-business-core/runtime/pyproject.toml', 'agent-business-core/runtime/uv.lock'];
  for (const file of files) await f.write(file, 'synthetic changed dependency\n');
  const uncovered = checkUpgradeCoverage(f.root, f.base, f.commit());
  assert.equal(uncovered.status, 'BLOCKED');
  assert.deepEqual(uncovered.uncovered_paths.sort(), [...files].sort());
  const r = await f.record(files); await f.verify(r);
  assert.equal(checkUpgradeCoverage(f.root, f.base, f.commit()).status, 'PASS');
  assert.equal(requiresUpgrade('sites/fixture/package.json'), false);
});

test('noncanonical issue URLs fail closed instead of reclassifying public records as private', async t => {
  for (const suffix of ['/', '?source=review', '#finding', '\n']) {
    const f = await fixture(t);
    await f.write('scripts/tool.mjs', 'export const v = 2;\n');
    const r = await f.record(['scripts/tool.mjs'],
      'https://github.com/christianza1989/niche-public-core/issues/1' + suffix);
    await f.verify(r);
    const result = checkUpgradeCoverage(f.root, f.base, f.commit());
    assert.equal(result.status, 'BLOCKED', suffix);
    assert.deepEqual(result.uncovered_paths, ['scripts/tool.mjs']);
    assert(result.errors.some(e => e.reason === 'canonical_issue_url_required'), suffix);
  }
});

test('literal bracketed committed blob and tree scopes pass without matching neighbouring paths', async t => {
  const f = await fixture(t);
  const file = 'scripts/app/[siteId]/[[...slug]]/page.tsx';
  await f.write(file, 'export const route = 1;\n');
  const r = await f.record([file]); await f.verify(r);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.root,
    `core-improvements/entries/${r.id}/record.json`), 'utf8')).paths, [file]);
  const blobHead = f.commit();
  assert.equal(checkUpgradeCoverage(f.root, f.base, blobHead).status, 'PASS');
  const tree = await f.record(['scripts/app/[siteId]/[[...slug]]']); await f.verify(tree);
  const outside = 'scripts/app/[siteId]/[[...slug]]-other/page.tsx';
  await f.write(file, 'export const route = 2;\n');
  await f.write(outside, 'export const unrelated = 1;\n');
  const result = checkUpgradeCoverage(f.root, blobHead, f.commit());
  assert.equal(result.status, 'BLOCKED');
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.uncovered_paths, [outside]);
});

test('literal bracketed deleted blob keeps exact committed deletion provenance', async t => {
  const f = await fixture(t), file = 'scripts/[param]/obsolete.mjs';
  await f.write(file, 'export const old = 1;\n');
  const base = f.commit();
  await fs.unlink(path.join(f.root, file));
  const r = await f.record([file]); await f.verify(r);
  assert.equal(checkUpgradeCoverage(f.root, base, f.commit()).status, 'PASS');
});

test('bracket patterns, wildcards and working-tree-only scope never broaden committed coverage', async t => {
  for (const scope of ['scripts/**', 'scripts/app/*/page.mjs', 'scripts/tool?.mjs',
    'scripts/app/[ab]/page.mjs', 'scripts/app/[missing]/page.mjs']) {
    const f = await fixture(t);
    const actual = 'scripts/app/a/page.mjs';
    await f.write(actual, 'export const actual = 1;\n');
    const r = await f.record([scope]); await f.verify(r);
    const result = checkUpgradeCoverage(f.root, f.base, f.commit());
    assert.equal(result.status, 'BLOCKED', scope);
    assert.deepEqual(result.uncovered_paths, [actual], scope);
    assert(result.errors.some(e => e.reason === 'scope_must_be_exact_path_or_directory'), scope);
  }
  const f = await fixture(t), file = 'scripts/[uncommitted]/tool.mjs';
  await f.write('scripts/tool.mjs', 'export const changed = 1;\n');
  f.commit();
  await f.write(file, 'working tree only\n');
  const r = await f.record([file]); await f.verify(r);
  f.git('add', 'core-improvements'); f.git('commit', '-m', 'journal only');
  const result = checkUpgradeCoverage(f.root, f.base, f.git('rev-parse', 'HEAD'));
  assert(result.errors.some(e => e.reason === 'scope_must_be_exact_path_or_directory'));
  assert.deepEqual(result.uncovered_paths, ['scripts/tool.mjs']);
});
