# Madbeauty private UI foundation

`node sites/madbeauty/prototype/server.mjs` iš projekto root → http://127.0.0.1:8786. Tik loopback. Nėra deployment, auth ar production marketplace. Jei port užimtas, pasirinkti `MADBEAUTY_KIT_PORT`, nestabdyti svetimo proceso.

`node --test sites/madbeauty/prototype/foundation.test.mjs` — demo exclusion, adapter failure, fixtures/relationships, scope, interval, Vilnius DST, media hashes ir private server ribos. [QA](QA.md).

`node sites/madbeauty/prototype/prepare-assets.mjs` — importuoja own private originals per esamą bendrą `optimizeRaster`, perskaičiuoja 55 WebP ir manifest. Nėra naujo optimizatoriaus, studijos DB ar public approval. Public core importui vėliau naudoti oficialų MEDIA_CORE GUI/import-image ir tikrą paketo schemą; šis privatus manifest nėra patvirtintas turinio paketas.

`config.mjs` — demo defaultoff ir deployment vartas. `demo-model.mjs` — clock/seed/faktinių vienetų helperiai. `demo-adapter.mjs` — izoliuotas public katalogo ir private demo scope adapteris. `public/kit.mjs` — vartoja adapterį; neskaito atskiro savo seed. `server.mjs` — allowlisted loopback static peržiūra, noindex ir GET-only. `private-originals/` neservuojami.

11 PNG originalų yra medijos kilmės dokumentai; UI naudoja `public/images/*.webp`. Promptai `../asset-inputs.json`, source/SHA/variants `ASSET_MANIFEST.json`, komponavimo sutartis `../ASSET_PLAN.json`. SVG wordmark/26 icons originalūs; šriftai Google Fonts oficialaus repo OFL, self-host TTF.

Tai komponentų ir duomenų bazė, ne 70 ekranų platforma. [Galutinis planas](../FINAL_PROTOTYPE_PLAN.md), [screen inventory](../SCREEN_INVENTORY.json), [demo contract](../DEMO_DATA_CONTRACT.md). Real transport/availability/transactions/auth/SEO renderer/native app nėra įgyvendinti. Booking/concurrency/delivery scenarijai NOT_RUN. Production build demo exclusion laukia realios app integracijos.
