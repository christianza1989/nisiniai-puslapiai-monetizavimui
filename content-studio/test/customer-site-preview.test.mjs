// Isolated protocol/source/process tests. No business, provider or site acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,lstat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {previewSource,previewEnvironment,previewDependencies,previewBuildDigest,previewProcess,previewAdmission,previewImportedRelease,previewRuntimeState} from '../scripts/customer-site-preview.mjs';
const site='creation-'+'a'.repeat(32);
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore'],windowsHide:true}).trim();
async function temporary(t){
  const root=await mkdtemp(path.join(os.tmpdir(),'pinet-preview-'));
  t.after(async()=>{assert.equal(path.dirname(root),os.tmpdir());assert.ok(path.basename(root).startsWith('pinet-preview-'));assert.equal((await lstat(root)).isSymbolicLink(),false);await rm(root,{recursive:true,force:true});});
  return root;
}
async function repository(t){
  const root=await temporary(t);git(root,['init','--quiet']);
  await mkdir(path.join(root,'lib'));await writeFile(path.join(root,'lib/source.mjs'),'export const fixture=true;');
  await writeFile(path.join(root,'.gitignore'),'node_modules/\noutput/\n.sites-runtime/\n');
  git(root,['add','.']);git(root,['-c','user.name=Isolated QA','-c','user.email=qa@example.invalid','commit','--quiet','-m','Synthetic fixture']);
  const sha=git(root,['rev-parse','HEAD']);git(root,['remote','add','origin','https://github.com/christianza1989/niche-public-core']);git(root,['update-ref','refs/remotes/origin/main',sha]);
  return {root,sha};
}

test('actual source root/current main are required; a copied child cannot borrow parent Git identity',async t=>{
  const {root,sha}=await repository(t);assert.equal(await previewSource(root,sha),sha);
  const copy=path.join(root,'output/copy');await mkdir(copy,{recursive:true});
  await assert.rejects(previewSource(copy,sha),/source_unavailable/);
  const checkout=path.join(root,'output/actual');git(root,['worktree','add','--detach',checkout,sha]);assert.equal(await previewSource(checkout,sha),sha);
  await writeFile(path.join(checkout,'lib/source.mjs'),'changed');await assert.rejects(previewSource(checkout,sha),/source_dirty/);
  await writeFile(path.join(checkout,'lib/source.mjs'),'export const fixture=true;');
  await mkdir(path.join(checkout,'content-packages'));await writeFile(path.join(checkout,'content-packages/test.json'),'{}');assert.equal(await previewSource(checkout,sha),sha);
  await writeFile(path.join(checkout,'foreign-execution.mjs'),'changed');await assert.rejects(previewSource(checkout,sha),/source_dirty/);
});

test('preview environment allows OS paths and explicit local holds without model/account/provider settings',()=>{
  const env=previewEnvironment(site),allowed=new Set(['PATH','SYSTEMROOT','WINDIR','TEMP','TMP','PATHEXT','COMSPEC','NICHE_DEV_SITE_ID','CLOUDFLARE_CF_FETCH_ENABLED','WRANGLER_SEND_METRICS','WRANGLER_WRITE_LOGS','LEAD_EMAIL_ENABLED','VOICE_ENABLED','SMTP_ENABLED','NODE_ENV']);
  assert.ok(Object.keys(env).every(key=>allowed.has(key.toUpperCase())));assert.equal(env.NICHE_DEV_SITE_ID,site);assert.equal(env.LEAD_EMAIL_ENABLED,'0');
  assert.throws(()=>previewEnvironment('another-site'),/site_invalid/);
});

test('borrowed npm dependencies bind matching lock bytes, installed metadata and actual direct package version',async t=>{
  const root=await temporary(t),source=path.join(root,'source'),target=path.join(root,'target');
  await mkdir(path.join(source,'node_modules/example'),{recursive:true});await mkdir(target);
  const entry={version:'1.0.0',integrity:'synthetic-integrity',resolved:'https://example.invalid/package'};
  const lock=JSON.stringify({lockfileVersion:3,packages:{'':{},'node_modules/example':entry}});
  await writeFile(path.join(source,'package-lock.json'),lock);await writeFile(path.join(target,'package-lock.json'),lock);
  await writeFile(path.join(source,'node_modules/.package-lock.json'),JSON.stringify({lockfileVersion:3,packages:{'node_modules/example':entry}}));
  await writeFile(path.join(source,'node_modules/example/package.json'),JSON.stringify({name:'example',version:'1.0.0'}));await writeFile(path.join(target,'package.json'),JSON.stringify({dependencies:{example:'1.0.0'}}));
  assert.equal((await previewDependencies(source,target)).direct_packages,1);
  await writeFile(path.join(source,'node_modules/example/package.json'),JSON.stringify({name:'example',version:'2.0.0'}));await assert.rejects(previewDependencies(source,target),/dependencies_changed/);
  await writeFile(path.join(target,'package-lock.json'),lock+' ');await assert.rejects(previewDependencies(source,target),/dependencies_changed/);
});

test('compiled artifact digest detects changed or missing build bytes',async t=>{
  const root=await temporary(t);await mkdir(path.join(root,'dist/server'),{recursive:true});await writeFile(path.join(root,'dist/server/index.js'),'synthetic original');
  const before=await previewBuildDigest(root);assert.equal(before.files,1);await writeFile(path.join(root,'dist/server/index.js'),'synthetic changed');assert.notEqual((await previewBuildDigest(root)).sha256,before.sha256);
  await rm(path.join(root,'dist/server/index.js'));await assert.rejects(previewBuildDigest(root),/build_changed/);
});

test('partial build retry preserves exact local admission bytes and rejects a foreign package without overwrite',async t=>{
  const root=await temporary(t),file=path.join(root,'local-admission.json'),pkg={siteId:site,canonicalHost:'foundation.example'},sha='b'.repeat(64);
  const first=await previewAdmission(file,pkg,sha),bytes=await readFile(file);
  assert.equal(await previewAdmission(file,pkg,sha),first);assert.deepEqual(await readFile(file),bytes);
  await assert.rejects(previewAdmission(file,pkg,'c'.repeat(64)),/admission_changed/);assert.deepEqual(await readFile(file),bytes);
});

test('partial imported release retry requires exact package, activation and asset bytes',async t=>{
  const root=await temporary(t),pkg={siteId:site},bytes=Buffer.from('{"synthetic":true}'),admission=path.join(root,'admission.json'),folder=path.join(root,'content-packages',site),asset=Buffer.from('synthetic protocol bytes'),assetHashes={'fixture.webp':createHash('sha256').update(asset).digest('hex')};
  await writeFile(admission,'synthetic exact local admission');assert.equal(await previewImportedRelease(root,pkg,bytes,assetHashes,admission),false);
  await mkdir(path.join(folder,'assets'),{recursive:true});await writeFile(path.join(folder,'content-package.json'),bytes);await writeFile(path.join(folder,'activation.json'),await readFile(admission));await writeFile(path.join(folder,'assets/fixture.webp'),asset);
  assert.equal(await previewImportedRelease(root,pkg,bytes,assetHashes,admission),true);
  await writeFile(path.join(folder,'assets/fixture.webp'),'changed');await assert.rejects(previewImportedRelease(root,pkg,bytes,assetHashes,admission),/release_changed/);await writeFile(path.join(folder,'assets/fixture.webp'),asset);
  await writeFile(path.join(folder,'activation.json'),'changed');await assert.rejects(previewImportedRelease(root,pkg,bytes,assetHashes,admission),/release_changed/);
});

test('short local state binds its full owner and rejects prefix collision or foreign existing files',async t=>{
  const root=await temporary(t),owner={scopeSha256:'a'.repeat(64),packageSha256:'b'.repeat(64)},folder=await previewRuntimeState(root,owner);
  assert.equal(folder,path.join(root,'output/foundation-state','a'.repeat(16)));assert.equal(await previewRuntimeState(root,owner),folder);
  await assert.rejects(previewRuntimeState(root,{...owner,scopeSha256:'a'.repeat(16)+'c'.repeat(48)}),/foreign_state/);
  const other=path.join(root,'output/foundation-state','d'.repeat(16));await mkdir(other);await writeFile(path.join(other,'foreign'),'owned elsewhere');
  await assert.rejects(previewRuntimeState(root,{scopeSha256:'d'.repeat(64)}),/foreign_state/);
});

test('successful fixed compiler exits, timeout and parent disconnect stop only owned processes',async t=>{
  const {root}=await repository(t);await mkdir(path.join(root,'scripts'));
  const file=path.join(root,'scripts/compile-content-packages.mjs'),log=path.join(root,'output/log.private.log');await mkdir(path.dirname(log));
  const owned=[];t.after(async()=>{for(const run of owned)await run.close();});
  const start=timeout=>{const run=previewProcess(root,'compile',[],site,log,timeout);owned.push(run);return run;};
  await writeFile(file,"console.log('synthetic fixed compiler');");
  const success=start(5000);await success.done;assert.equal(success.finished,true);
  await writeFile(file,'setInterval(()=>{},1000);');
  const timeout=start(1000);await assert.rejects(timeout.done,/preview_timeout/);assert.equal(timeout.finished,true);
  const disconnected=start(5000);
  await disconnected.ready;disconnected.child.disconnect();await assert.rejects(disconnected.done,/build_failed/);assert.equal(disconnected.finished,true);
});

test('guarded server invokes a CJS CLI as its main module and closes its owned child tree',async t=>{
  const {root}=await repository(t),bin=path.join(root,'node_modules/wrangler/bin');await mkdir(bin,{recursive:true});await mkdir(path.join(root,'scripts'));await mkdir(path.join(root,'output'));
  await writeFile(path.join(root,'scripts/sites-env.mjs'),'export const synthetic=true;');
  await writeFile(path.join(bin,'wrangler.js'),"if(require.main===module){console.log('synthetic owned CLI main');setInterval(()=>{},1000);}");
  const log=path.join(root,'output/server.private.log'),run=previewProcess(root,'serve',['12345'],site,log,12000);t.after(()=>run.close());await run.ready;
  let reached=false;for(let attempt=0;attempt<100;attempt++){try{reached=(await readFile(log,'utf8')).includes('synthetic owned CLI main');}catch(error){if(error.code!=='ENOENT')throw error;}if(reached)break;await new Promise(r=>setTimeout(r,50));}
  assert.equal(reached,true,(await readFile(log,'utf8').catch(()=>'' )).slice(0,2000));run.child.disconnect();await assert.rejects(run.done,/build_failed/);assert.equal(run.finished,true);
});
