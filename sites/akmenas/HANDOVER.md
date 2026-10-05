# akmenas.lt vietinės pirmos fazės perdavimas

2026-10-01. [Vietinė peržiūra](http://127.0.0.1:8886/) – izoliuotas production build, su SMTP ir balsu išjungtais. Bendras dist, kitų nišų procesai bei turinys neliečiami. Tikras domenas nepaleistas.

11 patvirtintų puslapių: pradžia, gidų indeksas, trys gidai, poreikio paaiškinimas, kontaktai, apie projektą, redakcija, sąlygos ir privatumas. Pasiūlymas – akmens stalviršių pasirinkimo informacija ir poreikio aprašas; užklausa nėra užsakymas. Operatorius MB Pinet, info@pinet.lt. Gamybos, tiekimo, montavimo, kainų ir atsakymo terminų nežadama.

4 peržiūrėtos originalios iliustracijos importuotos bendru media keliu, 20 responsive WebP; originalai privatūs, kilmė MEDIA-LEDGER. Trijų gidų medžiaga remiasi NSI, Cosentino ir Laminam pirminiais šaltiniais. Kiekvienas URL atsako į atskirą klausimą. Seni katalogo URL neatkuriami masiniais peradresavimais.

## Įrodymai

- [A–Z auditas](PHASE-1-AUDIT.md): 70/72 vietinių kriterijų, **9,72/10**. R2/S2 tikras 200 % didinimas UNVERIFIED, todėl local-ready ir 10/10 neskelbiama.
- [Performance](PERFORMANCE.json): mobilus local production lab home mediana 92 iš trijų nuoseklių bandymų (90, 92, 99), gidas 91; kitos kategorijos 100. Home LCP 3,05 s, gido 3,17 s, CLS 0. Žemesni matavimai išsaugoti; nėra field CWV įrodymo.
- 19/19 core, 15/15 studijos ir keturių tuo metu įdiegtų nišų SEO smoke. HTML: 11 puslapių, 39 užklausos, 0 findings. Savas izoliuotas TypeScript ir ESLint atskiri. Bendros darbo kopijos naujas kitos sesijos auksarankiams rendereris turi dvi optional externalLinks tipo klaidas; jų čia netaisoma.
- [Forma](FORM-VERIFICATION.json): serverio/native validacija, origin/host/body ribos, patvarus D1 įrašas veikia išjungus paštą ir voice. Sintetinis įrašas pašalintas. Sėkmė nėra laiško gavimo įrodymas.
- [Bendras paštas](SHARED-MAIL-EVIDENCE.json): nepakitusio info@pinet.lt transporto 2026-09-30 SMTP ir matching form-test INBOX. Tai nėra akmenas produkcinio pristatymo bandymas.
- [Matavimas](INTEREST-VERIFICATION.json): site/day/path/event/count, be counter visitor ID ar cookies; bot/DNT/GPC ribos, per-site izoliacija, testinio skaitiklio atkūrimas. QA paspaudimai nėra paklausa.
- [Prieinamumas](ACCESSIBILITY-VERIFICATION.md): klaviatūra, focus, labels, native menu/details, 320/390/768/1440 reflow ir 17 galutinių screenshot. Fizinis telefonas, screen reader ir tikras didinimas netestuoti.
- [Dizaino review](FINISH-REVIEW.md): pradinis subjektyvus 13/14 = 9,29/10; [verdict](FINISH-VERDICT.md) patvirtina tik du taisytus punktus, ne visos svetainės sertifikaciją. Istorinis seed pilnos rankos log neišsaugotas; dabartinis replay tik dalinis. DESIGN ir sidecar aprašo realius CSS tokenus.

## Prieš tikrą paleidimą

Reikia domeno kontrolės, DNS/TLS ir komercinio hostingo, operatoriaus rekvizitų, produkcinio D1/SMTP→INBOX ir klaidų atkūrimo, rate/spam, backup/restore bei prieigų procedūrų. Patvirtinti duomenų teisinį pagrindą, saugojimo/deletion terminus, procesorius ir perdavimus. Per studijos approval atnaujinti aiškiai vietinio piloto formos/privatumo tekstus; jų nepublikuoti kaip parengto produkcinio privatumo dokumento.

Po deployment įrašyti tikrą datą, patikrinti live host izoliaciją, nuorodas ir oficialius crawl/URL Inspection rezultatus. Paklausa nematuota; išplėsti tik surinkus tinkamas realias užklausas, vertę ir vykdymo pajėgumą. CONTENT-PLAN turi šešių mėnesių hipotezes, ne automatinį grafiką.

## Pirmo rezultato sąžiningumas

Build pradėtas tiesioginiu savininko sakiniu; tai nėra parent sukurtos formalios benchmark sesijos įrodymas. Pradinis instruction fingerprint neužfiksuotas; VERSION turi handover hash. Turinys agento parašytas ir per tikrą studijos modelį redaguotas/patvirtintas/eksportuotas; Codex CLI draft job nevykdytas. Savi pataisymai, Impeccable peržiūros, įrankių ir capture ribos išvardytos FIRST-RUN. Parent local balas nepateiktas, jo negalima sutapatinti su savęs auditu.

FIRST-RUN saugo pirmo užbaigimo paketą, source, screenshot, testų/score ir ribų snapshot prieš galutinį atsakymą. Sekančios pataisos nekeičia šio istorinio snapshot.

Naujai sesijai: [START_HERE](../../START_HERE.md), [core](../../CORE_BUILD_CONTRACT.md), [builder](../../SKILLS/niche-site-builder/SKILL.md), [planner](../../SKILLS/niche-content-planner/SKILL.md), [audit](../../SKILLS/niche-site-audit/SKILL.md). Sąsaja lieka content-package.schema.json; bendri SEO/mail/media modeliai nekopijuojami nišose.
