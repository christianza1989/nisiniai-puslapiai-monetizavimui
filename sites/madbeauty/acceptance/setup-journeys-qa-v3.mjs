import {openStore} from '../backend/store.mjs';
import {createPlatform} from '../backend/platform.mjs';
import path from 'node:path';
import {writeFile} from 'node:fs/promises';

// Setup only: a controlled past clock supplies ended visits for the actual current-time browser completion/review journey.
const fixtureNow='2026-10-05T04:00:00.000Z';
const store=openStore({filename:path.resolve(import.meta.dirname,'../runtime/platform-preview.sqlite'),fixturePreview:true,clock:()=>Date.parse(fixtureNow)});
try{
 const api=createPlatform(store);
 const owner=store.db.prepare('SELECT id,email,name FROM accounts WHERE site_id=? AND email=?').get('madbeauty','madbeauty-provider-first-v1@example.com');
 const client=store.db.prepare('SELECT id,email,name FROM accounts WHERE site_id=? AND email=?').get('madbeauty','calendar-uiux-0@example.com');
 const org=api.session(owner).organizations.find(o=>o.name==='Kalendoriaus priėmimo QA');
 const solo=api.session(owner).organizations.find(o=>o.name==='Vietinė QA darbo vieta');
 if(!owner||!client||!org||!solo)throw Error('Existing named QA identities missing');
 const scope={role:'professional',organizationId:org.id};
 const workspace=api.workspace(owner,scope),service=workspace.services.find(s=>s.label==='15 min. QA procedūra A');
 const visits=[];
 for(const [index,from]of [600,630].entries()){
  const key='uiux-v3-ended-review-'+index;
  const existing=api.workspace(owner,scope).bookings.find(b=>b.idempotencyKey===key||b.clientId===client.id&&b.startAt?.startsWith('2026-10-05')&&b.from===from);
  if(existing){visits.push(existing);continue;}
  const candidate=api.availability({scope,providerServiceId:service.id,dayOffset:0,from,to:from+15,addons:[]},owner).slots[0];
  if(!candidate)throw Error('Past setup availability missing');
  visits.push(api.manualVisit(owner,{scope,clientId:client.id,candidate,idempotencyKey:key}));
 }
 let revision=store.read().revisions.find(r=>r.organizationId===solo.id&&r.state==='pending');
 if(!revision)revision=api.submitRevision(owner,{scope:{role:'professional',organizationId:solo.id},name:solo.name,bio:solo.bio});
 const result={at:new Date().toISOString(),mode:'private preview database; setup through actual business methods, not browser completion proof',fixtureNow,organizationId:org.id,soloOrganizationId:solo.id,soloRevisionId:revision.id,clientId:client.id,bookings:visits.map(({id,startAt,endAt,status,version})=>({id,startAt,endAt,status,version})),liveDelivery:false};
 await writeFile(path.resolve('research/madbeauty-implementation/uiux-journey-fixture-v3.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));
}finally{store.close();}
