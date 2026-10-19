# Produkcinio siuntimo parengimas · 2026-10-19

Savininko nurodytame pirminiame API susirašinėjime Goda 07:41 pateikė atskirą produkcinį raktą. Jis saugomas tik ignoruojamoje privačioje konfigūracijoje. Tikras `https://api.sendparcel.com` priėmė vieną paslaugų sąrašo ir dvi kainų užklausas su bendru v1 užklausų ribojimu. Sąrašo pirmame puslapyje 10 paslaugų iš 27 puslapių; tai nėra viso sąrašo nuskaitymas. Poros ir šeimos rinkiniams gauta po 15 pasiūlymų pagal patvirtintus 2,2 kg / 20×20×17 cm ir 4,5 kg / 25×25×20 cm duomenis bei įmonės adresus. Tai konkrečios kainų užklausos, ne visos Lietuvos vienodas tarifas. Mokamų siuntų nesukurta; raktas dar neįdiegtas į produkcinį Worker.

## Apmokėjimas ir tiekėjo atsakymas

Savininkas pasirinko iš anksto papildomą piniginę. 08:10 pirminiame susirašinėjime išsiųstas vienas atsakymas: įjungti automatinį API siuntų apmokėjimą tik iš turimo piniginės likučio, be kredito ir automatinio papildymo iš banko ar kortelės. Paprašyta patvirtinti aktyvavimą ir patikslinti nepakankamo likučio API elgesį. Faktinis Gmail pranešimas „Pranešimas išsiųstas“ ir naujas laiškas Godai matyti; privatūs tekstas, vaizdas ir kvitas išsaugoti. Nevadinti šio prašymo jau aktyvuotu apmokėjimu. Pinigų nepridėta, kredito sutartis nepriimta, nauja automatizacija nesukurta.

## Etiketės ir sekimas

Tiekėja patvirtino, kad užsakymo `tracking_number` yra kableliais atskirti numeriai etikečių eilės tvarka. Skirtingi kurjeriai pateikia vieną kelių puslapių `Stickers.pdf` arba kelis tokius failus. Reikia išsaugoti visų dokumentų tvarką, o patvirtintą pakuotės ir etiketės susiejimą pagrįsti pačioje etiketėje atspausdintu numeriu. Failų skaičius nėra puslapių ar pakuočių skaičius. Neįrodytas susiejimas turi likti aiškiai nepatvirtintas.

`/tracks` su vien `from` ir `to` yra teisėta tuščia įvykių istorija; vėliau atsiranda `info` masyvas su naujausiais įvykiais pradžioje. `event` yra kurjerio tekstas, ne universalus būsenos kodas. Šis patvirtinimas sutampa su jau patikrinta siaura no-scan adapterio pataisa. Shopo sesija savo izoliuotoje darbo kopijoje taiso patvarų vėlesnį etikečių surinkimą ir klaidingą failų skaičiaus prilyginimą pakuotėms. Kitas produkcinis leidimas turi įtraukti peržiūrėtas pataisas; čia dar nepareiškiamas jų actual adoption.

## Dokumentų faktai

Savininkas aiškiai patvirtino, kad MB Memocasting nėra PVM mokėtoja ir laisvos serijos `MCWEB` (sąskaitos), `MCWEBK` (kreditinės), `MCWEBP` (pakavimo dokumentai). Verslo parengimo įrankio ankstesnės hardcoded MC/MCK/MCP serijos šio pasirinkimo neišsaugodavo. Scoped upgrade `upgrade-69777aba-b268-4e56-af86-647293be44f9` prideda validuojamą `business.documentSeries`, atmeta pasikartojančias / nepilnas / netaisyklingas serijas ir išsaugo seną elgesį tik kai laukas visai nenurodytas. Patvirtinti faktai neįjungia operacijų ar numerių išdavimo; esama D1 konfigūracija keičiama tik palyginus tikslų ankstesnį įrašą, neliečiant dokumentų ir skaitiklių.

## Kitas priėmimas

Laukti tikro tiekėjo piniginės aktyvavimo patvirtinimo, išsaugoti naujausią aktyvų backend ir jo Access / EU R2 / D1 / Stripe konfigūraciją. Raktas vienas nepatvirtina booking, checkout ar automatikos. Reikia atskirai priimti siuntimo sutartį ir kainų ribas, dokumentų išrašymo / vėlesnių užduočių vykdymą bei tikrą pasirašytą Stripe įvykį. Nenaudoti testinių tarifų, nekurti synthetic LIVE apmokėjimo ar mokamos siuntos vien patikrai. Pašto siuntimo jungtis ir gavimas yra atskiras faktas nuo išsaugoto užsakymo.
