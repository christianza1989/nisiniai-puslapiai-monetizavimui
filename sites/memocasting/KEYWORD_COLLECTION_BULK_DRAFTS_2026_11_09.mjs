// Reconstructs an isolated studio and creates drafts only; never approves or deploys.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const root='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/_worktrees';
const core=`${root}/memo-keywords-core-20261109`;
const pub=`${root}/memo-keywords-public-20261109`;
const work=`${root}/memo-keywords-bulk-studio-20261109`;
process.env.STUDIO_DATA_DIR=`${work}/studio-data`;
process.env.STUDIO_OUTPUT_DIR=`${work}/studio-output`;
process.env.STUDIO_NETWORK_SETTINGS=`${pub}/config/niche-network.json`;
process.env.STUDIO_PUBLIC_CORE_DIR=pub;
const model=await import(pathToFileURL(`${core}/content-studio/src/model.mjs`));
const basePackagePath=`${pub}/content-packages/memocasting/content-package.json`;
const baseline=JSON.parse(await readFile(basePackagePath,'utf8'));
const entries=[
 ['dovanos/kaledoms','kaledines-dovanos-existing.md','Kalėdinės dovanos','gidai/kaledines-dovanos'],
 ['dovanos/moterims','dovanos-moterims-existing.md','Dovanos moterims','gidai/dovanos-moterims'],
 ['dovanos/vyrams','dovanos-vyrams.md','Dovanos vyrams','gidai/dovanos-vyrams'],
 ['dovanos/mamai','dovanos-mamai.md','Dovanos mamai','gidai/dovanos-mamai'],
 ['dovanos/valentino-dienai','valentino-dienos-dovanos.md','Valentino dienos dovanos','gidai/dovanos-valentino-dienai'],
 ['dovanos/porai','dovana-porai.md','Dovana porai','gidai/dovana-porai'],
 ['dovanos/seimai','dovanos-seimai.md','Dovanos šeimai','gidai/dovana-seimai'],
 ['dovanos/kaledoms/mamai','kaledines-dovanos-mamai.md','Kalėdinės dovanos mamai','gidai/kaledines-dovanos-mamai'],
 ['dovanos/kaledoms/moterims','kaledines-dovanos-moterims.md','Kalėdinės dovanos moterims','gidai/kaledines-dovanos-moterims'],
 ['dovanos/kaledoms/vyrams','kaledines-dovanos-vyrams.md','Kalėdinės dovanos vyrams','gidai/kaledines-dovanos-vyrams'],
 ['dovanos/kaledoms/seimai','kaledines-dovanos-seimai.md','Kalėdinės dovanos šeimai','gidai/kaledines-dovanos-seimai'],
 ['dovanos/kaledoms/tevams','kaledines-dovanos-tevams.md','Kalėdinės dovanos tėvams','gidai/kaledines-dovanos-tevams'],
 ['dovanos/personalizuotos','personalizuotos-dovanos.md','Personalizuotos dovanos','gidai/personalizuotos-dovanos'],
 ['dovanos/originalios','originalios-dovanos.md','Originalios dovanos','gidai/originalios-dovanos'],
 ['dovanos/seneliui','dovana-seneliui.md','Dovana seneliui','gidai/dovanos-seneliui'],
 ['dovanos/mociutei','dovana-mociutei.md','Dovana močiutei','gidai/dovanos-mociutei'],
 ['dovanos/mamos-dienai','dovanos-mamos-dienai.md','Dovanos Mamos dienai','gidai/dovanos-mamos-dienai'],
 ['dovanos/gimtadieniui/vyrui','gimtadienio-dovanos-vyrui.md','Gimtadienio dovana vyrui','gidai/dovanos-gimtadienio-proga'],
 ['dovanos/gimtadieniui/mamai','gimtadienio-dovanos-mamai.md','Gimtadienio dovana mamai','gidai/dovanos-mamai'],
 ['dovanos/gimtadieniui/moterims','gimtadienio-dovanos-moterims.md','Gimtadienio dovanos moterims','gidai/dovanos-gimtadienio-proga']
];
const baseSlug=s=>baseline.pages.find(p=>p.slug===s);
const selectedSlugs=[...new Set(['dovanos',...entries.map(e=>e[3]),...entries.slice(0,2).map(e=>e[0])])];
const selected=selectedSlugs.map(s=>{const p=baseSlug(s);assert.ok(p,s);return p;});
const assets=JSON.parse(await readFile('C:/Users/Lenovo/AppData/Local/Temp/memo-privacy-baseline-assets-20261105.json','utf8'));
assert.ok(process.env.MEMO_BASELINE_OBSERVED_AT,'Provide the actual baseline observation time');
await model.initialize();
await model.recoverSiteFromPublicBaseline({
 siteId:'memocasting',canonicalHost:'memocasting.lt',basePackagePath,
 expectedPackageSha256:'07089ea39dfa3d925645a0487ce6108f8702c5d2fce098981781137563bf9eb0',
 pageIds:selected.map(p=>p.id),expectedRevisionHashes:Object.fromEntries(selected.map(p=>[p.id,p.revisionHash])),
 baseAssetsDirectory:`${pub}/content-packages/memocasting/assets`,expectedBaseAssets:assets,
 expectedBaseAssetsSha256:'b46142d03f7e4299388e2f9a89fa3d3138c9656572cd2322f8e4b8931397c0d8',
 baselineEvidence:{sourceVersion:'PUBLIC 943f9694d69a85d706d3b3f2786aeaee8fc14d47',deploymentId:'c6e3ab2d-41ae-458f-bfd5-0db57a4286ef / Worker 32fe21af-bfc9-44d9-ba11-064bb7875953',observedAt:process.env.MEMO_BASELINE_OBSERVED_AT}
});
await model.editSite('memocasting',{facts:'Poros rinkinyje yra vienas alginato pakelis ir 1 200 g gipso, šeimos rinkinyje po du alginato bei gipso pakelius. Baltų dažų yra abiejuose. Kainas ir pasirinkimus rodo tikras katalogas. Liejimo laikui vadovautis abiejų rinkinių instrukcijomis.'});
function parse(text){
 const blocks=[];
 for(const line of text.trim().split(/\r?\n/)){
  const t=line.trim();if(!t||t.startsWith('# '))continue;
  if(t.startsWith('## ')){blocks.push({type:'heading',level:2,text:t.slice(3)});continue;}
  const q=t.match(/^\*\*(.+?)\*\*\s*(.*)$/);
  if(q){blocks.push({type:'heading',level:3,text:q[1]});if(q[2])blocks.push({type:'paragraph',text:q[2]});continue;}
  blocks.push({type:'paragraph',text:t});
 }
 return blocks;
}
const site=await model.getSite('memocasting');
const bySlug=s=>{const p=site.pages.find(p=>p.slug===s);assert.ok(p,s);return p;};
const created=[];
for(const [slug,file,topic,guide] of entries){
 const source=await readFile(`${core}/sites/memocasting/collection-drafts/${file}`,'utf8');
 const words=(source.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)||[]).length;
 assert.ok(words>=1000,`${slug}: ${words}`);
 const old=baseSlug(slug);
 let page;
 if(old){
  const marker=slug==='dovanos/kaledoms'?'## Kaip nuspręsti, kam patiks tokia Kalėdų dovana?':'## Kaip pasirinkti pagal tai, kas jai svarbu?';
  const at=source.indexOf(marker);assert.ok(at>0,slug);
  await model.editPage('memocasting',old.id,{body:[...bySlug(slug).body,...parse(source.slice(at))]});
  page={id:old.id};
 }else{
  page=await model.addPage('memocasting',{type:'service',slug,title:`${topic}: rankų liejimo rinkiniai`,description:`${topic}: atraskite rankų liejimo rinkinius ir sužinokite, kaip išsirinkti bei suplanuoti bendrą kūrybą.`,intent:`Padėti pasirinkti rankų liejimo dovaną: ${topic.toLowerCase()}.`,cluster:'Dovanų kolekcijos',body:parse(source)});
 }
 created.push({slug,topic,guide,id:page.id,words,newPage:!old});
}
for(const row of created){
 const current=(await model.getSite('memocasting')).pages.find(p=>p.id===row.id);
 const guide=bySlug(row.guide);
 const text=`Palyginkite poros rinkinį ir šeimos rinkinį. Daugiau pasirinkimo idėjų rasite susijusiame dovanų gide.`;
 await model.editPage('memocasting',row.id,{body:[...current.body,{type:'paragraph',text}],links:[...current.links,{targetPageId:bySlug('rinkinys-porai').id,label:'poros rinkinį'},{targetPageId:bySlug('seimos-rinkinys').id,label:'šeimos rinkinį'},{targetPageId:guide.id,label:'susijusiame dovanų gide'}]});
}
for(const guideSlug of [...new Set(entries.map(e=>e[3]))]){
 const original=bySlug(guideSlug);
 const rows=created.filter(x=>x.guide===guideSlug);
 const additions=rows.map(r=>({type:'paragraph',text:`Palyginkite „Memory Casting“ rinkinius: ${r.topic.toLowerCase()}.`}));
 await model.editPage('memocasting',original.id,{body:[...original.body,...additions],links:[...original.links,...rows.map(r=>({targetPageId:r.id,label:r.topic.toLowerCase()}))]});
}
const final=await model.getSite('memocasting');
const changed=[...new Set([...created.map(r=>r.id),...selected.map(p=>p.id)])];
console.log(JSON.stringify({state:'drafts-only; hub linked by separate script',collections:created,changed:changed.map(id=>{const p=final.pages.find(x=>x.id===id);return {slug:p.slug,id,revisionHash:model.revisionHash(p),publishAt:p.publishAt,approval:p.approval?.status||null};})},null,2));
