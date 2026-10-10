# Kasdienė aktyvi B2B klientų paieška

2026-10-10: pilnas tolesnės sistemos [planas ir architektūra](acquisition-plan/README.md), [roadmap](acquisition-plan/ROADMAP.md) ir [Madbeauty teikėjų pilotas](../sites/madbeauty/ACQUISITION_PILOT_PLAN.md). Žemiau dokumentuojamas jau įgyvendintas vietinis research/draft parengimo etapas; planuojami production adapteriai nėra jo atliktos patikros.

Actual free Treg discovery found ignored requested domain exclusions and off-target city/activity results. The acquisition-owned `review_discovery_urls()` now enforces caller-owned domain/subdomain exclusions and unsafe/duplicate URL refusal locally. Remaining URL-only rows are `primary_read_required`, not Prospects, source-read approval, verified location/intent or contacting rights. Source retrieval still uses the explicit bounded catalogue. This reusable guard is not wired to a production Treg discovery/scheduler/transport adapter; actual LT research evidence and limits are in [the separate draft-only QA](../docs/ACQUISITION_LT_DRAFT_DISCOVERY_QA_2026-10-10.md).

Papildomas 2026-10-10 savininko pavedimas: explicit `provider_signup` kampanijos tikslas su `provider` prospect role, išlaikant `product_sale`/`buyer` numatytą elgesį. Įgyvendinta uždara [daugelio žingsnių kalibravimo laboratorija](acquisition-plan/CALIBRATION.md): privatūs .test-only .eml, atskiras Codex CLI gavėjas ir vertintojas, 400 žinomų regresijos kombinacijų. Production discovery/siuntimas/atsakymų transportas ir reali Madbeauty aktyvacija vis dar yra būsimi vartai.

2026-10-09. Savininko pavedimas: pagerinti bendrą sistemą aktyviai klientų paieškai, pvz. medicininės įrangos pardavėjui. Autoritetas — privatus agentų core. Viešas `niche-public-core` lieka svetainės, užklausos ir patvirtinto turinio adapteris; prospectų ir korespondencijos jame nelaikyti.

## Radiniai ir įgyvendinta apimtis

`ACQUISITION_CORE.md` ir `niche-client-acquisition` jau aprašė paiešką, bet prospecting/kampanijos buvo planas. `sales.py` ir `sales_worker.py` vykdo ribotą žinomo kliento/owner-lab pardavimą, ne organizacijų paiešką. Facebook modulis turi privačią signalų/draft eilę, bet gyvas collector/Page siuntimas neprijungti. `learning_controller.py` mokosi conversation elgesio; jo promotion negalima perkelti outbound rolei. Viešas core saugo gaunamas užklausas. Šio pakeitimo metu išsaugome šiuos procesus ir Promedical PR53 katalogą.

`runtime/src/pinet_core/acquisition/` įgyvendina **vietinį tyrimo ir juodraščių parengimo etapą**: griežtos kampanijos/įrodymų/patvirtintų faktų sutartys; tyrėjo ir nepriklausomo tikrintojo instrukcijos bei medicininės įrangos priedas su SHA; scope/galiojimo/pirkėjo/atsisakymo/budžeto vartai; kasdienė partija pagal kampanijos laiko juostą; atomic private kvitai, exclusive lock, replay ir ankstesnių dienų draft/uncertain deduplikavimas. Neaiškus nutrūkimas nekartojamas. Patvirtintų URL skaitymas naudoja esamą `PublicResearch` ir jo HTTPS/DNS/timeout/dydžio/redirect ribas. Pridėtas sintetinis korpusas ir actual tool-free Codex CLI kalibravimas.

Tai nėra įjungtas gyvas pardavimų variklis. Organizacijų atradimas per paieškos/registrų/pirkimų tiekėją priklauso kviečiančiam agentui; adapteris pats nenaudoja search API. `acquisition_sources.py` skaito konkrečiai leistus URL ir išsaugo kvitus; faktus, šviežumą ir teises agentas patikrina prieš `Prospect` importą. JSON yra darbo artefaktai, ne antras CRM: nėra klientų registro, DB migracijos, RLS ar receipt-to-Case integracijos deklaracijos. `external_sent` visada false; nėra SMTP ar siuntimo endpointo. Kontaktavimo booleans negali suteikti siuntimo teisės.

## Agentų komanda ir dienos ciklas

Vienas bendras vykdytojas aptarnauja izoliuotas nišas. Logiškos rolės nebūtinai reiškia šešis nuolat veikiančius modelius.

| Rolė | Darbas | Įrodymas |
|---|---|---|
| Koordinatorius | BUSINESS, offer facts, scope, diena, biudžetas, kill switch | Kampanijos versija ir kliūtys |
| Paieškos agentas | Naujos organizacijos ir konkretūs signalai leistinuose šaltiniuose | Organizacijos raktas, URL, data, minimalūs faktai |
| Atrankos agentas | fit/intent/recency/contactability/fulfilment atskirai | draft/research/exclude sprendimas |
| Pasiūlymo agentas | Tinkamas produktas ir vienas naudingas kitas žingsnis | Faktų ID ir konkretus laiškas |
| Kokybės agentas | Tikras tekstas, faktai, šaltiniai ir politika | PASS arba konkreti taisymo priežastis |
| Atsakymų agentas | Realus reply, refusal, OOO, bounce ir pirkimų procedūra | Sustabdyta seka arba patvirtintas Case handoff |

Kasdien pirmiausia apdoroti tikrus atsakymus/slopinimus; patikrinti kampanijos/faktų galiojimą; atnaujinti šaltinius; atrinkti naujas organizacijas; parengti ir peržiūrėti partiją; būsimame autorizuotame transporto etape siųsti tik patikrintus veiksmus; užfiksuoti rezultatą. Matuoti konkrečius kvalifikuotus poreikius ir kaštus. Nulis tinkamų pirkėjų gali būti teisingas rezultatas. Įprastą atranką ir tekstą agentas sprendžia autonomiškai pagal kampanijos ribas.

## Medicininės įrangos playbook

Segmentai pagal realų katalogą: laboratorija, diagnostikos klinika, ligoninės padalinys, reabilitacija, slauga. Registras padeda rasti organizaciją, originalus puslapis — patikrinti veiklą/kontaktą, aktualus pirkimo dokumentas — objektą/terminą/procedūrą. Visos medicinos įstaigos nėra visos įrangos auditorija. Veiklos aprašas yra fit hipotezė; tik aktualus konkretus signalas leidžia `intent=explicit`.

Pasiūlymui reikia produkto/modelio/gamintojo/paskirties, techninių dokumentų, pardavimo teisės, kainos ir galiojimo, likučio/tiekimo, pristatymo, garantijos/serviso/mokymų faktų. Nežinomų laukų neišvesti iš tiekėjo reklamos. CE/MDR/IVDR, suderinamumą ir medicininę paskirtį tikrinti konkrečiam produktui. Pacientų duomenų nerinkti. Oficialaus konkurso neapeiti paprastu pardavimo laišku.

Pirmas laiškas: tikras įstaigos faktas → konkretaus produkto/informacijos nauda → vienas klausimas dėl specifikacijos ar pirkimų kanalo → tikra siuntėjo tapatybė ir paprastas atsisakymas. Nežinomas sertifikatas/likutis/terminas nevirsta pažadu. Reply/refusal/OOO/bounce/complaint/uncertainty ar pasibaigęs poreikis sustabdo seką. Kainos ir pasiūlymo faktai nesimoko iš kliento žinutės.

## Vykdymas ir kalibravimas

```powershell
node scripts/git-freshness.mjs --phase continue
cd agent-business-core/runtime
uv sync --locked --python 3.13
uv run python -m unittest discover -s offline_tests -p test_acquisition.py -v
uv run python scripts/acquisition_calibrate.py --run-id unique-local-run
uv run python scripts/acquisition_sources.py --input artifacts/source-policy.json --run-id unique-source-run --max-calls 10
uv run python scripts/acquisition_daily.py --input artifacts/acquisition-input.json
```

`source-policy.json`: `site_id`, `sources[]` su `id`, `site_id`, `url`, `language`, `read_allowed: true`. `acquisition-input.json`: `campaign` pagal `Campaign` ir `prospects[]` pagal `Prospect`. `evals/acquisition/cases.json` yra tik sintetinės struktūros pavyzdys, ne realūs faktai ar autorizuota kampanija. Realus importas lieka `artifacts/`, ne Git. Agentas tikrina originalius šaltinius ir galiojimą; modelio teksto nenaudoja kaip faktų approval ar autorizacijos.

Kvitas: `artifacts/acquisition/<site_id>/<campaign_id>/<local-day>.json`. Vienoda diena/input/instructions pakartoja tik kvitą; pakeistas input atmetamas. Po crash `preparation.lock` pašalinamas tik patikrinus savą procesą ir kvitą. Aklo stale-lock timeout nėra. Ankstesnis draft/uncertain nesukuria laiško kitą dieną. Nauja kampanija negali apeiti būsimo operatoriaus suppression. Retention ir failų prieiga yra vietinio operatoriaus atsakomybė; daugiavartotojė CRM sauga nepriimta.

Kalibravimas saugo korpuso/įvesties/instrukcijų hash, originalius modelio rezultatus, nepriklausomą peržiūrą ir actual usage privačiame `artifacts/acquisition-calibration/`. Trys train ir trys iš anksto žinomi regression atvejai nėra blind holdout. Komanda nekeičia svorių ir nedaro sales/conversation promotion. Iš komunikacijos klaidos kurti versijuotą kandidatą ir naują nematytą korpusą; leidimų, faktų ir vertintojo nekeisti. Sintetinis PASS neįrodo paklausos/pelningumo.

## Ko trūksta nuolatiniam gyvam etapui

Konkretaus verslo aktualūs faktai ir kampanijos autorizacija; leistinas discovery tiekėjas/kaštų limitai; esamo PostgreSQL acquisition įrašai/RLS; operatoriaus suppression; vieno scheduler owner lease ir global/site rezervuoti kaštai; actual transporto politika/siuntėjo autentifikacija; patvari outbox/send idempotency/uncertain reconciliation; Message-ID reply susiejimas su prospect/CaseSource; tikras testinio gavėjo delivery/reply/atsisakymo/kill-switch bandymas. Codex langas nėra production scheduler. Šie punktai nepriimti be konkrečios aplinkos įrodymų.

Konkreti kampanijos autorizacija leidžia veikti jos ribose be kiekvieno laiško patvirtinimo. Nauja niša/mokamas tiekėjas/pasiūlymas/scope vertinami atskirai. Hostinger šaltam outbound nejungti vien dėl inbox: [tiekėjo taisyklės](https://www.hostinger.com/support/1583510-is-mass-mailing-supported-at-hostinger/) ir [sąlygos](https://www.hostinger.com/legal/universal-terms-of-service-agreement), patikrinta 2026-10-09. Lietuvos juridinių asmenų pakeitimus nuo 2026-04-22 aprašo [VDAI](https://vdai.lrv.lt/lt/naujienos/pokyciai-tiesiogine-rinkodara-juridiniu-asmenu-atzvilgiu-mrB/); adresatas, paskirtis, atsisakymas ir tiekėjo politika tikrinami atskirai.
