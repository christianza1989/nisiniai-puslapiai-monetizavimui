# Paštomatų paieška ir atsiskaitymo sąlygų pataisa

Savininkas paprašė rodyti paštomatų pasiūlymus iškart rašant. Pradinė paieška jau rasdavo „salinink“, tačiau rezultatą paslėpdavo antrame uždarytame select. Papildomai patvirtintas atskiras atsiskaitymo blokavimas: LT market policyVersion 1ac82535 nesutapo su paskelbtu ir patvirtintu 7893ecb3. Sąlygų SEO aprašymo pakeitimas pakeitė reviziją, o prekybos konfigūracija liko sena. Griežtas sutapimo tikrinimas išsaugotas.

- [x] Vienas paieškos laukas, iškart matomi ir paspaudžiami rezultatai, tik patikimi paštomatų ID. Miesto, adreso, kelių žodžių ir lietuviškų raidžių paieška.
- [x] Klaviatūros Arrow/Enter/Escape, matomas pasirinkimas, aiški nerastų rezultatų būsena, iki 12 rezultatų ir patikslinimo tekstas.
- [x] Pakeitus užklausą išvalomas senas ID/adresas ir ankstesnė kainos peržiūra. Kurjerio adreso atkūrimas, kiekio/rinkos apribojimai ir išsaugoto užsakymo blokavimas išlaikyti.
- [x] Patikrintas vienos aktyvios rinkos native D1 konfigūracijos atnaujinimo įrankis: pilnas validateStore prieš/po ir visas ankstesnis JSON CAS. Tik LT policy hash pakeistas; senų užsakymų priėmimas nekeistas.
- [x] Tikra paskelbta LT revizija sutampa su atnaujintu market. Naujame HTTPS krepšelyje sutikimo laukelis įjungtas, nepažymėtas, nuoroda /naudojimo-salygos.
- [x] Jei ateityje sąlygos nesutaptų, rodomas aiškus paaiškinimas; submit taip pat tikrina tikrą galiojančią nuorodą ir disabled būseną. Tikrinimas neapeinamas.
- [x] 261 canonical testas, format, native workerd/D1/R2/restart ir dry-run; papildyti UI ir 5 konfigūracijos CAS testai.
- [x] Tikslus SDK importas, PUBLIC regresija/surinkimas, compiled desktop/mobile patikra ir diegimas.
- [x] Hosted naujos paieškos priėmimas ir Git perdavimas.

Pradinė bazė: CORE900ae95f / PUBLICed35c6ad; runtime backend52b3b0a7 / frontend42faf05d. Issue271; root locker-search šakos. Root rašo UI/testus ir diegia; du specialistai atliko atskirą šaltinio peržiūrą ir nustatė sąlygų priežastį, vienas savo šakoje parengė siaurą operatoriaus helperį. Svetimi media, outputs, journal ir skills-lock nekeičiami.

Vietinis vaizdas išlaiko esamą Manrope, paletę ir formos išdėstymą. Viena desktop/320px peržiūra patvirtino matomą rezultatą ir pasirinkimą pelės paspaudimu bei klaviatūra; mobilus CDP touch pateko į input, nors DOM/screenshot koordinatės rodė option, todėl fizinio telefono tap priėmimas nedeklaruojamas. Tai naršyklės valdymo ribojimas, ne įrodytas pasirinkimo kodo gedimas.

Originalios nesėkmės išsaugotos privačiai: policy JSON įrankio išvesties truncation, vietinio fixture trūkstamas country, naujos missing-policy regresijos atskleistas submit guard trūkumas. Produkcijoje bandomas užsakymas, mokėjimas, siunta ar kliento laiškas nekuriami; tikras savininko krepšelis neperspaudžiamas ir jo duomenys neperkraunami.

Kiekvienas būsimas pirkimo sąlygų pakeitimas, įskaitant metadata, turi būti sutikrintas su aktyvios rinkos revizija. Naudoti commerce-core/docs/MARKET_POLICY_UPDATE.md; neperrašyti viso store konfigūracijos ir neatstatyti DB snapshot. Pataisos rollback gali keisti tik pasirinkimo UI, o dabartinis patvirtintas sąlygų hash ir visi užsakymai turi likti.

## Baigtas priėmimas

CORE source6db4eb58638e124fdfbcc7d16173b0259561bbf3, PR272 merged1197ecabd08243173b82d0539085ee2e4370a851. PUBLIC source6c0c6a1a2cc6ef7cc1de91bd2d8bd1f77b0816ef, PR87 merged9f6058533d4d61fad4acdc72ca88a7625dc63e51. Merge application tree nesiskiria nuo patikrinto build. SDK checkout-ui SHA256 d2f5391a814d6c4d2872e769961210a34dbcaca557c318462e20df71784a82b7; commerce-client išliko50ac32db69d0bfb9e8bff8c8c16a5ba8e79169d47d98dd61f1c0e4d0c51297f4.

261 CORE ir273 PUBLIC testai, native workerd, TypeScript, scoped lint, build ir actual production profilių dry-run PASS. Source, compiled ir tikro HTTPS krepšelio rezultatai matomi po lauku, pasirenkami vienu desktop paspaudimu; klaviatūra veikia. Compiled ir live320px screenshotai perskaityti, scrollWidth320, konsolėje klaidų nėra. Fizinis mobile touch tebėra UNVERIFIED dėl dokumentuoto valdymo koordinačių ribojimo.

Aktyvus backend b9a93bd4-2c38-4f6d-9dc2-830b35fe1ca2, deployment aa69ebf9-87ef-4a02-9bca-69c92d02f3af,06:26:48UTC; frontend51b08875-a113-427a-b61a-92f06bfdc3e0, deployment4105b3b9-053a-488a-aa51-085338ce479d,06:37:39UTC. Abu100%. Mail4b165ec7nekeistas.

Prieš/po actual provider comparison: visų trijų modulių bindings, plaintext vars, secret vardai, compatibility/observability,3domenai ir sertifikatai, cron bei mailversija sutampa. Acrossdeploy išliko5užsakymai/20168minor bendra užsakymų suma (ne apmokėtos pajamos),1savininko sukurtas kuponas,27migracijos ir rinkų admission. Paketas5be826b7/SHA b02879f7, publikavimo datos, katalogas ir kitos verslo sąlygos nekeisti. SenoLTpolicy hash korekcija buvo atskira patvirtinta nativeCAS operacija, ne duomenų atstatymas.

Prieš kitą pirkimo sąlygų ar jų metadata publikavimą ir po jo privaloma vykdyti PUBLIC node scripts/verify-memocasting-checkout-policies.mjs. Skriptas naudoja tikrą bendrą eligible projection, sutikrina source/compiled paketą, aktyvios rinkos hash ir HTTP200sąlygų puslapį. Nerastos/future/unapproved/duplicate sąlygos, metadata-only drift ar0aktyvių rinkų yra klaida; uždaros rinkos neatidaromos. Prireikus naudoti siaurą canonical update-market-policy CLI su tikrais expected-old/next ir konkrečiu patvirtintu DBtarget.

Privatūs įrodymai qa/locker-search-20261026 ignoredkataloge. Tikras savininko atidarytas krepšelis nebuvo perkrautas; tam klientui reikia normalaus refresh, kad gautų naują kontekstą/SDK. Savo testinis krepšelis vėl tuščias, testų langai uždaryti,8817/8827procesai sustabdyti, tik dvi savo previewvars pašalintos, viewport/touch overrides atstatyti. Jokio tikro mokėjimo, siuntos ar naujo kliento laiško nebuvo.
