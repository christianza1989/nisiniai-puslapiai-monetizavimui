# Vieno core susiejimas su klientų paieška

2026-10-01. Perskaityti `ACQUISITION_CORE.md`, `research/client-acquisition-2026-10-01/SYSTEM-AUDIT.md` ir acquisition output sutartis. Tyrimo sesijos failai nekeisti. Šis handoff aprašo tik dabartinį agentų runtime ir suderinimo ribas; nėra naujos kampanijos siuntimo leidimas.

## Vienas case ir esami moduliai

| Kelias | Tikra realizacija | Riba |
|---|---|---|
| Svetainė → pokalbis | `service.start`, `Case`, `Conversation`, serverio įvykiai, `NeedPatch`, kontaktai su UI ACK | Tikrą balsą blokuoja M0 ir provider/config vartai |
| D1 → tas pats core | Esamas `CaseSource` / `SourceCheckpoint` importo kelias | D1 įrašo originalus ID yra dedup raktas; inbox pranešimas nėra naujas klientas |
| Pasiūlymas → paštas | `mailbox.prepare`, `MailMessage`, scoped operatoriaus mail UI | Local owner lab siunčia tik konfigūruotam savininko adresatui iš info@pinet.lt |
| Kliento atsakymas | `mail_reader.sync_replies`, tik žinomi Message-ID ir dalyvio adresas, vienas case | Neaiškios/multi-case gijos neimportuojamos; nėra bendro viso inbox klasifikatoriaus |
| Pardavimo tęsinys | `sales.py`, durable per-case revision, inbound lease, reply/reminder, `sales_worker.py` | Ribotas local prototipas, ne realus tiekėjo sandoris |
| Natūralus laiškas | `email_agent.py`: laisvas tekstas, faktų patikra, vienas taisymo bandymas, serverio kainų blokas | LLM vertintojas atskiras kvietimas, bet tas pats CLI provider; žmogaus sutapimas dar nematuotas |
| Sąskaita | `order_tests`, deterministinis PDF iš priimto varianto ir pirkėjo duomenų | Išankstinis dokumentas; fiskalinis numeris, mokėjimas ir užsakymas nekuriami |
| Skills | `agent_instructions.compose`: common + role + konkreti niša, sources/hash/snapshot | Dabar du profiliai. Kitos nišos failai/faktai/kainodara turi būti atskirai įtraukti |
| Savikalibracija | `calibration` static admission; `adaptive_instructions` semantinis local compare/adoption/rollback | Static PASS nieko neaktyvuoja; gyvo balso canary vis dar neįrodytas |

Researcher/qualifier lieka read-only acquisition handoff. Signalas su data/galiojimu, pirkėjo ar partnerio role ir šaltiniu nėra `Case`. Kliento case kuriamas po tikros gautos užklausos arba autorizuotame lab scope. Tiekėjo, kliento ir rekomenduotojo duomenys nemaišomi. Į viešus turinio paketus nepatenka nei prospectai, nei korespondencija.

## Instrukcijos ir leidimai

Runtime rolės yra instrukcijų/įrankių profiliai, ne 30 atskirų CRM ir nebūtinai nuolat veikiantys modeliai. Modelis laisvai parenka bendravimą; serverio BusinessPolicy, faktų projekcija, kainodara ir tax/issuer konfigūracija išlieka atskiri. Nišos faktai negali paveldėti traktorių kainų, 15 % lab antkainio arba MB Memocasting laikino non-VAT profilio. MB Pinet/info@pinet.lt yra bendras operatorius, o sąskaitos išrašytojas tik atskiro profilio snapshot.

Visas vykdomas pokalbio promptas ir fragmentų hash saugomi Conversation; aktyvūs pokalbiai nekinta po naujos instrukcijos priėmimo. Tiekimo/pašto rolės gauna savo promptus ir tik jų mandatą. Naujas šaltinis, tool teisė, kainodaros ar apskaitos pakeitimas nėra bendravimo skill pataisa.

## Bendra kalibravimo matrica

| Scenarijus | Įrodymas / būsena |
|---|---|
| Pirkėjas vs tiekėjas vs referral; pasibaigęs signalas; trūkstamas vykdytojas | Acquisition runtime dar nesukurtas; planuoti kvalifikavimo testą prieš adapterio aktyvavimą |
| D1 + inbox dedup, originalus formos ID | Esamas importo testų rinkinys; acquisition bendro inbox pranešimų importo dar nėra |
| Neteisinga niša, kitų klientų laiškai/PDF, pamirštas siteId | Forced RLS, composite FK ir scoped endpointų neigiamos patikros |
| Dvi gijos tam pačiam adresatui | Užklausos numeris subject + tikri In-Reply-To/References; multi-case match atmetamas |
| Atsisakymas/reply/silence | Per-case priminimas atšaukiamas atsakymu; max vienas po 24h; reali para dar neįrodyta |
| Bounce/OOO | Bounce bei auto-reply klasifikavimas ir delivery-source autentifikacija dar nėra įgyvendinti; prieš production reikia papildyti |
| Kainos prieštaravimas, pasenusi kaina, papildomos išlaidos | Decimal, privati savikaina, min markup, šaltinio data; shipping/tax unknown nepadaromi galutine kaina |
| Klaidinga mokėjimo pretenzija / premijos spaudimas | Negali sukurti payment/order receipt; kritinė klaida nekompensuojama pardavimo balu |
| SMTP uncertain/crash; model worker crash; naujas reply vykstant analizei | Durable send intent, no blind resend; expiring lease token ir case revision fence, stale action netaikomas |
| Pasenusi instrukcija, candidate regression/holdout, rollback | Fragmentų snapshot, compare vartai, local rollback; production audio/canary lieka UNVERIFIED |

Sintetinė aptarnavimo kokybė, realus SMTP → Gmail gavimas/reply ir mokamas sandoris matuojami atskirai. Bandymai nesukuria pardavimo pajamų. Tikras reply mūsų savininko lab paskyroje yra transporto įrodymas, ne rinkos paklausos įrodymas.

## Likę integration vartai

Hostinger transportas nenaudojamas unsolicited prospectų sekai; acquisition plane aprašyti teisiniai/provider vartai lieka. Formos sutikimas nėra newsletter registracija. Vien para tylos nesukuria naujos reklamos leidimo. Dabartinis vienos užklausos priminimas nėra operatoriaus bendro suppression pakaitalas.

Prieš production: aiškus kanalo/paskirties mandatas, bounce/OOO/opt-out iš skirtingų case apimtis, IMAP incremental UID/checkpoint ir visų inbound unassigned eilė, indexed case jobs, provider model/kaštų įrodymai, nepriklausomo vertintojo patikra, patvirtinti tiekėjai/landed-cost ir apskaita. Bounded local worker nevadinamas 24/7 deployment.

## Facebook kanalo derinimo papildymas

Perskaityti tyrimo sesijos [FB_ACQUISITION_PLAN](../FB_ACQUISITION_PLAN.md) ir FB reference. Tai integracijos planas, ne čia įjungtas adapteris ar perimtas kitos sesijos siuntimo mandatas. Vienas channel/account koordinatorius siunčia darbą į tą patį siteId registrą; qualifier atskiria buyer/provider/referral/employment, tikrą apimtį, vietą ir aktualumą. Neaiški niša lieka unassigned. Gavus tikrą page-directed poreikį, CaseSource naudoja originalų kanalo ID; FB signalas nėra received case, FB įvykis nėra MailMessage, per-Page PSID nėra bendras žmogaus ID. Reikia naujos typed channel įvykių migracijos ir RLS/dedup testų, ne antro CRM.

Browser writer turi atskirą account lease su fencing ir tikslaus account/group/thread/draft revision patikra; dabartinis sales inbound lease tik saugo case analizę ir neatstoja browser account užrakto. Page API adapteris eina tiesiogiai su per-thread ordering, serverio kanalo/window policy ir faktiniu provider receipt. Lėtas sinchroninis Codex CLI netinka operatyviam bot atsakymo terminui: reikia async ingress/ACK, neblokuojančio model runner ir atskirų ilgesnių darbų. Langų taisyklių nekoduoti kaip universalios 24 h konstantos; remtis aktualia oficialia politika ir tikrais kanalo įvykiais.

Prieš adapterio aktyvavimą papildyti kalibravimą: buyer/provider/employment, wrong site/city/scope, stale signal, permissions, revision/dedup/uncertain submit, window expiry, Page identity ir tikras gauto poreikio kvitas. Savininko ar grupės sutikimas pats neįrodo platformos automatizavimo teisės. Mūsų Page/app/token, nuolatinio personal-profile collector leidimas, kanalo ingress/queue/API ir FB e2e lieka UNVERIFIED/NOT IMPLEMENTED. Tyrimo sesijos dokumentai neredaguoti; abipusis techninis priėmimas dar neįrodytas.


## Patikrinta bendro runtime riba prieš FB modulį

2026-10-01: Alembic failų head ir realiai įdiegtas head abu `0008_mail`. 18 aplikacijos lentelių (19 su alembic_version), 14 forced RLS. Senas check_migration helper baigėsi 0007; papildytas 0008 mail, disposable schema 18 lentelių /14 politikų PASS, aplikacijos įrašai neliesti. api.py/models.py/jobs.py šios sesijos dabartiniam nišų kalibravimui nerezervuoti; FB vykdytojas turi registruoti konkretų mažą bendrą langą prieš router/metadata/runner integraciją. Naujas paketas gali naudoti esamus Base/Scoped/db.transaction; istorinių migracijų nekeisti.

Esamas Job pririštas prie Conversation: jo negalima laikyti bendru grupių/signalų/case-only darbo queue be modelio/migracijos sprendimo. Browser account lease nėra site lease: viena bendra paskyra turi vieną account writer/fencing, nišų eilės RLS atskiros. Per-site policy yra BusinessPolicy, tačiau global account leidimo negalima įgyti viename tenant įraše. Naujo modulio typed account/coordinator lentelių leidimus ir app role atskirti nuo tenant customer lentelių. Tarp-site foreign key privalo apimti business_id/environment_id. Bendram API mount reikia operator_auth ir tikslaus scoped per-site router, modelio metadata registravimo ir off default; per-channel tick turi būti bounded, failure isolation, jokio lėto CLI global jobs cikle.

Tai patikrintos dabartinio kodo integracijos sąlygos ir mano failų riba; FB router/migration dar negauti, aktyvavimo ar abipusio priėmimo įrodymo nėra.
