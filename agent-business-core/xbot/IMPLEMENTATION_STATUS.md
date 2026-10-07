# Xbot įgyvendinimo būsena

2026-10-07 · pavedimas: veikiantis vietinis botas + riboti Treg funkcijų bandymai. Owner/root, branch `codex/xbot-treg-20261007`, nuo `origin/main e211a3d`.

- Treg CLI 0.22.0 įdiegtas iš oficialaus installerio nurodyto PyPI `tools-registry[proxy]`; login atliktas pateiktu raktu. MCP `treg` → `https://treg.to/mcp/`, `bearer_token_env_var=TREG_TOKEN` užregistruotas be raw rakto Codex config. Esama Codex sesija naujų MCP tools dar neturi; REST prieiga galima dabar.
- Authenticated GET /tools aptiko X jungtį; actual actor/scopes/media/write rezultatas dar nepriimtas.
- Runtime/GUI/worker kuriami. Biudžeto pasirinkimas pending; ilgalaikis live OFF. Pradinis funkcijų bandymas iki $0.25, be topup ar subscription, nėra pasikartojantis biudžetas.
- Docker engine šiame vykdytojuje nepasiekiamas. Socialinis modulis turės savo vietinę patvarią darbo eilę; bendro CRM/import API patikra bus atskira ir nesukurs naujo klientų registro.

Baigimas: per-modulio rezultatai ir QA bus čia atnaujinti faktiškai; testų skaičius ar dalinis commit neužbaigia pavedimo.
