import {readFile,writeFile,mkdir,readdir,copyFile,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const site=import.meta.dirname,network=path.resolve(site,'../..'),core='C:/Users/lenovo/Documents/dovanos-memorycasting',dest=path.join(site,'FIRST-RUN');
const sha=b=>createHash('sha256').update(b).digest('hex');
// Fail rather than replace the first completion's evidence on a later run.
try{await lstat(path.join(dest,'manifest.json'));throw Error('FIRST-RUN already frozen; do not overwrite');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(dest,{recursive:true});
const capturedAt=new Date().toISOString(),records=[];
async function copy(source,relative,origin){
 const bytes=await readFile(source),target=path.join(dest,relative);await mkdir(path.dirname(target),{recursive:true});await copyFile(source,target);
 records.push({path:relative,origin:origin||source,bytes:bytes.length,sha256:sha(bytes)});
}
async function walk(dir,rel=''){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  if(entry.name==='FIRST-RUN'||entry.name==='node_modules'||entry.name==='.wrangler'||entry.name.startsWith('.env')||entry.name.startsWith('.dev.vars'))continue;
  const local=path.join(dir,entry.name),sub=path.join(rel,entry.name);
  if(entry.isSymbolicLink())throw Error(`Unexpected symbolic link ${local}`);
  if(entry.isDirectory())await walk(local,sub);else if(entry.isFile())await copy(local,path.join('site',sub));
 }
}
await walk(site); await copy(path.join(network,'sites/miniekskavatoriai.md'),'site-journal.md');
await copy(path.join(network,'content-studio/output/miniekskavatoriai/content-package.json'),'package/content-package.json');
const pkg=JSON.parse(await readFile(path.join(network,'content-studio/output/miniekskavatoriai/content-package.json'),'utf8'));
const assetRoot=path.resolve(core,'public/content-assets/miniekskavatoriai');
for(const src of new Set(pkg.pages.flatMap(p=>(p.media||[]).map(m=>m.src)))){
 if(!src.startsWith('/content-assets/miniekskavatoriai/'))throw Error(`Unexpected media family ${src}`);
 const source=path.resolve(core,'public',src.slice(1));if(!source.startsWith(assetRoot+path.sep))throw Error('Asset outside own namespace');
 await copy(source,path.join('public',src.slice(1)));
}
for(const name of ['manrope-latin-a30ddcd34970.woff2','manrope-latin-ext-3911b66d9f2e.woff2'])await copy(path.join(core,'public/fonts/laiptucentras',name),path.join('public/fonts/laiptucentras',name));
await copy(path.join(network,'content-studio/data/sites/miniekskavatoriai.json'),'studio/miniekskavatoriai.json');
await copy(path.join(network,'content-studio/scripts/build-miniekskavatoriai-site.mjs'),'studio/build-miniekskavatoriai-site.mjs');
for(const name of ['miniekskavatoriai-site.tsx','miniekskavatoriai-site.tools.tsx','miniekskavatoriai-site.module.css'])await copy(path.join(core,'components/niche',name),path.join('source',name));
const registry=JSON.parse(await readFile(path.join(core,'config/niche-network.json'),'utf8'));
await writeFile(path.join(dest,'source','registry-observation.json'),JSON.stringify({observedAt:capturedAt,defaultEmail:registry.defaultEmail,operatorName:registry.operatorName,nicheKeys:Object.keys(registry),note:'Shared registry preserved; full registry not duplicated into own snapshot'},null,2)+'\n');
// All files copied are private local evidence; no runtime DB, customer data or credentials.
const instructions=['AGENTS.md','START_HERE.md','RESEARCH_INPUTS.md','CORE_BUILD_CONTRACT.md','AUTONOMY_BENCHMARK.md','WORKSTREAMS.md','MEDIA_CORE.md','SEO_GEO_CORE.md','MAIL_CORE.md','NETWORK_LINKING.md','ACQUISITION_CORE.md','SKILLS/PROJECT_CONTRACT.md','SKILLS/catalog.json','SKILLS/niche-site-builder/SKILL.md','SKILLS/niche-content-planner/SKILL.md','SKILLS/niche-site-audit/SKILL.md','SKILLS/niche-client-acquisition/SKILL.md','SKILLS/impeccable/SKILL.md','SKILLS/impeccable/PROJECT_ADAPTATION.md'];
for(const dir of ['SKILLS/niche-site-builder/references','SKILLS/niche-content-planner/references','SKILLS/niche-site-audit/references'])for(const e of await readdir(path.join(network,dir),{withFileTypes:true}))if(e.isFile()&&e.name.endsWith('.md'))instructions.push(`${dir}/${e.name}`);
for(const name of ['new-work','craft-floor','init','document'])instructions.push(`SKILLS/impeccable/reference/${name}.md`);
const fingerprints=[];
for(const rel of [...new Set(instructions)]){
 try{const bytes=await readFile(path.join(network,rel));fingerprints.push({path:rel,sha256:sha(bytes),bytes:bytes.length});await copy(path.join(network,rel),path.join('instructions/handover',rel));}catch(e){if(e.code==='ENOENT')fingerprints.push({path:rel,missing:true});else throw e;}
}
const sessionPath='C:/Users/lenovo/.codex/sessions/2026/10/01/rollout-2026-10-01T13-57-04-01a0f71c-5550-7281-b240-14858d89f7bd.jsonl';
const session=(await readFile(sessionPath,'utf8')).trim().split('\n').map(s=>JSON.parse(s));
const row=session.find(x=>x.ordinal===5),userAgent=row.payload.content.find(x=>x.type==='input_text'&&x.text.startsWith('# AGENTS.md instructions')).text;
await mkdir(path.join(dest,'instructions'),{recursive:true});await writeFile(path.join(dest,'instructions/AGENTS.user-input.md'),userAgent,'utf8');
const task=await readFile(path.join(site,'research/original-task.txt'),'utf8'),audit=JSON.parse(await readFile(path.join(site,'PHASE-1-AUDIT.json'),'utf8')),score=JSON.parse(await readFile(path.join(site,'PHASE-1-SCORE.json'),'utf8'));
const initial=session.find(x=>x.type==='session_meta').payload;
const sharedIntegrationFingerprints={};
for(const p of ['config/niche-network.json','app/niche/[siteId]/[[...slug]]/page.tsx'])sharedIntegrationFingerprints[p]=sha(await readFile(path.join(core,p)));
await writeFile(path.join(dest,'instruction-fingerprints.json'),JSON.stringify({at:capturedAt,type:'HANDOVER-TIME; NOT START SNAPSHOT',initialImmutableFileSnapshotAvailable:false,sourceUserAgents:{sourceSessionPath:sessionPath,ordinal:5,sha256:sha(Buffer.from(userAgent)),note:'Original provided AGENTS text, not all initial skill files'},files:fingerprints},null,2)+'\n');
const finalText='Sukurta ir veikia [vietinė miniekskavatoriai.lt svetainė](http://127.0.0.1:8793/): 12 puslapių, 3 gidai, tūrio skaičiuotuvas, poreikio ruošinys ir patikrinta vietinė D1 forma. Kryptis — planinis tranšėjų kasimas su operatoriumi Kaune ir Kauno rajone.\n\nMobilus Lighthouse: **96 / 91 / 95**. [A–Z auditas](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/miniekskavatoriai/PHASE-1-AUDIT.md): **9,43/10**; atskiras dizaino craft — **8,57/10**, todėl ≥9 siekis nepasiektas. [Pirmojo rezultato įrodymai](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/miniekskavatoriai/FIRST-RUN.md) išsaugoti.\n\nViešas domenas nepaleistas. SMTP išjungtas; pašto gavimas ir tikras 200 % didinimas nepatvirtinti. Partneriai, atlygis ir reali paklausa dar neįrodyti.\n\n![Vietinė svetainės peržiūra](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/miniekskavatoriai/qa/home-handover.jpg)\n';
await writeFile(path.join(dest,'FINAL.md'),finalText);
await writeFile(path.join(dest,'RUN.json'),JSON.stringify({siteId:'miniekskavatoriai',canonicalHost:'miniekskavatoriai.lt',threadId:'01a0f71c-5550-7281-b240-14858d89f7bd',startedAt:initial.timestamp,exactPrompt:task,exactPromptProvenance:'site/research/original-task.provenance.json; line endings may be normalized from original stream',analysisAssisted:true,initialInstructionSnapshot:'not captured; handover hashes distinctly labelled',interventions:['Owner-supplied detailed commercial analysis/task','Routine autonomous implementation corrections before first final','Fresh skill finish reviewer and fixes-only continuation','Fresh skill documenter','No parent feedback/coaching read or applied; no parent message sent','Assets generated after plan/network comparison but before study screenshot comparison','Quality bar card consolidated at finish','Original concept stdout recovered, no reroll','Common CUA warmcast investigated, no CSS/raster recolor'],firstCompletionAt:capturedAt,firstFinalStatus:'prepared identical response before sending; no claim of parent receipt timestamp',packageSha256:audit.version.packageSha256,sourceFingerprints:audit.version.renderer,sharedIntegrationFingerprints,selfReportedLocalScore:score.stages.local,parentLocalScore:null,craftCriteria:[2,2,2,1,1,2,2],craftScore:8.57,craftEvaluator:'fresh skill reviewer, not parent review',criticalGates:score.stages.local.blockers,localPreview:'http://127.0.0.1:8793/',launchStatus:'not launched; all applicable launch evidence unverified',demandStatus:'0 verified real inquiries, synthetic QA excluded',rootLessons:'Parent review/lessons not available or authored here',secretsRuntimeCustomerDataExcluded:true},null,2)+'\n');
// Include generated metadata in the manifest; manifest is the only self-excluded file.
for(const relative of ['source/registry-observation.json','instruction-fingerprints.json','instructions/AGENTS.user-input.md','FINAL.md','RUN.json']){
 const bytes=await readFile(path.join(dest,relative));records.push({path:relative,origin:'first-completion metadata',bytes:bytes.length,sha256:sha(bytes)});
}
await writeFile(path.join(dest,'manifest.json'),JSON.stringify({capturedAt,siteId:'miniekskavatoriai',immutableFirstCompletion:true,notAColdStart:true,notParentApproval:true,files:records},null,2)+'\n');
console.log(JSON.stringify({capturedAt,files:records.length,bytes:records.reduce((n,x)=>n+x.bytes,0),packageSha256:audit.version.packageSha256,localScore:score.stages.local.score,craftScore:8.57,root:dest}));
