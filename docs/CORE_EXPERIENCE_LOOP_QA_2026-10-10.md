# Visų core agentų patirties ciklo patikra

2026-10-10. Savininkas nurodė visiems su core dirbantiems agentams taisyti praktikoje rastus bendrus code/rule/skill neatitikimus. Pradinė privati source kopija cb410ac97e5eaab5896378b4ded240d79064693f ant main d4ea8bf7384b70c4ea62a344001e3f8158812c56; public main d0fd6b7d296303bfcaafadc4071945e675a72b96. Scope ir sesijų atsakomybės [issue66](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/66); public routing [issue23](https://github.com/christianza1989/niche-public-core/issues/23).

## Rastas neatitikimas ir pataisa

AGENTS / PROJECT_CONTRACT dalis kalbėjo apie optional builder pataisas. Journal/helper ir quarantine veikė, tačiau CI vykdė fixture regresijas ir netikrino konkretaus shared change provenance. Pradinis 12 Node testų baseline PASS nepateikiamas kaip visų agentų patirties adoption įrodymas.

Canonical [CORE_IMPROVEMENT](../CORE_IMPROVEMENT.md) dabar apibrėžia privalomą ciklą visoms core darbo rolėms, konkretų foreign-owner handoff ir actual adoption. Root/start/PROJECT_CONTRACT, bootstrap ir acquisition skill įkelia tą pačią pareigą; specializuotas skill nedubliuoja viso proceso. Pakeistas tik niche-client-acquisition catalog entry SHA; SOURCE archyvai ir senų job fingerprint neliečiami. Public AGENTS/CORE_UPGRADES tik nukreipia į canonical companion; private journal duomenys ten nekopijuojami.

Naujas [checker](../scripts/core-upgrade-check.mjs) skaito committed Git blobus pagal PR SHA / merge-base ir patikrina shared source → declared exact path / real directory → naujas local-verified PASS event. Finding/fixing ar pasenusi patikra blokuojami. Bendroje bazėje esantis record/event yra append-only; SOURCE archyvo perrašymas atmetamas. Public issue įrašas su tuo pačiu failo vardu nepatvirtina private source. Plans/site-only/test-only diff nereikalauja dirbtinio upgrade. CI perduoda exact base/head env, turi commit istoriją ir vykdo checker.

## Tikri bandymai ir ribos

- Pradinis 12 journal/quarantine/freshness/bootstrap testų PASS.
- Pirmi 6 checker scenarijai / visas18 testų rinkinys PASS; po septintos cross-repo same-filename regresijos **final19/19 PASS**, be skipped/removed testų. Git fixtures tikrina realų clone/fetch ir immutable blobus; tai nėra kito PC gyvo agento reasoning testas.
- Actual seno cb410ac head auditas: **BLOCKED**, 30 shared paths; 9 uncovered (ACQUISITION_CORE, AGENTS, acquisition skill/catalog/prompt/reference ir trys CLI entrypoints). Esamų journal struktūros klaidų0. Šis pirmas neatitikimas išlaikytas; neperrašyti seni record/event ar QA. Naujas upgrade-88e1be2e-398f-403e-b96d-6c56cca2806e yra aiškiai retrospektyvus pirminio preparation perdavimo papildymas, ne pervadinta istorinė patikra.
- Current acquisition 42 offline regresijos, scoped Ruff, trijų CLI --help importas ir schema/vector exact check PASS. Tai nesukuria naujų historical model calls / live discovery / SMTP / scheduler / native signup rezultatų.
- Pirmas skill quick_validate bandymas su default ir bundled Python: FAIL, `ModuleNotFoundError: yaml`. Išsaugota lokali prerequisite problema; `uv run --no-project --with PyYAML python .../quick_validate.py SKILLS/niche-client-acquisition` → PASS, repo dependencies/uv.lock nepakeisti. Šešių packaged calibration input gate PASS; model/channel/knowledge behaviour iš jo nedeklaruojamas.

Checker yra provenance / struktūros vartas: pats nevykdo deklaruotų komandų, neįvertina pataisos semantikos, nesujungia PR, neįdiegia bootstrap kituose PC ir nekeičia active job snapshot. Repo CI nėra branch protection / visų agentų paklusnumo garantija. Kito PC actual perskaitymas / adoption ir source main statusas turi atskirus įrodymus. Hosted agentų pipeline bei Madbeauty adapterio priėmimas lieka atskiras tęsiamas pavedimas.

## Perdavimo priėmimas

Own scope: tik canonical loop / checker / bootstrap routing / viena skill nuoroda/catalog / CI / own journals ir workstream. Core PR65 control/migration0010, portalo repo source ir Madbeauty native backend/QA neliečiami. Naujas source/checks/PR įrašomas po actual commit/push; šis QA neturi fiktyvios savo būsimo commit savireferencės. [Koordinavimo dokumentas](AGENT_INTEGRATION_COORDINATION_2026-10-10.md) saugo actual vs planned integracijos ribas.
