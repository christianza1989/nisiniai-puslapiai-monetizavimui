# Madbeauty — patikrintos vietinės kelionės

2026-10-06. V3 privatus loopback8788/SQLite preview. Tos pačios example.com QA paskyros; jokio gyvo laiško ar tikro teikėjo patvirtinimo. Tiksli dabartinė source versija ir išlikę serverio ID: [galutinis kvitas](../../../research/madbeauty-implementation/uiux-functional-final-v3.json).

| Kelionė | Patikrintas rezultatas | Įrodymai |
|---|---|---|
| Paslauga→meistras→laikas→duomenys→hold peržiūra→patvirtinimas | Naujas15min./10EUR vizitas19:00; paslaugos ir meistro pasirinkimas, required patvirtinimas ir klaviatūros fokusas. | V3 browser, staff-keyboard |
| Kliento vizitas→perkėlimas19:30→atšaukimas→reload | booking_f4f62bf9-32ee-4c7f-9db9-3e7920b127af, canceled/version3; tas pats ID ir kaina/trukmė. | V3 durableBrowserJourneys |
| Rankinis vizitas→perkėlimas→atšaukimas | V2 actual browser; booking_f8490c99-2694-4f3b-9060-8a38ae044019 galutinė canceled/version3 patvirtinta V3 saugykloje. | V2/V3 receipts |
| Trijų meistrų kalendorius→diena/savaitė/meistro filtras/mobile agenda | Skaitomi vienalaikiai15min., gretimas15min. ir vėlesnis60min.;320header bei820tablet tikslūs įrodymai. | V2/V3 browser, calendar-layout tests |
| Užklausa/laukimas→meistro būsenos pakeitimas→kliento reload | Inquiry qualified/Aptarta; waitlist offered/Pasiūlyta. Abu rodo faktinę paslaugą, pageidavimą ir kad laikas nepatvirtintas. | V3 browser/durable |
| Blank/whitespace užklausa→tikra network klaida→server restart→retry | Lietuviška lauko klaida, įvestis išliko, vienas naujas inquiry įrašas. | V3 network-error/inquiry-recovered |
| Klientas→pokalbis→meistro atsakymas | Abi rolės turi tos pačios registracijos žinutes; serverio ID ir sender saugomi. | V3 browser/durable |
| Completed vizitas→kliento atsiliepimas→operatoriaus sprendimas | Du past setup vizitai užbaigti tikrame UI; vienas4/5approved, kitas5/5rejected. Pakartotinis atsiliepimas nebesiūlomas; viešame savo QA profilyje tik priimtas tekstas. | V3 journey-fixture/browser/durable |
| Meistro revizija→moderation reason validacija→approval | Abi nuosavos QA darbo vietos patvirtintos actual operator UI; grąžinimas/atmetimas reikalauja netuščios priežasties. | V3 operator-provider-review/durable |
| Provider→operator URL | Tikras serverinis teisių atmetimas ir atkūrimo veiksmas; eilė neatskleista. | V3 permission-provider-denied |
| Dvi tos pačios paslaugos redagavimo formos | Naujesnėversion2išsaugota, senoji gauna409 ir išlaiko įvestį; pradinis pavadinimas atkurtasversion3. | uiux-service-conflict-v3.json |
| Kontakto pranešimas→operatoriaus eilė; report→resolved→reload | Vienas išsaugotas platform report ir vienas resolved QA report; tai saugojimo įrodymas, ne SMTP. | V3 trust-contact/operator-reports/durable |
| Route network klaida→restart→Bandyti dar kartą | Paskyra ir sesija išliko; aiškus klaidos panelis abiem pločiams. | V3 account-home error/recovered |
| Gido turinys→native anchor ir deep-link reload | Fragmentas nerenderina puslapio iš naujo; mobilus/desktop skyrius pasiekiamas, lazy vaizdas įsikrauna. | V3 section-navigation-fixed/anchor-settled |

69nestabdyti normalūs desktop/mobile paviršiai peržiūrėti individualiai. Public-gallery ir demo medijos estetika OWNER_STOPPED. Bendro komponento įrodymai neatstoja konkrečios normalios kompozicijos; matricoje EXACT_BROWSER, SHARED_COMPONENT ir SERVER_CONTRACT skiriami.

Likę UNVERIFIED yra fizinis zoom/OSmotion/production įrenginiai ir papildoma kiekvieno paviršiaus planšetės aprėptis. Planšetės820px kalendoriaus mėginys priimtas; jis nepriskiriamas visiems ekranams. Gyvas paštas, geografinis žemėlapis, production įrišimai ir komercinė paklausa atskiri vartai. [Tikslus sąrašas](REMAINING_GAPS.json).
