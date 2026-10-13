# Automatinio turinio tęsinio source QA

Scope: tik owned izoliuota PostgreSQL ir actual Node native intake/writer,
sintetiniai atskirų creator/critic/coordinator role callbacks, provider0.
Originalus assisted Spaorio draft_ready su0downstream GUIDE išsaugotas;
jo operacinė istorija šiame teste neliečiama.

9offline source tests PASS2.52s, scoped RuffPASS po trūkstamo RunnerError
importo pataisos.0030 migration actual isolated DB PASS. Pirmas naujas
PG tęsinys3PASS1FAIL33.65s, log cb7b473e367d31fd9e7f8e08abb6b0ad4c2d623106a55873430e9f09c064f03b:
archived atveju worker jau nekvietė providerio, tačiau naujas testas
neteisingai tikėjosi claimed/failed vietoje aiškaus cancelled. Dabar
actual archive handler tame pačiame transaction cancels GUIDE ir
palieka istoriją; tikrinamas terminalcancel ir0newattempts.

Aktualus restricted PG continuation/replay/target/expiry/stop4PASS31.52s,
log4e62ac9c1992bf2567bd6c6c071e5df30f024b9c46689157f738de0bcd08126f.
Paveikta mišri legacy admission/worker grupė41PASS2FAIL196.90s,
log8bc6529867aff2712fe671aacf62c9e9461b00d1024b74218c8ea7f4cdd82637.
Abu FAIL yra senos default-language sutarties atvejai, paleisti inherited
paused flag: language_failure_preserves_provider_usage_without_accepting_revision
ir model_context_projection_omits_invalid_prose_without_mutating_source.
Operatoriaus kalbos hold nekeičiamas. Šių dviejų default-profile case retest
atliktas atskirame QA child su explicit true:2PASS, log
a2806164e1532121b436b8c16a571c400f1d34d05cdb79fe1d070e9fc471d6c5.
Tai nėra operational kalbos patikros atnaujinimas. Originalūs kvitai išlieka.

Aktualūs source-only49offline1.42s ir scoped RuffPASS. Naujo realaus modelio,
chat ordinary UI, visos svetainės ar kalibracijos priėmimo nėra.

Atskiras actual late-runningarchive test1PASS7.29s, log54f23a2be0e674954976e664bd4c110468d3cec66fc9b7307936cee21c2ab6e8: cancellation during creator role retains exactly1charged reservation, no native result, no later dispatch. CLI source preflight additionally checks actual existing creator transport and fixed guide role profiles before provider actions. No new dependency or model.
