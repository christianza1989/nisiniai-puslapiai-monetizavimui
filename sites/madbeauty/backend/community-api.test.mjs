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
 await a.call('save',{author:B,id:'example-post',saved:true,album:'Idėjos'});assert.equal((await a.call('session')).result.saved.length,1);assert.equal((await b.call('profile',{author:A})).result.saved,undefined);
 await a.call('block',{target:B,blocked:true});assert.equal((await b.call('people')).result.some(p=>p.actor===A),false);assert.equal((await b.call('follow',{target:A,following:true})).status,403);
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
