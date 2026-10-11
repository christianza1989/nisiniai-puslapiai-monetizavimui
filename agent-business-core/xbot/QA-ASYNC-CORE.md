# Xbot current-core async bibliotekos priėmimas

2026-10-11 · issue91 · `codex/xbot-async-core-20261011` · stacked bazė PR90/`4c7fc375338ae3b538a0001226d66da8d11a3e96`, fetched main `7af6b9641012a30c5f95eac38a66daeff8f8cb39`. PR90 istorinių kvitų, pirmų 40/55 testų ir actual CLI bandymų neperrašome. Naujame žingsnyje paid/model/X/deployment veiksmų 0.

Read-only exact platformos dependency: `32b2dda8d9b8dde6847a98299ae8345fec276d4e`, vėliau `ba891b1aaebcc65d72b5248eaaf59e6bf82822a7`, PR80. Patikrintas source dokumentas ir pin_registration/projection await kelias; tų funkcijų ir Registration/control models delta tarp šių SHA nėra. Tai nėra aktualaus main ar gyvo PG/dashboard priėmimo deklaracija.

## Originalūs radiniai ir bandymai

- Pradinis `tests/test_async_core.py`: **2 FAIL / 0.39 s**, nes nėra AsyncModuleAdapter ir awaited Service context hook. Tai trūkstamos bibliotekos sąsajos įrodymas, ne tariamas actual PG revokacijos bandymas.
- Pirmi funkciniai async testai: **26 PASS / 6.04 s**, dvi Pydantic fixture serializer warnings dėl unvalidated dict vietoje KnowledgeRef. Testinės Binding reikšmės pakeistos į validuotus modelius; validatorius neatjungtas.
- Bendras paleidimas: **81 PASS / 24.16 s** be warnings.
- Po papildomų managed-unbound/sync-slot/happy/second-call/local-pause testų: **1 FAIL / 85 PASS / 20.71 s**. Tik neteisinga tikrintojo kvietimų >=4 prielaida: early pause teisingai sustabdė po trijų patikrų, vieno modelio kvietimo ir išsaugojo usage. Pašalinta implementacijos skaičių prielaida; rezultatų atmetimo, antro kvietimo nebuvimo ir usage išsaugojimo patikros paliktos.
- Ankstesnis pilnas paleidimas: **86 PASS / 24.69 s**. Papildoma clock patikra pradžioje naudojo iki atskiro review paimtą job snapshot ir atmetė netinkamą review; fixture refetch į faktiškai reviewed job pataisė testą, vartas nešvelnintas. Tada **1 FAIL / 31 deselected / 1.15 s** realiai atkūrė stale pre-await clock: po resolverio laukimo pasibaigęs actor patikrinimas nebuvo atmestas. `gate_async(job)` dabar ima laiką po await, naujas testas tikrina actor expiry atmetimą.
- Galutinis `uv run pytest -q`: **87 PASS / 19.85 s**. Ruff format/check PASS, JS syntax PASS. Visos keturios iš faktinių modelių eksportuotos DTO schemas semantiškai sutampa su PR90 schemas; pakeitimų schemai nereikia.

## Ką tikrai patikrino injected testai

32 nauji parametrizuoti atvejai apima awaited bind/snapshot/enable/pause, default OFF, concurrent idempotency, naują authority patikrą net cached command receipt replay, tenant denial, resolverio neprieinamumą ar neawaited rezultatą, authority revokaciją per await, tikslų Registration/admission/revision/candidate/accepted/execution/instruction/facts/index/V2/TTL/current/module lifecycle, pause po TTL, sync gate ir nesusieto managed profilio bypass blokavimą bei laiko paėmimą po resolverio laukimo.

Actual Agent klasė su testiniu runneriu patikrina abu atskirus modelio kvietimus: sėkmingą draft/review priėmimą, revokaciją po pirmo ir antro atsakymo, žinių pakeitimą ir local pause per current patikrą. Known usage kvitai lieka nepriklausomi; po pirmo atšaukimo antro modelio kvietimo nėra. Mokamas Codex CLI šiame žingsnyje nekviestas.

Fake price await metu atšauktas grant neleidžia dispatch ar sąnaudų rezervavimo. Fake provider atsakymo metu atšauktas grant išsaugo actual synthetic charge ir receipt, bet ne published output; job uncertain, pause, no resend. Resolverio ir provider callback atidaro nepriklausomą local write transakciją, todėl patikra taip pat aptinka SQLite transakciją, klaidingai laikomą per await. Tai ne PostgreSQL užraktų ar actual provider bandymas.

## Perdavimo ribos

`AsyncModuleAdapter` yra bibliotekos serverio sąsaja; serverio tikrintojas atsakingas už tikras current Session/worker grants ir owned/pin_registration/projection transakcijas. Biblioteka nedubliuoja root auth/CRM/PG/portal. Source blocker po current read grant nėra current evidence patvirtinimas; unavailable/revoked authority negrąžina seno rezultato. Atomic PG↔SQLite lifecycle/commit koordinacija ir actual BFF/customer e2e lieka root priėmimui.

Scope pratęstas į xbot/agent.py per issue91/WORKSTREAMS, nes išorinis Service check negalėtų sustabdyti review kvietimo po pirmo modelio revokacijos. Upgrade `upgrade-241285ea-9d1f-476d-9ae9-9df2d0c3e52a` saugo originalias nesėkmes, šaltinius ir atskirą Git perdavimą. Sinchroninis standalone kelias paliktas; DefaultOFF/liveOFF/biudžetai0 ir nišos kalibravimo bei gyvo kanalo vartai nesikeičia.
