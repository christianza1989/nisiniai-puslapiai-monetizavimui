# Viena pasikartojanti ataskaita kaip BI verslo bandymas

Tyrimo data: 2026-10-01, Europe/Vilnius. Sesija `01a0f67b-b3e3-7062-ad1b-66a8737443db`. Rezultatas: [BDEV-0002](../../ideas/BDEV-0002.md), **proposed**. Tyrimas nėra paslaugos pajėgumo ar paklausos validacija.

## Sprendimas ir mokėtojas

Siūlau `businessintelligence.lt` bendrą ataskaitų automatizavimo hipotezę konkretinti iki vieno perkamo rezultato: viena reguliariai rankomis ruošiama pardavimų suvestinė iš vieno stabilaus CSV/Excel eksporto, atnaujinama kliento jau naudojamoje Windows Excel aplinkoje. Rezultatui priklauso sutartos rodiklių taisyklės, šaltinio sumų sutikrinimas, netinkamų failų aptikimas, instrukcija ir patikra su kitu laikotarpiu. Tai vienkartinio įgyvendinimo atlygio modelis; nuolatinis serveris ar nauja prenumerata nėra pradinė priklausomybė.

Pirkėjas ir mokėtojas: Lietuvos įmonė, kurios vadovas ar administratorius kartoja tą pačią suvestinę ir turi teisę užsakyti jos sutvarkymą. Atranka pagal konkretų darbą. Tam tikro įmonių dydžio ar sektoriaus paklausos neįrodėme. Mūsų pajamos būtų atlygis už įgyvendinimą, ne tiekėjo apyvarta ar lead mokestis.

Siūlomas **bandymas**, nes vienas eksportas padeda riboti apimtį ir tikrinti rezultatą. Lietuvoje jau yra labai panašus pasiūlymas, todėl išskirtinumą ir norą mokėti dar reikia įrodyti. Antro ID dėl failo tikrintuvo ar pardavimo modulio nekuriu: jie dubliuotų esamą poreikio paruošimo / acquisition planą.

## Dabartinio projekto peržiūra ir nedubliavimas

Perskaityta 2026-10-01:

| Faktinis šaltinis | Dabartinė išvada |
|---|---|
| [BI brief](../../../sites/businessintelligence.md), `content-studio/data/sites/businessintelligence.json` tikslinė paieška | Yra bendra planavimo hipotezė. Konkretaus vieno šaltinio paketo, kainos, vykdymo ar klientų įrodymo nerasta. |
| [Acquisition](../../../ACQUISITION_CORE.md), [tyrimas](../../../research/client-acquisition-2026-10-01/RESEARCH.md), [pilotai](../../../research/client-acquisition-2026-10-01/PILOTS.md) | BI minima kanalų lentelėje; pirmi konkretūs pilotai yra svetainės, auksarankiai ir padangos. Experiment / Outcome / partnerių kelias jau suplanuoti. |
| [Auksarankių BUSINESS](../../../sites/auksarankiams/BUSINESS.md) | Vykdymo partneriai ir lead ekonomika nepatvirtinti. Skaitmeninė paslauga galėtų sumažinti išorinio vykdytojo priklausomybę; jos pačios vykdymo dar neįrodėme. |
| [Architektūra](../../../agent-business-core/ARCHITECTURE.md), [roadmapas](../../../agent-business-core/ROADMAP.md), [runtime README](../../../agent-business-core/runtime/README.md) | Bendras case / pašto / sąnaudų pagrindas yra; dalis roadmapo tekstų istoriniai. Kitos nišos pardavimo lab nėra BI pajėgumo įrodymas. |
| [profiles.py](../../../agent-business-core/runtime/src/pinet_core/profiles.py), [models.py](../../../agent-business-core/runtime/src/pinet_core/models.py), [lead_import.py](../../../agent-business-core/runtime/src/pinet_core/lead_import.py) | Peržiūros metu du typed profiliai: greitossvetaines, traktoriupadangos; BI profilio nėra. Yra scoped Case / CaseSource ir D1 importo sutartis. Naujo CRM tyrimui nereikia. Production importas šiame darbe netestuotas. |
| `C:/Users/lenovo/Documents/dovanos-memorycasting/config/niche-network.json` | Actual MB Pinet / info@pinet.lt, `networkLiveDomains` tuščias. Tai šio core žurnalo būsena, ne DNS / visų domenų nuosavybės patikra. |
| `C:/Users/lenovo/Documents/dovanos-memorycasting/drizzle/0004_niche_leads.sql` | Yra tekstinis message / source_path. Poreikio aprašymui pakanka; saugaus kliento failų upload ši schema neįrodo. |

`sites/README.md` yra senas registras: keli lokaliai sukurti domenai ten vis dar planuojami. Jo neredagavome ir nenaudojome aktualaus paleidimo įrodymu. PDF / artefaktų priemonės neįrodo mūsų Power Query failo, kliento rodiklių išmanymo ar ataskaitos tikslumo.

Naujumas **projekte**: vieno šaltinio paketo apimtis, kliento aplinka, dviejų laikotarpių priėmimas ir darbo laiko / kainos bandymas. Tai esamos BI hipotezės konkretinimas, ne naujas domenas ar rinkoje unikalus produktas. [Registre](../../IDEAS.md) iki tyrimo tik BDEV-0001; jis lieka root vykdymui.

## Pirkimo ketinimas

Tirtos užklausos: „Excel ataskaitų automatizavimas“, „Power BI paslaugos kaina“, „Excel automatizavimas paslaugos Lietuva“. Rezultatuose paslaugų paketai, specialistai ir klientų užklausos. Paieškos apimčių, reklamos CPC ir naujo domeno pasiekiamo srauto neturime.

Originaliame [Paslaugos.lt klientų užklausų puslapyje](https://paslaugos.lt/uzklausos/microsoft-office-excel-specialistai) peržiūrėtos anonimiškai apibendrintos kategorijos:

- 2026-08-24 Excel automatizavimo poreikis: sustabdytas, radus teikėją.
- 2026-07-14 Excel transformavimas / CRM sinchronizavimas: sustabdytas, apimtis platesnė už paketą.
- 2026-04-26 finansų kontrolės Excel failų automatizavimas: sustabdytas. [Programavimo kategorija](https://paslaugos.lt/uzklausos/microsoft-office-excel-programavimas/vilniuje).

Tai istorinio pirkimo ketinimo pavyzdžiai, ne mūsų klientai, ne kontaktuotinų adresatų sąrašas ir ne apmokėti sandoriai. Kategorijoje yra mokymų ir nesusijusių darbų; bendras skaitiklis nėra mėnesinė paklausa. Miestų puslapiuose pasikartojantys įrašai nėra papildomi pirkėjai. Asmenų vardų / kontaktų / pilnų skelbimų nesaugota.

## Konkurentai ir pakaitalai

Originalūs puslapiai atverti 2026-10-01. Tai tiekėjų pasiūlymai, ne nepriklausomai patikrintas įvykdymas ar mūsų rinkos dalis.

| Pirminis šaltinis | Peržiūrėta | Poveikis sprendimui |
|---|---|---|
| [analytics.bi](https://analytics.bi/paslaugos/) | Vienas šaltinis nuo 900 €, 2–3 šaltiniai nuo 1 800 €. Failų atnaujinimas, sutikrinimas, instrukcija; nemokamas struktūros įvertinimas. PVM pagrindas neaiškus. | Tiesioginis panašus konkurentas. „Excel / vienas paspaudimas / be API“ nėra unikalus pranašumas. |
| [Analitika.lt](https://analitika.lt/) | 150 €/mėn. už 25 ataskaitų rinkinį; deklaruojamas diegimas be papildomo mokesčio. | Stiprus prenumeratos pakaitalas; licencijų / PVM įtraukimą reikia tikslinti. |
| [Analitika360](https://www.analitika360.lt/verslo-analitikos-kainos/) | Rivilė / Finvalda Basic: 59 €/mėn., 8 ataskaitos; PRO: 89 €/mėn., 20; individualūs darbai 70 €/h. | Atmesti klientą, kuriam pakanka turimo ar paruošto modulio. Rinkinys ir individualus darbas nepalyginami tiesiogiai. |
| [Excel Solutions](https://excelsolutions.store/lt) | Individualūs Excel įrankiai, ataskaitos, mokymai / priežiūra; vieno paketo fiksuota kaina nerasta. | Specialistų pasiūla yra, mūsų subrangos susitarimo nėra. |
| [Lexalytic UK](https://www.lexalytic.com/) | Excel / reporting nuo £300, BI nuo £550; fiksuota apimtis, perdavimas ir mokėjimas po demonstravimo. | Vienkartinio produkto pavyzdys. JK kainų / rezultatų ir mokėjimo rizikos neperkeliame automatiškai. |
| [Raporty24 PL](https://raporty24.pl/uslugi/automatyzacja-excel-power-query/) | Pasikartojantis failų paruošimas / Power Query; nemokama analizė, NDA siūlymas. Paketo kaina nepatvirtinta. | Gretimos rinkos pasiūla; konkretus procesas prieš įrankio pasirinkimą. |
| [Rivilė GAMA](https://www.rivile.lt/produktai/rivile-gama/moduliai/analitika-ataskaitos) | Sisteminės / papildomos ataskaitos, filtravimas, Excel/PDF eksportas. | Klientas gali jau turėti sprendimą. Patikrinti prieš parduodant. |

Tickbox originalaus teksto pakartotiniai skaitymai baigėsi timeout; £795 iš paieškos kopijos sprendimui nenaudojame. Soltus PDF paieškos ištrauka rodė seną BI licencijos įkainį; jo nenaudojame dabartinei kainai.

Prieštaraujantys įrodymai: panašus LT pasiūlymas jau yra, žemos mėnesinės pakaitalų kainos, seni pirkimo signalai, dažnas platesnių API / kelių sistemų poreikis. Pigumas nėra pakankamas pranašumas. Siauro paketo prasmę turi patvirtinti konkretus klientas ir priimtina vykdymo apimtis.

## Vykdymo ir duomenų ribos

[Microsoft Power Query](https://support.microsoft.com/en-us/excel/import-data-from-a-folder-with-multiple-files-power-query) dokumentuoja vienodos struktūros failų sujungimą iš aplanko. [Versijų lentelė](https://support.microsoft.com/en-gb/excel/power-query-data-sources-in-excel-versions?nochrome=true) nurodo Windows Excel 2016+ Power Query ir vietinių CSV / Excel / aplanko šaltinių palaikymą. Tai pagrindas ribotam paketui, ne mūsų testas. Konkretus leidimas, palaikymo būsena ir refresh kliento įrenginyje tikrinami atskirai; nesirenkame pasenusios versijos vien dėl jungties.

[Power BI kainodara](https://www.microsoft.com/en/power-platform/products/power-bi/pricing) skiria kūrimą ir dalijimąsi. LT puslapio atvėrimas nepavyko, tarptautinis rodė neaiškų valiutos simbolį; tikslios LT Pro kainos nefiksuojame. Jau tinkamą Excel turinčiam klientui papildoma BI prenumerata nebūtina. Jo turimos licencijos nėra „nemokamos“.

Paketas: vienas periodinis eksportas, viena stabili struktūra / formatas, iki 5 sutartų rodiklių, vienas vietinį atnaujinimą atliekantis naudotojas. PVM, grąžinimai, valiutos, eilutės / dokumento lygmens sumos ir teisingas rezultatas ateina iš kliento taisyklės. Pardavimų sumos nėra gautos pajamos ar pelnas.

Po idėjos patvirtinimo pirmas įrodymas būtų izoliuotas bandymas su sintetiniais dviejų laikotarpių failais ir tikru Excel atnaujinimu. Bibliotekos sugeneruotas failas be refresh nėra priėmimas. Iki šio įrodymo viešas veiksmas būtų skaidri išankstinė poreikio užklausa be pristatymo pažado.

Pradiniam poreikiui pakanka tikslo, proceso, dažnumo, šaltinio ir Excel versijos. Tikrų failų į bendrą formą nekeliame. Vėlesniam nuasmeninto pavyzdžio priėmimui reikia nustatyto saugojimo / prieigos / ištrynimo proceso. Gamybiniai asmens duomenys ir konfidencialūs failai neperduodami į AI pagal nutylėjimą. Darbas kliento aplinkoje kol kas siūloma savybė, ne įdiegta izoliacija.

## Pajamų modelių atranka

| Modelis | Mokėtojas ir rezultatas | Pasirinkimas |
|---|---|---|
| Vienkartinė apibrėžta paslauga | Įmonė už vieną veikiančią ataskaitą / perdavimą | Testuoti. Būtinas vykdymo ir apimties įrodymas. |
| Mėnesinis ataskaitų rinkinys | Įmonė už atsinaujinimą / priežiūrą | Atidėti: stiprūs konkurentai, mūsų hostingas / pagalba neįrodyti. |
| Valandinis mokymas / konsultacija | Užsakantis žmogus / įmonė už specialisto laiką | Pakaitalas paprastam poreikiui; mūsų kompetencijos neapsimesti turint. |
| Šablonas / skaitmeninis produktas | Failo pirkėjas už standartą | Po kelių panašios struktūros mokamų poreikių. |
| Priimta užklausa specialistui | Sutartas specialistas už kvalifikuotą lead | Atsarginis modelis. Sutarties / įkainio nėra; grąžina partnerio priklausomybę. |

## Ekonomikos jautrumas

Tik hipotetinis **450 €** atlygis tuo pačiu mokesčių pagrindu kaip sąnaudos, **30 €/h** darbo vertė ir **60 €** kitų kintamų sąnaudų (įsigijimas / AI / administravimas). Ne rinkos normos, ne savininko kainynas ir ne matavimai. h apima kvalifikavimą, kūrimą, tikrinimą, perdavimą ir taisymą; tų pačių valandų neįtraukti antrą kartą į 60 €.

| Visas laikas | 450 − h × 30 − 60 | Likutis prieš fiksuotas sąnaudas / mokesčius |
|---:|---|---:|
| 8 h | 450 − 240 − 60 | +150 € |
| 14 h | 450 − 420 − 60 | −30 € |
| 22 h | 450 − 660 − 60 | −270 € |

Lūžis 13 h. 10 h paliktų 90 €, bet ne visas fiksuotas sąnaudas / garantinį taisymą. 300 € atlygio riba tik 8 h; 450 € ir 40 €/h riba 9,75 h. Organinis srautas nenulina tyrimo / turinio laiko ir turima prenumerata nenulina AI naudojimo.

Kliento hipotetinė 1 h/savaitę nauda po 20 €/h sudarytų 80 € per keturių savaičių ciklą; 450 € padengtų apie 5,6 ciklo. Jei sutaupoma tik 15 min., 20 € per ciklą ir 22,5 ciklo. Tai nėra klientų duomenys ar ROI pažadas. Esamo ERP filtro sutvarkymas gali būti pigesnis ir naudingesnis.

## Mažas bandymas ir falsifikacija

Po patvirtinimo siūlomos pirmo vidinio etapo lubos **12 darbo valandų**, naujų prenumeratų / reklamos biudžetas **0 €**: vienas techninis pavyzdys, konkretus paketo brief ir kvalifikavimo / priėmimo taisyklės. Tai nėra visos svetainės trukmės pažadas ar leidimas pirkti Excel.

Komercinis bandymas tik realiai leistinu ir savininko autorizuotu platinimo keliu: vienas aiškus pasiūlymas / sintetinė demonstracija. Siūlomas 21 dienos langas nuo actual sklaidos pradžios, iki 5 savanoriškų pirkėjų pokalbių, 3 konkretūs pasikartojantys poreikiai ir bent 1 pasirengimas svarstyti raštu įvardytą kainą už aiškią apimtį. Slenksčiai mūsų eksperimentui, ne konversijos prognozė. Šis tyrimas nesuteikia kontaktavimo teisių; pasibaigusioms portalo užklausoms nerašome.

Pirmos fazės veiksmas: užregistruoti **vienos įvardytos ataskaitos automatizavimo poreikį**, aprašant procesą / dažnumą / šaltinį / Excel / rezultatą, be upload ar slaptažodžių. Kol vykdymas nežinomas, aiškiai rodoma išankstinė poreikio užklausa. Pilnam domeno Phase 1 lieka BUSINESS → istorija → ACQUISITION → turinys / dizainas → A–Z vartai; demo nėra užbaigta svetainė.

Pirmas actual pilotas: patvirtinta apimtis / duomenų ir sąskaitų tvarka, actual išdirbtos minutės, sumų kontrolė, kito laikotarpio refresh, kliento priėmimas ir faktiškai gautas atlygis. Pritarta kaina nėra įplauka. Vienas geras pilotas leistų antrą ribotą testą, ne visų nišų automatizaciją.

Stabdyti / keisti, jei ERP modulis sprendžia daugumą poreikių; nuolat reikia kelių šaltinių / API; nepavyksta refresh; nauda per maža kainai; actual taisymas / sąnaudos viršija priimtiną atlygį. Nesant actual sklaidos, nulis reiškia nepakankamą ekspoziciją. Keli vienodo formato mokantys klientai leistų vėliau tirti šabloną; neįrodytas mūsų vykdymas reikštų atskirą subrangos / lead modelio tyrimą.

## Tyrimo ribos

Nėra mūsų BI klientų interviu / įplaukų, vykdymo testo, partnerių sutarties, GSC/keyword apimčių ar domeno kontrolės patikros. Šiame darbe neįdiegta programų ir nekurta runtime. Sekretai / inbox neskaityti, trečiųjų šalių formos netestuotos ir žinutės nesiųstos. Faktai / hipotezės atskirti [SOURCES.json](SOURCES.json). Sprendimą patvirtinti idėją priima savininkas.
