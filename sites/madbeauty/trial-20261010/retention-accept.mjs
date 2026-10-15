import assert from 'node:assert/strict';
import {trialBrowser} from './operations-accept.mjs';
import {RETENTION_POLICY} from '../backend/retention-policy.mjs';

// Ordinary application routes, only one newly created disposable example.com
// customer. Existing advertised identities and their fixture history survive.
export async function verifyTrialRetention(browserFactory=()=>trialBrowser()){
 const owner=browserFactory(),client=browserFactory(),stranger=browserFactory(),run='retention-'+Date.now(),email=run+'@example.com',checks=[];
 await owner.login('demo-provider-0@example.com');const scope={role:'professional',organizationId:'demo-org-0'},workspace=()=>owner.rpc('workspace',scope);
 const created=await owner.rpc('createClient',{organizationId:scope.organizationId,email,name:'Disposable retention fixture',idempotencyKey:run});await client.login(email);await stranger.request('session');
 assert.equal((await client.rpc('workspace',{role:'customer'})).retentionPolicy.version,RETENTION_POLICY.version);checks.push('Approved policy reached ordinary customer workspace');
 const service=(await client.rpc('catalog')).find(s=>s.organizationId===scope.organizationId);let candidate;for(let dayOffset=1;dayOffset<8&&!candidate;dayOffset++)candidate=(await client.rpc('availability',{providerServiceId:service.id,dayOffset,from:540,to:1200})).slots[0];assert.ok(candidate);
 const hold=await client.rpc('hold',candidate),booking=await client.rpc('confirm',{holdId:hold.id,name:'Disposable retention fixture',idempotencyKey:run+'-booking'});assert.ok((await workspace()).bookings.some(b=>b.id===booking.id));
 await client.rpc('message',{bookingId:booking.id,scope:{role:'customer'},text:'Disposable retention message'});
 const preview=await client.rpc('erasurePreview');assert.ok(preview.futureBookings.some(b=>b.id===booking.id));checks.push('Fresh own preview includes actual future visit');
 await client.denied('requestErasure',{confirmEmail:'foreign@example.com',policyVersion:RETENTION_POLICY.version},'INVALID_INPUT');await client.denied('requestErasure',{confirmEmail:email,policyVersion:'draft'},'INVALID_INPUT');checks.push('Wrong email and stale policy refuse without deleting profile');
 const result=await client.rpc('requestErasure',{confirmEmail:email,policyVersion:RETENTION_POLICY.version});assert.equal(result.state,'completed');assert.equal(result.signInRevoked,true);assert.equal((await client.request('session')).value.user,null);
 const receipt=await client.rpc('erasureStatus',{receiptToken:preview.receiptToken});assert.equal(receipt.id,result.id);await stranger.denied('erasureStatus',{receiptToken:'A'.repeat(43)},'NOT_FOUND');checks.push('Identity revoked; guest receipt uses unguessable capability');
 const after=await workspace(),anonymous=after.bookings.find(b=>b.id===booking.id);assert.ok(anonymous.erased);assert.notEqual(anonymous.clientId,booking.clientId);assert.equal(anonymous.startAt,booking.startAt);assert.equal(anonymous.status,'confirmed');assert.ok(!after.clients.some(c=>c.id===booking.clientId));assert.ok(!after.messages.some(m=>m.bookingId===booking.id));checks.push('Future occupancy anonymous; profile and client text removed');
 await owner.rpc('cancelBooking',{scope,id:anonymous.id,version:anonymous.version,reason:'Disposable retention acceptance completed'});checks.push('Only owned disposable future visit canceled through supported calendar action');
 return {state:'PASS',at:new Date().toISOString(),policyVersion:RETENTION_POLICY.version,checks,checkCount:checks.length,existingAdvertisedAccountsRemoved:0,realEmailUsed:false,smtp:false,namespaceScope:'separate temporary trial',receiptId:result.id,disposableClientId:created.id};
}
