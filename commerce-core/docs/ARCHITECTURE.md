# Prekybos modulio architektūra
Bendras vieno pardavėjo prekybos modulis, izoliuotas per storeId, environment ir legalEntityId. Viešas rendereris lieka companion repo; Python agentų core lieka esamas vykdymo/leidimų autoritetas. Naujas JS commerce domain naudojamas per versijuotą HTTP ar service adapterio sutartį; nėra antro agentų vykdytojo ar apskaitos ERP.

Pirmas vietinis adapteris — Node SQLite; D1 adapteris — ta pati SQL/prepare/batch sąsaja, **atskirai tikrinama tikrame workerd**. SQLite acceptance neperkeliamas automatiškai į D1. Atominę kelių SKU rezervaciją ir būsenų kitas kontroliuoja DB transakcija/triggers, o ne atskiras read→write agento spėjimas.

Lentelės: stores/config, products, inventory, orders/snapshots, order_lines, event_inbox, outbox, audit, shipments, withdrawals, journal_entries/lines. Visos privataus objekto sąsajos tikrina serverio store kontekstą. Testinių duomenų namespaces ir aplinka atskirti, production neturi fixture fallback.

V0.2 prideda stock_adjustments, document_sequences/documents ir provider_refund_events. Korekcija atomiškai tikrina expectedAvailable; numeracija vienos įmonės/metų/serijos ribose saugoma toje pačioje transakcijoje kaip nekintantis dokumentas. Užsakymo schema2 gali saugoti normalizuotus kontaktus, adresą ir serverio paštomato kopiją. Pradinė schema1 išlieka skaitoma, kontaktai jai neinventuojami.

Pasirašytas refund faktas atskiriamas nuo pinigų grąžinimo vykdymo. Succeeded pritaikomas tik pagal serverio paymentId → order ryšį; nežinomas payment lieka durable inbox, o paid webhook peržiūri laukiančius faktus. Pending nekeičia grąžintos sumos. Failed/canceled, valiutos ar šaltinio prieštaravimas kuria apskaitos peržiūros išimtį; istorinis finansinis įrašas neanuliuojamas iš spėjimo. Apdorojimo batch ribotas 100 tinkamų įvykių; production scheduler/consumer ir atkūrimas pagal realų provider lieka M7.

Administravimo ekranas naudoja privatų API ir pačią DB; fixture masyvas nėra naršyklės fallback. Trusted identity adapteris privalo grąžinti principal id, serverio storeId ir konkretaus veiksmo permissions. Vietinis hash/expiry žetonas yra tik development adapteris; ne antras bendras auth core.

Money — valiuta ir sveikas mažiausių vienetų kiekis; katalogo/rinkos serverio kainos, consolidation of duplicate lines, bounded quantity. Order saugo title/price/tax/legal/delivery snapshot. Negalima perrašyti istorinių užsakymų pakeitus katalogą.

Mokėjimo būsena, stock, fulfillment ir accounting yra atskiri pjūviai. Stripe success URL nėra mokėjimo tiesa. Raw signed webhook tikrinamas SDK ir account mapping; event dedup, tiksli suma/currency/order/session/environment. Timeout išorinėje paslaugoje atkuriamas pagal stabilią reference/idempotency key.

Outbox turi patvarų correlation/event įrašą kartu su DB pakeitimu. Vykdytojas turi lease/retry ir idempotent destination; daugiau negu vieną kartą pristatomas įvykis negali duoti antros sąskaitos/siuntos/refund. Neprisijungęs mail/queue yra aiški delivery riba.

Siuntų adapteris: quote/list services, validate selection, create/find/cancel, label/tracking. Pakuotės svoris/matmenys ir kaina patvirtinami serverio. Paketų PDF privatūs; prekių data/media vieši atskirai. PDF etiketes ir banko dokumentus laikyti R2 tik kai realus adapteris/prieigos priimti.

Apskaita: struktūruotas operacijos įvykis ir balansuotas žurnalas yra pagrindas, ne teisiškai pilna MB atskaitomybės sistema. Agentas gali siūlyti įrašą; deterministinis validatorius tikrina balance/source/currency/unique. Banko payout skiriamas nuo sale. Tax rule registracija ir declarations filing neįjungti.

Public API kontekstą gauna iš host registry, operatoriaus veiksmai iš verified identity adapterio. Node vietinis operatoriaus testų tokenas nepakeičia bendro production auth. CORS/Origin, PII, security limits, noindex/private projections ir unknown-host fail-closed tikrinami.

[Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment), [D1 batch](https://developers.cloudflare.com/d1/worker-api/d1-database/), esami MAIL_CORE / SEO_GEO_CORE / CONTENT_CORE / MEDIA_CORE / PLATFORM_BUILD_CONTRACT yra sąsajų pagrindas.


## Sandėlio ir finansinių šaltinių plėtra 0.3

0004 prideda components/component_lots/recipes/assemblies/assembly_lots, financial_sources/reconciliations bei wholesale_partners/wholesale_price_lists/wholesale_quotes/wholesale_orders. Nauji domenai Backoffice ir Wholesale naudoja tą patį CommerceService, store/host/env/grant ir D1 batch. Pardavimų stock rezervacijos nekeičiamos: surinkimo transakcija iš žaliavų sukuria gatavą SKU. Atsekamos visos sunaudotos partijos ir immutable sudėties versija.

Finansinis importas yra atskiras įrodymų registras. Nei sutampanti suma, nei įvestas transactionRef nepatvirtina užsakymo mokėjimo; sutikrinimas remiasi tik jau patvirtintais order/refund faktais. Originalo hash, nedubliuojami reconciliation source/target ir pilno batch rollback saugo nuo dvigubos apskaitos. Komisiniai nesupainiojami su prekių pardavimo pajamomis; taisyklių registracija ir oficialus posting/period close lieka vėliau.

B2B pasiūlymas turi immutable partnerio, kainyno, kainų, delivery, įmonės ir contact snapshot. Accept atomiškai sukuria vieną įprastą order ir jo rezervacijas; kitos modulio dalys mato tą patį ID. Viešas retail quote kainyno nepriima. Partnerio portalas/prieigos, kelių siuntų pakavimas ir realus mokėjimo kvitas yra atskiri vartai.

0005 prideda wholesale_partner_changes ir approval_version. Patvirtinimas/stabdymas su expectedVersion bei actor turi audituojamą nekintantį įrašą. Užsakymo įterpimo triggeris pakartotinai tikrina partnerio būseną toje pačioje D1 transakcijoje. Pirminės partnerio apibrėžties idempotent replay nesugrąžina ankstesnio approved flag; jau priimto pasiūlymo replay išsaugo istorinį order.

## Medžiagų kontrolė 0.4

0006 prideda component_lots quarantined/control_version ir nekintantį lot_controls audit. Version didėja tiek nuo operatoriaus kontrolės, tiek nuo kiekvieno surinkimo nurašymo. SQL CAS turi available+version ir galutinio likučio ribas; istorija ir atnaujinimas viena transakcija. Pirminio receipt laukų UPDATE atmetamas, receipt replay jų neperrašo. Papildomas BEFORE assembly_lots triggeris toje pačioje batch tikrina karantiną/galiojimą; dalinai pagaminto SKU nelieka.

## Grąžinimo užduotys0.5

0007refund_commands rezervuoja sumą kartu su nekintančia mokėjimo/paskyros/įmonės/valiutos/operatoriaus užduotimi. DB triggeris tikrina patvirtintas grąžintas ir dar rezervuotas sumas; retry nekeičia pradinio payload.60slease apsaugo kelių vykdytojų būseną, o tikras Stripe idempotency key — išorinį šalutinį veiksmą. Unknown ir pending sumos neatlaisvinamos. Prieš pakartojimą atliekama bounded provider paieška; po23h arba neužbaigus paieškos POST draudžiamas. Succeeded API ir signed webhook pereina bendrą finansinių faktų inbox/confirmRefund kelią. Confirm crash atsigauna su tuo pačiu provider ID. Command metadata tėra paieškos užuomina, ne sumos/paskyros įrodymas; ankstesni event hash kvitai išsaugomi.

Vykdymas ir paruošimas dabar leidžiami tik sandbox/testOnly, su atskira refund teise. Test/live rakto režimas tikrinamas prieš SDK sukūrimą; laikinas agento raktas rkcs_test taip pat yra testinis. Refund objektas neturi livemode lauko; aplinką apibrėžia rakto režimas, o webhook tikrina event.livemode. Tikras bandymų API kvitas nepakeičia production admission ar MB mokėjimo metodų validacijos. Negautas API atsakymas nėra failed finansinis faktas. Atšaukti galima tik dar nepradėtą užduotį; verslo teisinis grąžinimo sprendimas/returndata ir disputes lieka atskiri domenai.
