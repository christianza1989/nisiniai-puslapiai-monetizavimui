import assert from 'node:assert/strict';
import {readFile,writeFile,readdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import path from 'node:path';
import {core,repo} from '../release-20261010/pinned-core.mjs';

// Updates three browser modules on the existing isolated reviewer only.
// Does not rebuild the Worker, provision namespaces/secrets, or activate Facebook.
const phase=process.argv[2];assert.ok(['prepare','before','deploy','after','after-connector'].includes(phase));
const dir=path.join(repo,'sites/madbeauty/cloudflare/output/community-20261011/review');
const accepted=path.join(repo,'sites/madbeauty/cloudflare/output/community-20261011/trial/assets');
const files=['account-ui.mjs','auth-entry.mjs','http-adapter.mjs'];
const name='madbeauty-meta-review-20261011',account='d102163f74a45ab6d33bca786ce281ec',hostname='perziura.madbeauty.lt';
const json=async f=>JSON.parse(await readFile(path.join(dir,f),'utf8'));
const save=async(f,v)=>writeFile(path.join(dir,f),JSON.stringify(v,null,2)+'\n');
const hash=b=>createHash('sha256').update(b).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8'}).trim();
const config=await json('wrangler.json'),manifest=await json('manifest.json'),native=await json('native.json');
assert.equal(config.name,name);assert.equal(config.account_id,account);assert.equal(config.vars.APP_ORIGIN,'https://'+hostname);
assert.equal(config.vars.FACEBOOK_LOGIN_ENABLED,'false');assert.equal(config.vars.COMMUNITY_ENABLED,'true');
assert.equal(config.vars.TRIAL_EXPIRES_AT,'2027-10-12T00:00:00.000Z');
assert.deepEqual(config.routes,[{pattern:hostname,custom_domain:true}]);assert.equal(config.keep_vars,true);
assert.equal(config.assets.directory,'./assets');assert.equal(config.workers_dev,false);assert.equal(config.preview_urls,false);
assert.equal(hash(await readFile(path.join(dir,'worker.mjs'))),manifest.artifactSha256);
assert.equal(native.state,'PASS');assert.equal(native.artifactSha256,manifest.artifactSha256);
assert.equal(git('diff','--name-only',manifest.sourceCommit,'--','sites/madbeauty/backend','sites/madbeauty/cloudflare','sites/madbeauty/trial-20261010'),'','Accepted Worker sources changed');
async function assetHashes(folder){
 const result={};async function walk(rel=''){for(const entry of await readdir(path.join(folder,rel),{withFileTypes:true})){const key=path.posix.join(rel,entry.name);if(entry.isDirectory())await walk(key);else result[key]=hash(await readFile(path.join(folder,key)));}}await walk();return result;
}
if(phase==='prepare'){
 assert.equal(git('diff','--name-only','HEAD','--',...files.map(f=>'sites/madbeauty/prototype/public/'+f)),'','Commit reviewed browser source first');
 const baseline=await assetHashes(accepted),previous=await assetHashes(path.join(dir,'assets'));
 assert.deepEqual(previous,baseline,'Unexpected previous reviewer asset delta');
 for(const f of files)await copyFile(path.join(repo,'sites/madbeauty/prototype/public',f),path.join(dir,'assets',f));
 const hashes=await assetHashes(path.join(dir,'assets')),changed=Object.keys(hashes).filter(f=>hashes[f]!==baseline[f]).sort();
 assert.deepEqual(Object.keys(hashes).sort(),Object.keys(baseline).sort());assert.deepEqual(changed,[...files].sort());
 await save('auth-update.json',{state:'LOCAL_FRONTEND_CANDIDATE',sourceCommit:git('rev-parse','HEAD'),at:new Date().toISOString(),origin:config.vars.APP_ORIGIN,workerArtifactSha256:manifest.artifactSha256,files:changed,hashes,baselineHashes:baseline,acceptance:{state:'UNVERIFIED'}});
 console.log(JSON.stringify({state:'LOCAL_FRONTEND_CANDIDATE',changed,workerUnchanged:true}));
 process.exit(0);
}
const candidate=await json('auth-update.json');
assert.equal(candidate.workerArtifactSha256,manifest.artifactSha256);
assert.deepEqual(await assetHashes(path.join(dir,'assets')),candidate.hashes);
for(const f of files)assert.equal(hash(await readFile(path.join(repo,'sites/madbeauty/prototype/public',f))),candidate.hashes[f],'Source changed after preparation');
const token=(await readFile('C:/Users/Lenovo/AppData/Roaming/xdg.config/.wrangler/config/default.toml','utf8')).match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];assert.ok(token);
async function api(suffix,options={}){const r=await fetch('https://api.cloudflare.com/client/v4/'+suffix,{...options,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'}}),v=await r.json();assert.ok(v.success,'Provider request failed ('+r.status+'); inspect before retry');return v.result;}
const workers='accounts/'+account+'/workers/';
const settings=()=>api(workers+'scripts/'+name+'/settings');
async function snapshot(){
 const protectedWorkers=[];for(const n of ['madbeauty-platform-preview','madbeauty-ui-acceptance-20261009','madbeauty-temporary-test-20261010'])protectedWorkers.push({name:n,settings:await api(workers+'scripts/'+n+'/settings'),deployments:await api(workers+'scripts/'+n+'/deployments')});
 const domain=(await api(workers+'domains')).find(d=>d.hostname===hostname);assert.equal(domain?.service,name);
 return {review:{settings:await settings(),deployments:await api(workers+'scripts/'+name+'/deployments')},protectedWorkers,domain};
}
if(phase==='before'){
 const lease=await snapshot(),deployment=await json('deployment.json');assert.equal(lease.review.deployments.deployments[0].versions[0].version_id,deployment.version);assert.ok(lease.review.settings.observability.redact_query_string);
 const tests=execFileSync(process.execPath,['--test','sites/madbeauty/prototype/http-adapter.test.mjs','sites/madbeauty/auth-social-20261011/auth-invite.test.mjs','sites/madbeauty/prototype/account-state.test.mjs'],{cwd:repo,encoding:'utf8'});assert.match(tests,/(?:pass 19|tests 19)/);assert.match(tests,/fail 0/);
 await writeFile(path.join(dir,'auth-update-tests.log'),tests);
 await save('auth-update-before.private.json',lease);
 await save('auth-update.json',{...candidate,state:'PREFLIGHT_PASS',acceptance:{state:'LOCAL_PASS',tests:19,workerNativeArtifactUnchanged:true}});
 console.log(JSON.stringify({state:'PREFLIGHT_PASS',tests:19,previousVersion:deployment.version,protectedWorkers:lease.protectedWorkers.length}));
}
if(phase==='deploy'){
 assert.equal(candidate.state,'PREFLIGHT_PASS');const before=await json('auth-update-before.private.json');assert.deepEqual(await snapshot(),before,'Deployment lease changed');
 const child=spawn(process.execPath,[path.join(core,'node_modules/wrangler/bin/wrangler.js'),'deploy','--keep-vars','--config',path.join(dir,'wrangler.json'),'--message','Reviewer browser auth session confirmation; three modules only'],{cwd:repo,stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});await writeFile(path.join(dir,'auth-update-deploy.private.log'),log);assert.equal(code,0,'Write outcome uncertain; inspect provider before retry');
 const version=log.match(/Current Version ID: ([a-f0-9-]{36})/)?.[1];assert.ok(version,'Read provider deployment outcome before retry');
 await save('auth-update.json',{...candidate,state:'DEPLOYED_ACCEPTANCE_PENDING',version,previousVersion:before.review.deployments.deployments[0].versions[0].version_id,at:new Date().toISOString()});
 const actual=await settings();if(!actual.observability.redact_query_string)await api(workers+'scripts/'+name+'/script-settings',{method:'PATCH',body:JSON.stringify({observability:before.review.settings.observability})});
 console.log(JSON.stringify({state:'DEPLOYED_ACCEPTANCE_PENDING',version,workerUnchanged:true}));
}
if(phase==='after'||phase==='after-connector'){
 assert.equal(candidate.state,'DEPLOYED_ACCEPTANCE_PENDING');const before=await json('auth-update-before.private.json');let after;
 if(phase==='after-connector'){
  // Existing CLI OAuth expired after upload. This is a read-only bridge through
  // the already-authorized connector, not a credential or privilege change.
  const proof=await json('auth-update-after-connector.private.json');assert.equal(proof.source,'Cloudflare connector scoped GET settings/deployments/domains');assert.equal(proof.account,account);const age=Date.now()-Date.parse(proof.at);assert.ok(age>=0&&age<=120_000,'Refresh connector readback');after=proof.readback;
 }else after=await snapshot();
 assert.deepEqual(after.protectedWorkers,before.protectedWorkers);assert.deepEqual(after.domain,before.domain);
 const normalize=s=>({bindings:s.bindings.filter(b=>b.name!=='ASSETS').sort((a,b)=>a.name.localeCompare(b.name)),compatibility_date:s.compatibility_date,compatibility_flags:s.compatibility_flags,observability:s.observability,limits:s.limits});
 assert.deepEqual(normalize(after.review.settings),normalize(before.review.settings),'Reviewer settings changed');
 assert.equal(after.review.deployments.deployments[0].versions[0].version_id,candidate.version);
 for(const f of files){const r=await fetch(config.vars.APP_ORIGIN+'/'+f);assert.equal(r.status,200);assert.equal(hash(Buffer.from(await r.arrayBuffer())),candidate.hashes[f]);}
 await save('auth-update-after.private.json',after);
 await save('auth-update.json',{...candidate,state:'HOSTED_MODULES_PASS_BROWSER_PENDING',providerPreservation:true,hostedModuleHashes:true});
 console.log(JSON.stringify({state:'HOSTED_MODULES_PASS_BROWSER_PENDING',version:candidate.version,protectedWorkersUnchanged:true,reviewNamespacesSecretsVarsPreserved:true}));
}
