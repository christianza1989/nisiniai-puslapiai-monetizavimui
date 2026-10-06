# Kito Codex startas: bendras core ir Madbeauty

2026-10-06. Savininkas pavedė paruošti kodą ir commit GitHub; kita sesija užbaigs Madbeauty, įkels į Cloudflare ir prijungs madbeauty.lt. Šis perdavimas nepraneša apie jau atliktą deployment. Paskyros prieiga, resursai, domeno valdymas ir tikri verslo faktai tikrinami naujoje sesijoje, sekretai perduodami atskirai.

## Kurią versiją imti

Nišų repo: https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui — naudoti `main`. PR3 → PR4 → PR5 → PR6 jau sujungti priklausomybių tvarka: produkto/demo sutartys, bendras turinio workflow, platformos priėmimas ir visas Madbeauty vietinis kodas. Patikrinta kodo bazė `ba68affca09e7bee5e831a9e34322d4bf7714b80`; vėlesnis perdavimo dokumentų commit nekeičia runtime. Ankstesnės šakos paliktos istorijai, jų nebereikia naujam clone.

Viešo core repo: https://github.com/christianza1989/niche-public-core — naudoti `main`, patikrinta versija `8e46092b77fc852509543f7fdaa1ebabca5bd3e8`. Dovanos123 staging PR3 jau sujungtas: 11 approved puslapių ir 15 WebP, gift neaktyvus. Ankstesnė peržiūra pridėta į `research/dovanos123-pr3-review-20261006/REVIEW.md`, naujas main priėmimas — `research/github-main-finalization-20261006/REVIEW.md`. Dovanos paketo nereikia aktyvuoti Madbeauty paleidimui.

Švaraus main portable build problema išspręsta ir sujungta public-core PR4: versioned vendor plugin su MIT licencija ir optional managed hosting config, tik 3 failų pataisa. Plugin/license paimti exact iš PR1 `e06bfd4c56f9aae710056e189dcc52c34be563fa`; PhoneBridger plugin/runtime/config pakeitimai neperimti. PR1 likusį darbą valdo jo sesija. Niekada nekelti seno privataus `.openai/hosting.json` vietoje portable sprendimo. Build PASS; esami didelių chunk, duplicate CSS ir unsupported webpack perspėjimai liko dokumentuoti, ne production našumo priėmimas.

## Atkurti vietinę Madbeauty

Node 22.22+; abu repo greta. Tai atkūrimo komandos, ne Cloudflare deploy:

```powershell
git clone https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui.git nisiniai_puslapiai_monetizavimui
git clone https://github.com/christianza1989/niche-public-core.git dovanos-memorycasting
cd dovanos-memorycasting
npm run install:ci
cd ../nisiniai_puslapiai_monetizavimui
npm ci --prefix content-studio
node sites/madbeauty/content/bootstrap-checkout.mjs
node sites/madbeauty/acceptance/regression-uiux-v3.mjs
node sites/madbeauty/prototype/app-server.mjs
```

Atidaryti `http://127.0.0.1:8788/`. Kitam portui naudoti `MADBEAUTY_APP_PORT`. `MADBEAUTY_DATA_MODE=unseeded` atskiria naujų testinių paskyrų kelią nuo 40 fiktyvių meistrų preview. Registracija tik el. paštu; vietinis OTP capture skirtas `@example.com`, realus paštas dar neprijungtas. Detalės ir private QA helperiai: `sites/madbeauty/GIT_HANDOFF.md`, `BACKEND_DECISION.md`.

## Patikrinta ir ką išsaugoti

- Vietinė Madbeauty: 74 testai PASS (36 backend, 29 platform/HTTP/calendar, 9 foundation); root atkūrė iš perduotos kopijos ir pakartojo su aktualiu sujungtu core. Ankstesnėje atkūrimo patikroje šeši HTTP puslapiai 200, trys gidai su Article schema ir image 200, keturi private/discovery URL 404. Kvitai `research/madbeauty-git-handoff-2026-10-06/REVIEW.md` ir `research/github-main-finalization-20261006/REVIEW.md`.
- Bendras core build PASS, 49/49 core testai PASS, 9/9 actual HTTP SEO smoke rinkiniai / 96 vieši URL PASS. Studija 32/32 PASS ir nuosekliai, ir įprastu `npm test` po build; pirmasis lygiagretus vykdymas build metu turėjo vieną nepagražintą timeout, tada nekeičiant ribų pakartotas.
- Kode yra 40 fiktyvių meistrų ir 600 jų responsive WebP; duomenų adapteris atskiras nuo produkto tekstų. Viešinant tikrą paslaugą fiktyvūs profiliai, reitingai ir laisvi laikai negali tapti tikrais komerciniais rezultatais.
- Pradinis turinys: 7 approved puslapiai, 3 gidai, 20 WebP. Immutable paketo SHA256 `dba452bae4c613cc91b2da0d67addd221e405f30c594992553f3009bfc809579`; bootstrap naudoja bendrą importerį. 3 straipsniai per savaitę / 6 mėnesiai yra turinio politikos tikslas, ne jau parašyti 76 straipsniai.
- V3 normalios desktop/mobile sąsajos priėmimas apima 69 paviršius; jį atliko įgyvendinantis agentas. Root neatliko naujo visų ekranų craft audito. Demo galerijos/profilių estetikos tolesnę peržiūrą savininkas sustabdė. Fizinis zoom / OS reduced motion / dalis tablet aprėpties liko UNVERIFIED.
- Vietinis A–Z 7,6 / gateReady=false išlaikytas. Testų suma nėra 10/10, launch-ready ar paklausos įrodymas.

## Kita sesija: Cloudflare ir produkcinio paleidimo eilė

1. Perskaityti `AGENTS.md`, `START_HERE.md`, `WORKSTREAMS.md`, `docs/INTEGRATING_A_PROJECT.md`, `PLATFORM_BUILD_CONTRACT.md`, `CONTENT_CORE.md`, `SEO_GEO_CORE.md`, `MEDIA_CORE.md`, `MAIL_CORE.md` ir Madbeauty `CURRENT_SCOPE.md`, `IMPLEMENTATION_STATUS.md`, `uiux/REMAINING_GAPS.json`. Užregistruoti savo šaką ir failų sritį; pasikeitusių PR būsenų nelaikyti sena konstanta.
2. Atkurti aukščiau esantį vietinį kelią. Toliau kurti Madbeauty modulį bendrame host-aware core, išlaikant `siteId=madbeauty`, central kontaktus MB Pinet / info@pinet.lt, bendrą turinio schemą/publikavimo/laiko/medijos predikatą. Kitų nišų apimties neplėsti.
3. **Cloudflare runtime dar neįgyvendintas.** Actual entrypoint `prototype/app-server.mjs` yra loopback Node HTTP ir uždraudžia režimą už local-preview; `backend/store.mjs` naudoja sinchroninį `node:sqlite`, vietinius failus ir `BEGIN IMMEDIATE`, `backend/media.mjs` — vietinę saugyklą. Tai nėra Workers/D1/R2 adapteris. Neužtenka pakeisti domeną ar SQLite URL. Suplanuoti ir įgyvendinti serverio entrypoint, duomenų/sesijų/outbox saugyklos ir medijos adapterius; pasirinkimą pagrįsti aktualiais Cloudflare dokumentais ir esamu bendru core.
4. Anksti patikrinti visą naują serverio kelią: reali email registracija → provider membership → paslauga/grafikas → kliento availability → hold/confirm → abiejų rolių vizitas. Išlaikyti atomic persidengimo, buferių, idempotency, expiry ir timezone elgesį. Naujoje saugykloje atlikti dviejų konkuruojančių rezervacijų / perkėlimų, tenant izoliacijos, atkūrimo ir outbox retry bandymus; senos SQLite patikros nėra naujo adapterio PASS.
5. Paruošti production auth/session/CSRF/origin/rate-limit/OTP, saugų el. pašto transportą ir tikrą inbox pristatymą. `@example.com` capture, development admin ir preview DB neturi tapti viešos sistemos administravimo ar autentifikavimo keliu. Nekopijuoti seno kompiuterio DB ir seansų.
6. Užbaigti realaus katalogo production SSR, naudingų paslauga/miestas landing puslapių eligibility, canonical, robots, sitemap, breadcrumbs, JSON-LD ir LLM išvestis. Visų datos/laiko/filtrų kombinacijų neindeksuoti automatiškai. Privatūs/account/bookings ir fiktyvūs seed duomenys neindeksuojami. Gidai ir tikslinės CTA nuorodos remiasi tuo pačiu realiai viešu inventoriu bei bendru turinio kalendoriumi/release.
7. Sutvarkyti teisinius tekstus pagal tikrą vykdymą, teikėjų sutikimus/vaizdų teises, backup/restore, retention, monitoring, incidentų ir rollback kelią. Patikrinti pasirinkto plano faktines nemokamas kvotas ir išlaidų ribas; nemokamo neriboto veikimo nežadėti.
8. Po naujo runtime vietinio/integration priėmimo paleisti tikrą Cloudflare preview su nauja izoliuota testine saugykla ir medija. Užfiksuoti deployed commit/resource aplinką, actual auth/booking/media/SEO HTTP ir mobile Lighthouse. Tik tada prijungti valdomą madbeauty.lt, patikrinti DNS/TLS/redirects/canonical, laiško gavimą ir production smoke. Naujame account prieigą tikrinti; šiame perdavime Cloudflare resursai ir DNS nekeisti.

Production neatliktas; ši seka skirta kitai sesijai užbaigti darbus, ne sustoti vien dėl sėkmingo vietinio testų rinkinio. Nauji įrodymai turi savo datą, source hash ir būseną; istorinių auditų neperrašyti kaip naujo PASS.

## Nepersiunčiami duomenys

Git turi kodą, pritaikytus skills, sutartis, planus, naudojamus viešus WebP/fontus/ikonas ir atrinktus MD kvitus. Sekretai, SMTP prisijungimai, Codex/browser seansai, runtime DB, OTP, klientų duomenys, privatūs PNG originalai ir žali screenshots lieka vietiniai. Naujas kompiuteris jų negauna vien dėl clone. Atkurti prieigas atskirai; naujų rezultatų nefalsifikuoti pagal senus absolute-path kvitus.
