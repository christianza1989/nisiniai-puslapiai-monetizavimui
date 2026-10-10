import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {trialBrowser} from '../trial-20261010/operations-accept.mjs';
const dir=path.resolve(import.meta.dirname,'../cloudflare/output/auth-social-20261011/trial'),phase=process.argv[2];await mkdir(dir,{recursive:true});
const browser=trialBrowser();await browser.request('session');const catalog=await browser.rpc('catalog'),ids=[...new Set(catalog.map(s=>s.organizationId))].sort(),profiles=[];
for(const id of ids)profiles.push(await browser.rpc('profile',{id}));assert.equal(profiles.filter(p=>p.kind==='solo').length,40);assert.equal(profiles.filter(p=>p.kind==='salon').length,5);
const boot=await(await fetch('https://bandymas.madbeauty.lt/boot.json')).json();assert.equal(boot.temporaryTest.expiresAt,'2026-10-16T21:10:47.982Z');
if(phase==='before'){await writeFile(path.join(dir,'public-before.private.json'),JSON.stringify({profiles,catalog,at:new Date().toISOString()}));console.log('Captured existing 45 public fixture profiles before additive review initialization');}
else{assert.equal(phase,'after');const before=JSON.parse(await readFile(path.join(dir,'public-before.private.json')));assert.deepEqual(catalog.map(({reviewSummary,...s})=>s),before.catalog.map(({reviewSummary,...s})=>s));let added=0;
 for(const p of profiles){const old=before.profiles.find(x=>x.id===p.id);assert.deepEqual({...p,reviews:[]},{...old,reviews:[]});for(const r of old.reviews)assert.deepEqual(p.reviews.find(x=>x.id===r.id),r);const extra=p.reviews.filter(r=>!old.reviews.some(x=>x.id===r.id));for(const r of extra)assert.ok(r.id.startsWith('demo-trial-review-')&&r.text.startsWith('Bandomasis atsiliepimas · '));added+=extra.length;assert.ok(p.reviews.length>=11&&p.reviews.length<=21);}
 await writeFile(path.join(dir,'preservation.json'),JSON.stringify({state:'PASS',profiles:45,solos:40,addedPublicReviews:added,range:[Math.min(...profiles.map(p=>p.reviews.length)),Math.max(...profiles.map(p=>p.reviews.length))],existingReviewsPreserved:true,profilesOffersGalleriesPreserved:true,expiresAt:boot.temporaryTest.expiresAt,at:new Date().toISOString()},null,2));console.log(JSON.stringify({state:'PASS',profiles:45,addedPublicReviews:added}));
}
