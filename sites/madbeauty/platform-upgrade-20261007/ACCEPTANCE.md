# Pirmas uždaras upgrade kelias — dalinis priėmimas

2026-10-07, šaka `ai/madbeauty-platform-upgrade-20261007`, PR26. Visas upgrade tebėra aktyvus; tai pirmo serverinio kelio įrodymas, ne visų plano modulių užbaigimas.

Įgyvendinta: kanoninių procedūrų kelių pasirinkimų partijos, privatūs pasiūlymų juodraščiai be numatytos kainos ar trukmės, peržiūrimos pasiūlymo versijos, variantai su kelių darbuotojų kainomis/grafikais, atgal suderinama migracija, archyvavimas, sinonimų versijos ir procedūrų prašymų susiejimas. Paieška naudoja aktyvų katalogą, 103 miestus, diakritikos nejautrų tekstą ir klaviatūros pasirinkimą; tikrina visą vizito intervalą. Salono meniu grupių, priedų grupių, varianto požymių, prieinamumo taisyklių ir atominio CSV kainų keitimo pagrindas įgyvendintas; jų išsamus UI priėmimas dar vykdomas.

Serverio įrodymai: `evidence/backend-first.log` 38/38; po sąsajų sujungimo `regression-1.log` 96/96; po priedų/tvarkymo/CSV `regression-2.log` 100/100. Vėliau rastam browser variant/staff lauko neatitikimui skirtas regresijos testas `prototype/booking-roster.test.mjs` PASS. Importuotų paskyrų client projekcijos atkūrimas pridėtas prie auth; `evidence/regression-3.log` patvirtino visą manifestą 102/102 po abiejų pataisymų.

Actual Workers: `evidence/workers-first.log` 8/8, įskaitant naują pilną kelią: privataus multi-select idempotency, du darbuotojai vienam variantui, skirtingi 25/35 EUR ir 60/90 min., approved pasiūlymas/profilis, actual intervalas, du concurrent hold (200/409), patvirtinimas, customer/provider tas pats ID po Miniflare SQL restart, archyvavimas nepakeičia užfiksuoto vizito. Production namespace ir duomenys nepanaudoti.

Actual browser: own `http://127.0.0.1:8841`, `evidence/platform-preview.sqlite` su reserved example.com fixture ir captured mail, jokio išsiuntimo. Meistras per normalų email/OTP prisijungimą pasirinko Vyrų kirpimą ir Gelinį lakavimą, abu serverio juodraščiai išliko po reload; įrašė variantą 25 EUR/60 min. ir tinkamą darbuotoją/resursą; pateikė peržiūrai. Operatorius per normalų prisijungimą patvirtino konkrečią versiją. Paieška surado tik naują variantą. Klientas peržiūrėjo visą vizitą ir patvirtino serverio rezervaciją; santrauka išlaikė kainą/trukmę. `booking-confirmed.png` ir operatoriaus/procedūrų DOM stebėjimai; receipt dar neapima kliento ir meistro browser ID patikros po restart.

Actual pasiūlymų sąsaja: 320/390/820/1440 px viewport, dokumento plotis neviršijo viewport (vertikalaus scrollbar plotis užfiksuotas); `offers-widths.json` ir keturios `offers-<width>.png` peržiūrėtos. Sidebar mobilių tabų vidinis slinkimas nėra horizontalus document overflow. Tai tik pasiūlymų sąsajos plotis; kiti paviršiai ir būsenų matrica dar nėra viso produkto PASS.

Rastos ir pataisytos: paslaugos varianto radio buvo sutapatintas su darbuotojo radio, todėl `serviceId` buvo tuščias; dabar variantas ir darbuotojas turi atskirus laukus, tested. Testo administratoriaus iš anksto įrašyta account eilutė neturėjo client projekcijos; verified sign-in dabar nuosekliai ją atkuria tuo pačiu ID ir neprideda rolių. Pataisymų turinio/DB versijos nėra automatiškai perrašomos į production.

Preview naudoja exact reviewed V2 paketą `b208596faea613be548c15423ec691c3d1cc01b2f0b1dcdcfb80f7411ea8fdd5`; paleidimas reikalauja path ir SHA. Abiejų būsimų straipsnių `publishAt=2026-10-13T07:00:00Z`, media ir discovery vartai išlieka. Nė vienas fixture profilis ar jo local target nėra realios pasiūlos / indexEligible įrodymas. Istoriniai receipts nepakeisti.

Toliau: užbaigti katalogo administravimą ir visų naujų formų UI/stale/empty/conflict priėmimą; įgyvendinti likusius plano 0–3 modulius, saugojimo modelį ir gates. Išorinių pilotų, mokėjimų, kalendorių prieigų bei jautrių anketų faktai neįrašomi kaip turimi.
