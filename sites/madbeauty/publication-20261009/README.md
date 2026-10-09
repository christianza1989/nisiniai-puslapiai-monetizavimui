# Madbeauty: nuoseklus publikavimas per pusmetį

2026-10-09 savininkas pakeitė grupių išleidimą į nuoseklų kalendorių visam 295 straipsnių planui. Šis dokumentas pakeičia ankstesnes penkių bangų datas; tyrimas, URL ketinimai, H2, šaltiniai, originalios naudos reikalavimai ir būsimas vidinių ryšių tinklas išlieka.

[Interaktyvus visų 295 straipsnių kalendorius](MADBEAUTY-NUOSEKLUS-PUSMECIO-PLANAS.html) · [Data, valanda ir būsena lentelėje](PUBLIKAVIMO-KALENDORIUS.md) · [Visas rengimo briefas](PLAN.json) · [Kalendoriaus duomenys](PUBLICATION-CALENDAR.json).

Laikotarpis 2026-10-13–2027-04-06, Europe/Vilnius. Iki dviejų publikacijų darbo dieną 10:00 ir 16:00, iki vienos savaitgaliais 10:00; pilnos septynių dienų grupės turi 11–12 temų. Kiekvienas būsimas straipsnis turi atskirą momentą. Pagrindiniai gidai numatyti anksčiau už tęstines temas. Keturių sezoninių temų ankstesnės datos išlaikytos. 28 jau parengti būsimi bendrieji gidai pasirodys iki spalio 28 d.; 4 parengti sezoniniai gidai liks savo datomis. Trys istoriniai vieši gidai nekeisti.

## Parengimo ir publikavimo būsenos

35 straipsniai iš tikrųjų parašyti, peržiūrėti ir įkelti ankstesniame pakete; kitos 260 temos dar neparašytos. Nauja data neatlieka rašymo, vaizdų generavimo, faktų ar specialisto patikros. Konkretus nebaigtas straipsnis negali tapti viešas vien dėl atėjusios datos. Plano pabaiga yra savininko parengimo ir publikavimo tikslas, ne garantuotas Google indeksavimas ar reitingas.

[RELEASE-REVIEW.json](RELEASE-REVIEW.json) fiksuoja naują peržiūrėtą immutable paketą: 39 puslapiai / 35 gidai / tie patys 180 WebP failų. 25 būsimų straipsnių publishAt ir datePublished pakeisti, likusios 14 patvirtintų puslapių versijų tiksliai išlaikytos. Visas tekstas, vaizdai, nuorodų ID, šaltiniai, autoriai ir faktiniai teiginiai nepakito. Nauji pakeistų revizijų patvirtinimai gauti per bendrus editPage, recordEditorialReview, approveReviewedBatch ir releaseContent; seno paketo ar patvirtinimų hash rankiniu būdu netaisome.

Patikra: visų 295 unikalūs URL ir realūs studijos UUID; 292 skirtingi būsimi momentai; 176 kalendorinės dienos; root prieš support; sezonai; vietinio/UTC laiko ir DST bendras localPublishAt. Naujam paruoštų tekstų leidimui patikrinti tikri visų 180 vaizdų baitai ir 64 bendros viešos projekcijos būsenos prieš ir ties 32 pasirodymo momentais. Privačių naujų datų fragmentai peržiūrėti naudojant tikrą platformos rendererį. Istorinė tekstų/šaltinių/pikselių bei desktop/mobile peržiūra aiškiai išlaikyta kaip istorinė; nauja klinikinė peržiūra nevaidinta.

Privatus studijos kalendorius sutikrintas bendru reconcilePrivatePlan su visais 299 puslapiais (295 straipsniai + 4 pagalbiniai); article coverageTarget atstatytas į 295. 260 neparašytų puslapių datos bei full planningBrief atnaujinti izoliuotoje kopijoje. Originalus rašymo tenant ir 75aa78 leidimas neperrašyti. Toliau rašymui naudoti šį naują kalendorių ir izoliuotos studijos kelio koordinavimo įrašą; actual gpt-6-luna / xhigh ir ImageGen modelių įrodymai bei visi review vartai lieka.

Eksportas dar nėra actual-domain diegimas. Platformos agentas priima paketą ir atskirai patikrina faktinę produkcijos bazę, bindings, saugyklą bei domeno HTTP. Privatus release-manifest.json laikomas vietoje ir neįtraukiamas į Git ar public assets.

## Tolimesnis turinio rengimas

Šiame pokalbyje įjungta aktyvi „Madbeauty pusmečio turinio rengimas“ heartbeat automatizacija: pirmadieniais ir ketvirtadieniais 09:00 pagal vartotojo Europe/Kiev laiko juostą. Kiekvienas vykdymas užbaigia iki 6 artimiausių įvykdomų temų, tikslas — bent dviejų savaičių parengto turinio atsarga. Tai šio projekto darbo partija, ne visų nišų taisyklė. Vykdymas privalo naudoti tikrą gpt-6-luna/xhigh, ImageGen, šaltinių ir revizijų peržiūrą bei atskirą actual-domain diegimą. Pasikartojantis agento darbas nesuteikia garantijos, kad trūkstama kvalifikuota peržiūra automatiškai bus atlikta. Įvykdžius visą apimtį rengimas sustabdomas; užbaigtų tekstų, neišspręstų vartų ir diegimų žurnalas turi būti atnaujinamas kiekvieną vykdymą.

Atkurti kalendorių: `node sites/madbeauty/publication-20261009/build-calendar.mjs`. Naujas release rengiamas tik aiškiai nurodytoje izoliuotoje studijoje su konkrečiu seno paketo SHA; ankstesnis export/review nekeičiamas.

Pastebėta core sutarčių spraga: reconcilePrivatePlan coverageTarget reikalauja visų puslapių skaičiaus (299), nors straipsnių coverageTarget turi būti 295. Šioje užduotyje po transakcijos taikytas bendras editSite, išlaikantis 295. Tai apibrėžimų neatitikimas; jo bendras pataisymas nėra slapta visų nišų migracija.
