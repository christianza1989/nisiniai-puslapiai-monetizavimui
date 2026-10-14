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
const envelope=JSON.parse(prompt.slice(prompt.lastIndexOf('\\n{\\n  "siteData"')+1)),data=envelope.siteData;
if(data.domain==='provider-failure.example'){process.stderr.write('WARN shell_snapshot: unsupported shell');process.stdout.write(JSON.stringify({type:'turn.failed',error:{message:'429 Too Many Requests: synthetic test failure'}}));process.exit(1);}
if(data.domain==='brief-forwarding.example'&&!envelope.pageData?.editorialBrief?.notes?.endsWith('END-OF-FULL-BRIEF'))throw new Error('Complete editorial brief missing or truncated');
const args=process.argv.slice(2),plan=args[args.indexOf('--output-schema')+1].endsWith('plan-result.schema.json');
if(plan&&data.contentPolicy.cadence==='weekly'&&!prompt.includes(data.contentPolicy.articlesPerWeek+' articles/week'))throw new Error('Weekly prompt missing');
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

test('weekly policy reaches the actual CLI prompt and generates its calculated horizon target',async()=>{
  const site=await model.createSite({canonicalHost:'weekly-calendar.example',name:'Tik savaitinis testas',offer:'Izoliuotas testas'});
  await model.editSite(site.id,{contentPolicy:{months:1,cadence:'weekly',articlesPerWeek:3,localTime:'10:15'}});
  await model.addPage(site.id,{type:'home',slug:'',title:'Pradžia',description:'Izoliuotas tekstas.',intent:'Tik testas',body:[{type:'paragraph',text:'Esamas home nepakeičiamas.'}]});
  const target=(await model.getContentWorkflow(site.id)).window.target;
  const result=await finish(await enqueue('autopilot',site.id));assert.equal(result.status,'complete',result.error);
  const after=await model.getSite(site.id),guides=after.pages.filter(p=>p.type==='guide');
  assert.equal(guides.length,target);assert.ok(guides.every(p=>p.body.length));
  assert.equal(JSON.parse(result.detail).plan.remainingArticles,0);
  assert.equal(after.contentPolicy.articlesPerWeek,3);assert.equal(after.contentPolicy.articlesPerMonth,undefined);
  assert.equal(after.pages.some(p=>p.publishedRevision),false);
});

test('native draft forwards a complete private brief through the CLI envelope without publishing it',async()=>{
  const site=await model.createSite({canonicalHost:'brief-forwarding.example',name:'Brief test',offer:'Only a fixture'});
  const page=await model.addPage(site.id,{type:'guide',slug:'specific-question',title:'Only a test',description:'Fixture',intent:'Fixture'});
  const fullBrief={slug:page.slug,question:'Which choice?',contribution:'Worked choice',outline:['Compare'],notes:'Original long-tail scope. '.repeat(200)+'END-OF-FULL-BRIEF'};
  const result=await finish(await enqueue('draft',site.id,page.id,{fullBrief}));
  assert.equal(result.status,'complete',result.error);
  const after=(await model.getSite(site.id)).pages.find(p=>p.id===page.id);
  assert.ok(after.body.length);assert.equal(Boolean(after.publishedRevision),false);
  assert.equal('editorialBrief' in after,false,'private task input does not migrate the page or public schema');
  await assert.rejects(()=>enqueue('draft',site.id,page.id,{fullBrief:{...fullBrief,slug:'other'}}),/nesutampa/);
});

test('native job records the provider failure instead of an incidental shell warning',async()=>{
 const site=await model.createSite({canonicalHost:'provider-failure.example',name:'Only a failure fixture',offer:'Fixture'});
 const page=await model.addPage(site.id,{type:'guide',slug:'failure',title:'Fixture',description:'Fixture',intent:'Fixture'});
 const result=await finish(await enqueue('draft',site.id,page.id));
 assert.equal(result.status,'failed');assert.match(result.error,/429 Too Many Requests/);assert.doesNotMatch(result.error,/shell_snapshot/);
 const after=(await model.getSite(site.id)).pages.find(p=>p.id===page.id);assert.equal(after.body.length,0);assert.equal(Boolean(after.approval),false);
});
