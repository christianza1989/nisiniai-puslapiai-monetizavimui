import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {communityState} from './community-state.mjs';
import {createCommunityPerson} from './community.mjs';
import {createPlatform} from './platform.mjs';

test('A full 24-post page reads its person document once and preserves audience, likes, comments and author',()=>{
 const db=new DatabaseSync(':memory:'),store=communityState(db,fn=>fn(),()=>Date.parse('2026-10-11T06:00:00Z')),owner='person:fixture-owner',principal={actor:owner,isDemo:true};
 try{
  const api=createCommunityPerson(store,owner);api.settings(principal,{version:0,name:'Fixture author',discoverable:true});
  for(let n=0;n<24;n++)api.publish(principal,{operation:'fixture-'+n,text:'Fixture '+n,audience:'public'});
  const privatePost=api.publish(principal,{operation:'private-fixture',text:'Private fixture',audience:'private'});
  let reads=0;const read=store.read;store.read=(...a)=>{reads++;return read(...a);};
  const other={actor:'person:fixture-reader'},page=api.list(other,{limit:24});assert.equal(reads,1);assert.equal(page.posts.length,24);assert.ok(page.posts.every(p=>p.authorName==='Fixture author'&&p.likes===0&&p.liked===false&&p.comments.length===0));assert.ok(!page.posts.some(p=>p.id===privatePost.id));
  reads=0;api.get(other,{id:page.posts[0].id});assert.equal(reads,1);assert.throws(()=>api.get(other,{id:privatePost.id}),e=>e.status===404);
  reads=0;const replay=api.publish(principal,{operation:'fixture-0',text:'Must not replace',audience:'private'});assert.equal(reads,1);assert.equal(replay.text,'Fixture 0');
 }finally{db.close();}
});
test('An anonymous session never reads private memberships, organization or practitioner collections',()=>{
 let reads=0;const store={clock:()=>Date.parse('2026-10-11T06:00:00Z'),readCollections:()=>{reads++;throw Error('Anonymous collection scan');},read:()=>{reads++;throw Error('Anonymous state scan');}};
 const api=createPlatform(store);assert.deepEqual(api.session(null),{user:null,clientId:null,operator:false,organizations:[],favoriteIds:[]});assert.equal(reads,0);
});
