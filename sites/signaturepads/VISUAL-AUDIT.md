# signaturepads.lt: originalo ir vietinės peržiūros vizualinis palyginimas

Data: 2026-10-29. Užduotis – nustatyti praleistus elementus ir pastebimus skirtumus, išlaikant dabartinės svetainės tapatybę. Šioje patikroje sąsajos kodas nekeistas. Esamoje peržiūroje yra taisytinų atitikimo originalui spragų.

Palyginti 8 adresai: `/`, `/prekes/`, visos 3 kategorijos, Sigma produktas, spaudos ir slapukų puslapiai. Iš viso 32 pilno puslapio nuotraukos: originalas / peržiūra, 1440 × 1000 ir 390 × 1000 CSS px naršyklės langai. Originalo NitroPack atidėtai rodomas turinys prieš fiksavimą aktyvuotas pelės judesiu ir slinkimu. Tai vieno agento naršyklės, DOM matmenų ir šaltinio kodo palyginimas; ne nepriklausoma patikra, ne fizinio telefono bandymas, ne visų 19 produktų atskiras vizualinis priėmimas.

Vertinta versija: public `692d851aa7b3b55fcbd3660a6b844ac1994d8c90`; Core bazė `25292e20219b735df7f04c5807dd4c100f98addc`. Abu repo sėkmingai fetch ir patikrinti freshness gate. Įrodymai ir nuotraukos: `D:/Core/output/signaturepads-migration-20261029/visual-audit-20261029/`, `evidence.json`.

## Ką reikėtų grąžinti pirmiausia

| ID | Vieta | Originalas | Dabartinė peržiūra | Siūlomas pataisymas |
|---|---|---|---|---|
| VF01 | `/iranga/paraso-plansetes/`, `/iranga/elektroninio-paraso-plansetes-monitoriu-ispletimai/` | Po prekėmis – iliustracija kairėje ir įvadinis tekstas dešinėje; tolesnis straipsnis per platesnį puslapį. | Abi įvadinės iliustracijos neįtrauktos; visas tekstas rodomas viename iki 680 px pločio bloke kairėje. | Įdėti originalias iliustracijas ir atkurti atskirą įvado bei tolesnio teksto išdėstymą. |
| VF02 | Parašo planšečių katalogas ir panašūs produktai, 390 px | Planšečių ir panašių produktų kortelės dviem stulpeliais. | `max-width:400px` taisyklė visus produktų tinklelius paverčia vienu stulpeliu. Planšečių puslapis šiame bandyme pailgėjo nuo 7102 iki 9465 px. | Grąžinti du stulpelius ten, kur jie buvo originale. Programinės įrangos kategorija originale taip pat turi vieną stulpelį, todėl vienodas pakeitimas visoms kategorijoms netinka. |
| VF03 | Apatinė svetainės dalis | Pirmas stulpelis turi signaturepads.lt logotipą, desktop apie 225 × 64 px. | Šio logotipo nėra; palikti trys informacijos stulpeliai, kairėje vizualiai tuščia. | Įdėti originalų logotipą ir jo nuorodą, išsaugant kontaktus. |

Trūkstamos kategorijų iliustracijos:

- `https://signaturepads.lt/wp-content/uploads/2023/11/Paraso-plansetes-signotec-1024x602.jpg`
- `https://signaturepads.lt/wp-content/uploads/2023/12/epsilon_produktbild_12-1.png`

Tikslios palyginimo nuotraukos:

- [Telefonas: originalo tinklelis](D:/Core/output/signaturepads-migration-20261029/visual-audit-20261029/hardware-grid-original-390.png) · [peržiūros tinklelis](D:/Core/output/signaturepads-migration-20261029/visual-audit-20261029/hardware-grid-preview-390.png).
- [Planšečių kategorija: originalas](D:/Core/output/signaturepads-migration-20261029/visual-audit-20261029/hardware-original-1440.png) · [peržiūra](D:/Core/output/signaturepads-migration-20261029/visual-audit-20261029/hardware-preview-1440.png).
- [Monitorių kategorija: originalas](D:/Core/output/signaturepads-migration-20261029/visual-audit-20261029/monitors-original-1440.png) · [peržiūra](D:/Core/output/signaturepads-migration-20261029/visual-audit-20261029/monitors-preview-1440.png).

## Kiti pastebimi skirtumai

| ID | Vieta | Patikrintas skirtumas | Rekomendacija |
|---|---|---|---|
| VF04 | Pagrindinis puslapis | Įrangos kategorijų ir klientų logotipų kortelėms trūksta originalių pilkų apvalintų rėmelių. Logotipų vaizdai sumažinti; kontaktų nuotrauka turi stačius kampus vietoj apvalintų. | Grąžinti rėmelius, nuotraukos kampus ir panašų logotipų mastelį. |
| VF05 | Katalogo valdikliai | Originalus kainos intervalų slankiklis pakeistas dviem skaičių laukais. Kainos rikiavimo pasirinkimas nerodomas, nors rendereris supranta `orderby=price` ir `price-desc`. Papildomai matomas paieškos laukas. | Grąžinti matomą kainos rikiavimą. Slankiklio / laukų išvaizdą suderinti su originalu naudojant lengvus komponentus. Nereikia grąžinti atsiskaitymo ar mokamų įskiepių. |
| VF06 | Produktų kortelės | Originale užvedus pelę keičiasi produkto nuotrauka ir atsiranda „Greita peržiūra“. Naujoje versijoje nuotrauka nekinta, o nuoroda nuolat užima atskirą eilutę. Desktop kortelių pavadinimai 14 px vietoj originalių 16 px. | Atkurti antrą nuotrauką ir užvedimo būseną; nepaslėpti veiksmų vien užvedime, jeigu jie reikalingi klaviatūrai ar lietimui. |
| VF07 | Produkto puslapis | „Panašūs produktai“ desktop iš trijų stulpelių su ketvirta kortele kitoje eilėje pakeisti į keturis vienoje eilėje. Pasikeitė atranka; originalo rekomendacijos gali kisti, todėl vieno sąrašo nelaikome nekintama verslo taisykle. Taip pat nesimato originalios galerijos didinimo piktogramos. | Atkurti artimesnį tinklelį ir aiškų didinimo ženklą; rekomendacijų atranką vertinti atskirai nuo nekintamų URL / produktų faktų. |
| VF08 | Tipografika ir antraštė | Šriftas Open Sans išlaikytas, bet antraštės pakeitė spalvą: originalo `#276d72`, pagrindinio puslapio peržiūros `#448c9a`, katalogo peržiūros `#4a4a4a`. Pvz., „ĮRANGA“ desktop 32→28 px, mobile 32→24 px; dalis kategorijų teksto antraščių taip pat sumažėjo. Mobile viršutinis logotipas apie 142→185 px. Nebeparyškinamas aktyvus navigacijos punktas. | Suderinti originalo antraščių vaidmenis, spalvas ir logotipo mastelį, išlaikant skaitomumą. Pikselių tikslumo nereikia. |
| VF09 | Spaudos ir slapukų puslapiai | Prieš originalo turinio antraštę papildomai įdedamas puslapio pavadinimas. Slapukų puslapyje pavadinimas kartojamas du kartus. Originalas buvo apie 720 px pločio ir centruotas, peržiūra – apie 1000 px, mažesnis tekstas. | Palikti vieną prasmingą H1 ir atkurti artimesnį teksto plotį bei lygiavimą, nekeičiant originalių žodžių ar URL. |

Papildomas smulkus skirtumas: originalo mobiliajame vaizde buvo matomas grįžimo į viršų mygtukas; peržiūroje jo nėra. Kontakto telefono / el. pašto eilutė po pagrindine nuotrauka peržiūroje pridėta papildomai. Tai aptariami skirtumai, o ne prarasti kontaktiniai duomenys.

Įrodymai:

- [Pagrindinis: originalas](D:/Core/output/signaturepads-migration-20261029/visual-audit-20261029/home-original-1440.png) · [peržiūra](D:/Core/output/signaturepads-migration-20261029/visual-audit-20261029/home-preview-1440.png).
- [Programinės įrangos katalogas: originalas](D:/Core/output/signaturepads-migration-20261029/visual-audit-20261029/software-original-1440.png) · [peržiūra](D:/Core/output/signaturepads-migration-20261029/visual-audit-20261029/software-preview-1440.png).
- [Kortelė užvedus pelę: originalas](D:/Core/output/signaturepads-migration-20261029/visual-audit-20261029/hardware-hover-original-1440.png) · [peržiūra](D:/Core/output/signaturepads-migration-20261029/visual-audit-20261029/hardware-hover-preview-1440.png).
- [Sigma: originalas](D:/Core/output/signaturepads-migration-20261029/visual-audit-20261029/sigma-original-1440.png) · [peržiūra](D:/Core/output/signaturepads-migration-20261029/visual-audit-20261029/sigma-preview-1440.png).
- [Spaudos puslapis: originalas](D:/Core/output/signaturepads-migration-20261029/visual-audit-20261029/press-original-1440.png) · [peržiūra](D:/Core/output/signaturepads-migration-20261029/visual-audit-20261029/press-preview-1440.png).
- [Slapukai: originalas](D:/Core/output/signaturepads-migration-20261029/visual-audit-20261029/cookies-original-1440.png) · [peržiūra](D:/Core/output/signaturepads-migration-20261029/visual-audit-20261029/cookies-preview-1440.png).

## Sutarti pakeitimai ir atmesti įtarimai

Šeši papildyti programinės įrangos aprašymai, jų šaltinių nuorodos ir metaduomenys yra savininko užsakyti pakeitimai. Krepšelio / Paysera atsisakymas ir dviejų nereikalingų pirmtako puslapių pašalinimas taip pat sutarti. NitroPack ženklo ir WordPress priklausomybių grąžinti nereikia.

Spaudos puslapio paveikslėlio praradimas nepasitvirtino: originale atskiro turinio paveikslėlio nėra. Pirminis įtarimas atšauktas perskaičius faktinį originalo vaizdą. Ten taisytinas antraštės dubliavimas ir išdėstymas. Originalo vaizdų skaičius savaime neįrodo trūkumo: jame yra alternatyvios nuotraukos užvedimui, logotipai ir 1×1 sekiklis.

Mechaninis Impeccable detektorius atliktas po naršyklės palyginimo. Vienintelis perspėjimas – `overused-font` dėl Open Sans; šį šriftą pagrįstai išlaikome pagal savininko pavedimą. Tai ne vizualinio atitikimo įrodymas. 32 pagrindiniuose vaizduose horizontalaus perpildymo nenustatyta; skirtingas maketas vis tiek išlieka. Tikras 200% browser zoom nepatikrintas, Lighthouse / visos WCAG atitikties balas nesuteikiamas.

## Tolimesnis žingsnis

Pirmiausia VF01–VF03, po to pagrindinio puslapio rėmeliai / antraštės ir katalogo valdikliai. Pataisas atlikti viena suderinta vietine partija, išlaikant originalius tekstus, kontaktus ir veikiančius adresus, tada vieną kartą patvirtinti paveiktus desktop / mobile vaizdus. Savininko ankstesnis nurodymas aptarti radinius lieka galioti. Ši ataskaita nesuteikia publikavimo leidimo ir nekeičia gyvos svetainės.
