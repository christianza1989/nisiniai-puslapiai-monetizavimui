# Madbeauty — pilnos platformos vizualiniai maketai

2026-10-05. Agent-selected kryptis: iš pradžių trys raster konceptai, po Fresha review įgyvendinta atskira privati UI foundation. Tai ne pilnos platformos ar tikro booking priėmimas. Produkto autoritetas [PRODUCT](PRODUCT.md), [PLATFORM_PLAN](PLATFORM_PLAN.md) ir [FINAL_PROTOTYPE_PLAN](FINAL_PROTOTYPE_PLAN.md). Originalūs rastro artefaktai ir jų fingerprint neperrašyti.

## Krypties pasirinkimas

Palygintos konceptualios kryptys: tamsus galerijos žurnalas (stiprus fotografijai, silpnesnis kasdieniam kalendoriui); šviesus įprastas SaaS su pastelinių kortelių tinkleliu (aišku, tačiau lengvai bendrinama su kitomis nišomis); šviesus fotografijos ir aiškios paieškos portalas su redakcine tipografika (pasirinkta). Tai agento konceptų palyginimas, ne trys sugeneruoti ar naršyklėje patikrinti variantai.

Tezė: grožį renkiesi akimis, vizitą — pagal konkretų laiką. Homepage naudinga paieška, profilyje darbai ir paslaugos, paskyroje didelis kalendorius. Vienoda tapatybė, trys skirtingos kompozicijos.

Ankstesniame tyrime realiai apžiūrėti Treatwell meistro desktop/mobile, Watalook homepage desktop/mobile ir Fresha desktop. Perkeliami sprendimai: paslaugos / vietos / laiko paieška, išsamus profilis, skirtingi paslaugų variantai. Nekopijuojama jų fotografija, logotipai ar pilnas maketas. Šio vaizdų pavedimo metu tinklo svetainių actual screenshot palyginimas neatliktas; savitumas ir mobile lieka įgyvendinimo patikra, ne deklaruotas PASS.

## Vizualinis pasaulis

Porceliano balta #FAFAF7; rašalas #18211D; koralas #F4664A veiksmams; šviesi žalsva #E8F1EA pagalbiniam kalendoriaus paviršiui; ramūs grafito tekstai. Kontrastas foundation išmatuotas QA, visos platformos dar nevertintas. Display DM Serif Display, valdikliai ir darbo vieta DM Sans su LT ženklais; self-host originalūs TTF ir OFL iš oficialaus Google Fonts repo. Originalus code-native SVG madbeauty. wordmark, be generinio moters silueto ar gėlytės.

Puslapiuose horizontalių juostų / galerijų ir sąrašų ritmas; jokio vienodų icon-card sekcijų puslapio. Apytikslis 1440 px desktop maketas, generuojamas aukštas 1536 × 3840 vaizdas arba artimiausias tool palaikomas formatas. Vienas puslapis viename vaizde, nuo header iki footer. Asmeninė paskyra — meistro Operate paviršius, ne kliento rezervacijų paskyra.

## Sekcijos ir assets

| Paviršius | Kompozicija / klausimas | Vizualai ir paskirtis |
|---|---|---|
| Homepage | Header; ryškus tekstas ir laisvo laiko paieška; fotografinė juosta; kategorijos; meistrai ir laikai; kaip registruotis; meistro prisijungimas; trys gidai; footer | Platesnė procedūros / studijos scena kontekstui; skirtingi manikiūro / plaukų / antakių crop; meistrų portretai ir darbai; gidų fotografijos. Nagų priežiūra pirminis segmentas, kitos kategorijos šiame future concept nėra live pasiūla. |
| Viešas profilis | Header / breadcrumbs; studijos galerija; vardas ir vieta; paslaugų sąrašas greta datų / laikų panelės; darbų galerija; apie / vieta; taisyklės; footer | Demonstracinis meistro portretas; studijos panorama; šeši skirtingi tikroviški nagų stiliai kaip concept; vietos schema be išgalvoto tikro adreso. Tikri darbai prieš live turi pakeisti visus mock assets. |
| Asmeninė paskyra | Sidebar; dienos prioritetas; didelis savaites kalendorius; pasirinkto vizito panelė; užklausos / laukiančiųjų sąrašas; paslaugų ir profilio redagavimo peržiūra; nustatymai | Mažas to paties demonstracinio meistro avataras ir galerijos miniatiūros. Jokių dekoratyvių hero vaizdų virš kalendoriaus, finansinių fiktyvių grafų ar asmens sveikatos laukų. |

## Kilmė ir priėmimo ribos

Naudojamas built-in ImageGen, atskiras call kiekvienam artefaktui. Tikslūs promptai ir galutiniai originalai saugomi design-previews/. Originalai nekonvertuojami į production responsive mediją: tai pilno UI rastrai, ne publikuotini puslapių assets. Prieš implementaciją reikia atskirai sugeneruoti / gauti assets ir naudoti MEDIA_CORE WebP šeimas.

Kiekvienas maketas turi nedidelį „Dizaino maketas“ žymėjimą; demonstraciniai profiliai / kainos / vizitai pažymėti promptuose ir kilmės manifeste. Nėra ImageGen ženklelio prie kiekvienos nuotraukos. Realios paskyros, kalendorius, veikiančios nuorodos, mobile, contrast, SEO ir Lighthouse nevertinami pagal šį rastrą.

## Faktinė maketų peržiūra

Sugeneruoti ir peržiūrėti visi trys realūs vaizdai: [homepage](design-previews/homepage-v1.png), [viešas profilis](design-previews/public-profile-v1.png), [asmeninė meistro paskyra](design-previews/professional-account-v1.png). Tikslūs promptai [PROMPTS.json](design-previews/PROMPTS.json); originalų keliai, dydžiai ir SHA-256 [MANIFEST.json](design-previews/MANIFEST.json).

Homepage pilna fotografijos / paieškos / kategorijų / laisvų laikų / gidų / footer struktūra. Viešas profilis turi galeriją, paslaugas ir priedus, laikų pasirinkimą, portfolio, vietą ir sąlygas. Darbo paskyra turi savaitės kalendorių, vizito detales, užklausas / waitlist, paslaugų ir grafiko valdymą, profilio ir pranešimų nustatymus. Tai viena nuosekli kryptis su skirtingų užduočių kompozicijomis; nėra savarankiško funkcinio ar techninio priėmimo.

Rastro ribos konkrečios: generuoti datų pavyzdžiai skiriasi ir dalis yra istoriniai; to paties mock meistro portretas tarp profilio ir workspace skiriasi; header/footer turi variantų; kai kurie demonstraciniai kalendoriaus blokai / paslaugų trukmės nėra nuoseklūs. HTML realizacijoje reikia vieno tikro Provider tapatybės / kainų / trukmių šaltinio, aktualaus kalendoriaus ir bendros navigacijos sutarties. Šių neatitikimų nelaikome veikiančios sistemos faktų pagrindu. Vaizdai nepateikti kaip 10/10 audituotas portalas.

## Fresha peržiūra ir faktinis UI pagrindas

[FRESHA_UX_REVIEW](FRESHA_UX_REVIEW.md) remiasi actual public desktop/mobile, meistro aplinka ir atskirai savininko vaizdais. Paviršių kompozicijos: search-first portalas, List/Map katalogas, profilis su komanda/paslaugomis/portfolio, mobile etapų kelias, agenda/meistro kalendorius, pakopinis onboarding ir savas /meistrams landing. Originalūs PNG konceptai nėra tikslus kiekvieno naujo ekrano kompozicijos autoritetas; tapatybė išlieka, paieška ir kasdienė darbo vieta prioritetinės.

[ASSET_PLAN](ASSET_PLAN.json): 11 peržiūrėtų originalių ImageGen fotografinių iliustracijų, 55 tikri WebP, 26 originalios SVG ikonos, vector wordmark, self-host fonts ir tokens. Guide/color, price ir choose turi konkrečius vaizdų slotus; pilni gidai dar nesugeneruoti. Demo avatars initials iš vieno Practitioner. Fiktyvių fotografijų negalima publikuoti kaip tikrų teikėjo darbų. [UI kit](prototype/README.md) turi actual veiksmo/form/status/dialog/date/table/gallery komponentus; autocomplete/map/full calendar ir visų 70 ekranų UI dar PLANNED.

Sequential root desktop/mobile peržiūra: taisytas grid min-width overflow ir img height/aspect-ratio konfliktas, favorite būsena sinchronizuota tame pačiame Practitioner. Aprašymas ir faktiniai skaičiai [QA](prototype/QA.md). Static impeccable [] nėra designer 10/10 ar Lighthouse įrodymas. Tinklo artimiausių nišų palyginimas šiam UI kit dar neatliktas; prieš pilną homepage atskiras design-diversity vartas.


## Savininko nauja kryptis — 2026-10-05

Aktualus vizualinis autoritetas: juoda #111114, balta #FFFFFF, violetinė #7040E8, šviesi violetinė #F1EDFF. DM Sans antraštėms ir valdikliams; ankstesnė serif/koralų/šalavijo kryptis yra istorinis konceptas, ne naujų ekranų taisyklė. Balti darbo paviršiai, aiškus tamsus fotografinis akcentas, violetinė veiksmams ir pasirinkimams. Tai savininko spalvų pavedimas, agento detalizuota kompozicija.

Header: sticky top12px desktop/top8px mobile, permatomas baltas paviršius ir backdrop-filter blur20px. Be blur palaikymo solidwhite fallback. Iki220px nepasislepia; žemyn64px bendras judesys paslepia, aukštyn12px grąžina. Tab, header focus ir atviras dialogas atkuria matomumą; reduced-motion išjungia transition. Actual CUA žemyn hidden=true ties1819px, aukštyn hidden=false ties1603px, blur computed20px. Node syntax PASS; desktop body1265<=1280, mobile375<=390, brokenloadedimages0. Tai bazės patikra, ne full-platform audit.

Naujas [homepage vizualas](design-previews/homepage-modern-v2.png), built-in ImageGen, [tikslus promptas](../../research/madbeauty-modern-2026-10-05/HOMEPAGE_PROMPT.json). Pilnas raster konceptas, ne tikra pasiūla ar HTML screenshot. Generuoti footerio adresas/įmonės kodas,2024datos, social paskyros, automatinės registracijos tekstai ir papildomi eyebrow/handwriting elementai nėra patvirtinti faktai ar vykdytinos instrukcijos. Implementacijoje jų nenaudoti; MB Pinet/info@pinet.lt iš patvirtintų šaltinių, santykinės datos iš clock, registracijos rezultatas iš adapterio. Headerio judėjimo neįrodo statinis raster, jį atskirai patikrinta tikrame kit. Ankstesni originalai ir manifestai neperrašyti.

## Savininko pasirinktas homepage — 2026-10-05

Savininkas: „šį išsaugok, pagal jį kursim homepage“. [homepage-modern-v2.png](design-previews/homepage-modern-v2.png) yra HUMAN_SELECTED_DESIGN_REFERENCE. Failas jau saugomas projekte, nekeisti originalo; HTML/mobile realizaciją vesti pagal šį vizualą ir aktualią black/white/violet DESIGN sutartį. Rasterio atsitiktiniai rekvizitai/datos/tekstiniai netikslumai nėra patvirtinti verslo faktai. Naujas bendras pradžios taškas: [PROJECT_ROADMAP](PROJECT_ROADMAP.md).
