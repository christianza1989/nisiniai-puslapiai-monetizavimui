import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolveMode} from './config.mjs';
import {makeClock,generateDemo,localInstant,visitFits} from './demo-model.mjs';
import {createAdapter} from './demo-adapter.mjs';
import {createKitServer} from './server.mjs';
const clock=makeClock('2026-10-05T08:00:00Z');
test('Production cannot enable demo; off never returns fictitious supply',async()=>{
  assert.throws(()=>resolveMode({enabled:true,deployment:'production'}),/forbidden/);
  const adapter=createAdapter();assert.equal(adapter.mode,'off');assert.deepEqual(await adapter.catalog(),[]);assert.equal(await adapter.profile('demo-org-0'),null);assert.deepEqual(await adapter.appointments(),[]);
});
test('A real transport failure propagates without mock fallback',async()=>{
  const real={catalog:async()=>{throw Error('offline');}};
  const adapter=createAdapter({realAdapter:real});assert.equal(adapter,real);await assert.rejects(()=>adapter.catalog(),/offline/);
});
test('Seed is reproducible, references consistent, contacts fictional and review tied to completed visit',()=>{
  const d=generateDemo(clock);assert.deepEqual(d,generateDemo(clock));
  for(const [k,n] of Object.entries({organizations:30,practitioners:42,services:126,clients:120,bookings:480,reviews:96,waitlist:24,inquiries:30}))assert.equal(d[k].length,n,k);
  for(const c of d.clients){assert.match(c.email,/@example\.com$/);assert.equal(c.isDemo,true);}
  for(const b of d.bookings){const s=d.services.find(x=>x.id===b.providerServiceId),c=d.clients.find(x=>x.id===b.clientId);assert.equal(s.organizationId,b.organizationId);assert.equal(c.organizationId,b.organizationId);assert.equal(s.practitionerId,b.practitionerId);assert.ok(Date.parse(b.endAt)>Date.parse(b.startAt));}
  for(const r of d.reviews){const b=d.bookings.find(x=>x.id===r.bookingId);assert.equal(b.status,'completed');assert.equal(b.organizationId,r.organizationId);}
});
test('City/service filters preserve eligible IDs; public catalog omits client data and pending profiles',async()=>{
  const a=createAdapter({enabled:true,deployment:'local-preview',clock});
  const result=await a.catalog({city:'Vilnius',taxonomyServiceId:'gelinis-lakavimas'});assert.ok(result.length>0);
  for(const r of result){assert.equal(r.city,'Vilnius');assert.equal(r.taxonomyServiceId,'gelinis-lakavimas');assert.ok(!('clients' in r)&&!('email' in r));assert.notEqual(r.organizationId,'demo-org-29');}
  assert.equal(await a.profile('demo-org-29'),null);await assert.rejects(()=>a.appointments(),/scope/);
});
test('Stale and missing calendar differ from empty catalog',async()=>{
  for(const [scenario,want] of [['stale','stale'],['no-calendar','none']]){const a=createAdapter({enabled:true,deployment:'local-preview',clock,scenario});const rows=await a.catalog();assert.ok(rows.length>0);assert.ok(rows.every(x=>x.calendarState===want));}
  assert.deepEqual(await createAdapter({enabled:true,deployment:'local-preview',clock,scenario:'empty'}).catalog(),[]);
});
test('Whole procedure and added duration must fit requested interval',()=>{
  const windowStart='2026-10-06T14:00:00Z',windowEnd='2026-10-06T17:00:00Z';
  assert.equal(visitFits({startAt:'2026-10-06T16:00:00Z',durationMin:60,windowStart,windowEnd}),true);
  assert.equal(visitFits({startAt:'2026-10-06T16:00:00Z',durationMin:60,addonDurationMin:15,windowStart,windowEnd}),false);
  assert.equal(visitFits({startAt:'2026-10-06T13:59:00Z',durationMin:30,windowStart,windowEnd}),false);
});
test('Vilnius local days survive DST and reject ambiguous/nonexistent local time',()=>{
  const fall=makeClock('2026-10-24T08:00:00Z');
  assert.equal(localInstant(fall,0,600),'2026-10-24T07:00:00.000Z');assert.equal(localInstant(fall,1,600),'2026-10-25T08:00:00.000Z');
  assert.throws(()=>localInstant(fall,1,210),/Ambiguous/);
  assert.throws(()=>localInstant(makeClock('2026-03-28T08:00:00Z'),1,210),/Nonexistent/);
});
test('All media variants exist, match hashes and use shared responsive policy',async()=>{
  const manifest=JSON.parse(await readFile(new URL('./ASSET_MANIFEST.json',import.meta.url),'utf8'));assert.equal(manifest.assets.length,11);
  for(const a of manifest.assets){assert.ok(a.alt);assert.equal(a.policy,'responsive-webp-v1');assert.equal(a.variants.length,5);for(const v of a.variants){const b=await readFile(new URL('./public/'+v.file,import.meta.url));assert.equal(createHash('sha256').update(b).digest('hex'),v.sha256);assert.ok(v.width<=1600&&v.height<=1600);assert.equal(b.subarray(8,12).toString(),'WEBP');}}
});
test('Private originals, parent docs and mutating requests are inaccessible; preview noindex enforced',async()=>{
  const s=createKitServer();await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+s.address().port;
  try {const r=await fetch(base);assert.equal(r.status,200);assert.match(r.headers.get('x-robots-tag'),/noindex/);
    for(const url of ['/private-originals/nails-neutral-v1.png','/../DEMO_DATA_CONTRACT.md','/asset-inputs.json','/%2e%2e%2fASSET_MANIFEST.json'])assert.equal((await fetch(base+url)).status,404);
    assert.equal((await fetch(base,{method:'POST',body:'test'})).status,405);
  } finally {await new Promise(resolve=>s.close(resolve));}
});
