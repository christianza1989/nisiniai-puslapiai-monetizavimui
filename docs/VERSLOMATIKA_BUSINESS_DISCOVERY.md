# Verslomatikos pradinis verslo pokalbis

## Aktualus pavedimas ir būsena

2026-10-13 savininkas pakeitė kliento eigą: trumpa idėja arba „dar neturiu idėjos“ → AI tyrimas ir poreikio pokalbis → išsaugotas lankstus verslo, klientų paieškos ir įrankių planas → aptarimas ir naujos plano redakcijos → aiškus „Kurti verslą“ → visas svetainės paruošimas → dizainerio / klientų paieškos / aptarnavimo agentai ir esamas kalibravimas. Agentai pasirenka pagrįstą verslo modelį, funkcijas, puslapių sistemą ir brandą pagal konkrečią idėją, be universalaus trijų puslapių verslo šablono.

Šio pirmo šaltinio paketo apimtis: veikiantis serverinis pradinis pokalbis, versionuota ataskaita, nepriklausoma plano peržiūra, tiksliai patvirtinto plano perdavimas esamam kūrimo vykdytojui ir atkuriamas testinių užklausų archyvavimas. **Viso vietinio pavedimo būsena OPEN.** Perdavimo adapteris pradeda dabartinę bendro kūrimo užduotį; jis dar neužbaigia funkcinės svetainės, media, editorial, rendererio, SEO/GEO ar faktinės foundation patikros. foundation_status=UNVERIFIED, can_create_agents=false ir can_open_designer=false yra tikros dar neužbaigto adapterio ribos.

Backend savininkas: root, codex/customer-discovery-flow-20261013; failų langas issue66#6132801462, papildymai #6133048571/#6133206050. UI/BFF savininkas: koordinatorius, discovery-portal / codex/customer-discovery-ui / portal PR66. Pirmojo bandymo originalai neliečiami; naujas paprasto kliento bandymas nėra priimtas vien pagal šaltinio testus.

## Pokalbis ir ataskaita

Naudojamas tas pats patvirtintas klientas, savininko Portfolio, Session, RLS ir control envelope. Įvestis tik portfolio_id, message ir idempotency_key; techninis specifikacijos, pavadinimo ar domeno laukas nereikalingas. AI gali pasiūlyti kryptis ir užduoti prasmingus klausimus prieš sukurdamas planą. Reikalavimus galutiniam veiksmui ir viešinimui atskiria nuo naudingų vietinių hipotezių.

Ataskaita apima dešimt sprendimų sričių: verslą, klientą, acquisition, vykdymą, ekonomiką, svetainę, turinį/SEO/GEO, brandą, agentus ir rizikas. Tai coverage patikra, ne iš anksto parinktos verslo funkcijos. Agentas pats sudaro deliverables ir jų realią dependency seką. Kanalo plane yra pirkėjo segmentas, ketinimo signalas, paieškos metodas, naudingas pasiūlymas, bandymas, ekonomikos nežinomybės, leidimų sąlygos ir stop taisyklė. Treg prieinamumas, aprėptis ir kaina negali tapti išgalvotu prijungtu įrankiu: neprijungtas runtime connector rodomas unavailable/planned su alternatyva.

needs_input išsaugo AI klausimus ir ankstesnį pokalbį, planas gali būti null. plan_ready reikalauja pilnos ataskaitos ir neatsakytų required_for_build klausimų nebuvimo. Prieš buildable būseną atskiras kritikas ir koordinatorius vertina tikslų kandidatą; jų candidate_sha256 turi sutapti. Pataisymams naudojamas esamas dviejų ratų modelis, daugiausia šešios patvariai apskaitytos role rezervacijos. Paprastas klausimų turn gali užbaigti darbą vienu creator kvietimu. Naujas evaluator, scorer ar corpus nekuriami.

Šaltinių model_read_claim lieka independent_verification=UNVERIFIED; toks teiginys nėra nepriklausoma fakto, teisių ar rinkos patikra. Domeno kandidatas nėra nuosavybė. Kiekvienos redakcijos originalas ir turinio digest nekintami. BFF privalo išlaikyti originalų report_revision/report_sha256, o ne tyliai persiųsti naujesnį planą paspaudus senos ataskaitos mygtuką.

## Sąsajos

Kanoninė [business-discovery.v1 sutartis](contracts/verslomatika-business-discovery.openapi.json) generuojama `python -m pinet_core.business_discovery.contract`.

- POST /customer/v2/discoveries ir GET list/detail.
- POST /{id}/messages su base_revision/message/idempotency_key.
- GET /{id}/messages ir /reports su offset/limit; išsaugota istorija atskirta nuo aktyvaus plano.
- GET /{id}/execution pateikia tikrų Job/Attempt metaduomenis ir siaurą tikro source reader stebėjimų projekciją, be raw tekstų/traces/kelio.
- POST /{id}/build su report_revision/report_sha256/idempotency_key atominiu būdu sukuria vieną esamą Creation/Job ir BuildApproval.
- POST /{id}/archive išjungia dar nepradėtą discovery ir sulaiko vėlyvą rezultatą.
- POST /customer/v2/creations/{id}/archive grąžina atskirą creation-archive.v1. GET creation list numatytai neberodo archyvuotų; include_archived=true ir nuosavi historical detail/artifact/message skaitiniai išlieka. Archyvuotos kūrimo užklausos taisymas neleidžiamas.

Visų mokamų / build veiksmų privalomas patvarus UUID prieš siuntimą. Prarastas atsakymas pakartojamas tuo pačiu key ir tais pačiais baitais; naujas key nėra automatinio retry būdas. Pasenusi redakcija, pakeistas key turinys, nepriimtas planas, svetima tapatybė, išjungta narystė ar pasibaigusi sesija nekuria naujo darbo. Planas perduodamas pilnas per serverinį exact-approval context; suvestinės tekstas jo nepakeičia.

## Vykdytojas ir šaltiniai

business_discovery_enabled ir business_discovery_runner_enabled numatytai false. Esamos creation/customer/control teisės ir fiksuoti CLI profiliai būtini. Naujo `customer_discovery_worker.py check|once|worker --discovery-id <UUID>` kontrolė yra operatoriaus priemonė; klientas nepasirenka executable/workspace/model/įrankių. check modelio nekviečia. Source preflight tikrinamas prieš darbus, naudojamas bendras creation-execution DB mutex; šaltinio keitimas reikalauja švaraus checkpoint ir naujo admission.

Tyrimo veiksmų optional ceiling business_discovery_research_limit=0 reiškia, kad papildomo skaitinio ceiling nėra. Vykdymo deadline, output/context baitai, current authority ir visa bandymų apskaita lieka. Senos Trace numatytos šešios užklausos ir legacy DTO nekinta. Kasdieniai limitai naudoja tą patį bendrą creator/GUIDE/discovery bandymų registrą; archyvavimas jų nenulina.

Prieš realų creator galima serverio primary source reader: viešas HTTPS, tik vieši DNS adresai, sujungimas su patikrintu IP, teisingo host sertifikato TLS patikra, robots ir ribotas laikas/baitai. Jis skaito realias nuorodas, ne spėjamus URL, išsaugo privačius nepakeistus HTML, text/body digest ir stebėjimo laiką. Nei Source text, nei trace kelias nerodomi execution API. Booking automatizuotas rinkimas laikomas hold pagal jau nustatytą šaltinio taisyklių ribą. Neužbaigta ar nepavykusi aprėptis nevadinama pilnu tyrimu. Šaltinio perskaitymas neįjungia tiekėjo, nepatvirtina licencijos ar ekonomikos.

## Migracija ir priėmimo ribos

0029 po0028 prideda šešias FORCE-RLS lenteles; Report/Attempt/BuildApproval/CreationArchive runtime turi tik SELECT/INSERT. Session/Job turi reikalingą UPDATE. Scope FK sieja tikrą owner/org/portfolio/environment. Populiuotos istorijos downgrade atsisako. UI archyvavimas neištrina Creation, account, provider originalų ar apskaitos; operacinės SQL bazės purging ši užduotis neatlieka.

Source QA naudoja tik atskirą sintetinę PostgreSQL bazę ir provider0 callbacks. Tai nėra įprasto kliento UI, tikro modelio, platformos, target-PC ar viešo paleidimo įrodymas. Naujas source-only paketas nekuriamas vien šiai dalinei šaltinio pataisai. Supabase, kalbos-only taisymas/Gemini, SMTP/voice/social, viešas tunnel/DNS/deployment, pirkimai ir scheduler lieka savininko sustabdyti.

## Konkretūs likę darbai

Naują discovery patvirtinimą turinčiam Creation vien Registration/grant
neleidžia rašyti agentų aprašų. customer-agents.v1 create/revise tikrina
serverinį require_agent_foundation ir grąžina409 website_foundation_not_ready,
kol dabartinis statymo adapteris tebėra private draft / UNVERIFIED.
Tai nėra įgyvendintas READY proof adapteris. Discovery funkcijos išjungimas
jau sukurto BuildApproval vartų nepanaikina. Esamų aprašų GET/history išlieka;
nepajungti ankstesni verslai šiame siaurame pataisyme nemigruojami.

1. Clean source/contract handoff ir exact UI/BFF consumer; migration/adoption į išsaugotą owned DB, nauja įprasta savininko sesija, tikras minimalus / no-idea dialogue/report/approval UI.
2. Tikras automatinis visų svetainės statymo etapų controller: katalogas/palyginimas/local inquiry, esamas turinys/media/editorial/renderer/SEO-GEO ir fail/replay/source/cancel vartai.
3. Actual foundation proof; tada per-module Designer ir acquisition/customer-agent sąsajos bei esama kalibracija. Registracija ar private-draft PASS foundation nepakeičia.
4. Naujas savarankiškas kliento testas iš kelių sakinių, be root tiekėjo inventoriaus / turinio / rankinių praleistų veiksmų. Išsaugoti visus tikrus originalus, intervencijas ir ribas.
