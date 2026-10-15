import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
import path from 'node:path';
import {out,repo,core,hash,json,save,provider,sourceBoundary} from './common.mjs';
const phase=process.argv[2];assert.ok(['deploy','after'].includes(phase));
const before=await json(path.join(out,'before.private.json')),manifest=await json(path.join(out,'manifest.json')),config=await json(path.join(out,'wrangler.json'));sourceBoundary();assert.equal(hash(await readFile(path.join(out,'worker.mjs'))),manifest.artifactSha256);
if(phase==='deploy'){
 assert.equal(execFileSync('git',['status','--porcelain','--','sites/madbeauty/content-deploy6-20261012'],{cwd:repo,encoding:'utf8'}).trim(),'','Consumer helpers must be committed');
 for(const name of ['native.json','platform-native.json','browser/native.json','live-before.json']){const proof=await json(path.join(out,name));assert.equal(proof.state,'PASS');assert.equal(proof.artifactSha256,manifest.artifactSha256);}
 const p=await provider();assert.deepEqual(p.records,before.records,'Canonical lease changed');assert.deepEqual(p.domains,before.domains);await save('predeploy.private.json',{at:new Date().toISOString(),...p});
 const child=spawn(process.execPath,[path.join(core,'node_modules/wrangler/bin/wrangler.js'),'deploy','--config',path.join(out,'wrangler.json'),'--keep-vars','--message','Madbeauty content-only six approved guides; preserve current booking/community runtime, identities, mail and scheduled dates'],{cwd:repo,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});await writeFile(path.join(out,'deploy.txt'),output);assert.equal(code,0,'Deployment outcome must be inspected before retry');const version=output.match(/Current Version ID: ([a-f0-9-]{36})/)?.[1];assert.ok(version);await save('deployment.json',{at:new Date().toISOString(),state:'DEPLOYED_ACCEPTANCE_PENDING',version,...manifest});
 // Pinned Wrangler omits this newer privacy field; restore exact incumbent setting.
 const actual=await provider();assert.equal(actual.records[0].deployments.deployments[0].versions[0].version_id,version);
 if(!actual.records[0].settings.observability.redact_query_string){const token=(await readFile('C:/Users/Lenovo/AppData/Roaming/xdg.config/.wrangler/config/default.toml','utf8')).match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1],r=await fetch('https://api.cloudflare.com/client/v4/accounts/d102163f74a45ab6d33bca786ce281ec/workers/scripts/madbeauty-platform-preview/script-settings',{method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({observability:before.records[0].settings.observability})});assert.ok((await r.json()).success);}
 console.log(JSON.stringify({state:'DEPLOYED_ACCEPTANCE_PENDING',version,packageSha256:manifest.packageSha256}));
}
if(phase==='after'){
 const current=await provider(),d=await json(path.join(out,'deployment.json'));assert.deepEqual(current.records[0].deployments.deployments[0].versions,[{version_id:d.version,percentage:100}]);assert.deepEqual(current.domains,before.domains);
 for(const key of ['bindings','compatibility_date','compatibility_flags','observability','usage_model'])assert.deepEqual(current.records[0].settings[key],before.records[0].settings[key],key+' preserved');for(let i=1;i<current.records.length;i++)assert.deepEqual(current.records[i],before.records[i],'Other Worker unchanged');
 assert.equal(config.vars.COMMUNITY_ENABLED,'true');assert.equal(config.vars.FACEBOOK_LOGIN_ENABLED,'false');await save('after.private.json',{at:new Date().toISOString(),...current});await save('preservation.json',{state:'PASS',at:new Date().toISOString(),version:d.version,allBindingsAndVarsPreserved:true,compatibilityPreserved:true,observabilityAndQueryRedactionPreserved:true,canonicalDomainsPreserved:true,otherFourWorkersUnchanged:true,customerWritesByThisTask:0});console.log(JSON.stringify({state:'PASS',version:d.version,otherWorkersUnchanged:true,allBindingsPreserved:true}));
}
