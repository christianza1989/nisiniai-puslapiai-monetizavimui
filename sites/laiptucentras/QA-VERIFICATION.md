# Vietinės patikros įrodymai

**Aktuali v2 peržiūra:** [DESIGN-REVISION-2026-10-01/QA.md](DESIGN-REVISION-2026-10-01/QA.md), [dabartinis auditas](PHASE-1-AUDIT.md). Naujas root rendereris / keturi kadrai / sąmatos ruošinys / Worker favicon pataisa priimti atskiroje8866/8899 kopijoje; žemiau yra istoriniai pirmo bandymo įrodymai. Ši senesnė QA nėra dabartinių source/asset hash ar Lighthouse autoritetas.

2026-10-01T05:24:31.896Z. Izoliuotas production build: C:/Users/lenovo/Documents/dovanos-memorycasting/output/laiptucentras-production; peržiūra http://127.0.0.1:8786/. SMTP ir voice išjungti. Bendras dist ir kitų sesijų procesai neperstatyti / nestabdyti.

- npm run build: PASS, galutinis build po Service schemos pataisos.
- npm run test:core bendrame core: 20/20 PASS, qa/core-tests.log. Vienas naujas testas tikrina šešis informacinius slug bei tikrą paslaugos registravimo puslapį.
- npx tsc --noEmit ir npx eslint components/niche/laiptucentras-site.tsx lib/niche-schema-core.mjs tests/niche-schema.test.mjs: galutinis exit 0.
- node sites/laiptucentras/verify-regressions.mjs: šešios nišos PASS, qa/regressions.json su konkrečių izoliuotų šaltinių SHA-256.
- node scripts/audit-niche.mjs laiptucentras http://127.0.0.1:8786 <own output>: 11 puslapių, 39 užklausos, 0 radinių; qa/html-audit.json. Tikri canonical, heading, anchor, srcset, Article image, schema, sitemap, robots, LLM ir 404.
- Formos HTTP / D1 ir interest: qa/local-form-interest.json; netinkami vardas, paštas, sutikimas / dydis 400, origin 403, nežinomas host 404, honeypot neįrašomas. Tinkamas įrašas 200, D1 source_path ir status new, SMTP off įrašo neištrina. Išvalytas tik tikslus sintetinės nišos įrašas.
- Tikra naršyklės forma: qa/native-validation.json + qa/ui-d1.json ir form-success.png; native tuščios formos fokusas ir serverio patvarus įrašas, pašalintas tik šio testo ID.
- qa/boundaries.json: šeši privatūs būsimi URL 404; svetima medija, admin/draft, nežinomi ir seni neperadresuoti URL nepaviešinti. 20 core testų papildomai tikrina pakeistą hash, laiką, atšaukimą ir host ribas.
- Per-site event priėmimas, DNT/GPC/robotų atmetimas ir neinkrementavimas patikrinti. Vietiniai skaitikliai sintetiniai; tikros paklausos nėra.

## Bendro pašto įrodymo ribos

Pagal MAIL_CORE.md panaudotas jau įvykęs to paties info@pinet.lt bendro transporto 2026-09-30 09:51 UTC bandymas. qa/core-form-mail-20260930.json ir qa/core-inbox-20260930.json turi tą patį d2fe704c-012a-4489-b829-d674483d4b27 Message-ID: Worker forma → D1 → SMTP priėmimas → INBOX received, TLS patikrintas, testas pašalintas iš D1. Jo siteId buvo traktoriupadangos; šio laiptų domeno laiškas nesiųstas. Ankstesnis qa/core-smtp-20260930.json turi kitą ID ir yra atskiras SMTP testas, jo nesutapatiname.

Laiptų patvirtinto paketo kontaktas info@pinet.lt ir dabartinė config numatyto gavėjo taisyklė sutampa. niche-mail.ts, smtp-protocol.mjs ir lead route nėra laiptų sesijos pakeisti; galutiniai jų fingerprint qa/regressions.json. U2/U3 vertina šį bendro vietinio core įrodymą, o U4 lieka UNVERIFIED: būtinas naujas production formos → INBOX bandymas po tikro diegimo. Jokių sekretų ar klientų žinučių neskaityta / nekopijuota.

## Greitis ir vaizdinė patikra

qa/performance-summary.json ir Lighthouse final JSON/HTML: homepage 92/100/100/100, kainos gidas 93/100/100/100. Tikra medija, simuliuotas mobilus headless Chrome, canonical Host per vietinį GET-only proxy. Išmatuota prieš paskutines semantines Service / focus ir gidų indekso tarpų pataisas; jos nekeičia išmatuotų homepage / gido vaizdų, fontų ar skaitymo geometrijos. Tai vietinis lab, ne field CWV, DNS/TLS/CDN ar konversijų rezultatas.

ACCESSIBILITY-VERIFICATION.json aprašo klaviatūrą, native būsenas, kontrastą, 320–1440 px ir trūkstamą 200% didinimą. Visi trys gidai perskaityti atskirai, Article meta, sąrašai, šaltiniai ir vaizdai peržiūrėti desktop/mobile. Ekranai qa/; tyrimo analogai research/.

## Likę vartai

R2/S2: tikras 200% didinimas neįrodytas. Produkcijai neįrodyti domeno kontrolė ir operatoriaus rekvizitai, DNS/TLS ir hostingas, production D1/SMTP/INBOX, retention/legal basis/processors/transfers, abuse/rate/recovery/backup, oficialus crawl ir GSC/field matavimas. D1 liko nepriklausoma nuo būsimo balso core. Jokių fiktyvių pajamų, gamybos, tiekėjų, atsiliepimų ar garantuotų pasiūlymų.
