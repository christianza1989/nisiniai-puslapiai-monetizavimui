# .lt domeno prieinamumas prieš pirkimą ir perdavimą · 2026-10-08

Klausimas: ar expired sąrašas ir aukštas AI balas reiškia, kad .lt domeną jau galima įsigyti ir iš karto perduoti verslo pirkėjui? Ne. [VISION](../../VISION.md) ir [klasifikatoriaus README](../../../domain-sorter/README.md) jau reikalauja atskiros prieinamumo patikros; šis tyrimas konkretina nemokamą .lt būsenos kelią. Siūlomas [BDEV-0003-P3](PILOT.md), **proposed**, esamos portfelio krypties papildymas, ne nauja niša / naujas BDEV ID. Kiti TLD turi savo taisykles; 45 tūkst. sąrašo nelaikome vien .lt.

## Patikrinti pirminiai šaltiniai

[DOMREG karantino paaiškinimas](https://www.domreg.lt/duk/domenu-turetojams/kas-yra-karantinas/) nurodo 30 kalendorinių dienų po būsenos žymės: pirmoji skaičiuojama diena yra kita diena. Jei pabaiga ne darbo dieną, ji pasislenka į kitą darbo dieną. Karantino metu atkūrimo teisę turi ankstesnis turėtojas / teisėtas perėmėjas; ji nėra trečiosios šalies pirkimo teisė.

[DOMREG paleidimas į apyvartą](https://www.domreg.lt/duk/domenu-turetojams/kada-domeno-vardas-po-karantino-patenka-i-apyvarta/) nurodo atsitiktinį momentą per 24 valandas po išregistravimo, jeigu ankstesnis turėtojas domeno neatkūrė. Vien numatyta kalendoriaus diena nėra garantuotas registravimo laikas ar rezervacija.

[DOMREG informacijos gavimas](https://www.domreg.lt/duk/paslaugu-teikejams/kaip-gauti-informacija-apie-domenus/) dokumentuoja DAS `das.domreg.lt:4343`, būsenos užklausą `get 1.0 domenas\n` ir būsenų sąrašą. DAS skirtas dažnesniems automatiniams tikrinimams; jis pateikia būseną. Tekstinio WHOIS prievadas 43 ribojamas iki 100 užklausų per 30 minučių, viršijus blokuojamas IP. Todėl 45 tūkst. skenavimas per WHOIS nėra tinkamas mažiausias bandymas. Mes nesame nustatę viso sąrašo TLD sudėties, DAS pasiekiamumo šiame tinkle ar išmatuoto našumo. Nevykdėme nė vienos TCP domeno užklausos; prieinamumo niekam nepriskiriame.

[DOMREG teisių perleidimas](https://www.domreg.lt/duk/domenu-turetojams/kaip-perleisti-teises-i-domena-kitam-asmeniui/) nurodo 30 kalendorinių dienų ribą nuo įkūrimo, paskutinio perleidimo ar atkūrimo karantine. Inicijuotą procedūrą įgijėjo teikėjas užbaigia per 7 kalendorines dienas; vien inicijavimas nėra naujo turėtojo įrašas. Nurodyta svarbių priežasčių išimties prašymo galimybė nėra mūsų gauta išimtis. Tai registratoriaus procedūros faktai, ne visos būsimos pardavimo sutarties priėmimas. Parduodamo turto apimtis ir perdavimo data turi būti tikros.

## Deduplikacija ir sprendimo vertė

[M9](../../../agent-business-core/ROADMAP.md) jau numato perleidžiamą paketą, o [P2](../2026-10-03-transfer/PILOT.md) tikrina sintetinių dviejų nišų duomenų eksportą/atkūrimą. P3 nepakeičia P2: registravimo būsenos patikra nėra duomenų izoliacija. [Pardavimo kanalo tyrimas](../2026-10-07-sale-channel-cost/RESEARCH.md) apima prekyvietės mokesčius, ne .lt registravimo/procedūros būsenas. Nauja detalė — DAS vietoje didelės WHOIS partijos ir klaidingo „expired = laisvas“ sprendimo atmetimas.

Ribota paieška dabartinio pagrindinio checkout `domain-sorter/`, `domain-history/`, `agent-business-core/` koduose/MD nerado konkrečių `das.domreg.lt`, `whois.domreg.lt` ar `pendingRelease` integracijos atitikmenų; tai ne visų repo / kitų šakų auditas. Klasifikatoriaus DB, prioritetai, worker ir source sąrašas nekeičiami. P3 numatomas privatus atskiras laboratorijos katalogas, integracija su vykdytoju tik vėliau po koordinavimo.

Nauda: operatorius prieš išleidžiant domeno / kūrimo kapitalą atskiria registruojamą kandidatą, laukiamą domeną, jau registruotą domeną ir nežinomybę. Pirkėjas gauna pagrįstą perleidimo etapą. Kiek išlaidų tai sutaupys, kiek domenų laisvi ir kokia jų verslo paklausa, nežinoma. AI balas ir registro būsena nėra teisės į vardą, SEO ar pelno garantija.

Alternatyvos: nieko nekeisti ir kiekvieną finalistą tikrinti ranka registratoriuje (tinka keliems domenams, darbo sąnaudos nežinomos); mažas privatus DAS bandymas (siūlomas); mokama gaudymo paslauga arba viso sąrašo nuolatinis skeneris (nereikia pirmam bandymui, išlaidos / teikėjo sąlygos nepatvirtintos). Nei EPP akreditacija, nei gaudymas nepridedami.

Mažiausia apimtis — iki vienos agento darbo valandos P3 laboratorija su penkiais sintetiniais atsakymais ir ne daugiau 10 pasirinktų .lt vardų vienkartinėmis tik būsenos užklausomis; detalės [PILOT](PILOT.md). Tai laiko/užklausų stabdymo riba, ne darbo trukmės ar našumo pažadas. Naujos prenumeratos ar registravimo mokestis nereikalingi; realus agento ir kompiuterio laikas bei TCP pasiekiamumas nežinomi. Priėmimas — tik `available` žymi vienkartinę registravimo galimybę, kitos/neteisingos būsenos ir ryšio klaida nesukuria „laisvas“; būsena turi šaltinį/laiką ir domeno tapatumą. Stabdyti ties ribomis, užrakinimu, prieigos/spend poreikiu ar konfliktu su kitu vykdytoju. Jokio realaus domeno pirkimo/perleidimo ar 45 tūkst. partijos.

## Savininko sprendimų prieiga šiame cikle

Codex `read_thread` įrankio dabartiniame kataloge nėra; kvietimai nepavyko. Skaityti tik paskutiniai 16 MiB dviejų žinomų root/core vietinių JSONL žurnalų, filtruotos vartotojo žinutės, be įrankių išvesčių ir konfigūracijos. Root naujausias rastas žmogaus pranešimas 2026-10-07 06:12 UTC apie Vercel; core — 06:32 UTC traktorių balso pavedimas. Jie nepakeitė šios sesijos approval. Ribotas tail nėra garantija dėl visos istorijos / kitų sesijų. Pirmas viso root žurnalo skaitymas nepavyko dėl Node eilutės dydžio; pakeistas ribotu tail. Žali žurnalai į tyrimą/Git nekopijuoti.

Tyrimas ir pasiūlymas dokumentuoti; P3 kodas/TCP/lab/registravimas nevykdyti. P1/P2/BI lieka proposed; savininko sprendimo nepriskiriame iš agentų būsenos ar šių šaltinių.
