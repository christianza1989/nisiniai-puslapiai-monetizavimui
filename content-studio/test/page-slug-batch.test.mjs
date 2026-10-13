import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
const root=await mkdtemp(path.join(os.tmpdir(),'page-slug-batch-'));
const config=path.join(root,'network.json');
await writeFile(config,JSON.stringify({defaultEmail:'fixture@example.test'}));
process.env.STUDIO_DATA_DIR=path.join(root,'data');
process.env.STUDIO_OUTPUT_DIR=path.join(root,'output');
process.env.STUDIO_NETWORK_SETTINGS=config;
const model=await import('../src/model.mjs');
await model.initialize();
test.after(async()=>{assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('page-slug-batch-'));await rm(root,{recursive:true,force:true});});
async function fixture(domain){
 const site=await model.createSite({canonicalHost:domain,name:'URL test fixture',offer:'Synthetic acceptance only'});
 await model.editSite(site.id,{facts:'Isolated synthetic test facts; no real business or deployment.'});
 const pages=[];
 for(const slug of ['first','second']){
  const p=await model.addPage(site.id,{slug,type:'service',title:'Synthetic page '+slug,description:'An isolated URL migration fixture.',intent:'Synthetic URL migration',publishAt:'2026-10-01T08:00:00Z',body:[{type:'paragraph',text:'Synthetic URL migration fixture; never deployed as a real offer. This page exists only to verify draft identity, atomic path changes and preservation of approved snapshots. Its content is not a product or customer record.'}]});
  pages.push(await model.approvePage(site.id,p.id,'synthetic-fixture'));
 }
 return {site:await model.getSite(site.id),pages};
}
const change=(p,slug)=>({pageId:p.id,expectedSlug:p.slug,expectedRevisionHash:model.revisionHash(p),slug});
const bytes=id=>readFile(path.join(process.env.STUDIO_DATA_DIR,'sites',id+'.json'),'utf8');
test('slug batch permits a collision-free swap, preserves published snapshots and never approves',async()=>{
 const a=await fixture('slug-batch.example'),b=await fixture('slug-other.example'),other=await bytes(b.site.id);
 const result=await model.editPageSlugs(a.site.id,[change(a.pages[0],'second'),change(a.pages[1],'first')]);
 assert.equal(result.approval,'not-performed');
 const after=await model.getSite(a.site.id);
 for(const [i,p] of after.pages.entries()){
  assert.equal(p.slug,i===0?'second':'first');assert.equal(p.approval,null);assert.equal(p.status,'review');
  assert.deepEqual(p.publishedRevision,a.pages[i].publishedRevision);
  for(const field of ['id','title','body','media','links','publishAt'])assert.deepEqual(p[field],a.pages[i][field]);
 }
 assert.equal(await bytes(b.site.id),other);
});
test('stale slug/revision, final collisions, foreign/duplicate IDs and unsafe/oversized paths write nothing',async()=>{
 const a=await fixture('slug-invalid.example'),b=await fixture('slug-foreign.example');
 const expectUnchanged=async(changes,pattern)=>{const before=await bytes(a.site.id);await assert.rejects(()=>model.editPageSlugs(a.site.id,changes),pattern);assert.equal(await bytes(a.site.id),before);};
 const fresh=[change(a.pages[0],'new-first'),change(a.pages[1],'new-second')];
 await expectUnchanged([{...fresh[0],expectedSlug:'stale'},fresh[1]],/pasikeitė/);
 await expectUnchanged([fresh[0],{...fresh[1],expectedRevisionHash:'0'.repeat(64)}],/pasikeitė/);
 await expectUnchanged([fresh[0],{...fresh[1],slug:'new-first'}],/jau suplanuotas/);
 await expectUnchanged([change(a.pages[0],'second')],/jau suplanuotas/);
 await expectUnchanged([fresh[0],change(b.pages[0],'foreign')],/nepriklauso/);
 await expectUnchanged([fresh[0],fresh[0]],/unikalių/);
 for(const slug of ['../private','api/private','UPPER',' safe ','a'.repeat(151)])await expectUnchanged([fresh[0],{...fresh[1],slug}],/formatą|Netinkamas/);
 await expectUnchanged([],/1–200/);
 await expectUnchanged(Array.from({length:201},()=>fresh[0]),/1–200/);
});
