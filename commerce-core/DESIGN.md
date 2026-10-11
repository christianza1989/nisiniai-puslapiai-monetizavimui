---
name: Prekybos valdymas
description: Kasdienis užsakymų, likučių ir dokumentų registras
colors:
  primary: "#245c45"
  ink: "#1e302b"
  muted: "#52645d"
  paper: "#ffffff"
  canvas: "#f5f4ef"
  line: "#d6ddd7"
  hover: "#e7ede7"
  error: "#94382d"
  focus: "#215fba"
  selection: "#cce2d5"
  masthead-secondary: "#e0e8df"
  control-border: "#8b9e92"
  control-hover: "#dce6dc"
  disabled-ink: "#65776c"
  disabled-surface: "#eef1eb"
  disabled-border: "#bcc8bd"
  primary-hover: "#194b37"
  navigation-active: "#e0e8de"
  navigation-ink: "#1e503b"
  notice: "#f1f3ec"
  badge: "#ecf0ea"
  badge-ink: "#344f3f"
  waiting: "#f7ebd5"
  waiting-ink: "#674813"
  success: "#dfede2"
  success-ink: "#245236"
  error-surface: "#fcf0eb"
typography:
  masthead:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.5
  minor-title:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.5
  headline:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  control: "6px"
  badge: "4px"
spacing:
  small: "8px"
  medium: "16px"
  section: "24px"
  desktop: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
---

# Prekybos administravimo dizainas

## Overview

Darbo registras: svarbiausi yra įrašai, būsenos ir aiškus veiksmo rezultatas. Sistema skirta bendram commerce administravimui, o Memocasting vieša svetainė turės atskirą nišos identitetą. Dizaino sprendimą pagal deleguotą projekto teisę priėmė agentas.

## Colors

Tamsus rašalas naudojamas tekstui ir viršutinei juostai, žalia — aktyviam veiksmui. Navigacija išskiriama šiltu neutraliu paviršiumi. Sėkmės, laukimo ir klaidos būseną nurodo tekstas bei spalva kartu.

## Typography

Viena sistemos sans šeima. Faktinis vietinis šriftas — Segoe UI, svoriai 400 ir 600; kodo pavyzdžiams paliktas naršyklės monospace. Pagrindinis tekstas ir duomenys 16px, paaiškinimai bei būsenos 15px, skyrių antraštės 28px ir 20px. Ilgesnė proza ribojama iki 70ch; duomenų lentelėms šis apribojimas netaikomas. Sumoms naudojami tabuliniai skaičiai. Antraštės bei ilgi valdiklių pavadinimai gali persikelti į kitą eilutę.

## Layout

Desktop: 210px navigacija ir likusį plotį užimanti duomenų sritis, visas ekranas iki 1480px. Turinio padding 32px. Iki 760px navigacija tampa viršutine eilute, pagrindiniai lentelių įrašai — vertikaliomis eilutėmis; padding 20px. Prekių lentelė išlaiko stulpelius. Būsenos pranešimas laikomas matomas apatinėje ekrano dalyje. Pasirinktas įrašas rodo vieną detalę duomenų srityje.

## Elevation & Depth

Šešėlių nėra. Sritis atskiria paviršiaus tonas arba 1px linija. Dekoratyvus judesys nenaudojamas; valdiklių būsenos keičiasi per 160ms, reduced-motion išjungia perėjimą.

## Shapes

Valdiklių kampai 6px, būsenų žymų 4px. Formos ir lentelės neapgaubiamos papildomomis dekoratyviomis kortelėmis.

## Components

Mygtuko minimalus aukštis 44px; pirminis veiksmas žalias su baltu tekstu. Input/select turi tą pačią 1px kraštinę ir kampus. Fokusas — matoma 3px mėlyna linija su 3px atitraukimu. Pasirinktas navigacijos skyrius nurodomas tonu ir aria-pressed. Loading, empty, error, disabled ir success būsenos remiasi API rezultatu; ekrane nėra atsarginio testinių duomenų masyvo.

## Do's and Don'ts

- Rodyti serverio patvirtintą būseną, valiutą ir aiškų veiksmo pavadinimą.
- Išlaikyti tą patį lentelės, formos ir fokuso ritmą naujuose skyriuose.
- Neperkelti šio operatoriaus ekrano dizaino į viešą nišos parduotuvę automatiškai.
- Testinių dokumentų ir neaktyvių integracijų nepristatyti kaip veikiančios apskaitos ar siuntimo paslaugos.

Naršyklės peržiūra ir dizaino aprašymas atlikti nuosekliai to paties agento; tai nėra nepriklausomas auditas. Faktinis teksto padidinimas nuo 16 iki 32px patikrintas kartu su skaitymo tarpais. Browser zoom ir pilna WCAG atitiktis neteigiami; tikslios ribos — docs/ACCEPTANCE.md.
