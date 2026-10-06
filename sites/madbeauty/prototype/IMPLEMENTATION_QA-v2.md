# Madbeauty — platformos QA

## Aktualus UI/UX V2 priėmimas — 2026-10-06

Backend V16 35/35, platform/HTTP/layout V10 29/29 ir atskirai foundation V10 9/9: **73 PASS**. Trijų meistrų vienalaikiai 15 min. vizitai, gretimas vizitas ir vėlesnis 60 min. vizitas patikrinti tikrame desktop/mobile kalendoriuje. Rankinis vizitas → perkėlimas → atšaukimo validacija → atšaukimas → reload išlaikė tą patį ID, kainą/trukmę ir canceled/version3 būseną. 27 nauji kadrai / 23 priimti įrašai, 13 JS sintaksės patikrų PASS. Lighthouse V9 prisijungusiam mobiliajam kalendoriui 94/100/100/66; vietinis privatus noindex puslapis.

Aktualūs įrodymai ir ribos: [priėmimas](../uiux/ACCEPTANCE.md), [kelionės ir spragos](../uiux/JOURNEYS.md), [būsenų matrica](../uiux/SCREEN_STATE_MATRIX.json). Visų 70 ekranų visos būsenos nepriimtos; fizinis zoom, OS reduced-motion ir production įrenginiai UNVERIFIED. Intervencijos bei ankstesnės nesėkmės išlaikytos. Demo vaizdų/profilių peržiūra neatnaujinta; gyvi kanalai neįjungti.

## Istorinis UI/UX V1 priėmimas — 2026-10-06

Vietinės platformos formos, prisijungimo ir rezervavimo atkūrimas, paieška, kalendorius ir variantų pasirinkimas pagerinti. 146 naršyklės maršrutų ir pločių patikrų per 46 paviršius; 320/390/640/820/1440 px. Backend V15 35/35, platform V9 30/30, HTTP V1 4/4; iš viso 69 PASS. Prisijungusio kalendoriaus Lighthouse V8 94/100/100/66. Aktualios ribos ir 70 ekranų matrica: [UI/UX priėmimas](../uiux/ACCEPTANCE.md). Visų 70 ekranų visos būsenos, fizinis mastelio ir sumažinto judesio bandymas bei production vartai tebėra UNVERIFIED. Demo vaizdų ir profilių peržiūra neatnaujinta.

# Madbeauty — actual platformos QA

2026-10-06 · **Vietinė platforma įgyvendinta; išplėstinis priėmimas su ribomis**. Aktualus entrypoint: `node sites/madbeauty/prototype/app-server.mjs` → http://127.0.0.1:8788/. Root8786 neliečiamas. Savininko naujausias nurodymas: nebeperžiūrėti demo vaizdų/profilių ir gerinti platformą.

Veikia email-only vietinis auth, atskiros narystės, naujos meistro darbo vietos ir kliento sukūrimas, pirmas rankinis vizitas dar prieš viešinimą, serverio laiko paieška, atomic hold/confirm/change/cancel, kliento ir meistro ta pati vizito projekcija, pokalbiai, profilinių versijų ir atsiliepimų moderavimas. Nauji klientai ir inquiry/waitlist klientai matomi tik savo darbo vietoje. Kalendorius turi7 dienas, datą/komandos filtrą, blokus, soft atlaisvinimą ir buferių/rezervacijų konfliktų apsaugą. Priedų redaktorius išlaiko kelis arba nulį priedų; paslaugos išjungimas saugo būsimus vizitus.

**Patikra:** backend V14 **35/35**, platform V7 **30/30**. Actual browser pirmas provider→client→manual visit, kliento email login ir restart persistence PASS; `platform-functional-final-v1.json` / `durable-functional-receipt-final.json`. Prisijungusio mobiliojo kalendoriaus Lighthouse V7 **94 performance /100 accessibility /100 best-practices /66 SEO**, LCP2.57s, TBT36.5ms, CLS0.094,194294bytes; privatus noindex sąmoningas. V6 84 ir ankstesnės klaidos išlaikytos.

70 ekranų/panelių įgyvendinimo ir konkrečių naršyklės įrodymų matrica: `SCREEN_STATUS.json`; originalus `SCREEN_INVENTORY.json` istorinis ir neperrašytas. Tai nėra visų70 × visų būsenų PASS. Platformos sample patikrintas1440/820/320, vieši paviršiai1280/390; fizinis įrenginys/visas zoom matrica nepatikrinti. Demo media jau120 originalų/600WebP/40rinkinių; paskutinė instrukcija sustabdė tolimesnę jų peržiūrą.

Turinio core:7 approved puslapiai/3 gidai/20WebP, common importer/projection/review-release, SHA dba452bae4c613cc91b2da0d67addd221e405f30c594992553f3009bfc809579, exported-not-deployed. 3/sav.,6mėn.,10:00Vilnius reiškia76planavimo langus, ne76straipsnius.

**Atskiri nepriimti vartai:** SMTP ir INBOX/el. pašto nuosavybė, tikri teikėjai/teisės/brand, visas katalogo production SSR/SEO/LLM, DNS/TLS/komercinis hostingas/deploy, production privacy/backup/monitoring, reali paklausa. Mokėjimai/FB/voice/gyvi laiškai neįjungti. A–Z85 ir scorer: `PHASE-1-AUDIT.md/json`, `PHASE-1-AUDIT-SCORE.json`; jokio10/10/domain-ready teiginio.

## Bandymo intervencijos

Ankstesni failed testų/Lighthouse/capture/import rezultatai išlaikyti. Native modal Tab pirmame820px bandyme paliko DOM fokusą; explicit boundary handler pridėtas ir actual Shift+Tab/Tab/Escape retestas PASS. 84 signed-in Lighthouse buvo tikras trūkumas; po scoped/lazy/parallel krovimo94. Senas guest97 nebuvo laikomas darbo vietos balu. V3 staff mobile loading, V4 screenshot paint race ir galerijos distortion nėra PASS; SCREEN_STATUS žymi ribas. Sauga/functional testai nėra dizaino ar paklausos įrodymas.

## Įrodymų matrica

- public-home: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- public-search: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- public-services: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- public-service-hub: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- public-city-hub: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- public-catalog: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- public-practitioner: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- public-venue: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- public-gallery: IMPLEMENTED_LOCAL; desktopEvidence=false; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- public-service-option: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- public-for-business: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- booking-services-step: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- booking-staff-step: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- booking-time-step: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- booking-details-step: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- booking-review-step: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- booking-confirmation: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- booking-inquiry: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=false; fullStateAcceptance=UNVERIFIED.
- booking-waitlist: IMPLEMENTED_LOCAL; desktopEvidence=false; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- booking-reschedule: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- booking-cancel: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- customer-entry: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- customer-appointments: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- customer-visit-detail: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- customer-favorites: IMPLEMENTED_LOCAL; desktopEvidence=false; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- customer-messages: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- customer-profile: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- customer-settings: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- customer-review: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- professional-onboarding: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- professional-overview: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- professional-calendar: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- professional-visit-drawer: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- professional-manual-visit: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- professional-inquiries: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- professional-waitlist: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- professional-clients: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- professional-client-detail: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- professional-services: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- professional-service-editor: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- professional-shifts: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- professional-resources: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- professional-team: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- professional-profile: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- professional-gallery: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- professional-messages: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- professional-reports: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- professional-integrations: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- professional-settings: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- operator-queue: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- operator-provider-review: IMPLEMENTED_LOCAL; desktopEvidence=false; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- operator-catalog: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- operator-reports: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- operator-delivery: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- operator-content: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- operator-metrics: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- content-guides: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- content-guide: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- content-editorial: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- content-author: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- trust-about: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- trust-contact: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- trust-how: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- trust-verification: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- trust-help: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- trust-privacy: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- trust-cookies: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- trust-terms: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- trust-cancellation: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.
- trust-not-found: IMPLEMENTED_LOCAL; desktopEvidence=true; mobileEvidence=true; fullStateAcceptance=UNVERIFIED.

Galutinė papildoma pataisa: reschedule variantas prieš patvirtinimą rodo kainą ir trukmę. Atomic change atnaujina snapshot/meistrą/resursą, tikrina konkretaus vizito prieigą ir leidžia savo esamą nepublikuoto meistro vizitą perkelti klientui. BackendV13 pirmas naujo kontrakto testas FAIL: aptikta approval-dependent reschedule spraga. Pataisyta; V14 35/35PASS2049.8453ms, platformV7 30/30PASS2362.7397ms. V13FAIL išlaikytas. Actual320px reschedule panelė ir native dialog replacement focus retestuoti;1280px savaitė dabar rodo visus7stulpelius.
