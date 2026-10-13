import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const phase=process.argv[2];assert.ok(['before','after'].includes(phase));
const account='d102163f74a45ab6d33bca786ce281ec',trial='madbeauty-temporary-test-20261010';
const toml=await readFile('C:/Users/Lenovo/AppData/Roaming/xdg.config/.wrangler/config/default.toml','utf8');
const token=toml.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];assert.ok(token,'Existing provider session required');
async function get(endpoint,allowMissing=false){const r=await fetch('https://api.cloudflare.com/client/v4'+endpoint,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(20000)});const j=await r.json();if(allowMissing&&r.status===404)return null;assert.ok(j.success,endpoint+' '+r.status+' '+JSON.stringify(j.errors?.map(e=>({code:e.code,message:e.message}))));return j.result;}
const base='/accounts/'+account+'/workers/scripts/';
const settings=await get(base+'madbeauty-platform-preview/settings');
const deployments=await get(base+'madbeauty-platform-preview/deployments');
const zones=await get('/zones?name=madbeauty.lt');assert.equal(zones.length,1);assert.equal(zones[0].account.id,account);
// This OAuth session has Workers Routes, not DNS Records read permission.
// Observe existing public site/mail DNS; do not claim a full DNS-zone inventory.
async function publicDns(name,type){const r=await fetch('https://cloudflare-dns.com/dns-query?'+new URLSearchParams({name,type}),{headers:{Accept:'application/dns-json'},signal:AbortSignal.timeout(20000)});assert.equal(r.status,200);const j=await r.json();return {name,type,status:j.Status,answers:(j.Answer||[]).map(({name,type,data})=>({name,type,data})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))};}
const dns=await Promise.all([['madbeauty.lt','A'],['www.madbeauty.lt','A'],['madbeauty.lt','MX'],['madbeauty.lt','TXT'],['madbeauty.lt','NS']].map(([name,type])=>publicDns(name,type)));
const testDns=await publicDns('bandymas.madbeauty.lt','A');
const domains=await get('/accounts/'+account+'/workers/domains');
const testSettings=await get(base+trial+'/settings',true);
const snapshot={at:new Date().toISOString(),account,zoneId:zones[0].id,canonicalSettings:settings,canonicalDeployments:deployments,dns,domains,testSettings};
await writeFile(new URL('output/retention-provider-'+phase+'.private.json',import.meta.url),JSON.stringify(snapshot,null,2));
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
if(phase==='before'){
 assert.ok(testSettings,'Existing test Worker required');assert.equal(testSettings.bindings.find(b=>b.name==='PLATFORM').namespace_id,'a07857f7b8414eb789f3ff639953ff1b');// Settings API does not expose the migration tag; compare retained namespace and compiled migration configuration instead.
 assert.equal(testSettings.bindings.find(b=>b.name==='TRIAL_EXPIRES_AT').text,'2026-10-16T21:10:47.982Z');assert.equal(testDns.status,0);assert.ok(domains.some(r=>r.hostname==='bandymas.madbeauty.lt'&&r.service===trial));
 console.log(JSON.stringify({phase,account,zone:zones[0].name,canonicalVersion:deployments.deployments?.[0]?.versions,canonicalSettingsSha256:digest(settings),dnsRecords:dns.length,testAlreadyExists:true}));
}else{
 const before=JSON.parse(await readFile(new URL('output/retention-provider-before.private.json',import.meta.url)));
 const canonicalSettingsUnchanged=digest(settings)===digest(before.canonicalSettings),canonicalDeploymentsUnchanged=digest(deployments)===digest(before.canonicalDeployments);if(!canonicalSettingsUnchanged||!canonicalDeploymentsUnchanged)throw Error('Canonical changed during trial acceptance: reconcile writer authorized content-only lease before asserting preservation');
 assert.deepEqual(dns,before.dns,'Observed original site/mail DNS changed');
 assert.equal(testDns.status,0);assert.ok(testDns.answers.length>0);
 for(const domain of before.domains)assert.deepEqual(domains.find(d=>d.id===domain.id),domain,'Existing Worker domain changed');
 assert.ok(domains.some(d=>d.hostname==='bandymas.madbeauty.lt'&&d.service===trial));
 const bindings=testSettings.bindings;assert.ok(!bindings.some(b=>b.script_name||['MAIL_TRANSPORT','MAIL_RELAY_URL','MAIL_RELAY_KEY','ORGANIZATION_STAGING'].includes(b.name)));
 const storage=bindings.filter(b=>b.type==='durable_object_namespace');assert.equal(storage.length,1);assert.equal(storage[0].class_name,'TemporaryTestPlatform');assert.equal(storage[0].namespace_id,before.testSettings.bindings.find(b=>b.name==='PLATFORM').namespace_id);assert.deepEqual(JSON.parse(await readFile(new URL('output/wrangler.json',import.meta.url))).migrations,[{tag:'trial-v1',new_sqlite_classes:['TemporaryTestPlatform']}]);for(const name of ['SESSION_SECRET','TRIAL_EXPIRES_AT'])assert.deepEqual(bindings.find(b=>b.name===name),before.testSettings.bindings.find(b=>b.name===name));assert.equal(bindings.find(b=>b.name==='RETENTION_POLICY_VERSION').text,'madbeauty-2026-10-10-v1');
 const testDeployments=await get(base+trial+'/deployments');
 const proof={state:'PASS',at:snapshot.at,account,host:'bandymas.madbeauty.lt',worker:trial,
  canonicalSettingsUnchanged,canonicalDeploymentsUnchanged,existingWorkerDomainsUnchanged:true,observedSiteMailDnsUnchanged:true,
  dnsReadMethod:'Public DoH A/www A/MX/TXT/NS; OAuth cannot read full zone record inventory',testDns,
  canonicalSettingsSha256:digest(settings),namespace:storage[0].namespace_id,className:storage[0].class_name,
  compiledMigrationTag:'trial-v1',providerMigrationTagUnavailable:true,productionNamespace:'2faf96eedef1425c8d4fc07444cde2f3',
  version:testDeployments.deployments?.[0]?.versions,secretNames:bindings.filter(b=>b.type==='secret_text').map(b=>b.name),smtp:false,existingNamespacePreserved:true,originalExpiryPreserved:true,policyVersion:'madbeauty-2026-10-10-v1'};
 await writeFile(new URL('output/retention-provider-proof.json',import.meta.url),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}
