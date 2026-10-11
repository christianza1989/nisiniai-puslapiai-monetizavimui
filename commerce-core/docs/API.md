# Vietinio prekybos API sutartis

Versija 0.1. Tai įgyvendinti endpointai, ne visas roadmap. Visos JSON išvestys turi `no-store`, `noindex` ir `nosniff`. Nežinomas host — 404. Parduotuvę ir aplinką nustato serveris; kliento `storeId`, kainos ar įmonės laukai jų nekeičia. Pinigai yra sveiki mažiausi valiutos vienetai. POST Origin, kai pateiktas, turi sutapti su request origin. JSON/webhook body riba 64 KiB.

| Endpointas | Įvestis / leidimas | Rezultatas |
|---|---|---|
| GET /api/catalog | serverio host | SKU, serverinės rinkų kainos, baigtų rinkinių likučiai, pakuotės parametrai |
| POST /api/quote | lines[{sku,quantity}], country, currency, deliveryId | patvirtintos kainos ir pristatymo suma; likučio dar nerezervuoja |
| POST /api/orders | quote įvestis; Idempotency-Key ir Order-Access-Token | 201 naujas, 200 pakartotas; order snapshot ir rezervacija |
| GET /api/orders/:id | Authorization: Bearer token | tik to host parduotuvės užsakymas |
| POST /api/orders/:id/checkout | tas pats token; prijungtas Stripe adapteris | Checkout ID/URL; neprijungtas adapteris — 503 |
| POST /api/orders/:id/withdrawal | tas pats token | 202 patvarus atsisakymo prašymas; nėra automatinis pinigų grąžinimas |
| POST /api/stripe/webhook | tikras raw body ir Stripe-Signature; paskyros adapteris | 200 priimtas/dubliuotas įvykis, 400 blogas parašas |
| POST /api/operator/orders/:id/pack | verified operator identity adapteris su šios parduotuvės teise | apmokėtas/alokuotas užsakymas paruoštas |
| POST /api/operator/orders/:id/ship | verified operator + prijungtas siuntų adapteris | privatus etiketes nurodantis įrašas; ne viešas PDF |

Operatoriaus adapterio nebuvimas — 403. Nei naršyklės store ID, nei vien API rakto turėjimas negali pakeisti narystės patikros. Vietinis `dev` neturi šio adapterio. Fixture identity egzistuoja tik atskirame test entrypoint.

## Saugus pakartojimas

Prieš POST /orders klientas generuoja 32 atsitiktinius baitus per Web Crypto, koduoja base64url ir išsaugo prieigos tokeną bei idempotency key iki atsakymo. Tokeno ilgis 32–128, leidžiami base64url simboliai; request key 16–100. Serveris saugo tik SHA-256 tokeno hash. Tokeną siųsti headeriu, ne URL; jo neįtraukti į telemetry/logus. UI saugojimo ir galiojimo politika bus priimama prieš storefront paleidimą.

Pakartoti tą pačią normalizuotą įvestį, key ir tokeną. Kitokia įvestis ar tokenas su tuo pačiu key — 409. Praradus pirmą atsakymą, pakartotas užsakymas turi tą patį ID, o klientas jau turi jo prieigos tokeną. Skirtingos parduotuvės turi nepriklausomą key erdvę.

```json
{
  "lines": [{"sku": "couple", "quantity": 1}],
  "country": "LT",
  "currency": "EUR",
  "deliveryId": "test_delivery"
}
```

Pavyzdys skirtas tik fixture katalogui. `test_delivery` ir PL kainos nėra Memocasting patvirtintos operacinės kainos.

## Būsenos ir integracijos

Rezervacija trunka 60 min. Nauja Stripe sesija nekuriama, kai iki jos pabaigos liko mažiau nei 30 min.; jau užregistruotos sesijos idempotent retry leidžiamas iki expiry. Rezervacijų `expire` operaciją prieš production prijungti prie esamo planuoklio. Dabartiniame Worker nėra aktyvaus cron ar outbox consumer.

Stripe adapteris tikrina SDK parašą, test/live, store metadata ir apmokėtą Checkout session. Service tikrina paskyrą, užsakymą, sesiją, valiutą, sumą ir payment ID. Success puslapis nepatvirtina mokėjimo. Vėlyvas paid arba atomiškai atkuria likutį, arba sukuria patvarią `stock_exception`, kuri negali pereiti į pakavimą.

Siuntų adapteris turi `supportsIdempotentCreate: true`, `find(reference)` ir `create({reference,order})`; toks deklaravimas realiam adapteriui leidžiamas tik įrodžius tiekėjo deduplication. Timeout sukuria `unknown`; retry pirmiausia ieško pagal stabilią reference. Etiketės rezultatas nurodo `private: true` ir privatų dokumentą. Tikra etiketės saugykla, adresai, paslaugų quote/paštomatai, cancel ir tracking dar neįgyvendinti.

Refund patvirtinimas, journal posting, expiry ir outbox lease/ack yra vidinės service operacijos. Viešo neautorizuoto endpointo joms nėra. Refund patvirtinimas dabar gauna jau patvirtinto tiekėjo fakto įvestį; Stripe refund vykdymas ir signed refund webhook adapteris lieka kito paketo darbas.

Contact/address, documents, bank reconciliation, B2B ir admin read API bus versijuojami pagal roadmap. Jų dabartinis 404 nereiškia veikiančio paslėpto funkcionalumo.
