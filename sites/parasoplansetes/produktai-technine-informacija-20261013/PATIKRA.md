# Techninių tekstų patikra

2026-10-13. Paruošti 12 atskirų lietuviškų aprašymų. Atlikta saviredakcija: perskaityti galutiniai tekstai, palyginti skaičiai ir vienetai su gamintojo puslapiais bei PDF, patikrintas modelių ir programų atskyrimas. Šaltinių atkūrimas ir terminai dokumentuoti; tai nėra bandymas su fiziniais įrenginiais ar pilnas būsimo puslapio priėmimas.

## Šaltiniai ir jų ribos

- 6 oficialūs modelių puslapiai ir 6 juose susieti techniniai PDF.
- 5 programų / debesijos produktų puslapiai: eSignatureOffice, Print2NG, Office Plugin, webSignatureOffice ir Lite.
- Papildomai NG Pad Feature Extension puslapis bei eSignatureOffice brošiūra.
- Treg visiems 19 iškvietimų grąžino 200; faktinė kaina 0,00285 USD. Šaltinių tekstai, content hash ir kainos kvitai – privačiame output kataloge.
- PDF datos: Classic / 10.0 / NG 10 – 2024-10-15; 4.3 – 2024-12-19; 5.0 – 2025-06-25; nextGen 5 – 2026-04-21. eSignatureOffice brošiūra – 2021-04-01, todėl senos IE6 / versijos 6 rekomendacijos neperkeltos.
- duraSign 5.0 PDF 5 puslapio ir nextGen 5 PDF 6 puslapio temperatūrų lentelės patikrintos realiuose Poppler išvaizduose. Rašiklio ir įrenginio drėgmės ribos nesumaišytos. Pirmas bundled `.cmd` kelias neveikė; panaudotas esamas oficialaus bundle `Library/bin/pdftoppm.exe`, jokio naujo diegimo nereikėjo.
- Gamintojo instrukcijų Wiki nuorodos programų failuose pateiktos kaip tolesnės integracijos šaltiniai, jų turinys šioje partijoje neperžiūrėtas. Vien nuorodos įrašymas nėra Wiki turinio patvirtinimas.

## Rasti neatitikimai / tikslintini parametrai

| Modelis / sritis | Ką radome | Kaip tvarkyta |
|---|---|---|
| Classic aktyvus plotas | Puslapis 10 × 2,9 cm; PDF ekranas 9,6 × 2,5, jutiklis 9,8 × 2,6 cm | PDF reikšmės pažymėtos; iki patikslinimo neimportuoti kaip vienos galutinės reikšmės |
| Classic vidinis dažnis | Puslapis >7000/s; PDF 7000/s | Skirtumas išsaugotas pastaboje |
| Classic srovė | PDF >100 mA | Neperversta į <100 mA ar maksimumą; neįrašyta į viešą lentelės dalį |
| 10.0 ir NG 10 aktyvus plotas | Puslapiai 22,41 × 12,67; PDF 22,27 × 12,53 cm | Skirtumas pažymėtas |
| NG 10 svoris | Puslapis 955 g; PDF 945 g | Abu variantai palikti kaip nepatvirtinta vieninga specifikacija |
| NG korpuso atidarymas | Marketingas: integruotas; PDF: papildoma opcija | Standartinės komplektacijos nepažadėta |
| nextGen 5 USB režimas | PDF sistemos skiltyje tinklo įrenginys; ryšio skiltyje HID / serial | Tikslus protokolas neįrašytas kaip nustatytas faktas |
| nextGen 5 kito modelio tekstas | Puslapio pabaigoje VESA / dalis integracijos aprašo mini NG 10 | Nepriskirta nextGen 5 |
| NG vaizdo bitų srautas | PDF 512K, nepatikslintas vienetas | Vienetas neišgalvotas; neimportuoti be patikslinimo |
| NG laikrodžio data | PDF standard, antraštė optional; NTP sąlygos | Nepriskirta kvalifikuotai laiko žymai |
| NG papildinių kortelių nuorodos | Extension NG etiketės nukreipia į klasikinius modelius | Naudotas aiškus suderinamumo tekstas; klaidingos nuorodos nekopijuotos |

Per atskirą skaičių peržiūrą pataisytas nextGen Pad 5 pakartojamumas: PDF nurodo ±0,4 mm, ne duraSign 5.0 ±0,5 mm. Tai pavyzdys, kodėl vienodos išvaizdos modelių duomenys nekopijuojami vienas iš kito.

## Išsaugoti esminiai skirtumai

- 4.3 ekranas: 4 spalvos; 5.0 ir NG 5: 64 000 spalvų.
- Įprasti modeliai: atskira pasirašymo programa; NG pagrindinis procesas: PDF apdorojimas įrenginyje ir valdymas naršyklėje.
- Ethernet priedas nėra numatytasis integruotas Ethernet lizdas.
- Formų pildymo Extension licencijuojamas įrenginiui, Lite – naudotojui; periodai skiriasi.
- Office Plugin įterpia parašo vaizdą, todėl jam nepriskirtas visas eSignatureOffice pasirašymo procesas.
- Print2NG Windows palaiko x86 / x64, ne ARM; macOS ≥13.2; Linux distribucija tikslinama.
- Firmware minimumai ir PDF brošiūrų datos palikti konkretaus šaltinio kontekste, nepavadinti „naujausiomis versijomis“.

## Priėmimo būsena

Aprašymų aplankas paruoštas peržiūrai, esamų puslapių aprėptis patikrinta. Būsena `private-draft`, ne studio approval ar deployed release. Gamintojo neatitikimai gali stabdyti konkretų parametrą, bet netrukdo naudoti kitų patvirtintų techninių duomenų. Vėlesnis integravimas turi remtis šiais laukų apribojimais ir nauja tikros revizijos peržiūra.

Viešas paketas ir svetainė šiuo pavedimu nepakeisti; naujų nuotraukų ar programų / pašto runtime nekurta. Naujo techninio turinio lentelių, a11y ir desktop/mobile vaizdo patikra bus taikoma integruojant, ne šio tekstų aplanko vardu.
