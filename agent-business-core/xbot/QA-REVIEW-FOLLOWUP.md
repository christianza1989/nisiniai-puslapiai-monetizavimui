# Xbot PR90 papildomos peržiūros priėmimas

2026-10-11. Originalus source `780bd36f1e39b19b6fb53129be228ea7483dfa19` ir [pirmas QA](QA-2026-10-11.md) neperrašyti. Šiame additive PR90 follow-up root redaguoja tik Xbot, savo WORKSTREAMS ir atskirus upgrade įrašus. Savininko autorizuota platformos sesija `01a122ec-9cfa-79b3-966b-43aa3f39ab58` pateikė read-only peržiūrą; jos source private `e90e3f1315accaddb459f3ac5934b3befae02bcd`, public `5924a2eb858cf45e736bc5e79a2f07cfbbc39af2`. Modulio main bazė `7af6b9641012a30c5f95eac38a66daeff8f8cb39`.

## Atkurti radiniai

- Prieš binding pataisą **6 FAIL / 16 deselected**: organization/business/environment persiejimas, konkuruojantys skirtingų aplinkų pirmi susiejimai, nesusietos darbo istorijos priskyrimas ir palikta sena queued užduotis.
- Po binding pataisos pirmas bendras paleidimas **1 FAIL / 45 PASS**: ankstesnė asset fixture importavo vaizdą prieš platformos bind, todėl naujas istorijos vartas pagrįstai atmetė. Fixture pakeista į bind → import; prior-history guard nesusilpnintas.
- Prieš usage pataisą **5 FAIL / 22 deselected**: žinoma usage prarandama po source revokacijos, antro kvietimo klaidos/cancel, tikro CLI subprocess nonzero exit, ir dingsta už last1000 veiklos įrašų ribos.
- Pirmas bendras pataisų paleidimas **51 PASS / 12.23 s**. Po papildomų buffered timeout/cancel, legacy nedubliavimo ir outbound cancellation patikrų **55 PASS / 16.33 s**.
- Pirma schemų eksportavimo komanda nepateikė privalomo directory argumento ir baigėsi TypeError; pataisyta komanda `export_schemas('schemas')` PASS. Tai operatoriaus komandos klaida, ne nutylėtas produkto PASS.
- Pirmas pakartotas actual CLI probe baigėsi AssertionError, nes senas testas sujungė review approval ir instruction fingerprint į vieną patikrą; tiksli nesėkmės šaka neišsaugota. Probe diagnostika pataisyta: pipeline/provenance/receipts tikrinami atskirai nuo reviewer sprendimo; nepatvirtintas tekstas netampa publikavimui tinkamu.
- Kitas actual probe pasiekė rezultatų spausdinimą, bet Windows cp1252 konsolė atmetė lietuvišką reviewer tekstą su UnicodeEncodeError. Ankstesnio rezultato žetonų skaičiai neišsaugoti ir iš naujo nekuriami. Diagnostika dabar prieš spausdinimą išsaugo tik sanitizuotus metaduomenis privačiame ignored data, JSON konsolėje naudoja saugius ASCII escape. Tai nesuteikia papildomo publikavimo leidimo.

## Pataisos ir apimtis

Upgrade `upgrade-b4255255-d742-4306-987c-4dd0c98fe5f5`: atominis vienos aplinkos pin, nekintama susieto site tapatybė, first-bind istorijos vartas ir tos pačios tapatybės rebind senų queued užduočių atšaukimas. Istorija ir kvitai išsaugomi; migracija tarp tenant/aplinkų nėra implicit rebind.

Upgrade `upgrade-4027bc96-db57-4f70-9dda-7a7e58bb1ea7`: per-call usage kvitas prieš output/source priėmimą, žinoma pirmo kvietimo usage po antro nesėkmės, CLI failed exit/timeout/cancel buffered usage ir lifetime agregavimas. Usage entry sukurtas po pirmos pataisos; penki originalūs FAIL bei originalus commit išsaugoti. Modelio rezervai, žinomi žetonai, nežinomi kvitai ir piniginė kaina atskirti. Raw CLI tekstas, sekretai ir klientų duomenys į kvitus nekeliauja.

Tikri Python child procesai patikrino failed exit ir buffered timeout/cancel. Fake outbound cancellation patikrino held unknown rezervą, pause ir no resend. Tai nėra tikra mokama X operacija. Legacy usage įskaitoma vieną kartą; atskiras kvitas tos pačios užduoties nesudubliuoja.

## Galutinės vietinės patikros

- `uv run pytest -q`: **55 PASS / 11.68 s** galutiniame paleidime; ankstesnis 16.33 s paleidimas taip pat PASS.
- `uv run ruff format --check xbot tests`, `uv run ruff check xbot tests` ir `node --check public/app.js`: PASS. Faktinės Pydantic schemas eksportuotos su `export_schemas('schemas')`.
- Pataisytas actual `uv run python tests/probe_codex.py`, aiškus `XBOT_CODEX_MODEL=gpt-5.5`: **PASS** Service → queued draft → CLI → independent review → persisted draft ir **2 patvarūs usage kvitai**. Review approved=true, unsupported_claims=[], unknown usage receipts=0. Šio probe `publish_eligible` reiškia tik redakcinę peržiūrą; kanalo mandatas nesuteikiamas ir live flags OFF.
- Instruction bytes SHA256 `0a57045d107012455f3f5d3ebe293cffbf4280623af1a18ce27517446165a066`; runtime fingerprint `5142da3a21624dfa5a4336af89e95e08b35ff541e0acca8468d6e307d744609e`; facts `ceccf7b537257abbb2dabe2008045d40299c2f7e2932276279e84f6e08ef74fc`.
- Naujo persisted draft SHA256 `da968a0ce036c39e5c5278cc136a944b8e4cb9691347b017197714289389b3f8`. Draft usage input12737/cached10752/output222/reasoning42; review input12915/cached10752/output236/reasoning42. Lifetime kvitai sutampa: input25652/cached21504/output458/reasoning84. Modelio piniginė kaina UNVERIFIED.
- Follow-up turėjo tris bounded actual probe paleidimus po du CLI kvietimus: pirmo ir antro klaidos išsaugotos aukščiau. Treg kvietimų, išlaidų ir gyvo siuntimo visuose juose **0**. Naujų nišų ar kampanijų nekalibruota.
- UI šioje pataisoje neperdarytas; ankstesni actual desktop/mobile įrodymai lieka pirmame QA. Naujų naršyklės ar Lighthouse balų nepriskirta backend pataisai.

## Likęs platformos prijungimas

Pataisos neprijungia shared API, auth, CRM ar dashboard. Sinchroninis module resolver nėra actual maintained async `owned/pin_registration/projection` adapteris. Integracijos savininkas turi įgyvendinti fresh pre/post async auth/source kelią pagal canonical lock order ir actual tenant/revocation e2e. Neuždaryti seno ProfileView callback ir nekurti `asyncio.run` aktyviame event loop. Visi live flags OFF, nauji biudžetai 0; nišos kalibravimas ir mokamas kanalas atidėti pagal savininko nurodytą seką.
