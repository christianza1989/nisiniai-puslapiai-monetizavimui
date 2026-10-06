import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const folder=path.join(import.meta.dirname,'public');
const replacements=new Map([
 ['Privati platformos demonstracija.','Atrask savo meistrą ir skirk laiko sau.'],['Demo darbo vieta','Darbo vieta'],[' · privatus preview',''],
 ['Galutinę demonstracinę sumą','Galutinę sumą'],['galutinę demonstracinę sumą','galutinę sumą'],['Bendra demo suma','Bendra suma'],
 ['Tai nėra tikras užsakymas. Mokėjimų nėra.','Apmokėjimą už paslaugą aptarsi su meistru. Platformoje mokėjimas neatliekamas.'],
 ['žemiau nurodytas demo meistras','žemiau nurodytas meistras'],['demo snapshot','Atnaujinta'],[' · grafiko versija ${a.scheduleVersion}',''],
 ['Kam skirsime demo vizitą?','Kam skirsime vizitą?'],['Gali tęsti kaip svečias. Naudok tik demonstracinius duomenis.','Patikrink savo vardą ir prisijungimo el. paštą.'],
 ['Demo vardas','Vardas'],['Demo el. paštas','El. paštas'],['Tinka tik demo…@example.com adresas. Niekas nebus išsiųsta.','Šiuo el. paštu prisijungi prie savo vizitų.'],
 ['Suprantu, kad tai vietinis demo veiksmas. Peržiūrėjau','Peržiūrėjau'],['demonstracijos taisykles','naudojimosi taisykles'],
 ['Pirmiausia pasirink laiką ir demo kontaktą.','Pirmiausia pasirink laiką ir patikrink kontaktus.'],
 ['Demo laiko palaikymas galioja iki','Laikas laikomas iki'],['pagal bendrą laikrodį. Prieš patvirtinimą adapteris tikrina būseną.','Prieš patvirtinimą laikas ir paslauga patikrinami dar kartą.'],
 ['Realios teikėjo atšaukimo taisyklės dar nepatvirtintos. Preview netaiko mokesčio ir neatlieka mokėjimo.','Jei planai keičiasi, vizitą gali pakeisti ar atšaukti paskyroje. Platformoje mokėjimas neatliekamas.'],
 ['Demo vizitas sukurtas','Vizitas patvirtintas'],['Vietinis įrašas','Registracijos numeris'],['Tikras vizitas nesukurtas ir laiškas neišsiųstas.','Vizitas išsaugotas. Jo detales ir būseną rasi savo paskyroje.'],
 ['Atrask meistrus pasirinkto intervalo demo scenarijuje.','Rinkis meistrą, kurio visas vizitas telpa tavo laike.'],
 ['Išbandyk aiškią vietinę demo santrauką.','Peržiūrėk visą vizitą ir patvirtink savo pasirinkimą.'],
 ['Kaip veikia demonstracija','Kaip veikia'],['Privačiame preview gali išbandyti savo būsimos darbo vietos eigą.','Valdyk paslaugas, darbo laiką ir klientų vizitus.'],
 ['Tai privataus profilio galerija nėra tikro meistro portfolio.',''],['Ši privataus profilio galerija nėra tikro meistro portfolio.',''],
 ['Darbų stiliaus iliustracijos','Darbų galerija'],['Fiktyvūs komentarai susieti su atliktais pradinio rinkinio vizitais. Jie nėra realių klientų rekomendacijos.','Atsiliepimai susieti su atliktais vizitais.'],
 ['Vieta yra demonstracinė. Tikslus adresas, reali veikla ir kalendoriaus pajėgumas nepatvirtinti.','Prieš atvykdamas patikrink veiklos vietą ir pasirinktos paslaugos informaciją.'],
 ['Privataus demo redakcinė iliustracija.',''],['Šis veiksmas nėra rezervacija ir nesiunčia pranešimo teikėjui.','Tai pageidavimas. Laikas patvirtinamas atskirai.'],
 ['Pageidaujamas laikas (tik demo)','Pageidaujamas laikas'],['Pranešimas lieka demo operatoriaus eilėje. Tikram klausimui info@pinet.lt.','Nurodyk konkrečią problemą. Pranešimą peržiūrės platformos operatorius.'],
 ['Demo problemos aprašymas','Problemos aprašymas'],['Demo pranešimas išsaugotas operatoriaus eilėje.','Pranešimas išsaugotas operatoriaus eilėje.'],
 ['Tavo demo vizitas','Tavo vizitas'],['Tai vietinis įrašas, ne reali registracija.',''],['Pasirink paslaugą ir sukurk vietinį demo vizitą.','Pasirink paslaugą ir tau tinkantį laiką.'],
 ['Katalogo širdelė išsaugo profilį šioje demonstracijoje.','Išsaugok patikusį meistrą kataloge.'],['Žinutės susietos su konkrečiu vizitu ir saugomos tik vietoje.','Pokalbiai su meistrais susieti su tavo vizitais.'],
 ['vietinių žinučių','žinučių'],['Tavo demo duomenys','Tavo duomenys'],['Fiktyvus seed el. paštas:','Prisijungimo el. paštas:'],['. Tikro kontakto čia nekeisk.','.'],
 ['Vizito pranešimų demo pasirinkimas','Vizito pranešimai'],['Atskiras rinkodaros demo pasirinkimas','Rinkodaros pranešimai'],
 ['Tai tik vietinės reikšmės. Prenumerata nesukuriama, pranešimai nesiunčiami.','Vizito pranešimai ir rinkodara yra atskiri pasirinkimai.'],
 ['Vietinių duomenų naudojimas','Duomenų naudojimas'],['Šią dieną demo vizitų nėra.','Šią dieną vizitų nėra.'],['Šiandien šiame rinkinyje vizitų nėra.','Šiandien vizitų nėra.'],
 ['Jautrių sveikatos laukų nėra.',''],['fiktyvus kontaktas',''],['Tai solo paskyra. Saloną su komanda pasirink aukščiau esančiame organizacijos valdiklyje.','Tai savarankiškai dirbančio meistro paskyra.'],
 ['Demo rolė nekuria realios serverio teisės.','Komandos prieigos administruojamos atskirai.'],['Demo redakcinė peržiūra','Profilio peržiūra'],['Pateik pirmą šio profilio demonstracinę versiją.','Pateik pirmą šio profilio versiją.'],
 ['Demo outbox nesiunčia į paštą ar SMS. Aptarnavimo ir rinkodaros leidimai atskirti.','Peržiūrėk vizito pranešimų būsenas. Aptarnavimo ir rinkodaros pasirinkimai atskirti.'],
 ['Po demo vizito patvirtinimo čia atsiras vietinis outbox įrašas.','Po vizito patvirtinimo čia atsiras pranešimo įrašas.'],
 ['Skaičiai apskaičiuoti tik iš pasirinktos organizacijos seed ir vietinių demo veiksmų.','Skaičiai apskaičiuoti iš pasirinktos organizacijos vizitų.'],
 ['Snapshot paslaugų vertė','Užregistruotų paslaugų vertė'],['Paslaugų vertė nėra platformos pajamos ar įrodytas apmokėjimas. Mokėjimai neprijungti.','Paslaugų vertė nėra gauto apmokėjimo įrodymas. Mokėjimai platformoje neatliekami.'],
 ['Žinutės niekur nesiunčiamos.','Pokalbis susietas su šiuo vizitu.'],['Vietinių žinučių dar nėra.','Žinučių dar nėra.'],
 ['Tai vietinis demo atšaukimas be mokėjimo ar laiško.','Patvirtinus atšaukimą laikas bus atlaisvintas.'],['Demo priežastis','Priežastis'],
 ['Atsiliepimas nemokamas, lieka privačioje demonstracijoje ir nepatenka į Google schema.','Įvertink savo atliktą vizitą. Atsiliepimas peržiūrimas prieš viešinimą.'],
 ['Tai profilio demonstracinė reikšmė, ne realios prieigos suteikimas.','Viešas komandos vaidmuo atskiras nuo paskyros prieigos.'],
 ['Patvirtinimas šioje eilėje galioja tik vietiniam demo profiliui.','Peržiūrėk pateiktą profilio versiją ir grąžink patikslinti neaiškius duomenis.'],
 ['Demo katalogai yra noindex. Čia galima simuliuoti profilio pašalinimą ir matyti jo išnykimą iš vietinės paieškos.','Pašalintas profilis neberodomas kataloge ir laisvų laikų paieškoje.'],
 ['Demo pranešimas rodo moderavimo kelią. Tikras teisės pažeidimas vertinamas atskirai.','Pranešimus vertink pagal turinį, autorystę ir viešinimo teises.'],
 ['Visi šio rinkinio profiliai patvirtinti demo.','Peržiūros laukiančių profilių nėra.'],
 ['Demo katalogo būsena atnaujinta. Public pasiūla neįjungta.','Katalogo būsena atnaujinta.'],
 ['Demo vizito laikas pakeistas. Pranešimas nesiųstas.','Vizito laikas pakeistas.'],
 ['Manual demo vizitas sukurtas vietoje.','Vizitas pridėtas.'],['Demo vardas išsaugotas.','Vardas išsaugotas.'],['Vietiniai pasirinkimai išsaugoti.','Pasirinkimai išsaugoti.'],
 ['Profilis išsaugotas demo paskyroje.','Profilis išsaugotas.'],['Demo sritis pritaikyta. Miesto pasirinkimas išlaikytas.','Pasirinkta sritis pritaikyta.'],
 ['SMTP ir SMS neprijungti. „Demo-only“ reiškia vietinį įrašą, o ne pristatytą pranešimą.','Pristatymo būseną vertink atskirai nuo paties vizito įrašo.'],
 ['Parengti trys privatūs gidai. Viešas publishAt dar nenustatytas, į bendrą paketą jie neimportuoti.','Turinio versijos ir susijusių paslaugų nuorodos.'],
 ['Demo CTA →','Paslaugos ryšys →'],['Fiktyvūs katalogai blokuojami public projekcijoje','Viešinama tik priimta ir tinkama versija'],
 ['PRIVATE_DRAFT · public BLOCKED','Parengta peržiūrai'],['Vietiniai demo veiksmai','Platformos įvykiai'],['Įvykę tikri vizitai / vertė','Atlikti vizitai'],
 ['Demo įrašai neprilyginami paklausai. GSC, Bing, realūs per-site skaitikliai ir launch neprijungti. Vienas siteId: madbeauty.','Testinių duomenų rodikliai atskiriami nuo klientų paklausos.'],
 ['Privataus katalogo sumos yra fiktyvūs pasirinkimo pavyzdžiai; tikro teikėjo pasiūlymas turės būti patvirtintas atskirai.','Tikrink konkretaus teikėjo kainoraštį ir pasirinktos procedūros apimtį.'],
 ['Madbeauty demonstraciniai profiliai nėra tikrų dokumentų tikrinimo įrodymas.','Profilio peržiūra savaime nėra visų veiklos dokumentų tikrinimo įrodymas.'],
]);
for(const name of ['app.mjs','booking-ui.mjs','workspace-ui.mjs','public-views.mjs']){
  const p=path.join(folder,name);let source=await readFile(p,'utf8');for(const [before,after] of replacements)source=source.replaceAll(before,after);
  // Product phrases only. Internal action IDs, namespace, method names, demo record flags and regex are untouched.
  source=source.replace(/\bDemo (?=[A-Za-zÀ-ž])/g,'').replace(/(?<=\s)demo(?=\s|<|[.,])/g,'').replace(/\bDemonstracinis pranešimas\b/g,'Pranešimas').replaceAll('Demonstracinė rolė','Rolė');
  await writeFile(p,source);
}
// Guides retain explicitly illustrative arithmetic, but no platform-stage narration.
const p=path.join(folder,'content.mjs');let source=await readFile(p,'utf8');for(const [before,after] of replacements)source=source.replaceAll(before,after);await writeFile(p,source);
console.log('Product copy revision applied; verify remaining phrases manually.');
