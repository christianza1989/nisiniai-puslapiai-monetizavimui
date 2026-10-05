// Read-only setup verification plus private audit records. No browser/app input.
import {readFile,writeFile,realpath,stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {catalogFromMarkdown} from '../../SKILLS/niche-site-audit/scripts/score-audit.mjs';
const root='C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui';
const core='C:/Users/lenovo/Documents/dovanos-memorycasting';
const dir=path.join(root,'sites/traktoriupadangos');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const at=new Date().toISOString();
const previous=JSON.parse(await readFile(path.join(dir,'PHASE-1-AUDIT.json'),'utf8'));
for(const [file,hash] of Object.entries(previous.version.fingerprints)){
 if(sha(await readFile(path.join(core,file)))!==hash)throw Error(`Public source changed; review before reusing evidence: ${file}`);
}
const packageBytes=await readFile(path.join(core,'content-packages/traktoriupadangos/content-package.json'));
if(sha(packageBytes)!==previous.version.packageSha256)throw Error('Package changed; prior visual evidence needs review.');
const names=['niche-site-audit','niche-site-builder','niche-content-planner','impeccable'];
const junctions=[];
for(const name of names){
 const installed=`C:/Users/lenovo/.codex/skills/${name}`,target=path.join(root,'SKILLS',name);
 const resolved=await realpath(installed),expected=await realpath(target);
 if(resolved.toLowerCase()!==expected.toLowerCase())throw Error(`Different installed skill source: ${name}`);
 junctions.push({name,installed,resolved});
}
const instructionFiles=['AGENTS.md','START_HERE.md','CORE_BUILD_CONTRACT.md','AUTONOMY_BENCHMARK.md','MEDIA_CORE.md','SEO_GEO_CORE.md','MAIL_CORE.md','NETWORK_LINKING.md','SKILLS/README.md',
 'SKILLS/niche-site-audit/SKILL.md','SKILLS/niche-site-audit/references/checklist.md','SKILLS/niche-site-audit/references/report-contract.md','SKILLS/niche-site-audit/references/accessibility-verification.md','SKILLS/niche-site-audit/scripts/init-audit.mjs',
 'SKILLS/niche-site-builder/SKILL.md','SKILLS/niche-site-builder/references/design-delivery.md','SKILLS/niche-site-builder/references/art-direction.md','SKILLS/niche-content-planner/SKILL.md','SKILLS/niche-content-planner/references/media-workflow.md','SKILLS/impeccable/SKILL.md','SKILLS/impeccable/PROJECT_ADAPTATION.md'];
const fingerprints={},links=[];
for(const file of instructionFiles){
 const bytes=await readFile(path.join(root,file));fingerprints[file]=sha(bytes);
 if(!file.endsWith('.md'))continue;
 const text=bytes.toString('utf8');
 if((text.match(/^```/gm)||[]).length%2)throw Error(`Unclosed Markdown code fence: ${file}`);
 for(const match of text.matchAll(/\[[^\]\n]+\]\(([^)\n]+)\)/g)){
  const href=match[1].replace(/^<|>$/g,'');
  if(/^(?:https?:|app:|codex:|#)/.test(href))continue;
  const local=href.split('#')[0].replace(/:\d+$/,'');
  const target=path.resolve(path.dirname(path.join(root,file)),local);
  await stat(target);links.push({source:file,href});
 }
}
const validation=[];
for(const name of names.filter(n=>n!=='impeccable')){
 const command=['C:/Users/lenovo/.codex/skills/.system/skill-creator/scripts/quick_validate.py',path.join(root,'SKILLS',name)];
 const output=execFileSync('python',command,{encoding:'utf8'}).trim();
 validation.push({name,exitCode:0,output,entrySha256:fingerprints[`SKILLS/${name}/SKILL.md`]});
}
const testLog=await readFile(path.join(dir,'scorer-tests.log'),'utf8');
if(!/# tests 5\r?\n/.test(testLog)||!/# pass 5\r?\n/.test(testLog)||!/# fail 0\r?\n/.test(testLog))throw Error('Five successful scorer/initializer test results required.');
const catalog=catalogFromMarkdown(await readFile(path.join(root,'SKILLS/niche-site-audit/references/checklist.md'),'utf8'));
if(catalog.length!==85)throw Error('Unexpected catalog; review acceptance contract.');
const config=JSON.parse(await readFile(path.join(core,'config/niche-network.json'),'utf8'));
if(config.defaultEmail!=='info@pinet.lt'||config.operatorName!=='MB Pinet'||!config.networkDomains.includes('akmenas.lt'))throw Error('Default contacts or candidate mismatch.');
const migrated=['akmenas','apartmentstrakai','auksarankiams','autoelektrikaivilniuje','businessintelligence','e-statybai','estrategija','klaidu-taisymas','laiptucentras','mtaisykla','namudekoravimas','pliusstatyba','rentbook','smulkusurmas','storyline','tiknamams','tvirti-pamatai'];
for(const id of migrated){
 const text=await readFile(path.join(root,`sites/${id}.md`),'utf8');
 if(!text.includes('**MB Pinet**')||!text.includes('**info@pinet.lt**')||text.includes('Savininkas leido laikiną info@memorycasting.lt'))throw Error(`Stale planning contacts: ${id}`);
}
const zoom={siteId:'traktoriupadangos',canonicalHost:'traktoriupadangos.lt',recordedAt:at,clientDate:'2026-09-30',packageSha256:sha(packageBytes),buildAt:previous.environment.buildAt,
 intendedUrls:['/','/gidai','/gidas/kaip-issirinkti-traktoriaus-padangas','/gidas/traktoriaus-padangu-zymejimas','/gidas/radialines-ar-diagonalines-traktoriaus-padangos','/kontaktai'],
 checks:{R2:'UNVERIFIED',S2:'UNVERIFIED'},status:'INTERRUPTED_BY_USER_ESCAPE',mechanismAttempted:'Native Chrome zoom shortcut via supported Computer Use; true percentage not established.',
 originalZoom:null,finalZoom:null,viewportAtEnlargement:null,dprAtEnlargement:null,screenshotsAtVerifiedEnlargement:[],
 actionsVerifiedAtEnlargement:[],restoration:'UNVERIFIED; no confirmed zoom change or restoration',
 priorNarrowEvidence:path.join(core,'output/audits/tractor-browser-local.json'),
 limitations:['Native window activation/capture did not reliably establish the intended audit tab.','User physically pressed Escape; no more browser/app input issued after the stop.','Unrelated foreground content was not retained as audit evidence.','320/390/768/1440 narrow-layout evidence is retained separately; it is not proof of enlargement.'],
 instructions:path.join(root,'SKILLS/niche-site-audit/references/accessibility-verification.md')};
await writeFile(path.join(dir,'ACCESSIBILITY-VERIFICATION.json'),JSON.stringify(zoom,null,2)+'\n');
await writeFile(path.join(dir,'ACCESSIBILITY-VERIFICATION.md'),`# Traktorių svetainės didinimo patikra\n\n2026-09-30; įrašyta ${at}. **R2/S2 — UNVERIFIED.**\n\nTikras Chrome didinimo bandymas nepatvirtino 200% procento ir numatyto audito lango būsenos. Kompiuterio valdymas sustabdytas savininko fiziniu Esc; po sustabdymo naršyklės ar programų įvestis nebetęsta. Nepatvirtinta nei galutinė didinimo reikšmė, nei atkūrimas. Nėra patvirtinto svetainės gedimo ar didinimo PASS.\n\nAnkstesni 320/390/768/1440 maketų įrodymai išlieka tai pačiai turinio ir source versijai, tačiau didinimo patikros neatstoja. Svetimos foreground informacijos audito įrodymai nesaugomi.\n\nVersija: paketo SHA-256 \`${zoom.packageSha256}\`, build ${zoom.buildAt}. Tikslios numatytos nuorodos, bandymo ribos ir ankstesnis siauro maketo įrodymas: [JSON](ACCESSIBILITY-VERIFICATION.json). Bendras protokolas: [accessibility-verification](../../SKILLS/niche-site-audit/references/accessibility-verification.md). Local balas lieka 70/72 = 9,72/10; naujo agento bandymas laukia šių vartų.\n`);
const readiness={recordedAt:at,clientDate:'2026-09-30',documentationStatus:'VERIFIED_SETUP_ONLY',benchmarkStatus:'PENDING_LOCAL_GATE',newThreadCreated:false,
 candidate:'akmenas.lt',exactFuturePrompt:'Sukurk naują puslapį domenui akmenas.lt.',catalogCriteria:catalog.length,tests:{passed:5,total:5,log:path.join(dir,'scorer-tests.log'),logSha256:sha(Buffer.from(testLog))},
 skillValidation:validation,junctions,checkedLocalLinks:links,instructionFingerprints:fingerprints,migratedPlanningBriefs:migrated,
 publicSourcesUnchanged:true,packageSha256:sha(packageBytes),contactDefaults:{operatorName:config.operatorName,email:config.defaultEmail},
 limitations:['No new-agent website result has been generated or evaluated.','No claim that instructions guarantee 9/10 design.','R2/S2 user-interrupted enlargement remains unverified; local 10/10 condition not met.','Live domain, production and demand are separate unverified gates.']};
await writeFile(path.join(dir,'NEW-AGENT-READINESS.json'),JSON.stringify(readiness,null,2)+'\n');
console.log(JSON.stringify({catalogCriteria:catalog.length,testsPassed:5,validatedSkills:validation.length,linkedSources:junctions.length,localLinksChecked:links.length,migratedBriefs:migrated.length,benchmarkStatus:readiness.benchmarkStatus}));
