# Nemokamas pristatymas su nuolaidos kodu

Savininko pavedimas: kuriant ar redaguojant procentinį arba EUR kuponą galima pažymėti „Nemokamas pristatymas“. Pažymėjus klientas nemoka pristatymo; pasirinktas kurjeris, paštomatas, adresas ir tikra vežėjo kaina išlieka vykdymui. Atskiro nulinės prekių nuolaidos tipo ši pataisa neprideda.

- [x] Additive 0028 migracija, esami kodai numatytai be nemokamo pristatymo; senų komandų replay ir redagavimas be naujo lauko suderinami.
- [x] Administravimo checkbox kūrimui/redagavimui, būsena sąraše; išsaugojimas ir įjungimo/išjungimo patikra izoliuotoje parduotuvėje.
- [x] Serverio kainos ir nekintamas užsakymo snapshot: klientui 0, originalus tarifas ir atskira shipping_amount audito suma. Įprastas galiojantis vežėjo pasiūlymas tebėra privalomas.
- [x] Stripe net suma, GA4 shipping=0, sąskaitos ir administravimo paaiškinimas; operatoriaus vežėjo kaina nesumažinama. Jokio dvigubo nuolaidos atėmimo.
- [x] Krepšelio 0 € peržiūra dar prieš kontaktus ir įprastos kainos atkūrimas pašalinus kodą; galiojančių sąlygų ir paštomatų paieškos vartai išsaugoti.
- [x] 264 canonical testai, format, native workerd/D1 ir dry-run. Po vizualios peržiūros hint sugrupuotas su checkbox ir aria-describedby; paveikti 11 testų pakartoti.
- [x] Esama administravimo tipografika ir check-field. Desktop ir 320 px peržiūra: etiketė, paaiškinimas, kontrolės ir tekstas matomi. Visa nauja LT copy saviredaguota; nepretenduojama į pilną svetainės a11y sertifikavimą.
- [ ] Tikslus SDK importas ir PUBLIC build/test/type/lint.
- [ ] Actual produkcijos additive migracija, backend/frontend diegimas su esamais bindings ir hosted priėmimas.
- [ ] Scoped Git perdavimas ir runtime/rollback įrodymai.

Bazė CORE 9f3f2bc443ad13ad006e9e4c5a5d5479b06cb3fa / PUBLIC 9f6058533d4d61fad4acdc72ca88a7625dc63e51, issue274. Privatūs įrodymai qa/free-shipping-20261026. Originalios naujų testų fixture klaidos išsaugotos; pataisyti fixture hostname, plan mode ir record.payload skaitymas, o ne verslo vartai.

Izoliuota vietinė parduotuvė: LOCALFREE10 10 % + pristatymas; 32,00 € -> 28,80 €, pristatymas 0 €. Pašalinus kodą grįžta įprastos sumos. Kūrimui/redagavimui naudotas tik localhost; produkcijos bandomasis kuponas, užsakymas, mokėjimas, siunta ar kliento laiškas nekuriami. Savininko atidarytas krepšelis neperkraunamas.

Po prekių nuolaidos su nemokamu pristatymu turi likti bent 0,50 € mokėjimui. Tai esama EUR mokėjimo riba; siunčiama aiški klaida dar peržiūroje. Esamo 99 % kupono automatiškai nekeičiame.

Rollback: additive 0028 nenaikinti, senų migracijų hash nekeisti, DB neatstatyti. Prireikus per versioned editor išjungti nemokamo pristatymo flag naujiems užsakymams. Išsaugoti jau sukurtų užsakymų delivery=0, originalią naudą ir visas istorines kainas/uses. Grąžinant senesnę UI/backend versiją draudžiama perrašyti dabartinius bindings, secrets, rinkų taisykles, mail ir cron. Prieš/po diegimo vykdyti checkout policy preflight; LT hash 7893ecb3 išlieka.
