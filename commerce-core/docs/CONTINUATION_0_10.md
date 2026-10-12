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
