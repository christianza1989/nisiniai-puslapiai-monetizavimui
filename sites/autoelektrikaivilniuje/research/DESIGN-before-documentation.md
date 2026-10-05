# Autoelektrikai Vilniuje — signalas ir aiški užduotis

2026-10-03. Savarankiškas agento pasirinkimas pagal PROJECT_ADAPTATION; BUSINESS parengtas prieš dizainą. Homepage Persuade, gidai Read, užklausos ruošinys Operate. Klientas žiūri telefonu dienos šviesoje prie automobilio ar namie; informacija turi būti šviesi ir gerai įskaitoma, be „naktinio hacker“ diagnostikos stereotipo.

## Tyrimas ir tinklo skirtumai

`research/*-desktop.png` / `*-mobile.png` yra realios 1440×1000 / 390×844 atvertų puslapių ekrano nuotraukos. Pradiniai Bosch/Kalo/AA mobilūs kadrai uždengti cookie dialogu; vien jų nenaudojame dizaino priėmimui. Papildomi `*-clear.png` iš mūsų tyrimo naršyklėje atmestų nebūtinų cookies. Checkengine apsaugos ekranas nėra svetainės dizaino įrodymas; šaltinio tekstinė patikra atskira. FixMyCar pradinis herovaizdas nevisiškai įkeltas, todėl vertiname matomą tekstinį/CTA išdėstymą, ne neiškrautą foną.

| Tikras URL / regionas | Sprendimas mūsų puslapiui | Statusas / ribos |
|---|---|---|
| Kemi elektros diagnostikos paslaugos, pradžia ir kainų blokas | Vienas aiškus klausimas, diagnostikos apimtis atskirai nuo remonto. Neperimti ilgo bendro paslaugų sąrašo | Adapt; mūsų formoje nėra realios registracijos |
| Kalo Vilniaus autoelektriko puslapis, formos ir paslaugos išdėstymas | Aprašymo ir kontaktų ryšys; nedubliuoti didelių formų su miestu, telefonu, paskyromis | Adapt į redaguojamą simptomų ruošinį ir esamą native formą |
| Bosch DE baterijos paslaugos pirmas ekranas | Vienas matomas akumuliatoriaus simbolis ir konkretaus poreikio kalba | Adapt į originalų ženklą; narystės/komandos nuotraukos/serviso paieška reject |
| Bosch PL homepage paslaugų navigacija | Atskirti paslaugų poreikį nuo pagalbinio gido | Adapt; katalogas/servisų tinklas defer |
| AA užvedimo gidas, didelis pavadinimas ir siauresnė proza | Iškart atsakyti į skaitytojo klausimą; turinys atskirai nuo susijusių temų | Adapt į mūsų gidų layout, mobilų natyvų turinį |
| FixMyCar servisų planų puslapio CTA regionas | Aiškiai įvardytas mokėtojas ir komercinis įvykis | Tik BUSINESS; neperimti paskyros, masto/atsiliepimų/garantijų |

Peržiūrėtos tikros miniekskavatoriai `qa/home-desktop-final.jpg`, `home-mobile-final.jpg` (2026-10-01 final): tamsus split tool hero, panorama, geometrinis įrankis ir ilgos gidų eilutės. Peržiūrima laiptucentras v2 final: architektūrinis pusinis image/teksto hero, didelė medžiagos fotografija, palyginimo ruošinys. Mūsų opening yra šviesus didelio masto užrašas mėlyname informaciniame lauke su dviem horizontaliomis simptomų kryptimis ir įterptu konteksto kadru; nėra hero skaičiuotuvo. Viduryje kairės tekstinės juostos ir didelis lokalus simptomo kadras, gidų indeksas nelygaus ritmo foto/editorial grid. Ruošinys kontaktų puslapyje, ne hero. Bendras formų/backend mechanizmas ir operatoriaus teisiniai puslapiai gali sutapti.

Fasadopastoliai/metalo-tvoros dar nepradėtos: jų būsimo koncepto vartas privalės palyginti šį faktinį rezultatą ir pasirinkti kitokį opening, section rhythm, foto kalbą bei įrankio vietą. Savitumas šiuo etapu nėra trijų jau pastatytų svetainių įrodymas.

## Kryptys ir sėkla

Septynios grounded kryptys: 1 dirbtuvių darbo kortelė (aiškūs simptomų laukai), 2 elektros bandymų stendo žymėjimas (etapai ir matavimų ribos), 3 transporto išvykimo/atvykimo lentos (pristatymas ir būsena), 4 automobilio naudojimo vadovo puslapis (rami proza), 5 techninės apžiūros juostų ženklų sistema (ryški orientacija pagal simptomą), 6 įrankių laboratorijos tyrimo lapas (klausimai prieš išvadą), 7 serviso priėmimo lapo užduočių maršrutas (ruošinys prieš kontaktus). Trys šeimos: dokumentai, erdvinė navigacija, prietaisų organizavimas. Seed cd693bdb paskyrė 5; pilna reali išvestis `research/concept-seed.txt`. Sąrašas dokumentuotas po sėklos išvesties, prieš studies/code; to nelaikome nepriklausomu randomizacijos benchmark.

Challengers fuzija: HyperCard navigacija galėtų tvarkyti simptomus, bet pixel/mode switching mažina šiuolaikinio vairuotojo atpažinimą ir aiškumą; declined, pakeliame maršrutų įskaitomumą. Drum-machine vienas ryškus kelias aiškus, tačiau 16 žingsnių, laikrodis ir audio neatitinka realių diagnostikos veiksmų; declined, perimta nuosekli būsenų disciplina. Cel dawn ir iridescent cloud edge nepadeda automobilio diagnozės nežinomybei; declined, pakeliame kiekvieno kadro informacinę paskirtį. Wuxia hoarding hero netinka be fiktyvaus eksperto; declined, pakeliame pagrindinio užrašo mastelį. Kaiju alert klaidingai žadėtų skubų iškvietimą; declined, pakeliame etapų ribos matomumą. Iš jų nekopijuojame motyvų, gradientų, žaidimo ar animacijos. Svarstomi tik agento, ne nepriklausomos komisijos verdictai.

Code-led vietinės HTML studies su tikrais tekstais: A darbo kortelė, B paskirta navigacijos juostų kompozicija, C ramus vadovas. B atrankos priežastis: iš karto susieja simptomą su naudingais keliais, turi aiškų pirkimo poreikio veiksmą ir menkiau primena miniekskavatorių. Rizika: per daug ženklų galėtų sudaryti veikiančio serviso įspūdį, todėl visur rodoma išankstinio piloto riba.

## Brand, sekcijos ir asetai iki generavimo

Originalus SVG ženklas: dvi elektros kontakto pusės, susitinkančios ties tašku; prie jo trumpas „Autoelektrikai / Vilniuje“ wordmark. Favicon ta pati tiksli geometrija; nėra ankstesnio ADC ženklo. Mėlynas hero/informacinis laukas #1949b8, baltas #ffffff, labai šviesus melsvas #eef3ff, pagrindinis ink #15233c, muted #475673, akcija #ffcf52 su tamsiu tekstu. Gilūs mėlyni focus/selection/caret. Raudona tik invalid; jokio neon halo. Display `Barlow Condensed` 600/700, body `Barlow` 400/500/600, savi WOFF2, SIL OFL ir LT glyph patikra. Tai naujas self-host font family, ne paveldėtas Manrope skin.

| Vieta / klausimas | Kompozicija / asetas | Mobile / crop / veiksmas |
|---|---|---|
| Hero: kokį autoelektriko poreikį galiu aprašyti? | Didelis h1, dvi aiškios simptomų nuorodos, pilot caveat, originalus `hero` kadras: nebranduotas automobilis dirbtuvių prieigoje; wide 3:2 | H1 → paaiškinimas/CTA → caveat → 240px foto; centrinis automobilis lieka matomas |
| Simptomo kelias: ką verta užrašyti? | Horizontalių faktų sąrašas ir `battery` kadras: akumuliatoriaus kontekstas, be remonto instrukcijų | Pilni laukai ir 4:3 crop, link į išsikrovimo gidą |
| Apimtis: kuo skiriasi patikra ir remontas? | Trys nevienodi prozos stulpeliai su aiškiomis darbo ribomis, be decorative foto | Stack su tarpais; link į kainos/apimties gidą |
| Gidų preview/index | `battery`, `start`, `scope`: atskiros tikros temos miniatiūros, pirmas platesnis editorinis item | Stack, pavadinimai ir aprašai be foto teksto persidengimo |
| Gidas išsikrovimas | `battery`: medium macro variklio skyrius/akumuliatorius su dirbtuvių šviesa; 3:2 | Center crop, natural width, eager opening |
| Gidas neužsiveda | `start`: žvilgsnis per automobilio langą į užvedimo mygtuko/prietaisų kontekstą be klaidų skaičių; 3:2 | Central hands/car interior, be fiktyvios diagnozės |
| Gidas diagnostikos kaina | `scope`: techninio darbo dokumento ir diagnostikos įrankio kontekstas; be tariamo kainoraščio; 3:2 | Clear document/tools composition, jokių tekstinių skaičių |
| Kontaktai / apie / redakcija / privacy / terms | Tik tekstas ir tikra forma; dekoratyvinė foto neprideda įrodymo | Natyvi forma, natyvus menu/details ir tikros nuorodos |

Kiekviena originali fotografijos iliustracija turi privatų exact prompt, alt ir teisėtą kilmę; nėra realus darbuotojas, automobilio klientas, dirbtuvės ar atliktas darbas. Negeneruojame mokomo elektros jungimo, specifinių modelių/skaičių. Importuoti per MEDIA_CORE. Hero vėlesnis battery supporting kadras ir gidų preview turi skirtingas roles; responsive dydžiai nėra papildomi vaizdai.

## Naudingas ruošinys

Kontaktų puslapyje padėti lankytojui surašyti automobilį, simptomą, laiką, ankstesnius bandymus ir pristatymą. Rezultatas yra redaguojama įprastos formos žinutė; nėra automatinės diagnozės, kainos, persiuntimo ar paslėpto storage. Tušti laukai lieka aiškūs nežinomi; duomenų nesiunčia iki native submit. Nereikia nepriklausomo kainų skaičiuotuvo. Forma be JS turi visą klausimų sąrašą ir laisvos žinutės kelią.

## Direction contract

THESIS: vairuotojas iš neaiškaus simptomo pereina į tikslų poreikio aprašą; kategoriško gedimo spėjimo ir netikro iškvietimo nėra.

OWN-WORLD: baltos/mėlynos informacinės juostos, didelis kondensuotas užrašas, kompaktiška dviejų kontaktų SVG geometrija, švarūs fotografiniai dirbtuvių kontekstai.

STORY: pasirinkti simptomą → suprasti tyrimo apimtį → parengti žinutę → pateikti išankstinį poreikį.

FIRST VIEWPORT: visas pločio mėlynas h1 laukas, apačioje kryptys ir caveat, ne hero skaičiuotuvas; konteksto foto sąmoningai įterpta kaip platus mažesnio aukščio langas. CTA į aiškų poreikio paaiškinimą/kontaktus.

FORM: grounded candidate 5, seed cd693bdb; code-led dev studies. Routine decisions by agent, ne savininko approval. Code-led parinktas pagal projektinę autonominę adaptaciją; global setting nekuriamas.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

Spacing 8/16/24/40/64/96px; content max1200px, article max720px. Desktop rail/toc naudojamas tik tikram gidų orientavimuisi; 800px collapses į natyvų details. Body18px, lineheight1.65, utility min14px. H1 clamp44–88px, tracking≥−.03em. Touch controls≥44px; focus matomas. Transitions tik hover/focus ≤160ms, reduced motion išjungia. Actual screenshots/finishing/craft/detector/LH bus pridėti po implementavimo, šis planas dar nėra jų PASS.
