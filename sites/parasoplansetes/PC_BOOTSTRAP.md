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

## 2026-10-09 patikrinti kitos sesijos faktiniai kvitai

Tęsinyje rasti jau išsaugoti `C:/Core/cold-start-20261008/` rezultatai. Jie perskaityti, originalai nekeisti. `self-audit/cold-start-evidence-review-20261009.json` turi originalaus acceptance failo SHA, atskirų sesijų identifikatorius ir naują kvitų vientisumo patikrą.

- 1 žingsnis: ankstesnė sesija dokumentavo keturių repo / 107 failų HEAD, index, dirty ir untracked baitų išsaugojimą; bootstrap ir fresh main pora PASS. Tai jos 2026-10-08 įrodymas, ne nauja šio tęsinio viso PC atsarginė kopija.
- 2 žingsnis: tikra atskira sodybai.lt BUSINESS → TOOLS sesija ir v2 kartojimas atlikti, tačiau pats acceptance juos laiko ribotu tęstinumo bandymu. V1 praleido START_HERE / builder skaitymus, v2 turėjo aiškią testerio intervenciją. Pilnas naujos F1 svetainės bandymas ir StepOver naujos sesijos priėmimas lieka UNVERIFIED.
- 3 žingsnis: atskira konfliktinės fixture sesija po savo helperio vietos pataisymo įvykdė canonical taisyklės / catalog SHA pataisą, consumer patikrą, journal bei vieno failo plan/apply. Originalaus F1 ir fixture JSONL SHA šiame tęsinyje tiksliai sutapo su acceptance.
- 4 žingsnis: parent kvitas dokumentuoja exact-byte restore ir BLOCKED collision / dirty source / symlink / corrupt payload, 12 offline testų PASS. Šiame tęsinyje bandymai nepakartoti ir nepriskirti StepOver produkcijai.
- Atskiras review JSONL dabartinis SHA nesutampa su ankstesniu acceptance įrašu. Originalai neperrašyti; šis review transcript nepatvirtintas kaip identiškas ankstesniam snapshot. Tai nepaverčia paties fixture/F1 vientisumo nesutapusiu.
- 5 žingsnis: realūs upgrades ir patirtis yra vietinėse šakose; GitHub 403, PR / reviewed merge / main adoption neįrodyti. Nėra pilno cold-start PASS.

Papildoma švari main pora `C:/Core/parasoplansetes-cold-probe-20261009/` su savo šakomis paruošta kitam pilnam bandymui: canonical start gate 2026-10-09 07:12 UTC abiem repo PASS, tikslūs main SHA nepakeisti. Ji neturi fixture konflikto ar naujos F1 sesijos; šio paruošimo nelaikome autonominio agento bandymu. Esami darbai ir senos sesijos išsaugoti.

2026-10-09 leidimų pataisa pagal aiškų savininko pavedimą: ~/.codex/config.toml sandbox_mode=danger-full-access ir approval_policy=never; kiti nustatymai išlaikyti. Backup config.toml.before-full-access-20261009-072853.bak; bundled Python tomllib patvirtino sintaksę/abu laukus. Pirma aktyvi sesija tebebuvo managed/workspace-write. Po savininko PC perkrovimo naujas platformos kontekstas patvirtino danger-full-access/unrestricted filesystem/network/approval never. Bootstrap/credentials/GitHub teisės neperrašyti. Šis tęstinis pokalbis netapo naujos sesijos cold-start bandymu.
