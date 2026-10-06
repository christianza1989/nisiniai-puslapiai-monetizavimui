import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {v2Fixture} from './fixtures/v2.mjs';
import {draftSnapshotHash,acceptV2DraftResult,v2CliSchema} from '../src/draft-v2.mjs';
const root=await mkdtemp(path.join(os.tmpdir(),'native-v2-draft-'));
process.env.STUDIO_DATA_DIR=path.join(root,'data');process.env.STUDIO_OUTPUT_DIR=path.join(root,'output');
process.env.CODEX_JS=path.join(root,'writer-fixture.mjs');
await writeFile(process.env.CODEX_JS,`
import {writeFile} from 'node:fs/promises';
let prompt='';for await(const b of process.stdin)prompt+=b;
const args=process.argv.slice(2),data=JSON.parse(prompt.slice(prompt.lastIndexOf('\\n{\\n  "siteData"')+1)),p=data.pageData;
if(!args[args.indexOf('--output-schema')+1].endsWith('draft-result.v2.schema.json')||args[args.indexOf('--model')+1]!=='gpt-6-luna'||!args.includes('model_reasoning_effort="xhigh"'))throw Error('Native schema/model policy missing');
if(!p.planningBrief.data.article.intent||!p.v2Context||!data.siteData.seoResearch||!prompt.includes('separate actual ImageGen'))throw Error('Full intent/context/instructions missing');
process.stderr.write('model: gpt-6-luna\\nreasoning effort: xhigh\\n');
if(p.slug==='stale')await new Promise(r=>setTimeout(r,1200));
const result={title:'Sintetinis '+p.title,description:'Tik izoliuotas generatoriaus testas.',body:[{type:'richHeading',level:2,content:[{type:'text',text:'Tikras struktūros kontrakto bandymas'}]},{type:'richParagraph',content:[{type:'text',text:'Tik izoliuotas testas. Čia nėra tikro paslaugos teikėjo, medicininio patarimo ar publikavimo patvirtinimo.'}]},{type:'richList',ordered:true,items:[[{type:'text',text:'Pirmas testinis sprendimas.'}],[{type:'text',text:'Antras testinis sprendimas.'}]]}],factChecks:[],internalLinks:[],sourceIds:[],mediaBrief:'Originali testinė redakcinė iliustracija; būtina tikrų pikselių patikra.'};
await writeFile(args[args.indexOf('--output-last-message')+1],JSON.stringify(result));
`);
const model=await import('../src/model.mjs'),{enqueue}=await import('../src/generator.mjs');await model.initialize();
test.after(()=>rm(root,{recursive:true,force:true}));
async function finish(job){const deadline=Date.now()+30000;while(Date.now()<deadline){const j=(await model.listJobs()).find(x=>x.id===job.id);if(['complete','failed'].includes(j.status))return j;await new Promise(r=>setTimeout(r,30));}throw Error('Fixture job timeout');}
async function fixture(domain,count=1){
 const s=await model.createSite({canonicalHost:domain,name:'Izoliuotas V2 testas',offer:'Testas',schemaVersion:2});
 for(let i=0;i<count;i++)await model.addPage(s.id,{id:'article-'+i,type:'guide',slug:i?'gidas-'+i:'stale',title:'Bandomasis gidas '+i,description:'Testas',intent:'Tikras atskiras testinis klausimas '+i});
 const current=await model.getSite(s.id);
 await model.reconcilePrivatePlan(s.id,{canonicalHost:current.canonicalHost,locale:current.locale,expectedSiteHash:draftSnapshotHash(current),sourcePlanSha256:'a'.repeat(64),skillFingerprint:'b'.repeat(64),coverageTarget:count,retire:[],updates:current.pages.map(p=>({pageId:p.id,slug:p.slug,brief:{article:{intent:p.intent,outline:['Sintetinis atsakymas'],originalContribution:'Tikras testinis sprendimas'}}}))});
 return model.getSite(s.id);
}
test('native rich CLI draft/batches retain identity, receipts, full map and private review gates',async()=>{
 const site=await fixture('v2-writer-test.lt',25),before=new Map(site.pages.map(p=>[p.id,{slug:p.slug,publishAt:p.publishAt}]));
 const job=await finish(await enqueue('autopilot',site.id));assert.equal(job.status,'complete',job.error);
 const after=await model.getSite(site.id);assert.equal(after.pages.length,25);assert.equal(JSON.parse(job.detail).drafts.generated,25);
 for(const p of after.pages){assert.deepEqual({slug:p.slug,publishAt:p.publishAt},before.get(p.id));assert.equal(p.body[0].type,'richHeading');assert.equal(p.body[2].type,'richList');assert.equal(p.body[2].ordered,true);assert.equal(p.approval,null);assert.equal(p.publishedRevision,null);assert.equal(p.editorial.sources.length,0);assert.equal(p.generatedDraft.generationReceipt.observed.model,'gpt-6-luna');assert.equal(p.generatedDraft.generationReceipt.observed.reasoningEffort,'xhigh');assert.equal(p.generatedDraft.planningSourceSha256,'a'.repeat(64));assert.ok(p.planningBrief);
  const receipt=p.generatedDraft.generationReceipt,bytes=await readFile(path.join(process.env.STUDIO_DATA_DIR,receipt.resultArtifact));assert.equal(createHash('sha256').update(bytes).digest('hex'),receipt.resultSha256);assert.deepEqual(JSON.parse(bytes).body,p.body);
 }
 await assert.rejects(()=>enqueue('draft',site.id,after.pages[0].id),/neperrašo/);
 await assert.rejects(()=>model.approvePage(site.id,after.pages[0].id,'fixture'),/peržiūros|vaizdo/);
 await assert.rejects(()=>enqueue('plan',site.id),/reconciliation/);
 const original=after.pages[1],oldHash=model.revisionHash(original);
 await assert.rejects(()=>enqueue('revise',site.id,original.id,{}),/current revision hash/);
 await assert.rejects(()=>enqueue('revise',site.id,original.id,{expectedRevisionHash:'f'.repeat(64),editorialInstruction:'An explicit test-only revision request.'}),/exact current/);
 const revised=await finish(await enqueue('revise',site.id,original.id,{expectedRevisionHash:oldHash,editorialInstruction:'Improve this synthetic test title while preserving its exact existing contract.'}));assert.equal(revised.status,'complete',revised.error);
 const current=(await model.getSite(site.id)).pages.find(p=>p.id===original.id);assert.notEqual(model.revisionHash(current),oldHash);assert.equal(current.generatedDraft.revisesRevisionHash,oldHash);assert.deepEqual(current.generatedDraftHistory[0],original.generatedDraft);assert.equal(current.approval,null);assert.equal(current.publishedRevision,null);
});
test('late CLI result cannot overwrite a concurrently edited site or draft',async()=>{
 const site=await fixture('v2-stale-test.lt'),job=await enqueue('draft',site.id,site.pages[0].id);
 await new Promise(r=>setTimeout(r,400));await model.editPage(site.id,site.pages[0].id,{description:'Savininko pakeistas aprašymas'});
 const outcome=await finish(job);assert.equal(outcome.status,'failed');assert.match(outcome.error,/stale/);
 const receipt=outcome.generationReceipts[site.pages[0].id];assert.equal(createHash('sha256').update(await readFile(path.join(process.env.STUDIO_DATA_DIR,receipt.resultArtifact))).digest('hex'),receipt.resultSha256);
 const page=(await model.getSite(site.id)).pages[0];assert.equal(page.description,'Savininko pakeistas aprašymas');assert.equal(page.body.length,0);assert.equal(page.generatedDraft,undefined);
});
test('explicit revision preserves the exact previously approved public snapshot',async()=>{
 const pkg=v2Fixture(),directory=path.join(root,'approved-fixture');await mkdir(path.join(directory,'assets'),{recursive:true});
 const bytes=Buffer.from(JSON.stringify(pkg));await writeFile(path.join(directory,'content-package.json'),bytes);
 await model.restoreApprovedV2Package(directory,createHash('sha256').update(bytes).digest('hex'));
 const site=await model.getSite(pkg.siteId),original=structuredClone(site.pages[1]);
 await model.reconcilePrivatePlan(site.id,{canonicalHost:site.canonicalHost,locale:site.locale,expectedSiteHash:draftSnapshotHash(site),sourcePlanSha256:'a'.repeat(64),skillFingerprint:'b'.repeat(64),coverageTarget:2,retire:[],updates:site.pages.map(p=>({pageId:p.id,slug:p.slug,brief:{article:{intent:'Isolated approved-revision test',originalContribution:'Synthetic contract test'}}}))});
 const job=await finish(await enqueue('revise',site.id,original.id,{expectedRevisionHash:model.revisionHash(original),editorialInstruction:'Improve this isolated test title while preserving the previously approved snapshot.'}));
 assert.equal(job.status,'complete',job.error);const current=(await model.getSite(site.id)).pages.find(p=>p.id===original.id);
 assert.equal(current.approval,null);assert.notEqual(model.revisionHash(current),original.revisionHash);
 assert.deepEqual(current.publishedRevision,original.publishedRevision);assert.equal(current.generatedDraft.revisesRevisionHash,original.revisionHash);
});
test('native envelope rejects invented sources, images, draft inline pages, external and network bypasses',()=>{
 const pkg=v2Fixture(),p={...pkg.pages[1],body:[],approval:null,publishedRevision:null,planningBrief:{sourcePlanSha256:'a'.repeat(64),skillFingerprint:'b'.repeat(64),data:{intent:'Testas'}}};
 const site={...pkg.site,schemaVersion:2,pages:[p,{...pkg.pages[0],publishedRevision:pkg.pages[0]}]};
 const result={title:'Testas',description:'Testinis aprašymas',body:[{type:'richParagraph',content:[{type:'text',text:'Sintetinis tekstas.'}]}],factChecks:[],internalLinks:[],sourceIds:['test-source'],mediaBrief:'Tik testinė medijos užduotis.'};
 assert.equal(acceptV2DraftResult(site,p,result).body[0].type,'richParagraph');
 assert.throws(()=>acceptV2DraftResult(site,p,{...result,sourceIds:['invented']}),/unknown source/);
 assert.throws(()=>acceptV2DraftResult(site,p,{...result,body:[{type:'image',assetId:'invented'}]}),/missing image/);
 for(const target of [{kind:'page',pageId:p.id},{kind:'external',url:'https://example.org/unread'},{kind:'network',siteId:'foreign-site',pageId:'anything'}])assert.throws(()=>acceptV2DraftResult(site,p,{...result,body:[{type:'richParagraph',content:[{type:'link',text:'Neleistina nuoroda',target}]}]}),/inline page|external URL|network links/);
 assert.throws(()=>acceptV2DraftResult(site,p,{...result,internalLinks:[{targetPageId:'foreign',label:'Nežinomas',reason:'Testas'}]}),/unknown/);
 const verified={...result,body:[{type:'richParagraph',content:[{type:'link',text:'Patvirtintas testinis home',target:{kind:'page',pageId:pkg.pages[0].id}}]}]};assert.equal(acceptV2DraftResult(site,p,verified).body[0].content[0].target.pageId,pkg.pages[0].id);
});
test('runtime body definitions preserve native V2 with CLI-supported disjoint unions',async()=>{
 const draft=JSON.parse(await readFile(new URL('../schemas/draft-result.v2.schema.json',import.meta.url))),pub=JSON.parse(await readFile(new URL('../schemas/content-package.v2.schema.json',import.meta.url)));
 for(const [key,definition]of Object.entries(draft.$defs))assert.deepEqual(definition,v2CliSchema(pub.$defs[key]));
 assert.equal(JSON.stringify(draft).includes('"oneOf"'),false);assert.equal(JSON.stringify(draft).includes('"format":"uri"'),false);
});
