# Domenų vertinimų ir prompto kokybės auditas

Data: 2026-09-30. Įvertinti 38 pasirinkti senos versijos pavyzdžiai iš 1 305 užbaigtų domenų, po to tikrai paleistas `gpt-6.1-sol / xhigh` bandymas su 20 tų pačių šaltinio domenų ir 4 kontroliniais pavadinimais. Kontroliniai domenai nėra pirminio sąrašo kandidatai ir į jo reitingą nepridėti. Ši kryptingai parinkta imtis nėra visų 45 324 domenų statistinis tikslumo įrodymas.

## Išvada

Ankstesnė versija daugumą aiškių temų atpažino tinkamai ir neaiškiems trumpiniams nefantazavo verslų. Tačiau mano prompto 12 žodžių riba beveik neleido pateikti verslo idėjos, o skalių aprašymas buvo per silpnas. Brangus produktas pernelyg dažnai gavo maksimalią vertę, modifikuotas raktažodis — maksimalų pavadinimo balą. Vien rizikos žyma nekeitė atrankos balo.

Naujas promptas ir skaičiavimo politika pateikia konkretesnes hipotezes: klientą, naudingą pirmą svetainę, galimą mokėtoją, alternatyvą, paklausos testą ir esminę kliūtį. Jis geriau atitinka portfelį, kuris pirmiausia matuoja tikrus poreikius, o paskui investuoja į pilną verslą. Tai audito vertinimas pagal pasirinktus kriterijus, ne įrodytas būsimas pelnas.

## Rastos silpnybės

| Sena išvada | Kas buvo silpna | Patikslinimas |
| --- | --- | --- |
| `4stogai.lt`: 95, k=5 | Stogų tema gera, tačiau skaičiaus priedas nėra grynas raktažodis | Pavadinimo tipas `modified`, k≤3; nuo temos atskirtas visas pavadinimas |
| `paskola247.lt`: 91, k=5, v=5 | Skaičiai, didelė paskolos suma ir semantikos aiškumas per stipriai pakėlė prioritetą | Modifikacija, partnerio priėmimas, komisinio įvykis ir ekspertinio pasitikėjimo poreikis |
| `informacijosapsauga.lt`: 96, d=5, v=5 | Plačios informacijos/saugos temos reikšmės ir B2B pasitikėjimas buvo per menkai atskirti | Galimų ketinimų skirtumas, mažos įmonės siauras poreikis, ekspertinis turinys ir tikrintinas atlygis |
| `psoriasis.lt`: 83, d=4, s=4 | Ligos termino aiškumas nėra gydymo pirkimo ar lengvo SEO įrodymas | LT kalbos atitikimas, informacinis ketinimas ir medicininės peržiūros sąnaudos |
| „Aiškus raktažodis, tinka užklausoms“ | Neaišku, kas mokėtų ir ką statyti | Atskiri `u/p/e/z/h/l` laukai bei ilgesnis argumentas |

Google domeno žodžius laiko vienu iš daugelio signalų ir riboja pernelyg didelę tikslaus domeno įtaką. Todėl pavadinimo atitikimas nėra savaime aukštų pozicijų įrodymas. [Google reitingavimo sistemos](https://developers.google.com/search/docs/appearance/ranking-systems-guide). Sveikatos ir finansinio saugumo temose patikimumui tenka daugiau reikšmės; tai pagrindžia ekspertinių prielaidų įtraukimą, tačiau nenustato mūsų pasirinktų skaitinių koeficientų. [Google turinio patikimumas](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

## Tikras palyginimo bandymas

Balai palyginti pagal dvi skirtingas metodikas: nauja versija taip pat vertina starto tinkamumą. Pokytis neinterpretuojamas kaip tokio pat dydžio rinkos vertės ar paklausos pokytis.

| Domenas | V3 | V4 | Naujo vertinimo esmė |
| --- | ---: | ---: | --- |
| miniekskavatoriai.lt | 95 | 92 | Konkretus nuomos poreikis, tūrio skaičiuoklė, technikos grafikas ir transporto ekonomika |
| plastikiniailangaikaune.lt | 91 | 87 | Natūrali ilga vietinė frazė, matmenys ir montavimo apimties palyginimas |
| mediniunamustatyba.lt | 89 | 79,2 | Aiškus rangovo poreikis, ilgas pardavimo ciklas ir pasiūlymų rengimo vertė |
| 4stogai.lt | 95 | 63 | Stogdengio užklausa išlieka pagrįsta; pavadinimas modifikuotas |
| informacijosapsauga.lt | 96 | 61,2 | Specialistui apibrėžtas saugos poreikis, pasitikėjimas ir duomenų atskleidimo kliūtis |
| paskola247.lt | 91 | 48,4 | Komisinis priklausytų nuo sutarties bei partnerystės, o ne vien užklausos |
| psoriasis.lt | 83 | 29,2 | Informacinis medicininis gidas su peržiūra, ne savaime aukštos vertės gydymo užklausa |
| snf.lt / illww.lt | 0 | 0 | Neišgalvota konkreti strategija |

Kontrolės: `padangos.lt` 85, `pervezimas.lt` 83,5, `padangostraktoriams.lt` 79,2, `statyba.lt` 65,5. Tai tik kalibravimo pavyzdžiai. Natūrali ilga produktinė frazė gavo k=5; skaičiumi modifikuotos frazės k=3. Nė vienai iš 24 išvadų nereikėjo programinio balų mažinimo dėl modelio pažeistų kalibravimo ribų.

Pavyzdinė konkreti idėja `miniekskavatoriai.lt`: tranšėjos tūrio skaičiuoklė ir pravažiavimo pločio gidas; užklausa su vieta, datomis, nuomos trukme, technikos bei operatoriaus poreikiu. Nuomotojas galėtų mokėti už jo laisvam laikui tinkamą užklausą. Transportas ir trumpi užsakymai gali panaikinti tarpininko atlygį. Tai naudinga tikrintina hipotezė, ne esamo tiekėjo ar maržos faktas.

Paleidus pilną v4 eigą, papildomai perskaityta 10 aukščiausiai įvertintų iš pirmų 24 naujų rezultatų, kurie nebuvo palyginimo bandyme. `anglukalbospamokosinternete.lt` atskiria mokinio tikslą bei grafiką ir kartotinių pamokų vertę; `telsiutrinkeles.lt` atskiria medžiagų pirkėją nuo klojėjo ieškančio kliento; `pabegimo-kambarys.lt` įtraukia grupės sudėtį ir laiką, tačiau įspėja apie vienkartinio užsakymo derinimo sąnaudas. Šiuose pavyzdžiuose vertės kelias konkretesnis ir neapribotas vien prompto kalibravimo pavadinimais. Tai papildoma kokybinė peržiūra, ne aklas ar statistinis testas.

## Ką dar tikrinti

Semantikos aiškumas atskirtas nuo paieškos populiarumo. Vis dar nematuoti paieškos kiekiai, SERP, CPC, tikras komisinis, partnerio sutartis ir nišos ekonomika. Kai kurioms informacinėms/pramoginėms temoms poreikio formos idėja gali būti silpnesnė už turinio vartojimo ar prenumeratos signalą; žemas balas nepadaro kiekvienos sugeneruotos idėjos verta įgyvendinti. Ekspertinių sričių žemesnis starto prioritetas nepaneigia jų galimos vertės vėlesnėje portfelio fazėje.

Mažas bandymas rodo geresnį išvadų konkretumą ir norimų kalibracijos taisyklių laikymąsi. Jis nėra nepriklausoma modelio tikslumo patikra ar visas nišų rinkos tyrimas. Prieš pirkimą finalistams reikia DR, nuorodų, istorijos, prieinamumo ir konkretaus paieškos ketinimo patikros; prieš plėtrą — realios paklausos.

## Versijos ir įrodymai

- Promptas: [domain_strategy_v4.md](prompts/domain_strategy_v4.md).
- `verification/strategy-review/before.json`: 38 senos versijos pavyzdžiai; 1 305 domenų distribucijoje 156 turėjo ≥75 balus, 8 turėjo ≥90, mediana 40,8.
- `verification/strategy-review/comparison.json`: tikri 24 išvadų duomenys, sena/nauja reikšmė, modelis ir naudojimas.
- `output/archive/2026-09-30-v3-before-strategy/`: senos versijos CSV/XLS, DB kopija, metodika ir promptas.
- Naujas reitingas: viena v4 metodika; senas CSV naudojamas tik pirmiau peržiūrimų kandidatų eilei, jo balai neperkeliami.
- Modelis lieka `gpt-6.1-sol / xhigh`. Bandymo išvesties naudojimas 30 815 tokenų; patikimos USD kainos CLI neteikia. Detalesnė analizė turi didesnį naudojimą, todėl pasirinkta mažesnė 6 domenų grupė.

Programiniai testai tikrina schema/ID, versijų atskyrimą, kalibravimo ribas, CSV/XLS išvestis ir duomenų saugojimą. Jie neįrodo, kad kiekviena verslo hipotezė teisinga.
