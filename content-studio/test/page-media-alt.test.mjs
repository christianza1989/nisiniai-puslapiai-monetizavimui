import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,mkdtemp,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';
const parent=path.resolve(import.meta.dirname,'../tmp');await mkdir(parent,{recursive:true});
const root=await mkdtemp(path.join(parent,'page-alt-test-'));
process.env.STUDIO_DATA_DIR=path.join(root,'data');process.env.STUDIO_OUTPUT_DIR=path.join(root,'output');
const model=await import('../src/model.mjs');await model.initialize();
const publicRoot=process.env.STUDIO_PUBLIC_CORE_DIR||path.resolve(import.meta.dirname,'../../../dovanos-memorycasting');
const {validateContentPackage}=await import(pathToFileURL(path.join(publicRoot,'scripts/content-package-core.mjs')));
const body=[{type:'paragraph',text:'Synthetic isolated test of per-page media context. These are test fixtures, not business facts or public product descriptions. The attachment descriptions must remain independent of the shared source library and previously approved snapshots.'}];

for(const schemaVersion of [1,2])test(`V${schemaVersion} shared family has independent page alt without source or approved snapshot edits`,async()=>{
 const site=await model.createSite({canonicalHost:`page-alt-v${schemaVersion}.example`,name:'Synthetic fixture',offer:'Synthetic isolated media fixture',schemaVersion,...(schemaVersion===2?{renderer:'gift'}:{})});
 await model.editSite(site.id,{facts:'Synthetic isolated test only.'});
 const bytes=await sharp({create:{width:800,height:600,channels:3,background:'#667788'}}).png().toBuffer();
 const family=await model.saveResponsiveAsset(site.id,{mime:'image/png',alt:'Library default',rights:'Synthetic fixture only',prompt:'Private source prompt'},bytes);
 const make=(type,slug)=>model.addPage(site.id,{type,slug,title:'Synthetic fixture',description:'Synthetic isolated test',intent:'Fixture',body});
 const first=await make('home',''),second=await make('service','second'),legacy=await make('service','legacy');
 const originalAssets=structuredClone((await model.getSite(site.id)).assets);
 await model.editPage(site.id,first.id,{media:[{id:family.id,alt:'First page context'},{id:family.variants.at(-1).id,alt:'First page context'}]});
 await model.editPage(site.id,second.id,{media:[{id:family.id,alt:'Second page context'}]});
 await model.editPage(site.id,legacy.id,{media:[{id:family.id}]});
 let state=await model.getSite(site.id);
 assert.deepEqual(state.assets,originalAssets);
 for(const [pageId,alt]of[[first.id,'First page context'],[second.id,'Second page context'],[legacy.id,'Library default']]){
  const media=state.pages.find(p=>p.id===pageId).media;
  assert.equal(media.length,family.variants.length);assert.ok(media.every(item=>item.alt===alt&&item.familyId===family.groupId));
 }
 for(const alt of ['', ' ',null,undefined,123,{},'x'.repeat(301)]){
  const before=await model.getSite(site.id);
  await assert.rejects(()=>model.editPage(site.id,first.id,{media:[{id:family.id,alt}]}),/alt/);
  assert.deepEqual(await model.getSite(site.id),before);
 }
 const beforeConflict=await model.getSite(site.id);
 await assert.rejects(()=>model.editPage(site.id,first.id,{media:[{id:family.id,alt:'One'},{id:family.variants.at(-1).id,alt:'Two'}]}),/šeimos alt/);
 await assert.rejects(()=>model.editPage(site.id,first.id,{media:[{id:family.id,alt:'One'},{id:family.id}]}),/šeimos alt/);
 assert.deepEqual(await model.getSite(site.id),beforeConflict);
 await model.editPage(site.id,second.id,{media:[{id:family.id,alt:'x'.repeat(300)}]});
 assert.equal((await model.getSite(site.id)).pages.find(p=>p.id===second.id).media[0].alt.length,300);
 await model.editPage(site.id,second.id,{media:[{id:family.id,alt:'Second page context'}]});
 // An explicit library correction updates legacy defaults, not reviewed page context.
 await model.editDraftAssetMetadata(site.id,family.id,{alt:'Corrected library default'},'synthetic-reviewer');
 state=await model.getSite(site.id);
 assert.ok(state.pages.find(p=>p.id===first.id).media.every(m=>m.alt==='First page context'));
 assert.ok(state.pages.find(p=>p.id===second.id).media.every(m=>m.alt==='Second page context'));
 assert.ok(state.pages.find(p=>p.id===legacy.id).media.every(m=>m.alt==='Corrected library default'));
 await model.approvePage(site.id,first.id,'synthetic-reviewer');
 const approved=model.packageForSite(await model.getSite(site.id));validateContentPackage(approved);
 const snapshot=JSON.stringify(approved.pages[0]);
 assert.ok(approved.pages[0].media.every(m=>m.alt==='First page context'));
 await model.editPage(site.id,first.id,{media:[{id:family.id,alt:'Later unapproved context'}]});
 assert.equal(JSON.stringify(model.packageForSite(await model.getSite(site.id)).pages[0]),snapshot);
 await model.editPage(site.id,second.id,{media:[{id:family.id,alt:'Another independent context'}]});
 assert.equal(JSON.stringify(model.packageForSite(await model.getSite(site.id)).pages[0]),snapshot);
 await assert.rejects(()=>model.editDraftAssetMetadata(site.id,family.id,{alt:'Must not mutate approved source'}),/nekintami/);
 assert.equal(JSON.stringify(model.packageForSite(await model.getSite(site.id)).pages[0]),snapshot);
});
test.after(async()=>{assert.ok(root.startsWith(parent+path.sep));await rm(root,{recursive:true,force:true});});
