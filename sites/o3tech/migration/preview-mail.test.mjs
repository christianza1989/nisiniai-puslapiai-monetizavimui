import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,mkdtemp,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {stripTypeScriptTypes} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {loadPreviewMail} from './preview-mail.mjs';
import {smtpMessage} from '../../../../dovanos-memorycasting/lib/smtp-protocol.mjs';
const output=path.resolve(import.meta.dirname,'../../../output');
const pub=path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting');
const fixtureSettings={siteId:'o3tech',canonicalHost:'o3tech.lt',username:'kontaktuforma@kontaktuforma.lt',from:'kontaktuforma@kontaktuforma.lt',smtpHost:'smtp.hostinger.com',smtpPort:465,implicitTls:true,passwordFile:'slaptazodis.txt',to:['sales@o3tech.lt']};
const fixtureMail={id:'fixture-123',to:'sales@o3tech.lt',from:'uzklausos@o3tech.lt',replyTo:'fixture@example.com',subject:'Fixture',text:'Synthetic fixture'};
async function fixture(run){
 await mkdir(output,{recursive:true});const root=await mkdtemp(path.join(output,'o3tech-mail-test-'));
 const privateRoot=path.join(root,'private'),dir=path.join(privateRoot,'mail-kontaktuforma'),configPath=path.join(dir,'connection.json');
 await mkdir(dir,{recursive:true});await writeFile(configPath,JSON.stringify(fixtureSettings));await writeFile(path.join(dir,'slaptazodis.txt'),'fixture-only-not-a-real-password\n');
 try{return await run({root,privateRoot,dir,configPath});}
 finally{assert.equal(path.dirname(path.resolve(root)),output);await rm(root,{recursive:true,force:true});}
}
test('default preview has no credentials or transport activity',async()=>{
 const mail=await loadPreviewMail({privateRoot:'not-read',transport:()=>{throw Error('must not connect');}});
 assert.equal(mail.enabled,false);assert.equal(await mail.send(),false);
});
test('configured sender, fixed recipient and client Reply-To survive MIME construction',()=>fixture(async f=>{
 let calls=0;const mail=await loadPreviewMail({...f,transport:async(settings,message)=>{
  calls++;assert.equal(settings.user,fixtureSettings.username);assert.equal(settings.password,'fixture-only-not-a-real-password');
  const mime=smtpMessage(message);assert.match(mime,/From: .*<kontaktuforma@kontaktuforma.lt>/);assert.match(mime,/To: <sales@o3tech.lt>/);assert.match(mime,/Reply-To: <fixture@example.com>/);return true;
 }});
 assert.equal(mail.enabled,true);assert.equal(await mail.send({},fixtureMail),true);assert.equal(calls,1);
}));
test('unconfigured destinations and injected headers never reach transport',()=>fixture(async f=>{
 let calls=0;const mail=await loadPreviewMail({...f,transport:async()=>{calls++;return true;}});
 await assert.rejects(mail.send({},{...fixtureMail,to:'other@example.com'}),/Unconfigured/);
 await assert.rejects(mail.send({},{...fixtureMail,replyTo:'fixture@example.com\r\nBcc: other@example.com'}),/SMTP invalid/);
 await assert.rejects(mail.send({},{...fixtureMail,subject:'hello\r\nBcc: other@example.com'}),/SMTP invalid/);assert.equal(calls,0);
}));
test('unsafe provider/path/sender configuration fails closed without printing secret',()=>fixture(async f=>{
 for(const change of [{smtpHost:'elsewhere.example'},{username:'other@example.com'},{passwordFile:'../other.txt'},{to:['sales@o3tech.lt','other@example.com']}]){
  await writeFile(f.configPath,JSON.stringify({...fixtureSettings,...change}));
  await assert.rejects(loadPreviewMail({...f}),e=>e.message==='Private o3tech mail configuration invalid; no secret values printed');
 }
}));
test('native POST stores before sending and retains failed notifications without retry',()=>fixture(async f=>{
 let db=new DatabaseSync(path.join(f.root,'leads.sqlite'));
 db.exec('CREATE TABLE niche_leads(id TEXT PRIMARY KEY,site_id TEXT,created_at INTEGER,source_path TEXT,name TEXT,email TEXT,message TEXT,consent_at INTEGER,status TEXT)');
 const rows=()=>db.prepare('SELECT * FROM niche_leads ORDER BY rowid').all();let calls=0,fail=false;
 const delivery=await loadPreviewMail({...f,transport:async(_settings,message)=>{
  calls++;assert.equal(rows().at(-1).status,'new');assert.equal(message.to,'sales@o3tech.lt');assert.equal(message.from,'kontaktuforma@kontaktuforma.lt');assert.equal(message.replyTo,'fixture@example.com');
  if(fail)throw Error('Fixture unknown acceptance');return true;
 }});
 const env={LEAD_SMTP_ENABLED:'1',DB:{prepare(sql){return{bind(...values){return{run(){return db.prepare(sql).run(...values);}};}};}}};
 globalThis.__o3techMailFixture={env,delivery};
 try{
  const original=await readFile(path.join(pub,'app/niche/[siteId]/lead/route.ts'),'utf8');
  const prefix="const f=globalThis.__o3techMailFixture;const env=f.env;async function headers(){return f.request.headers;}const pkg={siteId:'o3tech',canonicalHost:'o3tech.lt',schemaVersion:1,site:{contact:{email:'sales@o3tech.lt'}},pages:[{slug:'',type:'home'}]};function publicSiteByHost(h){return h==='127.0.0.1:4783'?pkg:null;}function publicSitePage(p,s){return p.pages.find(x=>x.slug===s);}function publicSitePages(p){return p.pages;}function nicheLeadRecipient(_id,email){return email;}function nicheNetworkContact(){return {operatorName:'UAB A-Z Prekyba'};}async function sendNicheLeadMail(...args){return f.delivery.send(...args);}\n";
  const imports="import {memoLeadContext,memoLeadText} from "+JSON.stringify(pathToFileURL(path.join(pub,'lib/memocasting-lead-response.mjs')).href)+";import {o3techInquiryMessage} from "+JSON.stringify(pathToFileURL(path.join(pub,'lib/o3tech-inquiry.mjs')).href)+";\n";
  const routePath=path.join(f.root,'native-route.mjs');await writeFile(routePath,imports+prefix+stripTypeScriptTypes(original.replace(/^import .*;\r?\n/gm,''),{mode:'transform'}));
  const {POST}=await import(pathToFileURL(routePath).href);
  const post=async consent=>{
   const request=new Request('http://127.0.0.1:4783/uzklausa',{method:'POST',headers:{host:'127.0.0.1:4783',origin:'http://127.0.0.1:4783',referer:'http://127.0.0.1:4783/nuoma/','content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:'fixture@example.com',name:'Fixture',message:'Synthetic fixture, not a customer inquiry',consent})});
   globalThis.__o3techMailFixture.request=request;return POST(request,{params:Promise.resolve({siteId:'o3tech'})});
  };
  assert.equal((await post('no')).status,400);assert.equal(rows().length,0);assert.equal(calls,0);
  assert.equal((await post('yes')).status,200);assert.equal(rows()[0].status,'notified');assert.equal(rows()[0].source_path,'/nuoma/');
  fail=true;assert.equal((await post('yes')).status,200);assert.equal(calls,2);assert.equal(rows()[1].status,'new');
  db.close();db=new DatabaseSync(path.join(f.root,'leads.sqlite'));assert.equal(rows().length,2);assert.equal(rows()[1].status,'new');assert.equal(calls,2);
 }finally{delete globalThis.__o3techMailFixture;db.close();}
}));
