# Parduotuvės veikimo patikra

2026-10-12 savininkas paprašė atidėti našumą ir užbaigti visą parduotuvės veikimą. Tai tęsiamas pavedimas, ne užbaigtos parduotuvės deklaracija. Canonical prekybos sesija tvarko serverį ir operatoriaus ekranus; svetainės sesija tvarko pirkėjo prijungimą. Bendras prekybos SDK eksportuojamas iš konkretaus Git commit, jo vieša kopija rankomis netaisoma.

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

Viso shopo **IN_PROGRESS**: canonical sesija rado ir taiso atskirą surinktų rinkinių komponentų galiojimo / karantino defektą. Šios spragos negalima priskirti tiekėjo rakto trūkumui. [Bendra veikimo matrica](../../commerce-core/docs/SHOP_FUNCTIONAL_REVIEW_2026_10_12.md) atskiria dabartinį kodą nuo tikrų išorinių vartų. 0.11 UI priėmimas nepakeičia tolesnio stock/fulfillment kvito.

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
