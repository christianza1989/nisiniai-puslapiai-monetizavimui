import {readFile,writeFile,mkdir,readdir,copyFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const dir=import.meta.dirname,root=path.resolve(dir,'../..'),core='C:/Users/lenovo/Documents/dovanos-memorycasting',copy=path.join(root,'output/akmenas-production'),dest=path.join(dir,'FIRST-RUN');
try {await stat(dest);throw Error('FIRST-RUN already exists; do not overwrite historical first result.');} catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(dest,{recursive:true});
const digest=b=>createHash('sha256').update(b).digest('hex');
const json=async file=>JSON.parse(await readFile(path.join(dir,file),'utf8'));
const version=await json('VERSION.json'),score=await json('PHASE-1-SCORE.json'),review=await json('FINISH-REVIEW.json'),verdict=await json('FINISH-VERDICT.json');
const saved=[];
async function save(source,target){const b=await readFile(source);await mkdir(path.dirname(path.join(dest,target)),{recursive:true});await copyFile(source,path.join(dest,target));saved.push({path:target,bytes:b.length,sha256:digest(b)});}
async function evidenceWalk(current,relative=''){
 for(const entry of await readdir(current,{withFileTypes:true})){
  if(entry.name==='FIRST-RUN'||entry.name==='node_modules'||entry.name==='.wrangler'||entry.name==='media'||entry.name==='studies')continue;
  const rel=path.join(relative,entry.name),file=path.join(current,entry.name);
  if(entry.isDirectory())await evidenceWalk(file,rel);
  else if(/\.(md|json|log|png|html)$/i.test(entry.name))await save(file,path.join('evidence',rel));
 }
}
await evidenceWalk(dir);
await save(path.join(root,'sites/akmenas.md'),'site-journal.md');
await save(path.join(root,'content-studio/output/akmenas/content-package.json'),'content-package.json');
assert.equal(digest(await readFile(path.join(dest,'content-package.json'))),version.packageSha256);
await save(path.join(root,'content-studio/scripts/build-akmenas-site.mjs'),'authoring/build-akmenas-site.mjs');
const sourceMap={};
for(const file of ['components/niche/akmenas-site.tsx','components/niche/akmenas-site.module.css','app/niche/[siteId]/[[...slug]]/page.tsx']){
 const b=await readFile(path.join(copy,file));assert.equal(digest(b),version.sourceFingerprints[file]);sourceMap[file]=digest(b);await save(path.join(copy,file),path.join('source',file));
}
for(const entry of await readdir(path.join(core,'public/content-assets/akmenas')))await save(path.join(core,'public/content-assets/akmenas',entry),path.join('public/content-assets/akmenas',entry));
for(const entry of await readdir(path.join(core,'public/fonts/akmenas')))await save(path.join(core,'public/fonts/akmenas',entry),path.join('public/fonts/akmenas',entry));
const final=`Sukurta [akmenas.lt vietinė svetainė](http://127.0.0.1:8886/): 11 puslapių, 3 gidai, teminės iliustracijos ir patikrinta D1 užklausos forma. Kontaktai – MB Pinet / info@pinet.lt.\n\nMobilus Lighthouse: pradžia 92, gidas 91. [A–Z auditas](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/akmenas/PHASE-1-AUDIT.md) – 9,72/10; tikras 200 % didinimas dar nepatvirtintas.\n\nĮ tikrą domeną nepaleista: lieka DNS, produkcinio pašto ir privatumo vartai.\n\n![akmenas.lt peržiūra](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/akmenas/qa/home-preview.png)\n`;
await writeFile(path.join(dest,'original-final.md'),final);
const record={siteId:'akmenas',canonicalHost:'akmenas.lt',threadId:'01a0f541-39b4-79e0-b84c-72cfaea10f0a',threadIdScope:'Returned by open_in_codex for the calling thread; not a parent-created benchmark thread.',runKind:'DIRECT_USER_RUN',startedAt:null,firstCompletionAt:new Date().toISOString(),exactPrompt:'Sukurk naują puslapį domenui akmenas.lt',instructionFingerprints:version.instructionFingerprints,instructionFingerprintScope:'Handover capture2026-10-01; initial instruction snapshot missing. Concurrent shared skill changes are recorded in WORKSTREAMS.',interventions:['Own pre-completion source/schema/keyboard/tablet/font repairs; BASELINE-AND-FIXES records them.','Fresh finish reviewer and documenter explicitly required by the invoked Impeccable skill.','No parent coaching or parent score received.','Direct agent authored source-reviewed text through actual studio model edit/approve/export; no Codex CLI draft job.','Original concept full output missing; current-catalog replay is labelled partial.','Unsupported actual200% browser enlargement retained as UNVERIFIED; no manufactured pass.','Own test-harness/capture/copy-input mistakes corrected; original limitations retained.'],packageSha256:version.packageSha256,sourceFingerprints:sourceMap,selfReportedLocalScore:score.stages.local.score,parentLocalScore:null,craftCriteria:review.ceiling.criteria,craftScore:verdict.retainedScore,criticalGates:score.stages,localPreview:'http://127.0.0.1:8886/',launchStatus:'NOT DEPLOYED',demandStatus:'UNMEASURED',benchmarkStatus:'NOT A FORMAL PARENT BENCHMARK PASS',cost:'4 built-in image generations plus agent usage; exact account charge unavailable; no new paid service purchased.',evidencePaths:saved,rootLessons:['Current local quality and production/demand must remain separate.','A narrow viewport cannot prove real enlargement.','Persist actual concept output and initial fingerprints at task start in future runs.','Isolated production preserves other active work; complete TypeScript inputs need declarations and hooks.','Performance measurements need fixed serial samples when concurrent capture load is observed.']};
await writeFile(path.join(dest,'FIRST-RUN.json'),JSON.stringify(record,null,2));
await writeFile(path.join(dest,'README.md'),`# akmenas.lt pirmas užbaigimas\n\n${record.firstCompletionAt}. Nekintamas prieš pirmą final išsaugotas direct-user rezultatas. Neformalizuotas parent benchmark: thread/start fingerprint nefiksuoti, parent score null. Savas local ${score.stages.local.score}; R2/S2 lieka UNVERIFIED. Production ir demand neįrodyti.\n\nPaketas, tikrintos izoliuotos source versijos,20WebP,šriftai ir ${saved.length} įrodymų failai su SHA-256 saugomi FIRST-RUN.json. Originalus planuojamas/pateikiamas final – original-final.md. Tikros klientų užklausos, env/credentials, node_modules ir D1 duomenys nekopijuoti.\n\nOriginalios craft kriterijų reikšmės ir fixes-only verdict perkopijuoti be vėlesnio balo didinimo. Kitą peržiūrą ar taisymą saugoti atskirai, šio snapshot neperrašyti.\n`);
console.log(JSON.stringify({siteId:'akmenas',files:saved.length,local:score.stages.local,packageSha256:record.packageSha256}));

