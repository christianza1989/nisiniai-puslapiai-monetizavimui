// Trusted local build transport; not editorial, business or launch acceptance.
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {appendFile,lstat,mkdir,open,readFile,readdir,realpath,symlink,unlink,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:net';
import {pathToFileURL} from 'node:url';
import {stableV2,validateV2Package} from '../src/content-package-v2.mjs';
import {verifyContentRelease} from '../src/content-release.mjs';
import {assertArtifactDirectories,readArtifactBytes} from './customer-content-context.mjs';
import {requestCompletion} from '../../SKILLS/niche-site-audit/scripts/verify-site-completion.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),digest=value=>hash(stableV2(value));
const fail=code=>{throw Object.assign(new Error(code),{code});};
const git=(root,args,raw=false)=>{try{const value=execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:10000,maxBuffer:1048576,windowsHide:true});return raw?value:value.trim();}catch{fail('foundation_preview_source_unavailable');}};
const allowedData=file=>/^(content-packages\/|content-staging\/|public\/content-assets\/)/.test(file)||['lib/generated/content-packages.json','lib/generated/content-admissions.json'].includes(file);

export async function previewSource(root,expected){
  if(!path.isAbsolute(root)||!/^[a-f0-9]{40}$/.test(expected))fail('foundation_preview_source_unavailable');
  const absolute=path.resolve(root);
  if(await realpath(absolute)!==absolute||await realpath(git(absolute,['rev-parse','--show-toplevel']))!==absolute
      ||git(absolute,['rev-parse','HEAD'])!==expected)fail('foundation_preview_source_unavailable');
  const origin=git(absolute,['remote','get-url','origin']);
  if(!/^(?:https:\/\/github\.com\/|git@github\.com:)christianza1989\/niche-public-core(?:\.git)?$/.test(origin))fail('foundation_preview_source_unavailable');
  git(absolute,['merge-base','--is-ancestor','origin/main',expected]);
  // Git's NUL format keeps quoting and spaces from disguising a changed source.
  const changed=git(absolute,['diff','--name-only','-z','HEAD','--'],true).split('\0').filter(Boolean);
  const untracked=git(absolute,['ls-files','--others','--exclude-standard','-z'],true).split('\0').filter(Boolean);
  if([...changed,...untracked].some(file=>!allowedData(file)))fail('foundation_preview_source_dirty');
  return expected;
}

export function previewEnvironment(siteId,runtimeRoot=null){
  if(!/^creation-[a-f0-9]{32}$/.test(siteId))fail('foundation_preview_site_invalid');
  const keys=new Set(['PATH','SYSTEMROOT','WINDIR','TEMP','TMP','PATHEXT','COMSPEC']);
  const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>keys.has(key.toUpperCase())));
  if(runtimeRoot!==null&&!path.isAbsolute(runtimeRoot))fail('foundation_preview_path_invalid');
  return {...env,...(runtimeRoot!==null?{SITES_RUNTIME_ROOT:runtimeRoot}:{}),NICHE_DEV_SITE_ID:siteId,CLOUDFLARE_CF_FETCH_ENABLED:'false',WRANGLER_SEND_METRICS:'false',
    WRANGLER_WRITE_LOGS:'false',LEAD_EMAIL_ENABLED:'0',VOICE_ENABLED:'false',SMTP_ENABLED:'false',NODE_ENV:'production'};
}

export async function previewDependencies(source,checkout){
  const sourceLock=await readArtifactBytes(path.join(source,'package-lock.json'),8*1048576);
  if(!sourceLock.equals(await readArtifactBytes(path.join(checkout,'package-lock.json'),8*1048576)))fail('foundation_preview_dependencies_changed');
  const lock=JSON.parse(sourceLock),installedBytes=await readArtifactBytes(path.join(source,'node_modules/.package-lock.json'),8*1048576),installed=JSON.parse(installedBytes);
  if(lock.lockfileVersion!==3||installed.lockfileVersion!==3||!lock.packages||!installed.packages)fail('foundation_preview_dependencies_unavailable');
  for(const [name,entry]of Object.entries(installed.packages)){
    if(name==='')continue;
    const pinned=lock.packages[name];
    if(!name.startsWith('node_modules/')||!pinned||['version','integrity','resolved'].some(key=>(entry[key]??null)!==(pinned[key]??null)))fail('foundation_preview_dependencies_changed');
  }
  const manifest=JSON.parse(await readArtifactBytes(path.join(checkout,'package.json'),1048576));
  const direct=Object.keys({...manifest.dependencies,...manifest.devDependencies});
  for(const name of direct){
    const key='node_modules/'+name,entry=installed.packages[key];
    if(!entry||entry.version!==lock.packages[key]?.version)fail('foundation_preview_dependencies_unavailable');
    const actual=JSON.parse(await readFile(path.join(source,key,'package.json')));
    if(actual.name!==name||actual.version!==entry.version)fail('foundation_preview_dependencies_changed');
  }
  return {lock_sha256:hash(sourceLock),installed_metadata_sha256:hash(installedBytes),direct_packages:direct.length};
}

async function safeDirectories(root,target){
  const absolute=path.resolve(root),relative=path.relative(absolute,target);
  if(relative.startsWith('..')||path.isAbsolute(relative))fail('foundation_preview_path_invalid');
  let cursor=absolute;
  for(const part of ['',...relative.split(path.sep).filter(Boolean)]){
    if(part)cursor=path.join(cursor,part);
    try{await mkdir(cursor);}catch(error){if(error.code!=='EEXIST')throw error;}
    const info=await lstat(cursor);if(!info.isDirectory()||info.isSymbolicLink())fail('foundation_preview_path_invalid');
  }
  if(await realpath(absolute)!==absolute)fail('foundation_preview_path_invalid');
}

async function terminateOwned(child){
  if(child.exitCode!==null||child.signalCode!==null)return;
  if(process.platform==='win32'){
    await new Promise(resolve=>{const stop=spawn(path.join(process.env.SYSTEMROOT,'System32/taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});stop.once('error',resolve);stop.once('exit',resolve);});
  }else try{process.kill(-child.pid,'SIGKILL');}catch(error){if(error.code!=='ESRCH')throw error;}
  if(child.exitCode===null&&child.signalCode===null)await new Promise(resolve=>child.once('exit',resolve));
}

export function previewProcess(root,mode,args,siteId,log,timeoutMs=140000){
  if(!['import','compile','build','serve'].includes(mode)||!path.isAbsolute(root)||!path.isAbsolute(log)||!Array.isArray(args)||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>150000)fail('foundation_preview_process_invalid');
  const child=spawn(process.execPath,[import.meta.filename,'--owned-runner',root,mode,...args],{cwd:root,
    env:previewEnvironment(siteId,mode==='serve'&&args[1]?args[1]:null),windowsHide:true,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe','ipc']});
  let size=0,error=null,finished=false;
  const timer=setTimeout(()=>{error=Object.assign(new Error('foundation_preview_timeout'),{code:'foundation_preview_timeout'});void terminateOwned(child);},timeoutMs);
  const writes=[];
  for(const stream of [child.stdout,child.stderr])stream.on('data',bytes=>{size+=bytes.length;if(size>2*1048576){error=Object.assign(new Error('foundation_preview_log_limit'),{code:'foundation_preview_log_limit'});void terminateOwned(child);}else writes.push(appendFile(log,bytes).catch(()=>{error=Object.assign(new Error('foundation_preview_log_failed'),{code:'foundation_preview_log_failed'});void terminateOwned(child);}));});
  const done=new Promise((resolve,reject)=>{
    child.once('error',err=>{finished=true;clearTimeout(timer);reject(err);});
    child.once('exit',async code=>{finished=true;clearTimeout(timer);try{await Promise.all(writes);if(error)throw error;if(code!==0)fail('foundation_preview_build_failed');resolve();}catch(err){reject(err);}});
  });
  const ready=new Promise((resolve,reject)=>{child.once('message',value=>{if(value?.kind==='owned-preview-ready'&&value.mode===mode)resolve();else reject(Error('foundation_preview_process_invalid'));});child.once('exit',()=>reject(Error('foundation_preview_build_failed')));child.once('error',reject);});
  // A server lives until its owning operation's finally block, not until stdout EOF.
  done.catch(()=>{});ready.catch(()=>{});
  return {child,done,ready,get finished(){return finished;},close:()=>terminateOwned(child)};
}

export async function previewBuildDigest(checkout){
  const root=path.join(checkout,'dist'),entries=[];let size=0;
  async function visit(folder){
    const info=await lstat(folder);if(!info.isDirectory()||info.isSymbolicLink())fail('foundation_preview_build_changed');
    for(const entry of await readdir(folder,{withFileTypes:true})){
      const file=path.join(folder,entry.name),stat=await lstat(file);
      if(stat.isSymbolicLink())fail('foundation_preview_build_changed');
      if(stat.isDirectory())await visit(file);
      else{
        const bytes=await readArtifactBytes(file,32*1048576);size+=bytes.length;
        if(size>256*1048576||entries.length>=20000)fail('foundation_preview_build_limit');
        entries.push([path.relative(root,file).replaceAll('\\','/'),bytes.length,hash(bytes)]);
      }
    }
  }
  await visit(root);if(!entries.length)fail('foundation_preview_build_changed');
  entries.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
  return {sha256:digest(entries),files:entries.length,bytes:size};
}

export async function previewAdmission(file,pkg,packageSha256){
  const binding={schemaVersion:1,scope:'local-preview',testOnly:true,siteId:pkg.siteId,canonicalHost:pkg.canonicalHost,
    renderer:'niche',packageSha256,reviewer:'native-local-preview-producer'};
  let raw;
  try{raw=await readArtifactBytes(file,16384);}catch(error){if(error.code!=='ENOENT')throw error;
    const value={...binding,acceptedAt:new Date().toISOString()};raw=Buffer.from(JSON.stringify(value)+'\n');await writeFile(file,raw,{flag:'wx'});
  }
  const value=JSON.parse(raw),{acceptedAt,...actual}=value;
  if(stableV2(actual)!==stableV2(binding)||!Number.isFinite(Date.parse(acceptedAt))||Date.parse(acceptedAt)>Date.now())fail('foundation_preview_admission_changed');
  return hash(raw);
}

export async function previewImportedRelease(checkout,pkg,packageBytes,assetHashes,admissionFile){
  if(!/^creation-[a-f0-9]{32}$/.test(pkg.siteId))fail('foundation_preview_site_invalid');
  const folder=path.join(checkout,'content-packages',pkg.siteId);
  let imported;
  try{imported=await readArtifactBytes(path.join(folder,'content-package.json'),5*1048576);}catch(error){if(error.code==='ENOENT')return false;throw error;}
  await assertArtifactDirectories(checkout,path.join(folder,'assets'));
  if(!imported.equals(packageBytes)||!(await readArtifactBytes(path.join(folder,'activation.json'),16384)).equals(await readArtifactBytes(admissionFile,16384)))fail('foundation_preview_release_changed');
  for(const [name,expected]of Object.entries(assetHashes)){
    if(path.basename(name)!==name||!/^[a-zA-Z0-9._-]+\.(webp|avif)$/.test(name)||hash(await readArtifactBytes(path.join(folder,'assets',name),8*1048576))!==expected)fail('foundation_preview_release_changed');
  }
  return true;
}

export async function prepareCustomerSitePreview(context,scope,release){
  const publicCore=process.env.STUDIO_PUBLIC_CORE_DIR,source=scope.sources.public_source_revision;
  if(typeof publicCore!=='string')fail('foundation_preview_source_unavailable');
  const native=path.join(context.output,'releases',context.siteId,release.evidence.release_id);
  if(path.resolve(release.directory)!==native||context.siteId!==scope.accepted.site_id||context.siteId!=='creation-'+scope.creation_id.replaceAll('-','')
      ||context.directory!==path.join(context.root,'customer-content',scope.creation_id,'revision-'+scope.accepted.accepted_revision))fail('foundation_preview_scope_invalid');
  await assertArtifactDirectories(context.root,path.join(native,'assets'));
  await verifyContentRelease(native,validateV2Package);
  const packageBytes=await readArtifactBytes(path.join(native,'content-package.json'),5*1048576),pkg=JSON.parse(packageBytes);
  if(hash(packageBytes)!==release.evidence.package_sha256||pkg.siteId!==context.siteId||pkg.canonicalHost!==scope.accepted.canonical_host||pkg.site.renderer!=='niche')fail('foundation_preview_release_changed');
  await previewSource(publicCore,source);
  const scopeSha=digest(scope),parent=path.join(publicCore,'output/foundation-preview',scopeSha),checkout=path.join(parent,'repo');
  await safeDirectories(publicCore,parent);
  const lock=await open(path.join(parent,'operation.lock'),'wx');
  try{
    const owner={version:1,scopeSha256:scopeSha,packageSha256:release.evidence.package_sha256,releaseId:release.evidence.release_id,
      publicSourceRevision:source,nativeContextSha256:hash(context.directory)};
    const ownerFile=path.join(parent,'owner.json');
    try{await writeFile(ownerFile,JSON.stringify(owner)+'\n',{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;if(stableV2(JSON.parse(await readArtifactBytes(ownerFile,16384)))!==stableV2(owner))fail('foundation_preview_foreign_checkout');}
    try{await lstat(checkout);}catch(error){if(error.code!=='ENOENT')throw error;git(publicCore,['worktree','add','--detach',checkout,source]);}
    await previewSource(checkout,source);
    const dependencies=await previewDependencies(publicCore,checkout),link=path.join(checkout,'node_modules');
    try{const info=await lstat(link);if(!info.isSymbolicLink()||await realpath(link)!==await realpath(path.join(publicCore,'node_modules')))fail('foundation_preview_dependencies_changed');}
    catch(error){if(error.code!=='ENOENT')throw error;await symlink(path.join(publicCore,'node_modules'),link,process.platform==='win32'?'junction':'dir');}
    const buildRecord=path.join(parent,'build.json'),expected={...owner,dependencies};
    let saved=null;try{saved=JSON.parse(await readArtifactBytes(buildRecord,16384));}catch(error){if(error.code!=='ENOENT')throw error;}
    if(saved&&(stableV2(saved.binding)!==stableV2(expected)||stableV2(saved.build)!==stableV2(await previewBuildDigest(checkout))))fail('foundation_preview_build_changed');
    if(!saved){
      const admissionFile=path.join(parent,'local-admission.json');await previewAdmission(admissionFile,pkg,hash(packageBytes));
      const log=path.join(parent,'build.private.log');
      const imported=await previewImportedRelease(checkout,pkg,packageBytes,release.evidence.asset_sha256,admissionFile);
      for(const [mode,args]of [...(imported?[]:[['import',[native,admissionFile]]]),['compile',[]],['build',[]]]){
        const run=previewProcess(checkout,mode,args,pkg.siteId,log);try{await run.done;}finally{await run.close();}
        await previewSource(checkout,source);
      }
    }
    const admissions=JSON.parse(await readArtifactBytes(path.join(checkout,'lib/generated/content-admissions.json'),1048576)),bound=admissions[pkg.siteId];
    if(bound?.packageSha256!==hash(packageBytes)||bound?.buildSourceRevision!==source||bound?.scope!=='local-preview'||bound?.testOnly!==true)fail('foundation_preview_build_unbound');
    await readArtifactBytes(path.join(checkout,'dist/server/wrangler.json'),1048576);
    if(!saved)await writeFile(buildRecord,JSON.stringify({binding:expected,build:await previewBuildDigest(checkout)})+'\n',{flag:'wx'});
    if(stableV2(await previewDependencies(publicCore,checkout))!==stableV2(dependencies))fail('foundation_preview_dependencies_changed');
    await previewSource(publicCore,source);await previewSource(checkout,source);
    if(hash(await readArtifactBytes(path.join(native,'content-package.json'),5*1048576))!==hash(packageBytes))fail('foundation_preview_release_changed');
    return {checkout,parent,scopeSha256:scopeSha,packageSha256:hash(packageBytes),publicSourceRevision:source,siteId:pkg.siteId,releaseId:release.evidence.release_id,buildSha256:hash(await readArtifactBytes(buildRecord,16384))};
  }finally{await lock.close();await unlink(path.join(parent,'operation.lock'));}
}

export async function checkCustomerSitePreview(context,scope,release,buildSha256){
  const publicCore=process.env.STUDIO_PUBLIC_CORE_DIR,source=scope.sources.public_source_revision;
  if(typeof publicCore!=='string'||!/^[a-f0-9]{64}$/.test(buildSha256))fail('foundation_preview_build_changed');
  const scopeSha=digest(scope),parent=path.join(publicCore,'output/foundation-preview',scopeSha),checkout=path.join(parent,'repo');
  await assertArtifactDirectories(publicCore,checkout);await previewSource(publicCore,source);await previewSource(checkout,source);
  const owner={version:1,scopeSha256:scopeSha,packageSha256:release.evidence.package_sha256,releaseId:release.evidence.release_id,publicSourceRevision:source,nativeContextSha256:hash(context.directory)};
  if(stableV2(JSON.parse(await readArtifactBytes(path.join(parent,'owner.json'),16384)))!==stableV2(owner))fail('foundation_preview_foreign_checkout');
  const buildRaw=await readArtifactBytes(path.join(parent,'build.json'),16384);
  if(hash(buildRaw)!==buildSha256)fail('foundation_preview_build_changed');
  const expected={binding:{...owner,dependencies:await previewDependencies(publicCore,checkout)},build:await previewBuildDigest(checkout)};
  if(stableV2(JSON.parse(buildRaw))!==stableV2(expected))fail('foundation_preview_build_changed');
  const packageBytes=await readArtifactBytes(path.join(release.directory,'content-package.json'),5*1048576),pkg=JSON.parse(packageBytes);
  if(hash(packageBytes)!==release.evidence.package_sha256||!await previewImportedRelease(checkout,pkg,packageBytes,release.evidence.asset_sha256,path.join(parent,'local-admission.json')))fail('foundation_preview_release_changed');
  return {state:'retained-current',buildSha256};
}

async function availablePort(wanted=0){
  const server=createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(wanted,'127.0.0.1',resolve);});
  const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;
}

export async function previewRuntimeState(publicCore,owner){
  if(!/^[a-f0-9]{64}$/.test(owner.scopeSha256))fail('foundation_preview_scope_invalid');
  // Workerd's Windows SQLite/registry paths can exceed MAX_PATH inside a deep
  // checkout. Keep only owned local state shallow; source identity stays exact.
  const root=path.join(publicCore,'output/foundation-state',owner.scopeSha256.slice(0,16));
  await safeDirectories(publicCore,root);
  const marker=path.join(root,'owner.json');
  try{const bytes=await readArtifactBytes(marker,16384);if(stableV2(JSON.parse(bytes))!==stableV2(owner))fail('foundation_preview_foreign_state');}
  catch(error){if(error.code!=='ENOENT')throw error;if((await readdir(root)).length)fail('foundation_preview_foreign_state');await writeFile(marker,JSON.stringify(owner)+'\n',{flag:'wx'});}
  return root;
}

export async function withCustomerSitePreview(prepared,operation,retainedOrigin=null){
  await previewSource(prepared.checkout,prepared.publicSourceRevision);
  const saved=JSON.parse(await readArtifactBytes(path.join(prepared.parent,'build.json'),16384));
  if(hash(await readArtifactBytes(path.join(prepared.parent,'build.json'),16384))!==prepared.buildSha256||saved.binding.scopeSha256!==prepared.scopeSha256||saved.binding.packageSha256!==prepared.packageSha256
      ||stableV2(saved.build)!==stableV2(await previewBuildDigest(prepared.checkout)))fail('foundation_preview_build_changed');
  let wanted=0;
  if(retainedOrigin!==null){const url=new URL(retainedOrigin);if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||url.origin!==retainedOrigin)fail('foundation_preview_origin_invalid');wanted=Number(url.port);}
  const runtimeRoot=await previewRuntimeState(process.env.STUDIO_PUBLIC_CORE_DIR,saved.binding);
  const port=await availablePort(wanted),origin='http://127.0.0.1:'+port,run=previewProcess(prepared.checkout,'serve',[String(port),runtimeRoot],prepared.siteId,path.join(prepared.parent,'server.private.log'),150000);
  try{
    let ready=false;
    for(let attempt=0;attempt<40&&!run.finished;attempt++){
      try{const response=await requestCompletion(origin+'/',new URL(origin).host,{timeoutMs:500,maxBytes:1000000,probeOnly:true});
        ready=response.status===200&&response.headers.get('x-niche-package-sha256')===prepared.packageSha256&&response.headers.get('x-niche-source-revision')===prepared.publicSourceRevision;
      }catch{}
      if(ready)break;await new Promise(resolve=>setTimeout(resolve,250));
    }
    if(!ready)fail('foundation_preview_start_failed');
    const preview={version:2,scopeSha256:prepared.scopeSha256,packageSha256:prepared.packageSha256,releaseId:prepared.releaseId,
      publicSourceRevision:prepared.publicSourceRevision,origin,transportHost:'origin'};
    return await operation(preview);
  }finally{await run.close();}
}

// IPC disconnect guards survive a killed parent on Unix. On Windows the
// maintained studio additionally stops the entire owned process tree.
if(process.argv[2]==='--owned-runner'){
  const [root,mode,...args]=process.argv.slice(3);
  const entry={import:'scripts/import-content-package.mjs',compile:'scripts/compile-content-packages.mjs',build:'scripts/run-framework.mjs',serve:'node_modules/wrangler/bin/wrangler.js'}[mode];
  if(!entry||!process.connected||!path.isAbsolute(root)||path.resolve(git(root,['rev-parse','--show-toplevel']))!==path.resolve(root))process.exit(2);
  const stop=()=>{if(process.platform==='win32'){
    const killer=spawn(path.join(process.env.SYSTEMROOT,'System32/taskkill.exe'),['/PID',String(process.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
    killer.once('error',()=>process.exit(2));
  }else process.kill(-process.pid,'SIGKILL');};
  process.once('disconnect',stop);setTimeout(stop,150000).unref();
  process.send({kind:'owned-preview-ready',mode});
  process.channel.unref();
  const fixedArgs=mode==='import'?[args[0],'--acceptance',args[1]]:mode==='build'?['build']:mode==='serve'?['dev','--config','dist/server/wrangler.json','--local','--persist-to',args[1]?path.join(args[1],'state'):'.sites-runtime/preview-state','--ip','127.0.0.1','--port',args[0],'--inspector-port','0']:[];
  const file=path.join(root,entry);process.argv=[process.execPath,file,...fixedArgs];
  if(mode==='serve'){
    // Wrangler's CJS entry runs only as require.main; dynamic import silently
    // exits without starting a Worker. Keep it inside this guarded child tree.
    const server=spawn(process.execPath,['--import',pathToFileURL(path.join(root,'scripts/sites-env.mjs')).href,file,...fixedArgs],{cwd:root,env:process.env,windowsHide:true,stdio:'inherit'});
    process.exitCode=await new Promise((resolve,reject)=>{server.once('error',reject);server.once('exit',code=>resolve(code??2));});
  }else await import(pathToFileURL(file));
}
