# Šio PC ir cold-start faktinis rezultatas

2026-10-08. Dabartiniai docs/CODEX_GIT_WORKFLOW.md ir docs/CORE_UPGRADE_COLD_START.md perskaityti iš successfully fetched core f743b1cbcb09418d733fbe3c72b6968d65a72259. Companion bazė e578426610f067fd7a4db3574f754b8d06ef5426. Own fresh pair parasoplansetes-workspace-20261008; atskiri codex branches. Ankstesni stepover-business-20261008 ir pc-upgrade-20261008 darbai palikti savo kataloguose / šakose, niekas nestashinta / resetinta.

| Cold-start žingsnis | Būsena | Faktinis įrodymas / riba |
|---|---|---|
| 1 PC bootstrap / fresh pair | PASS | Canonical installer šioje tąsoje grąžino UNCHANGED target ~/.codex/AGENTS.md, fresh_session_required=true. Start / continue / handoff fresh main ancestry įrodymai saugomi; old worktrees išliko. |
| 2 tikra F1 nišos užduotis | PARTIAL | Tikras savininko domenas, BUSINESS/TOOLS, viso mokamo rezultato kelias, actual Treg ir native19page release yra. Ši sesija turi ankstesnį pokalbį, todėl **naujos sesijos be seno konteksto kriterijus UNVERIFIED**. |
| 3–4 isolated upgrade fixture / blocked restore | PARTIAL | Ankstesnė pc-upgrade šaka a68467 išsaugojo12fixture /2helper bandymus, o dabar canonical core-upgrade/freshness/bootstrap regresijos iš naujo paleistos: pc-bootstrap-tests.txt. Dabartinis F1 nedėjo konfliktinės fixture į main; autonominis naujo agento žingsnis naujoje sesijoje neįrodytas. |
| 5 PR / reviewed merge / kita sesija | UNVERIFIED | Šio scoped darbo push / handoff rezultatas atskirai HANDOFF.md. Šaltinio PR nėra adoptavimo ar runtime redeploy įrodymas. |

Ankstesnė PC audito šaka dokumentavo96 historic skill archive byte/hash neatitikimus ir uv/Docker neprieinamumą; jų nerašome PASS ir nekoreguojame istorinių fingerprintų šiame nišos scope. Installeris neperkelia GitHub teisių, credentials, pašto ar D1. Jau veikianti sesija automatiškai instrukcijų neatnaujina; ši tąsa instrukcijas aiškiai perskaitė po freshness.

Pilno CORE_UPGRADE_COLD_START PASS nėra. Kitas tikras priėmimas turi pradėti naują Codex sesiją nuo aktualaus reviewed main ir vykdyti konkrečią nišos / fixture užduotį be šio pokalbio prielaidų. Tai nėra teiginys, kad šis PC ar visos sesijos jau patvirtintos.

2026-10-09 leidimų pataisa pagal aiškų savininko pavedimą: ~/.codex/config.toml sandbox_mode=danger-full-access ir approval_policy=never; kiti nustatymai išlaikyti. Backup config.toml.before-full-access-20261009-072853.bak; bundled Python tomllib patvirtino sintaksę/abu laukus. Pirma aktyvi sesija tebebuvo managed/workspace-write. Po savininko PC perkrovimo naujas platformos kontekstas patvirtino danger-full-access/unrestricted filesystem/network/approval never. Bootstrap/credentials/GitHub teisės neperrašyti. Šis tęstinis pokalbis netapo naujos sesijos cold-start bandymu.
