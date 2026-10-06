# Nepriklausoma Dovanos123 Git perdavimo peržiūra

2026-10-06. Root peržiūrėjo PR https://github.com/christianza1989/niche-public-core/pull/3, exact head `f8aa8ef22c4608a21828279749f84949c52ab83c`, base `bb0a0e50e2a2e8f538371d2da003b2ba72eff46a`. Peržiūra vykdyta atskiroje švarioje QA kopijoje, ne originaliame dirty core. Keisti tik šio review katalogo failai; vykdytojo failai, istorinis auditas ir approvals netaisyti.

Verdiktas: staging perdavimo apimtis patikrinta, blokuojančio pakeitimo šiame PR nerasta. Tai nėra visos svetainės, vizualinio dizaino ar production priėmimas. PR nebuvo sujungtas, domenas neaktyvuotas.

- Actual Git diff: 20 pridėtų failų, jokių modifikacijų ar trynimų. Vienas staging paketas, manifestas, 15 WebP, 2 dokumentai ir vienas testų failas.
- Nepriklausomas `npm run test:core`: 49/49 PASS, 0 FAIL, 2187.2228 ms. Peržiūrėtas naujų penkių testų source: exact paketo / medijos baitai, approvals ir priklausomybių uždarumas, staging izoliacija, T−1/T/T+1 projekcija bei informacinio tikslo expiry. Pure projection nėra HTTP/cache įrodymas.
- Paketo SHA256 patikrintas iš failo: `f9a14e3a5772781afe1233fbd3ccc6041ea2bf73aef2d7a12d40924ca6b4febd`. Schema validuojama bendru validatoriumi. 11 patvirtintų puslapių, iš jų 3 straipsniai; visų 15 WebP hash tikrinami vykdytuose testuose.
- Nepriklausomas `npm run content:compile`: PASS, 9 ankstesni V1 paketai. Compiled SHA256 `afb2f23301dcac3556879ffc83f63712084ff5258a9fe709b88b8b2c9d2da40e`, sutampa su baseline. Admission failas `lib/generated/content-admissions.json` lieka `{}`.
- Actual protected-scope Git diff exit 0: `content-packages`, `public/content-assets`, `lib/generated`, `config`, `scripts`, `lib`, `app` nekinta nuo base. Working tree po compile švarus. PR diff whitespace patikra PASS.
- Nepriklausoma candidate-working-files saugos patikra: 986 failai, 506 tekstiniai, 41133820 baitų, 0 radinių; exact žinomų vietinių sekretų sutapimai tikrinti nerodant reikšmių. Kvitas `SAFETY.json`. Tai platesnė kandidato patikra, ne exact-staged režimas ir ne universalus PII įrodymas.

Prieš production lieka vykdytojo dokumentuotos privacy/terms, kontaktų/inbox, hosting/DNS/HTTPS, cutover/rollback ir exact admission spragos. Main portable build problema su trūkstamu managed hosting config ir build plugin jau nustatyta ankstesnėje root peržiūroje; kandidatas yra atskirame, dar nesujungtame public-core PR1, kuris turi ir kito projekto pakeitimų. Šios peržiūros metu build nekartotas, HTTP/SEO smoke lieka UNVERIFIED. Staging testai šių vartų neatstoja.

Madbeauty perdavimas yra atskiras root repo PR6, o ne šio PR turinys. Jokio bendrų šakų merge, deploy, SMTP, voice, FB ar mokamų kanalų įjungimo nebuvo.
