# Nuolatinės Stripe TEST paskyros prijungimas

Žmogaus pasirinkta esama `Publikuota.lt Sandbox (MB Memocasting)` yra atskira testinė aplinka. Ji nėra senas anoniminis CLI sandbox ir nėra live paskyra. Paskyros ID tikrinamas tikru `accounts.retrieveCurrent` atsakymu; testinio rakto prefiksas pats savaime nebepatvirtina paskyros.

Vietinis operatoriaus įvedimas, iš core root:

```sh
node commerce-core/scripts/stripe-test-connect.mjs <actual-sandbox-account-id> 8837
```

Tik 127.0.0.1 serveris priima `rk_test_` raktą su Checkout Sessions Write, Accounts Read ir Events Read. Formoje raktas maskuojamas, atsakymai ir klaidos jo negrąžina, yra Host / Origin / nonce / 4 096 baitų įvedimo / vienalaikio įvedimo ir pakartojimo apsaugos. Faktinė paskyra tikrinama prieš privačiai sukuriant `runtime/stripe-memocasting/connection-pending.json` (`wx`; esamas failas neperrašomas). Šis failas dar nėra paruoštas payment adapteriui — webhook būtinas atskirai. Rakto negalima pateikti pokalbyje, Git, build ar public assets.

Naršyklės rakto kūrimo galutiniam veiksmui būtinas Computer Use action-time patvirtinimas. Forma gali būti paruošta prieš šį žingsnį. Live raktai ir bendri sk_test secret nepriimami šio įvedimo įrankio.

Kanoninė frontend context schemaVersion1 papildyta:

- `paymentProvider`: `stripe`, `fixture` arba null;
- `paymentEnvironment`: `test`, `live` arba null, tik patikrinus tikrą paskyrą;
- `paymentAccountVerified`: true tik faktiniam patvirtintam ryšiui;
- esamas `paymentConnected` lieka atskiras adapterio / store sąsajos rodiklis.

Fixture patikra negali pateikti `paymentAccountVerified:true` ar test žymos. Sandboxing nekeičia productionReady/publishOffers/shipping vartų. Prieš įjungiant svetainės preview TEST opt-in reikalingas pilnas SDK JSON su tikru CLI / Stripe webhook secret, store paymentAccountRef sutapimas, patvirtintos dabartinės market.policyVersion ir veikiantis `/api/stripe/webhook`. Return URL turi grąžinti į faktinį frontend `/cart`, o mokėjimą patvirtina pasirašytas įvykis, ne return puslapis.

Senos testinės DB ir immutable order snapshot neturi būti resetinami, naudojant naują paskyrą. Dar nėra tikro šios nuolatinės paskyros Checkout → webhook → durable order priėmimo; mokėjimų pavedimas lieka neužbaigtas iki šio bandymo.
