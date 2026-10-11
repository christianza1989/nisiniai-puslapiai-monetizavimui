# Vienas salono rezervavimo būdas

2026-10-11 savininko užsakytas inkrementas. Šis dokumentas aprašo būtent rezervavimo pasirinkimą, ne visos platformos ar Facebook patvirtinimo užbaigimą.

- [x] Vienas organizacijos pasirinkimas: `madbeauty` arba `treatwell`; seni salonai lieka Madbeauty.
- [x] Registracija su vieša HTTPS Treatwell Lietuvos salono nuoroda.
- [x] Savininko nustatymai darbo vietoje → Rezervavimas; optimistinis versijos tikrinimas.
- [x] Treatwell režime nauji vietiniai vizitai, laiko laikymai, užklausos, laukiančiųjų įrašai ir grafiko keitimas blokuojami serveryje.
- [x] Viešo profilio, paslaugų ir rezultatų kortelių išorinis rezervavimo mygtukas; išjungto kalendoriaus ekranas.
- [x] Būsimo vizito, aktyvaus laikymo ir laukiančio kliento apsauga keičiant sistemą. Istorija lieka.
- [x] Grįžimo į Madbeauty grafiko patvirtinimas.
- [x] Izoliuotas tikras SQLite/Workers bandymas, perkrovimas ir lygiagretaus perjungimo/laikymo lenktynė.
- [x] Regresijos: backend 88, frontend 28; vietinis tikros naršyklės pasirinkimas, klaidos, perkrovimas, grįžimas, profilis ir 390 px vaizdas.
- [ ] Tiksliai išleidžiamo main artefakto bandymas.
- [ ] Main ir bandymas nuoseklus saugomas išleidimas bei gyvos patikros.
- [ ] Galutinė vizualinė peržiūra, dizaino palyginimas su esama sistema ir išleidimo kvitas.

## Ribos

Treatwell salono nuoroda nėra API integracija. Klientas užbaigia registraciją Treatwell; Madbeauty neperskaito jų laikų, nekuria ten vizito ir nepatvirtina vizito vien už nuorodos paspaudimą. Galutinė kaina ir laikas tikrinami Treatwell. Salonas atsako už tikrą savo nuorodą; serveris tikrina URL formą ir domeną, ne salono nuosavybę ar išorinio puslapio prieinamumą.

Nuoroda taikoma visai salono komandai. Skirtingų komandos narių atskirų kanalų ir procedūros automatinio pasirinkimo išorinėje sistemoje nėra. Savininkas gali keisti pasirinkimą; registratorius ir klientas negali. Salonų automatiškai neperjungiame.

## Grąžinimas

Nauji laukai yra priedas organizacijos JSON, be duomenų ištrynimo. Atsargiai grąžinant programą į versiją iki šio inkremento: sena programa nepaiso išorinio režimo ir galėtų vėl leisti vietinius vizitus. Jei salonai jau pasirinko Treatwell, taikyti pataisą į priekį arba grąžinime išlaikyti serverio `requireNativeCalendar` apsaugą. Nekeičiame salonų pasirinkimo tyliai.

## Įrodymai

`cloudflare/booking-channel-runtime.test.mjs`, `verify-native.mjs`; operaciniai artefaktai ignoruojamame `cloudflare/output/community-20261011/{main,trial}` ir atskiri tikros vietinės naršyklės vaizdai `cloudflare/output/booking-channel-20261011`. Full-page IAB fiksavimas nepalaikomas; peržiūrai naudojami aiškiai pažymėti skirtingų slinkties vietų viewport vaizdai. Vietiniai sintetiniai salonai nėra tikri partneriai ar Treatwell rezervacijos įrodymas.
