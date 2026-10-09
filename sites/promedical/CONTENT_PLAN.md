# Promedical SEO / GEO turinio planas

2026-10-09. promedical.lt, LT / lt-LT, Europe/Vilnius. Skirta ligoninių, poliklinikų, slaugos ir kitų medicinos įstaigų pirkėjams. Artimiausias naudingas rezultatas – konkrečios Klaro įrangos modelių, kiekių ir komplektacijos užklausa; mokamas rezultatas – įrangos užsakymas. Kontaktai sales@promedical.lt, +370 686 88369. Viešas prekės ženklas / autorius Promedical, be išgalvoto juridinio asmens ar eksperto.

## SEO ir GEO būsena

| Sritis | Atlikta | Praktinė riba |
| --- | --- | --- |
| Techninis SEO | Canonical, title/description, H1, kalba, sitemap/robots, breadcrumbs, tikrą matomą turinį atitinkančios Product/Article/Organization schemos | Patikrinta vietinėje versijoje: [SEO_REGRESSION.json](SEO_REGRESSION.json), [SITE_RENDERED.json](SITE_RENDERED.json). |
| Turinys | 1 408 realūs modeliai, 437 kategorijos, 34 šakos, 11 informacinių puslapių, tarp jų 3 gidai | 1 856 patvirtintos revizijos su tikrais parametrais, nuotraukomis ir šaltiniais; [CATALOGUE_IMPORT.md](CATALOGUE_IMPORT.md). |
| GEO pagrindas | Matomi atsakymai, šaltiniai, autoriaus/metodikos puslapis, patvirtinto turinio LLM išvestys | llms.txt yra papildoma skaitymo priemonė. [Google gairės](https://developers.google.com/search/docs/appearance/ai-features) nereikalauja specialios AI bylos ar schemos ir negarantuoja indeksavimo / citavimo. |
| Viešas matavimas | Naujoji versija dar neįdiegta viešame domene | GSC / GA4 prieiga nenustatyta; indeksavimas, pozicijos, organinės užklausos ir AI citavimas nežinomi, ne nulis. SMTP / tikras INBOX atskiras paleidimo vartas. |
| Kategorijų ketinimų auditas | Visas inventorius sutapatintas su realiais ID / revizijomis | Neatliktas visų 437 kategorijų LT Google sinonimų / ketinimų auditas. A–Z F3 lieka UNVERIFIED; panašus vertimas savaime nėra sujungimo pagrindas. |

Tai vietinio įgyvendinimo ir planavimo būsena. [SITE_COMPLETION.json](SITE_COMPLETION.json) tebėra NOT_COMPLETE dėl neišspręstų audito vartų; turinio planas jų neuždaro.

## Tyrimas ir svarbiausi sprendimai

Atliktos 8 nemokamos Treg `tinyfish.web.search` paieškos: 4 kontekstinės ir 4 tikslios pagrindinės („medicininiai vežimėliai“, „procedūriniai vežimėliai“, „ISO modulinė sistema“, „Mayo staliukas“). Faktinė kaina 0 USD. Atsakymai nepatvirtina efektyvaus Lithuania / lt filtro ar Google variklio: tai GLOBAL/und šaltinių / puslapio formato duomenys, ne LT Google pozicijos ar apimtis. Neužklaustos variacijos žemėlapyje pažymėtos; apimtis visur null.

Pirminiai šaltiniai perskaityti, raw / call IDs / laikas / kainos / SHA saugomi privačiai. 27 stebėjimų SEO bundle importuotas kanoniniu `seo-research.mjs`; aktualūs source/crawl, keywords/serp/backlinks/geo/analytics neišmatuoti arba neprijungti. Tyrimo formato freshUntil 2026-11-09; konkretaus modelio ar teisinio teiginio šaltiniai tikrinami prieš tekstą. CPO tiesioginis HTTP bandymas „terminated“ išsaugotas kaip failed; atskiras tikras web įrankio eksportas saugomas atskirai, jo nevadiname tiesioginio HTTP sėkme.

| Sprendimas | Perskaitytas pagrindas | Pasekmė planui |
| --- | --- | --- |
| Stiprinti katalogus ir paskirties pasirinkimą | plan-exact-0/1, [Rehastar kategorija](https://www.rehastar.com/medicinai/multifunkciniai-vezimeliai/proceduriniai-vezimeliai-su-lentynomis), [Diamedica paskirties puslapis](https://www.diamedica.lt/produktas/produktai/medicinine-iranga-ir-priemones/Vaistu-skyrimui-ir-slaugai/) | Patvirtinta modelio / komplektacijos funkcija; bendri apibrėžimų straipsniai negauna pirmo prioriteto. Konkurentų savybių neperkeliame į Klaro. |
| Atskiras Mayo palyginimo gidas | plan-exact-3, plan-search-2, [Klaro instrumentų šeima](https://www.klaro.cz/en/kategorie-instrumentacni-voziky), [Ami produkto puslapis](https://www.amis.lt/produktas/produktai/medicinos-iranga/anestezijos-ir-operacines-iranga/mayo-staliukas/) | Katalogas randa vieną iš 8 tikrų Klaro modelių; gidas padės palyginti jų reguliavimą, padėklą ir važiuoklę pagal Klaro dokumentus. |
| ISO aiškiai medicininio laikymo kontekste | plan-exact-2 / plan-search-1, [Klaro ISO sistema](https://www.klaro.cz/en/iso-modul-system) | Bendro termino rezultatai turi kitų prasmių. Esamą gidą papildyti krepšio perdavimo keliu; nekurti dar vieno panašaus gido. |
| Neutralūs palyginimo ruošiniai | [CPO baldų katalogas](https://katalogas.cpo.lt/kategorijos/F23-75-KMB/), [VPT priemonių indeksas](https://vpt.lrv.lt/lt/naujienos-3/pagalbines-priemones-pirkimu-vykdytojams/) | Oficialūs pavyzdžiai padeda parinkti laukus, bet jų tolerancijos, garantija ar sutartis nėra mūsų pažadas ar universali teisės išvada. |
| Modelio ir dokumento tapatybė | [Klaro instrukcijų paieška](https://www.klaro.cz/en/navody-pdf-2186), [medžiagų paaiškinimas](https://www.klaro.cz/en/druhy-nerezove-oceli) | Dalies identifikavimas naudingas dabar; valymo dokumentų gidas priklauso nuo tikros konkretaus modelio instrukcijos, be universalių režimų. |

## Užklausa → puslapis

[CONTENT_MAP.json](CONTENT_MAP.json) saugo visą 34 šakų, 21 papildomo klausimo ir 8 naujų gidų žemėlapį su actual page IDs, pilnais dabartinės / patvirtintos revizijos hash, įrodymų būsenomis ir veiksmais. Tai pilna savininko patvirtinto katalogo apimtis, ne išmatuotas raktažodžių sąrašas.

| Klausimas / skaitytojo sprendimas | Kanoninis tikslas | Veiksmas |
| --- | --- | --- |
| Klaro pristatymas / katalogas | / ir /produktai | Išlaikyti skirtingą pristatymo ir konkretaus modelio radimo darbą. |
| Medicininiai vežimėliai | /kategorijos/zakladni-voziky | Papildyti šeimų atranką ir paskirties nuorodas; aiškus priemonių, ne pacientų mobilumo, kontekstas. |
| Procedūriniai, vaistų, tvarstymo, anesteziologiniai vežimėliai | /kategorijos/voziky-s-prislusenstvim → tikros BASIC / PROFI paskirties šakos | Pasirinkimo blokai ir šeimų nuorodos; naujų sinonimo URL nereikia. |
| Kaip pasirinkti medicininį / procedūrinį vežimėlį; BASIC ar PROFI | /gidai/medicininio-vezimelio-pasirinkimas | Papildyti esamą gidą, sujungti sinoniminius klausimus. |
| ISO komponentai / moduliniai krepšiai | /kategorijos/iso-modul-system ir /kategorijos/iso-skrine-kose | Tikras modelio pasirinkimas, atskirai nuo sistemos paaiškinimo. |
| ISO sistema / krepšio perkėlimas / vardinis dydis | /gidai/iso-moduliu-sistema | Papildyti esamą suderinamumo kelią; vardinis matmuo nėra universalaus suderinamumo įrodymas. |
| Mayo staliukas / instrumentų staliukai | /kategorijos/kategorie-instrumentacni-voziky | Katalogas modeliams; naujas gidas tik palyginimo darbui. |
| Vežimėlio techninė specifikacija / įrangos pirkimo užklausa | /gidai/irangos-pirkimo-uzklausa | Papildyti esamą neutralų ruošinį; ne dubliuojantis „viešųjų pirkimų“ straipsnis. |
| Medicininių vežimėlių kaina | /kontaktai ir konkretaus modelio užklausa | Tikras kodų / kiekių / komplektacijos veiksmas; neišgalvoti kainoraščio ar likučių. |
| Tikslus unikalaus modelio kodas | /produktai/<actual-slug> | Išlaikyti tikro produkto parametrus ir šaltinį. |
| Klaro PLV150 | /produktai paieška → abu realūs modelių URL | SKU nėra unikalus; įprastas ir specialiai gamintojo pažymėtas įrašai turi skirtingus ID / URL. |

## Visos 34 katalogo šakos

P1 – artimiausias komercinis pasirinkimo teksto darbas, P2 – kitas naudingas blokas, P3 – inventoriaus išlaikymas / konkrečių klausimų patikra. Hash čia sutrumpintas skaitymui; pilnas CONTENT_MAP.json. Privatus `all-category-reconciliation.json` sutapatina visas 437 source kategorijas pagal tikras šaltinių nuorodas; nestandartiniai URL neatspėjami. Vienas modelis gali priklausyti kelioms šakoms, todėl šakų modelių skaičiai nėra sudedami kaip unikalūs produktai.

| Katalogo šaka / pagrindinė užklausa | Kanoninis URL | Prioritetas | Actual page ID / public revision |
| --- | --- | --- | --- |
| Gamintojo specialiųjų pasiūlymų asortimentas; „Klaro gamintojo specialiųjų pasiūlymų asortimentas“ | /kategorijos/akcni-nabidky | P3 | 3ebd53df-6425-4459-89c7-efc80aa90517 / cd9e2a8aa75d |
| Gamyba pagal individualų poreikį; „Klaro individualios gamybos pavyzdžiai“ | /kategorijos/atypicka-vyroba | P3 | 9ae5d5dc-a7a5-4e1f-bb60-e03f5b7953e0 / 92e91341b747 |
| InfuFlex – sulankstomas infuzijų stovas gelbėjimo tarnyboms ir išvažiuojamųjų paslaugų darbuotojams; „InfuFlex infuzijų stovas“ | /kategorijos/infuflex-page | P3 | f5c15774-f5a8-406d-bd92-8be52105a5da / dfec2ab5e2b8 |
| ISO modulių sistema; „ISO moduliai medicinos įstaigoms“ | /kategorijos/iso-modul-system | P1 | a37bd56e-e0e1-4642-98c9-380c7fe2fe1a / 490c9cd7c89b |
| Instrumentų vežimėliai; „Mayo staliukas“ | /kategorijos/kategorie-instrumentacni-voziky | P1 | cb2d6321-e3d3-4af7-ac59-888fcadee878 / 7291f0e43cf5 |
| Laboratorijos ir vaistinės; „Klaro laboratorijų ir vaistinių įranga“ | /kategorijos/laboratore-a-lekarny | P2 | 9f71457b-2763-4c0a-a5fc-64b37bc9f9c3 / cc6b62ce502b |
| Skalbinių ir atliekų tvarkymas; „skalbinių ir atliekų vežimėliai“ | /kategorijos/manipulace-s-pradlem-a-odpadem | P1 | 50d9c392-b7f4-4f56-b73e-05c2fd5af502 / 4b77ce9c42cd |
| Daugiafunkciai vežimėliai; „daugiafunkciai medicininiai vežimėliai“ | /kategorijos/multifunkcni-voziky | P2 | 512d935d-e8db-4769-8a77-9658817709e5 / 17cbaf16629a |
| Palatų aptarnavimas ir slauga; „Klaro palatų aptarnavimo įranga“ | /kategorijos/obsluha-pokoju | P2 | 6a190b84-5d32-4303-a645-6369d3510966 / 3efbb3765c3f |
| Vežimėliai su padėklais; „Klaro padėklų vežimėliai“ | /kategorijos/plata | P2 | b70cac62-5b36-42fa-a397-56abdf22675a / c4411f525563 |
| Informacija; „Klaro naudojimo informacija“ | /kategorijos/pouziti | P3 | 6d22a505-c8fa-4d56-9793-ba473af6ad2f / 7048cce6167b |
| Vežimėlių priedai; „Klaro vežimėlių priedai“ | /kategorijos/prislusenstvi | P1 | 38c2f68b-715f-496b-85a6-8336af5b1fc0 / 4417b1ffbe13 |
| Sveikatos priežiūros skaitmenizavimo sprendimai; „Klaro skaitmenizavimo gaminiai“ | /kategorijos/produkty-pro-digitalizaci | P3 | 83bf80e0-8682-4669-85d7-cd9e2674218c / 5ca478c18a5a |
| Operacinių įranga; „Klaro operacinių įranga“ | /kategorijos/produkty-pro-operacni-saly | P2 | 800e3137-1b0a-4146-8489-1a5abedbc065 / b903bc371e40 |
| Sterilizavimo įranga; „Klaro sterilizavimo įranga“ | /kategorijos/produkty-pro-sterilizaci | P2 | 5bd3cd49-7d2d-4049-aa87-25816c24057e / c20d48363944 |
| Triukšmą ir slydimą mažinantys įdėklai; „Klaro padėklų įdėklai“ | /kategorijos/protihlukove-a-protiskluzove-podlozky | P3 | 6e5ac724-77c7-4eb6-b1b2-734aee5ba1f2 / a2652eca1e4d |
| Stelažai; „medicininiai stelažai“ | /kategorijos/regaly | P2 | ccc9e302-dba5-4962-b42c-405217a11058 / 2850be8a483f |
| REGO laikymo sistema; „REGO laikymo sistema“ | /kategorijos/rego-cz | P2 | f1961070-587f-4828-bc3e-b7a058c95cda / eeda3a0d6296 |
| Spintos; „medicininės spintos“ | /kategorijos/skrine | P1 | 8b824a50-5649-467a-bab0-348b50b3f0e1 / 4189705258f9 |
| Specialios paskirties medicininiai vežimėliai; „specialios paskirties medicininiai vežimėliai“ | /kategorijos/specialni-voziky | P2 | 2e74b9ea-8bf9-4d2d-b59d-190b86da4c73 / 012909010282 |
| Stovai, laikikliai ir pakabos; „medicininiai stovai ir laikikliai“ | /kategorijos/stojany-a-drzaky | P2 | 3d65fc86-766b-48c2-9963-8ef1e0392bb0 / 0cfeae0075cf |
| Stalai; „nerūdijančio plieno medicininiai stalai“ | /kategorijos/stoly | P1 | 3913b8f6-c942-4a51-8c68-226fb4d587dc / 3ba002848350 |
| Atsarginės dalys; „Klaro atsarginės dalys“ | /kategorijos/uklid-nahradni-dily | P1 | 4c81ecf1-beab-41f2-a0ca-c559c14117ba / 9e3cf6c00266 |
| Valymo įranga; „Klaro valymo įranga“ | /kategorijos/uklidove-vybaveni | P2 | 68a80e72-c334-49aa-b8a1-3ccaba569760 / 49e2cef9e9b9 |
| Didelės talpos plovimo mašinos; „Klaro didelės talpos plovimo mašinos“ | /kategorijos/velkokapacitni-mycky | P3 | b04f69cb-c4fb-4595-b43b-158ebdad1627 / 9d35e7133ab9 |
| Kitų paskirčių vežimėliai; „Klaro kitų paskirčių vežimėliai“ | /kategorijos/voziky-do-ostatnich-provozu | P3 | ffe8a7e1-cbeb-4f46-8ecd-899fae156cff / 6a695b23a415 |
| Vežimėliai su priedais; „procedūriniai vežimėliai“ | /kategorijos/voziky-s-prislusenstvim | P1 | 6733765c-7a6a-46ab-9d24-ffdc63381285 / 2bd1ba0fb966 |
| Transportavimas ir sandėliavimas; „Klaro transportavimo ir sandėliavimo įranga“ | /kategorijos/vybaveni-pro-manipulaci-a-skladovani | P2 | b324045c-a9cf-4293-86a4-96cf295691ca / f58303c373a9 |
| Patalpų aptarnavimas ir slauga; „Klaro patalpų aptarnavimo įranga“ | /kategorijos/vybaveni-pro-obsluhu-pokoju | P2 | 4a2d2418-3318-4a8a-af31-84a404ca5e69 / 51d60da12b4c |
| Didelės talpos plovimo mašinų įranga; „Klaro plovimo mašinų įranga“ | /kategorijos/vybaveni-pro-velkokapacitni-mycky | P3 | 13c50626-aff6-437f-abba-41e0f2651469 / fa9cb7b67fa0 |
| Didelės talpos plovimo įrenginių priedai; „Klaro plovimo įrenginių priedai“ | /kategorijos/vybaveni-pro-velkokapacitni-mycky-prehled | P3 | b20c1563-e4e0-49fd-8955-772c8d28665e / 1d7e72c5cad4 |
| Gamintojo išpardavimo asortimentas; „Klaro gamintojo išpardavimo asortimentas“ | /kategorijos/vyprodej-hlavni-menu | P3 | 8ebc04dd-bcf8-43c7-8023-7493b622ee32 / d669ebb364a7 |
| Moduliniai vežimėliai; „medicininiai vežimėliai“ | /kategorijos/zakladni-voziky | P1 | 0acac5b1-c78e-4621-9f09-aedcab129015 / 525cee411d51 |
| Medicininiai baldai; „medicininiai baldai“ | /kategorijos/zdravotnicky-nabytek-prehled-hlavni | P2 | d6f6d553-0d3a-487e-8597-d359af5e52d0 / edb77a463c90 |

Pagalbinės gamintojo „akcijų“, išpardavimo, plovimo priedų ir panašiai pavadintos slaugos šakos neišnyksta iš inventoriaus ir nesukuria mūsų nuolaidų ar naujų sinonimų straipsnių. Galimam sujungimui reikia realaus modelių / funkcijos / paieškos duomenų palyginimo; ši užduotis neperadresuoja URL ir F3 neuždaro.

## Pirmasis parengimo etapas

Pirmiau papildyti 3 jau esančius gidus ir P1 kategorijų pasirinkimo tekstus. Ši planavimo užduotis esamų tekstų neperrašo; išsaugotas jų actual ID ir patvirtintas hash. Pakeitimams reikės įprasto edit → actual review → approval → release.

| Privataus parengimo orientyras | Naujas gidas | Originalus indėlis / prioritetas |
| --- | --- | --- |
| 2026-10-23 | Bazinis vežimėlis ir priedai: kaip patikrinti komplektaciją | P1. Dviejų tikrų modelių bazinių / pasirenkamų eilučių pavyzdys ir kontrolinis sąrašas. |
| 2026-10-30 | Kaip pasirinkti Mayo instrumentų staliuką | P1. NEREZ1101 / NEREZ1120 / NEREZ1135 parametrų palyginimo pavyzdys, tikrinant matmenų tipą, reguliavimą ir apkrovų kontekstą. |
| 2026-11-06 | Kaip rasti Klaro atsarginę dalį pagal įrangos kodą | P1. Žymėjimas → kodas / nuotrauka → modelio dokumentas → užklausa; jokio universalaus suderinamumo. |
| 2026-11-13 | Medicininės spintos pasirinkimas: talpa, moduliai ir prieiga | P2. Matavimo / talpos darbo lapas, atskiriant išorės matmenis nuo naudingo vidaus. |
| 2026-11-20 | Kaip aprašyti nerūdijančio plieno stalo poreikį | P2. Stalviršio, apatinės dalies, plautuvės ir medžiagos poreikio ruošinys. |
| 2026-11-27 | Kaip pasirinkti skalbinių ir atliekų vežimėlio komplektaciją | P2. Maišų / laikiklių, talpos ir logistikos palyginimo klausimai; ne įstaigos atliekų tvarkymo reglamentas. |
| 2026-12-04 | Kaip patikrinti medicininės įrangos valymo dokumentus | P3. Dokumentų tapatybės seka; tikra modelio instrukcija būtina, dezinfekavimo receptų nėra. |
| 2026-12-11 | Įrangos komplekto priėmimas: ką sutikrinti su užsakymu | P3. Neutralus modelio / kiekio / priedų / instrukcijų sutikrinimo ruošinys; be mūsų garantijų ir teisinių terminų. |

8 pilni konkrečių gidų užduočių aprašai yra native V1 [CONTENT_PLAN.json](CONTENT_PLAN.json), materializuoti kanoniniu mergePlan / editPage kaip **privatūs tušti planai**. Kiekvienas turi actual page ID, pirminio puslapio ryšį, netrumpintą reason (<1 000 ženklų), sourceQueries, tikras vidinių nuorodų tapatybes ir dar nepatvirtintus šaltinių kandidatus. Visa apimtis nėra schemos 24 puslapių partijos limitas ar rašymo kvota.

Pirmas rengiamas naujas release – tik P1 trys gidai, po tikrų modelių dokumentų / medijos / revizijos peržiūros. Jiems nereikia būsimų P2 / P3 gidų. Gidų indeksą ir susijusias kategorijų nuorodas papildyti kartu su jų publikavimui skirta peržiūrėta revizija. Būsimų ryšių grafas privatus; dabartiniuose patvirtintuose puslapiuose naujų href nėra.

Visos temos evergreen, seasonalHook tuščias. Datos – individualūs parengimo orientyrai esamame 6 mėnesių lange, ne publikavimo, indeksavimo ar pirkimų sezono pažadas. Nauja automatika neįjungta. Istorinis contentPolicy 6 mėn. / monthly 1 išlaikytas kaip suderinamumo metadata, jo autopilot nevykdomas ir papildomi tekstai kvotai užpildyti neplanuojami. Šiame V1 nėra coverage-driven policy režimo; pilną apimtį ir individualias datas apibrėžia šis konkretus planas.

## Ankstesnių idėjų suderinimas

Ankstesni 6 pasiūlymai buvo dokumento lentelė, ne Studio puslapiai: prieš šį darbą visi 1 856 puslapiai buvo patvirtinti ir nepatvirtintų planų nebuvo. Git istorija išsaugota; patvirtintos datos nepakeistos.

| Ankstesnis pasiūlymas | Sprendimas dabar |
| --- | --- |
| 2026-10-23 bazinis vežimėlis / priedai | Išlaikyta data ir atskiras komplektacijos darbas. |
| 2026-11-20 atsarginės dalies kodas | 2026-11-06 orientyras dėl tiesioginės kodo užklausos vertės ir prieinamos instrukcijų paieškos. |
| 2026-12-18 valymo suderinamumas | 2026-12-04 orientyras, susiaurintas į dokumentų patikrą; instrukcija būtina. |
| 2027-01-22 krepšio perkėlimas | Esamo ISO gido papildymas, naujo URL nėra. |
| 2027-02-19 plieno stalo poreikis | 2026-11-20 orientyras: tikras katalogas ir atskiras ruošinys. |
| 2027-03-19 komplekto priėmimas | 2026-12-11 orientyras: neutralus sutikrinimas, ne nepatvirtintos tiekimo / garantijos sąlygos. |

## Matavimas po tikro paleidimo

SEO: tikras domenas / canonical / sitemap / robots ir GSC property prieiga, tada indekso būsena bei page/query ataskaitos su LT šalies, datų, įrenginių filtrais. Kohortos: brand, tikslus modelis, paskirties katalogas, pasirinkimo gidas. Fiksuoti faktinę deployment / revizijos datą ir duomenų apribojimus; indeksavimo termino nežadėti.

Verslas: atskirti formos išsaugojimą, tikrą pristatymą, tinkamą modelio / kiekio / paskirties užklausą, pasiūlymą ir užsakymą. Kortelės paspaudimas ar gido skaitymas nėra užsakymas. Vidiniai ir sintetiniai bandymai nėra klientų paklausa.

GEO: saugoti tikrą variklį / paviršių, requested ir effective rinką / kalbą, web-search režimą, laiką, šviežią pakartojimą, raw atsakymą ir cituotus URL. Pradiniam rankiniam palyginimui pasirinkti pirmus 4 klausimus, po 2 naujus bandymus kiekviename prieinamame variklyje. Tai siūlomas matavimo metodas; bandymų dar nėra, mokamas ar periodinis monitoringas neįjungtas. Replayed atsakymas nėra naujas mėginys. Skaičiuoti cituotus sėkmingus atsakymus / visus sėkmingus mėginius ir failures / attempts atskirai kiekvienam varikliui, ne kaip visos Lietuvos matomumą.

| Fiksuotas nebrand klausimas | Tikslinis skaitytojo darbas |
| --- | --- |
| Pagal ką pasirinkti procedūrinį vežimėlį poliklinikos kabinetui? | Esamas atrankos gidas / paskirties katalogas. |
| Kaip patikrinti, kas įeina į medicininio vežimėlio komplektaciją? | Naujas komplektacijos gidas. |
| Kokius parametrus palyginti renkantis Mayo instrumentų staliuką? | Naujas Mayo gidas / tikri modeliai. |
| Kaip paruošti palyginamą medicininės įrangos pirkimo užklausą? | Esamas pirkimo ruošinys. |
| Kaip patikrinti ISO krepšio, spintos ir vežimėlio suderinamumą? | Esamas ISO gidas. |
| Kokią informaciją pateikti ieškant medicininio vežimėlio atsarginės dalies? | Naujas detalės tapatybės gidas. |
| Kaip aprašyti nerūdijančio plieno darbo stalo poreikį medicinos įstaigai? | Naujas stalo poreikio ruošinys. |
| Kaip rasti konkrečiam įrangos modeliui taikomą valymo instrukciją? | Dokumentų patikros gidas tik po priklausomybių patikros. |

Brand diagnostika atskirai: „Kur rasti Klaro PLV150 variantų techninius duomenis?“ ir „Kaip susisiekti su Promedical dėl konkrečios Klaro komplektacijos?“. Jie neįtraukiami į nebrand rekomendavimo rezultatą. Paminėjimas, citata ir rekomendacija yra skirtingi įvykiai; oficialios Google / Bing property ataskaitos tikrinamos pagal actual prieigą, nepriskiriant neegzistuojančio adapterio kaip prijungto.

## Patikra ir perdavimas rašytojui

[CONTENT_PLAN_VERIFICATION.json](CONTENT_PLAN_VERIFICATION.json): native laukai, 8 unikalūs URL, tikri pirminių / nuorodų puslapių ID, datos / timezone ir tušti seasonalHook / networkLinks patikrinti. Visos ankstesnės 1 856 revizijos, approval, datos ir snapshot nepakitę; viešoje projekcijoje tebėra 1 856 puslapiai. Naujų tekstų, approval, release ar deployment šis darbas neatliko.

Actual generator.mjs draftPage perduoda reason, sourceQueries, linkSuggestions ir externalLinks į bendrą buildEditorialPrompt. Patikrintas surinktas visų 8 užduočių prompt JSON: šie laukai ir aktualus seoResearch išlieka be trumpinimo. **CLI teksto rašytojas nevykdytas.** Pilno planningBrief / reconciliation adapterio šiame V1 nėra, todėl pilno kategorijų kryžminio žemėlapio nevadiname integruotu planningBrief; jo apimtis išlieka dokumente / CONTENT_MAP, o konkretūs gidai naudoja esamus native laukus. Naujo per-domain importuotojo ar publikavimo sistemos nėra.

Tarp nuosavų domenų nėra būtino konkretaus šios įrangos atrankos tikslo, todėl networkLinks = []. Pirminiai šaltiniai nepakeičiami savų svetainių reklama. Tolesnis tekstas / medija / review / release naudoja CONTENT_CORE; planas neįjungia laiškų siuntimo, mokamų tyrimų ar periodinių užduočių.
