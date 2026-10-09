# Aktyvaus klientų ir platformos partnerių pritraukimo core

2026-10-10. Savininko užsakytas architektūros ir įgyvendinimo planas. Pirmas būsimas pilotas — Madbeauty paslaugų teikėjų prisijungimas. Šis planas neįjungia kampanijų, mokamų duomenų užklausų ar išorinio kontaktavimo.

## Dokumentai ir įgyvendinimo būsena

- [Architektūra](ARCHITECTURE.md): paieška, agentai, saugojimas, transportas, atsakymai, kontrolė.
- [Roadmap](ROADMAP.md): darbų seka, priklausomybės ir priėmimo kriterijai.
- [Madbeauty pilotas](../../sites/madbeauty/ACQUISITION_PILOT_PLAN.md): teikėjų auditorija, pasiūlymas, eksperimentas ir rezultatai.
- [Madbeauty įrankiai](../../sites/madbeauty/TOOLS.md): integracijos, kaštai ir pasirengimas.
- [Esamas parengimo modulis](../OUTBOUND_ACQUISITION.md): kas jau įgyvendinta ir patikrinta.

Jau turime vietinį research/draft parengimą, dviejų modelio žingsnių peržiūrą, pakartotinio paleidimo apsaugą, privatų žurnalą ir sintetinės kalibracijos įrankį. Dar neturime veikiančio kasdienio interneto atradimo, produkcinio siuntimo, atsakymų apdorojimo ar Madbeauty registracijų priskyrimo kampanijai. Esamas modulis priima tik `buyer`; jo negalima paskelbti paruoštu teikėjų pritraukimui vien pakeitus instrukciją.

Planuojamas rezultatas: vienas bendras vykdiklis, kuris pagal kiekvieno verslo atskirą profilį kasdien suranda tinkamas organizacijas, pagrindžia atranką, parengia pasiūlymą, patikrina leidimą kontaktuoti ir vykdo patvirtintą kampaniją. Tikri atsakymai perduodami esamai pokalbių sistemai; rezultatai grąžinami į kalibravimo ir kampanijos ataskaitas.

Tai programinis workflow su modelio sprendimais ribotose vietose. Cron pažadina koordinatoriaus procesą; jis pats nėra paieškos ar pardavimo agentas. Kasdienis veikimas turi vykti nuolat veikiančiame serveryje, nepriklausomai nuo atidarytos Codex programos.
