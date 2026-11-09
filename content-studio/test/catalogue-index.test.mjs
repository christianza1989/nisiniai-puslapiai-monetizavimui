import test from'node:test';import assert from'node:assert/strict';
import{mkdtemp,mkdir,writeFile,rm}from'node:fs/promises';import path from'node:path';import os from'node:os';
import policy from'../../sites/o3tech/catalogue.json'with{type:'json'};
import{catalogueIndexHasContent}from'../src/catalogue-index.mjs';
import{hasMinimumContent}from'../src/minimum-content.mjs';
import{editorialReview,pageReadiness}from'../src/content-workflow.mjs';
const base=path.resolve(process.env.STUDIO_TEST_TEMP_ROOT||os.tmpdir());await mkdir(base,{recursive:true});
const root=await mkdtemp(path.join(base,'o3tech-index-test-'));if(!root.startsWith(base+path.sep))throw Error('Unsafe fixture path');
process.env.STUDIO_DATA_DIR=path.join(root,'data');process.env.STUDIO_OUTPUT_DIR=path.join(root,'output');
const model=await import('../src/model.mjs');await model.initialize();
test.after(()=>rm(root,{recursive:true,force:true}));
const common=(id,type,slug,title)=>({id,siteId:'o3tech',type,slug,title,description:'Isolated structural fixture only.',intent:'Test catalogue identity and dependency gates.',body:[{type:'paragraph',text:'x'.repeat(120)}],publishAt:'2026-01-01T00:00:00.000Z',media:[],links:[],externalLinks:[],factChecks:[],linkSuggestions:[],networkLinkSuggestions:[],status:'draft',approval:null,publishedRevision:null});
const fixture=()=>{
 const products=[...new Set(policy.indices.flatMap(i=>i.productIds))].map((id,i)=>common(id,'product','produktas/fixture-'+i,'Fixture product '+i));
 const indices=policy.indices.map(i=>({...common(i.pageId,'faq',i.slug,'Fixture index'),body:[{type:'list',items:i.productIds.map(id=>products.find(p=>p.id===id).title)}],links:i.productIds.map(id=>({targetPageId:id,label:products.find(p=>p.id===id).title}))}));
 return{id:'o3tech',canonicalHost:'o3tech.lt',name:'Isolated fixture',offer:'Synthetic catalogue test only.',locale:'lt-LT',timezone:'Europe/Vilnius',contact:{email:'fixture@example.test',phone:''},brand:{accent:'#276d72'},facts:'Synthetic test fixture, never production.',audience:'Test',assets:[],contentWorkflowVersion:1,pages:[common('home','home','','Fixture homepage'),...products,...indices]};
};
const review=(site,p)=>editorialReview(site,p,model.revisionHash(p),{reviewer:'isolated-structural-regression',revisionHash:model.revisionHash(p),evidence:Object.fromEntries(['usefulness','facts','sources','media','links','presentation'].map(a=>[a,'Synthetic isolated regression evidence for '+a+'; no live content review asserted.']))});
test('six exact registered indices accept only their real product list and exact labels/links',()=>{
 const s=fixture();for(const i of policy.indices){const p=s.pages.find(p=>p.id===i.pageId);assert.ok(catalogueIndexHasContent(s,p));assert.ok(hasMinimumContent(s,p));
 for(const change of [{body:[]},{body:[{type:'paragraph',text:'x'.repeat(200)}]},{body:[{type:'list',items:['unrelated']} ]},{links:[]},{links:[...p.links,{targetPageId:'unrelated',label:'Not a member'}]},{slug:'other'},{type:'product'},{contentVersion:2}])assert.equal(hasMinimumContent(s,{...p,...change}),false);
 const bad=structuredClone(s);bad.pages.find(p=>p.id===i.productIds[0]).status='revoked';assert.equal(hasMinimumContent(bad,p),false);
 const changed=structuredClone(s);changed.pages.find(p=>p.id===i.productIds[0]).title='Changed after index review';assert.equal(hasMinimumContent(changed,p),false);
 }
 const short={...s.pages.at(-1),id:'not-registered',body:[{type:'paragraph',text:'x'.repeat(119)}]};assert.equal(hasMinimumContent(s,short),false);assert.equal(hasMinimumContent(s,{...short,body:[{type:'paragraph',text:'x'.repeat(120)}]}),true);
 const single=s.pages.find(p=>p.id===policy.indices.find(i=>i.productIds.length===1).pageId);assert.equal(hasMinimumContent({...s,id:'foreign'}, {...single,siteId:'foreign'}),false);assert.equal(hasMinimumContent({...s,canonicalHost:'foreign.example'},single),false);
});
test('native readiness and atomic approval retain review/fact/dependency guards; valid list exports without invented prose',async()=>{
 const s=fixture(),ids=new Set(s.pages.map(p=>p.id));const index=s.pages.find(p=>p.id===policy.indices.at(-1).pageId);
 assert.equal(pageReadiness(s,index,model.revisionHash(index),ids).state,'blocked');
 for(const p of s.pages)p.editorialReview=review(s,p);
 assert.equal(pageReadiness(s,index,model.revisionHash(index),ids).state,'reviewed');
 assert.equal(pageReadiness(s,{...index,factChecks:['unresolved source']},model.revisionHash(index),ids).state,'blocked');
 const persist=x=>writeFile(path.join(root,'data/sites/o3tech.json'),JSON.stringify(x));
 const bad=structuredClone(s);const damaged=bad.pages.find(p=>p.id===index.id);damaged.links=[];damaged.editorialReview=review(bad,damaged);await persist(bad);
 await assert.rejects(()=>model.approveReviewedBatch('o3tech',[...ids],'isolated-test-only'),/Turinys|informacijos/);
 assert.ok((await model.getSite('o3tech')).pages.every(p=>p.approval===null));
 await persist(s);await model.approveReviewedBatch('o3tech',[...ids],'isolated-test-only');
 const approved=await model.getSite('o3tech');assert.deepEqual(approved.pages.find(p=>p.id===index.id).body,index.body);
 const pkg=model.packageForSite(approved);const{validateContentPackage}=await import('../../../dovanos-memorycasting/scripts/content-package-core.mjs');
 assert.equal(validateContentPackage(pkg).pages.length,s.pages.length);
});
