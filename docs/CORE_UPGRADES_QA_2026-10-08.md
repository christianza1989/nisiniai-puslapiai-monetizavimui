# Verslo tools / autonominis core upgrade QA — 2026-10-08

Autorizacija: savininko pavedimas apie Treg viso verslo įrankius, autonomines skills/code/rules pataisas ir atkuriamą documented karantiną. Core issue36, companion issue14. Bazės: core cac1c4491b3e0cab9ce7a73acebdb7fe51e4fb6a / public bd5fc25993195c875a1228263a7f45acb13d5000. Originalūs dirty checkout neredaguoti.

## Rezultatas

BUSINESS_TOOLS_CORE ir Git niche-business-tools įvesti naujo BUSINESS / reikšmingos plėtros metu, builder/acquisition/business-planner / PROJECT_CONTRACT / AGENTS / START_HERE / integravimo routing susietas. Planuojamas visas mokamo kliento kelias, įskaitant ateities tiekėjų / vykdymo / matavimo galimybes. Endpoint katalogas, kaina / geo / įvestys, duomenų teisės, fallback ir admission kriterijai atskiri nuo aktyvavimo. Existing SEO adapter/runtime nepakeistas.

CORE_IMPROVEMENT papildytas scoped autonomous dead-code / skill conflict workflow. Journal turi unique per-entry immutable record/events, own branch/source/evidence/rollback/checks/PR ir Git source delivery. Exact-file quarantine plan/apply/restore tik švariam tracked tekstui; traversal / Windows device paths / symlink / dirty / protected / collision / hash checks, exclusive writes, prepared recovery, original-byte Git attributes. Vienas lokalus lock nėra distributed ownership ar priešiško OS concurrency apsauga. Semantic dead-code review ir reali source/PR/kanalų patikra lieka agentui.

## Patikros ir ribos

- Vietiniai Node regression: 7 core-upgrade atvejai, 3 freshness ir 2 bootstrap atvejai. Plan/source preservation; roundtrip bytes; bad path/dirty/protected/untracked; stale source, restore collision/corrupt payload; unique journal / checks / references / foreign lock; interrupted prepared recovery; CRLF quarantine Git clone / restore; symlink refusal. Įrodytas izoliuotas fixture kelias, ne realių projektų failų nereikalingumas.
- 4 paveiktų/new skills structural validator PASS, jų4 catalog hashes PASS; 150 tikrintų local Markdown nuorodų PASS. Kataloge57įrašai; kiti SOURCE archive hash / senų personal mirrors radiniai šiuo scoped darbu neperrašyti.
- Calibration input checker6nišoms PASS_INPUTS, behaviour/knowledge/channels false, model calls0. Tai nepriskiria naujų learning rezultatų.
- Live Treg catalog search/get atlikti be provider execution, tikslus Git-safe pavyzdys core-improvements/examples/treg-selection-2026-10-08.md. Duomenų semantika / country/product coverage lieka UNVERIFIED, provider galimybės nėra mūsų operacinė integracija.
- Git diff / staged repository-safety ir Linux CI rezultatus tikrinti tiksliai PR checks; journal local-verified įrašas nurodo užbaigtus testus. Source merge tik pagal actual PR būseną ir handoff freshness; šis report neturi būsimo merge SHA.

Realūs project dead files nebuvo perkelti vien demonstracijai. Paid calls / outreach / real email / audio / DB / DNS / deploy / senų nišų migracija nevykdyti. Actual kito PC naujos Codex sesijos testas UNVERIFIED; runbook docs/CORE_UPGRADE_COLD_START.md paruoštas. Agentų darbo patirtis perduodama per reviewed main; privatus runtime learning netapo automatiniais MD perrašymais.
