# BDEV-0003-P2 · vienos nišos duomenų iškėlimo bandymas

Statusas **proposed**; owner approval nėra. Tai [BDEV-0003](../../ideas/BDEV-0003.md) / esamo M9 perdavimo hipotezės konkretinimas, nepriklausomas nuo P1 mokamo proceso plano bandymo.

Siūloma apimtis: iki 4 agento darbo valandų privatus vietinis bandymas, be naujų prenumeratų, tikrų klientų, production DB, paskyrų, DNS ar siuntimo. Failų ribos po patvirtinimo – atskiras `business-development/experiments/BDEV-0003-P2/`; bendri repo / kitų sesijų failai nekeičiami. Python stdlib SQLite arba jau turimi vietiniai įrankiai; naujos mokamos API nereikia.

1. Iš esamų dviejų SQL lentelių schemų parengti atskirą vietinę fixture su pasirinkta `miniekskavatoriai` ir kontrolės niša. Naudoti aiškiai sintetinius `.invalid` kontaktus ir canary tekstus; tikrų DB neskaityti.
2. Esamų įrankių inventoriuje pirmiausia patikrinti, ar tikslinę atranką jau galima patikimai atlikti. Eksporto/importo bandymą įgyvendinti tik vietinės laboratorijos apimtyje, nenaudoti whole-table dump kaip tenant filtro.
3. Eksportuoti pasirinktos nišos įrašus su manifestu: schema, siteId, eilučių skaičiai ir failų hash. Atkurti į tuščią izoliuotą DB ir patikrinti turinį bei kontrolės duomenų nebuvimą.
4. Patikrinti unknown/empty siteId atmetimą, pakartotinio importo apibrėžtą elgesį ir pažeisto failo atmetimą prieš dalinį atkūrimą. Rezultatus saugoti atskirai, originalaus FAIL neperrašyti.
5. Pridėti vienos nišos perdavimo ribų lapą: turinio paketas / rendererio priklausomybės / duomenys / neprijungtos integracijos / dar nematuotos eksploatavimo sąnaudos. Tai ne visas parduodamas verslas ir ne nauja komercinė sutartis.

Priėmimas: tikslinių duomenų atitikimas, nulis kitos nišos canary įrašų eksportuotame ir atkurtame rezultate, aiškūs keturi scenarijų rezultatai (normalus, netinkamas siteId, pakartotinis importas, pažeistas failas), tikras vykdymo kvitas ir faktinis darbo/AI kaštų žurnalas. Papildomai aiškiai pažymėti, kad SQLite laboratorija dar nėra Wrangler/D1 arba gyvos migracijos PASS.

Stabdyti pasiekus 4 valandų ribą arba jei užduotis reikalautų gyvų duomenų, išorinių teisių, DNS ar bendro core pakeitimo; išsaugoti tikrą būseną. Jei randamas jau veikiančio įrankio pilnas atitikimas, tikrinti jį, ne dubliuoti. Vėlesnis savarankiškos svetainės iškėlimas ir pirkėjo testas turi atskirą apimtį bei tikrus ekonomikos / teisių įrodymus. Šiuo pasiūlymu nei pardavimo kaina, nei noras pirkti, nei 50 verslų autonomija nepatvirtinti.
