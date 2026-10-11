# Madbeauty acquisition kalibravimo būsena

2026-10-10. Savininkas pasirinko visas grožio paslaugas ir užsakė daugelio žingsnių Codex CLI gavėjo simuliaciją. [Sistema ir komandos](../../agent-business-core/acquisition-plan/CALIBRATION.md), [actual QA](../../docs/ACQUISITION_DIALOGUE_CALIBRATION_QA_2026-10-10.md), [roadmap](../../agent-business-core/acquisition-plan/ROADMAP.md).

Uždara laboratorija įgyvendinta: synthetic provider kvalifikavimas, .test-only .eml capture, atskiras gavėjo procesas, atsakymo rengimas, vertintojas ir state/receipt patikros. Parengta 400 žinomų scenarijų kombinacijų (25×8×2), bet pilnas 400 modelio suite nevykdytas. 31 offline regresija PASS, actual H galutinis privacy/opt-out batch 2/2 PASS; ankstesni realūs FAIL/INCOMPLETE palikti QA ir private artifacts. Cross-sector medicininės įrangos korpusas 6/6 PASS.

Kalibravimo eiga jau rado ir pataisė agento privacy/complaint painiojimą, source-only atsakymo serverio vartą ir prašyto privacy atsakymo atskyrimą nuo sustabdytos reklamos. Fixture/oracle nesėkmės atskirtos nuo agento nesėkmės; slenksčiai nenuleisti. Tai Git source pataisos, ne svorių fine-tuning ar jau pritaikytas conversation adaptive release.

Madbeauty realaus acquisition agento launch status: **UNVERIFIED / neįjungtas**. Tikros paieškos, pristatymo/atsakymo, hosted registracijos, aktyvaus profilio ir protected evaluation vartai lieka [piloto plane](ACQUISITION_PILOT_PLAN.md). Exact CLI model ID ir produkcinio modelio priėmimas nepatvirtinti. Jokio realaus teikėjo nekontaktavome ir jokio profilio nepakeitėme.
