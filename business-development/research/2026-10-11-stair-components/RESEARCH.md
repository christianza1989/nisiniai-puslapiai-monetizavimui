# Pakopa ir visas laiptų apdailos darbas · 2026-10-11

Statusas: **evidence_only_no_new_proposal**. Klausimas: ar viešai parduodamos pakopos ir renovacijos komplektai pagrindžia autonominę viso laiptų apdailos darbo prekybą Lietuvoje? Tyrimas papildo esamą laiptucentras.lt pasiūlymo vykdymo ir sąmatos palyginimo pagrindą.

## Sprendimas

[BUSINESS](../../../sites/laiptucentras/BUSINESS.md) jau apima medines pakopas ant esamos konstrukcijos, o pakopų e. prekybą atideda iki tikrų tiekimo ir tinkamumo duomenų. Esamos [pardavimų](../../../agent-business-core/runtime/src/pinet_core/instructions/niches/laiptucentras/sales.md) ir [tiekėjų](../../../agent-business-core/runtime/src/pinet_core/instructions/niches/laiptucentras/supplier.md) instrukcijos atskiria konstrukciją, pakopas, apdailą ir montavimą. Naujo modulio, renovacijos nišos ar BDEV ID šie šaltiniai nepagrindžia. [Ankstesnis tyrimas](../2026-10-04-stair-quote/RESEARCH.md) atskyrė preliminarų pasiūlymą nuo matavimo ir projektavimo; dabar pridedami konkretūs gaminio vieneto ir paruošimo būklės įrodymai.

Praktiška išvada: pasiūlyme pirmiausia nustatyti gaminio vienetą, paruošimo būklę ir papildomus darbus. Standartinė pakopa, apdailos ruošinys ir viso projekto renovacija nėra vienodi parduodami rezultatai. Tai mano išvada iš žemiau perskaitytų tiekėjų pasiūlymų, ne patvirtinta mūsų partnerystė. Visos svetainės, runtime ir [idėjų registras](../../IDEAS.md) šiame cikle nekeisti.

## Aktualūs pirminiai pasiūlymai

[Kazliškių pakopų puslapis](https://medinesdurys.lt/laiptai/pakopos), perskaitytas 2026-10-11, skelbia stačiakampių 4 cm storio pakopų įkainius: uosis 125 €/m², ąžuolas 175 €/m². Aiškiai nurodyta, kad kainos be PVM, pakopos paruoštos apdailai ir atsiimamos įmonės sandėliuose. Apdailos dengimas aptariamas atskirai. Pagal kliento matmenis gaminamas produktas nėra viso laiptų įrengimo sąmata; atsiėmimas nėra pristatymas ar montavimas. Skelbiamas terminas nėra konkretaus mūsų užsakymo patvirtinimas.

[Eituma kategorija](https://www.eituma.lt/produkto-kategorija/klijuoti-skydai/laiptu-pakopos/), perskaityta 2026-10-11, turi standartinių gaminių kainas už vienetą ir veiksmą „Teirautis“. Nestandartinėms aikštelėms ir kampinėms pakopoms siūlomi pagal matmenis gaminami skydai; jų atsarga skirta vėlesniam apdirbimui. Šis aprašas rodo papildomų matavimo ir gamybos veiksmų poreikį. Kategorijos kaina ar įrašas nėra konkretaus kiekio likučio ir apdirbto galutinio gaminio įrodymas. Nesulyginu jos €/vnt. su kito teikėjo €/m² kaip vienodos paslaugos.

[StairFurb apdailos gaminys](https://stairfurb.co.uk/product/oak-tread-riser-stair-cladding/), perskaitytas 2026-10-11, yra esamų laiptų pakopų bei vertikalių dalių apdaila su ąžuolo lukštu, o ne nauja laiptų konstrukcija. Numatyti kliento matmenys, apdailos variantas ir atskiras montavimas. Puslapis nurodo pristatymą tik Jungtinėje Karalystėje. Skirtingose to paties puslapio vietose pristatymo trukmė nesutampa; vieno termino nepasirenku kaip patvirtinto. Pradinė „From £35“ suma neįrodo konkrečios konfigūracijos visos kainos. UK meistrų tinklas nėra Lietuvos vykdytojas; jų grąžinimo ženklelio netaikau mūsų būsimam sandoriui.

Tai trys perskaityti pirminiai HTML puslapiai. Gamintojų pateiktų ergonomikos ar saugumo rekomendacijų šiame tyrime netvirtinu ir į projektavimo taisykles neperkeliu. Treg katalogo užklausa pakopų tiekimo duomenims tinkamų atitikmenų nerado; mokamų provider calls nėra.

## Ekonomika, alternatyvos ir nežinomybės

Pavyzdys tik įkainio vienetui patikrinti: hipotetinė 0,95 × 0,30 m stačiakampė pakopa turi 0,285 m² plotą. Taikant skelbiamą 175 €/m² ąžuolo įkainį, gaminio dalis būtų 49,875 € be PVM; šiame analitiniame pavyzdyje pusę cento apvalinu aukštyn iki 49,88 €. Tai aritmetika su hipotetiniais matmenimis, ne tinkamo gaminio, užsakymo kainos, tiekėjo sąskaitos apvalinimo taisyklės ar mūsų pajamų patvirtinimas. Neįtraukti papildomų detalių, apdailos, apdirbimo, montavimo ir transporto kaštai lieka nežinomi; jų neįrašau kaip nulio.

Esamas užklausos modelis leidžia rinkti konkretų kliento poreikį ir laukti vykdytojo įvertinimo. Tiesioginė prekyba pareikalautų tiekimo sutarties, tikslių matmenų priėmimo, apdirbimo atsakomybės, apdailos ir pristatymo bei perdarymų ekonomikos. UK komplekto pardavimas nėra šių spragų sprendimas. Nepatvirtinti mūsų klientai, mokėtojai, partnerių pajėgumas, atlygis, reali paklausa ir marža. BUSINESS pasirinkimas nepakeistas: mūsų galima pajama būtų tik sutartas ir surinktas mokestis už priimtą tinkamą užklausą, ne visa gamintojo sąmata.

## Mažiausias patikrinimas esamame plane

Vėlesniame autorizuotame laiptų užklausų ar agento vertinime pakanka [šešių kontrolinių atvejų](CHECK_CASES.json). Tai esamos apimties tikrinimo detalė, ne atskiras pilotas. Iki 1 agento darbo valandos yra planavimo riba, ne išmatuotas našumas. Naujų prenumeratų nereikia; esamų modelių darbo ir peržiūros sąnaudos būtų registruojamos. Atvejai šįkart aprašyti, agentui nevykdyti; tik hipotetinė vienetų aritmetika patikrinta lokaliai.

Tikslas — parengti palyginamą darbų apimtį ir neperduoti gamintojui klaidingo užsakymo. Priėmimas: išlikę įkainio vienetas, medžiaga, matmenų prielaida, apdailos būklė, PVM ir atsiėmimo sąlyga; neišgalvotas likutis, partneris ar galutinė kaina. Agentas neskaičiuoja identiškų pakopų kiekio vien iš bendro laiptų skaičiaus, kai yra kampai ar aikštelės. Kitame tikrų poreikių etape vertinti patikslinimų laiką ir vykdytojo priėmimą, atskirai nuo sintetinių testų.

Stabdyti ar taisyti, jei €/m² paverčiama €/vnt. be ploto, neapdailintas gaminys paskelbiamas gatavu, UK pristatymas pažadamas Lietuvoje arba vienetinis gaminys pateikiamas kaip visas įrengimas. Jei esamos instrukcijos išsaugo šiuos skirtumus, naujo modulio nereikia. Mokamas prekybos modelis būtų svarstomas tik su realiais tiekimo, užklausų ir ekonomikos duomenimis.

## Tęstinumas ir patikra

Naujausi peržiūrėti tiesioginiai root pavedimai dėl X agento ir platformos koordinavimo priklauso tam vykdytojui. Core sesijos roletų ir privačios konfigūracijos pavedimai nesuteikia P1–P4 ar BI approval. Naujo registro patvirtinimo nėra. Root FB modulio, agentų ar kitų nišų failų neperimu.

Pradinis bandymas perskaityti neegzistuojantį `sites/laiptucentras/ACQUISITION.md` pateikė klaidą; komercinį sprendimą grindžiau tikru BUSINESS ir instrukcijomis. Tai ne visų įsigijimo tyrimų nebuvimo išvada. Kuriami tik privatūs dokumentai; vieši tekstai, šriftai ir sąsajos nepakeisti, todėl tipografikos vaizdinės patikros netaikomos. Galutinis privatus tekstas peržiūrėtas ir suredaguotas, bet tai nėra produkto ar kalibruoto agento priėmimas.

Šaltiniai: [SOURCES.json](SOURCES.json). Dokumentinė patikra: [QA.json](QA.json). Naujo pasiūlymo nėra; savininkui seni nepatvirtinti bandymai nekartojami.
