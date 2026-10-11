import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes,createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import path from 'node:path';
import {core,repo} from '../release-20261010/pinned-core.mjs';

// Explicit, sequential phases. No Meta permissions, app secret, or existing Worker mutations.
const phase=process.argv[2];
assert.ok(['before','session-secret','deploy','after'].includes(phase));
const dir=path.join(repo,'sites/madbeauty/cloudflare/output/community-20261011/review');
const account='d102163f74a45ab6d33bca786ce281ec',name='madbeauty-meta-review-20261011',hostname='perziura.madbeauty.lt';
const json=async file=>JSON.parse(await readFile(path.join(dir,file),'utf8'));
const save=async(file,value)=>writeFile(path.join(dir,file),JSON.stringify(value,null,2)+'\n');
const config=await json('wrangler.json'),manifest=await json('manifest.json'),native=await json('native.json');
assert.equal(config.name,name);assert.equal(config.account_id,account);assert.equal(config.vars.APP_ORIGIN,'https://'+hostname);
assert.equal(config.vars.FACEBOOK_LOGIN_ENABLED,'false');assert.equal(config.vars.TRIAL_EXPIRES_AT,'2027-10-12T00:00:00.000Z');
assert.deepEqual(config.routes,[{pattern:hostname,custom_domain:true}]);
assert.equal(config.images.binding,'IMAGES');assert.equal(config.workers_dev,false);assert.equal(config.preview_urls,false);
assert.equal(native.state,'PASS');assert.equal(native.artifactSha256,manifest.artifactSha256);
assert.equal(createHash('sha256').update(await readFile(path.join(dir,'worker.mjs'))).digest('hex'),manifest.artifactSha256);
assert.equal(execFileSync('git',['diff','--name-only',manifest.sourceCommit,'--','sites/madbeauty/backend','sites/madbeauty/cloudflare','sites/madbeauty/prototype','sites/madbeauty/trial-20261010','sites/madbeauty/community-20261011/review-build.mjs','sites/madbeauty/community-20261011/review-release.mjs'],{cwd:repo,encoding:'utf8'}).trim(),'','Candidate source changed');
assert.ok(config.durable_objects.bindings.every(b=>!b.namespace_id&&!b.script_name));
const token=(await readFile('C:/Users/Lenovo/AppData/Roaming/xdg.config/.wrangler/config/default.toml','utf8')).match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];assert.ok(token);
async function api(suffix,options={},absent=false){
 const response=await fetch('https://api.cloudflare.com/client/v4/'+suffix,{...options,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'}}),value=await response.json();
 if(absent&&response.status===404&&value.errors?.some(e=>e.code===10007))return null;
 assert.ok(value.success,'Provider request failed ('+response.status+'); inspect before any retry');return value.result;
}
const workers='accounts/'+account+'/workers/';
const settings=()=>api(workers+'scripts/'+name+'/settings',{},true);
const protectedNames=['madbeauty-platform-preview','madbeauty-ui-acceptance-20261009','madbeauty-temporary-test-20261010'];
async function protectedSnapshot(){
 const records=[];for(const n of protectedNames)records.push({name:n,settings:await api(workers+'scripts/'+n+'/settings'),deployments:await api(workers+'scripts/'+n+'/deployments')});return records;
}
async function freeHost(){
 const domains=await api(workers+'domains');assert.ok(!domains.some(d=>d.hostname===hostname),'Review hostname already assigned');
 const zones=await api('zones?name=madbeauty.lt&account.id='+account);assert.equal(zones.length,1);assert.equal(zones[0].status,'active');
 // Wrangler OAuth can read Workers/zones but lacks DNS Read. Use a fresh scoped
 // readback from the already-authorized Cloudflare connector; never widen OAuth.
 const proof=await json('dns-preflight.private.json');
 assert.equal(proof.source,'Cloudflare connector GET /zones/{zone_id}/dns_records');
 assert.equal(proof.account,account);assert.equal(proof.zoneId,zones[0].id);assert.equal(proof.hostname,hostname);
 assert.equal(proof.status,200);assert.deepEqual(proof.records,[]);
 const age=Date.now()-Date.parse(proof.at);assert.ok(age>=0&&age<=120_000,'Refresh scoped DNS readback before this phase');
 return {zoneId:zones[0].id,hostname,dns:proof.records,domains};
}
async function cli(args,input,label){
 const child=spawn(process.execPath,[path.join(core,'node_modules/wrangler/bin/wrangler.js'),...args,'--config',path.join(dir,'wrangler.json')],{cwd:repo,stdio:['pipe','pipe','pipe']});let log='';
 child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);child.stdin.end(input||'');
 const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});
 await writeFile(path.join(dir,label+'.private.log'),log);assert.equal(code,0,'Provider write outcome uncertain; read provider state before retry');return log;
}
if(phase==='before'){
 assert.equal(await settings(),null,'New review Worker already exists');
 const records=await protectedSnapshot(),host=await freeHost();
 const receipt=JSON.parse(await readFile(path.join(repo,'sites/madbeauty/community-20261011/RECEIPT.json')));
 assert.equal(records[0].deployments.deployments[0].versions[0].version_id,receipt.editions.main.version);
 assert.equal(records[2].deployments.deployments[0].versions[0].version_id,receipt.editions.trial.version);
 await save('before.private.json',{at:new Date().toISOString(),records,host});
 console.log(JSON.stringify({state:'BEFORE_CAPTURED',workerAbsent:true,hostnameFree:true,protectedWorkers:records.length}));
}
if(phase==='session-secret'){
 const before=await json('before.private.json');assert.deepEqual(await protectedSnapshot(),before.records,'Protected Worker lease changed');assert.equal(await settings(),null,'Session secret already provisioned or Worker exists');assert.deepEqual(await freeHost(),before.host);
 const secret=randomBytes(48).toString('base64url');await save('session-secret.private.json',{secret});
 await cli(['secret','put','SESSION_SECRET'],secret+'\n','session-secret');
 const actual=await settings();assert.ok(actual.bindings.some(b=>b.type==='secret_text'&&b.name==='SESSION_SECRET'));
 assert.deepEqual(await protectedSnapshot(),before.records);assert.deepEqual(await freeHost(),before.host);
 await save('secret-state.private.json',{at:new Date().toISOString(),settings:actual});
 console.log(JSON.stringify({state:'SESSION_SECRET_INSTALLED',name:'SESSION_SECRET',existingWorkersUnchanged:true}));
}
if(phase==='deploy'){
 const before=await json('before.private.json'),secret=await json('secret-state.private.json');
 assert.deepEqual(await protectedSnapshot(),before.records,'Protected Worker lease changed');assert.deepEqual(await settings(),secret.settings,'Review Worker lease changed');assert.deepEqual(await freeHost(),before.host);
 const log=await cli(['deploy','--keep-vars','--message','Isolated Meta review environment; Facebook disabled; preserve main and original trial expiry'],null,'deploy');
 const version=log.match(/Current Version ID: ([a-f0-9-]{36})/)?.[1];assert.ok(version,'Read provider deployment outcome before retry');
 await save('deployment.json',{...manifest,at:new Date().toISOString(),state:'DEPLOYED_ACCEPTANCE_PENDING',version});
 const actual=await settings(),observability={...actual.observability,redact_query_string:true};
 if(!actual.observability?.redact_query_string)await api(workers+'scripts/'+name+'/script-settings',{method:'PATCH',body:JSON.stringify({observability})});
 assert.deepEqual((await settings()).observability,observability);
 console.log(JSON.stringify({state:'DEPLOYED_ACCEPTANCE_PENDING',version,facebookEnabled:false,queryRedaction:true}));
}
if(phase==='after'){
 const before=await json('before.private.json'),deployment=await json('deployment.json'),actual=await settings(),versions=await api(workers+'scripts/'+name+'/deployments');
 assert.equal(versions.deployments[0].versions[0].version_id,deployment.version);assert.deepEqual(await protectedSnapshot(),before.records,'Existing workers changed');
 const names=new Set(['ASSETS','IMAGES','PLATFORM','COMMUNITY','SESSION_SECRET',...Object.keys(config.vars)]);assert.equal(actual.bindings.length,names.size);assert.ok(actual.bindings.every(b=>names.has(b.name)));
 for(const [key,value] of Object.entries(config.vars))assert.equal(actual.bindings.find(b=>b.name===key)?.text,value);
 assert.ok(actual.observability.redact_query_string);assert.equal(actual.compatibility_date,config.compatibility_date);assert.deepEqual(actual.compatibility_flags,config.compatibility_flags);
 const namespaces=actual.bindings.filter(b=>b.type==='durable_object_namespace');assert.equal(namespaces.length,2);assert.notEqual(namespaces[0].namespace_id,namespaces[1].namespace_id);
 const existing=before.records.flatMap(r=>r.settings.bindings.filter(b=>b.type==='durable_object_namespace').map(b=>b.namespace_id));assert.ok(namespaces.every(b=>!existing.includes(b.namespace_id)));
 const domain=(await api(workers+'domains')).find(d=>d.hostname===hostname);assert.ok(domain);assert.equal(domain.service,name);
 await save('after.private.json',{at:new Date().toISOString(),settings:actual,deployments:versions,domain});
 await save('provider.json',{state:'PASS',at:new Date().toISOString(),version:deployment.version,origin:config.vars.APP_ORIGIN,artifactSha256:manifest.artifactSha256,facebookEnabled:false,queryRedaction:true,protectedWorkersUnchanged:true,isolatedNamespaces:namespaces.map(b=>({name:b.name,id:b.namespace_id})),secrets:['SESSION_SECRET']});
 console.log(JSON.stringify({state:'PASS',version:deployment.version,protectedWorkersUnchanged:true,isolatedNamespaces:true,queryRedaction:true}));
}
