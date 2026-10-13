# Techninių tekstų patikra

2026-10-13. Parengta 12 atskirų lietuviškų aprašymų. Atlikta saviredakcija: perskaityti galutiniai tekstai, palyginti skaičiai ir vienetai su gamintojo puslapiais bei PDF lapais, patikrintas modelių ir programų atskyrimas. Šaltinių atkūrimas ir terminai dokumentuoti; tai nėra bandymas su fiziniais įrenginiais ar galutinis būsimų puslapių priėmimas.

## Šaltiniai ir jų ribos

- 6 oficialūs modelių puslapiai ir 6 juose susieti techniniai PDF dokumentai.
- 5 programinės įrangos ir debesijos produktų puslapiai: „eSignatureOffice“, „Print2NG“, „Office Plugin“, „webSignatureOffice“ ir „Lite“.
- Papildomai „NG Pad Feature Extension“ puslapis bei „eSignatureOffice“ brošiūra.
- „Treg“ visoms 19 užklausų grąžino 200 būsenos kodą; faktinė kaina – 0,00285 USD. Šaltinių tekstai, turinio santraukos („content hash“) ir išlaidų kvitai saugomi privačiame `output` kataloge.
- PDF datavimas: „Classic“, „10.0“ ir „NG 10“ – 2024-10-15; „4.3“ – 2024-12-19; „5.0“ – 2025-06-25; „nextGen 5“ – 2026-04-21. „eSignatureOffice“ brošiūra datuota 2021-04-01, todėl pasenusios rekomendacijos dėl IE6 ar programos 6 versijos neperkeltos.
- „duraSign 5.0“ PDF 5 puslapio ir „nextGen 5“ PDF 6 puslapio temperatūrų lentelės patikrintos sugeneruotuose „Poppler“ atvaizduose. Rašiklio ir įrenginio drėgmės ribos nesupainiotos. Pradinis pakete pateiktas `.cmd` kelias neveikė, todėl panaudotas oficialiame pakete esantis `Library/bin/pdftoppm.exe`; jokių naujų diegimų neprireikė.
- Gamintojo instrukcijų „Wiki“ nuorodos programinės įrangos failuose pateiktos kaip tolesnės integracijos šaltiniai; jų turinys šioje partijoje neperžiūrėtas. Nuorodos pateikimas nereiškia „Wiki“ turinio patvirtinimo.

## Rasti neatitikimai ir tikslintini parametrai

| Modelis / sritis | Rasti duomenys | Priimtas sprendimas |
|---|---|---|
| „Classic“ aktyvus plotas | Puslapyje – 10 × 2,9 cm; PDF ekrane – 9,6 × 2,5 cm, jutiklyje – 9,8 × 2,6 cm | PDF reikšmės pažymėtos; iki patikslinimo neskelbti kaip vieningo galutinio parametro |
| „Classic“ vidinis dažnis | Puslapyje – >7000/s; PDF – 7000/s | Skirtumas išsaugotas pastaboje |
| „Classic“ vartojama srovė | PDF – >100 mA | Neperrašyta į <100 mA ar maksimalią reikšmę; neįtraukta į viešą lentelės dalį |
| „10.0“ ir „NG 10“ aktyvus plotas | Puslapiuose – 22,41 × 12,67 cm; PDF – 22,27 × 12,53 cm | Skirtumas pažymėtas |
| „NG 10“ svoris | Puslapyje – 955 g; PDF – 945 g | Abu variantai palikti kaip nepatvirtinta vieninga specifikacija |
| NG korpuso atidarymo aptikimas | Rinkodaros tekste – integruotas; PDF – papildoma gamyklinė parinktis | Standartinėje komplektacijoje nepažadėta |
| „nextGen 5“ USB režimas | PDF sisteminėje skiltyje – tinklo įrenginys; ryšio skiltyje – HID / nuoseklusis prievadas | Tikslus protokolas neįrašytas kaip patvirtintas faktas |
| „nextGen 5“ kito modelio tekstas | Puslapio pabaigoje VESA ir dalis integracijos aprašo mini NG 10 | Šie teiginiai nepriskirti „nextGen Pad 5“ modeliui |
| NG vaizdo srauto pralaidumas | PDF nurodyta 512K be matavimo vieneto | Vienetas neišgalvotas; nepublikuoti be patikslinimo |
| NG laikrodžio datos žyma | PDF tekste – „standard“, lentelės antraštėje – „optional“; NTP sąlygos | Nepriskirta kvalifikuotai laiko žymai |
| NG plėtinių kortelių nuorodos | Plėtinio NG kortelių etiketės nukreipia į klasikinius modelius | Naudotas aiškus suderinamumo tekstas; klaidingos nuorodos nekopijuotos |

Peržiūrint skaičius pataisytas „nextGen Pad 5“ pakartojamumas: PDF nurodo ±0,4 mm, o ne „duraSign 5.0“ reikšmę ±0,5 mm. Tai patvirtina, kodėl vienodos išvaizdos modelių duomenys negali būti mechaniškai perkeliami vienas iš kito.

## Išsaugoti esminiai skirtumai

- „4.3“ ekranas atkuria 4 spalvas; „5.0“ ir „NG 5“ – 64 000 spalvų.
- Įprastiems modeliams reikalinga atskira pasirašymo programa kompiuteryje; NG modelių pagrindinis procesas vyksta įrenginyje (PDF apdorojimas ir valdymas naršyklėje).
- „Ethernet“ priedas nėra integruotas „Ethernet“ lizdas.
- Formų pildymo „Extension“ licencijuojamas įrenginiui metams, o „Lite“ – naudotojui mėnesiui; periodai ir vienetai skiriasi.
- „Office Plugin“ įterpia tik parašo grafinį vaizdą, todėl jam nepriskirtas visas „eSignatureOffice“ pasirašymo procesas.
- „Print2NG“ sistemoje „Windows“ palaiko x86 ir x64 architektūras (ARM nepalaikomas); „macOS“ – nuo 13.2; „Linux“ distribucija tikslinama.
- Minimalios „firmware“ versijos ir PDF brošiūrų datos paliktos konkretaus šaltinio kontekste, neįvardijant jų „naujausiomis versijomis“.

## Priėmimo būsena

Aprašymų aplankas parengtas peržiūrai, esamų puslapių aprėptis patikrinta. Būsena lieka `private-draft` (ne studijos patvirtinimas ar viešas leidimas). Rasti gamintojo duomenų neatitikimai gali stabdyti konkretaus parametro publikavimą, tačiau netrukdo naudoti kitų patvirtintų techninių duomenų. Vėlesnis integravimas turi remtis šiais apribojimais ir nauja revizijos peržiūra.

Viešasis turinio paketas ir svetainė šiuo etapu nepakeisti; naujų iliustracijų ar programinės įrangos vykdymo aplinkų nekurta. Naujo techninio turinio lentelių, prieinamumo (a11y) ir darbalaukio bei mobiliosios peržiūros patikra bus atliekama integracijos etape, o ne šiame tekstų aplanke.
