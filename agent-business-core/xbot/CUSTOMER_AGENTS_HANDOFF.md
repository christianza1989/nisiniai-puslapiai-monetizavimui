# X modulio prijungimas prie customer-agents.v1

2026-10-11 dokumentuota read-only peržiūra ir įgyvendinimo rekomendacija platformos savininkui. Tai nėra įdiegta PG sąsaja, kalibravimo rezultatas ar kanalo aktyvavimo leidimas.

## Tikslūs šaltiniai

- Platformos PR80: `a61ebabd57eb48f6151636a972f8ed2862274923`. Skaityti commit failai, ne jos darbo kopijos WIP.
- `docs/contracts/verslomatika-customer-agents.openapi.json`: Git blob UTF-8 bytes 41837, SHA-256 `eac95468062f57ab05e60680ae9978e7062c7b13dd6d8d3bd5c14a1bbb17caac`, keturi route paths. Hash perskaičiuotas iš Git blob, JSON išparsintas.
- X biblioteka: runtime `8533b9cc02d389592d5f33f1ce1792b167dc10d1`, peržiūros pradžios clean HEAD `2654df5f231944230cc431f05a346bc877cace48`, PR92 virš PR90. Šis dokumentas runtime nekeičia.
- Public companion: `5924a2eb858cf45e736bc5e79a2f07cfbbc39af2`; poros freshness PASS 2026-10-11T11:55Z, fetched mains core `7af6b9641012a30c5f95eac38a66daeff8f8cb39`, public `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`.

Partnerio pateikti 25 PG / 26 offline ir actual draft save/revise/replay/restart įrodymai yra platformos QA. Čia jie nekartoti ir nelaikomi X integracijos priėmimu. X bibliotekos 87 injected testų ankstesnė QA nekito. Naujos modelių, Treg, SQL ar UI operacijos nevykdytos.

## Mažiausia bendra integracija

1. Portalas per esamą BFF išsaugo savininko task draft ir jo immutable Config. Agent.purpose yra atrankos ketinimas; customer_research ar custom nėra installed X runtime. UI rodo serverio configuration_saved, not_admitted, UNVERIFIED ir false vykdymo reikšmes.
2. Platforma prideda atskirą per-module Admission. Jis nekintamai susieja module_id=xbot, environment/org/business/site, exact Registration id/fingerprint, Agent.id, Config revision/config_sha256, priimtą kalibravimo įrodymą ir jo exact source/instructions. Current/revoked generation ir teisės valdomos serverio; vien profilis jų nesuteikia. Konfigūracijos pakeitimas negali tyliai perkelti seno approval į naują versiją.
3. Pirmam adapteriui vienas admitted Xbot slot per environment/site. PG Agent gali būti keli, tačiau SQLite profiles PK yra site, jobs/records taip pat siejami su site. Antro X agento tame site nebindinti į tą pačią Service kaip savarankiško vykdytojo. Kitų purpose task drafts išsaugoti netrukdomai.
4. Serveris kuria Authority ir fresh async resolverį iš autentifikuoto principal arba atskiro current worker grant. `await AsyncModuleAdapter.bind/snapshot/command` pernaudoja biblioteką; jos privataus operatoriaus localhost API nepaversti customer auth. Vykdymas per Service.run_once ir default Agent, kuris tikrina prieš/po kiekvieno modelio kvietimo. Naujas adapteris turi išsaugoti tą pačią per-call patikrą.
5. Pirma PG integracijos partija apima tik OFF registraciją/snapshot ir kontroliuotą local-only bandymą su fake modeliu. Kalibravimas, protected connector, actual model budget ir gyvas X kanalas lieka atskiri priėmimai. X command enable niekada neaktyvuoja post/reply/DM/media ar paid read.

## Ką pernaudoti iš exact root

| Prižiūrimas šaltinis | Paskirtis ir riba |
| --- | --- |
| customer_agents.service.authority / check_binding | Current customer Session/owner, exact Registration/Agent/BusinessGrant, lifetime-before-actor ir galutinė Git/actor patikra. Tai konfigūracijos scope, ne module admission. writing=False gali skaityti retained terminal registration; execute papildomai tikrina current gyvą registraciją. |
| customer_agents.service.configuration_current / current_config / config_view | Current creation/revision/pending būklė; tikslus config revision ir payload SHA. config_view perskaičiuoja digest iš agent_id, registration_fingerprint, purpose, revision ir specification. |
| customer_profile.service.pin_registration → creation.routes.owned → customer_profile.service.projection | Exact lifetime prieš actor/creation; current Profile ir Registration projekcija, source/TTL/instructions blokai. Bendras Profile Admission nėra X Admission. |
| customer_profile.service.source + knowledge.reference_v2 | Policy/index ir tikro KnowledgeState row lock, tikslus V2 revision/hash/deployment bei pilnas index receipt. Source nerenuojamas skaitymu. |
| knowledge.resolve / projection | Dabartinių neatšauktų public puslapių turinys. reference_v2 viena grąžina metaduomenis ir pages=[], todėl nėra facts šaltinis. Atskirai saugoti atrinktų faktų puslapio ID/URL/revision kilmę. |
| knowledge_index.locked / begin / batch / commit; knowledge.revoke | Prižiūrimas indekso ir revokacijos kelias. knowledge.resolve_v2 ir knowledge_index.revoke funkcijų šiame commit nėra. |
| creation.service.current_actor; control.routes.scope; control.models.Session | Dabartinė verified paskyra, owner membership, Session expiry/revocation ir RLS. Worker negali be naujos teisės tęsti darbą seno browser Session vardu. |

`customer_agents.authority` yield yra PG transakcijos viduje. Nekviesti Service.run_once/modelio/provider iš to yield. Resolveris gali naudoti maintained helpers trumpai source patikrai ir privalo išeiti iš async scope, atlikti jo final checks/commit ir paleisti užraktus **prieš** grąžindamas Binding. Nelaikyti PG ar SQLite transakcijos per modelio/provider await; worker lease yra atskiras loginis koordinavimas.

## Binding ir fresh permission išvedimas

Serverio resolver `(authority, permission) -> Binding` kiekvieną kartą tikrina current identity, grant/owner arba worker teisę. permission yra operacijos paskirtis: xbot.configure/read/control/execute, ne savaime suteikiamas grant. Nelaikyti paskutinio ProfileView kaip teisės cache.

- Registration fields ateina iš exact server Registration, Profile/knowledge source iš current maintained projekcijos, o `admission_id` turi identifikuoti **atskirą X module Admission**, kuris per FK ir immutable hash susietas su exact Agent/Config/calibration. Bibliotekos DTO neturi atskirų agent_id/config SHA laukų: exact susiejimą ir naujos Config invalidaciją užtikrina tas PG Admission bei resolveris. Jei schema leis jo material pakeisti paliekant tą patį ID, šios rekomendacijos vartai nebus įgyvendinti.
- `profile_current` ir `module_admitted` išvedami iš tikros current būsenos; ne iš purpose, prisijungimo sėkmės, bendro Profile, istorinio approval ar UI pasirinkimo. Config pakeitimas, kalibravimo/source/instructions pakeitimas ir revokacija turi blokuoti seną Binding, išsaugant istoriją.
- `facts_sha256` yra `xbot.store.fingerprint` iš **tos pačios tikslios facts list**, kuri perduodama bind. Platformos `creation.service.digest` naudoja kitokią JSON serializaciją; šių hash nesutapatinti. Facts ir allowed_urls yra patvirtintų neatšauktų public puslapių projekcija, ne private Specification, kliento intake ar istorinio archyvo pažadai.
- `instruction_sha256` yra atskiras tiksliai vykdomo X instrukcijų teksto bytes hash. Bendro Profile conversation/quality hashes nėra X instrukcijų hash. X istorinis draft `instruction_hash` naudoja JSON-string fingerprint; jo neperrašyti kaip bytes hash. Resolveris tikrina packaged X source, ne vien Git SHA.
- `expires_at` yra stabilus priimto susiejimo deadline, ne now+TTL kiekviename resolve. Tikrinti dabartinį laiką ir source/admission/grant galiojimą. Pasikeitusi V2 revision/hash/deployment, revokacija ar pakeistas index receipt invaliduoja seną susiejimą. Atskirai patikrinta **nepakitusi** projekcija gali turėti naują freshness įrodymą išlaikydama originalią source tapatybę; vien GET nėra toks įrodymas. `facts_verified_at` nėra leidimas atnaujinti pasenusius faktus vien skaitant.
- Read/pause teisės atskirtos nuo execute. Po fresh read authority snapshot gali parodyti seną evidence ir source blocker. Trūkstamą pradinį module admission/binding portalas rodo kaip not_configured/not_admitted iš serverio; nesugalvoti Binding ID/hash vien tam, kad DTO susivaliduotų. Revoked owner/grant negauna net seno command receipt.

## PG↔SQLite priėmimo ir atšaukimo koordinacija

Platformos savininkas po šios peržiūros rezervavo savo būsimą migration0023 ir operator-only local nepakitusio šaltinio patikrą: originalių Knowledge/index receipt/Profile/fingerprint nekeisti, tik pridėti patvarų naujos tikros patikros įrodymą. Tai dar neperžiūrėtas planuojamas root source pakeitimas. Resolveris po jo priėmimo galės tikrinti šį current freshness įrodymą, tačiau privalės išlaikyti changed/revoked facts, instructions, grants ir TTL vartus. Tokio įrodymo galiojimas ir X `Binding.expires_at` yra atskiri terminai: patikra negali pakeisti jau priimto X deadline palikdama tariamai tą patį Binding. Pasibaigus jam būtinas naujas explicit priimtas susiejimas; vien pasenusių hash sutapimas negali atgaivinti teisės. Per-module Admission/ticket migracijai reikalingas kitas root rezervuotas numeris.

Fresh async resolver yra būtinas, bet nėra dviejų DB transakcija. Service.run_once po paskutinio await savarankiškai record/enqueue/finish į SQLite. Callback gauna profilį ir permission, ne job/attempt/dispatch/acceptance fazę. Kitas PG procesas gali atšaukti teisę tarp fresh observation ir local commit. Vien outbox revokacijos eilė ar papildomas snapshot šio tarpo nepanaikina.

Rekomenduojamas mažiausias **local-only** root kelias: PG yra autoritetas admission ir priimtai baigčiai, turi versioned generation ir patvarų job ticket/outbox. Vienas koordinuojamas worker valdo SQLite vykdymą, neturi standalone background worker konkurento. Lokalus completed/draft yra pasiūlymas. Po run_once root trumpa PG transakcija pagal canonical lock order iš naujo tikrina ticket, current generation, exact Config/source, grant ir owner/worker; CAS įrašo accepted arba rejected/quarantined receipt. Portalas accepted būseną rodo iš šio PG kvito. Dėl revokacijos atmestas rezultatas negali tapti accepted ar pagimdyti vykdomų child darbų be naujo current ticket. Lost response/restart reconciles exact ticket; nekeičia modelio/Treg kvitų į nežinomą nulį ir nekartoja išsiųsto veiksmo.

Tai PG **priėmimo** atomika, ne atomically admitted SQLite output ar kiekvieno vidinio modelio/provider dispatch įrodymas. Jei reikalaujama admission-at-commit kiekvienam vidiniam žingsniui, bibliotekai reikia atskiro explicit dispatch/acceptance hook su job_id, attempt/phase ir immutable ticket/generation; dabartinis profile-only resolver to neišreiškia. Arba keisti storage boundary į vieną autoritetingą saugyklą. Abiem atvejais tai atskirai koordinuojamas runtime pakeitimas ir realūs lenktynių testai, ne outer adapterio closure pataisa. Užraktų laikymas per visą run_once pažeistų release-before-await sutartį.

Live veiksmui reikalingas atskiras current dispatch admission, budget ir actor/connector/channel proof. Atšaukimas negali panaikinti jau pradėto išorinio X veiksmo. Jo tikras receipt/charge išlieka; netekus source/grant rezultatas uncertain/paused ir automatiškai nekartojamas. Šio local-only plano nepavadinti live priėmimu.

## Būtini actual root bandymai

- [ ] Verified owner per BFF įrašo X pasirinkimą ir exact Config; default OFF visur. Purpose customer_research ir bendras current Profile be X Admission neleidžia bind/execute.
- [ ] Svetimas tenant/site/Agent/Config ir retained revoked/terminal Registration: teisė paneigiama, jokios naujos eilės/modelio/provider pradžios. Current savininkas išlaiko tik leidžiamą istorijos skaitymą.
- [ ] Antras X Agent tame pačiame site negali užimti admitted slot ar perrašyti pirmo istorijos; kitų purpose drafts nesustabdomi.
- [ ] Config revision/hash, calibration proof, instruction bytes, source Git, V2 revision/hash/deployment, index receipt ir TTL pakeitimai atmeta seną Binding. Lithuanian facts hash parodo teisingą serializacijos skirtumą.
- [ ] Resolver, kiekvienas fake modelio kvietimas ir final acceptance su realiu restricted PG: current principal/worker revokacija ir pasikeitusi config sustabdo kitą kvietimą; SQLite ir PG užraktai nelaikomi per provider laukimą.
- [ ] Deterministiškai sustabdyti po final resolver prieš local SQLite record/finish, konkuruojančiu PG writer atšaukti admission/grant arba pakeisti Config, tada tęsti. PG accepted receipt neatsiranda, portalas nerodo accepted; usage išlieka, nėra automatinio child dispatch/resend.
- [ ] Konkuruojantys enable/pause UUID/CAS, outbox replay, revoke delivery gedimas ir worker/API restart nepraranda istorijos ir neįjungia live. SQLite completed be PG accepted aiškiai lieka nepriimtas.
- [ ] Actual dashboard queue/evidence/usage/blockers sutampa su serverio kvitais; nėra raw tokenų/private intake. Actor, CRM importas, biudžetai, actual kalibravimas ir X live lieka atskiri neužbaigti vartai.

Naujo atkuriamo P0–P2 siaurame bibliotekos async delta šia read-only peržiūra nenustatyta. Exact agent admission, worker authority, duomenų projekcija ir cross-store acceptance yra aiškios dar neįgyvendintos integracijos priklausomybės. Source merge ir šis dokumentas jų neįjungia.
