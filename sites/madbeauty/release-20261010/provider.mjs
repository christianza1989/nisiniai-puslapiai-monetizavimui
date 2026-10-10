import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const out=path.resolve(import.meta.dirname,'../cloudflare/output/full-release-20261010'),phase=process.argv[2];
assert.ok(['qa-before','qa-after','main-before','main-predeploy','main-after'].includes(phase));await mkdir(out,{recursive:true});
const token=(await readFile('C:/Users/Lenovo/AppData/Roaming/xdg.config/.wrangler/config/default.toml','utf8')).match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];assert.ok(token);
const account='d102163f74a45ab6d33bca786ce281ec',names=['madbeauty-platform-preview','madbeauty-ui-acceptance-20261009'],records=[];
for(const name of names){
 const get=async suffix=>{const r=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/'+suffix,{headers:{Authorization:'Bearer '+token}}),v=await r.json();assert.ok(v.success,JSON.stringify({status:r.status,errors:v.errors}));return v.result;};
 records.push({name,settings:await get('scripts/'+name+'/settings'),deployments:await get('scripts/'+name+'/deployments')});
}
await writeFile(path.resolve(out,phase+'.private.json'),JSON.stringify({at:new Date().toISOString(),records},null,2));
if(phase==='qa-before')assert.equal(records[0].deployments.deployments[0].versions[0].version_id,'a492b36a-1f43-4ad3-ab5f-fb5b1c33ed22');
if(phase==='qa-after'){
 const before=JSON.parse(await readFile(path.resolve(out,'qa-before.private.json')));assert.deepEqual(records[0],before.records[0]);
 const bindings=r=>r.settings.bindings.filter(b=>b.type==='durable_object_namespace');assert.deepEqual(bindings(records[1]),bindings(before.records[1]));
 const secrets=r=>r.settings.bindings.filter(b=>b.type==='secret_text').map(b=>b.name).sort();assert.deepEqual(secrets(records[1]),secrets(before.records[1]));
}
if(['main-before','main-predeploy'].includes(phase))assert.equal(records[0].deployments.deployments[0].versions[0].version_id,'a492b36a-1f43-4ad3-ab5f-fb5b1c33ed22');
if(phase==='main-after'){
 const before=JSON.parse(await readFile(path.resolve(out,'main-predeploy.private.json'))),b=before.records[0].settings,a=records[0].settings;
 const byName=(v,n)=>v.bindings.find(x=>x.name===n);assert.deepEqual(byName(a,'PLATFORM'),byName(b,'PLATFORM'));
 for(const binding of b.bindings.filter(x=>x.type==='secret_text'||x.type==='plain_text'))assert.deepEqual(byName(a,binding.name),binding);
 assert.equal(byName(a,'RETENTION_POLICY_VERSION').text,'madbeauty-2026-10-10-v1');assert.equal(byName(a,'ORGANIZATION_STAGING').class_name,'MadbeautyOrganizationStaging');assert.notEqual(byName(a,'ORGANIZATION_STAGING').namespace_id,byName(a,'PLATFORM').namespace_id);
 assert.deepEqual(records[1],before.records[1]);
}
console.log(JSON.stringify({state:'PASS',phase,records:records.map(r=>({name:r.name,active:r.deployments.deployments[0].versions,bindings:r.settings.bindings.map(b=>({name:b.name,type:b.type,namespaceId:b.namespace_id,className:b.class_name}))}))}));
