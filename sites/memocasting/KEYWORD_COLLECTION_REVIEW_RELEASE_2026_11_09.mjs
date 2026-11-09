// Scoped exact-revision review and local release. Never deploys.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const root='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/_worktrees',core=`${root}/memo-keywords-core-20261109`,pub=`${root}/memo-keywords-public-20261109`,work=`${root}/memo-keywords-bulk-studio-20261109`;
process.env.STUDIO_DATA_DIR=`${work}/studio-data`;
process.env.STUDIO_OUTPUT_DIR=`${work}/studio-output`;
process.env.STUDIO_NETWORK_SETTINGS=`${pub}/config/niche-network.json`;
process.env.STUDIO_PUBLIC_CORE_DIR=pub;
const model=await import(pathToFileURL(`${core}/content-studio/src/model.mjs`));
const snapshot=JSON.parse(await readFile(`${work}/review-snapshot.json`,'utf8'));
const basePackagePath=`${pub}/content-packages/memocasting/content-package.json`,expectedBasePackageSha256='07089ea39dfa3d925645a0487ce6108f8702c5d2fce098981781137563bf9eb0';
const base=JSON.parse(await readFile(basePackagePath,'utf8'));
const site=await model.getSite('memocasting');
assert.equal(snapshot.pages.length,20);
const ids=snapshot.pages.map(p=>p.id),expectedRevisionHashes=Object.fromEntries(snapshot.pages.map(p=>[p.id,p.revisionHash]));
const addedPageIds=ids.filter(id=>!base.pages.some(p=>p.id===id));
assert.equal(addedPageIds.length,18);
for(const record of snapshot.pages){
 const p=site.pages.find(p=>p.id===record.id);assert.ok(p);
 assert.equal(model.revisionHash(p),record.revisionHash,`Changed revision: ${record.slug}`);
 const wordText=p.body.flatMap(b=>[b.text||'',...(b.items||[])]).join(' ');
 const count=(wordText.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)||[]).length;assert.ok(count>=1000,`${p.slug}: ${count}`);
 const notes={
  usefulness:`${p.title}: aptaria konkrečią gavėjo ar progos situaciją, palygina dviejų tikrų rinkinių naudojimą, įteikimą ir pasiruošimo sprendimus; paaiškina, kada kūrybinė dovana gali netikti.`,
  facts:'2026-11-09 gyvame kataloge patikrinti abu įjungti rinkiniai: poros 32 €, šeimos 48 €, balti dažai abiejuose, poros 1 200 g gipso, šeimos po du alginato ir gipso pakelius. Laiko, sudėties ir pristatymo teiginiai palyginti su svetainės instrukcijomis; amžius, talpa ir tiksli pristatymo data nežadami.',
  sources:'2026-11-09: https://memocasting.lt/prekyba/catalog, https://memocasting.lt/rinkinys-porai, https://memocasting.lt/seimos-rinkinys, https://memocasting.lt/instrukcijos/poros-rinkiniui, https://memocasting.lt/instrukcijos/seimos-rinkiniui ir https://memocasting.lt/pristatymas. Katalogo kainos laikui bėgant gali keistis.',
  media:'Kolekcijos service puslapis neturi individualių medijos failų; produktais naudojamos esamos abiejų rinkinių kortelės ir jų vaizdai. Tikrintas bendras realus rendereris privačioje peržiūroje; jo antraštės logotipo ir kainų rodymas nevertintas dėl atjungtų preview bindingų.',
  links:'Juodraščių auditui patikrinti abiejų produktų ir susijusių gidų kontekstiniai adresai; esamų gidų nuorodos į kolekcijas pateikiamos atskiru rendererio pakeitimu, naudojančiu tik leistinus puslapius. Vienas gidas ir bendras šablonas tikrinti realioje privačioje peržiūroje; hosted patikra dar būtina.',
  presentation:`Visas lietuviškas tekstas perskaitytas; dabartinėje revizijoje ${count} žodžių. Visos 20 kolekcijų atvertos privačiame rendererio preview, patikrinta H1 ir abi prekių kortelės; pasirinktinai patikrintas kompiuterio ir 390 px vaizdas. Datos, kainos, schema ir produkcinis vaizdas dar turi būti patikrinti po diegimo.`
 };
 await model.recordEditorialReview('memocasting',p.id,{reviewer:'codex-keyword-collections-editor-20261109',revisionHash:record.revisionHash,evidence:notes});
}
await model.approveReviewedOverlay('memocasting',{basePackagePath,expectedBasePackageSha256,pageIds:ids,addedPageIds,expectedRevisionHashes},'codex-keyword-collections-editor-20261109');
const assets=JSON.parse(await readFile('C:/Users/Lenovo/AppData/Local/Temp/memo-privacy-baseline-assets-20261105.json','utf8'));
assert.ok(process.env.MEMO_BASELINE_OBSERVED_AT,'Requires a fresh actual production observation');
const release=await model.releaseReviewedOverlay('memocasting',{basePackagePath,expectedBasePackageSha256,pageIds:ids,addedPageIds,baseAssetsDirectory:`${pub}/content-packages/memocasting/assets`,expectedBaseAssets:assets,expectedBaseAssetsSha256:'b46142d03f7e4299388e2f9a89fa3d3138c9656572cd2322f8e4b8931397c0d8',baselineEvidence:{sourceVersion:'PUBLIC 943f9694d69a85d706d3b3f2786aeaee8fc14d47',deploymentId:'Worker 32fe21af-bfc9-44d9-ba11-064bb7875953',observedAt:process.env.MEMO_BASELINE_OBSERVED_AT}});
const output=JSON.parse(await readFile(release.path,'utf8'));
assert.equal(output.pages.length,base.pages.length+18);
for(let i=0;i<base.pages.length;i++){
 const a=base.pages[i],b=output.pages[i];assert.equal(a.id,b.id);assert.equal(a.publishAt,b.publishAt);
 if(!ids.includes(a.id))assert.deepEqual(a,b,`Unexpected baseline change: ${a.slug}`);
}
console.log(JSON.stringify({...release,baselineDatesUnchanged:true,unchangedBaselinePages:base.pages.length-2}));
