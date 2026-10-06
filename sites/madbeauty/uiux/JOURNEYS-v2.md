# Madbeauty — patikrintos kelionės ir likusios spragos

2026-10-06. Vietinis priėmimas, tas pats įgyvendinantis agentas. Vienos normalios kelionės PASS nereiškia visų jos klaidų ar įrenginių priėmimo.

| Kelionė | Rezultatas ir riba | Įrodymas |
|---|---|---|
| Komandos kalendorius → savaitė/diena → meistro filtras → klaviatūros slinkimas | PASS vietiniam trijų meistrų scenarijui: vienalaikiai15min. vizitai, gretimas15min. ir vėlesnis60min. Laikai nenukerpami; vėlesnis vizitas gauna visą plotį. | uiux-browser-v2.json, calendar-layout tests |
| Rankinis vizitas → pakeista paslauga → kaina/trukmė → pasirinktas14:00 → vizito detalės | PASS:15min./10EUR, meistrė B, pasirinktas klientas. Desktop/mobile santrauka ir panelė. | uiux-browser-v2.json |
| Vizito perkėlimas14:00→14:30 → atšaukimo validacija → atšaukimas → reload | PASS: tas pats ID, išlikusi kaina/trukmė, galutinė canceled/version3 būsena. Niekam nesiųstas gyvas laiškas. | uiux-functional-final-v2.json |
| Kliento kortelė → vizitų istorija → atšauktas vizitas | PASS desktop/mobile; naujas lokalus kliento įrašas, ne tikras pirkėjas. | uiux-browser-v2.json |
| Tušti išsaugoti profiliai; tuščia kalendoriaus diena;404 | PASS konkrečioms užfiksuotoms būsenoms. | uiux-browser-v2.json |
| Prisijungimo atkūrimas, formų juodraščiai, pasibaigęs hold | Ankstesni konkretūs V1 įrodymai pritaikyti tik atitinkamoms eilutėms ir būsenoms; naujas pilnas pakartojimas neatliktas. | uiux-browser-v1.json |

Likę paviršiai be patvirtintos normalios būsenos: `public-home`, `public-catalog`, `booking-staff-step`, `booking-inquiry`, `booking-waitlist`, `customer-review`, `operator-provider-review`. Demo profilių/galerijų išimtys nepanaikintos.

Dar nepriimtas naujas pilnas inquiry/waitlist pateikimo, kliento atsiliepimo ir operatoriaus profilio peržiūros browser kelias; pilnas kelių meistrų booking-staff pasirinkimas bei visų veiksmų stale/network/permission šakos. Ne kiekvienas iš 70 ekranų turi realiai peržiūrėtą desktop ir mobile kadrą; ankstesni DOM pločių PASS nėra tokių kadrų pakaitalas. Tikslios eilutės ir likusios būsenos: SCREEN_STATE_MATRIX.json / REMAINING_GAPS.json.

Fizinis200%zoom, OS sumažinto judesio nustatymas ir production naršyklės/įrenginiai lieka UNVERIFIED. Trijų meistrų pavyzdys neįrodo32meistrų apkrovos, visų persidengimų ar DST intervalų. SMTP/INBOX, DNS/TLS/deploy, visas viešo katalogo SSR/SEO, tikri teikėjai ir paklausa tebėra atskiri nepriimti vartai.

Intervencijos: pirmas kalendoriaus helper integravimas turėjo sintaksės klaidą; perrašyta ir node --check bei actual reload PASS. Išlikęs320px vieno pikselio header persiliejimas patvirtintas lyginant scrollWidth su clientWidth, pataisytas ir0px retestas. Pirmas V10 testų paleidimas apėmė29testus, trūkstami9foundation testai paleisti atskirai; bendras rezultatas35+29+9=73PASS. Originalūs kvitai ir nesėkmės išlaikyti.
