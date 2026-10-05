// Original, source-reviewed phase-one demand pilot; approval is agent editorial review.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {getSite,editSite,addPage,editPage,approvePage,saveResponsiveAsset,exportPackage} from '../src/model.mjs';
const id='laiptucentras';
const base='C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/laiptucentras';
throw new Error('Historical first-run bootstrap is retired after root v2 acceptance. Use current DESIGN.md, studio edits and shared MEDIA_CORE import; do not overwrite the active approved content or regenerate old assets. Original source remains in FIRST-RUN/source.');
const original=await getSite(id);
await mkdir(`${base}/snapshots`,{recursive:true});
await writeFile(`${base}/snapshots/planning-before-build.json`,JSON.stringify(original,null,2));
const manifest=JSON.parse(await readFile(`${base}/MEDIA.json`,'utf8'));
const alts={hero:'Iliustraciniai vidaus laiptai su ąžuolo pakopomis ir tamsiu metaliniu karkasu',budget:'Laiptų pakopos pavyzdys, metalinė detalė ir sąmatos paruošimo priemonės',materials:'Ąžuolo pakopos, tamsaus metalo ir betono medžiagų palyginimo iliustracija',measure:'Neįrengta laiptų anga, grindų lygiai ir matavimo priemonės'};
const media={};
for(const item of manifest){
 const previous=(await getSite(id)).assets.find(a=>a.alt===alts[item.key]);
 media[item.key]=previous??await saveResponsiveAsset(id,{mime:'image/png',alt:alts[item.key],rights:'Originali šiam projektui sukurta AI iliustracija, 2026-10-01. Ne klientų darbas ar parduodamas gaminys.',credit:'',prompt:item.prompt},await readFile(item.destination));
}
await editSite(id,{name:'Laiptų centras',offer:'Vidaus laiptų įrengimo poreikio registracija ir pasiruošimo užklausai gidai',audience:'Individualių namų savininkai Lietuvoje, planuojantys vidaus laiptus arba pakopas ant betono.',facts:'MB Pinet ir info@pinet.lt savininko patvirtinti 2026-09-30. Tai naujas Phase 1 poreikio pilotas; nėra gamybos pajėgumo, tiekėjų/partnerių sutarčių, mūsų laiptų kainų, matavimo/atvykimo ar pasiūlymo garantijos. Domeno nuosavybė, DNS, production hostingas, duomenų saugojimo/pristatymo ir teisinės sąlygos dar nepatvirtintos. Originalios AI iliustracijos nėra klientų darbai. Verslo hipotezė – teikėjo mokestis už priimtą kvalifikuotą užklausą; pajamos/paklausa neišmatuotos. Telefonas, adresas ir įmonės kodas nepateikti.',contact:{email:'info@pinet.lt',phone:''},brand:{accent:'#293e34'},stage:'ready'});
const p=text=>({type:'paragraph',text}),h=text=>({type:'heading',level:2,text}),ul=(...items)=>({type:'list',items});
const source=(url,label,reason)=>({url,label,reason:`Patikrinta 2026-10-01. ${reason}`,verified:true});
const roberto=source('https://robertolaiptai.lt/laiptu-gamyba/','Roberto laiptų gamybos procesas','Gamintojo aprašyta individualaus matavimo, konstrukcijos, pakopų ir montavimo darbų apimtis; tai jų paslauga, ne mūsų partnerystė.');
const style=source('https://stylestairs.uk/bespoke-staircase-cost-breakdown-2026/','Style Stairs sąmatos sandara','Britų gamintojas atskiria konstrukciją, pakopas, turėklus, projektą ir montavimą. Jo kainos ir britiškos normos Lietuvai netaikomos.');
const stadler=source('https://www.stadler.de/treppen/','Stadler konstrukcijų ir medžiagų pasirinkimas','Vokietijos gamintojas atskirai pristato konstrukcijas, pakopas bei turėklus ir galutinį pasiūlymą sieja su konkrečiu projektu.');
const hoeping=source('https://www.hoeping.de/treppenrenovierung/fragen-antworten.html','Höping apie laiptų renovaciją','Renovacijos tiekėjas paaiškina individualių sąlygų ir skirtingų apdailos medžiagų svarbą; konkretaus mūsų objekto tinkamumo nepatvirtina.');
const privacy=source('https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en','Europos duomenų apsaugos valdybos paaiškinimas','Oficiali informacija apie asmenų teises, prieigą prie duomenų, taisymą ir ištrynimą; galutinės piloto produkcinės sąlygos tikrinamos atskirai.');
const specs=[
{slug:'',type:'home',title:'Laiptai prasideda nuo gero plano.',description:'Vidaus laiptų pasirinkimas: konstrukcija, pakopos, darbų apimtis ir pasiruošimas užklausai. Gidai ir skaidri poreikio registracija.',intent:'Kaip pasiruošti individualių vidaus laiptų įrengimui?',images:['hero','materials'],body:[
p('Konstrukcija, pakopos, turėklai. Sudėkite juos į vieną aiškų planą – prieš lygindami kainas ir rinkdamiesi, kas įrengs jūsų laiptus.'),
p('Šiuo metu registruojame vidaus laiptų įrengimo poreikį. Gamybos partnerystės dar nesudarytos: registracija nėra užsakymas ir negarantuoja pasiūlymo ar meistro atvykimo.'),
h('Kokio darbo reikia jūsų namams?'),
ul('Nauji vidaus laiptai – kai reikia suderinti konstrukciją, pakopas, turėklus ir montavimą.','Pakopos ant betono – kai konstrukcija jau yra, o reikia suplanuoti medinę apdailą ir turėklus.','Keičiami laiptai – kai pirmiausia būtina įvertinti esamos konstrukcijos būklę ir keitimo apimtį.'),
h('Mediena matoma. Konstrukcija lemia sprendimą.'),
p('Ąžuolinė pakopa gali būti ant medžio, metalo ar betono. Todėl pirmiausia verta suprasti, kas jau yra jūsų objekte ir ką reikės įrengti. Konstrukcijų pasirinkimo gidas padeda atskirti pagrindą nuo apdailos.'),
h('Trys klausimai prieš pirmą pokalbį'),
ul('Ką įrengsime? Atskirkite visus naujus laiptus nuo vien pakopų ar turėklų.','Kokia erdvė? Užrašykite angos ir grindų informaciją, turėkite planą.','Kas įeina į kainą? Lyginkite vienodą darbų apimtį, įskaitant matavimus ir montavimą.'),
h('Papasakokite apie planuojamus laiptus'),
p('Nurodykite darbo rūšį, vietovę ir planavimo etapą. MB Pinet naudos šiuos duomenis poreikiui įvertinti ir susisiekti su jumis. Gamintojams automatiškai jų neperduodame.'),
]},
{slug:'gidai',type:'service',title:'Gidai prieš užsakant laiptus',description:'Trys skirtingi sprendimai: kaip palyginti laiptų kainą, išsirinkti konstrukciją ir surinkti informaciją prieš matavimą.',intent:'Kur rasti naudingus vidaus laiptų užsakymo pasiruošimo atsakymus?',images:['budget','materials','measure'],body:[
p('Pradėkite nuo klausimo, kuris šiuo metu stabdo sprendimą. Gidai padeda susitarti dėl apimties ir pasiruošti pokalbiui su gamintoju; jie nepakeičia objekto matavimo ar konstrukcijos projekto.'),
p('Jeigu jau turite sąmatą, rinkitės kainos palyginimą. Jei konstrukcija dar neaiški – konstrukcijų pasirinkimą. Prieš siunčiant planą ar užklausą pravers matavimo pasiruošimas.'),
]},
{slug:'vidaus-laiptu-irengimas',type:'service',title:'Vidaus laiptų įrengimo poreikio registracija',description:'Aprašykite naujų laiptų, pakopų ant betono ar keičiamų laiptų poreikį. Išankstinė registracija be gamybos ir pasiūlymo garantijos.',intent:'Kaip užregistruoti konkretų planuojamų vidaus laiptų darbą?',images:['hero'],body:[
p('Jei planuojate vidaus laiptus individualiame name, galite užregistruoti poreikį. Šis projektas kol kas tiria, kokių darbų žmonės ieško; MB Pinet nėra patvirtinusi laiptų gamybos ar montavimo partnerių. Dabar nesuteikiame laiptų kainos pasiūlymo, neatvykstame matuoti ir nepriimame užsakymų.'),
h('Kokius poreikius registruojame'),
ul('Nauji vidaus mediniai arba medžio ir metalo laiptai.','Medinės pakopos ir turėklai ant jau esančios betoninės konstrukcijos.','Esamų vidaus laiptų keitimas, kai norite aiškiau apsibrėžti darbų apimtį.'),
h('Ką parašyti'),
p('Pakanka darbo rūšies, miesto ar rajono, dabartinio įrengimo etapo ir pageidaujamo laikotarpio. Jei matmenų dar neturite, taip ir parašykite. Tikslus adresas, asmens kodas ir šeimos duomenys pirmai registracijai nereikalingi. Nuotraukų įkėlimo formoje nėra; jei norite jas pateikti, naudokite svetainės el. paštą ir nesiųskite jautrių dokumentų.'),
h('Kas vyksta po registracijos'),
p('Poreikio įrašas priimamas tada, kai jį pavyksta išsaugoti. Operatorius gali susisiekti jūsų nurodytu el. paštu dėl šio poreikio patikslinimo; konkretaus atsakymo laiko nežadame. Gamintojams kontaktų automatiškai neperduodame. Jei ateityje atsirastų tinkamas vykdytojas, perdavimą atskirai suderintume su jumis.'),
h('Kada reikia kito kelio'),
p('Jei laiptai kliba, turėklai nestabilūs ar pastebite konstrukcijos pažeidimą, pirmiausia kreipkitės į kompetentingą vietinį specialistą. Ši forma netinka avariniam remontui, konstrukcijos saugumo patvirtinimui, komercinių pastatų ar evakuacijos laiptų projektavimui. Skubų darbą derinkite tiesiogiai su realiai pajėgiu vykdytoju.'),
]},
{slug:'laiptu-kaina',type:'guide',title:'Laiptų kaina: kaip palyginti sąmatas',description:'Karkasas ar visas įrengimas? Praktinis sąmatos apimties sąrašas ir pavyzdys, padedantis palyginti vidaus laiptų pasiūlymus.',intent:'Kaip palyginti skirtingas vidaus laiptų sąmatas ir nepraleisti išlaidų?',images:['budget'],sources:[style,roberto],body:[
p('Laiptų kainą lyginkite pagal vienodą darbų apimtį. Karkaso įkainis, medinių pakopų komplektas ir visi sumontuoti laiptai atsako į skirtingus klausimus. Prieš rinkdamiesi pigesnį pasiūlymą paprašykite atskirti konstrukciją, pakopas, turėklus, matavimą ir montavimą. Vieno patikimo universalaus įkainio visiems namams nėra.'),
h('Pirmiausia apibrėžkite, ką perkate'),
p('Naujai laiptinei gali reikėti visos konstrukcijos, o ant esančio betono – tik apdailos bei turėklų. Keičiamuose laiptuose atsiranda ardymo, išnešimo ir aplinkinių paviršių sutvarkymo klausimų. Net vienoda laiptų nuotrauka nereiškia vienodos darbų apimties: viename objekte atramos paruoštos, kitame dar reikės atskiro konstrukcinio sprendimo.'),
p('Užklausoje aiškiai parašykite, kas objekte jau padaryta ir už ką norite, kad atsakytų tiekėjas. Venkite vien frazės „kiek kainuoja ąžuoliniai laiptai“: ji nepasako, ar kalbate apie pakopas ant betono, medinę konstrukciją, ar metalinį karkasą su medine apdaila.'),
h('Sąmatos eilutės, kurias verta sulyginti'),
ul('Matavimas ir projektas: kas tikrina galutinius matmenis, kokie brėžiniai pateikiami ir ar projektavimo kaina įtraukta.','Konstrukcija: tipas, medžiaga, paviršiaus paruošimas, tvirtinimai ir darbas objekte.','Pakopos: jų skaičius, matmenys, mediena, apdaila; ar įtrauktos vertikalios dalys tarp pakopų.','Turėklai ir porankiai: laiptų kraštas ir viršutinės aikštelės aptvėrimas; matavimo vienetas ir visas kiekis.','Pristatymas ir montavimas: kelionė į objektą, privažiavimo sąlygos, kėlimas bei etapų skaičius.','Papildomi darbai: esamų laiptų ardymas, atliekos, sienų ar grindų sutvarkymas, apsauga nuo kitų apdailos darbų.','Mokesčiai ir sąlygos: ar suma galutinė su taikomu PVM, apmokėjimo etapai, pakeitimų tvarka ir pasiūlymo galiojimas.'),
h('Kodėl vienas „nuo“ skaičius nepakankamas'),
p('„Nuo“ suma gali apimti paprastesnę formą ar tik vieną komponentą. Paklauskite, kokią konkrečią komplektaciją ji aprašo. Sukantys laiptai, aikštelė, papildomi turėklai ir sudėtingas tvirtinimas gali keisti apimtį; galutinį sprendimą nustato tiekėjo projektas ir objekto patikra. „Nebrangūs“ ir „premium“ nėra techninės specifikacijos.'),
p('Style Stairs sąmatos sandara rodo, kodėl naudinga atskirti konstrukciją, pakopas, turėklus ir specialistų darbą. Tai britų gamintojo pavyzdys: jo piniginiai įkainiai, mokesčiai ir statybos normos Lietuvai neperkeliami. Čia pateikiame palyginimo metodą, o ne mūsų laiptų kainyną.'),
h('Pavyzdys: dvi sumos, dvi skirtingos apimtys'),
p('Iliustracinė situacija be išgalvotų kainų: A pasiūlymas apima metalinį karkasą ir jo montavimą. B pasiūlymas apima karkasą, medines pakopas, laiptų turėklus ir montavimą, tačiau ne viršutinės aikštelės aptvėrimą. Mažesnė A suma dar neparodo, kuris pilnas sprendimas pigesnis. Paprašykite A papildyti trūkstamas dalis, o B – aiškiai įvardyti aikštelės darbus. Tada sulyginkite medžiagas, apdailą ir atsakomybes.'),
p('Jei abu pasiūlymai žada medines pakopas, dar patikrinkite medienos rūšį, pakopos sudėtį, krašto profilį ir apdailą. Neturėdami vienodo aprašymo negalite nuspręsti, ar kainos skirtumą lemia darbas, medžiaga, ar praleista eilutė.'),
h('Klausimai prieš patvirtinant pasiūlymą'),
ul('Kas patvirtins galutinius objekto matmenis ir prisiims atsakomybę už projektą?','Kokie paruošiamieji darbai turi būti baigti iki matavimo ir iki montavimo?','Kuriuos darbus atliks tas pats tiekėjas, o kuriems reikės kito specialisto?','Kaip dokumentuojami medžiagų, apimties ar termino pakeitimai?','Kokios rašytinės garantijos ir priežiūros sąlygos taikomos būtent šiai komplektacijai?'),
p('Roberto laiptų gamybos procesas iliustruoja atskirus matavimo, projektavimo ir montavimo etapus. Mūsų projektas šių darbų šiuo metu neatlieka. Jei dar tik ruošiatės pokalbiui, matavimo pasiruošimo gidas padės aprašyti situaciją. Jei norite užregistruoti įrengimo poreikį, nurodykite darbą, vietovę ir laikotarpį.'),
]},
{slug:'laiptu-konstrukcijos',type:'guide',title:'Medis, metalas ar betonas: ką iš tiesų renkatės?',description:'Atskirkite laiptų konstrukciją nuo pakopų apdailos. Pasirinkimo kriterijai naujai laiptinei, esančiam betonui ir keičiamiems laiptams.',intent:'Kuo skiriasi vidaus laiptų konstrukcijos ir kaip apsibrėžti savo pasirinkimą?',images:['materials'],sources:[roberto,stadler,hoeping],body:[
p('Mediena, metalas ir betonas nebūtinai yra trys konkuruojantys laiptų vaizdai. Vieni laiptai gali turėti metalinį karkasą ir medines pakopas, kiti – medinę apdailą ant betono. Pirmas klausimas: kokia laikančioji konstrukcija jau yra arba bus jūsų name? Tik tada verta rinktis pakopos paviršių ir turėklų išvaizdą.'),
h('Konstrukcija, pakopa ir turėklas – atskiri sprendimai'),
p('Konstrukcija perduoda apkrovas į pastatą. Pakopa yra paviršius, ant kurio žengiate, o turėklas bei porankis sprendžia apsaugą ir atsirėmimą. Visos dalys turi būti suderintos viename projekte. Medžiagos pavadinimas ar graži nuotrauka nepatvirtina tvirtinimo, konstrukcijos laikomosios galios arba konkretaus objekto saugumo.'),
p('Užklausoje aprašykite šias dalis atskirai. Pavyzdžiui: „betoniniai laiptai jau išlieti; reikia medinių pakopų ir laiptų bei aikštelės turėklų“. Tai aiškesnė užduotis nei „reikia medinių laiptų“. Tokį komponentų atskyrimą galima matyti ir gamintojų pasiūloje: Roberto laiptų gamybos procesas skiria pakopas ant betono nuo kitų konstrukcijų.'),
h('Kai laiptai statomi naujai'),
p('Jeigu laikančiosios konstrukcijos dar nėra, su projektuotoju išsiaiškinkite angą, atramas, planuojamą judėjimo kelią ir tvirtinimo galimybes. Paprašykite gamintojo parodyti, kuri detalė sudaro karkasą ir ką reikia paruošti pastate. Metalinis karkasas savaime nereiškia atvirų pakopų: išvaizdą lemia visa komplektacija. Medinė konstrukcija taip pat gali turėti skirtingas sijas, uždaras dalis ir apdailą.'),
p('Nepradėkite nuo taisyklės „mažai erdvei visada spiraliniai“. Laiptų forma turi tilpti į konkretų planą ir atitikti naudojimą. Pagalvokite apie kasdienį ėjimą, vaikų ir vyresnių žmonių poreikius bei baldų pernešimą. Čia nenurodome universalių pakopos matmenų, apkrovų ar turėklų specifikacijų: jas parenka ir patvirtina atsakingas specialistas pagal konkretų objektą.'),
h('Kai betonas jau yra'),
p('Betoninė konstrukcija gali tapti pagrindu medinėms pakopoms, tačiau prieš užsakymą reikia patikrinti jos būklę, geometriją ir galutinių grindų lygius. Apdaila keičia matomą bei naudojamą paviršių. Todėl pirmos ir paskutinės pakopos santykis su grindimis turi būti vertinamas kartu su visa laiptų apdaila, o ne tik pagal vienos pakopos storį.'),
ul('Užrašykite, ar grindų danga apačioje ir viršuje jau įrengta.','Nurodykite, ar norite uždengti tik horizontalius paviršius, ar ir vertikalias dalis bei kraštus.','Aptarkite turėklų tvirtinimą ir aikštelės aptvėrimą prieš galutinę apdailą.','Gamintojui parodykite netolygumus ar pažeidimus; nuotrauka yra pirminė informacija, ne būklės patvirtinimas.'),
h('Kai senus laiptus norisi atnaujinti'),
p('Pirmiausia atskirkite nusidėvėjusią apdailą nuo konstrukcinės problemos. Įbrėžimas pakopos paviršiuje ir klibanti sija reikalauja skirtingo vertinimo. Naujai uždengtas paviršius nepatvirtina seno pagrindo saugumo. Höping apie laiptų renovaciją aptaria skirtingas apdailos medžiagas ir individualias sąlygas, tačiau konkretus mūsų namas turi būti įvertintas vietoje.'),
p('Jeigu norite keisti laiptų formą, patikrinkite, ar reikės keisti angą, atramas ar aplinkinius paviršius. Jei reikia tik apdailos, paprašykite aiškiai įvardyti, kas iš esamos konstrukcijos bus palikta ir kas patikrinta. Seni laiptai nėra automatiškai tinkamas naujų pakopų pagrindas.'),
h('Medžiagos pavyzdį vertinkite savo aplinkoje'),
p('Paklauskite apie pakopos apdailą, leidžiamą valymą, priežiūrą ir vietinio paviršiaus atnaujinimo galimybę. Atspalvio pavyzdį verta lyginti su grindimis ir apšvietimu jūsų namuose. Vien medienos rūšis neatsako, kaip atrodys galutinė apdaila; lyginkite konkretų pavyzdį ir tiekėjo aprašą. Tylumo ar priežiūros paprastumo nežadame pagal vien medžiagos pavadinimą.'),
h('Trumpa pasirinkimo užduotis'),
ul('Jei pagrindo nėra – pirmiausia apibrėžkite visą konstrukciją ir atramas.','Jei betonas yra – atskirkite jo būklės patikrą nuo naujos apdailos.','Jei keičiate senus laiptus – įtraukite išmontavimą ir aplinkinių paviršių klausimus.','Visais atvejais – aprašykite pakopas, turėklus, aikštelę ir montavimą kaip vieną suderintą apimtį.'),
p('Stadler konstrukcijų ir medžiagų pasirinkimas yra užsienio gamintojo pavyzdys, kaip šias dalis galima atskirti. Norėdami palyginti komplektacijų kainą, skaitykite sąmatos palyginimo gidą. Mūsų iliustracijos padeda suprasti medžiagų skirtumą ir nerodo parduodamų gaminių ar atliktų klientų darbų.'),
]},
{slug:'laiptu-matavimas',type:'guide',title:'Ką paruošti prieš laiptų matavimą',description:'Grindų lygiai, anga, planas, nuotraukos ir įrengimo etapas. Praktinis informacijos sąrašas pirmai laiptų užklausai.',intent:'Kokią informaciją surinkti prieš laiptų gamintojo matavimą ir pirmą užklausą?',images:['measure'],sources:[roberto,stadler],body:[
p('Pirmai laiptų užklausai paruoškite vietovę, darbų apimtį, įrengimo etapą, turimą planą ir informaciją apie būsimus grindų lygius. Pirminiai jūsų matmenys padeda paaiškinti situaciją, tačiau nepakeičia gamintojo matavimo ir suderinto projekto. Tikslumo, tinkamumo ar saugumo negalima patvirtinti vien internetu.'),
h('Pradėkite nuo objekto etapo'),
p('Parašykite, ar namas dar projektuojamas, yra neįrengta anga, jau išlieti betoniniai laiptai, ar keičiate naudojamus laiptus. Skirtingais etapais žinoma skirtinga informacija. Jei grindys dar neįrengtos, svarbu neapsimesti, kad šiuo metu matomas betono paviršius jau yra galutinis grindų lygis.'),
p('Nurodykite, kuriuos aukštus laiptai jungs ir kaip šia erdve bus naudojamasi. Aprašykite, ar laiptai bus vienintelis kasdienis kelias į viršų, ar reikės pernešti didelius baldus. Vardyti šeimos narių asmeninių duomenų nereikia; pakanka bendro naudojimo poreikio.'),
h('Matmenys: kas turi būti aiškiai įvardyta'),
ul('Aukštų santykis: atskirkite dabartinius paviršius nuo planuojamų galutinių grindų. Jei apdailos sluoksniai dar neparinkti, pažymėkite nežinomybę.','Laiptinės anga: turimo plano matmenys, forma ir vieta; įvardykite, iš kurio dokumento ar matavimo jie paimti.','Aplink anga esanti erdvė: durys, langai, sienos ir vieta laiptų pradžiai bei pabaigai.','Esamos konstrukcijos: betonas, sijos ar atramos ir matomi pažeidimai. Paslėptos konstrukcijos nevertinamos pagal nuotrauką.','Grindų ir lubų darbai: kas jau baigta, kas planuojama ir kas dar gali pakeisti laiptų projektą.'),
p('Šis sąrašas skirtas informacijai surinkti, ne savarankiškai apskaičiuoti laiptų geometriją. Nenaudokite bendros internetinės formulės kaip patvirtinto konstrukcijos projekto. Angos keitimas, tvirtinimas ir laikančiosios dalys turi būti derinami su už objektą atsakingais specialistais.'),
h('Kaip paruošti planą ir nuotraukas'),
p('Jei turite aktualų aukšto planą, pažymėkite laiptinės vietą ir nurodykite dokumento versiją. Nesiųskite visos namo dokumentacijos, kai pakanka vienos susijusios ištraukos. Uždenkite asmeninius duomenis, adresus ar kitus pokalbiui nereikalingus įrašus. Planas yra pirminė informacija: tiekėjas dar turi patikrinti jo atitikimą realiam objektui.'),
ul('Bendras laiptinės vaizdas padeda suprasti erdvę ir įėjimo kryptį.','Vaizdas iš apačios ir viršaus padeda susieti angą su aplinkinėmis durimis ir sienomis.','Atskiri esamų pakopų, turėklų ar matomo pažeidimo vaizdai paaiškina, ką norite keisti.','Fotografuokite iš saugios prieinamos vietos; dėl nuotraukos neikite prie neapsaugoto angos krašto ir nelipkite ant nepatikrintos konstrukcijos.'),
h('Ką aptarti dėl darbų sekos'),
p('Gamintojo paklauskite, kurie grindų, sienų ir konstrukcijos darbai turi būti atlikti iki galutinio matavimo. Karkaso montavimo ir galutinės pakopų apdailos etapas gali skirtis. Atskirkite preliminarų įvertinimą nuo matavimo, kuriuo bus remiamasi gaminant. Taip pat iš anksto aptarkite įnešimą, privažiavimą ir kitų meistrų darbo grafiką.'),
p('Roberto laiptų gamybos procesas pateikia matavimo, projektavimo, gamybos ir montavimo seką. Tai vieno gamintojo eiga, o ne visiems projektams privalomas grafikas. Stadler konstrukcijų ir medžiagų pasirinkimas taip pat sieja konkretų pasiūlymą su individualiu projektu. Mūsų pilotas matavimo vizito šiuo metu nesiūlo.'),
h('Pirmos užklausos pavyzdys'),
p('Iliustracinis tekstas: „Individualus namas Kauno rajone. Betoniniai vidaus laiptai jau išlieti; reikia medinių pakopų ir turėklų, įskaitant viršutinę aikštelę. Grindų danga dar neįrengta, jos sluoksnis nepatvirtintas. Turiu plano ištrauką ir bendras nuotraukas. Darbus planuoju kitų metų pirmą pusmetį. Norėčiau žinoti, kokius duomenis reikia patikslinti prieš galutinį matavimą.“ Tai nėra tikro kliento įrašas.'),
p('Jei matmenų neturite, juos palikite nežinomus. Aiški tikra situacija yra naudingesnė už spėjamą tikslų skaičių. Prieš lygindami kainas patikrinkite, ar abiejų tiekėjų pasiūlymuose įtraukti tie patys matavimo ir projektavimo darbai; padės sąmatos palyginimo gidas.'),
h('Ką galite padaryti dabar'),
p('Užregistruokite savo vidaus laiptų poreikį, nurodydami darbą, vietovę ir laikotarpį. Forma nepriima nuotraukų priedų; juos galima atsiųsti svetainės el. paštu. Registracija nėra užsakymas, kainos pasiūlymas ar matavimo rezervacija. Mūsų tikslas šiame etape – suprasti konkretų įrengimo poreikį.'),
]},
{slug:'kontaktai',type:'service',title:'Kontaktai ir poreikio registracija',description:'Laiptų centro projekto operatorius MB Pinet, el. paštas info@pinet.lt. Aprašykite planuojamus vidaus laiptų darbus.',intent:'Kaip susisiekti su Laiptų centro operatoriumi ir pateikti poreikį?',body:[
p('Projektą administruoja MB Pinet. Kontaktas – info@pinet.lt. Šiai nišai telefono ir fizinės konsultacijų vietos nepateikiame. Registruojame vidaus laiptų įrengimo poreikius, tačiau neturime patvirtintų gamybos partnerių ir negarantuojame kainos pasiūlymo ar atvykimo.'),
p('Formoje nurodykite darbą, miestą ar rajoną, dabartinį etapą ir planuojamą laiką. Neįrašykite asmens kodo, tikslaus adreso ar kitų pirmai registracijai nereikalingų duomenų. Duomenys skirti šiam poreikiui aptarti, ne rinkodaros prenumeratai.'),
h('Jei forma nepavyksta'),
p('Nesėkmės pranešimas reiškia, kad registracijos priimti nepavyko. Galite bandyti dar kartą arba parašyti nurodytu el. paštu. Formos sėkmė patvirtina įrašo išsaugojimą; atskiras pranešimas paaiškina, ar operatoriaus pašto serveris priėmė pranešimą.'),
]},
{slug:'apie-projekta',type:'service',title:'Apie Laiptų centro projektą',description:'Vidaus laiptų poreikio pilotas: kam jis skirtas, kas veikia šiandien ir kuo skiriasi nuo laiptų gamintojo.',intent:'Kas yra Laiptų centras ir kokia yra jo dabartinė veikla?',body:[
p('Laiptų centras – MB Pinet vystomas naujas vidaus laiptų įrengimo poreikio projektas. Gidai padeda atskirti konstrukciją, pakopas, turėklus ir sąmatos apimtį; forma skirta registruoti konkretų planuojamą darbą. Tai pirmas etapas, kuriuo tikrinamas realus poreikis.'),
h('Kas veikia dabar'),
p('Parengti pasirinkimo ir pasiruošimo gidai bei poreikio registracijos kelias. Šiuo metu nesame laiptų gamintojas, neturime patvirtintų gamybos partnerių, nesiūlome savo kainyno, matavimo vizitų ar montavimo terminų. Ateities galimybės priklausys nuo realių poreikių ir vykdymo susitarimų.'),
h('Naujas projektas, atskira atsakomybė'),
p('Ši svetainė neperima ankstesnių šio domeno operatorių patirties, darbų, atsiliepimų ar garantijų. Rodomi interjero ir medžiagų vaizdai yra iliustracijos, o ne mūsų atlikti klientų projektai. Skirtingų gamintojų pavyzdžiai šaltiniuose nesuteikia jiems partnerio statuso.'),
p('Turinio rengimą, šaltinius ir taisymo kelią paaiškina redakcinė metodika. Dėl projekto arba klaidos galite rašyti info@pinet.lt.'),
]},
{slug:'redakcija',type:'service',title:'MB Pinet redakcija ir šaltinių metodika',description:'Kas rengia Laiptų centro gidus, kaip tikrinami šaltiniai, naudojamas AI ir priimami patikslinimai.',intent:'Kas atsakingas už Laiptų centro informaciją ir kaip ji tikrinama?',body:[
p('Laiptų centro turinį rengia MB Pinet projekto redakcija, naudodama AI tyrimui, juodraščiams ir iliustracijoms. Organizacija nurodoma kaip turinio rengėja; neimituojame projektuotojo, konstruktoriaus ar meistro kvalifikacijos. Pradinę šaltinių ir teksto peržiūrą šiame etape atliko AI agentas pagal projekto redakcinius kriterijus; tai nėra savininko ar atestuoto specialisto techninis patvirtinimas.'),
h('Kaip pasirenkami šaltiniai'),
p('Gamintojų originalius puslapius naudojame jų pasiūlos, komponentų ir darbų eigos pavyzdžiams. Oficialios institucijos naudojamos privatumo ir kitų norminių klausimų paaiškinimams. Šaltinio data ir jo ribos nurodomos prie gido. Užsienio kainų ar normų neperkeliame į Lietuvos projektą kaip vietinių faktų.'),
h('Ką tikriname prieš skelbdami'),
ul('Ar puslapis atsako į vieną konkretų klausimą ir suteikia naudingą palyginimą ar sąrašą.','Ar teiginys remiasi perskaitytu šaltiniu, o mūsų pavyzdys aiškiai įvardytas kaip iliustracinis.','Ar nėra išgalvotų kainų, tiekėjų, atliktų darbų, kvalifikacijų arba universalių konstrukcijos saugumo nustatymų.','Ar tekstas, vaizdai, datos, šaltiniai ir nuorodos priklauso tai pačiai peržiūrėtai versijai.'),
h('Vaizdai ir atnaujinimai'),
p('Originalios temos iliustracijos kuriamos AI pagal konkretaus gido poreikį. Jos nėra dokumentiniai klientų darbai, parduodamų gaminių įrodymas ar statybai tinkami brėžiniai. Vaizdų kilmė, pateikti promptai ir peržiūra saugomi redakciniame žurnale. Šaltinių pasikeitimai ar svarbi nustatyta klaida lemia naujos turinio versijos peržiūrą.'),
h('Kaip pranešti apie klaidą'),
p('Rašykite info@pinet.lt, nurodykite puslapį, netikslų teiginį ir, jei turite, patikimą šaltinį. Gautą informaciją vertiname prieš taisydami. Reikšmingas pataisymas atnaujina peržiūros datą, o pirminė publikavimo data nekeičiama vien dėl kosmetinio pakeitimo. Techninius objekto sprendimus visada derinkite su atsakingu specialistu.'),
]},
{slug:'privatumas',type:'service',title:'Privatumo informacija',description:'Kokie duomenys patenka į poreikio formą ir svetainės skaitiklius, kam jie naudojami ir kaip susisiekti dėl savo teisių.',intent:'Kaip Laiptų centro pilotas tvarko užklausų ir svetainės matavimo duomenis?',sources:[privacy],body:[
p('Projekto operatorius – MB Pinet, kontaktas privatumo klausimams – info@pinet.lt. Svetainė parengta kaip pirmos fazės poreikio pilotas. Viešas produkcinis paleidimas ir jo galutinės duomenų tvarkymo sąlygos dar nepatvirtinti; šiame vietiniame bandyme naudojami tik pažymėti sintetiniai įrašai.'),
h('Poreikio formos duomenys'),
p('Forma priima vardą, el. paštą, jūsų žinutę ir patvirtinimą, kad duomenys būtų naudojami poreikiui įvertinti bei susisiekti. Kartu saugomas užklausos identifikatorius, svetainė, pateikimo laikas, pradinis puslapis ir apdorojimo būsena. Nesiųskite pirmai registracijai nereikalingų jautrių duomenų. Automatinio dokumentų ar nuotraukų įkėlimo nėra.'),
p('Duomenys pirmiausia išsaugomi užklausų duomenų bazėje. Kai įjungtas pristatymas, operatoriui siunčiamas el. pašto pranešimas; pašto serverio priėmimas ir faktinis dėžutės gavimas yra skirtingi dalykai. Vietinėje peržiūroje tikras siuntimas išjungtas. Užklausa nėra rinkodaros sutikimas, kontaktai automatiškai gamintojams neperduodami.'),
h('Svetainės naudojimo matavimas'),
p('Naudojame pirmosios šalies dienos skaitiklius pagal svetainę, puslapį ir įvykį: puslapio peržiūrą ar el. pašto nuorodos paspaudimą. Šie skaitikliai nesaugo formos turinio, vartotojo identifikatoriaus ar slapukų ir neskaičiuoja unikalių žmonių. Palaikomi Do Not Track ir Global Privacy Control signalai. Nenaudojame trečiųjų šalių reklamos sekimo ar rinkodaros prenumeratos. Techninis hostingas gali apdoroti ryšio duomenis nepriklausomai nuo šių skaitiklių.'),
h('Saugojimo ir paslaugų ribos'),
p('Vietinio bandymo sintetinės užklausos pašalinamos po patikros. Automatinis tikrų klientų duomenų saugojimo terminas šiame vietiniame variante nenustatytas. Prieš viešą duomenų rinkimą būtina nustatyti galutinį teisinį pagrindą, saugojimo terminus, gavėjus ir tvarkytojus, produkcinio hostingo bei pašto sąlygas, galimus perdavimus ir duomenų ištrynimo eigą. Ši parengta peržiūra tokių nepatvirtintų sąlygų neįvardija kaip jau veikiančių garantijų.'),
h('Jūsų teisės ir kontaktas'),
p('Dėl duomenų, jų patikslinimo, prieigos, ištrynimo ar kitų taikomų teisių galite kreiptis į info@pinet.lt. Konkrečios teisės ir jų išimtys priklauso nuo tvarkymo pagrindo ir aplinkybių. Europos duomenų apsaugos valdybos paaiškinimas pateikia oficialią informaciją. Jei manote, kad tvarkymas pažeidžia jūsų teises, galite kreiptis į Valstybinę duomenų apsaugos inspekciją.'),
]},
{slug:'naudojimo-salygos',type:'service',title:'Svetainės naudojimo sąlygos',description:'Informacinių gidų ir poreikio registracijos ribos: techninis projektas, užsakymas ir gamybos garantijos šiuo etapu neteikiami.',intent:'Kokios yra Laiptų centro informacinio piloto naudojimo ribos?',body:[
p('Laiptų centro svetainę administruoja MB Pinet. Turinys skirtas padėti pasiruošti vidaus laiptų pasirinkimui ir aprašyti darbų poreikį. Jis nėra individualus konstrukcijos projektas, saugumo patvirtinimas ar specialistų patikra objekte.'),
h('Registracija ir paslaugos'),
p('Poreikio forma nėra užsakymas, rezervacija, mokama konsultacija ar sutartis dėl laiptų. Mokėjimų nepriimame. Gamintojų partnerystės dar nesudarytos, kainos pasiūlymo, atsakymo termino, matavimo vizito ar montavimo pajėgumo negarantuojame. Vėlesnę paslaugos apimtį ir vykdytoją reikėtų derinti atskirai.'),
h('Informacijos ribos'),
p('Gidai paaiškina pasirinkimo ir palyginimo klausimus. Konkrečią konstrukciją, jos tvirtinimą, matmenis, atitiktį ir montavimo seką turi patvirtinti už jūsų objektą atsakingi specialistai. Užsienio šaltinių normos bei kainos nėra Lietuvos objekto reikalavimai. Iliustracijos ir pažymėti pavyzdžiai nėra tikri klientų darbai.'),
h('Šaltiniai ir bendravimas'),
p('Nuorodos į gamintojus yra informacijos šaltiniai, o ne partnerystės ar jų pasiūlymų garantija. Prašome formoje pateikti tik šiam poreikiui reikalingus duomenis. Dėl turinio klaidos ar svetainės veikimo rašykite info@pinet.lt. Duomenų tvarkymą atskirai paaiškina privatumo informacija.'),
]},
];
const now=new Date().toISOString();
const pageMap=new Map();
for(const spec of specs){let page=(await getSite(id)).pages.find(x=>x.slug===spec.slug);if(!page)page=await addPage(id,{...spec,publishAt:now});page=await editPage(id,page.id,{type:spec.type,title:spec.title,description:spec.description,intent:spec.intent,body:spec.body,externalLinks:spec.sources??[],media:(spec.images??[]).map(k=>({id:media[k].id})),factChecks:[],links:[]});await approvePage(id,page.id,'laiptucentras-agent-source-review');pageMap.set(spec.slug,page);}
const linkPlan={
 '':[['laiptu-konstrukcijos','Konstrukcijų pasirinkimo gidas'],['gidai','Visi pasiruošimo gidai'],['vidaus-laiptu-irengimas','Vidaus laiptų poreikio registracija']],
 'gidai':[['laiptu-kaina','Sąmatos palyginimo gidas'],['laiptu-konstrukcijos','Konstrukcijų pasirinkimo gidas'],['laiptu-matavimas','Matavimo pasiruošimo gidas']],
 'laiptu-kaina':[['laiptu-matavimas','matavimo pasiruošimo gidas'],['vidaus-laiptu-irengimas','Vidaus laiptų poreikio registracija']],
 'laiptu-konstrukcijos':[['laiptu-kaina','sąmatos palyginimo gidą'],['vidaus-laiptu-irengimas','Vidaus laiptų poreikio registracija']],
 'laiptu-matavimas':[['laiptu-kaina','sąmatos palyginimo gidas'],['vidaus-laiptu-irengimas','Vidaus laiptų poreikio registracija']],
 'vidaus-laiptu-irengimas':[['laiptu-matavimas','Matavimo pasiruošimo gidas'],['kontaktai','Kontaktai ir registracijos forma']],
 'apie-projekta':[['redakcija','redakcinė metodika']],
 'naudojimo-salygos':[['privatumas','privatumo informacija']],
};
for(const [slug,links] of Object.entries(linkPlan)){const page=pageMap.get(slug);await editPage(id,page.id,{links:links.map(([target,label])=>({targetPageId:pageMap.get(target).id,label}))});await approvePage(id,page.id,'laiptucentras-agent-source-review');}
// Future editorial backlog stays private; it does not become public merely by date.
const future=[['laiptu-tureklu-planavimas','Kaip suplanuoti laiptų ir aikštelės turėklus','2026-10-22'],['pakopos-ant-betono','Pakopos ant betono: ką suderinti iki apdailos','2026-11-12'],['laiptu-montavimo-etapai','Kaip derinti laiptų montavimą su namo apdaila','2026-12-03'],['mediniu-pakopu-prieziura','Medinių pakopų priežiūra pagal konkrečią apdailą','2027-01-21'],['laiptu-keitimo-apimtis','Seni laiptai: atnaujinti ar keisti?','2027-02-18'],['gamintojo-pasiulymo-patikra','Ką patikrinti gamintojo pasiūlyme prieš susitarimą','2027-03-18']];
for(const [slug,title,date] of future){if(!(await getSite(id)).pages.some(p=>p.slug===slug))await addPage(id,{slug,title,type:'guide',description:'Privatus būsimo turinio planas; prieš publikavimą reikalingi aktualūs šaltiniai, iliustracija ir peržiūra.',intent:title,publishAt:`${date}T08:00:00Z`,cluster:'Vidaus laiptų užsakymo pasiruošimas',seasonalHook:'',reason:'Evergreen papildymas pagal konkrečius gautus klausimus; nėra įrodytos laiptų paklausos sezoniškumo. Data yra redakcinė prielaida.'});}
const result=await exportPackage(id);
await writeFile(`${base}/EDITORIAL-REVIEW.json`,JSON.stringify({reviewedAt:new Date().toISOString(),actor:'AI agentas, ne savininko ar atestuoto specialisto patvirtinimas',sourcesRetrieved:'BUSINESS.md ir RESEARCH.md; tik originalūs perskaityti puslapiai',pages:specs.map(s=>({slug:s.slug,decision:'approved for local pilot',originalContribution:s.intent,scope:'Ne individualus techninis projektas; nepatvirtintų vykdymo pažadų nėra',image:s.images??[],sources:s.sources?.map(x=>x.url)??[]})),futureDrafts:future.map(x=>x[0]),result},null,2));
console.log(JSON.stringify(result));
