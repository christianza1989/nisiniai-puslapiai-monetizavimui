# traktoriupadangos.lt — pilnas pirmos fazės A–Z auditas

Vertinta 2026-09-30T20:21:06.569Z. **Audito ir vietinių taisymų ciklas baigtas; svetainė dar nėra 10/10 ar domain-ready.**

Savitas dizainas ir bendra publikavimo/SEO architektūra tinkami kaip kitų nišų pagrindas. Kiekviena niša vis tiek turi savo tyrimą, patvirtintus faktus, turinį ir naują auditą; 20 domenų nelaikomi patikrintais vien pagal šį pavyzdį.

## Atskiros būsenos

| Etapas | Patvirtinta / taikoma | Rubrikos balas | Būsena |
|---|---:|---:|---|
| local | 70/72 | 9.72/10 | neįrodyti vartai: R2, S2 |
| launch | 0/10 | 0/10 | neįrodyti vartai: B3, I4, O3, U4, W3, X3, Z3 |
| operations | 0/2 | 0/10 | neįrodyti vartai: A3, V3 |

Launch/operations nulinis patvirtintų punktų skaičius reiškia **įrodymų dar nėra**, o ne išmatuotą blogai veikiančią produkciją. Local balas yra checklist aprėpties, ne nepriklausomas pasaulinio dizaino reitingas.

Vietinė peržiūra: [atverti svetainę](http://127.0.0.1:8787); SMTP ir balsas išjungti. 8790 buvo laikinas GET-only canonical Host auditas ir po darbo sustabdytas. Tikras domenas/DNS nekeisti.

## Kas rasta ir sutvarkyta

| Prioritetas | Baseline trūkumas | Pataisa / likęs veiksmas |
|---|---|---|
| P1 | Matomo autoriaus, tikro profilio ir redakcinės metodikos trūko. | MB Pinet Organization/byline, /redakcija, /apie-projekta, AI/šaltinių/taisymų paaiškinimas. |
| P1 | Matomas 3 žingsnių breadcrumb turėjo 2 žingsnių schema; matoma review data neturėjo atskiros publish prasmės. | Bendri breadcrumb ir date helperiai, ProfilePage/Article autoriaus ryšys, time datetime ir sitemap lastmod. |
| P1 | 3 pradiniai gidai per silpni praktiškam sprendimui; skaitomumo tekstas vietomis 11 px. | Trys originalūs atsakymai su pavyzdžiais, ribomis ir realiais contextual šaltiniais; 14 px byline/ToC ir didesnis footer. |
| P1 | LLM full išvestis neturėjo šaltinių URL; privatumas buvo techninis laukų aprašas. | LLM šaltiniai/susiję URL iš projection, išplėstas truth-based notice ir informacinio naudojimo sąlygos. |
| P1 | Per didelis /uzklausa body bei unread origin rejection vietiniame proxy sukeldavo 503. | 10 KB retained ir 64 KB bounded drain; origin prieš storage; fixed/chunked 10010 baitų 400 ir paskesnė sėkminga D1 užklausa patikrinti. |
| P2 | Mobilus našumas baseline 88, po turinio papildymo 89; 6 font užklausos. | Vienas Barlow 700 svoris; 4 font užklausos. Dabartinis home 90, gidas 91. LCP dar >2.5 s ir bus stebimas tikrame hostinge. |
| P1 | Trūko gidų raster vaizdų ir homepage papildomų vizualų; matomas nepageidaujamas ImageGen badge. | Keturi nauji originalūs vaizdai, 3 gidų split header, homepage miniatiūros ir lauko/kelio nuotrauka; badge pašalintas. |
| P2 | 1.75-DPR telefonas rinkosi 147 KB 1200 px gido vaizdą; indeksas pabraukė visą aprašymą. | 800 px quality-75 variantas dabar 40 KB; gidas 85→91. Indekse pabrauktas tik skaitymo veiksmas ir hover/focus antraštė. |
| P1 | Kiekvienai nišai reikėjo atskiro vaizdų optimizavimo skripto. | Bendras responsive-webp-v1 importas, privatus originalas, viena GUI šeima; plan/draft promptai gauna media workflow su SHA-256. Tikras izoliuotas GUI bandymas ir regresijos praėjo. |
| P1 — liko | 200% zoom / enlarged text elgesys nepatikrintas. | R2/S2 UNVERIFIED. Native Chrome bandymą sustabdė savininko fizinis Esc, procentas/atkūrimas nepatvirtinti. Vien 320 px reflow šio bandymo neatstoja. |
| P0 prieš paleidimą — liko | Production operator/domain/privacy/delivery/abuse/recovery faktų nėra. | B3/I4/O3/U4/W3/X3/Z3 launch UNVERIFIED. Neįjungta tikrų lankytojų rinkimo sistema nežinant šių faktų. |

## 11 puslapių ir trys perskaityti gidai

Homepage, gidų indeksas, DUK, kontaktai, privatumas, projekto aprašymas, redakcinis organizacijos profilis, naudojimo sąlygos ir trys gidai. Kiekvienas turi atskirą paskirtį. Visi trys gidai turi atskiras originalias raster iliustracijas; homepage turi 5 vaizdus, indeksas 3. Žymėjimo raktas ir ruošinys papildomai yra prieinamas HTML/CSS. Fiktyvaus autoriaus portreto nėra.

- **Kaip išsirinkti traktoriaus padangas: nuo kokių duomenų pradėti?** — /gidas/kaip-issirinkti-traktoriaus-padangas; 470 article žodžių, patikrinti teiginiai, konkretus pavyzdys/ruošinys ir kitas žingsnis.
- **Traktoriaus padangų žymėjimas: kaip skaityti šoninę sienelę?** — /gidas/traktoriaus-padangu-zymejimas; 426 article žodžių, patikrinti teiginiai, konkretus pavyzdys/ruošinys ir kitas žingsnis.
- **Radialinės ar diagonalinės traktoriaus padangos: kuo skiriasi?** — /gidas/radialines-ar-diagonalines-traktoriaus-padangos; 415 article žodžių, patikrinti teiginiai, konkretus pavyzdys/ruošinys ir kitas žingsnis.

## Patikrų įrodymai

- [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json)
- [tractor-browser-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-browser-local.json)
- [tractor-index-final.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-index-final.json)
- [tractor-form-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-form-local.json)
- [niche-form-verification.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/mail/niche-form-verification.json)
- [tractor-audit-core-tests.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-core-tests.log)
- [studio-tests.log](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/studio-tests.log)
- [scorer-tests.log](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/scorer-tests.log)
- [ACCESSIBILITY-VERIFICATION.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/ACCESSIBILITY-VERIFICATION.json)
- [NEW-AGENT-READINESS.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/NEW-AGENT-READINESS.json)
- [MEDIA-PIPELINE-VERIFICATION.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/MEDIA-PIPELINE-VERIFICATION.json)
- [MEDIA_CORE.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/MEDIA_CORE.md)
- [tractor-audit-interest-tests.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-interest-tests.log)
- [tractor-images-mobile.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/lighthouse/tractor-images-mobile.json)
- [tractor-audit-lint.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-lint.log)
- [tractor-audit-types.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-types.log)
- [tractor-full-audit-build.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-full-audit-build.log)

19/19 core, 14/14 studio, 5/5 scorer/initializer testai; ankstesni nepakitusio public source/paketo ESLint/tsc/build EXIT=0. SEO smoke: tractor 11 / greitos 7 / roleta 9. Tikras local HTTP/D1 bandymas išvalė tik pažymėtą synthetic užklausą; SMTP→matching INBOX ankstesnis same-contact testas panaudotas su jo data ir ribomis. Naujos dokumentacijos/scaffold patikra neapsimeta nauju Lighthouse ar realiu naujo agento svetainės bandymu.

Mobilus Lighthouse homepage **90 / 100 / 100 / 100** (2026-09-30T18:26:53.938Z, LH 12.8.2); gidas **91 / 100 / 100 / 100** (2026-09-30T18:26:24.017Z). Mobile slow-4G/CPU laboratorija, tikras production HTML/vaizdai per canonical Host. Homepage LCP 3.4 s, TBT 40 ms, CLS 0; guide LCP 3.0 s. Keturios font užklausos. Pirmasis gido matavimas 85 parodė šuolį nuo 640 iki 1200 px; pridėtas lengvesnis 800 px variantas ir perstatytas realus build. Tai ne field CWV, DNS/TLS/CDN ar tikros paklausos įrodymas.

## Dizaino vertinimas

Pradinis ekranas turi ryškią padangos medžiagos ir industrinės tipografijos idėją. Gidų skaitymo plotis, vietinis indeksas, naudingi ruošiniai ir ramūs trust puslapiai pratęsia tą pačią tapatybę. Peržiūrėti desktop ir mobile maketai; pasikartojančių promocinių sekcijų sumažinta. Šriftų konsolidavimas pastorino kai kurias antraštes, tačiau hierarchija liko nuosekli. Tai stiprus etalono kandidatas, ne objektyviai įrodytas geriausias AI dizainas. Nepriklausoma ankstesnė 25/40 baseline kritika po šio ciklo iš naujo neskaičiuota.

[Homepage desktop](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-images-home-desktop.jpg) · [Homepage mobile](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-images-home-mobile.jpg) · [Gidas desktop](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-images-guide-1-desktop.jpg) · [Gidas 320 px](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-images-guide-1-320.jpg)

## Pirmo tikro paleidimo vartai

1. Patvirtinti tikrą operatoriaus tapatybę/rekvizitus, domeno kontrolę ir kas apdoros užklausas. Šios nišos pavadinimo/pašto patvirtinimas šių faktų nepakeičia.
2. Parinkti tinkamą komercinį hostingą, saugiai pririšti tikrą D1, SMTP sekretus, DNS/HTTPS ir per-domain matavimą. Pradinis tinklas neįjungia voice ar mokamų paslaugų.
3. Nustatyti tikrą duomenų tvarkymo pagrindą, gavėjus/duomenų tvarkytojus, perdavimų apimtį, saugojimo terminą ir veikiantį deletion/recovery kelią; per studiją perpatvirtinti privatumo tekstą.
4. Užbaigti rate/abuse, operatoriaus prieigos, backup/restore ir nepavykusių notification recovery/reconciliation procedūras. D1 nepriklausomas nuo voice, tačiau vien saugojimo nepakanka patikimai operacijai.
5. Patikrinti 200% zoom/padidintą tekstą tikroje tai palaikančioje naršyklėje; prieš startą perpatvirtinti faktinę pirmos publikacijos datą.
6. Tikrame domene atlikti crawl, source/footer destination ir SMTP→matching INBOX self-test; Google Rich Results/URL Inspection, GSC ir vėlesnės field CWV/paklausos imtys lieka atskiri įrodymai.

## A–Z kriterijai

`[x]` tik įrodytas PASS; `[ ]` nepraėjęs/neįrodytas/NA su aiškia būsena. NA turi scope priežastį ir neįskaitomas į balą.

### A

- [x] **A1 · PASS · local gate** — Phase 1 is explicit; inquiry is not an order, reservation or proven demand.

  Informacinis poreikio pilotas. Forma nėra pirkimas ar tinkamumo patvirtinimas; nėra kainų, atsargų, katalogo ar tiekimo pažado.

  Įrodymai: [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json), [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json).

- [x] **A2 · PASS · local gate** — The primary action and visible offer are genuinely available; no fake commerce, stock or supplier claim.

  Informacinis poreikio pilotas. Forma nėra pirkimas ar tinkamumo patvirtinimas; nėra kainų, atsargų, katalogo ar tiekimo pažado.

  Įrodymai: [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json), [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json).

- [ ] **A3 · UNVERIFIED · operations gate** — Expansion decision uses qualified real inquiries/value/capacity, not clicks or test records.

  Tikras domenas nepaleistas; organinio srauto, kvalifikuotų klientų užklausų ir jų vertės duomenų nėra. Balsas išjungtas.

  Įrodymai: [traktoriupadangos.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos.md).

### B

- [x] **B1 · PASS · local gate** — Operator/contact defaults and site exceptions agree across package, visible copy, schema and form recipient.

  MB Pinet / info@pinet.lt sutampa pakete, HTML, Organization ir bendro gavėjo konfigūracijoje. Traktorių nišai telefono, adreso, juridinio kodo ar eksperto biografijos nepriskirta.

  Įrodymai: [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json), [niche-network.json](C:/Users/lenovo/Documents/dovanos-memorycasting/config/niche-network.json), [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [MAIL_CORE.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/MAIL_CORE.md).

- [x] **B2 · PASS · local gate** — No borrowed phones, addresses, identities, credentials, reviews or certifications.

  MB Pinet / info@pinet.lt sutampa pakete, HTML, Organization ir bendro gavėjo konfigūracijoje. Traktorių nišai telefono, adreso, juridinio kodo ar eksperto biografijos nepriskirta.

  Įrodymai: [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json), [niche-network.json](C:/Users/lenovo/Documents/dovanos-memorycasting/config/niche-network.json), [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [MAIL_CORE.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/MAIL_CORE.md).

- [ ] **B3 · UNVERIFIED · launch gate** — Actual operator identity, applicable legal identifiers/address and domain control are established.

  Savininkas patvirtino pavadinimą ir paštą, bet šios nišos tikslūs juridiniai rekvizitai, registracijos/DNS valdymas ir atsakingas užklausų apdorojimas nepatvirtinti.

  Įrodymai: [MAIL_CORE.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/MAIL_CORE.md).

### C

- [x] **C1 · PASS · local gate** — Bounded history evidence, retrieval limits and unavailable periods are recorded.

  300 URL ribotas CDX mėginys, 4 HTML mėginiai, 3 skaitomi. Naujausias 2026 mėginys neįvertinamas; nepriskirta neegzistuojanti švari istorija.

  Įrodymai: [ASSESSMENT.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/history/ASSESSMENT.md), [audit.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/history/audit.json).

- [x] **C2 · PASS · local gate** — Reviewed URL decisions distinguish same-intent restore/redirect from defer/404; no mass homepage redirects.

  10 peržiūrėtų sprendimų: dabartinis root paliekamas, katalogas ir neištirti seni ketinimai atidedami, nereikšmingi keliai neatkuriami; automatinio homepage redirect nėra.

  Įrodymai: [url-decisions.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/history/url-decisions.json), [ASSESSMENT.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/history/ASSESSMENT.md).

- [ ] **C3 · NA · launch** — Any implemented legacy redirect has a current same-host approved 200 target, no loop and a tested status.

  Individualių istorinių 301 šiame pilote neįgyvendinta. Bendras /gidai/ → /gidai normalizavimas tikrintas O1; atidėtos istorijos hipotezės nėra veikiantys redirects.

  Įrodymai: [url-decisions.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/history/url-decisions.json), [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json).

### D

- [x] **D1 · PASS · local** — Local/international comparisons and real desktop/mobile evidence support the chosen journey.

  Vietinių kategorijų tyrimas ir tarptautinių analogų atranka; Agrar-Reifen ir All Terrain realūs desktop/mobile vaizdai. Kitų šaltinių prieigos ribojimai aiškiai įvardyti.

  Įrodymai: [traktoriupadangos-research.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos-research.md), [agrar-desktop.png](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-research/agrar-desktop.png), [allterrain-mobile.png](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-research/allterrain-mobile.png).

- [x] **D2 · PASS · local gate** — Current facts and permissions support original copy/assets; old or competitor claims are not our facts.

  Originalus tekstas ir penkios originalios ImageGen kompozicijos. PNG kilmė, teisių/alt/matmenų/SHA-256 įrašai ir prompt arba aiškiai pažymėti dizaino briefai išsaugoti. 3 naujų vaizdų briefai nelaikomi pažodiniu generavimo promptu. Nepageidaujami generatoriaus ženkleliai pašalinti; redakcinė metodika atvira. Diagramą sudaro patvirtintas Michelin paaiškinimas, ne generuota techninė geometrija.

  Įrodymai: [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json), [DESIGN.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/DESIGN.md), [MEDIA-2026-09-30.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/MEDIA-2026-09-30.json), [media-prompts-2026-09-30.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/media-prompts-2026-09-30.json).

- [x] **D3 · PASS · local** — Search intents and niche advantages are hypotheses where no search/conversion data exists.

  URL turi skirtingus klausimus; sezonas, išskirtinumas ir paklausa laikomi hipotezėmis. Nėra miestų/sinonimų doorway puslapių.

  Įrodymai: [traktoriupadangos.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos.md), [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json).

### E

- [x] **E1 · PASS · local** — Full homepage and guide have a coherent niche-specific identity, rhythm and meaningful imagery.

  Sava įrangos ekspozicijos kryptis, tipiška šios nišos padangos medžiaga, žymėjimo raktas ir praktinis ruošinys. Peržiūrėtas homepage, trys gidai, jų vidurys/pabaiga. Vizualinis sprendimas agento; ankstesnis 25/40 baseline nepriklausomai iš naujo neįvertintas.

  Įrodymai: [DESIGN.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/DESIGN.md), [tractor-browser-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-browser-local.json), [tractor-images-home-desktop.jpg](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-images-home-desktop.jpg), [tractor-images-guide-1-desktop.jpg](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-images-guide-1-desktop.jpg).

- [x] **E2 · PASS · local** — DESIGN describes actual tokens, composition and compromises; technical scores are separate from visual judgment.

  Sava įrangos ekspozicijos kryptis, tipiška šios nišos padangos medžiaga, žymėjimo raktas ir praktinis ruošinys. Peržiūrėtas homepage, trys gidai, jų vidurys/pabaiga. Vizualinis sprendimas agento; ankstesnis 25/40 baseline nepriklausomai iš naujo neįvertintas.

  Įrodymai: [DESIGN.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/DESIGN.md), [tractor-browser-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-browser-local.json), [tractor-images-home-desktop.jpg](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-images-home-desktop.jpg), [tractor-images-guide-1-desktop.jpg](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-images-guide-1-desktop.jpg).

- [x] **E3 · PASS · local gate** — Image origin/rights are documented and presentation is truthful; no imaginary stock, client project, distorted teaching diagram or unwanted generator badge.

  Originalus tekstas ir penkios originalios ImageGen kompozicijos. PNG kilmė, teisių/alt/matmenų/SHA-256 įrašai ir prompt arba aiškiai pažymėti dizaino briefai išsaugoti. 3 naujų vaizdų briefai nelaikomi pažodiniu generavimo promptu. Nepageidaujami generatoriaus ženkleliai pašalinti; redakcinė metodika atvira. Diagramą sudaro patvirtintas Michelin paaiškinimas, ne generuota techninė geometrija.

  Įrodymai: [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json), [DESIGN.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/DESIGN.md), [MEDIA-2026-09-30.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/MEDIA-2026-09-30.json), [media-prompts-2026-09-30.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/media-prompts-2026-09-30.json).

### F

- [x] **F1 · PASS · local gate** — All public pages are reachable through useful navigation/context; no orphan initial guide.

  Visi 11 URL pasiekiami iš header, footer, indekso ar prasmingo konteksto. HTTP puslapių ir variantų patikrų, 0 radinių: vietinės nuorodos ir fragmentai turi tikrus tikslus; mobilus meniu ir vietinis CTA išbandyti.

  Įrodymai: [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [tractor-browser-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-browser-local.json).

- [x] **F2 · PASS · local gate** — Desktop/mobile header, index, footer and local inquiry actions work with actual destinations.

  Visi 11 URL pasiekiami iš header, footer, indekso ar prasmingo konteksto. HTTP puslapių ir variantų patikrų, 0 radinių: vietinės nuorodos ir fragmentai turi tikrus tikslus; mobilus meniu ir vietinis CTA išbandyti.

  Įrodymai: [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [tractor-browser-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-browser-local.json).

- [x] **F3 · PASS · local** — Each URL has a distinct job; no doorway city/synonym variants, duplicate intent or pointless index.

  URL turi skirtingus klausimus; sezonas, išskirtinumas ir paklausa laikomi hipotezėmis. Nėra miestų/sinonimų doorway puslapių.

  Įrodymai: [traktoriupadangos.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos.md), [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json).

### G

- [x] **G1 · PASS · local gate** — First screen identifies the topic, useful offer and honest next action.

  Sava įrangos ekspozicijos kryptis, tipiška šios nišos padangos medžiaga, žymėjimo raktas ir praktinis ruošinys. Peržiūrėtas homepage, trys gidai, jų vidurys/pabaiga. Vizualinis sprendimas agento; ankstesnis 25/40 baseline nepriklausomai iš naujo neįvertintas.

  Įrodymai: [DESIGN.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/DESIGN.md), [tractor-browser-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-browser-local.json), [tractor-images-home-desktop.jpg](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-images-home-desktop.jpg), [tractor-images-guide-1-desktop.jpg](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-images-guide-1-desktop.jpg).

- [x] **G2 · PASS · local** — Middle/end answer new questions rather than repeating promotions or decorative cards.

  Sava įrangos ekspozicijos kryptis, tipiška šios nišos padangos medžiaga, žymėjimo raktas ir praktinis ruošinys. Peržiūrėtas homepage, trys gidai, jų vidurys/pabaiga. Vizualinis sprendimas agento; ankstesnis 25/40 baseline nepriklausomai iš naujo neįvertintas.

  Įrodymai: [DESIGN.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/DESIGN.md), [tractor-browser-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-browser-local.json), [tractor-images-home-desktop.jpg](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-images-home-desktop.jpg), [tractor-images-guide-1-desktop.jpg](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-images-guide-1-desktop.jpg).

- [x] **G3 · PASS · local gate** — Primary/secondary actions, privacy route, empty/error/success states have real behavior.

  Native tuščios formos validacija fokusuoja vardą. HTTP 400/403, honeypot 200, nežinomas host 404, sėkmė 200 su sąžininga vietine žinute ir D1 įrašu; forma neprenumeruoja marketingo.

  Įrodymai: [tractor-browser-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-browser-local.json), [tractor-form-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-form-local.json).

### H

- [x] **H1 · PASS · local gate** — At least three distinct prepared guides are individually read and useful for the site's intent; no word-count substitute.

  Kiekvienas iš 3 gidų perskaitytas atskirai: duomenų rinkimas ir palyginimas; žymėjimo skaitymas ir ruošinys; konstrukcija/PR ir pasirinkimo ribos. Michelin, Trelleborg ir Bridgestone pirminiai šaltiniai. Nėra universalaus slėgio, suderinamumo ar procentinės naudos pažadų. 470/426/415 article žodžių tik inventoriaus skaičius, ne kokybės įrodymas.

  Įrodymai: [complete-tractor-editorial.mjs](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/content-studio/scripts/complete-tractor-editorial.mjs), [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json), [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [tractor-browser-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-browser-local.json).

- [x] **H2 · PASS · local gate** — Claims, terminology, examples, limitations and sources are checked; unsafe universal technical advice is absent.

  Kiekvienas iš 3 gidų perskaitytas atskirai: duomenų rinkimas ir palyginimas; žymėjimo skaitymas ir ruošinys; konstrukcija/PR ir pasirinkimo ribos. Michelin, Trelleborg ir Bridgestone pirminiai šaltiniai. Nėra universalaus slėgio, suderinamumo ar procentinės naudos pažadų. 470/426/415 article žodžių tik inventoriaus skaičius, ne kokybės įrodymas.

  Įrodymai: [complete-tractor-editorial.mjs](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/content-studio/scripts/complete-tractor-editorial.mjs), [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json), [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [tractor-browser-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-browser-local.json).

- [x] **H3 · PASS · local** — Each guide gives a usable explanation/example/checklist, readable structure and next step without filler.

  Kiekvienas iš 3 gidų perskaitytas atskirai: duomenų rinkimas ir palyginimas; žymėjimo skaitymas ir ruošinys; konstrukcija/PR ir pasirinkimo ribos. Michelin, Trelleborg ir Bridgestone pirminiai šaltiniai. Nėra universalaus slėgio, suderinamumo ar procentinės naudos pažadų. 470/426/415 article žodžių tik inventoriaus skaičius, ne kokybės įrodymas.

  Įrodymai: [complete-tractor-editorial.mjs](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/content-studio/scripts/complete-tractor-editorial.mjs), [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json), [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [tractor-browser-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-browser-local.json).

- [x] **H4 · PASS · local gate** — Long article, lists, figures and source sections are actually rendered and mobile-tested, not silently discarded.

  Visi gidų heading/list/source blokai patikrinti realiame HTML ir mobile/desktop; žymėjimo figure, selectable ruošinys ir kiekvieno gido teminis vaizdas matomi. Antraštė/vaizdas desktop yra dviejose kolonose, mobile persirikiuoja.

  Įrodymai: [tractor-browser-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-browser-local.json), [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [tractor-site.tsx](C:/Users/lenovo/Documents/dovanos-memorycasting/components/niche/tractor-site.tsx).

- [x] **H5 · PASS · local gate** — Each initial guide has an inspected topic-specific image; homepage/index and other pages have purposeful visual coverage, actual files and responsive crops, or a documented text-focused reason where imagery adds no value.

  Homepage 5 vaizdai, indeksas 3 teisingos miniatiūros, kiekvienas iš 3 gidų po teminį vaizdą. Šeši FAQ/kontaktų/redakciniai/teisiniai puslapiai turi dokumentuotą teksto išimtį. Realūs variantų HTTP/srcset/Article image ir desktop/mobile pikseliai patikrinti; originalų kilmė bei ribos išsaugotos. Naujas bendras importas patikrintas HTTP/GUI: vienas PNG → penki WebP → vienas puslapio pasirinkimas; privatumas, alpha/EXIF/no-upscale ir 60 ribos ir penkių šeimų eksporto regresijos.

  Įrodymai: [MEDIA-2026-09-30.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/MEDIA-2026-09-30.json), [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [tractor-browser-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-browser-local.json), [tractor-index-final.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-index-final.json), [MEDIA_CORE.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/MEDIA_CORE.md), [MEDIA-PIPELINE-VERIFICATION.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/MEDIA-PIPELINE-VERIFICATION.json).

### I

- [x] **I1 · PASS · local gate** — Visible attribution identifies a real Person or Organization with a public profile or clear identity.

  Matomas tikras organizacijos vardas MB Pinet ir /redakcija profilis; ProfilePage mainEntity ir Article author/publisher rodo tą pačią Organization. Atvirai aprašyta AI, šaltinių ir agento peržiūros rolė, ribos ir taisymo kontaktas; nevaidintas padangų ekspertas ar žmogaus patvirtinimas.

  Įrodymai: [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json), [niche-schema-core.mjs](C:/Users/lenovo/Documents/dovanos-memorycasting/lib/niche-schema-core.mjs).

- [x] **I2 · PASS · local gate** — Author/profile/schema identity agrees; no fictional expert or unverified experience.

  Matomas tikras organizacijos vardas MB Pinet ir /redakcija profilis; ProfilePage mainEntity ir Article author/publisher rodo tą pačią Organization. Atvirai aprašyta AI, šaltinių ir agento peržiūros rolė, ribos ir taisymo kontaktas; nevaidintas padangų ekspertas ar žmogaus patvirtinimas.

  Įrodymai: [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json), [niche-schema-core.mjs](C:/Users/lenovo/Documents/dovanos-memorycasting/lib/niche-schema-core.mjs).

- [x] **I3 · PASS · local gate** — Visible publication/review dates and structured dates have the same meaning; dates are not refreshed per request.

  Publikavimo ir peržiūros time datetime sutampa su Article published/modified. modified = max(publishAt, konkretaus patvirtinimo approvedAt), nėra per-request datos. Kol svetainė vietinė, pirmasis laikas yra paruošto paketo data, ne buvusio viešo paleidimo įrodymas.

  Įrodymai: [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [niche-schema-core.mjs](C:/Users/lenovo/Documents/dovanos-memorycasting/lib/niche-schema-core.mjs), [article-meta.tsx](C:/Users/lenovo/Documents/dovanos-memorycasting/components/niche/article-meta.tsx).

- [ ] **I4 · UNVERIFIED · launch gate** — Initial production publication/deployment date is documented; planned dates are not evidence of past public availability.

  Tikro pirmo deployment/publikavimo datos dar nėra. Prieš pirmą domeno paleidimą pradinė publikavimo data turi būti peržiūrėta per studiją ir perpatvirtintą paketą.

  Įrodymai: [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json).

### J

- [x] **J1 · PASS · local gate** — About/editorial information explains purpose, AI role, source method, limitations and corrections contact.

  Matomas tikras organizacijos vardas MB Pinet ir /redakcija profilis; ProfilePage mainEntity ir Article author/publisher rodo tą pačią Organization. Atvirai aprašyta AI, šaltinių ir agento peržiūros rolė, ribos ir taisymo kontaktas; nevaidintas padangų ekspertas ar žmogaus patvirtinimas.

  Įrodymai: [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json), [niche-schema-core.mjs](C:/Users/lenovo/Documents/dovanos-memorycasting/lib/niche-schema-core.mjs).

- [x] **J2 · PASS · local** — Review is attributed honestly to the agent/process; no claim of human/qualified approval without it.

  Matomas tikras organizacijos vardas MB Pinet ir /redakcija profilis; ProfilePage mainEntity ir Article author/publisher rodo tą pačią Organization. Atvirai aprašyta AI, šaltinių ir agento peržiūros rolė, ribos ir taisymo kontaktas; nevaidintas padangų ekspertas ar žmogaus patvirtinimas.

  Įrodymai: [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json), [niche-schema-core.mjs](C:/Users/lenovo/Documents/dovanos-memorycasting/lib/niche-schema-core.mjs).

- [x] **J3 · PASS · local gate** — Factual corrections propagate through studio approval and public/LLM projections; review evidence is retained.

  Pataisos atliktos per studijos editPage/approvePage/export ir import/compile; revisionHash neklastotas. Patvirtinta nekintama versija izoliuota nuo naujo juodraščio; 14 studijos ir 19 core testų praėjo. Išliko 3 kitų nišų paketai.

  Įrodymai: [complete-tractor-editorial.mjs](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/content-studio/scripts/complete-tractor-editorial.mjs), [studio-tests.log](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/studio-tests.log), [tractor-audit-core-tests.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-core-tests.log), [content-packages.json](C:/Users/lenovo/Documents/dovanos-memorycasting/lib/generated/content-packages.json).

### K

- [x] **K1 · PASS · local gate** — Every public URL has one useful H1, title, description, correct language and canonical.

  11 tikrų puslapių: vienas H1, savas title/description, lt kalba, canonical; heading seka, informatyvus vaizdų alt, OG/Twitter metadata ir realus teminis vaizdas. Dekoratyvios miniatiūros šalia pilno tekstinio link pavadinimo turi tuščią alt, kad screen reader nekartotų turinio.

  Įrodymai: [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [page.tsx](C:/Users/lenovo/Documents/dovanos-memorycasting/app/niche/[siteId]/[[...slug]]/page.tsx).

- [x] **K2 · PASS · local** — Heading order, informative alt, sharing metadata and social image (when used) match actual content.

  11 tikrų puslapių: vienas H1, savas title/description, lt kalba, canonical; heading seka, informatyvus vaizdų alt, OG/Twitter metadata ir realus teminis vaizdas. Dekoratyvios miniatiūros šalia pilno tekstinio link pavadinimo turi tuščią alt, kad screen reader nekartotų turinio.

  Įrodymai: [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [page.tsx](C:/Users/lenovo/Documents/dovanos-memorycasting/app/niche/[siteId]/[[...slug]]/page.tsx).

- [x] **K3 · PASS · local gate** — Unknown/future/private URLs return proper 404/noindex and do not canonicalize to the homepage.

  Realus nežinomas URL ir vidinis /niche/ adresas grąžina 404 be homepage canonical; būsimų/privatų tikslų neatskleidimas tikrintas core ir SEO smoke.

  Įrodymai: [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [tractor-audit-seo-traktoriupadangos.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-seo-traktoriupadangos.log), [tractor-audit-core-tests.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-core-tests.log).

### L

- [x] **L1 · PASS · local gate** — JSON-LD parses and uses truthful appropriate WebSite/WebPage/Organization/Article entities and stable IDs.

  JSON-LD iš realaus public projection: Organization/WebSite/WebPage, AboutPage, ContactPage, ProfilePage, 3 Article ir BreadcrumbList. Matomas 3 žingsnių gido kelias sutampa su schema. Product/Offer/reitingų/LocalBusiness imitacijų nėra.

  Įrodymai: [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [niche-schema-core.mjs](C:/Users/lenovo/Documents/dovanos-memorycasting/lib/niche-schema-core.mjs), [tractor-audit-core-tests.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-core-tests.log).

- [x] **L2 · PASS · local gate** — Visible breadcrumb and schema path/name/URL agree; profile and author relations point to eligible public pages.

  JSON-LD iš realaus public projection: Organization/WebSite/WebPage, AboutPage, ContactPage, ProfilePage, 3 Article ir BreadcrumbList. Matomas 3 žingsnių gido kelias sutampa su schema. Product/Offer/reitingų/LocalBusiness imitacijų nėra.

  Įrodymai: [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [niche-schema-core.mjs](C:/Users/lenovo/Documents/dovanos-memorycasting/lib/niche-schema-core.mjs), [tractor-audit-core-tests.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-core-tests.log).

- [x] **L3 · PASS · local gate** — No invented Offer/Product/Review/AggregateRating/LocalBusiness or unsupported rich-result promise.

  JSON-LD iš realaus public projection: Organization/WebSite/WebPage, AboutPage, ContactPage, ProfilePage, 3 Article ir BreadcrumbList. Matomas 3 žingsnių gido kelias sutampa su schema. Product/Offer/reitingų/LocalBusiness imitacijų nėra.

  Įrodymai: [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [niche-schema-core.mjs](C:/Users/lenovo/Documents/dovanos-memorycasting/lib/niche-schema-core.mjs), [tractor-audit-core-tests.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-core-tests.log).

- [ ] **L4 · UNVERIFIED · launch** — Official rich-result/URL Inspection findings are recorded after actual crawlable deployment; local checks are labelled local.

  Google Rich Results / URL Inspection gyvo domeno rezultato nėra. Vietinis JSON parsing ir semantinis auditas nėra šių Google patikrų pakaitalas.

  Įrodymai: [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json).

### M

- [x] **M1 · PASS · local gate** — Contextual links use real same-site target IDs and informative anchors; fragments exist.

  Visi 11 URL pasiekiami iš header, footer, indekso ar prasmingo konteksto. HTTP puslapių ir variantų patikrų, 0 radinių: vietinės nuorodos ir fragmentai turi tikrus tikslus; mobilus meniu ir vietinis CTA išbandyti.

  Įrodymai: [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [tractor-browser-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-browser-local.json).

- [x] **M2 · PASS · local gate** — Future/unapproved/revoked targets disappear consistently from prose, related sections, indexes and schema.

  Vienas dueRevision/publicNichePages/projection valdo HTML, links, schema, sitemap ir LLM. Testai apima laiką, hash, revocation, host, neegzistuojantį ID ir kito domeno deployment. networkLiveDomains tuščias, todėl tarp-nišų redakcinių nuorodų nėra. Draft GUI klauso tik 127.0.0.1, turi noindex/no-store ir nėra viešame pakete.

  Įrodymai: [niche-links.mjs](C:/Users/lenovo/Documents/dovanos-memorycasting/lib/niche-links.mjs), [tractor-audit-core-tests.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-core-tests.log), [studio-tests.log](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/studio-tests.log), [niche-network.json](C:/Users/lenovo/Documents/dovanos-memorycasting/config/niche-network.json), [server.mjs](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/content-studio/src/server.mjs).

- [x] **M3 · PASS · local** — Cluster/pillar/related routes help distinct questions; repetition/all-to-all links are not treated as authority.

  Pasirinkimo ramstis nukreipia į žymėjimą ir konstrukciją, abu padeda pasiruošti kitam klausimui; /gidai indeksas ir susiję atsakymai veikia. Trust puslapių susiję keliai atskirai parinkti. Nėra all-to-all autoriteto kvotos.

  Įrodymai: [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json), [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [tractor-browser-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-browser-local.json).

### N

- [x] **N1 · PASS · local gate** — Sources have relevant primary evidence, actual target checks and retrieval dates; no partner implication.

  Matomos contextual HTTPS nuorodos ir šaltinių paneliai pagrindžia konkrečius teiginius. Šaltinių reason turi 2026-09-30 patikrą; pirminiai puslapiai atverti tyrime ir šio audito metu. Šiame turinyje nėra sponsored, UGC ar affiliate nuorodų, todėl tokio rel nepriskirta.

  Įrodymai: [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json), [tractor-browser-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-browser-local.json), [SOURCE-REVIEW-2026-09-30.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/SOURCE-REVIEW-2026-09-30.md).

- [x] **N2 · PASS · local gate** — Owned editorial links obey target ID, host, approval/date/deployment eligibility and disclosed relevant reason.

  Vienas dueRevision/publicNichePages/projection valdo HTML, links, schema, sitemap ir LLM. Testai apima laiką, hash, revocation, host, neegzistuojantį ID ir kito domeno deployment. networkLiveDomains tuščias, todėl tarp-nišų redakcinių nuorodų nėra. Draft GUI klauso tik 127.0.0.1, turi noindex/no-store ir nėra viešame pakete.

  Įrodymai: [niche-links.mjs](C:/Users/lenovo/Documents/dovanos-memorycasting/lib/niche-links.mjs), [tractor-audit-core-tests.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-core-tests.log), [studio-tests.log](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/studio-tests.log), [niche-network.json](C:/Users/lenovo/Documents/dovanos-memorycasting/config/niche-network.json), [server.mjs](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/content-studio/src/server.mjs).

- [x] **N3 · PASS · local gate** — Prose links and source/related panels render correctly; sponsored/UGC relation is applied only if applicable.

  Matomos contextual HTTPS nuorodos ir šaltinių paneliai pagrindžia konkrečius teiginius. Šaltinių reason turi 2026-09-30 patikrą; pirminiai puslapiai atverti tyrime ir šio audito metu. Šiame turinyje nėra sponsored, UGC ar affiliate nuorodų, todėl tokio rel nepriskirta.

  Įrodymai: [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json), [tractor-browser-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-browser-local.json), [SOURCE-REVIEW-2026-09-30.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/SOURCE-REVIEW-2026-09-30.md).

- [ ] **N4 · UNVERIFIED · launch** — Brand/attribution and other external destinations work on the live launch; pending network domains stay unpublished.

  Live paleidimo metu dar reikia patikrinti footer verslomatika.lt ir kitas išorines paskirties vietas. Footer savininko žyma nėra patvirtinta redakcinė tinklo nuoroda ar šio straipsnio autoriteto įrodymas.

  Įrodymai: [NETWORK_LINKING.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/NETWORK_LINKING.md), [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json).

### O

- [x] **O1 · PASS · local gate** — Canonical host/path, sitemap, robots, redirects and slash/query behavior are coherent and actually tested.

  Canonical host/path nuoseklus: /gidai/ 308→/gidai, query 200 su /gidai canonical. sitemap tik 11 eligible URL, stabilus meaningful lastmod, robots canonical sitemap. Viešas ir vietinis preview režimas skirti; draft apsaugą užtikrina projection/host, ne robots.

  Įrodymai: [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [SEO_GEO_CORE.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/SEO_GEO_CORE.md).

- [x] **O2 · PASS · local gate** — Sitemap contains only eligible URLs and meaningful lastmod; robots does not substitute for private access control.

  Canonical host/path nuoseklus: /gidai/ 308→/gidai, query 200 su /gidai canonical. sitemap tik 11 eligible URL, stabilus meaningful lastmod, robots canonical sitemap. Viešas ir vietinis preview režimas skirti; draft apsaugą užtikrina projection/host, ne robots.

  Įrodymai: [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [SEO_GEO_CORE.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/SEO_GEO_CORE.md).

- [ ] **O3 · UNVERIFIED · launch gate** — DNS, TLS, real host, indexing directives and domain isolation work on production.

  Tikro DNS/TLS/CDN ir domeno per-nišos deployment patikros nėra. Local canonical Host proxy nepaverčia localhost viešu domenu.

  Įrodymai: [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json).

### P

- [x] **P1 · PASS · local gate** — Same authoritative projection controls HTML, links, media, schema, sitemap and LLM output.

  Vienas dueRevision/publicNichePages/projection valdo HTML, links, schema, sitemap ir LLM. Testai apima laiką, hash, revocation, host, neegzistuojantį ID ir kito domeno deployment. networkLiveDomains tuščias, todėl tarp-nišų redakcinių nuorodų nėra. Draft GUI klauso tik 127.0.0.1, turi noindex/no-store ir nėra viešame pakete.

  Įrodymai: [niche-links.mjs](C:/Users/lenovo/Documents/dovanos-memorycasting/lib/niche-links.mjs), [tractor-audit-core-tests.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-core-tests.log), [studio-tests.log](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/studio-tests.log), [niche-network.json](C:/Users/lenovo/Documents/dovanos-memorycasting/config/niche-network.json), [server.mjs](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/content-studio/src/server.mjs).

- [x] **P2 · PASS · local gate** — Hash/date/revocation/cross-host negative tests pass; draft preview is private and not indexed.

  Vienas dueRevision/publicNichePages/projection valdo HTML, links, schema, sitemap ir LLM. Testai apima laiką, hash, revocation, host, neegzistuojantį ID ir kito domeno deployment. networkLiveDomains tuščias, todėl tarp-nišų redakcinių nuorodų nėra. Draft GUI klauso tik 127.0.0.1, turi noindex/no-store ir nėra viešame pakete.

  Įrodymai: [niche-links.mjs](C:/Users/lenovo/Documents/dovanos-memorycasting/lib/niche-links.mjs), [tractor-audit-core-tests.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-core-tests.log), [studio-tests.log](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/studio-tests.log), [niche-network.json](C:/Users/lenovo/Documents/dovanos-memorycasting/config/niche-network.json), [server.mjs](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/content-studio/src/server.mjs).

- [x] **P3 · PASS · local gate** — Studio approval, import validation and compile preserve unrelated packages and reject changed approved content.

  Pataisos atliktos per studijos editPage/approvePage/export ir import/compile; revisionHash neklastotas. Patvirtinta nekintama versija izoliuota nuo naujo juodraščio; 14 studijos ir 19 core testų praėjo. Išliko 3 kitų nišų paketai.

  Įrodymai: [complete-tractor-editorial.mjs](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/content-studio/scripts/complete-tractor-editorial.mjs), [studio-tests.log](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/studio-tests.log), [tractor-audit-core-tests.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-core-tests.log), [content-packages.json](C:/Users/lenovo/Documents/dovanos-memorycasting/lib/generated/content-packages.json).

### Q

- [x] **Q1 · PASS · local gate** — Public LLM exports match the active niche's useful facts, URLs, contacts and visible publication scope.

  llms.txt/full iš to paties viešo domeno projekcijos turi tikrus URL, MB Pinet, info@pinet.lt, tekstą ir patikrintų šaltinių URL. Atsakymai su ribomis prieinami semantiniame serverio HTML; nėra paslėptų tik modeliui skirtų teiginių. LLM indeksas papildomas, ne AI reitingo garantija.

  Įrodymai: [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [SEO_GEO_CORE.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/SEO_GEO_CORE.md), [niche-seo.ts](C:/Users/lenovo/Documents/dovanos-memorycasting/lib/niche-seo.ts).

- [x] **Q2 · PASS · local gate** — Definitions, qualified answers and primary citations are accessible in semantic HTML; no hidden model-only claims.

  llms.txt/full iš to paties viešo domeno projekcijos turi tikrus URL, MB Pinet, info@pinet.lt, tekstą ir patikrintų šaltinių URL. Atsakymai su ribomis prieinami semantiniame serverio HTML; nėra paslėptų tik modeliui skirtų teiginių. LLM indeksas papildomas, ne AI reitingo garantija.

  Įrodymai: [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [SEO_GEO_CORE.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/SEO_GEO_CORE.md), [niche-seo.ts](C:/Users/lenovo/Documents/dovanos-memorycasting/lib/niche-seo.ts).

- [x] **Q3 · PASS · local** — llms.txt/AI visibility are supplementary; no special schema, traffic or ranking guarantee is asserted.

  llms.txt/full iš to paties viešo domeno projekcijos turi tikrus URL, MB Pinet, info@pinet.lt, tekstą ir patikrintų šaltinių URL. Atsakymai su ribomis prieinami semantiniame serverio HTML; nėra paslėptų tik modeliui skirtų teiginių. LLM indeksas papildomas, ne AI reitingo garantija.

  Įrodymai: [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [SEO_GEO_CORE.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/SEO_GEO_CORE.md), [niche-seo.ts](C:/Users/lenovo/Documents/dovanos-memorycasting/lib/niche-seo.ts).

### R

- [x] **R1 · PASS · local gate** — Keyboard, focus, skip link, labels, landmarks and details/menu interactions are exercised.

  Native menu/details/ToC, vietinio fragmento action, tuščios formos focus ir reikalavimai išbandyti; skip-link fokusas patikrintas ankstesniu to paties UI build bandymu. 3px focus, labels, landmarks, alt ir reduced-motion CSS yra; LH a11y 100. Naujas body.press bandymas įrankyje timeout, tai ne patvirtintas svetainės keyboard gedimas.

  Įrodymai: [tractor-browser-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-browser-local.json), [tractor-images-mobile.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/lighthouse/tractor-images-mobile.json), [tractor-site.module.css](C:/Users/lenovo/Documents/dovanos-memorycasting/components/niche/tractor-site.module.css).

- [ ] **R2 · UNVERIFIED · local gate** — Contrast, zoom/reflow, readable utility text and touch targets are checked; score alone is not WCAG conformance.

  320/390/768/1440 reflow, 14px byline/ToC, 44px reading actions, kontrasto poros ir formos/footer siauras maketas patikrinti. Tikras 200% browser zoom bei padidinto teksto elgesys lieka neįrodytas: IAB shortcut nedavė įrodymo, native Chrome bandymas nepatvirtino audito lango/didinimo procento ir buvo sustabdytas savininko fiziniu Esc. Po stop programų įvestis nebetęsta; atkūrimas ir galutinė zoom reikšmė nežinomi. Nežymima PASS dėl 100 Lighthouse.

  Įrodymai: [tractor-browser-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-browser-local.json), [CONTRAST-2026-09-30.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/CONTRAST-2026-09-30.json), [ACCESSIBILITY-VERIFICATION.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/ACCESSIBILITY-VERIFICATION.json).

- [x] **R3 · PASS · local gate** — Images, headings, disclosure state, form requirements/errors and reduced-motion behavior remain usable.

  Native menu/details/ToC, vietinio fragmento action, tuščios formos focus ir reikalavimai išbandyti; skip-link fokusas patikrintas ankstesniu to paties UI build bandymu. 3px focus, labels, landmarks, alt ir reduced-motion CSS yra; LH a11y 100. Naujas body.press bandymas įrankyje timeout, tai ne patvirtintas svetainės keyboard gedimas.

  Įrodymai: [tractor-browser-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-browser-local.json), [tractor-images-mobile.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/lighthouse/tractor-images-mobile.json), [tractor-site.module.css](C:/Users/lenovo/Documents/dovanos-memorycasting/components/niche/tractor-site.module.css).

### S

- [x] **S1 · PASS · local gate** — Desktop, narrow/mobile and tablet evidence shows no overflow or hidden defects.

  1440 desktop, 768 tablet ir 390/320 viewport bandymai su realiomis iliustracijomis; 3 gidų desktop/mobile, 320 žymėjimo ir 4 trust puslapių mobile vaizdai. Horizontalaus overflow nepastebėta. Tai viewport testai, ne fizinių iOS/Android įrenginių patikra.

  Įrodymai: [tractor-browser-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-browser-local.json).

- [ ] **S2 · UNVERIFIED · local gate** — Article contents, byline, source lists, breadcrumb, form and footer work at narrow widths and enlarged text.

  320/390/768/1440 reflow, 14px byline/ToC, 44px reading actions, kontrasto poros ir formos/footer siauras maketas patikrinti. Tikras 200% browser zoom bei padidinto teksto elgesys lieka neįrodytas: IAB shortcut nedavė įrodymo, native Chrome bandymas nepatvirtino audito lango/didinimo procento ir buvo sustabdytas savininko fiziniu Esc. Po stop programų įvestis nebetęsta; atkūrimas ir galutinė zoom reikšmė nežinomi. Nežymima PASS dėl 100 Lighthouse.

  Įrodymai: [tractor-browser-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-browser-local.json), [CONTRAST-2026-09-30.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/CONTRAST-2026-09-30.json), [ACCESSIBILITY-VERIFICATION.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/ACCESSIBILITY-VERIFICATION.json).

- [x] **S3 · PASS · local** — Real viewport tests are distinguished from physical device and synthesized touch testing.

  1440 desktop, 768 tablet ir 390/320 viewport bandymai su realiomis iliustracijomis; 3 gidų desktop/mobile, 320 žymėjimo ir 4 trust puslapių mobile vaizdai. Horizontalaus overflow nepastebėta. Tai viewport testai, ne fizinių iOS/Android įrenginių patikra.

  Įrodymai: [tractor-browser-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-browser-local.json).

### T

- [x] **T1 · PASS · local gate** — Production mobile lab is measured with real media and saved version/date/environment; performance target >=90 is met or remains failed.

  Dabartinis LH 12.8.2 mobile production canonical-Host laboratorija su naujais vaizdais. Homepage {"performance":90,"accessibility":100,"best-practices":100,"seo":100}, gidas {"performance":91,"accessibility":100,"best-practices":100,"seo":100}. 6→4 font requests; naujas 800 px variantas sumažina mobilų failą. LCP home 3.4 s, guide 3.0 s; tai laboratorija, ne field CWV ar 100 garantija. Tikslas >=90 tikrinamas abiem pamatuotiems puslapiams.

  Įrodymai: [tractor-images-mobile.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/lighthouse/tractor-images-mobile.json), [tractor-images-guide-mobile.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/lighthouse/tractor-images-guide-mobile.json), [MEDIA-2026-09-30.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/MEDIA-2026-09-30.json), [DESIGN.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/DESIGN.md).

- [x] **T2 · PASS · local** — Measured LCP/CLS/TBT, image sizes, fonts, CSS and JS budgets have justified fixes; no dummy content score.

  Dabartinis LH 12.8.2 mobile production canonical-Host laboratorija su naujais vaizdais. Homepage {"performance":90,"accessibility":100,"best-practices":100,"seo":100}, gidas {"performance":91,"accessibility":100,"best-practices":100,"seo":100}. 6→4 font requests; naujas 800 px variantas sumažina mobilų failą. LCP home 3.4 s, guide 3.0 s; tai laboratorija, ne field CWV ar 100 garantija.

  Įrodymai: [tractor-images-mobile.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/lighthouse/tractor-images-mobile.json), [tractor-images-guide-mobile.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/lighthouse/tractor-images-guide-mobile.json), [MEDIA-2026-09-30.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/MEDIA-2026-09-30.json), [DESIGN.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/DESIGN.md).

- [ ] **T3 · UNVERIFIED · launch** — Production field CWV/traffic evidence is monitored separately; local Lighthouse is not field performance.

  CrUX / produkcinės lauko CWV imties dar nėra; vietinis Lighthouse nėra tokių duomenų pakaitalas.

  Įrodymai: [tractor-images-mobile.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/lighthouse/tractor-images-mobile.json).

### U

- [x] **U1 · PASS · local gate** — Native/server validation, origin, size limits and honest errors pass; durable D1 record survives mail/core failure.

  Dabartinis HTTP bandymas: vardas 400, origin 403, 10010 baitų fixed ir chunked 400, honeypot 200, unknown host 404, tinkama forma 200. Į D1 išliko vienas teisingo site/source/status įrašas su SMTP/voice išjungtais; pašalintas tik tas sintetinis ID. Retained limit 10 KB, unretained bounded drain 64 KB; virš jo ryšys gali būti nutrauktas, o ne garantuoti gražų klaidos HTML.

  Įrodymai: [tractor-form-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-form-local.json), [route.ts](C:/Users/lenovo/Documents/dovanos-memorycasting/app/niche/[siteId]/lead/route.ts), [tractor-audit-interest-tests.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-interest-tests.log).

- [x] **U2 · PASS · local gate** — Operator notification recipient and SMTP acceptance are tested without client messages or exposed secrets.

  Pakartotinai nesiųsta. 2026-09-30 09:51 UTC ankstesnis tos pačios gavėjo/transporto konfigūracijos marked self-test patvirtino SMTP acceptance ir matching Message-ID Hostinger INBOX atskirai. D1 testas išvalytas. Tai vietinis integravimo, ne dabartinio production delivery įrodymas.

  Įrodymai: [niche-form-verification.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/mail/niche-form-verification.json), [MAIL_CORE.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/MAIL_CORE.md).

- [x] **U3 · PASS · local gate** — Matching marked Message-ID INBOX evidence is distinct from SMTP authentication/acceptance; tests do not inflate demand.

  Pakartotinai nesiųsta. 2026-09-30 09:51 UTC ankstesnis tos pačios gavėjo/transporto konfigūracijos marked self-test patvirtino SMTP acceptance ir matching Message-ID Hostinger INBOX atskirai. D1 testas išvalytas. Tai vietinis integravimo, ne dabartinio production delivery įrodymas.

  Įrodymai: [niche-form-verification.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/mail/niche-form-verification.json), [MAIL_CORE.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/MAIL_CORE.md).

- [ ] **U4 · UNVERIFIED · launch gate** — Actual production D1/bindings, delivery, recovery/reconciliation and spam/rate controls are verified.

  Tikros produkcinės D1 ir sekretų/bindingų, pristatymo, pranešimų recovery/reconciliation ir rate/abuse kontrolės dar neįdiegtos/nepatikrintos. Honeypot/origin/payload ribos nepakeičia production rate limiting.

  Įrodymai: [MAIL_CORE.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/MAIL_CORE.md), [route.ts](C:/Users/lenovo/Documents/dovanos-memorycasting/app/niche/[siteId]/lead/route.ts).

### V

- [x] **V1 · PASS · local gate** — Per-site counters exclude bots/DNT/GPC/tests as supported; clicks are separate from received inquiries.

  Tikri vietiniai HTTP/D1 testai patvirtino aggregate įvykius, DNT/GPC/bot ir draft/host atmetimą; testinis lead pašalintas, du click skaitiklio testai grąžinti. Saugomi site/day/path/event/count, be cookies/visitorID/IP ar formos teksto; click ≠ received inquiry. Marketingo/subscription/cookie provider nėra.

  Įrodymai: [tractor-audit-interest-tests.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-interest-tests.log), [interest-tracking.tsx](C:/Users/lenovo/Documents/dovanos-memorycasting/components/niche/interest-tracking.tsx), [route.ts](C:/Users/lenovo/Documents/dovanos-memorycasting/app/niche/[siteId]/interest/route.ts), [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json).

- [x] **V2 · PASS · local gate** — Measurement privacy statements match stored fields/cookies/identifiers and enabled providers.

  Tikri vietiniai HTTP/D1 testai patvirtino aggregate įvykius, DNT/GPC/bot ir draft/host atmetimą; testinis lead pašalintas, du click skaitiklio testai grąžinti. Saugomi site/day/path/event/count, be cookies/visitorID/IP ar formos teksto; click ≠ received inquiry. Marketingo/subscription/cookie provider nėra.

  Įrodymai: [tractor-audit-interest-tests.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-interest-tests.log), [interest-tracking.tsx](C:/Users/lenovo/Documents/dovanos-memorycasting/components/niche/interest-tracking.tsx), [route.ts](C:/Users/lenovo/Documents/dovanos-memorycasting/app/niche/[siteId]/interest/route.ts), [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json).

- [ ] **V3 · UNVERIFIED · operations gate** — GSC/analytics/qualified inquiries and testing interval support the niche decision; voice is off unless separately authorized and gated.

  Tikras domenas nepaleistas; organinio srauto, kvalifikuotų klientų užklausų ir jų vertės duomenų nėra. Balsas išjungtas.

  Įrodymai: [traktoriupadangos.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos.md).

### W

- [x] **W1 · PASS · local gate** — Notice and usage terms match an information/inquiry pilot, actual data inventory and current authoritative requirements.

  Privatumo tekstas atspindi dabartinius formos/aggregate laukus, operatoriaus paštą, tikslą, teises ir Hostinger notification. Sąlygos skirtos informaciniam pilotui. Nesuformuluoti išgalvoti legalID, retention, transfer ar deletion pažadai; atvirai įvardyti iki production nustatytini faktai. Tai parengtas vietinis notice, ne patvirtinta pilna vieša politika.

  Įrodymai: [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json), [complete-tractor-editorial.mjs](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/content-studio/scripts/complete-tractor-editorial.mjs), [faq_en](https://www.edpb.europa.eu/sme/find-practical-info/faq_en).

- [x] **W2 · PASS · local gate** — Purpose, contact, rights, processors/transfer scope and storage/deletion limits are stated truthfully; no invented policy or legal identity.

  Privatumo tekstas atspindi dabartinius formos/aggregate laukus, operatoriaus paštą, tikslą, teises ir Hostinger notification. Sąlygos skirtos informaciniam pilotui. Nesuformuluoti išgalvoti legalID, retention, transfer ar deletion pažadai; atvirai įvardyti iki production nustatytini faktai. Tai parengtas vietinis notice, ne patvirtinta pilna vieša politika.

  Įrodymai: [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json), [complete-tractor-editorial.mjs](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/content-studio/scripts/complete-tractor-editorial.mjs), [faq_en](https://www.edpb.europa.eu/sme/find-practical-info/faq_en).

- [ ] **W3 · UNVERIFIED · launch gate** — Production legal basis, recipients/processors, transfers, retention and delete/recovery process are established and accurate in the public notice.

  Prieš tikrų lankytojų duomenis būtina nustatyti legal basis, operatoriaus rekvizitus, processors/recipients/transfers, terminą ir tikrą delete/recovery vykdymą, tada perpatvirtinti notice. Agento GDPR tyrimas šių verslo faktų nesukuria.

  Įrodymai: [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json).

- [x] **W4 · PASS · local gate** — Nonessential cookie/marketing consent is implemented only when actually needed; inquiry is not blanket marketing consent.

  Tikri vietiniai HTTP/D1 testai patvirtino aggregate įvykius, DNT/GPC/bot ir draft/host atmetimą; testinis lead pašalintas, du click skaitiklio testai grąžinti. Saugomi site/day/path/event/count, be cookies/visitorID/IP ar formos teksto; click ≠ received inquiry. Marketingo/subscription/cookie provider nėra.

  Įrodymai: [tractor-audit-interest-tests.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-interest-tests.log), [interest-tracking.tsx](C:/Users/lenovo/Documents/dovanos-memorycasting/components/niche/interest-tracking.tsx), [route.ts](C:/Users/lenovo/Documents/dovanos-memorycasting/app/niche/[siteId]/interest/route.ts), [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json).

### X

- [x] **X1 · PASS · local gate** — No secrets/private leads/drafts in Git, public bundle, media paths, logs or LLM output; tenant and payload boundaries tested.

  Pakete ir approved public išvestyse nėra prisijungimų ar tikrų klientų duomenų; privatūs secrets/D1 ignoruojami Git, studio data neeksportuoja drafts. Tikri host/payload/media/hash neigiami testai praėjo. Tai nagrinėtų viešų kelių ir failų ribų patikra, ne viso repo penetration testas.

  Įrodymai: [content-package.json](C:/Users/lenovo/Documents/dovanos-memorycasting/content-packages/traktoriupadangos/content-package.json), [tractor-audit-core-tests.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-core-tests.log), [traktoriupadangos-html.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/traktoriupadangos-html.json), [.gitignore](C:/Users/lenovo/Documents/dovanos-memorycasting/.gitignore), [.gitignore](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/content-studio/.gitignore), [MAIL_CORE.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/MAIL_CORE.md).

- [x] **X2 · PASS · local** — Error behavior, dependence on optional voice/core, headers, spam vectors and recovery gaps are assessed with evidence.

  Įvertintas no-store/noindex/nosniff klaidų HTML, patvarus įrašymas prieš paštą, mail-failure honest response ir independence nuo voice core. Nėra pilno production rate limiter ar pranešimo retry/recovery; tai U4/X3 launch vartai. Vietinio unread-body 503 sutvarkytas normaliems bounded formos bandymams.

  Įrodymai: [tractor-form-local.json](C:/Users/lenovo/Documents/dovanos-memorycasting/output/audits/tractor-form-local.json), [MAIL_CORE.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/MAIL_CORE.md), [route.ts](C:/Users/lenovo/Documents/dovanos-memorycasting/app/niche/[siteId]/lead/route.ts).

- [ ] **X3 · UNVERIFIED · launch gate** — Production access, abuse limits, backups/restore and incident controls are working; unresolved risk is not hidden by a score.

  Produkcinės access/backup/restore/incident/abuse kontrolės ir jų bandymų įrodymo nėra. Vietiniai testai ir planavimo dokumentai nėra vykdoma produkcinė operacijų sistema.

  Įrodymai: [MAIL_CORE.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/MAIL_CORE.md).

### Y

- [x] **Y1 · PASS · local gate** — Shared fixes live in core; site-specific identity/content remain isolated; schema change updates both validators and integration tests.

  Shared schema/breadcrumb/dates/author, LLM source URLs ir bendras lead validator yra core; savitas tractor CSS/diagrama/turinys izoliuoti. schemaVersion/fields nekeisti; media riba 60 suderinta modelyje/JSON schemoje/public validatoriuje, penkių šeimų 25 WebP export e2e praėjo; senų ir kitų 3 paketų core/SEO testai praėjo.

  Įrodymai: [niche-schema-core.mjs](C:/Users/lenovo/Documents/dovanos-memorycasting/lib/niche-schema-core.mjs), [niche-links.mjs](C:/Users/lenovo/Documents/dovanos-memorycasting/lib/niche-links.mjs), [niche-seo.ts](C:/Users/lenovo/Documents/dovanos-memorycasting/lib/niche-seo.ts), [tractor-audit-core-tests.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-core-tests.log).

- [x] **Y2 · PASS · local gate** — Core/SEO regressions pass all current niches after relevant changes, with actual commands/results.

  19/19 core; 14/14 studio; scorer/initializer 5/5. Ankstesni to paties nepakitusio public source/paketo build EXIT=0, targeted ESLint EXIT=0 ir tsc EXIT=0. SEO smoke visoms 3 nišoms: 11 tractor, 7 greitos, 9 roleta. Naujų dokumentų ir scaffold patikra neapsimeta pakartotiniu runtime/Lighthouse testu.

  Įrodymai: [tractor-audit-core-tests.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-core-tests.log), [studio-tests.log](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/studio-tests.log), [scorer-tests.log](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/scorer-tests.log), [NEW-AGENT-READINESS.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/NEW-AGENT-READINESS.json), [tractor-audit-seo-traktoriupadangos.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-seo-traktoriupadangos.log), [tractor-audit-seo-greitossvetaines.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-seo-greitossvetaines.log), [tractor-audit-seo-roletaiklaipedoje.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-seo-roletaiklaipedoje.log), [tractor-audit-lint.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-lint.log), [tractor-audit-types.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-audit-types.log), [tractor-full-audit-build.log](C:/Users/lenovo/Documents/dovanos-memorycasting/output/tractor-full-audit-build.log).

- [x] **Y3 · PASS · local gate** — START_HERE, AGENTS, builder/planner and site journal link the current acceptance workflow for a fresh session.

  AGENTS/START_HERE, builder/planner ir SKILLS README nukreipia į privalomą A–Z priėmimą. CORE_BUILD_CONTRACT nurodo faktines shared realizacijas ir visą pirmą fazę iš vieno sakinio. Bendras initializer kuria 85 UNVERIFIED ir išsaugo esamą auditą; 5 testai praėjo. 4 skills įdiegti junction, 3 niche quick_validate PASS ir 99 vietinės nuorodos patikrintos. 17 nepradėtų briefų kontaktai suderinti. Pirmo naujo agento rezultato protokolas parengtas, bandymas dar nepradėtas. Senas build-tractor bootstrap blokuoja patvirtinto turinio perrašymą.

  Įrodymai: [START_HERE.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/START_HERE.md), [AGENTS.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/AGENTS.md), [SKILL.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/SKILLS/niche-site-audit/SKILL.md), [traktoriupadangos.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos.md), [CORE_BUILD_CONTRACT.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/CORE_BUILD_CONTRACT.md), [AUTONOMY_BENCHMARK.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/AUTONOMY_BENCHMARK.md), [NEW-AGENT-READINESS.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/NEW-AGENT-READINESS.json).

### Z

- [x] **Z1 · PASS · local gate** — Checklist, baseline findings, repairs, screenshots, versions, remaining blockers and score evidence are stored per site.

  Ši pilna 85 kriterijų ataskaita ir JSON, fingerprint, baseline/remedies, realūs screenshots ir neišspręsti vartai išsaugoti. Scorer nereikalauja dirbtinio 10; local/launch/demand išskirti. Etalonas yra kandidatas iki likusių vartų, ne besąlygiškai domain-ready.

  Įrodymai: [PHASE-1-AUDIT.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/PHASE-1-AUDIT.json), [PHASE-1-AUDIT.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/PHASE-1-AUDIT.md), [PHASE-1-AUDIT-SCORE.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/PHASE-1-AUDIT-SCORE.json).

- [x] **Z2 · PASS · local gate** — 10/10/local-ready/domain-ready claims obey the score contract; failed/unverified checks are visible.

  Ši pilna 85 kriterijų ataskaita ir JSON, fingerprint, baseline/remedies, realūs screenshots ir neišspręsti vartai išsaugoti. Scorer nereikalauja dirbtinio 10; local/launch/demand išskirti. Etalonas yra kandidatas iki likusių vartų, ne besąlygiškai domain-ready.

  Įrodymai: [PHASE-1-AUDIT.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/PHASE-1-AUDIT.json), [PHASE-1-AUDIT.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/PHASE-1-AUDIT.md), [PHASE-1-AUDIT-SCORE.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/PHASE-1-AUDIT-SCORE.json).

- [ ] **Z3 · UNVERIFIED · launch gate** — Final domain-ready handover has all applicable launch gates proved; no unmeasured guarantee of demand or ranking.

  Paleidimo vartai dar neįrodyti; svetainė neveikia patvirtintame tikrame domene, pilnos production operacijos ir privatumas nepatvirtinti.

  Įrodymai: [MAIL_CORE.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/MAIL_CORE.md), [SEO_GEO_CORE.md](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/SEO_GEO_CORE.md).

## Kategorijų aprėptis

Ši lentelė apima visus trijų etapų kriterijus; etapų balai aukščiau yra atskiri.

| Grupė | PASS / taikoma | Balas | Neįrodyti vartai |
|---|---:|---:|---|
| A | 2/3 | 6.66 | A3 |
| B | 2/3 | 6.66 | B3 |
| C | 2/2 | 10 | — |
| D | 3/3 | 10 | — |
| E | 3/3 | 10 | — |
| F | 3/3 | 10 | — |
| G | 3/3 | 10 | — |
| H | 5/5 | 10 | — |
| I | 3/4 | 7.5 | I4 |
| J | 3/3 | 10 | — |
| K | 3/3 | 10 | — |
| L | 3/4 | 7.5 | — |
| M | 3/3 | 10 | — |
| N | 3/4 | 7.5 | — |
| O | 2/3 | 6.66 | O3 |
| P | 3/3 | 10 | — |
| Q | 3/3 | 10 | — |
| R | 2/3 | 6.66 | R2 |
| S | 2/3 | 6.66 | S2 |
| T | 2/3 | 6.66 | — |
| U | 3/4 | 7.5 | U4 |
| V | 2/3 | 6.66 | V3 |
| W | 3/4 | 7.5 | W3 |
| X | 2/3 | 6.66 | X3 |
| Y | 3/3 | 10 | — |
| Z | 2/3 | 6.66 | Z3 |

Versija: package SHA-256 `cdacd6d13bbd2cbe74791d392ba49687b688fd78443880aa5ddf2ecfa7104f04`; checkout HEAD `cc8462094a30c443eca8ed463964bd7c9f57610c` su bendrais necommitintais kitų sesijų pakeitimais. Tikrintų source failų SHA-256 ir aplinka išsaugoti [PHASE-1-AUDIT.json](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/traktoriupadangos/PHASE-1-AUDIT.json).

Scorer: `node SKILLS/niche-site-audit/scripts/score-audit.mjs sites/traktoriupadangos/PHASE-1-AUDIT.json`. Jis tikrina 85 ID, evidence presence ir skaičiavimą; įrodymų tiesos pats nenustato.
