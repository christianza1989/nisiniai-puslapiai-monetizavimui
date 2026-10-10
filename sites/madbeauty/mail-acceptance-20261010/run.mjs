// Explicit own-mailbox acceptance only. No production database or browser auth bypass.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {createHash,createHmac} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'../../..'),core=path.resolve(root,'../dovanos-memorycasting');
const hash=v=>createHash('sha256').update(v).digest('hex');
const privateDir=path.resolve(root,'sites/madbeauty/cloudflare/output/mail-acceptance-20261010');await mkdir(privateDir,{recursive:true});
const php=await readFile(path.resolve(root,'../nisiniai_puslapiai_monetizavimui/infrastructure/mail-relay/output/_private/config.php'),'utf8');
const encodedConfig=php.match(/base64_decode\(['"]([A-Za-z0-9+/=]+)['"]\)/)?.[1];
const relayKey=encodedConfig?JSON.parse(Buffer.from(encodedConfig,'base64').toString('utf8')).keys?.madbeauty:php.match(/['"]madbeauty['"]\s*=>\s*['"]([^'"]+)['"]/)?.[1];
assert.ok(relayKey?.length>=48,'Existing private relay key must be available');
const relayURL='https://midnightblue-bear-439840.hostingersite.com/relay.php',recipient='info@pinet.lt';
async function probe(mail){const body=JSON.stringify(mail),time=String(Date.now()),r=await fetch(relayURL,{method:'POST',headers:{'content-type':'application/json','x-release-site':'madbeauty','x-release-time':time,'x-release-signature':createHmac('sha256',relayKey).update(time+'\n'+body).digest('hex')},body,redirect:'manual',signal:AbortSignal.timeout(25000)});return {status:r.status,value:await r.json()};}
if(process.argv[2]==='before'){
 const r=await probe({id:'madbeauty-reminder-preflight-'+Date.now(),to:recipient,subject:'Madbeauty priminimas apie vizitą',text:'BANDOMASIS LAIŠKAS. Tik pašto priminimo paskirties patikra; tai nėra tikra rezervacija.'});
 assert.equal(r.status,400);assert.equal(r.value.error,'Invalid purpose');
 await writeFile(path.join(privateDir,'before.json'),JSON.stringify({at:new Date().toISOString(),source:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),relayURL,result:r},null,2));
 console.log('Actual authenticated reminder rejected by existing relay purpose guard: 400. No SMTP send.');process.exit(0);
}
assert.equal(process.argv[2],'accept','Use explicit before or accept mode');
const {build}=await import(pathToFileURL(path.join(core,'node_modules/esbuild/lib/main.js'))),{Miniflare}=await import(pathToFileURL(path.join(core,'node_modules/miniflare/dist/src/index.js')));
const platformFile=path.join(root,'sites/madbeauty/cloudflare/platform-object.mjs'),source=await readFile(platformFile,'utf8');
// Isolated clock and login capture are fixture-only. Actual booking/reminder go
// through the unchanged shared sendHostingerMail adapter and real protected relay.
const marker='if(this.env.MAIL_TRANSPORT){const r=';assert.equal(source.split(marker).length,2);
const instrumentation=source.replaceAll('Date.now()','this.store.clock()').replace('openDurableStore(ctx,env.SESSION_SECRET,storeOptions)','openDurableStore(ctx,env.SESSION_SECRET,{...storeOptions,clock:()=>Number(env.ISOLATED_CLOCK)})').replace(marker,"if(row.type==='login-code'&&this.env.MAIL_TRANSPORT){const r=").replace('const mail=transactionalMail(row,payload);',"const mail=transactionalMail(row,payload);mail.text='BANDOMASIS LAIŠKAS — tai nėra tikra rezervacija.\\n'+mail.text;").replace(' async fetch(request){',` async acceptanceAutomation(){createPlatform(this.store).runAutomation();await this.drain();return this.store.db.prepare("SELECT type,state,attempts FROM mail_outbox WHERE site_id=?").all(this.store.siteId);}\n async fetch(request){`);
const entry=`export {MadbeautyPlatform} from ${JSON.stringify(platformFile.replaceAll('\\','/'))};export default {fetch(request,env){return env.PLATFORM.get(env.PLATFORM.idFromName('madbeauty-mail-acceptance')).fetch(request)}};`;
const bundled=await build({stdin:{contents:entry,resolveDir:root},write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text'},plugins:[{name:'finite-own-mail-acceptance',setup(b){b.onLoad({filter:/cloudflare[\\/]platform-object\.mjs$/},()=>({contents:instrumentation,loader:'js'}));}}]});
const storage=await mkdtemp(path.join(os.tmpdir(),'madbeauty-real-mail-')),origin='https://madbeauty-mail.test',mails=[];
const bindings={APP_ORIGIN:origin,SESSION_SECRET:'isolated-mail-acceptance-only-no-canonical-access',OPERATOR_EMAIL:'operator@example.com',ISOLATED_CLOCK:Date.now(),MAIL_RELAY_URL:relayURL,MAIL_RELAY_SITE:'madbeauty',MAIL_RELAY_KEY:relayKey};
const start=()=>new Miniflare({modules:true,script:bundled.outputFiles[0].text,compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],durableObjects:{PLATFORM:{className:'MadbeautyPlatform',useSQLite:true}},durableObjectsPersist:storage,bindings,serviceBindings:{MAIL_TRANSPORT:async request=>{const m=await request.json();assert.equal(m.subject,'Madbeauty prisijungimo kodas');mails.push(m);return new Response('Accepted');}}});let mf=start();
function browser(){let cookie='',csrf='';async function send(endpoint,input){const r=await mf.dispatchFetch(origin+'/api/madbeauty/'+endpoint,{method:input===undefined?'GET':'POST',headers:{cookie,...(input===undefined?{}:{origin,'content-type':'application/json','x-csrf-token':csrf})},...(input===undefined?{}:{body:JSON.stringify(input)})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const v=await r.json();if(v.csrf)csrf=v.csrf;assert.equal(r.status,200,endpoint+': '+JSON.stringify(v.error||{}));return v;}return {send,async rpc(method,input={}){return(await send('rpc',{method,input,siteId:'madbeauty'})).result;},async login(email){await send('session');const c=await send('auth/start',{email}),code=mails.findLast(m=>m.to===email).text.match(/\b\d{6}\b/)[0];await send('auth/verify',{challengeId:c.challengeId,code});}};}
try{
 const owner=browser(),client=browser(),operator=browser();await owner.login('mail-fixture-owner@example.com');await operator.login('operator@example.com');await client.login(recipient);
 const org=await owner.rpc('createOrganization',{name:'BANDOMASIS — pašto patikra',bio:'Izoliuotas techninis testas; tikra paslauga neteikiama.',city:'Vilnius',kind:'solo'}),scope={role:'professional',organizationId:org.id},w=await owner.rpc('workspace',scope);
 const service=await owner.rpc('createService',{organizationId:org.id,practitionerId:w.practitioners[0].id,resourceId:w.resources[0].id,taxonomyServiceId:'manikiuras',label:'BANDOMASIS — jokios tikros paslaugos',durationMin:60,priceMinor:0});
 const revision=await owner.rpc('submitRevision',{scope,name:org.name,bio:org.bio});await operator.rpc('moderate',{id:revision.id,state:'approved'});
 let candidate;for(let dayOffset=2;dayOffset<9&&!candidate;dayOffset++)candidate=(await client.rpc('availability',{providerServiceId:service.id,dayOffset,from:540,to:720})).slots[0];assert.ok(candidate);
 const hold=await client.rpc('hold',candidate),booking=await client.rpc('confirm',{holdId:hold.id,name:'BANDOMASIS — savininko pašto testas',idempotencyKey:'actual-own-mail-booking'});
 const stub=()=>{const ns=mf.getDurableObjectNamespace('PLATFORM');return ns.then(n=>n.get(n.idFromName('madbeauty-mail-acceptance')));};
 let rows=await(await stub()).acceptanceAutomation();assert.equal(rows.filter(r=>r.type==='confirmation'&&r.state==='accepted').length,1,'Real booking transport acceptance');
 // Persist controlled SQL and advance exactly to the scheduled 24h reminder.
 bindings.ISOLATED_CLOCK=Date.parse(booking.startAt)-86400000;await mf.dispose();mf=start();
 rows=await(await stub()).acceptanceAutomation();assert.equal(rows.filter(r=>r.type==='reminder'&&r.state==='accepted').length,1,'Real reminder transport acceptance');
 await(await stub()).acceptanceAutomation();rows=await(await stub()).acceptanceAutomation();assert.equal(rows.filter(r=>r.type==='reminder').length,1);assert.equal(rows.find(r=>r.type==='reminder').attempts,1);
 // Explicit unrelated purposes still fail before SMTP after the change.
 const rejected=await probe({id:'madbeauty-unrelated-'+Date.now(),to:recipient,subject:'Newsletter',text:'Purpose rejection self-test.'});assert.equal(rejected.status,400);assert.equal(rejected.value.error,'Invalid purpose');
 const evidence={at:new Date().toISOString(),source:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),platformSha256:hash(source),transportSha256:hash(await readFile(path.join(core,'lib/hostinger-transport.mjs'))),fixtureSha256:hash(bundled.outputFiles[0].text),relayURL,isolatedNativeSQL:true,authCaptureOnly:true,fixtureMessagePrefix:true,realMailKinds:['confirmation','reminder'],rows,reminderBoundary:'24 hours before appointment; controlled SQL clock',restart:true,repeatedAutomationNoAdditionalReminder:true,unrelatedPurpose:rejected,canonicalDataWrites:0,trialDataWrites:0,inbox:'UNVERIFIED'};
 await writeFile(path.join(privateDir,'transport.json'),JSON.stringify(evidence,null,2));
 await writeFile(path.join(privateDir,'private-message-match.json'),JSON.stringify({bookingId:booking.id,startAt:booking.startAt,recipient,storage},null,2));
 console.log(JSON.stringify({result:'PASS',realAccepted:['booking-confirmed','reminder'],reminderAttempts:1,unrelatedPurposeStatus:400,inbox:'UNVERIFIED'}));
}finally{await mf.dispose();}
