import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {openStore} from './store.mjs';
import {createAuth} from './auth.mjs';
import {communityState} from './community-state.mjs';
import {createCommunityPerson,createCommunityConversation} from './community.mjs';
import {createCommunityApi} from './community-api.mjs';
import {ApiError} from './primitives.mjs';
function fixture(t){
 const platform=openStore({filename:':memory:'}),auth=createAuth(platform),objects=new Map(),databases=[];t.after(()=>{platform.close();databases.forEach(d=>d.close());});
 const getObject=name=>{if(!objects.has(name)){const db=new DatabaseSync(':memory:');databases.push(db);const s=communityState(db,fn=>{db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}});objects.set(name,{call(kind,id,p,m,v){try{return {result:(kind==='person'?createCommunityPerson(s,id):createCommunityConversation(s,id.split('|')))[m](p,v)};}catch(e){return {error:{code:e.code||'SERVER_ERROR',message:e.message,status:e instanceof ApiError?e.status:500}};}}});}return objects.get(name);};
 const origin='https://madbeauty.test',api=createCommunityApi(platform,{origin,enabled:true,getObject});
 const client=email=>{let session=auth.session(null),c=auth.start(session,email,'local');session=auth.verify(session,c.challengeId,platform.capture(c.challengeId).code,'local').session;const cookie='__Host-madbeauty_sid='+session.token;return {session,async call(method,input={},headers={}){const r=await api.handle(new Request(origin+'/api/madbeauty/community',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':session.csrf,...headers},body:JSON.stringify({method,input,actor:'forged',operator:true})}));return {status:r.status,...await r.json()};}};};
 return {platform,auth,client};
}
test('Node community facade matches native identity, audience, ownership, block and private collection boundaries',async t=>{
 const f=fixture(t),a=f.client('person-a@example.com'),b=f.client('person-b@example.com');
 const A=(await a.call('session')).result.actor,B=(await b.call('session')).result.actor;
 for(const [c,name] of [[a,'Testinė A'],[b,'Testinė B']])assert.equal((await c.call('settings',{name,city:'Vilnius',discoverable:true,version:0})).status,200);
 const p=(await a.call('publish',{text:'Only me',audience:'private',operation:'node-post'})).result;
 assert.equal((await b.call('get',{author:A,id:p.id})).status,404);assert.equal((await b.call('review',{author:A,reportId:'fake',version:1,reason:'Forged operator'})).status,403);
 assert.equal((await b.call('export')).result.posts.length,0);assert.equal((await a.call('edit',{id:p.id,version:99,text:'Stale',audience:'public'})).status,409);
 assert.equal((await a.call('save',{author:B,id:'example-post',saved:true,album:'Idėjos'})).status,404);const publicIdea=(await b.call('publish',{text:'Vieša idėja',audience:'public',operation:'album-post'})).result;await a.call('save',{author:B,id:publicIdea.id,saved:true,album:'Idėjos'});assert.equal((await a.call('session')).result.saved.length,1);assert.equal((await b.call('profile',{author:A})).result.saved,undefined);
 await a.call('block',{target:B,blocked:true});assert.equal((await b.call('people')).result.items.some(p=>p.actor===A),false);assert.equal((await b.call('follow',{target:A,following:true})).status,403);
 assert.equal((await a.call('session',{}, {Origin:'https://evil.invalid'})).status,403);
 f.auth.logout(a.session);assert.equal((await a.call('session')).status,401);
});
test('Node request recipient sees initial message, cannot self-accept, and rejected request stays closed',async t=>{
 const f=fixture(t),a=f.client('request-a@example.com'),b=f.client('request-b@example.com'),A=(await a.call('session')).result.actor,B=(await b.call('session')).result.actor;
 for(const [c,name] of [[a,'Pirma testinė'],[b,'Antra testinė']])await c.call('settings',{version:0,name,discoverable:true,messagePolicy:'requests'});
 await a.call('request',{target:B});await a.call('send',{target:B,text:'Labas',operation:'intro'});
 assert.equal((await b.call('conversation',{target:A})).result.messages[0].text,'Labas');assert.equal((await a.call('respond',{target:B,version:1,accept:true})).status,403);
 assert.equal((await b.call('respond',{target:A,version:1,accept:false})).result.state,'declined');assert.equal((await a.call('send',{target:B,text:'Again',operation:'rejected'})).status,403);
});

test('Comments, private albums, publication references and stable multi-author feed pages',async t=>{
 const f=fixture(t),clients=['a','b','c'].map(x=>f.client('feed-'+x+'@example.com')),actors=[];
 for(const [i,c] of clients.entries()){actors.push((await c.call('session')).result.actor);await c.call('settings',{version:0,name:'Testinė '+i,city:'Vilnius',discoverable:true});}
 const [a,b,c]=clients;let first;
 for(const [i,user] of clients.entries())for(let j=0;j<10;j++){const p=await user.call('publish',{text:'Bandomoji idėja '+i+' '+j,audience:'public',operation:'page-'+i+'-'+j});assert.equal(p.status,200);first||=p.result;}
 const page=await a.call('feed');assert.equal(page.result.posts.length,24);assert.ok(page.result.next);const next=await a.call('feed',{before:page.result.next});assert.equal(next.result.posts.length,6);assert.equal(next.result.next,null);assert.equal(new Set([...page.result.posts,...next.result.posts].map(p=>p.id)).size,30);
 assert.equal((await a.call('feed',{city:'Kaunas'})).result.posts.length,0);
 assert.equal((await a.call('publish',{text:'Neteisinga paslauga',providerServiceId:'forged',operation:'forged-service'})).status,404);
 const replyTo=(await b.call('comment',{author:actors[0],id:first.id,text:'Pirmas komentaras',operation:'comment-one'})).result;
 const reply=(await c.call('comment',{author:actors[0],id:first.id,text:'Atsakymas',parentId:replyTo.id,operation:'reply-one'})).result;
 assert.equal(reply.parentId,replyTo.id);assert.equal((await a.call('editComment',{author:actors[0],id:first.id,commentId:replyTo.id,version:1,text:'Kito teksto pakeitimas'})).status,403);
 assert.equal((await b.call('editComment',{author:actors[0],id:first.id,commentId:replyTo.id,version:1,text:'Atnaujinta'})).status,200);
 assert.equal((await b.call('editComment',{author:actors[0],id:first.id,commentId:replyTo.id,version:1,text:'Pasenusi versija'})).status,409);
 assert.equal((await c.call('save',{author:actors[0],id:first.id,saved:true,album:'Vestuvių idėjos'})).status,200);assert.equal((await c.call('session')).result.saved[0].album,'Vestuvių idėjos');assert.equal((await a.call('profile',{author:actors[2]})).result.saved,undefined);
 assert.equal((await c.call('get',{author:actors[0],id:first.id})).result.operation,undefined);
 assert.equal((await c.call('moderation')).status,403);
 assert.equal((await a.call('edit',{id:first.id,version:1,text:'Privati idėja',audience:'private'})).status,200);assert.equal((await c.call('save',{author:actors[0],id:first.id,saved:true,album:'Kitas'})).status,404);assert.equal((await c.call('get',{author:actors[0],id:first.id})).status,404);
});

test('Only an actual operator resolves reports; reporters and private conversations stay absent from author decisions',async t=>{
 const f=fixture(t),a=f.client('author@example.com'),b=f.client('reporter@example.com'),op=f.client('moderator@example.com'),A=(await a.call('session')).result.actor;
 f.platform.db.prepare('UPDATE accounts SET operator=1 WHERE email=?').run('moderator@example.com');
 for(const [c,name]of [[a,'Testinė autorė'],[b,'Testinė skaitytoja'],[op,'Testinis operatorius']])await c.call('settings',{version:0,name,discoverable:true});
 const p=(await a.call('publish',{text:'Testinis skundžiamas įrašas',operation:'report-post'})).result;
 await b.call('report',{author:A,id:p.id,note:'Testinis pranešimas apie įrašą',operation:'report-once'});
 assert.equal((await b.call('moderation')).status,403);const r=(await op.call('moderation')).result.items[0];assert.equal(r.actor,undefined);
 assert.equal((await op.call('review',{author:A,reportId:r.id,version:r.version,reason:'Testinis sprendimas',hidden:true})).status,200);
 assert.equal((await b.call('get',{author:A,id:p.id})).status,404);assert.equal((await op.call('moderation')).result.items.length,0);
 const self=(await a.call('session')).result;assert.equal(self.reports,undefined);assert.equal(self.decisions[0].reason,'Testinis sprendimas');assert.equal(self.decisions[0].actor,undefined);
 assert.equal((await op.call('review',{author:A,reportId:r.id,version:r.version,reason:'Pasenusi versija',hidden:false})).status,409);
});
