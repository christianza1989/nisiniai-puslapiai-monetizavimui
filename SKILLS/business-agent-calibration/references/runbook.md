# Atkuriamas kalibravimo ratas

Komandos pateiktos iš `agent-business-core/runtime` katalogo. Keliai yra santykiniai; companion clone paprastai vadinamas `dovanos-memorycasting`. Naujo kompiuterio paruošimas — [MULTI_MACHINE](../../../docs/MULTI_MACHINE.md); runtime konfigūracija ir DB rolės — [runtime README](../../../agent-business-core/runtime/README.md). Nenaudok seno kompiuterio `.env`, veikiančios DB ar kitų sesijų procesų kaip savo testų aplinkos.

## 1. Įvestys iš Git, prieš modelių kvietimus

Iš repo root paleisk:

```powershell
node SKILLS/business-agent-calibration/scripts/check-inputs.mjs
node SKILLS/business-agent-calibration/scripts/check-inputs.mjs --site traktoriupadangos
```

Tai offline struktūros / registry hash / nuorodų patikra, ne agento elgesio ar knowledge freshness įrodymas. Naujas profilis be procedūrų ar apsaugoto korpuso turi likti neprijungtas. Dabartiniai šeši profiliai nereiškia visų tinklo svetainių agentų.

Prieš DB darbą privačiai paruošk atskirą runtime admin ir ribotą app rolę bei aktualias migracijas. `uv sync --locked` įdiegia Python paketą; Codex CLI turi būti prieinamas ir autentifikuotas atskirai. Esamo `bootstrap.py` fresh DB rolės / migration tvarkos pataisa yra [core PR32](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/32): jei ji nesujungta tavo bazėje, pirmiau imk suderintą to PR šaką arba dokumentuok priklausomybę, neapeik RLS suteikdamas app administratoriaus teises. Private key reikšmių nespausdink.

Tekstiniam lab reikia `PINET_ENVIRONMENT=local`, `PINET_ALLOW_SIMULATION=true`, `PINET_VOICE_ENABLED=false`, `PINET_SMTP_ENABLED=false`. `PINET_LEARNING_ENABLED=false` pradiniam palyginimui; atskiram autonomijos stebėjimui jį įjunk savo privačiame profilyje. `PINET_LEARNING_NAMESPACE=local` leidžia vietinius release. Išjunk lab mail siuntimą ir žinių auto-refresh, kai lygini užšaldytas įvestis. Ribok Codex kvietimus bei laiką; `--max-calls` yra modelio kvietimų limitas, ne USD sąskaitos limitas. Jev / Gemini turi atskirus raktus ir rezervus.

## 2. Naujos nišos modulio prijungimas

Perskaityk actual `profiles.py`, `agent_instructions.py`, `onboarding.py`, `learning_controller.py` ir public registry. Tam pačiam siteId / canonical host pridėk:

- patvirtintą BUSINESS / kontaktą ir faktų kilmę;
- tipizuotą profilį su leistinais `need_fields`, field notes ir tikru next step;
- `src/pinet_core/instructions/niches/<siteId>/conversation.md`, `sales.md`, `supplier.md` pagal nišos klausimus ir realius mandatus;
- savą sintetinį korpusą su train ir nematytu holdout bei `evals/learning-v2/registry.json` hash, jei ta niša bus priimta dabartiniam mokymosi controller.

Bazinis quality fragmentas bendras, bet compose jam prideda nišos conversation. Nesukurk antro scheduler / mail / invoice / knowledge core. Viešo registry pakeitimas — atskiras mažas shared langas ir companion testai. Esamo corpus failo nekeisk atgaline data; naujam elgesio rato rinkiniui naudok naują katalogą / versiją. Controller canonical corpus atnaujinimą prižiūri operatorius/kodo PR, ne mokomas agentas.

Profilio įregistravimas DB vykdomas `scripts/network_bootstrap.py` su peržiūrėtu mapped registry, naudojant admin prisijungimą. Visų viešų svetainių registry jam netinka, jei dalis dar neturi profilių. Admission, channel policy ir corpus lieka atskiri. `/operator/sites/<siteId>/onboarding` reikalauja jau priimto KnowledgeState; `source_ready=true`, `learning_admitted=true` leidžiami tik tinkamai v1 knowledge + protected corpus. V2 šaltiniai dabartiniam mokymosi evaluator neprijungti; nepaversk v2 į v1 vien vartams apeiti.

## 3. Žinios ir scenarijai

Actual patvirtintą vietinę public projekciją sukurk esamu helperiu. Pavyzdys iš runtime, kai clone gretimas:

```powershell
node scripts/network_manifest.mjs ../../../dovanos-memorycasting artifacts/network-calibration/knowledge
```

Patikrink `registry.json`, būtent savo site failą, kontakto atitikimą, šaltinio schemos versiją, faktiškai eksportuotą tekstą ir freshness. Viešos projekcijos buvimas neįrodo live domeno deployment. V1 tekstinis lab priima `Knowledge`, V2 priėmimas turi savo transportą ir vartus. Neapsimesk, kad netilpusi ar adapterio praleista informacija jau žinoma. Lyginimo metu neredaguok / neatnaujink manifestų; jų galiojimui nepakankant užbaik originalų bandymą kaip incomplete ir parenk naują snapshot bei run.

Corpus pradėk pagal esamą `evals/learning-v2/<siteId>.json` struktūrą, ne kopijuodamas padangų faktus. Per-case laukai: `id`, `label`, `split`, `messages`, `expected_need`, `contact`; kontaktų atvejams papildomi `contact_at`, `contact_channels`, atsisakymui — `refusal`, `refusal_at`. `test_recipient` laikyk privačioje lab konfigūracijoje; naujuose Git korpusuose naudok rezervuotą `.example`, o ne žmogaus paštą. Kliento tekstas neturi testų rezultatų ar evaluator instrukcijų.

Dabartinis learning-v2 turi 7 unikalius atvejus: 3 train + 4 reserve holdout. Aptiktas šaltinio atvejis perklasifikuojamas train, lieka bent 3 nematyti holdout. Controller daro po 2 baseline ir candidate pakartojimus, iš viso 14 stebėjimų kiekvienai versijai. Tai actual šios versijos mechanizmas, ne universali pakankamos imties garantija. Plėsk korpusą pagal nišos riziką suderintu nauju evaluator / registry, išlaikant senų įrodymų kilmę.

## 4. Tekstinis ratas ir Jev ON/OFF

Pirmam fiksuotam ratui naudok esamą runner, unikalų run ID ir iš anksto pasirinktą ribą:

```powershell
uv run python scripts/network_lab.py --site traktoriupadangos --phase evaluation --include-holdout --corpus-dir evals/learning-v2 --run-id tractor-calibration-off-20261008 --jev-mode off --max-calls 110 --timeout-retries 0 --followup-attempts 3
```

`--phase evaluation --include-holdout` vykdo visus pasirinkto rinkinio atvejus. `--only <caseId>` naudok diagnozei, bet toks report nėra pilnas priėmimas. `--knowledge-file` ir `--pin-release-file` gali užfiksuoti private įvestis po `artifacts/`; candidate fragmentas — `--patch-file` JSON su `instruction`. Prieš baseline/candidate pinning patikrink actual adaptive release, kad abu palyginimai negautų tarp jų pakeistos versijos. `--as-of` yra ataskaitos data, ne knowledge freshness pratęsimas.

Runner naudoja realų FastAPI app per ASGI, PostgreSQL, claim ir core tools; modelis yra Codex CLI, popup ACK imituojamas. Tai bendro serverinio kelio tekstinis testas. Nei tinklo HTTP, nei Gemini Live audio, nei tikras browser popup nėra tokiu vykdymu įrodyti. Klaidas ir CLI timeout skaityk per-case; vien process exit 0 dar nėra `all_checks_pass=true`.

Jei routeris priimtas ir turi savo kvietimų / išlaidų ribą, tą patį užšaldytą rinkinį bei release vykdyk su `--jev-mode on` ir kitu run ID. Nekeisk learning aktyvios versijos tarp poros. Palygink actual Jev provider attempts, fallback / stale rekomendacijas, tool pasirinkimą, klaidas, delsą ir sąnaudas; vien įjungtas flag nėra adapterio naudos įrodymas. Nė vienas routerio atsakymas nesuteikia serverio policy draudžiamų tools.

Scenarijams po pokalbio atskirai išbandyk reviewed laišką, kliento atsakymą „per brangu“, duomenų papildymą, pasiūlymo patvirtinimą ir patvirtinimo pasenimą. Tylos follow-up testuok su valdomu laikrodžiu / atskiru atveju, ne laukdamas parą. Jei tokio worker / siuntimo mandato nėra, žymėk neprijungta. PDF tikrink skaičiavimus, issuer profilį ir patį render; kliento patvirtinimo simuliacija nėra realus sandoris.

## 5. Mokymosi stebėjimas

Užfiksuok prieš ratą bazinių MD ir adaptive pointer hash, tada atlik šviežią stebėjimo run:

```powershell
uv run python scripts/network_lab.py --site traktoriupadangos --phase evaluation --include-holdout --corpus-dir evals/learning-v2 --run-id tractor-learning-observe-20261008 --jev-mode off --max-calls 110 --timeout-retries 0 --followup-attempts 3 --observe-learning --learning-enabled --learning-namespace local
```

Tai gali pakeisti actual **vietinę** aktyvią instrukciją. Vykdyk savo izoliuotoje DB/aplinkoje ir release srityje, netaikyk kitos sesijos shared `local` pointer. Patikrink admission ir controller `environment_allowed` before start. `--max-calls` riboja lab dialogą; controller turi papildomus proposer / palyginimo kvietimus. Iš anksto numatyk bendrą jų ribą ir nutraukimo kriterijų. `network_learning_round.py` yra istorinis šešių nišų learning-v1/36 atvejų driver su fiksuota data, ne universali naujos nišos komanda. `prepare_learning_v2.py` kuria istorinį katalogą su `exist_ok=False`; jo nepaleisk tam, kad perrašytum jau esamą protected rinkinį.

Sek `artifacts/learning-jobs/<jobId>/<generation>/`: šaltinio issue, teisingą root cause, pasiūlymą, incumbent/candidate reports, split, hash ir final decision. `awaiting`, candidate failas ar observation delta dar ne promotion. Equal / worse / incomplete kandidatas turi likti atmestas. Žinių klaida nukreipiama redakcinei peržiūrai, tool/STT klaida — kodo/kanalo taisymui. Nesukurk prompto, kuris pateisintų neteisingą tool rezultatą.

Jei yra priimtas vietinis active release ir viešas v1 manifestas, atskirai patikrink actual pritaikymą:

```powershell
uv run python scripts/verify_learning_adoption.py --site traktoriupadangos --run-id tractor-adoption-20261008
```

Šis skriptas tikrina naują core claim su active hash, seno pokalbio snapshot išlikimą, kitų nišų nepakitimą, operatoriaus rollback ir exact pointer restore. Jis laikinai perjungia vietinį pointer: turi būti vienintelis tos nišos release rašytojas. Rollback įrodymas nėra autonominio online regresijos rollback trigger įrodymas. Kai kandidatas teisingai atmestas, acceptance gali turėti PASS atmetimui ir NA adoption, su konkrečia priežastimi; neišgalvok aktyvuoto mokymosi.

Tikro HTTP + background jobs testą vykdyk atskirai be manual `jobs.run_one` ar runner postcall pakeitimo. Pagal aktualų audio / transporto runbook atlik realų browser/RTC tęsinį. Tekstinis local promotion neįjungia production/audio canary. Baigus pateik [matricą ir minimizuotą ataskaitą](acceptance.md), ne vien bendrą balų sumą.
