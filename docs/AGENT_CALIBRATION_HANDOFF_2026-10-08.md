# Agentų kalibravimo Git perdavimas — 2026-10-08

Vienas vykdymo startas: [business-agent-calibration skill](../SKILLS/business-agent-calibration/SKILL.md), jo [runbook](../SKILLS/business-agent-calibration/references/runbook.md) ir [priėmimo matrica](../SKILLS/business-agent-calibration/references/acceptance.md). Šį darbą gali tęsti kitas agentas iš Git clone, neprivalėdamas perskaityti seno Codex pokalbio. `AGENTS`, projekto skill katalogas ir projekto prijungimo startas nukreipia į tą patį šaltinį; kopijuoti visą skills rinkinį į global Codex katalogą nereikia.

## Kas jau buvo Git

Patikrinta bazė: core origin/main `8653b48`, companion origin/main `37208b8`. Core jau turi packaged core + šešių nišų conversation/sales/supplier instrukcijas, profilius, Codex tekstinį runner, learning-v1/v2 korpusus, evaluator, adaptive registrą, mokymosi controller, admission ir adoption/rollback skriptą. Tai ne vien šio agento atmintyje.

Metodikos istorija saugoma [SELF_CALIBRATION](../voice-agent-plan/SELF_CALIBRATION.md), [TEXT_CLIENT_LAB](../voice-agent-plan/TEXT_CLIENT_LAB.md), [NETWORK_CALIBRATION](../voice-agent-plan/NETWORK_CALIBRATION_2026-10-01.md), [JEV_CALIBRATION](../voice-agent-plan/JEV_CALIBRATION_2026-10-01.md), [AGENT_CALIBRATION](../voice-agent-plan/AGENT_CALIBRATION_2026-10-02.md) ir [AUTONOMOUS_LEARNING](../voice-agent-plan/AUTONOMOUS_LEARNING_2026-10-03.md). Šios datuotos ataskaitos lieka originalių vykdymų įrodymais, ne vienas aktualus onboarding installeris. Naujas skill sujungia operacinę eigą ir tikras ribas; šio dokumentavimo metu naujas apmokamas kalibravimo ratas nevykdytas.

## Nesujungtas balso tęsinys

2026-10-08 patikrinta: [core PR32](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/32) ir [companion PR9](https://github.com/christianza1989/niche-public-core/pull/9) OPEN / draft, dar ne main. Core head `bc34e9b9491aff159216bceb19f93e7e4b6ddf5c`, companion head `e6f763ba86e70e70543de311417740a489784748`.

Juose yra tikro Gemini 3.8 Live RTC ir postcall probe skriptai, provider structured output / finalization pataisos, worker readiness, browser garso starto pataisos bei nauji jų runbook/implementation status. Skaityti PR šakos `sites/traktoriupadangos/IMPLEMENTATION_STATUS.md` ir `voice-agent-plan/VOICE_LAUNCH_2026-10-07.md`. Jų failų nebuvimas main clone nėra tavo konfigūracijos klaida. Du suderinti PR turi savą merge/rollback eigą; šis naujas dokumentavimo PR jų automatiškai nesujungia ir neįdiegia.

Ankstesnio vietinio balso bandymo ataskaita aprašo realų RTC/audio, kontaktų įrankį, final transcript, Flash draft/review ir vieną owner preview laiško matching inbox gavimą. Tai nėra viešo traktoriupadangos.lt paleidimo ar visų nišų audio sertifikavimas. Public deployment, visas browser reconnect bei prarastų STT žodžių/kiekio coverage turi atskirus likusius vartus. Previews / process IDs / `.env` iš seno kompiuterio nelaikomi veikiančiais naujame clone.

## Ką perduodame, ką atkuriame

Git perduoda bazines instrukcijas, kodą, sintetinius scenarijus, užrakintą dependencies ir minimizuotas ataskaitas. Git neperduoda kliento istorijos, privačių dialogų / laiškų / PDF / audio, aktyvių individualių adaptive release, DB, paslapčių ar prisijungimų. Private artefaktų nuoroda datuotoje ataskaitoje nereiškia, kad tas failas yra clone. Naujoje aplinkoje agentas paruošia savo DB ir konfigūraciją, projektuoja aktualius approved faktus, užfiksuoja šaltinius ir iš naujo įrodo actual learning adoption. Peržiūrėtą bendrą elgesio pataisą galima perkelti į bazinį Git fragmentą tik su jos kilme ir paveiktų nišų regresijomis, be privataus transkripto.

Core + nišos sutartis turi vieną savininką šiame repo. Public repo dokumentai pateikia nuorodą į skill ir savo UI / HMAC / host / policy boundary, ne antrą kalibravimo promptų kopiją. Kiekvienas naujas nišos agentas privalo remtis actual source/admission; svetainės buvimas neįjungia jos learning, voice ar mail.

Patikros ir ribos: [AGENT_WORKFLOW_QA](AGENT_WORKFLOW_QA_2026-10-08.md). Kelių PC / Codex sesijų actual startas: [CODEX_GIT_WORKFLOW](CODEX_GIT_WORKFLOW.md). Source/merge/runtime/deployment būsenos vertinamos atskirai.
