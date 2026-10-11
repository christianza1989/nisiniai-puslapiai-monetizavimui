# Aktyvaus klientų ir platformos partnerių pritraukimo core

2026-10-10. Savininko užsakytas architektūros ir įgyvendinimo planas. Pirmas būsimas pilotas — Madbeauty paslaugų teikėjų prisijungimas. Šis planas neįjungia kampanijų, mokamų duomenų užklausų ar išorinio kontaktavimo.

## Dokumentai ir įgyvendinimo būsena

- [Architektūra](ARCHITECTURE.md): paieška, agentai, saugojimas, transportas, atsakymai, kontrolė.
- [Roadmap](ROADMAP.md): darbų seka, priklausomybės ir priėmimo kriterijai.
- [Tikroviško kalibravimo sistema](CALIBRATION.md): uždaras laiškų capture, Codex CLI gavėjai ir 400 scenarijų matrica.
- [Madbeauty pilotas](../../sites/madbeauty/ACQUISITION_PILOT_PLAN.md): teikėjų auditorija, pasiūlymas, eksperimentas ir rezultatai.
- [Madbeauty įrankiai](../../sites/madbeauty/TOOLS.md): integracijos, kaštai ir pasirengimas.
- [Esamas parengimo modulis](../OUTBOUND_ACQUISITION.md): kas jau įgyvendinta ir patikrinta.

Jau turime vietinį research/draft parengimą, dviejų modelio žingsnių peržiūrą, pakartotinio paleidimo apsaugą, privatų žurnalą ir sintetinės kalibracijos įrankį. Naujas savininko pavedimas papildė explicit `provider_signup` rolės sutartį ir uždarą daugelio žingsnių laiškų kalibravimo kelią. Dar neturime veikiančio kasdienio interneto atradimo, produkcinio siuntimo, atsakymų transporto ar Madbeauty registracijų priskyrimo kampanijai. Nauja rolė ir laboratorija nėra šių produkcinių vartų pakaitalas.

Planuojamas rezultatas: vienas bendras vykdiklis, kuris pagal kiekvieno verslo atskirą profilį kasdien suranda tinkamas organizacijas, pagrindžia atranką, parengia pasiūlymą, patikrina leidimą kontaktuoti ir vykdo patvirtintą kampaniją. Tikri atsakymai perduodami esamai pokalbių sistemai; rezultatai grąžinami į kalibravimo ir kampanijos ataskaitas.

Tai programinis workflow su modelio sprendimais ribotose vietose. Cron pažadina koordinatoriaus procesą; jis pats nėra paieškos ar pardavimo agentas. Kasdienis veikimas turi vykti nuolat veikiančiame serveryje, nepriklausomai nuo atidarytos Codex programos.
