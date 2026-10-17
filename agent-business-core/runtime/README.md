# Bendras verslų ir balso runtime

**Įrodymų skaitymas, 2026-10-17:** šiame README yra modulio instrukcijos ir datuoti įgyvendinimo etapai. Jų testai, procesų adresai ir aktyvavimo būsenos aprašo nurodytą šaltinį bei laiką. Toliau nurodyti `artifacts/network-calibration/` HTML kvitai yra privatūs vietiniai artefaktai, ne Git clone failai; susietos MD ataskaitos išsaugo jų kontekstą ir ribas. Dabartinį procesą, konfigūraciją ir priėmimą tikrink atskirai pagal savo checkout bei konkretaus verslo pavedimą.

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

## Privati CLI proceso diagnostika

Adapterio pasirinktinai įjungta `cli-execution-observation.v2` diagnostika saugoma
tik jo nuosavame privačiame vykdymo kataloge. Ji nekeičia proceso paleidimo,
terminų, stabdymo, modelio, teisių ar grąžinamo kvito. Prompto, argumentų ir
galutinės išvesties turinys į šį JSON nepatenka; lieka dydžiai, argumentų SHA ir
proceso būsenų metaduomenys. Ankstesni v1 failai neperrašomi.

- `parent_returncode_before_cleanup` fiksuojamas prieš stabdymą. `null` reiškia,
  kad tuo metu parent baigtis dar nepastebėta. Galutinis `exit_code` gali būti
  priverstinio stabdymo rezultatas ir nepakeičia šio ankstesnio stebėjimo.
- `wait_done_before_cleanup`, `stdout_done_before_cleanup`,
  `stderr_done_before_cleanup` ir `feed_done_before_cleanup` rodo užduočių
  būsenas prieš valymą. Užduoties baigtis savaime neįrodo EOF: tam skirti atskiri
  `stdout_eof_before_cleanup` ir `stderr_eof_before_cleanup` laukai.
- `stdin_closed_seconds`, `stdout_eof_seconds`, `stderr_eof_seconds` ir
  `process_wait_done_seconds` yra pastebėjimo laikai nuo diagnostikos pradžios,
  ne tikslūs OS signalų laikai. Jie gali būti po `cleanup_started_seconds`;
  būsenos prieš valymą dėl to atgaline data nekeičiamos.
- `output_exists_before_cleanup`, `output_is_file_before_cleanup` ir
  `output_bytes_before_cleanup` naudoja tik failo metaduomenis. Nepavykus jų
  perskaityti būsena lieka nežinoma, didinamas `diagnostic_read_errors`.
  Diagnostikos rašymo klaidos didina `diagnostic_write_errors`; jos nepakeičia
  tikro vykdymo rezultato.
- `cleanup_kill_requested` žymi esamą stabdymo kelią, kai parent baigtis dar
  nepastebėta. `cleanup_completed` neįrodo, kad visi palikuonys sustojo: esamam
  kodui jau pasibaigęs parent netrukdo palikuoniui dar laikyti atvirą stdout.

`draining` yra paskutinės I/O veiklos žyma, o ne įrodymas, kad CLI vis dar gyvas.
Vien v1 `draining` ir galutinis kodas neatskiria gyvo proceso nuo pasibaigusio
parent su atviru paveldėtu pipe. Inertinio testo atkūrimas taip pat neįrodo, kad
tokį pat gedimą patyrė ankstesnis tikras modelio kvietimas.

Siaura patikra be tiekėjo ar DB kvietimų:

```powershell
uv run pytest -q offline_tests/test_cli_execution_observation.py offline_tests/test_partial_cli_receipts.py offline_tests/test_control_codex.py offline_tests/test_creation_team_controller.py
```

Ji tikrina sėkmę, klaidą, tylų gyvą procesą, paveldėtą stdout, atšaukimą ir
diagnostikos disko klaidų nepriklausomumą nuo tikro rezultato. Modelio atsakymo
kokybė, realaus kanalo veikimas ir veikiančio šaltinio pritaikymas vertinami
atskirai.

## Vietinio High Discovery laiko biudžetas

`local_sol61_high_v1` naudoja versijuotą
`local-high-discovery-deadline.v2` laiko politiką: kūrėjui iki 660 s,
kritikui ir koordinatoriui po 90 s, visam darbui vieną 900 s terminą.
Kūrėjo 180 s ir kritiko 90 s rezervai saugo likusių peržiūrų laiką; šaltinių
skaitymas, parengimas ir kvotos tikrinimas vartoja tą patį darbo laiką.
Pasibaigus rezervui naujas mokamas bandymas nepradedamas. Tai ne automatinis
kartojimas ir ne naujas modelio ar bandymų kvotos leidimas.

Politikos pakeitimą pagrindžia atskirai išsaugoti bandymai: tyrimas su šešiais
web veiksmais sustojo po 404,80 s be plano; visas planas iš jau surinktų
šaltinių, be web veiksmų, buvo sugeneruotas per 324,69 s. Šių trukmių suma yra
orientyras ribotam naujos politikos bandymui, o ne garantuota vieno darbo
trukmė ar ankstesnės klaidos visos priežasties įrodymas. 660 s suteikia maždaug
20 % kūrėjo atsargą šiam orientyrui; papildomos 60 s viso darbo biudžete lieka
parengimui. Kitų profilių laikas, modeliai, kvotos, schema ir kokybės vartai
nesikeičia.

Politika yra instrukcijų kontrolinės sumos dalis. Naują šaltinį taikyti tik
sustabdytai savo aplinkai, kai jos eilės tuščios; pradėti darbai ir istoriniai
FAIL, kvitai bei terminai neperrašomi. Pritaikymą įrodo naujas įprastas UI
darbas su išsaugotu 900 s terminu ir tikromis peržiūromis; atskiras diagnostinis
planas negali būti importuotas kaip vartotojo patvirtinta ataskaita.

## Toliau

Pilnos būsenos ir neįgyvendintų vartų sąrašas: [IMPLEMENTATION](../../voice-agent-plan/IMPLEMENTATION.md); išmatuoti rezultatai: [PRELIVE_QA](../../voice-agent-plan/PRELIVE_QA.md). Visų 30 nišų onboarding, gamybinė D1 reader/reconciliation jungtis, operatoriaus GUI ir asmeninės paskyros, tikras audio/reconnect/coverage/billing patvirtinimas, kryžminė įrenginių tapatybė, pilnas laisvo kontekstinio laiško validatorius, SMTP reconciliation/gavimas, Jev shadow ir apsaugotas semantinis eval/canary/promotion dar lieka. Nė vienas roadmapo etapas nepažymimas baigtu vien šiuo įgyvendinimu.

## 2026-10-01 papildymas

Failais komponuojamos core + nišos instrukcijos, laisvas bendravimas, vietinis candidate palyginimas/aktyvavimas/rollback ir darbuotojų balų modulis įgyvendinti. Tikras savininko SMTP → Gmail → IMAP atsakymų kelias baigtas iki PDF išankstinės sąskaitos. Produkcinis balsas ir fiskalinis sandoris nepatvirtinti. [Ataskaita su intervencijomis](../../voice-agent-plan/SALES_CALIBRATION_2026-10-01.md); [instrukcijų registras](instructions/README.md).

Ankstesnio šešių nišų rato registry ir 96 unikalūs klientų scenarijai išplėsti bendru core. Keturiuose ratuose 132 klientų vykdymai; galutinis 28/36, naujų blind 19/24, originalios klaidos išsaugotos. Trys vėlesnės techninių kontraktų regresijos 3/3. Tame rate Jev adapteris buvo išjungtas, tikrų API kvietimų 0. [Tinklo kalibravimo ataskaita](../../voice-agent-plan/NETWORK_CALIBRATION_2026-10-01.md), pokalbių ir laiškų peržiūra (istorinis vietinis HTML kvitas `artifacts/network-calibration/network-20261001-summary/index.html`, į Git neperkeltas). Suvestinė atkuriama `python scripts/network_release_report.py`; tai tekstinis Codex kelias, ne Gemini ar garso patvirtinimas.

Naujame Jev etape pridėti tipizuoti tekstinio adapterio argumentai, serverio kalbos nustatymas ir atskiras kiekvienos nišos ON/OFF jungiklis `/operator/mail-ui`. Jis keičia tik Jev politiką ir neįjungia balso ar SMTP. Privatus API raktas modeliui ir naršyklei neperduodamas. Foninė rekomendacija atmetama pasikeitus pokalbiui, kliento įvykiui, poreikio ar politikos revizijai. [Jev metodika ir naujo rato būsenos ribos](../../voice-agent-plan/JEV_CALIBRATION_2026-10-01.md); porinė suvestinė (istorinis vietinis HTML kvitas `artifacts/network-calibration/network-20261001-v3-paired/index.html`, į Git neperkeltas). Suvestinė atkuriama `python scripts/network_ab_report.py`; nebaigti vykdymai joje aiškiai matomi.

2026-10-02 atskiras aptarnavimo pataisų ratas: trys žinomos kokybės regresijos ir šeši nauji atvejai 9/9, 81 CLI kvietimas, 0 timeout retry. Po rankinėje peržiūroje pastebėto prisistatymo kartojimo atskiras mažas kandidatas 2/2, 17 CLI; operatorius pritaikė tą pačią formuluotę core. V5 visa suite 217 PASS, v5.1 tiksliniai 21 PASS. [Kalibravimo ataskaita ir visų nišų dialogai / laiškai](../../voice-agent-plan/AGENT_CALIBRATION_2026-10-02.md). Originalūs OFF/ON balai nepakeisti; automatinė semantinė skill promotion ir Gemini audio tebėra nepatvirtinti.

2026-10-03 pradinis esamos autonomijos stebėjimas nekeičiant agentų MD: 18 sunkių klientų scenarijų šešiose nišose, originalūs vartai 16/18 (vienas tikrintuvo teksto palyginimo trūkumas ir viena tikra kainos komunikacijos klaida), 12 vietinių laiškų, 4 automatiniai juodraščių perrašymai, 1 neaktyvus instrukcijos kandidatas. MD ir aktyvių instrukcijų pokyčių 0. Atskirame senos klaidos atkūrime kokybės vertintojas praleido jau išsaugoto kontakto prašymą. 17 užbaigtų pirmo vykdymo atvejų ir 1 tęsimas išlaiko originalių eilučių kilmę; 171 + 4 išsaugoti CLI kvietimai yra apatinė riba dėl pertrūkio. [Autonomijos ataskaita](../../voice-agent-plan/AUTONOMY_OBSERVATION_2026-10-03.md), pokalbių ir laiškų peržiūra (istorinis vietinis HTML kvitas `artifacts/network-calibration/network-20261003-v6-hard-clients-complete/index.html`, į Git neperkeltas). Šio istorinio stebėjimo metu automatinė kandidatų įvertinimo / aktyvavimo grandinė buvo neprijungta; jo lab neskaitė vietinių adaptive priedų. Toliau aprašytas atskiras įgyvendinimas originalių rezultatų nekeičia.

## Vietinis autonominis mokymasis — 2026-10-03

`PINET_LEARNING_ENABLED=true` įjungia vietinį Codex analizės, profesionalaus laiško patikros ir kokybės ciklą bei patvarius learning darbus. Aptikta elgesio klaida → modelio pasiūlymas → dabartinės ir kandidato instrukcijų palyginimas → nišos versijos aktyvavimas → naujos sesijos naudojimas. Baziniai instrukcijų MD nėra modelio redaguojami; patvirtinti papildymai saugomi `artifacts/instruction-releases/<site>/versions/`. Pradėta sesija išlaiko savo versiją. Production/balso aktyvavimas lieka atskiras.

Naujų darbų `evals/learning-v2` turi septynis atvejus nišai, po du kiekvienos versijos pakartojimus. Šaltinio dialogas atskiriamas nuo bent trijų nematytų holdout. Kandidatas turi išlaikyti visus 14 stebėjimų ir griežtai pagerinti rezultatą. Korpuso, vertintuvo, žinių ir instrukcijų hash fiksuoti; lygus rezultatas ar regresija aktyvavimo negauna. Mechanizmo įrodymai ir išlikusios ribos: [autonominio mokymosi ataskaita](../../voice-agent-plan/AUTONOMOUS_LEARNING_2026-10-03.md).

Vietinio deployment žinių helperis tiesiogiai naudoja viešo core `projectPublicPages`, kas 60 sekundžių iš naujo projektuoja aktualius patvirtintus puslapius ir registruoja juos tik šešioms jau prijungtoms nišoms. Jis neįdiegia paketų ir neprijungia naujų nišų. Netinkamas šaltinis nebepratęsia žinių galiojimo; atšaukimo įrašai išlieka. Produkcija naudoja autentifikuotą deployed edge endpointą.

```powershell
uv run python scripts/local_knowledge_sync.py --once
uv run python scripts/local_knowledge_sync.py
```

Šis papildomas helperis leidžiamas tik `local`, kai balso ir SMTP kanalai išjungti. Jis turi vieno proceso lock ir trijų projekcijų retention. Būsena: `artifacts/local-knowledge/status.json`; proceso žurnalai: `artifacts/local-processes/knowledge.*`. `scripts/start_local_background.ps1` jį paleidžia kartu su API/jobs ir išsaugo jau veikiantį šio repo žinių procesą. OS paslaugos automatiškai neįdiegiamos.

Užbaigtas vietinis ratas: originalus34/36, abi vėlesnės žinomų klaidų regresijos po1/1. Du automatiniai nišų elgesio papildymai, naujas14/14 prieš14/14 kandidatas atmestas dėl lygaus rezultato. Full252PASS; tikros HTTP API ir foninio postcall patikra9/9. Vieninga dialogų, laiškų ir mokymosi sprendimų peržiūra (istorinis vietinis HTML kvitas `artifacts/network-calibration/autonomy-20261003-summary/index.html`, į Git neperkeltas).

## Žinių V2 ir mokymosi parengtis — 2026-10-04/05

Atskiras tenant-scoped paged ingest priima pilną viešą projekciją atominiu commit, be 30 puslapių ar ilgo teksto nukirpimo. Naujas profilis automatiškai negauna source/learning admission; prieš sesiją, learning enqueue ir controller tikrinami atskiri vartai. Actual M2 emitter version dispatch nekeičia v1 kelio. [Payload/API sutartis](../../voice-agent-plan/PAGED_KNOWLEDGE_V2_API_2026-10-04.md), [275 PASS, galutinės 2 regresijos ir actual HTTP/šešių šaltinių įrodymai](../../voice-agent-plan/M4_RUNTIME_VALIDATION_2026-10-04.md). V2 Start/protected evaluator ir legacy gift D1 mapping dar nepriimti; gift neįjungtas.


## Discovery komercinių sąlygų atranka

Šaltinių rinkiklis prieš gilesnį katalogą seka tikras to paties host komercinių
sąlygų, garantijos ir verslo dokumentų nuorodas. Bendri URL reikšmės signalai
neapima visų kalbų ar neinformatyvių adresų; jie neįrodo pilnos svetainės aprėpties.
DNS, TLS, robots, 24 s ir 100000 baitų ribos nesikeičia. Neperskaityti tinkami
adresai lieka eilėje, nesėkmingas skaitymas lieka unavailable.

`discovery-model-sources.v2` tame pačiame 28000 UTF-8 JSON baitų limite saugo
teksto pradžią ir papildomus tikslius `evidence_spans`. Kiekvienas fragmentas turi
pradinio capture teksto Unicode ženklų pradžios / pabaigos koordinates, savo SHA-256
ir konteksto bei eilutės nukirpimo žymas. Komercinio naudojimo sąlygoms ir tikroms
komercinių dokumentų nuorodoms teikiama pirmenybė prieš papildomą produktą ar vaizdą.
Tai deterministinė ribota atranka, ne santrauka, faktų patvirtinimas ar viso
puslapio perskaitymo įrodymas. Pilnas capture ir S28 sourceContext nekinta; senos
versijos ir jų SHA lieka istoriniai. Naują atranką ir jos taisykles sieja instrukcijų
pin; jos pritaikymas veikiančiam procesui priimamas atskirai.

Tikrinant pokytį būtini vėlyvos neigiamos sąlygos, Unicode koordinačių / baitų,
tikrų nuorodų prioritetų, saugos, neperskaitytos eilės ir nekintamo capture testai.
Jie vykdomi esamuose `test_discovery_research_first.py` ir
`test_discovery_source_projection.py`, be tiekėjo, web, DB ar mokamo modelio kvietimų.


## Versijuoti Creation puslapių tipai

Naujo pilno kūrėjo privatus formatas yra `business-draft.v3`: jis aiškiai pateikia
`schema_version` ir kiekvieno puslapio `type`. Tai puslapio paskirtis, o ne autoriaus
tapatybės, kvalifikacijos ar verslo faktų patvirtinimas. Autoriaus profilis negali
būti nustatomas iš adreso, antraštės ar įprasto gido autorystės eilutės.

Esami nevėrsijuoti `Page`, `Draft`, `CreatorCandidate` ir `CreatorDraft` modeliai
lieka istoriniams duomenims su tomis pačiomis schemomis, normalizuotais laukais ir
hash. Vienas griežtas parseris parenka seną arba v3 modelį; naujo pilno provider
atsakymo tikrinimas v1 atsakymo nepriima. Trūkstamas tipas nėra tyliai pakeičiamas
numatytuoju. V3 tipas įtrauktas į juodraščio, kritiko ir intake hash; gido užduotis
negali perrašyti autoriaus ar kitos paskirties puslapio. Tikslus teksto pataisymas
naudoja pasirinktos versijos apribojimus, bet nekeičia tipų ar versijos žymos.
S34 koordinatoriaus patikros ir S36 dizaino paaiškinimo pataisos išlieka.

Native importas išlaiko aiškų tipą ir visus faktų, autoriaus snapshot, kontaktų,
medijos, redakcinės peržiūros bei publikavimo vartus. Tipas `author` savaime
nesukuria autoriaus duomenų ir nepatvirtina Foundation. Esamos redakcijos bei jų
source/schema kvitai neperrašomi. Reikalingos regresijos: tikslios senų schemų ir
artefaktų SHA, netinkama ar dalinė v3 struktūra, tipo pakeitimo hash konfliktas,
S36 ribotos pataisos, native importo replay ir jokių teisių / faktų pripažinimas.
# Explicit private preview intake recovery

`GET|POST /customer/v2/creations/{creation_id}/private-preview-intake` uses the separate
`creation-private-preview-intake.v1` contract. POST accepts only the current exact
`accepted_revision`, `candidate_sha256` and a caller-retained UUID `idempotency_key`.
It authenticates the current verified owner in the existing local customer scope.
Only a Creation whose public `canonical_host` is NULL can receive this explicit binding:
`<creation UUID without hyphens>.preview.invalid`. That technical host is private native
metadata; the Creation's public domain remains NULL and domain authority stays UNVERIFIED.
Existing non-null host selection and historical intake/proof material retain their semantics.

Migration 0042 adds owner/session-bound requests and immutable terminal receipts. Recovery
revalidates the exact accepted payload/coordinator, original optional Discovery source context,
current clean execution source, public companion and importer/network hashes before, during
and after the fixed Node importer. No model is called and no Creation job/quota is renewed.
The original job usage (including `studio_domain_required`) remains untouched. Native paths
stay the maintained per-Creation accepted-revision directories; no candidate copying, manual
SQL mutation, approval, source verification, deployment or agent/channel activation is implied.

GET is read-only. Both methods return a status envelope; HTTP 200 with state `failed` is a
retained failure. Failed receipt `intake` binds SQL NULL through the PostgreSQL JSONB mapper;
JSON literal null remains excluded by the strict storage constraint. An existing pending UUID reconciles without dispatch; after its 90-second
lease expires, an explicit same-key retry may reclaim only the exact same current binding.
Terminal UUIDs never execute again. A separate explicit UUID may retry a terminal failure;
successful current intake rejects another import. Old revision/source/session bindings are
stale and provide no effective private host. Never wildcard-trust `.invalid`: use only the
current exact status/accepted/source binding. Later native readers select the validated
recovery receipt through the same resolver; all editorial/Foundation/public/agent gates remain.

Owner revocation ordering is explicit: migration 0042 adds an invoker-rights membership
UPDATE/DELETE trigger that acquires the existing affected User row locks in deterministic
order. Admission/finalization hold the same User lock through commit. Revocation that wins
first is observed by the final owner check; revocation that starts after final validation
waits until intake commits. Owner graph tables keep their existing INSERT/SELECT grants;
there is no new UPDATE grant or SECURITY DEFINER bypass. Schema readiness requires this
trigger. Native QA includes both membership-revoked-after-Node and real lock-wait ordering
after the final check and before commit; static/collect-only checks do not prove that ordering.

Source-only offline checks do not establish actual PostgreSQL enforcement, serving adoption
or real customer recovery. Those checks belong to the integrating owner before live use.

Offline QA: set `PYTHONPATH` to `agent-business-core/runtime/src`, set
`PINET_CONTROL_SOURCE_REVISION` to a synthetic lowercase 40-hex revision, then run
`python -m pytest agent-business-core/runtime/offline_tests -q -p no:cacheprovider`.
Opt-in native QA lives in `tests/test_private_preview_pg.py`: the integrating owner must
supply and migrate an EMPTY dedicated PostgreSQL QA database using the existing runtime
and admin connection settings, plus the maintained native Node/companion configuration.
With `PINET_PRIVATE_PREVIEW_QA=1`, run `python -m pytest
agent-business-core/runtime/tests/test_private_preview_pg.py -q -p no:cacheprovider`.
This fixture deliberately retains synthetic append-only rows and private files; ordinary
customer fixture cleanup cannot delete their referenced actor/session history. It uses a
synthetic source-current seam, real companion/importer hashes and real native HTTP/RLS/Node,
with synthetic role outputs and zero provider calls. Collect-only is not execution evidence.
# Native GUIDE critic output

The GUIDE provider uses private `content-work.critic-output.v2`: bounded prose,
numeric selections from one exact native reference catalog and all nine check summaries.
It reuses the business critic's compact field models. Stored/customer `creation.critic.v1`
remains unchanged. The server recomputes the catalog from the original rich native candidate,
restores only caller-validated receipt kinds/statuses/IDs, then applies the existing native
hash/stage/round/pointer/coherence/language checks. Twelve findings and six references per
finding remain available. Current provider output must use the private version; legacy
stored full reviews and injected historical test seams retain their original validation.
The coordinator already uses the shared S34 prose-only projection and restores its derived
correction/remaining-check sets through the same strict stored contract.

This follows an observed High GUIDE critic `provider_error` with
`Incomplete response returned, reason: max_output_tokens`: 6.922 seconds versus a
164.711-second execution deadline, no final file. The provider token budget was not exposed.
That error is neither evidence of schema rejection nor the local 200000-byte output cap.
Compact projection reduces redundant schema/output; actual provider success still requires
a later authorized verification. It changes no model, effort, clocks, quotas, retry policy,
failed/charged history or publication permissions. Never retry a terminal GUIDE implicitly.

## Guarded native editorial preparation

`pinet_core.creation.editorial_preparation` is a trusted server-side operator API.
It reuses `creation.media.native_mutation_guard` and the maintained Node workflow;
it is not a customer JSON endpoint, model tool, filesystem executor or new writer.
The caller must already have an authenticated current Session and an owned
Creation inside its restricted `control.routes.scope(user=...)` transaction.
Never construct authority from a caller-supplied user/session UUID alone.

`status(tx, session, creation_id, Status(...))` reads current completion hashes.
An optional `page_id` also returns only the existing type, publishAt, editorial
metadata and linkSuggestions. It does not return a second raw-page or media API.
Both reads and writes require the current owner, source, exact accepted proof,
current explicit S6 for historical accepted source, and no active Creation/GUIDE.
The effective host comes from the same accepted-proof/private-intake resolver;
an explicitly bound UUID.preview.invalid works while Creation.canonical_host
remains NULL. A host suffix alone grants no authority.

`prepare(tx, session, creation_id, Preparation(...))` accepts one of four actions:

| Action | Explicit fields beyond accepted context, operation_id and expected_site_sha256 |
|---|---|
| amend-site | patch: existing name, offer, audience, facts, contact, operatorName, brand.accent |
| amend-page | page_id, expected_revision_sha256, expected_planning_sha256, patch: type, publishAt, full native editorial metadata, linkSuggestions |
| resolve-internal-links | page_id, expected_revision_sha256, expected_planning_sha256 |
| finalize-links | 1–200 unique existing same-site page_ids |

Supply only fields belonging to the selected action. Patches cannot set identity,
host, stage, scheduling policy, body/copy, media, approval, published snapshots,
review, paths or executables. Existing copy/media adapters remain their sole
guarded paths. Native V2 schema and same-site validation remain authoritative.
The metadata command does not infer facts, professional authors or asset rights.
A real organization author is supported; the caller must supply truthful data.

For example, inside an existing authenticated operator transaction, with `session`
and `creation` obtained from the maintained current-owner lookup:

```python
from uuid import uuid4
from pinet_core.creation import editorial_preparation as editorial
from pinet_core.creation_registration.service import accepted_proof

proof = await accepted_proof(tx, creation)
context = dict(accepted_revision=proof["accepted_revision"],
    candidate_sha256=proof["candidate_sha256"], canonical_host=proof["canonical_host"])
observed = await editorial.status(tx, session, creation.id, editorial.Status(**context))
request = editorial.Preparation(**context, action="finalize-links",
    operation_id=str(uuid4()),  # retain this UUID and exact request before calling
    expected_site_sha256=observed["completion"]["site_context_sha256"],
    page_ids=selected_same_site_page_ids)
result = await editorial.prepare(tx, session, creation.id, request)
```

This fixed command uses the existing per-Creation accepted-revision directories.
Before a mutation, `editorial-preparations/<operation UUID>.before.json` is written
exclusively and synced with the exact request/hash, full initial site and bounded
deterministic transition hash. Only `model.editSite`, `model.editPage`, the existing
rich-link resolver and `model.finalizeInternalLinks` perform preparation. Full
immutable `.after.json` evidence records the actual site and page hashes. The
transition projection recognizes an uncertain canonical write; it is not an
alternate mutation engine. Both receipts remain private and survive SQL rollback.

An unchanged same-UUID/request replay acknowledges the same current after-state
without another write. A prepared interruption can resume only from the exact
before-state, or reconcile the exact intended after-state without repeating it.
Different request, stale hashes, unrelated later edits, missing/partial/tampered
receipts, revoked owner or active GUIDE refuse. Never substitute fresh hashes into
an old operation. A timeout or authorization loss is not proof that no file was
written: preserve the failure and reconcile the SAME UUID/request under renewed
authority. The adapter never retries automatically or changes SQL job/history.

Operation locks record token/PID/time. A killed child may leave its own operation
lock or the maintained DATA `.model-write.lock`. Follow the existing explicit
crash-recovery policy: the owning operator first proves that process is dead,
preserves the exact lock/receipt evidence, and releases only that owned lock.
Never steal locks by age, overwrite receipts or delete another process's lock.

Every returned preparation receipt states generation/sourceVerification/
mediaVerification/editorialReview/approval/release/deployment/channelActivation/
moduleAdmission `not-performed`. Actual review, approval, immutable release,
renderer QA and launch remain separate. This module does not complete or change
the autonomous workspace pipeline, start a server or activate a channel.

Focused checks: `python -m pytest -q -p no:cacheprovider
agent-business-core/runtime/offline_tests/test_editorial_preparation.py` and
`node --test content-studio/test/customer-editorial-preparation.test.mjs
content-studio/test/customer-content-workflow.test.mjs`. The offline suite includes
real Python/Node/receipt/parser transport in a disposable synthetic case, with an
explicit fake authority seam and zero provider/DB calls. It does not establish
actual PostgreSQL RLS, customer-case adoption or serving readiness.
