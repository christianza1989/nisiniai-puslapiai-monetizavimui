// Exact reviewed revisions only. Produces a local overlay; does not deploy.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const root='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/_worktrees';
const pub=`${root}/memo-christmas-public-20261109`;
const work=`${root}/memo-christmas-draft-data-20261109`;
process.env.STUDIO_DATA_DIR=`${work}/studio-data`;
process.env.STUDIO_OUTPUT_DIR=`${work}/studio-output`;
process.env.STUDIO_NETWORK_SETTINGS=`${pub}/config/niche-network.json`;
process.env.STUDIO_PUBLIC_CORE_DIR=pub;
const model=await import(pathToFileURL(`${root}/memo-christmas-core-20261109/content-studio/src/model.mjs`));
const basePackagePath=`${pub}/content-packages/memocasting/content-package.json`;
const expectedBasePackageSha256='2e18f8a6ac5d8a783075ed5309ab4dde397fea16293415ec4ec5e81037529dfb';
const ids=['a95e3915-a2af-442b-9266-7db5ef47d90a','7db71eba-3193-4e80-b481-24f0751f84e1','ac6caea7-95af-4e5c-b13c-d060f7c064ae'];
const expectedRevisionHashes={
 [ids[0]]:'e101c23e1477e73edb30681a28e4c6a8c8a66dcff32403f2d83df83ae5afa560',
 [ids[1]]:'7f6cc1785d43eb746286d0aa14d0fe681030cd9568ecc88c4b52e1587ff592c6',
 [ids[2]]:'55f57515ca54e1e8c76f099b7af85f08811c7e9e5192dee7c7bfbabc3cf20a95'
};
const notes={
 [ids[0]]:{
  usefulness:'Palygina du tikrus rinkinius ir atskiria rinkinio įteikimą nuo pagamintos dovanos; planavimo pavyzdys leidžia atgal suskaičiuoti džiovinimo laiką.',
  facts:'Gyvi abiejų rinkinių aprašai ir instrukcijos patikrinti 2026-11-09. Stingimas valandą ir 5–7 parų džiovinimas iki dažymo nėra pažadas dėl pristatymo ar dažų džiūvimo; pavyzdžio septynios paros patikrintos.',
  sources:'https://memocasting.lt/rinkinys-porai, https://memocasting.lt/seimos-rinkinys, https://memocasting.lt/instrukcijos/poros-rinkiniui ir https://memocasting.lt/instrukcijos/seimos-rinkiniui, tikrinta 2026-11-09.',
  media:'Service puslapyje atskirų media failų nėra. Abi produkto kortelės ir jų atvaizdai apžiūrėti izoliuotame realaus rendererio preview, gyvas katalogas ten sąmoningai neprijungtas.',
  links:'Apžiūrėtos tekstinės nuorodos į Kalėdų gidą, dovanų indeksą, instrukcijas ir prekių korteles. Viešai naujas URL veiks tik įdiegus.',
  presentation:'Visas galutinis lietuviškas tekstas perskaitytas, galutinė H1 revizija ir puslapio išdėstymas apžiūrėti kompiuteryje ir 390 px telefone. Preview nerodo kainų, schemos, datų ar galutinio title; hosted patikra dar būtina.'
 },
 [ids[1]]:{
  usefulness:'Esamas platus Kalėdų gidas pateikia skirtingas dovanas ir pasirinkimo kriterijus; kontekstinė nuoroda veda į konkrečią mūsų rinkinių kolekciją.',
  facts:'Pardavėjų puslapiai tikrinti 2026-11-09. MANDALA neparduodamas, žaidimų aktualios akcijos 18,39 ir 21,59 euro; senas kainas bei biudžeto skaičiavimą patikslinau su data.',
  sources:'Tikrinti Patogupirkti MANDALA ir 10 eurų kuponas, Gerduva SAVONA, e-dovanos albumas, Brain Games Codenames Duet ir Tiktai Vienas, Gera dovana keramikos dirbtuvės; tikslūs URL ir patikros detalės užfiksuotos COLLECTION_CHRISTMAS_SOURCES_2026_11_09.md.',
  media:'Peržiūrėtos dvi esamos redakcinės iliustracijos: dovanos ir puodeliai prie eglutės bei moteris prie dovanų lentynų; alt tekstai tinka. Dešimt viešų variantų sutikrinti su pinned bazės SHA; jos nėra klientų dokumentinės nuotraukos.',
  links:'Nauja kontekstinė nuoroda matoma rendererio preview; septyni pirminių pardavėjų URL patikrinti. Senų ir būsimų gidų viešo rodymo filtrą reikia patikrinti įdiegtoje svetainėje.',
  presentation:'Perskaityti visi teksto blokai ir tikslinti prekybiniai faktai. Gido išdėstymas matytas kompiuteryje ir 390 px telefone privačiame preview; hosted ir metadata dar nepatikrinta.'
 },
 [ids[2]]:{
  usefulness:'Esamas dovanų indeksas išlaiko atranką pagal gavėją, progą ir biudžetą; kalėdinės veiklos pastraipoje pridėta aktuali nuoroda į tikrų produktų kolekciją.',
  facts:'Tekstas perskaitytas, naujas sakinys nepateikia naujų kiekybinių pažadų; rinkinių ir instrukcijų informacija sutikrinta 2026-11-09.',
  sources:'Tikri abiejų rinkinių ir instrukcijų puslapiai; indeksas ir Kalėdų gidas yra esami vietiniai URL, naujoji kolekcija vieša tik po diegimo.',
  media:'Esama redakcinė iliustracija – sąsiuvinis, pieštukas ir rožinė dovana – apžiūrėta ir atitinka alt; penki vieši variantai sutikrinti su pinned bazės inventoriumi.',
  links:'Nauja nuoroda /dovanos/kaledoms matoma kontekstinėje pastraipoje ir nuorodų sąraše preview. Esami ryšiai išsaugoti; suplanuotų gidų laiko filtrą tikrinti hosted.',
  presentation:'Visas lietuviškas tekstas perskaitytas, puslapio išdėstymas ir nuoroda peržiūrėti kompiuteryje bei 390 px telefone. Hosted ir schema dar netikrinti.'
 }
};
const site=await model.getSite('memocasting');
for(const id of ids){const page=site.pages.find(p=>p.id===id);assert.ok(page);assert.equal(model.revisionHash(page),expectedRevisionHashes[id]);await model.recordEditorialReview('memocasting',id,{reviewer:'codex-memocasting-christmas-editor-20261109',revisionHash:expectedRevisionHashes[id],evidence:notes[id]});}
await model.approveReviewedOverlay('memocasting',{basePackagePath,expectedBasePackageSha256,pageIds:ids,addedPageIds:[ids[0]],expectedRevisionHashes},'codex-memocasting-christmas-editor-20261109');
const assets=JSON.parse(await readFile('C:/Users/Lenovo/AppData/Local/Temp/memo-privacy-baseline-assets-20261105.json','utf8'));
const release=await model.releaseReviewedOverlay('memocasting',{basePackagePath,expectedBasePackageSha256,pageIds:ids,addedPageIds:[ids[0]],baseAssetsDirectory:`${pub}/content-packages/memocasting/assets`,expectedBaseAssets:assets,expectedBaseAssetsSha256:'b46142d03f7e4299388e2f9a89fa3d3138c9656572cd2322f8e4b8931397c0d8',baselineEvidence:{sourceVersion:'PUBLIC a48278b51a3dd9a9120a223707c75384e7e8e4ca',deploymentId:'Worker f24eb044-6bc2-4d3f-a0af-6139253f2a92',observedAt:new Date().toISOString()}});
const baseline=JSON.parse(await readFile(basePackagePath,'utf8')),output=JSON.parse(await readFile(release.path,'utf8'));
assert.equal(output.pages.length,baseline.pages.length+1);
let unchanged=0;for(let i=0;i<baseline.pages.length;i++){const a=baseline.pages[i],b=output.pages[i];assert.equal(a.id,b.id);assert.equal(a.publishAt,b.publishAt);if(!ids.includes(a.id)){assert.deepEqual(a,b);unchanged++;}}
assert.equal(unchanged,baseline.pages.length-2);
console.log(JSON.stringify({...release,unselectedPagesExactlyPreserved:unchanged,allBaselineDatesPreserved:true}));
