# Priėmimo matrica

2026-10-11. Node 24.19.0 / Windows. npm test: **20/20 PASS**. npm run test:worker: **PASS atskirame workerd su native D1**. npm run build:worker: Wrangler dry-run PASS, jokio deployment. npm audit: 0 vulnerabilities patikros metu. Tai vietinio paketo įrodymai, ne viso marketplace ar realių tiekėjų priėmimas.

| ID | Bandymas | Būsena / įrodymo ribos |
|---|---|---|
| C01 | unknown store/environment/host | PASS Node ir workerd HTTP; unknown context atmestas |
| C02 | server price/client suma/currency | PASS Node; klientas kainos nevaldo; testiniai LT/PL katalogai |
| C03 | multi-SKU stock failure rollback | PASS Node ir native D1: nėra order/outbox, pradinis stock atkurtas |
| C04 | du paskutinio vieneto pirkimai | PASS Node async, dvi nepriklausomos SQLite worker thread connections ir concurrent workerd HTTP |
| C05 | key replay/payload conflict/lost reply | PASS Node ir D1 replay; client token recovery, kita įvestis/token atmesti |
| C06 | persistence/restart | PASS Node SQLite failas ir workerd dispose/restart su native D1 |
| C07 | signed webhook/body/replay | PASS tikras Stripe SDK Node ir workerd; fake network session, jokio tikro Stripe API |
| C08 | async paid/account/currency/amount/session/payment ID | PASS service guards ir workerd async signed event; realūs payment methods UNVERIFIED |
| C09 | expiry/late paid ir expiry↔paid race | PASS Node; native D1 expiry/late allocate; stock exception patvari ir nepakavimo būsena |
| C10 | label create timeout/recovery | PASS fixture; vienas create po prarasto atsakymo; realus carrier/PDF/tracking UNVERIFIED |
| C11 | pack before paid / cross-store/operator | PASS Node ir workerd fixture identity; tikras core identity UNVERIFIED |
| C12 | withdrawal/refund replay/partial/full/overlimit | PASS Node ir D1 refund guard; request nėra automatinis refund; realus API refund UNVERIFIED |
| C13 | journal balance/source/store | PASS Node ir native D1 posting; document numbering/bank reconciliation/MB filing UNVERIFIED |
| C14 | outbox lease/retry/old ack | PASS Node crash lease ir native D1 ack; remote Queue/DLQ/consumer UNVERIFIED |
| C15 | actual workerd/D1 runtime | PASS realus vietinis workerd, ne tik Node shim; Miniflare 5 alpha pinned; remote D1 UNVERIFIED |
| C16 | SDK payload/build/fail-closed | PASS stable Checkout request, body limit, Origin, production fixtures fail; Worker production 503 |
| C17 | remote admission/backup/mail/bank/carrier | UNVERIFIED; šis paketas neprovisionina ir neįjungia realių paskyrų |
| C18 | UI desktop/mobile/keyboard/200% | NOT IMPLEMENTED šiame pakete; M5/S1 browser priėmimas vėliau |

## 2026-10-12 papildymas: paketas 0.2

Istorinė lentelė viršuje aprašo pirmą paketą. Dabartinis visas rinkinys:30/30 Node PASS, native workerd/D1 PASS, build dry-run PASS, audit: 0. [Išsamus naujo paketo kvitas](CONTINUATION_2026_10_12.md) ir [aktualūs likę vartai](IMPLEMENTATION_STATUS.md).

| ID | Dabartinis papildomas bandymas | Būsena / ribos |
|---|---|---|
| C19 | kontaktų/country/phone/postal ir locker guards | PASS Node; serverio selection kopija ir request conflict, realus adreso/paštomato API UNVERIFIED |
| C20 | stock korekcija/replay/stale/operator/reservation race | PASS Node ir native D1; baigti SKU, komponentų/BOM nėra |
| C21 | sale/credit/packing numeracija/concurrent issue/immutable/rollback | PASS Node ir native D1; tik TEST dokumentai, tikras apskaitos formatas/teisinė politika UNVERIFIED |
| C22 | signed refund/out-of-order/pending/failed/conflict/crash | PASS tikras SDK Node ir workerd; jokių Stripe API write, disputes ir realus refund vykdymas UNVERIFIED |
| C23 | ordered migration/legacy adoption/hash/failure | PASS Node, native D1 migruoja tris dabartinius SQL failus; remote migracija UNVERIFIED |
| C24 | operator id/store/grant/expiry ir private read | PASS Node ir workerd test principal, vietinis scoped CLI adapteris; bendras production identity UNVERIFIED |
| C25 | orders keyset/same timestamp | PASS 5 įrašai, kiekvienas vieną kartą; private API palaiko before+beforeId |
| C18-current | actual UI desktop/mobile/keyboard/text resizing/spacing/persistence | PASS bounded Node/IAB orders/detail/pack/stock/documents kelias; body 16→32px ir tarpai faktiškai pritaikyti. Browser zoom/screen-reader/full WCAG ir production UI UNVERIFIED |

Tekstų ir dizaino peržiūra atlikta nuosekliai vieno agento; ne nepriklausomas auditas. Source callbacks/operator fixtures nepakeičia realios paslaugų prieigos. Nauji priėmimo įrodymai neperrašo senų įrašų ar production admission.

## Atkūrimas ir ankstesni nesėkmingi bandymai

npm ci --ignore-scripts ir npm run verify, vykdant iš commerce-core/. Test fixtures saugomi test/, runtime DB ir bundler outputs ignoruojami. Test harness neįeina į deploy įėjimą.

Pradinis Wrangler 4.92.0 audit turėjo 6 priklausomybių pažeidžiamumus; tik naujas modulis atnaujintas į 4.149.0, lock atnaujintas, audit tapo 0. Pradinis workerd runner neatitiko Miniflare 5 constructor API; pataisytas naudojant įdiegto API convertV4MiniflareOptions. Pirmas checkout bandymas be order token grąžino 403; runner įtrauktas tikras testinis tokenas, 503 neprijungto adapterio patikra išliko. Nesėkmės neužmaskuotos mažinant serverio vartus.

CI ir source review tikrinami GitHub atskirai. Node24 lokalus adapteris nepakeičia esamo core runtime, o Node22 ar kito PC priėmimas šiame pakete neteigtas.


## 2026-10-12 tęsinys: paketas 0.3

Visas dabartinis rinkinys: 39 Node testai, native workerd/D1 ir dry-run build. 0.2 lentelė aukščiau išlieka ankstesnio paketo kvitas; dabartinės migracijos 0001–0005.

| ID | Bandymas | Būsena / ribos |
|---|---|---|
| C26 | shared component assembly/FEFO/unit/shortage/race/rollback/replay/store | PASS Node ir native D1; operatorius realiame IAB surinko testinį rinkinį. Tikras Memo BOM nepatvirtintas |
| C27 | financial import/dedup/hash/atomicity/signs/immutability | PASS Node/native D1; normalizuotas fixture, realus Stripe balance/bank originalų adapteris UNVERIFIED |
| C28 | payment/refund/transfer reconciliation/duplicate source and target | PASS Node/native D1; nekeičia payment state ar journal iš importo; posting/tax/period close UNVERIFIED |
| C29 | private wholesale price/MOQ/casepack/snapshot/expiry/approval/order race/reorder | PASS Node/native D1; realus IAB quote→order→reorder. Production atmeta; partnerio portalas/credit/proforma ir mokėjimo prieiga UNVERIFIED |
| C30 | nauji Medžiagos/Sutikrinimas/Didmena ekranai | actual IAB desktop/mobile ir keyboard kelias; 16→32px/tarpai dev-only QA. Kainyno/partnerio kūrimo ir approval formos realiai išsaugotos; esamų duomenų keitimas ir portalas dar nėra |
| C31 | partnerio prekybos CAS/replay/istorija ir revocation acceptance race | PASS Node: dvi stale versijos, viena sėkmė; sustabdymas tarp read ir batch atšaukia order/stock/audit. Native D1 approval replay/stale/immutability/paused quote ir istorinis acceptance replay PASS |

Native D1 pirmas didmenos testas gavo stock_unavailable: anksčiau šiame runner buvo tik vienas šeimos rinkinys ir komponentų race galėjo atiduoti medžiagą porai. Didmenos fixture papildytas per tą patį audited stock adjustment; neigiamas stock guard testas paliktas. Naršyklės bandymas atskleidė du konkuruojančius asinchroninius renderius ir pasikartojančius valdiklius. Reload dabar laukia render, dinaminis skyrius turi atskirą DOM parent; realus pakartotinis quote/accept/reorder matė vieną formą ir vieną užsakymą.

Galutinis dry-run: 82.05 KiB / gzip 16.73 KiB; nuotolinio deploy nebuvo. Impeccable detektorius po dokumentuotos paletės ir realaus šrifto inventoriaus sutikrinimo grąžino `[]`; ankstesnės advisory ir jų sprendimas išsaugoti tęsinio kvite. Mobilus 390px vaizdas ir visos naujos didmenos formos turi 335px clientWidth=scrollWidth, bendras scrollWidth375; tas pats išlieka su 32px tekstu ir nustatytais tarpais. Native select siaurame vaizde trumpina ilgą pasirinktą kainyno žymenį; visas žymuo matomas kainynų lentelėje. Tikras browser zoom ir visas WCAG auditas neatlikti.

## Papildymas0.4 — partijos

42/42Node, native workerd/D1 migracijos0001–0006, format ir dry-run84.08KiB/gzip17.00 PASS. [Faktinis kvitas](CONTINUATION_2026_10_12_LOTS.md). Ankstesni0.1–0.3kvitai yra istoriniai, jų counts neperrašyti.

| ID | Bandymas | Ribos |
|---|---|---|
| C32 | lot receipt immutability, actor/reason audit, count/quarantine/release/replay/CAS/isolation | Node ir nativeD1 PASS. Recipe/release nepanaikina galiojimo |
| C33 | karantinas tarp assembly read ir batch, visas rollback; stale po sunaudojimo | Node race PASS; native D1paused/resume/concurrent count/replay ir versijos PASS |
| C34 | actual private lot-control UI, error/recovery, desktop/mobile/text spacing/restart | IAB veiksmai perskaityti iš serverio,390form/table335px beoverflow,32px/tarpai; pilnas WCAG ir production neįrodyti |
