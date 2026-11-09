// Actual review and scoped export of the three exact checked drafts only.
// This produces an immutable local release; it does not deploy or publish.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/_worktrees';
const pub=`${root}/memo-googlepay-privacy-public-20261105`,work=`${root}/memo-collection-reviewed-prep-20261109`;
process.env.STUDIO_DATA_DIR=`${work}/studio-data`;
process.env.STUDIO_OUTPUT_DIR=`${work}/studio-output`;
process.env.STUDIO_NETWORK_SETTINGS=`${pub}/config/niche-network.json`;
process.env.STUDIO_PUBLIC_CORE_DIR=pub;
const model=await import(pathToFileURL(`${root}/memo-collection-copy-20261109/content-studio/src/model.mjs`));
const basePackagePath=`${pub}/content-packages/memocasting/content-package.json`;
const expectedBasePackageSha256='019e5950fca629b1bb8942ced9b7f2db3c0d33cdbe67720cf990bcb59df2e6ca';
const ids=['a697644d-96c7-4e31-a1eb-7ec165ac782d','c5c5aa8e-b53f-411f-a2ed-c0d7f9d5b067','ac6caea7-95af-4e5c-b13c-d060f7c064ae'];
const expectedRevisionHashes={
 [ids[0]]:'babe8b0acd9b5f9742d86f72e19ded63b060b9ac86dc2c85e75247520779fc08',
 [ids[1]]:'78049c040abde50824d837a607142d274ea6be0b91f07f0ab8a6d2168693a700',
 [ids[2]]:'0ac92bd60d9d3893e545e1d038d35811941b96f47fdc96e70f5ed1328f7dc2b5'
};
const notes={
 [ids[0]]:{
  usefulness:'Atskira komercinė atranka palygina du tikrus rinkinius pagal dalyvius, nurodo kada kūrybinė dovana netinka, padeda pasiruošti ir skiria savarankišką veiklą nuo gatavo liejinio.',
  facts:'Gyvi poros ir šeimos prekių aprašai patikrinti 2026-11-09: porai vienas alginato pakelis ir 1200 g gipso, šeimai po du pakelius; balti dažai abiejuose. Abi realios instrukcijos nurodo 1 val. stingimą ir 5–7 parų džiovinimą, vaiko dalyvavimą prižiūri suaugusysis.',
  sources:'Pirminiai šaltiniai: https://memocasting.lt/rinkinys-porai, https://memocasting.lt/seimos-rinkinys, https://memocasting.lt/instrukcijos/poros-rinkiniui ir https://memocasting.lt/instrukcijos/seimos-rinkiniui. Puslapiai patikrinti 2026-11-09; individualaus rinkinio instrukcija turi pirmenybę esant skirtumui.',
  media:'Pačiame tekstiniame service puslapyje atskirų media failų nėra. Prekių korteles ir jų esamus atvaizdus mačiau privačiame realaus rendererio preview, be prijungtos gyvos kainų tarnybos.',
  links:'Tekste yra nuorodos į dvi instrukcijas ir platų informacinį gidą; prekių kortelės ir papildomos nuorodos veda į tikrus atitinkamus produktų URL. Pati kolekcija dar tik planuojama iki leidinio įdiegimo.',
  presentation:'Perskaičiau visą galutinį lietuvišką tekstą ir tikrinau sakinius bei faktus; realaus rendererio noindex loopback preview matytas kompiuteryje ir 390 px telefone, įskaitant abi korteles. Kainos, schema, galutinė naršyklės antraštė ir hosted dar nepatikrintos; preview kainų ryšys sąmoningai išjungtas.'
 },
 [ids[1]]:{
  usefulness:'Palyginau visą esamą platų gidą: vertė išlieka kelių skirtingų dovanų ir situacijų palyginimas; nauja kontekstinė nuoroda veda į siaurą rankų liejimo rinkinių atranką.',
  facts:'Patikrinau originalius tiekėjų puslapius 2026-11-09. MANDALA skirtukas tuo metu neparduodamas, todėl seną nekvalifikuotą 3,95 € teiginį pakeičiau aiškiai datuota prieinamumo pastaba; nesaugų gertuvės spalvos tikslinimą pašalinau. Kitų aktualių pavyzdžių kainos peržiūrėtos, gali keistis.',
  sources:'Patikrinti šeši pirminiai pardavėjų puslapiai: Patogupirkti skirtukas ir kuponas, Decathlon gertuvė, Skonis ir Kvapas AeroPress, Gera dovana dirbtuvės ir e-dovanos albumas; pastabos pažymėtos tikros patikros data 2026-11-09.',
  media:'Dvi originalios redakcinės iliustracijos matytos kaip pilni vaizdai: moteris sodo centre ir moteris prie dovanų lentynų; jų alt atitinka vaizdą. Visi 10 viešų variantų SHA sutikrinti su pinned baseline; privataus originalo neatkuriame.',
  links:'Šeši išoriniai pasiūlymai ir vidinių tikslų ID peržiūrėti; natūralus naujas sakinys su tiesiogine nuoroda į draft kolekciją matytas realaus rendererio preview. Ateities URL viešo rodymo tinkamumą sprendžia esamas laiko filtras.',
  presentation:'Visi teksto blokai perskaityti, naujas sakinys ir pakeisti prekės teiginiai perskaityti pakartotinai. Rėmo, gido ir teksto pradžios išdėstymas patikrintas desktop ir 390 px mobiliai izoliuotame realaus rendererio preview; naujas href matytas prie atitinkamos pastraipos. Publikavimas ir naršyklės metaduomenys dar nepatikrinti.'
 },
 [ids[2]]:{
  usefulness:'Esamas dovanų indeksas išlaiko atranką pagal gavėją, progą ir biudžetą; viena nauja kontekstinė nuoroda padeda norinčiai bendros kūrybos auditorijai pereiti prie tikrų produktų.',
  facts:'Visą teksto turinį perskaičiau; pridedamas sakinys nėra naujas kiekybinis teiginys. Esama rinkinių ir instrukcijų informacija sutikrinta su gyvais produkto bei instrukcijų puslapiais 2026-11-09.',
  sources:'Tikrinti tikri Memory Casting produktų ir instrukcijų puslapiai; plataus gido ir dovanų indekso pirminiai vietiniai URL pasiekiami, nauja kolekcija bus vieša tik įdiegus peržiūrėtą paketą.',
  media:'Esama iliustracija peržiūrėta: atviras sąsiuvinis, pieštukas ir rožinė dovana ant stalo atitinka alt; jos 5 viešų WebP variantų SHA sutampa su pinned bazės inventoriumi.',
  links:'Nauja kontekstinė nuoroda į tikslaus naujo puslapio ID matoma kaip /dovanos/moterims realaus rendererio preview; visi esami puslapio ryšiai išsaugoti, o jų laiko tinkamumas lieka bendrame resolverio filtre.',
  presentation:'Visas lietuviškas kūno tekstas perskaitytas; naujasis sakinys peržiūrėtas ir linksnis pataisytas. Faktinė viršutinė puslapio dalis ir nuorodų HTML patikrinti desktop ir 390 px mobiliai privačiame rendererio preview; hosted ir schema dar laukia.'
 }
};
const site=await model.getSite('memocasting');
for(const id of ids){const page=site.pages.find(p=>p.id===id);assert.ok(page);assert.equal(model.revisionHash(page),expectedRevisionHashes[id]);await model.recordEditorialReview('memocasting',id,{reviewer:'codex-memocasting-collection-editor-20261109',revisionHash:expectedRevisionHashes[id],evidence:notes[id]});}
await model.approveReviewedOverlay('memocasting',{basePackagePath,expectedBasePackageSha256,pageIds:ids,addedPageIds:[ids[0]],expectedRevisionHashes},'codex-memocasting-collection-editor-20261109');
const assets=JSON.parse(await readFile('C:/Users/Lenovo/AppData/Local/Temp/memo-privacy-baseline-assets-20261105.json','utf8'));
const release=await model.releaseReviewedOverlay('memocasting',{basePackagePath,expectedBasePackageSha256,pageIds:ids,addedPageIds:[ids[0]],baseAssetsDirectory:`${pub}/content-packages/memocasting/assets`,expectedBaseAssets:assets,expectedBaseAssetsSha256:'b46142d03f7e4299388e2f9a89fa3d3138c9656572cd2322f8e4b8931397c0d8',baselineEvidence:{sourceVersion:'PUBLIC a22bfd96b4d6787ab3cd3c0a9a1d4e415510f98e',deploymentId:'bb62bd89-460d-40fc-bba8-c71d3194dbe7 / Worker a224a0fb-8648-4ea0-943d-5aece52d1b48',observedAt:'2026-11-09T07:47:01.000Z'}});
const baseline=JSON.parse(await readFile(basePackagePath,'utf8')),output=JSON.parse(await readFile(release.path,'utf8'));
assert.equal(output.pages.length,baseline.pages.length+1);
let unchanged=0;for(let i=0;i<baseline.pages.length;i++){const a=baseline.pages[i],b=output.pages[i];assert.equal(a.id,b.id);assert.equal(a.publishAt,b.publishAt);if(!ids.includes(a.id)){assert.deepEqual(a,b);unchanged++;}}
assert.equal(unchanged,baseline.pages.length-2);
console.log(JSON.stringify({...release,unselectedPagesExactlyPreserved:unchanged,allBaselineDatesPreserved:true}));
