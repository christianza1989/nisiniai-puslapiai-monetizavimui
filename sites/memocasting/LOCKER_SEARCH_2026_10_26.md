# Paštomatų paieška ir atsiskaitymo sąlygų pataisa

Savininkas paprašė rodyti paštomatų pasiūlymus iškart rašant. Pradinė paieška jau rasdavo „salinink“, tačiau rezultatą paslėpdavo antrame uždarytame select. Papildomai patvirtintas atskiras atsiskaitymo blokavimas: LT market policyVersion 1ac82535 nesutapo su paskelbtu ir patvirtintu 7893ecb3. Sąlygų SEO aprašymo pakeitimas pakeitė reviziją, o prekybos konfigūracija liko sena. Griežtas sutapimo tikrinimas išsaugotas.

- [x] Vienas paieškos laukas, iškart matomi ir paspaudžiami rezultatai, tik patikimi paštomatų ID. Miesto, adreso, kelių žodžių ir lietuviškų raidžių paieška.
- [x] Klaviatūros Arrow/Enter/Escape, matomas pasirinkimas, aiški nerastų rezultatų būsena, iki 12 rezultatų ir patikslinimo tekstas.
- [x] Pakeitus užklausą išvalomas senas ID/adresas ir ankstesnė kainos peržiūra. Kurjerio adreso atkūrimas, kiekio/rinkos apribojimai ir išsaugoto užsakymo blokavimas išlaikyti.
- [x] Patikrintas vienos aktyvios rinkos native D1 konfigūracijos atnaujinimo įrankis: pilnas validateStore prieš/po ir visas ankstesnis JSON CAS. Tik LT policy hash pakeistas; senų užsakymų priėmimas nekeistas.
- [x] Tikra paskelbta LT revizija sutampa su atnaujintu market. Naujame HTTPS krepšelyje sutikimo laukelis įjungtas, nepažymėtas, nuoroda /naudojimo-salygos.
- [x] Jei ateityje sąlygos nesutaptų, rodomas aiškus paaiškinimas; submit taip pat tikrina tikrą galiojančią nuorodą ir disabled būseną. Tikrinimas neapeinamas.
- [x] 261 canonical testas, format, native workerd/D1/R2/restart ir dry-run; papildyti UI ir 5 konfigūracijos CAS testai.
- [ ] Tikslus SDK importas, PUBLIC regresija/surinkimas, compiled desktop/mobile patikra ir diegimas.
- [ ] Hosted naujos paieškos priėmimas ir Git perdavimas.

Pradinė bazė: CORE900ae95f / PUBLICed35c6ad; runtime backend52b3b0a7 / frontend42faf05d. Issue271; root locker-search šakos. Root rašo UI/testus ir diegia; du specialistai atliko atskirą šaltinio peržiūrą ir nustatė sąlygų priežastį, vienas savo šakoje parengė siaurą operatoriaus helperį. Svetimi media, outputs, journal ir skills-lock nekeičiami.

Vietinis vaizdas išlaiko esamą Manrope, paletę ir formos išdėstymą. Viena desktop/320px peržiūra patvirtino matomą rezultatą ir pasirinkimą pelės paspaudimu bei klaviatūra; mobilus CDP touch pateko į input, nors DOM/screenshot koordinatės rodė option, todėl fizinio telefono tap priėmimas nedeklaruojamas. Tai naršyklės valdymo ribojimas, ne įrodytas pasirinkimo kodo gedimas.

Originalios nesėkmės išsaugotos privačiai: policy JSON įrankio išvesties truncation, vietinio fixture trūkstamas country, naujos missing-policy regresijos atskleistas submit guard trūkumas. Produkcijoje bandomas užsakymas, mokėjimas, siunta ar kliento laiškas nekuriami; tikras savininko krepšelis neperspaudžiamas ir jo duomenys neperkraunami.

Kiekvienas būsimas pirkimo sąlygų pakeitimas, įskaitant metadata, turi būti sutikrintas su aktyvios rinkos revizija. Naudoti commerce-core/docs/MARKET_POLICY_UPDATE.md; neperrašyti viso store konfigūracijos ir neatstatyti DB snapshot. Pataisos rollback gali keisti tik pasirinkimo UI, o dabartinis patvirtintas sąlygų hash ir visi užsakymai turi likti.
