# Prekybos administravimas

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Esamas Node/D1 serveris, HTML, CSS ir ES moduliai. Bendras modulis core saugykloje; vieša Memocasting svetainė kuriama vėliau.

## Users

Parduotuvės savininkas ir jo įgaliotas operatorius: tikrina užsakymus, komplektuoja siuntas, koreguoja likučius, peržiūri dokumentus, priima medžiagas, surenka rinkinius, sutikrina finansinius šaltinius ir rengia didmenos pasiūlymus. Kasdienio darbo dažnis ir komandos dydis dar nežinomi.

## Product Purpose

Vienas pakartotinai naudojamas prekybos pagrindas kelioms savininko parduotuvėms. Kiekvienas veiksmas turi išsaugotą rezultatą, parduotuvės ribą ir pakartojimo apsaugą.

## Operating Context

Pirmas vartotojas — MB Memocasting, du rankų liejimo rinkiniai. Dabartinis ekranas vietinis, su izoliuotais testiniais produktais. Tikri mokėjimai, siuntimo API ir production prisijungimas dar neaktyvūs. Nuotraukų šiam darbo ekranui nereikia.

## Capabilities and Constraints

Užsakymų, mokėjimų, likučių, dokumentų ir vykdymo duomenis pateikia serveris. Pirkėjų duomenys privatūs. Vietiniai testiniai dokumentai nėra patvirtinti buhalteriniai dokumentai. Apskaitos agentai, didmenos partnerių paieška ir aptarnavimo agentai kuriami pagal atskirus roadmap etapus.

## Evidence on Hand

Modulio API, testai ir roadmap šiame kataloge; Memocasting verslo faktai sites/memocasting. Dar nėra veikiančio viešo shopo, realių vežėjų etikečių ar naujų produkto nuotraukų.

## Product Principles

- Darbo rezultatas išlieka po serverio perkrovimo.
- Parduotuvės ir aplinkos atskirtos kiekviename duomenų kelyje.
- Nežinomos kainos ir faktai nepakeičiami testinių duomenų teiginiais.
- Klaida nurodo, kaip saugiai tęsti veiksmą.

## Accessibility & Inclusion

Lietuviškas ekranas, klaviatūra valdomi formų laukai, matomas fokusas, prisitaikymas prie telefono.
