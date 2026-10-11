# Esamos būklės auditas ir pernaudojimo sprendimai

2026-10-10. Skaitytas savas švarus `codex/acquisition-core-20261009` HEAD `68d0b6a0a5c80f4751bf6009778710eb696382a1`; fetched `main` `d4ea8bf7384b70c4ea62a344001e3f8158812c56` įeina į HEAD. Acquisition papildymai yra dar nesujungtame [PR59](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/59). Auditas yra kodo/dokumentų peržiūra; nei naujas viso runtime testas, nei hosted verslomatika.lt patikra.

## Patikrintas inventorius

| Sritis ir šaltinis | Ką radome | Būsimo skydelio sprendimas / riba |
| --- | --- | --- |
| [Core architektūra](../ARCHITECTURE.md), [senas roadmap](../ROADMAP.md) M2/M6 | Jau suplanuoti direktoriai/specialistai, portfelis, apskaita, savininko klausimai, React/TS UI | Išplėsti tą pačią kryptį; lentelių projektas nėra įgyvendinta schema |
| [Verslomatika vizija](../../business-development/VISION.md) | Kelių verslų portfelis, autonomija ir buhalteriui sutikrinti dokumentai | Naujasis pavedimas konkretina valdymo platformą ir kiekvieno agento chat; VISION/IDEAS/STATE šiame lange neredaguoti |
| [models.py](../runtime/src/pinet_core/models.py), [db.py](../runtime/src/pinet_core/db.py), [migracijos](../runtime/migrations/versions/) | Business/site/host; business/environment scope, transakcinis kontekstas, scoped Case ir MailMessage; RLS migracijos | Pernaudoti; dabartinė Business turi po vieną unikalų site/host. Nėra įgyvendinto organizacijos narystės, kelių domenų ir juridinių asmenų registro |
| [security.py](../runtime/src/pinet_core/security.py) | Edge HMAC, worker ir operatoriaus Bearer secret | Individualios paskyros, sesijos, narystės ir deleguotos teisės dar reikalingos. Runtime secret nekelti į viešą browser bundle |
| [api.py](../runtime/src/pinet_core/api.py), [pašto UI](../runtime/src/pinet_core/mail_console.html) | `/operator/mail-ui`, verslo pasirinkimas, incoming/outgoing/draft filtrai, laiško detalė, priedas, atsakymų sync, routing valdiklis | Tai esamas pašto modulis; nėra visų agentų organizacijos, bendros darbų eigos ar direktoriaus chat |
| [mailbox.py](../runtime/src/pinet_core/mailbox.py), [mail_reader.py](../runtime/src/pinet_core/mail_reader.py) | Scoped žinutės ir ryšys su Case; riboto testinio gavėjo siuntimas ir susietų gijų atsakymai | Pernaudoti siaurus kontraktus, transporto kvitus ir priedų teises; gyva outbound kampanija dar neprijungta |
| [service.py](../runtime/src/pinet_core/service.py), [jobs.py](../runtime/src/pinet_core/jobs.py), [models.py](../runtime/src/pinet_core/models.py) | Pokalbio įvykiai, lease/generation, Jobs ir Outbox; Event/Job/Outbox/Artifact paveldi privalomą ConversationChild | Iškelti bendrą vykdymo primityvą ir adapters. Apskaitos ar direktoriaus darbui nekurti fiktyvaus kliento Conversation |
| [profiles.py](../runtime/src/pinet_core/profiles.py), [agent_instructions.py](../runtime/src/pinet_core/agent_instructions.py) | Tipizuoti nišų elgesio profiliai ir komponuojamos instrukcijos | Tai agentų registro įvestys; dar nėra bendros AgentDefinition/Instance/Run schemos visiems agentų tipams |
| [employee_scores.py](../runtime/src/pinet_core/employee_scores.py) | Patikrintų stebėjimų mėnesio/metų vertinimo funkcija; agento deklaruoti laimėjimai neįskaitomi | Trūksta bendros tikrų stebėjimų projekcijos ir UI. Neatlyginti už laiškų kiekį; rezultato kreditą tarp agentų valdyti atskirai |
| [learning_controller.py](../runtime/src/pinet_core/learning_controller.py), [calibration.py](../runtime/src/pinet_core/calibration.py) | Vietinio pokalbio mokymosi/kalibravimo realizacija | Rodysime versijas, radinius ir bandymų ribas. Pokalbio release teisės automatiškai neperkeliamos outbound ar finansams |
| [Facebook modulis](../FACEBOOK_MODULE.md), [routes.py](../runtime/src/pinet_core/facebook/routes.py), [console](../runtime/src/pinet_core/facebook/console.html) | Atskira privataus signalo/juodraščių modulio konsolė ir scoped keliai | Prijungti kaip capability; tai nėra viso portfelio dashboardas ar universalus gyvas social sender |
| [invoicing.py](../runtime/src/pinet_core/invoicing.py), [invoice_pdf.py](../runtime/src/pinet_core/invoice_pdf.py), [order_tests.py](../runtime/src/pinet_core/order_tests.py), [sales.py](../runtime/src/pinet_core/sales.py) | Deterministinis pinigų juodraštis, PDF, testinio pasiūlymo patvirtinimas ir reply eiga | Snapshot aiškiai `issued=False`, `invoice_number=None`. Nėra tikros sąskaitos išrašymo, mokėjimo patikros, didžiosios knygos ar buhalterio priimto eksporto |
| [budget.py](../runtime/src/pinet_core/budget.py), API usage receipt | Biudžeto rezervacijos, provider estimates, `invoice_verified=False` | Veiklos sąnaudų įverčius atskirti nuo banko/sąskaitų apskaitos. Nežinoma CLI kaina nėra 0 EUR |
| [acquisition](../runtime/src/pinet_core/acquisition/), [roadmap](../acquisition-plan/ROADMAP.md) | Vietinis evidence/fit/draft vertinimas, replay/dedup, atskiras dialogų lab su `.eml` | Nėra gyvo discovery adapterio, distributed scheduler, outbound DB/outbox/send, inbound webhook ir signup attribution |
| [content-studio](../../content-studio/README.md), [server](../../content-studio/src/server.mjs), [app.js](../../content-studio/public/app.js) | Vietinis portfelis, turinys, kalendorius, generavimo darbai ir release; localhost host/origin guard | Tai turinio darbo aplinka. Neeksponuoti jos localhost API kaip viešo SaaS; pradėti nuo read adapterio ir tikrų darbų komandų |

## Ką reikia įgyvendinti bendrai

Agentų registry/lifecycle, organizacijų autentifikacija ir narystė; agentų savarankiški durable darbai; bendri operacijų įvykiai ir išorinių veiksmų kvitai; direktoriaus gijos; faktų/ataskaitų įrankiai; peržiūros ir veiklos UI; ne vien pokalbiui skirta dokumentų saugykla; legal-entity apskaitos schema ir adapteris; produkcinis paleidimas bei atkūrimas.

Esamo `Case` ID galima išlaikyti bendru verslo įvykio ryšiu, bet ne visiems darbams privalomas kliento case. Canonical `site_id` migraciją projektuoti iš dabartinės Business, o ne perrašyti senus įvykių IDs. [Migracijos kryptis](ARCHITECTURE.md) ir [priėmimas](ROADMAP.md) būtini prieš senų API perjungimą.

## Būsenos, kurių auditas nepatvirtino

Verslomatika.lt domeno/hosting/auth/gyvo dashboardo; 24/7 scheduler; Madbeauty pilno acquisition-to-active-provider kelio; visų nišų voice/live channel readiness; faktinės MB Pinet PVM ar SVS konfigūracijos; realaus banko feed; oficialaus invoice numbering; buhalterio programos importo, laikotarpio uždarymo ir deklaravimo. Šie statusai lieka UNVERIFIED arba PLANNED, priklausomai nuo realizacijos.

Pašto/invoice testai kode perskaityti, bet šiame dokumentiniame pakeitime nepaleisti. Ankstesnio runtime README pradžioje yra istorinių statusų, vėliau papildytų naujesniais įrašais; dabartinę galimybę nustatome pagal kodą ir tiksliai datuotą įrodymą.
