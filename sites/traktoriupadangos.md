# traktoriupadangos.lt

Atnaujinta 2026-09-30. Būsena: **įgyvendintas vietinis pirmo etapo pilotas, tikras domenas nepaleistas**. Aštuoni peržiūrėti puslapiai importuoti į bendrą core; likę septyni gidai – privatūs studijos juodraščiai. Dabartinis operatorius **MB Pinet**, bendras el. paštas **info@pinet.lt** pagal naujausią savininko nurodymą. Šiai nišai telefono ar juridinio adreso nepriskyrėme. Formos įrašymas → Hostinger SMTP → gavimas tikrame INBOX patikrintas vietiniame Worker. Domeno nuosavybė/DNS, gamybinė D1/SMTP konfigūracija ir privatumo saugojimo terminai dar laukia. Kainų, tiekėjų ir pardavimo pažadų nėra.

Dabartinio perdarymo dizaino sutartis ir faktiniai sprendimai: [DESIGN.md](traktoriupadangos/DESIGN.md), [DIRECTION.md](traktoriupadangos/DIRECTION.md). Nepriklausomos penkių konkrečių pataisymų peržiūros apimtis: [REVIEW-2026-09-30.md](traktoriupadangos/REVIEW-2026-09-30.md). [Galutinis auditas](traktoriupadangos/AUDIT-2026-09-30.md): mobile Lighthouse 91 / 100 / 100 / 100, core ir visų trijų nišų SEO patikros praėjo. Ankstesni vaizdai, kontaktai ir juodraščio QA žemiau išlaikomi kaip istorija, ne dabartinės būsenos aprašymas.

Tarptautinis tyrimas, faktiniai vizualinės prieigos ribojimai ir pritaikytų/atidėtų sprendimų lentelė: [traktoriupadangos-research.md](traktoriupadangos-research.md). Taikyti `niche-site-builder`, `niche-content-planner`, `imagegen`, `playwright` ir `web-perf` skill.

## Įgyvendintas URL žemėlapis

| URL | Atskirai sprendžiamas klausimas |
|---|---|
| `/` | Nuo ko pradėti pasirinkimą ir kaip pateikti tikrą poreikį? |
| `/gidas/kaip-issirinkti-traktoriaus-padangas` | Kokius technikos/naudojimo duomenis surinkti ir kaip palyginti pasiūlymo apimtį? |
| `/gidas/traktoriaus-padangu-zymejimas` | Kaip perskaityti nominalų dydį ir nurašyti pilną žymėjimą? |
| `/gidas/radialines-ar-diagonalines-traktoriaus-padangos` | Kuo skiriasi konstrukcija ir ką dar tikrinti prieš pasirenkant? |
| `/gidai` | Kuris iš trijų gyvų atsakymų tinka mano klausimui? |
| `/duk` | Ką galiu daryti šiame projekte ir ko užklausa nepatvirtina? |
| `/kontaktai` | Kokiu realiu kanalu pateikti padangų poreikį? |
| `/privatumas` | Kokius duomenis renka įgyvendinta forma ir agreguoti skaitikliai? Prieš realų paleidimą papildyti tikra operatoriaus tapatybe ir saugojimo terminais. |

Homepage jau turi originalų hero, pasirinkimo žingsnius, matmens paaiškinimą, darbo aplinkybes, gidų korteles, DUK, formą ir pilną footer. Gidai naudoja peržiūrėtą paketo tekstą, šaltinius ir tik gyvas susijusias nuorodas. SEO iš bendro host-aware core: canonical, robots, sitemap, JSON-LD, Open Graph ir LLM failai. Pirmų trijų gidų kalendoriaus datos pakeistos į faktinį vietinio paketo parengimą 2026-09-30; lentelėje žemiau likusios pirmų trijų datos yra **ankstesnio plano istorija**. Viešo domeno paleidimo datos dar nėra.

## Pradinis kampas

Studijos įrašo pasiūlymo hipotezė: **Traktorių padangų parinkimo užklausos**. Prieš viešinant reikia patikrinti realų pirkėjo ketinimą, paklausos sezoniškumą ir galimybę įvykdyti užklausą. Nerašyti kaip veikiančios paslaugos, kol nepatikrinta.

Pirmo etapo informacinis kampas: padėti pirkėjui perskaityti esamos padangos žymėjimą, suprasti, kokių duomenų reikia saugiam keitimo ar naujo komplekto parinkimui, ir pasirengti pokalbiui su padangų specialistu. Tai **nėra** pažadas parduoti, sumontuoti, turėti sandėlyje ar konkrečiai mašinai patvirtinti tinkamumą. Jei nebus realaus atsakingo žmogaus ar partnerio, komercinio užklausos puslapio neviešinti.

## Konkurentų pjūvis, 2026-09-30

Patikrinti keturi veikiantys Lietuvos pardavėjų kategorijų puslapiai. Šio pjūvio kainų ir asortimento skaičiai gali pasikeisti; jie nėra mūsų kainos ar lygiaverčių modelių palyginimas.

| Pardavėjas | Matoma pasiūla kategorijos puslapyje | Pavyzdys patikros dieną |
|---|---|---|
| [e-Agroteka](https://www.e-agroteka.lt/padangos-zemes-ukio-technikai/padangos-traktoriams) | 17 įrašų, individualus užsakymas ir kreipimasis į vadybininką dėl dydžio/modelio | 460/85R30 BKT AGRIMAX RT 855 — 870 € su PVM |
| [Xpadangos](https://www.xpadangos.lt/industrines-padangos/traktoriu-padangos/) | 96 prekės, dydžio ir gamintojo filtrai, krepšelis | DURO HF251 variacijos kaina puslapyje nuo maždaug 101 €; dydžiai skirtingi |
| [Traktoriukai.lt](https://www.traktoriukai.lt/dalys/traktoriu-dalys/padnagos) | 11 dydžių/produktų, pirkimas krepšeliu | 8-18 padanga 135 €; 5.00-12 60 €, bet patikros metu išparduota |
| [e-Rytas](https://www.e-rytas.lt/padangos/padangos-2/zemes-ukio-traktoriams-kombainams) | 91 traktorių/kombainų padangų įrašas, dydžių ir markių kortelės | 280/85R20 Forerunner 177 € |

Iš šių **atvertų kategorijų** matyti, kad katalogai, kainos, filtrai ir kontaktai jau plačiai siūlomi. Todėl pirmo etapo hipotezė nėra kopijuoti prekių lentyną ar žadėti mažesnę kainą. Savitas kampas – aiškus techninių duomenų surinkimo ir parinkimo klausimų kelias, remiamas gamintojų šaltiniais. Tai nėra teiginys, kad konkurentai niekur neturi gidų. Kol neturime realiai aptarnaujamos užklausų grandinės, CTA negali žadėti individualaus parinkimo.

## 2026-10 – 2027-03 redakcinis kalendorius

Datos parinktos kaip bandymo ritmas, kad naudingi puslapiai būtų parengti prieš numanomą pavasario darbų laikotarpį. Sezoniškumas šiame projekte dar **nepatvirtintas paieškos ar pardavimų duomenimis**. Kiekvienas įrašas išlieka juodraštis, kol faktai, šaltiniai, vidinės nuorodos, kontaktai ir publikavimo vartai patikrinti. `publishAt` negalima aktyvuoti vien todėl, kad kalendoriuje atėjo data. Neparengto puslapio data perkeliama; rodoma `datePublished` yra faktinė viešinimo data, o ne pirminio plano data.

| Planuota data | URL ir vaidmuo | Atskirai sprendžiamas skaitytojo klausimas | Klasteris; būsimos vidinės nuorodos | Pirminiai šaltiniai; paieškos / faktų patikros užklausa |
|---|---|---|---|---|
| 2026-10-08 | `/gidas/kaip-issirinkti-traktoriaus-padangas` — pasirinkimo ramstis | Nuo kokių mašinos ir darbo duomenų pradėti, prieš žiūrint į padangų katalogą? | **P1 Parinkimas**; iš pradžių tik į `/`, vėliau pridėti nuorodas į 2–6 įrašus, kai jie gyvi. | [S1], [S2], [S4]; „agricultural tyre selection size rim application load speed manufacturer“. |
| 2026-10-22 | `/gidas/traktoriaus-padangu-zymejimas` | Kaip perskaityti esamos padangos dydį, `R`, `VF`, apkrovos ir greičio kodą nuo šoninės sienelės? | P1; į 1, vėliau į 5 ir 8. | [S1], [S3]; „VF 650/60 R38 155D meaning tyre sidewall“. |
| 2026-11-12 | `/gidas/radialines-ar-diagonalines-traktoriaus-padangos` | Kuo skiriasi konstrukcijos ir kodėl vienodas dydis dar nereiškia vienodo naudojimo? | P1; į 1 ir 2, vėliau į 8. | [S2], [S3]; „radial diagonal cross ply agriculture construction use“. |
| 2026-12-03 | `/gidas/traktoriaus-padangos-ir-ratlankio-suderinamumas` | Kodėl būtina patikrinti leidžiamą ratlankio plotį ir tipą, prieš renkantis alternatyvų dydį? | P1; į 1 ir 2. | [S1], [S2], [S4]; „recommended approved rim agricultural tire IF NRO“. |
| 2026-12-17 | `/gidas/traktoriaus-padangu-apkrovos-ir-greicio-indeksai` | Ką nurodo indeksai ir kodėl apkrova priklauso nuo greičio bei naudojimo sąlygų? | P1; į 2, 4 ir 1. | [S2], [S3], [S4]; „agricultural tyre load index speed symbol operating conditions“. |
| 2027-01-14 | `/gidas/priekiniu-ir-galiniu-padangu-derinimas-4x4` | Kodėl keičiant 4x4 traktoriaus priekinį ar galinį dydį reikia vertinti riedėjimo apskritimą ir transmisijos santykį? | P1; į 1, 2 ir 4. | [S2], [S7]; „tractor front rear rolling circumference mechanical lead replacement“. |
| 2027-01-28 | `/gidas/traktoriaus-padangu-slegis-lauke-ir-kelyje` — eksploatavimo ramstis | Kokie duomenys keičia rekomenduojamą slėgį lauke ir kelyje, ir kodėl vieno skaičiaus visiems nėra? | **P2 Eksploatacija**; į 1 ir 5, vėliau į 8. | [S4], [S5], [S6]; „tractor tyre pressure axle load implement speed field road manufacturer table“. |
| 2027-02-11 | `/gidas/if-ir-vf-traktoriaus-padangos` | Ką reiškia IF/VF žymos ir ką prieš pasirenkant reikia patikrinti gamintojo lentelėje bei ratlankyje? | P2; į 2, 4 ir 7. | [S1], [S2], [S4]; „IF VF agricultural tyre load pressure approved rim NRO“. |
| 2027-02-25 | `/gidas/duomenys-traktoriaus-padangu-uzklausai` | Kokią informaciją apie esamas padangas, ratlankį, traktorių, darbą ir apkrovą pasiruošti prieš kreipiantis į specialistą? | **P3 Sprendimo pasirengimas**; į 1, 2, 4, 6 ir 7. Jokios neveikiančios „užsakymo“ formos. | [S1], [S4], [S5], [S7]; „tractor tire replacement data required size rim axle load tractor model“. |
| 2027-03-11 | `/gidas/traktoriaus-padangu-montavimo-sauga` | Kodėl montavimą, slėgio parinkimą ir pažeistos padangos patikrą reikia patikėti kvalifikuotam specialistui? | P3; į 4, 7 ir 9. | [S8], [S4]; „agricultural tyre mounting trained personnel inflation safety“. |

Šie 10 įrašų nėra automatinė SEO kvota. P1/P2/P3 yra **redakciniai klasteriai**, o ne Google pripažinti „authority“ balai. Pagrindinis `/` puslapis turės nuorodą į gyvą P1 ramstį; P1 ir P2 rems atskirus klausimus, o P3 padės žmogui pasirengti realiam specialistų kontaktui. Nuoroda į būsimą URL lieka tik studijos plane; po tikro publikavimo ankstesnius puslapius peržiūrėti ir, jei skaitytojui naudinga, papildyti atgaline nuoroda. Nuorodų tekstas turi aiškiai nusakyti kitą puslapį, o ne kartoti raktažodžius. [Google nuorodų gairės](https://developers.google.com/search/docs/crawling-indexing/links-crawlable).

### Patikrinti pirminiai faktų šaltiniai

Žemiau esantys šaltiniai patikrinti **2026-09-30**. Jie yra redakcinių teiginių patikros pagrindas, bet nėra mūsų tiekėjai, partneriai ar prekių prieinamumo įrodymas. Prieš patvirtinimą atskiras patikros žingsnis turi dar kartą patikrinti konkrečią lentelę ir URL. Šaltinių puslapių tekstų ar paveikslų neperpublikuoti.

| ID | Pirminis šaltinis ir ką jis pagrindžia |
|---|---|
| S1 | [Michelin: žemės ūkio padangos žymėjimas](https://business.michelinman.com/tips-suggestions/reading-tire-markings) — dydžio, konstrukcijos, apkrovos bei greičio kodų aiškinimas; alternatyvius dydžius būtina tikrinti pagal techninę specifikaciją. |
| S2 | [Trelleborg: žemės ūkio padangų DUK](https://www.trelleborg-tires.com/en/education/faq) — radialinės / diagonalinės konstrukcijos, indeksai, patvirtinti ratlankiai, IF/NRO ir 4x4 priekinės ašies santykio kontekstas. |
| S3 | [UNECE: reglamento Nr. 106 oficialus dokumentų indeksas](https://unece.org/transport/vehicle-regulations-wp29/standards/addenda-1958-agreement-regulations-101-120) — žemės ūkio padangų kategorijos ir žymėjimo reguliavimo tekstas; naudoti aktualią redakciją ir pakeitimus, ne seną atskirą PDF kaip galutinį šaltinį. |
| S4 | [Trelleborg: Agriculture Technical Manual (PDF)](https://www.trelleborg-tires.com/-/media/tires-aft/datatsheet/technical-manual/trelleborg-technical-manual-en.pdf?rev=258948143820400e9a05c5a63b8c7ae0) — modelio, dydžio, greičio, apkrovos, darbo režimo ir slėgio lentelės su išimtimis. Skaičių nenukopijuoti į bendrą universalų patarimą. |
| S5 | [Michelin: AgroPressure](https://business.michelinman.com/help-advice/tools/agropressure) — įvestys slėgio rekomendacijai: mašina, padargai, apkrova, greitis, naudojimas; skaičiuoklė remiasi Michelin techniniais duomenimis. |
| S6 | [Michelin: kaip parinkti traktoriaus padangų slėgį](https://business.michelinman.com/help-advice/farm-vehicles/tractor-tire-pressure) — lauko ir kelio sąlygų, padargų ir apkrovos skirtumai; neskelbti pavyzdinio slėgio kaip normos konkrečiam klientui. |
| S7 | [Bridgestone: riedėjimo apskritimas ir 4x4 ašių santykis](https://blog.bridgestone-agriculture.eu/impact-of-the-dynamic-rolling-circumference-of-agricultural-tyres) — realus riedėjimo apskritimas kinta pagal apkrovą, slėgį ir darbą; vien dydžio kodo nepakanka priekinės ir galinės ašių porai patvirtinti. |
| S8 | [Michelin: žemės ūkio padangų montavimo sauga](https://business.michelinman.com/tips-suggestions/tire-mounting-and-dismounting) — montavimą bei pripūtimą atlieka apmokyti specialistai su tinkama įranga. Viešas gidas turi nukreipti į specialistą, ne būti savarankiško pavojingo montavimo instrukcija. |

Papildoma aktualumo pastaba: [Continental oficialiai paskelbė apie Tractor, Harvester ir Compact žemės ūkio padangų linijų nutraukimą iki 2025 m. pabaigos](https://www.continental-tires.com/products/agriculture/). Senas techninis katalogas gali būti naudingas jau naudojamai padangai identifikuoti, bet jo negalima pateikti kaip naujų prekių prieinamumo ar esamo asortimento įrodymo.

### Publikavimo ir priežiūros vartai

Prieš kiekvieną datą patikrinti: (1) ar atsakymas savitas ir naudingas, ne dubliuoja kitą URL; (2) ar techniniai faktai tiksliai remiasi aktualiu gamintojo dokumentu ir neperkelia vieno modelio skaičiaus visiems; (3) ar nėra išgalvoto autoriaus, bandymo, tiekėjo, atsargų, kainos ar suderinamumo pažado; (4) ar nuorodos veda tik į tą dieną gyvus savus puslapius ir veikiančius pirminius šaltinius; (5) ar yra leidžiama vaizdų kilmė bei teisingi paaiškinimai; (6) ar prieš komercinį CTA veikia atsakingas kontaktas ir užklausų gavimas; (7) ar vieša data, schema ir sitemap atitinka faktinę publikaciją. Skaičiai ir specifikacijos turi gauti `checkedAt` bei kitą perpatikrinimo datą studijos šaltinių įraše; pagal nutylėjimą juos peržiūrėti prieš publikaciją ir po šešių mėnesių, o gamintojui paskelbus pakeitimą — anksčiau.

AI sudaro planą ir juodraštį, o publikavimo patvirtinimas lieka atskiras patikros procesas. Tikslas – jį automatizuoti su įrodymų žurnalu ir aiškiais išimčių vartais, kaip aprašyta [autonomijos eigoje](../AUTONOMY_ROADMAP.md). [Google gairės](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content) įspėja apie masinį be pridėtinės vertės turinį; [naudingas turinys](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) ir tikri atsakymai yra aukščiau už straipsnių kiekį. Nevertinti 10 įrašų kaip garantuoto srauto ar „topical authority“.

## Pirmo etapo darbai

1. Keturi kategorijų konkurentai, jų viešos kainos ir pasiūlos tipai patikrinti aukščiau; prieš paleidimą papildyti paieškos rezultatų ir informacinių gidų palyginimu.
2. Pasirinkti vieną aiškų pradinį pasiūlymą ir atskirti jį nuo būsimų pilnos sistemos funkcijų. Dokumentuoti, kas iš tikrųjų galės atsakyti į užklausas.
3. Patikrinti šiame faile suplanuotų URL paieškos ketinimus ir iki viešinimo papildyti gyvu pradžios bei, tik patvirtinus vykdytoją, užklausos puslapiu. Nedaryti sinonimų ar miestų puslapių vien dėl kiekio.
4. Per turinio studiją sugeneruoti Codex CLI juodraščius, patikrinti faktus, sukurti teisėtus vaizdus, sudėti vidines nuorodas ir tik tada patvirtinti eksportą.
5. Prieš viešinimą patikrinti el. paštą, formos D1 įrašymą ir operatoriaus gavimą, privatumo informaciją, DNS, canonical/sitemap/robots, mobilų Lighthouse ir atskirą domeno matavimą. Telefono numerio neišgalvoti.

## Pirmo juodraščio QA istorija

2026-09-30 Codex CLI parengė visus 11 privačių puslapių juodraščių (pradžia ir 10 gidų); 10 puslapių partija baigėsi be generavimo klaidų. Atskiras agentas pirmąjį gidą palygino su S1, S2, S4, S5 ir S7: struktūra naudinga, bet šaltinių ryšiai su konkrečiais teiginiais dar neužfiksuoti, nėra veikiančio šios nišos kontakto, o planuojamas užklausos kontrolinis sąrašas gali dubliuoti dalį teksto. Pataisyta dviprasmė nominalaus dydžio formuluotė, išimtas neparemtas protektoriaus dėvėjimosi teiginys ir redakcinė „CTA“ antraštė. Penki pirmojo gido faktų klausimai bei išoriniai šaltiniai liko nepatvirtinti; nė vienas iš 11 puslapių **neeksportuojamas ir neviešinamas**.

## Kontaktai ir matavimas

Savininko naujausias nurodymas pakeitė ankstesnį laikiną adresą: dabar bendras operatorius MB Pinet ir info@pinet.lt. Veikiantį atskirą šios nišos adresą vėliau galima nustatyti per bendrą kontaktų/gavėjų konfigūraciją, ne perkopijuojant rendererį. Footer išlaikoma žyma „Mūsų verslas automatizuotas su verslomatika.lt“. Kitų nišų telefono ar ankstesnės įmonės juridinio adreso nenukopijavome. [MAIL_CORE.md](../MAIL_CORE.md) aprašo transportą, sekretus ir per-site nustatymus.

Native forma naudoja bendrą `/uzklausa` endpoint ir D1 `niche_leads`, atskirtą per `site_id`; sėkmė grąžinama tik po įrašymo. Hostinger SMTP su implicit TLS 465 siunčia MB Pinet vardu, gavėjas info@pinet.lt, Reply-To – kliento adresas. 2026-09-30 09:51:39 UTC tikra forma per vietinį Worker išsaugojo užklausą, SMTP priėmė laišką ir IMAP 993 patvirtino konkretų Message-ID INBOX; sintetinis D1 įrašas po patikros pašalintas. Įrodymas: core `output/mail/niche-form-verification.json`. Įprastos QA peržiūros SMTP išjungtas, kad testai nesiųstų laiškų. Viešame diegime dar reikia gamybinės D1/sekretų konfigūracijos ir operatoriaus prieigos prie nepraneštų įrašų. SMTP priėmimas nėra pristatymo garantija kiekvienam būsimam laiškui.

Traktoriaus šablonas siunčia pirmosios šalies `pageview`, `email_click` ir `phone_click` (telefono dabar nėra) į bendrą `/ivykius`. D1 `niche_interest_daily` kaupia tik `site_id`, Vilniaus dieną, gyvo puslapio kelią, įvykį ir kiekį. Programoje nesaugomi IP, lankytojų identifikatoriai ar formos turinys šioje lentelėje; nėra analitikos slapukų, gerbiami DNT/GPC, žinomi botai atmetami. Tai **peržiūrų/paspaudimų skaitikliai, ne unikalūs lankytojai, organiniai apsilankymai ar tikri skambučiai/laiškai**. Infrastruktūros žurnalai vertinami atskirai. Produkcijos migracijos: `0004_niche_leads.sql` ir `0005_niche_interest_daily.sql`; šiame darbe taikytos tik vietinei D1.

## Turinio ir vaizdų kilmė

Dabartiniame perdaryme naudojamas naujas originalus ImageGen nepaženklintos padangos objektas, o ne žemiau archyvuota lauko nuotrauka. Originalas: `sites/traktoriupadangos/tyre-source-2026-09-30.png`; tikslus prompt `sites/traktoriupadangos/image-prompt.txt`; paketo atnaujinimas `content-studio/scripts/redesign-tractor-media.mjs`. Nauji immutable WebP ID: `493665ac-7356-479b-a075-0a7352663df1` (782×1001, 89156 B), `17c8f68e-1705-400d-870b-77fa2f63f164` (720×922, 82900 B), `1e2e3d87-e30c-4c1a-b476-4bbec2438618` (480×614, 42240 B). Pilna kilmė ir SHA-256 įrašyti [DESIGN.md](traktoriupadangos/DESIGN.md); senų ID turinys nekeistas. Ankstesnis matomas ImageGen paaiškinimas pašalintas pagal vėlesnį savininko nurodymą; kilmė išlieka medijos žurnale ir redakcinėje metodikoje.

2026-09-30 aštuonių puslapių tekstai perrašyti Codex ir patikrinti prieš paketo patvirtinimą. Pirmi trys techniniai gidai remiasi Michelin/Trelleborg/Bridgestone pirminiais šaltiniais, pridėtos konkrečios tikrinimo priežastys ir datos. Generinis slėgis, montavimo instrukcija, netikrinti suderinamumo dydžių atitikmenys ar pardavimo faktai nenaudojami. Likę septyni tekstai dar nėra patvirtinti ir neeksportuoti.

### Ankstesnio hero archyvas

Pirmojo varianto hero sukurtas OpenAI ImageGen (built-in tool, naujas vaizdas, ne redagavimas), 1536×1024. Ne tikras kliento traktorius, ne konkretus padangos modelis. Ankstesni WebP dydžiai 1440, 960 ir 720 px; 1440 px variantas 185894 B. Tai istoriniai failai, dabartinio hero nuorodos naudoja aukščiau išvardytus naujus ID. Sharp naudotas proporcingam resize/formatui, ne vaizdo turinio redagavimui. Ankstesnis originalas: `C:/Users/lenovo/.codex/generated_images/01a0ec4c-c381-7c53-ac6e-8fc4e2755dc5/exec-fee9fb58-5dfe-46f7-8d42-2d80fe978e9d.png`.

Visas prompt:

> Use case: photorealistic-natural. Asset type: a professional Lithuanian tractor tyre information website hero, landscape 3:2 composition. A generic unbranded dark olive green agricultural tractor standing at the edge of a Lithuanian field early in the morning. Strong close three-quarter view of its huge rear black agricultural tyre with convincing deep chevron tread, wheel and rim mechanically plausible, tyre dominates right half, the tractor body extends upper right, soft agricultural fields and distant tree line in the left background. Warm low golden light on rubber texture, subtly misty background, rich dark pine green and charcoal with natural wheat tones, sophisticated editorial photography with restrained contrast. This is an illustrative generated scene, not a real client's tractor or a specific tyre for sale. No text, no visible brand marks, no watermark, no people, no product specifications, no fake logos. Clear sharp tyre material and coherent equipment geometry; avoid cartoon, illustration, excessive HDR, oversaturated greens. It will occupy a large rectangular image panel next to separate HTML copy.

Paketo atkūrimo script `content-studio/scripts/build-tractor-site.mjs` prieš taisydamas šią nišą išsaugo vietinę momentinę kopiją; kitų nišų ir testinių kontaktų neimportuoja. Jis peržiūrėtą turinį eksportuoja, domeno neregistruoja ir produkcijos nekeičia.

Po paleidimo atskirai fiksuoti Search Console parodymus/paspaudimus, organinius apsilankymus, *serverio įrašytas* užklausas, atsakymo laiką ir užklausų tinkamumą pagal dokumentuotą kvalifikavimo taisyklę. 60–90 dienų po indeksavimo spręsti vystyti, keisti pasiūlymą, laikyti ar parduoti. Kol kas visos metrikos: **nėra duomenų**.

## Sprendimų žurnalas

- 2026-09-30 meistriškumo peržiūra: dvi atskiros baseline kritikos ir vienas konkretus pataisymų paketas. Įgyvendinti žymėjimo raktas, gido užrašų ruošinys, mobilus skyrių indeksas, vienodi vietiniai užklausos veiksmai, didesnis svarbių tekstų/laukų dydis bei kitoks darbo sąlygų išdėstymas; pašalintas pasikartojantis gidų reklaminis blokas. Vietinis mobilus Lighthouse 88/100/100/100, 13 core testų ir visų trijų nišų SEO smoke praėjo. [Dizaino patikrų ataskaita](traktoriupadangos/CRAFT-AUDIT-2026-09-30.md). Papildomos mokamos paslaugos ar nauji vaizdai nekuriami; papildomos išlaidos 0 Eur. Statusas lieka vietinė pirma fazė, realios paklausos duomenų nėra.

- 2026-09-30: atliktas ribotas Archive.org domeno istorijos preflight. Ankstesnė padangų tematika nustatyta 2013/2015/2020 HTML mėginiuose; 2026 mėginys be skaitomo turinio. Išsaugota 300 senų URL, tačiau bendras indeksas pasiekė ribą, todėl visos istorijos ar dabartinės SEO vertės nepatvirtina. Sprendimai: [istorijos vertinimas](traktoriupadangos/history/ASSESSMENT.md), [10 atrinktų URL sprendimų](traktoriupadangos/history/url-decisions.json). Naujas originalus homepage paliekamas; senas prekybos katalogas atidedamas. Viešų redirects ar naujų puslapių šiuo darbu neįdiegta.

- 2026-09-29: sukurtas atskiras planavimo dokumentas iš studijos pradinės hipotezės. Konkurentų patikra, galutinis pasiūlymas, SEO planas, išlaidos ir paleidimas dar laukia.
- 2026-09-30: pridėtas 10 atskirų klausimų šešių mėnesių redakcinis planas, 8 pirminiai techninių faktų šaltiniai ir keturių pardavėjų kategorijų pjūvis. Visi 11 juodraščių sugeneruoti privačiai; faktų QA, veikiančio kontakto ir paleidimo dar laukia.
- 2026-09-30 vėlesnis darbas: aštuoni puslapiai peržiūrėti ir importuoti; naujas įrangos ekspozicijos dizainas su originalia padangos iliustracija, savarankišku rendereriu ir savitais šriftais. Pataisytas mobilus vaizdo paaiškinimas, gidų skaitymo plotis bei focus kontrastas; nepriklausoma peržiūra patvirtino penkių konkrečių pataisymų užbaigimą. MB Pinet / info@pinet.lt įdiegtas pagal savininko nurodymą; realus vietinio Worker formos laiškas rastas Hostinger INBOX. Visų trijų importuotų domenų bendro core SEO patikros praėjo. Viešas paleidimas ir paklausos rezultatai dar laukia.

## Dabartinis A–Z priėmimo ciklas, 2026-09-30

Dabar importuota 11 patvirtintų pradinių puslapių, tarp jų 3 perrašyti gidai, tikras MB Pinet redakcinis profilis, projektas ir naudojimo sąlygos. Bendras core papildytas autoriaus/datų/breadcrumb semantika, LLM šaltinių URL ir tos pačios kompozicijos responsive media filtru. Sukurti keturi nauji originalūs vaizdai: kiekvienam gidui ir darbo sąlygų sekcijai; homepage turi 5 vaizdus, indeksas 3, gidai po 1. Šeši tekstiniai puslapiai turi pagrįstas media išimtis. Naudotas built-in ImageGen, PNG originalai išsaugoti, WebP optimizuoti; naujos mokamos infrastruktūros neįjungta, paskyros generavimo resursai nėra universalus nemokamumo pažadas.

Pilnas checklist, spragos, patikros ir dabartiniai matavimai: [PHASE-1-AUDIT.md](traktoriupadangos/PHASE-1-AUDIT.md), [JSON](traktoriupadangos/PHASE-1-AUDIT.json). Tikra produkcija, juridiniai privatumo faktai ir paklausa nepatvirtinti. Senas build-tractor-site bootstrap saugomas kaip integracijos pavyzdys, tačiau nebegali perrašyti jau patvirtinto šios nišos turinio.

### Bendras automatinis vaizdų importas, 2026-09-30

Pagal vėlesnį savininko nurodymą įgyvendinta visoms nišoms bendra PNG/JPEG/WebP → responsive WebP šeimų sistema. GUI, HTTP, agento failo importas ir pasirinktinai sukonfigūruotas generatorius naudoja vieną `sharp` realizaciją; 360/640/800/1200/1600 kandidatai nedidina originalo, išsaugo alpha ir pritaiko EXIF orientaciją. Originalas bei pateiktas prompt lieka privačiai. Puslapiui pasirenkamas vienas vaizdas; visi dydžiai priskiriami kartu. Patvirtinti seni ID/paketai automatiškai neperrašyti. Traktorių 19 public WebP liko tos pačios patikrintos versijos.

14/14 studijos testų praėjo, taip pat tikras izoliuotas GUI PNG importo ir vieno checkbox bandymas. Viešam core paskutinėje svetainės patikroje 19/19 testų, 3 nišų SEO smoke; homepage mobile Lighthouse 90/100/100/100, gidas 91/100/100/100. Visi 85 A–Z kriterijai turi atskirą būseną; local 70/72 = 9,72/10, tikras 200% zoom ir production vartai lieka neįrodyti. [Media sutartis](../MEDIA_CORE.md), [vykdymo įrodymai](traktoriupadangos/MEDIA-PIPELINE-VERIFICATION.json). Agentams taisyklės įrašytos AGENTS/START_HERE, builder/planner/audit skill ir tiesiogiai į planavimo/rašymo promptus su SHA-256.

### Vieno sakinio naujos nišos užduotis, 2026-09-30

Parengti [CORE_BUILD_CONTRACT](../CORE_BUILD_CONTRACT.md) ir [pirmo rezultato bandymo protokolas](../AUTONOMY_BENCHMARK.md). Naujas audito initializeris kuria visus 85 kriterijus UNVERIFIED, neperrašo esamo audito ir neperima traktorių PASS; scorer/initializer testai 5/5. Patikrinti keturi skills junction, trys niche skills validatoriai ir 99 vietinės dokumentų nuorodos. 17 nepradėtų planavimo briefų kontaktai atnaujinti į savininko MB Pinet / info@pinet.lt. [Instrukcijų fingerprint ir patikros](traktoriupadangos/NEW-AGENT-READINESS.json).

Public source ir turinio paketas nuo galutinių matavimų nepakito. Native Chrome didinimo bandymas nepatvirtino 200% ir buvo sustabdytas savininko fiziniu Esc; po stop programų įvestis nebetęsta, zoom reikšmė ir atkūrimas nežinomi. [Didinimo įrodymų būsena](traktoriupadangos/ACCESSIBILITY-VERIFICATION.md). R2/S2 lieka UNVERIFIED, local 9,72/10. Nauja akmenas.lt sesija dar nesukurta: savininko sąlyga „kai bus 10/10“ neįvykdyta; tikslus būsimas sakinys — „Sukurk naują puslapį domenui akmenas.lt.“ Pirmą jos rezultatą saugosime prieš root feedback, local/craft/production/paklausą vertindami atskirai.
