---
name: Roletai Klaipėdoje
description: Šviesos ir privatumo pasirinkimas aiškioje interjero erdvėje
colors:
  primary: "#294f65"
  ink: "#192f3c"
  pale: "#d4e2e9"
  surface: "#eaf0f3"
  paper: "#ffffff"
  line: "#c6d2d9"
  muted: "#425c6b"
  focus: "#875b27"
  primary-hover: "#1b3c50"
  hero-hover: "#365b6f"
  guide-hover: "#dce8ee"
  field-border: "#8a9fab"
typography:
  display:
    fontFamily: "Roletai Manrope, sans-serif"
    fontSize: "clamp(44px, 4.2vw, 64px)"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-.035em"
  headline:
    fontFamily: "Roletai Manrope, sans-serif"
    fontSize: "clamp(30px, 3vw, 44px)"
    fontWeight: 500
    lineHeight: 1.13
    letterSpacing: "-.03em"
  title:
    fontFamily: "Roletai Manrope, sans-serif"
    fontSize: "23px"
    fontWeight: 500
    lineHeight: 1.13
    letterSpacing: "-.03em"
  body:
    fontFamily: "Roletai Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  article:
    fontFamily: "Roletai Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.85
  label:
    fontFamily: "Roletai Manrope, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  action:
    fontFamily: "Roletai Manrope, sans-serif"
    fontSize: "15px"
    fontWeight: 700
rounded:
  square: "0px"
spacing:
  field: "12px"
  mobile-gutter: "24px"
  form-panel: "35px"
  desktop-gutter: "50px"
  desktop-section: "85px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    typography: "{typography.action}"
    rounded: "{rounded.square}"
    padding: "18px 25px"
    height: "58px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-hero:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.square}"
    padding: "18px 25px"
  button-inverse:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "18px 25px"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "12px"
    height: "48px"
  featured-guide:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "40px"
---

# Design System: Roletai Klaipėdoje

## Overview

**Creative North Star: "Langas į šviesą"**

Šviesos valdymą aiškiname erdvėje, kuri primena tvarkingą lango konstrukciją: aiškios briaunos, šviesūs laukai ir vienas didelis interjero vaizdas. Manrope raidės, tamsus mėlynas tekstas ir pilkai mėlyna plokštuma sukuria ramų, šiuolaikišką toną.

Turinys veda nuo kambario poreikio iki konkretaus klausimo. Vaizdas suteikia atmosferą, o teiginiai išlieka tikrinami. Dydžiai, etiketės ir veiksmai turi padėti skaityti tikrą turinį bei pasiekti veikiantį kontaktą.

**Key Characteristics:**
- Tiesios konstrukcinės briaunos.
- Šviesos ir audinio medžiagiškumas dideliame originaliame vaizde.
- Aiški tipografijos hierarchija ir ramus teksto ritmas.
- Mažai sąveikos, veikiantys natyvūs veiksmai.

Dokumentuota iš įgyvendinto rendererio 2026-09-30. Autoritetas tik šios nišos tapatybei. SURFACE.md išlaiko homepage sutartį; 44/56 kompozicija neprivaloma visiems būsimiems puslapiams. Kryptis pasirinkta agento pagal deleguotus sprendimus, ne žmogaus patvirtinta.

## Colors

Primary – prislopintas konstrukcinis mėlynas. Pale ir surface – vėsūs šviesūs laukai; paper – atvira skaitymo erdvė. Ink – stiprus tekstas ir hero veiksmas, muted – pagalbiniai paaiškinimai, line – plonos ribos. Focus yra atskira matoma sąveikos būsena. Normatyvinės reikšmės frontmatter; hover ir field-border paimti iš kodo.

**The Visible Action Rule.** Pagrindinis veiksmas turi aiškiai skirtis nuo savo fono; pasirinkta hero ink plokštuma ir inverse mygtukas mėlyname kvietime.

## Typography

Vienas šriftas Manrope, lokaliai įterptas WOFF2 latin ir latin-ext; sans-serif fallback. OFL licencija išsaugota. Lietuviški ženklai rodomi tuo pačiu šriftu.

Display – home pavadinimas; mobile 42 px / 1.1. Inner title desktop clamp(36px,4.2vw,60px), mobile 35 px / 1.13. Sekcijų headline mobile 32 px. Brand 27 px / 700 su 13 px vietovės eilute, mobile 24 / 11 px. Straipsnis iki 70ch; mobile 15 px / 1.85. Jo įvadas 19 px, mobile 17 px; article h2 30 px / 1.25, mobile 26 px. Žinutės laukas 14 px / 1.65. Kilmės etiketė 12 px desktop / 11 px mobile.

Antraštės 500 svorio su nežymiai glaustesniu tarpuraidžiu, action 700. Nėra dekoratyvių all-caps etikečių. Eilučių lūžiai prisitaiko prie teksto, o ne priverstinių br.

## Layout

Home hero desktop 44/56, max 1600 px, min-height 650 px. Media cover, object-position 62% 50%; tekstas 65 px / responsive padding. Sekcijos max 1340 px su 50 px kraštais. SectionHead dvi kolonos / 70 px gap, trys poreikiai su plonomis ribomis. Palyginimas ir pasiruošimas – dvi skirtingos teksto kompozicijos / 80 px gap. Gidų indeksas – vienas featured laukas ir trys atviros eilutės.

Gidas max 1240 px: 240 px navigacija ir iki 720 px straipsnis / 70 px gap, nav sticky top 30 px. Contact max 1300 px, 1 / 1.2 kolonos, 75 px gap ir 35 px formos panel. Privacy – paprastas max 780 px tekstas.

Breakpoints 1050 ir 760 px; hero patikslinimas nuo 1800 px. 761–1050 px siauresni kraštai ir gaps. Iki 760 px kolonos tampa viena, kraštai 24 px, didesnės sekcijos 55 px vertical. Hero vaizdas po tekstu, 4:3. Formos vardas / paštas tampa dviem eilutėmis. Gido turinys prieš tekstą, sticky išjungtas. Poraštė vertikali. Meniu atveriamas po header, skaitymo tvarka nesikeičia. Tikrinta 1440×1000 ir 390×844.

## Elevation & Depth

Gylį kuria originalaus interjero šviesa, didelis mastelis ir toniniai laukai. CSS shadow nenaudojami. Formos ir featured gido fonas atskiria vietą, 1 px linijos struktūruoja sąrašus. Nėra medžiagą imituojančių CSS bevel / emboss efektų.

## Shapes

Square kampai mygtukuose, laukuose ir gido panel. Tiesios briaunos atitinka lango rėmo ženklą. Fields border 1 px, mygtukai be border. Rodyklės ir langas – inline SVG su tikru stroke, aria-hidden, ne glyph.

## Components

Mygtukai – tekstas ir rodyklė stačiakampėje plokštumoje. Primary įprastuose veiksmuose, ink hero ir paper inverse mėlyname kvietime. Background transition .15 s, hover reikšmės frontmatter. Focus-visible 3 px focus outline / 5 px offset. Reduced-motion išjungia transitions. Min-height 58 px, header 48 px, mobile hero 54 px. Text link – atviras tekstas su rodykle ir hover underline.

Featured gidas – surface / 40 px padding / title 29 px, hover guide-hover. Mobile 30 / 25 px padding ir title 27 px. Kiti gidai – atviros eilutės su 1 px viršutine riba, ne panel serija.

Inputs – paper, 1 px field-border, min-height 48 px, 12 px padding. Focus 2 px primary outline. Textarea resize vertical, labels nuolat matomi. Checkbox 19 px / primary accent. Native validacija ir serverio klaidos, honeypot nepasiekiamas tab. Minimumai ir formos paskirtis matomi prieš siuntimą.

Navigation desktop – 14 px / 600, hover underline. Mobile details / summary atveria baltą pilno pločio meniu po header, nuorodos su 15 px vertical padding. Brand accessible name gaunamas iš matomo teksto. Skip link atsiveria gavęs focus.

Signature – didelis tikrai įkeltas interjero raster su kilmės etikete. Cover ir mobile 4:3 išlaiko audinį, langą ir šviesą. Width / height, srcset 640 / 960 / 1440, decode patikra; nėra auto slideshow ar scroll animacijų.

## Do's and Don'ts

### Do

- Do išlaikyti tiesias konstrukcines briaunas ir atviras sąrašų eilutes.
- Do naudoti didelį originalų vaizdą su aiškia iliustracijos kilme.
- Do tikrinti lietuvišką tekstą, focus ir pilną skaitytojo kelią desktop bei mobile.
- Do atskirti techninį testo rezultatą nuo verslo fakto.

### Don't

- Don't vaizduoti generuoto interjero kaip tikro atlikto darbo.
- Don't dėti nepatvirtintų montavimo, kainos ar greito atsakymo pažadų.
- Don't keisti šios nišos tapatybės į bendrą visų domenų maketą.
- Don't pridėti dekoratyvinės animacijos ar šešėlių be skaitytojo poreikio.
