import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {communityState} from './community-state.mjs';
import {createCommunityPerson,createCommunityConversation} from './community.mjs';
function fixture(t){const db=new DatabaseSync(':memory:');t.after(()=>db.close());let now=Date.parse('2025-10-11T10:00:00Z');const store=communityState(db,fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}},()=>now);return {db,store,advance:value=>now=Date.parse(value)};}
function image(){const id='asset_'+randomUUID(),value=Buffer.alloc(260000,117),v={storageFile:id+'-800.webp',width:800,height:1000,bytes:value.length,sha256:createHash('sha256').update(value).digest('hex')};return {operation:randomUUID(),asset:{id,alt:'Test image',rights:'Synthetic test',policy:'test-only',variants:[v],source:{original:'originals/'+id},createdAt:'2025-10-11T10:00:00Z'},objects:[{key:'variants/'+v.storageFile,value},{key:'originals/'+id,value:Buffer.from('private original')} ]};}
test('Community media chunks enforce attachment owner, private audience and deleted-content access without storing originals',t=>{
 const f=fixture(t),owner='person:one',person=createCommunityPerson(f.store,owner),p={actor:owner},input=image();person.settings(p,{version:0,name:'Testinė A',discoverable:true});const asset=person.registerMedia(p,input);
 assert.equal(asset.source,undefined);assert.equal(person.registerMedia(p,input).id,asset.id);assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM community_media_parts').get().count,2);
 const post=person.publish(p,{operation:randomUUID(),text:'Private',audience:'private',media:[asset.id]});assert.throws(()=>person.readMedia({actor:'person:two'},{post:post.id,id:asset.id}),e=>e.status===404);
 const bytes=person.readMedia(p,{post:post.id,id:asset.id}).bytes;assert.equal(bytes.length,260000);assert.equal(bytes.includes(Buffer.from('private original')),false);
 assert.throws(()=>person.publish(p,{operation:randomUUID(),text:'Duplicate placement',media:[asset.id]}),e=>e.status===404);assert.equal(person.export(p).posts.length,1);
 person.edit(p,{id:post.id,version:1,delete:true});assert.throws(()=>person.readMedia(p,{post:post.id,id:asset.id}),e=>e.status===404);person.cleanup();assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM community_media').get().count,0);
 const pending=person.registerMedia(p,image());f.advance('2025-10-13T10:00:00Z');person.cleanup();assert.equal(f.db.prepare('SELECT id FROM community_media WHERE id=?').get(pending.id),undefined);
});
test('Twelve calendar months purge private message text and its photo parts; remaining room messages stay intact',t=>{
 const f=fixture(t),a={actor:'person:one',messagePolicy:'requests'},b={actor:'person:two'},room=createCommunityConversation(f.store,[a.actor,b.actor]);room.request(a,{});room.respond(b,{version:1,accept:true});const asset=room.registerMedia(a,image()),m=room.send(a,{operation:randomUUID(),text:'Expired private text',media:[asset.id]});
 f.advance('2026-10-10T10:00:00Z');assert.equal(room.cleanup().messagesRemoved,0);assert.equal(room.readMedia(b,{message:m.id,id:asset.id}).bytes.length,260000);room.send(b,{operation:randomUUID(),text:'Recent text'});
 f.advance('2026-10-12T10:00:00Z');assert.equal(room.cleanup().messagesRemoved,1);assert.deepEqual(room.status(b).messages.map(m=>m.text),['Recent text']);assert.throws(()=>room.readMedia(b,{message:m.id,id:asset.id}),e=>e.status===404);assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM community_media_parts').get().count,0);assert.equal(f.db.prepare('SELECT data FROM community_documents WHERE id=?').get('conversation').data.includes('Expired private text'),false);
});
