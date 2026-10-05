# Balso modulio techninė architektūra

Projektavimo sprendimai 2026-09-30. Šiame dokumente aprašomi būsimi moduliai ir sutartys, ne jau įgyvendintos API. Autoritetas verslo procesams yra [bendras agentinių verslų core](../agent-business-core/ARCHITECTURE.md); viešas turinys ir domenų maršrutizavimas lieka esamame svetainių variklyje.

## Vienas branduolys ir keli vykdymo procesai

Python core papildomas `voice`, `knowledge`, `followup` ir `channel_delivery` moduliais. Jis turi vieną verslo profilių registrą, vieną įrankių kontrolę, vieną kontaktų ir sandorių modelį, vieną patvarių užduočių eilę. HTTP API, gyvo balso vykdytojai ir foniniai vykdytojai gali būti keli procesai iš tos pačios versijuotos programos.

| Komponentas | Paskirtis | Duomenų autoritetas |
| --- | --- | --- |
| Esamas Cloudflare website core | SEO puslapiai, publikavimas, hostname patikra, nedidelis lazy-loaded skambučio widget | Patvirtinta svetainės versija, kontaktų konfigūracija |
| Core API su FastAPI ir Pydantic | Pokalbio pradžia, leidimai, kontaktas, statusas ir operatoriaus skydelis | Verslo profilis, kanalo politika, sesijos autorizacija |
| LiveKit | WebRTC signalizacija ir medijos perdavimas; vienas privatus kambarys pokalbiui | Medijos dalyviai; neturi tapti CRM |
| Python balso vykdytojas | Garso adapteris, Gemini įvykiai, įrankių iškvietimas, transkripcijos | Tik serverio patvirtinti sesijos įvykiai |
| PostgreSQL | Pokalbiai, faktai, kontaktai, veiksmai, jobs ir outbox | Būsena ir patvarūs įrodymai |
| Privati objektų saugykla | Ilgesni transkriptai, šaltinių dokumentai, laiškų artefaktai | Hash ir DB nuoroda; nėra viešas assets katalogas |
| Gemini modelių adapteriai | Live sesija ir atskira Flash analizė | Generuoja pasiūlymus veiksmui; neįgyja DB autoriteto |

Pradžiai nereikia Kubernetes, atskiros vector DB, brokerio ir naujo orchestration frameworko. Naudojami esamo plano PostgreSQL lease jobs bei transactional outbox. Redis ar papildomas brokeris įtraukiamas tik atsiradus išmatuotam koordinavimo poreikiui.

LiveKit transportą galima pakeisti per `MediaTransport` adapterį; Gemini API — per `RealtimeModel` ir `StructuredModel` adapterius. Įrankių, kontaktų ir faktų modelis nepriklauso nuo transporto ar LLM tiekėjo.

Pasirenkamas `DecisionRouter` adapteris atskiria programinį, Jev ir Gemini klasifikavimo kelią. Jis parenka handlerį, prompto ID ar konteksto paketą iš serverio leidžiamo rinkinio; nepakeičia tenant ir nesuteikia vykdymo teisių. Gyvas balsas turi vieną valdytoją. `CustomerNeedState` ir rekomendacijų priklausomybės yra to paties PostgreSQL case dalis, naudojama tiek pokalbio metu, tiek po jo. [Routerio, promptų ir fono sutartis](ROUTING_AND_INTELLIGENCE.md).

## Nišos profilis

Kiekvienas domenas susiejamas su esamu `siteId` ir stabiliu `business_id`. 30 domenų nėra 30 Google projektų ar nuolat veikiančių modelių. Sesijos kuriamos tik atėjus klientui.

`siteId` ir canonical host skaitomi iš viešo core `lib/niche-sites.ts` bei jo paketų indekso. Agentų core saugo tik stabilų susiejimą ir projekcijos versiją, o ne antrą ranka palaikomą host registrą. Rodomo kontakto autoritetas yra peržiūrėtas `pkg.site.contact`; numatytieji operatoriaus/kontaktų duomenys ateina iš `config/niche-network.json` ir `lib/niche-network.ts`. `nicheLeadRecipient` nurodo vidinį pranešimo gavėją, ne klientinio follow-up gavėją. Neatitikimas sustabdo onboarding. [Suderinta integravimo sutartis](../VOICE_CORE_INTEGRATION.md).

Visoms nišoms numatyta `voice.enabled=false`. Vieno informacinio piloto įjungimas reikalauja tikro audio ir kanalo bandymo, nustatytų biudžetų bei pajėgumo; neaktyvuoja prekybos ir nepakeičia nišos fazės. Nemokama biblioteka nėra nemokamas nuolatinis Gemini, workerio ir medijos aptarnavimas.

Profilį sudaro:

- Domenas, locale, timezone ir juridinio operatoriaus nuoroda.
- Fazė ir realus pasiūlymas: ką galima informuoti, registruoti, pažadėti ir vykdyti.
- Patvirtintų kontaktų nuorodos; siuntėjo ir gavėjo kanalai valdomi atskirai.
- `voice_policy_version`, `prompt_version`, `tool_policy_version`, `knowledge_snapshot_id` ir modelio adapterio versija.
- Leidžiami įrankiai, konkretūs jų argumentų limitai, išlaidų ir sesijos ribos.
- Nišos terminų žodynas, privalomi poreikio laukai, rizikos klasės ir perdavimo sąlygos.
- Prieinami tęsinio kanalai: el. paštas, SMS, patvirtinta susisiekimo eiga arba vien ekrano santrauka.

Šaltinio kryptis svarbi: `BUSINESS.md` ar YAML profilis negali savavališkai pakeisti svetainės operatoriaus, duomenų naudojimo teisių ar pardavimo pajėgumo. Naujos galimybės aktyvuojamos tik su patikrintu faktu, įrankiu ir mandato versija. Naujausias numatytas kontaktas yra `info@pinet.lt`, operatorius `MB Pinet`; kitų nišų telefonai ir adresai nekopijuojami.

## Žinių sluoksnis

### Keturi skirtingi šaltiniai

1. **Svetainės žinios.** Tiksli viešame core įdiegto paketo versija: puslapiai, pasiūlymo tekstas, DUK ir kontaktai. Indeksuojami tik pagal tą patį publikavimo predikatą dabar matomi puslapiai.
2. **Privatūs patvirtinti verslo faktai.** Tiekėjų sutartys, pajėgumas, kainos ir paslaugos taisyklės. Prieiga tik konkrečiai leidžiamai sesijos rolei; privatus dokumentas automatiškai netampa viešu atsakymu.
3. **Struktūruota dinaminė būsena.** Likučiai, realūs kalendoriaus tarpai, užsakymo būsena. Gaunama įrankiu iš atitinkamos sistemos ir turi galiojimo laiką.
4. **Dalykiniai šaltiniai.** Gamintojo specifikacija, techninis dokumentas ir patikrintas sektoriaus paaiškinimas. Neįrodo, kad šis verslas yra to gamintojo tiekėjas.

Kliento žodžiai ir analitiko išvada saugomi kaip atskiri teiginiai. Jie negali automatiškai tapti patvirtintu verslo faktu. Anonimizuota pasikartojanti žinių spraga gali sukurti turinio užduotį, tačiau patikrinimo ir publikavimo vartų neapeina.

### Žinių atnaujinimas

Viešas core pateikia autentifikuotą vidinį knowledge manifest: deployment identifikatorių, `siteId`, revision hash, kanoninį URL, leidžiamą teksto projekciją ir publikavimo statusą. Tai būsima sąsaja; ne turinio paketo schemos tylus pakeitimas. Studijos `output/` failas savaime nėra įdiegimo įrodymas.

Manifestas naudoja esamą `publicNichePages` → `projectPublicPages` → `dueRevision` kelią. Python tikrina projekcijos kilmę, versiją ir galiojimą; nekopijuoja publikavimo predikato kaip kito autoriteto. Originalios patvirtintos revizijos hash ir filtruotos projekcijos hash saugomi atskirai. Cache atnaujinamas ir pagal laiko ribas, ne tik deployment ID. Archive.org istorija bei neįdiegti studijos juodraščiai nėra dabartiniai verslo faktai.

Importuotojas tikrina hash, domeną, approval, `publishAt` ir realų deployment manifest. Naujas snapshot įrašomas atominiu aktyvios versijos pakeitimu. Būsimo puslapio laikui atėjus snapshot gali būti atnaujintas tik jei jo paketas jau yra įdiegtas. Atšaukus turinį aktyvus indeksas jį pašalina. Kiekvienas lookup papildomai tikrina aktualų leidžiamų šaltinių rinkinį, kad senas embedding negrąžintų atšaukto teksto.

Įprasti pokalbiai fiksuoja pradinį snapshot atkuriamumui. Atšauktas faktas, pasikeitęs kontaktas ar kainos galiojimas vis tiek tikrinami prieš atsakymą ir veiksmą; snapshot nėra leidimas toliau naudoti nebegaliojantį pasiūlymą. Kritinis atšaukimas sukuria įvykį aktyvioms sesijoms.

### Paieška

Pradžioje PostgreSQL full-text ir tikslus terminų indeksas. Pagal poreikį pridedamas pgvector su to paties `business_id` filtru. Paieška derina tikslų dydžio ar produkto kodo atitikmenį, tekstinę paiešką ir semantiką. Žymėjimas `460/85R30` nekeičiamas sinonimų normalizavimu.

Pokalbio pradžioje pateikiama nedidelė verslo atmintinė ir lankomo puslapio santrauka. Toliau grąžinami keli aktualūs fragmentai, jų source ID, data, taikymo sritis ir patikimumo tipas. Pradinės konteksto dydžio ribos parenkamos bandymu; modelio didelis context window nėra priežastis kiekvieną kartą siųsti visą svetainę.

Išorinei informacijai `research.lookup` gauna tik išvalytą dalykinį klausimą. Adapteris riboja domenus, parsisiuntimo dydį, timeout ir dokumentų teises; neleidžia vidinių adresų, metadata endpointų, redirects į privačius tinklus ar nepatikrintų vykdomų failų. Rezultatas laikomas duomenimis, ne sistemine instrukcija. Built-in Google Search politika aprašyta [tyrime](RESEARCH.md).

## Domenų ir klientų izoliacija

Tenant nustato serveris pagal patikimą domenų registrą. URL `siteId`, kliento JSON, modelio argumentas ar savavališkas `X-Forwarded-Host` negali jo pakeisti. Svetainės edge → core komunikacija autentifikuojama pasirašytu, trumpalaikiu kontekstu; core priima tik žinomą issuer ir audience. Public API taip pat turi tikrinti Origin, CSRF, abuse limitus ir tikrą domeno aktyvumą.

LiveKit kambario vardas atsitiktinis. Klientui išduodamas trumpas JWT tik vienam kambariui, su minimaliomis publish/subscribe teisėmis. Pokalbio ID nėra slaptas prieigos raktas. Statusą ir kontaktą valdo atskiras HttpOnly session cookie ar lygiavertis capability; vien spėti ID neužtenka.

Visi DB įrašai turi `business_id` ir `environment_id`. Composite foreign keys neleidžia susieti kito verslo kontakto, faktų ar artefakto. RLS taikoma ir paieškai; DB runtime rolė negali apeiti RLS. Kontekstas nustatomas transakcijos lygiu, o connection pool nepaveldi ankstesnės nišos nustatymo. Administratoriaus portfelio prieiga turi kitą rolę ir auditą.

Pokalbyje pasakytas telefonas, vardas ar užsakymo numeris nėra kliento autentifikacija. Privačių ankstesnių užsakymų skaitymui reikalinga atskira patvirtinta tapatybės eiga. Kontaktai tarp domenų automatiškai nesujungiami net jei sutampa el. paštas. Leidžiamos bendros dalykinės žinios atskirtos nuo asmens duomenų.

## Įrankių vykdymas

Modelis gauna tik konkrečios nišos ir fazės leidžiamų įrankių deklaracijas. Gate patikrina autentifikuotą sesiją, schemas, mandato versiją, argumentus, patvirtinimą ir esamą būseną. Natūralios kalbos promptas nėra teisių kontrolė.

| Klasė | Pavyzdžiai | Vykdymo sąlyga |
| --- | --- | --- |
| Skaitymas | `knowledge.search`, `business.get_contact`, `research.lookup` | Tenant filtras, šaltinių teisės ir limitai |
| Kliento UI | `ui.open_contact_form` | Autorizuotas šio pokalbio widget, leidžiami laukai ir paskirtis; kontaktą pateikia klientas |
| Poreikio registravimas | `case.update_need`, `lead.create_request` | Aiški kliento užklausa; įrašas nevadinamas užsakymu |
| Tikras rezervavimas | `booking.list_slots`, `booking.reserve` | Veikiantis kalendorius, patvirtintas laikas ir commit patikra |
| Komercinis pasiūlymas | `supplier.get_offer`, `quote.calculate`, `quote.present` | Tikros sąlygos, matematinis skaičiavimas ir galiojimas |
| Išorinis siuntimas | `delivery.enqueue` | Patvirtintas gavėjas, prašytas tikslas, artefakto versija ir mandato atitikimas |

Pradinis voice profilis neturi shell, banko, savavališko el. laiško siuntimo ar generinio MCP teisių. Naujo įrankio kodas negali atsirasti ir būti aktyvuotas kliento skambučio metu. Jis sukuriamas atskirame kūrimo procese ir pereina sutarties testus bei simuliaciją.

Lėti skaitymo įrankiai vykdomi asinchroniškai. Agentas gali tęsti poreikio klausimus, tačiau negali iš anksto paskelbti neegzistuojančio rezultato. Pasikeitus poreikiui senas read rezultatas pažymimas superseded ir nenaudojamas dabartiniam pasiūlymui. Įrašymo veiksmui serveris išduoda confirmation token konkretiems argumentams; kliento „taip“ susiejamas su tiksliu pasiūlymu, ne su bet kuriuo ankstesniu klausimu.

Naudojami ir provider call ID, ir serverio loginio veiksmo idempotency key. Reconnect metu provider ID gali pasikeisti, todėl vien jo neužtenka. Nutrūkęs skaitymas atšaukiamas; nutrūkęs write pirmiausia reconciliuojamas su kvitu. Įvykęs write neatšaukiamas vien dėl to, kad klientas pertraukė agento kalbą.

### Kontakto lango įrankio sutartis

`ui.open_contact_form` yra asinchroninis UI įrankis. Jo argumentai yra leidžiamų laukų pasirinkimas (`email`, `phone`) ir paskirtis (`followup`, `registration`, `callback_request`), patikrinta pagal nišos profilį. Serveris priskiria `request_id`, business, conversation ir sesijos epoch; modelis negali parinkti kito kliento, savavališko URL ar įvykdomo HTML.

Voice worker → core → autentifikuotas widget valdymo kanalas perduoda `ContactFormRequested`. Widget parodo dialogą ir grąžina `ContactFormShown` su request ID. Tik po šio ACK UI įrankis grąžina modeliui `shown`; nepasiekiamas klientas ar riboto termino viršijimas grąžina `unavailable` arba `timed_out`. Formos parodymas neužlaiko balso pokalbio ir nėra kontakto gavimo ar sutikimo įrodymas.

Forma pateikiama į siūlomą voice/contact endpointą su sesijos capability. Serveris patikrina laukus ir patvariai išsaugo `ContactSubmitted`. Tada modeliui pateikiamas tipizuotas atnaujinimas `contact_ready` su kanalu ir kontakto nuoroda; pilno adreso ar numerio į bendrą transkriptą įtraukti nereikia. Formos uždarymas siunčia `ContactFormDismissed`, kuris nesukuria kontakto.

Kvietimai deduplikuojami; atvertas langas pakartotinai fokusuojamas, išsaugoma jo juodraščio būsena. Per reconnect widget suderina aktyvų request su serveriu ir neatveria naujos kopijos. UI ACK pats nesuteikia write ar delivery teisės. Siuntimo paskirtis ir tikras kontakto pateikimas tikrinami atskirai.

## Pokalbio ir garso būsenos

```text
created → admitted → connecting → active ↔ reconnecting
                              active → ending → finalized
                              connecting/reconnecting → failed → finalized
```

`listening`, `speaking`, `tool_pending` ir `muted` yra nepriklausomos sesijos veiklos būsenos. Vienas įrankis pending nesustabdo viso skambučio. Baigimas uždraudžia naujus write veiksmus, surenka paskutinius įvykius, pažymi neužbaigtus veiksmus ir išleidžia vieną `ConversationFinalized` įvykį.

Transkripcijų deltos surenkamos pagal speaker, provider session, turn ir sequence. Serveris laiko originalius fragmentus, atskirą normalizuotą transkriptą ir coverage žymas. Modelio sugeneruotas sakinys, klientui perduotas garsas ir klientui atkurtas garsas skiriami. UI playback ACK yra naudinga telemetrija, bet ne patikimas įrodymas, kad žmogus išgirdo ar sutiko.

Per barge-in išvalomas negrotas garso buffer. Atitinkamas agento tekstas pažymimas interrupted arba playback uncertain. Post-call analitikas nekuria naujo kliento sutikimo iš tokio sakinio. Visiškai tikslios sugeneruoto teksto ir išgirstų žodžių atitikties be papildomo alignment nepažadame.

Vienas serverio lease ir fencing epoch valdo pokalbį. Perkėlus sesiją naujam vykdytojui senasis epoch nebegali inicijuoti veiksmų. Resume handle ir minimalūs patvirtinti laukai yra patvarūs; proceso atmintis nėra vienintelė pokalbio kopija.

## Duomenų ir įvykių sutartys

Papildomi modeliai jungiasi prie esamų `conversations`, `contacts`, `cases`, `facts`, `jobs` ir `outbox`, o ne dubliuoja juos naujame voice CRM.

| Įrašas | Esminiai laukai |
| --- | --- |
| VoiceSession | conversation ID, business, environment, room, epoch, provider session, versijos, pradžia, pabaiga, būklė, end reason |
| ConversationEvent | event ID, sequence, schema version, speaker, server timestamp, provider timestamp, payload ref, coverage |
| ToolExecution | logical action ID, provider call ID, arguments hash, confirmation ref, status, receipt ref, validity |
| KnowledgeSnapshot ir KnowledgeFact | business, source ID, revision, public eligibility, checkedAt, validUntil, document rights |
| UIRequest | request ID, business, conversation, epoch, leidžiami laukai, purpose, issued/shown/dismissed/timed_out būsena |
| ContactSubmission | conversation, UI request ref jei yra, contact ID, channel, normalizuota reikšmė, purpose, requestAt, notice version, verification |
| ConversationAnalysis | transcript revision, need fields, evidence refs, missing facts, recommended next step, policy result |
| FollowupArtifact | analysis version, fact versions, target channel, subject/body, draft hash, validation status |
| Delivery | recipient ref, artifact hash, idempotency key, status, SMTP/provider receipt, attempts, failure class |

Įvykiai: `VoiceAdmitted`, `VoiceConnected`, `TranscriptUpdated`, `ToolExecuted`, `VoiceDisconnected`, `ConversationFinalized`, `ContactFormRequested`, `ContactFormShown`, `ContactFormDismissed`, `ContactSubmitted`, `AnalysisCompleted`, `FollowupValidated`, `DeliveryAccepted`, `DeliveryFailed`. Įvykio envelope turi ID, versiją, business, environment ir correlation ID. Įvykiuose neplatinti kontaktų į bendrą analitiką.

Laikai saugomi UTC; klientui ir kalendoriaus patvirtinimui rodomas `Europe/Vilnius` arba tikras nišos timezone. Finansai saugomi mažiausiais valiutos vienetais ir su valiuta; skaičiavimų nevykdo laisvas LLM tekstas.

## API integravimo vietos

Tai siūlomi nauji maršrutai, ne egzistuojančių endpointų aprašymas:

Toliau pateikti `/niche/...` maršrutai yra vidinės implementacijos vietos. Dabartinis `proxy.ts` nišų hostuose blokuoja tiesioginius `/niche/*` ir `/api/*`; būsimas widget turi naudoti same-origin viešus alias: `POST /pokalbis/sesija`, `GET /pokalbis/busena`, `POST /pokalbis/kontaktas`, `POST /pokalbis/baigti`. Rewrite tikslą parenka patikrintas host resolveris, ne kliento siteId. Alias tikrina metodą, sesiją ir CSRF/origin sutartį. Private worker events ir knowledge manifest nepublikuojami per catch-all. Tai būsimas suderintas proxy pakeitimas, šiame plane neįgyvendintas.

Legacy `SITE_CONFIGS` domenai nėra automatiškai niche packages. Jiems reikės tikro matomo turinio ir kontakto adapterio; fallback į pirmą nišos paketą draudžiamas. [Integravimo sutartis](../VOICE_CORE_INTEGRATION.md).

```text
POST /niche/{siteId}/voice/session       # domeno patikra, sesija, room leidimas
GET  /niche/{siteId}/voice/status        # tik šio kliento sesijos vieša būklė
POST /niche/{siteId}/voice/contact       # email arba phone, purpose ir request
POST /niche/{siteId}/voice/end           # idempotentinis baigimas
POST /internal/voice/events             # tik autentifikuoto workerio įvykiai
GET  /internal/knowledge/manifest       # tik leidžiama įdiegto turinio projekcija
```

Dabartinė forma yra `app/niche/[siteId]/lead/route.ts`: ji reikalauja vardo, el. pašto ir žinutės; dabartinė D1 `niche_leads` schema neturi telefono ar conversation ID. Į ją negalima siųsti netikro el. pašto, kad apeitume validaciją. Voice kontaktai turi naują sutartį, o central case kuriamas bendrame core.

D1 → Postgres `CaseSource` adapterio unikalus raktas yra `(environment_id, source_system, site_id, source_record_id)`: D1 atveju `niche_leads.id`, voice atveju stabilus conversation ID. Case ir susiejimas kuriami viena Postgres transakcija. D1 perdavimas turi patvarų pull/outbox, cursor ir reconciliation; cross-database transakcija nepostuluojama. Importas pakartotinai nesiunčia seno operatoriaus SMTP pranešimo. Formos ir pokalbio užklausa jungiama tik su serverio patikrintu tos pačios nišos/aplinkos ryšiu, ne vien sutampančiu el. paštu. Bendras skydelis rodo šaltinį, case ir kvalifikavimo versiją. Kontaktų taisymai, analizės revizijos ir siuntimo bandymai nėra nauji klientai; case skaičius neįrodo unikalių žmonių skaičiaus.

Esamas `interest/route.ts` priima tik `pageview`, `email_click`, `phone_click`. Voice eventų siuntimas į jį šiandien būtų atmestas. Nauja operacinė voice telemetrija laikoma core; viešą agreguotų įvykių sąrašą plėsti tik suderinus pakeitimą. D1 svetainių formos lieka veikti ir tada, kai balso modulis neveikia.

Pašto siuntimo adapteris naudoja bendrą MB Pinet tapatybę ir atitinka [MAIL_CORE](../MAIL_CORE.md). Worker SMTP kodas nėra tiesiogiai importuojamas į Python: bendrinama loginė kanalo sutartis ir testai, o transportui rašomas vienas Python adapteris. Esamo formų transporto nereikia perdaryti šio projekto metu.

## Atsparumas ir plėtra

Po kiekvieno `ConversationFinalized` vykdoma nepriklausoma kokybės peržiūra. `QualityReview`, `CalibrationIssue`, `CandidateRevision`, `EvaluationRun` ir `ReleaseAssignment` gyvena bendrame PostgreSQL; promptų/skills manifestai nekintami ir turi parent hash. Sesija fiksuoja release versiją pradžioje, operatorius gali išjungti paveiktą įrankį, o naujas leistinas elgesio candidate aktyvuojamas tik po apsaugotų testų bei canary. [Pilna automatinio tobulinimo sutartis](SELF_CALIBRATION.md).

Admission controller atominiu būdu rezervuoja global ir business sesijos vietą, numatomą biudžetą ir worker pajėgumą. Rezervacija turi TTL bei reconciliation, kad gedimas neužlaikytų vietos. Viršijus pajėgumą rodoma forma; klientas nelaikomas neapibrėžtoje tylioje eilėje.

Vienalaikių sesijų skaičius planuojamas pagal tikrus skambučius, ne domenų kiekį. Vienas triukšmingas domenas negali sunaudoti viso portfelio pajėgumo. Voice workeriai plečiami atskirai nuo Flash jobs; lėta analizė neturi gadinti gyvo balso.

Išorinių sistemų gedimai turi bounded retry, circuit breaker ir grįžtamą fallback. Patvari DB ir outbox neįrodo laiško pristatymo. Publikuotų kainų ar dokumentų pakeitimas negali tyliai pakeisti jau priimto pasiūlymo; naujas pasiūlymas turi naują versiją.

Neįmanoma programiškai iš anksto patikrinti kiekvieno native audio generuojamo žodžio. Kritinės kainos, datos ir rezervacijos todėl pateikiamos ir iš patikrinto struktūruoto įrankio ekrane; įsipareigojimas grindžiamas patvirtintu artefaktu bei veiksmu. Balso kokybę papildomai vertina scenarijų bandymai ir realių incidentų analizė.

## Naršyklė ir būsima telefonija

Pradinis kanalas yra browser WebRTC. Būsimas SIP/PSTN įeinantis provider įvykis turi būti autentifikuotas ir susietas su serverio DID/verslu. Bendras telefono numeris neatskleidžia nišos: reikės atskiro DID arba aiškaus bendro priėmimo pasirinkimo prieš nišos kontekstą. Caller ID ir pasakytas verslo vardas nesuteikia prieigos prie privačių užsakymų. Dabartinio greitų svetainių telefono kitoms nišoms nepriskirti.

## Dviejų nišų onboarding pavyzdys

Tai loginis būsimo profilio pavyzdys, ne naujas vykdomas config ir ne užregistruoti DB ID. `business_ref` išsprendžia stabilaus susiejimo lentelė; čia jos įrašų ID neišgalvojame.

```yaml
schema: voice-onboarding@1
authority:
  site: public-core/lib/niche-sites.ts
  contacts: public-core/config/niche-network.json
  contact_resolution: public-core/lib/niche-network.ts
  knowledge_projection: public-core/lib/niche-links.mjs
profiles:
  - siteId: traktoriupadangos
    business_ref: required-existing-mapping
    voice: {enabled: false, locale: lt-LT, transport: browser_webrtc}
    phase: informational_pilot
    knowledge_ref: required-approved-deployment-manifest
    contact_ref: required-package-contact-consistency-check
    allowed_tools: [knowledge.resolve, need.patch, ui.open_contact_form]
    disabled_tools: [supplier.lookup, inventory.lookup, quote.commit, booking.commit, sms.send, callback.start]
    followup: {email: pending-voice-e2e, phone: disabled}
    limits_ref: required-per-business-and-global-budget
  - siteId: greitossvetaines
    business_ref: required-existing-mapping
    voice: {enabled: false, locale: lt-LT, transport: browser_webrtc}
    phase: informational_pilot
    knowledge_ref: required-approved-deployment-manifest
    contact_ref: required-package-contact-consistency-check
    allowed_tools: [knowledge.resolve, need.patch, ui.open_contact_form]
    disabled_tools: [quote.commit, booking.commit, invoice.create, sms.send, callback.start]
    followup: {email: pending-voice-e2e, phone: disabled}
    limits_ref: required-per-business-and-global-budget
```

Pirmas profilis tikslina padangos žymėjimą ir naudojimą, antras — svetainės poreikį, turimą medžiagą ir pageidaujamą apimtį. Kainos antram profiliui ateina tik iš dabartinės patvirtintos viešos projekcijos su jos sąlygomis; nėra bendros taisyklės, kad visų pirmos fazės nišų kainos nežinomos. Lokaliai patikrintas esamos formos SMTP kelias dar nepatvirtina būsimo voice follow-up. Prieš aktyvavimą reikalingi manifestas, realus mapping, privacy versija, limitai ir konkretaus balso atsakymo gavimo testas.
