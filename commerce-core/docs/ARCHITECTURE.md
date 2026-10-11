# Prekybos modulio architektūra
Bendras vieno pardavėjo prekybos modulis, izoliuotas per storeId, environment ir legalEntityId. Viešas rendereris lieka companion repo; Python agentų core lieka esamas vykdymo/leidimų autoritetas. Naujas JS commerce domain naudojamas per versijuotą HTTP ar service adapterio sutartį; nėra antro agentų vykdytojo ar apskaitos ERP.

Pirmas vietinis adapteris — Node SQLite; D1 adapteris — ta pati SQL/prepare/batch sąsaja, **atskirai tikrinama tikrame workerd**. SQLite acceptance neperkeliamas automatiškai į D1. Atominę kelių SKU rezervaciją ir būsenų kitas kontroliuoja DB transakcija/triggers, o ne atskiras read→write agento spėjimas.

Lentelės: stores/config, products, inventory, orders/snapshots, order_lines, event_inbox, outbox, audit, shipments, withdrawals, journal_entries/lines. Visos privataus objekto sąsajos tikrina serverio store kontekstą. Testinių duomenų namespaces ir aplinka atskirti, production neturi fixture fallback.

Money — valiuta ir sveikas mažiausių vienetų kiekis; katalogo/rinkos serverio kainos, consolidation of duplicate lines, bounded quantity. Order saugo title/price/tax/legal/delivery snapshot. Negalima perrašyti istorinių užsakymų pakeitus katalogą.

Mokėjimo būsena, stock, fulfillment ir accounting yra atskiri pjūviai. Stripe success URL nėra mokėjimo tiesa. Raw signed webhook tikrinamas SDK ir account mapping; event dedup, tiksli suma/currency/order/session/environment. Timeout išorinėje paslaugoje atkuriamas pagal stabilią reference/idempotency key.

Outbox turi patvarų correlation/event įrašą kartu su DB pakeitimu. Vykdytojas turi lease/retry ir idempotent destination; daugiau negu vieną kartą pristatomas įvykis negali duoti antros sąskaitos/siuntos/refund. Neprisijungęs mail/queue yra aiški delivery riba.

Siuntų adapteris: quote/list services, validate selection, create/find/cancel, label/tracking. Pakuotės svoris/matmenys ir kaina patvirtinami serverio. Paketų PDF privatūs; prekių data/media vieši atskirai. PDF etiketes ir banko dokumentus laikyti R2 tik kai realus adapteris/prieigos priimti.

Apskaita: struktūruotas operacijos įvykis ir balansuotas žurnalas yra pagrindas, ne teisiškai pilna MB atskaitomybės sistema. Agentas gali siūlyti įrašą; deterministinis validatorius tikrina balance/source/currency/unique. Banko payout skiriamas nuo sale. Tax rule registracija ir declarations filing neįjungti.

Public API kontekstą gauna iš host registry, operatoriaus veiksmai iš verified identity adapterio. Node vietinis operatoriaus testų tokenas nepakeičia bendro production auth. CORS/Origin, PII, security limits, noindex/private projections ir unknown-host fail-closed tikrinami.

[Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment), [D1 batch](https://developers.cloudflare.com/d1/worker-api/d1-database/), esami MAIL_CORE / SEO_GEO_CORE / CONTENT_CORE / MEDIA_CORE / PLATFORM_BUILD_CONTRACT yra sąsajų pagrindas.

