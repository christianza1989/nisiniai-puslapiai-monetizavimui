# Sendparcel v1 patikslinimas — 2026-10-14

Šaltiniai: savininko pateiktas tiekėjo IT atsakymas ir tą pačią dieną perskaityta [oficiali API dokumentacija](https://api.sendparcel.com/rest-api/doc), OpenAPI2.0.1. Ankstesnė 2026-10-12 dokumentacijos interpretacija apie JWT šiam v1 ryšiui nebegalioja; istorinis tyrimas nekeičiamas.

V1 adapteriui būtinas atskiras staging arba production API raktas `apiPassword`; siunčiama tik `password` antraštė. JWT, Bearer, v2 login ir v2 pasiūlymų ID nenaudojami. IP allowlist nereikia. `/rest-api/quotes` pasiūlymo `product.id` tampa `product_id` kuriant užsakymą. `total_price.amount_in_cents` yra galutinė EUR kaina su PVM ir mokesčiais. Draudimas automatiškai nepridedamas.

Nauja 0023 migracija prideda bendrą per-raktą ribojimą. 2026-10-16 tiekėjas patikslino, kad vienos užklausos per sekundę limitas galioja visiems /rest-api/* keliams, įskaitant quotes; tai pakeičia ankstesnę išimtį. D1 lease serializuoja visas v1 užklausas ir po atsakymo palieka bent vieną sekundę iki kitos užklausos. Ta pati credential apimtis galioja skirtingoms parduotuvėms ir Worker procesams; DB saugomas tik SHA-256, ne raktas. Užimta / po nutrūkimo likusi lease blokuoja siuntimą, o 429 grąžinamas kaip sanitizuota klaida be automatinio POST kartojimo. Senos migracijos neperrašytos.

Pasiūlymas galioja maždaug 20 min.; vidinė priėmimo riba lieka 15 min., prieš pirmą registraciją būtina nauja kaina. V1 neturi kliento order ID / idempotency key ar paieškos pagal juos. Vienas kūrimo POST, originalus atsakymas privačiame `shipment_observations`, siuntos ID bei ryšys su mūsų order išsaugomi. Nutrūkus atsakymui — unknown ir faktų sutikrinimas pagal tiekėjo ID; naujas POST savaime nekuriamas.

Paštomatams leidžiama viena pakuotė, išimtis DPD Estijoje — iki penkių. Riba taikoma siuntėjo ir gavėjo paštomatui prieš quote / create. Postboxes užklausa neturi country filtro; šalis atrenkama vietiškai po pilnos puslapių patikros.

Dokumentai gaunami per `/rest-api/orders/documents`, kaip nurodo faktinė OpenAPI schema. `file_name` išsaugomas kaip privatus tiekėjo faktas, PDF patikrinamas ir laikomas privačioje saugykloje. `labelFileNames` ryšio konfigūracijoje turi tik tiekėjo atsakymu patvirtintus lipdukų failų vardus. Nežinomas vardas lieka dokumentu. Išsaugomi visi atpažinti lipdukų PDF pradine tiekėjo tvarka; vienas jų gali turėti kelis puslapius. Failų ar sekimo numerių kiekio sutapimas neįrodo konkrečiame lape išspausdinto numerio. Kol šio turinio susiejimas nepatikrintas, `parcelIndex` ir `trackingNumber` lieka null, `labelMappingVerified` — false; bendras siuntos numeris nepriskiriamas visoms pakuotėms.

Staging raktas gautas 2026-10-17; užregistruotos dviejų pakuočių siuntos dokumentai patikrinti toliau aprašytame bandyme. 2026-10-19 tiekėjas patvirtino CSV numerių ir Stickers dokumentų eiliškumą, tačiau konkretus numeris su lapu susiejamas tik pagal tikrą išspausdintą turinį. Šis adapteris tokio turinio įrodymo dar neturi ir automatinio susiejimo nepatvirtina. Patvirtinto ryšio `bookingAdmission.pricingProtocol: "v1_fresh_quote_no_insurance"` leidžia naudoti tiekėjo palaikomą naujo pasiūlymo protokolą. Jis neįjungia `costCeilingGuaranteed`: create atsakyme sumos nėra ir absoliučių galutinės nuskaičiuotos sumos lubų neįrodome. Kaina iš naujo tikrinama prieš vienintelį POST, draudimas nepridedamas, padidėjęs pasiūlymas sustabdomas. Faktinė nuskaičiuota suma vėliau sutikrinama su tiekėjo apskaitos dokumentais. DPD Estijos penkių pakuočių išimtis taikoma tik turint patvirtintą `serviceCouriers[serviceId]: "dpd"`, todėl vien DPD paštomato pasirinkimas jos nesuteikia kitam vežėjui. Raktas ir quote patikra atskiri nuo leidimo pirkti tikrą siuntimą. Production booking, quotes ir automatinis vykdymas šiame darbe neįjungti.

Memocasting abu 32 / 48 € rinkiniai dabar apima baltus dažus, atskiro dažų SKU pasiūlyme nebėra. Savininkas patvirtino pilnas pakuotes su dažais: poros 2 200 g / [200, 200, 170] mm, šeimos 4 500 g / [250, 250, 200] mm. Tai pakeičia ankstesnius 2 / 4 kg ir nežinomų matmenų faktus. Diegiamos svetainės katalogą ir patvirtintą `commerce-core/config/memocasting-business.json` valdo diegimo savininkas; pagrindinėje modulio šakoje šis paruošimo failas dar turi ankstesnių nežinomų laukų ir nėra produkcinio katalogo kopija. Priimant bendro adapterio pataisas jo negalima aklai perkelti į veikiančią parduotuvę. Seni užsakymų duomenys ir testinės parduotuvės DB nekeičiami.


## Testinės paskyros prieiga · 2026-10-17

Tiekėjas suteikė atskirą staging API raktą ir patvirtino testinį automatinį apmokėjimą bei 500 testinio kredito. Raktas saugomas tik privačiai, ne šiame dokumente. Sukurtas užsakymas nėra iš karto galutinės būsenos: staging registravimo ciklas maždaug 5 min., production maždaug 1 min. Tikrinti būseną vėliau, nekartoti create dėl laikinos būsenos. Testinės kainos ir paslaugų ID negali tapti production politika. Production raktas išduodamas atskirai po bandymų; šis laiškas neįjungia mokamų siuntų, paskyros papildymo ar kredito sutarties.


### Vėlesnio adresų atsakymo palyginimas

Tikras staging create atsakymas grąžino originalias lietuviškas gatvių raides, tačiau vėlesnis infos tas pačias gatves grąžino be diakritikų. Tik LT adreso line1 palyginime leidžiama tiksli lietuviškų raidžių transliteracija; originalus įvesties ir tiekėjo atsakymo tekstas išsaugomi. Namo, korpuso, buto numeriai, line2, gavėjo vardas, šalis, miestas, telefonas ir pakuotės lieka tikrinami kaip anksčiau. Kitoje šalyje ši išimtis negalioja. Tai ne leidimas ignoruoti nesutampantį adresą.


### Patikrintas testinis atsakymas · 2026-10-17

Vienas testinis dviejų pakuočių siuntimas po asinchroninio apdorojimo grąžino status2, dviejų puslapių Stickers.pdf ir vieno puslapio Manifest.pdf. PDF parašas ir visas formatas patikrinti, abu etikečių puslapiai perskaityti ir atvaizduoti. Tai tik staging kainų ir dokumentų įrodymas. Bendras tracking_number yra dviejų numerių kableliais atskirta eilutė, o parcels atskirų numerių neturi. Seka neperkeliama į trackingNumbers be tiekėjo patvirtinimo; bendras etikečių failas saugomas kaip etikečių rinkinys, dokumentų skaičius nėra pakuočių skaičius. Tiekėjo paprašyta patvirtinti šią tvarką ir suteikti atskirą production raktą.

Kai /tracks grąžina tik netuščius from ir to tekstus, be kitų laukų, tai priimama kaip tuščia nuskaitymų istorija. info:null, netaisyklingi įvykiai, error ar kiti netikėti laukai neatleidžiami nuo patikros. Šis pakeitimas nekuria fiktyvaus nuskaitymo ar pristatymo įvykio.

### Kelių pakuočių numeriai ir PDF rinkiniai · 2026-10-19

Tiekėjas patvirtino, kad bendro `tracking_number` lauko CSV numeriai seka Stickers dokumentų tvarka, o kurjeris gali grąžinti vieną kelių puslapių PDF arba kelis PDF. `trackingCandidates` išsaugo pilną, unikalų tiekėjo numerių sąrašą ir jo šaltinį `parcel_fields`, vienos pakuotės bendrą `order_single` arba `order_csv`. CSV kandidatams reikalingas tikslus pakuočių kiekis, 3–200 ženklų ASCII numeriai be tarpų ar valdymo simbolių, be pasikartojimų ir tuščių dalių. Neatpažinta santrauka lieka nesusieta; originalus atsakymas nekeičiamas. CSV nėra automatiškai perkeliamas į senąjį per-pakuočių `trackingNumbers` lauką.

Visi lipdukų dokumentai išsaugomi nekeičiant baitų ir tiekėjo eiliškumo. `providerDocumentIndex` žymi dokumento vietą visame atsakyme, `labelDocumentIndex` — vietą tarp lipdukų PDF; nė vienas nėra pakuotės ar puslapio numeris. Lipdukų PDF turi `unverifiedBundle:true`, `parcelIndex:null`, `trackingNumber:null` ir `labelMappingVerified:false`. Tai taikoma ir tada, kai atskirų PDF bei numerių skaičiai sutampa: vien kiekių neužtenka tikram išspausdintam turiniui įrodyti. Numerių kandidatai įrašomi kaip atskiras nekintamas stebėjimas, nepriskiriant jų failams ar puslapiams.

Automatinis PDF skaidymas, teksto atpažinimas ir patvirtintas puslapio–pakuotės susiejimas šia pataisa nesukuriami. Operatorius gali gauti visą originalų PDF rinkinį ir patikrinti išspausdintus numerius. Istoriniai stebėjimai neperrašomi; senesnio kodo failų skaičiumi pagrįstas `labelMappingVerified` netampa nauju išspausdinto turinio įrodymu.

### Vėluojančių lipdukų gavimas · 2026-10-19

`ShipmentRegistered` įvykis nebaigiamas, kol tiekėjas dar negrąžino nė vieno žinomu failo vardu atpažinto lipduko. Tuščias dokumentų atsakymas arba vien manifestas palieka įvykį patvarioje laukimo būsenoje; kita patikra leidžiama po 60 s. Realią patikros minutę lemia įjungto užduočių vykdytojo dažnis. Laukimas išlieka po Worker paleidimo iš naujo ir neišnaudoja penkių įprastų klaidų bandymų. Jis niekada nekartoja siuntos kūrimo POST.

Jei per 24 val. nuo registravimo įvykio lipdukų vis dar nėra, įvykis pereina į operatoriui matomą klaidos būseną `carrier_documents_timeout`. Operatorius turi patikrinti tiekėjo faktus ir prireikus pakartotinai paleisti esamą dokumentų gavimo užduotį, nekurdamas naujos siuntos. Kiekviena sėkminga dokumentų patikra palieka nekintamą `document_collection` stebėjimą. `labelsAvailable` reiškia, kad gautas bent vienas atpažintas lipdukų dokumentas; tai nepatvirtina visų pakuočių puslapių ar išspausdintų sekimo numerių susiejimo.

### Neapmokėtas arba laukiantis tiekėjo užsakymas · 2026-10-20

Svetainės sesija perskaitė pirminio susirašinėjimo Godos 2026-10-19 08:22 atsakymą: automatinis apmokėjimas jau įjungtas, o nepakankant piniginės lėšų pradinis užsakymas lieka neapmokėtas. Toks atsakymas nėra leidimas pakartoti `/orders/creates`. Patvirtinti kodai taikomi tiek kūrimo atsakymui, tiek to paties ID `/orders/infos`:

| Kodas | Tiekėjo būsena | Prekybos komandos būsena | Dokumentų gavimas |
| --- | --- | --- | --- |
| 0 | Sukurtas, laukia automatinio bandymo | `unknown`, `carrier_booking_pending` | Dar neleidžiamas |
| 1 | Vykdomas | `registered`, `processing` | Leidžiamas, bet lipduko buvimą patvirtina tik pats dokumentas |
| 2 | Patvirtintas | `registered`, `confirmed` | Leidžiamas |
| 3 | Atmestas | `review`, `carrier_booking_rejected` | Neleidžiamas |
| 4 | Atšauktas | `review`, `carrier_booking_canceled` | Neleidžiamas |
| 5 | Užregistruotas, neapmokėtas | `review`, `carrier_booking_unpaid` | Neleidžiamas |
| 6 | Laukiantis | `unknown`, `carrier_booking_pending` | Dar neleidžiamas |
| 8 | Apmokėjimas atšauktas | `review`, `carrier_booking_payment_canceled` | Neleidžiamas |

Neaprašytas kodas7, tekstinis kodas ar netaisyklingas atsakymas atmetamas. `bookingState` yra tiekėjo būsenos projekcija; ji nekeičia pirkėjo `payment_state` ir pati nepatvirtina, kad vežėjui sumokėta. Naudojamos esamos SQL būsenos; naujos migracijos nereikia.

`execute` išsaugo originalų `provider_id`, pirmąjį bandymą ir nekintamą atsakymo stebėjimą net tada, kai grąžinta neapmokėta ar laukianti būsena. Rezultatas turi `pending` arba `requiresReview`. Tokia komanda nesukuria siuntos registravimo projekcijos, nepažymi užsakymo kaip turinčio etiketę ir neleidžia antro kūrimo POST. `reconcile` ar `refresh` gali skaityti tik jau susietą originalų ID; kitą ID pateikusi užklausa atmetama. Prarasto kūrimo atsakymo atveju lieka ankstesnis operatoriaus faktų sutikrinimas — naujas kūrimo bandymas neatsiranda.

`refresh` pirmiausia patikrina dabartinę tiekėjo būseną ir siuntos faktus. Neapmokėtai, atmestai, atšauktai ar laukiančiai siuntai negaunami dokumentai ir sekimo įvykiai, grąžinama `labelsAvailable:false`. Jei anksčiau registruotas užsakymas dabar sulaikytas, esama siuntos projekcija tampa `unknown`, o užsakymo `labelled` būsena grįžta į fiziškai supakuoto `ready` būseną. Istoriniai įvykiai ir failai nešalinami; senas lipdukas netampa dabartinės parengties įrodymu. Patvirtinus tą patį ID, atkuriama ta pati projekcija ir nekuriamas antras `ShipmentRegistered` įvykis. Būsenos pakeitimus bei dokumentų gavimą saugo komandos lease.

Jeigu dokumentų surinkimas jau pradėtas po `ShipmentRegistered`, būsena6 išlaiko ankstesnį patvarų 60 s / 24 val. laukimą. Būsenos5 ir8 aiškiai perduodamos operatoriaus peržiūrai per `carrier_booking_requires_review`; jos nereiškia sėkmingai baigto dokumentų gavimo. Pradinė būsena0/6 pati nesukuria registravimo įvykio: originalaus ID parengtį operatorius tikrina per `refresh` arba `reconcile`. Automatinis periodinis visų pradinių neapmokėtų komandų nuskaitymas šia pataisa nepridedamas.

Galimas LT paleidimas su `automationPolicy.approved:true` ir įjungtais sąskaitų, galiojimo bei pranešimų darbais, tačiau `autoPrepareIndividualShipments`, `autoExecutePreparedShipments`, `autoCollectShipmentDocuments` gali visi likti `false`. Tikras operatorius pirma fiziškai supakuoja apmokėtą užsakymą, tada patikrina piniginės lėšas ir vykdo originalią siuntimo komandą. Nulinis piniginės likutis nėra papildomas pirkėjo atsiskaitymo vartas; nei papildymas, nei mokamas bandymas šiuo šaltinio pakeitimu neatliekami. Tikras aktyvavimas, paštas ir tiekėjo operacijos lieka diegimo savininko atsakomybė.
