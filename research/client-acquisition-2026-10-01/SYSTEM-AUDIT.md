# Dabartinės bazės ir klientų paieškos plano auditas

2026-10-01. Aprėptis: šio repo AGENTS / START_HERE / skills, MAIL_CORE ir VOICE_CORE_INTEGRATION; viešo nišų core D1 migracija, užklausos route ir SMTP helper; dviejų užbaigtų nišų BUSINESS; RESEARCH.md nurodyti interneto šaltiniai. Po naujesnio savininko nurodymo papildomai perskaityta autorizuota balso sesija ir jos runtime README / models / API / mail_reader / mailbox / sales / instructions / calibration source. Nekartotas gyvas mail ar runtime testas, nežiūrėta klientų dėžutė ar DB, neištirta visa legacy fabriko sistema. Tai konkrečios bazės source vertinimas; aktyvaus vykdytojo naujesnius pakeitimus sutikrinti jo handoff metu.

| Sritis | Faktinė būsena | Sprendimas / įgyvendinimo priklausomybė |
|---|---|---|
| Komercinis pasiūlymas | Auksarankių / laiptų BUSINESS atskiria mokėtoją ir patvirtintą vykdymą; kitų 18 kanalų kryptys šiame tyrime yra hipotezės | Kiekvienos nišos planą sieti su aktualiu BUSINESS; nekopijuoti seno seed |
| Gaunama forma | D1 `site_id` / `source_path` ir saugojimas prieš SMTP patikrinti kode | Išsaugoti esamą nepriklausomą kelią; production / tikra paklausa vertinami atskirai |
| Mail pristatymas | MAIL_CORE turi ankstesnio konkretaus self-test transporto ir INBOX gavimo įrodymus | Tai ne naujas acquisition kampanijos, kiekvienos nišos ar nuolatinio inbox agento testas |
| Kontaktų atradimas / signalai | Niche runtime / studijos tikrintuose moduliuose nėra įgyvendintos acquisition eilės | Pirmas atskiras mažas read-only prototipas su šaltinio / datos / rolės įrodymais |
| Inbox skaitymo / atsakymo agentas | Agentų runtime `mail_reader.py` turi žinomų gijų IMAP skaitytuvą; `mailbox.py` / `sales.py` susieja atsakymą su case ir ribota lab eiga | Perimti tą kelią; visų naujų inbound klasifikavimo, visų nišų reply worker ir production įrodymo nėra |
| Klientų / partnerių atskyrimas | Dabartinė D1 forma neturi prospect / supplier / referral / outcome modelio | Atskirai planuoti duomenų modelį, ne sėti internete rastus prospectus į gautas užklausas |
| Rinkodaros leidimas | Dabartinis `consent_at` formos laukas nėra newsletter / outreach paskirties įrodymas | Atskirti paskirtis ir kanalo / adresato pagrindą; nereikalauti reklamos sutikimo užklausos pateikimui |
| Šaltų laiškų transportas | Hostinger publikuotos sąlygos netinka numatytai unsolicited kampanijai | Dabar tyrimas, leistina viešo kanalo veikla pagal atskirą teisę ir gautų / sutartų kontaktų kelias; automatinio cold SMTP nėra |
| Bendras atsisakymas | Acquisition suppression runtime neįrodytas | Privalomas prieš siuntimo realizaciją, viso operatoriaus apimtis be nišų klientų teksto atvėrimo |
| Idempotency / outbox | Agentų runtime turi patvarų Outbox / MailMessage bei lab pardavimo revision; formos helper atskiras | Perimti esamą mechanizmą, tikrinti acquisition crash / ambiguous SMTP / refusal / duplicate apimtį; čia naujas PASS neatliktas |
| Kanalo atribucija | `source_path` yra URL pathname; kampanijos ryšys neišsaugomas kaip šiame plane numatytas experimentId | Būsimas neasmeninis experiment / partner kodas ir realus backend ryšys su formos įrašu; migracijos dabar nėra |
| MCP / kredituojami duomenys | Tik oficialios dokumentacijos / kainynų tyrimas; paskyros / ryšiai neįjungti | Jei reikia, mažas skaitymo testas su realiais limitais ir nuliniais naujų mokamų paslaugų kaštais; vien įdiegimas neįrodo vertės |
| Viešųjų pirkimų prieiga | TED Swagger / OpenAPI GET 200 vietoje; dokumentacija nurodo anoniminę Search API | Faktinės nišos paieškos / rezultatų tikslumo testas dar neatliktas; nevadinti rasto pirkėjo |
| Klientų paieškos GUI | Agentų runtime jau turi operatoriaus mail UI; acquisition signalų / eksperimentų ekranai šiame darbe tik suplanuoti | Plėsti tą pačią sistemą; turinio kalendorius savaime neparduoda |
| Balso integracija | Esama sutartis ir dalinis runtime, production voice išjungtas | Tas pats siteId / CaseSource / aktualūs faktai; tikro garso / išlaidų vartai vertinami atskirai |
| Instrukcijų sluoksniai / kalibravimas | `agent_instructions.py` turi core + role + nišos fragmentus ir hash dviem nišoms; static candidate admission egzistuoja | Researcher handoff ir kitų nišų onboarding dar derinami; regex / static PASS nėra nepriklausomas semantinis pagerėjimas ar promotion |
| Tikra paklausa / pajamos | Šis tyrimas kontaktų neišsiuntė ir sandorių negavo | Jokio 10/10 acquisition ar pelningumo balo; pirmas realus eksperimentas matuojamas atskirai |

## Siūlomas pirmo prototipo priėmimas

Tyrimo režimo prototipui pakanka vieno kanalo, dviejų aiškiai atskirtų nišų ir mažos šaltinių imties. Jis turi grąžinti pagrįstus / atmestus / UNVERIFIED įrašus, teisingai atmesti pasibaigusį terminą ir nesurinkti nepageidautinų asmens duomenų. Atrankos testui siuntimo nereikia. Kurti adapterį esamam agentų runtime, ne antrą lygiagretų CRM; [COORDINATION](COORDINATION.md) aprašo perduotą bendrą kalibravimo matricą.

Vėlesniam kontaktavimo režimui reikės ACQUISITION_CORE vartų: konkretus leistinas kanalas, tikras patikrintas transportas, autorizacijos ribos, suppression, patvari outbox, atsakymo / dublikatų / kaštų valdymas. Sintetinė acceptance patikra nėra realus klientų bandymas.

Šio darbo artefaktai patikrinti skill / nuorodų / katalogo / tikro CLI prompt loader lygmeniu. Detalės `VERIFICATION.json` ir `editorial-tests.log`. Tai ne naujo skill nepriklausomo autonomijos bandymo ar veikiančio pardavimo agento įrodymas.
