import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const origin='https://bandymas.madbeauty.lt',out=new URL('output/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',out)));
const startedAt=new Date().toISOString(),http=[];
async function get(path){const r=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(20000)});const bytes=Buffer.from(await r.arrayBuffer());http.push({path,status:r.status,bytes:bytes.length});return {status:r.status,headers:r.headers,bytes,text:bytes.toString('utf8')};}
function browser(){let cookie='',csrf='';return {async request(path,body){const r=await fetch(origin+'/api/madbeauty/'+path,{method:body===undefined?'GET':'POST',headers:{cookie,origin,...(body===undefined?{}:{'Content-Type':'application/json','x-csrf-token':csrf})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];const value=await r.json();if(value.csrf)csrf=value.csrf;return {status:r.status,value};},async login(email){await this.request('session');const c=await this.request('auth/start',{email});assert.equal(c.status,200,JSON.stringify(c));assert.match(c.value.testCode,/^\d{6}$/);const v=await this.request('auth/verify',{challengeId:c.value.challengeId,code:c.value.testCode});assert.equal(v.status,200,JSON.stringify(v));return v.value;},async rpc(method,input={}){const r=await this.request('rpc',{method,input,siteId:'madbeauty'});assert.equal(r.status,200,method+JSON.stringify(r));return r.value.result;}};}
const accounts=await get('/bandymo-paskyros');assert.equal(accounts.status,200);assert.match(accounts.headers.get('x-robots-tag'),/noindex/);assert.equal((accounts.text.match(/demo-provider-/g)||[]).length,46);
const boot=await get('/boot.json');assert.equal(boot.status,200);assert.equal(JSON.parse(boot.text).temporaryTest.profiles,40);
const guest=browser(),client=browser(),owner=browser(),foreign=browser();await guest.request('session');
assert.equal((await guest.request('auth/start',{email:'real-person@real-domain.lt'})).status,400);
const catalogue=await guest.rpc('catalog'),solos=new Set(catalogue.filter(s=>s.kind==='solo').map(s=>s.organizationId)),allProfiles=[...new Map(catalogue.map(s=>[s.organizationId,{id:s.organizationId,kind:s.kind}])).values()];
assert.equal(solos.size,40);assert.equal(allProfiles.length,45);assert.ok(catalogue.every(s=>s.organizationId.startsWith('demo-org-')));
assert.ok(catalogue.filter(s=>s.kind==='solo').every(s=>s.avatarImageId&&s.coverImageId&&s.media.length));
for(let i=0;i<allProfiles.length;i+=6)await Promise.all(allProfiles.slice(i,i+6).map(async p=>{const r=await get('/'+(p.kind==='solo'?'meistrai':'salonai')+'/'+p.id);assert.equal(r.status,200,p.id);assert.match(r.headers.get('x-robots-tag'),/noindex/);assert.match(r.text,/LAIKINAS BANDYMAS/);assert.ok(!r.text.includes('application/ld+json'));assert.ok(!r.text.includes('rel="canonical"'));}));
for(let i=0;i<manifest.media.length;i+=6)await Promise.all(manifest.media.slice(i,i+6).map(async m=>{const r=await get(m.path);assert.equal(r.status,200,m.path);assert.equal(r.bytes.length,m.bytes);assert.equal(createHash('sha256').update(r.bytes).digest('hex'),m.sha256);}));
for(const path of ['/sitemap.xml','/llms.txt','/llms-full.txt','/content-targets.json','/private-originals/profiles-v2/profile-01-portrait.png','/output/secrets.private.json','/gidai/antakiai-gidas'])assert.equal((await get(path)).status,404,path);
const robots=await get('/robots.txt');assert.match(robots.text,/Disallow: \//);
await client.login('demo-client-0@example.com');await owner.login('demo-provider-0@example.com');await foreign.login('demo-client-1@example.com');
const service=catalogue.find(s=>s.organizationId==='demo-org-0');let slot;
for(let dayOffset=1;dayOffset<8&&!slot;dayOffset++)slot=(await client.rpc('availability',{providerServiceId:service.id,dayOffset,from:540,to:1200,addons:[]})).slots[0];
assert.ok(slot);const hold=await client.rpc('hold',slot),booking=await client.rpc('confirm',{holdId:hold.id,name:'Bandymo klientas',idempotencyKey:'temporary-live-trial-'+startedAt});
assert.equal((await owner.rpc('workspace',{role:'professional',organizationId:'demo-org-0'})).bookings.filter(b=>b.id===booking.id).length,1);
assert.equal((await client.rpc('workspace',{role:'customer'})).bookings.filter(b=>b.id===booking.id).length,1);
assert.equal((await foreign.rpc('workspace',{role:'customer'})).bookings.filter(b=>b.id===booking.id).length,0);
const canceled=await client.rpc('cancelBooking',{scope:{role:'customer'},id:booking.id,version:booking.version,reason:'Automatinis laikino bandymo patikrinimas'});assert.equal(canceled.status,'canceled');
assert.equal((await owner.rpc('workspace',{role:'professional',organizationId:'demo-org-0'})).bookings.find(b=>b.id===booking.id).status,'canceled');
const proof={state:'PASS',startedAt,finishedAt:new Date().toISOString(),origin,sourceCommit:manifest.sourceCommit,
 artifactSha256:manifest.artifactSha256,packageSha256:manifest.packageSha256,expiresAt:manifest.expiresAt,
 counts:{soloProfiles:solos.size,publicSalonProfiles:allProfiles.length-solos.size,advertisedAccountChoices:(accounts.text.match(/bandymo_pastas=/g)||[]).length,mediaVariants:manifest.media.length,httpRequests:http.length},
 booking:{id:booking.id,organizationId:booking.organizationId,state:'canceled',clientAndOwnerViews:true,foreignClientExcluded:true},
 discoveryExcluded:true,privateOriginalsExcluded:true,realEmailAuthenticationRejected:true,smtp:false,http};
await writeFile(new URL('http-proof.json',out),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({...proof,http:http.length}));
