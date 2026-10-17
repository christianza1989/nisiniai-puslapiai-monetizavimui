import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=path.resolve('..'),read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const seed=read('content/seed.json'),api=read(root+'/research/full-product-galleries-2026-10-12/configuration-galleries.json');
const norm=s=>{const u=new URL(s,'https://catalog.invalid');for(const k of [...u.searchParams.keys()])if(['width','height','quality','mode','format'].includes(k.toLowerCase()))u.searchParams.delete(k);u.hash='';return u.href;};
const options=c=>c.supplierOptions||new URLSearchParams(c.configurator?new URL(c.configurator).hash.slice(1):'').get('ovc')?.split(';').filter(Boolean)||[];
const signature=c=>JSON.stringify([c.code,[...options(c)].sort()]);
const reviewedSourcePatterns={
 '20949684':/\/01-dallas-table-55x55-bl-szph000-/i,
 '20949686':/\/02-dallas-table-55x55-nk-szmh000-/i,
 '23766670':/\/02-offa-sideboard-triple-box-wd000-/i,
 '24031746':/\/pw-2-0-desk-t-leg-m-pnm000-/i,
};
const byConfig=new Map(api.map(r=>[r.id,r]));assert.equal(byConfig.size,api.length,'Repeated API configuration ID');
const standaloneSelections={
 'product_aimo-swivel-chairs_35228f02':[0,1,2,3,4,5,6,7,8],
 'product_beta-beam-seating_2d8141c9':[0,1,2,3,4],
 'product_meti-orga-towers-pedestals_3c64c458':[0,1,2,3,4,5,6,7],
 'product_oxo-pouffes_d48df641':[0],
 'product_ozone-armchairs-leg-rests_df03a929':[0,1,2],
 'product_ozone-cafe-lounge-tables_f95462eb':[0,1,2],
 'product_ozone-sofas_0e5fc7c6':[1,4,5,6,7],
 'product_tento-2-0-cabinets-sideboards_6a0a1df6':[0,1,2,3,4,5,6,7,8,9,10,11],
 'product_zef-swivel-chairs_4db3d662':[0,1,2,3,4,5,6,7,8,9,10,11],
};
const records={},pending=[],sources=new Map(),finishReviews=[];let configurations=0;
for(const p of seed.products){
 const entry={name:p.name,sourcePage:p.sourceUrl,configurations:{}};
 for(const c of p.configurations){
  const row=byConfig.get(c.id);assert(row&&row.productId===p.id,'API ownership mismatch '+p.id+':'+c.id);assert(row.success,'Unsuccessful API evidence '+c.id);
  const cacheFile=root+'/research/full-product-galleries-2026-10-12/configuration-responses/'+c.id+'.json',bytes=fs.readFileSync(cacheFile),payload=JSON.parse(bytes);
  assert(payload.success&&payload.items?.length,'Missing API photographs '+c.id);
  const photos=payload.items.map(item=>({url:item.picture?.src||item.download,caption:item.text||'',role:'angle'})).filter(i=>i.url&&/\.(jpg|jpeg|png|webp)(?:\?|$)/i.test(i.url));
  assert.deepEqual(photos.map(i=>i.url),row.images,'Cached API map drift '+c.id);
  let selectedPhotos=photos;
  const reviewedPattern=reviewedSourcePatterns[c.id];
  if(reviewedPattern){
   assert(reviewedPattern.test(c.image),'Reviewed primary changed '+c.id);
   selectedPhotos=photos.filter(i=>reviewedPattern.test(i.url));
   assert.equal(selectedPhotos.length,c.id.startsWith('209496')?7:8,'Reviewed angle set changed '+c.id);
   const familyOnly=photos.filter(i=>!selectedPhotos.includes(i));
   entry.familyGallery=[...(entry.familyGallery||[]),...familyOnly.map(i=>i.url)];
   finishReviews.push({productId:p.id,configurationId:c.id,familyOnly:familyOnly.map(i=>i.url),reason:'Filename comparison across all 1102 API records plus rendered-photo review: Dallas frame finish, Offa cabinet shape, or Play&Work screen finish differs from this exact supplier example.'});
  }
  if(c.id==='16088242'){
   assert(/laminat-u773/i.test(c.image)&&options(c).some(o=>o.endsWith('=U773')),'Reviewed Cadeira finish changed; require a new review.');
   selectedPhotos=photos.filter(i=>/laminat-u773/i.test(i.url));assert.equal(selectedPhotos.length,8);
   const familyOnly=photos.filter(i=>!selectedPhotos.includes(i));entry.familyGallery=[...(entry.familyGallery||[]),...familyOnly.map(i=>i.url)];
   finishReviews.push({productId:p.id,configurationId:c.id,selectedFinish:'U773',otherFinish:'wood 1-007',familyOnly:familyOnly.map(i=>i.url),reason:'API mixes two finishes; visual comparison and supplier option U773 confirm white laminate for this specific example.'});
  }
  assert(selectedPhotos.some(i=>norm(i.url)===norm(c.image)),'Primary not present in approved API angles '+c.id);
  const urls=[c.image,...selectedPhotos.map(i=>i.url)].filter(Boolean),seen=new Set();
  const gallery=urls.filter(src=>{const id=norm(src);if(seen.has(id))return false;seen.add(id);return true;});
  for(const photo of photos){
   if(/DUO-BACK/i.test(c.description)&&/\bMESH\b/i.test(photo.caption))throw Error('Contradictory backrest caption '+c.id);
   const id=norm(photo.url),owners=sources.get(id)||[];owners.push({productId:p.id,configurationId:selectedPhotos.includes(photo)?c.id:null});sources.set(id,owners);
  }
  entry.configurations[c.id]={code:c.code,signature:signature(c),primary:c.image||gallery[0],gallery,apiUrl:row.url,responseSha256:createHash('sha256').update(bytes).digest('hex'),photos:selectedPhotos};configurations++;
 }
 if(!p.configurations.length){
  const refs=[...new Set([p.image,...p.gallery].filter(Boolean))],selected=standaloneSelections[p.id];assert(selected,'Unreviewed standalone '+p.id);
  const approved=selected.map(n=>{assert(refs[n],'Invalid review index '+p.id);return refs[n];});
  entry.standalone={primary:approved[0],gallery:approved,review:'Source-page context and local full contact-sheet visual review 2026-10-13; unspecified model family without configuration IDs.'};
  for(let n=0;n<refs.length;n++)if(!selected.includes(n))pending.push({productId:p.id,source:refs[n],reason:p.name==='OXO'?'Broader cabinet/module system; not verified as the pouffe':'Armchair-only or ambiguous scene; sofa attribution not proven'});
 }
 records[p.id]=entry;
}
const registry={schemaVersion:1,sourceSeedSha256:createHash('sha256').update(fs.readFileSync('content/seed.json')).digest('hex'),records};
fs.writeFileSync('content/photo-attribution-evidence.json',JSON.stringify(registry)+'\n');
// The immutable seed is already bundled by the catalogue. Use its original
// configuration signatures at runtime rather than bundling a second copy of
// every supplier option. Full signatures remain in private evidence above.
const runtime={schemaVersion:2,sourceSeedSha256:registry.sourceSeedSha256,records:Object.fromEntries(Object.entries(records).map(([id,record])=>[id,{configurations:Object.fromEntries(Object.entries(record.configurations).map(([cid,c])=>[cid,{primary:c.primary,gallery:c.gallery}])),...(record.standalone?{standalone:{primary:record.standalone.primary,gallery:record.standalone.gallery}}:{}),...(record.familyGallery?{familyGallery:record.familyGallery}:{})}]))};
fs.writeFileSync('content/photo-attribution.json',JSON.stringify(runtime)+'\n');
const report={products:Object.keys(records).length,configurations,standalone:Object.values(records).filter(r=>r.standalone).length,photos: [...sources].map(([url,owners])=>({url,owners})),finishReviews,excludedStandalone:pending,lowPhotoConfigurations:api.filter(r=>r.images.length<3).map(r=>({productId:r.productId,configurationId:r.id,photos:r.images.length,source:r.url}))};
fs.writeFileSync('D:/Core/output/ergonomic-gallery-attribution-20261013/attribution-evidence.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({products:report.products,configurations,standalone:report.standalone,excludedStandalone:pending.length,sourcePhotos:sources.size}));
