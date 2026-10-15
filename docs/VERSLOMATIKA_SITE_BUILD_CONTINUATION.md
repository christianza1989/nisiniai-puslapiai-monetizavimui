# Patvirtinto verslo plano automatinis turinio tęsinys

Aktuali apimtis: savininko paprasto kliento kelias nuo idėjos pokalbio iki
tikros svetainės. Visas pavedimas OPEN. Šis inkrementas panaikina rankinį
kiekvieno pradinio gido pasirinkimą tarp esamų kūrimo ir native GUIDE etapų.
Tai nėra viso svetainės statymo ar foundation priėmimas.

Root own codex/discovery-site-continuation-20261013 iš e4d36a2e/public5924.
Issue66#6137390692/#6137421626/#6137607828. Portalą/BFF atskirai valdo
koordinatorius. Originalūs modelių, UI, FAIL ir apskaitos įrašai nekinta.

## Sąsaja ir saugojimas

site_build_enabled numatytai false. customer_site_build_worker.py
check|advance|once|worker --creation-id <actual UUID> yra vietinio operatoriaus
entrypoint. check ir advance nekviečia modelio; advance gali atominiu būdu
įrašyti vieną realų GuideJob. once vykdo vieną esamą trijų rolių grupę.
worker tęsia įvykdomus etapus ir išeina ties nesėkme, trūkstamu adapteriu
ar laukiama eiga; failed job automatiškai nekartojamas.

0030 prideda tik fixed SECURITY DEFINER control_site_build_candidates:
approved Creation UUID ir owner UUID. Tenant lentelių, provider count ar
istorijos nekuria/perrašo. Faktinė prieiga iš naujo tikrinama owner RLS,
originalios authorizing Session, Portfolio, approved report hash, exact
source, accepted team/intake ir current revision. Pasibaigęs login
nepratęsiamas ir nepaslepiamas už naujo operatoriaus Session.

Esama content-work.v1 POST admission perkelta į service.admit be DTO/schema
pakeitimo; API ir controller naudoja tą pačią native Node prepare, CAS,
quota, owner/source kontrolę ir GuideJob/event istoriją. Deterministinis
per Creation/revision/page UUID atkuria tą patį pending darbą po restart
ar prarasto kvito. Plati tema rašoma prieš siauresnes pagal jau validų
plano graph; neprimetamas mėnesinis dažnis. Later užduotys automatiškai
neįjungiamos. Ankstesnė Guide20 history riba šiuo inkrementu nekeičiama.

Tikslus creation-id filtravimas abiejuose esamuose workeriuose neleidžia
šio atvejo operatoriui netyčia paimti kito kliento queued darbo. Bendras
connection-held creation-execution DB mutex ir esami fixed role profiles
lieka. Jokio naujo evaluator/scorer/corpus ar paralelinio turinio rašytojo.

Archyvavimas tame pačiame owner/Creation transaction sustabdo active GUIDE
rows su cancelled įvykiu; bandymai/usage ir ankstesnis turinys išlieka.
GUIDE heartbeat/final-write authority ir admission papildomai tikrina
CreationArchive. Tiek archyvavimas, tiek expiry/source mismatch stabdo
naują dispatch.

## Priėmimo ribos ir likę adapteriai

Esamas business draft vis dar ribotas; pilnas katalogas, custom brand,
funkciniai palyginimai/local inquiry ir patvirtinto plano visų deliverables
įgyvendinimas dar OPEN. Controller niekada nepaverčia tokių juodraščių
READY. Sėkmingai parašęs visus initial GUIDEs grąžina page_quality /
media_editorial_renderer_pending, foundation/public UNVERIFIED.

Toliau būtina automatizuoti realią šaltinių/faktų projekciją, media su
teisėmis ir pikselių patikra, esamą revision-bound editorial/batch/release,
companion native import/render ir tikrą SEO/GEO/contact/inquiry patikrą.
Tik tada actual foundation proof ir Designer/customer/acquisition agentai
su esama kalibracija. Kalbos-only pataisos/Gemini ir gyvi kanalai held;
source suite nėra tikro modelio, ordinary UI, target-PC ar public proof.
