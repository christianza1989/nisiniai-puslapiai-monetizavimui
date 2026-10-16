// Source-only storage protocol checks; never execute Wrangler or open a database/server.
import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import * as childProcess from 'node:child_process';
import * as net from 'node:net';
import {createHash} from 'node:crypto';
import {mkdtemp,mkdir,readFile,writeFile,readdir,lstat,rm,rmdir,symlink,unlink} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {stableV2} from '../src/content-package-v2.mjs';

const sha=v=>createHash('sha256').update(v).digest('hex'),children=new Map(),invocations=[];
let nextPid=90000000,failNext=false,holdNext=false,delayNext=0,notifySpawn=null,readyProof;
function exit(child,code=0){if(child.exitCode!==null)return;child.exitCode=code;child.stdout.end();child.stderr.end();child.emit('exit',code);}
function fakeSpawn(command,args,options){
  const child=new EventEmitter();child.pid=nextPid++;child.exitCode=null;child.signalCode=null;
  child.stdout=new PassThrough();child.stderr=new PassThrough();children.set(child.pid,child);
  if(command.toLowerCase().endsWith('taskkill.exe')){queueMicrotask(()=>{exit(children.get(Number(args[args.indexOf('/PID')+1])));exit(child);});return child;}
  invocations.push({command,args,options});
  const mode=args[args.indexOf('--owned-runner')+2],failure=failNext,held=holdNext,delay=delayNext;failNext=false;holdNext=false;delayNext=0;
  notifySpawn?.(mode);
  queueMicrotask(()=>{child.emit('message',{kind:'owned-preview-ready',mode});if(mode!=='serve'&&!held){if(delay)setTimeout(()=>exit(child,failure?1:0),delay);else exit(child,failure?1:0);}});
  return child;
}
mock.module('node:child_process',{exports:{...childProcess,spawn:fakeSpawn}});
mock.module('node:net',{exports:{...net,createServer:()=>{const server=new EventEmitter();server.listen=(_port,_host,done)=>done();
  server.address=()=>({port:12345});server.close=done=>done();return server;}}});
mock.module('../../SKILLS/niche-site-audit/scripts/verify-site-completion.mjs',{exports:{requestCompletion:async()=>({status:200,
  headers:new Headers({'x-niche-package-sha256':readyProof.packageSha256,'x-niche-source-revision':readyProof.publicSourceRevision})})}});
const preview=await import('../scripts/customer-site-preview.mjs');
const publicSource=process.env.PINET_PUBLIC_CORE_PATH;
const {cleanBuildSource}=await import(pathToFileURL(path.join(publicSource,'scripts/content-build-proof.mjs')));

async function fixture(t){
  const temp=await mkdtemp(path.join(os.tmpdir(),'pinet-preview-storage-'));
  t.after(async()=>{assert.equal(path.dirname(temp),os.tmpdir());assert.ok(path.basename(temp).startsWith('pinet-preview-storage-'));
    assert.equal((await lstat(temp)).isSymbolicLink(),false);await rm(temp,{recursive:true,force:true});});
  const publicCore=path.join(temp,'public'),scopeSha256='a'.repeat(64),parent=path.join(publicCore,'output/foundation-preview',scopeSha256),checkout=path.join(parent,'repo');
  await mkdir(path.join(checkout,'scripts'),{recursive:true});await mkdir(path.join(checkout,'drizzle'));
  await writeFile(path.join(checkout,'.gitignore'),'dist/\n.sites-runtime/\nnode_modules/\n');
  await writeFile(path.join(checkout,'proxy.ts'),'export const fixture = true;\n');
  await writeFile(path.join(checkout,'scripts/content-build-proof.mjs'),await readFile(path.join(publicSource,'scripts/content-build-proof.mjs')));
  for(const name of ['0004_niche_leads.sql','0005_niche_interest_daily.sql'])await writeFile(path.join(checkout,'drizzle',name),await readFile(path.join(publicSource,'drizzle',name)));
  const git=args=>childProcess.execFileSync('git',args,{cwd:checkout,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  git(['init','-b','main']);git(['add','.']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','synthetic source']);
  git(['remote','add','origin','https://github.com/christianza1989/niche-public-core.git']);const source=git(['rev-parse','HEAD']);git(['update-ref','refs/remotes/origin/main',source]);
  const owner={version:1,scopeSha256,packageSha256:'b'.repeat(64),releaseId:'00000000-0000-4000-8000-000000000001',publicSourceRevision:source,nativeContextSha256:'c'.repeat(64)};
  await writeFile(path.join(parent,'owner.json'),JSON.stringify(owner));
  const siteId='creation-'+'d'.repeat(32),database={binding:'DB',database_name:'site-creator-d1',database_id:'00000000-0000-4000-8000-000000000000'};
  const config={main:'index.js',assets:{binding:'ASSETS'},vars:{NICHE_DEV_SITE_ID:siteId},d1_databases:[database]};
  async function build(){
    await preview.installPreviewStorage(checkout,owner);await mkdir(path.join(checkout,'dist/server'),{recursive:true});
    await writeFile(path.join(checkout,'dist/server/wrangler.json'),JSON.stringify(config));await writeFile(path.join(checkout,'dist/server/index.js'),'// inert compiled fixture');
    const saved={binding:{...owner,dependencies:{fixture:true},storage:await preview.previewStorageInputs(checkout)},build:await preview.previewBuildDigest(checkout),storage:await preview.previewStorageConfig(checkout,siteId)};
    const raw=JSON.stringify(saved);await writeFile(path.join(parent,'build.json'),raw);
    const prepared={checkout,parent,siteId,scopeSha256,packageSha256:owner.packageSha256,releaseId:owner.releaseId,publicSourceRevision:source,buildSha256:sha(raw)};
    const runtimeOwner={...saved.binding,buildSha256:prepared.buildSha256,storageConfigSha256:saved.storage.sha256};
    const runtimeRoot=await preview.previewRuntimeState(publicCore,runtimeOwner);
    return {saved,prepared,runtimeOwner,runtimeRoot};
  }
  return {temp,publicCore,parent,checkout,owner,source,siteId,config,build};
}

test('the maintained producer validates its actual generated local DB config',()=>{
  assert.equal(typeof preview.previewStorageConfig,'function');
});

test('fixed hosting and excludes are owned DATA; public compiler still rejects every other dirty source',async t=>{
  const f=await fixture(t);assert.equal(cleanBuildSource(f.checkout),f.source);
  const storage=await preview.installPreviewStorage(f.checkout,f.owner);
  assert.equal(storage.schemas.length,2);assert.equal(cleanBuildSource(f.checkout),null);
  await assert.rejects(preview.previewSource(f.checkout,f.source),{code:'foundation_preview_source_dirty'});
  await preview.previewSource(f.checkout,f.source,true);
  const env=await preview.previewStorageGitEnvironment(f.checkout),old={};
  try{
    for(const [k,v]of Object.entries(env)){old[k]=process.env[k];process.env[k]=v;}
    assert.equal(cleanBuildSource(f.checkout),f.source);
    await writeFile(path.join(f.checkout,'foreign.mjs'),'// untracked execution code');assert.equal(cleanBuildSource(f.checkout),null);
    await unlink(path.join(f.checkout,'foreign.mjs'));
    await writeFile(path.join(f.checkout,'proxy.ts'),'// changed tracked execution code');assert.equal(cleanBuildSource(f.checkout),null);
  }finally{for(const [k,v]of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
  assert.equal(cleanBuildSource(f.checkout),null);
});

test('foreign ownership, changed fixed excludes or symlink hosting never overwrite files',async t=>{
  const f=await fixture(t);await preview.installPreviewStorage(f.checkout,f.owner);
  const file=path.join(f.checkout,'.openai/hosting.json'),original=await readFile(file);
  await assert.rejects(preview.installPreviewStorage(f.checkout,{...f.owner,packageSha256:'0'.repeat(64)}),{code:'foundation_preview_foreign_checkout'});
  await writeFile(file,'{"d1":"foreign","r2":"SECRET"}\n');
  await assert.rejects(preview.installPreviewStorage(f.checkout,f.owner),{code:'foundation_preview_storage_config_changed'});
  assert.equal((await readFile(file)).toString(),'{"d1":"foreign","r2":"SECRET"}\n');
  await writeFile(file,original);
  const excludes=path.join(f.checkout,'.sites-runtime/preview-storage.gitignore');await writeFile(excludes,'/.openai/hosting.json\n/proxy.ts\n');
  await assert.rejects(preview.previewStorageGitEnvironment(f.checkout),{code:'foundation_preview_storage_config_changed'});
  await writeFile(excludes,'/.openai/hosting.json\n');
  const outside=path.join(f.temp,'foreign-hosting.json');await writeFile(outside,original);await unlink(file);
  let fileLink=false;try{await symlink(outside,file,'file');fileLink=true;}catch(error){if(error.code!=='EPERM')throw error;}
  if(fileLink){await assert.rejects(preview.previewStorageGitEnvironment(f.checkout),{code:'writer_unsafe_artifact'});await unlink(file);}
  await rmdir(path.dirname(file));
  const externalDir=path.join(f.temp,'external-hosting');await mkdir(externalDir);await writeFile(path.join(externalDir,'hosting.json'),original);
  await symlink(externalDir,path.dirname(file),process.platform==='win32'?'junction':'dir');
  await assert.rejects(preview.previewStorageGitEnvironment(f.checkout),{code:'writer_unsafe_artifact'});
  assert.deepEqual(await readFile(outside),original);
});

test('ASSETS-only, remote or mail/R2 generated bindings fail before runtime initialization',async t=>{
  const f=await fixture(t);await f.build();const file=path.join(f.checkout,'dist/server/wrangler.json');
  for(const patch of [{d1_databases:[]},{d1_databases:[{...f.config.d1_databases[0],remote:true}]},
    {d1_databases:[{...f.config.d1_databases[0],database_id:'ffffffff-ffff-4fff-8fff-ffffffffffff'}]},
    {send_email:[{name:'LEAD_EMAIL'}]},{r2_buckets:[{binding:'STORE'}]},{vars:{NICHE_DEV_SITE_ID:'foreign'}},
    {vars:{NICHE_DEV_SITE_ID:f.siteId,LEAD_SMTP_ENABLED:'1'}}]){
    await writeFile(file,JSON.stringify({...f.config,...patch}));
    await assert.rejects(preview.previewStorageConfig(f.checkout,f.siteId),{code:'foundation_preview_storage_binding_invalid'});
  }
});

test('generated config/schema hashes and full runtime owner bind the exact same local persistence',async t=>{
  const f=await fixture(t),b=await f.build();const {prepared,runtimeRoot}=b;
  await preview.previewStorageState(prepared,runtimeRoot);
  const commands=preview.previewStorageCommandArgs(f.checkout,runtimeRoot);
  assert.equal(commands.length,2);
  for(const [i,args]of commands.entries()){
    assert.deepEqual(args.slice(0,4),['d1','execute','DB','--local']);
    assert.equal(args[args.indexOf('--persist-to')+1],path.join(runtimeRoot,'state'));
    assert.equal(args[args.indexOf('--config')+1],path.join(f.checkout,'dist/server/wrangler.json'));
    assert.ok(args[args.indexOf('--file')+1].endsWith(i?'0005_niche_interest_daily.sql':'0004_niche_leads.sql'));
    assert.ok(!args.some(v=>['--remote','--command','--preview','create','delete'].includes(v)));
  }
  await assert.rejects(preview.previewStorageState(prepared,path.join(f.temp,'foreign')),{code:'foundation_preview_foreign_state'});
  const sql=path.join(f.checkout,'drizzle/0004_niche_leads.sql'),raw=await readFile(sql);await writeFile(sql,Buffer.concat([raw,Buffer.from('\nDROP TABLE niche_leads;')]));
  await assert.rejects(preview.previewStorageState(prepared,runtimeRoot),{code:'foundation_preview_storage_schema_changed'});
});

test('mocked idempotent initialization preserves sentinels and failed attempt evidence across retries',async t=>{
  const f=await fixture(t),{prepared,runtimeRoot}=await f.build();await mkdir(path.join(runtimeRoot,'state'));
  const sentinel=path.join(runtimeRoot,'state/preserved.txt');await writeFile(sentinel,'existing mock rows must not be reset');
  failNext=true;await assert.rejects(preview.initializePreviewStorage(prepared,runtimeRoot),{code:'foundation_preview_build_failed'});
  const failed=(await readdir(runtimeRoot)).find(n=>n.endsWith('.failed.json')),failedBytes=await readFile(path.join(runtimeRoot,failed));
  await preview.initializePreviewStorage(prepared,runtimeRoot);await preview.initializePreviewStorage(prepared,runtimeRoot);
  assert.equal((await readFile(sentinel)).toString(),'existing mock rows must not be reset');assert.deepEqual(await readFile(path.join(runtimeRoot,failed)),failedBytes);
  assert.equal((await readdir(runtimeRoot)).filter(n=>n.endsWith('.completed.json')).length,2);
  const runs=invocations.filter(v=>v.args.includes('init-storage'));
  assert.equal(runs.length,3);assert.ok(runs.every(v=>v.options.env.SITES_RUNTIME_ROOT===runtimeRoot));
});

test('startup revocation stops the owned mocked initializer before a server can start',async t=>{
  const f=await fixture(t),{prepared}=await f.build();readyProof=prepared;const prior=process.env.STUDIO_PUBLIC_CORE_DIR;process.env.STUDIO_PUBLIC_CORE_DIR=f.publicCore;
  const kill=mock.method(process,'kill',pid=>{assert.ok(children.has(Math.abs(pid)));exit(children.get(Math.abs(pid)));return true;});
  let permitted=true;holdNext=true;const start=invocations.length;
  const poll=setInterval(()=>{if(invocations.length>start)permitted=false;},5);
  try{await assert.rejects(preview.withCustomerSitePreview(prepared,()=>assert.fail(),null,async()=>permitted),{code:'authorization_revoked'});}
  finally{clearInterval(poll);kill.mock.restore();if(prior===undefined)delete process.env.STUDIO_PUBLIC_CORE_DIR;else process.env.STUDIO_PUBLIC_CORE_DIR=prior;}
  assert.ok(!invocations.slice(start).some(v=>v.args.includes('serve')));
});

test('last-moment authority refusal prevents initializer dispatch and retains failure evidence',async t=>{
  const f=await fixture(t),{prepared,runtimeRoot}=await f.build(),count=invocations.length;
  await assert.rejects(preview.initializePreviewStorage(prepared,runtimeRoot,()=>assert.fail(),140000,async()=>{
    throw Object.assign(Error('revoked'),{code:'authorization_revoked'});
  }),{code:'authorization_revoked'});
  assert.equal(invocations.length,count);assert.equal((await readdir(runtimeRoot)).filter(n=>n.endsWith('.failed.json')).length,1);
});

test('initialization and inspection share one 150-second total owned lifetime',{timeout:10000},async t=>{
  const f=await fixture(t),{prepared}=await f.build();readyProof=prepared;const prior=process.env.STUDIO_PUBLIC_CORE_DIR;process.env.STUDIO_PUBLIC_CORE_DIR=f.publicCore;
  const kill=mock.method(process,'kill',pid=>{assert.ok(children.has(Math.abs(pid)));exit(children.get(Math.abs(pid)));return true;});
  let initialized,entered;const initSeen=new Promise(resolve=>{initialized=resolve;}),serving=new Promise(resolve=>{entered=resolve;});
  t.mock.timers.enable({apis:['Date','setTimeout'],now:Date.now()});delayNext=20000;notifySpawn=mode=>{if(mode==='init-storage')initialized();};
  try{
    const run=preview.withCustomerSitePreview(prepared,async()=>{entered();await new Promise(()=>{});},null,async()=>true);
    run.catch(()=>entered());
    const rejected=assert.rejects(run,{code:'foundation_preview_timeout'});
    await initSeen;await Promise.resolve();t.mock.timers.tick(20000);await serving;
    t.mock.timers.tick(130001);await rejected;
  }finally{notifySpawn=null;t.mock.timers.reset();kill.mock.restore();if(prior===undefined)delete process.env.STUDIO_PUBLIC_CORE_DIR;else process.env.STUDIO_PUBLIC_CORE_DIR=prior;}
});
