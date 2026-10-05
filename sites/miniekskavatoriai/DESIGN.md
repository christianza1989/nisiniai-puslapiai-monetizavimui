---
name: "Miniekskavatoriai · lauko darbų ruošinys"
description: "Tiesūs skaitmeniniai laukai, išmatuojama geometrija ir santūrus žemės darbų kontekstas."
colors:
  slate-ink: "#1b2c34"
  paper: "#f5f7f4"
  clay-action: "#994424"
  pale-clay: "#f2a36c"
  white: "#ffffff"
  slate-hover: "#30434a"
  rule: "#c8d0ce"
  field-stroke: "#7f8d91"
  muted-ink: "#526067"
  placeholder: "#68777c"
  callout-ground: "#e4ebe6"
  invalid: "#b42a20"
typography:
  display:
    fontFamily: "MiniManrope, sans-serif"
    fontSize: "clamp(36px, 4.8vw, 72px)"
    fontWeight: 650
    lineHeight: 1.14
    letterSpacing: "-0.035em"
  page-title:
    fontFamily: "MiniManrope, sans-serif"
    fontSize: "clamp(36px, 4vw, 58px)"
    fontWeight: 650
    lineHeight: 1.14
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "MiniManrope, sans-serif"
    fontSize: "clamp(28px, 3vw, 42px)"
    fontWeight: 650
    lineHeight: 1.14
    letterSpacing: "-0.035em"
  title:
    fontFamily: "MiniManrope, sans-serif"
    fontSize: "28px"
    fontWeight: 650
    lineHeight: 1.14
    letterSpacing: "-0.035em"
  body:
    fontFamily: "MiniManrope, sans-serif"
    fontSize: "18px"
    lineHeight: 1.65
  lead:
    fontFamily: "MiniManrope, sans-serif"
    fontSize: "21px"
    lineHeight: 1.65
  label:
    fontFamily: "MiniManrope, sans-serif"
    fontSize: "16px"
    fontWeight: 650
    lineHeight: 1.65
  utility:
    fontFamily: "MiniManrope, sans-serif"
    fontSize: "15px"
    lineHeight: 1.65
  volume:
    fontFamily: "MiniManrope, sans-serif"
    fontSize: "46px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.04em"
rounded:
  square-field: "0"
spacing:
  field-offset: "8px"
  field-gap: "14px"
  pair-gap: "22px"
  paragraph: "24px"
  worksheet-panel: "36px"
  desktop-gutter: "48px"
  mobile-gutter: "20px"
components:
  button-primary:
    backgroundColor: "{colors.slate-ink}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    padding: "14px 22px"
  button-primary-hover:
    backgroundColor: "{colors.slate-hover}"
    textColor: "{colors.white}"
  text-link:
    textColor: "{colors.clay-action}"
  field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.slate-ink}"
    rounded: "{rounded.square-field}"
    padding: "10px 12px"
  worksheet-panel:
    backgroundColor: "{colors.white}"
    textColor: "{colors.slate-ink}"
    padding: "{spacing.worksheet-panel}"
  callout:
    backgroundColor: "{colors.callout-ground}"
    textColor: "{colors.slate-ink}"
---

<!-- Istorinis planas žemiau išsaugotas nekeičiant jo eilučių. Frontmatter ir po plano pridėtos kanoninės sistemos sekcijos aprašo faktinę galutinę 2026-10-01 versiją; planas nėra retrospektyvus visų įgyvendintų detalių pažadas. -->

# Dizaino planas · miniekskavatoriai.lt

Kryptis: lauko darbų ruošinys. Klientas ateina su neapibrėžta tranšėja; pirmas ekranas rodo tikrą matmenų įrankį, o ne technikos katalogą. Tamsi mėlyna antraštės zona, šviesi matmenų forma, siaura kraštovaizdžio juosta, tikslus geometrinis pjūvis, glaustos darbų apimties eilutės. Individuali tranzito/žemės darbų tapatybė be technikos gamintojo logotipo.

## Tinklo palyginimas prieš vaizdus

2026-10-01 peržiūrėti faktiniai traktorių `critique-a-screenshots/home-desktop-full.jpg`, `home-mobile-first.jpg`, auksarankių `qa/home-1440.png`, `home-390-top.png`, laiptų `qa/home-desktop-final.png`, `home-mobile-final.png`. Traktoriai: didelis izoliuotas daiktas geltoname split hero ir pasikartojančios eilutės. Auksarankiai: tekstinis dviejų kolonų intro, šilta priemonių scena, poreikių eilutės. Laiptai: didelė serif antraštė virš horizontalaus interjero, šiltos medžiagos, trijų gidų grid. Artimiausias užduoties kaimynas auksarankiai; skirtumas bus gyvas tūrio ruošinys pirmame ekrane, mėlynas techninis laukas, kasimo apimties pjūvis ir vertikalus gidų indeksas. Dalijamės core, formos laukais ir teisiniais keliais, ne homepage struktūra.

## Tikri išoriniai ekranai ir sprendimai

`research/avesco-{desktop,mobile}.jpg`: kategorijos modelių kortelės ir plotis. Adaptuojame pasirinkimo klausimą į prieigos gidą; katalogą/filtrus atmetame be parko. `technikos-*`: skambutis ir kainų vienetai; adaptuojame darbų komplektacijos patikrą, atmetame mūsų telefono/patirties imitaciją. `dozr-*`: vieta prieš kainą; vietą įtraukiame į ruošinį, rezervacijos nėra. `hh-*` (https://hhmuckers.com/digger-hire): pirmo ekrano reali postcode forma ir teritorija; adaptuojame iškart naudingą įrankį, ne kainos pažadą. `ramirent-*`: įrenginių katalogas ir net/gross vienetai; desktop/mobile cookie overlay riboja visos kompozicijos vertinimą, jo nelaikome unobstructed etalonu. Kainų ženklinimo principą pakeičia sąmatos klausimų gidas. Visos apžiūros 2026-10-01, 1440×1000 ir 390×844.

## Konceptai ir agento pasirinkimas

Prieš kodą sąrašas: (1) objekto pasas, (2) žemės pjūvio plakatas, (3) žemėlapio klausimų maršrutas, (4) lauko darbų ruošinys, (5) technikos specifikacijų žurnalas, (6) planavimo atmintinė, (7) paslaugos aplinkos fotoreportažas. Impeccable seed `fd1be7bb`, assigned 4. Ne savininko approval. Lightweight studies A – objekto pasas, B – panoraminis plakatas, C – lauko ruošinys; desktop/mobile palyginimas prieš production rendererį. Procedūrinė išlyga: temos final vaizdai buvo sugeneruoti po krypties/asetų plano ir tinklo apžiūros, bet prieš studijų screenshot palyginimą; to nepateikiame kaip nepriekaištingos sekos. Pasirinkimas C: kitoks pirmas ekranas ir realus matmenų rezultatas. Kompromisas: daugiau informacijos pirmame ekrane; mobile įrankis po trumpo aiškaus intro.

Dealt katalogo alternatyvos: streaming wall – atmetama dėl nėra parko ir nenaudingo horizontalaus naršymo, išlaikome aiškų vieną focused task; kasetės j-card – atmetama, nes fizinis flip slėptų apimtį, išlaikome glaustą vieno ruošinio struktūrą; ekspozicijų lapai – atmetama dėl perteklinės metaforos, išlaikome skirtingų skaičiavimo/poreikio būsenų aiškumą. Išorinis stilius nepersodinamas. Pilna formalios nepriklausomos dizaino review išvada bus atskiras įrodymas.

## Direction contract

THESIS: konkretūs matmenys ir neaiškumai virsta paruoštu kasimo poreikiu. OWN-WORLD: slate #1b2c34, paper #f5f7f4, clay #cc6236, pale clay #f2a36c; tiesūs kraštai, tabular numerals tik matmenims, tikros grunto scenos. STORY: supranta regioną ir etapą, apskaičiuoja geometriją, sudeda darbo apimtį, pateikia sąmoningai. FIRST VIEWPORT: kairėje didelis sakinys ir skaidrus pilotas, dešinėje atvira šviesi tūrio forma; mobile intro ir kompaktiška forma vienoje skiltyje. FORM: 4/7 lauko ruošinys, fd1be7bb; ši sesija code-led pagal savininko deleguotą projekto adaptaciją, jokio global workflow preference neįrašome. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Sistema, logo ir asetai

Manrope self-hosted iš jau esančios OFL core šeimos (lotynų/lt subset), 400–800. Display 48–72px, mobile 36px, body 18px/1.65, utility ≥15px. Teksto plotis apie 68ch; max grid1320, 24/48px paraštės. Header kompaktiškas tekstinis miniekskavatoriai wordmark + native U pjūvio/rodomo tūrio ženklas; SVG data favicon savo rendererio head, paketas neturi skolintos dovanų ikonos. Kontrolės su matomu 3px focus, ≥44px aukščiu; native details menu. Jokios papildomos animacijos bibliotekos.

| Vieta / klausimas | Kompozicija / asetas / crop | Kelias |
| --- | --- | --- |
| Home – ką planuoju? | tikras įrankis dešinėje, lauko panorama (hero) po intro; 16:9 šaltinis, desktop plati strip, mobile center kaušas/sklypas | /transejos-kasimas ir /su-operatoriumi |
| Home – ar pateks technika? | siauras vartų ir kiemo aplinkos kadras (access), horizontali sekcija su sąlygomis | /pravaziavimo-plotis |
| Home – ką įtraukti? | native tikslus stačiakampės tranšėjos pjūvis, šviesus apimties sąrašas; be naujo dekoratyvaus raster | /nuomos-kainos-sudetis |
| Index | vertikalios trys eilutės su kiekvieno gido nuosava miniatiūra | /gidai |
| Gidas operatorius/be | operatoriaus vieta kompaktiškoje technikoje, išjungta ir stovinti mašina, ne darbuotojo portretas (operator) 3:2 | sąlygų palyginimas |
| Gidas prieiga | tas pats access temos vaizdas, visas vartų kontekstas | matavimo kontrolinis sąrašas |
| Gidas kainos sudėtis | transporto tralas ir saugiai užfiksuota nebrandinta mini technika (transport), 3:2 | komplektacijos patikra |
| Įrankis | formulė/native diagram; hero šeima kaip kontekstas, ne skaičiavimo įrodymas | ruošinys vietoje, formos tekstas tik vartotojui pasirinkus |
| Kontaktai / trust / legal | tekstas ir native forma; dekoratyvus foto nereikalingas, privatumo tekstas dominuoja | forma / taisymų kontaktas |

Vaizdai yra originalios iliustracinės scenos, ne klientų darbai, mūsų parkas ar darbuotojai. Kiekvienas exact prompt ir originalas privačiai; importas saveResponsiveAsset, realūs WebP srcset. Pasirinkto rinkinio ir loaded pixel apžiūra būtina prieš patvirtinimą.

# Design System: miniekskavatoriai.lt

## Overview

**Creative North Star: "Lauko darbų ruošinys"**

Faktinė sistema užfiksuota 2026-10-01 po paskutinės korekcijos. Tai aiškus skaitmeninis ruošinys: didelis sakinys, atviri matmenų laukai, įvardytos nežinomybės, santūrūs žemės darbų vaizdai ir taisomas užklausos tekstas. Tiesios ribos ir plokšti paviršiai išlaiko darbinį pobūdį; įrangos katalogo, fizinio popieriaus imitacijos ir dekoratyvaus gylio nėra.

Ši aprašomoji dalis bei frontmatter yra dabartinės sistemos šaltinis. Aukščiau išsaugotas planas rodo sprendimo chronologiją ir pradinį direction contract; jo vertės nepakeistos atgaline data. Agentas pasirinko ir įgyvendino code-led kryptį pagal [projekto adaptaciją](../../SKILLS/impeccable/PROJECT_ADAPTATION.md). Tai nėra savininko approval. Originalus stdout [concept-seed-original.txt](research/concept-seed-original.txt) ir [provenance](research/concept-seed-provenance.json) patvirtina seed `fd1be7bb`, assigned 4/7; naujo roll nebuvo. Vaizdų generavimo prieš studijų ekranų palyginimą išlyga tebegalioja. [QUALITY-BAR.md](QUALITY-BAR.md) konsoliduota užbaigimo metu, ne prieš atranką patvirtinta kortelė.

**Key Characteristics:**

- Atvira, kvadratinė matmenų ir sąlygų forma.
- Slate užduoties laukas, vėsus popierius ir balta skaičiavimo plokštuma.
- Viena self-hosted Manrope šeima; dideli sakiniai ir išskirtas geometrinio tūrio skaičius.
- Plokščios horizontalios ribos, native meniu ir vertikalios gidų eilutės.
- Temos vaizdai ir tiksli SVG geometrija turi skirtingas paskirtis.

### Fiksavimo pagrindas ir priėmimo ribos

Pagrindas yra [renderer](<C:/Users/lenovo/Documents/dovanos-memorycasting/components/niche/miniekskavatoriai-site.tsx:13>), [CSS](<C:/Users/lenovo/Documents/dovanos-memorycasting/components/niche/miniekskavatoriai-site.module.css:3>), [tool/form source](<C:/Users/lenovo/Documents/dovanos-memorycasting/components/niche/miniekskavatoriai-site.tools.tsx:6>) ir pateikti galutiniai QA įrodymai. [verification-summary.json](qa/verification-summary.json) užfiksuoti rendererio/CSS/paketo SHA-256 ir izoliuota production preview `127.0.0.1:8793`. Šis dokumentavimo pass nebuvo naujas naršyklės, detektoriaus ar visos svetainės auditas.

[FINISH-REVIEW.md](FINISH-REVIEW.md) patvirtina 14 galutinių desktop/mobile kadrų validumą; paskutinis `disposition: ship` įvertina tik du išvardytus seed ir paletės įrodymų taisymus, ne visą paviršių. Subjektyvus craft lieka 12/14 → **8.57/10**; ≥9 tikslas nepasiektas. Ilgų gidų ritmo ir mobile rezultato vietos kompromisai nepaverčiami šios sistemos pageidautinomis taisyklėmis. Tikras 200 % browser zoom **UNVERIFIED**.

MB Pinet / info@pinet.lt yra patvirtinti projekto kontaktai. Matomas veiksmas – išankstinis planinio kasimo su operatoriumi poreikis Kaune ir Kauno rajone; vykdytojai, atlygis, technikos parkas ir datos nežinomi. SMTP ir voice išjungti. DNS, diegimas, tikras laiško gavimas ir tikra paklausa šiuo dokumentu nepatvirtinami.

## Colors

Paletė remiasi vėsiu slate ir šviesiu popieriumi; žemės akcentas žymi veiksmo nuorodas, o šviesesnis molis kontrastuoja tamsioje zonoje. Normatyvios reikšmės yra frontmatter; vienkartiniai schemos ir scenos atspalviai nėra papildoma UI akcentų sistema.

### Primary

- **Slate ink** (`slate-ink`): tekstas, tamsus homepage užduoties laukas, primary mygtukai, poraštė ir ženklo linijos.
- **Slate hover** (`slate-hover`): primary mygtuko hover fonas; baltas mygtuko tekstas išlieka.

### Secondary

- **Clay action** (`clay-action`): veiksmo tekstinės nuorodos, `.lt` wordmark dalis ir focus kontūras ant šviesaus pagrindo. Dabartinė reikšmė skiriasi nuo istorinio plano clay; plano `#cc6236` liko tik SVG prizmės plokštumoje, ne dabartiniame UI clay tokene.
- **Pale clay** (`pale-clay`): tamsaus hero nuoroda, ruošinio viršutinė riba ir focus ant tamsaus hero/poraštės paviršiaus.

### Neutral

- **Paper** (`paper`): header, bazinis puslapis ir hero tekstas.
- **White** (`white`): skaičiuotuvo paviršius, įvestys ir primary mygtukų tekstas.
- **Rule** (`rule`): sekcijų, rezultatų, gidų eilučių ir turinio ribos.
- **Field stroke** (`field-stroke`): 1 px įvesties ir mobile meniu kraštas.
- **Muted ink** (`muted-ink`) ir **Placeholder** (`placeholder`): pagalbinis tekstas bei vietaženkliai.
- **Callout ground** (`callout-ground`): ramus poreikio CTA juostos pagrindas.

### State

- **Invalid** (`invalid`): 2 px `aria-invalid` matmenų lauko riba. Pranešimas apie netinkamus matmenis pateikiamas ir tekstu.

**The Surface Evidence Rule.** Paletės tiesa yra CSS ir DOM bei tiesioginis neperdažytas spalvą atitinkantis fiksavimas; šilto naršyklės JPEG poslinkio nekopijuoti į tokenus.

[PALETTE-VERIFICATION.md](qa/PALETTE-VERIFICATION.md) ir [palette-runtime.json](qa/palette-runtime.json) patvirtina paper DOM foną ir baltą įrankį, be filtrų, backdrop filtro ar blend ant tikrintų protėvių. CUA ir atskiro Chrome vaizdai turi tą patį šiltą poslinkį; tiesioginis originalus Lighthouse `final-screenshot` turi tikslinį pagrindą su ±1 JPEG paklaida. Poslinkio priežastis nežinoma; CSS ir medija neperdažyta. Lighthouse native viewport yra paletės įrodymas; pilni CUA kadrai lieka topology ir lazy media priėmimo pagrindas.

## Typography

**Display Font:** self-hosted Manrope, lokaliai pavadinta `MiniManrope`, su `sans-serif` fallback.

**Body Font:** ta pati šeima. Lotynų ir extended rinkinius deklaruoja CSS `@font-face` (200–800; `font-display: swap`); OFL core šaltinis išlieka tas pats. Skirtingos display šeimos ar mono šrifto nėra.

**Character:** kompaktiški, subalansuoti sakiniai su ryškia skaitmenine užduotimi. Antraščių svoris 650 ir neigiama raidžių sklaida yra bendri; wordmark naudoja 750, navigacija 600.

### Hierarchy

- **Display:** frontmatter `display`; homepage h1. Iki 900 px fiksuojama 46 px, iki 700 px – **39 px** ir 14ch riba. Tai faktinė mobile reikšmė; plano 36 px nėra dabartinio home tokenas.
- **Page title:** frontmatter `page-title`; vidinių puslapių h1, iki 20ch; iki 700 px **38 px**.
- **Headline:** frontmatter `headline`; pagrindinės sekcijos. Iki 700 px bazinis h2 30 px; straipsnyje h2 30 px desktop / 28 px mobile, o turinio sąraše 22 px.
- **Title:** frontmatter `title`; gidų eilutės ir h3. Straipsnio h3 23 px; įrankio h2 30 px desktop ir mobile. Mobile CSS ankstesnę 27 px deklaraciją užgožia vėlesnė tokio pat specifiškumo bazinio h2 30 px taisyklė; 27 px nėra faktinis efektyvus tokenas. Tai kontekstiniai dydžiai, ne tolygi matematinė skalė.
- **Body:** frontmatter `body`; įprasti tekstai. Intro `lead` 21 px desktop / 19 px mobile. Straipsnio pirmas paragrafas 20 px / 19 px; pats straipsnis ribojamas 760 px, gidų santraukos 62ch, page intro 64ch.
- **Label / Utility:** frontmatter `label` ir `utility`; formų pavadinimai 16 px / 15 px, pagalba ir byline 15 px. Mobile breadcrumb 14 px ir panorama caption 13 px yra esamos kontekstinės išimtys; istorinis utility ≥15 planas nėra absoliuti dabartinio rendererio taisyklė.
- **Volume:** frontmatter `volume`; geometrinio rezultato skaičius, mobile 40 px. `font-variant-numeric: tabular-nums` deklaruotas rezultatui, ne visam tekstui ar laukams.

**The Measured Number Rule.** Tabular numerals skirti tūrio rezultatui; matmenų vienetai lieka lauko etiketėje, rezultato `m³` lieka prie skaičiaus.

## Layout

Desktop išorinė sekcijų riba 1416 px su 48 px paraštėmis palieka 1320 px turinio plotį. Homepage task/tool santykis 1.12fr / 1fr, tarpas 76 px ir padding 70/48/64 px; tolesnės apimties/prieigos poros naudoja skirtingą santykį ir 90/80 px tarpus. Tai nėra vienodas kortelių grid. Panorama yra atskira viso pločio juosta po įrankio zona (350 px aukštis).

Vidinių puslapių intro ribojamas 1320 px; įprastas skaitymo konteineris 1100 px, gidų layout 1416 px su 760 px straipsniu ir turinio sąrašu šone (85 px tarpas). Gidų indeksas ir homepage gidai turi vertikalias eilutes: 290 px temos vaizdas + tekstas, 40 px tarpas, 36 px eilutės padding ir plona viršutinė riba. Poraštė turi atskirą informacijos/navigacijos porą ir dviejų kolonų nuorodas.

Responsive ribos yra **1100 / 900 / 700 px**. Iki 1100 px dalis išorinių paraščių sumažėja iki 28 px; iki 900 px desktop nav keičia native `details`, home grid dar išlaiko dvi kolonas. Iki 700 px išorinė paraštė 20 px, home ir apimties/prieigos poros tampa viena kolona, gidų vaizdas pereina virš teksto, formos poros stack. Trys matmenų laukai išlieka vienoje eilėje; jų tarpas 8 px. Mobile gido turinys pakyla prieš straipsnį; ne sticky. Standalone įrankio plotis 880 px; mobile jo plokštuma skaidri, 26 px vertical padding ir 2 px viršutinė riba.

Teksto ritmas remiasi 24 px paragrafų/laukų grupių atskyrimais, 22 px formos poros tarpu ir platesniais 44–100 px sekcijų intervalais. Neužfiksuojama išgalvota vienoda 8 px skalė. [browser-layout-final.json](qa/browser-layout-final.json) pateikia 1440/390 px no-overflow ir pakrautų vaizdų įrodymus; narrow/tablet JSON yra techninis papildymas. Jie nepatvirtina tikro 200 % browser zoom.

### Pradinio asetų plano suderinimas su galutine projekcija

| Paviršius | Faktinė galutinė medija ir paskirtis |
| --- | --- |
| Homepage | 5 HTML img: `hero` panorama, `access` prieigos scena ir trys gidų temos miniatiūros. Hero `sizes=100vw`, crop 50% 56% desktop / 52% 55% mobile, 240 px mobile aukštis. |
| `/gidai` | 3 nuosavos temos miniatiūros vertikaliose eilutėse; 3:2 crop, desktop 290 px, mobile pilnas turinio plotis. |
| Trys gidai | Kiekvienas turi vieną savo 3:2 temos vaizdą: operatoriaus vieta, prieiga arba transportas; 760 px article `sizes`, mobile `calc(100vw - 40px)`. |
| `/transejos-kasimas` | **0 HTML img**. Faktinis native tūrio įrankis, sąlygų ruošinys ir pateikimo forma. Pradinio plano „hero šeima kaip kontekstas“ lieka **planuota / atidėta**, ne renderinamas asetas; SVG prisma yra homepage, ne šio puslapio vaizdas. |
| `/su-operatoriumi` | **0 HTML img**. Tekstinis poreikio aprašas, ribos ir kito veiksmo nuorodos; dekoratyvus foto nereikalingas šiam paaiškinimui. |
| Kontaktai / trust / legal | **0 HTML img**. Native kontaktų forma arba tekstas; privatumo, redakcijos ir naudojimo informacija turi pirmenybę prieš dekoratyvią fotografiją. |

Įrodymai: rendererio [Home / Inner](<C:/Users/lenovo/Documents/dovanos-memorycasting/components/niche/miniekskavatoriai-site.tsx:19>), [html-final.json](qa/html-final.json), [browser-layout-final.json](qa/browser-layout-final.json), [MEDIA.json](MEDIA.json). Ne kiekvienas media įrašas savaime reiškia puslapyje rodomą vaizdą.

Originalai ir tikslūs raster prompt failai yra privatūs; vieši responsive WebP eina per bendrą `saveResponsiveAsset` / MEDIA_CORE. Jie vaizduoja iliustracinį kontekstą, ne mūsų techniką, darbuotoją ar atliktą darbą. Kilmei išsaugoti nereikia į viešą WebP įterpto prompt/modelio ženklelio. Planas ir final review išlaiko atskirą artimiausių tinklo nišų topology palyginimą; rendererio vardas ar paletės pakeitimas savaime neįrodo savitumo.

## Elevation & Depth

Sistema **nenaudoja box-shadow**. Gylį ir suskirstymą kuria tamsus/šviesus paviršius, 1 px ribos, įrankio viršutinis pale-clay kraštas ir prasmingi tarpai. Mobile meniu yra balta plokštuma su 1 px riba, ne ambient šešėlio kortelė. Focus kontūras yra prieigos būsena, ne ornamentinė elevation.

**The Flat Worksheet Rule.** Darbiniai paviršiai lieka plokšti; ribos ir kontrastas skiria zonas, o šešėlis nėra šios realizacijos žodynas.

## Shapes

Valdikliai ir sekcijos turi tiesius kraštus. Įvesties radius normatyviai 0; mygtukas kvadratinis vizualiai, be šiame modulyje deklaruoto radius tokeno. Prasminės formos yra atvira stačiakampė skaičiavimo plokštuma, U pjūvio native SVG ženklas ir tiksli L/W/D prizmė. Prizma yra formulės schema su title/desc, ne saugaus kasimo profilis ar fizinės medžiagos imitacija.

**The Square Field Rule.** Nauji šios sistemos laukai perima tiesias įvesties ribas ir skaitomą etiketę, o ne suapvalintą chip ar dekoratyvų katalogo tile.

## Components

### Buttons

Tamsus, aiškus native veiksmas. Primary fonas ir baltas tekstas referuoja frontmatter; 16 px / 650, min-height 50 px, padding 14/22 px, 1 px tamsi riba. Hover keičia tik foną į `slate-hover`; transition ar transform animacijos nedeklaruota. Focus 3 px su 5 px offset; tamsiame hero/porąštėje kontūras pale-clay. Specialios active ir disabled vizualinės būsenos nepridėtos. „Paruošti tekstą“ ir „Registruoti poreikį“ yra du atskiri veiksmai.

### Text links

Clay tekstinė nuoroda ant šviesaus pagrindo; 17 px / 650, min-height 44 px, 18 px tarpas. Compact įrankyje 16 px / 8 px tarpas; hero 17 px ir pale-clay. Nuorodos underline offset 5 px ir storesnis hover underline. Dekoratyvaus glyph icon rinkinio nėra; krypties ženklai yra nuorodų teksto dalis.

### Worksheet / Containers

Balta skaičiuotuvo plokštuma: 36 px padding ir 4 px pale-clay viršutinė riba; iki 900 px 24 px padding, iki 700 px 24/20 px. Standalone mobile įrankio atskira skaidri variacija aprašyta Layout. Tūrio rezultatas atskirtas 1 px riba, 26 px margin ir 20 px padding. Generic chip, badge, pakelta kortelė ar modalas šiame build nėra; jų taisyklės nekuriamos.

### Inputs / Fields

Matoma etiketė virš lauko. Min-height 48 px, 18 px tekstas, 8 px viršutinis tarpas, 10/12 px padding, 1 px `field-stroke`, balta plokštuma, radius 0. Textarea leidžia vertikalų dydžio keitimą; native select išlaiko browser rodyklę. Matmenys yra tekstiniai decimal laukai su comma/dot interpretacija ir tekstiniu invalid paaiškinimu; netinkamas laukas turi 2 px `invalid` ribą. Poreikio sutikimo checkbox 22 px, accent slate; jo žyma yra 16 px / 1.6 įprasto svorio tekstas. Custom disabled/error kortelių nepridėta.

### Navigation

Tekstinis wordmark ir native SVG U ženklas: 21 px / 750, -0.03em, 32 px SVG; mobile wordmark 18 px, SVG 27 px. Desktop nav 16 px / 600, min-height 44 px ir 26 px tarpas; esamas puslapis pažymėtas `aria-current` underline. Iki 900 px native `details/summary` „Meniu“, menu nuorodos po juo baltame 20 px padding paviršiuje; focus ir keyboard lieka native. Skip nuoroda matoma fokusavus, perkelia į `main`. Poraštės nuorodos turi tą patį ≥44 px dėžučių ritmą.

### Signature: volume / request worksheet

Rezultatas pradžioje yra brūkšnys, ne demonstracinis kliento tūris. Įrašius tris teigiamus tinkamus matmenis rodoma V = L × W × D geometrija su `aria-live=polite`; tai ne kaina, darbo laikas ar grunto išpurenimas. „Paruošti tekstą“ sukuria taisomą textarea ir aiškų status, kad niekas neišsiųsta. Tik atskiras native POST formos veiksmas registruoja poreikį. [source](<C:/Users/lenovo/Documents/dovanos-memorycasting/components/niche/miniekskavatoriai-site.tools.tsx:10>) ir pateikti įrankio/formos QA įrodymai pagrindžia šį elgesį; sidecar komponentų pavyzdžiai yra statiniai vizualūs specimen, ne React įrankio pakaitalas.

### Signature: guide row / article

Gidų sąrašo eilutė turi nuosavą 3:2 vaizdą, vieną aiškų klausimą, santrauką ir tekstinį veiksmą; ne katalogo modelio kortelę. Gidas paveldi tipografiją ir savo temos figūrą, o šaltinių ribos atskirtos horizontalia linija. Ilgų gidų panašus ritmas ir tuščias šoninis laukas po TOC yra esamos craft ribos, ne būtinas šablonas ateities paviršiams.

Motion bibliotekos nėra. Vienintelis deklaruotas transform yra skip nuorodos išvedimas fokusavus; `prefers-reduced-motion` išjungia transition ir smooth scroll. Sidecar nekuria neegzistuojančio easing ar animation tokeno.

## Do's and Don'ts

### Do:

- **Do** remtis šio failo faktiniu frontmatter ir galutiniu source; istorinį planą naudoti sprendimo kilmei.
- **Do** išlaikyti tiesius laukus, matomas etiketes, 3 px focus kontūrą ir atskirą tekstinio ruošinio bei pateikimo veiksmą.
- **Do** tūrio rezultatui naudoti tabular numerals, o nežinomą rezultatą palikti matomai nežinomą.
- **Do** vaizdo paskirtį tikrinti pagal galutinį rendererį, jo `sizes`/crop ir pakrautą WebP, ne vien MEDIA įrašą.
- **Do** skirti paletės įrodymus, topology peržiūrą, craft, browser zoom ir tikro paleidimo būseną.

### Don't:

- **Don't** šilto CUA/Chrome capture poslinkio paversti palette tokenu ar dėl jo pertoninti teisingo CSS ir medijos.
- **Don't** pradinio plano hero-family įrankyje vadinti renderinamu vaizdu; šio paviršiaus 0 img yra dabartinė projekcija, ne universalus visų ateities įrankių draudimas.
- **Don't** iliustracijų, seed pasirinkimo, synthetic QA ar siauro `ship` verdikto vadinti tikrais darbais, savininko approval, paklausa ar visos svetainės kokybės patvirtinimu.
- **Don't** esamų mobile-result ir long-guide craft kompromisų perkelti kaip pageidautinų naujų paviršių taisyklių.

**Not canonized:** šilto capture poslinkio priežastis, mobile rezultatas žemiau pirmo 844 px vaizdo ir ilgo gido ritmas nėra taisytas/patvirtintas dizaino standartas. Kicker, glyph icon sistema, hard offset shadow ar system display face nerasta šioje pateiktoje peržiūroje; jų normatyvių tokenų neįrašome. Lighthouse final home 96 / guide 91 / tool 95 ir kitų trijų kategorijų 100 yra vietiniai techniniai matavimai, ne craft, WCAG, 200 % zoom, SMTP gavimo ar paklausos įrodymas.
