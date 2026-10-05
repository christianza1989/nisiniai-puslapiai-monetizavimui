# BDEV-0003-P1 — vieno proceso plano bandymas

Statusas: **proposed**. Tai [BDEV-0003](../../ideas/BDEV-0003.md) bandymas, ne nauja verslo idėjos eilutė. Pagrindas: [tyrimas](RESEARCH.md). Patvirtinimo šaltinis ir apimtis: nėra. Šis dokumentas parengia konkretų sprendimą savininko peržiūrai.

## Mokamas rezultatas

Pirkėjas: maža paslaugų įmonė, reguliariai gaunanti panašias užklausas ir rengianti pasiūlymus. Viena darbo eiga: užklausa → trūkstamos informacijos surinkimas → pasiūlymo juodraštis. Pasirinkta siaura eiga padeda atskirti verslo taisykles nuo modelio spėjimo; ji neapima autonominio sandorio priėmimo ar pristatymo.

Klientui siūlomo teksto privatus juodraštis:

> Pateikite savo verslo domeną, trumpą pasiūlymo rengimo eigą ir du nuasmenintus užklausų pavyzdžius. Parengsime vieno proceso automatizavimo planą: kokie duomenys būtini, kokius žingsnius galima atlikti automatiškai, kaip tikrinti klaidas ir kokio mažiausio įgyvendinimo reikėtų. Planas lieka jums ir gali būti perduotas kitam vykdytojui. Gavę informaciją pirmiausia patvirtinsime, ar ši ribota apimtis jūsų procesui tinkama.

Pradinė **kainos hipotezė 299 €** — tyrimo scenarijus, ne viešas kainynas ar sąskaita. Prieš tikrą pasiūlymą reikia tikro pardavėjo / mokesčių profilio, galutinės kainos pateikimo, apimties, termino ir sutarties. Bendro audito ir viso verslo pastatymo pažadas šiam rezultatui nepriskiriamas.

## Įėjimas ir pristatomas paketas

Minimalūs įėjimo duomenys: domenas; viena proceso pradžia ir pabaiga; naudojamos sistemos; du nuasmeninti pavyzdžiai; mėnesinė apimtis ir dabartinės trukmės matavimas arba aiškus „nežinoma“. Klientas pateikia savo darbo taisykles / kainų sudarymo principus. Slaptažodžių ir klientų asmens duomenų nereikia. Jei esminės informacijos nėra, kvalifikavimo stadijoje prašomas konkretus trūkstamas laukas; neapmokestinamas bendras spėjimų tekstas kaip patikrintas procesas.

Paketas:

- Dabartinė eiga su faktų / kliento teiginių / prielaidų žymomis ir pavyzdžių nuorodomis.
- Būtini užklausos laukai ir taisyklės, pagal kurias prašomi patikslinimai arba stabdomas juodraštis.
- Trijų variantų palyginimas: darbo tvarkos supaprastinimas; deterministinis skriptas / esama integracija; agentų eiga. Nurodomos realiai patikrintos arba dar nežinomos priklausomybės.
- Mažiausio įgyvendinimo specifikacija: įėjimas, išėjimas, klaidų tvarkymas, duomenų apimtis, reikalingos prieigos ir sėkmės scenarijai.
- Sąnaudų / trukmės scenarijus tik su aiškiomis prielaidomis; laiko sutaupymas atskiriamas nuo faktiškai sumažėjusių piniginių išlaidų. Jei nėra pagrindo automatizuoti, pateikiama pagrįsta tokia išvada.

Šio paketo automatinio pristatymo runtime dar neįgyvendintas. Bandymas pernaudoja esamą tyrimo / artefaktų kelią, vėliau — bendrą case / outbox / įrodymų core; antro CRM ar sąskaitų modulio nekuriame.

## Mažiausia vykdymo apimtis po patvirtinimo

1. Iki **8 agento darbo valandų** privatus vietinis prototipo bandymas, be naujų prenumeratų. Du sintetiniai paslaugų užklausų scenarijai, kiekviename normalus ir trūkstamų duomenų atvejis. Jie pažymėti kaip sintetiniai, ne klientai ar paklausos įrodymas. Užfiksuoti tikrą trukmę, turimą naudojimo sąnaudų kvitą arba nežinomybę, taisymus ir žmogaus darbą.
2. Vertintojas pagal tą patį paketą turi atkurti proceso ribas ir laukiamus išėjimus. Kiekvienas sprendimą keičiantis teiginys turi faktą / pavyzdį arba prielaidos žymą; trūkstama kaina / apimtis neįrašoma kaip faktas. Aptikus klaidą bandymas taisomas, o pradinis rezultatas išsaugomas.
3. Komercinis bandymas — iki **5 savanoriškai besikreipiančių tinkamų įmonių**, 21 diena nuo realiai prieinamo ir autorizuoto pasiūlymo platinimo pradžios. Numatyta Phase 1 išankstinė užklausa / esamo autorizuoto kanalo įėjimas; šis planas nesuteikia šalto pašto, paskyros prieigos, mokamų kampanijų ar production teisės. Viešai veikiančio Verslomatikos domeno / kanalo šiuo bandymu nepatvirtinome.
4. Mokamas pristatymas pradedamas po techninio paketo patikros, realios kainos / apimties priėmimo ir tinkamų pardavėjo dokumentų proceso. Savininko patvirtintas privatus prototipas savaime nėra gyvo mokamo piloto leidimas.

Vietinio prototipo siūloma autorizavimo apimtis yra tik pirmi du punktai. Komercinio bandymo pradžiai reikalingas faktinis kanalas ir atskiras jo veiksmų mandatas; parengiamąjį darbą galima baigti iki to.

## Priėmimas ir stabdymas

Techninis priėmimas: abu sintetiniai procesai ir jų trūkstamų duomenų atvejai atkurti iš paketo; nėra išgalvotų kainų / teisių / pajėgumo; žinomos arba pažymėtos priklausomybės; faktiškai išmatuotas parengimo ir korekcijų laikas. Tikslas — būsimas klientas gauna įgyvendinimui tinkamą artefaktą. Sintetinis PASS nepatvirtina savarankiško darbo tikroje kliento sistemoje.

Komercinio bandymo išėjimas: bent 3 kvalifikuoti poreikiai ir bent 1 aiškus mokamos apimties priėmimas su realaus mokėjimo įrodymu. Kvalifikuotas poreikis turi konkretų procesą, pavyzdžius, apimtį ar jos matavimo planą ir sprendimų priėmėją. Paspaudimas, laiško išsiuntimas ar kainos peržiūra neįskaitomi kaip mokėjimas.

Stabdyti / keisti:

- Po 8 vietinio prototipo valandų nėra atkuriamo paketo — nepublikuoti mokamo pasiūlymo; užfiksuoti priežastį ir koreguoti ribas.
- Faktinės vieno riboto plano parengimo sąnaudos netinka pasirinktai kainai — siaurinti apimtį arba perskaičiuoti kainą prieš kitą klientą. Pradinis tikslas iki 6 efektyvių darbo valandų vienam planui yra bandymo hipotezė.
- 5 tinkami pirkėjai gauna aiškią kainą, tačiau nė vienas nepriima mokamo plano — tirti jų atsisakymus; jei nori tik įgyvendinto rezultato, tikrinti nemokamos diagnostikos → mokamo įgyvendinimo alternatyvą.
- Per 21 dieną nėra pakankamai tinkamų įėjimų — kanalas / imtis nepatikrinti; neskelbti, kad „rinka nenori“.
- Duomenys neprieinami, prieigos netinkamos ar veikla peržengia mandatą — užbaigti nepriklausomą analizę, atskirai užfiksuoti tikslų likusį poreikį.

## Hipotetinė vieneto ekonomika

Pavyzdys, ne mūsų kainynas / pelnas: 299 € pajamų pagrindas, 30 €/efektyvi darbo valanda ir 15 € kitų kintamų sąnaudų. Darbo laikas turi apimti kvalifikavimą, tyrimą, parengimą, patikrą, korekcijas ir perdavimą; agento kalendorinė vykdymo trukmė nėra automatiškai 30 €/h žmogaus sąnauda. Šiuo įkainiu tikriname hipotetinę parengimo savikainą. Tikrą modelio naudojimo / žmogaus darbo apskaitą pilotas turi išmatuoti atskirai.

| Efektyvios parengimo valandos | Darbo sąnaudos | Kitos sąnaudos | Likutis prieš pastovias sąnaudas / mokesčius |
|---:|---:|---:|---:|
| 2 | 60 € | 15 € | 224 € |
| 6 | 180 € | 15 € | 104 € |
| 10 | 300 € | 15 € | −16 € |

Nulinio likučio riba šiame scenarijuje `(299 − 15) / 30 = 9,4667 h`. Neįvertintos faktinės klientų gavimo, pastovios, mokesčių ir neįprastų taisymų sąnaudos gali pakeisti rezultatą. Skaičiai nėra mūsų faktinės maržos ar autonomijos įrodymas.
