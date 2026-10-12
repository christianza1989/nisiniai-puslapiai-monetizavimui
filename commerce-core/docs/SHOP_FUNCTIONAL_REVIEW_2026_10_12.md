# Pilno parduotuvės veikimo peržiūra

Tai aktuali canonical prekybos programinės dalies patikra pagal pilno pagrindo
pavedimą. Našumas, galutinis viešos svetainės dizainas ir būsimų agentų kūrimas
atidėti. Ankstesni acceptance failai yra istoriniai; jų senos NOT IMPLEMENTED
eilutės nekeičia žemiau pateikto esamo source inventoriaus.

| Kelias | Dabartinis kodas ir konkretus įrodymas | Dar nepriimta |
|---|---|---|
| Katalogas / kainos / pakuotės / priedai | CAS versijos, tik serverio kainos, inactive nežinomų matmenų priedai; catalog / quote-acceptance / buyer-delivery tests ir native D1 | Tikras inventorius, priedų pakuotės, patvirtintos užsienio kainos |
| Krepšelis / forma / quote / užsakymas | 0.11 hook tik SKU/kiekiai, create-clear, lost-response, nauji pasirinkimai po seno order, vėlyvo quote atmetimas ir input lock; septyni mounted-unit scenarijai. Serverio rollback / race / request key / amount tests | Svetainės actual naujo hook / storage / Add / reload priėmimas atskirame checkout |
| Kalbos / sąlygos | Keturių kalbų UI, country+approved revision terms resolver, reset; actual site LV reload ir LT UI/LV country su nepakeistu snapshot SHA. Exact SDK source | Teisinė turinio approval nėra production legal admission |
| Mokėjimas / stock expiry / webhook | Stripe SDK Checkout / signed async inbox / account-amount-currency-session guards / unique PaymentIntent; Node+native; ankstesnis isolated real TEST32EUR ir refund replay | Nuolatinė MB Stripe paskyra, live/sandbox faktinės prieigos, HTTPS webhook ir tikras mažas patikros kvitas |
| Medžiagos / surinkimas / likučiai | Component receipts, recipe, FEFO, quarantine/count CAS, concurrent assembly rollback ir auditas | Toliau rastas finished-kit expiry/traceability defektas; žr. atskirą eilutę žemiau |
| Grąžinimai / refund | Fizinis qty limit / inspected restock / original order; atskiras leased refund / budget / recovery, visiškai refunded unshipped cancel vieną kartą. HTTP/native ir actual operator proof | Faktinės įmonės grąžinimo politika ir live provider bandymas |
| Siunta / dokumentas / sekimas | Paid+physically packed → durable individual plan/fresh budgeted quote/one POST → private PDF/tracking; unknown niekada nekuria antro POST; manual operator plan laimi. Native Queue+actual fixture1002 | Siųsk pigiau IT auth/refresh/IP/proposal price ceiling/locker/multiple parcels/real label type atsakymai ir faktinis staging bandymas |
| Dokumentai / PDF | Immutable numbering, sale/credit/packing, pinned Unicode font, buyer/operator permissions; R2/native/hash testai ir tikras rendered TEST PDF | Patvirtintas registracijos adresas / serijos / non-VAT politika bei production numeracija |
| Operaciniai laiškai | Immutable localized draft / Message-ID / one attempt / unknown-reconcile; canonical binding+site private MAIL_CORE SMTP gateway fixture | Faktinis authenticated sender / transport secret ir autorizuotas pristatymo kvitas; SMTP accepted nėra INBOX |
| Finansiniai šaltiniai / žurnalas | Immutable original CSV, exact mapping/dedup/hash, Stripe gross/fee/payout facts, private original/export, matched-source identity, balanced posting, signed dispute timeline | Patvirtintos tikros apskaitos taisyklės / laikotarpių uždarymas / deklaravimas yra vėlesnė AI apskaitos apimtis |
| Administravimas / permissions | Host/store/env/core grant/expiry/action boundary, private UI/files; actual order/catalog/return/B2B/ship UI ir native guards | Tikros production grants ir roles nėra išduotos; screen reader/actual zoom nėra bendras PASS |
| Didmena | Private list/MOQ/casepack/partner approval/quote/accept/reorder/Checkout; actual legal company/contact fixture | Credit, samples/proforma ir partnerio self-service portalas neįjungti; agentai ir realus bulk pilotas vėliau |
| Jobs / išimtys / atkūrimas | Transaction outbox/lease/backoff/dead/operator retry/native Queue; encrypted exact SQLite+PDF export ir new disabled-candidate restore | Production D1/Queue/R2 recovery ir rollout tikrinami tik realiai prijungtoje infrastruktūroje |

## Rasti kodo defektai

0.11 pataiso actual svetainėje parodytą checkout quantity → reload praradimą,
neišvalytą krepšelį po create ir naujų prekių praradimo riziką prie seno order.
Papildomas controlled-async testas tikrina nebegaliojančio quote atsakymą;
request inputs užrakinti kuriant užsakymą. Hook klaida nestabdo sukurto order.
Native phone pattern actual svetainėje teisingas ir neperrašytas.

OPEN_CODE: pagaminto rinkinio likutis neturi suvartotų komponentų galiojimo /
karantino kontrolės. Bounded read-only testinių duomenų diagnostika
tmp/review-kit-expiry.mjs: komponentas galiojo surinkimo metu, tada testinis
laikrodis perėjo galiojimą; katalogas vis tiek rodė 1 ir order rezervavo jį.
Tai nauja konkreti programinės dalies spraga, ne trūkstamas provider raktas.
Ji taisoma tolesniame stock/fulfillment inkremente prieš galutinį priėmimą.
Tikri savininko likučiai ar medžiagų galiojimo faktai šiame bandyme nenaudoti.

## Tikri išoriniai ir savininko vartai

MB306026827, dispatch/returns Molynės g.2C, Vilnius02211, telefonas ir public
info@memorycasting.lt įrašyti. Registracijos adreso atitiktis RC įrašui dar
nepatvirtinta. Reikia tikrų SKU / komponentų likučių, tiekėjo instrukcijų ir
galiojimo faktų, priedų pakuočių. Nežinomas nėra testinis inventorius.

Stripe / Siųsk pigiau / mail / production hosting-binding-grants vartai
aprašyti 0.9 prijungimo sutartyje. Tiekėjas patvirtino, kad atskiros vežėjo
sutarties ir mėnesinių/API mokesčių nereikia; tai nepakeičia IT ir kainų
bandymo. Jokių realių mokėjimų, siuntų, laiškų ar deployment ši patikra neįjungia.

Visas shop dar nepažymėtas priimtu. Native PUBLIC integracijos ir šios stock
spragos aktualūs kvitai turi būti užbaigti; testų suma nėra šio sprendimo pakaitalas.
