# Kliento verslo agentų paruošimo stebėjimas

## Dabartinis papildomas V2 kelias

2026-10-10 source inkrementas prideda atskirą
`GET /customer/v2/creations/{creation_id}/agent-preparation-v2` ir
`contract_version=agent-preparation.v2`. Jis naudoja kanoninę
`creation_registration.service.projection` / `RegistrationView` projekciją.
Naujo DTO `registration` pakeičia seną `mapping`; to paties domeno kandidatas
nesuteikia teisės stebėti verslo agento duomenų. Reikalinga source migracija0016.
Migracija0016 veikiančioje vietinėje API8860 bazėje atlikta su source594e179;
actual kliento verslo provision neatliktas. Papildomas V2 API veikia, o
dashboard3019 reader prijungimas derinamas atskirai; V1 kelias išsaugotas.

Tik `registration.binding_current=true` leidžia `runtime.scope=current_registered_business`.
Tai reiškia tikslų dabartinį savininką, priimtą versiją, candidate hash, istorinį
source SHA, native intake ir patvarų administratoriaus patikrintą Registration.
`missing`, `stale`, `revoked`, `grant_revoked` ar vykstanti naujos versijos
užduotis palieka `runtime.scope=unmapped`. Tada profilio/instrukcijų/žinių ir
verslo politikos stebėjimų nėra. Bendri SMTP/voice konfigūracijos booleans
nesuteikia kanalo leidimo. Prieš grąžinant vėl skaitomi exact private Revision/Job
ir kanoninė dabartinė registracija; per užklausą atšaukus ryšį arba grant,
ankstesni runtime stebėjimai pašalinami, o tikra atšaukimo būsena išlieka matoma.

Abu `business_registration` ir `creation_business_binding` checks dabar remiasi
dabartine duomenų baze ir PASS tik esant tiksliam galiojančiam susiejimui.
Likę 12 vartų išlaiko atskirus source/config/intake/channel įrodymus.
`source_pin` tebevertinamas konservatyviai: istorinis priimtos versijos SHA
nesikeičia, skirtingas dabartinio vykdymo envelope SHA palieka
`FAIL/accepted_source_outdated`. Tai nepanaikina istorinės Registration
tapatybės ir nesuteikia jai naujo priėmimo. `v2_current` žinių registras savaime
neįrodo šio juodraščio patvirtinto viešo leidimo; jo vartas lieka UNVERIFIED.
Naujiems `creation-<UUID>` verslams esamas šešių statinių profilių registras
nesuteikia automatinio profilio. Atskirai ruošiama profilio priėmimo realizacija.

Visi atsakymai tebėra `state=blocked`, `can_activate=false`,
`activation=not_performed`, calibration/full F1/launch UNVERIFIED. Nėra provider,
pašto, voice, acquisition, learning, session extension ar patvaraus SQL/file
rašymo. Tas pats query/auth/opaque deny/cache kontraktas taikomas abiem keliams.

Kanoninis naujas JSON:
[verslomatika-customer-agent-preparation-v2.openapi.json](contracts/verslomatika-customer-agent-preparation-v2.openapi.json),
generuojamas iš actual `AgentPreparationViewV2` per
`runtime/scripts/customer_agent_preparation_v2_contract.py`. UTF-8/LF ilgis
**25 333 baitai**, SHA-256
`0d71d925b3cb454f688548388948680753fcf738104bb22c7396e08e47b3c273`.
V1 DTO ir JSON
baitai išsaugoti. Portal reader pereina į V2 tik gavęs tikslią functional source
versiją, JSON hash ir patikrintą READY. Rollback: pirmiau grąžinti portal reader
į originalų V1 endpoint/DTO, tada atšaukti tik papildomą V2 source paketą.
Registration istorijos ir0016 duomenų trinti ar perrašyti nereikia. V1
`mapping.binding=not_implemented` yra senos projekcijos ribotumas; aktualiai
patvaraus ryšio būsenai naudoti kanoninį registration/V2 kelią.

Source priėmimas:82focused offline PASS6.24s (nauji V2, ankstesni V1 ir
registracijos offline testai),27restricted PostgreSQL PASS170.15s
(ankstesnis V1 ir naujas V2), scoped Ruff/diff PASS. PG naudojo tik root
atskirą anksčiau bootstrapped sintetinę bazę ir random test-* aplinkas, tikrą
native Node importą bei sintetinius role atsakymus; provider/channel calls0.
Visų aštuonių vykdymo source failų SHA prieš/po nepakito. Tikrinti
same-host-without-binding, exact current registration/native V2 žinios,
pending/stale/revoked/grant-revoked ir actual committed revoke/payload/intake
pakeitimai skaitymo metu; read-only state/session snapshot ir svetimo
savininko atmetimas. Ši source patikra nėra naujo tikro verslo priėmimas.

Actual vietinis API priėmimas2026-10-10T17:53:51Z: clean source
`594e179f48fbca4584d0249b8eb1506af8ba9d57`, own8860,0016 schema po explicit
upgrade ir canonical bootstrap (abu exit0). Control/business/GUIDE preflights
PASS, provider0 ir workers nestartavo. Dabartinės NEW creation authenticated
V2 GET200: `missing`, `binding_current=false`, `no_revision`, `not_imported`,
`unmapped`, `blocked`,14checks/14blockers, false activation. Visi šeši kliento
paviršiai ir kiekvienos ankstesnės DB lentelės row count/hash tiksliai sutapo
su17:51:46Z priešmigraciniu kvitu; pridėta tik tuščia Registration lentelė.
Pats skaitymas DB state nepakeitė. Patikrintas quota20/20/0left, current
revision null ir cost unknown. Nėra provider/provision/public/profile/session/
channel aktyvavimo. Naujos README/journal versijos nehotloadinamos į serverį;
jo snapshot tebėra594e179.

Dashboard3019 V2 vietinis priėmimas atliktas su director source
`9f28c9e4f73d118c2a836f1c455391fd016e062b`: atskiri tikslūs V2 pins ir tipai,
nepakeisti V1 pins, tas pats privatus frontend BFF. Director19focused tests,
TypeScript, build ir atskira read-only peržiūra PASS. Root actual Chrome21:06LT
nepriklausomai matė tikrą missing registraciją, keturias grupes,14blokatorių ir
jokio agentų įjungimo. Nauja panel screenshot saugoma ignoruojamame runtime
`artifacts/screenshots-20261010/mokymai-ai-preparation-v2-panel-root-20261010.png`.
Root actual API18:09:51Z kvitas vėl patvirtino tą pačią594/0016/typedV2 būseną,
visus šešis nepakeistus kliento paviršius ir visų ankstesnių DB lentelių hash/count
pagal originalų priešmigracinį kvitą. Nėra provider, provision ar kanalo veiksmų.
Šis UI priėmimas nepatvirtina naujo verslo, dinaminio profilio, sesijos ar paleidimo.

## Ankstesnio V1 inkremento priėmimas

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
| creation_business_binding | V1 FAIL: ši projekcija negrąžina vėliau pridėto patvaraus creation/revision/hash → Business ryšio; aktualiai būsenai naudoti V2. |
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
