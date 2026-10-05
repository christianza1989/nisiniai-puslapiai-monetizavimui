# Dovanos123 M4: darbo ribos ir priklausomybės

2026-10-04, Europe/Vilnius. Pradinė rezervacija žemiau išlaiko planavimo ribas. **Vėlesnis paged žinių/readiness runtime inkrementas įgyvendintas ir patikrintas 2026-10-05; gift integracija bei visi M4 vartai dar nepriimti.** Actual būsena: [M4_RUNTIME_VALIDATION_2026-10-04.md](M4_RUNTIME_VALIDATION_2026-10-04.md). Dovanos123 neįjungtas, esami šeši šaltiniai veikia.

Pagrindas: [runtime kontrakto peržiūra](DOVANOS123_RUNTIME_CONTRACT_REVIEW_2026-10-04.md), [bendras migracijos planas](../DOVANOS123_CORE_INTEGRATION.md). Root v2 field/hash fixture dar laukiama. Jai atėjus M4 sutartis tikrinama pagal realius laukus; žemiau nurodyti naujų modulių pavadinimai nėra naujo wire formato patvirtinimas.

## Vienas rašytojas ir failų ribos

Runtime katalogas: `C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/agent-business-core/runtime/`.

| Langas | Šios core sesijos failai | Būsena |
| --- | --- | --- |
| Dabartinis planavimas | Šis dokumentas, `tests/fixtures/m4_gift/PLAN.json`, savas WORKSTREAMS įrašas | Aktyvus dokumentų langas |
| Izoliuotas kontraktų pasiruošimas | Nauji `src/pinet_core/knowledge_index.py`, `source_contracts.py`, `onboarding.py`; `tests/test_knowledge_index.py`, `test_source_contracts.py`, `test_onboarding_readiness.py`; `tests/fixtures/m4_gift/` | Namespace rezervuotas; įgyvendinimas tik priėmus konkrečias įvesties fixtures/sąsajas |
| Esamo runtime integracija | `src/pinet_core/contracts.py`, `knowledge.py`, `lead_import.py`, `models.py`, `jobs.py`, `learning_controller.py`; `scripts/local_knowledge_sync.py`, `import_d1_sqlite.py`, `network_bootstrap.py`; susiję esami testai | Sąlyginis būsimų pakeitimų sąrašas, ne dabartinis kodavimo užraktas; po M1/M2 priėmimo prieš edit įrašomas konkretus subset |
| Gift profilio prijungimas | `profiles.py`, gift conversation/sales/supplier instrukcijos ir jo mokymosi korpusas | Po M1/M2 projekcijos ir konkretaus gift pasiūlymo/kontaktų priėmimo; nėra dabartinio gyvo profilio |
| DB schema | Nauja runtime Alembic revizija tik jei priimtas source/index kontraktas jos reikalauja | Revizijos numeris dabar neužimamas; modelio migracija pirmiausia izoliuotoje QA bazėje, produkcinė DB neliečiama |

**Ne šios sesijos rašymo ribos:** visas viešas repo ir content-studio, `lib/niche-voice.ts`, vieši validatoriai/hash, `scripts/network_manifest.mjs`, proxy/registry/types/renderer/SEO, gift legacy importer. `network_manifest.mjs` fiziškai runtime kataloge, tačiau šiame M1 lange nekeičiamas šios sesijos; jo projekcijos sąsajos pakeitimas laukia atskiro suderinto root/core lango. Nei bendras dist, nei root/gift planai, nei kitų nišų paketai ar learned versijos neperrašomi.

Esamų runtime failų sąlyginis sąrašas neleidžia iš anksto perimti viso jų kodo. Kiekvienas integracijos inkrementas turi konkretų rašytoją, subset ir priimtą fixture; nepriklausomi Facebook/mail darbai dėl šio plano nestabdomi.

## Priklausomybių seka

| Inkrementas | Reikalinga įvestis / priėmimas | Core rezultatas |
| --- | --- | --- |
| M4-P: sutartys | Root M1 v2 fixture ir hash taisyklės; nepakeistas v1 fixture; gift M0 URL/ID ir duomenų formatų inventorius be PII repo | Version-aware normalizavimo, žinių dydžio ir typed source sutartys; aiškios migracijos išimtys |
| M4-A: readiness | M1/M2 shadow ir aktyvaus host/projekcijos būsenų atskyrimas; vienas serverio mapping autoritetas | Žinomas profilis ≠ priimtas šaltinis ≠ įjungtas kanalas ≠ learning admission. Nepasirengęs gift nestabdo esamų šešių refresh |
| M4-K: knowledge | Root/gift M2 matomo inventoriaus sąsaja ir v2 HTML↔text fixture; originalus approval bei projection hash; public/private ir target būsena | Pilna bounded žinių projekcija arba aiškus atmetimas, be silent truncation; laikai/cache/revocation suderinti |
| M4-D: CaseSource | M0 tikri legacy source ID/timestamp/consent/status formatai; root shared formos kontraktas; source stream/cutover tapatybė | Idempotentinis source→Case adapteris, checkpoint/replay/backfill ir retention apsaugos; 0 importo siuntimų |
| M4-L: gift profilis | M1/M2 projekcija priimta, patvirtinti gift kontaktai/pasiūlymas, izoliuotas poreikio laukų/instrukcijų ir korpuso priėmimas | Tikslinis mapping/profilio kandidatas; default capabilities ir learning OFF iki atskiro priėmimo |
| M4-QA / M5 handoff | Visi aukščiau nurodyti inkrementai ir esamų šešių regresijos | Kodo/testų įrodymai ir aiškus per-site aktyvavimo/rollback planas; nėra automatinio produkcinio cutover |

M4-P pasiruošimas nepriklauso nuo produkcinio DNS ar pašto. M4-K/M4-L nedaromi su numanoma v2 struktūra. Gyva registracija ir runtime žinių refresh prijungimas laukia M1/M2; produkcinis D1 connector, SMTP/voice/FB/commerce/DNS yra atskiri vartai.

## Konkrečios root / gift sąsajos

Root fixture turi pateikti tikslią v2 struktūrą, canonical hash serializaciją ir patvirtinto entity snapshot/dependency taisykles. M4 nekuria savo package validatoriaus ar antro publikavimo filtro.

M2 viešos projekcijos sąsajoje reikia:

- stable site/page ID, canonical URL, konkrečios approved revizijos hash ir manifest/deployment tapatybės;
- matomos teksto/inline/nuorodų sekos, autorystės ir viešų šaltinių; konkrečios patvirtintos CTA/merchant target versijos;
- aiškaus public/private skyrimo, T−1/T/T+1, revocation ir cache būsenų;
- pilno inventoriaus ir bounded perdavimo / retrieval / revocation strategijos, kai viršijamos dabartinės 30 puslapių, 18 000 simbolių ar 30 revocation hash ribos.

Šių ribų nepakelti aklai. Flat v1 manifestas lieka nepakitęs; atskiras normalizuoto didelio turinio kontraktas fiksuojamas fixtures prieš integraciją. LLM paieškos grąžinamas fragmentas nėra pilno šaltinio importo įrodymas.

M0 source inventorius turi nustatyti tikrus D1 loginio stream/binding ID, laukų tipus, ID normalizavimą ir `(created_at,id)` rikiavimą. Klientų vardų/adresų/tekstų nereikia kopijuoti į repo: testams naudoti struktūrą išlaikančias atskiras fixtures. Nauja shared gift forma gali laikytis dabartinio `website_d1` kontrakto; legacy neatitikimams nekurti fiktyvaus consent, atsitiktinio UUID ar prailgintos žinutės.

Šios sesijos atsakomoji sąsaja — normalizuotos žinių ir typed source sutartys bei acceptance JSON. HTTP wire maršrutai, endpoint alias ir public HMAC projekcijos emitavimas derinami atskirame root/core lange, o ne perrašomi dabar.

## QA matrica ir izoliacija

Planuojamos fixtures/testų grupės aprašytos [PLAN.json](../agent-business-core/runtime/tests/fixtures/m4_gift/PLAN.json). Tai scenarijų inventorius, ne jau išlaikyti testai.

Privalomi atvejai: v1 bytes/hash nepakitimas; v2 inline/entity semantika; 31+ puslapis ir ilgas gidas; atšaukimas per kelis batch; nepasirengęs gift ir tebeveikiantys šeši šaltiniai; same-time source ID tvarka, konkurentinis replay, neteisinga aplinka/source/site, senas batch ir backfill; retention/rollback be PII prikėlimo; default OFF ir atskiras learning admission; kitų nišų politikų ir active/versions hash nepakitimas.

Pure kontraktų testai neveikia DB ar foninės eilės. Vėlesni DB testai naudoja izoliuotą QA bazę/aplinką, ne produkcinius leads ir ne įprastą vietinę duomenų eilę. Fixture host/site aprašas nėra gyvo dovanos123 registravimas. Nesiunčiama SMTP/LEAD_EMAIL, nekviečiamas Gemini, Jev, FB ar checkout. Serverio datos nekaitaliojamos; laiko bandymams naudojamas test clock.

## Dabartinis rezultatas

Pradiniame planavimo žingsnyje sukurtas planas ir QA scenarijų JSON, runtime nekeistas. Po M1 fixture ir actual M2 projekcijos priėmimo įgyvendintas konkretus subset: knowledge_index/onboarding ir jų service/API/learning/sync integracija, runtime emitter version dispatch bei Unicode paged transport. Atskiras WORKSTREAMS kodavimo langas, [API sutartis](PAGED_KNOWLEDGE_V2_API_2026-10-04.md), [actual QA ir likusios ribos](M4_RUNTIME_VALIDATION_2026-10-04.md). Source_contracts/D1, naujas profilis ir V2 Start/evaluator dar neįgyvendinti; PLAN.json nėra visų M4 vartų PASS.
