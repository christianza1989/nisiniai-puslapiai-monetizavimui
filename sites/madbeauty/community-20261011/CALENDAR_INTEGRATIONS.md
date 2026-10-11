# Vienas salono kalendorius ir keli klientų pritraukimo kanalai

2026-10-11. Savininko klausimas: kaip salonas, jau vedantis grafiką Treatwell, gali naudoti Madbeauty be antro grafiko. Tai pagrįstas produkto planas, ne jau veikiančios Treatwell integracijos deklaracija.

## Sprendimas

Salonas renkasi vieną autoritetingą rezervacijų sistemą. Madbeauty profilis, galerija, bendruomenė ir paieškos kategorijos gali veikti nepriklausomai nuo kalendoriaus pasirinkimo. Nereikalaujame migruoti arba dubliuoti grafiko.

| Režimas | Kliento kelias | Laisvi laikai Madbeauty | Kur įrašomas vizitas |
| --- | --- | --- | --- |
| Salono rezervavimo nuoroda | Profilis → „Peržiūrėti laikus“ → salonui priklausantis rezervavimo puslapis | Nerodomi kaip patvirtinti | Pasirinktoje išorinėje sistemoje, klientui ten užbaigus rezervaciją |
| Madbeauty kalendorius | Paslauga → laikas → patvirtinimas | Pagal Madbeauty grafiką ir užimtumą | Madbeauty |
| Leidžiama tiekėjo API | Paslauga → laikas → tiekėjo patvirtinta rezervacija | Tik gavus aktualų atsakymą iš tiekėjo | Autoritetingoje tiekėjo sistemoje; Madbeauty saugo jos ID ir būseną |

Pirmas režimas yra siūlomas mažos trinties įėjimas esamiems salonams. Šiame darbe jo runtime dar neįgyvendintas. Išorinio tiekėjo API režimas neprijungtas: nėra suteiktos Treatwell API prieigos ar patvirtintos Lietuvos Connect integracijos.

## Paslaugų ir darbuotojų susiejimas

Madbeauty taksonomija lieka mūsų: kategorija → subkategorija → procedūra. Ji neturi kopijuoti Treatwell taksonomijos. Konkreti salono paslauga turi savo pavadinimą, kainą, trukmę, priedus ir vietą; tik autoritetinga rezervavimo sistema patvirtina jos laiką.

- Nuorodos režime pakanka salono pateiktos profilio arba konkrečios paslaugos rezervavimo nuorodos. Jei konkretus paslaugos pasirinkimas nuoroda nepalaikomas, aiškiai nukreipiama į visą salono meniu, nežadant iš anksto parinktos procedūros.
- API režime būtinas salonui priklausantis `externalServiceId`, `externalStaffId`, `externalLocationId`, trukmės, kainos ir priedų atitikimas. Etiketės nėra identifikatoriai; vienodai pavadintos paslaugos gali skirtis.
- Nepatvirtintas susiejimas, pašalinta paslauga, pasenusi kaina ar nepasiekiamas tiekėjas išjungia momentinį rezervavimą tai paslaugai, o ne užpildo laikus išgalvotu fallback.

## Ką patvirtino tyrimas

- [Treatwell Expert: Google Calendar](https://support-expert.treatwell.com/en/articles/2929523-how-do-i-sync-my-appointments-with-google-calendar): rezervacijų eksportas visam salonui arba darbuotojams; Google įvykių importas kaip užimtumas galimas tik daliai paskyrų. Tai Expert dokumentacija, ne visų Lietuvos Connect paskyrų dvipusės prieigos įrodymas. Eksportuotuose įvykiuose gali būti klientų vardų ir pastabų; užimtumo adapteriui reikia tik laiko intervalų, o ne šių duomenų.
- [Treatwell ir Salonized integracija](https://support-expert.treatwell.com/en/articles/6287754-what-is-the-treatwell-integration): dokumentuotas vienos centrinės sistemos modelis, tačiau jis skirtas Salonized ir savaime nesuteikia Madbeauty prieigos.
- [Lietuvos partnerių sąlygos, atnaujintos 2026-09](https://www.treatwell.lt/info/partneriu-nuotatos-ir-salygos/): 7.1.7–7.1.8 aptaria visų užsakymų įtraukimą į Treatwell kalendorių ir kitos trečiosios šalies rezervavimo programinės įrangos naudojimo apribojimą; 7.1.11.1 ir 7.1.11.6 aptaria API sublicencijavimą ir atgalinę inžineriją. Konkretaus salono Speciali sutartis ir tiekėjo leidimas turi būti patikrinti prieš API rezervavimo režimą. Vieša bendro pobūdžio API prieiga Madbeauty nepatvirtinta.
- [Connect kalendorių pagalbos puslapis](https://partnercare.treatwell.com/s/article/How-to-sync-Connect-with-other-calendar-softwares?language=en_GB) šiuo tyrimu grąžino dinaminio puslapio klaidą. Jo dabartiniai nustatymai Lietuvos paskyroje nepatikrinti; seno straipsnio nelaikome aktualios funkcijos priėmimu.

## Įgyvendinimo seka ir priėmimas

- [x] Dokumentuoti vieno kalendoriaus principą, tris režimus ir faktines prieigos ribas.
- [ ] Nuorodos režimas: savininko nustatymas, tik HTTPS nuoroda, saugus URL be prisijungimo žetonų, aiškiai įvardytas išorinis rezervavimas, įprasta prieinama nuoroda.
- [ ] Paslaugų ir profilio paieška: išorinio režimo teikėjui nerodyti tariamų Madbeauty laisvų laikų, nemaišyti su vietinės rezervacijos patvirtinimu ir priminimais.
- [ ] Konversijos: matuoti rezervavimo nuorodos paspaudimą atskirai nuo užbaigtos rezervacijos. Be tiekėjo patvirtinimo nėra mūsų patvirtinto vizito, pajamų/komisinio ar patvirtinto atsiliepimo po vizito.
- [ ] Vieno tikro salono pilotas: gauti jo pateiktą nuorodą ir patikrinti kliento kelią telefone; nekopijuoti svetimų salonų paskyrų, klientų, nuotraukų ar atsiliepimų.
- [ ] Tiekėjo integracija: patvirtinti prieigą, Lietuvai taikomą produktą ir sutartį, skaitymo/rašymo operacijas, bandymo aplinką, atšaukimus ir pakeitimus. Jokio neautorizuoto Connect puslapių nuskaitymo.
- [ ] Užimtumo importas kaip atskiras ribotas režimas: darbuotojų ir laiko juostų susiejimas, paskutinio sėkmingo atnaujinimo laikas, pasenusio šaltinio atmetimas, nutraukimo/atšaukimo patikros. Google/iCal užimtumas pats savaime nesuteikia Treatwell rezervacijos įrašymo ar momentinės dvigubo užsakymo apsaugos.
- [ ] API rezervavimas: idempotency, autoritetingas tiekėjo patvirtinimas prieš success, pakartotinis tikrinimas ir nežinomo rezultato atkūrimas, konkurenciniai užsakymai iš abiejų kanalų, viso intervalo/buferių/priedų bei resursų tikrinimas, cancel/reschedule ir webhook deduplikacija.

## Pasiūlymas salonams

„Pristatyk savo darbus ir leisk klientams tave atrasti Madbeauty. Rezervacijas priimk jau naudojamoje sistemoje.“ Tai siūloma pozicionavimo kryptis po nuorodos režimo įgyvendinimo, ne šiandien publikuojamas funkcijos pažadas. Srauto ar rezervacijų augimo negarantuojame; pirmam pilotui atskirai matuojame profilio peržiūras, nuorodos paspaudimus ir salono patvirtintus užbaigtus vizitus.
