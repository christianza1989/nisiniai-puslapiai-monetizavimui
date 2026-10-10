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
if(process.argv[2]!=='accept')throw Error('Explicit finite closure-mail acceptance required');
try{await readFile(path.join(privateDir,'closure-transport.json'));throw Error('Existing finite send receipt: inspect it, do not resend');}catch(e){if(e.code!=='ENOENT')throw e;}
const {build}=await import(pathToFileURL(path.join(core,'node_modules/esbuild/lib/main.js'))),{Miniflare}=await import(pathToFileURL(path.join(core,'node_modules/miniflare/dist/src/index.js')));
const platformFile=path.join(root,'sites/madbeauty/cloudflare/platform-object.mjs'),source=await readFile(platformFile,'utf8');
// Isolated clock and login capture are fixture-only. Actual booking/reminder go
// through the unchanged shared sendHostingerMail adapter and real protected relay.
const marker='if(this.env.MAIL_TRANSPORT){const r=';assert.equal(source.split(marker).length,2);
const instrumentation=source.replaceAll('Date.now()','this.store.clock()').replace('openDurableStore(ctx,env.SESSION_SECRET,storeOptions)','openDurableStore(ctx,env.SESSION_SECRET,{...storeOptions,clock:()=>Number(env.ISOLATED_CLOCK)})').replace(marker,"if(row.type==='login-code'&&this.env.MAIL_TRANSPORT){const r=").replace('const mail=transactionalMail(row,payload);',"const mail=transactionalMail(row,payload);mail.text='BANDOMASIS LAIŠKAS — tik izoliuotos fiktyvios paskyros bandymas. Tavo tikra paskyra nebus uždaryta.\\n'+mail.text;").replace(' async fetch(request){',` async acceptanceAutomation(){await this.directory().runRetention();await this.drain();return JSON.stringify(this.store.db.prepare("SELECT id,type,state,attempts FROM mail_outbox WHERE site_id=?").all(this.store.siteId));}\n async fetch(request){`);
const entry=`export {MadbeautyPlatform} from ${JSON.stringify(platformFile.replaceAll('\\','/'))};export default {fetch(request,env){return env.PLATFORM.get(env.PLATFORM.idFromName('madbeauty-mail-acceptance')).fetch(request)}};`;
const bundled=await build({stdin:{contents:entry,resolveDir:root},write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text'},plugins:[{name:'finite-own-mail-acceptance',setup(b){b.onLoad({filter:/cloudflare[\\/]platform-object\.mjs$/},()=>({contents:instrumentation,loader:'js'}));}}]});
const storage=await mkdtemp(path.join(os.tmpdir(),'madbeauty-real-mail-')),origin='https://madbeauty-mail.test',mails=[];
const bindings={APP_ORIGIN:origin,SESSION_SECRET:'isolated-mail-acceptance-only-no-canonical-access',OPERATOR_EMAIL:'operator@example.com',ISOLATED_CLOCK:Date.now(),RETENTION_POLICY_VERSION:'madbeauty-2026-10-10-v1',MAIL_RELAY_URL:relayURL,MAIL_RELAY_SITE:'madbeauty',MAIL_RELAY_KEY:relayKey};
const start=()=>new Miniflare({modules:true,script:bundled.outputFiles[0].text,compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],durableObjects:{PLATFORM:{className:'MadbeautyPlatform',useSQLite:true}},durableObjectsPersist:storage,bindings,serviceBindings:{MAIL_TRANSPORT:async request=>{const m=await request.json();assert.equal(m.subject,'Madbeauty prisijungimo kodas');mails.push(m);return new Response('Accepted');}}});let mf=start();
function browser(){let cookie='',csrf='';async function send(endpoint,input){const r=await mf.dispatchFetch(origin+'/api/madbeauty/'+endpoint,{method:input===undefined?'GET':'POST',headers:{cookie,...(input===undefined?{}:{origin,'content-type':'application/json','x-csrf-token':csrf})},...(input===undefined?{}:{body:JSON.stringify(input)})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const v=await r.json();if(v.csrf)csrf=v.csrf;assert.equal(r.status,200,endpoint+': '+JSON.stringify(v.error||{}));return v;}return {send,async rpc(method,input={}){return(await send('rpc',{method,input,siteId:'madbeauty'})).result;},async login(email){await send('session');const c=await send('auth/start',{email}),code=mails.findLast(m=>m.to===email).text.match(/\b\d{6}\b/)[0];await send('auth/verify',{challengeId:c.challengeId,code});}};}
const stub=async()=>{const ns=await mf.getDurableObjectNamespace('PLATFORM');return ns.get(ns.idFromName('madbeauty-mail-acceptance'));};
try{
 const client=browser();await client.login(recipient);await client.rpc('workspace',{role:'customer'});const loginAt=bindings.ISOLATED_CLOCK,closeAt=new Date(loginAt);closeAt.setUTCFullYear(closeAt.getUTCFullYear()+2);bindings.ISOLATED_CLOCK=closeAt.getTime()-30*86400000;await mf.dispose();mf=start();
 let rows=JSON.parse(await(await stub()).acceptanceAutomation()),notice=rows.filter(r=>r.type==='account-closure-notice');assert.equal(notice.length,1);assert.equal(notice[0].state,'accepted');assert.equal(notice[0].attempts,1);rows=JSON.parse(await(await stub()).acceptanceAutomation());assert.equal(rows.filter(r=>r.type==='account-closure-notice').length,1);
 const evidence={at:new Date().toISOString(),source:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),platformSha256:hash(source),transportSha256:hash(await readFile(path.join(core,'lib/hostinger-transport.mjs'))),fixtureSha256:hash(bundled.outputFiles[0].text),isolatedNativeSQL:true,authCaptureOnly:true,fixtureMessagePrefix:true,realMailKinds:['account-closure-notice'],rows,exactOneNotice:true,restart:true,repeatedAutomationNoAdditionalNotice:true,canonicalDataWrites:0,trialDataWrites:0,inbox:'UNVERIFIED'};
 await writeFile(path.join(privateDir,'closure-transport.json'),JSON.stringify(evidence,null,2));await writeFile(path.join(privateDir,'private-closure-match.json'),JSON.stringify({mailId:notice[0].id,recipient,storage}));console.log(JSON.stringify({result:'PASS',realAccepted:['account-closure-notice'],attempts:1,inbox:'UNVERIFIED'}));
}finally{await mf.dispose();}
