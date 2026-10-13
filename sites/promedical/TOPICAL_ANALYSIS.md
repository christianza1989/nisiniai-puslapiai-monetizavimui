# Promedical topical authority: Treg analizė ir sprendimai

2026-10-09. Tikslas: Lietuvos ligoninių, poliklinikų, slaugos ir kitų gydymo įstaigų darbuotojui padėti pasirinkti Klaro baldus / vežimėlius ir parengti palyginamą užklausą. Rezultatas – [57 temų, 11 grupių planas](CONTENT_PLAN.md), paremtas dabartiniu 1 408 modelių ir 437 katalogo kategorijų pasiūlymu bei tikrais duomenimis. Topical authority čia reiškia nuoseklų temos išplėtojimo planą; pasiektas Google ar AI autoriteto balas nematuotas.

## Tyrimo apimtis, kaina ir kilmė

| Duomenys | Faktinis rezultatas | Taikymo riba |
|---|---|---|
| Google SERP | 46 mokami bandymai, 45 gauti; mobile / Android, gylis 10, LT 2440 / lt | Vienos dienos imtis; 1 tiekėjo klaida palikta |
| Google Ads apimtis per DataForSEO | 172 frazės: 5 skaitinės teigiamos, 167 null, 0 aiškių nulių | Neprieinami duomenys nėra nulinė paklausa |
| Susijusios frazės | 3 užklausos, 1 / 10 / 0 grąžintų eilučių | Didelė dalis susijusių žodžių neatitinka pasiūlymo |
| Konkurentų domenų frazės | 4 domenai, 337 grąžintos eilutės | Bounded database imtis; ne visos jų temos ar SERP |
| AI atsakymai | 4 klausimai × ChatGPT / Gemini = 8 | Lietuvių kalba stebėta; efektyvi LT geografija nepatvirtinta |
| Pirminiai šaltiniai | Gamintojo puslapiai / dokumentų vietos, oficialūs rinkos kodai, VPT | Šaltinio kandidatas netampa patvirtintu modelio faktu savaime |

**Faktiškai nuskaityta 0,33176 USD už 62 užklausas**, iš savininko patvirtintų iki 0,40 USD. Mokamų pakartojimų nebuvo; atsiskaitymo būsena aiški, rezervuota suma 0. Ankstesnio nemokamo bandomojo tyrimo 0 USD ir jo istorija išsaugoti atskirai. Viena apmokėta SERP užklausa „medicininės įrangos valymas“ grąžino tiekėjo task 40101, todėl jos nelaikome tuščia paieška ar rinkos nebuvimu.

Privačiame duomenų kataloge 'content-studio/data/promedical-topical-research-20261009' yra kiekvienos užklausos request / response MCP eksportas, callId, faktinis atsiskaitymo žurnalas, autorizuotas manifestas, mėnesių istorija, organinės SERP eilutės, visi gauti konkurentų įrašai ir AI atsakymai. Tai struktūrinių įrankio atsakymų eksportai, ne pirminiai HTTP baitai. Oficialus didelis vietovių CSV manifestui suspaustas be nuostolių, paliekant originalo hash. Ankstesnio pilotinginio autorizacijos laiko spėjimo pataisa pažymėta atskirai; istoriniai duomenys neperrašyti.

Kanoniškai importuoti 89 privatūs SEO stebėjimai; įrodymų SHA-256 '42dd50f6d7a0a8c7a9f0eaa53a73c00b538948cb627594a4aa06a2e956744dde'. Tikros LT source / crawl / keywords / SERP rūšys prieinamos. GEO įrašai pažymėti 'unsupported_market', nes efektyvi šalis nepatvirtinta. Backlinkų / GSC / GA4 dabartinės svetainės rezultatų nėra. Žemėlapio JSON laiko įrodymų IDs ir revizijas, o privatūs originalai nėra publikuojami svetainėje.

## Ką iš tiesų rodo paklausa

| Frazė | Grąžintas vidutinis paieškų skaičius / mėn. | Intencijos pastaba |
|---|---:|---|
| medicininiai baldai | 30 | Tiesioginis katalogo ar pasirinkimo kontekstas |
| nerūdijančio plieno stalai | 320 | Restoranų / pramonės intencija persidengia |
| transportavimo vežimėliai | 90 | Pacientų / pramonės intencija persidengia |
| valymo vežimėliai | 40 | Tiesioginis katalogo ar pasirinkimo kontekstas |
| nerūdijančio plieno valymas | 20 | Bendra priežiūros frazė; medicininis taikymas neįrodytas |

Apimties skaičiai nesumuojami tarp sinonimų. „Konkurencija“ Google Ads atsakyme yra reklamos, o ne organinio reitingavimo sudėtingumas. 167 null eilučių negalima užpildyti nuliais ar iš jų apskaičiuoti būsimo srauto. Užklausai „ligonio staliukas virš lovos“ konkurento bazė grąžino 50/mėn. ir poziciją 4 (SERP atnaujinta 2026-09-20); tai istorinis DataForSEO Labs duomuo, o ne naujos tiesioginės paieškos stebėjimas ar papildomas Ads matavimas.

Medicininių baldų pirkimai yra siaura B2B užduotis. Todėl 57 skirtingų sprendimų pagrindas yra tikras platus gamintojo katalogas ir pirkėjo pasirinkimo žingsniai. Tai redakcinė hipotezė dėl informacijos naudos, kai skaitinė paklausa neprieinama. Išsaugota mėnesių istorija nepatvirtino atskiro medicininių baldų pirkimų sezono; jokios išgalvotos sezoninės datos nepriskirtos.

## SERP intencija ir atskiri URL

| Frazė | Stebėjimas | Pirmos organinės paskirties vietos |
|---|---|---|
| medicininiai vežimėliai | full-serp-0 | [mprekyba.lt](https://mprekyba.lt/produkto-kategorija/medicininiai-baldai/page/49/), [www.teida.lt](https://www.teida.lt/visos-prekes/baldai-ir-darbo-priemones/medicininiai-transportavimo-vezimeliai), [www.rehastar.com](https://www.rehastar.com/medicinai/vezimeliai-medicinos-prietaisams) |
| Mayo staliukas | full-serp-8 | [www.senmed.lt](https://www.senmed.lt/category/medicininiai-baldai/instrumentu-staliukai-mayo/), [www.amis.lt](https://www.amis.lt/produktai/produktai/medicinos-iranga/anestezijos-ir-operacines-iranga/operacininiai-stalai/), [www.rehastar.com](https://www.rehastar.com/medicinai?page=7) |
| ISO moduliai | full-serp-12 | [www.elstila.lt](https://www.elstila.lt/en/334-solar-modules), [www.solisinverters.com](https://www.solisinverters.com/lt/accessories6), [programastatybai.lt](https://programastatybai.lt/imones-svetaine/?sid=1761) |
| nerūdijančio plieno stalai | full-serp-20 | [www.saltojibanga.lt](https://www.saltojibanga.lt/produktai/nerudijancio-plieno-baldai/nerudijancio-plieno-stalai/), [www.plienobaldai.lt](https://www.plienobaldai.lt/main), [www.alio.lt](https://www.alio.lt/paieska/nerudijancio-plieno-stalai/) |
| medicininės spintos | full-serp-5 | [guido.lt](https://guido.lt/katalogas/metaliniai-baldai/medicinines-spintos/medicinines-spintos-medicinines-spintos/), [mprekyba.lt](https://mprekyba.lt/produkto-kategorija/medicininiai-baldai/medicinines-spintos-ir-spinteles/), [sversa.lt](https://sversa.lt/medicinines-spintos/) |

2026-10-09 rezultatų imtyje bendrų vežimėlių ir baldų paieškoje matomi katalogai bei gaminių puslapiai. Komercinės bendrinės frazės nukreipiamos į esamą kategoriją; „kaip pasirinkti“, suderinamumo, komplektacijos ar matavimo užduotys turi atskirą gidą. Kategorijos ir gido tekstas negali kartoti to paties atsakymo. Senų 437 kategorijų šaltinių / esamų URL sutapimas patikrintas; visų jų tarpusavio aliasų Google intencijos konsolidavimas nėra užbaigtas F3 auditas.

**172 frazių → URL sprendimai** saugomi [CONTENT_MAP.json](CONTENT_MAP.json). Atskirai pažymėti tikri modelių NEREZ1101 / PLV150 URL, serijų navigacija, į vieną gidą sujungti ratukų / stabdžių / matmenų variantai, spintų durų bei lentynų klausimai, valymo dokumentų ir detalės kodo paieška. PLV150 įprastas ir išpardavimo modelis disambiguuoti pagal šaltinio slug.

ISO bendrinė paieška maišo ne medicininius standartus bei kitus modulius, todėl reikia ligoninės / fizinio krepšio konteksto. „Gaivinimo“, „reanimacinis“ ir atitinkamos komplektacijos variantai apimami viena pasirinkimo užduotimi; gidas neteikia klinikinio algoritmo. Mayo aukštis, dydis ir apkrova yra vieno realių modelių palyginimo laukai, todėl atskiro straipsnio kiekvienam parametrui nėra.

Į pasiūlymą nepatenkanti „nerūdijančio plieno stalas su plautuve“ frazė **atmetama**, o ne nukreipiama į puslapį su tariamu produktu. 16 tikrų darbo stalų nepatvirtino tokio gaminio; siūlyta tema pakeista faktiškai esančiu POSTMAN staliuko prie lovos suderinamumu. Plovimo mašinų šakoje yra du vežimėliai ATYP_100_22_A/B; turinys aptaria vežimėlio suderinamumą ir nekuria plovimo mašinos pardavimo pasiūlymo.

Susijusių frazių „medicininiai baldai“ atsakyme dalis eilučių yra svetainių navigacija, asmenvardžiai ir kita nesusijusi informacija. Jos nepadidina straipsnių skaičiaus. Nenumatyti miestų dubliavimo puslapiai, pacientų vežimėlių / diagnostikos temos ar gamintojo pasiūlymu nepagrįstos paslaugos.

## Konkurentų analizė ir kuriama vertė

| Domenas | Gauta eilučių | Bazės total_count | Atrinkta tiksliai baldų / logistikos temai |
|---|---:|---:|---:|
| teida.lt | 100 | 1787 | 0 |
| diamedica.lt | 53 | 53 | 0 |
| rehastar.com | 100 | 532 | 1 |
| mprekyba.lt | 84 | 84 | 4 |

TEIDA bei Rehastar komercinės kategorijos tiesiogiai matomos SERP, nors ribotas domeno frazių eksportas gali negrąžinti jų aktualių žodžių. 0 atrinktų eilučių nereiškia, kad domenas neturi baldų, nesirodo Google ar neturi turinio. Mprekybos įrašų apimtys ir pozicijos yra bazės istorija, ne mūsų realaus laiko pozicijos.

Pirminėje peržiūroje atidaryta [Rehastar MULTI001 gaminio vieta](https://www.rehastar.com/procedurinis-vezimelis-multi001) ir [Senmed Mayo staliukų katalogas](https://www.senmed.lt/category/medicininiai-baldai/instrumentu-staliukai-mayo/); kategorijų / modelių formato buvimas stebėtas. Vienas tiesioginis Mprekybos puslapio atidarymas nepavyko ir nefiksuotas kaip perskaitytas šaltinis. Nėra įrodymo, kad konkurentai visai neturi žemiau siūlomų gidų, todėl „spraga“ čia yra mūsų diferenciacijos hipotezė, o ne visų jų tekstų nebuvimo teiginys.

1. **Nuo matmenų iki tikro kodo.** Patalpos, durų, lovos tarpo ar modulio matavimo ruošinys, susietas su konkrečiais Klaro kodais.
2. **Aiški komplektacija.** Atskirtas pagrindinis modelis, įtraukti komponentai ir pasirenkami priedai; palyginime trūkstama informacija pažymima kaip tikslintina.
3. **Suderinamumas.** ISO, stalčiai, pertvaros, maišai, padėklai ir laikikliai vertinami pagal realias gamintojo kombinacijas; nespėjama iš panašios nuotraukos.
4. **Palyginama užklausa.** Vienodi kiekio, kodo, matmenų bei dokumentų laukai, naudingi pirkimų darbuotojui ir tiekėjo atsakymui.
5. **Priežiūros dokumentų kelias.** Kaip rasti savo modelio instrukciją bei detalę; jokių universalių dezinfekavimo priemonių ar garantijų.

## GEO: kas stebėta ir ką rengti

Keturi klausimai: procedūrinio vežimėlio pasirinkimas, bazinio komplekto sudėtis, Mayo modelių palyginimas ir palyginama pirkimo užklausa. Kiekvienas pateiktas abiem varikliams lietuviškai su pageidaujama LT šalimi. Faktinis modelis, efektyvi geografinė rinka, kešavimas ir bandymų nepriklausomumas nepatvirtinti.

| Variklis | Klausimo ID | Atsakymo būsena | Stebėta kalba | Unikalių šaltinio URL kandidatų |
|---|---|---|---|---:|
| ChatGPT | 0 | observed | lt | 24 |
| Gemini | 0 | observed | lt | 4 |
| ChatGPT | 1 | observed | lt | 12 |
| Gemini | 1 | observed | lt | 2 |
| ChatGPT | 2 | observed | lt | 19 |
| Gemini | 2 | observed | lt | 4 |
| ChatGPT | 3 | observed | lt | 26 |
| Gemini | 3 | observed | lt | 0 |

Šaltinių kandidatų skaičius nėra patvirtintų citatų ar teisingų dokumentų skaičius. Kai kurie atsakymai turi pasikartojančių, netaisyklingų ar netinkančių nuorodų, vežimėlius universaliai sieja su CE/MDR ar priskiria bendrus ratukų / apkrovos reikalavimus. Šie AI teiginiai neperkeliami į faktinį turinį. Promedical rinkos matomumo, „0 % share of voice“ ar nesenos LT pozicijos iš šių pavyzdžių neskaičiuojame.

Rengiant straipsnius: tiesioginis atsakymas į konkretų klausimą, aiškiai įvardyti modeliai, palyginimo lentelė su šaltinio ir vienetų laukais, tikslintinų duomenų sąrašas, tinkamas gamintojo dokumentas prie teiginio. HTML, JSON-LD ir LLM indeksai turi atitikti tą patį patvirtintą viešą turinį. Struktūriniai duomenys ar llms.txt citavimo negarantuoja. Tai naudos ir patikrinamumo strategija, o ne išmatuotas AI reitingo pagerėjimas.

## Faktų ir publikavimo ribos

Gamintojo [instrukcijų katalogas](https://www.klaro.cz/en/navody-pdf-2186) – vieta rasti konkretaus modelio dokumentą, ne visiems gaminiams vienoda instrukcija. [Plieno rūšių paaiškinimas](https://www.klaro.cz/en/druhy-nerezove-oceli) duoda medžiagų kontekstą ir savaime nenustato valymo chemijos kiekvienam modeliui. Techninės specifikacijos gidas remiasi aktualiai tikrintinais [VPT pirminiais paaiškinimais](https://klausk.vpt.lt/hc/lt/sections/360000234629-Technin%C4%97-specifikacija); kito produkto specifikacija nėra medicininių baldų normatyvas.

Jau esančių 1 856 patvirtintų revizijų tekstai / datos / approval snapshots ir viešo paketo SHA-256 '32f955d9c35b7590027069ff3a8a43eca6bc8afc35ba83a6d5f4021ecb5c65e6' nepakeisti. Native privati inventoriaus apimtis dabar 1 910 puslapių: 1 856 patvirtinti ir 54 tušti planai. 20 kitų Studio svetainių fingerprintai sutampa su būsena prieš darbą. Visų 54 užduočių palaikomų laukų ir dabartinio seoResearch perdavimas patikrintas be generavimo proceso.

57 turinio užduotys suskirstytos į 11 grupių. 10 pagrindinių gidų (patalpų taikymo grupė naudoja baldų planavimo pagrindą) ir juos papildantys sprendimai turi konkrečius katalogo / modelio šaltinius. Ankstesnių 8 privačių planų ID, reason, sourceQueries ir datos išsaugoti. Native V1 nauji planai padalyti 24 + 22; viso žemėlapio negalima įkelti kaip vieno schemai neatitinkančio 57 puslapių plano.

## Kaip vertinsime po paleidimo

Pirma patikrinti faktinį viešą domeną, techninį indeksavimą, veikiančias užklausas ir el. pašto pristatymą. Kai bus GSC / GA4 duomenys, vertinti pagal teminę grupę ir puslapio paskirtį: indeksavimą, relevant impressions / queries, kontaktų paspaudimus, pristatytas ir kvalifikuotas užklausas. Kontaktų paspaudimas nėra gauta užklausa. GEO pakartoti su patvirtinta efektyvia rinka, faktiniais modeliais bei palyginamu klausimų rinkiniu, kai svetainė jau prieinama. Nėra automatinio mokamo monitoringo ar publikavimo. Užklausų ir turinio naudą tikrinti prieš plečiant tik pagal frazių kiekį.
