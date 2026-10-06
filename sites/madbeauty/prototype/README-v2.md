# Madbeauty — vietinė platforma

2026-10-06 · **Vietinė platforma įgyvendinta; išplėstinis priėmimas su ribomis**. Aktualus entrypoint: `node sites/madbeauty/prototype/app-server.mjs` → http://127.0.0.1:8788/. Root8786 neliečiamas. Savininko naujausias nurodymas: nebeperžiūrėti demo vaizdų/profilių ir gerinti platformą.

Veikia email-only vietinis auth, atskiros narystės, naujos meistro darbo vietos ir kliento sukūrimas, pirmas rankinis vizitas dar prieš viešinimą, serverio laiko paieška, atomic hold/confirm/change/cancel, kliento ir meistro ta pati vizito projekcija, pokalbiai, profilinių versijų ir atsiliepimų moderavimas. Nauji klientai ir inquiry/waitlist klientai matomi tik savo darbo vietoje. Kalendorius turi7 dienas, datą/komandos filtrą, blokus, soft atlaisvinimą ir buferių/rezervacijų konfliktų apsaugą. Priedų redaktorius išlaiko kelis arba nulį priedų; paslaugos išjungimas saugo būsimus vizitus.

**Patikra:** backend V14 **35/35**, platform V7 **30/30**. Actual browser pirmas provider→client→manual visit, kliento email login ir restart persistence PASS; `platform-functional-final-v1.json` / `durable-functional-receipt-final.json`. Prisijungusio mobiliojo kalendoriaus Lighthouse V7 **94 performance /100 accessibility /100 best-practices /66 SEO**, LCP2.57s, TBT36.5ms, CLS0.094,194294bytes; privatus noindex sąmoningas. V6 84 ir ankstesnės klaidos išlaikytos.

70 ekranų/panelių įgyvendinimo ir konkrečių naršyklės įrodymų matrica: `SCREEN_STATUS.json`; originalus `SCREEN_INVENTORY.json` istorinis ir neperrašytas. Tai nėra visų70 × visų būsenų PASS. Platformos sample patikrintas1440/820/320, vieši paviršiai1280/390; fizinis įrenginys/visas zoom matrica nepatikrinti. Demo media jau120 originalų/600WebP/40rinkinių; paskutinė instrukcija sustabdė tolimesnę jų peržiūrą.

Turinio core:7 approved puslapiai/3 gidai/20WebP, common importer/projection/review-release, SHA dba452bae4c613cc91b2da0d67addd221e405f30c594992553f3009bfc809579, exported-not-deployed. 3/sav.,6mėn.,10:00Vilnius reiškia76planavimo langus, ne76straipsnius.

**Atskiri nepriimti vartai:** SMTP ir INBOX/el. pašto nuosavybė, tikri teikėjai/teisės/brand, visas katalogo production SSR/SEO/LLM, DNS/TLS/komercinis hostingas/deploy, production privacy/backup/monitoring, reali paklausa. Mokėjimai/FB/voice/gyvi laiškai neįjungti. A–Z85 ir scorer: `PHASE-1-AUDIT.md/json`, `PHASE-1-AUDIT-SCORE.json`; jokio10/10/domain-ready teiginio.

Patikros komandos iš workspace root:

- `node --test sites/madbeauty/backend/backend.test.mjs sites/madbeauty/backend/fixture-runtime.test.mjs`
- `node --test sites/madbeauty/prototype/foundation.test.mjs sites/madbeauty/prototype/platform.test.mjs`
- `node sites/madbeauty/content/run-seo-smoke.mjs`
- `$env:MB_LH_VERSION='v8'; node sites/madbeauty/prototype/run-authenticated-lighthouse.mjs` (naudoti naują versiją, neperrašyti ankstesnės)

DefaultpreviewDB vienkartinis/patvarus, `MADBEAUTY_DATA_MODE=unseeded` atidaro atskirą pirminįQA. `runtime/` privatus ir Git ignored; mailcapture helper leidžia tik vietinius QA @example.com, nieko nesiunčia. Shared/companion source read-only.


## Istoriniai įrašai (ankstesnė apimtis; ne dabartinis priėmimas)

# Madbeauty private UI foundation

## Dabartinė vietinė platforma

`node sites/madbeauty/prototype/app-server.mjs` iš workspace root → http://127.0.0.1:8788/. Tik loopback ir noindex. [Aktuali apimtis ir priėmimas](../IMPLEMENTATION_STATUS.md), [backend](../BACKEND_DECISION.md), [turinio eiga](../CONTENT_READINESS.md). Savininkas autorizavo vietinį email-only teikėjo / kliento backend; šis rezultatas jau apima serverio sesijas, auth, narystes, transactional booking, pokalbius ir moderuojamą media. Galutinis 70 ekranų priėmimas IN_PROGRESS.

Default `MADBEAUTY_DATA_MODE=preview`: vienkartinis 40 solo / 6 salonų serverio fixture atskirame `runtime/platform-preview.sqlite`. `unseeded`: pirminis izoliuotas registracijos QA DB. `demo`: ankstesnis browser mock. Real storage atsisako atidaryti pažymėtą demo DB. Vietinis OTP capture tik @example.com testams nėra actual email pristatymas. Runtime / originalai neservuojami ir neimportuojami kaip viešas turinys.

`node --test sites/madbeauty/backend/backend.test.mjs sites/madbeauty/backend/fixture-runtime.test.mjs` — serverio vartai; actual rezultatas V7 27/27. `node --test sites/madbeauty/prototype/foundation.test.mjs sites/madbeauty/prototype/platform.test.mjs` — po turinio adapterio integracijos V4 30/30 PASS. V3 28/30 FAIL išliko atskirai: pataisytas guide route be common projection ir atnaujintas anksčiau visą schema draudęs testas. Common SEO: `node sites/madbeauty/content/run-seo-smoke.mjs`, aktualūs 7 public turinio puslapiai.

120 peržiūrėtų atskirų profilinių originalų / 600 WebP: `PROFILE_ASSET_MANIFEST_V2.json`, batch 001–019. `import-profile-assets.mjs` naudoja shared optimizeRaster. Common studijos V1 approved/released/imported turinys: `../content/adapter.mjs`, 3 gidai ir 4 susiję puslapiai; algoritmų kopijų nėra. SHA ir exact common importerio priklausomybės dokumentuoti atskirai.

**Žemiau — pradinis komponentų kit aprašymas su istorine frontend-only apimtimi. Jo 8786 procesas priklauso root; vietinei platformai naudoti 8788 ir nestabdyti root.**

`node sites/madbeauty/prototype/server.mjs` iš projekto root → http://127.0.0.1:8786. Tik loopback. Nėra deployment, auth ar production marketplace. Jei port užimtas, pasirinkti `MADBEAUTY_KIT_PORT`, nestabdyti svetimo proceso.

`node --test sites/madbeauty/prototype/foundation.test.mjs` — demo exclusion, adapter failure, fixtures/relationships, scope, interval, Vilnius DST, media hashes ir private server ribos. [QA](QA.md).

`node sites/madbeauty/prototype/prepare-assets.mjs` — importuoja own private originals per esamą bendrą `optimizeRaster`, perskaičiuoja 55 WebP ir manifest. Nėra naujo optimizatoriaus, studijos DB ar public approval. Public core importui vėliau naudoti oficialų MEDIA_CORE GUI/import-image ir tikrą paketo schemą; šis privatus manifest nėra patvirtintas turinio paketas.

`config.mjs` — demo defaultoff ir deployment vartas. `demo-model.mjs` — clock/seed/faktinių vienetų helperiai. `demo-adapter.mjs` — izoliuotas public katalogo ir private demo scope adapteris. `public/kit.mjs` — vartoja adapterį; neskaito atskiro savo seed. `server.mjs` — allowlisted loopback static peržiūra, noindex ir GET-only. `private-originals/` neservuojami.

11 PNG originalų yra medijos kilmės dokumentai; UI naudoja `public/images/*.webp`. Promptai `../asset-inputs.json`, source/SHA/variants `ASSET_MANIFEST.json`, komponavimo sutartis `../ASSET_PLAN.json`. SVG wordmark/26 icons originalūs; šriftai Google Fonts oficialaus repo OFL, self-host TTF.

Tai komponentų ir duomenų bazė, ne 70 ekranų platforma. [Galutinis planas](../FINAL_PROTOTYPE_PLAN.md), [screen inventory](../SCREEN_INVENTORY.json), [demo contract](../DEMO_DATA_CONTRACT.md). Real transport/availability/transactions/auth/SEO renderer/native app nėra įgyvendinti. Booking/concurrency/delivery scenarijai NOT_RUN. Production build demo exclusion laukia realios app integracijos.
