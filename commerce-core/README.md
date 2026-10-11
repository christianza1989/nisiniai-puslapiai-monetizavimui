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

Vietinis API: `http://127.0.0.1:8795/api/catalog`. Duomenys saugomi ignoruojamame `runtime/local.sqlite`; jame yra tik aiškiai atskirti testiniai duomenys. Stripe, vežėjas ir operatoriaus prieiga vietiniame dev serveryje neprijungti. Atskiras `npm run dev:worker` reikalauja vietinės D1 migracijos ir testinio katalogo; greičiausias atkuriamas D1 bandymas — `npm run test:worker`.

`verify` patikrina formatą, 20 domeno/HTTP testų, atskirą workerd/D1 integracijos kelią ir Wrangler dry-run build. Testai nesikreipia į Stripe ar vežėjo realų API. `build:worker` nieko neišleidžia į Cloudflare. Miniflare 5 alpha yra užfiksuota vietinio testavimo priklausomybė; production patikra lieka atskiras vartas.

Viešame runtime naudoti `src/worker.mjs`, o ne `test/worker-harness.mjs`. Testinis įėjimas turi dirbtinį checkout/vežėją/operatorių ir niekada neturi būti diegiamas. Production aplinką dabartinis Worker atmeta.

