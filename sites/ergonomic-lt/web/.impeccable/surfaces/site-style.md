---
version: 1
slug: "site-style"
primary_target: "src/components/site-header.tsx"
related_targets: ["src/app/site-header.css","src/app/site-theme.css","src/app/layout.tsx","src/app/typography.css","src/app/product-images.css","src/app/gidai/page.tsx","src/components/site-footer.tsx","src/app/footer.css"]
---

# Vieningas Ergonomic.lt stilius

## Authority

Savininkas 2026-10-12 nurodė: „dabar pagal home page perdaryk stiliu visos likusios svetaines, kad jie sutaptu. Headeris, footeris, šriftai išdestymai ir visa kita“. Tai pakeičia ankstesnius homepage-only paletės ir vidinių apvalių veiksmų apribojimus. Patvirtinta homepage kompozicija ir vienas tamsus footer išsaugomi; visos aktyvios vidinių šablonų grupės pritaikomos tai pačiai tapatybei.

## Direction contract

MODE: Operate katalogui, produktams, užklausai ir administravimo viešam prisijungimui; Read gidams, privatumo ir SEO straipsniams.

THESIS: šviesaus baldų salono tapatybė išlieka pereinant į katalogą, modelį ar gidą, o turinio hierarchija padeda konkrečiai užduočiai.

FIRST VIEWPORT: originalus bronzinis rastrinis logotipas; Katalogas, Darbo erdvės, Ergonomika, Kontaktai; matoma natūrali katalogo paieška. Savininko 2026-10-13 patikslinimas reikalauja vienodo originalaus homepage header visuose maršrutuose; jo geometrija ir paskirtys aprašytos [shared-header.md](shared-header.md). Antraštė/turinys neturi dekoratyvios tuščios hero zonos.

FORM: vienas serverio SiteHeader RootLayout visuose maršrutuose, site-header.css, main.site-content ir site-theme.css. Importuoto homepage header kopija pašalinta. Desktop .site-shell overlay išlaiko originalią homepage hero kompoziciją; ≤900px homepage pereina į normalų srautą. Gidų inline CSS perkeltas į bendrą ruled indeksą. Vienas footer visuose maršrutuose. Importai: globals.css → homepage.css → homepage-selected.css → brand-logo.css → typography.css → product-images.css → site-theme.css → homepage-approved.css → site-header.css → footer.css. Inner selector neapima main su .approved-home; shared root tokenai aprašo tapatybę, homepage CSS išlaiko jo kompoziciją/teksto išimtis, paskutinis footer CSS – jo esamą sistemą.

SYSTEM: miškas #193f35, kūnas #314c43, antrinis #50665c, kreida #f5f6f2, šalavijas #e4eae1, minkšta žalia #dfe8de, linija #b5c2ba, fokusas #356b55. Root max 1800px/gutter clamp(22px,6vw,108px) išsaugoti; nuo 2026-10-13 tik inner scope max 1640px/gutter clamp(20px,4vw,64px), ≤650px gutter 20px. Veiksmai/įprasti laukai 4px, vaizdų rėmai tiesūs; pavyzdžiai išlaiko komponento formą. Neapkarpyti baldų siluetų, neperdažyti tiekėjo fonų, tekstūrų ar vartotojo 3D scenos fono/apšvietimo.

TYPE: Manrope 200–800. Dabartinis inner tankis ir visi tiesioginiai variantai aprašyti [inner-density.md](inner-density.md) bei DESIGN.md inner-* vaidmenyse: kūnas 15px/1.6, skaitymas 16px/1.65/68ch, pagalbinis 13px, veiksmai .9rem/600/1.5, puslapio H1 28–38px/650/1.16, skyrius 22–28px, produkto H1 26–34px, kortelė/kolekcija 16px, gidai/kontaktų H2 19px, kontaktų nuoroda 22px/20px mobile. Įvedimas ≤900px yra 16px su ≥44px laukais/veiksmais. Ankstesni global/default tokenai, homepage/header/footer vaidmenys ir ankstesni įrodymai išsaugoti. Naujas tekstas privalo turėti vaidmenį, šeimą/dydį, svorį, leading, tracking, measure bei kontrasto porą. Patikrinti desktop/intermediate/mobile, ilgesnį lietuvišką tekstą, 320px reflow, teksto didinimą/tikrą zoom, user spacing ir keyboard focus prieš teigiant tokią aprėptį. Patvirtinto homepage mažo teksto/px/tracking išimtys lieka jo scope.

BEHAVIOR: native GET /produktai/?paieska=; navigacija visada matoma, ≤900px persirikiuoja, ≤560px paieška pilna eilute. Paskirtys visur /produktai/, /#darbo-erdves, /gidai/, /#kontaktai. Atskiras mobile menu ir header quote/count variantas pakeisti originaliu homepage header; užklausų veiksmai lieka hero, produktuose ir footer. html scrollbar-gutter:stable apsaugo nuo horizontalios slinkties keičiant puslapius. Paieškos accessible name išlieka. Išsaugoti filtrus, puslapiavimą, galerijas, visas tikras konfigūracijos parinktis, PDF, URL/storage, užklausų laukus/sutikimą ir admin apsaugą. Straipsnio inquiry button hover turi aiškų #285748 foną/border ir kreidos tekstą – jis nebeperima seno pale .light:hover.

SEO/TRUTH: išlaikyti 8 saugomus URL, originalų H1/metaduomenis ir 76 blokus. Nekurti kainų, stock/delivery, klientų projektų ar kitų nepatvirtintų teiginių. Nuotraukų/provenance ir 3D duomenys neliečiami. Istoriniai statiniai dizaino HTML nėra aktyvūs šablonai. SMTP nesukonfigūruotas; saved nėra pristatytas laiškas. ergonomic.lt domenas nepakeistas.

## Verification and handoff

2026-10-13 tankio patikslinimas papildo ankstesnį stiliaus etapą: penki desktop produktai/kolekcijos eilėje, mažesnis vidinio turinio mastas ir išsaugoti touch įvedimo/taikinių dydžiai. Dabartinė sutartis yra [inner-density.md](inner-density.md); šaltinių ir dokumentavimo ribos – [documentation.md](../review/site-density-20261013/documentation.md). Toliau pateikti ankstesnio stiliaus/header kvitai lieka jų etapų istorija.

2026-10-13 headerio korekcijos [QA.md](../review/header-match-20261013/QA.md) fiksuoja vienodą geometriją /, /produktai/, /gidai/ ties 1440/390/766/1000/1920px. Toliau pateiktas 2026-10-12 mobiliojo meniu/Escape patvirtinimas yra ankstesnio headerio istorija, ne dabartinio valdiklio sutartis. Dokumentavimo atnaujinimas remiasi šaltiniais ir pateiktais įrodymais, be naujo browser review.

Vykdanti užduotis atliko batched desktop/mobile/intermediate patikrą. Atskirai finish reviewer atidarė 29 pateiktus vaizdus ir patvirtino nuoseklią kompoziciją; žr. [finish-review.md](../review/site-style-20261012/finish-review.md). Dokumentavimo užduotis perskaitė dabartinius šaltinius ir įrodymus, neatidarė naršyklės ir nekūrė naujos vizualinės peržiūros.

57 testai, types, Next ir Cloudflare galutiniai build po paskutinės vienos hover korekcijos praėjo; SEO – 8/76. [DOM evidence](../review/site-style-20261012/dom-evidence.json) rodo vieną footer ir jokios teigiamos document overflow pagrindiniuose šablonuose. [Menu focus confirmation](../review/site-style-20261012/menu-focus-confirmation.json): ties 1050px Katalogas buvo fokusuotas meniu; Escape → meniu uždaras, Atidaryti meniu aktyvus, aria-expanded=false ir focus-visible=true. [Inquiry hover confirmation](../review/site-style-20261012/inquiry-hover-confirmation.json): hover=true, rgb(40,87,72) fonas ir rgb(245,246,242) tekstas. Šie native įrodymai priklauso vykdančiai užduočiai.

Vienas detector.json turi devynis advisory dėl seno tipo ramp, kitų findings nėra; dabar kanone dokumentuoti tikri sąmoningi variantai. Detector nererunintas ir senas įrodymas neperrašytas. Tai šablonų/pagrindinių kelių aprėptis, ne kiekvieno produkto, naujas screen-reader/zoom/320px/user-spacing audit ar viešo diegimo patvirtinimas. Viešas šio stiliaus diegimas ir jo tik skaitymo patikra laukia vykdančios užduoties atskiro kvito. Ankstesni homepage/footer preview receipts lieka jų etapų istorija.


## Visos svetainės stiliaus viešas kvitas (2026-10-12)

Paskelbta Cloudflare versija **13e4d0a3-9721-471e-ba0e-a3e2361b8ea3**: https://ergonomic-preview.pinet-azprekyba.workers.dev/. Viešos SEO 8/76, 47 vidinių nuorodų ir 89 failų SHA-256 patikros praėjo; katalogo paieška ir tikras 3D veikia. Tai pakeičia šio etapo dokumentavimo metu pažymėtą laukiamą diegimą; ankstesni kvitai lieka jų etapų istorija. Galutinis aprašas: .impeccable/review/site-style-20261012/release.md. ergonomic.lt domenas nepakeistas.

