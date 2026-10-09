# parasoplansetes.lt dizaino atnaujinimas

2026-10-10. Visi 19 patvirtintų StepOver puslapių, katalogas, gidai, kontaktai ir opt-in pokalbio išvaizda. Agentui deleguotas tyrimas bei dizaino pasirinkimas. Peržiūra atlikta nuosekliai vieno agento, ne nepriklausomų dizainerių.

## Tikros Dribbble peržiūros

| Šaltinis, realus naršyklėje atvertas vaizdas | Perimta | Atmesta |
|---|---|---|
| [Electronic signature — Landing page](https://dribbble.com/shots/21178744-Electronic-signature-Landing-page), Alex Giuseppe Ispas | Stipri tipografijos hierarchija, glaustas pirmas veiksmas | Nuotraukos kopija, svetimi saugumo pažadai, visas tamsus puslapis |
| [Deedsign Website](https://dribbble.com/shots/24078506-Deedsign-Website), Nasir Uddin | Šviesus darbo paviršius, kompaktiška navigacija | Centruotas SaaS hero be tikro įrenginio |
| [Anypay POS hero section](https://dribbble.com/shots/14734160-Anypay-POS-hero-section), Oleksandr Plyuto / OOZE | Įrenginio ir programos bendras pasakojimas, pokalbio prieiga | Svetimas 3D įrenginys, tariami skaičiai, dekoracijos |

[B2B Industrial](https://dribbble.com/shots/27485784-B2B-Industrial-Website-Design-Manufacturing-Landing-Page-UI-UX) grąžino 410, nelaikomas peržiūrėtu dizainu. Dribbble assets nekopijuoti. Gamintojo kontekstas peržiūrėtas [5.0](https://stepover.com/produkte/unterschriftenpads/durasign-pad-5-0/), [NG 10](https://stepover.com/produkte/unterschriftenpads/durasign-pad-ng-10/) ir [eSignatureOffice](https://stepover.com/produkte/software/esignatureoffice/) puslapiuose; paketo faktai neperrašyti.

Artimiausi tinklo orientyrai iš ankstesnio DESIGN: traktoriupadangos geltonas split hero bei kondensuota tipografija, laiptucentras interjero fotografija šalia antraštės. Čia dokumento proceso paviršius su maža tikra nuotrauka, savybių palyginimu ir mėlyna veiksmų kalba. Vien split geometrija nelaikoma savitumo įrodymu.

## Kryptis ir kompromisas

Tikri Impeccable context ir `concept-seed --scope direction --mode persuade` paleisti prieš realizaciją. Sėkla `cc18d1d4`, grounded indeksas 3 — dokumento darbo stalas. Tas pats roll atkurtas su `--from cc18d1d4` ir išsaugotas vietiniame `concept-seed.txt`; tai nėra naujas pasirinkimas. Agentas sprendžia pagal PROJECT_ADAPTATION, žmogaus approval nefabrikuojamas.

Septyni pasauliai: 1) dokumento maršruto schema; 2) techninis duomenų lapas; 3) dokumento darbo stalas; 4) siuntos kelio žemėlapis; 5) sistemos konsolė; 6) darbo vietos planas; 7) verslo ataskaita. Jie apima diagramų, dokumentų, programinės sąsajos ir darbo aplinkos šeimas. Trečiasis geriausiai jungia tikrą įrenginį, programą ir failą be siauro IT ar vieno sektoriaus filtro.

Seed challengeriams taikyta auditorijos atpažinimo ir produkto aiškumo pora:

| Fused kryptis | Verdiktas | Darbo stalo sistemos disciplina |
|---|---|---|
| Alan Fletcher popieriaus pun | declined: abi ašys silpnesnės verslo įrangos atrankai | Vienas aiškus vizualus paaiškinimas |
| Goldenrod stiklinis tvarkaraštis | declined: raked lateral kelias ir vienas dydis apsunkina palyginimą bei skaitymą | Pastovi dokumento eigos seka |
| Spalvoto šilko kiemas | declined: persidengiantys spalvų kanalai nepaaiškina įrenginio savybių | Nuosekli medžiaga per visas puslapių šeimas |
| Black-hole accretion disk | declined: orbitos ir išnykimas netinka įrangai bei užklausai | Aiškiai įvardyta būsena ir matomas kitas veiksmas |
| Depo destination blind audinys | declined: viena tipografija ir snap-roll trikdo ilgą turinį | Stabilios kelių ir būsenų vietos |
| Žalias terminalas | competitive: būsenų aiškumas geras, plačios B2B auditorijos atpažinimas silpnesnis | Pirmos klasės įvestis ir skaitoma pokalbio istorija |

Motyvai nepasiskolinti. Pirmas ekranas: patvirtintas H1, trumpas įvadas, du realūs veiksmai, dokumento eiga ir tikras duraSign Pad 5.0. Rizika: originalūs 300 px vaizdai nėra detalūs didelio produkto renderiai; mastelis ribojamas. Esamos žalios konceptinės gidų iliustracijos paliktos kaip turinys.

## Realizacija

Homepage, katalogas, penki produktai, programinė įranga, integracija, keturi gidai, gidų indeksas, kontaktai ir keturi informaciniai puslapiai naudoja vieną sistemą. Katalogo modeliai ir kontaktų forma perkelti prieš papildomus paaiškinimus. Kūno tekstas, nuorodos, šaltiniai ir anchor indeksai išliko. Manrope pernaudotas iš esamo OFL rinkinio su provenance. Naujo rasterio nėra.

VoiceWidget pakeitimas — opt-in išvaizda, SVG ir semantika. Request/state/session/history/contact logika nekeičiama. Kitos svetainės nepasirenka naujos išvaizdos. Jokio deployment, merge, mokamo modelio, runtime, DB, SMTP, env ar balso pakeitimo.

## Faktinė patikra

| Patikra | Rezultatas / riba |
|---|---|
| Core testai | 63/63 PASS |
| TypeScript ir scoped ESLint | PASS po išdėstymo pataisų |
| Production build | PASS, 10 paketų validuoti. Bendro build esami >500 KB chunk ir kitų svetainių CSS vardų perspėjimai lieka |
| SEO smoke po paskutinio build | PASS: 19 puslapių, robots/sitemap/llms/schema/host isolation/404 |
| Paketo vientisumas | Byte-identical; SHA256 `ed39a2769c2fdd1732696f39076bf827972cc81bb98d385d30d9620149012e7b` |
| 1440 × 900 ir 390 × 844 | Visi 19 adresų, overflow false, fonts loaded. Nuosekliai pasiekus lazy vaizdus home 8/8, katalogas 6/6 |
| 320 px | Kontaktai, katalogas ir PDF gidas — tikras innerWidth 320, overflow false; chat ready / 503 ekranai |
| 768 px | Kontaktų forma telpa. Native email typeMismatch blokuoja netinkamą adresą |
| Formos POST | Vietinis 503 su sąžiningu „Užklausos nepavyko priimti“ ir grįžimo nuoroda; DB / SMTP be binding neįrodinėjami |
| Tikras pokalbio endpoint | Sesijos 503 be fiktyvaus atsakymo, retry ir formos nuoroda |
| UI fixture, atskiras 5200 | Blank composer disabled, pending disabled, ilgas atsakymas, contact request, email validacija / receipt, 5 žinutės po close/reopen, HTTP503 be naujo agento atsakymo. Tas pats komponentas, testiniai tekstai pažymėti; provider / DB / mail nenaudojami, serveris uždarytas |
| Impeccable detector | Vienas baigtos UI skenavimas, `[]`; nėra vizualinės kokybės sertifikatas |
| Lighthouse mobile home | P91 / A100 / BP96 / SEO69. LCP 2.7 s, CLS 0.001, TBT 190 ms |
| Lighthouse mobile PDF | P93 / A100 / BP96 / SEO69. LCP 2.5 s, CLS 0.001, TBT 150 ms |
| Lighthouse ribos | SEO vienintelė nesėkmė — išsaugotas noindex ir robots blokavimas. BP mažina `/ivykius` 503 be lokalios DB; nėra production metrika |
| Browser zoom 200% | UNVERIFIED: ctrl+plus nepakeitė innerWidth / devicePixelRatio. 320 px reflow jam neprilyginamas |

Pirma bendra desktop/mobile peržiūra → vienas katalogo ir kontaktų tvarkos pataisų rinkinys → patvirtinimas. Papildomi įrodymai perimti dėl praleisto lazy load ir viewport poveikio tik aktyviam skirtukui. Galutiniai vaizdai turi išmatuotus 1440/390/320 px plotus.

Vietinis `content-studio/tmp/parasoplansetes-design/` neįkeliamas į Git: `browser-review.json`, `concept-seed.txt`, du `lighthouse-*.report.json/html`, fixture ir screenshots. Svarbiausi: `home-desktop-final.jpg`, `home-mobile-final.jpg`, `desktop-paraso-plansetes-final.jpg`, `mobile-paraso-plansetes-final.jpg`, `desktop-kontaktai-final.jpg`, `mobile-kontaktai-final.jpg`, visų keturių gidų desktop/mobile, `fixture-chat-pending-mobile.jpg`, `fixture-chat-contact-mobile.jpg`, `fixture-chat-failure-mobile.jpg`, `chat-ready-320.jpg`, `chat-real-503-320.jpg`. Tiesioginės navigacijos fullpage vaizdas gali būti iki lazy media užkrovimo; home/catalog vaizdų užkrovimas patvirtintas nuosekliu slinkimu.

## Git ir perdavimas

Issue [core #60](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/60), [public #21](https://github.com/christianza1989/niche-public-core/issues/21). Nuosavi branches/worktree:

- Core `codex/parasoplansetes-design-20261010`, pradinis HEAD `6691b0f0a52e32d275b99d8cae5b751e2d6550c0`.
- Public `codex/parasoplansetes-design-public-20261010`, pradinis HEAD `b2d581ddc312a1431992806d0dd591d77c1e83d0`.
- Public dizaino commit `e63d3ebd9a55dc83b5ab454f756611cffeb75a8b`, [draft PR22](https://github.com/christianza1989/niche-public-core/pull/22), 8 scoped failai. Exact-staged repository-safety PASS.
- Start/continue/handoff PASS: main core `d4ea8bf7384b70c4ea62a344001e3f8158812c56`, public `d0fd6b7d296303bfcaafadc4071945e675a72b96`. Handoff pakartojamas po galutinio core commit.
- Draft PR bazės — esamos `codex/parasoplansetes-f1-20261008` / `codex/parasoplansetes-public-20261008`. Naujesnis core bazės OpenRouter darbas priklauso pagrindinei užduočiai; trijų taškų dizaino diff tik dokumentai.

Preview `http://localhost:5198` — nuosavas IPv6 `::1` production Wrangler. Esama studija IPv4 `127.0.0.1:5198` nepaliesta. Tas IPv4 adresas šio dizaino neparodo. Iš companion po `npm ci` ir `npm run build`:

```powershell
node --import ./scripts/sites-env.mjs node_modules/wrangler/bin/wrangler.js dev --config dist/server/wrangler.json --local --persist-to .wrangler/design-state --ip ::1 --port 5198 --inspector-port 0 --var NICHE_DEV_SITE_ID:parasoplansetes --var CHAT_WIDGET_ENABLED:1 --var CHAT_SITE_IDS:parasoplansetes --var VOICE_WIDGET_ENABLED:0 --log-level warn
```

Tikro OpenRouter atsakymo, persistent atminties ir pristatymo integracija priklauso pagrindinės užduoties backend priėmimui. Šis dizaino PR tam neteikia tariamo PASS. Rollback — revert vien dizaino commit.
