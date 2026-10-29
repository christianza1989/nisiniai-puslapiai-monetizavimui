# Signaturepads: vietinis Core prijungimas, 2026-10-29

Tiesioginis savininko pavedimas: „Gerai, dabar užbaik Core integraciją ir užklausų siuntimą el. paštu, o gyvos svetainės dar nekeisk.“ Vietinė Core integracija baigta. Tikro pašto autentifikacija ir matching INBOX patikra laukia prieigos. WordPress, DNS, hostingas ir gyva svetainė nepakeisti; niekas nedeployinta ir Git pakeitimai nepushinti.

## Turinio ir vaizdo autoritetas

Native Studio schema v2: 26 puslapiai, 19 produktų, 3 kategorijos. Originalūs tekstai ir kainos išliko; šešiems programinės įrangos aprašams galioja ankstesnė konkreti Roko autorystės išimtis. Bendri `recordEditorialReview` → `approveReviewedBatch` → `releaseContent` API, o ne rankiniai approval hash. Actor yra Codex pagal pavedimą vietinei integracijai, ne fiktyvus savininko perskaitymo įrašas.

Release: `D:/Core/signaturepads-migration-20261029/studio/output/releases/signaturepads/0b7b4d49-9db5-4f1a-a069-3e5523e3d483/`; native paketo SHA-256 `8fb0ec754ff7dc60387376ae31fb0b7ccbd831ee0638016f3d74223a8a532bea`. Kanoninis release verifier patvirtino 26 puslapius / 199 failus. Originalūs vaizdai saugomi privačiai; `saveResponsiveAsset` sukūrė 67 šeimas / 199 WebP variantus. Public šakoje yra tik patvirtintas shadow paketas, nesuaktyvinantis domeno.

Rendereris gauna bendrą `publicContentPages` projekciją. Matomi produktai, tekstai, kainos, paveikslai ir naudojami kategorijų ryšiai gaunami iš native peržiūrėtų blokų; nėra seno HTML ar kainų fallback. Layout saugo vaizdo vietas, šeimų ID ir tipografikos pozicijas. Nežinomos puslapių vietos nepriimamos. Laiko / revocation / media / cross-host vartai lieka bendri.

Galinį `/` išsaugo per-site kanoninis kelias ir Worker riba prieš / po Vinext normalizavimo. Kitos svetainės išlaiko ankstesnę taisyklę. Legacy `?p=488`, `?page_id=2`, puslapiavimas, 225 vaizdų alias ir savininko išimti 410 puslapiai tikrinti. Pašalinti nenaudojami prekybos keliai. Native metaduomenys pateikiami vieną kartą; originalus WordPress JSON-LD nekopijuojamas. Product informacija aprašo katalogą be išgalvoto sandėlio, atsiliepimų ar pirkimo veiksmo.

## Užklausos

Vienas bendras `/uzklausa` → Core lead handleris: D1 `site_id=signaturepads`, vardas, el. paštas, tekstas, telefonas, susisiekimo būdas, šaltinis ir sutikimo laikas. HTML POST veikia be kliento JS; JS gauna tą pačią sutartį JSON formatu. Lietuviškas 2750 ženklų tekstas telpa į ribotą 64 KiB parserį. Origin, honeypot, laukų ribos ir policy publikavimo vartai išlaikyti.

Pasikartojantis to paties `inquiry_id` ir turinio siuntimas grąžina turimą kvitą; kitas turinys su tuo pačiu ID gauna 409. Prieš išorinį siuntimą D1 įraše atominiu būdu užimama `mail-sending` būsena. Neaiškus rezultatas lieka `mail-unknown`, be automatinio pakartojimo ar perjungimo pas kitą tiekėją. Klientui nežadama, kad nežinomos būsenos laiškas išsiųstas ar neišsiųstas. Nativus SMTP / Cloudflare kelias išlieka; Hostinger HTTPS papildymas patikrina autentifikuotos dėžutės tapatybę ir konkretų site ID.

Siuntimo API kodas nėra gavimo įrodymas. 2026-10-29 MX patikra parodė Google gavėjo paštą; iš to nenustatomas esamas WordPress siuntėjas ar jo prisijungimas. Google SMTP pasirinkimas galimas tik aiškiai pririšus esamą autentifikuotą siuntėją prie site ID; faktinis transportas dar nekvalifikuotas. Hostinger naršyklėje atidarytas prisijungimo langas. Prieigą reikia suteikti esamai siuntimo sąrankai perskaityti arba pateikti privačios konfigūracijos failą; slaptažodžiai nekeliauja į Git / public paketą / ataskaitas.

## Faktinės patikros

- 301 Core testas PASS, TypeScript PASS, framework build PASS, 2 RSC manifestai / 0 trūkstamų assetų.
- Tikras vietinis Worker: visi 26 URL, vienas H1 / title / description / canonical, slash redirect, 199 WebP ir 225 senų vaizdų alias; sitemap / robots / llms; private / svetimo host / vidinių kelių izoliacija PASS.
- 10 HTTP/D1 formos atvejų: HTML be JS, JSON, Unicode, replay, conflict, consent, phone, honeypot, origin ir tikslus sintetinių įrašų valymas PASS.
- Tikras naršyklės formos submit: telefono required, naujas UUID po sėkmės, formos reset, D1 telefono / pasirinkimo išlikimas PASS. Laiškai išjungti.
- Native mail failure fixture su tuščia konfigūracija atmetė siuntimą prieš fetch, paliko vieną `mail-unknown` įrašą ir vieną pranešimo bandymą per du vienodus POST; tikslus valymas PASS. Tai nėra SMTP / API autentifikacijos ar INBOX patikra.
- 12 native šablonų vaizdų 1440/390 px, papildomas Adobe 320 px ir realios formos vaizdas: po vieną metaduomenų rinkinį, 0 overflow / trūkstamų vaizdų. Native keyboard Quick View, kainos mažėjimo rikiavimas ir mobilus meniu PASS. Fizinis touch ir tikras 200% browser zoom lieka UNVERIFIED.
- Kitos svetainės `greitossvetaines` HTTP SEO smoke: 7 puslapiai, robots / sitemap / llms / schema / host isolation / 404 PASS.

Įrodymai: `D:/Core/output/signaturepads-migration-20261029/core-integration/`. Ankstesni capture / VISUAL-AUDIT / VISUAL-RESTORATION įrodymai nepakeisti. Lighthouse ir produkcijos greičio įvertis šiame etape nepriskiriamas.

## Vietinis paleidimas ir ribos

Peržiūra: `http://127.0.0.1:8956/`. Tikras engine worktree: `D:/Core/output/signaturepads-migration-20261029/core-integration/engine`, šaka `codex/signaturepads-core-preview-20261029`. Native backend build remiasi public commit `5482f34bebd1cd1b1ea3a8981125beedc1164e82`; vėlesni QA / komentarų commit nekeičia to backend elgesio. Pagal native admission taisyklę aktyvus tik `local-preview/testOnly` output checkout, viešas Host neaptarnaujamas.

Komandų workdir – engine. Paleidimas: `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js dev --config dist/server/wrangler.json --local --persist-to .wrangler/state --ip 127.0.0.1 --port 8956 --inspector-port 0 --env-file D:/Core/output/signaturepads-migration-20261029/core-integration/engine/.dev.vars`. Dabartiniame ignoruojamame faile SMTP/API/voice išjungti. Local D1 neturi ryšio su produkcijos baze. Laikini 8957/8958/8959 įrodymai užbaigti; paliekama tik nauja 8956 peržiūra.

Studio duomenys: `D:/Core/signaturepads-migration-20261029/studio/data`; output – gretimas `studio/output`. Redagavimui naudoti esamus Core Studio API su `STUDIO_DATA_DIR`, `STUDIO_OUTPUT_DIR`, `STUDIO_PUBLIC_CORE_DIR` ir `STUDIO_NETWORK_SETTINGS` šios užduoties keliais. One-time `core-prepare` nėra pakartotinio patvirtintų įrašų perrašymo kelias.

Prieš gyvą paleidimą atskirai būtina tikra pašto autentifikacija ir konkretaus laiško INBOX gavimas, teisinio operatoriaus / užklausos privatumo patikra bei savininko pavedimas publikuoti. Esama slapukų politika išsaugota; jos nelaikome naujai parengta pilna užklausos privatumo politika. Production admission, DNS ir WordPress pakeitimai šiame pavedime neatlikti.

Koordinavimas: private issue303 / public issue102. Upgrade `c1dc3c21-0f01-4d54-8716-f565aec0c901` (native adapter / keliai), `42d27f65-f427-41b2-922f-d1c95a40d259` (užklausos / paštas). Šaltinis savo lokaliose šakose; jokio main merge ar kito PC adoption teiginio.
