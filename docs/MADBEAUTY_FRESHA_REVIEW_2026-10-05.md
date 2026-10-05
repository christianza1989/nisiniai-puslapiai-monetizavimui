# Madbeauty: papildoma Fresha kliento UX peržiūra

2026-10-05 · root sequential review; nėra nepriklausomas dizaino auditas ar visos Fresha sistemos patikra. Savininkas autorizavo prisijungusių kliento/verslo ekranų tyrimą ir koordinavimą su įgyvendinimo sesija 01a10c23-938f-7e62-9674-4b3bfef2dc29. Šis dokumentas papildo ankstesnį sites/madbeauty/ tyrimą, jo istorinių įrodymų nekeičia.

CUA Chrome UI stebėjimas: kliento paskyra pasiekiama, tačiau verslo dashboard po vieno tiesioginio bandymo nukreipia į login. **Šio rato verslo vidus UNVERIFIED.** Ankstesni partner tyrimai ir savininko screenshot yra atskiri šaltiniai, ne dabartinės sesijos prieigos įrodymas. Jokio account eksportavimo, klientų žinučių, nustatymų išsaugojimo ar vizito patvirtinimo.

## Actual ekranai ir sprendimai

| Šaltinis / stebėjimas | Madbeauty sprendimas | Kaip patikrinsime |
|---|---|---|
| [Kliento veikla](https://www.fresha.com/activity): vizitai atskiroje tab srityje; tuščia būsena grąžina į paiešką | Įgyvendinti Būsimi / Ankstesni / Atšaukti su normaliais statusais; po pirmo vizito empty keičiasi tikru įrašu | Nauja paskyra → rezervacija → cancel; actual ID abiejose rolėse |
| Kliento meniu: profilis, veikla, žinutės, favorites, forms, settings | Vieninga paskyros navigacija; klientui ir meistrui aiškus vaidmens / darbo vietos perjungimas su serverine naryste | Dviejų rolių paskyra ir svetimos organizacijos deny |
| Žinutės: pokalbių sąrašas kairėje, turinys dešinėje; empty CTA į vizitus | Desktop dvi sritys, mobile sąrašas→pokalbis→atgal; pokalbis susietas su vizitu, jei ši funkcija įgyvendinta | Actual pokalbio teisės, tekstai nepristato neveikiančio channel kaip veikiančio |
| Favorites tuščias ekranas su grįžimu į paiešką | Individualūs išsaugoti meistrai, normalus empty; vienas pagrįstas CTA | Login, save, reload, unsave, kita paskyra neperima |
| [Nustatymai](https://www.fresha.com/settings): saugumas ir pranešimai atskirai; pranešimai gali būti grupuojami pagal saloną | Atskirti būtinas vizitų žinutes nuo pasirenkamos rinkodaros; onboarding nereikalauja marketing pasirinkimo | UI ir serverio persisted pasirinkimas; lokalus capture atskirai nuo tikro pristatymo |
| Homepage dropdown: paslaugos / salonai / specialistai, paieška ir recent | Palaikyti aiškias entity rūšis ir konkrečias paslaugas; ne painioti saloną su jo darbuotoju | Keyboard, Escape, focus, pasirinktas ID atitinka paiešką |
| Datos dropdown: šiandien/rytoj, mėnesio kalendorius, intervalai ir Custom | LT 24h formatas, aiški pilna data, custom nuo–iki; visa procedūra telpa intervale | 60min paslauga 19:30–20:00 netinka; data iš serverio clock |
| Šiame mažo aukščio lange datos panelis siekė apatinį kraštą / buvo scroll | Bounded popover; mobile sheet, scroll turinys, pasiekiami valdikliai, jokio dokumento horizontalaus overflow | 320/390 ir trumpas desktop viewport, keyboard / 200% reflow |
| Nails + Vilnius + rytoj rezultatuose: salonai / specialistai, datos juosta, 2 kortelių stulpeliai + žemėlapis; paslaugos kaina/trukmė/laikai kortelėje | Perimti kompozicijos logiką, map pasirenkamas ir tik pagal turimus tikrus geo; konkreti paslauga ir artimiausi laikai matomi be privalomo profilio atidarymo | Filter→profile→booking išlaiko service/date/window; nereikalingas kalendorius neprijungtas nėra viso homepage pradžia |
| Plati Nails kategorija grąžina ir 10min dizaino priedą | Mūsų pasiūlymas: pagrindinė paslauga atskirai nuo add-on, ryšys ir būtinos sąlygos matomi | Priedas nepristato pilno manikiūro, duration/price sum teisinga |
| Filters modal: sort, max price, service type, amenities, options; Clear/Apply | Tik mūsų katalogui prasmingi filtrai; aktyvių filtrų chips, aiškus reset ir rezultatų skaičius | Nuliniai rezultatai duoda sąžiningą alternatyvą, nekeičia pasirinktos datos tyliai |
| [Zėbda rezervavimo pradžia](https://www.fresha.com/a/zebda-manikiuro-studija-vilnius-eitminu-gatve-ipdodm9i/booking): Services→Professional→Time→Confirm, variantų/papildymo panelis, santrauka | Sąlygos, kaina, visa trukmė ir pasirinkti priedai nuolat aiškūs; serverio authoritative quote patvirtinime | Konfliktas / pakeista kaina atnaujina santrauką, nėra netikėto silent pasirinkimo |
| [Zėbda viešas profilis](https://www.fresha.com/a/zebda-manikiuro-studija-vilnius-eitminu-gatve-ipdodm9i): galerija, Services/Team/Portfolio/About skirtukai, darbuotojų portretai, darbo valandos, atskira booking santrauka; „No reviews yet“ vietoje išgalvoto balo | Individuali galerija ir tikri susiję meistrai/paslaugos; sąžiningas reviews empty, city/service breadcrumbs, sticky santrauka desktop ir kompaktiškas mobile CTA | Profilis, solo ir salonas, review-empty/with-data; turinio ir avatarų tikrumas, routing |

Rezultatų skaičius ir laisvi laikai yra laikinas UI stebėjimas, ne rinkos paklausos duomenys. Query/cart/availability click ID, privataus email ir paskyros duomenys į šį registrą nekopijuojami. Pixel vaizdai peržiūrėti CUA įrankyje; šiame dokumente nėra naujų išsaugotų screenshot failų ar jų SHA deklaracijos.

## Savos dizaino sistemos taikymas

Savininko pasirinkta juoda/balta/violetinė ir homepage-modern-v2 išlieka. Public header transparent/blur/autohide; darbo kalendorius ir jo navigacija stabilūs. Tamsus workspace shell, šviesus tankių formų/kalendoriaus turinys, violetinė pagrindiniams veiksmams. Kiekvienas role/screen naudoja tuos pačius token, tipografiją, valdiklius ir state taisykles, tačiau skirtas konkrečiam darbui, ne bendras panelis su pakeistu title.

„Geriau už Fresha“ yra siekis, dar ne įrodytas faktas. Prioritetai: lietuviška aiški terminija/24h, siaura tiksliai sutampanti paslauga, telpantis dialogas, išlaikyti filtrai, vieninga pilna santrauka, realus email-only auth ir atominė rezervacija. Vėlesnių modulinių funkcijų nevaizduoti veikiančiomis vien todėl, kad konkurentas jas turi.

Root rasti dabartinio Madbeauty homepage trūkumai: permanent demo copy; 3 rekomendacijų kortelės ta pati manikiūro nuotrauka; visi trys „Kalendorius neprijungtas“. Perduota vykdytojui prieš šio dokumento užbaigimą. Tai ankstesnės UI būklės radiniai; backend ir vaizdų pataisų priėmimas vis dar PENDING.

Sutartys: [testiniai duomenys](../DEMO_DATA_POLICY.md), [backend priėmimas](MADBEAUTY_BACKEND_ACCEPTANCE.md), [shared integration](INTEGRATING_A_PROJECT.md). Įgyvendinimo agentas valdo savo DESIGN/ROADMAP/SCREEN_STATUS ir code; root valdo šį review bei bendras instrukcijų nuorodas.

Instrukcijų patikra: builder ir impeccable quick_validate PASS; 54 egzistuojančios vietinės nuorodos aktualiuose aštuoniuose root failuose, 0 broken; atnaujinto builder catalog entry SHA sutampa su LF source; own git diff --check PASS. Tai instrukcijų struktūros patikra, ne platformos, modelio elgesio ar backend testų PASS. Ankstesni SOURCE archyvai/job fingerprint/auditai neperrašyti.
