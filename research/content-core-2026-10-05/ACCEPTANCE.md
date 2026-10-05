# Bendro turinio workflow priėmimas — 2026-10-05

Įgyvendinta bendra privati visų nišų eiga pagal [CONTENT_CORE](../../CONTENT_CORE.md). Atskiro Madbeauty planavimo / optimizavimo / eksportavimo modulio nekurta. Vietinė įgyvendinimo patikra nėra visų svetainių atlikta migracija ar production paleidimas.

| Patikra | Faktinis rezultatas |
|---|---|
| Studija `npm test` | 30/30 PASS, 10714.5801 ms. Pradinė nesėkmė: editorial-skill fixture neturėjo naujo privalomo reference; papildytas ir patikrintas jo fingerprint pasikeitimas. |
| Po scheduler cleanup: workflow + generator-policy | 6/6 PASS, 3968.7166 ms |
| Public core `npm run test:core` | 44/44 PASS, 6755.5468 ms; public source šiuo inkrementu nekeistas |
| Skill catalog / links / archives | 54 skills, 0 issues, PASS_STRUCTURE_AND_CONFIGURATION |
| Source syntax / Git whitespace | PASS |
| Actual CUA izoliuotas GUI | A:24 straipsnių tikslas, B:6; A link promotion0/1→1/1, B nepakitęs0/1; nepatvirtintas release atmestas; peržiūros ir vaizdo kliūtys matomos; 0 JS errors |
| GUI maketas | Pirmas screenshot atskleidė trijų stulpelių page-row neatitikimą; pakeista tik workflow į du stulpelius, persikrovus patikrintas skaitomas sąrašas |

Nauji testai tikrina DST (įskaitant neegzistuojantį/dviprasmį laiką), dviejų nišų izoliaciją, tarpusavyje susietą atominį approval, future link eligibility prieš/po datos, missing/foreign/revoked targets, guide media/source vartus, stale review po teksto/faktų pakeitimo, actual HTTP origin guard, V2 rich blokų/šaltinių/autorių išsaugojimą bei pakeistų exported media baitų atmetimą. Generatoriaus fixture su tikru lokaliu child procesu tikrina 27 straipsnius per kelias partijas; tai nėra 27 tikrų useful straipsnių kokybės įrodymas.

GUI bandymui naudotas savas loopback ephemeral procesas ir OS temp DATA/OUTPUT su `.example` sintetiniais domenais. Actual studijos data/output, Madbeauty backend/site failai, SMTP, balsas, FB, DNS ir deployment nekeisti. Vietiniai raw įrodymai `QA.json`, `skills-verification.json`, `workflow-ui.png` lieka šiame kompiuteryje pagal repository safety; jų nebuvimas clone nėra runtime PASS. Screenshot nėra svetainės dizaino / Lighthouse balas.

Likę vartai: reali kiekvieno teksto / šaltinių / vaizdų / rendered puslapio agento patikra; built-in ImageGen atskiras žingsnis; V2 tekstinis generatorius OFF; Madbeauty tikrų filtro/paslaugos URL adapteris ir actual HTTP SEO prieš/po datos dar PENDING. Legacy turinys neturi retroaktyvaus PASS. SHA patikra neįrodo šaltinių teisingumo, delivery, deployment ar paklausos.

## Testuoto source LF SHA-256

- `content-studio/src/content-schedule.mjs`: `3945c44edf829e7e624f39f17b78479e09c6a2d77ccfe12dccd21c668cc24fb3`
- `content-studio/src/content-workflow.mjs`: `d6f8d377357fd60599fa28e96e469714f005cdbf8c446a96df0de05d1ffba20d`
- `content-studio/src/content-release.mjs`: `60a6729fd609f108147843ef731af37b43f81f8138ab41eddb8c6f62d45e73f2`
- `content-studio/src/model.mjs`: `77888bacbc10d120140dcdc7075f84298c28a5dcc38ca0d4f2a577c8fb8a4cc2`
- `content-studio/src/generator.mjs`: `95e32427337ee206e7aecda18827de18444a6cce5d8760e69f6858adb4a923c3`
- `content-studio/src/server.mjs`: `227d066fc827a95c0cf36c939cfbe0d602c7c0b0f5020b0a99ba697a41522522`
- `content-studio/src/editorial-skill.mjs`: `b6634825b01baa2bdc21918511b86026fe043ffd0989e0d33c4e5ff0f3fa0653`
- `content-studio/public/app.js`: `73b863634e8f2d6f7df982c9644fb4759fe52bc1bdaed42955b9d0a832dbabbb`
- `content-studio/public/style.css`: `f74b80b6358ed0b05a197496bb74bc4603300b16d76614af3aab2f98621fd8a6`
- `content-studio/scripts/content-workflow.mjs`: `3b7683c6c9d8c8e56f1b724e595c1b82123c44a08083b72000d945984de20b33`
- `content-studio/scripts/verify-content-release.mjs`: `39c6169832a3e6b35278852988571e5489557a62082d826aabdee4df484db28b`
- `content-studio/test/content-workflow.test.mjs`: `3fbcdbd4096ea16f819fc9d111f1c005e343730e81755d2177eb658388584bce`
- `content-studio/test/generator-policy.test.mjs`: `fe07435eadbdb6b5b213a89aac414e01963d5be77338caf2fac490d0d77366e8`
- `content-studio/test/editorial-skill.test.mjs`: `657091ab215c34eaedbf9750c104b4242921e9b08a5349fe4826b7bdd45a80eb`
- `SKILLS/niche-content-planner/SKILL.md`: `9b73d45202b975dcff23eb35568e8a85f9e6bd34a4d10301b2b41a9d4a7ad200`
- `SKILLS/niche-content-planner/references/content-workflow.md`: `48a2d027b933a5adb1ab2573d0627407c67b1588eaf612ee975f6d9f8c7e140b`
- `SKILLS/niche-content-planner/references/studio-contract.md`: `8226fcbc32151126f90aadf45d44c95a781e3af3c2dc62ac965c5ae2dbbc1a33`
