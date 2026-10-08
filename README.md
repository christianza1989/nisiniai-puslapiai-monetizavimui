# Nišinių svetainių ir automatizavimo sistema

**Visiems PC ir Codex sesijoms:** [CODEX_GIT_WORKFLOW](docs/CODEX_GIT_WORKFLOW.md). Vieną kartą `node scripts/install-agent-git-bootstrap.mjs`, tada nauja sesija. Nuo tol agentai prieš darbą tikrina Git main, naudoja savo worktree ir prieš perdavimą pakartoja patikrą; nesujungtos pataisos nėra bendras core.

Privatus kelių verslų projektas: nišų tyrimai ir dokumentacija, turinio studija, SEO/GEO sutartys, agentų runtime, projektui pritaikyti skills ir Madbeauty platformos prototipas.

**Pradėti:** [AGENTS.md](AGENTS.md), [START_HERE.md](START_HERE.md), [WORKSTREAMS.md](WORKSTREAMS.md). Madbeauty kūrimas: [projekto roadmap](sites/madbeauty/PROJECT_ROADMAP.md).

## Du gretimi projektai

```text
workspace/
  nisiniai_puslapiai_monetizavimui/  # šis repo: studija, agentai, skills, tyrimai
  dovanos-memorycasting/           # atskiras repo: viešų svetainių variklis
```

Viešas core yra priklausomybė: studija tiesiogiai naudoja jo medijos ir paketų sutartis. Neklonuoti vien šio repo ir nesitikėti, kad veiks visas tinklas. Tikslūs clone/install žingsniai: [MULTI_MACHINE](docs/MULTI_MACHINE.md). Saugyklų bei snapshot ribos: [GITHUB](docs/GITHUB.md).

**Kitam AI, prijungiančiam savo projektą:** [INTEGRATING_A_PROJECT](docs/INTEGRATING_A_PROJECT.md) — kas bendra, kas nišos modulis, siteId, adapteriai ir priėmimo eiga.

**Verslo agentų kalibravimui:** [business-agent-calibration skill](SKILLS/business-agent-calibration/SKILL.md) — naujos nišos scenarijai, core + nišos instrukcijos, mokymosi / adoption / rollback patikra ir atskiri tikro balso / pašto įrodymai. [Git perdavimo būklė](docs/AGENT_CALIBRATION_HANDOFF_2026-10-08.md) atskiria main, nesujungtus balso PR ir privačius runtime duomenis.

GitHub kopijų diegimo ir testų įrodymai bei ribos: [GITHUB_TRANSFER_REPORT](docs/GITHUB_TRANSFER_REPORT.md).

## Pagrindiniai moduliai

- `content-studio/` — vietinis turinio GUI, planai, juodraščiai ir paketų eksportas. Node priklausomybės iš npm lock.
- `agent-business-core/runtime/` — Python/PostgreSQL agentų modulis. `uv.lock`, atskira vietinė konfigūracija; gyvi kanalai nepradedami vien įdiegus.
- `SKILLS/` — projektui pritaikytos instrukcijos ir promptai. Nereikia jų kopijuoti į vieno kompiuterio `C:/Users/lenovo/.codex`.
- `sites/` — nišų planai, dabartiniai assets ir prototipai; faktinę kokybę/paleidimą/paklausą vertinti atskirai.
- `domain-sorter/`, `domain-history/` — domenų atranka ir istorijos tyrimas.
- `inputs/domain-research-20261001/` — atrinktų analizių ir top200 CSV momentinė kopija, be SQLite ar darbo sesijų.
- `voice-agent-plan/`, `business-development/` — integracijos ir plėtros dokumentai.

Turinio studija: `npm ci --prefix content-studio`, tada `npm --prefix content-studio start`; klausosi localhost4317. Madbeauty esamas UI kit: `node sites/madbeauty/prototype/server.mjs`, localhost8786; pilnos platformos būklė jos roadmap. Nepainioti kit peržiūros su gyva svetaine.

## Ko Git nesinchronizuoja

Slaptažodžiai, `.env`, klientų/runtime DB, studijos `data/`, build output, browser profiliai, žali tyrimų artefaktai ir istorinės FIRST-RUN kopijos lieka vietiniai. Saugios source/media kopijos nėra istorinių auditų atkūrimo ar veikiančių paskyrų migracijos įrodymas. Sena `fabrikas-github-upload/` archyvinė sistema neįtraukta dėl atskiros slaptos konfigūracijos; originalas šiame kompiuteryje nepanaikinamas.

Kiekvienas AI dirba savo šakoje. Sinchronizacija per commit/push/pull request, ne per bendrą live DB ar automatinį pakeitimų perrašymą. [Darbo tarp kompiuterių taisyklės](docs/MULTI_MACHINE.md).
