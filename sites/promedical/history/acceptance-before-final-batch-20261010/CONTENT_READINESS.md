# Turinys ir paskelbimo ribos

2026-10-09. Savininko užsakytas Klaro katalogas: 1 408 produktai, 437 kategorijos, pradžia, katalogas, gidų hub, trys originalūs gidai ir penki kontaktų / redakcijos / naudojimo puslapiai. Iš viso 1 856 kanoniškai peržiūrėti ir patvirtinti puslapiai, 3 598 responsive WebP failai iš 1 180 tikrų nuotraukų šeimų. Visi tiesioginiai kategorijų ryšiai, modelių kodai, techninės eilutės ir variantai patikrinti pagal vieną nekintamą šaltinio versiją.

Release `5246119e-10eb-4fde-8e09-492b28ad07dc`, package SHA-256 `32f955d9c35b7590027069ff3a8a43eca6bc8afc35ba83a6d5f4021ecb5c65e6`, 9 809 707 baitai. Kanoninė Studio saugykla yra private `content-studio/data`; eksportas private `content-studio/output/releases/promedical`. Viešai saugomas tik patvirtintas paketas ir patikrinta responsive medija. Šaltinio raw archyvas ir klientų/testų DB nepatenka į Git.

Kiekvienam puslapiui atliktas tikras private Studio HTTP preview, faktinė turinio peržiūra ir `recordEditorialReview` pagal aktualų revision hash. Approval atliktas `approveReviewedBatch`, daugiausia po 200, ne rankomis pakeitus statusą. Penki susijusių/pakeistų modelių ryšiai įtraukti tik po jų tikslų patvirtinimo ir pakartotinės aktualios peržiūros. Išleidimas ir public import/compile taiko bendrus validator/hash/eligibility vartus. Kitų devynių paketų JSON struktūra liko lygi `origin/main`.

Šioje versijoje visi 1 856 puslapiai turi dabartinę, jau atėjusią publikavimo datą. Tai planinės/local versijos datos, ne įrodymas, kad Klaro svetainė jau veikė produkciniame domene. Bendri core testai tikrina future/hash/revocation/cross-host neigiamus atvejus. Specialaus ateities puslapio į šį tikrą katalogą nekuriame, todėl nepretenduojame į papildomą controlled-clock šio paketo HTTP įrodymą.

Tekstas originalus lietuviškas, techniniai faktai siejami su Klaro. Tiekėjo momentinė kaina, likutis ar akcija nelaikoma Promedical pasiūlymu. Nuotraukos gali rodyti pasirenkamus priedus; konkrečią komplektaciją reikia suderinti. Kainų, klinikinio tinkamumo, garantijos ar pristatymo terminų neišgalvojame. Gidų autorystė – Promedical organizacija; redakcija aiškiai nurodo AI vaidmenį ir korekcijų kontaktą, neteigia gydytojo ar žmogaus peržiūros.

Vieši kontaktai: `sales@promedical.lt`, `+370 686 88369`, organizacijos vardas „Promedical“. Savininkas nurodė juridinio pavadinimo viešai nerodyti. Tai nepakeičia privataus production duomenų valdytojo nustatymo ir kitų [PRIVACY-LAUNCH-GAPS.md](PRIVACY-LAUNCH-GAPS.md) klausimų.

Turinio patvirtinimas, local HTML ir Lighthouse nėra production paleidimas, laiško gavimo ar paklausos įrodymas. [SITE_COMPLETION.json](SITE_COMPLETION.json) ir [PHASE-1-AUDIT.json](PHASE-1-AUDIT.json) išlaiko nepatvirtintus vartus. Dabartinis live `promedical.lt` nepakeistas.
