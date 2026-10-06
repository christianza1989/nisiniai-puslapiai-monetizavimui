# Madbeauty — dabartinis backend sprendimas

2026-10-06 · **Vietinė platforma įgyvendinta; išplėstinis priėmimas su ribomis**. Aktualus entrypoint: `node sites/madbeauty/prototype/app-server.mjs` → http://127.0.0.1:8788/. Root8786 neliečiamas. Savininko naujausias nurodymas: nebeperžiūrėti demo vaizdų/profilių ir gerinti platformą.

Veikia email-only vietinis auth, atskiros narystės, naujos meistro darbo vietos ir kliento sukūrimas, pirmas rankinis vizitas dar prieš viešinimą, serverio laiko paieška, atomic hold/confirm/change/cancel, kliento ir meistro ta pati vizito projekcija, pokalbiai, profilinių versijų ir atsiliepimų moderavimas. Nauji klientai ir inquiry/waitlist klientai matomi tik savo darbo vietoje. Kalendorius turi7 dienas, datą/komandos filtrą, blokus, soft atlaisvinimą ir buferių/rezervacijų konfliktų apsaugą. Priedų redaktorius išlaiko kelis arba nulį priedų; paslaugos išjungimas saugo būsimus vizitus.

**Patikra:** backend V14 **35/35**, platform V7 **30/30**. Actual browser pirmas provider→client→manual visit, kliento email login ir restart persistence PASS; `platform-functional-final-v1.json` / `durable-functional-receipt-final.json`. Prisijungusio mobiliojo kalendoriaus Lighthouse V7 **94 performance /100 accessibility /100 best-practices /66 SEO**, LCP2.57s, TBT36.5ms, CLS0.094,194294bytes; privatus noindex sąmoningas. V6 84 ir ankstesnės klaidos išlaikytos.

70 ekranų/panelių įgyvendinimo ir konkrečių naršyklės įrodymų matrica: `SCREEN_STATUS.json`; originalus `SCREEN_INVENTORY.json` istorinis ir neperrašytas. Tai nėra visų70 × visų būsenų PASS. Platformos sample patikrintas1440/820/320, vieši paviršiai1280/390; fizinis įrenginys/visas zoom matrica nepatikrinti. Demo media jau120 originalų/600WebP/40rinkinių; paskutinė instrukcija sustabdė tolimesnę jų peržiūrą.

Turinio core:7 approved puslapiai/3 gidai/20WebP, common importer/projection/review-release, SHA dba452bae4c613cc91b2da0d67addd221e405f30c594992553f3009bfc809579, exported-not-deployed. 3/sav.,6mėn.,10:00Vilnius reiškia76planavimo langus, ne76straipsnius.

**Atskiri nepriimti vartai:** SMTP ir INBOX/el. pašto nuosavybė, tikri teikėjai/teisės/brand, visas katalogo production SSR/SEO/LLM, DNS/TLS/komercinis hostingas/deploy, production privacy/backup/monitoring, reali paklausa. Mokėjimai/FB/voice/gyvi laiškai neįjungti. A–Z85 ir scorer: `PHASE-1-AUDIT.md/json`, `PHASE-1-AUDIT-SCORE.json`; jokio10/10/domain-ready teiginio.

Backend extension lieka Madbeauty namespace. LocalSQLite yra patvarus šio autorizuoto bandymo runtime; ne production D1/Workers įrodymas. OTP tik privatus @example.com capture, ne mail transportas.


## Istoriniai įrašai (ankstesnė apimtis; ne dabartinis priėmimas)

# Madbeauty — aktualus backend sprendimas

2026-10-05 · **IMPLEMENTATION_IN_PROGRESS**, ankstesnio frontend priėmimo neužbaigti.

Savininko nauji nurodymai šaltinio pokalbyje: galutinė produkto sąsaja, demo tik pakeičiamuose duomenyse; bent40 įvairių profilių su individualiais vaizdais; veikiantis meistro registracijos → paslaugų/grafiko → kliento rezervacijos kelias; testavimo registracija kol kas tik el. paštu. Jie pakeičia ankstesnį frontend-only etapą. Tikri laiškai žmonėms, DNS ir viešas deploy neįjungti.

Pasirinkimas vietiniam veikimui: Node22 HTTP API ir patvari SQLite per jau prieinamą `node:sqlite`. Jokio naujo mokamo tiekėjo ar priklausomybės. Rezervacijų tikrinimas ir įrašymas vyksta serverio `BEGIN IMMEDIATE` transakcijoje; tai sprendžia overlap, idempotency, atšaukimą/pakeitimą ir outbox vienoje saugykloje. Duomenų failas atskiras nuo fiktyvių profilių, į Git neįtraukiamas. Vienas serverio UTC clock ir Europe/Vilnius konversijos.

Auth: passwordless el. pašto kodas, anoniminės ir autentifikuotos HttpOnly SameSite sesijos, kodo hash/expiry/attempts/one-use, CSRF/origin/body limit/rate limit ir serverinė organizacijų narystė. Testų laiškai fiksuojami atskiroje privačioje vietinio transporto saugykloje; kodas gaunamas operatoriaus CLI, ne viešu email→code endpoint ir ne produkto UI. Capture įrodymas nėra tikros el. pašto nuosavybės ar SMTP-INBOX įrodymas.

Esamas companion core yra vinext/Cloudflare Workers su atskiru host-aware turinio/public SEO sluoksniu. Jo nekopijuojame ir shared failų šiame lange nekeičiame. API sutartis naudoja tą patį `siteId=madbeauty`, kontaktas skaitomas iš central `config/niche-network.json` (MB Pinet/info@pinet.lt), medijos šeimos iš esamo MEDIA_CORE. Viena public provider projection ir įvykių/siteId sutartis skirta būsimo shared core adapteriui. Vietinis frontend ir API viename origin; būsimas Node API turi būti už same-origin proxy ir persistent volume. D1/Workers hosting adapterio migracija nėra automatiškai priimta: D1 transakcijų modelį reikėtų įgyvendinti ir tikrinti atskirai, ne tiesiog pakeisti SQLite URL.

Darbo ribos: tik `sites/madbeauty/`, `sites/madbeauty.md`, own `research/madbeauty-implementation/` ir own WORKSTREAMS. Root8786 neliečiamas. Backend auth/storage/concurrency priėmimas, visas produkto UI,40profiliai/medija ir kiekvieno ekrano actual įrodymai dar vykdomi. Ankstesni30 testų ir mobilus Lighthouse93 yra ankstesnės privačios sąsajos bazė, ne naujo pilno backend rezultatas.
