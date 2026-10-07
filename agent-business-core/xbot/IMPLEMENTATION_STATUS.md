# Xbot įgyvendinimo būsena

2026-10-07 · pavedimas: veikiantis vietinis botas + riboti Treg funkcijų bandymai. Owner/root, branch `codex/xbot-treg-20261007`, nuo `origin/main e211a3d`.

- Treg CLI 0.22.0 įdiegtas iš oficialaus installerio nurodyto PyPI `tools-registry[proxy]`; login atliktas pateiktu raktu. MCP `treg` → `https://treg.to/mcp/`, `bearer_token_env_var=TREG_TOKEN` užregistruotas be raw rakto Codex config. Esama Codex sesija naujų MCP tools dar neturi; REST prieiga galima dabar.
- Authenticated GET /tools, MCP initialize/tools/list, CLI balance/catalog patikrinti. Actual actor **@synthaudio** ir recent search 10 rezultatų HTTP 200. $0.07 actual bendros probe išlaidos. MCP registracija nėra dabartinės app sesijos naujų tools prisijungimo įrodymas.
- Vietinė SQLite eilė, per-nišos politika, kalendorius/GUI, atominis spend/dispatch ir account lease, conservative review/URL/fact/media vartai, Treg transportas ir worker sukurti. 28 local/helper tests PASS; actual Chrome login/day/calendar/post queue/review patikrintas be live credentials. [QA](QA.md) aiškiai skiria local, connection ir live vartus.
- **Actual Codex CLI prieiga nepavyko:** tiek numatytasis modelis gpt-5.4, tiek configured gpt-6.1-sol atmetami CLI ChatGPT paskyrai. Scalar model pasirinkimas perduodamas runneriui be user tools/config; tai nepataisė realios paskyros prieigos. Generavimas default OFF; capability failure pristabdo kanalą. Reikia realaus sėkmingo CLI draft+review prieš įjungimą.
- Biudžeto pasirinkimas ir @synthaudio paskirtis PhoneBridger pending; ilgalaikis live OFF/0. Pradinis funkcijų bandymas iki $0.25, be topup ar subscription, nėra pasikartojantis biudžetas. Post/media/reply/DM gyvai neišbandyti ir nesiųsti.
- Docker engine šiame vykdytojuje nepasiekiamas. Socialinis modulis turės savo vietinę patvarią darbo eilę; bendro CRM/import API patikra bus atskira ir nesukurs naujo klientų registro.
- Approved-facts projekcijos ir X CaseSource adapteris **dar neįgyvendinti**, ne vien „nepatikrinti“. Source signalai nėra website_d1 formos. Reply/DM schema/gates nėra actual X approval.

Aktualus rezultatas: **Treg setup completed; Xbot partial_execution, visas pavedimas dar nebaigtas**. Git draft PR25 saugo įgyvendintą paketą, nėra gyvos kampanijos priėmimas. Likę darbai ir actual prieigos vartai — ROADMAP/RUNBOOK. Owner modelio pasirinkimo nekeisti bandant apeiti backend atmetimą.

Baigimas: per-modulio rezultatai ir QA bus čia atnaujinti faktiškai; testų skaičius ar dalinis commit neužbaigia pavedimo.
