# Vietinio prekybos API sutartis

Versija 0.6. Tai įgyvendinti endpointai, ne visas roadmap. Visos JSON išvestys turi `no-store`, `noindex` ir `nosniff`. Nežinomas host — 404. Parduotuvę ir aplinką nustato serveris; kliento `storeId`, kainos ar įmonės laukai jų nekeičia. Pinigai yra sveiki mažiausi valiutos vienetai. POST Origin, kai pateiktas, turi sutapti su request origin. JSON/webhook body riba 64 KiB.

| Endpointas | Įvestis / leidimas | Rezultatas |
|---|---|---|
| GET /api/catalog | serverio host | SKU, serverinės rinkų kainos, baigtų rinkinių likučiai, pakuotės parametrai |
| GET /api/markets | serverio host | įjungtos šalys/valiutos, patvirtinti delivery/locker pasirinkimai ir requireCustomer; jokių pirkėjų duomenų |
| POST /api/quote | lines[{sku,quantity}], country, currency, deliveryId | patvirtintos kainos ir pristatymo suma; likučio dar nerezervuoja |
| POST /api/orders | quote įvestis; Idempotency-Key ir Order-Access-Token | 201 naujas, 200 pakartotas; order snapshot ir rezervacija |
| GET /api/orders/:id | Authorization: Bearer token | tik to host parduotuvės užsakymas |
| POST /api/orders/:id/checkout | tas pats token; prijungtas Stripe adapteris | Checkout ID/URL; neprijungtas adapteris — 503 |
| POST /api/orders/:id/withdrawal | tas pats token | 202 patvarus atsisakymo prašymas; nėra automatinis pinigų grąžinimas |
| POST /api/stripe/webhook | tikras raw body ir Stripe-Signature; paskyros adapteris | 200 priimtas/dubliuotas įvykis, 400 blogas parašas |
| POST /api/operator/orders/:id/pack | verified operator identity adapteris su šios parduotuvės teise | apmokėtas/alokuotas užsakymas paruoštas |
| POST /api/operator/orders/:id/ship | verified operator + prijungtas siuntų adapteris | privatus etiketes nurodantis įrašas; ne viešas PDF |
| GET /api/operator/overview | operator read | store, counts, orders, catalog, dokumentai, korekcijos, refund išimtys, operatoriaus grants, adapterių aktyvumas |
| GET /api/operator/orders | operator read; optional before + beforeId | orders ir nextCursor; timestamp/ID keyset nepraleidžia vienu metu sukurtų užsakymų |
| GET /api/operator/orders/:id | operator read | užsakymas, dokumentai, refunds, refundCommands ir siuntos įrašas |
| POST /api/operator/orders/:id/refund-commands | operator refund; id, amount centais, reason | sandbox/testOnly užduotis, atominė likusios sumos rezervacija; replay/conflict |
| POST /api/operator/refund-commands/:id/execute | operator refund; prijungtas Stripe adapteris | vienas lease, esamo rezultato paieška, stabilaus key POST tik per23h; unknown/pending/review nėra patvirtintas refund |
| POST /api/operator/refund-commands/:id/cancel | operator refund | tik planned užduotis be first_attempt/lease; istorija lieka, suma atlaisvinama; pradėta užduotis —409 |
| POST /api/operator/stock-adjustments | operator stock; id, sku, delta, expectedAvailable, reason | patvari korekcija ir replay; stale ar neigiamas galutinis likutis — 409 |
| POST /api/operator/orders/:id/documents | operator document; kind:sale/packing/credit, credit atveju refundId | nekintantis numeruotas testinis dokumentas; source replay grąžina tą patį ID |
| GET /api/operator/documents/:id | operator read | tik tos parduotuvės dokumentas |

Operatoriaus adapterio nebuvimas — 403. Adapteris grąžina `{id,storeId,permissions}`; handleris tikrina ID, host parduotuvę ir konkrečią read/stock/document/pack/ship/finance/wholesale/refund teisę. Boolean arba kitos parduotuvės principal atmetamas. Actor ID imamas iš adapterio, ne request body. Vietinis dev turi CLI išduodamo hash/expiry žetono adapterį; production core identity dar neprijungtas. Atskiras workerd test entrypoint turi aiškiai testinį identity adapterį.

## Kontaktai ir pristatymas

Order įvestis gali papildomai turėti customer: name, email, phone ir address:{country,line1,line2?,city,postalCode}; locker pristatymui — lockerId. `requireCustomer:true` kontaktus padaro privalomus; production store admission reikalauja šio flag. Development legacy užsakymai be kontaktų išlieka skaitomi. Phone turi būti E.164 formato, adreso country turi sutapti su užsakymo šalimi. LT/PL/LV/EE pašto kodų sintaksė tikrinama; tai nėra tikro adreso ar gavėjo patvirtinimas.

Paštomato ID, šalis ir pavadinimas imami iš serverio patvirtinto metodo sąrašo. Browser siūlomas locker objektas ar shipping amount nepriimami kaip faktas. Kontaktai normalizuojami, įtraukiami į request hash ir immutable order schema2 snapshot. Kartojant seną užsakymą naudojamas jo pristatymo pasirinkimas; pašalintas dabartinis tarifas ar pakeistas paštomato pavadinimas istorinio replay nekeičia.

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

Siuntų adapteris turi `supportsIdempotentCreate: true`, `find(reference)` ir `create({reference,order})`; toks deklaravimas realiam adapteriui leidžiamas tik įrodžius tiekėjo deduplication. Timeout sukuria `unknown`; retry pirmiausia ieško pagal stabilią reference. Etiketės rezultatas nurodo `private: true` ir privatų dokumentą. Pristatymo kontaktai dabar yra order snapshot; jų neturint realiam adapteriui registravimas atmetamas. Tik fixture gali deklaruoti `requiresCustomer:false`. Tikra PDF saugykla, paslaugų quote/paštomatų API, pakavimas į kelias siuntas, cancel ir tracking dar neįgyvendinti.

Refund patvirtinimas, journal posting, expiry ir outbox lease/ack yra vidinės service operacijos. Viešo neautorizuoto endpointo joms nėra. Stripe adapteris priima refund.created/updated/failed per tą patį pasirašytą webhook. Faktas įrašomas į durable inbox ir siejamas pagal payment_intent, o ne browser ar refund metadata. Succeeded sumuojamas vieną kartą; pending nedidina grąžintos sumos. Ankstesnis refund nei paid laukia payment ryšio. Failed/canceled ir nesutampantys faktai kuria peržiūros išimtį; automatinis ankstesnio finansinio įrašo anuliavimas nevykdomas. [Stripe refund events](https://docs.stripe.com/refunds#refund-events), [įvykių pristatymas ir tvarka](https://docs.stripe.com/webhooks). Tikras Stripe refund API vykdymas ir disputes lieka atskira integracija.

Dokumentų numeracija atominė pagal legalEntityId/year/series. Sale ir packing šaltinis — order ID, credit — jau patvirtintas refund ID ir pradinio sale dokumento ryšys. Issued įrašo UPDATE/DELETE atmeta SQL triggeriai. Gamybinės apskaitos dokumentų išdavimas dabar grąžina 503; nėra patvirtinto VAT/non-VAT template ar teisinės numeracijos politikos. HTML spausdinimas vietiniame ekrane nėra vežėjo PDF etiketė.

## Vietinis sandėlis, sutikrinimas ir didmena — 0.3

Visi šie endpointai privatūs, pagal host parduotuvę ir serverio principal. GET reikia read, POST — lentelėje nurodytos teisės. Nė vienas importas nesiunčia pinigų ir nepatvirtina pirkėjo mokėjimo.

| Kelias | Metodas / teisė | Įvestis ir rezultatas |
|---|---|---|
| /api/operator/components | GET read / POST stock | sąrašas; POST id/name/unit (unit/g/ml) — nekintanti medžiagos apibrėžtis |
| /api/operator/lots | POST stock | id/componentId/supplierRef/quantity/expiresAt? — nekintantis priėmimas; laisvas kiekis keičiamas surenkant |
| /api/operator/recipes | POST stock | id/sku/components:[{id,quantity,unit}] — nauja nekintanti rinkinio sudėties versija |
| /api/operator/assemblies | POST stock | id/recipeId/quantity — galiojančios partijos pagal FEFO; visas nurašymas ir gatavas SKU atominiai |
| /api/operator/financials | GET read | iki 100 šaltinių ir jų sutikrinimo būsena |
| /api/operator/financial-imports | POST finance | origin/rows:[{reference,kind,currency,amount,transactionRef?,occurredAt}] — iki 100 normalizuotų eilučių |
| /api/operator/reconciliations | POST finance | sourceId/peerId? — tik sutampantys patvirtinto payment/refund faktai arba payout/bank pora |
| /api/operator/wholesale | GET read | partneriai, kainynai ir iki 50 pasiūlymų; viešame kataloge šių kainų nėra |
| /api/operator/wholesale-price-lists | POST wholesale | id/currency/lines:[{sku,unitAmount,moq,casepack}] — nekintantis kainynas |
| /api/operator/wholesale-partners | POST wholesale | id/name/priceListId/country/currency/customer/approved — privati partnerio apibrėžtis |
| /api/operator/wholesale-approvals | POST wholesale | id/partnerId/expectedVersion/approved — nekintantis actor įrašas ir atominis versijos pakeitimas; stale — 409 |
| /api/operator/wholesale-quotes | POST wholesale | id/partnerId/lines/deliveryId — serverio kainynas, minimumas ir pakuotės kiekis, 7 d. pasiūlymas |
| /api/operator/wholesale-quotes/:id/accept | POST wholesale | vienas testinis prepaid order ir gatavų SKU rezervacijos; production atmeta |
| /api/operator/wholesale-reorders | POST wholesale | id/quoteId — naujas pasiūlymas pagal aktualų partnerio kainyną, ne senos kainos kopija |

Suma visada sveikais mažiausiais valiutos vienetais. Payment suma teigiama; refund, fee, payout — neigiama; bank gali būti abiejų ženklų. Origin+reference dedup ir hash neleidžia perrašyti šaltinio. Payout/bank pora privalo sutapti pagal išmokos ID, valiutą ir priešingas sumas; abu šaltiniai sunaudojami tik vieną kartą. Importuojami normalizuoti faktai; originalių banko failų/Stripe balance API adapteris ir jų išsamumo kontrolė dar neprijungti.

Surinkimas padidina tik paruoštų rinkinių likutį; pardavimas nerezervuoja nepagamintų rinkinių. Unit yra explicit matavimo vienetas. Galiojimo neturinti partija laikoma tinkama, jei nėra karantine.0.4 operatorius gali ją karantinuoti arba patikslinti likutį per audituojamą kontrolės API. Pirminis priėmimas nekeičiamas. Memocasting tikrų sudėčių, dažų savikainos ir šeimos pakuotės faktų fixture nepakeičia.

Didmenos UI leidžia kurti kainyno versiją, įrašyti nepatvirtintą partnerį, patvirtinti/stabdyti prekybą, rengti, priimti ir pakartoti pasiūlymą. Migracija 0005 saugo approval versiją ir nekeičiamą jos istoriją. Partnerio patvirtinimas tikrinamas dar kartą užsakymo transakcijoje: sustabdymas tarp skaitymo ir batch nesukuria užsakymo ar dalinių rezervacijų. Jau priimto pasiūlymo replay grąžina jo istorinį užsakymą. Pirminio partnerio apibrėžties replay neatšaukia vėlesnio prekybos sustabdymo. Esamo partnerio adreso/kainyno pakeitimas, partnerio portalas, credit terms, mėginiai, oficiali proforma ir sutartys lieka plėtra. Production core identity, queue/consumer ir storefront neprijungti.

## Medžiagų partijos kontrolė — 0.4

POST /api/operator/lot-controls reikia serverio stock teisės. Body: id,lotId,kind (adjust/quarantine/release),delta,expectedAvailable,expectedVersion,reason. Delta sveikais pirminio matavimo vienetais; adjust nenulinis, karantino/grąžinimo0. Reason3–160simbolių. Serverio actor įrašomas automatiškai. GET /api/operator/components papildomai grąžina lotControls (100naujausių), o lots turi quarantined/control_version.

Pakartotas tas pats id ir payload grąžina tą pačią kontrolę; pakeistas payload —409. Likutis ir versija tikrinami SQL transakcijoje; kiekio/neigiamos sumos/stale/būsenos konfliktas409. Kontrolė, pirminis priėmimas ir actor/reason istorija nekintantys. Surinkimas padidina partijos versiją, todėl sena inventorizacija negali perrašyti naujo sunaudojimo. Partijos išleidimas iš karantino nepakeičia expiresAt: expired vis tiek netinka. Surinkimo transakcijos triggeris dar kartą tikrina karantiną ir galiojimą pagal assembly timestamp; sustabdžius partiją tarp pasirinkimo ir batch gatavas SKU, lot lines ir audit visi rollback.

UI skaičiuotą likutį paverčia delta nuo matyto serverio likučio.0korekcija atmetama; po konflikto reikia atnaujinto sąrašo ir naujo veiksmo. Kontrolė dar nėra platesnis laboratorinis kokybės/certification, supplier recalls ar naujas galiojimo datos keitimas.

## Siuntų paruošimas — 0.6

Visiems POST reikia operatoriaus ship teisės, serverio store, tos pačios Origin
ir sandbox/testOnly. Actor nepriimamas iš body.

- POST /api/operator/shipping-origins: id,country(LT),city,postalCode,isCompany(boolean),reason.
- POST /api/operator/orders/:id/shipping-plans: id,originId,recipientIsCompany(boolean),mode(individual/measured). Measured papildomai parcels[{weightGrams,dimensionsMm[3],lines[{sku,quantity}]}],measurementNote. Turinys privalo tiksliai padengti apmokėtą/allocated order.
- POST /api/operator/shipping-plans/:id/quotes: id. Serverio shippingReadAdapters parenka provider/account/environment. Tik EUR; provider kainos nepakeičia mokėjimo/pristatymo.
- POST /api/operator/shipping-lockers: id,country,courier(dpd/posti/unisend/novaPost/omniva/venipak). Privatus immutable snapshot; ne viešo pristatymo allowlist atnaujinimas.
- GET /api/operator/orders/:id papildomai shippingPreparation{origins(100),plans(30),quotes(30),bookingAvailable:false}. Reikia read teisės.

Naujo įrašo/replay atsakymas: record,replayed. Turinio konfliktas409; nėra
API prieigos503; netinkama būsena409. Same ID query replay nesiunčia dar vienos
provider užklausos. Kitas ID reiškia naują kainos įvertinimą. Provider expiry
šiuo protokolu nežinomas. PDF/tracking adapterio metodai dar neturi operatoriaus
HTTP/saugyklos integracijos. [Kvitas](CONTINUATION_2026_10_12_SHIPPING.md).
