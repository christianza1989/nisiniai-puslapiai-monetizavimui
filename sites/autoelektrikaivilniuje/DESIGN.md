---
name: "Autoelektrikai Vilniuje"
description: "Informacinės juostos nuo pastebėto simptomo iki aiškios išankstinės žinutės."
colors:
  primary: "#1949b8"
  ink: "#15233c"
  neutral-bg: "#fff"
  pale: "#eef3ff"
  muted: "#475673"
  action: "#ffcf52"
  action-hover: "#ffde89"
  route-hover: "#214fac"
  line-soft: "#d8e0ed"
  line: "#b5c5e3"
  line-on-blue: "#7999df"
  field-border: "#7891bd"
  placeholder: "#526481"
  invalid: "#a32323"
typography:
  display:
    fontFamily: "'Barlow Condensed', Arial, sans-serif"
    fontSize: "clamp(44px, 6.5vw, 88px)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-.015em"
  page-title:
    fontFamily: "'Barlow Condensed', Arial, sans-serif"
    fontSize: "clamp(42px, 5.5vw, 72px)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-.015em"
  headline:
    fontFamily: "'Barlow Condensed', Arial, sans-serif"
    fontSize: "clamp(34px, 4vw, 48px)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-.015em"
  title:
    fontFamily: "'Barlow Condensed', Arial, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-.015em"
  body:
    fontFamily: "Barlow, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.65
  action:
    fontFamily: "Barlow, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.65
  navigation:
    fontFamily: "Barlow, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 500
    lineHeight: 1.65
  label:
    fontFamily: "Barlow, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 500
    lineHeight: 1.65
  caption:
    fontFamily: "Barlow, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  control: "0"
spacing:
  xs: "8px"
  s: "12px"
  sm: "16px"
  gutter-mobile: "20px"
  md: "24px"
  m: "28px"
  gutter-tablet: "32px"
  l: "36px"
  lg: "40px"
  xl: "48px"
  section-mobile: "56px"
  xxl: "64px"
  section: "80px"
  section-large: "96px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.ink}"
    typography: "{typography.action}"
    padding: "12px 22px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
  button-secondary:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.primary}"
    typography: "{typography.action}"
    padding: "12px 22px"
  button-secondary-hover:
    backgroundColor: "{colors.pale}"
  nav-action:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.primary}"
    typography: "{typography.navigation}"
    padding: "10px 16px"
  field:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  worksheet:
    backgroundColor: "{colors.pale}"
    textColor: "{colors.ink}"
    padding: "36px"
  form-panel:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.ink}"
    padding: "36px"
---

# Design System: Autoelektrikai Vilniuje

## Overview

**Creative North Star: "Signalas ir aiški užduotis"**

Ryškios mėlynos informacinės juostos, baltas skaitymo laukas ir kondensuoti pavadinimai padeda vairuotojui pereiti nuo pastebėto simptomo prie tikslesnio aprašo. Originalus dviejų kontaktų SVG ženklas sieja šį pasaulį su elektra; realistiškos temos iliustracijos duoda kontekstą, o didelės antraštės ir atviri prozos plotai duoda orientaciją.

Sistema skirta dienos šviesoje telefonu skaitomam išankstinio poreikio pilotui. Ji rodo klausimus ir diagnostikos ribas, todėl jos negalima paversti veikiančio serviso, užsakymo ar automatinės diagnozės pažadu. Įprastus vizualinius sprendimus šioje sesijoje pasirinko agentas pagal projekto adaptaciją; žmogaus patvirtinto comp nėra.

**Key Characteristics:**

- Nenutrūkstantis mėlynas laukas ir šviesios prozos pertraukos.
- Barlow Condensed pavadinimai su Barlow skaitymo tekstu.
- Geltonas konkretus veiksmas, mėlynos tekstinės nuorodos.
- Tiesūs kampai, dalijančios linijos ir nevienodas gidų nuotraukų ritmas.
- Neprivalomas redaguojamas ruošinys ir tiesioginis kelias į natyvią formą.

Normatyvūs primityvai yra šio failo frontmatter. [Sidecar](.impeccable/design.json) papildo juos tikromis būsenomis, breakpoint, crop ir kilmės nuorodomis. CSS ir komponentų šaltiniai lieka įgyvendinimo autoritetas; pridėta sprendimų istorija nėra naujų puslapių tokenų šaltinis.

## Colors

Paletė turi ryškią orientacijos mėlyną, vieną geltoną veiksmo akcentą ir vėsius skaitymo neutralius tonus.

### Primary

- **Informacinė mėlyna** — pagrindinis hero ir užklausos callout laukas, ženklas, tekstinės nuorodos, formos fokusas ir caret.
- **Geltonas veiksmas** — pagrindinis mygtukas, teksto pažymėjimas ir fokusas mėlyname lauke; su tamsiu ink tekstu. Mygtuko hover turi atskirą šviesesnę būseną.

### Neutral

- **Baltas skaitymo laukas** — pagrindinė proza, formos panelė ir įvestys.
- **Šviesus melsvas laukas** — apimties blokas, neprivalomas ruošinys ir poraštė.
- **Ink** — pagrindinis tekstas ir geltonų veiksmų tekstas.
- **Muted** — breadcrumb, autorystė ir pagalbinės iliustracijų antraštės.
- **Trys linijų kontekstai** — švelni navigacijos linija, aiškesnė faktų/formos/skyriklių linija ir atskira šviesi linija mėlyname lauke.
- **Įvesties būsenos** — atskiras įvesties stroke ir placeholder; raudona naudojama tik vartotojo jau paliestos netinkamos įvesties kraštui.

**The Informacinės juostos Rule.** Mėlynas laukas sutelkia orientaciją ir veiksmą; ilga proza lieka baltame arba pale lauke.

**The Sąžiningo signalo Rule.** Akcentas rodo navigaciją ir formos būseną, o ne išgalvotą gedimo diagnozę, kainą ar skubią serviso prieinamumo būseną.

## Typography

**Display Font:** Barlow Condensed su Arial ir sans-serif fallback.  
**Body Font:** Barlow su Arial ir sans-serif fallback.

Savi WOFF2 turi latin ir latin-ext variantus. Naudojamas normalus stilius; tikrų pavadinimų svoris yra 600. Parsisiųstas Condensed 700 failas nėra atskiras naudojamas antraštės tokenas. Kilmė ir SHA yra research/fonts.json, vieša fontų CSS bei Barlow OFL failai nurodyti sidecar.

### Hierarchy

- **Display** — homepage h1; frontmatter display dydis ir sekimas.
- **Page title** — vidinių puslapių h1; atskira mažesnė clamp.
- **Headline** — pagrindinis h2; kondensuota šeima ir trumpas line-height.
- **Title** — prozos h3. Gidų pasirinkimo pavadinimai naudoja atskirą CSS dydį (34px desktop, 32px mobile), o ne naują bendrą display šeimą.
- **Body** — ilga proza; straipsnio plotis iki 720px.
- **Action / Navigation / Label** — aiškūs mygtukai, navigacija ir matomi formos label; ne visos pagalbinės eilutės paverčiamos caps.
- **Caption** — iliustracijos antraštė. Breadcrumb/byline pagalbinis tekstas naudoja tą patį dydį su savo line-height; tai detalizuota sidecar.

Hero paaiškinimas yra 23px/1.4, vidinio puslapio įvadas 22px/1.5, piloto riba 15px/1.6. Mobilūs dydžių pakeitimai yra sidecar; frontmatter nėra fiktyvi universali visų h1 dydžio taisyklė.

**The Dviejų balsų Rule.** Kondensuota šeima skirta pavadinimams ir ženklui; aplinkybes, ribas ir formos įvestį skaitome Barlow.

## Layout

Bendra didžiųjų sekcijų talpa yra iki 1200px; straipsnio proza iki 720px. Desktop pagrindinio hero pavadinimas užima bendrą plotį, po juo yra dvi lygios prozos ir iliustracijos skiltys, o tik tada dvi simptomų kryptys. Tai faktinė final tvarka, ne ruošinys hero viduje.

Homepage ritmas: mėlynas hero → balta simptomo/faktų sekcija → pale apimties sekcija → nevienodas gidų grid → balta parengimo proza → mėlynas callout → pale poraštė. Simptomo sekcija yra 5:6 su didesniu tarpu; apimtis ir parengimas yra dviejų skilčių. Pradiniame plane minima trijų stulpelių apimtis nebuvo įgyvendinta.

Gidų indekse po trumpo įvado iš karto rodomas vizualus pasirinkimas; visa patvirtinta aiškinamoji proza palikta žemiau. Desktop pirmasis gidas užima dvi grid eilutes ir turi aukštesnę 4:3 nuotrauką; kiti turi 2.4:1 nuotraukas. Gido skaitymo layout turi iki 720px straipsnį ir 200–300px turinio rail su 80px tarpu. Kontaktų ruošinys ir natyvi forma desktop yra gretimi, tiesioginis #zinute kelias pateiktas jau įvade ir prieš ruošinį.

- **Iki 1240px:** didžiosios talpos gauna 32px šoninius tarpus; mažėja hero, simptomų ir gido rail tarpai.
- **Iki 800px:** šoniniai tarpai 20px; desktop navigaciją pakeičia native details meniu, visi didieji grid tampa viena kolona. Hero tvarka: h1 → paaiškinimas ir CTA → piloto riba → 240px aukščio iliustracija → du vienas po kito simptomų keliai. Tai reiškia, kad simptomų pasirinkimas telefone yra žemiau iliustracijos.
- **Gidai iki 800px:** rail persikelia prieš straipsnį ir išlieka native details; gidų pasirinkimo nuotraukos tampa 3:2.
- **Kontaktai iki 800px:** ruošinys eina prieš formą, bet matomos tiesioginės nuorodos leidžia jį praleisti. Panelių padding tampa 24px, veiksmo mygtukai viso pločio.

Spacing frontmatter yra pakartotinai naudojami realūs tarpai; tai nėra visą CSS matematiškai uždaranti aštuonių pikselių sistema. Hero turi ir 56px viršutinį padding, 36px atskyrimą; reguliarių sekcijų atstumai svyruoja pagal paskirtį. Tikslios situacinės reikšmės paliktos šaltinyje ir sidecar.

**The Pasirinkimo pirmumo Rule.** Gidų pasirinkimas seka trumpą įvadą, o formos tiesioginis kelias matomas prieš neprivalomą ruošinį.

## Elevation & Depth

Sistema yra plokščia: gylį kuria spalvų laukai, prozos tarpai, skyrikliai ir tikri iliustracijų kadrai. Hero, gidai, forma ir ruošinys neturi dekoratyvių kortelių šešėlių. Vienintelė CSS šešėlio išimtis yra atverta mobili navigacija: lengvas ambient šešėlis atskiria virš turinio esantį meniu. Tikslus snippet yra sidecar.

**The Plokščio lauko Rule.** Įprastos sekcijos lieka plokščios; šešėlis skirtas tik mobiliojo meniu persidengimui.

## Shapes

Tiesūs kampai ir dalijančios linijos yra stebėta geometrija. Įvestys aiškiai turi nulinį border-radius. Kitų panelių, mygtukų ir nuotraukų CSS nenustato užapvalinimo; matomas rezultatas yra stačiakampis. Mėlynos gido turinio rail viršuje naudojama tiesi 3px linija, o ne apvali akcentinė kortelė.

Ženklas yra originali 40×40 SVG dviejų kontakto pusių geometrija su centriniu tašku; mobile rodomas 34×34. Wordmark yra tekstas, su tikru tarpu tarp žodžių ir antros eilutės „Vilniuje“. Favicon naudoja tą pačią geometriją. Tekstinės nuorodų rodyklės ir native summary marker yra navigacijos ženklai; jos nekuria atskiros dekoratyvinių glyph ikonų sistemos.

## Components

### Buttons

Konkretaus veiksmo stačiakampiai. Primary naudoja action ir ink, secondary baltą lauką su mėlyna linija bei tekstu; abu turi 12px 22px padding ir mažiausiai 52px aukštį. Secondary hover pereina į pale, primary į action-hover. Ruošinio mygtukas yra type=button ir prieš hidrataciją disabled; jo opacity .55 nėra nauja spalva. Nėra atskiros custom active būsenos.

### Inputs / Fields

Matomi label virš įvesčių, pagalba žemiau label. Balta įvestis, ink tekstas, field-border, 10px 12px padding, tiesūs kampai ir mažiausiai 48px aukštis. Textarea galima didinti vertikaliai. Placeholder yra tik neprivalomo ruošinio input; natyvios žinutės formos label nepakeičiami placeholder. User-invalid įvestis turi 2px invalid kraštą; textarea neturi sugalvoto placeholder tokeno.

Fokusas baltame ir pale lauke yra 3px mėlynas outline su 5px offset. Hero/callout fokuso outline geltonas. Teksto selection yra geltonas su ink tekstu; caret mėlynas tik input/textarea. Consent checkbox turi atskirą native 22×22 dydį ir mėlyną accent-color; tai nėra 48px aukščio checkbox.

### Cards / Containers

Gidų pasirinkimai yra atviri redakciniai blokai be kortelės fono, border ar šešėlio. Ruošinys yra pale panelė, forma balta su aiškesne linija; jų desktop padding 36px, mobile 24px. Formos tikslas yra matomas #zinute anchor su tabIndex=-1, todėl native fragment kelias gali fokusuoti formą.

### Navigation

Desktop navigacija naudoja Barlow 17px/500, didelius paspaudimo plotus ir underline tik dabartiniam puslapiui. Header veiksmas turi mėlyną 1px border. Mobile navigacija yra tikras details/summary su 44px mažiausio aukščio taikiniais ir virš turinio atveriamu baltu meniu. Skip link pasirodo gavęs fokusą. Gido contents details lieka natyvus visuose pločiuose; jo rail keičiama vieta, ne turinys.

### Signature: simptomų juostos ir žinutės ruošinys

Dvi simptomų juostos mėlyname hero yra skirtos dviem skirtingiems klausimams. Desktop jos horizontalios su dalijančia linija, mobile vienas po kito; jų hover turi atskirą route-hover. Mažoji prieš jas esanti konteksto eilutė priklauso kiekvienai nuorodai, nėra bendras virš antraštės dedamas kicker.

Neprivalomas ruošinys renka automobilį, simptomą, laiką, ankstesnius bandymus ir pristatymą. Paruošta žinutė yra redaguojama ir gauna fokusą; tušti laukai paliekami „Nežinau / reikia aptarti“. Type=button nieko nesiunčia. Tik natyvios formos submit daro POST į /uzklausa; be JS lieka laisvai redaguojama žinutė ir tiesioginis #zinute kelias.

Nuorodos ir mygtukai turi tik trumpus background-color/color perėjimus (120ms, numatytas CSS ease). Prefers-reduced-motion juos išjungia. Entrance, nuolatinės ir dekoratyvios animacijos šaltinyje nėra.

## Do's and Don'ts

### Do:

- **Do** išlaikyti Barlow Condensed pavadinimų ir Barlow prozos vaidmenis.
- **Do** išsaugoti piloto ribą greta pagrindinio veiksmo ir native formos.
- **Do** gidų pasirinkimą rodyti po trumpo įvado, o tiesioginį formos kelią prieš neprivalomą ruošinį.
- **Do** naudoti MEDIA_CORE responsive WebP šeimą su faktinį CSS plotį atitinkančiu sizes.
- **Do** kiekvieną temos crop ir mažą ekraną peržiūrėti realioje ekrano nuotraukoje.
- **Do** išsaugoti matomą keyboard fokusą, native details ir reduced-motion taisyklę.

### Don't:

- **Don't** konteksto iliustracijų pateikti kaip mūsų serviso, darbuotojų ar klientų atliktų darbų.
- **Don't** išankstinio poreikio formos stilizuoti kaip rezervacijos, diagnozės ar kainos pasiūlymo.
- **Don't** tokenais įteisinti pridėtų dekoratyvių kortelių šešėlių, caps kicker ar glyph ikonų rinkinio.
- **Don't** techninių balų, viewport emuliacijos ar vieno atmesto detector radinio vadinti visos dizaino sistemos PASS.

### Šaltiniai, priėmimas ir dokumentacijos ribos

2026-10-03 dokumentuotas faktinis local build. Autoritetingi šaltiniai yra C:/Users/lenovo/Documents/dovanos-memorycasting/components/niche/autoelektrikaivilniuje-site.tsx, autoelektrikaivilniuje-site.module.css ir autoelektrikaivilniuje-site.tools.tsx; sidecar saugo jų SHA ir linijų nuorodas. Dokumenterio peržiūrėti homepage, indekso, užvedimo gido ir kontaktų realūs desktop/mobile top bei reprezentatyvūs full/message kadrai. Kitos šešių puslapių / siauro / tablet peržiūros apimtis yra fresh reviewer evidence, ne dokumenterio naujai pakartota patikra.

[Finish review](qa/finish-review.json) turi pradinį fix 8.2/10 ir vėlesnį bounded confirmation: F1/F2 resolved, ship tik vertintų taisymų apimčiai. Dabartinis 8.6/10 yra subjektyvus ribotas įvertinimas, ne naujas visų paviršių regrade ar 9/10. [Review fixes](qa/review-fixes.json) ir [UI confirmation](qa/review-confirm-ui.json) fiksuoja tikrą chooser-first, literal brand whitespace, keyboard native #zinute ir no-JS kelią be papildomo POST. Detector paleistas vieną kartą; tiesaus rail border perspėjimą reviewer patvirtino false-positive, bet whole-floor PASS nenustatytas. Detector nekartotas dokumentuojant.

[Lighthouse summary](qa/lighthouse-summary.json) ir [UI flow](qa/ui-flow.json) yra atskiri techniniai įrodymai, ne vizualinis verdiktas. 200% realus browser zoom išlieka UNVERIFIED; viewport emuliacija nėra fizinis įrenginys. WCAG conformance, gyvas DNS/TLS, realus SMTP gavimas, partneris, paslaugų pajėgumas, kaina ir paklausa nepatvirtinti. Vietinė forma aiškiai pažymėta sintetiniam bandymui; SMTP ir voice išjungti. Šis dokumentas nepaleidžia svetainės, nekeičia PRODUCT ar global settings.

[MEDIA.json](MEDIA.json) yra privataus originalo/prompt, SHA, peržiūros ir responsive variantų žurnalas. Hero 282px desktop/240px mobile cover; supporting battery 4:3; pirmas pasirinkimo gidas 4:3 desktop, kiti 2.4:1; visi mobile pasirinkimai ir pagrindiniai gido vaizdai 3:2. Crop yra central default object-position, ne išgalvotos focal-point koordinatės. Parent renderer sizes turi realias 800px ir 1240px sąlygas; GuideList sizes 760px užuomina nėra CSS layout breakpoint. Savininko privataus prompt/originalo ir viešo WebP sutartis pakeičia upstream public-raster prompt embedding pavyzdį.

Sidecar nekuria sintetinių tonal ramp: šaltinyje jų nėra, todėl būtų netikri normatyvūs tokenai. Component snippets yra dokumentacijos demonstracijos, ne antroji produkto realizacija ir ne veikiantis klientų siuntimas. Jokie craft-floor defektai, rasti tik kai kurioje būsenoje, netampa house style; dokumenteris nekeičia ar „pataiso“ kodo.

## Decision history — iki įgyvendinimo

Toliau išlaikomas visas tos pačios sesijos pradinis planas. Tik heading lygiai pastumti dėl kanoninių sekcijų tvarkos; originali nepakeista kopija yra [DESIGN-before-documentation.md](research/DESIGN-before-documentation.md). Tai tyrimo, sėklos, pasirinkimų, asset plano, faktų ir ribų kilmė. Jei planas prieštarauja faktiniam rezultatui, aukščiau esantis normatyvus aprašas ir aktualus šaltinis turi pirmenybę.

Aiškūs skirtumai: plane numatytas gilus mėlynas selection tapo geltonu/ink; display 600/700 tapo realiai naudojamu 600; 8/16/24/40/64/96 planinė ritmo santrauka nėra uždara CSS sistema; hero faktinė tvarka išdėstyta Layout; apimtis yra dvi, ne trys skiltys; final index chooser eina prieš patvirtintą prozą; final contact turi tiesioginius #zinute kelius prieš neprivalomą ruošinį. Nei pradinio plano, nei pirmojo reviewer fix įrodymų atgaline data nekeičiam.

### Autoelektrikai Vilniuje — signalas ir aiški užduotis

2026-10-03. Savarankiškas agento pasirinkimas pagal PROJECT_ADAPTATION; BUSINESS parengtas prieš dizainą. Homepage Persuade, gidai Read, užklausos ruošinys Operate. Klientas žiūri telefonu dienos šviesoje prie automobilio ar namie; informacija turi būti šviesi ir gerai įskaitoma, be „naktinio hacker“ diagnostikos stereotipo.

#### Tyrimas ir tinklo skirtumai

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

#### Kryptys ir sėkla

Septynios grounded kryptys: 1 dirbtuvių darbo kortelė (aiškūs simptomų laukai), 2 elektros bandymų stendo žymėjimas (etapai ir matavimų ribos), 3 transporto išvykimo/atvykimo lentos (pristatymas ir būsena), 4 automobilio naudojimo vadovo puslapis (rami proza), 5 techninės apžiūros juostų ženklų sistema (ryški orientacija pagal simptomą), 6 įrankių laboratorijos tyrimo lapas (klausimai prieš išvadą), 7 serviso priėmimo lapo užduočių maršrutas (ruošinys prieš kontaktus). Trys šeimos: dokumentai, erdvinė navigacija, prietaisų organizavimas. Seed cd693bdb paskyrė 5; pilna reali išvestis `research/concept-seed.txt`. Sąrašas dokumentuotas po sėklos išvesties, prieš studies/code; to nelaikome nepriklausomu randomizacijos benchmark.

Challengers fuzija: HyperCard navigacija galėtų tvarkyti simptomus, bet pixel/mode switching mažina šiuolaikinio vairuotojo atpažinimą ir aiškumą; declined, pakeliame maršrutų įskaitomumą. Drum-machine vienas ryškus kelias aiškus, tačiau 16 žingsnių, laikrodis ir audio neatitinka realių diagnostikos veiksmų; declined, perimta nuosekli būsenų disciplina. Cel dawn ir iridescent cloud edge nepadeda automobilio diagnozės nežinomybei; declined, pakeliame kiekvieno kadro informacinę paskirtį. Wuxia hoarding hero netinka be fiktyvaus eksperto; declined, pakeliame pagrindinio užrašo mastelį. Kaiju alert klaidingai žadėtų skubų iškvietimą; declined, pakeliame etapų ribos matomumą. Iš jų nekopijuojame motyvų, gradientų, žaidimo ar animacijos. Svarstomi tik agento, ne nepriklausomos komisijos verdictai.

Code-led vietinės HTML studies su tikrais tekstais: A darbo kortelė, B paskirta navigacijos juostų kompozicija, C ramus vadovas. B atrankos priežastis: iš karto susieja simptomą su naudingais keliais, turi aiškų pirkimo poreikio veiksmą ir menkiau primena miniekskavatorių. Rizika: per daug ženklų galėtų sudaryti veikiančio serviso įspūdį, todėl visur rodoma išankstinio piloto riba.

#### Brand, sekcijos ir asetai iki generavimo

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

#### Naudingas ruošinys

Kontaktų puslapyje padėti lankytojui surašyti automobilį, simptomą, laiką, ankstesnius bandymus ir pristatymą. Rezultatas yra redaguojama įprastos formos žinutė; nėra automatinės diagnozės, kainos, persiuntimo ar paslėpto storage. Tušti laukai lieka aiškūs nežinomi; duomenų nesiunčia iki native submit. Nereikia nepriklausomo kainų skaičiuotuvo. Forma be JS turi visą klausimų sąrašą ir laisvos žinutės kelią.

#### Direction contract

THESIS: vairuotojas iš neaiškaus simptomo pereina į tikslų poreikio aprašą; kategoriško gedimo spėjimo ir netikro iškvietimo nėra.

OWN-WORLD: baltos/mėlynos informacinės juostos, didelis kondensuotas užrašas, kompaktiška dviejų kontaktų SVG geometrija, švarūs fotografiniai dirbtuvių kontekstai.

STORY: pasirinkti simptomą → suprasti tyrimo apimtį → parengti žinutę → pateikti išankstinį poreikį.

FIRST VIEWPORT: visas pločio mėlynas h1 laukas, apačioje kryptys ir caveat, ne hero skaičiuotuvas; konteksto foto sąmoningai įterpta kaip platus mažesnio aukščio langas. CTA į aiškų poreikio paaiškinimą/kontaktus.

FORM: grounded candidate 5, seed cd693bdb; code-led dev studies. Routine decisions by agent, ne savininko approval. Code-led parinktas pagal projektinę autonominę adaptaciją; global setting nekuriamas.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

Spacing 8/16/24/40/64/96px; content max1200px, article max720px. Desktop rail/toc naudojamas tik tikram gidų orientavimuisi; 800px collapses į natyvų details. Body18px, lineheight1.65, utility min14px. H1 clamp44–88px, tracking≥−.03em. Touch controls≥44px; focus matomas. Transitions tik hover/focus ≤160ms, reduced motion išjungia. Actual screenshots/finishing/craft/detector/LH bus pridėti po implementavimo, šis planas dar nėra jų PASS.
