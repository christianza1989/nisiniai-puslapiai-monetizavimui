import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,cp,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {core,coreSource,pinCore} from '../release-20261010/pinned-core.mjs';
export const repo=path.resolve(import.meta.dirname,'../../..'),out=path.join(repo,'sites/madbeauty/cloudflare/output/footer-credit-20261011');
const phase=process.argv[2],kind=process.argv[3]||'main',index=kind==='trial'?2:0;
assert.ok(['before','build','deploy','after'].includes(phase));assert.ok(['main','trial'].includes(kind));
await mkdir(path.join(out,kind),{recursive:true});
const dir=path.join(out,kind),hash=b=>createHash('sha256').update(b).digest('hex'),json=async f=>JSON.parse(await readFile(f,'utf8'));
async function provider(){
 const token=(await readFile('C:/Users/Lenovo/AppData/Roaming/xdg.config/.wrangler/config/default.toml','utf8')).match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];assert.ok(token);
 const records=[];
 for(const name of ['madbeauty-platform-preview','madbeauty-ui-acceptance-20261009','madbeauty-temporary-test-20261010']){
  const get=async suffix=>{const r=await fetch('https://api.cloudflare.com/client/v4/accounts/d102163f74a45ab6d33bca786ce281ec/workers/'+suffix,{headers:{Authorization:'Bearer '+token}}),v=await r.json();assert.ok(v.success,'Provider status '+r.status);return v.result;};
  records.push({name,settings:await get('scripts/'+name+'/settings'),deployments:await get('scripts/'+name+'/deployments')});
 }return records;
}
const clean=commit=>assert.equal(execFileSync('git',['diff','--name-only',commit,'--','sites/madbeauty/prototype','sites/madbeauty/cloudflare','sites/madbeauty/content','sites/madbeauty/backend','sites/madbeauty/trial-20261010/worker.mjs'],{cwd:repo,encoding:'utf8'}).trim(),'','Runtime source must stay committed');
if(phase==='before'){
 const records=await provider(),expected=kind==='main'?'a3e1e766-e1d7-48e6-a20f-e431e7171773':'de570fb1-4b49-4ab0-b98c-0757ae72d17e';assert.equal(records[index].deployments.deployments[0].versions[0].version_id,expected);
 await writeFile(path.join(dir,'before.private.json'),JSON.stringify({at:new Date().toISOString(),records},null,2));console.log(JSON.stringify({state:'BEFORE_CAPTURED',kind,version:expected}));
}
if(phase==='build'){
 const before=await json(path.join(dir,'before.private.json')),baseline=before.records[index].settings;
 const release=await json(path.join(repo,'sites/madbeauty/cloudflare/output/content-release-receipt.json'));assert.equal(release.packageSha256,'e20c3b95b57ae9f813e55ffd0ef46688a937a7d63fe1c70246a92b8a71e71953');assert.equal(release.approvedPages.length,129);
 let config,entry,plugins=[pinCore],mediaProof=[];
 if(kind==='main'){
  config=await json(path.join(repo,'sites/madbeauty/cloudflare/wrangler.production.json'));entry=path.join(repo,'sites/madbeauty/cloudflare/worker.mjs');
  await cp(path.join(repo,'sites/madbeauty/cloudflare/output/assets-release'),path.join(dir,'assets'),{recursive:true});
 }else{
  const vars=Object.fromEntries(baseline.bindings.filter(b=>b.type==='plain_text').map(b=>[b.name,b.text]));assert.equal(vars.TRIAL_EXPIRES_AT,'2026-10-16T21:10:47.982Z');
  assert.equal(baseline.bindings.find(b=>b.name==='PLATFORM').namespace_id,'a07857f7b8414eb789f3ff639953ff1b');assert.ok(baseline.bindings.some(b=>b.name==='SESSION_SECRET'&&b.type==='secret_text'));
  config={name:before.records[index].name,account_id:'d102163f74a45ab6d33bca786ce281ec',compatibility_date:baseline.compatibility_date,compatibility_flags:baseline.compatibility_flags,workers_dev:false,preview_urls:false,routes:[{pattern:'bandymas.madbeauty.lt',custom_domain:true}],assets:{binding:'ASSETS',run_worker_first:true},durable_objects:{bindings:[{name:'PLATFORM',class_name:'TemporaryTestPlatform'}]},migrations:[{tag:'trial-v1',new_sqlite_classes:['TemporaryTestPlatform']}],vars};
  if(baseline.bindings.some(b=>b.type==='images'))config.images={binding:baseline.bindings.find(b=>b.type==='images').name};
  const allowed=new Set(['plain_text','secret_text','assets','durable_object_namespace','images']);assert.ok(baseline.bindings.every(b=>allowed.has(b.type)),'Unmodelled trial binding');
  const publicRoot=path.join(repo,'sites/madbeauty/prototype/public'),appMedia=await json(path.join(publicRoot,'app-media.json')),categories=await json(path.join(publicRoot,'media.json'));
  await cp(path.join(repo,'sites/madbeauty/cloudflare/output/assets-release'),path.join(dir,'assets'),{recursive:true});
  const paths=new Set(await json(path.join(repo,'sites/madbeauty/cloudflare/output/asset-paths.json'))),project=assets=>({assets:assets.map(({id,alt,variants})=>({id,alt,variants}))});
  await writeFile(path.join(dir,'trial-media.json'),JSON.stringify(project([...appMedia.assets,...categories.assets])));await writeFile(path.join(dir,'assets/app-media.json'),JSON.stringify(project(appMedia.assets)));
  for(const asset of appMedia.assets)for(const v of asset.variants){assert.match(v.file,/^images\/[a-z0-9-]+\.webp$/);const bytes=await readFile(path.join(publicRoot,v.file));assert.equal(hash(bytes),v.sha256);assert.equal(bytes.length,v.bytes);await copyFile(path.join(publicRoot,v.file),path.join(dir,'assets',v.file));paths.add('/'+v.file);mediaProof.push({path:'/'+v.file,sha256:v.sha256,bytes:v.bytes});}
  await writeFile(path.join(dir,'trial-assets.json'),JSON.stringify([...paths].sort()));
  plugins=[{name:'trial-build-inputs',setup(b){b.onResolve({filter:/\.\/output\/trial-(assets|media)\.json$/},a=>({path:path.join(dir,path.basename(a.path))}));}},pinCore];entry=path.join(repo,'sites/madbeauty/trial-20261010/worker.mjs');
 }
 assert.equal(config.compatibility_date,baseline.compatibility_date);assert.deepEqual(config.compatibility_flags,baseline.compatibility_flags);for(const b of baseline.bindings.filter(b=>b.type==='plain_text'))assert.equal(config.vars[b.name],b.text);
 config.main='worker.mjs';config.no_bundle=true;config.keep_vars=true;delete config.$schema;config.assets.directory='./assets';config.observability=baseline.observability;
 const {build}=await import(pathToFileURL(path.join(core,'node_modules/esbuild/lib/main.js'))),bundle=await build({entryPoints:[entry],write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text','.html':'text'},plugins}),bytes=bundle.outputFiles[0].contents;
 if(kind==='main')for(const marker of ['ACCEPTANCE_KEY','HostedSource','qa_mail_captures','NATIVE_CONTENT_CLOCK'])assert.ok(!bundle.outputFiles[0].text.includes(marker));
 const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();clean(sourceCommit);
 await writeFile(path.join(dir,'worker.mjs'),bytes);await writeFile(path.join(dir,'wrangler.json'),JSON.stringify(config,null,2));
 await writeFile(path.join(dir,'manifest.json'),JSON.stringify({kind,sourceCommit,coreSource,artifactSha256:hash(bytes),packageSha256:release.packageSha256,pages:129,assets:kind==='main'?release.assets:(await json(path.join(dir,'trial-assets.json'))).length,expiresAt:config.vars.TRIAL_EXPIRES_AT||null,mediaProof,previousVersion:before.records[index].deployments.deployments[0].versions[0].version_id},null,2));console.log(JSON.stringify({state:'BUILT',kind,sourceCommit,artifactSha256:hash(bytes)}));
}
if(phase==='deploy'){
 const manifest=await json(path.join(dir,'manifest.json')),proof=await json(path.join(dir,'native.json'));assert.equal(proof.state,'PASS');assert.equal(proof.artifactSha256,manifest.artifactSha256);assert.equal(hash(await readFile(path.join(dir,'worker.mjs'))),manifest.artifactSha256);clean(manifest.sourceCommit);
 const before=await json(path.join(dir,'before.private.json'));assert.deepEqual(await provider(),before.records,'Deployment lease changed');
 const child=spawn(process.execPath,[path.join(core,'node_modules/wrangler/bin/wrangler.js'),'deploy','--config',path.join(dir,'wrangler.json'),'--keep-vars','--message','Madbeauty footer verslomatika.lt follow link; preserve all data and settings'],{cwd:repo,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});await writeFile(path.join(dir,'deploy.txt'),output);assert.equal(code,0,'Inspect deploy log before retrying');
 const version=output.match(/Current Version ID: ([a-f0-9-]{36})/)?.[1];assert.ok(version);await writeFile(path.join(dir,'deployment.json'),JSON.stringify({at:new Date().toISOString(),state:'DEPLOYED_ACCEPTANCE_PENDING',version,...manifest},null,2));console.log(JSON.stringify({state:'DEPLOYED_ACCEPTANCE_PENDING',kind,version}));
}
if(phase==='after'){
 const before=await json(path.join(dir,'before.private.json')),records=await provider(),d=await json(path.join(dir,'deployment.json'));assert.equal(records[index].deployments.deployments[0].versions[0].version_id,d.version);assert.deepEqual(records[index].settings.bindings,before.records[index].settings.bindings);assert.deepEqual(records[index].settings.observability,before.records[index].settings.observability);
 for(let i=0;i<records.length;i++)if(i!==index)assert.deepEqual(records[i],before.records[i],'Other worker unchanged');await writeFile(path.join(dir,'after.private.json'),JSON.stringify({at:new Date().toISOString(),records},null,2));console.log(JSON.stringify({state:'PASS',kind,version:d.version,allBindingsPreserved:true,otherWorkersUnchanged:true}));
}
