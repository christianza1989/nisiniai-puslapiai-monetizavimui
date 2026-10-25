import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root=await mkdtemp(path.join(os.tmpdir(),'studio-own-reference-'));
process.env.STUDIO_DATA_DIR=path.join(root,'data');
process.env.STUDIO_OUTPUT_DIR=path.join(root,'output');
process.env.STUDIO_NETWORK_SETTINGS=path.join(root,'network.json');
await writeFile(process.env.STUDIO_NETWORK_SETTINGS,JSON.stringify({defaultEmail:'isolated@example.invalid',operatorName:'Synthetic test only'}));
const model=await import('../src/model.mjs');
await model.initialize();

test.after(async()=>{
 const resolved=path.resolve(root),temporaryRoot=path.resolve(os.tmpdir())+path.sep;
 assert.ok(resolved.startsWith(temporaryRoot)&&path.basename(resolved).startsWith('studio-own-reference-'));
 await rm(resolved,{recursive:true,force:true});
});

const text='Izoliuotas sintetinis instrukcijų bandymas tikrina nuorodą į savininko PDF dokumentą. Šis tekstas nėra tikro verslo turinys, patvirtinta instrukcija ar dokumento veikimo internete įrodymas.';
async function site(domain){
 const created=await model.createSite({canonicalHost:domain,name:'Sintetinis nuorodų bandymas',offer:'Tik izoliuota regresija'});
 await model.editSite(created.id,{facts:'Sintetiniai faktai tik izoliuotam modeliui patikrinti.'});
 return created;
}
async function page(owner,slug='instrukcijos'){
 return model.addPage(owner.id,{type:'faq',slug,title:'Sintetinės instrukcijos',description:'Tik izoliuotas šaltinių patvirtinimo bandymas.',intent:'Patikrinti šaltinių patvirtinimo vartus',publishAt:'2026-01-01T00:00:00.000Z',body:[{type:'paragraph',text}]});
}
async function review(owner,id){
 const draft=(await model.getSite(owner.id)).pages.find(item=>item.id===id),hash=model.revisionHash(draft);
 await model.recordEditorialReview(owner.id,id,{reviewer:'isolated-reference-test',revisionHash:hash,evidence:Object.fromEntries(['usefulness','facts','sources','media','links','presentation'].map(area=>[area,`Sintetinis ${area} vartų įrodymas tik izoliuotam modeliui, ne gyvo turinio peržiūra.`]))});
 return hash;
}
const sourceFor=owner=>({url:`https://${owner.canonicalHost}/dokumentai/instrukcija.pdf`,label:'savininko PDF dokumentą',reason:'Izoliuotai patikrinti tos pačios svetainės HTTPS šaltinio patvirtinimą.',verified:true});

test('regression: a verified same-site HTTPS PDF approves through the actual revision-bound reviewed batch',async()=>{
 const owner=await site('own-pdf.example'),draft=await page(owner),source=sourceFor(owner);
 await model.editPage(owner.id,draft.id,{externalLinks:[source]});
 await assert.rejects(()=>model.approveReviewedBatch(owner.id,[draft.id],'isolated-test'),/peržiūros/,'source metadata alone cannot bypass editorial review');
 const hash=await review(owner,draft.id);
 assert.deepEqual((await model.getSite(owner.id)).pages[0].networkLinkSuggestions,[]);
 const receipt=await model.approveReviewedBatch(owner.id,[draft.id],'isolated-test');
 assert.equal(receipt.deployment,'not-performed');
 const approved=(await model.getSite(owner.id)).pages.find(item=>item.id===draft.id);
 assert.equal(approved.approval.revisionHash,hash);assert.equal(approved.publishedRevision.revisionHash,hash);
 assert.deepEqual(approved.publishedRevision.externalLinks,[{url:source.url,label:source.label,reason:source.reason}]);
 const exported=model.packageForSite(await model.getSite(owner.id));
 assert.deepEqual(exported.pages[0].externalLinks,approved.publishedRevision.externalLinks);
});

test('same-site references retain HTTPS, no-auth, label, reason and verification requirements',async()=>{
 const owner=await site('invalid-own-pdf.example');
 const changes=[{url:`http://${owner.canonicalHost}/dokumentai/instrukcija.pdf`},{url:`https://user:password@${owner.canonicalHost}/dokumentai/instrukcija.pdf`},{label:''},{reason:''},{verified:false}];
 for(const [index,change]of changes.entries()){
  const draft=await page(owner,'invalid-'+index);
  await model.editPage(owner.id,draft.id,{externalLinks:[{...sourceFor(owner),...change}]});
  await review(owner,draft.id);
  await assert.rejects(()=>model.approveReviewedBatch(owner.id,[draft.id],'isolated-test'),/HTTPS|nepatikrintų/);
  assert.equal((await model.getSite(owner.id)).pages.find(item=>item.id===draft.id).publishedRevision,null);
 }
});

test('another owned domain still requires a verified ready network suggestion',async()=>{
 const owner=await site('source-owner.example'),other=await site('other-owner.example'),target=await page(other,'gidas');
 await review(other,target.id);await model.approveReviewedBatch(other.id,[target.id],'isolated-test');
 const draft=await page(owner),source={...sourceFor(owner),url:`https://${other.canonicalHost}/gidas`};
 await model.editPage(owner.id,draft.id,{externalLinks:[source]});await review(owner,draft.id);
 await assert.rejects(()=>model.approveReviewedBatch(owner.id,[draft.id],'isolated-test'),/Tinklo nuoroda/);
 await model.editPage(owner.id,draft.id,{networkLinkSuggestions:[{targetSiteId:other.id,targetPageId:target.id,label:source.label,reason:source.reason}]});await review(owner,draft.id);
 await assert.rejects(()=>model.approveReviewedBatch(owner.id,[draft.id],'isolated-test'),/Tinklo nuoroda/,'an unchecked or unready suggestion does not bypass network readiness');
 assert.equal((await model.getSite(owner.id)).pages[0].publishedRevision,null);
});
