import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {build}=await import(pathToFileURL(path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting/node_modules/esbuild/lib/main.js')));
const result=await build({entryPoints:[path.join(import.meta.dirname,'public/waitlist-ui.mjs')],write:false,bundle:true,format:'esm',platform:'node',plugins:[{name:'public-root',setup(b){b.onResolve({filter:/^\/(cities|taxonomy|seo-contract)\.mjs$/},a=>({path:path.join(import.meta.dirname,a.path.slice(1))}));}}]});
const {waitlistSummary,waitlistAction,waitlistState}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('Only a live offer displays a selection action; completed/expired requests keep their criterion and never render a booking button',()=>{
 const ctx={adapter:{clock:{now:'2026-10-07T10:00:00Z'}},rows:[{id:'s',staffOptions:[{practitionerId:'p',name:'Test staff'}]}]},w={id:'w',providerServiceId:'s',state:'offered',criteria:{dateKey:'2026-10-08',from:900,to:960,practitionerId:'p'},offer:{expiresAt:'2026-10-07T10:15:00Z',candidate:{startAt:'2026-10-08T12:00:00Z',endAt:'2026-10-08T13:00:00Z',priceMinor:2500}}};
 assert.match(waitlistSummary(ctx,w),/accept-waitlist/);assert.match(waitlistSummary(ctx,w),/Test staff/);assert.doesNotMatch(waitlistSummary(ctx,w,{professional:true}),/accept-waitlist/);
 w.state='closed';assert.doesNotMatch(waitlistSummary(ctx,w),/accept-waitlist|close-waitlist/);w.state='offered';ctx.adapter.clock.now=w.offer.expiresAt;assert.doesNotMatch(waitlistSummary(ctx,w),/accept-waitlist|close-waitlist/);assert.equal(waitlistState(w,ctx.adapter.clock.now),'expired');assert.match(waitlistSummary(ctx,w),/galiojimas baigėsi/);
});
test('Stale waitlist claim refreshes the current request; an uncertain network failure preserves the same request for idempotent retry',async()=>{
 const w={id:'w',version:2,offer:{id:'o'}},ctx={workspace:{waitlist:[w]},state:{},adapter:{acceptWaitlist:async()=>{throw Object.assign(Error('Changed'),{code:'VERSION_CONFLICT'});}},render:async()=>{ctx.refreshed=true;},toast:message=>{ctx.message=message;}};
 assert.equal(await waitlistAction(ctx,'accept-waitlist',{dataset:{id:'w'}}),true);assert.equal(ctx.refreshed,true);assert.equal(ctx.message,'Changed');assert.equal(ctx.state.booking,undefined);
 ctx.refreshed=false;ctx.adapter.acceptWaitlist=async()=>{throw Object.assign(Error('Uncertain'),{code:'NETWORK_ERROR'});};await assert.rejects(()=>waitlistAction(ctx,'accept-waitlist',{dataset:{id:'w'}}),e=>e.code==='NETWORK_ERROR');assert.equal(ctx.refreshed,false);assert.equal(ctx.workspace.waitlist[0].offer.id,'o');
});
