import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openStore} from './store.mjs';
import {initializeFixtureRuntime} from './fixture-runtime.mjs';
import {createAuth} from './auth.mjs';
import {createPlatform} from './platform.mjs';
const now=Date.parse('2026-10-05T07:00:00Z');
test('private fixture file is isolated, durable, seeded once and refused as real storage',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'madbeauty-preview-')),filename=path.join(dir,'platform-preview.sqlite');let store;
 try{assert.throws(()=>openStore({filename:':memory:',fixturePreview:true}));store=openStore({filename,fixturePreview:true,clock:()=>now});const seeded=initializeFixtureRuntime(store),d=store.read();assert.equal(seeded.solo,40);assert.equal(d.fixtureRuntime,'server-preview-v1');assert.equal(d.organizations.filter(o=>o.kind==='solo').length,40);const count=d.clients.length;assert.equal(initializeFixtureRuntime(store).created,false);assert.equal(store.read().clients.length,count);store.close();store=null;assert.throws(()=>openStore({filename}),/cannot be opened as real/);store=openStore({filename,fixturePreview:true,clock:()=>now});assert.equal(initializeFixtureRuntime(store).created,false);assert.equal(store.read().clients.length,count);}
 finally{store?.close();const full=path.resolve(dir);assert.ok(full.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(full).startsWith('madbeauty-preview-'));rmSync(full,{recursive:true,force:true,maxRetries:10,retryDelay:50});}
});
test('same server auth and transactional booking work with fictional catalogue and newly registered account',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'madbeauty-preview-')),store=openStore({filename:path.join(dir,'platform-preview.sqlite'),fixturePreview:true,clock:()=>now});
 try{initializeFixtureRuntime(store);const auth=createAuth(store),api=createPlatform(store),login=email=>{const s=auth.session(null),c=auth.start(s,email,'test');return auth.verify(s,c.challengeId,store.capture(c.challengeId).code,'test').user;},user=login('fresh-preview@example.com'),owner=login('demo-provider-0@example.com'),s=api.catalog().find(s=>s.organizationId==='demo-org-0'),input={providerServiceId:s.id,addons:[],dayOffset:1,from:1020,to:1200},slot=api.availability(input).slots[0];assert.ok(slot);const h=api.hold(user,slot),b=api.confirm(user,{holdId:h.id,name:'Naujas klientas',idempotencyKey:'preview-once'});assert.equal(api.workspace(owner,{role:'professional',organizationId:'demo-org-0'}).bookings.find(x=>x.id===b.id).clientId,user.id);assert.equal(login('fresh-preview@example.com').id,user.id);assert.ok(!api.availability(input).slots.some(s=>s.startAt===slot.startAt));assert.equal(store.db.prepare('SELECT count(*) AS n FROM mail_outbox WHERE booking_id=?').get(b.id).n,1);assert.equal(api.workspace(user,{role:'customer'}).bookings.length,1);}
 finally{store.close();const full=path.resolve(dir);assert.ok(full.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(full).startsWith('madbeauty-preview-'));rmSync(full,{recursive:true,force:true,maxRetries:10,retryDelay:50});}
});
