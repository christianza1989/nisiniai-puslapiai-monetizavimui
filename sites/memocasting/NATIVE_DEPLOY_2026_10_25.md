# Memory Casting · perduoto paketo diegimas ir Git sujungimas

Savininkas 2026-10-25 perdavė CORE65f127b8 / PUBLICc2ad0104 ir nurodė įdiegti bei po priėmimo sujungti į main. Diegimo teisė galioja; esama Wrangler OAuth paskyra patvirtinta. DNS, backend, užsakymų DB, Stripe, vežėjai ir paslaptys nekeičiami.

Perduotas SHA9061a419 turėjo pasikartojančių sakinių, likusių po du kartus įvykdyto prefikso pakeitimo. Prieš publikavimą per esamą studiją 38 puslapių body atkurti tiksliai iš anksčiau priimto PUBLIC12f76461. Išsaugoti visi683 kandidato nuorodų ryšiai, visi187 publishAt, visi800 medijos failų ir homepage proporcijų pataisa bei trumpesnė antraštė. Tai scoped atkūrimas, ne nauja visų97 tekstų audito deklaracija. Naujas immutable leidinys2d2463df-fe76-4efb-9978-60112aa10aaf / SHA256cfec71cb4763224748be22fb5084688dd7f80c16d9e11b6f47c9fd6398db01bb. PUBLICecbcd502.

- [x] Porinis actual Git freshness; abu main yra HEAD protėviai.
- [x] Dabartinė CF konfigūracija ir domenai išsaugoti privačiame kvite; frontend838f886a / backendc3607521 yra priešoperacinė atskaita.
- [x] Native prose atkūrimas, importas ir foreign-package / datų išsaugojimas.
- [x] PUBLIC258 / commerce221 testų PASS.
- [x] Final build / dry-run / įkėlimas / tikras HTTPS ir desktop/mobile priėmimas.
- [ ] Git main sujungimas, išsaugant šaltinio kilmę ir ankstesnius FAIL.

## Canonical žurnalo suderinamumo pataisos sritis

Pilno CORE diff gate atkartoja šešis istorinių įrašų formatavimo blokavimus ir `_test.py` klaidingą priskyrimą bendram kodui. Istoriniai record/events nekintami. Reserved own PR101: scripts/core-upgrade.mjs, scripts/core-upgrade-check.mjs, jų regresijos, CORE_IMPROVEMENT ir core-improvements/README. Naujas verified įrašas gali aiškiai pakeisti tik netinkamo canonical issue URL ar struktūriškai nepilnos senos verification deklaracijos kilmę, pririštą prie tikslaus seno committed tree SHA. Būtinas tas pats repo, visi seni scope, nauji tikri checks ir originalaus diagnostinio radinio išsaugojimas. Senas įrašas negauna coverage; jokio history/archive/scope ar failed replacement checks vartų išjungimo. Ši taisyklė turi būti priimta su regresija prieš main.

Privatūs įrodymai: qa/antigravity-review-20261025. Scoped rollback grąžina tik ankstesnį frontend kodą; duomenų bazės ir vėlesni užsakymai neatstatomi.

## Faktinis produkcijos priėmimas

2026-10-25 14:21 UTC įjungtas frontend Worker `fca0b35d-46bb-45e9-b9bd-7db8be42f4fe` 100 %, deployment `1bbf060a-2d8d-44bd-97dc-24252e51c49e`, šaltinis PUBLIC `ecbcd5020e0b8f40929f8ba97c23fbfd06978a0e`. Provider API patvirtino tą patį D1, commerce/Instagram production service bindings, GA4 ID bei tris domenus; backend `c3607521-ae24-4efe-9df4-ce3c3050341b` neperdiegtas.

59/59 tikros HTTPS patikros 14:30 UTC: visi 28 tuo metu vieši LT gidai 200, likę69 yra ateities. Paskutinės minutės gidui iki2026-12-21 08:00UTC —404/noindex; unikali jo medija taip pat404, būsimi URL nepatenka į sitemap ir šis gidas nepatenka į llms-full. Llms-full turi naują tikslių proporcijų frazę. Abu originalūs PDF atitinka savininko failų SHA256. `/password` ir senos produktų nuorodos301, `www`308 į canonical200. Pirmoji QA deklaracija klaidingai tikėjosi tik absoliučių Location irwww301; realus relative301 irwww308 yra teisingi nuolatiniai nukreipimai, produkto kodas dėl jų nekeistas. Tas pirmas FAIL išsaugotas atskirai.

Chrome tikras straipsnis mamai: perskaitytas visas AX tekstas, išorinės konkrečių dovanų ir vidinės nuorodos išliko. Peržiūrėti desktop1280, mobile390 ir320; nėra horizontalaus perpildymo ar nepavykusių pagrindinio turinio vaizdų. Galutinis QA dydžio override atšauktas. Prekybos kontekstas atsako productionReady / live / paymentConnected, LT; tai nėra tikro naujo nurašymo bandymas. Naujas užsakymas, siunta ar laiškas nesukurti.

## Studijos regresijos atkūrimas prieš main

Pradinė papildoma Studio patikra davė69/73PASS: dviem izoliuotiems SDK/importo keliams trūko naujo viešų instrukcijų modulio priklausomybių, dvi regresijos dar tikėjosi seno60 medijos variantų limito, nors abiejų repo sutartis jau120. Pataisytas eksporto priklausomybių sąrašas ir tikros120/overflow ribos bei izoliuotas fixture, ne produkcijos turinys. Pakartotinai73/73PASS; pradinis FAIL išsaugotas. Canonical journal regresija36/36, commerce221/221, PUBLIC258/258, TypeScript ir scoped ESLint PASS.
