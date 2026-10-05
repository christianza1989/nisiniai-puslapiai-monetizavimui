# M5 bendro variklio vietinis priėmimas

2026-10-05 Europe/Vilnius. Tai izoliuotas `gift-core-fixture.example` bandymas, ne tikro Dovanos123 turinio ar paleidimo priėmimas.

Checkout: `C:/Users/lenovo/Documents/dovanos-memorycasting/output/dovanos123-m5-root-r1`, listener `http://127.0.0.1:8928`, SMTP ir voice OFF. Sintetiniai kontaktai saugomi tik savo `.wrangler/state`; klientams laiškų ar skambučių nėra. Bendras main dist nepakeistas.

## Patikrinta

- `HTTP-QA.json`: visi 9 due puslapiai, tikras HTML, po vieną H1, canonical, schemas, no-store ir ateities izoliacija. Sitemap bei abu LLM indeksai naudoja tą pačią projekciją. Ateities puslapis ir jo medija 404; nežinomas host/internal/API kelias 404; filtruotas indeksas noindex su baziniu canonical.
- Native formos viena sintetinė užklausa tikrai išsaugota izoliuotoje D1 su site/source/UUID/consent laiku/status. Neteisingas origin, be consent ir honeypot patikrinti. Ankstesnis bandymo skriptas neteisingai dubliavo honeypot lauką; pataisius, pašalinti tik šio fixture sintetiniai įrašai ir pakartotas visas bandymas. Galutinis JSON yra pataisyto bandymo įrodymas, ne inbox įrodymas.
- Pageview ir email_click agregatai kiekvienas po vieną; invalid/future ir GPC scenarijai patikrinti. Paspaudimas nėra gautas laiškas ar kliento paklausa.
- `V1-SEO-SMOKE.json`: tikri visų 9 dabartinių v1 nišų SEO endpointai PASS, 96 URL. V1 schema ir hash sutartis nepakeista.
- `V1-BASELINE-VERIFIED.json`: v1 schema bei visų9 compiled paketo bytes SHA tikrai sutampa su planavimo baseline. Dispatcher source pakeistas dėl v2, todėl jo source SHA neprilyginamas nekintamam algoritmui; suderinamumą patvirtina v1 hash testai. Pirminis `V1-BASELINE-CURRENT.json` fiksuoja ir šią numatytą source delta.
- `KNOWLEDGE-QA.json`: actual core emitter sukūrė atskirą v2 transportą; 9 puslapiai ir 9 fragmentai sutampa su HTML inventoriu, nėra ateities raw target ar object-object. Runtime import/learning/voice lieka OFF. Core savininko M4 ataskaita vertinama atskirai nuo šio emitter bandymo.
- `core-tests-current.log`: 41/41 PASS po local-preview guard delta. `tsc-current.log`: TypeScript be klaidų. Studijos galutinis log `../M1/studio-tests-final.log`: 22/22 PASS, įskaitant du realius Node rašytojus ir bounded lock/recovery.
- Vėlesnis draft media metadata API ir publish/revoke immutability saugiklis: `../M1/studio-tests-media-metadata-final.log` 23/23 PASS. `scoped-lint-current.log` be klaidų. Tai modelio korekcija, ne actual gift DATA mutacija.

## Vizualai ir matavimo ribos

Gift sesija atliko atskirą readonly browser patikrą, radusi tikrą 320 px overflow ir kontrasto trūkumus. Rendererio savininkas pataisė savo scoped CSS ir footer; root nukopijavo du pakeistus failus į izoliuotą checkout bei perbuildino. Originalūs before įrodymai neištrinti. Po pataisų deklaruota 320 px matrica turi scrollWidth=viewport ir bounding overflow[]; actual screenshot artefaktai public `output/playwright/dovanos123-integration/`. Šis fixture nėra actual Dovanos123 dizaino įvertinimas. Tikras 200% browser zoom liko UNVERIFIED.

Lighthouse12.8.2 mobile: before 97/96/100/69; po kontrasto pataisų 88/100/100/69 (performance/accessibility/best-practices/SEO). Po pataisų LCP 2805 ms, TBT154.5 ms, CLS0. SEO69 susijęs su tyčiniu noindex; vartų nenuimti dėl balo. Performance sumažėjimas nepagražintas ir nevadinamas garantuotu rezultatu: vienas vietinis run aktyviame darbo kompiuteryje. Nauji actual gift assets ir redakcija reikalauja savo matavimo. Detalės `LIGHTHOUSE-SUMMARY.json` ir abu originalūs LH JSON.

## Dar atviri vartai

Actual gift juodraščiai, jų claims ir vaizdų revizijos turi atskirą nepriklausomą redakcinę peržiūrą. Production ownership/DNS/HTTPS/hosting, dabartinis privacy/cookies inventorius, pinet INBOX, legacy D1 mapping/backfill ir v2 learning/Start bei edge paginated source nėra šio bandymo PASS. Actual gift main aktyvavimo nėra. V2 CLI plan/draft/autopilot išjungtas iki naujo turinio kontrakto įgyvendinimo.

`local-preview` admission naujovė leidžia tik actual kanoninio host paketo peržiūrą izoliuotame output checkout ir tik loopback host, su noindex; ne production leidimą. Pure helper/compiler testai PASS; šios konkrečios scope actual HTTP r2 testas dokumentuojamas atskirai kai priimtas kandidatas. `local-fixture` leidžia tik reserved `.example`. Production receipt privalo exact package SHA ir visų local/launch kriterijų PASS su įrodymų hash.

## Actual turinio r2 peržiūra, 2026-10-05

Ankstesnis fixture ir jo matavimai išsaugoti. Nepriklausoma redakcinė peržiūra `../EDITORIAL/ACCEPTANCE.json` priėmė tik 11 konkrečių revizijų ir 15 WebP baitų; gift savininkas patvirtino jas įprastu modelio API. Kiti 30 juodraščių nepatvirtinti. Shadow eksporto SHA-256 `f9a14e3a5772781afe1233fbd3ccc6041ea2bf73aef2d7a12d40924ca6b4febd` aktyvuotas tik izoliuotame `output/dovanos123-m5-root-r2`, localhost8930, local-preview/noindex. Main tebėra 9 v1 paketai.

`ACTUAL-PREVIEW-HTTP.json`: 11 actual HTML puslapių ir visų 15 WebP HTTP baitų/SHA/matmenų patikros PASS. Patikrinti visi trys pilni gidai, jų organization byline, matomas tekstas, šaltinių ir susijusios nuorodos, Article image, BreadcrumbList, canonical, sitemap ir abu LLM indeksai. Nepatvirtinti privatumo, taisyklių, senų gidų/profilių URL ir internal routes 404. Todėl tikras paketas nerodo formos ir analytics; fixture D1 PASS nėra actual gift formos ar inbox įrodymas. Mailto MB Pinet/info@pinet.lt matomas, gavimas nepatvirtintas.

Gift canonical/www, unknown ir preview.vercel.app host izoliuotoje peržiūroje 404. Rastas *.vercel.app fallback500 pataisytas bendru proxy fail-closed vartų sprendimu tik aktyviam local-preview. Atskiras dovaneles.lt legacy host grąžino500, nes izoliuotoje D1 nėra legacy lentelių (sqlite_master0); jis neperkeliamas šiuo kandidatu, jo suderinamumas UNVERIFIED. Nepriskiriamas klaidingas visų legacy host PASS.

`V1-SEO-SMOKE-ACTUAL-PREVIEW.json`: visi 9 v1 / 96 URL PASS. `core-tests-preview-final.log`: 44/44 PASS, `tsc-preview-final.log` ir `lint-preview-final.log` PASS. V1 schema/main compiled baitų baseline išliko. `ACTUAL-KNOWLEDGE-QA.json`: 11 actual matomų puslapių ir 11 emitter fragmentų tekstai bei projekcijos hash tiksliai sutampa; runtime import, learning admission ir voice OFF. Tai transporto įrodymas, ne realaus agento Start/atsakymo priėmimas.

Gift savininko actual browser baseline: 17 peržiūrų, visi 11 puslapių320px, penki desktop ir homepage390px. Aptiktos homepage320 kategorijų kortelės už viewport, nors document overflow buvo paslėptas. Scoped CSS pataisa palieka vieną stulpelį iki380px; vėlesnis `actual-r2-final-qa.json` turi 6 routes200, home320/390 bounding overflow[], 320 grid284px / 390 du172px stulpeliai, trijų gidų vaizdai įkelti ir šaltinių skaičiai1/3/3. SkipTab/Enter pasiekia MAIN#main-content. Root peržiūrėjo homepage320full/390top bei trijų gidų opening ir hand footer pixels. Kai kurių greitų screenshot apačių blank dėl legacy content-visibility:auto nėra visų footer paint ar WCAG PASS; tikras200% zoom UNVERIFIED.

Actual homepage pirmasis Lighthouse12.8.2:97/95/100/69, LCP2274ms/TBT14.5ms/CLS0. Realus kategorijų numerių ir aprašų kontrasto FAIL perduotas gift CSS savininkui; jo pataisa ir pakartotinis matavimas turi atskirus after įrodymus. Ilgas hand gidas96/100/100/69, LCP2349ms/TBT14ms/CLS0. SEO69 susijęs su tyčiniu noindex; vietiniai lab matavimai neįrodo lauko INP ar production našumo. Galutiniai visi matavimai saugomi `ACTUAL-LIGHTHOUSE-SUMMARY.json`, kai užbaigti; raw before neperrašomi.

Galutinis actual homepage after: **97/100/100/69**, LCP2266ms/TBT16ms/CLS0, color-contrast PASS. Couple ir man gidai abu96/100/100/69, LCP2495/2485ms, TBT11.5/12.5ms, CLS0. `ACTUAL-LIGHTHOUSE-SUMMARY.json` apima penkis raw before/after/guide SHA ir tikslias matavimo datas. Guide matavimai atlikti prieš tik homepage dviejų spalvų delta; jų tekstai, vaizdai ir layout nekito.

`ACTUAL-PREVIEW-HTTP-AFTER-CONTRAST.json`: pakartota11/15 ir exact revisions/package patikra PASS po paskutinio build. Pirmas root pakartojimo kvietimas neteisingai praleido būtinus checkout/base argumentus, fail-closed assertion sustabdė prieš HTTP; ištaisius kvietimą ir papildomo evidenceName argumento indeksą, originalus HTTP raw neperrašytas. `FINAL-V1-BASELINE.json`: main9v1/giftOFF ir v1schema/maincompiledSHA unchanged. Gift `actual-r2-contrast-qa.json`:320/390 computed labels minimum5.550153783162116:1, overflow[], forma/trackerOFF. Root peržiūrėjo abi kategorijų after nuotraukas ir couple/footer pixels; man bottom capture turi blank paint ribą, todėl visų footer pixels PASS nedeklaruojamas.

Vietinis ribotas techninis ir redakcinis r2 inkrementas baigtas su šiais įrodymais. Tai nėra viso portalo A–Z/craft9/10 ar production priėmimas. Actual pašto siuntimų, skambučių, DNS ir maingift aktyvavimo0; r1fixture listener išjungtas, ownr2 lieka vietinei peržiūrai. Atviri vartai saugomi `FINAL-LOCAL-REVIEW.json` ir integracijos STATE, nepaslepiami Lighthouse balais.
