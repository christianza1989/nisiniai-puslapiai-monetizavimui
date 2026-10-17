---
version: 1
slug: "shared-header"
primary_target: "src/components/site-header.tsx"
related_targets: ["src/app/site-header.css","src/app/layout.tsx","scripts/import-approved-home.mjs","src/lib/approved-home-markup.ts","src/app/homepage-approved.css"]
---

# Vienodas originalaus homepage header

Savininko 2026-10-13 nurodymas: „header perejus is homepage i kitus pasislenka, padaryk kad jis butu visur lygiai toks pats kaip homepage“. Autoritetas – originalus galutinio homepage header, o ne ankstesnis vidinių puslapių sticky/menu/quote-count variantas. Tai siaura korekcija, be naujų tapatybės, paletės ar šriftų pasirinkimų.

MODE: Operate.

FORM: vienas serverio SiteHeader RootLayout visuose maršrutuose. Originali rastrinio logo nuotrauka /media/home-final/assets/ergonomic-logo.png; originalūs baitai išsaugoti. Importuoto homepage HTML header ir jo atskirų CSS taisyklių nebėra. site-header.css yra po homepage-approved.css ir prieš footer.css.

GEOMETRY: relative, ne sticky; 5.8% inline padding, height clamp(66px,5.35vw,88px), flex gap 24px, logo clamp(220px,23vw,300px), nav centras 49%, gap clamp(24px,2.65vw,42px), 16px/600/1.5 Manrope, 250px paieška. 901–1200px: logo 200px, nav 15px/gap 14px, paieška 220px. 901–1000px: logo 180px, nav centras 47%/gap 12px. ≤900px: auto height/≥70px, 18px/14px block padding, flex-wrap/gap 16px, logo min(240px,calc(100% - 60px)), visada matoma wrapped nav 16px/gap 12px 24px ir paieška clamp(180px,30vw,240px). ≤560px: logo min(240px,100%), paieška pilna eilute. ≤360px: nav gap 10px 22px. html scrollbar-gutter:stable neleidžia scrollbarui stumti header keičiant trumpą/ilgą puslapį.

COMPOSITION: desktop .site-shell pirmoje grid eilutėje sujungia header ir homepage content, kad originalus hero išliktų po headeriu. ≤900px homepage content grįžta į antrą eilutę normaliame sraute. Vidinis content visada antroje eilutėje. Vienodos header geometrijos nereikia išgauti vidinių puslapių turiniui taikant hero išdėstymą.

BEHAVIOR: logo → /; Katalogas → /produktai/; Darbo erdvės → /#darbo-erdves; Ergonomika → /gidai/; Kontaktai → /#kontaktai. Native GET /produktai/ su paieska, search accessible name „Ieškoti baldų“, maxlength 200, autocomplete off. Kairė paieškos ikona dekoratyvi. Paieškos laukas ≥46px, padding 10px 14px, gap 12px, 4px kampai, 15px/400/1.4 tekstas, 1px #79968b border ir rgb(250 251 248 / 93%) ground. Focus-within 3px #356b55/3px offset; navigacijos target ≥44px, focus-visible 3px/5px offset, hover underline/5px offset. Atskiro hamburger, active-link ar header užklausų skaitiklio varianto nėra; užklausų veiksmai lieka hero, produktuose ir footer.

EVIDENCE: vykdančios užduoties [QA.md](../review/header-match-20261013/QA.md), baseline.json/baseline-1440.png/baseline-390.png ir measurements.json. /, /produktai/, /gidai/ header/logo/nav/search bounding boxes vienodi ties 1440, 390, 766, 1000 ir 1920px; vienas header, document overflow nėra. Stabilus gutter keičia desktop vw mažiau nei 1%, patvirtinta homepage kompozicija išlieka, telefono matmenys tiksliai sutampa su etalonu. Šio dokumentavimo atnaujinimo metu nauja browser/build/detector patikra neatlikta; viešas diegimas yra vykdančios užduoties atskiras kvitas.
