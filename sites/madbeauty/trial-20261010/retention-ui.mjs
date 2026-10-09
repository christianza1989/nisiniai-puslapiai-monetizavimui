import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {trialBrowser} from './operations-accept.mjs';
const file=new URL('output/retention-ui.private.json',import.meta.url),scope={role:'professional',organizationId:'demo-org-0'},owner=trialBrowser();
if(!['prepare','cleanup'].includes(process.argv[2]))throw Error('Explicit owned UI fixture operation required');
await owner.login('demo-provider-0@example.com');
if(process.argv[2]==='prepare'){
 try{await readFile(file);throw Error('UI fixture already exists; resume it without creating another');}catch(e){if(e.code!=='ENOENT')throw e;}
 const email='retention-ui-'+Date.now()+'@example.com',client=trialBrowser(),created=await owner.rpc('createClient',{organizationId:scope.organizationId,email,name:'Disposable Chrome retention fixture',idempotencyKey:email});await client.login(email);
 const service=(await client.rpc('catalog')).find(s=>s.organizationId===scope.organizationId);let candidate;for(let dayOffset=1;dayOffset<8&&!candidate;dayOffset++)candidate=(await client.rpc('availability',{providerServiceId:service.id,dayOffset,from:540,to:1200})).slots[0];assert.ok(candidate);const hold=await client.rpc('hold',candidate),booking=await client.rpc('confirm',{holdId:hold.id,name:'Disposable Chrome retention fixture',idempotencyKey:email+'-booking'});await client.rpc('message',{bookingId:booking.id,scope:{role:'customer'},text:'Disposable Chrome retention note'});
 await writeFile(file,JSON.stringify({at:new Date().toISOString(),email,clientId:created.id,bookingId:booking.id,organizationId:scope.organizationId,startAt:booking.startAt},null,2));console.log(JSON.stringify({prepared:true,oneDisposableFictionalCustomer:true,futureBooking:true,smtp:false,fixtureEmail:email}));
}else{
 const f=JSON.parse(await readFile(file));assert.equal(f.organizationId,scope.organizationId);const workspace=await owner.rpc('workspace',scope),booking=workspace.bookings.find(b=>b.id===f.bookingId);assert.ok(booking?.erased,'UI must have actually removed customer identity first');assert.notEqual(booking.clientId,f.clientId);assert.equal(booking.startAt,f.startAt);assert.equal(booking.status,'confirmed');assert.ok(!workspace.messages.some(m=>m.bookingId===booking.id));await owner.rpc('cancelBooking',{scope,id:booking.id,version:booking.version,reason:'Disposable Chrome retention verification complete'});await writeFile(new URL('output/retention-ui-cleanup.json',import.meta.url),JSON.stringify({state:'PASS',at:new Date().toISOString(),futureOccupancyPreserved:true,customerNotesRemoved:true,ownedDisposableBookingCanceled:true,smtp:false,existingAdvertisedAccountsRemoved:0},null,2));console.log('Owned disposable UI booking cleanup PASS');
}
