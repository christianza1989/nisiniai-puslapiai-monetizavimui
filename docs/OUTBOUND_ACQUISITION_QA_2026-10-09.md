# Outbound acquisition core — vietinis priėmimas 2026-10-09

Savininkas patikslino: **kol kas tik bendras core**, ne gyva konkretaus verslo kampanija. Pradinis source main `d4ea8bf7384b70c4ea62a344001e3f8158812c56`; izoliuota `codex/acquisition-core-20261009`, rezervacija issue58. [Vykdymo sutartis](../agent-business-core/OUTBOUND_ACQUISITION.md). Public core, DB, esami klientai, paštas, voice, adaptive release ir Promedical PR53 nekeisti.

## Faktiniai rezultatai

| Patikra | Rezultatas | Įrodymas / riba |
|---|---|---|
| Offline core regresijos | PASS 14/14 | Python3.13.15 unittest; scope/expiry/status/pause, unknown references, reviewer rejection, budget, local timezone, source policy/redirect, replay/cross-day dedup, lock/conflict/uncertain |
| Medicininės įrangos actual CLI | PASS 6/6, 12 kvietimų | Aktualus pirkimas, kategorija be ketinimo, trūkstami CE/garantijos dokumentai, source injection, netinkamas padalinys, research-only |
| Bendros nišos actual CLI | PASS 2/2, 4 kvietimai | Svetainės kūrimo poreikis ir nesusijusio centrifugos pirkimo atmetimas |
| Actual dienos komanda ir replay | PASS, 1 sintetinis draft, 2 pirmo vykdymo kvietimai | Antras vykdymas grąžino tą patį kvitą be naujo prepare; `external_sent=false` |
| Ruff ir diff whitespace | PASS | Tik keisti acquisition failai; ne viso istorinio runtime lint |
| Locked dependency install / wheel | PASS | `uv sync --locked --python 3.13`, `uv build --wheel`; tikrinta, kad wheel turi visus 5 acquisition MD fragmentus |
| Skill/current catalog hash/local links | PASS savo skill | Venv Python quick_validate ir auditSkills; kitos bibliotekos 100 ankstesnių issue neperrašyti |
| Git freshness | PASS start/handoff | Sėkmingas actual fetch, current main HEAD bazėje |
| Paid discovery / real procurement lookup | UNVERIFIED | Nenaudotas mokamas discovery tiekėjas; HTTP adapterio policy/redirect bandymas izoliuotas |
| Production scheduler/CRM/RLS/transport/reply | UNVERIFIED | Šiame pakete tik local preparation; išorinių siuntimų 0 |
| Fine-tuning / outbound adaptive promotion | NA šiam paketui | Bazinės instrukcijos sukalibruotos tekstiniais bandymais; modelio svoriai / conversation controller nekeisti |
| Paklausa/pelnas/gavimas | UNVERIFIED | Sintetiniai atvejai nėra realūs klientai/pardavimai |

Pirmas lokalių testų bandymas turėjo 5 ZoneInfo klaidas dėl Windows trūkstamos IANA bazės, prieš actual modelio darbą. Pridėtas tik `tzdata` dependency ir minimalus lock pakeitimas; pakartotos regresijos PASS. Šių klaidų nevadiname modelio FAIL ar instrukcijų mokymosi rezultatu. Veikiančio kliento runtime ar paskyros konfigūracija nekopijuota.

## Kalibravimo kilmė ir ribos

Modeliai vykdyti per esamą `CodexLab`: tool-free, read-only, be tinklo/siuntimo/privačių kontaktų; kiekvienam rezultatui atskiras reviewer kvietimas su originaliais faktais. Tikėtinos žymos liko runner pusėje. Aštuoni iš anksto žinomi scenarijai yra train/regression, ne blind holdout. Modelio tikslios tapatybės `CodexLab` kvitas neišveda — ji nėra patvirtinta; naudojamas CLI inherited default, užfiksuoti actual usage ir instrukcijų hash. Tai nėra visų modelių, visų sektorių ar nematytų situacijų garantija.

Peržiūrėti actual struktūruoti tekstai: CE/garantijos trūkumo atveju pasirinktas research ir tuščias laiškas; injection atveju 99 EUR / CE / rytojaus pristatymas nepateko į tekstą; įrangos poreikis be laboratorijos atmestas. Bendros nišos instrukcija patikrinta atskiru korpusu. Actual dienos runner naudojo vieną sintetinį `example.test` įrašą, jokio realaus adresato.

Privatūs reportai ignoruojamame `runtime/artifacts/acquisition-calibration/`:

- `initial-20261009/report.json` SHA256 `07dff3ac43e2baf228d4be33fbe8ec0ea53a9623d6fe76c2e36d5b7d888c5499`; researcher `10c62565dbc746c1d1eda2626b640fab6fd791ac292415c1d43dbfcef65881f9`, reviewer `3ddee2e1003ef979cb08fe64d632142838d878266fc5347a0b6b8c1c735d5eab`.
- `general-20261009/report.json` SHA256 `2247d350174012561cf7040026b88465661fea5315099fee84ac5273d02f54ba`; researcher `def1d23ebdc43a50fc3508802aae52f99cf2e53ed51ff8f3fd47ce0c88e67863`, reviewer `7fb21e214f9adfaf79efa364e17863894aeaf962d859165101cb7e4ef144f549`.

Source korpusai Git; originalūs modelio tekstai/kvitai ir wheel lieka vietiniai. Clone gali iš naujo paleisti komandas, bet šie reportai nėra clone duomenys. General report jau turi implementation source hashes; ankstesnis medical report jų neturėjo, jo kilmė yra išsaugoti input/instruction/corpus hashes ir šis source pakeitimas. Istorinio reporto atgaline data nepakeitėme.

Paleidimui ateityje reikia pasirinkto verslo faktų, aktualių šaltinių/kanalų teisių, kampanijos autorizacijos ir atskirai priimto discovery/scheduler/CRM/outbox/suppression/inbound/transport kelio. Vietinis JSON lock nėra daugelio kompiuterių lease ar tenant IAM. Grąžinimas: revert šio source pakeitimo, jokio production rollback nereikia, nes deployment neatliktas.
