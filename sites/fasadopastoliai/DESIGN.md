---
name: Fasado pastoliai
description: Vėsus nuomos poreikio dokumentas su fasado kontekstu ir aiškiomis nežinomybėmis.
colors:
  ink: "#182d31"
  muted: "#425b61"
  paper: "#fff"
  ground: "#edf1f2"
  line: "#b3c2c6"
  action: "#d4e84c"
  action-hover: "#e5f37f"
  secondary-hover: "#e3ebed"
  dark-hover: "#2d4b52"
  field-stroke: "#6c8289"
  disabled: "#e3e9eb"
  focus: "#183d49"
  error: "#98231b"
typography:
  display:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "54px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-.025em"
  page-title:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "clamp(36px, 4vw, 52px)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-.025em"
  headline:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "clamp(26px, 2.6vw, 34px)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-.025em"
  title:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-.025em"
  guide-title:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "23px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-.025em"
  body:
    fontFamily: "Source Sans 3, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Source Sans 3, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.6
  button:
    fontFamily: "Source Sans 3, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
  metadata:
    fontFamily: "Source Sans 3, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  square: "0px"
spacing:
  label-gap: "8px"
  action-gap: "12px"
  field-gap: "16px"
  mobile-gutter: "20px"
  section-gap: "24px"
  sheet-padding: "28px"
  desktop-gutter: "40px"
  major-gap: "48px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    padding: "15px 22px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    padding: "15px 22px"
  button-secondary-hover:
    backgroundColor: "{colors.secondary-hover}"
  button-dark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    padding: "15px 22px"
  button-dark-hover:
    backgroundColor: "{colors.dark-hover}"
  button-disabled:
    backgroundColor: "{colors.disabled}"
    textColor: "{colors.muted}"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "10px 12px"
    width: "100%"
  worksheet:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    padding: "28px"
  guide-row:
    textColor: "{colors.ink}"
    padding: "26px 0"
  nav-action:
    textColor: "{colors.ink}"
    padding: "12px 18px"
---

# Design System: Fasado pastoliai

## Overview

**Creative North Star: "Nuomos poreikio dokumentas"**

Vėsus baltas dokumentas su tvirtomis, įprasto pločio antraštėmis. Fotografija suteikia namo fasado kontekstą, o linijos ir atskiri laukų lapai padeda atskirti matmenis, laiką ir paslaugų apimtį. Nežinomybė yra skaitomas atsakymas, todėl jos nepakeičia tariama kaina, įrangos kiekis ar dekoratyvi statistika.

Sistema užfiksuota iš įgyvendinto rendererio ir jo stilių 2026-10-03, po vieno riboto peržiūros pataisymų rinkinio. Kryptį pasirinko agentas pagal deleguotą savininko taisyklę; tai nėra žmogaus ar inžinieriaus patvirtinimas. Produktinė riba – išankstinis poreikio tyrimas – lemia tiesioginius veiksmų vardus, redaguojamą ruošinį ir matomą paaiškinimą prieš formos pateikimą.

**Key Characteristics:**

- Baltas dokumentas vėsiame lauko fone.
- Archivo antraštės ir Source Sans 3 proza.
- Fotografijos juosta, linijomis atskirti klausimai ir gidų eilutės.
- Ryškus gelsvai žalias veiksmas ir užbaigimo juosta.
- Tikra forma prieš neprivalomą žinutės ruošinį.

Pirminiai šaltiniai: `PRODUCT.md`, `SURFACE.md`, `BUSINESS.md`, `research/QUALITY-BAR.md`, `MEDIA.json`; core `components/niche/fasadopastoliai-site.tsx`, `.module.css`, `.tools.tsx` ir `public/fonts/fasadopastoliai/fonts.css`. Ankstesnis DESIGN.md neegzistavo. Planinė kryptis lieka SURFACE.md; jos numatyti dydžiai neperrašyti atgaline data. Peržiūrėti visų 11 puslapių `qa/*-desktop-final.jpg` ir `qa/*-mobile-final.jpg`, pagrindiniai `*-top.jpg` bei artimiausio tinklo nuotraukos. Po pataisų iš naujo peržiūrėti galutiniai homepage desktop/mobile top: 1440×1000 pavadinimas dviejų eilučių, CTA ir visi trys klausimai matomi, header telpa į 88px ribą; mobile SVG disclosure ir CTA tvarka išlaikyti. `qa/capture-final.json` fiksuoja atnaujintų ekranų vaizdų/šriftų įkrovimą ir overflow patikrą; ankstesni įrodymai išlaikyti `qa/pre-review/`.

Vietinė production peržiūra veikia 8911 prievade. Patvirtintas turinys – 11 puslapių, 3 gidai, 4 originalios iliustracijos / 20 WebP variantų; MB Pinet / info@pinet.lt. SMTP ir balsas išjungti. Tikras diegimas, partneris, gautas SMTP laiškas, fizinis įrenginys ir tikras 200 % naršyklės mastelis nepatvirtinti; dizaino dokumentas nėra šių vartų įrodymas.

## Colors

Tamsi plieno ir vėsių pilkų tonų paletė suteikia dokumentui aiškią struktūrą; gelsvai žalias akcentas pažymi veiksmą.

### Primary

- **Veiksmo laimas** (`action`) naudojamas pagrindiniams mygtukams, pažymėto teksto fonui, skip nuorodai ir plačiai užbaigimo juostai. Užbaigimo juostoje mygtukas tampa tamsus.
- Hover variantai įvardyti frontmatter; tai esamos būsenos, ne papildomi dekoratyvūs akcentai.

### Neutral

- **Plieno rašalas** (`ink`) – pagrindinis tekstas, ribos, tamsi palyginimo dalis ir poraštė.
- **Vėsus popierius** (`paper`) – dokumentas, header ir laukų vidus.
- **Lauko pilka** (`ground`) – dokumento išorė bei geometrijos ir žinutės lapai.
- **Antrinis plienas** (`muted`) – ribų paaiškinimai, metaduomenys ir figcaption; ne pagrindinė antraštė.
- **Skiriamoji linija** (`line`) – horizontalus skaitymo ritmas ir desktop klausimų atskyrimas. Įvesties rėmas naudoja tamsesnį `field-stroke`.
- `focus` apibrėžia klaviatūros orientyrą, `error` – tekstinę klaidą; klaidos reikšmė visada parašyta žodžiais.

**The Veiksmo vietos Rule.** Laimas žymi veiksmą arba užbaigimo dalį; juo neišdažomi visi informaciniai blokai.

## Typography

**Display Font:** Archivo, Arial, sans-serif.
**Body Font:** Source Sans 3, Arial, sans-serif.

Tvirti Archivo pavadinimai suteikia darbų dokumento aiškumą. Proza ir laukų vardai naudoja tą pačią skaitomą Source Sans 3 šeimą; matmenys išlaiko tabular numerals, atskiros monospace šeimos nėra.

### Hierarchy

- **Display:** frontmatter `display` – homepage pavadinimas. Iki 600 px jo dydis tampa `clamp(36px, 10vw, 42px)`; iki 800 px apribojamas 15ch pločiu, laikomas prieš paaiškinimą ir CTA.
- **Page title:** `page-title` – vidinių puslapių pavadinimai; desktop iki 24ch, iki 800 px iki 18ch, iki 600 px 36px.
- **Headline:** `headline` – h2; iki 600 px 27px. Esami kontekstiniai variantai: apimties juosta 24px, užbaigimas 30px, šaltiniai 27px.
- **Title:** `title` – h3. **Guide title:** `guide-title` – iliustruotos gidų eilutės, iki 600 px 25px.
- **Body:** `body` – proza; gido stulpelis iki 720px, intro iki 68ch, palyginimo tekstas iki 72ch. Gidų santraukos ir geometrijos paaiškinimas 17px, ribų paaiškinimas 16px.
- **Label / button / metadata:** atitinkamos frontmatter rolės. Laukų pagalba ir figcaption yra metadata dydžio; svarbios ribos neperkeliamos vien į metaduomenis.

**The Vienetų Rule.** Matmenys pateikiami su metrais, rezultatas su m² ir jo riba; tabular numerals naudojami laukams bei rezultatui, ne tariamiems verslo rodikliams.

Šriftai pateikiami iš vietinio domeno su `font-display: swap`, latin ir latin-ext unicode-range bei OFL licencijomis. Archivo 700 turi du preload. Source Sans 3 400 ir 600 lieka atskiros svorio deklaracijos, bet naudoja tas pačias 400 failų URL po tikros identiškų dvejetainių failų patikros. Diske yra 6 WOFF2 failai, deklaracijos prašo 4 skirtingų failų; šis pristatymo pakeitimas nekeičia šeimos ar tipografijos rolės. Kilmė ir SHA – `research/fonts.json`, pataisos – `qa/review-fixes.json`.

## Layout

Dokumentas ir poraštė yra iki 1160px pločio; header vidus iki 1240px. Desktop dokumentas prasideda 28px po header ir turi 40px vidines paraštes. Iki 1240px išorėje lieka 40px; iki 800px dokumentas ir poraštė užima pilną plotį, tekstui lieka 20px kraštai. Bendras ritmas – 20px prozos tarpai, 24–28px komponentų tarpai ir 40–56px sekcijų kvėpavimas; tikri išimčių dydžiai lieka source.

Homepage pradžioje pavadinimas ir paaiškinimas/CTA išdėstyti 1.75fr / 1fr su 48px tarpu. Iki 900px santykis 1.3fr / 1fr ir 30px tarpas; iki 800px – vienas skaitymo stulpelis. Photo juosta eina po tekstu, tada trys klausimai. Toliau atskiras fasado kontekstas ir geometrijos lapas; tamsi palyginimo dalis pakeičia ritmą; gidų eilutės ir tiesioginis žinutės kelias užbaigiami laimo juosta. Tai šios pirmos scenos kompozicija, ne reikalavimas kiekvienam būsimam puslapiui.

Gidai desktop naudoja iki 720px straipsnį ir atskirą turinio juostą su 44px tarpu. Iki 900px turinio juosta 180px, tarpas 24px; iki 800px atveriamas native turinys perkeliamas prieš straipsnį, sticky išjungtas. Kontaktų forma ir ruošinys desktop yra 1.2fr / 1fr, iki 800px forma eina pirmiau, ruošinys po jos. Dimensions išlieka dviejų laukų pora; action grupė wrap, mobile pagrindinis geometrijos veiksmas pilno pločio.

### Iliustracijų ir crop sutartis

`MEDIA.json` saugo originalus, promptus, peržiūrą ir variantus. Visos keturios šeimos importuotos bendru MEDIA_CORE, po penkis WebP pločius: originalo maksimumas, 1200, 800, 640, 360. Renderer naudoja `imageSrcSet`, tikrus `sizes`, width/height ir kontekstinius alt. Pagrindinis hero bei gido lead vaizdas eager/high, kiti lazy. Kilmė aiškinama redakcinėje metodikoje; matomo modelio ženklelio nėra.

| Asetas | Paskirtis ir tikras crop |
| --- | --- |
| Hero | Namo fasado atpažinimas; desktop 3.4:1, iki 1240px 3:1, pozicija 50% 62%; iki 800px 4:3, 50% 60%. Plati juosta sąmoningai iškerpa stogą; mobile išsaugo namo visumą. |
| Measure | `fasado-matmenys` lead, homepage kontekstas ir jo gido miniatiūra; 4:3, centre. Siena ir saugaus žemės lygio kontekstas padeda atskirti geometriją nuo komplektacijos. |
| Scope | Kainos/apimties gido lead ir miniatiūra; 4:3, centre. Tuščias lapas ir projekto aplankas žymi klausimų pasiruošimą, ne tariamą sąmatą. |
| Mount | Montavimo gido lead ir miniatiūra; 4:3, centre. Namas ir atskirta prieiga yra kontekstas, ne mūsų brigados darbas ar saugos instrukcija. |

Hero `sizes`: iki800 viewport−40px, iki1240 viewport−160px, kitu atveju1080px. Guide lead: iki800 viewport−40px, kitu atveju720px; indeksų thumb: iki600 viewport−40px, kitu atveju220px. Homepage measure: iki800 viewport−40px, kitu atveju360px. Screenshotai leidžia vertinti kompoziciją, bet iš pastolių vaizdo nenustatoma techninė atitiktis.

### Artimiausio tinklo skirtumas

Tiesiogiai peržiūrėti `research/network-auto-desktop.png`, `network-auto-mobile.png`, `sites/miniekskavatoriai/qa/home-*-final.jpg` ir `sites/laiptucentras/DESIGN-REVISION-2026-10-01/home-desktop-top-final.jpg`, `home-mobile-crop-final.jpg`. Autoelektrikai turi pilną mėlyną pirmą sceną, kondensuotas antraštes ir split automobilio kadrą. Mini naudoja šiltą foną, tamsią hero pradžią, iškart matomą tūrio lapą ir fasadinio dokumento neaprėžtą foto juostą. Laiptai – interjero foto ir tamsi split hero plokštuma su lengvesne tipografija. Fasadas – baltas įrėmintas lapas, tvirta įprasto pločio antraštė virš horizontalios fotografijos, vėliau geometrijos ruošinys, trijų stulpelių gidų sprendimo eilutės ir laimo užbaigimas.

Panašumai išlieka: native poreikio kelias, iliustruoti linijomis atskirti gidai ir tamsi poraštė; mini taip pat turi geometrinį ruošinį. Tai sąmoningai dokumentuota bendra funkcija, o ne įrodymas, kad visas tinklas vizualiai skirtingas. Vertintos šios trys artimos nišos; kitų nišų visuotinis palyginimas nedarytas. Vietinių ir užsienio analogų pritaikytos / atidėtos / atmestos idėjos – `research/QUALITY-BAR.md`.

## Elevation & Depth

Pagrindinis dokumentas, lapai, gidų eilutės ir mygtukai be šešėlių. Gylį suteikia vėsus išorinis fonas, balti laukai, tamsi palyginimo dalis ir plonos linijos. Vienintelis pakeltas komponentas – atvertas mobilus meniu: `0 10px 28px rgb(24 45 49 / .12)`, kad jo vieta virš dokumento būtų aiški.

**The Dokumento plokštumos Rule.** Informaciniai lapai lieka plokšti; meniu šešėlis neperkeliamas į gidų eilutes ar laukus.

## Shapes

Tiesūs kampai, horizontalios ir vertikalios ribos, ne apvalios kortelės. Input/select/textarea turi explicit square radius. Fotografijos stačiakampės, be dekoratyvaus clipping. Brand ženklas – savas inline SVG iš pastolių rėmo geometrijos, 38×38px ir 2.4px brūkšnio; mobilus disclosure – atskiras 16×16px SVG chevron, ne teksto glyph.

## Components

### Buttons

Tiesioginiai veiksmai su pakankamu skaitymo plotu. Primary naudoja laimą, secondary skaidrų foną ir 1px ink ribą, užbaigimo juostos dark – ink su paper tekstu. Frontmatter nurodo tipus ir padding; min-height 52px. Hover keičia foną per 150ms ease-out; nėra lift/scale. Focus – 3px focus outline su 4px offset. Disabled naudoja disabled foną / muted tekstą, not-allowed kursorių; nepakeičia gyvo submit mygtuko vien dėl JS nebuvimo.

### Cards / Containers

Atvira dokumento dalis arba vėsus darbo lapas. Geometrijos ir žinutės lapų desktop padding 28px, mobile 20px; be kortelės šešėlio. Skiriamoji linija rodo logiką, ne dekoratyvų kortelių tinklelį. Tamsus palyginimo blokas turi prozos pločio ribą; laimo užbaigimas – pavadinimą, ribą ir atskirą dark veiksmą.

### Inputs / Fields

Balta įvestis vėsiame lape, field-stroke 1px rėmas, mažiausiai 46px aukštis ir frontmatter padding. Etiketė visada prieš lauką, pagalba atskira teksto eilute; placeholder nėra etiketė. Focus paveldi bendrą outline. Klaida rašoma `role=alert`, rezultatas ir paruošimo patvirtinimas `role=status`; gyvo submit privalomumą tikrina native forma. Šiai nišai nėra nuosavo select arrow ar dekoratyvių formos ikonų.

### Navigation

Header brand kairėje, du tekstiniai keliai ir outline contact veiksmas dešinėje; esamas puslapis `aria-current=page` ir pabraukimas. Desktop header padding 14px 40px, iki900 20px, iki800 18px 20px. Mobile native details turi 44px summary, SVG pasisuka 90° atvėrus; menu width iki280px arba viewport−40px, top52px, padding16px, z-index20. Nuorodos bent44px aukščio. Skip nuoroda iš slėptos vietos pasirodo focus metu. Gido native contents išlaiko nuorodas ir semantinius fragmentus.

### Iliustruota gido eilutė

Desktop trys stulpeliai: 220px vaizdas, santrauka, 190px sprendimo klausimas; 28px tarpas ir 1px viršutinė riba. Iki1240px vaizdas180px / sprendimas170px; iki900px vaizdas160px ir du stulpeliai; iki600px vienas stulpelis su plačiu vaizdu. Title ir tikras „Skaityti gidą“ kelias pasiekiami klaviatūra, dekoratyviai dubliuota photo nuoroda tabIndex−1 / aria-hidden. Mobile šalutinis klausimas slepiamas, tikras kelias lieka.

### Geometrijos ir žinutės ruošiniai

Geometrija prasideda dviem stačiakampių sienų poromis, galima pridėti iki keturių. Teigiamas ilgis iki200m ir aukštis iki100m yra įvesties ribos, ne saugos ribos; priimamas kablelis arba taškas. Rezultatas sumuoja tik pilnas L×H poras, nepilną dalį įvardija nežinoma, neatima langų ir nekeičia jos nuliu. Lauko pakeitimas nuvalo pasenusį rezultatą. Copy kopijuoja aprašą arba pateikia rankinio kopijavimo paaiškinimą.

Kontaktų ruošinys tik užpildo redaguojamą žinutę ir ją fokusuoja. Neužpildyti laukai lieka „Nežinau / reikia aptarti“. Jis nesukuria POST, neįrašo į URL/store ir neperduoda duomenų tiekėjui. Forma gali būti pildoma tiesiogiai; būtent jos native submit pateikia poreikį. Proporcinga aritmetika ir žinutės aiškumas sudaro šių įrankių vertę; nėra kainos, komplektacijos, užsakymo ar montavimo API imitacijos. `qa/ui-flow.json` dokumentuoja ribų, nežinomų porų, žinutės ir native kelio bandymus; copy/fallback elgesys čia išvestas iš tikro source.

### Motion ir būsenos

Tik 150ms fonų perėjimas, disclosure pasukimas ir focus skip vietos pakeitimas. `prefers-reduced-motion: reduce` panaikina perėjimus/animacijas ir automatinį slinkimą. `.impeccable/design.json` pateikia šiuos elementus kaip savarankiškus HTML/CSS pavyzdžius; shell-scoped tokenai ten išspręsti į tikras reikšmes, nėra React ar Tailwind priklausomybės. Spalvų rampos sidecar skirtos panelio demonstracijai, ne papildomi production tokenai.

## Do's and Don'ts

### Do:

- **Do** išlaikyti vėsų dokumento foną, balto lapo ribas ir tikras teksto pločio ribas.
- **Do** žinomą dydį, mato vienetą ir nežinomą dalį rodyti atskirai.
- **Do** naudoti veiksmą įvardijančius laukų bei mygtukų vardus ir palikti žinutę redaguojamą.
- **Do** mobiliame išlaikyti 20px teksto kraštus, formą prieš neprivalomą ruošinį ir native navigaciją.
- **Do** naudoti tos pačios temos 4:3 gido lead ir miniatiūros šeimą, tikrą srcset ir aiškią iliustracijos ribą.
- **Do** išlaikyti matomą focus, tekstines klaidas ir reduced-motion elgesį.

### Don't:

- **Don't** iliustracijos pateikti kaip kliento darbą, brigados ar įrangos saugos įrodymą.
- **Don't** geometrijos rezultato vadinti kaina, pastolių komplektu ar montavimo projektu.
- **Don't** ruošinio paruošimo stilizuoti kaip jau pateikto užsakymo ar rezervacijos.
- **Don't** į gidų eiles perkelti meniu šešėlio, dekoratyvių ikonų kortelių ar viso kito domeno skin.
- **Don't** grąžinti Unicode ikonų vietoje autoriaus SVG disclosure arba įteisinti nepatikrintą ekraną kaip normą.

**Not canonized:** ankstesnės peržiūros per aukštas desktop header / trijų eilučių pirmas pavadinimas ir Unicode meniu disclosure nėra sistemos taisyklės. Jie pataisyti viename ribotame rinkinyje ir jų galutinis homepage desktop/mobile vaizdas patikrintas. Nežinomi paleidimo, pašto, partnerio, fizinio įrenginio ir 200 % mastelio rezultatai nepervadinami patvirtinimu.
