# Balso modulio ir nišinių svetainių integravimo sutartis

2026-09-30. Pagrindinės sesijos konkreti integravimo peržiūra pagal tikrą dabartinį kodą ir savininko autorizuotą balso sesiją `01a0f1fa-3e13-7ab0-867b-d0091e73e1b7`. Ši sutartis aprašo būsimo įgyvendinimo ribas; balso API, widget, Postgres adapteris ir telefonijos kanalai dar neįgyvendinti. Išsamesnis planas: [voice-agent-plan](voice-agent-plan/README.md); būsimi bendri verslo procesai: [agent-business-core](agent-business-core/README.md).

Būsena: galutinis bendras plano ir integracijos auditas **baigtas 2026-09-30**. Patikrintos faktinės viešo core sąsajos ir balso sesijos įtrauktos trys pataisos dėl etapų priklausomybių, PII telemetry ir runtime skills ribų. Planas suderintas tolesniam etapiniam įgyvendinimui; balso runtime, API, kanalų gavimas ir audio kokybė šiuo auditu neįrodyti ir neįjungti.

## Vienas šaltinis kiekvienai atsakomybei

Viešas variklis yra `C:/Users/lenovo/Documents/dovanos-memorycasting`. Integruojant reikia dar kartą perskaityti jo realų kodą, nes dokumentų data nėra API garantija.

| Duomenys | Dabartinis autoritetas | Balso modulio elgesys |
| --- | --- | --- |
| `siteId`, kanoninis host ir įdiegtas paketas | `lib/niche-sites.ts`, sugeneruotas paketų indeksas | Viešas edge parenka svetainę per esamą host resolverį. Bendrame agentų core laikomas stabilus `siteId` ↔ `business_id` susiejimas, o host yra patikrinta šaltinio projekcija, ne dar vienas rankinis registras. |
| Rodomas kontaktas | Įdiegtas, peržiūrėtas `pkg.site.contact`; numatytieji ir išimtys `config/niche-network.json` / `nicheNetworkContact` | Paketo ir numatytojo adreso neatitikimas aptinkamas onboarding metu. YAML profilis jų tyliai neperrašo. Telefonas yra tik konkrečios nišos faktas. |
| Operatorius, vidinis pranešimo gavėjas | `nicheNetworkContact`, `nicheLeadRecipient` ir [MAIL_CORE](MAIL_CORE.md) | MB Pinet / info@pinet.lt bendras numatytasis kontaktas; klientas ir operatorius yra skirtingi siuntimo tikslai. Atskiros dėžutės keičiamos esamomis išimtimis ir patikrinamos. |
| Matomi puslapiai bei nuorodos | `publicNichePages` → `projectPublicPages` → `dueRevision` | Žinių manifestas skaito šią projekciją. Balso Python modulyje nekurti beveik tokio paties publikavimo filtro kaip antro autoriteto. |
| Fazė, realus pajėgumas ir leidžiami veiksmai | Nišos dokumentacija, patvirtinti faktai ir būsimo agentų core mandatų registras | Pirmoje fazėje leisti informaciją ir tikrą poreikio registravimą; kaina, likutis, tiekimas ir booking išjungti, kol nėra realaus šaltinio ir vykdomo įrankio. |
| Esama formos užklausa | D1 `niche_leads`, `app/niche/[siteId]/lead/route.ts` | Išsaugojimas lieka nepriklausomas nuo balso ar Python procesų veikimo. |
| Pokalbis, analizė ir veiksmo kvitas | Būsimas bendras Postgres core | Ne kurti atskiro voice CRM; išlaikyti to paties verslo case, kontaktą, įvykius ir outbox. |

`networkDomains` žymi žinomą tinklą, ne domenų nuosavybės ar veikiančio deployment įrodymą. `networkLiveDomains` dabar tuščias. Produkcinė voice admission papildomai reikalauja patikrinto tikro domeno ir deployment; localhost leidžiamas tik aiškioje atskiroje testinėje aplinkoje. Kliento `siteId`, caller ID ar savavališka proxy antraštė negali pasirinkti kitos nišos.

Esamas `proxy.ts` atskiria ir legacy domenus per `SITE_CONFIGS`, įskaitant dovanų svetainę. Jie nėra automatiškai nišų paketai. Legacy domeno balso onboarding reikia jo tikro matomo turinio ir kontaktų adapterio; negalima kaip fallback priskirti pirmo nišos paketo ar kito verslo profilio.

## Viešo widget maršrutai

Tikrame `proxy.ts` nišų domenuose tiesioginiai `/niche/*` ir `/api/*` adresai dabar blokuojami; formos naudoja viešą `/uzklausa` alias. Todėl balso plano `/niche/{siteId}/voice/*` yra vidinių maršrutų pasiūlymai, o ne iš naršyklės jau pasiekiami adresai.

Įgyvendinant derinti mažą viešų same-origin alias rinkinį, pavyzdžiui:

| Viešas alias | Metodas | Būsimas vidinis route |
| --- | --- | --- |
| `/pokalbis/sesija` | POST | `/niche/{serverioSiteId}/voice/session` |
| `/pokalbis/busena` | GET | `/niche/{serverioSiteId}/voice/status` |
| `/pokalbis/kontaktas` | POST | `/niche/{serverioSiteId}/voice/contact` |
| `/pokalbis/baigti` | POST | `/niche/{serverioSiteId}/voice/end` |

Šie alias dar neįgyvendinti. Proxy parenka siteId iš tikro host, riboja metodą ir išlaiko tiesioginių vidinių adresų blokavimą. Sesijos endpoint papildomai tikrina aktyvumą, Origin/CSRF, capability ir išlaidų ribas. Voice workerio įvykiai bei žinių manifestas pasiekiami atskira autentifikuota serverių sąsaja, o ne nišos svetainės viešu catch-all ar naršyklės modelio įrankiu. Tiksli privataus transporto realizacija priklauso įgyvendinimo etapui.

## Žinių manifestas ir faktai

Būsima autentifikuota sąsaja grąžina `siteId`, `canonicalHost`, deployment ID, paketo fingerprint, projection laiką, puslapio ID/URL, originalios patvirtintos revizijos hash ir leidžiamą teksto projekciją. Projekcijos hash atskiras: nuorodų filtravimas negali pakeisti originalios patvirtintos revizijos baitų ar jos hash prasmės. Schema ir manifestas turi aiškią versiją; šio darbo metu `content-package` schema nekeista.

Tas pats deployment skirtingu laiku gali atverti naują patvirtintą įrašą pagal `publishAt`. Importuotojui reikia tiek laiko ribos, tiek deployment/atšaukimo atnaujinimo; vien build ID cache rakto neužtenka. Atšauktą ar nebegaliojantį faktą tikrinti ir aktyvaus pokalbio atsakymo bei follow-up siuntimo metu. Stale žinios gali būti naudojamos atkuriamumo auditui, bet ne naujam pažadui.

Studijos draft, neįdiegtas eksportas, būsimas puslapis, istorinis Archive.org snapshot ir senos įmonės rekvizitai nepatenka į dabartinius viešus verslo faktus. Archyvo tyrimas skirtas naujo turinio ir URL sprendimams. Patvirtintam istoriniam paaiškinimui būtina aiški istorinė paskirtis, teisės ir data. Gamintojo specifikacija neįrodo partnerystės ar mūsų likučio.

## D1 ir pokalbių užklausų susiejimas

Dabartinė forma reikalauja vardo, el. pašto, žinutės ir sutikimo; D1 įrašas neturi voice conversation ID ar telefono. Todėl naujas voice kontaktas nepateikiamas į šią formą su netikru el. paštu. Būsimas voice endpointas turi savo tikrą email/phone sutartį ir autorizuotą sesiją.

Bendro agentų core `CaseSource` adapterio siūlomas deduplikavimo raktas:

```text
(environment_id, source_system, site_id, source_record_id)
source_system = website_d1 | voice_core
website_d1 source_record_id = niche_leads.id
voice_core source_record_id = stabilus conversation_id
```

Susiejimo įrašas, case sukūrimas ir jo vidinis įvykis išsaugomi viena Postgres transakcija su unikaliu šaltinio raktu. Replay ar reconnect naujo case nekuria. D1 įrašo importo kvitas nėra jo operatoriaus SMTP pranešimas ar kliento atsakymas; esamo formos pranešimo pakartotinai nesiųsti vien dėl importo. Viešame core patvarus outbox/pull adapteris dar neįgyvendintas: būtina realizuoti atstatomą perdavimą, cursor ir reconciliation, o ne žadėti, kad cross-database transakcija jau egzistuoja.

Jei žmogus po balso pateikia įprastą formą, į tą patį case jungti tik su serverio patikrintu tos pačios nišos/aplinkos sesijos ryšiu. Kol tokio ryšio nėra, nesugalvoti jo iš sutampančio el. pašto ar laiko. Pasikartojanti nauja užklausa nėra automatiškai naujas unikalus žmogus. Kontaktų tarp nišų nesujungti.

Būsimas bendras skydelis rodo šaltinį, domeną, case, tikrą gavimo būseną, poreikį, kvalifikavimo taisyklės versiją ir tęsinį. Metrikose atskirti widget paspaudimą, serverio patvirtintą prisijungimą, užbaigtą pokalbį, kontaktą, poreikio case ir kvalifikuotą užklausą. Vieno conversation kontakto redagavimas, analizės versijos ir mail bandymai nėra papildomi klientai. Case skaičius nėra unikalių žmonių skaičiaus garantija. Testinė aplinka ir self-test įrašai neįtraukiami į paklausos sprendimus.

## Įjungimas, našumas ir kanalai

Visų naujų nišų būsimas numatytasis nustatymas `voice.enabled=false`. SEO svetainė ir esama forma lieka savarankiškas pirmos fazės rezultatas. Kontroliuotą informacinį balso pilotą galima įjungti vienai nišai įrodžius kelią pokalbis → kontaktas → analizė → tikras kanalo atsakymas; tai neaktyvuoja prekybos įrankių ir savaime nepereina į kitą verslo fazę.

Profilis turi patikrintą kanalų pajėgumą, per-site/global sesijų ir išlaidų limitus, kill switch bei modelio/SDK/politikos versijas. Be nustatyto veikiančio kanalo ar biudžeto balso admission lieka išjungta. Nemokama programinė biblioteka nėra nemokamo nuolatinio inference, medijos ir workerio pažadas. Naujų mokamų paslaugų ar paskyrų šiuo darbu neprijungta.

Garso bibliotekos, WebRTC ryšiai ir mikrofono leidimas atsiranda tik po aiškaus naudotojo veiksmo. Homepage SEO HTML, gidai ir forma veikia ir tada, kai balso tarnyba nepasiekiama. Įgyvendinus widget matuoti tikrą mobilų production puslapį prieš ir po pakeitimo; Lighthouse balo iš planavimo dokumento nežadėti.

Pradinis kanalas — naršyklės pokalbis. SIP/PSTN vėliau reikės autentifikuoto įeinančio provider įvykio ir serverio DID/kanalo susiejimo. Bendras telefono numeris automatiškai neatskleidžia nišos: arba atskiras numerio susiejimas, arba aiškus pasirinkimas bendrame priėmime prieš suteikiant konkrečios nišos žinias ir įrankius. Žmogaus nurodytas pageidavimas nėra leidimas prieiti prie kitos nišos privačių užsakymų. Šio projekto greitų svetainių numerio kitoms nišoms nepriskirti.

SMTP priėmimas, galutinis gavimas ir atsakymas lieka skirtingi statusai. Tik telefonas nesukuria el. laiško ir be tikros SMS/callback eigos neleidžia žadėti tęsinio tuo kanalu. Atsakymas į prašytą poreikį nesuteikia leidimo kitų domenų rinkodarai. Prisijungimų paslaptys nekeliauja į profilį, GUI, turinio paketą ar modelio kontekstą.

## Piloto priklausomybės ir bendras tobulinimas

Balso ir agentinių verslų roadmapuose M numeriai yra jų pačių etapų vardai, ne bendras visų modulių eiliškumo registras. Įgyvendinant tuos pačius patvarumo, mandatų, įrankių ir release komponentus panaudoti vieną bendrą core; jo dokumentuose aprašytas runtime dar nesukurtas. Vien esamo plano nuoroda nėra veikiančio priklausomo komponento įrodymas.

Informaciniam naršyklės pilotui būtini balso plano M0–M4 rezultatai ir M6-A audio, izoliacijos, privatumo, kanalo bei gedimų vartai. Tiekėjų, quote, registracijos ar kitų komercinių jungčių M5-A dalis nėra tokio piloto būtina sąlyga. Pasirinktinis Jev reikalauja M5-B/M6-B, o automatinis pataisų promotion — M6-C bei pakankamos canary imties; jų neįjungti vien todėl, kad baseline konsultantas išlaikė savo bandymus. Nišos komercinių funkcijų plėtra lieka atskiras paklausa, realiu pajėgumu ir mandatu pagrįstas sprendimas.

Gyvas konsultantas, foninis specialistas ir post-call analitikas naudoja to paties verslo `CustomerNeedState`: kliento patvirtinti laukai, agento pasiūlymai ir nežinomi laukai atskirti. Pataisytas dydis ar tikslas pakeičia revision ir panaikina priklausomų lookup rezultatų galiojimą. UI formos parodymo ACK nėra kontakto gavimo kvitas, o išgirsta agento replika nėra įvykdyto veiksmo įrodymas.

Jev parenka tik bendro registro leistiną užduoties ar prompto projekciją. Jis negali parinkti tenant, padidinti teisių, patvirtinti sandorio ar vykdyti bendro `execute` su savavališku kodu. Pradinis režimas off/shadow; naudą ir deadline fallback lyginti su baseline atskirai konkrečiai nišai. Foninė paieška ribojama galiojančiais skaitymais ir spend limit; pasenęs rezultatas nepatenka į naujesnį poreikį. Vienas Live garso valdytojas neleidžia foniniam modeliui vienu metu kalbėti kitu balsu.

`QualityReview` registruojamas atskirai nuo kliento poreikio analizės ir reklaminės konversijos. Jo pataisa yra nekintamas runtime kandidatas su parent hash, issue, testų ir rollback nuorodomis. Nepriklausomi invariantai, audio regresijos, ribotas canary bei iš anksto fiksuota pakankama imtis sprendžia promotion. Mažas svetainės srautas gali reikšti, kad pataisa lieka shadow. Aktyvūs pokalbiai išlaiko release versiją, o kritinio defekto veiksmai stabdomi ir sutikrinami; rollback neištrina jau įvykusių rezultatų.

Balso runtime prompt/skill registras nėra tiesioginis leidimas perrašyti šio projekto `SKILLS/niche-site-builder/`, `SKILLS/niche-content-planner/`, patvirtintą turinį ar viešą paketą. Aptikta naudingo turinio spraga gali sukurti studijos užduotį su minimizuotu pavyzdžiu. Ji eina per esamą instrukcijų SHA-256, teiginių peržiūros, nepakitusios patvirtintos revizijos, `publishAt` ir įdiegimo kelią. Bendro fragmento pataisa tikrinama visoms paveikiamoms nišoms; klientų transkriptai, kontaktai ir tiekėjų sąlygos netampa viso tinklo atmintimi.

Telemetry bendruose loguose saugo minimalius techninius ID, būsenas, versijas, delsą ir naudojimą. Pilni transkriptai, kontaktai, turinio užklausos ir raw tool argumentai nėra bendri logų laukai. Privačiai būtini kliento duomenys laikomi tik jiems skirtoje izoliuotoje saugykloje su nustatyta prieiga, retention ir delete eiga; minimizavimo taisyklė nereiškia teisėto poreikio įrašo praradimo.

## Privalomi būsimo įgyvendinimo bandymai

1. Traktorių ir greitų svetainių sesijos negali perskaityti ar pakeisti viena kitos žinių, kontaktų, case ir įrankių; teisingas host, klaidingas siteId bei pasenusi mapping versija atmetami.
2. Future, nepatvirtinta, pakeisto hash, atšaukta ir neįdiegta versija neprieinama; atėjęs `publishAt` atveria tik tos pačios realiai įdiegtos svetainės tekstą. Tikrinamas ir senų paieškos indeksų bei aktyvių sesijų atšaukimas.
3. Dubliuotas D1 importas, voice reconnect, vėluojantis kontaktas ir abiejų įvykių eiliškumas nesukuria papildomo case ar prašyto laiško. Kitas gavėjas ar kitokie argumentai su tuo pačiu idempotency key atmetami.
4. Python, modelio ir transporto gedimas nepanaikina esamos D1 formos; SMTP timeout išlaiko įrašą ir nevadinamas gavimu. Admission viršijus biudžetą pateikia veikiančią formą.
5. Pirmos fazės profilis negali inventuoti kainos, tiekėjo, likučio, rezervacijos ar galimybės perskambinti. Pasirinktas tikras kanalas patikrinamas pažymėtu savininko self-test, ne tik SDK mock.
6. Mobilus widget patikrinamas su tikrais vaizdais ir garso UI, klaviatūra bei mikrofono atsisakymu. Po viešo core pakeitimų būtini `npm run test:core` ir `npm run test:seo-smoke`.
7. Klientui pataisius matmenį, vėlyvas senos revision lookup rezultatas atmetamas. Reconnect ir atšaukta tool užklausa nesuteikia naujos teisės rašyti. Tekstinės simuliacijos tikrinamos atskirai nuo tikro lietuviško native audio, pertraukimo ir playback elgesio.
8. Jev timeout, neaiškus ar klaidingas kelias turi ribotą fallback; išlaikomos tos pačios mandato teisės ir vieno garso valdytojo eiga. Nėra Jev on ar spekuliuojamo write, jei tam dar nėra atskiro įrodymo ir leidimo.
9. Priešiškas transkriptas, nepakankama imtis, pakartotas calibration job, pasenusi kandidato bazė, pakeistas testas ar artefaktas nesukuria promotion. Bendra pataisa tikrinama visoms paveiktoms nišoms; išbandytas rollback ir senos sesijos release stabilumas.
10. QualityReview turinio užduotis neperrašo web skill ir nepublikuoja paketo; studijos hash, faktų ir laiko vartai lieka privalomi. Įrodoma, kad loguose nėra kontaktų/transkriptų ir kito tenant žinių; teisėto įrašo ištrynimas patikrinamas ir išvestinėse kopijose pagal retention sutartį.

Šios eilutės yra priėmimo reikalavimai, ne jau išlaikyti balso testai. Atliktas tik dabartinių failų ir planų integracijos auditas; veikiančio balso ar Postgres migracijos šis dokumentas nepatvirtina.

## Galutinės peržiūros įrodymai

2026-09-30 perskaityti visi 11 `voice-agent-plan/` dokumentų, šio projekto `AGENTS.md`, `START_HERE.md`, `WORKSTREAMS.md`, `MAIL_CORE.md`, `SEO_GEO_CORE.md` ir aktualios bendro agentinių verslų plano sąsajos. Viešame core patikrinti `proxy.ts`, `lib/niche-sites.ts`, `lib/niche-links.mjs`, `lib/niche-network.ts`, `config/niche-network.json`, lead/interest routes, `lib/niche-mail.ts` ir D1 nišų migracijos.

Faktiškai esama D1 forma pirmiausia įrašo užklausą ir tik paskui praneša operatoriui. `notified` reiškia perdavimą pašto transportui, ne atskirą INBOX patvirtinimą. `MAIL_CORE.md` saugo ankstesnio konkretaus self-test gavimo įrodymą; šiame plano audite naujas laiškas nesiųstas. `niche_interest_daily` šiuo metu priima tik `pageview`, `email_click`, `phone_click`; voice įvykių, `CaseSource`, žinių manifestų ir `/pokalbis/*` endpointų tame runtime dar nėra.

Oficiali [Gemini 3.8 Live specifikacija](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live) ir [LiveKit Gemini vadovas](https://docs.livekit.io/agents/models/realtime/plugins/gemini/) peržiūrėti šiame audite. Modelio dokumentacija ir SDK vadovas nepakeičia numatyto M0 tikro suderinamumo bandymo. Balso kaštų, prieigos ir privatumo faktai renkami tada, kai parengtas juos naudojantis įgyvendinimas; nemokamo 24/7 aptarnavimo prielaidos nėra.

Savininko autorizuotoje sesijoje `01a0f1fa-3e13-7ab0-867b-d0091e73e1b7` paprašyta pataisyti tik jos planą ir WORKSTREAMS eilutę. Sesija atnaujino `README.md`, `ROADMAP.md`, `SELF_CALIBRATION.md` bei savo eilutę; pagrindinė sesija perskaitė tikras galutines pataisas. M5/M6 išskaidyti taip, kad informacinis pilotas nepriklausytų nuo tiekėjo, Jev on ar promotion; bendri logai atskirti nuo privačių įrašų, runtime pataisos — nuo web skills ir studijos publikavimo.

Nepriklausoma pagrindinės sesijos dokumentų patikra: **11 dokumentų, 58 vietinės nuorodos, 0 trūkstamų tikslų, 0 neuždarytų kodo blokų**. Realizavimo checkboxų nėra pažymėtų atliktais. Šios patikros tikrina dokumentų vientisumą; jos nėra lease, tenant RLS, balso ar siuntimo runtime testai. Šio audito metu viešų paketų, schemos, DNS, sekretų ar kitų nišų kodo nekeista; voice neįjungtas, realių skambučių ir klientų siuntimo nebuvo. Kiti įgyvendinimo vartai lieka neįvykdyti pagal roadmapą.
