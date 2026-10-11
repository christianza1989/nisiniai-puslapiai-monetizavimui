# Patvarus priimtos kliento versijos registracijos ryšys

Šis vietinis inkrementas registruoja priimtą privatų juodraštį konkrečiam `Business` ir dabartinei portfelio teisei. Registracija neįrodo domeno nuosavybės, viešų šaltinių leidimo, agento profilio, kalibravimo ar kanalų veikimo.

## Administratoriaus veiksmai

`scripts/customer_creation_registration.py provision --input <private.json>` naudoja tik aiškiai administracinę vietinę / `test-*` DB prieigą. Įvestis: `creation_id`, `accepted_revision` (1–20), `candidate_sha256`, `accepted_source_revision`, `authorizing_session_id`. Failą laikyti privačiai, ne Git. Kliento HTTP rašymo operacijos nėra.

Patikrinama dabartinė patvirtinta kliento paskyra, galiojanti jo sesija ir portfelio savininko teisė. Priimama tik dabartinė neužimta versija su tikru bendros AI komandos priėmimu, tiksliu turinio hash, istoriniu kodo SHA ir kanoninio privataus V2 importo įrodymais. Kodo SHA lyginamas su išsaugota priimtos versijos tapatybe; jo nekeičia nauja platformos kodo versija. Dabartinio kodo tinkamumas vertinamas atskirai.

`siteId` išvedamas iš serverio `creation_id`: `creation-<UUID be brūkšnių>`. Domenas nėra kliento ar verslo tapatybė. Bet kuris to paties domeno įrašas su kitu `siteId` sustabdo registraciją; esamo įrašo ar teisių perėmimo pagal domeną nėra. Nežinomi operatorius ir verslo kontaktai nepakeičiami paskyros adresu ar tinklo numatytomis reikšmėmis.

Esami `control.bootstrap` registracijos primityvai sukuria tik registruotą, dar neprijungtą verslą ir teisę. Profilis, žinios, publikavimo įrašai, onboarding, policy ir agentų išlaidos nekeičiami. Tikslus pakartojimas iš naujos galiojančios sesijos grąžina tuos pačius ID ir išlaiko pirminę autorizavusią sesiją. Nauja priimta revizija reikalauja naujo administratoriaus veiksmo; ankstesnis ryšys lieka istorijoje.

Esamos teisės patikra administratoriaus transakcijoje užrakina jos eilutę iki transakcijos pabaigos. Konkurentinis `enabled=false` pakeitimas palaukia registravimo pabaigos; po atšaukimo kliento skaitytuvas rodo `grant_revoked`. Registracija niekada neįjungia atšauktos teisės iš naujo. Ribotam skaitytuvui papildomų rašymo ar eilutės užrakinimo teisių nereikia.

`revoke` įvestis: `registration_id`, `candidate_sha256`. Atšaukimas galutinis tik šiam ryšiui; `Business`, teisė ir ankstesni rezultatai lieka. Administratorius gali atšaukti ryšį ir nebeturint galiojančios kliento sesijos. Pakartotinis atšaukimas nekeičia laiko; tos pačios revizijos įjungti iš naujo negalima. Naujos revizijos registracija ir atskiros teisės atšaukimas yra atskiri sprendimai.

## Kliento stebėjimas

`GET /customer/v2/creations/{id}/registration` grąžina `creation-registration.v1`; vienintelis pasirenkamas query parametras – `accepted_revision`. Kitos / kartotinės reikšmės atmetamos. Prašymas dėl senos revizijos grąžina409, svetima ar nebeautorizuota paskyra401/404, netinkami šaltinio įrodymai503.

Prižiūrimas skaitytuvas: `creation_registration.service.projection(tx, session, creation, requested_revision=None)`. Kviečiant pirmiau taikomas įprastas `owned(..., lock=True)`. `RegistrationView` pateikia `missing`, `current`, `stale`, `revoked` arba `grant_revoked` ir tikslią `RegisteredRevision` tapatybę. `binding_current` galioja tik dabartinei neatšauktai neužimtai versijai. Galutinė dabartinės paskyros ir vienos sujungtos teisės / ryšio DB projekcijos patikra vyksta toje pačioje transakcijoje. Privati sesija, kontaktai, juodraštis, įrodymų tekstai ir artefaktų keliai negrąžinami. Atsakymas `private, no-store`.

`public_source_admitted=false`, `profile_admitted=false`, `channel_activation=not_performed`; domeno teisė, F1 ir paleidimas lieka `UNVERIFIED`. Kliento UI negali registracijos ženklo naudoti kaip agento įjungimo leidimo. Senas `agent-preparation.v1` nekeičiamas šiame inkremente; prieš gyvą prijungimą root atskirai suderina `agent-preparation.v2` kontraktą ir UI bei išsaugo v1 įrodymus.

## Migracija ir perkėlimas

0016 papildo0015: viena nauja lentelė su ENABLE/FORCE RLS, tik `SELECT` runtime rolei ir keturiais papildomais referenciniais UNIQUE raktais esamose lentelėse. Kompozitiniai FK saugo priimtą reviziją, turinio hash, istorinį šaltinio SHA, klientą / organizaciją / portfelį / aplinką, verslo `siteId` / domeną, teisę ir pirminę sesiją. DB trigger leidžia tik vienkartinį `revoked_at` pakeitimą; įrodymų tapatybė nekinta. Rutininis logout neatšaukia istorinio priėmimo; naujas veiksmas visada tikrina dabartinę sesiją.

Švariam PC taikoma esama eiga: nauja privati konfigūracija, `bootstrap.py --role-only`, administratoriaus `alembic upgrade head`, įprastas bootstrap. Clone neperkelia klientų, sesijų ar priimtų juodraščių. Runtime rolė negali kurti registro, suteikti teisių ar keisti ryšio.

Prieš downgrade sustabdyti naują skaitytuvą. `alembic downgrade 0015_content_work` pašalina tik0016 lentelę / trigger ir naujus referencinius raktus; verslai, teisės ir0015 duomenys paliekami. Registracijos istorija prarandama pašalinus naują lentelę, todėl prieš operacinį rollback ją išsaugoti atskiru privačiu DB backup. Kodą ir DB keisti suderinta eile; neperrašyti senų migracijų.

## Tikrinimas

Offline patikros: `uv run pytest -q offline_tests/test_creation_registration.py`; scoped Ruff ir diff / staged safety. Realios DB patikros: `uv run pytest -q tests/test_creation_registration.py tests/test_customer_public.py tests/test_control_portfolio.py` tik izoliuotoje sintetinėje DB su0016 ir restricted role. Sintetinės paskyros, kanoninis privatus V2 importas, fiksuoti modelio atsakymai; mokamas provider, SMTP, DNS ir viešas paleidimas nevykdomi.

2026-10-10 patikros: 57 offline testai PASS per 7,33 s; scoped Ruff ir diff PASS. Root savo izoliuotoje sintetinėje PostgreSQL bazėje vykdė 73 registracijos, kliento ir portfelio testus: PASS per 323,49 s. Child šaltinio kelias ir tik du DB URL buvo perduoti jo kontroliuojamam subprocess; child tėvinės konfigūracijos ar kredencialų neskaitė ir nekopijavo. Šaltinis per bandymą nepakito.

Root migracijos bandymas `0015→0016→0015→0016` PASS: patikrintos dvi sintetinės registro eilutės ir esamų lentelių snapshot išliko. Populiuotų 0015 GUIDE eilučių bandymui nesėta, todėl jų išsaugojimo actual įrodymo šis bandymas nepateikia. Pirmas paketas davė 57 PASS / 15 FAIL / 16 teardown ERROR dėl praleisto kanoninio naujos QA bazės bootstrap ir `businesses` skaitymo teisių; išsaugotas originalus rezultatas. Po bootstrap tas pats nekeistas šaltinis davė 72 PASS per 260,40 s.

Papildomas konkurentinis teisės atšaukimo testas originaliame šaltinyje davė 1 FAIL per 7,27 s. Po siauro administratoriaus eilutės užrakto pataisos jis davė 1 PASS per 6,67 s, tikrindamas tikrą `pg_blocking_pids` blokavimą ir vėlesnę `grant_revoked` projekciją; galutinis 73 testų paketas apima šią regresiją. Root saugo originalius ir galutinius nekintamus privačius log / JSON įrodymus.

Tikros kliento registracijos, veikiančios runtime bazės migracijos, provider ar kanalų įjungimo šios patikros neatliko. Šis dokumentas nepatvirtina naujo kliento agento ar visos platformos priėmimo.
