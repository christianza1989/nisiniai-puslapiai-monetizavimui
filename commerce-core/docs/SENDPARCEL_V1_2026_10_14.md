# Sendparcel v1 patikslinimas — 2026-10-14

Šaltiniai: savininko pateiktas tiekėjo IT atsakymas ir tą pačią dieną perskaityta [oficiali API dokumentacija](https://api.sendparcel.com/rest-api/doc), OpenAPI2.0.1. Ankstesnė 2026-10-12 dokumentacijos interpretacija apie JWT šiam v1 ryšiui nebegalioja; istorinis tyrimas nekeičiamas.

V1 adapteriui būtinas atskiras staging arba production API raktas `apiPassword`; siunčiama tik `password` antraštė. JWT, Bearer, v2 login ir v2 pasiūlymų ID nenaudojami. IP allowlist nereikia. `/rest-api/quotes` pasiūlymo `product.id` tampa `product_id` kuriant užsakymą. `total_price.amount_in_cents` yra galutinė EUR kaina su PVM ir mokesčiais. Draudimas automatiškai nepridedamas.

Nauja 0023 migracija prideda bendrą per-raktą ribojimą. 2026-10-16 tiekėjas patikslino, kad vienos užklausos per sekundę limitas galioja visiems /rest-api/* keliams, įskaitant quotes; tai pakeičia ankstesnę išimtį. D1 lease serializuoja visas v1 užklausas ir po atsakymo palieka bent vieną sekundę iki kitos užklausos. Ta pati credential apimtis galioja skirtingoms parduotuvėms ir Worker procesams; DB saugomas tik SHA-256, ne raktas. Užimta / po nutrūkimo likusi lease blokuoja siuntimą, o 429 grąžinamas kaip sanitizuota klaida be automatinio POST kartojimo. Senos migracijos neperrašytos.

Pasiūlymas galioja maždaug 20 min.; vidinė priėmimo riba lieka 15 min., prieš pirmą registraciją būtina nauja kaina. V1 neturi kliento order ID / idempotency key ar paieškos pagal juos. Vienas kūrimo POST, originalus atsakymas privačiame `shipment_observations`, siuntos ID bei ryšys su mūsų order išsaugomi. Nutrūkus atsakymui — unknown ir faktų sutikrinimas pagal tiekėjo ID; naujas POST savaime nekuriamas.

Paštomatams leidžiama viena pakuotė, išimtis DPD Estijoje — iki penkių. Riba taikoma siuntėjo ir gavėjo paštomatui prieš quote / create. Postboxes užklausa neturi country filtro; šalis atrenkama vietiškai po pilnos puslapių patikros.

Dokumentai gaunami per `/rest-api/orders/documents`, kaip nurodo faktinė OpenAPI schema. `file_name` išsaugomas kaip privatus tiekėjo faktas, PDF patikrinamas ir laikomas privačioje saugykloje. `labelFileNames` ryšio konfigūracijoje turi tik staging atsakymu patvirtintus etikečių failų vardus. Nežinomas vardas lieka dokumentu. Etikečių eilė susiejama su pakuočių sekimo numeriais tik esant pilnai vienareikšmei sekai ir sutampančiam etikečių skaičiui. Vieno order bendras tracking numeris nepriskiriamas visoms pakuotėms.

Staging raktas gautas 2026-10-17; dar reikalingas galutinės užregistruotos siuntos atsakymo pavyzdys etikečių vardams ir kelių pakuočių sekimo struktūrai patvirtinti. Patvirtinto ryšio `bookingAdmission.pricingProtocol: "v1_fresh_quote_no_insurance"` leidžia naudoti tiekėjo palaikomą naujo pasiūlymo protokolą. Jis neįjungia `costCeilingGuaranteed`: create atsakyme sumos nėra ir absoliučių galutinės nuskaičiuotos sumos lubų neįrodome. Kaina iš naujo tikrinama prieš vienintelį POST, draudimas nepridedamas, padidėjęs pasiūlymas sustabdomas. Faktinė nuskaičiuota suma vėliau sutikrinama su tiekėjo apskaitos dokumentais. DPD Estijos penkių pakuočių išimtis taikoma tik turint patvirtintą `serviceCouriers[serviceId]: "dpd"`, todėl vien DPD paštomato pasirinkimas jos nesuteikia kitam vežėjui. Raktas ir quote patikra atskiri nuo leidimo pirkti tikrą siuntimą. Production booking, quotes ir automatinis vykdymas šiame darbe neįjungti.

Memocasting abu 32 / 48 € rinkiniai dabar apima baltus dažus, atskiro dažų SKU pasiūlyme nebėra. Savininkas patvirtino pilnas pakuotes su dažais: poros 2 200 g / [200, 200, 170] mm, šeimos 4 500 g / [250, 250, 200] mm. Tai pakeičia ankstesnius 2 / 4 kg ir nežinomų matmenų faktus; katalogo dabartinis šaltinis commerce-core/config/memocasting-business.json. Seni order snapshot ir testinės parduotuvės DB nekeičiami.


## Testinės paskyros prieiga · 2026-10-17

Tiekėjas suteikė atskirą staging API raktą ir patvirtino testinį automatinį apmokėjimą bei 500 testinio kredito. Raktas saugomas tik privačiai, ne šiame dokumente. Sukurtas užsakymas nėra iš karto galutinės būsenos: staging registravimo ciklas maždaug 5 min., production maždaug 1 min.. Tikrinti būseną vėliau, nekartoti create dėl laikinos būsenos. Testinės kainos ir paslaugų ID negali tapti production politika. Production raktas išduodamas atskirai po bandymų; šis laiškas neįjungia mokamų siuntų, paskyros papildymo ar kredito sutarties.


### Vėlesnio adresų atsakymo palyginimas

Tikras staging create atsakymas grąžino originalias lietuviškas gatvių raides, tačiau vėlesnis infos tas pačias gatves grąžino be diakritikų. Tik LT adreso line1 palyginime leidžiama tiksli lietuviškų raidžių transliteracija; originalus įvesties ir tiekėjo atsakymo tekstas išsaugomi. Namo, korpuso, buto numeriai, line2, gavėjo vardas, šalis, miestas, telefonas ir pakuotės lieka tikrinami kaip anksčiau. Kitoje šalyje ši išimtis negalioja. Tai ne leidimas ignoruoti nesutampantį adresą.


### Patikrintas testinis atsakymas · 2026-10-17

Vienas testinis dviejų pakuočių siuntimas po asinchroninio apdorojimo grąžino status2, dviejų puslapių Stickers.pdf ir vieno puslapio Manifest.pdf. PDF parašas ir visas formatas patikrinti, abu etikečių puslapiai perskaityti ir atvaizduoti. Tai tik staging kainų ir dokumentų įrodymas. Bendras tracking_number yra dviejų numerių kableliais atskirta eilutė, o parcels atskirų numerių neturi. Seka neperkeliama į trackingNumbers be tiekėjo patvirtinimo; bendras etikečių failas saugomas kaip etikečių rinkinys, dokumentų skaičius nėra pakuočių skaičius. Tiekėjo paprašyta patvirtinti šią tvarką ir suteikti atskirą production raktą.

Kai /tracks grąžina tik netuščius from ir to tekstus, be kitų laukų, tai priimama kaip tuščia nuskaitymų istorija. info:null, netaisyklingi įvykiai, error ar kiti netikėti laukai neatleidžiami nuo patikros. Šis pakeitimas nekuria fiktyvaus nuskaitymo ar pristatymo įvykio.
