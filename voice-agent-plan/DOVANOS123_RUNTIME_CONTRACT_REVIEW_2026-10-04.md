# Dovanos123 M4: runtime kontrakto peržiūra

2026-10-04, Europe/Vilnius. **Dokumentinė kodo peržiūra; onboarding nevykdytas.**

Pagrindas: [root migracijos sutartis](../DOVANOS123_CORE_INTEGRATION.md) ir [gift sesijos planas](C:/Users/lenovo/Documents/dovanos-memorycasting/docs/DOVANOS123-BENDRO-TINKLO-INTEGRACIJOS-PLANAS-2026-10-04.md). Pritariu v2 su nepakitusiu v1, gift URL/dizaino išsaugojimui, shadow importui ir atskiram host cutover. M1/M2 rezultatai dar nėra įgyvendinti ar priimti.

Esamo DB modelio nereikia kopijuoti kiekvienai svetainei. Tačiau vien pridėti profilį ir registracijos eilutę M4 nepakaks. Prieš onboarding būtina sutarti žemiau nurodytas sąsajas. Runtime, DB, konfigūracija, kontaktai, procesai, šeši esami profiliai ir learned releases šios peržiūros metu nepakeisti.

## 1. Kas jau dera su planu

| Pagrindas kode | Ką galima panaudoti M4 |
| --- | --- |
| `Business.site_id` ir `canonical_host` yra unikalūs; `business_id` yra vidinis UUID | Stabilus `dovanos123` ir jo tikras canonical host; idempotentinis tikslinis registravimas be naujo UUID per retry |
| Case, žinios, politikos, kontaktai ir source checkpoint turi business/environment scope; DB transakcija nustato RLS kontekstą | Atskirų svetainių ir aplinkų duomenų izoliacija |
| `KnowledgePage.revision_hash` ir `projection_hash` yra atskiri | Originalios patvirtintos revizijos ir leidžiamos tekstinės projekcijos tapatybės išsaugojimas |
| `CaseSource` turi source/site/record ID ir aplinką; ingest ir checkpoint pakeitimas vyksta vienoje transakcijoje | Patvarus importas, paskutinio identiško batch replay ir cursor compare-and-swap |
| D1 importas nesiunčia pranešimų ir nekuria voice sesijų | Patvari forma gali veikti nepriklausomai nuo agentų kanalų |
| `Policy.enabled=false`, `followup_enabled=false`, `jev_enabled=false`, biudžetas 0 pagal nutylėjimą | Naujo site registravimas nėra leidimas skambinti, siųsti ar vykdyti komercinius veiksmus |

Tai kodo savybės. Esami testų failai peržiūrėti, tačiau jų buvimas nėra Dovanos123 bandymo PASS; testai šiame dokumentiniame ture nepaleisti.

## 2. Tapatybė: Business yra globalus DB registras

`Business` neturi `environment_id`. Toje pačioje core DB vienas `site_id=dovanos123` turi vieną `business_id`; aplinka skiria jo Case, policy, žinių ir kitus scoped įrašus. Skirtingos fizinės core DB gali turėti kitokius vidinius UUID. Negalima kurti atskiros tos pačios site eilutės kiekvienai aplinkai šiame registre.

M4 mapping sutartyje užfiksuoti:

- viešą siteId ir canonical host;
- legacy `sites.key` ir patikrintą konkrečios D1 aplinkos `sites.id`;
- D1 loginio šaltinio / binding tapatybę ir source aplinką;
- tikslinį core DB registrą, jo business_id ir tikslinę environment reikšmę;
- kas patvirtino mapping, jo versiją ir per-site cutover būseną.

Browser laukas negali pasirinkti šio mapping. Per-site rollback išsaugo business_id, CaseSource ir checkpoint; nepradedama nauja UUID grandinė. Vietinis HTTP transportas nepakeičia kanoninių žinių URL į localhost.

## 3. Kritinis registracijos ir readiness atskyrimas

`agent_instructions.SITES` šiandien išvedamas tiesiai iš `PROFILES`. `local_knowledge_sync.sync_once` reikalauja kiekvieno tokio site manifesto ir tikrina visus prieš rašydamas bent vieną. `network_manifest.mjs` skaito aktyvų compiled paketų registrą.

**Jei dovanos123 įtraukiamas į global PROFILES, kai jo paketas dar shadow ir aktyviame registre nėra manifesto, vietinis sync gali nutrūkti iki kitų šešių žinių atnaujinimo.** Tai konkreti kodo priklausomybė, ne atlikto būsimos migracijos gedimo testo rezultatas. Profilis ir `Policy.enabled=false` šio šaltinio priklausomybės neišsprendžia.

Todėl M4 reikia atskirti:

1. žinomą profilio aprašą ir DB mapping;
2. priimtą žinių šaltinį konkrečiai aplinkai;
3. įjungtą kanalą / capability;
4. leidimą automatiškai kalibruoti ir aktyvuoti learned papildymus.

Izoliuotame M4 bandyme shadow gift projekcija gali būti aiškiai prisegtas testavimo įvesties šaltinis; ji netampa dabartinėmis viešomis žiniomis kitoms aplinkoms. Globalus source helper neturi priklausyti nuo dar nepriimto gift profilio. Ar readiness bus registry įrašas, ar aiškus per-site šaltinio sąrašas, nuspręsti įgyvendinimo sutartyje prieš kodo pakeitimą. Jokio tylaus pasenusio snapshot fallback.

Priėmimo įrodymas: gift profilis egzistuoja, gift šaltinis dar neprijungtas arba netinkamas, o esamų šešių žinios ir jų politikos atnaujinamos kaip anksčiau.

## 4. V2 gift turinys ir žinių dydis

Dabartinis Node adapteris tekstą išveda tik iš paragraph, heading ir list blokų. Jis nėra nuostolių neturintis būsimo v2 inline, source/author, productRecommendation ir CTA modelio adapteris. Gift žinioms reikalinga versiją suprantanti tekstinė projekcija iš **to paties M2 matomo inventoriaus**. Nekurti antro approval / publishAt filtro Python pusėje ir nenaudoti legacy D1 turinio kaip slapto papildymo.

Runtime `Knowledge` šiandien leidžia daugiausia **30 puslapių**, o vieno puslapio tekstą riboja iki **18 000 simbolių**. Paieška grąžina iki trijų šaltinių su iki 4 000 simbolių tekstu. Pirmiausia M0 nustatyti tikrą gift inventoriaus dydį. Nežinome, ar jis telpa; daugiau kaip 30 puslapių negali būti tyliai nukirpti.

Jei ribos viršijamos, prieš M4 sutarti versijuotą indeksavimo / puslapiavimo sutartį: pilnas inventorius, deterministinis cursor, deployment/revision tapatybė, size ribos, atšaukimas, TTL ir pilno įkėlimo priėmimas. Dalinis žinių atnaujinimas neturi tapti tariamai pilnu manifestu. V2 turinio paketas nebūtinai reikalauja v2 runtime transporto, jeigu pilna, semantiškai teisinga flat projekcija telpa; tai tikrinama, o ne numanoma.

Atšaukimas turi atskirą ribą: `KnowledgeRevocation.revision_hashes` daugiausia 30 hash viename batch. Didesnis indeksas reikalauja visų atšaukimo dalių, base_revision ir retry/replay sutarties; manifestų puslapiavimas savaime jos neišsprendžia. Šis papildymas dera su root sutarties nauju M4 papildymu.

Gift autorystė ir merchant/affiliate ryšiai pateikiami tik kaip patvirtinti matomi faktai. MemoryCasting komercinis tikslas nėra MB Pinet parduodamas ar agento vykdomas užsakymas. Produkto nuoroda nesuteikia kainos, likučio, checkout ar atšaukimo įrankio.

## 5. D1 importo konkretūs apribojimai

`lead_import.Batch.source_system` šiandien priima tik `website_d1`; `SourceCheckpoint` skiriamas pagal business/environment/source_system. `CaseSource` unikalumas yra environment/source_system/site_id/source_record_id. Atskirų fizinių D1 bazių ar kelių loginio šaltinio kartų tapatybė šiame kontrakte savaime neišsaugoma.

M4 arba paskiria vieną kanoninį source stream kiekvienam site/environment ir dokumentuoja jo cutover, arba įveda versijuotą source namespace. Du nepriklausomi legacy ir naujos formos šaltiniai neturi naudoti vieno checkpoint kaip atskirų srautų. Binding pavadinimo pakeitimas savaime nėra naujas source, o naujo source sukūrimas savaime nesuteikia teisės pakartotinai importuoti tuos pačius klientus.

Dabartinis wire Lead reikalauja:

- UUID ID, site_id, source_path;
- created_at ir consent_at epoch **milisekundėmis**, vienodos reikšmės;
- name bent 2 simbolių, email, message 20–3 000 simbolių;
- status tik `new` arba `notified`.

Vietinis SQLite reader skaito tik `niche_leads` ir jo CLI leidžia tik traktoriupadangos / greitossvetaines. HTTP ingest platesnis, tačiau tai nėra production Cloudflare connector. M0 turi patikrinti tikrus gift laukus, ID formatą, timestamp vienetus, consent ir status semantiką. Trūkstamų duomenų nepadaryti fiktyviais; nekurti atsitiktinio naujo UUID kiekvieną kartą, nepratęsti trumpos žinutės išgalvotu tekstu ir nepaversti status consent įrodymu. Nesuderinami įrašai turi matomą migracijos išimtį arba iš anksto sutartą versijuotą Lead adapterį.

Cursor yra `(created_at,id)`. Jis importuoja tik už dabartinį cursor vėlesnius įrašus. Vėliau įdėtas backfill su senesniu laiku automatiškai nepatenka; checkpoint negalima atsukti dėl rollback ar retention. Sutarti užbaigtą pradinį inventorių ir atskirą reconciliation/backfill procesą. Source ID normalizavimas ir SQL ID rikiavimas turi sutapti; neišgalvoti legacy ID formatų prieš inventorių.

Žinomos esamo kontrakto savybės: vienas Case per priimtą source ID; status nekeičia turinio fingerprint; pakeistas source turinys konfliktuoja; paskutinis identiškas batch replay nekuria naujo Case; senesnis batch po cursor pažangos neturi rewind teisės. Retention ištrina PII ir CaseSource, išsaugodamas checkpoint — migracija negali perrašyti jo taip, kad prikeltų ištrintus klientus.

## 6. Kontaktai, profilis ir automatinis mokymasis

Profilis aprašo poreikio laukus ir bendravimą, o ne tikrus operatoriaus rekvizitus ar paslaugos vykdymo teisę. Sutarti konkrečius gift poreikio laukus ir conversation/sales/supplier MD pagal portalo realų pasiūlymą; nekopijuoti traktorių, montavimo ar svetainių kainodaros. Quality naudoja šio site conversation fragmentą kartu su bendru quality core.

Kontaktų autoritetas — priimtas šio site matomas paketas ir bendras kontaktų registras. Dabartinis local adapteris tikrina package email ir config atitikimą; runtime Knowledge.validate tikrina site/host/URL, o ne visą juridinių kontaktų politiką. M4 priėmimas turi atskirai palyginti matomą email, operatorių, formos gavėją, siuntėją, privatumo informaciją ir faktines išimtis. Kito merchant pardavėjo kontaktai nėra šio portalo numatytasis operatoriaus kontaktas.

Automatinis mokymasis šiuo metu įjungiamas bendru local nustatymu. Gift įtraukimas į PROFILES **nesukuria** `evals/learning-v2/dovanos123.json`, registry hash ar naujos nišos vertinimo. Learning controller jų reikalauja. Voice/SMTP OFF savaime nėra learning OFF.

Todėl gift learned promotion turi likti neprileistas, kol priimti atskiri šio site scenarijai, žinių šaltinis ir instrukcijų release. Per-site admission negali išjungti esamų šešių mokymosi. Naujam site neišduoti svetimos aktyvios MD versijos; šešių istorinių įrodymų ar balų nepervadinti į gift PASS.

## 7. M4 priėmimo papildymai

Prieš runtime pakeitimą sutarti fixtures ir vieną rašytoją pagal WORKSTREAMS. Įgyvendinimo priėmimas turi parodyti:

- stabilų mapping retry bei neteisingo site/host/source/environment atmetimą;
- esamų šešių source refresh tęstinumą, kai gift dar nėra ready;
- v1 nepakitimą ir gift v2 visų matomų žinių, hash, T−1/T/T+1 bei revocation atitikimą;
- aiškų virš 30 puslapių / didelio straipsnio rezultatą be tylaus praradimo;
- D1 source namespace, konkurentinį replay, vienodo laiko ID tvarką, backfill ir rollback nekeičiamą checkpoint;
- nesuderinamų legacy Lead įrašų matomą apskaitą be fiktyvaus consent ar ID;
- importo metu 0 pranešimų, 0 voice sesijų, atskirus delivery kvitus ir per-site capability OFF;
- gift learning admission OFF iki jo korpuso priėmimo; kitų nišų politikų ir active/versions failų hash nepakitimą.

Runtime registracija / schema, produkcinis D1 reader, DNS, išorinis paštas, FB ir commerce neįgyvendinti šiuo dokumentu. Ši išvada neperrašo root ar gift sesijos failų: jų savininkai gali įtraukti ją į savo M4 vartus prieš įgyvendinimą.
