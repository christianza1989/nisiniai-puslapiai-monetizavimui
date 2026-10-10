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
    fontSize: "clamp(2rem, 1.75rem + 1.3vw, 3rem)"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "StepOver Manrope, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "StepOver Manrope, sans-serif"
    fontSize: "15px"
    fontWeight: 600
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

2026-10-10 savininkas pasirinko naują planšetės ir rašiklio logotipą: dvi kairėje sulygiuotos eilutės „parašo“ / „planšetės.lt“, planšetės apačia ties apatinės „p“ apačia. Papildomas „StepOver sprendimai“ po logotipu pašalinamas. Brand taikomas antraštėje ir poraštėje; dydžiai ir patikra dokumentuojami [LOGO_PUBLICATION_20261010](LOGO_PUBLICATION_20261010.md). Patvirtintos nuotraukos, gamintojo kreditai ir turinio tiesa išlieka. Tyrimas ir priėmimo ribos: [DESIGN-REFRESH-20261010](DESIGN-REFRESH-20261010.md).

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

2026-10-10 tekstų sistema: vienas Manrope, tekstas 400, valdikliai 600, antraštės 650. Pradžios H1 32–48 px (1280 px ekrane 44,64 px), vidinių puslapių H1 32–44 px (1280 px ekrane 36,48 px). Prozos H2 26 px / telefone 24 px, H3 22/20 px. Pagrindinis tekstas 17/16 px, įžanga 18/17 px, eilučių aukštis 1,65. Įvestys 16 px; navigacija, etiketės, veiksmai ir savybės 15 px; pagalbiniai paaiškinimai, datos bei poraštė 14 px; trumpi nuotraukų kreditai 13 px. H1 eilutė 1,2 ir raidžių tarpas -0,02 em; pagrindinio teksto raidžių tarpas normalus. Vaidmenys valdomi vienais CSS kintamaisiais, o ne skirtingais atsitiktiniais dydžiais. Prozos plotis iki 65ch; pastraipų tarpas 18/16 px, skyrių tarpas 40/36 px. Patikra ir viešas diegimas: [TYPOGRAPHY_PUBLICATION_20261010.md](TYPOGRAPHY_PUBLICATION_20261010.md).

**The Plain Heading Rule.** H1 įvardija patvirtintą turinį; reklaminė frazė jo nepakeičia.

## Layout

Konteineris iki 1248 px, vidinis iki 1200 px, šonai 24 px. Skaitymo tekstas iki 720 px. Homepage: plati iliustracinė priėmimo nuotrauka su tekstu kairėje, dokumento kelio piktogramos, trys skirtingos darbo situacijos, trys gamintojo modeliai, tamsus proceso blokas, keturi gidai su nuotraukomis, patvirtintos kontekstinės nuorodos ir užklausa. Telefone hero tekstas ir nuotrauka išdėstomi vertikaliai. Katalogo modeliai ir kontaktų forma rodomi prieš papildomą paaiškinimą.

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

## Photographic update — 2026-10-10

### Header / hero alignment correction

- [x] Inspect the wide 1904 px baseline: full-viewport photo and 1248 px text container create a visually heavy right edge.
- [x] Give the header and photographic hero a shared centered 1600 px maximum width and matching 24 px inner gutters. Keep the approved logo, copy, type roles and photograph; allow the lead and heading a little more horizontal room.
- [x] Confirm 1904, 1280, 1024, 768 and 320 px views, narrow expanded menu and an unaffected guide header. Check equal outer margins, shared logo/text edge, wrapping and horizontal overflow.
- [x] Build, publish to the existing preview Worker with runtime settings preserved, and save public screenshot / deployment evidence. Results: [HEADER_HERO_ALIGNMENT_20261010](HEADER_HERO_ALIGNMENT_20261010.md).

Devynios skirtingos kompozicijos: priėmimas, klientų aptarnavimas, sveikatos įstaigos priėmimas, biuro padalinys, pasirašymo eiga ir keturi gidų vaizdai. Šeši vaizdai su įrenginiu koreguoti naudojant tikrą StepOver duraSign Pad 4.3 gamintojo nuotrauką. Tikrinti korpuso siluetas, ekrano padėtis, rašiklio vieta, rankos ir pasirašymo paviršius; trys tarpiniai variantai atmesti ir pakeisti. Situacijos iliustracinės, ne klientų diegimo įrodymai. Modelių kataloge lieka originalios gamintojo nuotraukos.

Visi vaizdai pateikiami per bendrą Content Studio responsive media importą: 45 nauji WebP variantai, devynių šeimų ID parinkti `config/parasoplansetes-homepage-media.json`. Hero kraštinių santykis 2:1; mobilus vaizdas nepridengia teksto. Tiksli laida, patikros ir ribos: [DESIGN_DEPLOYMENT_20261010.md](DESIGN_DEPLOYMENT_20261010.md).

Mobilus AI paleidiklis yra 52 px apskritimas su aiškiu prieinamumo pavadinimu. Pokalbio tęstinumo, sutikimų, kontaktų ir serverio autorizacijos logika išsaugota.
