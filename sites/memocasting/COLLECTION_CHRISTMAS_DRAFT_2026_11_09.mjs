// Isolated studio draft only. No editorial review, approval, release, or deployment.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const root='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/_worktrees';
const pub=`${root}/memo-christmas-public-20261109`;
const core=`${root}/memo-christmas-core-20261109`;
const work=`${root}/memo-christmas-draft-data-20261109`;
process.env.STUDIO_DATA_DIR=`${work}/studio-data`;
process.env.STUDIO_OUTPUT_DIR=`${work}/studio-output`;
process.env.STUDIO_NETWORK_SETTINGS=`${pub}/config/niche-network.json`;
process.env.STUDIO_PUBLIC_CORE_DIR=pub;
const model=await import(pathToFileURL(`${core}/content-studio/src/model.mjs`));
const basePackagePath=`${pub}/content-packages/memocasting/content-package.json`;
const expectedPackageSha256='2e18f8a6ac5d8a783075ed5309ab4dde397fea16293415ec4ec5e81037529dfb';
const baseline=JSON.parse(await readFile(basePackagePath,'utf8'));
const selected=['dovanos','gidai/kaledines-dovanos'].map(slug=>baseline.pages.find(p=>p.slug===slug));
assert.ok(selected.every(Boolean));
const assets=JSON.parse(await readFile('C:/Users/Lenovo/AppData/Local/Temp/memo-privacy-baseline-assets-20261105.json','utf8'));
await model.initialize();
await model.recoverSiteFromPublicBaseline({
 siteId:'memocasting',canonicalHost:'memocasting.lt',basePackagePath,expectedPackageSha256,
 pageIds:selected.map(p=>p.id),expectedRevisionHashes:Object.fromEntries(selected.map(p=>[p.id,p.revisionHash])),
 baseAssetsDirectory:`${pub}/content-packages/memocasting/assets`,expectedBaseAssets:assets,
 expectedBaseAssetsSha256:'b46142d03f7e4299388e2f9a89fa3d3138c9656572cd2322f8e4b8931397c0d8',
 baselineEvidence:{sourceVersion:'PUBLIC a48278b51a3dd9a9120a223707c75384e7e8e4ca',deploymentId:'45199dfe-0140-4a80-9bc1-8dbfb6a2d2dc / Worker f24eb044-6bc2-4d3f-a0af-6139253f2a92',observedAt:'2026-11-09T08:43:22.000Z'}
});
await model.editSite('memocasting',{facts:'„Memory Casting“ poros rinkinyje yra vienas alginato pakelis ir 1 200 g gipso, šeimos rinkinyje – po du alginato ir gipso pakelius. Abiejuose yra balti dažai. Abiejų rinkinių instrukcijose nurodyta valanda gipso stingimo formoje ir 5–7 paros išimto liejinio džiūvimo prieš dažymą, kol jis baltas. Gyvas 2026-11-09 katalogas rodo 32 € poros ir 48 € šeimos bazinius rinkinius. Rinkinių ir instrukcijų puslapiai bei katalogas sutikrinti 2026-11-09.'});
const site=await model.getSite('memocasting');
const bySlug=slug=>{const p=site.pages.find(x=>x.slug===slug);assert.ok(p,`Missing ${slug}`);return p.id;};
const page=await model.addPage('memocasting',{
 type:'service',slug:'dovanos/kaledoms',title:'Kalėdinės dovanos: rankų liejimo rinkiniai',
 description:'Palyginkite rankų liejimo rinkinius kalėdinei dovanai ir suplanuokite, kada įteikti rinkinį arba iš anksto pagamintą liejinį.',
 intent:'Išsirinkti tikrą rankų liejimo rinkinį Kalėdų dovanai ir atskirti jo įteikimo, liejimo bei džiovinimo terminus.',
 cluster:'Kalėdinės dovanos',seasonalHook:'Kalėdų dovanų įteikimas ir pasiruošimas',
 body:[
  {type:'paragraph',text:'Po eglute galite padėti rankų liejimo rinkinį, o skulptūros kūrimo laiką gavėjai pasirinks patys. Čia rasite „Memory Casting“ rinkinius porai ir šeimai: dovanojate priemones kūrybai, o ne jau pagamintą liejinį.'},
  {type:'heading',level:2,text:'Ką gavėjas ras po eglute?'},
  {type:'paragraph',text:'Jei norite padovanoti bendrą veiklą, įteikite neatidarytą rinkinį ir pasiūlykite kūrybos laiką pasirinkti drauge. Jei po eglute norite padėti jau baigtą skulptūrą, visą liejimą ir džiovinimą reikės suplanuoti iš anksto. Tai du skirtingi dovanojimo planai.'},
  {type:'heading',level:2,text:'Kurį rinkinį rinktis?'},
  {type:'list',items:['Dviem artimiems žmonėms, norintiems kurti kartu, pirmiausia palyginkite poros rinkinį: jame yra vienas alginato pakelis ir 1 200 g gipso.','Šeimos kompozicijai apsvarstykite šeimos rinkinį: jame yra po du alginato ir gipso pakelius. Rankų dydis ir pasirinkta poza lemia, ar sumanyta kompozicija bus patogi.']},
  {type:'paragraph',text:'Balti dažai įeina į abu rinkinius. Prieš pirkdami peržiūrėkite prekės komplektaciją ir tuo metu galimus pasirinkimus. Jei neaišku, ar jūsų numatyta rankų padėtis tiks, susisiekite su mumis ir apibūdinkite sumanymą.'},
  {type:'heading',level:2,text:'Planuokite nuo įteikimo dienos atgal'},
  {type:'list',items:['Jei dovanosite neatidarytą rinkinį, iki įteikimo turite sulaukti siuntos. Bendrą kūrybą gavėjai gali nusikelti vėlesnei jiems patogiai dienai.','Jei dovanosite pagamintą skulptūrą, iki įteikimo suplanuokite siuntos gavimą, visų dalyvių susitikimą, pasiruošimą, liejimą, gipso stingimą, išėmimą, džiūvimą ir pasirinktą apdailą.','Abiejų rinkinių instrukcijose nurodyta: gipsas formoje stingsta vieną valandą; išimtas liejinys prieš dažant džiovinamas 5–7 paras, kol tampa baltas. Dažymo ir dažų džiūvimo laiką planuokite papildomai pagal naudojamus dažus.']},
  {type:'paragraph',text:'Pavyzdys: jei liejinį išimate gruodžio 17 d. 10 val., septynios džiovinimo paros sueina gruodžio 24 d. 10 val. Tai tik džiovinimo laikotarpio skaičiavimo pavyzdys – jis negarantuoja, kad darbas jau bus tinkamai išdžiūvęs, nudažytas ir paruoštas įteikti. Apdailai ir galimam ilgesniam džiūvimui planuokite papildomo laiko. Poros rinkinio instrukcija ir šeimos rinkinio instrukcija pateikia konkrečius darbo žingsnius.'},
  {type:'heading',level:2,text:'Kaip pasirinkti, jei iki susitikimo liko nedaug laiko?'},
  {type:'paragraph',text:'Jei jau turite neatidarytą rinkinį, galite įteikti jį kartu su kvietimu kurti vėliau. Jei norėtumėte dovanos su jau baigtu liejiniu, tačiau dar nesusitikote ar neišliejote formos, įvertinkite ir liejimo, ir džiūvimo laiką – kelių likusių dienų dažnai neužteks. Pasirinkite kitą dovanos formą, jei nebeturite galimybės ramiai pasiruošti.'},
  {type:'heading',level:2,text:'Prieš užsakydami Kalėdoms'},
  {type:'paragraph',text:'Pristatymo būdą, mokestį ir bendrą sumą matysite krepšelyje. Siuntimo laikas ir liejinio paruošimas yra atskiri etapai. Jei siunta turi atkeliauti iki konkrečios dienos, prieš pirkdami susisiekite ir pasitikslinkite galimybę; įprastas siuntos perdavimo terminas nėra pažadas pristatyti iki šventės.'},
  {type:'paragraph',text:'Jei dar palyginate skirtingus dovanų tipus, kalėdinių dovanų gidas padės išsirinkti pagal žmogų ir biudžetą. Šiame puslapyje pateikiame mūsų pačių rankų liejimo rinkinius.'}
 ]
});
await model.editPage('memocasting',page.id,{links:[
 {targetPageId:bySlug('rinkinys-porai'),label:'poros rinkinį'},
 {targetPageId:bySlug('seimos-rinkinys'),label:'šeimos rinkinį'},
 {targetPageId:bySlug('instrukcijos/poros-rinkiniui'),label:'Poros rinkinio instrukcija'},
 {targetPageId:bySlug('instrukcijos/seimos-rinkiniui'),label:'šeimos rinkinio instrukcija'},
 {targetPageId:bySlug('kontaktai'),label:'susisiekite'},
 {targetPageId:bySlug('gidai/kaledines-dovanos'),label:'kalėdinių dovanų gidas'}
]});

const guide=site.pages.find(p=>p.slug==='gidai/kaledines-dovanos');
const body=structuredClone(guide.body);
const list=body.find(b=>b.type==='list'&&b.items.some(x=>x.includes('medinis skirtukas MANDALA')));
assert.ok(list);
list.items[0]='Iki 10 €: 10 € knygų kuponas. Medinis skirtukas MANDALA 2026 m. lapkričio 9 d. buvo neparduodamas; prieš rinkdamiesi patikrinkite jo prieinamumą.';
list.items[2]='Bendrai veiklai: Codenames Duet patikros dieną kainavo 18,39 €, Memocasting poros rinkinys – 32 €, o dirbtuvės dviem – 50 € akcijos metu.';
const game=body.find(b=>b.type==='paragraph'&&b.text.startsWith('Žodžių žaidimas už 22,99'));
assert.ok(game);game.text='Žodžių žaidimas Codenames Duet patikros dieną kainavo 18,39 € ir gali tikti porai, kuri mėgsta spręsti užduotis. Didesnei kompanijai Just One – Tiktai Vienas tuo metu kainavo 21,59 € ir yra skirtas 3–7 žaidėjams. Akcijos gali keistis. Prieš pirkdami patikrinkite, ar gavėjas jau neturi to paties leidimo.';
const calculation=body.find(b=>b.type==='paragraph'&&b.text.startsWith('Pavyzdžiui, turint 35 € žaidimas'));
assert.ok(calculation);calculation.text='Pavyzdžiui, turint 35 €, žaidimas, kuris patikros dieną kainavo 18,39 €, paliktų 16,61 € pristatymui ir įpakavimui. Poros rinkinys už 32 € paliktų 3 €. Prieš pirkdami palyginkite aktualias krepšelio sumas, o ne vien ankstesnes prekių kainas. Nurodyti likučiai yra pavyzdinis skaičiavimas, ne pristatymo kainos pažadas.';
const sourceText=body.find(b=>b.type==='paragraph'&&b.text.startsWith('Kainas ir aprašus tikrinome'));
assert.ok(sourceText);sourceText.text='Kainas, aprašus ir pasiūlymų būseną tikrinome 2026 m. lapkričio 9 d. pardavėjų puslapiuose. Įtrauktos skirtingos paskirties dovanos; jų patys nebandėme ir neteikiame bandymų įvertinimų. Memocasting yra šios svetainės pardavėjas, todėl mūsų rinkinius aiškiai lyginame ir su kitomis dovanomis. Akcijos, likučiai ir pristatymo kainos gali keistis. Dovanų scenų iliustracijos nerodo konkrečių parduotuvių asortimento ar įsigyjamų modelių; tikrus gaminių vaizdus rasite pasiūlymų nuorodose.';
const christmasLink='Jei nusprendėte dovanoti rankų liejimo rinkinį, peržiūrėkite kalėdinių rankų liejimo dovanų atranką ir planą, kaip atskirti dovanos įteikimą nuo liejinio paruošimo.';
const after=body.findIndex(b=>b.type==='paragraph'&&b.text.startsWith('Kūrybinį rinkinį galite padėti po eglute'));
assert.ok(after>=0);body.splice(after+1,0,{type:'paragraph',text:christmasLink});
assert.equal(guide.externalLinks.length,7);
const externalLinks=guide.externalLinks.map(l=>({...l,verified:true,reason:'2026 m. lapkričio 9 d. peržiūrėtas šio pardavėjo prekės ar paslaugos puslapis. Kaina ir prieinamumas gali keistis.'}));
await model.editPage('memocasting',guide.id,{description:'Kalėdinių dovanų idėjos mamai, vyrui, porai ir šeimai: biudžeto pavyzdžiai, skirtingi pasiūlymai ir pirkimo patikra.',body,externalLinks,links:[...guide.links,{targetPageId:page.id,label:'kalėdinių rankų liejimo dovanų atranką'}]});
const hub=site.pages.find(p=>p.slug==='dovanos');
const hubBody=structuredClone(hub.body);
const seasonal=hubBody.findIndex(b=>b.type==='paragraph'&&b.text.startsWith('Kalėdoms taip pat nuspręskite'));
assert.ok(seasonal>=0);
hubBody.splice(seasonal+1,0,{type:'paragraph',text:'Jei ieškote kūrybinės veiklos šventinei dovanai, palyginkite kalėdinius rankų liejimo rinkinius ir suplanuokite laiką jų įteikimui bei kūrimui.'});
await model.editPage('memocasting',hub.id,{body:hubBody,links:[...hub.links,{targetPageId:page.id,label:'kalėdinius rankų liejimo rinkinius'}]});
const final=await model.getSite('memocasting');
const pages=['dovanos/kaledoms','gidai/kaledines-dovanos','dovanos'].map(slug=>{const p=final.pages.find(x=>x.slug===slug);assert.equal(p.approval,null);return{slug,id:p.id,revisionHash:model.revisionHash(p),media:p.media.length,publishAt:p.publishAt};});
console.log(JSON.stringify({state:'isolated-drafts-no-reviews-or-approvals',studioData:process.env.STUDIO_DATA_DIR,pages}));
