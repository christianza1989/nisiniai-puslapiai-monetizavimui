import {readFile,writeFile,mkdir,cp,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const site='C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/laiptucentras';
const network='C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui';
const runtime='C:/Users/lenovo/Documents/dovanos-memorycasting/output/laiptucentras-production';
const dest=path.join(site,'FIRST-RUN');
await mkdir(dest,{recursive:true});
const rubric=[
 {criterion:'Nišos atpažįstamumas',points:2,evidence:['qa/home-desktop-final.png','qa/gidai-desktop-final.png'],reason:'Laiptų panorama, konstrukcijos / pakopų / angos studijos ir originalus laiptų ženklas iškart nurodo temą be perkelto gamintojo portfelio.'},
 {criterion:'Hierarchija',points:2,evidence:['qa/home-desktop-final.png','qa/laiptu-kaina-desktop-final.png'],reason:'Aiškus pirmas klausimas, vienas registravimo veiksmas, didesnės serif antraštės ir ramesni paaiškinimai; gide turinys / šaltiniai atskirti.'},
 {criterion:'Kompozicija',points:2,evidence:['qa/home-desktop-full-final.png','research/study-b-desktop.jpg'],reason:'Dvi nevienodo mastelio įžangos kolonos ir panorama, sąrašo / medžiagos / tamsios juostos kaita; trijų konceptų palyginimu pasirinkta B.'},
 {criterion:'Visas ritmas',points:2,evidence:['qa/home-desktop-full-final.png','qa/laiptu-konstrukcijos-desktop-final.png'],reason:'Vidurys ir pabaiga atsako skirtingus klausimus; nuoseklūs tarpai, tipografija ir tekstinis footer, nėra vienodų dekoratyvių kortelių kiekvienam blokui.'},
 {criterion:'Mobilus maketas',points:1,evidence:['qa/home-mobile-final.png','qa/laiptu-matavimas-mobile-final.png','qa/guide-320-body.png'],reason:'Skaitoma viena kolona ir tinkami crop, native meniu bei tikras CTA. Išlyga: piloto paaiškinimas nustumia vaizdą žemyn, atvertas ilgas turinys virš gido užima daug vietos. Actual200% enlargement dar neįrodytas.'},
 {criterion:'Tapatybė vidiniuose puslapiuose',points:2,evidence:['qa/gidai-desktop-final.png','qa/laiptu-kaina-desktop-final.png','qa/form-empty.png'],reason:'Newsreader / Manrope, popierius / žaluma, tas pats ženklas, byline ir footer tęsiasi indekse, gide bei formoje; aktualus temos vaizdas kiekvienam gidui.'},
 {criterion:'Funkcija',points:2,evidence:['qa/skip-final.json','qa/native-validation.json','qa/ui-d1.json','qa/html-audit.json'],reason:'Naudingi tikri maršrutai ir anchor, veikiantis native meniu / fokusas ir įrašanti forma, be išgalvotų prekių / pažadų. 200% testas atskiras neišspręstas A–Z vartas.'}
];
const craft={at:new Date().toISOString(),evaluator:'Implementation agent self-review, not parent/savininko benchmark',rubricSource:'SKILLS/niche-site-builder/references/art-direction.md and AUTONOMY_BENCHMARK.md',criteria:rubric,points:rubric.reduce((n,x)=>n+x.points,0),maximum:14,score:Math.floor(1000*rubric.reduce((n,x)=>n+x.points,0)/14)/100,parentCraftScore:null,limitations:['Subjective local screenshots and tested function, not world rating or conversion result.','Technical local9.72 still has unverified R2/S2 critical gates.']};
await writeFile(path.join(site,'CRAFT-SELF-REVIEW.json'),JSON.stringify(craft,null,2));
const docs=['BUSINESS.md','PRODUCT.md','DESIGN.md','RESEARCH.md','CALENDAR.md','MEDIA.json','MEDIA-ACCEPTANCE.json','EDITORIAL-REVIEW.json','ACCESSIBILITY-VERIFICATION.json','ACCESSIBILITY-VERIFICATION.md','QA-VERIFICATION.md','CRAFT-SELF-REVIEW.json','PHASE-1-AUDIT.json','PHASE-1-AUDIT.md','AUDIT-SCORE.json'];
await mkdir(path.join(dest,'documents'),{recursive:true});
for(const item of docs)await cp(path.join(site,item),path.join(dest,'documents',item));
await cp(path.join(network,'sites/laiptucentras.md'),path.join(dest,'documents/site-journal.md'));
for(const item of ['qa','history','research','snapshots'])await cp(path.join(site,item),path.join(dest,item),{recursive:true});
const regression=JSON.parse(await readFile(path.join(site,'qa/regressions.json'),'utf8'));
for(const file of Object.keys(regression.fingerprints)){
 const bytes=await readFile(path.join(runtime,file));
 const hash=createHash('sha256').update(bytes).digest('hex');
 if(hash!==regression.fingerprints[file])throw new Error('Runtime source changed after checks '+file);
 await mkdir(path.dirname(path.join(dest,'source',file)),{recursive:true});
 await writeFile(path.join(dest,'source',file),bytes);
}
await cp(path.join(runtime,'public/fonts/laiptucentras'),path.join(dest,'source/public/fonts/laiptucentras'),{recursive:true});
await cp(path.join(runtime,'public/content-assets/laiptucentras'),path.join(dest,'source/public/content-assets/laiptucentras'),{recursive:true});
await cp(path.join(network,'content-studio/scripts/build-laiptucentras-site.mjs'),path.join(dest,'source/build-laiptucentras-site.mjs'));
await cp(path.join(network,'research/autonomy/2026-10-01-laiptucentras-start.json'),path.join(dest,'START-METADATA.json'));
const start=JSON.parse(await readFile(path.join(dest,'START-METADATA.json'),'utf8'));
const audit=JSON.parse(await readFile(path.join(site,'PHASE-1-AUDIT.json'),'utf8'));
const handoverInstructionFingerprints={};
for(const file of Object.keys(start.instructionFingerprints))handoverInstructionFingerprints[file]=createHash('sha256').update(await readFile(path.join(network,file))).digest('hex');
const manifest=[];
async function visit(dir){for(const name of await readdir(dir)){const file=path.join(dir,name),s=await stat(file);if(s.isDirectory())await visit(file);else {const bytes=await readFile(file);manifest.push({path:path.relative(dest,file).replaceAll('\\','/'),bytes:s.size,sha256:createHash('sha256').update(bytes).digest('hex')});}}}
await visit(dest);
const record={siteId:'laiptucentras',canonicalHost:'laiptucentras.lt',threadId:start.threadId,exactPrompt:start.exactPrompt,startedAt:start.observedAt,firstCompletionPreparedAt:new Date().toISOString(),firstCompletionAt:null,status:'FIRST RESULT SNAPSHOT PREPARED BEFORE FINAL; parent records actual final timestamp/text',instructionFingerprints:start.instructionFingerprints,handoverInstructionFingerprints,instructionFingerprintCaveat:'Dispatch metadata is historical, not proof of reading; handover is current. They are not silently substituted.',interventions:[],selfRepairs:audit.baseline.repairs,toolLimitations:audit.baseline.limitations,packageSha256:audit.version.packageSha256,sourceFingerprints:regression.fingerprints,selfReportedLocalScore:9.72,parentLocalScore:null,craftCriteria:rubric,selfReportedCraftScore:craft.score,parentCraftScore:null,criticalGates:['R2 actual200% zoom UNVERIFIED','S2 enlarged text UNVERIFIED'],localPreview:'http://127.0.0.1:8786/',launchStatus:'NOT DEPLOYED / NOT DOMAIN READY',demandStatus:'UNMEASURED; no real inquiries, partners or revenue',scope:'Only own approved public package/media/source and sanitized evidence; no secrets, private leads, .env/.dev.vars, node_modules or database copied',evidenceFiles:manifest,rootLessons:['Do not derive Service entities from generic editorial bucket on utility pages.','Verify actual font file format, not filename.','Supported browser viewport control cannot prove200% zoom.']};
await writeFile(path.join(dest,'FIRST-RUN.json'),JSON.stringify(record,null,2));
await writeFile(path.join(dest,'README.md'),'# Pirmas laiptucentras.lt rezultatas\n\nSnapshot sukurtas iki pirmo final ir bet kokio parent taisymo. FIRST-RUN.json saugo tikrus dispatch bei handover fingerprint, atskirus agento / parent laukus ir failų SHA-256. Source atitinka būtent ištestuotą isolated production kopiją. Kitos concurrently dirbančios nišos neperrašomos.\n\nLocal9,72 su R2/S2 UNVERIFIED, agento craft9,28 yra savęs įvertinimas. Parent rezultatai null, reali paklausa neįrodyta, domein-ready nėra. FINAL.md yra paruoštas perduodamo atsakymo tekstas; tikras final timestamp ir parent peržiūra fiksuojami priimančioje sesijoje.\n');
console.log(JSON.stringify({snapshot:dest,files:manifest.length,craft:craft.score,parentScores:null,sourceHashesVerified:true}));
