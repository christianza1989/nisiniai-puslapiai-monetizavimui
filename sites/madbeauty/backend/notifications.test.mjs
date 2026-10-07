import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openStore} from './store.mjs';
import {createAuth} from './auth.mjs';
import {createPlatform} from './platform.mjs';
import {reminderValid,nextReminderAt} from './notifications.mjs';
function fixture(filename=':memory:'){
 let now=Date.parse('2026-10-07T06:00:00Z'),store,api;
 const reopen=()=>{store=openStore({filename,clock:()=>now,secret:'isolated-reminder-only-'.repeat(3)});api=createPlatform(store);};reopen();
 const auth=createAuth(store),s=auth.session(null),c=auth.start(s,'reminder@example.com','127.0.0.1'),user=auth.verify(s,c.challengeId,store.capture(c.challengeId).code,'127.0.0.1').user;
 const org=api.createOrganization(user,{name:'Reminder fixture',bio:'Controlled clock acceptance.',city:'Vilnius',kind:'solo'}),scope={role:'professional',organizationId:org.id},w=api.workspace(user,scope),service=api.createService(user,{organizationId:org.id,practitionerId:w.practitioners[0].id,resourceId:w.resources[0].id,taxonomyServiceId:'manikiuras',label:'Isolated appointment',durationMin:60,priceMinor:2500});
 const rev=api.submitRevision(user,{scope,name:org.name,bio:org.bio});api.moderate({...user,operator:true},{id:rev.id,state:'approved'});
 const candidate=api.availability({providerServiceId:service.id,dayOffset:2,from:600,to:660}).slots[0],hold=api.hold(user,candidate),booking=api.confirm(user,{holdId:hold.id,name:'Test client',idempotencyKey:'reminder-confirm'});
 return {user,booking,scope,get store(){return store;},get api(){return api;},at:value=>{now=value;},restart:()=>{store.close();reopen();},close:()=>store.close()};
}
const reminders=f=>f.store.db.prepare("SELECT * FROM mail_outbox WHERE type='reminder'").all();
test('Reminder due boundary is durable and idempotent; reschedule replaces the time and canceled/pref-disabled reminders are invalidated',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'madbeauty-reminder-')),f=fixture(path.join(dir,'platform.sqlite'));
 try{
  const due=Date.parse(f.booking.startAt)-86400000;assert.equal(nextReminderAt(f.store),due);f.at(due-1);f.api.runAutomation();assert.equal(reminders(f).length,0);
  f.restart();f.at(due);f.api.runAutomation();f.api.runAutomation();assert.equal(reminders(f).length,1);let row=reminders(f)[0];assert.ok(reminderValid(f.store,row,JSON.parse(row.payload)));
  f.api.preferences(f.user,{service:false,marketing:false});assert.equal(reminderValid(f.store,row,JSON.parse(row.payload)),false);
  f.api.preferences(f.user,{service:true,marketing:false,reminderLeadMin:120});assert.equal(reminders(f).length,1);
  const dateKey=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Vilnius',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(f.booking.startAt)),c=f.api.availability({providerServiceId:f.booking.providerServiceId,dateKey,from:900,to:960,ignoreBookingId:f.booking.id,scope:{role:'customer'}},f.user).slots[0];assert.ok(c);
  const b=f.api.changeBooking(f.user,{scope:{role:'customer'},id:f.booking.id,version:1,candidate:c});const next=Date.parse(b.startAt)-120*60000;assert.equal(nextReminderAt(f.store),next);
  f.at(next);f.api.runAutomation();assert.equal(reminders(f).length,2);row=reminders(f)[1];assert.equal(JSON.parse(row.payload).startAt,b.startAt);assert.ok(reminderValid(f.store,row,JSON.parse(row.payload)));
  f.api.cancelBooking(f.user,{scope:{role:'customer'},id:b.id,version:b.version,reason:'Acceptance'});assert.equal(reminderValid(f.store,row,JSON.parse(row.payload)),false);f.api.runAutomation();assert.equal(reminders(f).length,2);
 }finally{f.close();rmSync(dir,{recursive:true,force:true});}
});
test('Late alarms and appointments created after reminder time do not send a catch-up burst; invalid lead rejected',()=>{
 const f=fixture();try{
  const due=Date.parse(f.booking.startAt)-86400000;f.at(due+31*60000);f.api.runAutomation();assert.equal(reminders(f).length,0);
  const c=f.api.availability({providerServiceId:f.booking.providerServiceId,dayOffset:0,from:1020,to:1080}).slots[0],h=f.api.hold(f.user,c),late=f.api.confirm(f.user,{holdId:h.id,name:'Late appointment',idempotencyKey:'late-reminder'});assert.equal(f.store.db.prepare('SELECT state FROM notification_jobs WHERE booking_id=?').get(late.id).state,'missed');assert.equal(reminders(f).length,0);
  f.api.preferences(f.user,{service:true,marketing:false,reminderLeadMin:0});assert.equal(nextReminderAt(f.store),null);
  assert.throws(()=>f.api.preferences(f.user,{service:true,marketing:false,reminderLeadMin:10}),e=>e.code==='INVALID_INPUT');
 }finally{f.close();}
});
test('State persistence failure rolls back reminder queue and outbox together',()=>{
 const f=fixture();try{
  f.at(Date.parse(f.booking.startAt)-86400000);const write=f.store.writeOrganization;f.store.writeOrganization=()=>{throw Error('Isolated persistence failure');};assert.throws(()=>f.api.runAutomation(),/persistence failure/);assert.equal(reminders(f).length,0);assert.equal(f.store.db.prepare('SELECT state FROM notification_jobs WHERE booking_id=?').get(f.booking.id).state,'planned');
  f.store.writeOrganization=write;f.api.runAutomation();assert.equal(reminders(f).length,1);
 }finally{f.close();}
});
