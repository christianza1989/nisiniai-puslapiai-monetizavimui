# FB grupių klientų paieškos tyrimas

2026-10-01, Europe/Vilnius. Užduotis: įvertinti savininko atidarytas FB grupes ir autonominio kanalo galimybes visoms nišoms. Rezultatas — [vieno FB koordinatoriaus planas](../../FB_ACQUISITION_PLAN.md), ne įjungtas botas. Papildo ankstesnį [bendrą acquisition tyrimą](../client-acquisition-2026-10-01/RESEARCH.md).

## 1. Metodas ir ribos

Savininko jau prijungto Chrome tabo ribota UI peržiūra: grupių feed, paieška „meistrų kontaktai“, vienos grupės diskusija / About / trys taisyklės, tos grupės paieška „ieškau“. Messenger/asmeninis inbox neatvertas. Grupių narystė nekeista, komentarai, reakcijos ir DM nesiųsti. Baigus originalus tabas grąžintas į [grupių feed](https://www.facebook.com/groups/feed/); tik agento sukurtas Meta dokumentacijos tabas uždarytas. Kitų sesijų Gmail/core tabai neliesti.

Oficialius Meta puslapius pirmiausia bandyta rasti / skaityti web įrankiu. Jo prieiga kai kur gavo 429 / login / temporarily-blocked atsakymus; tai to fetch kelio ribos, ne savininko paskyros užblokavimo įrodymas. Aktualios sąlygos, Groups API changelog ir Messenger policy/overview perskaityti tiesiogiai oficialiuose puslapiuose per prijungtą naršyklę. Šaltinių datos ir access mode laikomi [SOURCES.json](SOURCES.json). API/app/token veikimas neišbandytas.

Nekopijuoti asmens profilių, telefono numerių, narių sąrašų, raw postų ar privačių tekstų į šį tyrimą / CRM / turinio paketą. Žemiau — grupių vieša metainformacija ir anoniminis poreikių kategorijų vertinimas. Grupės paieškos mėginys nėra statistinis paklausos ar reklamos konversijos tyrimas.

## 2. Ką realiai radome

Grupių paieškoje matėsi bent devynios reikšmingos kandidatinės bendruomenės: Vilniaus / Kauno meistrų kontaktai, statybų patarimai, paslaugų kontaktai, „Ieškau meistro“. Jų duomenys [GROUPS.json](GROUPS.json). Tai kandidatai: aštuonių taisyklės ir actual pirkėjų postai neperžiūrėti. Paieškos rodoma narių / postų statistika nėra unikalių pirkėjų skaičius.

Detaliau apžiūrėta [GERŲ MEISTRŲ KONTAKTAI — SIŪLYK / IEŠKOK VILNIUJE](https://www.facebook.com/groups/namostatyba/about), groupId iš matomų UI nuorodų `1079095809599396`:

- Vieša / matoma grupė, Lithuania / Construction. About rodė **32 764 narius**, **24 naujus postus šiandien**, **716 per paskutinį mėnesį**. „Šiandien“ priklauso nuo platformos laiko ir stebėjimo dienos, ne bendras dienos vidurkis.
- Aprašas leidžia ieškoti / siūlyti paslaugas ir rekomenduoti darbus. Perskaitytos trys taisyklės: pagarba, neapykantos / patyčių draudimas ir grupėje pateikto turinio privatumo gerbimas. Atskiro bot / duomenų eksporto leidimo nematyta.
- Matoma reklama buvo paslaugos teikėjo pasiūlymas; jos negalima skaičiuoti kaip pirkėjo užklausos.

Grupės paieškos „ieškau“ penkių matomų rezultatų anoniminis vertinimas:

| Matomas poreikio tipas | Vertinimas mūsų pirmai auksarankiams nišai |
|---|---|
| Sienų / lubų vidaus apdaila Vilniuje | Konkretus darbų poreikio signalas; apimtis už siauro baldų/kabinimo piloto ribų |
| Namo tinkavimas Vilniaus rajone | Specializuotas didesnis darbas; ne auksarankiams dabartinis pasiūlymas |
| Rangos / kelių profesijų brigadų ar darbuotojų paieška | Atskirti B2B procurement ir recruitment; nėra mažo buities darbo |
| Konstrukciniai betonavimo darbai Kaune | Netinka apimtis ir vieta; Vilniaus grupės pavadinimas neįrodo posto geografijos |
| Buto elektros instaliacija | Neįtrauktas darbas; nesiūlyti mūsų baldų/kabinimo paslaugos |

Paieškos „Most recent“ filtras nebuvo įjungtas, originalios datos šiuose matomuose rezultatuose nepatvirtintos. Todėl tai **ne šviežių kvalifikuotų lead sąrašas**. Šiame mažame mėginyje nepatvirtinta nė viena aktuali mūsų siauro pasiūlymo užklausa. Tai neįrodo, kad grupėje ar rinkoje tokios paklausos nėra.

Praktiška pamoka: grupė svarbi dėl temos ir auditorijos, bet agentas turi tikrinti kiekvieną postą. „Ieškau“, daug narių ir aktyvi grupė neatsveria netinkamos apimties, pasenusios datos ar neaiškios vietos.

## 3. Patikrintos platformos galimybės

| Pirminis šaltinis | Patikrintas faktas | Mūsų išvada |
|---|---|---|
| [Automated Data Collection Terms](https://www.facebook.com/legal/automated_data_collection_terms), effective 2024-10-07 | Automatiniam rinkimui reikia Meta leidimo; sąlygos apima programinį naršymą / gavimą | Savininko mandatas ir grupės admino leidimas atskiri. Naršyklės wrapper savaime nelegalizuoja nuolatinio collector |
| [Graph API v19 changelog](https://developers.facebook.com/docs/graph-api/changelog/version19.0/) | Senas Groups API / jo minimos permissions pašalintos visose versijose 2024-04-22 | Nekurti grupių sprendimo ant panaikinto API. Tai nėra įrodymas, kad visos kitos Meta integracijos uždraustos |
| [Messenger overview](https://developers.facebook.com/documentation/business-messaging/messenger-platform/overview), updated 2026-09-28 | Platforma skirta verslo Page / profesionaliai IG paskyrai, pokalbį pradeda žmogus; yra webhooks, scoped IDs ir app/Page prieiga. Platforma aprašyta kaip nemokama | Tinkamas autonominio inbound kelias. Asmeninių DM / grupės profilių prieigos iš to nėra; mūsų konkrečios Page kontrolė ir access lygis dar nepatikrinti |
| [Messenger policy](https://developers.facebook.com/documentation/business-messaging/messenger-platform/policy), updated 2026-09-28 | Daugumai įėjimų standartinis langas 24 h; pirmas pranešimas po Click-to-Messenger/Direct reklamos gali atverti iki 7 dienų. HumanAgent skirtas žmogui; automatinis atsakas turi 30 s reikalavimą | Tikrinti tikrą event / kanalo / window pagrindą. Reklama nėra dabartinio nemokamo plano dalis; AI negali apsimesti HumanAgent |

Messenger policy taip pat atskiria ribotus Page komentaro private reply ir kitus approved naudojimus. Tai nėra universali teisė DM'inti grupių žmonėms. Apžvalgoje yra Standard / Advanced access ir own-Page review išlygos; negalima automatiškai žadėti „App Review visada būtina“ arba „mūsų paskyrai viskas bus leidžiama“. Realizacijos metu tikrinti actual app/Page/scopes ir tuo metu galiojančią oficialią dokumentaciją.

Tai dokumentacijos patikra 2026-10-01. Nemokama API prieiga nereiškia nemokamo LLM, serverio, nuolatinio kompiuterio veikimo ar suteiktos production prieigos.

## 4. Kokią automatizaciją verta kurti

| Kelias | Paskirtis | Sprendimas dabar |
|---|---|---|
| Personal-profile browser bot | Nuolatinis grupių skaitymas / join / komentarai / asmeninis inbox | Meta automatizacijos pagrindas UNVERIFIED; 24/7 režimo neįjungti |
| MCP / browser-use / n8n wrapper | Orkestruoti jau leistinus įrankius | Integracijos sluoksnis, ne šaltinio licencija; naujos prenumeratos nereikia |
| Oficialus Page Messenger | Atsakyti tikriems verslo inbound, išsiaiškinti poreikį ir registruoti case | Prioritetinis būsimas adapteris bendrame core; nepadaryta app integracija |
| Grupės naudingas turinys / admin bendradarbiavimas | Poreikio ruošiniai, aiškios darbų ribos, leistinas perėjimas į mūsų kontaktų kelią | Galimas kanalo modelis, partneris / admin sutikimas nepatvirtinti; admin nesuteikia Meta rinkimo leidimo |
| Mūsų svetainės formos ir naudingi maži įrankiai | Surinkti paties žmogaus pateiktą poreikį ir neasmeninį šaltinio ryšį | Remtis esamu core; palaikyti kontaktą nepriklausomą nuo FB |

Nereikia 30 asmeninių profilių. Vienas paskyros koordinatorius, tinkamos nišų konfigūracijos ir vienas bendras case pagrindas. API inbound pokalbiai gali vykti atskirai nuo vienintelio browser writer. [Plane](../../FB_ACQUISITION_PLAN.md) numatyti grupių registry, site isolation, tikri action kvitai, GUI, etapai ir dar nepaleistos priėmimo patikros.

## 5. Išvada ir įrodymų ribos

Kanalas turi realių darbų paieškos signalų, bet ši peržiūra nepatvirtino mūsų konkrečių klientų, mokėjimo, partnerių ar pelningumo. Tinka pradėti nuo vienos nišos, aiškaus poreikio ir leistino kanalo; SEO lieka pagrindinis tinklo įėjimas. Viešai rastas prašymas nėra mūsų gauta užklausa.

Savininko naujas įprastų join / komentarų mandatas įrašytas plane. Ši užduotis atlikta kaip tyrimas; išorinių join / siuntimo veiksmų nėra. Klientų duomenys, paskyros slaptažodžiai ir sesijos slapukai netraukti į dokumentus. Instrukcijų / nuorodų patikra bus saugoma `VERIFICATION.json`; ji nėra FB adapterio e2e ar leidimo įrodymas.
