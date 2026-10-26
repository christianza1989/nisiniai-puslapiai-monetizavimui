# Nemokamas pristatymas su nuolaidos kodu

Savininko pavedimas: kuriant ar redaguojant procentinį arba EUR kuponą galima pažymėti „Nemokamas pristatymas“. Pažymėjus klientas nemoka pristatymo; pasirinktas kurjeris, paštomatas, adresas ir tikra vežėjo kaina išlieka vykdymui. Atskiro nulinės prekių nuolaidos tipo ši pataisa neprideda.

- [x] Additive 0028 migracija, esami kodai numatytai be nemokamo pristatymo; senų komandų replay ir redagavimas be naujo lauko suderinami.
- [x] Administravimo checkbox kūrimui/redagavimui, būsena sąraše; išsaugojimas ir įjungimo/išjungimo patikra izoliuotoje parduotuvėje.
- [x] Serverio kainos ir nekintamas užsakymo snapshot: klientui 0, originalus tarifas ir atskira shipping_amount audito suma. Įprastas galiojantis vežėjo pasiūlymas tebėra privalomas.
- [x] Stripe net suma, GA4 shipping=0, sąskaitos ir administravimo paaiškinimas; operatoriaus vežėjo kaina nesumažinama. Jokio dvigubo nuolaidos atėmimo.
- [x] Krepšelio 0 € peržiūra dar prieš kontaktus ir įprastos kainos atkūrimas pašalinus kodą; galiojančių sąlygų ir paštomatų paieškos vartai išsaugoti.
- [x] 264 canonical testai, format, native workerd/D1 ir dry-run. Po vizualios peržiūros hint sugrupuotas su checkbox ir aria-describedby; paveikti 11 testų pakartoti.
- [x] Esama administravimo tipografika ir check-field. Desktop ir 320 px peržiūra: etiketė, paaiškinimas, kontrolės ir tekstas matomi. Visa nauja LT copy saviredaguota; nepretenduojama į pilną svetainės a11y sertifikavimą.
- [x] Tikslus SDK importas ir PUBLIC build/test/type/lint: 273 testai, TypeScript, scoped ESLint, build, policy preflight ir actual-profile dry-run.
- [x] Actual produkcijos additive migracija, backend/frontend diegimas su esamais bindings ir hosted priėmimas.
- [x] Source CORE PR275 ir PUBLIC PR88 sujungti; runtime/rollback įrodymai užfiksuoti.

Bazė CORE 9f3f2bc443ad13ad006e9e4c5a5d5479b06cb3fa / PUBLIC 9f6058533d4d61fad4acdc72ca88a7625dc63e51, issue274. Privatūs įrodymai qa/free-shipping-20261026. Originalios naujų testų fixture klaidos išsaugotos; pataisyti fixture hostname, plan mode ir record.payload skaitymas, o ne verslo vartai.

Izoliuota vietinė parduotuvė: LOCALFREE10 10 % + pristatymas; 32,00 € -> 28,80 €, pristatymas 0 €. Pašalinus kodą grįžta įprastos sumos. Kūrimui/redagavimui naudotas tik localhost; produkcijos bandomasis kuponas, užsakymas, mokėjimas, siunta ar kliento laiškas nekuriami. Savininko atidarytas krepšelis neperkraunamas.

Po prekių nuolaidos su nemokamu pristatymu turi likti bent 0,50 € mokėjimui. Tai esama EUR mokėjimo riba; siunčiama aiški klaida dar peržiūroje. Esamo 99 % kupono automatiškai nekeičiame.

Rollback: additive 0028 nenaikinti, senų migracijų hash nekeisti, DB neatstatyti. Prireikus per versioned editor išjungti nemokamo pristatymo flag naujiems užsakymams. Išsaugoti jau sukurtų užsakymų delivery=0, originalią naudą ir visas istorines kainas/uses. Grąžinant senesnę UI/backend versiją draudžiama perrašyti dabartinius bindings, secrets, rinkų taisykles, mail ir cron. Prieš/po diegimo vykdyti checkout policy preflight; LT hash 7893ecb3 išlieka.

Compiled readonly preview: desktop ir 320 px patvirtino 28,80 € / 0 € pristatymą ir kainos atkūrimą pašalinus kodą, konsolės klaidų nėra. Pirmas vietinio preview paleidimas nutrūko ECONNRESET; patvirtinus proceso baigtį vienas pakartotinis paleidimas pavyko. Produkcijos konfigūracija ir apsaugos tam nekeistos. Savo localhost sessionStorage išvalytas, 8817/8827 procesai sustabdyti, pašalintos tik dvi savo preview vars.

## Paskelbta versija

CORE source3ba285c75d146855bedf051ccc7e9354dca58c83, PR275 mergef6085584d5f4f58b5b46209506a0b8eb2b24e120. PUBLIC source840cf049c829a4081d91026c420bb2fb9e46d22d, PR88 merge806fe9e68180b808dc5155ef34ef1d6923ce178d. Merge application trees sutampa su patikrintais source. SDK checkout SHA2565e10558fe3f7b753172ac10d3b59fe1a6294f2ca20a90aae42a2b3773c8ed792.

Backend0e3586fe-7a90-4be1-a590-1f2493ad2265, deployment9ae810d2-ae74-460b-b4cd-4229c683334b,07:20:21UTC; frontend603ce8b6-5d3a-4d0d-af4f-81a6f9170ab2, deployment01efef8a-99e8-4d3f-ae06-8ea558fd0dd9,07:32:48UTC. Abu100%. Hosted cart200 ir naujas checkout chunk tiksliai sutampa su compiled SHA25618cc913f4cb43006f5abb430a71faf2955680a5ad522660ceb310982106b2469.

Prieš/po vieninteliai settings skirtumai yra release annotations. Bindings, vars/secrets vardai, compatibility/observability, trys domenai/sertifikatai, cron ir mail4b165ec7 išsaugoti. Actual6užsakymai/20648minor bendra suma (ne apmokėtos pajamos),1savininko kuponas, jo versija1/uses1 ir visi ankstesni27 migracijų hash išliko. Nauja28migracija, pending0. Nemokamas pristatymas esamam kodui išjungtas; komercinio kodo už savininką nekeičiame.

Hosted admin naujo kupono checkbox matomas, numatytai nepažymėtas; jokių prod savų kuponų neišsaugojome. Naujo HTTPS produkto pridėjimas, krepšelio kontekstas, abiejų pristatymo metodų ir galiojančių nepažymėtų sąlygų rodymas, neegzistuojančio kodo atmetimas ir tuščio savo krepšelio atkūrimas patikrinti. Naršyklės konsolės klaidų nėra. productionReady=true ir paymentEnvironment=live. Nemokamo kupono sėkmingas pirkimas produkcijoje nedeklaruojamas: teigiama eiga įrodyta izoliuotais native testais ir compiled UI; realus pirkimas anksčiau atidėtas savininko.
