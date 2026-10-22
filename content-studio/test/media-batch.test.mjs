import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,mkdtemp,readFile,rm} from 'node:fs/promises';
import sharp from 'sharp';
const parent=path.resolve(import.meta.dirname,'../tmp');await mkdir(parent,{recursive:true});
const root=await mkdtemp(path.join(parent,'media-batch-test-'));
process.env.STUDIO_DATA_DIR=path.join(root,'data');process.env.STUDIO_OUTPUT_DIR=path.join(root,'output');
const model=await import('../src/model.mjs');await model.initialize();
const body=[{type:'paragraph',text:'Synthetic isolated regression for bounded media-only batches. The batch may update only draft attachment data and review status, while original text, URLs, publication times, site snapshots and all approved historical page revisions remain unchanged.'}];
const image=await sharp({create:{width:800,height:600,channels:3,background:'#778899'}}).png().toBuffer();
const file=id=>path.join(root,'data/sites',`${id}.json`);
const makeSite=(name,schemaVersion=1)=>model.createSite({canonicalHost:`${name}.example`,name:'Synthetic batch fixture',offer:'Synthetic isolated test',schemaVersion,...(schemaVersion===2?{renderer:'gift'}:{})});
const makePage=(site,slug)=>model.addPage(site.id,{type:slug?'service':'home',slug,title:`Synthetic ${slug||'home'}`,description:'Synthetic local fixture',intent:'Test',body});
const withoutMutable=({media,status,approval,updatedAt,...rest})=>rest;

for(const version of [1,2])test(`V${version} media-only batch reuses single attachment semantics and preserves every nonmedia field and approved snapshot`,async()=>{
 const site=await makeSite(`batch-v${version}`,version);await model.editSite(site.id,{facts:'Synthetic fixture only.'});
 const asset=await model.saveResponsiveAsset(site.id,{mime:'image/png',alt:'Library default',rights:'Synthetic fixture only'},image);
 const first=await makePage(site,''),second=await makePage(site,'second'),untouched=await makePage(site,'untouched'),reference=await makePage(site,'reference');
 for(const page of [first,second]) {
  await model.editPage(site.id,page.id,{media:[{id:asset.id,alt:`Old ${page.id}`}],cluster:'Retained cluster',seasonalHook:'Retained fixture context'});
  await model.approvePage(site.id,page.id,'synthetic-reviewer');
 }
 const selection=[{id:asset.id,alt:'Second context'},{id:asset.variants.at(-1).id,alt:'Second context'}];
 const single=await model.editPage(site.id,reference.id,{media:selection});
 const before=await model.getSite(site.id),oldPublic=structuredClone(model.packageForSite(before).pages);
 const result=await model.editPageMediaBatch(site.id,[{pageId:second.id,media:selection},{pageId:first.id,media:[{id:asset.id,alt:'First context'}]}]);
 assert.deepEqual(result.map(p=>p.id),[second.id,first.id]);assert.equal(result.length,2);
 assert.deepEqual(result[0].media,single.media);assert.ok(result.every(p=>!('assets'in p)&&!('pages'in p)));
 const after=await model.getSite(site.id);assert.deepEqual(after.assets,before.assets);
 for(const [pageId,alt]of[[first.id,'First context'],[second.id,'Second context']]) {
  const previous=before.pages.find(p=>p.id===pageId),changed=after.pages.find(p=>p.id===pageId);
  assert.deepEqual(withoutMutable(changed),withoutMutable(previous));
  assert.equal(changed.status,'review');assert.equal(changed.approval,null);assert.ok(Number.isFinite(Date.parse(changed.updatedAt)));
  assert.equal(changed.media.length,asset.variants.length);assert.ok(changed.media.every(m=>m.alt===alt&&m.familyId===asset.groupId));
  assert.equal(new Set(changed.media.map(m=>m.id)).size,changed.media.length);
  assert.deepEqual(changed.publishedRevision,previous.publishedRevision);
 }
 for(const pageId of[untouched.id,reference.id])assert.deepEqual(after.pages.find(p=>p.id===pageId),before.pages.find(p=>p.id===pageId));
 assert.deepEqual(model.packageForSite(after).pages,oldPublic);
 // Clearing a draft gallery is allowed; it still cannot mutate the public snapshot.
 await model.editPageMediaBatch(site.id,[{pageId:first.id,media:[]}]);
 assert.deepEqual((await model.getSite(site.id)).pages.find(p=>p.id===first.id).media,[]);
 assert.deepEqual(model.packageForSite(await model.getSite(site.id)).pages,oldPublic);
});

test('the whole batch rolls back when a later page, family, alt or media-only payload is invalid',async()=>{
 const site=await makeSite('batch-rollback'),foreign=await makeSite('batch-foreign');
 const first=await makePage(site,''),second=await makePage(site,'second'),foreignPage=await makePage(foreign,'');
 const asset=await model.saveResponsiveAsset(site.id,{mime:'image/png',alt:'Default',rights:'Synthetic fixture only'},image);
 const foreignAsset=await model.saveResponsiveAsset(foreign.id,{mime:'image/png',alt:'Foreign',rights:'Synthetic fixture only'},image);
 const legacy=await model.saveAsset(site.id,{mime:'image/webp',width:800,height:600,alt:'Legacy default',rights:'Synthetic fixture only'},await sharp(image).webp().toBuffer());
 const legacyBatch=await model.editPageMediaBatch(site.id,[{pageId:second.id,media:[{id:legacy.id}]}]);
 const legacySingle=await model.editPage(site.id,first.id,{media:[{id:legacy.id}]});
 assert.deepEqual(legacyBatch[0].media,legacySingle.media);assert.equal(legacyBatch[0].media[0].alt,'Legacy default');assert.ok(!('familyId'in legacyBatch[0].media[0]));
 const valid={pageId:first.id,media:[{id:asset.id,alt:'Would change first page'}]};
 const baseline=await readFile(file(site.id));
 const invalidBatches=[
  [valid,{pageId:second.id,media:[{id:'missing'}]}],
  [valid,{pageId:foreignPage.id,media:[]}],
  [valid,{pageId:second.id,media:[{id:foreignAsset.id}]}],
  [valid,{pageId:second.id,media:[{id:asset.id,alt:' '}]}],
  [valid,{pageId:second.id,media:[{id:asset.id,alt:'x'.repeat(301)}]}],
  [valid,{pageId:second.id,media:[{id:asset.id,alt:'One'},{id:asset.variants.at(-1).id,alt:'Two'}]}],
  [valid,{pageId:second.id,media:[],title:'Must not be changed'}],
  [valid,{pageId:second.id,media:null}],
  [valid,{pageId:second.id}],
  [valid,{pageId:first.id,media:[]}],
  [valid,null],
  [],null,{}
 ];
 for(const entries of invalidBatches) {
  await assert.rejects(()=>model.editPageMediaBatch(site.id,entries));
  assert.deepEqual(await readFile(file(site.id)),baseline);
 }
 // Each family contains three genuine WebP variants: 21 families exceeds60.
 const assets=[asset];for(let i=0;i<20;i++)assets.push(await model.saveResponsiveAsset(site.id,{mime:'image/png',alt:`Default ${i}`,rights:'Synthetic fixture only'},image));
 const beforeOverflow=await readFile(file(site.id));
 await assert.rejects(()=>model.editPageMediaBatch(site.id,[valid,{pageId:second.id,media:assets.map(a=>({id:a.id}))}]),/60/);
 assert.deepEqual(await readFile(file(site.id)),beforeOverflow);
});

test('100 distinct pages are bounded, 101 rejects atomically and concurrent batches do not lose updates',async()=>{
 assert.equal(model.MAX_MEDIA_BATCH_PAGES,100);
 const site=await makeSite('batch-boundary'),pages=[];
 const tiny=await sharp({create:{width:120,height:60,channels:3,background:'#667788'}}).png().toBuffer();
 const asset=await model.saveResponsiveAsset(site.id,{mime:'image/png',alt:'Default',rights:'Synthetic fixture only'},tiny);
 for(let i=0;i<100;i++)pages.push(await makePage(site,i?`page-${i}`:''));
 const entries=pages.map((page,i)=>({pageId:page.id,media:[{id:asset.id,alt:`Context ${i}`}]}));
 const changed=await model.editPageMediaBatch(site.id,entries);assert.equal(changed.length,100);
 assert.deepEqual(changed.map(p=>p.id),pages.map(p=>p.id));
 const before=await readFile(file(site.id));
 await assert.rejects(()=>model.editPageMediaBatch(site.id,[...entries,{pageId:'must-not-be-read',media:[]}]),/100/);
 assert.deepEqual(await readFile(file(site.id)),before);
 await Promise.all([model.editPageMediaBatch(site.id,entries.slice(0,50).map(e=>({...e,media:[{id:asset.id,alt:'First half'}]}))),model.editPageMediaBatch(site.id,entries.slice(50).map(e=>({...e,media:[{id:asset.id,alt:'Second half'}]})))]);
 const state=await model.getSite(site.id);
 for(let i=0;i<100;i++)assert.equal(state.pages.find(p=>p.id===pages[i].id).media[0].alt,i<50?'First half':'Second half');
});
test.after(async()=>{assert.ok(root.startsWith(parent+path.sep));await rm(root,{recursive:true,force:true});});
