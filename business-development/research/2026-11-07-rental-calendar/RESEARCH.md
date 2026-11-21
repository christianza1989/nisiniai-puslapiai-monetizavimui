# Rentbook: ar kalendoriaus kopijos pakanka rezervacijai patvirtinti?

2026-11-07. Ribota [nuomos užklausų administravimo hipotezės](../../../sites/rentbook.md) automatizavimo patikra. Nišos konkretus nuomos segmentas nepasirinktas. Apgyvendinimo kalendoriai čia yra vienas galimas atvejis, ne naujai pasirinktas verslas. Naujo BDEV pasiūlymo nėra; briefas ir sistemos nekeisti.

## Pirminiai šaltiniai

- [Airbnb kalendorių sinchronizavimas](https://www.airbnb.com/help/article/99), originalas perskaitytas 2026-11-07: importuojamas kalendorius automatiškai atnaujinamas kas 3 valandas. Rankinis atnaujinimas ribojamas; keli kalendoriai gali būti atnaujinti skirtingu laiku. Kai kurie kito kalendoriaus blokavimai, įskaitant pasiruošimo ar išankstinio įspėjimo nustatymus, gali nepersikelti. Tai konkretaus importo elgsena, ne visų rezervavimo sistemų savybė ar garantuota didžiausia delsa.
- [Vrbo kalendoriaus importas](https://help.vrbo.com/articles/How-do-I-import-my-iCal-or-Google-calendar), originalas perskaitytas 2026-11-07: palaikomos iCal nuorodos, importas skirtas per Vrbo savininko sąsają valdomiems objektams; per trečiųjų šalių valdymo programinę įrangą valdomiems objektams šis importas neprieinamas. Mobiliosios programėlės instrukcijoje nurodomas 30 minučių sinchronizavimas. Pradinio importo įvykių pasirodymas gali užtrukti iki 20 minučių. Šių laikų nesumuojame į pažadėtą bendrą delsą.

Privačių kalendorių nuorodų, rezervacijų, paskyrų ir svečių duomenų neskaitėme. Trečiųjų šalių tinklaraščiai nenaudoti techninėms išvadoms pagrįsti.

## Mažiausia patikra

Rankiniu būdu palyginti trys sintetiniai atvejai. Tai tik dokumentinis sprendimo patikrinimas, be parserio, API ar veikiančio rezervavimo bandymo.

| Sintetinė situacija | Pagrįsta išvada |
|---|---|
| Kopija atnaujinta 09:00, kito kanalo rezervacija atsirado 09:05, nauja užklausa gauta 09:10 | Kopijoje gali dar nebūti naujos rezervacijos; jos tuštuma nepatvirtina laisvumo |
| Kitoje sistemoje pažymėtas pasiruošimo laikas, importo kopijoje blokavimo nėra | Reikia patikrinti blokavimo prasmę; nelaikyti tarpo automatiškai parduodamu |
| Vrbo objektą valdo trečiosios šalies valdymo programa | Dokumentuoto savininko iCal importo kelio nelaikyti tinkamu nepatikrinus faktinės valdymo sąsajos |

Tikslas — atskirti užklausą nuo įvykusios rezervacijos. Priėmimas: nė vienas atvejis nebaigiamas nepagrįstu užsakymo patvirtinimu; išsaugoma trūkstama informacija. Šis dokumentinis kriterijus įvykdytas. Stabdymo riba — tikros paskyros prijungimas, privatūs srautai, rezervacija ar žinutė; tokių veiksmų neatlikta. Naujos prenumeratos ir mokami API — 0, tyrimo laikas yra sąnauda.

## Vertinimas

Galima vėlesnė nauda būtų surinkti aiškią užklausą ir parodyti operatoriui paskutinio patikrinimo laiką. Tai nepagrindžia naujo kalendoriaus modulio: nėra pasirinkto segmento, autorizuoto užimtumo šaltinio, mokančio kliento ar valdymo sutarties. Alternatyva — patvirtinimas per faktiškai objektą valdančią sistemą; konkreti prieiga, kaina ir galimybės nepatikrintos. Vien rankinis kopijos atnaujinimas neišsprendžia visų kanalų konkurencinio užsakymo. Pagrindas keisti sprendimą būtų tikras kliento procesas, jo mokėjimo ketinimas ir patikrinta rezervacijos patvirtinimo sąsaja. Dabartinė planavimo hipotezė neplečiama.
