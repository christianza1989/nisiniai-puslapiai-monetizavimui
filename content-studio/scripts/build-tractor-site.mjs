// Prepare this site's reviewed phase-one content. Does not deploy or register a domain.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { DATA, OUTPUT, initialize, getSite, editSite, addPage, editPage, approvePage, saveAsset, exportPackage } from '../src/model.mjs';

const id = 'traktoriupadangos';
await initialize();
const before = await getSite(id);
if (before.pages.some(page => page.publishedRevision)) throw new Error('Legacy bootstrap is only for an empty site. Use current model edits/export and complete-tractor-editorial.mjs; do not overwrite reviewed content or contacts.');
await mkdir(path.join(OUTPUT, 'site-snapshots'), { recursive: true });
await writeFile(path.join(OUTPUT, 'site-snapshots', `${id}-${Date.now()}.json`), JSON.stringify(before, null, 2));
const sourceImage = process.argv[2];
if (!sourceImage) throw new Error('Provide the generated hero PNG path.');
const require = createRequire('C:/Users/lenovo/Documents/dovanos-memorycasting/package.json');
const sharp = require('sharp');
let asset = before.assets.find(item => item.alt === 'Iliustracinis traktorius ir žemės ūkio padanga ryto lauke');
if (!asset) {
  const image = await sharp(await readFile(sourceImage)).resize({ width: 1440, withoutEnlargement: true }).webp({ quality: 80, effort: 6 }).toBuffer({ resolveWithObject: true });
  asset = await saveAsset(id, { mime: 'image/webp', alt: 'Iliustracinis traktorius ir žemės ūkio padanga ryto lauke', width: image.info.width, height: image.info.height,
    credit: 'ImageGen iliustracija; ne konkreti parduodama padanga ar kliento technika.',
    rights: 'Originalus OpenAI ImageGen vaizdas, sukurtas šiam projektui 2026-09-30; nėra kliento projekto fotografija.',
    prompt: 'Unbranded dark olive tractor, large plausible rear chevron tyre in Lithuanian field at golden dawn; natural editorial style, no logos, people or text. Full prompt recorded in sites/traktoriupadangos.md.' }, image.data);
}
let mobileAsset = before.assets.find(item => item.alt === 'Iliustracinis traktorius ir žemės ūkio padanga ryto lauke (mažesnis vaizdas)');
if (!mobileAsset) {
  const image = await sharp(await readFile(sourceImage)).resize({ width: 720 }).webp({ quality: 78, effort: 6 }).toBuffer({ resolveWithObject: true });
  mobileAsset = await saveAsset(id, { mime: 'image/webp', alt: 'Iliustracinis traktorius ir žemės ūkio padanga ryto lauke (mažesnis vaizdas)', width: image.info.width, height: image.info.height,
    credit: asset.credit, rights: asset.rights, prompt: asset.prompt }, image.data);
}
let mediumAsset = before.assets.find(item => item.alt === 'Iliustracinis traktorius ir žemės ūkio padanga ryto lauke (vidutinis vaizdas)');
if (!mediumAsset) {
  const image = await sharp(await readFile(sourceImage)).resize({ width: 960 }).webp({ quality: 78, effort: 6 }).toBuffer({ resolveWithObject: true });
  mediumAsset = await saveAsset(id, { mime: 'image/webp', alt: 'Iliustracinis traktorius ir žemės ūkio padanga ryto lauke (vidutinis vaizdas)', width: image.info.width, height: image.info.height,
    credit: asset.credit, rights: asset.rights, prompt: asset.prompt }, image.data);
}
await editSite(id, { name: 'Traktorių padangos', offer: 'Traktorių padangų pasirinkimo informacija ir poreikio užklausos',
  audience: 'Traktorių savininkai ir ūkiai, ieškantys padangų ir aiškesnių parinkimo klausimų.',
  facts: 'Sukurtas informacinis projektas ir poreikio forma. Savininkas leido planuojamoms nišoms naudoti info@memorycasting.lt. Tiekėjai, pardavimo pajėgumas, atsargos, kainos, domeno nuosavybė ir juridinis šios nišos operatorius nepatvirtinti. Telefonas šiai nišai nepateiktas.',
  contact: { email: 'info@memorycasting.lt', phone: '' }, brand: { accent: '#173b2c' } });
const p = text => ({ type: 'paragraph', text });
const h = text => ({ type: 'heading', level: 2, text });
const h3 = text => ({ type: 'heading', level: 3, text });
const ul = (...items) => ({ type: 'list', items });
const source = (url, label, reason) => ({ url, label, reason, verified: true });
const markings = 'https://business.michelinman.com/tips-suggestions/reading-tire-markings';
const faq = 'https://www.trelleborg-tires.com/en/education/faq';
const pressure = 'https://business.michelinman.com/help-advice/farm-vehicles/tractor-tire-pressure';
const now = new Date().toISOString();

const specs = [
  { slug: '', type: 'home', title: 'Traktorių padangos: pasirinkimas pagal jūsų techniką', description: 'Supraskite padangų matmenis, konstrukciją ir pasirinkimo klausimus. Praktiniai gidai ir aiškus būdas pateikti traktoriaus padangų poreikį.', intent: 'Nuo ko pradėti traktoriaus padangų pasirinkimą ir kur pateikti savo poreikį?', body: [
    p('Vien dydžio neužtenka. Užsirašykite visą padangos žymėjimą, traktoriaus modelį ir darbo sąlygas — turėsite aiškesnį pagrindą pokalbiui su padangų specialistu.'),
    h('Nuo ko pradėti pasirinkimą?'), p('Trys klausimai, kurie padeda atsirinkti informaciją prieš žiūrint į padangų pasiūlymus.'),
    h3('Pasiruoškite technikos duomenis'), p('Traktoriaus modelis, ašis ir atliekami darbai suteikia dydžio kodui reikalingą kontekstą. Pradėkite nuo aiškaus patikros sąrašo.'),
    h3('Perskaitykite visą žymėjimą'), p('Ant padangos šono ieškokite ne vien matmenų. Nurašykite ir konstrukcijos bei apkrovos ar greičio žymas.'),
    h3('Supraskite konstrukciją'), p('Radialinė ir diagonalinė konstrukcija nėra tas pats. Palyginimą pradėkite nuo technikos reikalavimų ir tikro naudojimo.'),
    h('Matmuo — tik pradžia.'), p('Dydžio kodą verta perskaityti dalimis. Tačiau jis nepakeičia konkretaus modelio techninės informacijos ir tinkamumo patikros.'),
    ul('650 — nominalus plotis milimetrais.', '60 — profilio santykis procentais.', 'R — radialinė konstrukcija.', '38 — nominalus ratlankio skersmuo coliais.'),
    h('Kur ir kaip dirba jūsų technika?'),
    h3('Lauko darbai'), p('Aprašykite padargus, naudojimo sąlygas ir tai, kokių duomenų apie apkrovą turite. Tai padės tinkamai kelti klausimus gamintojo dokumentacijai.'),
    h3('Važiavimas keliu'), p('Nurodykite transportavimo darbus ir greitį. Informacija apie naudojimą reikalinga kartu su padangos ir mašinos duomenimis.'),
    h3('Mišrus naudojimas'), p('Jei traktorius dirba ir lauke, ir kelyje, aprašykite abu scenarijus. Vieno darbo režimo nereikėtų laikyti visų kitų pakaitalu.'),
    h('Klausimai prieš pasirenkant'),
    h3('Ar vienodas dydis reiškia vienodą tinkamumą?'), p('Ne. Reikia konkrečios padangos techninių duomenų, ratlankio ir traktoriaus reikalavimų. Dydis yra tik patikros pradžia.'),
    h3('Ar galiu čia nusipirkti padangas?'), p('Šiuo metu pateikiame informaciją ir priimame poreikio užklausas. Viešo prekių sandėlio, kainyno ar pirkimo krepšelio nėra.'),
    h3('Ką parašyti, jei nežinau tikslaus dydžio?'), p('Parašykite traktoriaus modelį ir matomą padangos žymėjimą. Neaiškių simbolių nespėliokite — pažymėkite, ko nepavyko perskaityti.'),
    h3('Ar užklausa patvirtina padangos tinkamumą?'), p('Ne. Formoje aprašomas poreikis. Konkretaus padangos ir technikos derinio patikrą reikia atlikti pagal gamintojo dokumentus su specialistu.')
  ], sources: [source(markings, 'Michelin: padangos žymėjimas', 'Pagrindžia pateikto matmenų pavyzdžio skaitymą; patikrinta 2026-09-30.')] },
  { slug: 'gidas/kaip-issirinkti-traktoriaus-padangas', type: 'guide', title: 'Kaip išsirinkti traktoriaus padangas: nuo kokių duomenų pradėti?', description: 'Praktinis pasirengimo sąrašas: esamos padangos, traktoriaus modelis, ratlankis, ašis ir naudojimo sąlygos. Ką patikrinti prieš lyginant pasiūlymus.', intent: 'Kokių duomenų reikia prieš renkantis traktoriaus padangas?', body: [
    p('Traktoriaus padangų pasirinkimą pradėkite nuo esamos komplektacijos ir savo darbų aprašymo. Žymėjimas padeda identifikuoti padangą, o mašinos, ratlankio ir naudojimo informacija padeda suformuluoti konkrečią tinkamumo patikrą. Vien pagal išvaizdą arba vieną dydžio eilutę sprendimo nepriimkite.'),
    h('1. Užfiksuokite, kas sumontuota dabar'),
    p('Kai technika saugiai pastatyta ir jos galima apžiūrėti, nurašykite visą padangos šono žymėjimą. Jei simbolis neįskaitomas, pažymėkite tai užrašuose. Nereikia iš atminties atkurti skaičių, kurių nematote.'),
    ul('Užrašykite gamintoją, modelio pavadinimą ir visą dydžio eilutę.', 'Nurodykite, ar tai priekinė, ar galinė ašis, ir ar keičiate vieną padangą, porą ar komplektą.', 'Atskirai užrašykite papildomas žymas bei ratlankio duomenis, jeigu jie prieinami.'),
    h('2. Aprašykite mašiną ir naudojimą'),
    p('Specialistui pateikite traktoriaus modelį bei informaciją apie komplektaciją. Nežinomi duomenys nėra kliūtis pradėti pokalbį — svarbu jų nepakeisti spėjimu.'),
    ul('Kokie pagrindiniai darbai: laukas, transportavimas ar mišrus naudojimas?', 'Kokie padargai ir kroviniai naudojami?', 'Kokią informaciją apie apkrovą, darbo greitį ir balastą turite?', 'Ar norite išlaikyti esamą dydį, ar svarstote kitą?'),
    h('3. Tinkamumą vertinkite atskirai nuo kainos'),
    p('Prašydami pasiūlymo pasitikrinkite, ar jame nurodytas konkretus padangos modelis ir dydis. Ratlankio reikalavimai tikrinami konkrečioje techninėje informacijoje. Slėgio klausimui reikia to modelio ir realaus darbo režimo duomenų.'),
    p('Jei dydį keičiama keturiais ratais varomame traktoriuje, vien išorinio panašumo nepakanka. Priekinės ir galinės ašies derinį vertinkite pagal traktoriaus bei padangų gamintojo reikalavimus.'),
    h('4. Lyginkite tokią pačią pasiūlymo apimtį'),
    p('Palyginimui susirašykite, kas įtraukta į kiekvieną pasiūlymą. Mažesnė vienos padangos kaina savaime neatsako į visus pirkimo klausimus.'),
    ul('Ar lyginate vienodą modelį, dydį ir konstrukciją?', 'Ar kaina nurodyta su PVM, ir kokiam kiekiui ji taikoma?', 'Kokios pristatymo, montavimo ir kitų darbų sąlygos?', 'Kas ir pagal kokius duomenis patikrins konkretų tinkamumą?'),
    h('Poreikio aprašymo pavyzdys'),
    p('Iliustracinė užklausos struktūra: „Traktoriaus modelis: …; dabartinė priekinė padanga: …; galinė: …; ratlankio duomenys: …; pagrindiniai darbai: …; norimas kiekis: …; klausimas: ar galima išlaikyti esamą komplektaciją?“ Tai paruošiamas aprašymas, ne patvirtinto suderinamumo išvada.'),
    h('Kada reikalingas specialistas?'),
    p('Tinkamumo, neaiškių pažeidimų ar montavimo klausimai negali būti išspręsti vien šiame puslapyje. Surinkite informaciją, tada konkrečiam sprendimui naudokite gamintojo dokumentaciją ir kompetentingo specialisto vertinimą.')
  ], sources: [source(pressure, 'Michelin: traktoriaus padangų slėgio parinkimas', 'Pagrindžia apkrovos, mašinos ir darbo režimo duomenų svarbą slėgio klausimui; patikrinta 2026-09-30.'), source('https://blog.bridgestone-agriculture.eu/impact-of-the-dynamic-rolling-circumference-of-agricultural-tyres', 'Bridgestone: riedėjimo apskritimas', 'Pagrindžia atskirą 4x4 ašių derinio patikros poreikį; patikrinta 2026-09-30.')] },
  { slug: 'gidas/traktoriaus-padangu-zymejimas', type: 'guide', title: 'Traktoriaus padangų žymėjimas: kaip skaityti šoninę sienelę?', description: 'Kaip atskirti plotį, profilį, konstrukciją ir ratlankio skersmenį. Praktinis sąrašas, ką nurašyti nuo padangos prieš siunčiant užklausą.', intent: 'Kaip perskaityti traktoriaus padangos dydį ir papildomas žymas?', body: [
    p('Padangos šone perskaitykite visą žymėjimą, o ne vien didžiausius skaičius. Jame gali būti dydis, konstrukcija ir naudojimo indeksai. Šių duomenų kopija padeda išvengti neaiškumo bendraujant su pardavėju ar specialistu.'),
    h('Dydžio pavyzdys: 650/60 R38'),
    p('Tai iliustracinis žymėjimo skaitymo pavyzdys. Jis nėra konkrečiam traktoriui rekomenduojamas dydis.'),
    ul('650 žymi nominalų padangos plotį milimetrais.', '60 yra profilio santykis: šono aukščio santykis su nominaliu pločiu, išreikštas procentais.', 'R nurodo radialinę konstrukciją.', '38 yra nominalus ratlankio skersmuo coliais, ne visos padangos išorinis skersmuo.'),
    h('Ką dar verta užrašyti?'),
    p('Po dydžio esantys kodai gali nurodyti apkrovos ir greičio indeksus. Papildomos raidės ar užrašai taip pat priklauso pilnam padangos aprašymui. Nurašykite juos kartu su gamintoju ir modeliu; reikšmę tikrinkite pagal konkrečią techninę informaciją.'),
    h('Kaip susirinkti informaciją be spėlionių'),
    ul('Nurašykite žymėjimą nuo naudojamos padangos, jei saugiai galima jį perskaityti.', 'Atskirai pažymėkite ašį ir pusę, kad nesumaišytumėte skirtingų ratų.', 'Neįskaitomą dalį pažymėkite klaustuku; nekeiskite jos panašiu skaičiumi.', 'Užrašykite, jeigu padangos šonuose matote skirtingus dydžius ar modelius.'),
    h('Ko šis kodas nepatvirtina?'),
    p('Dydžio kodas nepakeičia ratlankio reikalavimų, mašinos dokumentacijos ar viso padangos modelio specifikacijos. Kito žymėjimo nereikėtų laikyti automatiškai tinkamu pakaitalu. Jeigu norite keisti dydį, užklausoje aiškiai atskirkite dabartinį žymėjimą nuo siūlomo.'),
    h('Trumpa užrašų forma'),
    p('Pasidarykite vieną įrašą kiekvienai skirtingai padangai: „Ašis: …; gamintojas ir modelis: …; visas žymėjimas: …; neįskaitomi simboliai: …“. Tai paprastas informacijos surinkimo būdas, o ne automatinio parinkimo įrankis.')
  ], sources: [source(markings, 'Michelin: žemės ūkio padangos žymėjimas', 'Pagrindžia dydžio, radialinės konstrukcijos, apkrovos ir greičio kodų aiškinimą; patikrinta 2026-09-30.')] },
  { slug: 'gidas/radialines-ar-diagonalines-traktoriaus-padangos', type: 'guide', title: 'Radialinės ar diagonalinės traktoriaus padangos: kuo skiriasi?', description: 'Konstrukcijų skirtumas ir praktiški klausimai palyginimui. Kodėl sprendimas priklauso nuo konkrečios technikos ir padangos modelio.', intent: 'Kuo skiriasi radialinė ir diagonalinė konstrukcija ir ką tai reiškia pasirinkimui?', body: [
    p('Radialinės ir diagonalinės padangos skiriasi vidinės konstrukcijos kordo sluoksnių išdėstymu. Tai nėra vien du to paties gaminio pavadinimai. Konstrukciją svarbu vertinti kartu su konkrečiu modeliu ir technikos reikalavimais, o ne rinktis pagal bendrą „geresnės padangos“ etiketę.'),
    h('Radialinė konstrukcija'),
    p('Radialinės padangos kordo sluoksniai eina nuo borto iki borto radialine kryptimi, o protektoriaus zona sustiprinama juostomis. Dydžio kode radialinę konstrukciją nurodo raidė R.'),
    h('Diagonalinė konstrukcija'),
    p('Diagonalinėje konstrukcijoje kordo sluoksniai kerta vienas kitą skirtingomis kryptimis. Konstrukcijos skirtumas gali būti svarbus vertinant padangos darbą, tačiau vien šis aprašymas nenusprendžia konkretaus dydžio ar modelio tinkamumo.'),
    h('Palyginimą pradėkite nuo savo naudojimo'),
    p('Užuot klausus vien „kuri konstrukcija geresnė?“, verta aprašyti, ką turi atlikti jūsų technika. Taip gausite aiškesnį klausimą pardavėjui ir mažiau vietos abstraktiems pažadams.'),
    ul('Kokia konstrukcija numatyta mašinos dokumentuose ir kas sumontuota dabar?', 'Kokius konkrečius padangų modelius lyginate?', 'Kokie darbai atliekami lauke ir kelyje?', 'Ar pasiūlyme įvertinti ratlankio ir technikos reikalavimai?'),
    h('PR skaičiaus nepaverskite sluoksnių skaičiavimu'),
    p('Trelleborg aiškina, kad šiuolaikinis ply rating nėra tiesiog tikrasis vidinių sluoksnių skaičius. Jeigu palyginime matote PR, nepakeiskite jo savo interpretacija apie padangos sandarą; tikrinkite modelio techninę informaciją.'),
    h('Ko nevertėtų laikyti pasirinkimo pagrindu'),
    ul('Vienodos išvaizdos ar vien matmenų kodo.', 'Bendro teiginio, kad viena konstrukcija tinka visiems darbams.', 'Pardavimo palyginimo, kuriame nėra konkretaus modelio ir dydžio.', 'Prielaidos, kad pigesnis pasiūlymas apima tuos pačius darbus ir sąlygas.'),
    h('Kitas naudingas žingsnis'),
    p('Pasiruoškite esamos komplektacijos duomenis ir paprašykite palyginti konkrečius modelius pagal jūsų techniką. Šis gidas padeda užduoti klausimus, bet nepateikia individualaus montavimo ar suderinamumo patvirtinimo.')
  ], sources: [source(faq, 'Trelleborg: radialinė ir diagonalinė konstrukcija', 'Gamintojo DUK paaiškina konstrukcijų bei PR reikšmę; patikrinta 2026-09-30.')] },
  { slug: 'gidai', type: 'faq', title: 'Traktorių padangų pasirinkimo gidai', description: 'Nuo technikos duomenų iki žymėjimo ir konstrukcijos: praktiški atsakymai prieš renkantis traktoriaus padangas.', intent: 'Kur rasti atsakymus į pagrindinius traktorių padangų pasirinkimo klausimus?', body: [p('Pasirinkite klausimą, nuo kurio norite pradėti. Gidai padeda susirinkti duomenis ir suprasti, ką reikia patikrinti pagal konkrečią techniką.'),h('Skaitykite pagal savo klausimą'),p('Jei dar tik pradedate, pradėkite nuo pasirinkimo duomenų sąrašo. Jei turite padangos žymėjimą, perskaitykite jo paaiškinimą. Konstrukcijų palyginimas naudingas tada, kai svarstote konkrečius pasiūlymus.')], sources: [] },
  { slug: 'duk', type: 'faq', title: 'Dažniausi klausimai apie traktorių padangų pasirinkimą', description: 'Atsakymai apie padangų poreikio užklausą, žymėjimą, kainas ir sprendimo ribas. Kas pateikiama šioje svetainėje.', intent: 'Ką galiu padaryti šiame projekte ir ko reikia pasirinkimui?', body: [
    h('Ar svetainė yra veikianti padangų parduotuvė?'),p('Šiuo metu tai informacinė svetainė su poreikio užklausos forma. Patvirtinto sandėlio, kainyno, pirkimo krepšelio ar montavimo paslaugos nepateikiame.'),
    h('Ar užklausa yra užsakymas?'),p('Ne. Ji skirta aprašyti poreikį. Išsiuntimas nėra pirkimo sutartis, atsargų rezervacija ar padangos tinkamumo patvirtinimas.'),
    h('Kodėl nėra kainų?'),p('Mūsų kainos ir tiekimo sąlygos dar nepatvirtintos. Todėl svetainėje nepateikiame konkurentų kainų kaip savo pasiūlymo ir nesukuriame tariamo katalogo.'),
    h('Ką surinkti prieš kreipiantis?'),p('Užrašykite visą padangos žymėjimą, traktoriaus modelį, ašį, naudojimo sąlygas ir klausimą. Nežinomas detales aiškiai pažymėkite.'),
    h('Ar gidas nustato slėgį ar patvirtina kitą dydį?'),p('Ne. Konkrečių padangų naudojimas tikrinamas pagal jų techninę informaciją ir mašinos reikalavimus. Šie gidai skirti suprasti klausimą ir pasiruošti specialistų vertinimui.'),
    h('Ar pagrindinio puslapio nuotrauka rodo jūsų parduodamą prekę?'),p('Ne. Tai šiam projektui sukurta ImageGen iliustracija. Ji nerodo konkretaus parduodamo modelio ar tikro kliento technikos.')
  ], sources: [] },
  { slug: 'kontaktai', type: 'faq', title: 'Kontaktai ir traktoriaus padangų poreikio užklausa', description: 'Pateikite matmenis, traktoriaus modelį ir savo klausimą. Projekto kontaktinis el. paštas info@memorycasting.lt.', intent: 'Kaip pateikti klausimą arba padangų poreikį?', body: [p('Projekto kontaktinis el. paštas: info@memorycasting.lt. Taip pat galite užpildyti poreikio formą šiame puslapyje.'),h('Ką įrašyti į užklausą'),ul('Traktoriaus modelį ir ašį.', 'Visą padangos žymėjimą, jei jį žinote.', 'Atliekamus darbus ir norimą kiekį.', 'Konkretų klausimą ir detales, kurių nepavyko patikrinti.'),h('Ką reiškia formos išsiuntimas'),p('Pateikta informacija skirta poreikiui aprašyti. Forma nepatvirtina padangos tinkamumo, pardavimo kainos, tiekimo ar montavimo. El. paštas yra bendras projekto operatoriaus kontaktas; šiam domenui atskiro telefono nenurodome.')], sources: [] },
  { slug: 'privatumas', type: 'faq', title: 'Privatumo informacija', description: 'Kokie duomenys pateikiami užklausos formoje, kam jie naudojami ir kur kreiptis dėl jų tvarkymo.', intent: 'Kaip tvarkomi šiame projekte pateikti užklausos duomenys?', body: [p('Ši informacija aprašo traktoriupadangos.lt poreikio formos techninį duomenų kelią. Klausimus dėl duomenų galite pateikti projekto kontaktu info@memorycasting.lt.'),h('Ką pateikiate ir kas išsaugoma'),p('Formoje pateikiamas vardas, el. paštas ir žinutė. Užklausos įrašas taip pat turi pateikimo laiką, sutikimo laiką ir puslapio kelią, iš kurio ji pateikta. Duomenys atskiriami pagal svetainę.'),h('Kam naudojama užklausa'),p('Duomenys skirti apdoroti pateiktą poreikį ir susisiekti jūsų nurodytu el. paštu. Forma neprenumeruoja reklaminių laiškų. Nerašykite žinutėje slaptažodžių, mokėjimo duomenų ar kitų užklausai nereikalingų jautrių duomenų.'),h('Puslapio susidomėjimo matavimas'),p('Skaičiuojamos bendros dienos puslapių peržiūros ir el. pašto ar telefono nuorodų paspaudimai. Šie įrašai turi tik svetainę, dieną, viešo puslapio kelią, įvykio rūšį ir bendrą skaičių. Nenaudojami analitikos slapukai ar individualūs lankytojų identifikatoriai; IP adresas šiame skaitiklių įraše nesaugomas.'),p('Peržiūros ir tikros gautos užklausos vertinamos atskirai. El. pašto nuorodos paspaudimas savaime nėra gautas laiškas. Tai nėra unikalių lankytojų skaičius. Naršyklės Do Not Track arba Global Privacy Control signalas sustabdo šį skaitiklį.'),h('Klausimai apie jūsų duomenis'),p('Dėl savo pateiktos užklausos, duomenų tikslinimo ar pašalinimo rašykite info@memorycasting.lt ir nurodykite, kokiu el. paštu siuntėte užklausą. Nepersiųskite perteklinių asmens dokumentų kopijų.')], sources: [] }
];

for (const spec of specs) {
  const site = await getSite(id);
  let page = site.pages.find(item => item.slug === spec.slug);
  if (!page) page = await addPage(id, { type: spec.type, slug: spec.slug, title: spec.title, description: spec.description, intent: spec.intent });
  await editPage(id, page.id, { type: spec.type, title: spec.title, description: spec.description, intent: spec.intent,
    body: spec.body, factChecks: [], externalLinks: spec.sources, publishAt: now, seasonalHook: '', links: [],
    media: spec.type === 'home' ? [asset, mediumAsset, mobileAsset] : [] });
  await approvePage(id, page.id, 'codex-source-review-2026-09-30');
}
// First approve all targets, then approve the complete actual link graph.
const reviewed = await getSite(id);
const index = new Map(reviewed.pages.map(page => [page.slug, page]));
for (const spec of specs) {
  const targets = spec.slug === '' || spec.slug === 'gidai' ? specs.filter(item => item.type === 'guide').map(item => item.slug)
    : spec.type === 'guide' ? ['gidai', ...specs.filter(item => item.type === 'guide' && item.slug !== spec.slug).map(item => item.slug)] : ['gidai'];
  const page = index.get(spec.slug);
  await editPage(id, page.id, { links: targets.map(slug => ({ targetPageId: index.get(slug).id, label: index.get(slug).title })) });
  await approvePage(id, page.id, 'codex-source-review-2026-09-30');
}
const exported = await exportPackage(id);
console.log(JSON.stringify({ ...exported, reviewedPages: specs.length, futurePrivateDrafts: (await getSite(id)).pages.filter(page => !page.publishedRevision).length,
  heroBytes: (await readFile(path.join(DATA, 'media', id, path.basename(asset.src)))).length,
  launchDependencies: ['Domain ownership and DNS', 'Actual niche operator identity and retention policy', 'Production D1 and real notification delivery', 'Per-domain Search Console and measured demand'] }, null, 2));
