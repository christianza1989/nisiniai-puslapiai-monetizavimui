# Memory Casting · GA4 pirkimai ir šaltiniai

Savininko pavedimas 2026-10-25: prijungti GA4 pirkimų, pajamų ir pirkėjų atėjimo šaltinių matavimą iki veikiančio leidinio. Nauja GA4 nuosavybė 560554153 / srautas 16198963010; jau veikiantis turinio matavimas yra šio tęsinio pagrindas. Ankstesnių priėmimų ribos lieka istorijoje.

- [x] Sėkminga porinė Git aktualumo patikra: CORE a78b56ea / main d3fe34b1; PUBLIC 5cff95db / main 8e47c34e.
- [x] Perskaitytas tikras order → Stripe signature → paid → outbox / serverio cron kelias. Pajamos negali kilti iš mygtuko, iframe callback ar neapmokėto užsakymo.
- [x] Sutikimu valdomas šaltinis ir kampanija, švarūs adresai be privačių parametrų; atnaujintas pranešimas ir privatumo tekstas.
- [x] Atskiras pasirinktinės analitikos order kontekstas; parduotuvės / aplinkos / galiojančio sutikimo ribos ir atšaukimas.
- [x] Serverio patvirtintų pirkimų ir grąžinimų adapteris; patvari eilė, pakartojimų kontrolė, unikalus transaction_id ir sumų sutikrinimas.
- [x] Google srauto nustatymai, serverio paslaptis tik privačioje konfigūracijoje, jokio PII ar mokėjimo prieigos duomenų perdavimo.
- [x] Izoliuotas pasirašyto TEST įvykio ir pakartojimo priėmimas, Google validation be fiktyvių LIVE pajamų.
- [x] Tikslus native privatumo leidinys, build ir actual bindings palyginimas, saugus production įkėlimas ir tikro host patikra.
- [x] Naudotojui prieinamos pirkimų ir šaltinių ataskaitos bei aiškios matavimo ribos.

Analitika apima tik sutikusius lankytojus. Visų pardavimų apskaitos šaltinis lieka prekybos užsakymai. Nepriskiriame istorinių pardavimų naujiems lankytojams ir nedarome tikro bandomojo mokėjimo.

Darbo sritis: esama CORE commerce pasirinktinės analitikos galimybė, jos HTTP / runtime / cron integracija ir atskira papildanti migracija; PUBLIC Memo analitikos bei checkout adapteris ir tikslūs testai. Jokių katalogo, kainų, likučių, senų migracijų, pašto, vežėjo, Stripe teisių ar straipsnių datų pakeitimų. Esamas cron išsaugomas. Rollback: išjungti tik analitikos integraciją ir grąžinti ankstesnį kodą, neatstatant užsakymų DB.

## Tikras priėmimas

Aktyvus frontend838f886a-8ff4-416f-8825-0acef7b35a93 / PUBLIC12f76461cd16e8796b59a3fdfe93e609e791937b; commercec3607521-ae24-4efe-9df4-ce3c3050341b / CORE2aaece4a98036aff38650b707b115053d590b96b. Nativeb5f745b0-9115-46cf-b035-d1d0e96969c1 / SHA2569e8cd634f05bf73c504d47dc78fa58ad7981105b830b885ea21e710450527883: tik privatumo revizija, kiti186puslapiai, visos datos ir visų kitų nišų compiledpackages tiksliai išsaugoti.

CORE220regresijų ir po native transporto pataisos10focused Node/nativeD1/Worker atvejų PASS. PUBLIC257regresijos, TypeScript, scopedESLint ir po paskutinio optional-context guard27focusedcases PASS. Signed SDK async TEST apmokėjimas/unpaid/replay patikrinti izoliuotai. Google debugvalidation0messages; tik nefinansinis memo_measurement_check pasiekė realų collector204. Sintetinis purchase į tikras ataskaitas nesiųstas.

Actual Chrome:113networkevents prieš sutikimą/Google0/GAcookies0; po aiškaus v2 grant gtag200 ir collect204, teisingasG-LHHK61WT8T, cs=memoqa/cm=qa/cn=verification_20261025/cc=qa_only. dl tik švarus produkto URL; synthetic email/client_secret/utm_term/gclid markeriai ir HTTPReferer nepateko. Tikras gtagget grąžina tinkamos formos client/sessionID į v2 context be kontaktų. Krepšelyje išlieka source/medium/campaign, nėra page_view ar automatinio CMP.320/390px tikras innerWidth/clientWidth ir scrollWidth lygūs, aiškūs46px veiksmai. Atšaukimas:72events/Google0/GAcookies0/tagfalse/attributionAbsent; tik mūsų QA pasirinkimas grąžintas į pradinę unknownbūseną, emuliacija panaikinta, užsakymų/krepšelio įrašai nekeisti.

Hosted13casesPASS: privatumas/abu produktai/cart/sitemap/LLM200,32/48EUR ProductOffers, productionReadytrue, ne savo order404 ir cross-origin403; futureHTML/futuremedia404, abuPDFHEAD200.113sitemapURL. ActualCF visos originalios bindings, observability ir domenai išsaugoti; papildomas tik COMMERCE_ANALYTICS secret. Esamas* * * * *cron nekeistas. Remote schema25→26,0pending; orders5/paid0/inventory5/documents0/refunds0 prieš ir po, analyticscontexts0/events0. Naujo LIVEorder/mokėjimo/siuntos nesukurta.

Savininkas atskirai patvirtino Google duomenų susiejimo pareiškimą ir rakto sukūrimą. Pirmo setup rakto reikšmė pateko į įrankio išvestį; tas raktas atšauktas, UI patvirtino tuščią sąrašą, sukurtas naujas tokių pačių teisių raktas ir tik jis įdiegtas. Nauja reikšmė nerodyta; kopija privačiame C: naudotojo profilyje ir provider binding, laikina D: kopija pašalinta. Runbooke ar Git nėra abiejų reikšmių.

Pirmas build sustojo dėl tikroENOSPC; originalus log išsaugotas. Atkuriamas npmcache išvalytas pagal ankstesnį savininko leidimą, naujas build/dryrun/deploy PASS; C: po jo apie1,9GB. Lėtas savo generated build perkėlimas ir perteklinis laikinas D:checkout sustabdyti, svetimų procesų ar originalų nešalinant. Tai aplinkos atkūrimas, ne papildomas SEO pagerėjimas.

GA4 [pardavimų ir pajamų suvestinė](https://analytics.google.com/analytics/web/?authuser=2#/a413338025p560554153/reports/reportinghub) išsaugota: pirkimai, pajamos, prekės ir seanso/pirmojo naudotojo šaltinis/terpė. Nauji tikri pirkimai bus matuojami sutikusiems lankytojams; istorinis šaltinis neatkuriamas. Be sutikimo / blokavimo / vėlesnio asinchroninio mokėjimo atribucijos ribos išlieka; visų pardavimų tiesa – administravimo užsakymai.

Papildomai savininkui paruoštas Antigravity audito promptas ir187pilnų tekstų/598turinio ryšių paketas; missingtargets0 tik inventoriaus prasme, ne semantinio stiprumo sertifikatas. Mokamas Gemini neįjungtas, joks papildomas masinis perrašymas ar kalendoriaus pakeitimas neatliktas. Promptas reikalauja visų97straipsnių peržiūros ir reikalingų pataisų, ne vien8prioritetinių.

Privatūs įrodymai: qa/ga4-ecommerce-20261025, screenshot C:/Users/Lenovo/AppData/Local/Temp/memocasting-ga4-consent-320-20261025.png. Rollback: išjungti tik pasirinktinę analitiką arba ankstesnis frontendf5212538 ir commerce380e46b2 po actualsettings palyginimo; išsaugoti papildančią0026schemą, visus naujus order, paštą ir vežėjų duomenis. Mainmerge lieka atskirai nuo šio hosted priėmimo.
