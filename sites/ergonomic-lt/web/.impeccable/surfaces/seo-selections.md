---
version: 1
slug: "seo-selections"
primary_target: "src/components/legacy-page.tsx"
related_targets: ["src/lib/legacy-article.ts","src/components/seo-selection.tsx","src/app/seo-surfaces.css","content/seo-article-images.json"]
---

# SEO straipsniai, 2026-10-13

## Dabartinė sutartis

MODE: Read. Tai patvirtintos Bright office showroom tapatybės straipsnių išplėtimas; produktų kortelės ir veiksmai pernaudoja esamą Operate katalogo sistemą.

OWNER: visus aštuonis senus vidinius SEO URL paversti šiuolaikiniais straipsniais su mūsų dabartiniais produktais, pašalinti prikabintą seną keturių kategorijų juostą. Seni adresai, originalūs H1, tekstai, metaduomenys ir esami antraščių ID išsaugomi. Pašalinamas tik aiškiai atsisakytas kategorijų ir „FILTRUOTI PREKES“ UI; originalus importas lieka neperrašytas. Leidimas vietinei ir viešai peržiūrai nesuteikia pagrindinio domeno paleidimo kvito.

ROUTES: /biuro-kedes/, /ergonomines-kedes/, /ergonominiai-stalai/, /ergonomika-darbo-vietoje-reikalavimai/, /aktyvus-sedejimas/, /mokykliniai-baldai/, /shop/balansines-kedes/, /shop/priedai/.

THESIS: aiškus originalaus straipsnio skaitymas, natūrali erdvės fotografija, tikri susiję modeliai ir konkretus kelias į katalogą ar užklausą.

OWN-WORLD: Manrope, miško antraštės, kreidos skaitymo fonas ir šalavijo modelių plokštuma, plonos linijos, tiesūs vaizdai, 4px veiksmai, vienas bendras homepage header ir tamsus footer. Homepage ir tikros konfigūracijos bei užklausų elgsena išlieka.

FIRST VIEWPORT: desktop asimetriška H1 / įvado / veiksmų kolona šalia didelės erdvės fotografijos; telefone ta pati seka virš nuotraukos. K01/B01/P01/S03 pernaudojami iš pasirinktos homepage kolekcijos, su „Biuro aplinkos vizualizacija.“ pastaba. Mokyklinis hero naudoja importuotą klasės nuotrauką. Techninės iliustracijos lieka originalaus turinio dalis, su responsive WebP išvestinėmis ir kilmės SHA256 registru content/seo-article-images.json.

TYPE: lokalus H1 clamp(32px,3.5vw,50px)/650/1.12/-.025em; ≤800px 36px, ≤500px 32px. Įvadas 17px/400/1.75, ≤1000px 16px, iki 48ch (≤800px 65ch). Originalus tekstas 16px/400/1.8, ≤500px 1.75, iki 72ch. H2 clamp(24px,2.2vw,30px)/650/1.25, H3 21px/650/1.35 (≤500px 20px), H4 18px/650/1.4; antraščių tracking -.025em. Turinys 16px/650/1.5, nuorodos 14px/400/1.6, poskyriai 13px; caption 13px/400/1.6 muted. Modelių H2 clamp(24px,2.4vw,32px)/650/1.2. Visi tikslūs lokalūs vaidmenys ir kontrasto poros dokumentuoti DESIGN.md „SEO article extension“. 50px/36px nėra bendro katalogo ramp pakeitimas; du detektoriaus advisory išsaugoti kaip pirminis įrodymas.

GEOMETRY: konteineris iki 1440px su inner gutter; hero .85fr/1.15fr, tarpas clamp(28px,4vw,64px), nuotraukos cover aukštis clamp(340px,32vw,470px). ≤1000px vaizdas 340px; ≤800px hero viena kolona, nuotraukos auto height ir 1586/992 ratio. Skaitymas 230px turinys / iki 760px tekstas, tarpas clamp(32px,6vw,88px); turinys sticky top24px su aukščio/scroll riba. ≤1000px turinys190px/tarpas32px; ≤800px viena skaitymo kolona ir in-flow turinys su dviem nuorodų stulpeliais, ≤500px vienu. Be importuotų H2/H3 rodomas vienas skaitymo stulpelis. Techniniai body vaizdai contain, auto height be aukščio limito. Modelių grid pernaudoja 5/4/3/2 geometriją; faktinis kortelių kiekis priklauso nuo tinkamų modelių.

STORY: straipsnis ir atviros turinio nuorodos → aktualūs tikri modeliai → palyginimas ir FAQ pagal maršrutą → susijusios temos → užklausos juosta → bendras footer. Gidai taip pat gauna susijusių stalų/kėdžių modelius. Mokyklinio puslapio katalogo modeliai skirti mokytojams ir administracijai; patvirtinta individuali STEAM stalų, spintų ir kitų kietųjų baldų gamyba pateikiama atskiru pasiūlymu. Gamintojų tapatybė lieka vidinė pagal PRODUCT.md ir AGENTS.md.

INTERACTION: native turinio/heading nuorodos ir originalūs ID, generuojami tik trūkstami ID; buvusios nuorodos be href veda į tikrą sekciją. ≥44px TOC/read-more/contact nuorodos, native FAQ details su ≥44px summary, paveldėtas stiprus focus. Primary hero veiksmas užpildo plotį ≤650px; reading link ≤500px. Palyginimo lentelė slenka savo konteineryje. Naujas judesys ar konfigūracijos state nepridedamas.

EVIDENCE: D:/Core/output/ergonomic-seo-articles-20261013/DIRECTION.md ir FINISH_REVIEW.md (`ship`, 20 aktualių 1440/390px vaizdų, materialių pataisymų nėra). Vietinis seo-check: 9 saugomi puslapiai / 68 turinio blokai, originalių tekstų ir metadata sutartis PASS su užfiksuotomis retired UI išimtimis. Article-check: 8 straipsniai / 28 vaizdų adresai / 23 tikri produktų adresai PASS. Pateikti 5 esami testai ir Next/Cloudflare build bei TypeScript PASS; browser-checks fiksuoja užsikrovusius hero, validžius anchor ir nėra horizontalios perpildos 1440/390px. Dokumentavimo užduotis skaitė šaltinius ir įrodymus, naujos browser/build/testų patikros neatliko. Viešas šio straipsnių etapo diegimas priklauso vykdančiai užduočiai ir turi atskirą kvitą.

RELEASE RECEIPT: vykdančios užduoties release.json patvirtina peržiūros versiją 76091935-cacf-4db4-9cbc-c92e176f8af0 ir viešas SEO 9/68 bei straipsnių 8/28/23 patikras PASS. Dokumentuotojas perskaitė šį atskirą kvitą, bet diegimo / viešų patikrų nekartojo. Tai užbaigia ankstesnį šio etapo laukiamą viešą kvitą; pagrindinis domenas nepakeistas.

## Istorinės ankstesnio SEO atrankų etapo pastabos

Toliau palikti ankstesnio etapo įrašai originalia forma. Jų gamintojo nuotraukų / contain įvado ir bendrų inner reading vaidmenų aprašą šiuose aštuoniuose straipsniuose pakeičia dabartinė sutartis aukščiau. Gamybos, tikrų atrankų ir pasirinkto homepage fotografijų faktai išlieka atitinkamų etapų įrodymai.

# SEO atrankos ir gamyba, 2026-10-13

MODE: Read pasirinkimo tekstams; Operate modelių atrankoms. Išlaikomas esamas homepage pasaulis ir kompaktiškas vidinių puslapių tankis.

OWNER: įgyvendinti SEO plano V2 punktus vietinėje ir viešoje peržiūroje. Savininkas patvirtino bet kokių kietųjų baldų gamybą pagal užsakymą, įskaitant STEAM stalus ir spintas. Pagrindinio domeno paleidimas į šį etapą neįeina.

SURFACE: senas vienas H1 ir originalus tekstas lieka. Komerciniai puslapiai gauna įvadą su originalia gamintojo nuotrauka, skirtingų šeimų modelių korteles, palyginimo lentelę, konkrečius klausimus ir aktualias nuorodas. Mokykliniame puslapyje katalogo kortelės aiškiai skirtos mokytojams ir administracijai; nestandartiniai mokymo baldai – atskiras gamybos pasiūlymas. Katalogo atrankos ir SEO puslapiai naudoja tą patį konkrečių komplektacijų registrą.

TYPE: esami Manrope inner-page-title, inner-section-title, inner-body ir inner-reading vaidmenys iš DESIGN.md. Fotografijos aprašas / skaičius 13px, 1.6, antrinė teksto spalva. Lentelė paveldi kūno dydį, 1.6, eilutės antraštė semantinis th. Native details summary 600, bent 44px, klaviatūros fokusas bendras. Tekstas 65–75ch. Naujo homepage didžiojo bloko H2 paveldi buvusio kolekcijos pavadinimo 28–44px/800/1.2/-0.027em rolę.

GEOMETRY: vidinio puslapio dviejų kolonų įvadas iki 800px persirikiuoja į vieną; nuotraukos contain, 300px/260px aukščio plotas, originalūs pikseliai ir pilkas fonas. Lentelė prireikus slenkama savo konteineryje. Kortelės pernaudoja esamą 5/4/3/2 kolonų tinklelį. Header/footer geometrija viena ir nekinta. Kataloge 20 modelių puslapyje.

EVIDENCE: content/seo-collection-membership.json turi šaltinį ir kriterijų kiekvienai komplektacijai; content/home-seo-provenance.json turi keturių naudojamų fotografijų SHA256. tests/seo-restructure.test.ts ir scripts/check-seo-restructure.ts tikrina klasifikaciją, seną turinį ir tikrus URL. Patikrų rezultatai saugomi D:/Core/output/ergonomic-restructure-plan-20261013-v2/implementation.

2026-10-13 galutinis savininko homepage fotografijų pasirinkimas: K01 ergonominėms kėdėms, B01 balansinėms kėdėms, P01 darbo vietos priedams ir S03 elektriniams stalams. Tai AI biuro aplinkos vizualizacijos, todėl homepage žyma „Biuro aplinkos vizualizacijos“ pakeičia ankstesnį gamintojo pavyzdžių aprašą. Originalai content/home-office-originals/, optimizuotos 400/800/1586px WebP versijos public/media/home-office/, pasirinkimo ir originalų SHA256 registras content/home-office-selection.json. Nuotraukos užpildo vaizdo plotą; SEO adresai ir kiti homepage blokai išlaikyti. Kitų 16 variantų ir pavyzdžių aplanko pašalinimas į Windows šiukšliadėžę užfiksuotas D:/Core/output/ergonomic-home-office-final-20261013/cleanup.json.

2026-10-14: keturios esamos SEO atrankos yra pilni serveriniai katalogai (132 / 58 / 7 / 6 modeliai), po 20 puslapyje; seni tekstai ir K01/B01/P01/S03 fotografijos išsaugoti, straipsnis pateikiamas po atranka. Headerio Katalogas ir šoninės temos veda tiesiai į SEO URL. Pavadinimus generuoja product-presentation, kelio paritetą saugo BreadcrumbTrail. Keisti tik produkto viešą H1 lauką, ne supplier name/URL/ID. Ilgas bendro katalogo puslapiavimas turi native details, kuriame visos href nuorodos prieinamos be JS. Naujos savavališkos tipografikos pakopos nepridėtos. Pilnas kontraktas SEO_STRUCTURE.md; kito chato product-studio-02 maketas išsaugotas.
