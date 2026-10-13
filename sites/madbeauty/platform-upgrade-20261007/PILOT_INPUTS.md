# Tikro salono bandymo duomenys ir eiga

Privatus synthetic hosted bandymas priimtas [HOSTED_UI_ACCEPTANCE.md](HOSTED_UI_ACCEPTANCE.md) apimtyje. Tikro teikėjo pilotas nepradėtas, nes konkretus teikėjas ir jo duomenys dar nepateikti. Šis dokumentas parengia kitą darbą; jis nesukuria realaus salono, teisių, laiško gavimo ar galutinio paleidimo įrodymo.

## Reikalingi faktai

| Duomenys | Kam naudojami |
| --- | --- |
| Vienas dalyvauti sutinkantis meistras ar salonas, veiklos pavadinimas ir savininko prisijungimo el. paštas | Įprasta paskyra ir faktinis onboarding. Prisijungimo kodą įveda teisėtas paskyros savininkas; jo nekeliame į Git ar viešą evidence. |
| Miestas, veiklos vieta / viešas adresas, meistrai ir darbo grafikas su pertraukomis | Paieška, kalendorius ir visas realiai galimas vizito intervalas. |
| Bent dvi tikros paslaugos: katalogo procedūra, variantas, kaina, trukmė, meistras, resursas ir, jei yra, priedai / fazės | Du pasiūlymai ir vienas bendras kelių procedūrų vizitas. Faktų negalima pakeisti synthetic kainomis ar grafikais. |
| Autorizuotas rezervacijos ir priminimo testinis gavėjas / sutartas bandymo laikas | Atskiras provider acceptance ir faktinio patvirtinimo bei priminimo inbox receipt. Esamas OTP ir SQL capture receipt tam netinka. |
| Teikėjo leidžiami viešinti darbų vaizdai, jų teisės / aprašai | Galerija ir operatoriaus peržiūra. Testinis violetinis vaizdas nėra realaus teikėjo darbas. |
| Taikomi kvalifikacijos įrodymai, jei pasirinktai procedūrai yra review gate | Operatorius tikrina faktinį dokumentą; katalogo procedūros buvimas savaime nesuteikia teisės ją teikti. |
| Esama retention / trynimo / backup tvarka | Konkretūs booking, klientų kortelių, audit, mail, medijos ir checkpoint terminai / išimtys / kopijų galiojimas. Periodų nepriskiriame pagal spėjimą. |

## Bandymo eiga

1. Užfiksuoti tikrą teikėją ir faktines paslaugas privačiame reviewable bandymo įraše. Susitarti, kokia rezervacija yra bandymas, ir kas ją stebės.
2. Savininkui įprastai prisijungti, pasirinkti procedūras, suvesti variantus / kainą / trukmę / meistrus / grafiką ir pateikti pasiūlymus peržiūrai. Operatorius priima arba grąžina tikrą pasiūlymą; po tinkamo varianto priėmimo pateikiamas profilis.
3. Klientui surasti tas paslaugas pagal miestą / datą, palyginti dabartinę kainą ir pasirinkti visą kelių procedūrų intervalą. Patvirtinti vieną sutartą bandomąjį vizitą.
4. Patikrinti tą patį vizito ID, sumą, procedūrų seką, vietą ir laiką kliento paskyroje bei meistro kalendoriuje. Sutartu keliu pakeisti laiką / atšaukti bandymą ir patikrinti abi paskyras.
5. Atskirai užfiksuoti booking ir reminder pristatymą: provider response ir autorizuoto gavėjo realiai gautą laišką. Vien outbox „sent“, SMTP autentifikacija ar synthetic capture nepakanka. Receipt saugomas privačiai, be prisijungimų ir nereikalingų asmens duomenų.
6. Pagal faktinę retention tvarką užbaigti reikiamą isolated vykdymo patikrą. Negrįžtamo realių duomenų trynimo neaktyvinti vien todėl, kad UI prašymas veikia.
7. Kai viso sutarto leidimo completion prerequisite įvykdyta, naudoti jau duotą savininko conditional deployment autorizaciją. Išlaikyti originalų production source namespace / mail / DNS, tada patikrinti canonical UI, mediją, roles ir aktualius išsaugotus duomenis. QA namespace ar senas checkpoint nėra production duomenų pakaitalas.

Tikro piloto, laiško gavimo, canonical paleidimo ir komercinės paklausos rezultatai fiksuojami atskirai. Ši instrukcija jų automatiškai nepriima.
