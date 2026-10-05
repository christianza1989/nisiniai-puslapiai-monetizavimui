# Balso core įgyvendinimo būsena

Galutinė šios dienos regresija: 118 runtime testų PASS po PDF/retail integracijos; po paskutinės laiškų nuorodų apsaugos — 12 tikslinių PASS; Ruff PASS. `qa_customer_view.py` 10/10 PASS, tikras HTTP PDF turinys sutampa su SMTP priedu. Gavėjo inbox / realus atsakymas dar nepatvirtinti. Skirtingų testų paleidimų skaičiai nesumuojami.

**Paskutinis 2026-10-01 papildymas:** [CUSTOMER_VIEW](CUSTOMER_VIEW.md) — klientui siunčiamos mūsų kainos su 15 % antkainiu, be tiekėjų nuorodų ir bandymų žymų. Bendras core automatiškai generuoja ir prisega PDF išankstinę sąskaitą; nauji 5 pasiūlymų / patikslinimo + 1 PDF laiškas SMTP priimti. Tarp-nišų PDF prieiga ir MIME patikrinti. Tai pakeičia ankstesnę HTML-only bei viešų tiekėjo kainų kliento rodymo versiją; apskaitos išrašymo numerių registras ir realus order/payment lieka neįjungti.

**Papildyta 2026-10-01:** [tekstinės laboratorijos / pašto įrodymai](TEXT_CLIENT_LAB.md) ir [komercinės plėtros planas](PROCUREMENT_AND_INVOICING.md). Codex CLI jungtis, 6/6 vystymo regresijos scenarijai, bendras per-site mail UI, SMTP/IMAP modulis ir vietinis synthetic quote → confirmation → invoice mail kelias įgyvendinti. Migracija `0008_mail`: 18 lentelių, 14 forced RLS. SMTP priėmė penkis pasiūlymų ir vieną testinės sąskaitos laišką. Gavėjo inbox, Gemini/audio ir realus apskaitos išrašymas nepatvirtinti. Žemiau išsaugota 2026-09-30 balso etapo būsena; jos senų skaičių neperrašome naujais.

2026-09-30. Savininkas autorizavo bendro core kūrimą ir integraciją į `traktoriupadangos.lt`. Valdiklis prijungtas prie tikro svetainės source rendererio atskiroje vietinėje peržiūroje: **http://127.0.0.1:5187/**. Google ir LiveKit prieigų runtime nėra, todėl tikras skambutis dar neveikia. DNS ar gamybinis balso deployment šiuo darbu neatliktas. Tai dabartinio kodo būklė, ne viso roadmapo užbaigimo deklaracija.

## Įgyvendinta

- Vienas Python/FastAPI/PostgreSQL core ir atskiri medijos bei jobs procesai. Alembic `0007_import`: 17 lentelių, 13 priverstinių RLS politikų. API rolė neturi superuser, BYPASSRLS ar lentelių nuosavybės; tenant/aplinkos kontekstas nustatomas kiekvienai transakcijai.
- Stabilus siteId/business registras, HMAC edge užklausos su kūno/metodo/kelio hash ir patvariu nonce, atskiri worker/operator raktai. Browser sesijos capability neleidžia administruoti core. Operatorius turi versijuotą politiką, auditą, pause, įrankių/siuntimo vartus bei CLI. Lease/epoch ir job generation fencing atmeta seno worker veiksmus.
- Atominiai globalūs ir nišos sesijų, laiko bei deklaruoto USD biudžeto limitai. Atskiros balso ir analitiko rezervacijos. SDK `session_usage_updated` kumuliaciniai rodikliai verčiami konservatyviu Google tokenų sąnaudų įverčiu; kvitai deduplikuojami. Pasiekus 90 % balso rezervo stabdoma sesija, užfiksuotas viršijimas sustabdo nišą. Tai minkštas stabdymas: skrydžio metu esantys provider darbai gali viršyti ribą. LiveKit mokestis ir provider sąskaita dar nesutikrinti. Kainų kortelė turi versiją ir patikros galiojimo terminą.
- Patvirtinta, publikuotina viešo core turinio projekcija. Privatus HMAC manifestas, foninis refresh kas 60 s, 180 s lookup TTL, revokavimas ir paveiktų pokalbių sustabdymas. Browser negali įrašyti savo manifesto. Istorinis archyvas nepakeičia dabartinių verslo faktų. Tikroje vietinėje projekcijoje patikrinti 11 traktorių puslapių.
- Du skirtingi informaciniai profiliai: traktorių padangos ir greitos svetainės, su atskirais poreikio laukais ir atsakymo šablonais. Antras profilis automatiškai balso neįjungia. Patvirtinti bendri kontaktai: MB Pinet, info@pinet.lt. Tiekėjai, likučiai, kainos ir pardavimo pajėgumas neišgalvojami.
- Keturi balso įrankiai: `knowledge.resolve`, `need.patch`, `ui.open_contact_form`, `memory.recall`. Poreikis turi kliento įvykio kilmę ir revision; modelio pasiūlymas nėra žmogaus patvirtinimas. Įrankių politika tikrinama prieš cache ir vykdymą. Faktinio SDK adapterio/async tools sutartis testuota su pažymėtu transporto pakaitalu.
- Svetainės mygtukas, vienas langas, AI/duomenų informacija, pradžia, mute, pabaiga, kontaktas pokalbio metu arba po jo, parodymo ACK, serverio kvitas ir kontakto pataisų versijos. Senas parengtas atsakymas po kontakto pakeitimo nenaudojamas; pradėjus pristatymą pakeitimas atmetamas. SDK kraunamas atidarius langą; idle puslapis nepradeda medijos sesijos.
- Pasirenkama 30 dienų naršyklės atmintis: HttpOnly slapukas, DB hash, istorijos paieška/puslapiavimas, expiry/revoke, „Pamiršti šį įrenginį“ ir vieno paspaudimo perskambinimas. Originalūs pasisakymai lieka privačioje DB pagal retention. Tai įrenginio tęstinumas, ne patvirtinta asmens tapatybė ar neribota atmintis. Kitas įrenginys be patvirtinto kontakto istorijos negauna.
- Kiekvieno finalization nepriklausomi analizės ir kokybės jobs. Prarastas/clipped transkriptas žymimas incomplete. Be modelio prieigos naudojama pažymėta programinė bazinė patikra, semantinis vertinimas nepriskiriamas. Flash adapteris tikrina įrodymų ID ir apskaito naudojimą net tada, kai modelio JSON netinkamas.
- Kontaktas ir pabaiga sujungiami nepriklausomai nuo įvykių tvarkos. Informacinis follow-up rengiamas kontroliuojamu šablonu iš kliento citatų ir aktualių patvirtintų šaltinių. Laisvas LLM juodraštis automatiškai nesiunčiamas.
- SMTP outbox: stabilus Message-ID, ketinimo įrašas prieš IO, kontakto/dokumento/politikos/šaltinių patikra, testinių artefaktų blokavimas, aiškus rejection ir neaiškaus rezultato būsena. Neaiškus pristatymas aklai nekartojamas. Tikras laiškas šiame darbe nesiųstas; SMTP→INBOX įrodymo nėra.
- Kokybė gali sukurti bendravimo kandidatą arba redakcinės žinių patikros užduotį. Statinė kandidato patikra tikrina scope, kilmę, parent release, nekintamos sutarties hash ir draudžiamus pakeitimus. Rezultatas `awaiting_semantic_evaluation` arba `static_rejected`; automatinio aktyvavimo nėra. Runtime nerašo svetainės SKILLS, paketų ar approval.
- D1 `website_d1` importo API su atominiu `(created_at,id)` checkpoint, CAS, batch replay ir CaseSource. Vardinis vietinio SQLite/D1 eksporto skaitytuvas naudoja read-only režimą; restartui skaito serverio checkpoint. Nesukuria balso ar antro laiško. Gamybinis Cloudflare pull/export/reconciliation dar neprijungtas.
- Retention, užstrigusių sesijų užbaigimas ir patikrintas tikras pg_dump/restore į vienkartinę DB su išjungtais jobs/siuntimu. Atkurta izoliacija, kontaktai, transkriptas, outbox ir lease/generation. Gamybinis kopijų grafikas bei galutinė privatumo politika dar reikalingi.

## Įrodymai ir naudojimas

Aktualus žurnalas: [PRELIVE_QA.md](PRELIVE_QA.md). Paleidimo eiga: [LIVE_TEST_RUNBOOK.md](LIVE_TEST_RUNBOOK.md). Runtime komandos: [README](../agent-business-core/runtime/README.md).

Tikras HTTP/PostgreSQL/jobs kelias, perskambinimo atmintis, dabartinių žinių atnaujinimas, migracijos ir izoliuotas atkūrimas praėjo. Naršyklėje tikrinti 390×844 ir 320×640 ekranai, fokusas, Escape ir neparuoštos paslaugos fallback. Mikrofonas, Android/iOS aparatūra ir tikra Google/LiveKit media šiomis patikromis netestuoti.

## Kas dar nebaigta

1. Google/LiveKit prieigos, konkretūs išlaidų limitai ir tikras M0: LT audio, abiejų pusių transkriptas, async tool, interruption, ryšio atkūrimas bei usage/billing sutikrinimas. Voice ir M0 flagai išjungti.
2. Tikras balso/analitiko elgesio vertinimas, žmogaus kalibruota rubrika, audio/apkrovos/įrenginių bandymai ir M6-A. SDK pakaitalas negali jų patvirtinti.
3. Voice SMTP→INBOX, neaiškaus siuntimo reconciliation ir profesionalaus laisvo kontekstinio laiško validatorius. Dabartinis šablonas nėra komercinis pasiūlymas. Telefono kanalas saugo kontaktą ir nurodo `channel_unavailable`; SMS ar callback pristatymas neįgyvendinti.
4. Gamybinis HTTPS core/worker hostingas, secrets, deployment/DNS, balso privatumo tekstas ir kopijų/trynimo politika. D1 forma lieka nepriklausoma. Vietinė source peržiūra nėra viešo domeno deployment.
5. Operatoriaus GUI/asmeninės paskyros, kritinių poreikio laukų žmogaus patvirtinimo UI, gamintojų dokumentų research adapteris ir gamybinis D1 reader/reconciliation.
6. Jev shadow/holdout, apsaugotas semantinis kandidatų eval, canary/rollback/promotion. Statinė patikra nesuteikia promptų aktyvavimo. Tiekėjo/quote/booking jungtys ir 30 nišų plėtra turi atskirus vartus.

Ankstesni [VOICE_CORE_INTEGRATION](../VOICE_CORE_INTEGRATION.md) ir tyrimo dokumentai aprašo sutartį bei tuometinį planą. Dabartinio kodo įrodymai yra šis datuotas failas kartu su QA; senas auditas nereiškia, kad API jau veikė tada.

## 2026-10-01 pardavimo ir instrukcijų registras

Įgyvendinti file-backed common + role + niche composer su fragmentų hash, laisvas modelio laiškas su faktų patikra/serverio kainų bloku, durable case sales revision/lease ir mailbox gijos/follow-up cancel, bounded local sales worker, vietinis semantic compare/adoption/rollback bei mėnesio/metų balų skaičiavimo modulis. Tikra savininko Gmail gija baigta iki automatiškai išsiųsto PDF. 135 pilno suite PASS; po galutinės JSON alias pataisos 18 susijusių PASS (nesumuojami); Ruff ir naujo case HTTP/metaduomenų QA 12/12 PASS. Candidate 6/6 vs 6/6 atmestas. Production balsas, tiekėjų derybos, tikri mokėjimai, vertinimų GUI ir 24/7 worker lieka neįgyvendinti/neįrodyti. [Faktinė ataskaita](SALES_CALIBRATION_2026-10-01.md) pakeičia tik šių konkrečių vartų ankstesnę būseną, ne viso roadmapo užbaigimą.

## 2026-10-03 vietinis automatinio mokymosi ciklas

Vietinė analysis/followup/quality eilė naudoja tikrą Codex semantinį modelį, patikrintą klientui skirtą laišką ir chronologinius core kontaktų kvitus. Statinės patikros praleistas elgesio kandidatas automatiškai patenka į learning eilę: modelis pasiūlo ribotą instrukciją, controller apsaugotame dabartinės/kandidato versijų palyginime sprendžia dėl per-nišos aktyvavimo. Nauji darbai: septyni scenarijai, du kiekvienos versijos pakartojimai, bent trys unikalūs nematyti holdout, visi14 kandidato vartų ir griežtas pagerėjimas. Baziniai rolės/core/nišos MD, faktai ir vertintuvas nėra modelio redagavimo taikinys.

Įrodyti automatiniai conversation elgesio papildymai greitossvetaines ir akmenas, actual kitos sesijos adoption ir operatoriaus rollback/restore mechanizmo patikros; lygus kandidatas atmestas. Įgyvendinti lease heartbeat, fiksuota žinių projekcija ir DB commit-pertrūkio recovery. Vietinio deployment žinių helperis kas60s iš naujo naudoja esamą viešo core patvirtinto turinio projekciją; nekeičia viešų failų ir prijungia tik esamas6 core nišas. [Visi įrodymai ir likę vartai](AUTONOMOUS_LEARNING_2026-10-03.md).

Tai papildo ankstesnį6 punktą tik vietinio tekstinio conversation mokymosi srityje. Production/Gemini audio promotion, automatinis online regresijos rollback trigeris, atskirų sales/supplier role instrukcijų autonominis promotion, Jev palyginimas ir realių klientų ekonomika šiame etape nepatvirtinti. Šešių nišų originalus v9 ratas34/36 išsaugotas; po jo klaidų regresijos pateikiamos atskirai.
