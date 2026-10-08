# Aktualus core visuose PC ir Codex sesijose

Autoritetas — peržiūrėtas abiejų repo `main`. Agentas dirba vietinėje konkretaus commit kopijoje, kurios bazę patikrino sėkmingas fetch. Kiekvieno failo skaitymas tiesiai iš GitHub sumaišytų skirtingų versijų kodą ir instrukcijas. Nesujungtas PR, kito PC lokali pataisa ir private adaptive release dar nėra bendras visiems taikomas core.

## Vieną kartą kiekviename PC / Codex profilyje

Iš naujausios core repo kopijos:

```powershell
node scripts/install-agent-git-bootstrap.mjs
```

Installeris prideda vieną pažymėtą, tik šiems dviem repo taikomą bloką, išlaikydamas asmenines instrukcijas. Parenka `CODEX_HOME` arba `~/.codex`, papildo netuščias global `AGENTS.override.md`, jei toks egzistuoja, kitu atveju — `AGENTS.md`. Turi originalo backup, vieno rašytojo lock ir idempotence. Atskirą profilį galima pasirinkti `--home <path>`. Kitame PC diegimas nevyksta savaime.

Po diegimo pradėk naują Codex sesiją. [Oficiali OpenAI dokumentacija](https://learn.chatgpt.com/docs/agent-configuration/agents-md) nurodo, kad instrukcijų grandinė surenkama paleidimo metu, override turi pirmumą, o arčiau darbo katalogo esantis failas gali papildyti/keisti bendresnę instrukciją. Jau vykstančiai sesijai perduok preflight užduotį ir liepk perskaityti actual instrukcijas, arba pradėk naują sesiją. Individuali nukopijuota skill versija nėra projekto autoritetas.

Sename clone pirmiausia fetch ir skaityk `git show origin/main:docs/CODEX_GIT_WORKFLOW.md`. Jei checkout dirty ar juo naudojasi kitas agentas, iš `origin/main` sukurk savo švarų worktree, neperrašydamas originalo. Abiejų repo clone / dependencies — [MULTI_MACHINE](MULTI_MACHINE.md). Diegimas neperkelia GitHub prisijungimo, raktų ar DB.

## Startas, tęsinys ir perdavimas

Iš core repo, kai companion gretimas:

```powershell
node scripts/git-freshness.mjs --repo . --companion ../dovanos-memorycasting --phase start
node scripts/git-freshness.mjs --repo . --companion ../dovanos-memorycasting --phase continue
node scripts/git-freshness.mjs --repo . --companion ../dovanos-memorycasting --phase handoff
```

`start` reikalauja švaraus naujo workspace. `continue` ir `handoff` leidžia tavo necommitintą darbą. Visi režimai patys fetch, tikrina origin tapatybę ir current main buvimą HEAD bazėje. Feature commit virš aktualaus main leidžiami. Network/fetch klaida ar pasenusi bazė — BLOCKED. JSON rodo fetched main SHA, HEAD SHA, branch ir dirty skaičių; nespausdina origin prisijungimo ar failų turinio.

Gate nedaro pull/reset/stash/rebase, neperrašo source ir nestabdo kitų agentų procesų. Pasenusios bazės agentas išsaugo tik savo scoped darbą, integruoja `origin/main` į savo šaką, sprendžia konfliktus ir pakartoja paveiktas patikras, arba kuria naują worktree. Kito agento dirty checkout nekeičia. Po integravimo aiškiai perskaito actual AGENTS / contract / reikalingus SKILL ir PROMPT. Kiekvienam agentui atskira `codex/...` šaka, GitHub issue/PR bei failų rezervacija; WORKSTREAMS nėra distributed lock.

Dot-source `. ./scripts/activate-workspace.ps1` vykdo abiejų repo gate prieš paths konfigūraciją; tęsiant savo darbą naudok `-FreshnessPhase continue`. Patikra atliekama prieš naują pavedimą, senos sesijos tęsimą, reikšmingą generavimo/kalibravimo partiją ir Git perdavimą. Pradėtas job / pokalbis išlaiko instrukcijų snapshot; naujas job po atnaujinimo įkelia naują SHA. Nėra background pull arba promptų keitimo aktyvaus pokalbio viduryje.

Komandą galima techniškai apgaubti gate:

```powershell
node scripts/git-freshness.mjs --phase continue -- node SKILLS/business-agent-calibration/scripts/check-inputs.mjs
```

BLOCKED atveju ji nepradedama. `--` vykdo executable be shell interpoliacijos ir perduoda `PINET_SOURCE_HEAD_SHA` / `PINET_SOURCE_MAIN_SHA`. Windows naudok `node`, `python` ar `uv.exe`; shell shim nėra universalus executable pakaitalas. Wrapper neperima senų GUI, Codex app ar scheduler procesų: naują kodą/instrukcijas įkelia jų vienas owner po idle, išsaugant job fingerprint.

## Kaip patobulinimas pasiekia visus

1. Agentas savo worktree pataiso skill/core, užfiksuoja radinį, patikrina regresiją ir atnaujina savo catalog SHA. Istoriniai fingerprint / auditai nekeičiasi.
2. Atlieka freshness handoff, tikslų stage ir repository-safety, push bei scoped PR su source SHA / priklausomu companion PR.
3. Paskirtas merger peržiūri ir sujungia. Iki merge pataisa lieka šakoje. Gate nesujungia kitų PR ir neįjungia production.
4. Kiti PC per kitą fetch integruoja main arba ima naują worktree ir perskaito instrukcijas. Source merge nėra runtime redeploy ar esamų svetainių migracijos / priėmimo įrodymas.

Global bootstrap padeda aptikti net seną project AGENTS, executable gate blokuoja apgaubtas komandas. Tai nėra universalus Codex platformos hook, perimantis kiekvieną bet kurios programos failo skaitymą. Bootstrap reikia kiekviename PC; jau pradėtos sesijos turi pereiti preflight. Taisyklę ignoruojanti programa ar neapgaubtas senas procesas automatiškai neatnaujinami.

## Patikros

`node --test scripts/git-freshness.test.mjs scripts/install-agent-git-bootstrap.test.mjs` imituoja du PC su bare Git ir dviem clone: naujas remote main, dirty darbo išlikimas, feature commit, failed fetch, netinkamas origin, global override, asmeninių instrukcijų išsaugojimas ir idempotence. CI `Agent workflow` vykdo šiuos testus ir kalibravimo Git input gate PR bei manual režimu. Tai nėra visų PC įdiegimo ar actual naujos Codex sesijos paklusnumo įrodymas. GitHub privalomų checks / branch protection nustatymai yra atskira serverinė enforcement pakopa.
