import fs from 'node:fs/promises';
import path from 'node:path';
const here=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:([A-Z]:))/, '$1'));
const data='C:/Users/Lenovo/.codex/tmp/madbeauty-next30-20261009';
process.env.STUDIO_DATA_DIR=data;process.env.STUDIO_OUTPUT_DIR=data+'/output';
const {getSite,editPage}=await import('file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/model.mjs');
const selection=JSON.parse(await fs.readFile(here+'/SELECTION.json','utf8'));
const fetched=JSON.parse(await fs.readFile(data+'/sources/FETCH.json','utf8'));
const notes={
 S01:'2026-10-09 matytas meniu: manikiūras be lakavimo atskiras nuo manikiūro su geliniu lakavimu; seno lako nuėmimas ir dizainas keičia apimtį. Vieno teikėjo pavyzdys, ne rinkos vidurkis. Nekopijuoti meniu ar klientų atsiliepimų, nesuteikti gydymo ir patvarumo pažadų.',
 S02:'2026-10-09 meniu skiria natūralių nagų stiprinimą ir ilgio priauginimą, dizainą ir esamų/naujų klientų variantus. Priauginimo ilgio ir dizaino pasirinkimai turi skirtingą rezervuojamą laiką. Ne universalus protokolas, ne Lietuvos vidurkis.',
 S03:'2026-10-09: korekcija be dažymo 30 min/10 EUR, korekcija+dažymas 40 min/17 EUR; laminavimas su dažymu ir korekcija 60 min/25 EUR. Galima vieną datuotą iliustracinį meniu pavyzdį, ne kopijuoti viską. Korekcija/formos, dažymas/spalvos, laminavimas/plaukelių krypties užduotys skirtingos.',
 S04:'2026-10-09 meniu: vyriškas kirpimas mašinėle, modelinis su žirklėmis ir kirpimas su plovimu atskiri variantai. Dažymo sruogelėmis apimtis skiriasi pagal plaukų ilgį ir tonavimą; plaukų priežiūros paslaugos atskiras meniu. Maža konsultacijos kaina nėra viso dažymo kaina.',
 S07:'AAD: gelinis lakas kietinamas UV šviesa; LED žodis nėra UV nebuvimo įrodymas. Netraukti/pilnai nenuplėšti dangos. Šiame vartotojo pasirinkimo tekste nekurti universalaus nuėmimo chemijos, laikymo ar gydymo protokolo. Gelinis lakavimas savaime nėra papildomo nago ilgio kūrimas.',
 S08:'AAD: manikiūro/pedikiūro higienos ir nagų kosmetikos ribos. Nerekomenduoti paslėpti pakitusį nagą dirbtine danga. Kosmetinė paslauga nepakeičia sveikatos problemos įvertinimo. Nenaudoti JAV licencijavimo normų kaip Lietuvos teisės.',
 S19:'VVTAT puslapis atnaujintas 2026-07-28: iš pradžių raštu kreiptis į paslaugos teikėją su reikalavimu. Jei per 14 dienų nuo gavimo neatsako arba netenkina reikalavimo, galima kreiptis į VVTAT. Higienos klausimai NVSC. Jokio garantuoto grąžinimo, avanso praradimo universalios taisyklės ar išgalvoto realaus ginčo.',
 S24:'2026-10-09 meniu: laminavimas+korekcija be dažymo 50 min/32 EUR, su dažymu 55 min/35 EUR; blakstienų dažymas 20 min/10 EUR. Naujo priauginimo ir korekcijos variantai skirtingi. Tik atskiro teikėjo datuotas meniu, UV/LED pavadinimai nėra saugumo įrodymas.',
 S30:'NVSC 2024-06-14 publikacija, patikrinta 2026-10-09: grožio paslaugoms reikia leidimo-higienos paso; tikrinti licencijavimas.lt. Kai pažeidžiama oda, sterilios priemonės iš pakuotės atidaromos klientui matant; kitu atveju valomos/dezinfekuojamos. Neteigti, kad Madbeauty patikrino visus meistrus. Individualaus sveikatos tinkamumo nenustatyti.',
 S32:'2026-10-09 meniu: higieninis pedikiūras be lakavimo 75 min/45 EUR, su paprastu lakavimu 90 min/50 EUR, su seno gelio nuėmimu ir nauju lakavimu iki 120 min/60 EUR. Tik datuotas vieno teikėjo paslaugų apimties pavyzdys, jokių medicininio pedikiūro/gydymo instrukcijų.',
 S33:'2026-10-09 meniu: tonavimas atskiras nuo visų plaukų dažymo, papildomas kirpimas keičia bendrą vizitą. Pasiūlymai priklauso ir nuo konkretaus meistro; ne universalios kainos ar trukmės. Neišgalvoti techninių dažų receptų ir garantuoto vieno vizito rezultato.',
 S34:'2026-10-09 meniu: papildomas intensyvus drėkinimas dažymo/kirpimo metu 15 min/25 EUR; Airtouch pagal apimtį 5–6 val/220–280 EUR. Vyrų kirpimas ir barzdos modeliavimas kombinuotas variantas. Trumpa papildoma paslauga nelygi savarankiškai pilnai procedūrai; reklamos pavadinimai ne gydymo įrodymai.',
 S35:'2026-10-09 meniu: antakių korekcija+dažymas 40 min/20 EUR, su blakstienų dažymu 50 min/26 EUR. Blakstienų/antakių laminavimo ir priauginimo deriniai rezervuoja kitą laiką. Vieno teikėjo pavyzdys, ne ekspertinė peržiūra ar vidurkis.',
 S36:'Nouveau LVL gamintojo puslapis skiria natūralių blakstienų pakėlimą ir priauginimą. Šioje sistemoje nurodyta pirma 24 val nešlapinti, dvi dienas vengti garų/pirties/plaukimo; tai tik LVL sistemos taisyklės, ne visų laminavimų universalus grafikas. Nenaudoti rinkodaros iki 8 savaičių kaip visiems garantuojamos trukmės.',
 S42:'Wella puslapyje highlights, pilnas šviesinimas+tonavimas, palaipsnis balayage pateikiami kaip skirtingi spalvos tikslai/technikos. Gamintojo reklama ne nepriklausomas nekenksmingumo įrodymas. Nekurti dažų formulių, oksidantų, veikimo laiko ar savarankiško šviesinimo instrukcijų.',
 S51:'AAD: vaškas šalina plaukelį nuo šaknies, skutimas trumpina ties paviršiumi; vaško karštis nėra dezinfekcija, pakartotinai nenaudoti į vašką merkiamo aplikatoriaus. Nėra neskausmingumo pažado. Nekurti individualių vaistų nutraukimo ar kontraindikacijų grafiko. Zonos ir ribos susitariamos su teikėju.',
 S54:'FDA: ne visi glotninimo produktai turi formaldehido; svarbi konkreti sudėtis ir sistemos dokumentacija. Keratino ar botox rinkodaros pavadinimas ne saugumo/gydymo įrodymas. Tai JAV vartotojų šaltinis, ne Lietuvos teisinis reguliavimas. Ne namų procedūros, ne temperatūrų/cheminių receptų instrukcijos.',
 S55:'2026-10-09 meniu skiria vašką ir cukrų, blauzdas/šlaunis/visas kojas bei klasikinio bikini ribą. Blauzdų depiliacija vašku 45 min/25 EUR, visų kojų 60 min/40 EUR. Akivaizdžiai nepatikimą rankų cukrumi 2 EUR įrašą atmesti ir neplatinti. Ne rinkos vidurkis, ne Madbeauty pasiūlymas.',
 S56:'2026-10-09 perskaitytame meniu barzdos kirpimas/modeliavimas ir formavimas mašinėle/skustuvu turi skirtingus variantus. Nėra matomos kainos; puslapyje seni atsiliepimai, todėl kainų/gyvo prieinamumo neįrodinėja. Galima paaiškinti tik paslaugų pavadinimų/apimties skirtumą.'
};
const sceneData=[
 ['Eye-level close portrait','Natural thick eyebrows, adult woman with dark wavy hair, pale blue wall, side window light','Natūralūs antakiai stambiame portreto kadre'],
 ['Extreme macro profile','One closed eye and long natural lashes, freckled adult face, dark plum background, soft rim lighting','Blakstienos iš arti užmerktos akies profilyje'],
 ['Wide candid room','Middle-aged man and female barber discussing haircut in brick industrial barbershop, full body seated, cool morning light','Vyras aptaria kirpimą su kirpėja'],
 ['Overhead tool still life','Amber wax pot unplugged, clean disposable sticks and white towel on turquoise trolley, no person, graphic diagonal arrangement','Depiliacijos priemonės ant darbo vežimėlio'],
 ['Back-of-head portrait','Shoulder-length dimensional chestnut hair with subtle caramel highlights, emerald wall, afternoon backlight','Dažytų plaukų spalvos perėjimai'],
 ['Side macro hand','Short glossy cherry-red nails, mature hand holding dark blue ceramic mug, charcoal background, low camera angle','Trumpi vyšninės spalvos geliniu laku padengti nagai'],
 ['Medium interaction','Two adult women discussing nail shape across manicure desk, bright white and cobalt salon, neither doing treatment','Manikiūro konsultacija prie darbo stalo'],
 ['Sculptural macro','Long almond-shaped lavender artificial nails on one anatomically correct hand, black velvet surface, diagonal hard-soft studio light','Ilgi migdolo formos nagai'],
 ['Wide seated detail','Bare adult feet on clean pedicure footrest, trousers hem and aqua tiled room visible, natural nails, no sharp tools','Pėdos ant pedikiūro atramos'],
 ['Environmental hair portrait','Adult person with voluminous curly hair in cream sweater by leafy salon window, warm sunlight, three-quarter rear view','Garbanotų plaukų tekstūra natūralioje šviesoje'],
 ['Side-view editorial desk','Anonymous adult sorting plain receipt and handwritten notes beside phone screen off, dark walnut desk, stormy window light','Vizito dokumentai ir užrašai ant stalo'],
 ['Wide workspace planning','Salon proprietor standing at magnetic planning board of blank colored blocks, clock to side, airy green room, wide lens','Grožio salono darbo laiko planavimas'],
 ['Over-shoulder documentary','Professional counting anonymous tally marks in notebook beside closed laptop, orange wall and navy clothing, no readable digital dashboard','Užklausų skaičiavimo užrašai'],
 ['Low-angle room detail','Owner arranging plain service cards on shelf in small violet and white salon reception, hands and torso visible, soft evening light','Paslaugų meniu kortelių ruošimas'],
 ['Tight horizontal desk crop','Two adult hands comparing unmarked booking terms papers and calendar blocks on red tabletop, phone off, no words/numbers','Vizito sąlygų ir kalendoriaus peržiūra'],
 ['Architecture-wide photograph','Empty clean beauty workstation with sink and neatly wrapped instruments, pale green tile and bright daylight, honest nonclinical salon','Tvarkinga grožio paslaugų darbo vieta'],
 ['Three-quarter face portrait','Adult woman with silver short hair and softly shaped eyebrows looks at hand mirror, deep burgundy wall, bounced warm light','Antakių forma apžiūrima veidrodėlyje'],
 ['Flat-lay lash accessories','Closed unbranded lash cases, clean spoolies and plain appointment card, mustard yellow surface, angular shadows, no price text','Blakstienų paslaugų priemonės'],
 ['Medium two-person portrait','Bearded man with dark skin consulting male barber beside tall mirror, bright teal and wood room, standing eye level','Vyrų paslaugų konsultacija salone'],
 ['Cropped consultation detail','Fully clothed adult pointing to lower leg over trousers while salon professional gestures, private bright lilac room, side framing','Depiliacijos zonos aptarimas prieš vizitą'],
 ['High-angle salon scene','Colorist showing unbranded hair swatch ring to seated short-haired adult, apricot wall, natural daylight, no active chemicals','Plaukų atspalvių paletės aptarimas'],
 ['Top-down nail palette','One hand with short navy gel nails choosing colored sample tips on mint surface, playful scattered palette, sharp natural light','Gelinio lakavimo spalvų pasirinkimas'],
 ['Diptych-free medium hands','Two distinct adult hands together, one natural short nail finish and other muted sage gloss, striped blue shirt, single real scene','Natūralūs ir spalvotu laku padengti nagai'],
 ['Extreme nail art macro','Short warm ivory nails with one small metallic copper accent, darker skin hand, coral background, asymmetric diagonal detail','Minimalus vario spalvos akcentas nagų dizaine'],
 ['Side silhouette closeup','Long square-shaped translucent pink nails resting along frosted glass, violet dawn light, side profile anatomical hand','Priaugintų nagų ilgis ir forma iš šono'],
 ['Natural lifestyle ankle view','Unpolished toenails and adult feet resting on textured navy linen, soft morning daylight, no spa cliché flowers','Natūralūs pėdų nagai be lakavimo'],
 ['Wide haircare still life','Unbranded pump bottles and bowl on terracotta salon shelf with hairbrush and towel, directional sunlight, no logos/text','Plaukų priežiūros priemonės salone'],
 ['Asymmetric facial detail','Close half-face adult with light eyebrows and auburn hair, olive green background, eyebrow and freckles in focus','Šviesių antakių forma ir spalva'],
 ['Low-key eye portrait','Adult woman with brown skin and natural eyelashes looking sideways, burgundy fabric backdrop, cinematic soft side light, no applied tools','Blakstienų ir akių profilis'],
 ['Outdoor beard profile','Silver-haired adult man with neatly shaped beard in dark green jacket, stone wall outdoors, cool diffuse sky light, strong side profile','Barzdos forma šoniniame portrete']
];
const site=await getSite('madbeauty');const author=site.pages.find(p=>p.editorial.authors.length).editorial.authors;
const ledger=Object.entries(notes).map(([id,note])=>({...fetched.find(s=>s.id===id),review:'READ_FOR_BOUNDED_CLAIMS',reviewedAt:new Date().toISOString(),note}));
await fs.writeFile(here+'/SOURCE-NOTES.json',JSON.stringify(ledger,null,2)+'\n');
const media=[];
for(let i=0;i<selection.pages.length;i++){
 const item=selection.pages[i],page=site.pages.find(p=>p.id===item.pageId);
 const sourceIds=[...new Set(item.brief.sourceIds.filter(id=>notes[id]))];
 if(!sourceIds.length)sourceIds.push('S19','S30');
 const sources=sourceIds.map(id=>{const s=fetched.find(x=>x.id===id);return {id,title:s.title,publisher:new URL(s.url).hostname,url:s.url,accessedAt:s.retrievedAt,public:true};});
 await editPage('madbeauty',page.id,{editorial:{...page.editorial,authors:author,category:item.brief.cluster,datePublished:item.publishAt,dateModified:item.publishAt,sources},externalLinks:sources.map(s=>({url:s.url,label:s.title,reason:notes[s.id],verified:true}))});
 const [composition,scene,alt]=sceneData[i];const prompt=`Create one photorealistic original editorial photograph for a Lithuanian beauty guide: ${item.title}. Scene: ${scene}. Composition: ${composition}. Landscape 3:2 framing. Natural skin/hair texture, authentic professional surroundings, restrained editorial photography. This is a fictional illustration, not an actual salon testimonial or before/after result. No text, logos, watermarks, price claims, medical promises, collages, repeated panels, excessive smoothing, extra fingers, unsafe tools near eyes, or intimate nudity. Deliberately follow this exact distinct setting and camera angle, not a generic beige spa flat lay. Save the output as an image.`;
 media.push({index:i+1,pageId:item.pageId,planId:item.planId,composition,scene,alt,prompt,status:'NOT_GENERATED'});
}
try{await fs.access(here+'/MEDIA-PLAN.json');}catch{await fs.writeFile(here+'/MEDIA-PLAN.json',JSON.stringify(media,null,2)+'\n');}
console.log(JSON.stringify({preparedMetadata:selection.pages.length,readSources:ledger.length,mediaScenes:media.length}));
