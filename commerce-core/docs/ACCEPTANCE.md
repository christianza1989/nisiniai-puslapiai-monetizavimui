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

## Atkūrimas ir ankstesni nesėkmingi bandymai

npm ci --ignore-scripts ir npm run verify, vykdant iš commerce-core/. Test fixtures saugomi test/, runtime DB ir bundler outputs ignoruojami. Test harness neįeina į deploy įėjimą.

Pradinis Wrangler 4.92.0 audit turėjo 6 priklausomybių pažeidžiamumus; tik naujas modulis atnaujintas į 4.149.0, lock atnaujintas, audit tapo 0. Pradinis workerd runner neatitiko Miniflare 5 constructor API; pataisytas naudojant įdiegto API convertV4MiniflareOptions. Pirmas checkout bandymas be order token grąžino 403; runner įtrauktas tikras testinis tokenas, 503 neprijungto adapterio patikra išliko. Nesėkmės neužmaskuotos mažinant serverio vartus.

CI ir source review tikrinami GitHub atskirai. Node24 lokalus adapteris nepakeičia esamo core runtime, o Node22 ar kito PC priėmimas šiame pakete neteigtas.

