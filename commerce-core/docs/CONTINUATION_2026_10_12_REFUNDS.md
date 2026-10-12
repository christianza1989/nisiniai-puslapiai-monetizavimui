# Grąžinimo užduočių ir Stripe bandymų kvitas0.5

2026-10-12 vietiniu laiku; branch codex/commerce-core-20261011, issue95, draft PR96. Tęsiamas savininko užsakytas visas prekybos modulis. Šis paketas yra tarpinis rezultatas; svetainė ir jos turinys priklauso atskirai aktyviai sesijai. Nuolatinė MB paskyros aplinka, realūs pinigai, vežėjo operacijos ir deployment šiuo kvitu nepriimti.

Įgyvendintas RefundCommands domenas ir0007migracija, SDK create/list/retrieve adapteris, privataus API refund teisė ir operatoriaus forma. Paruošimas rezervuoja likusią sumą atomiškai; nepasikeičia mokėjimo ID, paskyra, valiuta, suma, priežastis ar paruošęs operatorius. Vykdymo bandymas ir nevykdytos užduoties atšaukimas turi operatoriaus audit/outbox. Atšaukimas palieka įrašą, bet atlaisvina rezervuotą sumą. Terminalios ar jau pradėtos užduoties ištrynimo/atšaukimo API nėra.

## Patikros

| Kelias | Įrodymas / ribos |
|---|---|
| Formatas ir Node regresija |53/53PASS su Node24.19.0; nauji budget race/replay/immutable/cross-store, lost reply, pending→success, crash, lease/stale lease,23h/incomplete no-POST, provider mismatch, cancel/changed budget/grant/production/key-mode ir legacy event hash testai |
| Native workerd/D1 | visos7migracijos; concurrent HTTP sumos rezervacija, execution/replay, cancel, immutable fields ir ankstesni stock/docs/finance/B2B keliai PASS |
| Dry-run |97.70KiB/gzip19.28KiB prieš galutinį docs-only perdavimą; deploy nevykdytas |
| Tikras Stripe Checkout | atskira anoniminė, nepriskirta MB live paskyrai sandbox; official CLI1.53.1 ir Stripe SDK23.0.0. Hosted formoje tik sintetinis pirkėjas ir Stripe4242 testinė kortelė.32EUR session GET=complete/paid, PaymentIntent GET livemode=false/status=succeeded |
| Tikras mokėjimo pranešimas | CLIlisten perdavė checkout.session.completed į127.0.0.1:8798/api/stripe/webhook; tikras Stripe parašas patikrintas SDK, DB paid/allocated. Grįžimo URL mokėjimo netvirtino |
| Tikri daliniai bandomieji grąžinimai | operatoriaus UI paruošė/vykdė5EUR ir3EUR; Stripe API2succeeded refunds, vietinis refunded_amount800centų ir2accounted commands |
| Tikras Stripe idempotency replay | scripts/stripe-sandbox-verify.mjs --prove-idempotency pakartojo abi originalias POST užklausas per23h; tie patys provider ID, tik2refunds/800centų, provider ir local sumos sutapo |
| UI ir atkūrimas | actual IAB1440×1080,390×844 ir320×844; normalūs duomenys, prepare/succeeded/unknown/cancel, neaktyvus shipping, native form ir serverio budget409 klaida. Kito operatoriaus2400centų rezervacija sukėlė aiškią klaidą, cancel atkūrė24EUR likutį, tos pačios nepavykusios užduoties retry tada pavyko. Bandomosios1EUR/24EUR užduotys atšauktos prieš API, realių test refunds liko tik2 |
| Tekstas/tarpai/klaviatūra |390px ir32pxroot su line1.5/letter0.12em/word0.16em/p2em: form ir abi lentelės client=scroll335px.320pxnormal:265px. Vienos eilutės ilgas input slenka horizontaliai kaip įprastas teksto laukas; jo tekstas redaguojamas. Tab nuo priežasties pasiekė submit; console warn/error[]. Browser zoom, screen reader ir pilna WCAG UNVERIFIED |
| Restart | atskiras runtime/stripe-local.sqlite išsaugojo vieną apmokėtą užsakymą, du grąžinimus ir atšaukimus; realios Stripe GET sumos po restart sutapo. Ankstesnis runtime/local.sqlite nepakeistas |

Naršyklės įrodymai ignoruojamame tmp/ui-review: refund-form-desktop.jpg, refund-budget-error-mobile.jpg, refund-result-mobile320.jpg, refund-spacing-mobile.jpg, refund-final-desktop.jpg. Visi peržiūrėti to paties agento nuosekliai. UI normalūs terminalūs labels bei klaida redaguoti taisyklinga lietuvių kalba, išlaikant sumas, valiutą ir veiksmo prasmę. Review/pending serverinės būsenos patikrintos domeno testais; jų atskiro actual UI pilno scenarijaus šis kvitas neteigia.

## Atkūrimas

Įprastas npm run verify yra visiškai vietinis ir nesikreipia į mokėjimo API. Atskirai realiam testui reikia private JSON su secretKey testinio režimo, accountRef ir webhookSecret; jokio rakto ar claim URL šaltinio kode/Git. Node-only localStripeSandbox tikrinamas prieš adapterio sukūrimą. CLIlisten turi naudoti tą pačią izoliuotą CLI konfigūraciją ir project-name; jo secret išsaugomas privačiai. Savininkas pateikė el. paštą šiai bandymų aplinkai; nauja laikina aplinka baigiasi2026-10-18. Norint ją naudoti ilgiau, reikia ją priskirti savininko Stripe paskyrai. Tai nėra jau veikiančio MB sandbox priėmimas.

```sh
node scripts/dev.mjs --port 8798 --stripe-sandbox runtime/stripe-development/sdk.json
npm run operator:token -- store_stripe
node scripts/stripe-sandbox-verify.mjs --config runtime/stripe-development/sdk.json --database runtime/stripe-local.sqlite --order YOUR_TEST_ORDER_ID
```

Optional --prove-idempotency vykdo tik originalių, jau patvirtintų sandbox komandų POST su tais pačiais duomenimis ir key; patikra pati atmeta senesnį negu23h bandymą. Skriptas netinka nevaldomų dashboard grąžinimų turinčiam order auditui ar production. CLI raktai, jo raw išvestis, webhook secret, order bearer, privataus API duomenys ir screenshotai nėra commit dalis. Git restore ir exact-staged safety rezultatai fiksuojami žurnalo nauju įvykiu.

## Nesėkmės ir ribos

Pradinis CLIcreate be email nepraėjo; savininkui pateikus adresą anoniminis sandbox sukurtas. Privataus TOML converter pradžioje netiko viengubos kabutės; pataisytas žinomų literal laukų nuskaitymas. Diagnostikos maskavimas pradžioje neatpažino naujo rkcs_test prefikso; tai buvo šio laikino sandbox raktas, gyvos paskyros raktų nebuvo. Naujos diagnostikos klaidos spausdina tik tipą/būseną. Prieš ilgalaikį šios aplinkos naudojimą pakeisti bandymų raktą.

Pirmas naujas Node testas turėjo neteisingą unknown-store klaidos lūkestį; pataisytas tikras kito store fixture ir404grąžinimo izoliacija. WebMCP formos fill baigėsi timeout, bet actual laukų state parodė užpildytus testinius duomenis; jie nebuvo įvesti dar kartą. Pirmas APIrefund turėjo neteisingą refund.livemode lūkestį; tikras pasirašytas webhook užbaigė tą pačią užduotį. Schema pataisyta, kitas3EUR bandymas ir tiesioginis API replay pavyko. Refund objektas neturi livemode; realios aplinkos įrodymas yra Checkout/PaymentIntent režimas, priimto rakto režimas ir event.livemode. Actual Stripe puslapis rodė žalią sėkmės žymę, bet automatinis grįžimas į localhost neįvyko; viešos svetainės HTTPS return kelias dar nepatikrintas.

Neaiškus rezultatas nėra patvirtintas grąžinimas. Po23h galima GET/webhook reconciliation; naujas POST ar naujas key automatiškai nekuriamas. Neužbaigta daugiau negu1000refund objektų paieška ir daugiau negu vienas metadata atitikmuo reikalauja peržiūros. Contradictory/mismatch review sprendimo UI, disputes ir produkciniai refunds lieka kitas darbas. Dalinai grąžintų užsakymų esama pack/ship politika jų automatiškai nevykdo; atskira grąžinimų/vykdymo politika dar reikalinga. Šis paketas neįjungia apskaitos agentų ar teisinių refund sprendimų.

Pirminiai šaltiniai: [Stripe refund API](https://docs.stripe.com/api/refunds), [idempotency ir klaidų atsigavimas](https://docs.stripe.com/error-low-level), [sandboxes](https://docs.stripe.com/sandboxes), [Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment). Tikras API ir oficiali CLI dokumentacija tikrinti2026-10-12; laikinos aplinkos metodai neperkelti kaip MB paskyros patvirtinti metodai.

Galutinė peržiūra atkūrė cancel tarp execution read ir lease claim lenktynę. Claim UPDATE papildytas terminalios būsenos guard;53-iasis regresijos testas įrodo, kad atšaukta užduotis išlaiko first_attempt_at=NULL ir provider POST nekviečiamas. Tai naujas taisymas, ne sumažintas testų kriterijus.
