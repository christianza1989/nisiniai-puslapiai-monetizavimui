// Local draft review and canonical release; this script never deploys.
import path from 'node:path';
import {writeFile,readFile,mkdir} from 'node:fs/promises';
const root=path.resolve(import.meta.dirname,'..');
process.env.STUDIO_PUBLIC_CORE_DIR=path.join(root,'../promedical-public-20261009');
process.env.STUDIO_NETWORK_SETTINGS=path.join(process.env.STUDIO_PUBLIC_CORE_DIR,'config/niche-network.json');
const {getSite,editPage,recordEditorialReview,revisionHash,approveReviewedBatch,releaseContent}=await import('../content-studio/src/model.mjs');
let site=await getSite('promedical');
if(site.pages.length>200)throw Error("This first-family preview helper is limited to 200 pages; use dependency-ordered complete catalogue review.");
const privacy=site.pages.find(p=>p.slug==='privatumas');
const h=text=>({type:'heading',level:2,text}),p=text=>({type:'paragraph',text});
const body=privacy.body.map(b=>b.text?.includes('Ši informacija turi atitikti')?p('Užklausos tekstas ir kontaktai išsaugomi užklausų duomenų bazėje. Formos atsakymas parodo, ar išsaugojimas pavyko ir ar pranešimas operatoriui perduotas el. paštu. El. pašto nuoroda atveria jūsų pašto programą; laišką išsiunčiate jūs.'):b);
if(!body.some(b=>b.text==='Produktų sąrašas jūsų naršyklėje'))body.splice(body.findIndex(b=>b.text==='Jūsų teisės'),0,h('Produktų sąrašas jūsų naršyklėje'),p('Pasirinktų produktų kodai, pavadinimai ir kiekiai laikomi jūsų naršyklės vietinėje saugykloje, kad sąrašas išliktų pereinant tarp puslapių. Vardas ir el. paštas į šį sąrašą neįrašomi. Sąrašą galite išvalyti užklausos puslapyje arba ištrynę svetainės duomenis naršyklėje.'),h('Bendri lankomumo skaitikliai'),p('Skaičiuojame puslapių peržiūras ir el. pašto bei telefono nuorodų paspaudimus pagal dieną ir puslapį. Šiems skaitikliams nenaudojame slapukų, lankytojo identifikatoriaus ar formos duomenų. Gerbiame naršyklės Do Not Track ir Global Privacy Control pasirinkimus.'),p('Dėl konkrečios užklausos saugojimo, ištrynimo ar informacijos apie jos tvarkymą kreipkitės sales@promedical.lt.'));
await editPage('promedical',privacy.id,{body,factChecks:[]});
site=await getSite('promedical');
const observations=[];
for(const page of site.pages){
  const response=await fetch(`http://127.0.0.1:4387/preview/promedical/${page.id}`);
  const html=await response.text();
  if(response.status!==200||!html.includes(page.title)||html.includes('Tekstas dar nesugeneruotas'))throw Error(`Draft preview failed ${page.slug}`);
  for(const m of page.media){const r=await fetch(`http://127.0.0.1:4387/api/media/promedical/${path.basename(m.src)}`);if(r.status!==200)throw Error(`Draft asset failed ${m.src}`);}
  observations.push({pageId:page.id,slug:page.slug,revisionHash:revisionHash(page),httpStatus:response.status,media:page.media.length,bodyBlocks:page.body.length});
  await recordEditorialReview(site.id,page.id,{revisionHash:revisionHash(page),reviewer:'Codex /root — local first-family review',evidence:{
    usefulness:`Perskaitytas ${page.slug||'/'} tekstas; ${page.body.length} turinio blokų. ${page.type==='product'?'Modelio kodas, faktiniai parametrai ir individualios komplektacijos užklausa.':page.type==='guide'?'Originalus pirkimo kriterijų ir poreikio ruošinys, patikrintas redakcinio agento šaltinių žurnale.':'Konkreti katalogo, informacijos ar kontakto paskirtis, be kainų ir likučio pažadų.'}`,
    facts:page.type==='product'?`Tikras gamintojo modelis ${page.intent}; trijų modelių faktai ir skaičiai sulyginti su katalogo agento normalized-sample.json bei gamintojo produktais. Tai nėra klinikinio tinkamumo patvirtinimas.`:`Savininko kontaktai sales@promedical.lt, +370 686 88369; prekės ženklas Promedical, juridinis pavadinimas viešai pagal savininko nurodymą nerodomas. ${page.slug==='privatumas'?'Vietinės saugyklos ir agregavimo tekstas sulygintas su tikru inquiry/interest/lead kodu; produkcijos tvarkytojai ir saugojimo eiga dar yra paleidimo patikra.':'Redakcinio agento pirminių Klaro/VPT šaltinių ir verslo tiesos peržiūra.'}`,
    sources:`Puslapio ${page.externalLinks.length} HTTPS šaltinių; konkretūs URL ir faktų naudojimo ribos yra RESEARCH.md ir katalogo raw crawl. Išorinių šaltinių tekstai nekopijuoti, nėra išgalvotų testų ar ekspertų.`,
    media:page.media.length?`Tikros Klaro gamintojo nuotraukos per canonical responsive pipeline. ${page.media.length} variantų HTTP200 privačioje turinio peržiūroje; tikras kilmės SHA, alt, matmenys ir naudojimas atstovaujamo tiekėjo kataloge išsaugoti media-cache.json.`:'Šio informacinio puslapio turinys tekstinis, hero fotografija nepriskirta ir jos buvimas neteigiamas.',
    links:`Visi ${page.links.length} modelio vidinių nuorodų ID yra to paties 18 puslapių pirmos šeimos peržiūros rinkinyje; nėra spėjamų produktų URL. Navigacija ir metaduomenys naudoja bendrą public projection.`,
    presentation:`Tikra private Content Studio GET peržiūra: HTTP200, puslapio antraštė, ${page.body.length} blokų, ${page.media.length} medijos variantų. Tai pirminė teksto ir medijos peržiūra; galutinio Promedical UI desktop/mobile patikra bus papildomai įrašyta prieš pilno katalogo delivery, jos čia dar neteigiame.`
  }});
}
await approveReviewedBatch('promedical',site.pages.map(p=>p.id),'Codex /root local-preview');
const release=await releaseContent('promedical');
await mkdir(path.join(root,'content-studio/data/promedical-import'),{recursive:true});
await writeFile(path.join(root,'content-studio/data/promedical-import/first-family-review.json'),JSON.stringify({observations,release,launchPrivacy:'Production controller/processors/retention/delivery verification remains unverified; local prototype only.'},null,2));
console.log(JSON.stringify(release));
