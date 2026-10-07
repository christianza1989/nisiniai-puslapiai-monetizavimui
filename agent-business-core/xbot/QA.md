# Xbot priėmimo įrodymai · 2026-10-07

**Treg setup priimtas. Xbot vietinis paketas dalinis; gyvos visos dienos kampanijos ir viso savininko pavedimo priėmimas dar nebaigtas.** Šis failas nekeičia PR20 istorinio audito. Naujas branch nuo origin/main e211a3d; nėra originalaus dirty checkout pakeitimų.

| Sritis | Būsena | Faktinis įrodymas / ribos |
|---|---|---|
| Treg CLI login/balance/catalog | PASS | CLI 0.22.0; balance exit 0; catalog search su UTF-8 exit 0. Captured cp1252 klaida ištaisyta scoped wrapperiu. |
| Codex MCP registracija | PASS / UNVERIFIED app | `codex mcp get treg`: enabled/streamable_http/env-var. Actual remote initialize HTTP 200 ir tools/list 10 vardų. Dabartinės app sesijos tool inventory vis dar be Treg; naujas app procesas dar nepatikrintas. |
| X actor | PASS connection / UNVERIFIED brand fit | `/2/users/me` HTTP 200, @synthaudio. Tai nėra įrodymas, kad paskyra skirta PhoneBridger ar turi AI reply approval. |
| Oficialus X recent search | PASS | Actual 10 rezultatų, HTTP 200, $0.05 receipt. Nė vienas rezultatas nepaskelbtas mokėtoju, sutikimu ar klientu. |
| API kaštai | PASS actual probe | Dvi identity po $0.01, search $0.05: $0.07. Ledger/result užklausa sutiko su tikros search response struktūra. Originalūs įrodymai tik ignored data. |
| Local durable scheduler/expense | PASS local | Tests: vienas concurrent dispatch, stale hash/policy reject, pause per price check, unknown write no retry, atominis budget 6 concurrent reservation bandymams, global/per-site ribos, daily attempt quota, tenant scope, DST ir idempotent day. |
| Tekstas / nuorodos | PASS local conservative gate | Unicode/CJK weighted conservative bound, controls, explicit approved https URL; bare domenai blokuojami. Tai nėra visa twitter-text algoritmo implementacija. |
| Medija | PASS contract / UNVERIFIED live | Official X OpenAPI: JSON base64 media/media_category; alt per metadata.alt_text. Mock transport ir exact-source manifest rejection test. Gyvas media upload/alt/expiry/post dar neatliktas. |
| Post/thread/reply/DM/metrics | PASS gates / UNVERIFIED live | Mock single-post receipt ir model review → auto post. Reply be X approval atmestas; DM id nepublic. Tikro posto/thread/reply/DM ar métrikos bandymo nėra. |
| Tikras Codex CLI draft+review | **FAIL actual access** | CLI 0.139.0 modelio numatytasis gpt-5.4 atmestas kaip nepalaikomas ChatGPT paskyrai. Scalar user preference gpt-6.1-sol taip pat atmesta. Joks turinys actual modeliu nesugeneruotas. Optional shared helper model arg unit test PASS, bet nėra šios prieigos pataisymo įrodymas. |
| GUI/auth | PASS local Chrome | Actual login → overview → plan day → 4 jobs → calendar → original post text/date → exact-version review. Test credentials/data izoliuoti data/qa-ui, Treg token absent. Cookie/auth/cross-origin/Host/logout test. IAB POST login nepavyko, backend HTTP ir Chrome kelias pavyko; saugos riba nesusilpninta. |
| Mobile/keyboard | PASS layout / partial | Actual 390 viewport DOM media matches, workspace block, document width 375 ≤390; desktop 1280 grid /1265 document. Form/buttons ir screenshot apžiūrėti, override reset. Keyboard Tab iš policy-json į policy-reason ir focus outline patikrinti; pilnas screen-reader auditas dar neįvykdytas. |
| Bendras CRM / faktų projekcija | UNVERIFIED / NOT IMPLEMENTED | Tik shared no-tools runner naudojamas. Automatizuotas approved-facts refresh ir X→CaseSource adapteris dar nesukurti. UI core_inbound=not_connected, pardavimai unknown. Website_d1 endpointas X signalams nenaudotas. |
| Nuolatinis režimas | OFF | Probe grąžino per-site/global biudžetus į 0 ir live read/write OFF. Tikras worker neįjungtas; mokamų subscriptions/topup, DNS, deployment ar klientų laiškų nebuvo. |
| Source hygiene | PASS | Exact staged scan: 27 failai, findings=[]; papildomai actual Treg .env secret root. .env, .operator-key, actor/call receipts, raw posts ir DB į Git neįtraukiami. |

## Vykdytos patikros

Iš xbot katalogo:

```powershell
uv run pytest --noconftest tests ../runtime/tests/test_codex_lab.py ../runtime/tests/test_codex_timeout_recovery.py ../runtime/tests/test_codex_model_selection.py -q --tb=short
uv run ruff check xbot tests ../runtime/src/pinet_core/codex_lab.py ../runtime/tests/test_codex_model_selection.py
```

**28 PASS**: 24 Xbot tests ir 4 bendro helperio gryni unit tests. `--noconftest` sąmoningai atskiria šį unit paketą nuo bendro runtime DB fixtures; pilnas Postgres/runtime API priėmimas čia neįvykdytas. Docker engine nepasiekiamas. `node --check public/app.js` PASS. Pradinė spend INSERT placeholder klaida rasta prieš actual mokamą probe ir pataisyta; todėl actual probe vykdytas tik po testų.

Private model probe neturi fake published įrašų, nėra demand/ROI įrodymas ir nepriskiriamas actual success. Fixture/model-mock grandinė neapeina realios CLI prieigos vartų. Neperskaičiuoti šių rezultatų į „pilnas veikiantis bot“.

Prieš runtime priėmimą: actual CLI paskyros galimybės, konkretus actor/brand mandatas, savininko spend riba, approved faktų projekcija, realus inbound adapteris, tikras sklandus original post+media→metrics kelias bei bounded darbo dienos testas. Reply/DM priimami atskirai pagal X taisykles ir actual galimybes.
