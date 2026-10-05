# Traktorių padangų pristatymo priklausomybės patikra

2026-10-02, 09:00 Europe/Vilnius heartbeat. Klausimas: kokį realų pristatymo faktą agentas dar turi patikrinti prieš palygindamas žinomos padangų nišos tiekėjus? Rezultatas — esamo tiekėjų proceso įrodymų papildymas; **naujos BDEV idėjos nėra**. Įgyvendinimas / tiekėjų kontaktavimas nepradėti.

## Esamas reikalavimas ir naujas įrodymas

[Nišos briefas](../../../sites/traktoriupadangos.md) aprašo vietinę pirmą fazę. [Komercinis planas](../../../voice-agent-plan/PROCUREMENT_AND_INVOICING.md) jau reikalauja tikros transporto kainos ir anksčiau fiksavo nepatvirtintą BayWa pristatymą į Lietuvą. Perskaitytos faktinės core `instructions/core/supplier.md` ir `instructions/niches/traktoriupadangos/supplier.md`: abiejose transportas į Lietuvą / bendra kaina yra esamas reikalavimas, išorinis RFQ instrukcijoje neaktyvuotas. Viešos kainos nelaikomos tiekėjo patvirtintu pasiūlymu. Nėra pagrindo dubliuoti šį procesą atskiru moduliu ar paskelbti dabartinio kodo klaidą.

[BayWa CEAT 420/85 R28 produkto puslapyje](https://www.baywa.de/p/ceat-specialty-traktorreifen-420-85-r-28-farmax-r85-139d-142a8-radial-tl/p_32802342/2227868) matoma nemokamo siuntimo žyma ir 1 425 mm išorinis padangos skersmuo. [BayWa FAQ](https://www.baywa.de/i/footermenue/wir-helfen-ihnen/faq) pristatymo skiltyje patikslina: be atskiro suderinimo vežama Vokietijos žemyninėje dalyje; užsieniui reikia kreiptis į klientų aptarnavimą, galimybė numatyta tik pasirinktoms prekėms. Todėl šio SKU pristatymas į Lietuvą, jo kaina ir terminas tebėra **nepatvirtinti**, bet dabar turime konkretų tikrinimo kelią. Nemokamo siuntimo žyma nėra 0 € transporto į Lietuvą faktas. Tai nėra įrodymas, kad eksportas neįmanomas.

[DPD Lietuvos oficialus puslapis](https://www.dpd.com/lt/lt/pagalba/naudingi-patarimai/standartines-ir-nestandartines-siuntos/) atskiria standartinę, nekonvejerinę pakuotę ir padėklus. Standartinei kurjerio pakuotei lentelėje nurodyta ilgiausia kraštinė iki 100 cm, apimtis iki 290 cm ir svoris iki 25 kg; ES sunkiai pakuotei iki 31,5 kg numatyta priemoka. Yra kitų paslaugų ir išimčių. Apimtis skaičiuojama iš pakuotės kraštinių. Patikra turi parinkti konkretų paslaugos profilį ir maršrutą, o ne atmesti visą vežėją pagal vienos paslaugos ribas.

Padangos eksploataciniai / pripūstos padangos matmenys nėra išmatuota siuntimo pakuotė. Nominalus plotis, gamintojo apkrovos lentelė ar produkto skersmuo nepakeičia tiekėjo pateiktų pakuočių skaičiaus, išorinių matmenų ir bruto svorio. Krovinio pakrovimas / iškrovimas ir pristatymo vieta taip pat turi būti patvirtinti konkrečiam maršrutui. Vienodo Europos kurjerio taisyklių profilio visoms šalims / paslaugoms nėra.

## Mažiausias praktiškas patikrinimas

Esamame autorizuotame core simuliacijų darbe galima panaudoti [keturis dokumentuotus scenarijus](CHECK_CASES.json): nemokamo vietinio siuntimo neteisingas perkėlimas į LT, nežinomos pakuotės nekeitimas produkto matmenimis, sintetinė per didelė standartinė pakuotė ir geometriškai tinkama pakuotė be patvirtintos kainos. Scenarijai šiame tyrime **nevykdyti**; jie nepatvirtina runtime priėmimo. Tyrimo artefaktai nekeičia vykdytojo kodo, instrukcijų ar jo įgyvendinimo mandato.

Į būsimą autorizuotą RFQ pakanka įtraukti SKU / kiekį, išsiuntimo šalį, gavimo šalį ir pašto kodą, pakuočių matmenis / bruto svorį, pakavimo būdą, pilną pristatymo kainą, terminą, iškrovimą ir pasiūlymo galiojimą. Tiekėjui nereikia visos kliento istorijos. Jei tiekėjas pats patvirtina pristatymą į vietą, atskiro kurjerio paieška gali būti nereikalinga. Jei ne, agentas gali lyginti krovinio vežimą ar kitą tinkamą tiekėją esamame mandate.

## Ekonomika, alternatyvos ir stabdymas

Tikra transporto kaina, mūsų marža, paklausos / užsakymų apimtis ir šios patikros darbo savikaina nežinomos. Nėra naujo kainyno ar sutarto partnerio. Transporto kaštai `T` keičia palyginimą; jei dviejų identiškai normalizuotų prekių kainų skirtumas yra `d`, daugiau nei `d` išaugęs vieno varianto transportas gali pakeisti pigesnį variantą. Nevienodo PVM pagrindo ar skirtingo tinkamumo prekių taip lyginti negalima.

Alternatyvos: tiekėjo patvirtintas tiesioginis pristatymas; atskiras vežėjo pasiūlymas; tinkamas vietinis tiekėjas; išankstinė poreikio užklausa be galutinio pardavimo pažado. Šių alternatyvų kainos / prieinamumas nepatvirtinti. Naujos prenumeratos nereikia vien šaltinių ir scenarijų patikrai; esamo AI / darbo sąnaudos nėra automatiškai nulinės. Siūlomas būsimo vietinio scenarijų patikrinimo laiko limitas iki 2 valandų yra prielaida, ne faktinis įgyvendinimo įkainis ar pavedimas.

Priėmimas: nežinomas / netinkamo maršruto siuntimas negauna galutinės kainos būsenos, agentas nurodo tikslų trūkstamą faktą ir tęsia nepriklausomą tyrimą. Pakuotės atitikimas pats nepatvirtina kainos / termino. Stabdyti galutinio pasiūlymo etapą esant neišspręstai pristatymo priklausomybei; nestabdyti visos pirmos fazės svetainės. Jei tiekėjas patvirtina tinkamą maršrutą ir visas sąnaudas, papildoma kurjerio integracija šiame sandoryje nebūtina. Penkiasdešimties nišų įrankių kiekis nėra šio patikrinimo sėkmės matas.

## Prieigos ir tyrimo ribos

Omniva pagalbos puslapis nukreipė į siuntimo puslapį; iš šio skaitymo negavome pakankamo konkrečios verslo paslaugos taisyklių rinkinio. Senų privačių klientų PDF / `old.omniva.lt` rezultatų nepritaikėme dabartiniam verslo maršrutui. Tiesioginis CEAT PDF nepavyko atverti. BayWa pridėto CEAT PDF tekstas sutapo su HTML matmens informacija, tačiau screenshot įrankis šioje sesijoje nepateikė vertinamo vaizdo; neįrašytas vizualinis PASS. Remiamės pagrindine HTML produkto informacija; apkrovos / saugumo rekomendacijų šiame tyrime neteikiame.

Viena vietinė paieška iš pradžių taikė klaidingą `sales/` katalogą; `rg --files` nustatė faktinius `sales.py` / `sales_worker.py`. Tiksli jų paieška nesuteikė pagrindo teigti, kad transporto kainos jau automatiškai apskaičiuojamos. Tai nėra viso runtime auditas. Formų nesiuntėme, paskyrų / pirkimų / mokamų paslaugų neįjungėme; kitų nišų, shared failų ir procesų nekeitėme.
