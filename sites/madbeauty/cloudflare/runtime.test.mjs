import {articleFixture,signFixture} from '../content-foundation-20261006/fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const core=path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting');
const {build}=await import(pathToFileURL(path.join(core,'node_modules/esbuild/lib/main.js')));
const {Miniflare}=await import(pathToFileURL(path.join(core,'node_modules/miniflare/dist/src/index.js')));
const bundle=await build({entryPoints:[path.join(import.meta.dirname,'worker.mjs')],write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text','.html':'text'}});
const script=bundle.outputFiles[0].text,origin='https://madbeauty.test';

test('The candidate production binding preserves the existing source namespace, session and booking while the real exported organization class activates after an explicit handoff',async()=>{
 const config=JSON.parse(await readFile(new URL('./wrangler.production.json',import.meta.url),'utf8'));
 assert.deepEqual(config.migrations[0],{tag:'v1',new_sqlite_classes:['MadbeautyPlatform']});assert.equal(config.migrations.length,2);assert.deepEqual(config.migrations[1],{tag:'v2-organization-storage',new_sqlite_classes:['MadbeautyOrganizationStaging']});assert.equal(config.name,'madbeauty-platform-preview');assert.equal(config.account_id,'d102163f74a45ab6d33bca786ce281ec');
 const bindings=Object.fromEntries(config.durable_objects.bindings.map(b=>[b.name,{className:b.class_name,useSQLite:true}]));assert.deepEqual(bindings.PLATFORM,{className:'MadbeautyPlatform',useSQLite:true});assert.deepEqual(bindings.ORGANIZATION_STAGING,{className:'MadbeautyOrganizationStaging',useSQLite:true});
 const f=await fixture();try{
  const owner=f.browser(),operator=f.browser(),client=f.browser(),ownerUser=await owner.login('binding-owner@example.com'),operatorUser=await operator.login('operator@example.com');await client.login('binding-client@example.com');
  const rpc=async(browser,method,input)=>{const response=await browser.rpc(method,input);assert.equal(response.status,200,method+': '+JSON.stringify(response.value));return response.value.result;},org=await rpc(owner,'createOrganization',{name:'Isolated binding upgrade',bio:'Existing source data must survive.',kind:'solo',city:'Vilnius'}),scope={role:'professional',organizationId:org.id},workspace=await rpc(owner,'workspace',scope),service=await rpc(owner,'createService',{organizationId:org.id,practitionerId:workspace.practitioners[0].id,resourceId:workspace.resources[0].id,taxonomyServiceId:'manikiuras',label:'Existing binding service',priceMinor:2500,durationMin:60}),revision=await rpc(owner,'submitRevision',{scope,name:org.name,bio:org.bio});await rpc(operator,'moderate',{id:revision.id,state:'approved'});
  let candidate;for(let dayOffset=1;dayOffset<8;dayOffset++){candidate=(await rpc(client,'availability',{providerServiceId:service.id,dayOffset,from:900,to:1200})).slots[0];if(candidate)break;}assert.ok(candidate);const hold=await rpc(client,'hold',candidate),booking=await rpc(client,'confirm',{holdId:hold.id,name:'Isolated binding client',idempotencyKey:'binding-original-booking'});
  let sourceNamespace=await f.mf.getDurableObjectNamespace('PLATFORM');const originalObjectId=sourceNamespace.idFromName('madbeauty-pilot-v1').toString();await f.restart(bindings);sourceNamespace=await f.mf.getDurableObjectNamespace('PLATFORM');assert.equal(sourceNamespace.idFromName('madbeauty-pilot-v1').toString(),originalObjectId);assert.equal((await owner.send('session')).value.user.id,ownerUser.id);assert.equal((await rpc(client,'workspace',{role:'customer'})).bookings[0].id,booking.id);
  let source=sourceNamespace.get(sourceNamespace.idFromName('madbeauty-pilot-v1'));const targetNamespace=await f.mf.getDurableObjectNamespace('ORGANIZATION_STAGING'),targetName='madbeauty:organization:v1:'+org.id,target=targetNamespace.get(targetNamespace.idFromName(targetName));assert.equal((await target.stagingStatus()).state,'empty');
  const frozen=await source.freezeOrganization({operatorAccountId:operatorUser.id,organizationId:org.id,epoch:0,requestKey:'binding-explicit-handoff'}),control={operatorAccountId:operatorUser.id,organizationId:org.id,epoch:frozen.epoch,handoffId:frozen.handoffId};let offset=0;for(;;){const page=await source.organizationHandoffPage({...control,offset});await target.stage(page);if(page.done)break;offset=page.nextOffset;}const receipt=await target.prepareAuthority(await source.organizationHandoffContext(control));await target.activateAuthority(await source.sealOrganizationHandoff({...control,targetReceipt:receipt}));
  assert.equal((await rpc(owner,'workspace',scope)).bookings[0].id,booking.id);assert.equal((await rpc(client,'workspace',{role:'customer'})).bookings[0].id,booking.id);await f.restart(bindings);assert.equal((await owner.send('session')).value.user.id,ownerUser.id);assert.equal((await rpc(owner,'workspace',scope)).bookings[0].id,booking.id);assert.equal((await rpc(client,'workspace',{role:'customer'})).bookings[0].id,booking.id);
 }finally{await f.close();}
});

test('Workers reviewed service-linked gallery and staff portrait retain exact snapshot and public/private image access after SQL restart',async()=>{
 const f=await fixture();try{
  const owner=f.browser(),operator=f.browser(),guest=f.browser();await owner.login('gallery-worker-owner@example.com');await operator.login('operator@example.com');await guest.send('session');
  const rpc=async(b,m,i)=>{const r=await b.rpc(m,i);assert.equal(r.status,200,m+': '+JSON.stringify(r.value));return r.value.result;},org=await rpc(owner,'createOrganization',{name:'Gallery Workers fixture',bio:'Reviewed service-linked image.',city:'Vilnius',kind:'solo'}),scope={role:'professional',organizationId:org.id},w=await rpc(owner,'workspace',scope),service=await rpc(owner,'createService',{organizationId:org.id,practitionerId:w.practitioners[0].id,resourceId:w.resources[0].id,taxonomyServiceId:'manikiuras',label:'Gallery variant',durationMin:60,priceMinor:2500});
  const require=createRequire(path.resolve(import.meta.dirname,'../../../content-studio/package.json')),{default:sharp}=await import(pathToFileURL(require.resolve('sharp'))),bytes=await sharp({create:{width:32,height:48,channels:3,background:'#c978a2'}}).png().toBuffer(),work=await owner.upload(bytes,org.id),portrait=await owner.upload(bytes,org.id,'image/png','portrait');assert.equal(work.status,200);assert.equal(portrait.status,200);const a=work.value.result,z=portrait.value.result;
  let current=await rpc(owner,'workspace',scope);assert.ok(current.media[0].rightsConfirmedAt);const value={organizationId:org.id,version:current.organizations[0].version,galleryEntries:[{mediaId:a.id,providerServiceId:service.id,caption:'Reviewed isolated fixture work'}],staffPortraits:[{practitionerId:w.practitioners[0].id,mediaId:z.id}],avatarImageId:null};assert.equal((await guest.rpc('saveGallery',value)).status,401);await rpc(owner,'saveGallery',value);assert.equal((await guest.image(a.variants[0].file)).status,404);assert.equal((await guest.image(z.variants[0].file)).status,404);const rev=await rpc(owner,'submitRevision',{scope,name:org.name,bio:org.bio});await rpc(operator,'moderate',{id:rev.id,state:'approved'});let p=await rpc(guest,'profile',{id:org.id});assert.equal(p.works[0].serviceLabel,'Gallery variant');assert.equal(p.practitioners[0].avatarImageId,z.id);assert.equal((await guest.image(z.variants[0].file)).status,200);assert.ok(!JSON.stringify(p).includes('rightsConfirmedBy'));let row=(await rpc(guest,'catalog',{}))[0];assert.equal(row.coverImageId,a.id);assert.deepEqual(row.media.map(m=>m.id),[a.id]);assert.ok(!JSON.stringify(row).includes('rightsConfirmedBy'));assert.ok(!JSON.stringify(row).includes('original'));
  await f.restart();p=await rpc(guest,'profile',{id:org.id});assert.equal(p.works[0].caption,'Reviewed isolated fixture work');assert.equal(p.practitioners[0].avatarImageId,z.id);current=await rpc(owner,'workspace',scope);await rpc(owner,'saveGallery',{...value,version:current.organizations[0].version,galleryEntries:[],staffPortraits:[]});assert.equal((await guest.image(z.variants[0].file)).status,200);const next=await rpc(owner,'submitRevision',{scope,name:org.name,bio:org.bio});await rpc(operator,'moderate',{id:next.id,state:'approved'});assert.equal((await guest.image(a.variants[0].file)).status,404);assert.equal((await guest.image(z.variants[0].file)).status,404);assert.equal((await owner.image(z.variants[0].file)).status,200);row=(await rpc(guest,'catalog',{}))[0];assert.equal(row.coverImageId,null);assert.deepEqual(row.media,[]);
 }finally{await f.close();}
});

test('Workers report decisions withdraw public media immediately, preserve private source and journal through SQL restart',async()=>{
 const f=await fixture({RELEASE_MODE:'production'});try{
  const owner=f.browser(),operator=f.browser(),client=f.browser(),guest=f.browser();for(const [b,email] of [[owner,'report-worker-owner@example.com'],[operator,'operator@example.com'],[client,'report-worker-client@example.com']])await b.login(email);await guest.send('session');
  const rpc=async(b,m,i)=>{const r=await b.rpc(m,i);assert.equal(r.status,200,m+': '+JSON.stringify(r.value));return r.value.result;};
  const org=await rpc(owner,'createOrganization',{name:'Report Workers fixture',bio:'Isolated public media withdrawal.',city:'Vilnius',kind:'solo'}),scope={role:'professional',organizationId:org.id},w=await rpc(owner,'workspace',scope);await rpc(owner,'createService',{organizationId:org.id,practitionerId:w.practitioners[0].id,resourceId:w.resources[0].id,taxonomyServiceId:'manikiuras',label:'Report service',durationMin:60,priceMinor:2500});
  const require=createRequire(path.resolve(import.meta.dirname,'../../../content-studio/package.json')),{default:sharp}=await import(pathToFileURL(require.resolve('sharp'))),bytes=await sharp({create:{width:32,height:48,channels:3,background:'#ab4578'}}).png().toBuffer(),uploaded=await owner.upload(bytes,org.id);assert.equal(uploaded.status,200);const a=uploaded.value.result,file=a.variants[0].file;
  assert.equal((await client.rpc('report',{target:a.id,note:'Private target not allowed'})).status,404);const rev=await rpc(owner,'submitRevision',{scope,name:org.name,bio:org.bio});await rpc(operator,'moderate',{id:rev.id,state:'approved'});assert.equal((await guest.image(file)).status,200);
  const old=await rpc(owner,'submitRevision',{scope,name:org.name,bio:org.bio}),r=await rpc(client,'report',{target:a.id,note:'Isolated media report',idempotencyKey:'worker-report'});assert.equal((await rpc(client,'report',{target:a.id,note:r.note,idempotencyKey:'worker-report'})).id,r.id);assert.equal((await owner.rpc('reviewReport',{id:r.id,version:r.version,state:'resolved',action:'hide-media',reason:'Owner cannot moderate'})).status,403);
  const reviewed=await rpc(operator,'reviewReport',{id:r.id,version:r.version,state:'resolved',action:'hide-media',reason:'Isolated media rights decision'});assert.equal((await guest.image(file)).status,404);assert.equal((await owner.image(file)).status,200);assert.equal((await rpc(guest,'profile',{id:org.id})).gallery.length,0);assert.equal((await rpc(guest,'catalog',{}))[0].coverImageId,null);assert.deepEqual((await rpc(guest,'catalog',{}))[0].media,[]);assert.equal((await operator.rpc('moderate',{id:old.id,state:'approved'})).value.error.code,'MEDIA_RESTRICTED');assert.equal((await client.rpc('edit',{scope:{role:'customer'},table:'reports',id:r.id,version:reviewed.version,values:{status:'new'}})).status,400);
  await f.restart();assert.equal((await guest.image(file)).status,404);const mine=await rpc(client,'workspace',{role:'customer'});assert.equal(mine.reports[0].id,r.id);assert.equal(mine.reports[0].actions.at(-1).actorId,undefined);const queue=await rpc(operator,'workspace',{role:'operator'});assert.equal(queue.reports[0].actions.at(-1).reason,'Isolated media rights decision');assert.equal((await operator.rpc('reviewReport',{id:r.id,version:r.version,state:'triage',action:'record-only',reason:'Stale'})).status,409);
 }finally{await f.close();}
});

test('Workers organization rules prevent a stale confirmation and protect future visits; scoped CSV has attachment/privacy/formula boundaries after restart',async()=>{
 const f=await fixture();try{
  const owner=f.browser(),client=f.browser(),other=f.browser(),operator=f.browser();for(const [b,email] of [[owner,'operations-worker-owner@example.com'],[client,'operations-worker-client@example.com'],[other,'operations-worker-other@example.com'],[operator,'operator@example.com']])await b.login(email);
  const rpc=async(b,m,i)=>{const r=await b.rpc(m,i);assert.equal(r.status,200,m+': '+JSON.stringify(r.value));return r.value.result;},org=await rpc(owner,'createOrganization',{name:'Operations Worker',bio:'Closure and scoped CSV.',kind:'solo',city:'Vilnius'}),scope={role:'professional',organizationId:org.id},w=await rpc(owner,'workspace',scope),service=await rpc(owner,'createService',{organizationId:org.id,practitionerId:w.practitioners[0].id,resourceId:w.resources[0].id,taxonomyServiceId:'kirpimas',label:'=Worker formula',durationMin:60,priceMinor:2500}),rev=await rpc(owner,'submitRevision',{scope,name:org.name,bio:org.bio});await rpc(operator,'moderate',{id:rev.id,state:'approved'});
  let c;for(let dayOffset=1;dayOffset<8&&!c;dayOffset++)c=(await rpc(client,'availability',{providerServiceId:service.id,dayOffset,from:900,to:1200})).slots[0];const h=await rpc(client,'hold',c),rules={organizationId:org.id,version:(await rpc(owner,'workspace',scope)).organizations[0].version,minLeadTimeMin:60,maxAdvanceDays:30,weekdays:['Mon','Tue','Wed','Thu','Fri'],closedDates:[c.dateKey]};assert.equal((await other.rpc('saveBookingRules',rules)).status,403);let o=await rpc(owner,'saveBookingRules',rules);assert.equal((await client.rpc('confirm',{holdId:h.id,name:'Closed',idempotencyKey:'closed'})).status,409);await rpc(client,'releaseHold',{id:h.id});o=await rpc(owner,'saveBookingRules',{...rules,version:o.version,closedDates:[]});
  const fresh=(await rpc(client,'availability',{providerServiceId:service.id,dateKey:c.dateKey,from:900,to:1200})).slots[0],hold=await rpc(client,'hold',fresh),booking=await rpc(client,'confirm',{holdId:hold.id,name:'CSV client',idempotencyKey:'csv-confirm'});assert.equal((await owner.rpc('saveBookingRules',{...rules,version:o.version})).status,409);await f.restart();const input={organizationId:org.id,from:c.dateKey,to:c.dateKey},report=await rpc(owner,'organizationReport',input);assert.equal(report.statuses.find(s=>s.status==='confirmed').serviceValueMinor,2500);assert.equal(report.visits[0].id,booking.id);assert.equal(report.occupancy.reservedMin,60);assert.equal((await other.rpc('organizationReport',input)).status,403);
  const endpoint='organization-report.csv?'+new URLSearchParams(input),file=await owner.file(endpoint);assert.equal(file.status,200);assert.equal(file.headers.get('cache-control'),'no-store');assert.match(file.headers.get('content-disposition'),/attachment/);const csv=await file.text();assert.match(csv,/"'=Worker formula"/);assert.doesNotMatch(csv,/operations-worker-client@example.com|CSV client/);assert.equal((await other.file(endpoint)).status,403);
 }finally{await f.close();}
});

test('Workers rebooking and private client cards survive SQL restart; data export needs fresh verified email and erasure remains an audited request',async()=>{
 const f=await fixture();try{
  const owner=f.browser(),client=f.browser(),other=f.browser(),operator=f.browser();for(const [b,email] of [[owner,'customer-worker-owner@example.com'],[client,'customer-worker-client@example.com'],[other,'customer-worker-other@example.com'],[operator,'operator@example.com']])await b.login(email);
  const rpc=async(b,m,i)=>{const r=await b.rpc(m,i);assert.equal(r.status,200,m+': '+JSON.stringify(r.value));return r.value.result;};
  const org=await rpc(owner,'createOrganization',{name:'Client card Worker fixture',bio:'Rebooking and private records.',kind:'solo',city:'Vilnius'}),scope={role:'professional',organizationId:org.id},w=await rpc(owner,'workspace',scope),service=await rpc(owner,'createService',{organizationId:org.id,practitionerId:w.practitioners[0].id,resourceId:w.resources[0].id,taxonomyServiceId:'manikiuras',label:'Repeat service',durationMin:60,priceMinor:2500}),rev=await rpc(owner,'submitRevision',{scope,name:org.name,bio:org.bio});await rpc(operator,'moderate',{id:rev.id,state:'approved'});
  let c;for(let dayOffset=1;dayOffset<8&&!c;dayOffset++)c=(await rpc(client,'availability',{providerServiceId:service.id,dayOffset,from:900,to:1200})).slots[0];assert.ok(c);const h=await rpc(client,'hold',c),booking=await rpc(client,'confirm',{holdId:h.id,name:'Private card client',idempotencyKey:'repeat-worker'});
  const card=await rpc(owner,'saveClientCard',{organizationId:org.id,clientId:booking.clientId,name:'Local display name',note:'Isolated contact preference.',version:0});assert.equal((await other.rpc('saveClientCard',{organizationId:org.id,clientId:booking.clientId,name:'Denied',note:'',version:0})).status,403);
  await rpc(owner,'edit',{scope,table:'services',id:service.id,version:1,values:{priceMinor:3100}});const re=await rpc(client,'rebooking',{id:booking.id});assert.equal(re.priceMinor,3100);assert.equal(re.changes[0].previous.priceMinor,2500);assert.equal((await other.rpc('rebooking',{id:booking.id})).status,403);
  const exported=await client.rpc('exportCustomer');assert.equal(exported.status,200);assert.equal(exported.value.result.organizationCards[0].id,card.id);const attachment=await client.send('customer-data');assert.equal(attachment.status,200);assert.equal(attachment.value.bookings[0].id,booking.id);assert.equal((await other.send('customer-data')).value.bookings.length,0);assert.equal((await client.send('customer-data',undefined,{headers:{'sec-fetch-site':'cross-site'}})).status,403);const req=await rpc(client,'requestErasure',{confirmEmail:'customer-worker-client@example.com'});assert.equal((await owner.rpc('erasureCase',{id:req.id})).status,403);const reviewed=await rpc(operator,'reviewErasure',{id:req.id,version:req.version,state:'retention-review',reason:'Awaiting factual retention decision.',retentionBasis:'Isolated fixture; live policy unverified.'});assert.equal((await rpc(operator,'erasureCase',{id:req.id})).executionEnabled,false);
  await f.restart();assert.equal((await rpc(owner,'workspace',scope)).clientCards[0].id,card.id);assert.equal((await rpc(client,'workspace',{role:'customer'})).dataRequests[0].version,reviewed.version);assert.equal((await rpc(client,'workspace',{role:'customer'})).bookings[0].priceMinor,2500);
  const replay=await rpc(client,'requestErasure',{confirmEmail:'customer-worker-client@example.com'});assert.equal(replay.id,req.id);assert.equal(replay.version,reviewed.version);assert.equal(replay.actions,undefined);const audit=await rpc(operator,'erasureCase',{id:req.id});assert.equal(audit.actions.length,2);assert.ok(audit.actions[1].actorId);await rpc(client,'withdrawErasure',{id:req.id,version:reviewed.version});
 }finally{await f.close();}
});

test('Workers cancellation offers a finite waitlist slot; concurrent clients cannot claim it twice and explicit confirmation survives SQL restart',async()=>{
 const f=await fixture();try{
  const owner=f.browser(),operator=f.browser(),one=f.browser(),two=f.browser();for(const [b,email] of [[owner,'waitlist-worker-owner@example.com'],[operator,'operator@example.com'],[one,'waitlist-worker-one@example.com'],[two,'waitlist-worker-two@example.com']])await b.login(email);
  const rpc=async(b,m,i)=>{const r=await b.rpc(m,i);assert.equal(r.status,200,m+': '+JSON.stringify(r.value));return r.value.result;};
  const org=await rpc(owner,'createOrganization',{name:'Waitlist Workers fixture',bio:'Atomic waitlist acceptance.',kind:'solo',city:'Vilnius'}),scope={role:'professional',organizationId:org.id},w=await rpc(owner,'workspace',scope),service=await rpc(owner,'createService',{organizationId:org.id,practitionerId:w.practitioners[0].id,resourceId:w.resources[0].id,taxonomyServiceId:'manikiuras',label:'Waitlist service',durationMin:60,priceMinor:2500}),rev=await rpc(owner,'submitRevision',{scope,name:org.name,bio:org.bio});await rpc(operator,'moderate',{id:rev.id,state:'approved'});
  let c;for(let dayOffset=1;dayOffset<8&&!c;dayOffset++)c=(await rpc(one,'availability',{providerServiceId:service.id,dayOffset,from:900,to:1200})).slots[0];assert.ok(c);
  const h=await rpc(owner,'hold',c),blocked=await rpc(owner,'confirm',{holdId:h.id,name:'Blocking client',idempotencyKey:'blocked-wl'}),minutes=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Vilnius',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(c.startAt)).split(':').map(Number),from=minutes[0]*60+minutes[1],input={organizationId:org.id,providerServiceId:service.id,practitionerId:c.practitionerId,dateKey:c.dateKey,from,to:from+60,addons:[],note:'Controlled exact interval'};
  const a=await rpc(one,'createWaitlist',{...input,idempotencyKey:'wl-one'}),z=await rpc(two,'createWaitlist',{...input,idempotencyKey:'wl-two'});assert.equal(a.state,'waiting');assert.equal(z.state,'waiting');assert.equal((await two.rpc('closeWaitlist',{id:a.id,version:a.version})).status,403);
  await rpc(owner,'cancelBooking',{scope:{role:'customer'},id:blocked.id,version:blocked.version,reason:'Release fixture'});const first=(await rpc(one,'workspace',{role:'customer'})).waitlist[0],second=(await rpc(two,'workspace',{role:'customer'})).waitlist[0];assert.equal(first.state,'offered');assert.equal(second.state,'offered');assert.equal(Date.parse(first.offer.expiresAt)-Date.parse(first.offer.candidate.snapshotAt),900000);
  const ns=await f.mf.getDurableObjectNamespace('PLATFORM');await ns.get(ns.idFromName('madbeauty-pilot-v1')).drain();const offers=f.mails.filter(m=>m.subject==='Madbeauty laiko pasiūlymas');assert.equal(offers.length,2);assert.ok(offers.every(m=>m.text.includes('ne rezervacija')&&!m.text.includes('undefined')));
  const inputFor=w=>({id:w.id,version:w.version,offerId:w.offer.id}),race=await Promise.all([one.rpc('acceptWaitlist',inputFor(first)),two.rpc('acceptWaitlist',inputFor(second))]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);const winner=race[0].status===200?one:two,claim=race.find(r=>r.status===200).value.result;
  assert.equal((await rpc(winner,'workspace',{role:'customer'})).bookings.length,0);const booked=await rpc(winner,'confirm',{holdId:claim.hold.id,name:'Explicit waitlist customer',idempotencyKey:'wl-confirm'});await f.restart();const saved=await rpc(winner,'workspace',{role:'customer'});assert.equal(saved.bookings[0].id,booked.id);assert.equal(saved.waitlist[0].state,'closed');assert.equal(saved.waitlist[0].bookingId,booked.id);
 }finally{await f.close();}
});

test('Workers reminder jobs survive restart, enqueue once at the controlled boundary, suppress changed bookings and stay outside browser RPC',async()=>{
 const clockBindings={ISOLATED_CLOCK:Date.parse('2026-10-07T06:00:00Z')};
 const controlled=await build({entryPoints:[path.join(import.meta.dirname,'worker.mjs')],write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text','.html':'text'},plugins:[{name:'isolated-reminder-clock',setup(b){b.onLoad({filter:/cloudflare[\\/]platform-object\.mjs$/},async a=>({contents:(await readFile(a.path,'utf8')).replaceAll('Date.now()','this.store.clock()').replace('openDurableStore(ctx,env.SESSION_SECRET,storeOptions)','openDurableStore(ctx,env.SESSION_SECRET,{...storeOptions,clock:()=>Number(env.ISOLATED_CLOCK)})').replace(' async fetch(request){',` async acceptanceAutomation(){createPlatform(this.store).runAutomation();await this.drain();return this.store.db.prepare("SELECT id,state,outbox_id FROM notification_jobs WHERE site_id=?").all(this.store.siteId);}\n async fetch(request){`),loader:'js'}));}}]});
 const f=await fixture(clockBindings,controlled.outputFiles[0].text);try{
  const owner=f.browser(),client=f.browser(),operator=f.browser();for(const [b,email] of [[owner,'reminder-worker-owner@example.com'],[client,'reminder-worker-client@example.com'],[operator,'operator@example.com']])await b.login(email);
  const rpc=async(b,m,i)=>{const r=await b.rpc(m,i);assert.equal(r.status,200,m+': '+JSON.stringify(r.value));return r.value.result;};
  const org=await rpc(owner,'createOrganization',{name:'Reminder acceptance',bio:'Controlled Workers clock.',city:'Vilnius',kind:'solo'}),scope={role:'professional',organizationId:org.id},w=await rpc(owner,'workspace',scope),service=await rpc(owner,'createService',{organizationId:org.id,practitionerId:w.practitioners[0].id,resourceId:w.resources[0].id,taxonomyServiceId:'manikiuras',label:'Reminder appointment',durationMin:60,priceMinor:2500});
  const rev=await rpc(owner,'submitRevision',{scope,name:org.name,bio:org.bio});await rpc(operator,'moderate',{id:rev.id,state:'approved'});
  const c=(await rpc(client,'availability',{providerServiceId:service.id,dayOffset:2,from:600,to:660})).slots[0],h=await rpc(client,'hold',c),booking=await rpc(client,'confirm',{holdId:h.id,name:'Reminder test client',idempotencyKey:'worker-reminder'});
  assert.equal((await client.rpc('runAutomation',{})).status,404);
  clockBindings.ISOLATED_CLOCK=Date.parse(booking.startAt)-86400000-1;await f.restart();let ns=await f.mf.getDurableObjectNamespace('PLATFORM'),stub=ns.get(ns.idFromName('madbeauty-pilot-v1'));await stub.acceptanceAutomation();assert.equal(f.mails.filter(m=>m.subject==='Madbeauty priminimas apie vizitą').length,0);
  clockBindings.ISOLATED_CLOCK++;await f.restart();ns=await f.mf.getDurableObjectNamespace('PLATFORM');stub=ns.get(ns.idFromName('madbeauty-pilot-v1'));const jobs=await stub.acceptanceAutomation();await stub.acceptanceAutomation();assert.equal(jobs.filter(j=>j.state==='queued').length,1);assert.equal(f.mails.filter(m=>m.subject==='Madbeauty priminimas apie vizitą').length,1);
  await client.login('reminder-worker-client@example.com');await rpc(client,'preferences',{service:true,marketing:false,reminderLeadMin:120});await rpc(client,'cancelBooking',{scope:{role:'customer'},id:booking.id,version:booking.version,reason:'Isolated acceptance'});
  clockBindings.ISOLATED_CLOCK=Date.parse(booking.startAt)-120*60000;await f.restart();ns=await f.mf.getDurableObjectNamespace('PLATFORM');stub=ns.get(ns.idFromName('madbeauty-pilot-v1'));await stub.acceptanceAutomation();assert.equal(f.mails.filter(m=>m.subject==='Madbeauty priminimas apie vizitą').length,1);
 }finally{await f.close();}
});

test('Workers whole visit: all segment holds are atomic, one durable booking/mail, secondary staff privacy and whole reschedule',async()=>{
 const f=await fixture();try{
  const owner=f.browser(),operator=f.browser(),client=f.browser(),other=f.browser(),staff=f.browser();
  for(const [b,email] of [[owner,'visit-owner@example.com'],[operator,'operator@example.com'],[client,'visit-client@example.com'],[other,'visit-other@example.com'],[staff,'visit-staff@example.com']])await b.login(email);
  const rpc=async(b,m,i)=>{const r=await b.rpc(m,i);assert.equal(r.status,200,m+': '+JSON.stringify(r.value));return r.value.result;};
  const org=await rpc(owner,'createOrganization',{name:'Isolated whole visit',bio:'SQL acceptance fixture only.',kind:'salon',city:'Vilnius'}),scope={role:'professional',organizationId:org.id},w=await rpc(owner,'workspace',scope),p2=await rpc(owner,'createStaff',{organizationId:org.id,name:'Second visit staff'}),r2=await rpc(owner,'createResource',{organizationId:org.id,label:'Second visit resource'});
  const offers=await rpc(owner,'selectProcedures',{organizationId:org.id,procedureIds:['manikiuras-klasikinis-manikiuras','pedikiuras-klasikinis-pedikiuras'],version:0,idempotencyKey:'whole-visit-procedures'});
  const items=[];
  for(let i=0;i<2;i++){
   const id='whole-visit-variant-'+i,p=i?p2:w.practitioners[0],r=i?r2:w.resources[0];
   const draft=await rpc(owner,'saveOffer',{id:offers[i].id,version:offers[i].version,label:i?'Fixture pedicure':'Fixture manicure',variants:[{id,label:i?'Pedicure':'Manicure',priceMinor:i?2000:2500,durationMin:i?45:60,phases:i?[]:[{label:'Work',durationMin:15,staffBusy:true,resourceBusy:true},{label:'Processing',durationMin:30,staffBusy:false,resourceBusy:true},{label:'Finish',durationMin:15,staffBusy:true,resourceBusy:true}],bufferBeforeMin:5,bufferAfterMin:10,staffOptions:[{practitionerId:p.id,resourceId:r.id}]}]}),pending=await rpc(owner,'submitOffer',{id:draft.id,version:draft.version});await rpc(operator,'moderateOffer',{id:draft.id,version:pending.version,state:'approved'});items.push({providerServiceId:id,practitionerId:p.id,addons:[]});
  }
  const rev=await rpc(owner,'submitRevision',{scope,name:org.name,bio:org.bio});await rpc(operator,'moderate',{id:rev.id,state:'approved'});
  let c;for(let dayOffset=1;dayOffset<8&&!c;dayOffset++)c=(await rpc(client,'visitAvailability',{items,dayOffset,from:540,to:1200})).slots[0];assert.ok(c);assert.equal(c.segments.length,2);assert.equal(c.priceMinor,4500);assert.equal(c.durationMin,120);
  const raced=await Promise.all([client.rpc('holdVisit',c),other.rpc('holdVisit',c)]);assert.deepEqual(raced.map(r=>r.status).sort(),[200,409]);const winner=raced[0].status===200?client:other,h=raced.find(r=>r.status===200).value.result;
  const extra=await rpc(owner,'createService',{organizationId:org.id,practitionerId:w.practitioners[0].id,resourceId:r2.id,taxonomyServiceId:'manikiuras',label:'Processing overlap acceptance',durationMin:15,priceMinor:1000}),wait=c.segments[0].phases[1],parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Vilnius',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(wait.startAt)).split(':').map(Number),lo=parts[0]*60+parts[1];assert.equal(wait.staffBusy,false);assert.equal((await rpc(client,'availability',{providerServiceId:extra.id,dateKey:c.dateKey,from:lo,to:lo+15})).slots.length,1);
  const second=await rpc(owner,'availability',{providerServiceId:items[1].providerServiceId,practitionerId:p2.id,dateKey:c.dateKey,from:540,to:1200});assert.ok(!second.slots.some(s=>s.startAt===c.segments[1].startAt));
  const input={holdId:h.id,name:'Whole visit client',idempotencyKey:'one-whole-visit'},b=await rpc(winner,'confirmVisit',input);assert.equal(b.segments.length,2);assert.equal((await rpc(winner,'confirmVisit',input)).id,b.id);
  const namespace=await f.mf.getDurableObjectNamespace('PLATFORM');await namespace.get(namespace.idFromName('madbeauty-pilot-v1')).drain();assert.equal(f.mails.filter(m=>m.text.includes(b.id)).length,1);
  await f.restart();const persisted=(await rpc(winner,'workspace',{role:'customer'})).bookings[0];assert.equal(persisted.id,b.id);assert.deepEqual(persisted.segments.map(s=>s.practitionerId),items.map(i=>i.practitionerId));assert.deepEqual(persisted.segments[0].phases,b.segments[0].phases);assert.equal(persisted.segments[0].occupancies[2].practitionerId,null);assert.equal((await rpc(owner,'workspace',scope)).bookings.length,1);
  await rpc(owner,'grantMembership',{organizationId:org.id,email:'visit-staff@example.com',role:'practitioner',practitionerId:p2.id,version:0});const assigned=(await rpc(staff,'workspace',scope)).bookings[0];assert.equal(assigned.partialVisit,true);assert.equal(assigned.priceMinor,2000);assert.equal(assigned.segments.length,1);assert.ok(!JSON.stringify(assigned).includes(items[0].providerServiceId));assert.equal((await staff.rpc('cancelBooking',{scope,id:b.id,version:b.version,reason:'Forbidden partial'})).status,403);
  let next;for(let dayOffset=1;dayOffset<8&&!next;dayOffset++)next=(await rpc(winner,'visitAvailability',{items,dayOffset,from:540,to:1200,ignoreBookingId:b.id,scope:{role:'customer'}})).slots.find(x=>x.startAt!==b.startAt);assert.ok(next);
  const changed=await rpc(winner,'changeVisit',{scope:{role:'customer'},id:b.id,version:b.version,candidate:next});assert.equal(changed.id,b.id);assert.equal(changed.version,2);assert.equal(changed.segments[1].startAt,next.segments[1].startAt);
  await rpc(winner,'cancelBooking',{scope:{role:'customer'},id:b.id,version:changed.version,reason:'Fixture finished'});assert.ok((await rpc(client,'visitAvailability',{items,dateKey:next.dateKey,from:540,to:1200})).slots.some(x=>x.startAt===next.startAt));
 }finally{await f.close();}
});

test('Workers reviewed branch keeps its city, scoped resource, staff shift and confirmed address after SQL restart',async()=>{
 const f=await fixture();try{
  const owner=f.browser(),operator=f.browser(),client=f.browser();await owner.login('branch-owner@example.com');await operator.login('operator@example.com');await client.login('branch-client@example.com');
  const rpc=async(b,method,input)=>{const r=await b.rpc(method,input);assert.equal(r.status,200,method+': '+JSON.stringify(r.value));return r.value.result;};
  const org=await rpc(owner,'createOrganization',{name:'Isolated branch fixture',bio:'Not a production provider.',kind:'salon',city:'Vilnius'}),scope={role:'professional',organizationId:org.id},w=await rpc(owner,'workspace',scope),p=w.practitioners[0];
  let l=await rpc(owner,'saveLocation',{organizationId:org.id,label:'Isolated Kaunas branch',city:'Kaunas',publicAddress:'Fixture address K',openingHoursLabel:'Configured shift',latitude:54.8985,longitude:23.9036});
  assert.equal((await client.rpc('saveLocation',{organizationId:org.id,label:'Unauthorized'})).status,403);
  l=await rpc(owner,'submitLocation',{id:l.id,version:l.version});l=await rpc(operator,'moderateLocation',{id:l.id,version:l.version,state:'approved'});
  await rpc(owner,'assignStaffLocations',{id:p.id,version:p.version,locationIds:[org.locationId,l.id],transferBufferMin:30});
  const shifts=(await rpc(owner,'workspace',scope)).schedules,a=shifts.find(s=>s.locationId===org.locationId),b=shifts.find(s=>s.locationId===l.id);
  await rpc(owner,'edit',{scope,table:'schedules',id:a.id,version:a.version,values:{weekdays:['Mon']}});await rpc(owner,'edit',{scope,table:'schedules',id:b.id,version:b.version,values:{weekdays:['Tue','Wed','Thu','Fri','Sat','Sun']}});
  const r=await rpc(owner,'createResource',{organizationId:org.id,locationId:l.id,label:'Branch resource'}),selected=await rpc(owner,'selectProcedures',{organizationId:org.id,locationId:l.id,procedureIds:['kirpimai-vyru-kirpimas'],version:0,idempotencyKey:'branch-procedures'});
  const draft=await rpc(owner,'saveOffer',{id:selected[0].id,version:selected[0].version,label:'Branch service',variants:[{id:'branch-worker-variant',label:'Branch haircut',priceMinor:3000,durationMin:60,staffOptions:[{practitionerId:p.id,resourceId:r.id}]}]}),pending=await rpc(owner,'submitOffer',{id:draft.id,version:draft.version});await rpc(operator,'moderateOffer',{id:draft.id,version:pending.version,state:'approved'});
  const revision=await rpc(owner,'submitRevision',{scope,name:org.name,bio:org.bio});await rpc(operator,'moderate',{id:revision.id,state:'approved'});
  assert.equal((await rpc(client,'catalog',{city:'Vilnius'})).length,0);assert.equal((await rpc(client,'catalog',{city:'Kaunas'}))[0].location.id,l.id);
  let candidate;for(let dayOffset=1;dayOffset<8;dayOffset++){candidate=(await rpc(client,'availability',{providerServiceId:'branch-worker-variant',dayOffset,from:1020,to:1200})).slots[0];if(candidate)break;}assert.ok(candidate);
  const hold=await rpc(client,'hold',candidate),booking=await rpc(client,'confirm',{holdId:hold.id,name:'Fixture client',idempotencyKey:'branch-booking'});assert.equal(booking.serviceSnapshot.location.publicAddress,'Fixture address K');
  assert.equal((await owner.rpc('setLocationActive',{id:l.id,version:l.version,active:false})).status,409);await f.restart();assert.equal((await rpc(client,'workspace',{role:'customer'})).bookings[0].serviceSnapshot.location.id,l.id);assert.equal((await rpc(owner,'workspace',scope)).schedules.length,2);
 }finally{await f.close();}
});
test('Workers upgrade: private multi-selection → reviewed multi-staff offer → interval search → atomic booking → same IDs after restart',async()=>{
 const f=await fixture();try{
  const owner=f.browser(),operator=f.browser(),client=f.browser(),other=f.browser();
  await owner.login('upgrade-provider@example.com');await operator.login('operator@example.com');await client.login('upgrade-client@example.com');await other.login('upgrade-other@example.com');
  const rpc=async(b,method,input)=>{const r=await b.rpc(method,input);assert.equal(r.status,200,method+': '+JSON.stringify(r.value));return r.value.result;};
  const org=await rpc(owner,'createOrganization',{name:'Workers upgrade fixture',bio:'Isolated provider acceptance.',kind:'salon',city:'Vilnius'}),scope={role:'professional',organizationId:org.id},w=await rpc(owner,'workspace',scope);
  const p2=await rpc(owner,'createStaff',{organizationId:org.id,name:'Second fixture staff'}),r2=await rpc(owner,'createResource',{organizationId:org.id,label:'Second fixture resource'});
  const input={organizationId:org.id,procedureIds:['kirpimai-vyru-kirpimas','lakavimas-gelinis-lakavimas'],version:0,idempotencyKey:'upgrade-selection'};
  const offers=await rpc(owner,'selectProcedures',input);assert.equal(offers.length,2);assert.deepEqual((await rpc(owner,'selectProcedures',input)).map(o=>o.id),offers.map(o=>o.id));
  assert.equal((await other.rpc('selectProcedures',{...input,idempotencyKey:'other'})).status,403);assert.equal((await rpc(client,'catalog',{})).length,0);
  const draft=await rpc(owner,'saveOffer',{id:offers[0].id,version:offers[0].version,label:'Test haircut',variants:[{id:'upgrade-worker-variant',label:'Test variant',priceMinor:2500,durationMin:60,staffOptions:[{practitionerId:w.practitioners[0].id,resourceId:w.resources[0].id},{practitionerId:p2.id,resourceId:r2.id,priceMinor:3500,durationMin:90}]}]});
  const pending=await rpc(owner,'submitOffer',{id:draft.id,version:draft.version});await rpc(operator,'moderateOffer',{id:draft.id,version:pending.version,state:'approved'});
  const rev=await rpc(owner,'submitRevision',{scope,name:org.name,bio:org.bio});await rpc(operator,'moderate',{id:rev.id,state:'approved'});
  const rows=await rpc(client,'catalog',{taxonomyServiceId:'plaukai'});assert.equal(rows.length,1);assert.equal(rows[0].staffOptions.length,2);
  const grouped=await rpc(client,'searchResults',{taxonomyServiceId:'plaukai',anyTime:true,maxPrice:3000});assert.equal(grouped.treatments.length,1);assert.equal(grouped.salons.length,1);assert.equal(grouped.professionals.length,1);assert.equal(grouped.professionals[0].practitionerId,w.practitioners[0].id);
  let candidate;for(let dayOffset=1;dayOffset<8;dayOffset++){const rows=await rpc(client,'search',{taxonomyServiceId:'plaukai',city:'Vilnius',practitionerId:p2.id,dayOffset,from:1020,to:1200});candidate=rows[0]?.availability.slots[0];if(candidate)break;}
  assert.ok(candidate);assert.equal(candidate.practitionerId,p2.id);assert.equal(candidate.durationMin,90);assert.equal(candidate.priceMinor,3500);assert.ok(candidate.endAt<=new Date(Date.parse(candidate.startAt)+90*60000).toISOString());
  const holds=await Promise.all([client.rpc('hold',candidate),other.rpc('hold',candidate)]);assert.deepEqual(holds.map(r=>r.status).sort(),[200,409]);const winner=holds[0].status===200?client:other,h=holds.find(r=>r.status===200).value.result;
  const booking=await rpc(winner,'confirm',{holdId:h.id,name:'Fixture client',idempotencyKey:'upgrade-confirm'});assert.equal(booking.priceMinor,3500);assert.equal(booking.serviceSnapshot.practitionerName,p2.name);
  await f.restart();assert.equal((await rpc(winner,'workspace',{role:'customer'})).bookings[0].id,booking.id);assert.equal((await rpc(owner,'workspace',scope)).bookings[0].id,booking.id);
  let membership=await rpc(owner,'grantMembership',{organizationId:org.id,email:'upgrade-other@example.com',role:'practitioner',practitionerId:p2.id,version:0});
  const assigned=await rpc(other,'workspace',scope);assert.deepEqual(assigned.bookings.map(b=>b.id),[booking.id]);assert.equal(assigned.services[0].priceMinor,3500);assert.equal(assigned.offers.length,0);assert.equal(assigned.memberships.length,0);assert.equal(assigned.practitioners.length,1);
  assert.equal((await other.rpc('saveOffer',{...draft,label:'Forbidden'})).status,403);assert.equal((await other.rpc('grantMembership',{organizationId:org.id,email:'upgrade-client@example.com',role:'manager',version:0})).status,403);
  await rpc(owner,'revokeMembership',{id:membership.id,version:membership.version});assert.equal((await other.rpc('workspace',scope)).status,403);assert.equal((await other.send('session')).value.organizations.length,0);
  const stored=(await rpc(owner,'workspace',scope)).offers.find(o=>o.id===draft.id);await rpc(owner,'archiveOffer',{id:stored.id,version:stored.version});assert.equal((await rpc(client,'catalog',{})).length,0);assert.equal((await rpc(owner,'workspace',scope)).bookings[0].serviceSnapshot.priceMinor,3500);
 }finally{await f.close();}
});
test('Compiled Workers publication boundary excludes future body, links, schema, JSON, discovery and all five uploaded media until exact due time',async()=>{
 const pkg=articleFixture(),article=pkg.pages[1],initial=JSON.parse(await readFile(new URL('../content/initial-release/content-package.json',import.meta.url),'utf8'));
 article.media=initial.pages.find(p=>p.type==='guide').media;assert.equal(article.media.length,5);article.editorial.featuredImageId=article.media[0].id;
 const publishAt=Date.parse('2026-10-13T07:00:00Z');article.publishAt=new Date(publishAt).toISOString();article.editorial.datePublished=article.publishAt;
 pkg.pages.push({...structuredClone(pkg.pages[0]),id:'boundary-author',type:'author',slug:'autoriai/fixture-editor',title:'Boundary author',publishAt:article.publishAt});
 pkg.pages[0].body.push({type:'richParagraph',content:[{type:'link',text:'Būsimas gidas',target:{kind:'page',pageId:article.id}}]});signFixture(pkg);
 const media=new Map(await Promise.all(article.media.map(async m=>[m.src,await readFile(new URL('../content/initial-release/assets/'+path.basename(m.src),import.meta.url))])));
 for(const now of [publishAt-1,publishAt]){
  const future=now<publishAt,v2=await build({entryPoints:[path.join(import.meta.dirname,'worker.mjs')],write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text','.html':'text'},plugins:[{name:'isolated-publication-clock',setup(b){
   b.onLoad({filter:/cloudflare[\\/]worker\.mjs$/},async a=>({contents:(await readFile(a.path,'utf8')).replace('contentProjection(Date.now(),registry)',`contentProjection(${now},registry)`),loader:'js'}));
   b.onLoad({filter:/output[\\/]content-package\.json$/},()=>({contents:JSON.stringify(pkg),loader:'json'}));
   b.onLoad({filter:/output[\\/]asset-paths\.json$/},async a=>({contents:JSON.stringify([...new Set([...JSON.parse(await readFile(a.path,'utf8')),...media.keys()])]),loader:'json'}));
  }}]});
  const f=await fixture({RELEASE_MODE:'production'},v2.outputFiles[0].text,async request=>{const bytes=media.get(new URL(request.url).pathname);return bytes?new Response(bytes,{headers:{'Content-Type':'image/webp'}}):new Response('Not found',{status:404});});
  try{
   const route='/'+article.slug,response=await f.mf.dispatchFetch(origin+route),html=await response.text();assert.equal(response.status,future?404:200);
   const home=await(await f.mf.dispatchFetch(origin+'/')).text(),json=await(await f.mf.dispatchFetch(origin+'/content.json')).text();
   if(future){assert.ok(!html.includes(article.title));assert.ok(!html.includes('application/ld+json'));assert.ok(!home.includes('href="https://madbeauty.lt'+route+'"'));assert.ok(!json.includes(article.id));assert.doesNotMatch(html,/og:title|twitter:image|article:published_time/);}
   else {assert.ok(html.includes(article.title));assert.ok(html.includes('"@type":"Article"'));assert.ok(home.includes('href="https://madbeauty.lt'+route+'"'));assert.ok(json.includes(article.id));assert.match(html,/srcset=/);assert.ok(html.includes('property="og:title" content="'+article.title+'"'));assert.match(html,/article:published_time" content="2026-10-13T07:00:00.000Z/);assert.match(html,/twitter:card" content="summary_large_image/);}
   for(const path of ['/robots.txt','/sitemap.xml','/llms.txt','/llms-full.txt']){const response=await f.mf.dispatchFetch(origin+path),text=await response.text();assert.equal(response.headers.get('cache-control'),'no-store',path);if(path!=='/robots.txt')assert.equal(text.includes('https://madbeauty.lt'+route),!future,path);if(path==='/llms-full.txt'){assert.equal(text.includes('Autoriaus profilis:'),!future);if(!future)assert.match(text,/Publikavimo data: 2026-10-13T07:00:00.000Z/);}}
   for(const m of article.media){const image=await f.mf.dispatchFetch(origin+m.src);assert.equal(image.status,future?404:200,m.src);if(!future)assert.deepEqual(Buffer.from(await image.arrayBuffer()),media.get(m.src));}
   assert.equal((await f.mf.dispatchFetch(origin+'/content-assets/madbeauty/unknown.webp')).status,404);
  }finally{await f.close();}
 }
});
test('Workers V2 article→catalogue registry→SSR supply; withdrawal removes link, empty city404 and private data',async()=>{
 const v2=await build({entryPoints:[path.join(import.meta.dirname,'worker.mjs')],write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text','.html':'text'},plugins:[{name:'isolated-v2-package',setup(b){b.onLoad({filter:/output[\\/]content-package\.json$/},()=>({contents:JSON.stringify(articleFixture()),loader:'json'}));}}]});
 const f=await fixture({RELEASE_MODE:'production'},v2.outputFiles[0].text);try{
  const articlePath='/gidai/katalogo-nuorodos-testas',targetPath='/paslaugos/lakavimas-gelinis-lakavimas/vilnius';
  const emptyChoice=await f.mf.dispatchFetch(origin+'/paslaugos/lakavimas-gelinis-lakavimas?miestas=vilnius',{redirect:'manual'});assert.equal(emptyChoice.status,303);assert.equal(emptyChoice.headers.get('location'),origin+'/paieska#paslauga=lakavimas-gelinis-lakavimas&miestas=vilnius');
  const search=await f.mf.dispatchFetch(emptyChoice.headers.get('location'));assert.equal(search.status,200);assert.match(search.headers.get('x-robots-tag'),/noindex/);
  assert.doesNotMatch(await(await f.mf.dispatchFetch(origin+articlePath)).text(),/href="https:\/\/madbeauty.lt\/paslaugos\/lakavimas/);
  const owner=f.browser(),operator=f.browser();await owner.login('article-provider@example.com');await operator.login('operator@example.com');
  const org=(await owner.rpc('createOrganization',{name:'Izoliuoto testo meistrė',bio:'V2 Workers sąsajos patikra.',city:'Vilnius',kind:'solo'})).value.result,scope={role:'professional',organizationId:org.id},w=(await owner.rpc('workspace',scope)).value.result;
  await owner.rpc('createService',{organizationId:org.id,practitionerId:w.practitioners[0].id,resourceId:w.resources[0].id,taxonomyServiceId:'gelinis-lakavimas',label:'Gelinis lakavimas',durationMin:60,priceMinor:2500,bufferBeforeMin:0,bufferAfterMin:0});
  const revision=(await owner.rpc('submitRevision',{scope,name:org.name,bio:org.bio})).value.result;await operator.rpc('moderate',{id:revision.id,state:'approved'});
  const target=await f.mf.dispatchFetch(origin+targetPath);assert.equal(target.status,200);assert.match(await target.text(),new RegExp('/meistrai/'+org.id));assert.match(target.headers.get('x-robots-tag'),/noindex/);
  const suppliedChoice=await f.mf.dispatchFetch(origin+'/paslaugos/lakavimas-gelinis-lakavimas?miestas=vilnius',{redirect:'manual'});assert.equal(suppliedChoice.status,303);assert.equal(suppliedChoice.headers.get('location'),origin+targetPath);
  const registry=await(await f.mf.dispatchFetch(origin+'/content-targets.json')).json();assert.ok(registry.targets.some(t=>t.id==='mb:catalog:lakavimas-gelinis-lakavimas:vilnius'));assert.ok(registry.routes.every(r=>r.indexEligible===false));
  const article=await f.mf.dispatchFetch(origin+articlePath);assert.equal(article.status,200);const html=await article.text();assert.match(html,/href="https:\/\/madbeauty.lt\/paslaugos\/lakavimas-gelinis-lakavimas\/vilnius"/);assert.match(html,/"@type":"Article"/);assert.doesNotMatch(html,/article-provider@example.com/);
  for(const p of ['/paslaugos/nagai','/paslaugos/kirpimai-moteru-kirpimas'])assert.equal((await f.mf.dispatchFetch(origin+p)).status,200);
  for(const p of ['/paslaugos/nagai/kaunas','/paslaugos/unknown','/paslaugos/kirpimai-moteru-kirpimas/vilnius'])assert.equal((await f.mf.dispatchFetch(origin+p)).status,404);
  assert.equal((await f.mf.dispatchFetch('https://unknown.test'+articlePath)).status,404);
  const query=await f.mf.dispatchFetch(origin+articlePath+'?sort=price');assert.match(query.headers.get('x-robots-tag'),/noindex/);
  const sitemap=await(await f.mf.dispatchFetch(origin+'/sitemap.xml')).text();assert.match(sitemap,/katalogo-nuorodos-testas/);assert.doesNotMatch(sitemap,/\/paslaugos\/nagai/);
  await f.restart();assert.equal((await f.mf.dispatchFetch(origin+targetPath)).status,200);
  const edited=await operator.rpc('edit',{scope:{role:'operator'},table:'organizations',id:org.id,values:{approved:false}});assert.equal(edited.status,200,JSON.stringify(edited.value));
  assert.equal((await f.mf.dispatchFetch(origin+targetPath)).status,404);assert.doesNotMatch(await(await f.mf.dispatchFetch(origin+articlePath)).text(),/href="https:\/\/madbeauty.lt\/paslaugos\/lakavimas/);
  const current=await(await f.mf.dispatchFetch(origin+'/content-targets.json')).json();assert.ok(!current.targets.some(t=>t.id.endsWith(':vilnius')));
  const withdrawnChoice=await f.mf.dispatchFetch(origin+'/paslaugos/lakavimas-gelinis-lakavimas?miestas=vilnius',{redirect:'manual'});assert.equal(withdrawnChoice.status,303);assert.equal(withdrawnChoice.headers.get('location'),emptyChoice.headers.get('location'));
  const unknownChoice=await f.mf.dispatchFetch(origin+'/paslaugos/unknown?miestas=vilnius');assert.equal(unknownChoice.status,404);
 }finally{await f.close();}
});
async function fixture(bindings={},fixtureScript=script,assetService=async()=>new Response('Not found',{status:404}),durableObjectBindings={PLATFORM:{className:'MadbeautyPlatform',useSQLite:true}}){
 const storage=await mkdtemp(path.join(os.tmpdir(),'madbeauty-workers-')),mails=[];let failMail=false;
 const start=()=>new Miniflare({modules:true,script:fixtureScript,compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],durableObjects:durableObjectBindings,durableObjectsPersist:storage,images:{binding:'IMAGES'},bindings:{APP_ORIGIN:origin,RELEASE_MODE:'preview',SESSION_SECRET:'local-test-only-secret-no-production-access',OPERATOR_EMAIL:'operator@example.com',...bindings},serviceBindings:{MAIL_TRANSPORT:async request=>{if(failMail)return new Response('Unavailable',{status:503});mails.push(await request.json());return new Response('Accepted');},ASSETS:assetService}});
 let mf=start();
 const browser=()=>{
  let cookie='',csrf='';
  async function send(endpoint,input,extra={}){
   const r=await mf.dispatchFetch(origin+'/api/madbeauty/'+endpoint,{method:input===undefined?'GET':'POST',headers:{cookie,...(input===undefined?{}:{origin,'content-type':'application/json','x-csrf-token':csrf}),...extra.headers},...(input===undefined?{}:{body:JSON.stringify(input)}),...extra});
   if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];
   const value=await r.json();if(value.csrf)csrf=value.csrf;return {status:r.status,value};
  }
  return {send,file:async endpoint=>mf.dispatchFetch(origin+'/api/madbeauty/'+endpoint,{headers:{cookie}}),async upload(bytes,organizationId,mime='image/png',usage='gallery'){const r=await mf.dispatchFetch(origin+'/api/madbeauty/upload',{method:'POST',headers:{cookie,origin,'content-type':mime,'x-csrf-token':csrf,'x-organization-id':organizationId,'x-asset-alt':'Testo vaizdas','x-asset-rights':'Testui sukurtas originalas','x-asset-rights-confirmed':'true','x-asset-usage':usage},body:bytes});return {status:r.status,value:await r.json()};},async image(file){return mf.dispatchFetch(origin+'/'+file,{headers:{cookie}});},async rpc(method,input={}){return send('rpc',{method,input,siteId:'madbeauty'});},async login(email){await send('session');const c=await send('auth/start',{email});assert.equal(c.status,200,JSON.stringify(c.value));const mail=mails.findLast(m=>m.to===email),code=mail.text.match(/\b\d{6}\b/)[0];const verified=await send('auth/verify',{challengeId:c.value.challengeId,code});assert.equal(verified.status,200);return verified.value.user;}};
 };
 return {browser,mails,setMailFailure:value=>{failMail=value;},get mf(){return mf;},async restart(nextBindings=durableObjectBindings){await mf.dispose();durableObjectBindings=nextBindings;mf=start();},close:()=>mf.dispose()};
}
test('Workers SQL runtime: email session, membership, concurrent booking, tenant isolation, durable restart and mail',async()=>{
 const f=await fixture();try{
  const owner=f.browser(),operator=f.browser(),one=f.browser(),two=f.browser();
  await owner.login('provider@example.com');await operator.login('operator@example.com');const user=await one.login('client-one@example.com');await two.login('client-two@example.com');
  const org=(await owner.rpc('createOrganization',{name:'Testo meistrė',bio:'Izoliuoto Workers testo profilis.',city:'Vilnius',kind:'solo'})).value.result;
  assert.ok(org?.id);const scope={role:'professional',organizationId:org.id};
  const workspace=(await owner.rpc('workspace',scope)).value.result;
  const service=(await owner.rpc('createService',{organizationId:org.id,practitionerId:workspace.practitioners[0].id,resourceId:workspace.resources[0].id,taxonomyServiceId:'manikiuras',label:'Manikiūras',durationMin:60,priceMinor:2500,bufferBeforeMin:5,bufferAfterMin:10})).value.result;
  const revision=(await owner.rpc('submitRevision',{scope,name:org.name,bio:org.bio})).value.result;
  assert.equal((await operator.rpc('moderate',{id:revision.id,state:'approved'})).status,200);
  assert.equal((await two.rpc('workspace',scope)).status,403);
  let candidate;for(let dayOffset=1;dayOffset<8;dayOffset++){const r=await one.rpc('availability',{providerServiceId:service.id,dayOffset,from:900,to:1200,addons:[]});candidate=r.value.result?.slots?.[0];if(candidate)break;}assert.ok(candidate,'next week must include a slot');
  const holds=await Promise.all([one.rpc('hold',candidate),two.rpc('hold',candidate)]);assert.deepEqual(holds.map(h=>h.status).sort(),[200,409]);
  const index=holds.findIndex(h=>h.status===200),winner=[one,two][index],hold=holds[index].value.result;
  const input={holdId:hold.id,name:'Testinė klientė',idempotencyKey:hold.id};
  const confirmed=await winner.rpc('confirm',input);assert.equal(confirmed.status,200,JSON.stringify(confirmed.value));
  const replay=await winner.rpc('confirm',input);assert.equal(replay.value.result.id,confirmed.value.result.id);
  await f.mf.dispatchFetch(origin+'/api/madbeauty/session');
  const before=await winner.rpc('workspace',{role:'customer'});assert.equal(before.value.result.bookings.length,1);
  await f.restart();const after=await winner.rpc('workspace',{role:'customer'});assert.equal(after.status,200);assert.equal(after.value.result.bookings[0].id,confirmed.value.result.id);
  assert.ok(f.mails.some(m=>m.to==='client-one@example.com'));assert.ok(!JSON.stringify((await one.rpc('catalog',{})).value).includes('client-one@example.com'));
 }finally{await f.close();}
});

test('Mail failure reports unavailability without diagnostics and a new code works after provider recovery',async()=>{
 const f=await fixture();try{
  const client=f.browser();await client.send('session');f.setMailFailure(true);
  const failed=await client.send('auth/start',{email:'mail-failure@example.com'});assert.equal(failed.status,503);assert.equal(failed.value.error.code,'MAIL_UNAVAILABLE');assert.ok(!('diagnostic' in failed.value.error));assert.equal(f.mails.length,0);
  assert.equal((await client.send('recovery-status')).status,403);
  f.setMailFailure(false);await client.login('mail-failure@example.com');assert.equal(f.mails.length,1);
 }finally{await f.close();}
});
test('Workers media: real image transform, private original, pending owner access and durability',async()=>{
 const f=await fixture();try{
  const owner=f.browser(),guest=f.browser();await owner.login('media-owner@example.com');await guest.send('session');
  const org=(await owner.rpc('createOrganization',{name:'Testo profilis',bio:'Izoliuoto vaizdo įkėlimo testas.',city:'Kaunas',kind:'solo'})).value.result;
  const require=createRequire(path.resolve(import.meta.dirname,'../../../content-studio/package.json'));
  const {default:sharp}=await import(pathToFileURL(require.resolve('sharp')));
  const original=await sharp({create:{width:32,height:48,channels:4,background:{r:180,g:40,b:90,alpha:0.8}}}).png().toBuffer();
  const upload=await owner.upload(original,org.id);assert.equal(upload.status,200,JSON.stringify(upload.value));
  const media=upload.value.result;assert.equal(media.variants.length,1);assert.equal(media.variants[0].width,32);assert.ok(!JSON.stringify(media).includes('originals'));
  await guest.login('media-team@example.com');let member=(await owner.rpc('grantMembership',{organizationId:org.id,email:'media-team@example.com',role:'manager',version:0})).value.result;
  assert.equal((await guest.image(media.variants[0].file)).status,200);
  const revoke=await owner.rpc('revokeMembership',{id:member.id,version:member.version});assert.equal(revoke.status,200);assert.equal((await guest.image(media.variants[0].file)).status,404);
  member=(await owner.rpc('grantMembership',{organizationId:org.id,email:'media-team@example.com',role:'reception',version:revoke.value.result.version})).value.result;
  assert.equal((await guest.upload(original,org.id)).status,403);assert.equal((await guest.image(media.variants[0].file)).status,404);
  const reception=(await guest.rpc('workspace',{role:'professional',organizationId:org.id})).value.result;assert.equal(reception.media.length,0);assert.ok(!JSON.stringify(reception).includes('originals/'));assert.equal(reception.organizations[0].draftGallery,undefined);
  const image=await owner.image(media.variants[0].file);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/webp');assert.ok((await image.arrayBuffer()).byteLength>10);
  const exif=await sharp({create:{width:32,height:48,channels:3,background:'#ba3456'}}).jpeg().withMetadata({orientation:6}).toBuffer();
  const rotated=await owner.upload(exif,org.id,'image/jpeg');assert.equal(rotated.status,200,JSON.stringify(rotated.value));
  const out=await owner.image(rotated.value.result.variants[0].file),meta=await sharp(Buffer.from(await out.arrayBuffer())).metadata();
  // Miniflare's Images simulator omits automatic EXIF rotation. Rotation is
  // asserted against the real binding by verify-images.mjs, not simulated here.
  assert.equal(meta.exif,undefined,'public EXIF must be removed');
  assert.equal((await guest.image(media.variants[0].file)).status,404);
  await f.restart();assert.equal((await owner.image(media.variants[0].file)).status,200);
 }finally{await f.close();}
});
test('Workers API origin/CSRF/OTP attempts, real empty catalog and preview isolation',async()=>{
 const f=await fixture();try{
  const client=f.browser();await client.send('session');assert.deepEqual((await client.rpc('catalog')).value.result,[]);
  const originBad=await client.send('rpc',{method:'catalog'},{headers:{origin:'https://other.test','content-type':'application/json'}});assert.equal(originBad.status,403);
  const c=await client.send('auth/start',{email:'otp@example.com'});assert.equal(c.status,200);
  for(let n=0;n<5;n++)assert.equal((await client.send('auth/verify',{challengeId:c.value.challengeId,code:'not-a-code'})).status,400);
  const code=f.mails.findLast(m=>m.to==='otp@example.com').text.match(/\b\d{6}\b/)[0];assert.equal((await client.send('auth/verify',{challengeId:c.value.challengeId,code})).status,400);
  for(const p of ['/sitemap.xml','/backend/local-admin.mjs','/meistrai/demo-org-0','/runtime/platform.sqlite','/originals/asset_abc'])assert.equal((await f.mf.dispatchFetch(origin+p)).status,404,p);
  const page=await f.mf.dispatchFetch(origin+'/gidai');assert.equal(page.status,200);assert.match(page.headers.get('x-robots-tag'),/noindex/);
 }finally{await f.close();}
});

test('Production-mode discovery in isolated SQL runtime follows provider approval and excludes private accounts',async()=>{
 const f=await fixture({RELEASE_MODE:'production'});try{
  const owner=f.browser(),operator=f.browser();await owner.login('private-provider@example.com');await operator.login('operator@example.com');
  const org=(await owner.rpc('createOrganization',{name:'Izoliuoto testo profilis',bio:'Priėmimo testo aprašymas.',city:'Kaunas',kind:'solo'})).value.result;
  const scope={role:'professional',organizationId:org.id},workspace=(await owner.rpc('workspace',scope)).value.result;
  await owner.rpc('createService',{organizationId:org.id,practitionerId:workspace.practitioners[0].id,resourceId:workspace.resources[0].id,taxonomyServiceId:'manikiuras',label:'Manikiūras',durationMin:30,priceMinor:2000,bufferBeforeMin:0,bufferAfterMin:0});
  const path='/meistrai/'+org.id,url='https://madbeauty.lt'+path;
  assert.equal((await f.mf.dispatchFetch(origin+path)).status,404);
  assert.ok(!(await(await f.mf.dispatchFetch(origin+'/sitemap.xml')).text()).includes(url));
  const submitted=await owner.rpc('submitRevision',{scope,name:org.name,bio:org.bio});assert.equal(submitted.status,200,JSON.stringify(submitted.value));const revision=submitted.value.result;
  await operator.rpc('moderate',{id:revision.id,state:'approved'});
  const response=await f.mf.dispatchFetch(origin+path),html=await response.text();assert.equal(response.status,200);assert.equal(response.headers.get('x-robots-tag'),null);assert.ok(html.includes('"@type":"LocalBusiness"'));assert.ok(!html.includes('private-provider@example.com'));
  for(const output of ['/sitemap.xml','/llms.txt','/llms-full.txt']){const r=await f.mf.dispatchFetch(origin+output);assert.equal(r.status,200);const text=await r.text();assert.ok(text.includes(url),output+' profile');assert.ok(text.includes('https://madbeauty.lt/privatumas'),output+' privacy');assert.ok(!text.includes('private-provider@example.com'));}
  await f.restart();assert.equal((await f.mf.dispatchFetch(origin+path)).status,200);
 }finally{await f.close();}
});
