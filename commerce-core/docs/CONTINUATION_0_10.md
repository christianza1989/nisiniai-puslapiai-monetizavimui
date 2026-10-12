# 0.10: automatinis vykdymas po komplektavimo

Tęsia 0.9 pilno pagrindo paketą. Browser SDK JS failai nepakitę.

PackingConfirmed → nekintantis komplektavimo PDF → individualių tikrų SKU
pakuočių planas → šviežia vežėjo kaina → patvari siuntos komanda → vienas
POST → ShipmentRegistered → privatūs tiekėjo PDF ir sekimo įvykiai.
Cron / Queue vykdo tą pačią patvarią eigą; vienas rankinis darbas yra fizinių
prekių sukomplektavimo patvirtinimas. Kombinuotoms dėžėms reikia operatoriaus
tikrų matmenų; jos automatiškai neišgalvojamos.

Politikos: autoPrepareIndividualShipments, autoExecutePreparedShipments,
autoCollectShipmentDocuments. Jos visos uždarytos Memocasting production
šablone. maxCarrierSubsidyMinor yra aiškiai patvirtinta papildoma vežėjo
biudžeto dalis centais; numatyta 0. Be jos vežėjo kaina negali viršyti
pirkėjo pristatymo sumos. Discontinued / nepatvirtinta paslauga, pilno siuntėjo
trūkumas ar kainos viršijimas sustabdo automatiką. Operatoriaus planas /
komanda / atšaukimas turi pirmenybę.

PackingConfirmed nesėkmė keliauja per esamą retry / backoff / dead eilę.
Kitas bandymas tęsia tą patį planą, bet gali gauti naują šviežią pasiūlymą.
Unknown po ne-idempotent POST negauna antro siuntimo. Rezultatą sutikrina
operatorius pagal tikrą tiekėjo ID / faktus. ShipmentRegistered PDF
surinkimo klaida taip pat matoma darbų eilėje.

Pirkėjo pristatymo kaina papildomai susieta su gavėjo isCompany, aktualiu
siuntėju ir paslaugų leidimų sąrašu. Pakeistas sandėlis / paslauga
nepernaudoja seno pasiūlymo. Jau priimto užsakymo replay lieka stabilus;
nepriimti iki šio pakeitimo pasiūlymai turi būti perskaičiuoti.

Didmenos vežėjui perduodama sutarta didmenos prekių vertė, ne mažmeninė.
Privatūs kainų override yra tik patikėtos Wholesale klasės parametras;
viešas JSON / klientas jo nepriskiria. Legacy ship endpointas prieš DB
rašymą atmeta adapterį, neturintį seno idempotent create kontrakto.

## Priėmimas

Node tikrina paid → pack → prepare → register → private PDF vieną kartą;
padidėjusi kaina sustabdo prieš POST, o vėliau grįžęs leistinas tarifas
tęsia tą patį planą. Prarastas provider atsakymas per keturis jobs bandymus
palieka vieną POST ir unknown. Native workerd/D1/R2 bandymas tą patį kelią
atlieka su tikrais storage / transaction interfeisais ir atskiru provider
fixture. Realių tinklo operacijų neatlikta.

IAB 2026-10-12: 0905BADA, €39.99, vietinis imituotas apmokėjimas; operatorius
tik patvirtino komplektavimą ir paleido darbų eilę. Ji pati suformavo
siuntėją, 2 kg / 20×20×17 cm planą, TEST €7.99 kainą, komandą ir provider
fixture 1002. Kitas outbox ciklas surinko privatų PDF ir TEST sekimą.
Pirkėjo ekranas 320/320 px, apmokėjimas / TEST-S-2026-2.pdf / TEST1002.
Privatūs įrodymai: tmp/ui-review/automatic-shipping-buyer-320-10.png ir
automatic-shipping-operator-10.png.

Fixture provider PDF yra ankstesnio TEST pardavimo dokumento kopija.
Tai tikro siuntos lipduko / brūkšninio kodo / pristatymo / kainos įrodymu
nelaikoma. Tikra PDF paskirtis ir booking cost ceiling patikrinami per
Siųsk pigiau prijungimą. Faktinis gavėjo INBOX ir production neįjungti.

Svetainės native 66 tekstai ir pilnas lokalus site audit tęsiasi atskiroje
savininko sesijoje. Šis kvitas neužbaigia jų priėmimo.

## 0.10.1 didmenos rekvizitai

Partnerio forma ir privatus užsakymo vaizdas turi įmonės kodą, pasirinktinį
PVM kodą ir atskirą kontaktinį asmenį. Dokumento pirkėjo vardas yra įmonės
juridinis pavadinimas; siuntai perduodamas kontaktas ir atskiri įmonės
rekvizitai. Iki tol forma nepateikė visų jau backend palaikomų laukų.
Tai pateikti duomenys, ne automatinė įmonės / PVM registro verifikacija.

Actual IAB: TEST partneris išsaugotas nepatvirtintas, tada patvirtintas
privačioje fixture aplinkoje; MOQ2 / casepack2 kainynas €20 už poros
rinkinį, qty4, carrier quote → €87.99, vienas priimtas užsakymas 113CC217
ir jo vietinė Checkout nuoroda. Tikras partneris ar mokėjimas nesukurti.
Įrodymas tmp/ui-review/wholesale-company-checkout-10.png.

## 0.10.2 taisyklių nuoroda ir šalies pakeitimas

Svetainės integracija atskleidė, kad fiksuota UI kalbos taisyklių nuoroda
neatspindi kitos pasirinktos pristatymo šalies taisyklių versijos.
Canonical mountCheckout termsUrl dabar priima ir resolver su pasirinkta
country / policyVersion bei sąsajos language. Nerasta atitiktis, svetimas
URL ar resolver klaida neleidžia patvirtinti ir pateikti užsakymo.
Pakeitus šalį, ankstesnis checkbox sutikimas išvalomas ir suma tikrinama
iš naujo. Serverio priimamos rinkos taisyklių versijos kontraktas nepakito.

97 Node testai, native workerd / D1 / R2 / Queue ir dry-run PASS.
Resolver testas tikrina LT sąsajos PL rinkos teisingą nuorodą, senos versijos
atmetimą ir same-origin / credential ribas. Tikra vietinio fixture naršyklė
rodo PL pasirinkimą, išvalytą checkbox ir neaktyvų submit 320 px pločiu:
tmp/ui-review/terms-country-reset-320-102.png. Fixture naudoja bendrą
taisyklių URL, todėl native svetainės revision → URL atitikties ši nuotrauka
neįrodo; ji tikrinama svetainės sesijoje. Teisinis turinio priėmimas atskiras.

## 0.10.3 išsaugoto užsakymo pavadinimai

Actual svetainės LV bandymas atskleidė, kad išsaugoto užsakymo ekranas
naudojo originalų line.title, nors formoje jau veikė productTitle callback.
Tas pats callback dabar taikomas ir užsakymo peržiūroje, su sąsajos language
ir line kopija. Originalus užsakymo / apskaitos snapshot bei sumos nekeičiami.
Native pavadinimo atitiktį ir create / reload rezultatą tikrina svetainės
sesija po naujo canonical SDK prijungimo; tai nėra PDF vertimo pakeitimas.
