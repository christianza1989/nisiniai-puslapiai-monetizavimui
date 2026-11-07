# Keli maži darbai: ką apima minimalus mokestis

2026-10-10, 14:00 UTC tyrimo ciklas. Klausimas: kaip agentas turi palyginti nedidelių namų darbų pasiūlymus, kai teikėjai skirtingai skaičiuoja atvykimą, minimumą ir medžiagas? Rezultatas — **esamo proceso įrodymų papildymas**, ne nauja idėja ar leidimas įjungti prekybą.

## Esama kryptis

[Auksarankių verslo plane](../../../sites/auksarankiams/BUSINESS.md) jau pasirinktas kelių mažų darbų sąrašas vienam vizitui. Mokamas rezultatas būtų tinkamai atlikti suderinti darbai; galimas mūsų mokėtojas — sutartas vykdytojas už priimtą užklausą. Partneriai, mūsų atlygis ir tikra paklausa dar nepatvirtinti. [Pardavimo instrukcija](../../../agent-business-core/runtime/src/pinet_core/instructions/niches/auksarankiams/sales.md) jau atskiria darbą, atvykimą, medžiagas ir minimumą, o [vykdytojo instrukcija](../../../agent-business-core/runtime/src/pinet_core/instructions/niches/auksarankiams/supplier.md) reikalauja tikrinti jų sąlygas. [Pokalbio instrukcija](../../../agent-business-core/runtime/src/pinet_core/instructions/niches/auksarankiams/conversation.md) apibrėžia leidžiamus smulkius darbus ir išimtis.

Tai esamos krypties detalė. Naujo BDEV numerio, atskiros programos, kainų skaičiuotuvo ar reikšmingos verslo plėtros nesiūlome. Nepakeisti pirmos fazės poreikio registravimo rezervacija. Šio ciklo rašymo ribos — tik privatus tyrimas ir STATE pagal esamą registrui skirtą [WORKSTREAMS](../../../WORKSTREAMS.md) sritį.

## Pirminiai šaltiniai

[IKEA Lietuva](https://www.ikea.com/lt/lt/customer-service/services/assembly/) kainą apibrėžia kaip iškvietimo ir montavimo kainų sumą. Vilniuje ir kituose nurodytuose miestuose iškvietimas 59 €, baldų surinkimas — 15 % vertės, bent 48 €. Taigi šių dviejų komponentų suma, kai taikomas mažiausias surinkimo mokestis, yra 107 € prieš kitus papildomai apmokamus darbus ar medžiagas. Tai paskelbtų komponentų aritmetika, ne individualus pasiūlymas, mūsų kaina ar visų darbų rinkos minimumas. Puslapis aprašo IKEA gaminius; iš jo negalima pažadėti kitų pardavėjų baldų surinkimo ar viso mišraus sąrašo vykdymo. Nepridėjome numanomo PVM ar kito mokesčio.

[Karnizų montavimo teikėjas](https://karnizumontavimas.lt/) nurodo 15 €/m lubiniam bėgeliui ir 15 € už sieninio karnizo laikiklį, iki 3,2 m aukščio. Jo 50 € minimumas apima atvykimą ir darbus. Pridėti atvykimą dar kartą, remiantis vien minimumo etikete, būtų nepagrįsta. Medžiagų kainos ir galimybė tuo pačiu vizitu atlikti baldų remontą nepatvirtintos. Tai teikėjo vieši įkainiai, ne jo faktiškai gautų pajamų ar mūsų partnerystės įrodymas.

[Taskrabbit bendros prekyvietės minimumo pagalba, JAV versija](https://support.taskrabbit.com/hc/en-us/articles/46260463840155-Can-I-Set-a-Two-Hour-Minimum-for-Tasks) nurodo vienos valandos platformos minimumą, o didesnį vykdytojo minimumą reikalauja iš anksto raštu suderinti su klientu užduoties pokalbyje. Vien profilio žyma neatstoja tokio suderinimo. Šis pavyzdys neperkeliamas į Lietuvos kainyną ar jų IKEA fiksuotos kainos paslaugą.

[Taskrabbit Jungtinės Karalystės išlaidų politika](https://support.taskrabbit.com/hc/en-gb/articles/46260393964187-Expense-Policy), galiojanti nuo 2025-03-31, tinkamoms medžiagų išlaidoms reikalauja suderinimo ir kvito; partnerių, įskaitant IKEA, užduotims toks išlaidų kompensavimas netaikomas. Pagal šią politiką nekompensuojamos automobilio stovėjimo, degalų ar įrankių naudojimo išlaidos. Tai konkrečios platformos ir rinkos taisyklės; mūsų sutarties jomis nepakeičiame. Tyrimui svarbi pamoka — medžiagų pirkimas, pirkimo laikas, transportas ir kompensacija turi skirtingus pagrindus, o vienas išlaidų laukas jų nesuvienodina.

ManoMeistras kainų puslapio dabartinio teksto nepavyko atverti web įrankiu. Ankstesnio BUSINESS įrašo nelaikėme nauju šios kainos patvirtinimu. Viena Treg katalogo užklausa nepateikė tinkamo vietinių darbų sąmatos įrankio; artimiausi kitų užduočių rezultatai nenaudoti, mokamų užklausų nėra. Naršyklėje sąsajų nevertinome, užsakymų formų nesiuntėme.

## Mažiausias praktiškas patikrinimas

Prieš vėlesnį autorizuotą pasiūlymą agentas gali iš esamo darbų sąrašo parengti palyginimo lentelę: darbų ir gaminių apimtis, vienas ar keli vykdytojai / vizitai, skaičiavimo vienetas, kam taikomas minimumas, ar jis apima atvykimą, papildomos medžiagos ir jų parūpinimas, mokesčių pagrindas, neįtraukti darbai bei pasiūlymo galiojimas. Nežinomų punktų neskaičiuoti kaip nulio. Keli darbai vienoje užklausoje savaime neįrodo vieno atvykimo ar vieno minimumo.

[Šeši kontroliniai atvejai](CHECK_CASES.json) dokumentuoti būsimai esamo proceso patikrai; siūloma iki 1 agento darbo valandos riba be naujų prenumeratų. Atvejai **nevykdyti**, vykdytojui neperduoti ir nesukuria atskiro bandomojo įgyvendinimo mandato. Priėmimas: priedas prie darbo kainos atskirtas nuo viso vizito minimumo; atvykimas nepridedamas du kartus; medžiagos ir kelionė neišgalvojamos; konkurento kaina nepaverčiama mūsų pasiūlymu; netinkami darbai lieka už apimties ribų. Skaitinė aritmetika pati neįrodo agento elgesio ar tikro sandorio.

Stabdyti galutinį kainos palyginimą, jei neaiški minimumo apimtis, mokesčiai, vizitų skaičius ar darbų priėmimas. Toliau rinkti nepriklausomą poreikio informaciją. Bandymą stabdyti po valandos, prireikus naujos mokamos paslaugos, realaus kliento duomenų ar kito vykdytojo failų keitimo.

## Ekonomika ir alternatyvos

Vienas bendras vizitas galėtų sumažinti dubliuojamus atvykimo kaštus, jei tas pats vykdytojas priimtų visus darbus. Dabar nežinomi jo pajėgumai, medžiagų sąnaudos, marža, mūsų atlygis, klientų mokėjimai ir sutaupytas laikas. Vykdytojo sąskaitos suma nėra MB Pinet pajamos. Medžiagų kompensavimas nesukuria patvirtinto mūsų komisinio. Naujo įkainio ar pelno prognozės nėra; faktinės DI ir darbo sąnaudos neišmatuotos.

Alternatyvos: palikti esamą poreikio registravimą; vėliau prašyti vieno vykdytojo visos priimtos apimties kainos; dalyti darbus tarp specialistų, išsaugant atskirus vizitus ir minimumus. Dabartinė pirmenybė — esamas sąrašo modelis su aiškiomis pasiūlymo sąlygomis, be naujos sistemos. Modelį tikslinti, jei realūs partneriai neprisiima mišrių darbų arba bendro vizito ekonomika nepadengia mūsų ir jų sąnaudų. Nepakankamas lankomumas dar neįrodo paklausos nebuvimo.

## Tęstinumas

Šio ciklo pradžioje abiejų repo bazės atsiliko nuo naujo main. Į savo šaką be konfliktų integruotas aktualus core main; companion naudota nauja švari nuosava darbo kopija, išsaugant kito vykdytojo pakeitimus. Perskaitytos naujos kalbos taisyklės ir atlikta atskira viso šio galutinio teksto saviredakcija. Viešas turinys ir jo patvirtinimai nekeisti.

Naujausi peržiūrėti tiesioginiai savininko root/core pavedimai nesuteikia šios sesijos pending bandymų approval. BDEV-0002 ir P1–P4 būsenos nepakeistos. Šiai nišai ACQUISITION failo dabartiniame Git inventoriuje nerasta; tai neužbaigtos dokumentacijos faktas, ne naujai audituota paleidimo kliūtis ar leidimas ją perrašyti. Svetainių, agentų vykdymo, FB, klientų pašto, DNS, paskyrų ir kampanijų nekeitėme. [Šaltiniai](SOURCES.json), [patikra](QA.json).
