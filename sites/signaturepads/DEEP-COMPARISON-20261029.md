# Signaturepads: originalo ir vietinio Core palyginimas, 2026-10-29

**Rezultatas: vizualinio ir funkcinio atkūrimo priėmimas dar neužbaigtas.** Patvirtintos 7 taisytinos grupės: 2 P1 ir 5 P2. Gyva svetainė, programos kodas ir patvirtintas turinio paketas per šį auditą nekeisti.

Patikrinta gyva https://signaturepads.lt/ ir tikras vietinis Core http://127.0.0.1:8956/. Vertino vienas Codex agentas nuosekliai; tai nėra nepriklausoma antro specialisto peržiūra. „Impeccable“ naudotas tiksliniam sąsajos auditui, išsaugant esamą dizainą.

## Apimtis ir įrodymai

- Visi 26 aktyvūs adresai × originalas / Core × 1440 / 390 px: 104 pilno puslapio vaizdai ir DOM įrašai.
- Pagrindinis, planšečių, programinės įrangos ir naturaSign Classic puslapiai papildomai 320 / 768 px: 16 vaizdų ir DOM įrašų.
- Visuose 60 vietinio Core atvaizdavimų HTTP 200 ir be horizontalaus turinio išlindimo. Tai nėra fizinių telefonų ar visų naršyklių sertifikacija.
- Visų 19 produktų pirmosios kainos sutampa; visų 19 galerijų nuotraukų rinkiniai sutampa pagal originalo galerijų nuorodas ir Core medijos alias. Paslėpti WordPress klonai bei skirtingi responsyvūs dydžiai neskaičiuoti kaip atskiros nuotraukos.
- 12 iš 13 įrangos aprašymų pastraipos sutampa su gyvu originalu, įskaitant tarpus pastraipose ir paryškinimų / kursyvo tekstus. Sigma turi vieną papildomą pastraipą; visų 13 paryškinimai sutampa.
- Visi 8 pagrindinio puslapio išskleidžiamų blokų tekstai sutampa. Šeši papildyti programų aprašymai vertinti kaip anksčiau tiesiogiai autorizuotas pakeitimas.
- Patikrinti mobiliojo meniu atvėrimas, kontaktų nuoroda ir meniu užvėrimas; tuščios vietinės formos validacija, filtro / kainos rikiavimo rezultatai, galerijos nuotraukos pakeitimas, didinimas ir Escape, greitosios peržiūros tikras turinys.
- Originalo užklausos ir prekybos formos nesiųstos. Šiame audite el. laiškų nesiųsta.

Įrodymų šaknis: [deep-comparison-20261029T2016](D:/Core/output/signaturepads-migration-20261029/deep-comparison-20261029T2016/manifest.json). Pagrindiniai duomenys: batch-01…10.json, breakpoints-01…02.json, product-price-gallery-crosscheck.json, paragraph-and-emphasis-crosscheck.json, accordion-filter-gallery.json, mobile-menu-and-contact.json, date-sort.json.

Testuotas Worker 5482f34bebd1cd1b1ea3a8981125beedc1164e82; public šaltinis 13210113275ef80d5286a2daa2ef74439c34afe8; private šaltinis 7e3694ac838e1eb2e08807a36022e46384322f3a. Native paketas 8fb0ec754ff7dc60387376ae31fb0b7ccbd831ee0638016f3d74223a8a532bea. Dėl audito naujo release nėra.

## Patvirtinti neatitikimai

### A01 — P1: greitoji peržiūra atkurta nepilnai

Originalas atveria produkto aprašymą, techninius parametrus ir galeriją. Vietiniame dialoge klonuojama katalogo kortelė: pavadinimas, kategorija, kaina ir paveikslas; aprašymo pastraipų skaičius 0. Sigma Lite atvejis patvirtintas abiejų sąsajų paspaudimais ir vaizdais.

Vieta: public components/niche/signaturepads/client.js, data-quick šaka. Atkurti peržiūrą iš patvirtinto Core produkto, išsaugant galeriją ir kontaktinį veiksmą. Pirkimo / krepšelio veiksmų negrąžinti.

Priėmimas: greitoje peržiūroje galima perskaityti parametrus; veikia galerija, klaviatūra, užvėrimas ir produkto nuoroda tiek 1440, tiek 390 / 320 px.

Įrodymai: quick-view-original.json, quick-view-local.json, quick-view-original-1440.png, quick-view-local-1440.png.

### A02 — P1: katalogai suvienodinti nepaisant skirtingų originalo maketų

| Puslapis, 390 px | Originalas | Core | Pirmos kortelės Y originalas → Core |
|---|---|---|---|
| Bendras katalogas | Be kainos / kategorijų šoninės juostos ir be matomo H1 | Pridėtas H1 ir visa juosta virš prekių | 221 → 660 |
| Programinė įranga | Filtrai / kategorijos po prekėmis, filtro antraštė Y 3027 | Visa juosta virš prekių, Y 191 | 323 → 660 |
| Parašo planšetės | Filtrai virš prekių, rikiavimo valdikliai mobiliame vaizde nerodomi | Filtrai ir papildoma rikiavimo / kiekio juosta | 522 → 660 |
| Monitorių išplėtimai | Filtrai virš prekių, rikiavimo valdikliai nerodomi | Pridėta rikiavimo / kiekio juosta | 576 → 693 |

**Patikslinimas ankstesnei komentaro hipotezei:** programinės įrangos filtrai nėra paslėpti — originalas juos perkelia po produktų sąrašu. Vien viršutinio ekrano peržiūra šito neparodo.

768 px originalo planšetės ir programinė įranga turi 3 produktų stulpelius; Core turi 2. Programinės įrangos Core šoninė juosta taip pat užima vietą šalia prekių. Planšečių puslapio aukštis 4625 → 5653 px. Tai maketo skirtumas, o ne papildomas patvirtintas tekstas.

Vieta: render.mjs katalogo struktūra ir signaturepads.css .sp-catalogue-layout / .sp-sidebar / .sp-catalogue-tools / .sp-products-grid.

Priėmimas: atskiri originalo katalogų variantai atkartoti 390 ir 768 px; nepakeisti URL, kainos, tinkami filtrų rezultatai ir matoma fokusavimo būsena. Semantinį H1 sprendimą bendram katalogui derinti su esamu maketu, nekurti naujo dizaino.

Vaizdai: [bendras katalogas](D:/Core/output/signaturepads-migration-20261029/deep-comparison-20261029T2016/panel-prekes-390.png), [programinė įranga](D:/Core/output/signaturepads-migration-20261029/deep-comparison-20261029T2016/panel-software-390.png), [planšetės](D:/Core/output/signaturepads-migration-20261029/deep-comparison-20261029T2016/panel-pads-390.png). Visur originalas kairėje.

### A03 — P2: produkto nuotraukų mastelis ir miniatiūros skiriasi

naturaSign Classic originalo pagrindinė nuotrauka 300 × 300 px, Core vaizdo elementas 550 × 500 px. Originalo miniatiūros 100 × 100, Core apie 80 × 75. Mobiliajame taip pat skiriasi pagrindinio vaizdo ir miniatiūrų mastelis.

Šio konkretaus originalaus JPEG talpykloje tikra rezoliucija 300 × 300, o parinktas Core WebP variantas 540 × 540: padidinimas nesukuria naujų detalių. Visų originalių galerijos kampų neprarasta.

Priėmimas: išsaugotas originalo demonstravimo mastelis; nedidinti mažo šaltinio vien dėl konteinerio pločio. Jei pageidaujamas didesnis vaizdas, reikalingas kokybiškesnis originalas. Patikrinti miniatiūrų pakeitimą ir didinimą.

[Kompiuterio palyginimas](D:/Core/output/signaturepads-migration-20261029/deep-comparison-20261029T2016/panel-classic-1440.png), [telefono palyginimas](D:/Core/output/signaturepads-migration-20261029/deep-comparison-20261029T2016/panel-classic-390.png).

### A04 — P2: matuoti netinkami tipografikos vaidmenys ir liko tarpų skirtumų

Originalo kortelės H3 konteineris yra 16 px, tačiau tikras pavadinimo tekstas jo a elemente — 14 px / 21 px, 600. Core a paveldi 16 px / 22,4 px. Todėl keičiasi teksto laužymas ir kortelių aukštis. Pavyzdžiui, Sigma Lite mobiliame kataloge pavadinimas užima daugiau eilučių; paveikslo plotis 152 → 135 px.

naturaSign produkto H1 originalo svoris 600, Core 400. Mobiliame produkto puslapyje teksto plotis 355 → 335 px. Pagrindinio puslapio kontaktų antraštė dėl siauresnės vietos persikelia į dvi eilutes. Pirmo puslapio hero taip pat išlikę nedideli pločio / tarpų skirtumai.

Slapukų politikos strong elementas su www.signaturepads.lt originale 600, Core 700. Vien sutampantys strong tagai nepatvirtina sutampančio svorio; papildomas įrodymas inline-font-weights.json. Pagrindinio ir kategorijų neproduktinės iliustracijos taip pat palygintos pagal medijos šeimas: trūkstamų nerasta (non-product-image-crosscheck.json).

Priėmimas: atkurti faktinio teksto elemento dydį / svorį ir konkrečios sekcijos paraštes. Pasilikti aiškų fokusą ir pakankamai kontrastingus akcentus. Bendras vienodas paraščių pakeitimas visai svetainei būtų per platus.

### A05 — P2: Sigma pristatymo eilutė dubliuojama

/produktas/paraso-plansete-signotec-sigma/ originalas turi vieną „Pristatymas 5-8 d.d.“ pastraipą, Core dvi. Originalas turi 27 netuščias aprašo pastraipas, Core 28; likęs turinys bei paryškinimai sutampa.

Tai parodo tarpinio migracijos rinkinio testų ribą: jo paties klaida gali patekti ir į šaltinį, ir į tikrinamą rezultatą. Tiesioginis palyginimas su gyvu originalu šią klaidą aptiko.

Priėmimas: pašalinti tik papildomą dubliuotą pastraipą per native turinio revizijos / review / release kelią; neremontuoti patvirtinto paketo rankiniu JSON ar CSS slėpimu. Po to kartoti palyginimą su originalu ir 19 produktų kainų / galerijų regresiją.

Įrodymai: paragraph-and-emphasis-crosscheck.json ir atitinkami batch-09 įrašai.

### A06 — P2: seno rikiavimo URL reikšmė nebeišlaikoma

Originalo sąraše yra 5 rikiavimo pasirinkimai, Core 2. Tiesioginis /iranga/programine-iranga/?orderby=date testas: originalas pradeda StepOver eSignatureOffice (125 €), Core signoSign/Universal (14,95 €). Core date parametro neatlieka; HTTP 200 pats savaime nepatvirtina nuorodos funkcijos.

Priėmimas: išlaikyti naudotą rikiavimą pagal naujumą su patikimomis originalo datomis. Populiarumo / vertinimų nereikia atkurti išgalvotais rodikliais; šių pasirinkimų reikalingumas aptartinas. Abu kainos rikiavimai bei 90–100 € filtras jau veikia; vienodų kainų antrinės tvarkos skirtumas nelaikytas prarastu produktu.

Įrodymas: date-sort.json.

### A07 — P2: dialogui trūksta pasiekiamo pavadinimo

Naršyklės accessibility medis: dialog → mygtukas „Uždaryti“ ir paveikslas; pats dialogas neturi pavadinimo. aria-label ir aria-labelledby nėra. Nuotraukos alt yra; Escape užveria.

Priėmimas: priskirti produkto / peržiūros pavadinimą dialogui, patikrinti fokusą atidarius ir užvėrus. Tai tikslinis pasiekiamumo radinys, o ne pilnas WCAG auditas.

Įrodymas: accordion-filter-gallery.json.

## Kas sąmoningai paliekama ir kas nėra klaida

- Metaduomenų pataisos, šeši patvirtinti programų aprašymai, semantikos tvarkymas ir prekybos / Paysera pašalinimas yra sutarti.
- Seni owner nurodyti du nesusiję puslapiai ir prekybos keliai lieka 410. Jie nelaikomi prarastu aktyviu turiniu.
- Native kontaktų forma turi aiškias etiketes, papildomą sutikimą ir validaciją. Tai ne ankstesnio WordPress HTML kopija. Tikras laiškų pristatymas šiame audite nepatvirtintas.
- Originalas ties 768 px turi realų 8 px horizontalų slinkimą kontaktų formoje; Core scrollWidth = clientWidth = 753, scrollX 0. Šios originalo klaidos atkartoti nerekomenduojama.
- Detector grąžino tik 2 stiliaus perspėjimus: Open Sans ir šoninė mėlyna antraštės linija. Abu yra tikro originalo elementai; jų pašalinimas prieštarautų šiai migracijai. Joks automatinis balas neatstoja originalo palyginimo.
- Originalo puslapiai turi paslėptų dubliuotų elementų, galerijos skaidrių ir kintančių panašių produktų rinkinių. Jų kiekiai nėra savaiminis turinio praradimo įrodymas.
- Ankstyvas gallery-original.json fiksavo paslėptą PhotoSwipe markup, ne atvertą originalo langą. Tikras atvertas originalo langas užfiksuotas gallery-original-elementor.json. Prarastų galerijos rodyklių ar fullscreen funkcijos pagal paslėptą markup neteigiama.
- Meniu DOM skiriasi, tačiau originalo pirmas tėvinės nuorodos paspaudimas irgi liko pagrindiniame puslapyje. Nepatvirtintas hover skirtumas neįtrauktas į klaidų sąrašą.

## Trūkstama informacija ir patikros ribos

1. Fizinio iPhone / Android, Safari, tikro touch ir 200% naršyklės mastelio patikra. Bandymas sukurti tikrą Playwright touch kontekstą atmestas: Target.createBrowserContext — Not allowed. 390 px lango plotis to neatstoja.
2. Istoriniams įeinantiems URL, ne vien šiems 26 aktyviems adresams, reikalingas Search Console / 404 žurnalų / senų nukreipimų inventorius. Vien nuorodos buvimas dabartiniame meniu neapima visos istorijos.
3. Pašto autentifikacija ir tikras kontrolinis laiškas su atitinkančiu gavimu INBOX. Vietinės duomenų bazės ar imituoto adapterio PASS nėra laiško gavimas.
4. Atnaujinta užklausų duomenų tvarkymo informacija, operatorius ir saugojimo terminai. Išlikusi slapukų politika mini ir pirkinių krepšelį. Tai turėtų atitikti naują realizaciją prieš publikavimą; šiame audite teisinė atitiktis nesertifikuota.
5. Produkciniai greičio matavimai. Vietinis Core ir optimizuoti failai neįrodo tikro lankytojo LCP / INP / CLS ar SEO pozicijų. Šio audito rezultatas nėra Lighthouse balas.

## Taisymų ir nepriklausomo priėmimo principas

Viena tikslinė A01–A07 taisymų partija, paskui pakartotinis palyginimas. Pirmiausia peržiūra ir katalogų maketai, tada nuotraukų / teksto vaidmenys, Sigma turinio revizija, rikiavimas ir dialogo pavadinimas. Dizaino perkurti nereikia.

Pakartojimui išsaugotas repeat-key-views.playwright.js: Playwright įrankio filename režimu sukuria naują retest aplanką, istorinių vaizdų neperrašo. Žali duomenys leidžia kitam vertintojui matyti URL, lango plotį, kainą, valdiklius ir realius DOM matmenis. evidence-sha256.json leidžia patikrinti failų vientisumą; hash nepatvirtina išvadų teisingumo.

Kitas žmogus gali nepriklausomai:
- tomis pačiomis 1440 / 390 / 320 / 768 px sąlygomis sulyginti reporto poras;
- atverti Sigma Lite greitąją peržiūrą ir perskaityti parametrus;
- patikrinti programinės įrangos filtrų vietą ir 768 px 3 stulpelius;
- atverti orderby=date adresą ir Sigma produkto pristatymo vietą;
- fiziniame telefone atlikti kelią kategorija → produktas → kontaktai; po pašto sąrankos atskirai patvirtinti realų laiško gavimą.

Dokumentas fiksuoja atvirus radinius. Ankstesni techniniai PASS ir atliktas vietinis release jų neuždaro.

