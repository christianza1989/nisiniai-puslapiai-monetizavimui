# Parduotuvės veikimo patikra

2026-10-12 savininkas paprašė atidėti našumą ir užbaigti parduotuvės veikimą. Canonical prekybos sesija tvarko serverį ir operatoriaus ekranus; svetainės sesija tvarko pirkėjo prijungimą. Bendras prekybos SDK eksportuojamas iš konkretaus Git commit, jo vieša kopija rankomis netaisoma.

## Aktualus susietas 0.12.1 priėmimas

**LOCAL_SHOP_CODE_VERIFIED; PRODUCTION_NOT_READY.** Nuo tikrų verslo prieigų nepriklausomos žinomos kodo spragos užbaigtos ir vietinis pirkėjo bei operatoriaus pagrindas patikrintas. Tai nėra realių mokėjimų, siuntų, laiškų ar visos svetainės dizaino ir našumo priėmimas. Canonical `be32c223b2e45168b52a5eeec2d111006fe98214`, PUBLIC `a82c6da55ff53df895a5c6600adba421b51fbe37`, CORE integration code `0f1d8324a6825b76c23bb8df8e85f58a04b4f8fe`. Paketo e69 SHA nepasikeitė.

- PASS: 117 canonical Node testų, native workerd / D1 / R2 / Queue su 22 migracijomis ir Worker dry-run pagal shopo sesijos [0.12 kvitą](../../commerce-core/docs/CONTINUATION_0_12.md). FEFO, galiojimas, komponento karantinas, grąžinimų kilmė, nežinomo seno likučio sutikrinimas ir paskutinė siuntos registravimo apsauga priimti atskirai nuo tikrų provider prieigų.
- PASS: 80 PUBLIC testų, TypeScript, build ir tikslus dviejų SDK failų manifest. UI SHA256 `7c4e09a790d40ed5f287805584e789948ac44b2f59d370b48655008b1056e89c`; client SHA256 `7c5f07e33eacc8c9b42b55060d9014a3497f7ddd8d916abe4bc992298b7c557e`.
- PASS, actual IAB: tuščias krepšelis 0 → 1 → 0, teisingas skaičiavimo užrakinimas ir tos pačios kalbos katalogo nuoroda LT / PL / LV / ET. Senas techninis tekstas apie užsakymo raktus pašalintas. „Naujas užsakymas“ po pasibaigusios rezervacijos grąžina tuščią formą.
- PASS: naujas sintetinis užsakymas `0298736a-bc80-459b-b0b5-1f7581cb834a`, 3650 EUR centų, išsaugo adresą; reload ir keturių kalbų ekranai rodo originalią LT šalį, pristatymą ir neprijungto mokėjimo paaiškinimą. Atsisakymo prašymas išlieka po reload. Snapshot SHA256 `c2354b66b88f10d09e2850738971bdf601fb5af8c4eae37cc2059edc4f1dd89b`.
- PASS, actual server + IAB: savo testiniam laisvam likučiui per canonical `FinishedStock.receive(mode:adopt)` priskirtas vienas sintetinis vienetas. Naujas UI užsakymas `ea44416e-4d3a-4dc7-9317-816329772edd` FEFO gavo `fixture_buyer_lot_012`; paskyrimas patikrintas, SQL fake allocations nekurti. Canonical karantinas sukėlė tikrą `fulfillmentBlocked` ir keturių kalbų sustabdymo pranešimą. Snapshot SHA256 `502689cc49ca59172af6047d031650fbc9c3bc92cf43c157dc7cb463e19b9764`. Po patikros tik šios testinės partijos karantinas panaikintas per aktualų CAS; kitos sesijos ir MB likučiai neliečiami.
- PASS: canonical `expire` vykdytas tik savo sandbox DB su aiškiai testiniu laikrodžiu. Released užsakymas keturiomis kalbomis rodo neapmokėtą būseną ir rezervacijos pabaigą, neturi „Laukia mokėjimo“ ar mokėjimo mygtuko. Šioje patikroje rastas prieštaringas antraštės tekstas pataisytas canonical 0.12.1 ir pakartotinai patikrintas tikroje naršyklėje.
- PASS: senoji DB be reset migruota iki 22. Ankstesnio A908 užsakymo 11650 centų ir originalus snapshot SHA256 `1d24cf0cced080c358e94276194ee555c7c58e8f8108a6b0a752454b3496a4f5` liko nepakitę. Rezervacijų būsenos keistos tik kanoniniu expiry veiksmu, snapshot neperrašyti.
- PASS, ribota vaizdo patikra: naujos hold / expired būsenos 320 px ir expired 1280 px, vienas H1, dokumentas telpa, valdiklių horizontalus nukirpimas 0. LT expired desktop ir ET mobile PNG išsaugoti ir tikrai peržiūrėti. Tikras browser 200% ir reduced-motion nėra šio kvito PASS.
- PASS: exact PUBLIC a82c6da Git archive build be gretimo privataus core. Priklausomybės pakartotinai naudotos per junction; clean dependency install neteigiamas. GitHub šiai PUBLIC galvai checks / statuses nepateikė, todėl CI PASS neteigiamas. Galutinės 267 HTTP patikros: 88 puslapiai, 24 gidai, 0 rodymo radinių; bendras 85 kriterijų auditas lieka `NOT_COMPLETE / LOCAL_AUDIT_INCOMPLETE`.

Privatūs aktualūs kvitai: `qa/shop-buyer-012.json`, `shop-migration-012.json`, `shop-order-012.json`, `shop-expiry-012.json`, `shop-traced-fixture-012.json`, `shop-hold-012.json`, `shop-hold-release-012.json`, `shop-expired-lt-0121.png` ir `shop-held-et-mobile-012.png`. Jie yra testiniai, be naršyklės prieigos žetonų. Mokėjimų, siuntų ir laiškų tiekėjai visą laiką išjungti.

## Ankstesnis 0.11 checkpoint

Aktualus pirkėjo checkpoint: canonical **0.11**, source `703d9dcd19083cfe6cb73e4f2add935f09986f21`, PUBLIC `220233ea5f45c23109758c977c2dd7e69b183876`. Patikrintas 80 PUBLIC testų rinkinys, TypeScript ir build; 8 pakeistų shopo source failų exact-stage saugos patikra be radinių. Ankstesnio našumo šrifto darbo būsena išsaugota atskiru commit; naujų Lighthouse optimizavimo bandymų neatlikta. Paketas lieka `e69b16f2c764ad51d075f6700af9ad97ad9f1a7fb2248c30552f68efb9afa9c6`.

Tęsinys po pertraukos: PUBLIC `311768b` pašalina techninę checkout pastraipą, išlaiko vieną H1 ir atmeta netaisyklingą katalogo bei rinkų atsakymą. Pakartotinai PASS: 80 testų, TypeScript, build ir penkių stage failų saugos patikra. Tikrame `/cart` ekrane techninės pastraipos nebėra. 267 HTTP patikros patvirtino 88 puslapius ir 24 gidus be rodymo radinių; bendras auditas tebėra `NOT_COMPLETE / LOCAL_AUDIT_INCOMPLETE`. Naujas `catalogueUrl` caller parametras paruoštas, bet native UI prijungimas priklauso nuo dar necommitinto canonical 0.12 checkpoint.

## 0.11 pirkėjo rezultatas

- PASS, actual IAB: poros kiekis 2 ir šeimos kiekis 1 išlieka perkrovus; šeimos kiekį pakeitus į 0 jis lieka pašalintas ir po reload. Iš šeimos produkto puslapio pridėtas naujas vienetas išsaugo poros pasirinkimą.
- PASS: serverio testinė suma `2 × €32 + €48 + €4,50 = €116,50`; sukurtas sintetinis užsakymas `a9087516-497f-4304-a55f-87cbcb4bc169`. Reload rodo tą patį ID, sumą ir kiekius. Own SQLite read-only patikra patvirtino 11650 centų, LT, `pending` ir dvi eilutes; originalaus snapshot SHA256 `1d24cf0cced080c358e94276194ee555c7c58e8f8108a6b0a752454b3496a4f5`. Tikri mokėjimai, siuntos ir laiškai neatlikti.
- PASS: po šio užsakymo įdėtas naujas šeimos vienetas ir pasirinktas „Naujas užsakymas“ parodo tik `couple:0, family:1`; reload išlaiko šį naują pasirinkimą. Ankstesnio užsakymo dvi poros ir šeimos vienetas negrįžta.
- PASS: kuriant užsakymą pirkėjo laukai faktiškai užrakinti. Mokėjimo mygtukas testiniame serverio kontekste išjungtas; nepajungtas tiekėjas nevaizduojamas kaip veikiantis mokėjimas.
- PASS: sustabdžius tik nuosavą 8827 procesą, keturių kalbų krepšeliai rodo native klaidą ir pakartojimą (actual width 390); produktai rodo native klaidą ir uždarytą Add (actual width 320). Po to tas pats 8827 procesas paleistas su nepakeista istorine DB: ET krepšelio retry atkuria `family:1`, produkto retry atkuria serverio €48 kainą ir aktyvų Add. Nei kitų sesijų procesai, nei jų DB neliečiami.
- PASS, ribota vizualinė patikra: produkto ir krepšelio 320 px, krepšelio 390 px ir desktop 1280 px; dokumento ir formos valdiklių persiliejimo nėra, H1 vienas. ET produkto pirkimo blokas ir LT desktop krepšelis tikrai peržiūrėti PNG. Pirmas full-page screenshot bandymas buvo neprieinamas; jam PASS nepriskirtas, vėliau naudotas tikras viewport screenshot. Tai funkcinio išdėstymo patikra, ne savininko atidėto galutinio dizaino priėmimas.

Privatūs kvitai: `qa/shop-buyer-011.json`, `qa/shop-error-languages-011.json`, `qa/shop-new-cart-mobile-011.png`, `qa/shop-product-retry-et-011.png`, `qa/shop-cart-desktop-011.png`. Naršyklės saugyklos žetonai neskaitomi ir neįrašomi į šiuos kvitus.

PASS, source/build perdavimas: exact PUBLIC `220233e` Git archive susikuria be gretimo privataus core; paketo e69 SHA ir SDK703 abiejų failų baitai sutampa. Priklausomybės pakartotinai naudotos per junction, todėl clean dependency-install PASS neteigiamas. GitHub API šiai tiksliai PUBLIC galvai negrąžino checks ar statuses; vietiniai testai nepavadinti CI PASS. [SDK kvitas](SDK_DISTRIBUTION.md) turi tikslias ribas.

0.11 checkpoint metu visas shopas buvo **IN_PROGRESS** dėl surinktų rinkinių komponentų galiojimo / karantino defekto. Ši kodo spraga pataisyta ir priimta su 0.12; tolesnis aktualus susietas kvitas pateiktas aukščiau. [Bendra veikimo matrica](../../commerce-core/docs/SHOP_FUNCTIONAL_REVIEW_2026_10_12.md) atskiria dabartinį kodą nuo tikrų išorinių vartų.

## Šio tęsinio radiniai ir jų pataisymo būsena

- Ankstesnis FAIL, pataisytas ir pakartotinai patikrintas su 0.11: `/cart` poros kiekį pakeitus iš 0 į 2 ir perkrovus puslapį vėl būdavo rodoma 0. Ankstesnis `initialLines` prijungimas negrąžino pakeistų kiekių svetainės krepšeliui. Pradinio defekto įrodymas: privatus `qa/cart-reload-before-fix.png`; aukščiau aprašytas tikras naršyklės retest patvirtino callback prijungimą ir kiekių išlikimą.
- Ankstesnė source spraga, pataisyta ir patikrinta su 0.11: po sėkmingo užsakymo produkto krepšelis nebūdavo išvalomas. Tikras naujo užsakymo kelias dabar išlaiko naujai pridėtą prekę ir negrąžina jau užsakytų kiekių.
- Ankstesnė source spraga, pataisyta ir patikrinta su 0.11: produkto pridėjimo mygtukas veikė prieš katalogo atsakymą ir po ryšio klaidos. Tikro katalogo prieinamumo tikrinimas, krovimo, klaidos ir neprieinamumo būsenos bei pakartojimo veiksmas patikrinti naršyklėje.
- FAIL, actual HTTP/source atitiktis: `/prekyba/markets` grąžina `{requireCustomer,markets}`, tačiau produkto priedų komponentas bandė vykdyti `find` tiesiogiai atsakymo objekte. HTTP buvo 200, o kliento klaida nutylima; valiuta likdavo tuščia. Caller pataisytas pagal canonical `markets` lauką, pridėtas atskiras atsakymo formos regresijos testas. Produkto pirkimo bloke kaina taip pat rodoma iš serverio katalogo, o nepalaikoma rinka negauna spėjamos valiutos.
- PASS, dabartinis DOM: telefono `pattern` leidžia tarptautinį numerį su `+`; vien iš source escaping naujas defektas neteigiamas.
- PASS, vietinis testas: krepšelis saugo tik žinomus SKU ir sveikus kiekius, sujungia pasikartojimus, riboja bendrą kiekį iki 100, atmeta per didelę ar sugadintą saugyklos reikšmę ir aptinka nepavykusį įrašymą. Asmens duomenys neperkeliami į šį krepšelį. Tai helper patikra, ne galutinė browser integracija.
- PASS, esamo bandomojo PDF vizualinė patikra: dokumento `b6bac309-31fb-4ccd-8b0a-29ebf04c2e05` vienas puslapis tikrai išrenderintas Poppler ir peržiūrėtas. Prekė, kiekis, lietuviški diakritiniai ženklai, €32 prekė, €4,50 testinis pristatymas ir €36,50 suma skaitomi; teksto nukirpimo ar persidengimo nepastebėta. Privatus `qa/buyer-pdf-visual.png`; patikrinta kopija išlaiko SHA256 `5e3ebaf85b7c96788c7f1f195c5e1c9c9cdac70a9d9167550042344537a964ed`. Tai šio vienos prekės šablono vaizdo patikra, ne visų dokumentų šablonų ar teisinės sąskaitos priėmimas.

## Priėmimo apimtis

| Kelias | Ankstesnis įrodymas | Šio tęsinio reikalavimas |
|---|---|---|
| Prekė ir krepšelis | LT pridėjimas ir canonical kiekiai patikrinti ankstesniame etape | Keli produktai, priedai pagal tikrą katalogą, kiekio pakeitimas/pašalinimas/reload, neprieinamos prekės ir išvalymas po užsakymo |
| Šalis, pristatymas ir sąlygos | Keturių šalių exact policy nuorodos ir sutikimo reset; fixture serverio suma | Nepasenusios sumos, netinkamo adreso ir tuščio pristatymo atmetimas; tikri tarifai tik prijungus tiekėją |
| Užsakymas ir atkūrimas | LV create/reload, LT sąsaja su LV šalimi, restart ir tos pačios sumos/snapshot patikra su 0.10.3 | Naujos krepšelio integracijos pilnas kelias ir konkurencinių/pakartotinių veiksmų kontrolė |
| Mokėjimas ir grąžinimas | Canonical sesijos atskiros Stripe testinės aplinkos kvitas; svetainės fixture mokėjimas išjungtas | Canonical aktualaus priėmimo spragų peržiūra; nuolatinis MB paskyros prijungimas atskiras |
| Dokumentai ir siuntos | Pirkėjo autorizuoto PDF transportas ir hash; canonical native storage/queue bandymai | Dabartinio operatoriaus kelio patikra, klaidos ir neaktyvių tiekėjų būsenos; PDF teisinis priėmimas atskiras |
| Likučiai, administravimas ir apskaita | Canonical 0.9/0.10 patvarios serverio realizacijos kvitai | Shopo sesija patikrina faktinę dabartinę visumą ir užbaigia nuo prieigų nepriklausomas spragas |
| Laiškai | Privatus gateway/native binding testas, tikras SMTP ir INBOX nepatvirtinti | Kodo ir testinių adapterių priėmimas; tikras pristatymas vertinamas prijungus paštą |

Paleidimui dar reikalingi faktiniai likučiai, priedų pakuotės, galutiniai rekvizitų ir dokumentų politikos duomenys, nuolatinė mokėjimų paskyra, siuntų tiekėjo sutartis bei prieiga ir laiškų pristatymo patikra. Testinės reikšmės netampa tikromis kainomis ar tarifais. Šis dokumentas nesuteikia operacinių leidimų ir nekeičia ankstesnių kvitų.
