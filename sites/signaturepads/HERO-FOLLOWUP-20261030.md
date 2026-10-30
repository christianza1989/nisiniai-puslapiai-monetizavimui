# Hero slinkimas ir fono nuotrauka

Roko pastebėjimas po A01–A07 priėmimo: originalo hero fonas lieka vietoje slenkant; pranešta ir apie dingusią nuotrauką. Ankstesnė statinių vaizdų patikra šio fono elgesio nepagavo. Tai papildomas konkretus radinys, ankstesni įrodymai neperrašomi.

Tiesiogiai 2026-10-30 patikrintas originalas po pelės / slinkimo sąveikos, kad Nitro lazy placeholders nebūtų palaikyti tikrais vaizdais. `banner900000058.jpg` natūralus dydis 1920×837, kairė viršus, no-repeat, background-size:auto. Virš 1024 px attachment:fixed; 1024 ir mažiau scroll. Pats tekstas ir paveikslo kortelė slenka įprastai. Local turėjo cover / center, papildomą gradientą ir visur scroll – nuotraukos kompozicija buvo iškirpta.

PUBLIC `5440e40eccd22891d0ebf4586ff75ccf491ffc88`: vienoje per-site CSS sistemoje atkurta 1920 px fono demonstravimo kompozicija su esama optimizuota 1600 px WebP šeima, left top / no-repeat / fixed ir originalus <=1024 scroll režimas. Papildomas gradientas pašalintas pagal tikrą originalo stilių. Naujos medijos, turinio revizijos ar native paketo nereikia; naudojama ta pati patvirtinta nuotrauka. Pačių tekstų / URL / kainų / galerijų / kontaktų ir shared core kontraktų pakeitimų nėra.

Įrodymai atskirai: `D:/Core/output/signaturepads-migration-20261029/hero-followup-20261030/`.

- `hero-probe.json` ir 12 originalo / ankstesnio Core slinkimo kadrų: 1440 / 390 px, scroll0/400/800.
- `source-interacted.json`: tikras source JPG1920×837 ir Nitro paveikslų atributai po sąveikos.
- `source-photo-and-breakpoints.json`: visos 12 unikalių originalo homepage medijos šeimų yra Core; 13 nuorodų įrašuose kartojasi header/footer logo. Sulyginti tikri source alias → native family ID, ne vien vaizdų skaičius. Darbalaukio / tablet / telefono slinkimo taisyklės patikrintos 1440 / 1025 / 1024 / 768 / 390 px.
- `preflight-verification.json`: esamas Core su nauja source CSS tik išankstinei patikrai, 12 kadrų ties 1440 / 1024 / 390 / 320 px ir scroll0/400/800; pagal originalą fixed/scroll, neprisegtas foreground, nuotrauka kraunama, nėra overflow / broken images, veikia mobilus kontaktų anchor.
- `detector.json`: vienas žinomas Open Sans perspėjimas; originalus šriftas pagal savininko nurodymą išlaikomas. Tai nėra naujas tipografikos pakeitimas.

Galutinis tikro perrinkto Core patvirtinimas PASS: build.log, rsc-check.json (2 manifestai / 0 trūkstamų failų), final-verification.json (12 kadrų, 1440 / 1024 / 390 / 320 px, scroll0/400/800, be CSS injekcijos). Originalus fixed/scroll režimas, 1920 px kompozicija, matoma hero nuotrauka, slenkantis foreground, 0 overflow / broken images ir kontaktų meniu PASS. Pirminis verifier buvo pernelyg griežtas CSS nulių serializacijai (minifier 0px 0px ir source 0% 0% yra ta pati kairė viršus); priimta abiejų nulių semantika, source nekeistas, pirminis rezultatas final-first-position-serialization.json ir final-run.log išsaugotas. Ankstesni 305 Core testai nekartojami dėl vien CSS fono pataisos; šios pataisos priėmimą sudaro actual render / scroll patikra, framework build ir RSC assets.

Prie Roko pranešimo šiame kontekste nėra pasiekiamo nuotraukos priedo; patikrintas ir tikro šio chato paskutinio userMessage turinys, kuriame yra tik text (attachment-check.json). Hero fono iškirpimo problema nustatyta ir pataisyta; jei savininkas turėjo omeny kitą failą, reikia jo nuorodos arba pakartotinio priedo. Visų dabartinio originalo homepage vaizdų šeimų inventorius patikrintas, bet nežinomo priedo tapatybė neišgalvojama.

Gyva svetainė / WordPress / DNS / hostingas ir paštas nekeisti. SMTP/API/voice0; tas pats native paketas SHA256 `38a9024fc02d9f31062e98438214413402d147573822bcd5cbdaa486a4827b81`, tik local-preview/testOnly savo engine. Fizinis telefonas / Safari nepatikrinti.
