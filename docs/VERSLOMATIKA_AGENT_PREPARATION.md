# Kliento verslo agentų paruošimo stebėjimas

2026-10-10. `agent-preparation.v1` yra veikiantis tik skaitymo API inkrementas,
rodantis dabartines kliūtis kliento sukurtam verslui prijungti prie bendro agentų
core. Jis nėra agento aktyvavimas ar kalibravimo priėmimas. Platesnis savininko
pavedimas lieka atviras pagal
[sukūrimo ir kalibravimo sutartį](../SKILLS/business-agent-calibration/references/create-and-calibrate.md).

## API ir versijos

`GET /customer/v2/creations/{creation_id}/agent-preparation` naudoja esamą bearer
sesiją, patvirtintą kliento paskyrą ir dabartinį to portfelio savininką. Maršrutas
prijungtas tiek `control_api`, tiek pilname `api`; esamų creation/team/content
ir content-work sutarčių baitai nepakeisti. Reikalinga dabartinė vietinė/testinė
API konfigūracija ir jos source-pin startup vartai; papildomo rakto nėra.

Pasirinktinis `accepted_revision=1..20` tikrina tikslų dabartinį revision numerį.
Aiškiai pasenęs numeris grąžina `409 stale_revision`. Be parametro, neturint
versijos, gaunamas `200` su `state=blocked`. Nežinomi, pasikartojantys ar
neteisingi query parametrai grąžina `400`. POST nepalaikomas. Neautentifikuotas
kvietimas grąžina `401`; svetimas arba nebeleistinas išteklius `404`.

Envelope: `contract_version`, `environment`, aktualus API `source_revision`,
`observed_at`, `request_id`, `data`. Atsakymas turi `private, no-store`.
Kanoninis failas yra
[verslomatika-customer-agent-preparation.openapi.json](contracts/verslomatika-customer-agent-preparation.openapi.json),
generuojamas iš actual `AgentPreparationView` modelio per
`runtime/scripts/customer_agent_preparation_contract.py`.
UTF-8/LF ilgis **22 958 baitai**; SHA-256
`89c02974b120c164dabc3a29eef5d0f36f974b0119ca6420269c66c6f36c6e0c`.

`accepted_revision`, `candidate_sha256` ir `accepted_source_revision` išlaiko
istorinės užbaigtos privačios versijos tapatybę. Job turi būti `succeeded`,
susietas su šiuo creation ir source; exact revision payload turi atitikti jo
SHA-256. Tai savaime neįrodo trijų rolių priėmimo. `team_review` atskirai turi
`no_revision`, `unreviewed` arba `accepted`, ir exact accepted candidate hash.
Naudojamas bendras `creation.team.projection` priėmimo predikatas: sėkmingas
koordinatoriaus `accept_draft` tam pačiam Job ir candidate hash bei faktinis
`language_quality PASS` tam pačiam hash. Senas vieno kūrėjo juodraštis lieka
matomas, bet jo `accepted_revision` check yra `FAIL/private_revision_unreviewed`.
Kol vyksta naujos versijos darbas, ankstesnė tapatybė išlieka, check yra
`FAIL/creation_revision_pending`. Po priėmimo explicit ankstesnis numeris
atmetamas. Senesnis source SHA lieka matomas su `FAIL/accepted_source_outdated`;
atgaline data priėmimas neatnaujinamas.

## Tikri stebėjimai ir likusios kliūtys

Kiekvienas iš 14 privalomų checks turi PASS/FAIL/UNVERIFIED, kodą, aiškią
santrauką, scope ir tikrą stebėjimo laiką. `not_observed` neturi laiko ir visada
yra UNVERIFIED. `blocker_keys` yra tiksliai visi ne-PASS checks.

| Check | Stebimas šaltinis ir reikšmė |
| --- | --- |
| accepted_revision | Dabartinis Revision/Job ir exact bendras team acceptance; aktyvi nauja užduotis lieka kliūtis. |
| source_pin | Priimtos privačios versijos SHA palygintas su dabartiniu API SHA. |
| private_intake | Esamas istorinis native Node importo receipt; puslapių ir approved revision skaičiai. Tai `intake_snapshot`, ne gyvo turinio/publikavimo patikra. |
| business_registration | RLS matomas enabled grant tik tam pačiam portfeliui, organizacijai, aplinkai ir exact domenui. |
| creation_business_binding | FAIL: dabartinė schema neturi patvaraus creation/revision/hash → Business ryšio. |
| business_profile | Kandidato exact siteId/host pagal esamą `profiles.get`; tai source-code stebėjimas. |
| role_instructions | Esamo `agent_instructions.compose` conversation/sales/supplier/quality fragmentų hash; ne modelio/kanalo bandymas. |
| v2_knowledge | Kandidato dabartinis V2 registras: exact metadata/pages/receipt/content hash, revision, TTL ir revocation. Net `v2_current` lieka UNVERIFIED šios creation versijos atžvilgiu. |
| v2_session | FAIL: dabartinis bendras `service.start` priima V1; kliento creation/revision prijungimas prie native V2 sesijos neįgyvendintas. Atskiras internal simulation kelias savaime šio vartų nepriima. |
| site_voice | Dabartinis viešo balso site-admission leidžia tik traktoriupadangos; config buvimas neįrodo tikro skambučio. |
| acquisition | UNVERIFIED: ši creation versija neturi patikrinto mandato ir tikro kanalo įrodymų. Privatus Facebook draft modulis nėra live acquisition priėmimas. |
| email_followup | Stebima bendra kandidato followup policy ir SMTP enabled konfigūracija; leidimas nėra pristatyto laiško įrodymas. |
| email_reply | UNVERIFIED: actual reply/thread continuation šiai versijai netikrintas. |
| calibration | UNVERIFIED: revision-bound korpuso, holdout, kanalų ir mokymosi priėmimo nėra. |

Same-host grant yra tik `mapping.candidate` su
`relationship=same_host_owned_grant_candidate`. Net `connected` nereiškia
durable binding: `confirmed_business_id=null`, `binding=not_implemented`.
Neautorizuotas kito portfelio grant nepanaudojamas. Kandidato registry evidence
SHA yra source registracijos SHA, jis nėra creation ID ar šios versijos hash.

V2 šaltinio perdavimui naudojami jau įgyvendinti bendri
`knowledge_index.begin/batch/commit`; naujo knowledge variklio nėra.
Esamas `onboarding.status` native V2 learning admission grąžina false. Viešos
approved žinios, learning admission, business source-ready, policy ir exact
šios versijos mapping yra atskiri faktai. API iš registry grąžina tik ribotą
tapatybės/hash/skaičių/būsenos projekciją; ne puslapių tekstus, operatorių,
kontaktus, account email ar SMTP duomenis. Nėra kliento MB Pinet/contact default.

Šio kontrakto `state` visada `blocked`, `can_activate=false`,
`activation=not_performed`; calibration/full F1/launch lieka UNVERIFIED.
Tai sąmoningai tik dabartinis skaitymo vertikalus kelias: pirmiau reikia
įgyvendinti patvarų source/revision-bound provisioning ir tikrą V2 sesijos
admission, tada atskirą jų wire/priėmimą. Ši schema neturi fiktyvios ready šakos.
Vidinis simulation transportas, jei prijungiamas vėlesniu atskiru source
inkrementu, nėra šios klientų creation sesijos admission ar live kanalo įrodymas.

## Skaitymo ir izoliacijos ribos

Esami User/Session/Creation užraktai apsaugo dabartinį klientą ir versijos
tapatybę. SELECT-only Membership/BusinessGrant nepridedama UPDATE teisė ar
migracija vien dėl stebėjimo. Prieš grąžinant atsakymą pakartotinai skaitomi
dabartinis actor, grant ir Business siteId/host/source/connection. Per užklausą
committed grant revocation grąžina `404`; identity/source pasikeitimas `409
registration_changed`, be pasenusio DTO. Tai dabartinio stebėjimo užklausa,
ne atominis leidimas vėliau įjungti agentą: pakeitimas po final read turi būti
patikrintas naujoje užklausoje ir būsimame provisioning writer.

GET nekviečia expire/cleanup, neprailgina sesijos, nekeičia Job/intake,
neregistruoja ir neatnaujina knowledge/profile, nesiunčia laiško ir nekviečia
modelio, IMAP, Meta, balso ar viešo transporto. `set_config` ir shared policy
read lock yra transakcijos scope; persistent klientų state nerašoma.
Sugadintas exact revision ar team source grąžina `503 invalid_agent_source`;
sugadintas intake receipt išlaiko esamą `503 invalid_content_source`.
Nežinoma runtime būsena netampa tuščiu sėkmingu rezultatu.

## Patikra ir perdavimas

Bazė: parent `90fbd2d100e14ada7209d7efc79727bd17fbf1ac`; fresh private main
`13c9649c76dd48cdf426604cb721e1ccd58a9854`, public companion main
`ec8a9c032fe926d1d9722802d8eb26fa8bd02937`. Issue77 reservation
`6099083828`, upgrade `fd4e470a-0f02-4873-992c-8e3641ae8f1f`.
Tai child source ir vietinė QA, ne parent runtime ar main adoption.

Offline testai tikrina exact native hash/receipt/host, expiry/revocation/V1,
tikrų packaged profilių ir 4 rolių ribas, 14 checks, false readiness ir
nesutampančio team hash atmetimą. Actual atskirame QA PostgreSQL testai naudoja
esamą restricted runtime role/RLS, tikrą native Node private intake ir bendrą
V2 registry transportą. Role runner pateikia sintetinius fiksuotus atsakymus,
provider neįjungtas. Patikrinti auth/tenant/owner/account/session revocation,
legacy ir exact 3-role acceptance, revision transition, source/payload/intake
gedimai ir per užklausą committed grant/source/host pasikeitimai.

Pradinis actual PG bandymas turėjo 10 FAIL: SELECT-only grant/member row-lock
reikalavo UPDATE teisės, o nauja QA bazė dar neturėjo esamo bootstrap legacy
Business SELECT grants. Pataisytas tik šis skaitymo kelias ir užbaigtas
maintained bootstrap tik atskiroje QA bazėje; runtime role nepraplėstas.
Pradiniai FAIL ir Ruff importų taisymas išsaugoti journal fixing events.
Po pataisos pradinis rinkinys 10 PASS, išplėstas legacy/team/revision/revoke
rinkinys 12 PASS. Galutinis papildytas source/host rinkinys **14 PASS per
57,39 s**, final offline **22 PASS per 2,33 s**, scoped Ruff PASS. Ankstesni kvitai
neperrašyti. Tai vietiniai read-path ir synthetic worker patikrinimai, ne
actual provider, balso, acquisition, mail delivery/reply ar kalibravimo PASS.

Po tikslaus parent `c8bc851` admission inkremento integravimo į savo branch,
WORKSTREAMS konfliktas išspręstas išsaugant abu įrašus. Papildomas actual PG
bandymas įrodo: išnaudojus leistiną bandymo kvietimų ribą, nauja revision POST
atmetama `429`, tačiau jau išsaugotos versijos agent-preparation GET lieka
`200 blocked` ir nekeičia Job/session. Šios integracijos atskiras rinkinys
**15 PASS per 61,90 s**, offline **22 PASS per 4,37 s**. Source peržiūroje rastas
aprašo netikslumas, kai neturint importo buvo sakoma „matomas importas“;
aprašai dabar atskiria missing/failed/imported ir kartoja tikrą check reikšmę.
Viešų sąsajos frazių kalba peržiūrėta šaltinyje; dashboard renderinimą ir
naršyklės priėmimą atskirai atlieka parent/director.

Root integracija: `5466b771` perkeltas kaip `5810096`, `bcea07f6` kaip
`008439b`. Nepriklausomai paleista 22 offline patikros PASS per 3,05 s ir
14 restricted PG patikrų PASS per 67,16 s. Pirma bendra offline/PG komanda
sustojo rinkimo metu dėl vienodų testų failų pavadinimų; nei vienas testas
nebuvo paleistas. Atskiros numatytos komandos šią vykdymo problemą išsprendė
be kodo pakeitimo. Galutinė aprašų pataisa atskirai patikrinta: 25 offline
PASS per 4,12 s, 3 reikšmingos PG delta patikros PASS per 15,09 s, Ruff PASS.

Faktinis esamo kliento GET ties API `5810096` grąžino `200 blocked`, visas
14 patikrų ir 14 kliūčių, `no_revision`, `not_imported` bei `can_activate=false`.
Šešių kitų kliento paviršių duomenys prieš ir po tiksliai sutapo; provideris
nekviestas. Šis originalus kvitas taip pat išsaugo klaidingą teigiamą importo
aprašą prieš `008439b` pataisą. Pataisyto sujungto API ir dashboardo actual
priėmimas fiksuojamas atskirai; nei šis skaitymas, nei source testai neįjungė
aptarnavimo, klientų paieškos, pašto ar kalibravimo.

Atkūrimas: revert tik additive modules/router import+mount, generator,
contract ir šio inkremento tests/doc. Persistent migracijos, agento/channel
aktyvavimo ar klientų duomenų pakeitimų nėra. Parent/director atskirai valdo
UI/BFF, realius provider klientų bandymus ir vėlesnį prijungimo priėmimą.
