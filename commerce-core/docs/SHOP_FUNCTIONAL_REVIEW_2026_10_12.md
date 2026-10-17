# Pilno parduotuvės veikimo peržiūra

Tai aktuali canonical prekybos programinės dalies patikra pagal pilno pagrindo
pavedimą. Našumas, galutinis viešos svetainės dizainas ir būsimų agentų kūrimas
atidėti. Ankstesni acceptance failai yra istoriniai; jų senos NOT IMPLEMENTED
eilutės nekeičia žemiau pateikto esamo source inventoriaus.

0.12.1: **LOCAL_SHOP_CODE_VERIFIED; PRODUCTION_NOT_READY.** Exact SDK ir
susietos svetainės native buyer / expiry / hold kelias patikrintas.
[Aktualus susietas priėmimas ir tikrieji paleidimo vartai](LOCAL_SHOP_ACCEPTANCE_0_12_1.md).

| Kelias | Dabartinis kodas ir konkretus įrodymas | Dar nepriimta |
|---|---|---|
| Katalogas / kainos / pakuotės / priedai | CAS versijos, tik serverio kainos, inactive nežinomų matmenų priedai; catalog / quote-acceptance / buyer-delivery tests ir native D1 | Tikras inventorius, priedų pakuotės, patvirtintos užsienio kainos |
| Krepšelis / forma / quote / užsakymas | Hook tik SKU/kiekiai, create-clear, lost-response, nauji pasirinkimai po seno order, vėlyvo quote atmetimas ir input lock; svetainės actual Add / storage / reload / new-order patikra. Exact 0.12.1 SDK, tuščias krepšelis, originalus pristatymas, expiry / unpaid ir karantinas keturiomis kalbomis | Tikra production prekyba ir tiekėjų prijungimas |
| Kalbos / sąlygos | Keturių kalbų UI, country+approved revision terms resolver, reset; actual site LV reload ir LT UI/LV country su nepakeistu snapshot SHA. Exact SDK source | Teisinė turinio approval nėra production legal admission |
| Mokėjimas / stock expiry / webhook | Stripe SDK Checkout / signed async inbox / account-amount-currency-session guards / unique PaymentIntent; Node+native; ankstesnis isolated real TEST32EUR ir refund replay | Nuolatinė MB Stripe paskyra, live/sandbox faktinės prieigos, HTTPS webhook ir tikras mažas patikros kvitas |
| Medžiagos / surinkimas / likučiai | Komponentų ir rinkinių partijos, FEFO paskyrimas, paveldėtas galiojimas / karantinas, CAS kiekiai, saugi senų duomenų migracija; 116 Node ir native D1, operatoriaus partijos / karantino / panaikinimo patikra | Tikra fizinė inventorizacija ir tiekėjo galiojimo faktai |
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

RESOLVED_CODE 0.12: ankstesnė diagnostika parodė, kad surinktas rinkinys buvo
rezervuojamas po komponento galiojimo. 0021 ir finished-stock kelias dabar
išsaugo kilmę, paveldi galiojimą / karantiną ir atomiškai paskiria tinkamas
partijas. Reprodukcija tapo formalios regresijos dalimi: katalogas 0,
rezervacija atmesta be stock / order / allocation mutacijos. Tikras mokėjimas
po galiojimo išsaugomas, vykdymas sustabdomas. Native D1 tikrina tą patį kelią;
paskutinės siuntos SQL žymos race testas įrodo 0 vežėjo POST. Tikri savininko
likučiai šiame bandyme nenaudoti. [Migracija ir kvitas](CONTINUATION_0_12.md).

## Tikri išoriniai ir savininko vartai

MB306026827, dispatch/returns Molynės g.2C, Vilnius02211, telefonas ir public
info@memorycasting.lt įrašyti. Registracijos adreso atitiktis RC įrašui dar
nepatvirtinta. Reikia tikrų SKU / komponentų likučių, tiekėjo instrukcijų ir
galiojimo faktų, priedų pakuočių. Nežinomas nėra testinis inventorius.

Stripe / Siųsk pigiau / mail / production hosting-binding-grants vartai
aprašyti 0.9 prijungimo sutartyje. Tiekėjas patvirtino, kad atskiros vežėjo
sutarties ir mėnesinių/API mokesčių nereikia; tai nepakeičia IT ir kainų
bandymo. Jokių realių mokėjimų, siuntų, laiškų ar deployment ši patikra neįjungia.

Žinomos nepriklausomos vietinio shop kodo spragos užbaigtos. Exact 0.12.1
PUBLIC integracijos actual kvitas patvirtina krepšelį, išsaugotą pristatymą,
expired / unpaid, atsisakymo ir realiai traced karantino būsenas keturiomis
kalbomis. Production ir visos svetainės auditas nėra šio priėmimo dalis.
