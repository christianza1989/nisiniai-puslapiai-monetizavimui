import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {core,pinCore} from '../release-20261010/pinned-core.mjs';
import {treatwellSalonUrl} from '../prototype/public/booking-channel-model.mjs';
const {build}=await import(pathToFileURL(path.join(core,'node_modules/esbuild/lib/main.js'))),{Miniflare}=await import(pathToFileURL(path.join(core,'node_modules/miniflare/dist/src/index.js')));
const artifact=process.env.MADBEAUTY_BOOKING_ARTIFACT;
const script=artifact?await readFile(artifact,'utf8'):(await build({entryPoints:[path.join(import.meta.dirname,'worker.mjs')],write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text','.html':'text'},plugins:[pinCore]})).outputFiles[0].text;
if(artifact){const manifest=JSON.parse(await readFile(path.join(path.dirname(artifact),'manifest.json')));assert.equal(createHash('sha256').update(script).digest('hex'),manifest.artifactSha256);assert.equal(manifest.kind,'main');}
test('Treatwell destination accepts only HTTPS Lithuanian salon paths, excluding redirect queries and credential URLs',()=>{
 assert.equal(treatwellSalonUrl('https://treatwell.lt/salonas/testinis-salonas'),'https://www.treatwell.lt/salonas/testinis-salonas/');
 for(const value of ['http://www.treatwell.lt/salonas/testas/','https://treatwell.lt.evil.test/salonas/testas/','https://user@treatwell.lt/salonas/testas/','https://www.treatwell.lt/salonas/testas/?redirect=https://evil.test','https://www.treatwell.lt/salonas/testas/#booking','https://www.treatwell.lt/salonai/','https://www.treatwell.lt/salonas/%2e%2e/','javascript:alert(1)','https://www.treatwell.lt:444/salonas/testas/'])assert.equal(treatwellSalonUrl(value),null,value);
});
test('Native durable booking channel enforces owner-only switch, history/hold protection, external refusal, public projection and restart',async()=>{
 const origin=artifact?'https://madbeauty.lt':'https://booking-channel.test',storage=await mkdtemp(path.join(os.tmpdir(),'madbeauty-booking-channel-')),mails=[];
 let mf;
 const start=()=>new Miniflare({modules:true,script,compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],durableObjects:{PLATFORM:{className:'MadbeautyPlatform',useSQLite:true},ORGANIZATION_STAGING:{className:'MadbeautyOrganizationStaging',useSQLite:true},COMMUNITY:{className:'MadbeautyCommunity',useSQLite:true}},durableObjectsPersist:storage,bindings:{APP_ORIGIN:origin,RELEASE_MODE:artifact?'production':'preview',COMMUNITY_ENABLED:'true',FACEBOOK_LOGIN_ENABLED:'false',SESSION_SECRET:'isolated-booking-channel-test-secret',OPERATOR_EMAIL:'channel-operator@example.com'},serviceBindings:{ASSETS:()=>new Response('Not found',{status:404}),MAIL_TRANSPORT:async request=>{mails.push(await request.json());return new Response('Accepted');}}});
 const actor=()=>{let cookie='',csrf='';const send=async(route,body)=>{const r=await mf.dispatchFetch(origin+'/api/madbeauty/'+route,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,...body===undefined?{}:{Origin:origin,'Content-Type':'application/json','X-CSRF-Token':csrf}},...body===undefined?{}:{body:JSON.stringify(body)}});const next=r.headers.get('set-cookie');if(next)cookie=next.split(';')[0];const v=await r.json();if(v.csrf)csrf=v.csrf;return {...v,status:r.status};};return {send,rpc:async(method,input={})=>send('rpc',{method,input,siteId:'madbeauty'}),login:async email=>{await send('session');const c=await send('auth/start',{email});assert.equal(c.status,200);const code=mails.at(-1).text.match(/kodas: (\d{6})/)[1],v=await send('auth/verify',{challengeId:c.challengeId,code});assert.equal(v.status,200);return v.user;}};};
 const ok=r=>{assert.equal(r.status,200,JSON.stringify(r));return r.result;};
 const failure=(r,code)=>{assert.equal(r.error?.code,code,JSON.stringify(r));assert.ok(r.status>=400);};
 const url='https://www.treatwell.lt/salonas/madbeauty-testinis-salonas/';
 try{
  mf=start();const owner=actor(),client=actor(),outsider=actor(),operator=actor();await owner.login('channel-owner@example.com');const clientUser=await client.login('channel-client@example.com');await outsider.login('channel-outsider@example.com');await operator.login('channel-operator@example.com');
  const created=ok(await owner.rpc('createOrganization',{kind:'salon',name:'Izoliuotas kanalų salonas',bio:'Tik automatinio bandymo profilis.',city:'Vilnius'})),id=created.id,scope={role:'professional',organizationId:id};
  let workspace=ok(await owner.rpc('workspace',scope));const service=ok(await owner.rpc('createService',{organizationId:id,practitionerId:workspace.practitioners[0].id,resourceId:workspace.resources[0].id,taxonomyServiceId:'manikiuras',label:'Bandomasis manikiūras',durationMin:60,priceMinor:2500,bufferBeforeMin:5,bufferAfterMin:10}));
  const revision=ok(await owner.rpc('submitRevision',{scope,name:created.name,bio:created.bio}));ok(await operator.rpc('moderate',{id:revision.id,state:'approved'}));
  const settings=async()=>ok(await owner.rpc('workspace',scope)).organizations[0],save=async(extra={})=>owner.rpc('saveBookingChannel',{organizationId:id,version:(await settings()).version,bookingProvider:'treatwell',bookingUrl:url,...extra});
  failure(await outsider.rpc('saveBookingChannel',{organizationId:id,version:(await settings()).version,bookingProvider:'treatwell',bookingUrl:url}),'FORBIDDEN');
  ok(await owner.rpc('grantMembership',{organizationId:id,email:'channel-outsider@example.com',role:'reception',version:0}));failure(await outsider.rpc('saveBookingChannel',{organizationId:id,version:(await settings()).version,bookingProvider:'treatwell',bookingUrl:url}),'FORBIDDEN');
  failure(await save({bookingUrl:'https://evil.test/salonas/testas/'}),'INVALID_INPUT');failure(await save({version:0}),'VERSION_CONFLICT');
  let input,candidate;for(let dayOffset=1;dayOffset<8;dayOffset++){input={providerServiceId:service.id,dayOffset,from:900,to:1200,addons:[]};candidate=ok(await client.rpc('availability',input)).slots[0];if(candidate)break;}assert.ok(candidate);
  const hold=ok(await client.rpc('hold',candidate));failure(await save(),'BOOKING_CHANNEL_CONFLICT');
  const booking=ok(await client.rpc('confirm',{holdId:hold.id,name:'Bandomoji klientė',idempotencyKey:'native-channel-booking'}));failure(await save(),'BOOKING_CHANNEL_CONFLICT');ok(await client.rpc('cancelBooking',{scope:{role:'customer'},id:booking.id,version:booking.version,reason:'Izoliuotas perjungimo bandymas.'}));
  const waitlist=ok(await client.rpc('createInquiry',{organizationId:id,providerServiceId:service.id,note:'Izoliuotas laukimo bandymas.',waitlist:true}));failure(await save(),'BOOKING_CHANNEL_CONFLICT');ok(await owner.rpc('edit',{scope,table:'waitlist',id:waitlist.id,values:{state:'closed'}}));
  const before=await settings(),mailCount=mails.length;
  const switched=ok(await save());assert.equal(switched.nativeCalendarEnabled,false);assert.equal(switched.bookingUrl,url);
  const availability=ok(await client.rpc('availability',input));assert.equal(availability.state,'external');assert.deepEqual(availability.slots,[]);assert.equal(availability.source,'treatwell-link');
  failure(await client.rpc('hold',candidate),'EXTERNAL_BOOKING');failure(await client.rpc('createInquiry',{organizationId:id,providerServiceId:service.id,note:'Negali sukurti vietinio vizito.'}),'EXTERNAL_BOOKING');
  failure(await client.rpc('createWaitlist',{organizationId:id,providerServiceId:service.id,idempotencyKey:'external-wait'}),'EXTERNAL_BOOKING');
  failure(await owner.rpc('createBusyBlock',{organizationId:id,practitionerId:candidate.practitionerId,dayOffset:1,from:600,to:660}),'EXTERNAL_BOOKING');
  failure(await owner.rpc('edit',{scope,table:'schedules',id:workspace.schedules[0].id,values:{startMin:500}}),'EXTERNAL_BOOKING');
  failure(await owner.rpc('manualVisit',{scope,clientId:clientUser.id,candidate,idempotencyKey:'external-manual'}),'EXTERNAL_BOOKING');
  const publicProfile=ok(await client.rpc('profile',{id}));assert.equal(publicProfile.bookingProvider,'treatwell');assert.equal(publicProfile.services[0].bookingProvider,'treatwell');
  const results=ok(await client.rpc('searchResults',{}));assert.equal(results.treatments.find(s=>s.organizationId===id).availability.slots.length,0);assert.equal(results.salons.find(s=>s.organizationId===id).bookingUrl,url);assert.ok(results.professionals.some(s=>s.organizationId===id));
  const html=await(await mf.dispatchFetch(origin+'/salonai/'+id)).text();assert.match(html,/Rezervuoti per Treatwell/);assert.ok(html.includes(url));assert.equal(mails.length,mailCount,'External channel sends no Madbeauty booking mail');
  const externalWorkspace=ok(await owner.rpc('workspace',scope));assert.equal(externalWorkspace.bookings.find(b=>b.id===booking.id).status,'canceled');assert.deepEqual(externalWorkspace.schedules,workspace.schedules);assert.equal(externalWorkspace.organizations[0].version,before.version+1);
  await mf.dispose();mf=start();assert.equal(ok(await owner.rpc('workspace',scope)).organizations[0].bookingProvider,'treatwell');
  failure(await save({bookingProvider:'madbeauty'}),'SCHEDULE_CONFIRMATION_REQUIRED');ok(await save({bookingProvider:'madbeauty',nativeScheduleConfirmed:true}));assert.ok(ok(await client.rpc('availability',input)).slots.length);
  const version=(await settings()).version;
  const race=await Promise.all([owner.rpc('saveBookingChannel',{organizationId:id,version,bookingProvider:'treatwell',bookingUrl:url}),client.rpc('hold',candidate)]);
  assert.equal(race.filter(r=>r.status===200).length,1,JSON.stringify(race));if(race[0].status===200)failure(race[1],'EXTERNAL_BOOKING');else{failure(race[0],'BOOKING_CHANNEL_CONFLICT');ok(await client.rpc('releaseHold',{id:race[1].result.id}));}
  const external=ok(await owner.rpc('createOrganization',{kind:'salon',name:'Išorinės registracijos bandymas',bio:'Tik bandymas.',city:'Vilnius',bookingProvider:'treatwell',bookingUrl:url}));assert.equal(external.bookingProvider,'treatwell');assert.equal((await owner.send('session')).organizations.find(o=>o.id===external.id).nativeCalendarEnabled,false);
 }finally{if(mf)await mf.dispose();}
});
