# Xbot → Verslomatika sutartis

2026-10-11 suderinta su savininko nurodyta sesija `01a122ec-9cfa-79b3-966b-43aa3f39ab58`. Backend owner valdo auth/API/tenant/source; Xbot owner šiuo pakeitimu valdo tik modulį. Portalas neperrašomas. Per-verslo skiltis: **Agentai → X**, skydeliai: overview, queue, research, budget, evidence.

## Faktinis source ir ribos

Peržiūrėtas platformos PR80 source `2a63e9211f1054151cd461bb41055352bff8c4ee`, companion PR29 `5924a2eb858cf45e736bc5e79a2f07cfbbc39af2`. Tai šakų, o ne main/deployment būsenos. Modulio bazė main `7af6b9641012a30c5f95eac38a66daeff8f8cb39`.

Actual maintained auth: control.models.Organization → Membership (user/org/environment/enabled) → Portfolio → BusinessGrant (business/org/portfolio/environment/enabled). Customer bearer naudoja **control.models.Session / control_sessions**, ne neegzistuojantį customer UserSession. Customer Account/ActionToken/Intake ir verified-owner tikrinimas lieka platformos atsakomybė. Canonical lock order: registration lifetime prieš actor.

Platformos customer_profile pin_registration → owned → projection valdo current registration/admission/source. Nepernaudoti statinio seno PROFILES rinkinio ir nekonvertuoti V1 į tariamą V2. knowledge.reference_v2 / resolve_v2 ir knowledge_index begin/batch/commit/revoke yra maintained žinių kelias.

## Adapteris ir DTO

`xbot/module.py` yra grynas serverio adapteris, ne veikiantis customer HTTP endpointas:

- `Manifest` / `schemas/manifest.schema.json`: xbot.v1, version 0.2.0, skydeliai ir vietinės/kanalo galimybės. default OFF; jokio live mandato.
- `Binding` / `binding.schema.json`: organization/business/environment/site, registration/admission/accepted_revision, candidate hash, accepted ir execution Git SHA, atskiras instruction SHA, tikras KnowledgeReferenceV2, index receipt hash, public facts hash, expiry/current/module_admitted.
- `Snapshot` / `snapshot.schema.json`: faktinė būsena, blokai, eilės ir research skaičiai, sąnaudų rezervai/kvotos, exact evidence. Nėra raw klientų teksto ar tokenų; credential_ref yra tik serverio nuoroda.
- `Command` / `command.schema.json`: request_id, expected_revision, enable/pause. Atominis išsaugotas kvitas; toks pats request nekartoja revision, pakeistas request turinys blokuojamas.
- `Authority`: frozen serverio objektas su xbot.read/control/configure. Jo negalima gauti parsinti klientui leidžiamą JSON ar pasitikėti site_id iš request.

Outer serveris kiekvienai operacijai iš naujo tikrina session/grant/owner, tada pateikia current resolverį pagal canonical lock order. Resolveris gauna tik patvirtintą public projection, grąžina Binding ir tikrina execution/instruction/index source bei expiry. Snapshot/command ir background dispatch negali remtis vien seniai išsaugotu browser grant.

PR90 peržiūra 2026-10-11 rėmėsi private source `e90e3f1315accaddb459f3ac5934b3befae02bcd` ir public `5924a2eb858cf45e736bc5e79a2f07cfbbc39af2`. Jo pradinis module resolveris buvo sinchroninis, maintained `owned/pin_registration/projection` kelias asinchroninis. Issue91 atskirame pakeitime prideda žemiau aprašytą awaited bibliotekos sąsają. Tikras PG/BFF adapteris ir dashboardo laidai tebėra atskiras darbas; seną ProfileView uždarantis callback ar `asyncio.run` aktyviame event loop nėra tinkamas prijungimas.

`ModuleAdapter.bind(authority, public_profile, expected_revision)` įrašo current public faktus ir **išjungia visus kanalus**. `check_profile` lygina exact stored ir naujai resolved Binding, scope, current/admission/expiry/facts. Pasikeitusi projekcija ar revokacija stabdo darbą; generavimo pabaigoje tikrinama dar kartą ir pasenęs draft nepriimamas. Profilis su source_binding be resolverio neveikia.

Viena modulio DB priklauso vienai environment. Pirmas susiejimas atomiškai įrašo aplinkos pin; kitos aplinkos pirmas susiejimas atmetamas, net konkuruojant dviem užklausoms. Susieto site organization/business/environment/site tapatybė nekintama. Kitam verslui ar aplinkai reikia atskiros patikrintos migracijos, ne paprasto rebind. Anksčiau nesusietas profilis su užduotimis, veiklos įrašais, sąnaudomis ar modelio rezervais negali būti automatiškai priskirtas klientui. Vietinis audit-only pradinis profilis galimas. Esamos mišrios aplinkų DB taip pat blokuojamos. Tos pačios tapatybės projekcijos atnaujinimas išjungia modulį, atšaukia senas queued užduotis ir išsaugo istoriją; vykdomas generavimas atmetamas pagal pasikeitusią revision/source.

Usage DTO atskiria `model_attempts_reserved`, `model_known_usage_receipts`, `model_unknown_usage_receipts`, `model_reserved_calls_without_known_usage` ir `model_token_usage`. Period yra `store_lifetime`, toks pats rezervams ir žinomiems žetonams; last1000 veiklos feed nenaudojamas apskaitai. Kiekvieno CLI kvietimo žinoma usage saugoma nepriklausomame kvite prieš teksto priėmimą, taip pat atmetus source, gavus failed exit, timeout ar cancel. `completed` kvite reiškia CLI baigtį, ne patvirtintą ar publikuotą tekstą. Nežinomos žetonų reikšmės neapskaičiuojamos iš rezervo, piniginė modelio kaina lieka nepatvirtinta. Seni tikri usage įrašai įskaitomi vieną kartą be istorijos perrašymo. UI turi aiškiai atskirti rezervus, faktines Treg sąnaudas ir nežinomas modelio sąnaudas.

Enable reiškia tik vietinį planavimą ir ruošimą. Esant live flags jis blokuojamas. Tikra kanalo admission/kredencialai/mandatas/biudžetas ir X reply leidimas nepriskiriami iš bendro profilio current=true. Dabartinis platformos acquisition=false nesuteikia module_admitted=true. Pause leidžiamas net pasibaigus žinių TTL, tačiau outer auth vis tiek privalomas.

## Intake ir priėmimas

Canonical CaseSource unikalumas: (environment, source_system, site_id, source_record_id) ir case/business/environment FK. Modulio research signalai jo nesukuria. Vietinis inbound klasifikavimas grąžina case_created=false; canonical importo ir konversijų adapteris dar neprijungtas.

Integracijos priėmimas privalo patikrinti session/grant revokaciją, svetimą tenant/site, current pin bei changed V2/TTL/index receipt, idempotentines komandas ir UI skaičių atitikimą DB. Actual e2e reikalingas po maintained API ir dashboard wiring. Modulio unit/mock testai neįrodo šių laidų ar deployment.

Patvari eilė ir paskyros lock šiuo metu vienoje SQLite DB. Platformos worker turi naudoti vieną modulio vykdytoją; jei bus keli instance, reikia atskiro coordinated queue/lease sprendimo ir priėmimo. Privatus localhost operatorius nėra customer dashboard autentifikacija.

## Asinchroninė current-core sąsaja — issue91

`AsyncModuleAdapter(service, resolver)` pateikia `await bind(...)`, `await snapshot(...)` ir `await command(...)` su tais pačiais DTO. Serverio `async resolver(authority, permission)` kiekvieną kartą turi iš naujo patikrinti autentifikuoto principal arba worker teises, grant/savininką, Registration lifetime, Profile admission, accepted/candidate/execution/instruction source, V2 žinias, indekso kvitą, TTL ir atskirą vietinį X modulio admission. Resolveris grąžina pilną Binding; serveris nesudaro Authority iš kliento JSON. Leidimai yra `xbot.configure`, `xbot.read`, `xbot.control`, o vykdymo patikros naudoja `xbot.execute`. Tai operacijos paskirtis serverio tikrintojui, ne naujas savaime suteiktas PG grant.

Skaitymo ir pause teises tikrinti atskirai nuo vykdymo. Snapshot po dabartinės skaitymo autorizacijos gali parodyti source blocker; jo evidence yra išsaugotas susiejimas, ne naujas current patvirtinimas. Resolverio klaida, neprieinama ar atšaukta authority negrąžina seno snapshot ar command kvito. Pause galimas su dabartinėmis control teisėmis, kai žinių TTL pasibaigęs. Enable ir vykdymas reikalauja pilno nepakitusio priimto Binding.

Adapteris įdiegia `Service.async_context_validator`. `await Service.gate_async(job)` ir `check_context_async(profile)` iš tiesų laukia current patikros; po jos vietinė politika iš naujo paima dabartinį laiką paskyros/faktų galiojimui ir darbo valandoms. Su managed async adapteriu nesusietas profilis ir sinchroninis gate blokuojami. `ModuleAdapter` bei `Service.context_validator` palikti sinchroniniam standalone režimui. Async funkcija sync slote negali būti tyliai ignoruota. Adapterių nemaišyti vienoje Service instancijoje.

Default Agent turi `set_context_validator`: patikra atliekama prieš ir po **kiekvieno** atskiro draft/review modelio kvietimo. Pirmo kvietimo revokacija sustabdo antrą, žinomi usage kvitai lieka patvarūs. Injektuotas alternatyvus modelio adapteris privalo palaikyti tą pačią per-call sąsają; vien Service išorinis check neįrodo jo vidinių kvietimų patikros.

Service taip pat iš naujo tikrina source po price, transporto, media ir reconciliation laukimų. Tiekėjo sąnaudos ir receipt saugomi prieš galutinę source patikrą; pasenęs write rezultatas nepriimamas, profilis pristabdomas, job lieka uncertain ir automatiškai nesiunčiamas iš naujo. Neapmokėti testai nepanaikina live mandatų, kvotų ar X reply taisyklių.

Modulio SQLite transakcija nelaikoma per resolverio ar provider await. Resolveris turi užbaigti savo core transakciją ir paleisti jos užraktus prieš grąžindamas Binding. Vienos paskyros patvarus lease lieka koordinatoriaus serializavimo priemonė. Bibliotekos patikros neįrodo atominio PG ir SQLite priėmimo: tikras adapteris turi išspręsti lifecycle/commit koordinaciją bei ištestuoti revokaciją su savo serveriu.

Read-only dependency patikrinta exact root `32b2dda8d9b8dde6847a98299ae8345fec276d4e`, vėliau clean `ba891b1aaebcc65d72b5248eaaf59e6bf82822a7` (PR80). Atrinktų Registration/Profile source/auth funkcijų delta tarp jų nėra; ba891 pakeičia tik Profile sequence history ribą ir jos priėmimą. Root WIP neimportuotas. [QA-ASYNC-CORE](QA-ASYNC-CORE.md) įrodo injektuotą bibliotekos kelią; actual PG/server admission/dashboard/calibration lieka nepriimti.
