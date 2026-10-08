# Darbas dviem kompiuteriais

**Privaloma actual freshness eiga:** [CODEX_GIT_WORKFLOW](CODEX_GIT_WORKFLOW.md). Vieną kartą kiekviename PC / Codex profilyje `node scripts/install-agent-git-bootstrap.mjs`, tada nauja sesija. Prieš darbą / tęsimą / Git perdavimą `scripts/git-freshness.mjs` su start / continue / handoff ir reikalingu companion. Gate atmeta failed fetch / bazę be current main, bet neperrašo active darbų. `activate-workspace.ps1` integruoja patikrą. Bootstrap nėra kitų PC remote install ar active instrukcijų hot reload.

## Naujas kompiuteris

Reikia Git, GitHub prieigos abiem privatiems repo, Node22.22+ ir npm. Python runtime papildomai Python3.13+, uv ir Docker. Codex prisijungimas yra kiekvieno kompiuterio vietinis; jo failų per Git nekopijuoti.

```powershell
mkdir pinet-workspace
cd pinet-workspace
git clone https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui.git nisiniai_puslapiai_monetizavimui
git clone https://github.com/christianza1989/niche-public-core.git dovanos-memorycasting
cd nisiniai_puslapiai_monetizavimui
. ./scripts/activate-workspace.ps1
node SKILLS/scripts/install-core-skills.mjs
npm ci --prefix content-studio
npm --prefix ../dovanos-memorycasting run install:ci
```

Npm public core installer pasirenka portable profilį, jei nėra privataus `.sites-runtime` execution profile. Windows/Linux pasirinkimas ateina iš esamo core installerio, ne iš šio dokumento. Jeigu dependency install nepavyksta, fiksuoti klaidą ir jos netaisyti senais lenovo absolute paths. Mac/Linux vietoje PS activation nustatyti `PINET_PUBLIC_CORE_PATH` į gretimą absoliutų core katalogą ir `STUDIO_NETWORK_SETTINGS` į jo `config/niche-network.json`; abiejų projektų pavadinimai ir gretimumas būtini dabartiniams studijos importams.

Vietinė Python konfigūracija sukuriama naujai, be seno DB turinio:

```powershell
cd agent-business-core/runtime
uv sync --locked
uv run python scripts/setup_local.py
```

Tai dar nepaleidžia DB, migracijų, modelių, voice/SMTP ar klientų worker. Tikrus procesus jungti pagal runtime README ir patvirtintas per-nišos teises. Niekada neįjungti dviejų gyvų worker skirtinguose kompiuteriuose vien dėl clone.

## Git darbo taisyklės abiem AI

1. Perskaityti AGENTS/WORKSTREAMS ir aktyvios nišos dokumentus. Naujas kompiuteris nepriskiriamas kitai nišai pagal seną absoliutų kelią.
2. Nuo aktualaus `main` sukurti aiškią darbo šaką, pvz. `ai/madbeauty-homepage` arba `ai/core-email-routing`. Skirtinguose kompiuteriuose nenaudoti vienos darbo šakos.
3. Prieš darbą `git fetch origin`, patikrinti `git status`; `git pull --ff-only` tik švariai savo šakai. Kitų vietinių pakeitimų neperrašyti ir neslėpti reset/stash.
4. GitHub PR registruoti darbo sritį ir planuojamus failus prieš shared-core pakeitimus. Lokalus WORKSTREAMS nėra realaus laiko distributed lock: GitHub matoma PR/issue rezervacija ir darbo savininkas yra koordinavimo taškas.
5. Keisti tik savo sritį, prasmingai testuoti ir dokumentuoti. Prieš commit tiksliai peržiūrėti `git diff --cached`, paleisti `node scripts/repository-safety.mjs . --staged` šio repo checkout.
6. `git push -u origin <šaka>`, tada pull request. Main neforce-pushinti. Vienas reviewer/merger užbaigia patikrintus pakeitimus; tik pasibaigus jam kita shared-core šaka perkelia bazę.
7. Jei keičiasi paketų sutartis abiejuose repo, du susieti PR: nurodyti vienas kito URL ir tikslius commit SHA, priėmimo testus, suderinamumą bei sujungimo eilę. GitHub nesuteikia vienos atominės transakcijos dviem repo.

Repo failai `.github/pull_request_template.md` ir `docs/GITHUB.md` padeda peržiūrai. Branch protection kol kas nenustatyta: jos prieinamumas priklauso nuo faktinio GitHub plano, nerašyti kad ji įjungta. Manual workflow nėra privalomų merge checks garantija.

## Duomenų atkūrimo ribos

Studijos approved publikavimo paketai yra companion core; juodraščiai/kalendoriai/jobs ir originals `content-studio/data/` Git neperkelti. Clone sukuria švarią vietinę studiją, ne identišką seno kompiuterio GUI būseną. Draftų migracija reikalauja atskiro redakcinio export/import sprendimo; neversti istorinių approved paketų naujais draftais savaime.

SQL/runtime case/klientų/pašto DB, operatoriaus raktai ir post-call duomenys neįtraukti. Sekretus į kitą kompiuterį perduoti atskirai privačiu būdu; jų nepridėti prie PR, issue, docs ar chat screenshot.

Istoriniai absoliutūs keliai ir lokalių testų SHA dokumentuose aprašo buvusį įrodymą, ne naujo kompiuterio paleidimo komandą. `inputs/domain-research-20261001` turi tyrimų kopiją; seni briefingų keliai po domain-sorter/output gali būti nepasiekiami clone, naudoti šį indeksą.
