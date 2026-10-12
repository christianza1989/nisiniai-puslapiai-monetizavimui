# Prekybos pagrindas 0.12

2026-10-12. Užbaigtas pagamintų rinkinių partijų kelias: surinkimas išsaugo
suvartotas medžiagų partijas ir ankstyviausią jų galiojimą. Vėlesnis komponento
karantinas taikomas ir pagamintam rinkiniui. Fizinis laisvas kiekis atskirtas
nuo parduodamo. Memocasting baziniams rinkiniams privaloma partijų apskaita;
tikras likutis neišgalvojamas ir verslo pasiūlyme lieka 0.

Rezervavimas paskiria konkrečias tinkamas partijas pagal FEFO. Galiojimas ir
karantinas tikrinami prieš Checkout, priimant mokėjimą, komplektuojant ir prieš
siuntos registravimo užklausą. SQL vartas tikrina paskutinę registravimo žymą,
todėl tarp patikros ir žymos įvykęs karantinas nesukelia vežėjo POST. Tikras
vėlyvas mokėjimas išsaugomas; netinkamos prekės užsakymą sustabdo. Pasibaigusios
rezervacijos mokėjimas gali paskirti naują tinkamą partiją atskira karta,
išsaugant ankstesnį paskyrimą. Grąžinimas į parduodamą likutį reikalauja
tikros originalios išsiųstos partijos, jos tinkamumo ir neviršyto kiekio.

Operatorius gali įrašyti fiziškai gautą partiją, esamo likučio kilmę, koreguoti
patikrintą kiekį, nustatyti ar panaikinti karantiną. Kiekio / versijos CAS,
veiksmo ID, operatorius ir priežastis išsaugomi; ankstesnė kilmė ir galiojimas
nekoreguojami. Skaitinių korekcijų kelias negali apeiti privalomų partijų.

## Senų duomenų migracija

Taikyti 0021 ir 0022 po visų 0001–0020, jų baitų nekeisti. Istoriniai snapshot,
surinkimai ir dokumentai paliekami. Senas teigiamas likutis su surinkimo
istorija sustabdomas, nes istorinis surinkimas neįrodo šiandien likusių vienetų
kilmės. Ankstesnio neišsiųsto užsakymo kilmė nėra numanoma.

1. `GET /api/operator/finished-stock` (read teisė) pateikia fizinį `inventory`,
   partijas, `holds` ir kontrolės istoriją.
2. Fiziškai patikrintam laisvam likučiui siųsti
   `POST /api/operator/finished-lots` (stock teisė):
   `{id,sku,mode:"adopt",quantity,expectedAvailable,supplierRef,reason,
   qualityChecked:true,expiresAt:null|timestamp,quarantined:boolean}`.
   `expectedAvailable` yra bendras dabartinis fizinis laisvas SKU kiekis.
   `adopt` nepadidina fizinio kiekio; `receive` prideda tikrai naujai gautus
   vienetus. `null` reiškia aiškiai nenurodytą terminą, ne saugumo pažadą.
3. Kai visas laisvas likutis turi patikrintą kilmę, siųsti
   `POST /api/operator/finished-controls`:
   `{id,sku,kind:"reconcile",expectedAvailable,qualityChecked:true,reason}`.
   Nepilnas sutikrinimas atmetamas. Karantinuotos / pasibaigusios partijos
   ir po sutikrinimo neparduodamos.

Senų aktyvių užsakymų nežinoma kilmė taip neišgalvojama: jie lieka sustabdyti,
kol išsprendžiami pagal tikrus faktus, arba grąžinami pinigai ir atšaukiami.
Sutikrinimas uždarytas, kol lieka aktyvių senų nežinomos kilmės užsakymų.
Net kai laisvas likutis migravimo metu buvo 0, senos rezervacijos paleidimas
ar atšaukimas grąžintą kiekį laiko sutikrinime; jo negalima parduoti kaip
neapskaityto bendro likučio. 0022 papildo šį kraštinį atvejį, nekeisdama 0021.
Karantino / kiekio kontrolė naudoja
`{id,sku,lotId,kind:"quarantine"|"release"|"adjust",delta,
expectedAvailable,expectedVersion,reason,qualityChecked}`; čia kiekis yra
pasirinktos partijos laisvas likutis. Panaikinant karantiną būtina patikra.

## Svetainės sąsaja

SDK `mountCheckout` turi pasirenkamą `catalogueUrl`, priimamas tik tos pačios
kilmės adresas. Tuščio krepšelio pranešimas persijungia keičiant kiekius;
tuščio krepšelio skaičiavimas uždarytas. Išsaugotas užsakymas rodo jo originalų
gavėją, kontaktus, adresą, šalį, pristatymo ir paštomato duomenis. Rezervacijos
pabaiga, neprijungti mokėjimai, išsaugotas atsisakymas ir vykdymo sustabdymas
paaiškinami LT / PL / LV / ET. Pristatymo paslaugos originalus pavadinimas ir
užsakymo snapshot neperrašomi. Svetainė turi atnaujinti tikslų SDK manifest iš
įrašyto commit ir atlikti savo keturių kalbų naršyklės patikrą.

## Patikra ir likę vartai

116 Node testų, formatas, native workerd / D1 / R2 / Queue su 22 migracijomis ir
Worker dry-run PASS. Native D1 tikrina surinkto rinkinio terminą, konkrečios
partijos paskyrimą, mokėjimą po galiojimo ir sustabdytą komplektavimą.
Node testai papildomai tikrina FEFO, lenktynes, visos transakcijos rollback,
seną sutikrinimą, originalių partijų grąžinimus ir paskutinę siuntos SQL žymą.
Testų įrodymai vietiniame `tmp/verify-012.log`; unit DOM nėra tikro browser
pakaitalas. Operatoriaus actual vietinė patikra apima partijos įrašymą,
karantiną ir jo panaikinimą; testinė DB išsaugota, reset nevykdytas.

Stripe / Siųsk pigiau IT ir faktinis staging bandymas, pašto pristatymas,
production identity / saugyklos / HTTPS / infrastruktūra ir tikri verslo
faktai lieka atskiri prijungimo vartai pagal 0.9 runbook. Šis paketas neįjungia
tikrų mokėjimų, siuntų, laiškų, deklaravimo ar diegimo. Visos svetainės galutinis
priėmimas laukia exact SDK importo ir susieto naršyklės kvito. Galutinis
dizainas, našumas ir agentai atidėti savininko pavedimu.
