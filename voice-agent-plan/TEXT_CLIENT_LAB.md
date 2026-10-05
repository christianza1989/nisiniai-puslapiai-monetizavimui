# Tekstinė klientų laboratorija ir bendras paštas

2026-10-01. Tai įgyvendinimo įrodymai, papildantys 2026-09-30 [PRELIVE_QA](PRELIVE_QA.md), o ne gyvo balso ar viso roadmapo priėmimas. Bendras komercinės plėtros planas: [PROCUREMENT_AND_INVOICING](PROCUREMENT_AND_INVOICING.md). Viešo tinklo pašto sutartis: [MAIL_CORE](../MAIL_CORE.md).

**Naujausia savininko pataisa įgyvendinta:** [CUSTOMER_VIEW](CUSTOMER_VIEW.md). Dabar klientų laiškai / PDF be bandymų žymų, pasiūlymuose mūsų kaina su keičiamu 15 % antkainiu ir nėra konkurentų nuorodų. Nauji 5 laiškai + 1 profesionalus PDF SMTP priimti; ankstesni šiame žurnale aprašyti laiškai išsaugoti istorijoje. PDF generavimas ir prisegimas jau automatinis; toliau minimas HTML priedas ir viešų šaltinių rodymas aprašo ankstesnę šios dienos versiją.

## Tikri bandymai

Codex CLI adapteris vykdė šešis sintetinius klientus per realų FastAPI/PostgreSQL core: aiškų dviejų padangų poreikį, nežinomą dydį, skubų poreikį su pataisytu matmeniu, techninį 4WD klausimą, kainos/spaudimo ir privatumo scenarijų bei bandymą išgauti kitų klientų duomenis / sukurti apmokėtą užsakymą. Asistentui perduodamos įprastos kliento žinutės; testinė aplinka ir archetipų vertinimo žymos lieka serverio pusėje. CLI neturi siuntimo ar failų keitimo įrankių.

Testuojami realūs knowledge, need revision, contact form ACK, analysis/quality ir follow-up mechanizmai. Naršyklės ACK šiame runneryje imituotas. Atsakymai vertinami pagal poreikio išsaugojimą, faktų bei veiksmų ribas ir pagrįstą kokybės analizę. LLM kokybės vertintojas turi atskirą užduotį, bet naudoja tą patį modelio tiekėją; tai nėra nepriklausomas mokytas arbitras.

| Bandymas | Rezultatas ir intervencijos |
| --- | --- |
| Pradiniai trys bandymai | Schema, poreikio laukų ir evidence ID klaidos; daliniai rezultatai išsaugoti. Vienas root nutrauktas bandymas išvalytas tik jo UUID aplinkoje. |
| `578ed90f-364c-460f-8262-c350b80c0116` | 71 CLI kvietimas, du pilni ciklai. Pirmas 5/6, kandidato ciklas 2/6. Kontaktinio kvietimo prompto kandidatas neaktyvuotas. Senieji penki laiško juodraščiai pakeisti naujesniais, neišsiųsti. |
| `b6194be1-1153-47fa-a0af-6fd413b0cf7c` | 38 CLI kvietimai, 6/6 visos deklaruotos patikros. Patikslinti leistini profilio laukai, telefono/SMS galimybės, evidence ir išsaugoto kontakto kvitai. Penki kontekstiniai laiškai; kontaktą atmetusiam klientui laiško nėra. |

Galutinis rezultatas yra vystymo regresija po root intervencijų. Tai ne nematytas holdout, statistinis patikimumo įrodymas ar garantija „visais atvejais“. Kalibratoriaus kandidatui parodyti tik trys train scenarijai, tačiau root vėliau matė visų scenarijų klaidas ir tikslino bendrą kontekstą. Modelių svoriai nekeisti, production promptas automatiškai neaktyvuotas.

Privatūs ataskaitų JSON, HTML ir `.eml` išsaugoti `agent-business-core/runtime/artifacts/client-lab/<runId>/round-<n>/`. Jų neimportuoti į viešą turinį, Git ar žinių projekciją.

## Pasiūlymų laiškai

Patikrintos viešų LT/DE produktų kainų momentinės kopijos atskirame `evals/public-offers.json`. Specifikaciją atitinkančios prekės pridedamos deterministiniu bendru rendereriu; trūkstant matmens siunčiamas patikslinimo laiškas. Šaltinio data, rodomas PVM pagrindas, kiekis, kaina ir nežinomos sąlygos išsaugomos. Kitos nišos variantai atmetami; paslaugų variantui tas pats mechanizmas patikrintas sintetiniu testu.

Penki galutinio ciklo laiškai išsiųsti bendru `jobs.smtp_send` transportu iš savininko patvirtinto `info@pinet.lt` į privačiai sukonfigūruotą testinį Gmail. Visi penki SMTP priimti. Keturi turi viešų produktų variantus, vienas prašo patikslinti dydį. Antraštės ir turinys aiškiai TESTINIAI, nėra mūsų antkainio, rezervacijos, mokėjimo prašymo ar tiekėjui išsiųsto užsakymo. SMTP kvitas neįrodo gavėjo inbox pristatymo.

Tai ribotas savininko testinis kanalas: leidžiamas tik nustatytas gavėjas, tik vietinė aplinka ir tik sintetiniai laiškai. Production `PINET_SMTP_ENABLED=false` bei balso M0 vartai išlieka. Prieš IO išsaugomas siuntimo ketinimas; neaiški baigtis automatiškai nekartojama. Pasikartojantis source/case grąžina tą patį laišką.

## Bendras pašto modulis ir UI

Alembic `0008_mail` pritaikytas: 18 ORM lentelių, 14 su forced RLS. Runtime rolė ne superuser, neturi BYPASSRLS ar lentelių nuosavybės. Vienas core teikia per-site juodraščius, siuntimo būsenas, gautus atsakymus ir case istoriją. Operator auth atskirtas nuo kliento ir worker auth; svetimos nišos laiškas grąžina 404.

Tikra autentifikuota konsolė: `http://127.0.0.1:8840/operator/mail-ui`. Savininko bendras operatoriaus raktas yra laikinas vietinis prisijungimo mechanizmas; individualių naudotojų IAM dar nėra. Tik sintetinių įrašų peržiūra be siuntimo: `http://127.0.0.1:8861/`. UI tikrinta tikroje Codex naršyklėje: verslo filtras, tuščia kitos nišos dėžutė, tik siunčiamų laiškų filtras ir laiško detalė. Ekrano įrodymas privatus `artifacts/mail-console-preview/mail-ui.jpg`.

IMAP prisijungimas ir ribotas skaitymas veikia. Naudojami `BODY.PEEK`, paskutinių 100 INBOX antraščių ribojimas ir žinomų gijų nuorodos; turinys skaitomas tik dalyviui ir vienareikšmiam case atitinkančiam atsakymui. Message-ID dedupe ir tarp-nišų testai praėjo. Tikrų atsakymų bandymo metu rasta 0. Tai dar ne visos paskyros istorinių laiškų importas: nepažintos gijos, patvarus UIDVALIDITY/cursor, bounce reconciliation ir automatinio atsakymo worker priklauso C2. From antraštė nėra finansinio veiksmo ar kliento tapatybės patvirtinimas.

## Sąskaitos po patvirtinimo

Bendri owner-only vietiniai API: `POST /operator/sites/{site_id}/order-tests` ir `POST /operator/sites/{site_id}/order-tests/{case_id}/confirm`. Pasiūlymas turi hash, request ID ir 30 min galiojimą. Patvirtinimas privalo atitikti versiją; pakartotinis patvirtinimas grąžina tą patį laišką. Pirkėjo duomenys, prekės/paslaugos ir kainos tipizuoti; mokesčius ir išrašytoją parenka serverio profilis. Trūkstama konfigūracija sukuria juodraštį be siuntimo.

Savininko laikinai nurodyti rekvizitai: MB Memocasting, kodas 306026827, Pupinės g. 10, LT-02206 Vilnius, +370 676 64251. Naujausia instrukcija: **testams laikyti ne PVM mokėtoja**, todėl PVM neskaičiuojamas. Ankstesnis teiginys apie PVM mokėtojo statusą nėra perrašomas kaip patikrintas registrinis faktas. Privatus profilis pažymėtas `synthetic_tests_only`, realus statusas nepatikrintas, fiscal issuance false. Viešų nišų operatorius MB Pinet ir kontaktai dėl šio invoice profilio nekeičiami.

Pinigų skaičiavimai deterministiniai su Decimal. Vieša kaina su PVM negali tyliai tapti unit net. Antkainis nuo savikainos atskirtas nuo maržos. Netinkami/skirtingi mokesčio statusai atmetami. Bendras sąskaitos HTML prisegamas prie testinio laiško; atskiras PDF eksportas sugeneruotas ir vizualiai patikrintas. Automatinis PDF prisegimas ir fiskalinis numeravimas dar neįgyvendinti.

`scripts/order_test_demo.py` kuria tik aiškų sintetinį pavyzdį; `--confirm --send` imituoja kliento patvirtinimą ir siunčia vieną testinį dokumento laišką. Kvitas `artifacts/order-test-demo-2026-10-01.json`. Tai nėra žmogaus atliktas tikras pirkimo patvirtinimas, apskaitos dokumentas ar mokėjimo įrodymas.

## Patikrų apimtis ir likę vartai

- Pilnas runtime suite: 112 passed prieš paskutinius order-test ir mokesčio statuso papildymus; senas 92/19 įrodymas išsaugotas 2026-09-30 žurnale.
- Po papildymų: 23 invoice/order/offers/mail testai, 36 core/calibration/contact/order regresijos ir ankstesni 26 mail/delivery/invoice/CLI testai praėjo. Ruff visas runtime švarus. Skirtingų paleidimų skaičiai nesumuojami kaip vienas suite rezultatas.
- Metaduomenų QA: restricted role, forced RLS, production SMTP/balso off, galutiniai 6 scenarijai ir 5 SMTP kvitai PASS (`artifacts/mail-core-qa-2026-10-01.json`).
- Nepatvirtinta: gavėjo inbox ir realaus atsakymo sugrįžimas, Gemini/audio/M0, tiekėjų derybos, realus antkainio pasiūlymas, tikras customer acceptance, fiscal invoice/payment, production deployment ir 30 nišų onboarding.

Kitas realus e2e pašto įrodymas: gavėjas atsako į vieną testinį laišką → `scripts/sync_mail_replies.py` įkelia atsakymą į tą patį site/case → operatorius mato jį bendrame UI. Automatinė komercinė derybų grandinė statoma pagal C1–C5 vartus, o gyvas balsas tik pagal M0 runbook.

## 2026-10-01 tęsinys su contact-during ir Gmail

Naujas užfiksuotas šešių klientų rinkinys `evals/clients-adaptive-v2.json` išbandytas su tikrais core tools, popup ACK ir kontakto įvedimu pokalbio metu. Baseline ir bendravimo candidate 6/6, bet candidate nepriimtas dėl vienodo rezultato. Pirmas job-order gedimas bei CLI timeout išsaugoti, driver/root pataisos dokumentuotos. Tikras savininko Gmail atsakymas → IMAP → derybų laiškai → kliento patvirtinimas → automatinis PDF jau įrodytas viename case; jis nėra realaus kliento ar paklausos įrodymas. Pilni kvitai, testai ir ribos: [nauja ataskaita](SALES_CALIBRATION_2026-10-01.md). Ankstesnis šiame faile inbox UNVERIFIED žymi tuometinį bandymą.
