# Core spragos — naujas roletaiklaipedoje.lt bandymas

2026-10-07. Bazė: private 8653b48 / public 37208b8. Tai naujas izoliuotas perkūrimas; ankstesnių auditų PASS nepaveldimi.

## G-01 — pasirinktas rašymo modelis nepasiekia proceso

Reikalavimas: savininko gpt-6-luna / xhigh; planner planning-decisions reikalauja tikro writer handover.
Reprodukcija: content-studio/src/generator.mjs codexJson argumentai turi --ignore-user-config, neturi --model ar model_reasoning_effort. Ankstesnis UI/pokalbio pasirinkimas nėra proceso nustatymas. Job neturi faktinio modelio vykdymo kvito.
Planuojamas bendras pataisymas: explicit configurable model/effort, išsaugota invocation ir CLI run metadata; jokio tylaus kito modelio fallback. Prasminga patikra: fixture patikrina argv, tikras Luna draft registruoja proceso modelį. Būsena: nustatyta, dar netaisyta.

## Darbo ribos

Tik sites/roletaiklaipedoje*, own build script/research ir šios įrodytos bendros generatoriaus spragos. Public: own renderer/CSS/fonts/assets/package, own route branch; universalūs pataisymai tik su reprodukcija. Kitos nišos, paštas, DB, DNS ir istoriniai bendri įrodymai nekeičiami. Nėra viešo deployment autorizacijos.
