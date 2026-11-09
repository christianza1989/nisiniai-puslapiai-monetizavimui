// Isolated drafts only. This file never records review, approves, or deploys.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const root='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/_worktrees';
const core=`${root}/memo-keywords-core-20261109`;
const pub=`${root}/memo-keywords-public-20261109`;
const work=`${root}/memo-keywords-studio-20261109`;
process.env.STUDIO_DATA_DIR=`${work}/studio-data`;
process.env.STUDIO_OUTPUT_DIR=`${work}/studio-output`;
process.env.STUDIO_NETWORK_SETTINGS=`${pub}/config/niche-network.json`;
process.env.STUDIO_PUBLIC_CORE_DIR=pub;
const model=await import(pathToFileURL(`${core}/content-studio/src/model.mjs`));
const basePackagePath=`${pub}/content-packages/memocasting/content-package.json`;
const expectedPackageSha256='07089ea39dfa3d925645a0487ce6108f8702c5d2fce098981781137563bf9eb0';
const baseline=JSON.parse(await readFile(basePackagePath,'utf8'));
const selected=['dovanos','gidai/dovanos-mamai','gidai/dovanos-vyrams','gidai/dovana-porai'].map(slug=>baseline.pages.find(p=>p.slug===slug));
assert.ok(selected.every(Boolean));
const assets=JSON.parse(await readFile('C:/Users/Lenovo/AppData/Local/Temp/memo-privacy-baseline-assets-20261105.json','utf8'));
await model.initialize();
await model.recoverSiteFromPublicBaseline({
 siteId:'memocasting',canonicalHost:'memocasting.lt',basePackagePath,expectedPackageSha256,
 pageIds:selected.map(p=>p.id),expectedRevisionHashes:Object.fromEntries(selected.map(p=>[p.id,p.revisionHash])),
 baseAssetsDirectory:`${pub}/content-packages/memocasting/assets`,expectedBaseAssets:assets,
 expectedBaseAssetsSha256:'b46142d03f7e4299388e2f9a89fa3d3138c9656572cd2322f8e4b8931397c0d8',
 baselineEvidence:{sourceVersion:'PUBLIC 943f9694d69a85d706d3b3f2786aeaee8fc14d47',deploymentId:'c6e3ab2d-41ae-458f-bfd5-0db57a4286ef / Worker 32fe21af-bfc9-44d9-ba11-064bb7875953',observedAt:process.env.MEMO_BASELINE_OBSERVED_AT}
});
await model.editSite('memocasting',{facts:'Poros rinkinyje yra vienas alginato pakelis ir 1 200 g gipso, šeimos rinkinyje po du alginato bei gipso pakelius. Baltų dažų yra abiejuose. Šeimos rinkinio instrukcijoje nurodyta valanda gipso stingimo formoje ir 5–7 paros išimto liejinio džiūvimo prieš dažymą. Kainas, likutį ir pasirinkimus rodo tikras katalogas; Lietuvoje pristatoma „Omniva“ paštomatu arba „SmartPosti“ kurjeriu. Tikrinta 2026-11-09.'});
const base=await model.getSite('memocasting');
const bySlug=slug=>{const p=base.pages.find(x=>x.slug===slug);assert.ok(p,slug);return p.id;};
function parseDraft(source){
 const lines=source.trim().split(/\r?\n/);assert.ok(lines[0].startsWith('# '));
 const blocks=[];
 for(const line of lines.slice(1)){
  const t=line.trim();if(!t)continue;
  if(t.startsWith('## ')){blocks.push({type:'heading',level:2,text:t.slice(3)});continue;}
  const question=t.match(/^\*\*(.+?)\*\*\s*(.*)$/);
  if(question){blocks.push({type:'heading',level:3,text:question[1]});if(question[2])blocks.push({type:'paragraph',text:question[2]});continue;}
  blocks.push({type:'paragraph',text:t});
 }
 return blocks;
}
const entries=[
 {slug:'dovanos/mamai',file:'dovanos-mamai.md',title:'Dovanos mamai: kurkite prisiminimą kartu',description:'Palyginkite rankų liejimo rinkinius dovanai mamai ir suplanuokite bendrą kūrybos laiką bei įteikimą.',intent:'Padėti išsirinkti rankų liejimo dovaną mamai pagal jos norus, dalyvius ir pasiruošimą.',guide:'gidai/dovanos-mamai',guideLabel:'dovanų mamai gide',collectionLabel:'rankų liejimo dovanų mamai kolekciją'},
 {slug:'dovanos/vyrams',file:'dovanos-vyrams.md',title:'Dovanos vyrams: prisiminimas, kurį kuriate kartu',description:'Palyginkite rankų liejimo rinkinius vyrui ir įvertinkite, ar bendra kūrybinė veikla jam tiktų.',intent:'Padėti pasirinkti kūrybinę dovaną vyrui pagal jo norus, progą ir bendros veiklos galimybes.',guide:'gidai/dovanos-vyrams',guideLabel:'dovanų vyrams gide',collectionLabel:'rankų liejimo dovanų vyrams kolekciją'},
 {slug:'dovanos/porai',file:'dovana-porai.md',title:'Dovana porai: bendras laikas ir rankų liejinys',description:'Palyginkite rankų liejimo rinkinius porai ir suplanuokite bendros veiklos dovaną metinių ar vestuvių proga.',intent:'Padėti dovanojančiajam nuspręsti, ar pora norėtų kurti kartu ir kaip įteikti rinkinį.',guide:'gidai/dovana-porai',guideLabel:'Dovanos porai gide',collectionLabel:'rankų liejimo dovanų porai kolekciją'}
];
const created=[];
for(const e of entries){
 const source=await readFile(`${core}/sites/memocasting/collection-drafts/${e.file}`,'utf8');
 const words=source.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu) || [];
 assert.ok(words.length>=1000,`${e.slug}: ${words.length} words`);
 const page=await model.addPage('memocasting',{type:'service',slug:e.slug,title:e.title,description:e.description,intent:e.intent,cluster:'Dovanų kolekcijos',body:parseDraft(source)});
 await model.editPage('memocasting',page.id,{links:[{targetPageId:bySlug(e.guide),label:e.guideLabel},{targetPageId:bySlug('rinkinys-porai'),label:'poros rinkinį'},{targetPageId:bySlug('seimos-rinkinys'),label:'šeimos rinkinį'},{targetPageId:bySlug('pristatymas'),label:'pristatymo informaciją'},{targetPageId:bySlug('kontaktai'),label:'susisiekite'}]});
 created.push({entry:e,id:page.id,words:words.length});
}
for(const {entry:e,id} of created){
 const original=base.pages.find(p=>p.slug===e.guide);assert.ok(original);
 const line=`Jei norite palyginti mūsų rinkinius konkrečiam sumanymui, peržiūrėkite ${e.collectionLabel}.`;
 await model.editPage('memocasting',original.id,{body:[...original.body,{type:'paragraph',text:line}],links:[...original.links,{targetPageId:id,label:e.collectionLabel}]});
}
const hub=base.pages.find(p=>p.slug==='dovanos');
const line='Atskirai galite palyginti rankų liejimo dovanas mamai, rankų liejimo dovanas vyrams ir rankų liejimo dovanas porai.';
await model.editPage('memocasting',hub.id,{body:[...hub.body,{type:'paragraph',text:line}],links:[...hub.links,...created.map(({entry:e,id})=>({targetPageId:id,label:e.slug==='dovanos/mamai'?'rankų liejimo dovanas mamai':e.slug==='dovanos/vyrams'?'rankų liejimo dovanas vyrams':'rankų liejimo dovanas porai'}))]});
const final=await model.getSite('memocasting');
const changed=[...created.map(x=>x.id),...selected.map(x=>x.id)];
console.log(JSON.stringify({state:'isolated-drafts-no-review-no-approval-no-deployment',data:process.env.STUDIO_DATA_DIR,pages:changed.map(id=>{const p=final.pages.find(x=>x.id===id);assert.equal(p.approval,null);return{slug:p.slug,id,revisionHash:model.revisionHash(p),media:p.media.length,publishAt:p.publishAt};}),wordCounts:created.map(x=>({slug:x.entry.slug,words:x.words}))},null,2));
