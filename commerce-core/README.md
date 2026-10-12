# Bendras prekybos modulis
Pirmas klientas — Memocasting. [Pilnas modulio planas](docs/MODULIO_PLANAS.md), [aktuali apimtis](docs/IMPLEMENTATION_STATUS.md), [roadmap](docs/ROADMAP.md), [architektūra](docs/ARCHITECTURE.md), [API](docs/API.md), [priėmimas](docs/ACCEPTANCE.md).

Vienas bendras prekybos pagrindas mūsų parduotuvėms; kiekviena parduotuvė turi savo katalogą, įmonę, rinkas ir integracijų paskyras. Tikras kelių nepriklausomų pardavėjų marketplace paliekamas atskirai plėtrai.

Šiame etape kuriamas patvarus vietinis serverinis modulis. Memocasting svetainė, produktų fotografijos, turinio rašymas/publikavimas ir klientų aptarnavimo bei partnerių agentai bus vėlesni etapai. Produkciniai mokėjimai, siuntos, mokesčių deklaravimas, laiškai ir diegimas dar neįjungti.

## Paleidimas ir patikra

Komandas vykdyti iš `commerce-core/`, naudojant Node 24. Patikrinta su Node 24.19.0 Windows aplinkoje.

```sh
npm ci --ignore-scripts
npm run verify
npm run dev
```

Vietinis administravimas: `http://127.0.0.1:8795/admin`, API: `http://127.0.0.1:8795/api/catalog`. Serveris klausosi tik 127.0.0.1 ir atmeta kitą Host. Duomenys saugomi ignoruojamame `runtime/local.sqlite`. Vietinis katalogas testinis; Stripe ir vežėjas neprijungti. Operatorius prisijungia su atskirai terminale išduotu žetonu; production core identity lieka kitas integracijos vartas.

Kitame terminale, tame pačiame modulio kataloge:

```sh
npm run operator:token
npm run demo:seed
```

Žetoną įvesti administravimo prisijungime. Jis galioja 8 valandas ir suteikia tik vienos parduotuvės teises; serveryje saugomas hash, naršyklėje — tik atmintyje. `demo:seed` yra pasirinktinis, pakartojamas vietinių testinių užsakymų, medžiagų, finansinių šaltinių ir didmenos partnerio kūrimas; jis atmeta kitą aplinką ar įmonę. Dokumentai turi TEST seriją ir nėra patvirtinti apskaitos dokumentai. [Dizainas](DESIGN.md), [ekrano apimtis](docs/ADMIN_SURFACE.md).

Atskiras `npm run dev:worker` reikalauja vietinės D1 migracijos ir testinio katalogo; greičiausias atkuriamas D1 bandymas — `npm run test:worker`. UI serviravimas dabar tik Node dev adapteryje; Worker assets ir production identity dar neaktyvūs.

`verify` patikrina formatą, 60 domeno/HTTP testus, atskirą workerd/D1 integracijos kelią ir Wrangler dry-run build. Šis rinkinys nesikreipia į Stripe ar vežėjo realų API. `build:worker` nieko neišleidžia į Cloudflare. Miniflare 5 alpha yra užfiksuota vietinio testavimo priklausomybė; production patikra lieka atskiras vartas.

Node adapteris taiko numeruotas migracijas transakcijomis; bendras `applyMigrations` naudojamas native D1 bandyme. Taikytos SQL migracijos tikrinamos pagal SHA256 ir neturi būti perrašomos. Senas 0001 duomenų failas priimamas be istorijos ar likučių ištrynimo.

Viešame runtime naudoti `src/worker.mjs`, o ne `test/worker-harness.mjs`. Testinis įėjimas turi dirbtinį checkout/vežėją/operatorių ir niekada neturi būti diegiamas. Production aplinką dabartinis Worker atmeta.


0.4 prideda audituojamą medžiagų partijų karantiną/grąžinimą ir inventorizaciją, atominius stale/race vartus ir operatoriaus ekraną. [Naujas priėmimo kvitas](docs/CONTINUATION_2026_10_12_LOTS.md). Svetainę ir turinį savininkas dabar pavedė atskirai lygiagrečiai sesijai.

0.5 prideda patvarias grąžinimo užduotis, rezervuotos sumos ribas, vykdymo nuomą, Stripe rezultato paiešką ir operatoriaus veiksmus. Tikras atskiros laikinos Stripe bandymų aplinkos Checkout, signed webhook ir dviejų dalinių grąžinimų/replay kelias patikrintas. [Kvitas ir atkūrimas](docs/CONTINUATION_2026_10_12_REFUNDS.md). Gyva MB paskyra ir produkciniai grąžinimai neįjungti.

0.6 prideda siuntėjo vietos ir pakuočių planus, operatoriaus kainų užklausas
bei current Sendparcel staging read adapterį. [Kvitas ir atkūrimas](docs/CONTINUATION_2026_10_12_SHIPPING.md).
Vietiniam ekranui aiškus testinis pasiūlymas: npm run dev -- --shipping-fixture.
Tikram staging read: --shipping-sandbox su privačiu konfigūracijos failu.
Registravimas, tikri tarifai, PDF saugykla ir tracking dar neaktyvūs.
