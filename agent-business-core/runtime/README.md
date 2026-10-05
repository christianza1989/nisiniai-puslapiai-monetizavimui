# Bendras verslų ir balso runtime

Pirmas įgyvendinimas 2026-09-30. Vienas FastAPI/PostgreSQL core, atskiri gyvo balso ir patvarių užduočių procesai. Pirmoji balso niša — `traktoriupadangos`. Tai vietinis pagrindas; gamybiniai M0/M6 vartai dar nepraeiti.

## 2026-10-01 tekstinis ir pašto papildymas

Galutinis suite po PDF ir retail integracijos: 118 PASS; paskutinės nuorodų / presentation pataisos 12 tikslinių PASS; Ruff PASS. Metaduomenų ir tikro HTTP PDF QA 10/10. Nepridėti senų 112/23/36 skaičių prie naujo suite: tai persidengiantys istoriniai paleidimai.

**Naujausia kliento pateikimo versija:** [CUSTOMER_VIEW](../../voice-agent-plan/CUSTOMER_VIEW.md). Klientų laiškai ir automatiškai prisegamas PDF be testinių antraščių; vidinės synthetic teisės lieka. `retail_options` taiko atskirą site kainodaros profilį (peržiūrai 15 %), tiekėjo URL/savikaina laikomi tik viduje. PDF module `src/pinet_core/invoice_pdf.py`, ReportLab 4.4.9, Windows Arial / Linux DejaVu. Vienas PDF rendereris ir vietiniam eksportui, ir mail attach; autentifikuotas `/operator/sites/{site_id}/mail/{message_id}/attachments/{index}` izoliuotas pagal nišą. Nauji penki laiškai + vienas PDF SMTP priimti. Žemiau HTML-only ir pirmi 5 kvitai aprašo išsaugotą ankstesnę versiją.

Aktualūs įrodymai: [TEXT_CLIENT_LAB](../../voice-agent-plan/TEXT_CLIENT_LAB.md); plėtros vartai: [PROCUREMENT_AND_INVOICING](../../voice-agent-plan/PROCUREMENT_AND_INVOICING.md). Migracija `0008_mail`, 18 lentelių / 14 forced RLS; vienas per-site pašto modulis ir tas pats SMTP transportas. Autentifikuotas UI `http://127.0.0.1:8840/operator/mail-ui`; tik sintetinių bandymų kopija `http://127.0.0.1:8861/`. Antras 8860 API bandymo procesas sustabdytas, launcher naudoja bendrą 8840.

CLI laboratorija: `scripts/client_lab.py` ir bendri `evals/clients.json` / `evals/public-offers.json`. Galutinė vystymo regresija 6/6, penki SMTP priimti pasiūlymų laiškai. `scripts/sync_mail_replies.py` skaito tik žinomų gijų atsakymus; inbox pilnas importas ir automatinis reply worker dar neįgyvendinti. `PINET_LAB_MAIL_ENABLED` leidžia tik vieną privatų testinį gavėją, vietinę aplinką ir pažymėtus synthetic laiškus. Production SMTP ir balsas išjungti. SMTP priėmimas nėra gavėjo inbox įrodymas.

Owner-only `order-tests` API / `scripts/order_test_demo.py` tikrina pasiūlymo hash, TTL ir pakartotinį patvirtinimą. Testo `--confirm --send` sugeneruotas vienas sąskaitos HTML priedas ir SMTP priimtas laiškas; realaus užsakymo/fiskalinio numerio nėra. `scripts/invoice_draft.py` bei `scripts/invoice_pdf.py` yra bendri dokumentų rendereriai. Laikinas privatus issuer failas `artifacts/billing/provisional-issuer.json` dabar testams yra ne PVM mokėtojo profilis pagal naujausią savininko nurodymą; tikras juridinis statusas nepatikrintas. Jo duomenys ir testiniai klientai nekeliauja į public projekciją.

Pilnas ankstesnis šios dienos suite: 112 passed prieš paskutinius order/tax papildymus. Po jų tikslinės 23 ir core/calibration/contact/order 36 patikros praėjo; Ruff švarus. Šie paleidimai turi persidengimų ir nesumuojami. Toliau esančios 2026-09-30 balso etapo pastabos išsaugo savo ankstesnę apimtį.

## Paleidimas

Reikia Python 3.13, `uv`, veikiančio Docker ir Node. Priklausomybės užfiksuotos `uv.lock`; pačios svetainės `livekit-client` užfiksuotas jos npm lock. Diegimas šiame kompiuteryje su Node 22.18 pateikė `machina` transityvios priklausomybės Node >=22.22 įspėjimą; patikros bei browser SDK įkėlimas praėjo, bet prieš gamybinį build naudoti palaikomą Node versiją. Komandas vykdyti šiame `runtime/` kataloge:

```powershell
uv sync --locked
uv run python scripts/setup_local.py
docker compose up -d postgres
uv run alembic upgrade head
uv run python scripts/bootstrap.py
```

`setup_local.py` sukuria ignoruojamą `.env` su atsitiktiniais vietiniais prisijungimais. Niekada neatspausdina jų reikšmių. Esamas failas neperrašomas; jei trūksta atskiro operatoriaus rakto, pridedamas tik jis. PostgreSQL klausosi tik `127.0.0.1:15432`; Windows rezervuoja kai kuriuos aukštus portus, todėl pradinis 55432 pakeistas. Migracijos vykdomos administravimo role; API naudoja kitą rolę be superuser/BYPASSRLS ir be lentelių nuosavybės. Programos paleidimas tokią netinkamą rolę atmeta.

Atskiruose procesuose:

```powershell
uv run uvicorn pinet_core.api:app --host 127.0.0.1 --port 8840 --no-access-log
uv run python -m pinet_core.jobs
uv run python scripts/start_site_preview.py
```

Peržiūra: `http://127.0.0.1:5187/` (naudoti IPv4 adresą, jei localhost naršyklėje pasirenkamas IPv6). Svetainės kodas yra `C:/Users/lenovo/Documents/dovanos-memorycasting`; kitą kelią galima nustatyti per `PINET_PUBLIC_CORE_PATH`. Skriptas naudoja atskirą ignoruojamą `.dev.vars.voice`, `CLOUDFLARE_ENV=voice` ir išjungtą SMTP. Bendros `.dev.vars`, esamos 8787 peržiūros ir bendro `dist/` jis nekeičia. Tik šiame vietiniame profilyje konsultanto valdiklis rodomas; kitur numatytoji reikšmė išjungta.

Vietinių procesų išlikimui po terminalo ar ryšio nutrūkimo Windows aplinkoje galima naudoti `scripts/start_local_background.ps1`. Jis paleidžia tris paslėptus vietinius pagalbinius procesus, žurnalus ir PID laiko ignoruojamame `artifacts/local-processes/`, nekeičia jau užimtų portų ir neįdiegia Windows tarnybos ar tvarkaraščio. Tikras balso darbuotojas nepaleidžiamas.

## Įgyvendinta eiga

- Stabilus siteId → business ID registras; aplinka perduodama serverio, kiekvienoje transakcijoje `SET LOCAL` ir PostgreSQL RLS. Dviejų nišų registras nesuteikia antros nišos balso įjungimo.
- Bendros `cases`, `case_sources`, `conversations`, `contacts`, pokalbio įvykių, artefaktų, jobs ir outbox lentelės. Kontaktai lieka privačioje DB, jų nėra bendruose pokalbio būsenos įvykiuose.
- Pasirašytos svetainės užklausos: HMAC, metodas, tikslus kelias, kūno hash, laikas ir patvarus vienkartinis nonce. Naršyklė gauna tik savo sesijos capability, ne serverio paslaptį.
- Sesijų idempotency, atominiai global/site sesijų, dienos laiko ir deklaruoto USD biudžeto rezervavimo limitai. LiveKit SDK kumuliaciniai Google tokenų rodikliai ir Flash usage metadata apskaitomi pagal versijuotą kainų kortelę. 90 % balso rezervo minkštas stabdymas ir fiksuoto viršijimo pause; provider sąskaita ir LiveKit mokesčiai dar nesutikrinti. Numatyti nuliniai biudžetai nepraleidžia tikro balso ar analitiko.
- Balso ownership lease/epoch, įvykių deduplikavimas ir argumentų konflikto atmetimas. Poreikio pataisos turi revision ir kliento įvykio kilmę; modelio `confirmed=true` nelaikomas žmogaus patvirtinimu.
- Kontakto langas pokalbio metu, parodymo ACK ir serverio išsaugojimo kvitas — atskiros operacijos. Valdiklis siūlo el. paštą arba telefoną, taip pat po pabaigos. Telefono įėjimas saugo numerį, bet grąžina `channel_unavailable`; SMS ir perskambinimas nežadami. Vėlyvas `shown` negali pakeisti jau atmesto lango būsenos.
- Patvari per-nišą/aplinką operatoriaus politika: pause, enable, siauras įrankių sąrašas, follow-up siuntimo vartai, sesijų ir laiko limitai. Versijos keitimas tik su atskiru operatoriaus raktu bei auditavimo priežastimi; modelio ir svetainės raktai netinka.
- Pasirenkama grįžtančios naršyklės atmintis: atskiras `HttpOnly`, `SameSite=Lax`, produkcijoje `Secure` pirmos šalies slapukas. Jame nėra transkripto ar kontakto; DB saugomas jo hash ir tenant/aplinkos ryšys. Naujas skambutis yra atskira techninė sesija, kuri gali skaityti to paties įrenginio ankstesnį kontekstą.
- Po pabaigos — nepriklausomi analysis ir quality jobs. Kai nėra Gemini rakto, rezultatas aiškiai pažymimas programine bazine patikra, semantinis vertinimas nepriskiriamas.
- Gemini Flash struktūruotos analizės ir nepriklausomos kokybės peržiūros adapteris, tikrinamos įrodymų ID nuorodos. Užregistruota bendravimo priežastis gali sukurti inertinį pataisos kandidatą, žinių priežastis — redakcinės patikros užduotį.
- Kliento kontaktas ir baigtas pokalbis sujungiami patvarioje eilėje. Pradinis informacinis atsakymas sudaromas pagal kontroliuojamą šabloną iš kliento pasisakymų bei svetainės šaltinių; laisvas LLM laiško juodraštis automatiškai nesiunčiamas.
- TLS SMTP adapteris su stabiliu Message-ID ir prieš siuntimą įrašytu ketinimu. Neaiškus rezultatas automatiškai nekartojamas. Testiniai artefaktai transporto blokuojami. SMTP šiame vietiniame runtime išjungtas; gavimo e2e dar neatliktas.
- Kontaktų pataisos turi revision; pakeitus kontaktą senas parengtas outbox superseded ir atsakymas regeneruojamas. Pradėjus pristatymą korekcija atmetama, kad nebūtų du gavėjai tam pačiam atsakymui.
- D1 `website_d1` importo kontraktas su atominiu cursor/replay ir CaseSource; vardinis vietinio SQLite eksporto skaitytuvas read-only. Tai dar nėra gamybinė Cloudflare D1 pull/reconciliation jungtis.
- Antras skirtingas `greitossvetaines` profilis bei statinė inertinių kalibravimo kandidatų patikra. Semantinis eval, canary ir automatinis promotion neįgyvendinti; profilio egzistavimas antros nišos balso neįjungia.
- Laiko ribą viršijusių pokalbių užbaigimas ir privačių pokalbio įrašų ištrynimas su kaskadomis. 30 dienų retention yra vietinis pradinis nustatymas, ne patvirtinta gamybinė privatumo politika.

## Tikras Gemini ir WebRTC

Į vietinę privačią `.env` arba būsimo serverio secrets įvedami `PINET_GOOGLE_API_KEY`, `PINET_LIVEKIT_URL`, `PINET_LIVEKIT_API_KEY`, `PINET_LIVEKIT_API_SECRET`. Negalima perduoti šių reikšmių svetainės paketui, browser JS ar modelio promptui. Produkcijoje API/worker gauna tik runtime paslaptis; migracijų administravimo prisijungimas jiems neperduodamas.

```powershell
uv run python scripts/m0_probe.py
uv run python -m pinet_core.voice_worker dev
```

Vien setup/output probe **neužbaigia M0**. Jis reikalauja deklaruoto biudžeto, įjungtos/nepauzuotos nišos politikos, rezervuoja sumą bendrame registre ir nekeičia M0 flagų. Iki pilno bandymo `PINET_VOICE_ENABLED=false`, `PINET_M0_VERIFIED=false`. Visam M0 būtini realus lietuviškas garsas, async tool, transkriptai, pertraukimas, reconnect/resume ir naudojimo sutikrinimas. Turint išmatuotus įrodymus įjungimas atliekamas konfigūracijoje; gamybinis paleidimas papildomai priklauso nuo privatumo, kanalų, mandatų ir M6-A. Tikslūs konfigūracijos žingsniai: [LIVE_TEST_RUNBOOK](../../voice-agent-plan/LIVE_TEST_RUNBOOK.md).

Serverio LiveKit dispatch perduoda tik serverio parinktą nišą/pokalbį. Agentas registruoja keturis siaurus įrankius: patvirtintų žinių paieška, poreikio pataisa, kontakto langas ir šio įrenginio istorijos paieška. Kiekvieną vykdymą dar leidžia aktuali operatoriaus politika; senas cache nesuteikia išjungto įrankio leidimo. Komercinių tools nėra. Browser token leidžia tik konkretaus kambario medijos veiksmus.

Žinių manifestas ateina iš dabartinės viešo core `publicNichePages` projekcijos; Python nekuria antro publikavimo filtro. Originalus approval hash atskirtas nuo projekcijos hash. Lookup TTL 180 s, jobs procesas kas 60 s perskaito privatų HMAC manifesto endpointą. Naršyklės refresh taip pat negali įrašyti savo manifesto. Operatorius gali patvariai atšaukti šaltinį; cache/refresh neatšaukia revokavimo. Pokalbiai, kuriems jau perduotas atšauktas šaltinis, užbaigiami. Produkcijai nustatyti tikros HTTPS projekcijos adresą; dabartinis loopback adresas tinka vietiniam testui.

## Operatoriaus valdymas

`PINET_OPERATOR_SECRET` lieka privačiame serverio konfigūracijos faile. Valdiklis ir balso darbuotojas jo negauna. API yra `/operator/sites/<siteId>/policy` ir `/policy/history`; viešų `/pokalbis/*` alias jiems nėra. `base_revision` neleidžia tyliai perrašyti vienalaikio operatoriaus pakeitimo. Priežastyje nerašyti kliento kontaktų ar transkripto. Tai bendras autentifikuoto operatoriaus auditas; individualių operatorių paskyros dar reikalingos gamybinei komandai.

```powershell
uv run python scripts/operator_policy.py
uv run python scripts/operator_policy.py --pause --reason "Laikinas piloto sustabdymas"
uv run python scripts/operator_policy.py --resume --reason "Piloto darbas atnaujintas"
uv run python scripts/operator_policy.py --deny-tool knowledge.resolve --reason "Tikrinami žinių šaltiniai"
```

Numatytoji politika išjungia tikrą balsą ir follow-up siuntimą. `--enable` nepanaikina M0 ir bendros konfigūracijos vartų. Pause užbaigia aktyvias sesijas ir išsaugo post-call apdorojimą bei vėlyvo kontakto kelią. Svetainė tai pamato būsenos patikroje; darbuotojo heartbeat taip pat nebegali pratęsti lease. Įrankiai politiką tikrina prieš cache ir vykdymą. Valdymo pakeitimas laukia jau pradėtos DB operacijos; SMTP atveju ir jau pradėto siuntimo pabaigos. Išsiųsto laiško atšaukti negalima, o po užbaigto pause naujas siuntimas nepradedamas.

## Perskambinimo atmintis

Prie esamo privatumo teksto yra vienas neprivalomas pasirinkimas „Prisiminti pokalbius šioje naršyklėje 30 dienų“. Grįžus atpažinimas vyksta fone; registracijos anketos nėra. „Perskambinti“ pradeda naują skambutį vienu paspaudimu. Atminties kodą viešas edge paima iš slapuko ir perduoda tik serveriui; core grąžinamą kodą edge pašalina iš JSON, įrašydamas jį per `Set-Cookie`.

DB išsaugo originalius kliento ir agento pasisakymus pagal bendrą retention. Agentui duodamas ribotas istorijos kontekstas; `memory.recall` gali ieškoti visoje išsaugotoje šios naršyklės istorijoje ir pagal `next_event_id` atsiversti ankstesnius fragmentus. Įkeltas istorinis kontekstas neregistruojamas kaip naujas gyvas kliento pasisakymas. Atmintis nėra dabartinių verslo faktų, kontaktų patvirtinimo ar pakartotinio veiksmo leidimo šaltinis.

Tai **įrenginio atpažinimas, ne patvirtinta asmens tapatybė**. Kitas įrenginys, išvalyti ar pasibaigę slapukai automatiškai ankstesnio kliento neidentifikuoja. Bendroje naršyklėje kitas žmogus gali turėti tą patį įrenginio kontekstą, todėl agentas patikslina tęsimą ir garsiai nekartoja senų kontaktų. Kryžminis įrenginių tęstinumas vėliau reikalauja patvirtinto kontakto ar prisijungimo; vien pateiktas numeris tam netinka.

„Pamiršti šį įrenginį“ atšaukia kodą serveryje, nuima slapuką ir istorijos ryšius, užbaigia aktyvias su juo susietas sesijas. Tai atminties prieigos atšaukimas; pačios verslo užklausos ištrinamos pagal bendrą retention, o ne kartu su slapuku. 30 dienų ir pratęsimas naujo skambučio metu yra vietinis pradinis nustatymas; galutinį gamybinį privatumo tekstą ir trynimo procesą dar reikia suderinti. Istorija po šio laikotarpio nepažadama.

## Patikros

```powershell
uv run pytest -q
uv run ruff check src scripts migrations tests
uv run python scripts/check_migration.py
uv run python scripts/local_smoke.py
uv run python scripts/memory_web_smoke.py
uv run python scripts/knowledge_web_smoke.py
uv run python scripts/backup_restore_qa.py
uv run python scripts/prelive_doctor.py
```

Testai naudoja tikrą vietinį PostgreSQL ir atskiras atsitiktines testų aplinkas. Jų įrašai pašalinami; SMTP ir Gemini testuose išjungti. Pavyzdinės žinios yra sintetinės ir neimportuojamos į svetainę. Teksto/DB patikros neįrodo balso tarimo ar realaus pristatymo.

Viešo core kataloge vykdomi TypeScript, siauras ESLint, `npm run test:core`, `npm run test:seo-smoke` ir `node tests/voice-web-smoke.mjs`; smoke testai reikalauja veikiančios 5187 peržiūros. Pastarasis skirtas išjungtam M0 ir neturi skambinti tiekėjui.

## Toliau

Pilnos būsenos ir neįgyvendintų vartų sąrašas: [IMPLEMENTATION](../../voice-agent-plan/IMPLEMENTATION.md); išmatuoti rezultatai: [PRELIVE_QA](../../voice-agent-plan/PRELIVE_QA.md). Visų 30 nišų onboarding, gamybinė D1 reader/reconciliation jungtis, operatoriaus GUI ir asmeninės paskyros, tikras audio/reconnect/coverage/billing patvirtinimas, kryžminė įrenginių tapatybė, pilnas laisvo kontekstinio laiško validatorius, SMTP reconciliation/gavimas, Jev shadow ir apsaugotas semantinis eval/canary/promotion dar lieka. Nė vienas roadmapo etapas nepažymimas baigtu vien šiuo įgyvendinimu.

## 2026-10-01 papildymas

Failais komponuojamos core + nišos instrukcijos, laisvas bendravimas, vietinis candidate palyginimas/aktyvavimas/rollback ir darbuotojų balų modulis įgyvendinti. Tikras savininko SMTP → Gmail → IMAP atsakymų kelias baigtas iki PDF išankstinės sąskaitos. Produkcinis balsas ir fiskalinis sandoris nepatvirtinti. [Ataskaita su intervencijomis](../../voice-agent-plan/SALES_CALIBRATION_2026-10-01.md); [instrukcijų registras](instructions/README.md).

Ankstesnio šešių nišų rato registry ir 96 unikalūs klientų scenarijai išplėsti bendru core. Keturiuose ratuose 132 klientų vykdymai; galutinis 28/36, naujų blind 19/24, originalios klaidos išsaugotos. Trys vėlesnės techninių kontraktų regresijos 3/3. Tame rate Jev adapteris buvo išjungtas, tikrų API kvietimų 0. [Tinklo kalibravimo ataskaita](../../voice-agent-plan/NETWORK_CALIBRATION_2026-10-01.md), [pokalbių ir laiškų peržiūra](artifacts/network-calibration/network-20261001-summary/index.html). Suvestinė atkuriama `python scripts/network_release_report.py`; tai tekstinis Codex kelias, ne Gemini ar garso patvirtinimas.

Naujame Jev etape pridėti tipizuoti tekstinio adapterio argumentai, serverio kalbos nustatymas ir atskiras kiekvienos nišos ON/OFF jungiklis `/operator/mail-ui`. Jis keičia tik Jev politiką ir neįjungia balso ar SMTP. Privatus API raktas modeliui ir naršyklei neperduodamas. Foninė rekomendacija atmetama pasikeitus pokalbiui, kliento įvykiui, poreikio ar politikos revizijai. [Jev metodika ir naujo rato būsenos ribos](../../voice-agent-plan/JEV_CALIBRATION_2026-10-01.md); [porinė suvestinė](artifacts/network-calibration/network-20261001-v3-paired/index.html). Suvestinė atkuriama `python scripts/network_ab_report.py`; nebaigti vykdymai joje aiškiai matomi.

2026-10-02 atskiras aptarnavimo pataisų ratas: trys žinomos kokybės regresijos ir šeši nauji atvejai 9/9, 81 CLI kvietimas, 0 timeout retry. Po rankinėje peržiūroje pastebėto prisistatymo kartojimo atskiras mažas kandidatas 2/2, 17 CLI; operatorius pritaikė tą pačią formuluotę core. V5 visa suite 217 PASS, v5.1 tiksliniai 21 PASS. [Kalibravimo ataskaita ir visų nišų dialogai / laiškai](../../voice-agent-plan/AGENT_CALIBRATION_2026-10-02.md). Originalūs OFF/ON balai nepakeisti; automatinė semantinė skill promotion ir Gemini audio tebėra nepatvirtinti.

2026-10-03 pradinis esamos autonomijos stebėjimas nekeičiant agentų MD: 18 sunkių klientų scenarijų šešiose nišose, originalūs vartai 16/18 (vienas tikrintuvo teksto palyginimo trūkumas ir viena tikra kainos komunikacijos klaida), 12 vietinių laiškų, 4 automatiniai juodraščių perrašymai, 1 neaktyvus instrukcijos kandidatas. MD ir aktyvių instrukcijų pokyčių 0. Atskirame senos klaidos atkūrime kokybės vertintojas praleido jau išsaugoto kontakto prašymą. 17 užbaigtų pirmo vykdymo atvejų ir 1 tęsimas išlaiko originalių eilučių kilmę; 171 + 4 išsaugoti CLI kvietimai yra apatinė riba dėl pertrūkio. [Autonomijos ataskaita](../../voice-agent-plan/AUTONOMY_OBSERVATION_2026-10-03.md), [pokalbių ir laiškų peržiūra](artifacts/network-calibration/network-20261003-v6-hard-clients-complete/index.html). Šio istorinio stebėjimo metu automatinė kandidatų įvertinimo / aktyvavimo grandinė buvo neprijungta; jo lab neskaitė vietinių adaptive priedų. Toliau aprašytas atskiras įgyvendinimas originalių rezultatų nekeičia.

## Vietinis autonominis mokymasis — 2026-10-03

`PINET_LEARNING_ENABLED=true` įjungia vietinį Codex analizės, profesionalaus laiško patikros ir kokybės ciklą bei patvarius learning darbus. Aptikta elgesio klaida → modelio pasiūlymas → dabartinės ir kandidato instrukcijų palyginimas → nišos versijos aktyvavimas → naujos sesijos naudojimas. Baziniai instrukcijų MD nėra modelio redaguojami; patvirtinti papildymai saugomi `artifacts/instruction-releases/<site>/versions/`. Pradėta sesija išlaiko savo versiją. Production/balso aktyvavimas lieka atskiras.

Naujų darbų `evals/learning-v2` turi septynis atvejus nišai, po du kiekvienos versijos pakartojimus. Šaltinio dialogas atskiriamas nuo bent trijų nematytų holdout. Kandidatas turi išlaikyti visus 14 stebėjimų ir griežtai pagerinti rezultatą. Korpuso, vertintuvo, žinių ir instrukcijų hash fiksuoti; lygus rezultatas ar regresija aktyvavimo negauna. Mechanizmo įrodymai ir išlikusios ribos: [autonominio mokymosi ataskaita](../../voice-agent-plan/AUTONOMOUS_LEARNING_2026-10-03.md).

Vietinio deployment žinių helperis tiesiogiai naudoja viešo core `projectPublicPages`, kas 60 sekundžių iš naujo projektuoja aktualius patvirtintus puslapius ir registruoja juos tik šešioms jau prijungtoms nišoms. Jis neįdiegia paketų ir neprijungia naujų nišų. Netinkamas šaltinis nebepratęsia žinių galiojimo; atšaukimo įrašai išlieka. Produkcija naudoja autentifikuotą deployed edge endpointą.

```powershell
uv run python scripts/local_knowledge_sync.py --once
uv run python scripts/local_knowledge_sync.py
```

Šis papildomas helperis leidžiamas tik `local`, kai balso ir SMTP kanalai išjungti. Jis turi vieno proceso lock ir trijų projekcijų retention. Būsena: `artifacts/local-knowledge/status.json`; proceso žurnalai: `artifacts/local-processes/knowledge.*`. `scripts/start_local_background.ps1` jį paleidžia kartu su API/jobs ir išsaugo jau veikiantį šio repo žinių procesą. OS paslaugos automatiškai neįdiegiamos.

Užbaigtas vietinis ratas: originalus34/36, abi vėlesnės žinomų klaidų regresijos po1/1. Du automatiniai nišų elgesio papildymai, naujas14/14 prieš14/14 kandidatas atmestas dėl lygaus rezultato. Full252PASS; tikros HTTP API ir foninio postcall patikra9/9. [Vieninga dialogų, laiškų ir mokymosi sprendimų peržiūra](artifacts/network-calibration/autonomy-20261003-summary/index.html).

## Žinių V2 ir mokymosi parengtis — 2026-10-04/05

Atskiras tenant-scoped paged ingest priima pilną viešą projekciją atominiu commit, be 30 puslapių ar ilgo teksto nukirpimo. Naujas profilis automatiškai negauna source/learning admission; prieš sesiją, learning enqueue ir controller tikrinami atskiri vartai. Actual M2 emitter version dispatch nekeičia v1 kelio. [Payload/API sutartis](../../voice-agent-plan/PAGED_KNOWLEDGE_V2_API_2026-10-04.md), [275 PASS, galutinės 2 regresijos ir actual HTTP/šešių šaltinių įrodymai](../../voice-agent-plan/M4_RUNTIME_VALIDATION_2026-10-04.md). V2 Start/protected evaluator ir legacy gift D1 mapping dar nepriimti; gift neįjungtas.
