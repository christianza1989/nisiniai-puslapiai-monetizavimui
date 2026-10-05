import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const root=await mkdtemp(path.join(os.tmpdir(),'content-policy-generator-'));
process.env.STUDIO_DATA_DIR=path.join(root,'data'); process.env.STUDIO_OUTPUT_DIR=path.join(root,'output');
process.env.CODEX_JS=path.join(root,'codex-fixture.mjs');
await writeFile(process.env.CODEX_JS, `
import { writeFile } from 'node:fs/promises';
let prompt='';for await(const chunk of process.stdin)prompt+=chunk;
const data=JSON.parse(prompt.slice(prompt.lastIndexOf('\\n{\\n  "siteData"')+1)).siteData;
const args=process.argv.slice(2),plan=args[args.indexOf('--output-schema')+1].endsWith('plan-result.schema.json');
const count=Number(prompt.match(/choose up to (\\d+)/)?.[1]||1);
const result=plan?{pages:Array.from({length:count},(_,i)=>({type:'guide',slug:'gidas-'+(data.existingPages.length+i),title:'Izoliuotas klausimas '+(data.existingPages.length+i),description:'Tik generatoriaus kontrakto testas.',intent:'Skirtingas bandymo klausimas '+(data.existingPages.length+i),reason:'Sintetinė originalaus klausimo patikra.',cluster:'Testas',pillarSlug:'',sourceQueries:[],publishDate:'2001-01-01',seasonalHook:'',networkLinks:[]}))}:{title:'Izoliuotas juodraštis',description:'Sintetinis kontrakto testas.',blocks:[{type:'paragraph',text:'Tai tik izoliuoto generatoriaus bandymo tekstas, ne tikras viešas turinys.',level:0,items:[]},{type:'list',text:'',level:0,items:['Tik bandymo duomenys.']}],factChecks:[],internalLinks:[],externalSources:[],networkLinks:[]};
await writeFile(args[args.indexOf('--output-last-message')+1],JSON.stringify(result));
`);
const model=await import('../src/model.mjs'),{enqueue}=await import('../src/generator.mjs');await model.initialize();
test.after(()=>rm(root,{recursive:true,force:true}));
async function finish(job){const deadline=Date.now()+30000;while(Date.now()<deadline){const current=(await model.listJobs()).find(j=>j.id===job.id);if(['complete','failed'].includes(current.status))return current;await new Promise(resolve=>setTimeout(resolve,40));}throw new Error('Test job timeout');}
test('configured calendar spans more than one CLI batch and all drafts stay private with required review',async()=>{
  const site=await model.createSite({canonicalHost:'calendar-batches.example',name:'Tik testas',offer:'Izoliuotas testas'});
  await model.editSite(site.id,{facts:'Tik sintetinis testas.',contentPolicy:{months:3,articlesPerMonth:9,localTime:'10:15'}});
  await model.addPage(site.id,{type:'home',slug:'',title:'Pradžia',description:'Izoliuotas tekstas.',intent:'Tik bandymas',body:[{type:'paragraph',text:'Esamas home neperrašomas ir nepatvirtinamas generatoriaus.'}]});
  const result=await finish(await enqueue('autopilot',site.id));assert.equal(result.status,'complete',result.error);
  const after=await model.getSite(site.id),guides=after.pages.filter(p=>p.type==='guide');
  assert.equal(guides.length,27);assert.equal(new Set(guides.map(p=>p.publishAt)).size,27);assert.ok(guides.every(p=>p.body.length>0));
  assert.equal(after.pages.some(p=>p.publishedRevision),false);
  const detail=JSON.parse(result.detail);assert.equal(detail.plan.remainingArticles,0);assert.equal(detail.drafts.remaining,0);
  await assert.rejects(()=>model.approvePage(site.id,guides[0].id,'test'),/peržiūros|vaizdo/);
});
