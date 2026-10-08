# Agentų kalibravimo ir kelių PC workflow patikra

2026-10-08. Savininko pavedimas: Git turi perduoti kalibravimo metodiką ir agentai skirtinguose PC / Codex sesijose turi tikrinti aktualų core. Scope issue34 ir companion issue12. Bazės: core8653b48, public37208b8. Keisti tik savo naujas instructions/scripts/tests, routing/docs, CI ir activate-workspace; runtime, studio generator, protected korpusai, klientų įrašai ir kanalų flagai nepakeisti.

## Įrodymai

- `quick_validate.py SKILLS/business-agent-calibration`: PASS. Projekto catalog turi vieną naują business-operations/project-library entry su actual entry SHA; originalių įrašų reikšmės nepakeistos.
- Naujas offline preflight: visi6 esami profiliai PASS_INPUTS, packaged core/roles/niche fragments ir visų42 protected learning-v2 atvejų canonical hash/split/count patikrinti. Tai nėra jų naujas modelio kalibravimo ratas.
- Trys neigiami bandymai disposable kopijoje: pakeistas corpus hash, trūkstanti sales procedūra ir unknown site atmesti. Originalūs korpusai / fragmentai nebuvo keičiami.
- `node --test scripts/git-freshness.test.mjs scripts/install-agent-git-bootstrap.test.mjs`:5/5 PASS. Du clone imituoja du PC. Naujas main aptinkamas, dirty source lieka identiškas, savi feature commit leidžiami, dirty start ir failed fetch / unknown origin atmetami. Global managed block išlaiko asmenines instrukcijas, idempotence ir active override pirmumą. Pradinio testų vykdymo CRLF/LF assertion pataisytas į actual originalo nepakitimo patikrą; source veikimas dėl to nebuvo keičiamas.
- Actual abiejų repo `continue` fetch gate PASS_FRESH_BASE, missing main commit0 abiejuose. Jo executable wrapper paleido offline calibration checker tik po PASS. Node syntax, PowerShell parser ir `git diff --check` PASS.
- Pilnas esamo katalogo auditas tikrina56 skills; naujo skill issue0, jo local links galioja. Visame senajame rinkinyje lieka100 ankstesnių issue:96 originalų source archive hash ir4 asmeninės installed kopijos/junction nurodo kitą checkout. Šio pakeitimo metu jų netaisėme ir istorinių SHA neperrašėme. Visas katalogas nevadinamas PASS.

## Ko šis rezultatas neįrodo

Šio dokumentavimo / Git workflow rato modelių kalibravimo kvietimų0. Neperkalibruoti klientų agentai, neatnaujinti jų private adaptive release, netestuotas naujas Gemini audio, neišsiųsti laiškai, nepakeisti supplier / invoice / production mandatai. Ankstesnis actual audio kodas tebėra atskiras corePR32/publicPR9, jo įrodymai nėra šių offline patikrų rezultatai.

Global bootstrap gali būti įdiegtas šiame PC; kituose PC jis turi būti paleistas vieną kartą. Pradėtas Codex pokalbis / GUI pats instrukcijų neįkelia iš naujo, jau pradėtas job išlaiko savo snapshot. CI source regression ir executable gate yra tikri techniniai patikrinimai, bet ne universalus visų programų filesystem/Git hook. GitHub branch protection / required status nustatymas šiame pakeitime neatliktas. Visų jau veikiančių sesijų paklusnumas bei kito PC actual install šiame rate nepatvirtinti.

## Git priėmimo eiga

Scoped commit / PR → actual CI → root peržiūra → core merge → companion dokumentų merge → sėkmingas fresh clone/worktree preflight. [Kalibravimo perdavimas](AGENT_CALIBRATION_HANDOFF_2026-10-08.md) ir [CODEX_GIT_WORKFLOW](CODEX_GIT_WORKFLOW.md) yra kitam agentui vykdomas startas. Main sujungimo SHA ir PR faktai bus įrašyti po jų actual atlikimo; vietiniai testai nėra merge ar runtime deployment.
