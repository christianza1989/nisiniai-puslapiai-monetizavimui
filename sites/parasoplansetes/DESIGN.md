---
name: "parasoplansetes.lt / StepOver"
description: "Aiški įrenginio, programos ir dokumento proceso atranka"
colors:
  primary: "#185de5"
  primary-hover: "#124cc0"
  ink: "#172b49"
  paper: "#f7f9fc"
  surface: "#ffffff"
  muted: "#53647c"
  line: "#dce3ee"
  inquiry: "#eaf0fb"
typography:
  display:
    fontFamily: "StepOver Manrope, sans-serif"
    fontSize: "clamp(36px, 4.4vw, 60px)"
    fontWeight: 650
    lineHeight: 1.14
    letterSpacing: "-0.035em"
  body:
    fontFamily: "StepOver Manrope, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "StepOver Manrope, sans-serif"
    fontSize: "13px"
    fontWeight: 700
rounded:
  field: "7px"
  action: "8px"
  model: "12px"
  panel: "16px"
spacing:
  compact: "12px"
  regular: "24px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.action}"
    padding: "14px 22px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "12px 14px"
---

# Design System: parasoplansetes.lt

## Overview

**Creative North Star: "Dokumento darbo stalas"**

2026-10-10 StepOver redesign. Dokumento eiga, tikras įrenginys, palyginamos savybės ir konkretus kitas veiksmas. Šaltos šviesios plokštumos, mėlyni veiksmai ir tamsus rašalas jungia katalogą su skaitmeniniu dokumentų procesu. Tai agento pasirinkimas pagal deleguotą pavedimą ir PROJECT_ADAPTATION, ne žmogaus dizaino approval. Ankstesnis 2026-10-08 DESIGN išsaugotas Git istorijoje.

Originalus parašo ženklas, patvirtintos nuotraukos, gamintojo kreditai ir turinio tiesa išlieka. Tyrimas ir priėmimo ribos: [DESIGN-REFRESH-20261010](DESIGN-REFRESH-20261010.md).

**Key Characteristics:**

- Vienas mėlynas veiksmo akcentas.
- Matoma dokumento eiga ir modelio savybės.
- Bendra katalogo, skaitymo ir pokalbio tipografija.
- Platus desktop išdėstymas tampa viena mobile seka.

## Colors

Primary žymi veiksmą, aktyvią navigaciją, fokusą ir eigos taškus. Ink naudojamas antraštėms ir homepage proceso blokui. Paper bei Surface skiria bendrą puslapį nuo įrenginio ar formos. Muted — papildomam paaiškinimui, Line — savybėms atskirti, Inquiry — užklausos vietai.

**The Action Rule.** Mėlyna nukreipia į veiksmą arba pažymi būseną.

## Typography

Manrope laikomas lokaliai su OFL ir lotynų bei išplėstiniu lotynų poaibiais. Lietuviškos raidės palaikomos. Viešas puslapis nedaro Google Fonts užklausų. Šaltinis ir hash: companion `public/fonts/parasoplansetes/provenance.json`.

Desktop H1 iki 60 px, produkto iki 54 px; mobile 39 px / produkto 37 px, iki 360 px — 34 px. Prozos H2 29 px desktop / 27 px mobile. Kūno tekstas 17 px desktop, 16 px mobile su 1.8 eilutės aukščiu. Įvestys 16 px. Etiketės mažesnės; valdikliai lieka bent 44 px aukščio.

**The Plain Heading Rule.** H1 įvardija patvirtintą turinį; reklaminė frazė jo nepakeičia.

## Layout

Konteineris iki 1248 px, vidinis iki 1200 px, šonai 24 px. Skaitymo tekstas iki 720 px. Homepage: tekstas ir darbo stalas, trijų kelių navigacija, trys modeliai, proceso paaiškinimas, keturi gidai, užklausa. Katalogo modeliai ir kontaktų forma rodomi prieš papildomą paaiškinimą.

Desktop katalogas dviejų stulpelių; gidai keturių, ties 1100 px — dviejų. Ties 900 px navigacija tampa native details meniu. Ties 700 px puslapis ir forma pereina į vieną stulpelį. Ties 360 px modelių savybės rodomos vertikaliai. Gido turinys desktop turi sticky nuorodų stulpelį, mobile — išskleidžiamą bloką prieš tekstą.

## Elevation & Depth

Tekstas ir savybės atskiriami tonu bei linijomis. Šešėliai: darbo stalas `0 18px 55px #213b6810`, pokalbis `0 16px 60px #172b4938`. Tai sluoksnio atskyrimas, ne įrenginio 3D imitacija.

## Shapes

Laukai lengvai užapvalinti, veiksmai kompaktiški, modelių ir gidų konteineriai minkštesni. Native SVG rodyklės ir dokumento ženklas priklauso veiksmams. Modelio nuotrauka neapkerpama; konceptinė gido iliustracija išlaiko savo vaidmenį.

## Components

Pagrindinis veiksmas mėlynas su baltu tekstu ir rodykle; hover tamsėja. Focus-visible turi 3 px kontūrą su tarpu. Fono perėjimas 180 ms išjungiamas per prefers-reduced-motion.

Modelio konteineris rodo tikrą nuotrauką, pavadinimą, originalų aprašymą, savybių definition list ir realią nuorodą. Tai produkto vienetas, ne kiekvienos pastraipos dekoratyvinė kortelė.

Forma turi matomas etiketes, native required/email/minLength validaciją, sutikimą ir esamą honeypot. Native POST endpoint bei laukų vardai išlieka. El. paštas matomas atskirai.

Pokalbis pasirenkamas tik `appearance="stepover"`. Panelė iki 430 px, mobile iki viewport minus 24 px, su savo slinkimu, istorija, composer, disabled laukimo būsena ir kontakto forma. Bendro komponento sesijų, atminties ir kontakto protokolas neperrašomas. Paslaugos klaidos rodomos tiesiogiai.

## Do's and Don'ts

- **Do** išlaikyti paketo faktus, tikrus vaizdus, kreditus ir nuorodas.
- **Do** aiškiai skirti įrenginį, programinį kelią ir užklausą.
- **Do** jungti visus puslapius ta pačia veiksmų kalba.
- **Don't** kurti kainų, klientų, įvertinimų, tiekimo ar sertifikavimo įrodymų.
- **Don't** perpiešti įrenginio ar kopijuoti Dribbble vaizdo.
- **Don't** vadinti vietinio fixture tikro AI ar el. pašto pristatymo įrodymu.
