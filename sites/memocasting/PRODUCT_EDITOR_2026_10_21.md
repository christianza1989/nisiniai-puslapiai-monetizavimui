# LT prekių valdymas ir pasirinkimai

Savininko pavedimas 2026-10-21: užbaigti patogų Lietuvos prekių administravimą. Pavadinimas, trumpas / išsamus aprašymas, komplektacija, nuotraukos su alt tekstu, pasirinkimų grupės ir kainų priedai redaguojami prisijungus. Balta bazinė; kitos spalvos pavyzdys +3 EUR, medinis padėklas +12 EUR. Savininkas patvirtino padėklo svorį 300 g; jo matmenys ir naujos supakuotos kombinacijos matmenys dar nepateikti. Faktinių kainų / atsargų ar pakuočių neišgalvoti.

## Apimtis

- Esamas katalogo ekranas tampa prekės redaktoriumi, išlaikant Operate / Segoe UI / žalią esamos administravimo sistemos tapatybę. Shopify yra patogumo analogas, ne įpareigojimas pakeisti technologiją ar kopijuoti prekės ženklą.
- Patvarus juodraštis, peržiūra ir aiškus paskelbimas; senų užsakymų kainos / pasirinkimai nekinta. Paprastas tekstas ir skyrių laukai, jokio nepatikimo HTML vykdymo.
- Nuotraukų failų įkėlimas, rūšiavimas, alt ir susiejimas su konkrečia pasirinkimų kombinacija. Draft vaizdai iki publikavimo nevieši. Fallback tikri esami produkto vaizdai; neegzistuojantis auksinis / padėklo vaizdas nepakeičiamas tariama tikra nuotrauka.
- Vienos prekės pasirinkimas atskiria pvz. baltą poros rinkinį nuo auksinio krepšelyje. Kaina ir pasirinkimai tikrinami serveryje, pirkėjas negali atsiųsti savo priemokos. Bendras kibirų likutis rezervuojamas pagal bazinį SKU; skirtingi variantai jo nepadaugina.
- Produkto nuotrauka / kaina keičiasi iš karto pasirinkus variantą. Deriniui galima priskirti tikrą bendrą nuotrauką arba atskiras skulptūros ir padėklo iliustracijas; nepristatyti atskirų vaizdų kaip vieno fiziškai patikrinto montažo.
- Viešas produktų turinys ir SEO gauna paskelbtą katalogo reviziją, straipsnių 92 publikavimo datos / turinio leidiniai nepakeičiami. Nuotraukos neįtraukiamos į viešą projekciją iki publikavimo.
- Atsiskaitymas išlaiko kompaktišką vieno puslapio formą ir mokėjimą dešinėje. Pasirinkimų snapshot pasiekia kainos pasiūlymą, mokėjimą, savininko užsakymo vaizdą ir dokumentus.

## Darbų seka ir priėmimas

1. Backend: normalizavimas, pasirinkimų kainodara / svoris, agreguotas atsargų rezervavimas, katalogo tekstų / medijos patikra ir juodraščiai. Ankstyvas mixed-options → quote → order → atsargų bandymas.
2. Admin: prekės sąrašas → redaktorius → įkėlimas → variantai / vaizdas → juodraštis / peržiūra → paskelbimas. Leidimai, kito store izoliacija, XSS / netinkami failai, CAS / pakartojimas ir restart.
3. PUBLIC: tikslus canonical SDK importas, serverinis produkto turinys ir interaktyvi galerija / pasirinkimai / krepšelis. Bazinės kitų šalių funkcijos išsaugomos, nauji pasirinkimai pradžioje LT.
4. Patikra: prasmingi Node / worker / renderer testai; actual desktop / mobile / klaviatūra, tuščios / klaidos / loading / pasenusio redaktoriaus būsenos. Vienas bendras vaizdo patikros ratas, pataisų partija ir tikslinė pakartotinė patikra. Jokių realių charge ar mokamų siuntų.
5. Deployment tik su išsaugotais actual bindings, esamais užsakymais / atsargomis / publikavimo datomis ir rollback; sintetinės DB į produkciją nekelti. Naujo priedo pardavimas tik turint realią pakuotę ir savininko duomenis; neapeiti pristatymo validacijos.

## Būsena

Valdymo funkcijos įgyvendintos ir įkeltos; priėmimas ir konkrečios medijos ribos aprašyti žemiau. Pradinė CORE 131e95e768098402626d10741913006ce77fd07a, PUBLIC 44d24ef6462aea98de04ee88881f84ed37ffdd19. Esamas katalogas turi kainas / pakuotes / addonFor, tačiau aprašymų / medijos / pasirinkimų nėra; dabartinis cart normalizavimas sujungia viską pagal SKU. Tai atkuriama bendra trūkstama funkcija. Shopo pokalbis informuotas koordinacine žinute, naujų provider operacijų neprašyta. Istoriniai produkto konteksto teiginiai apie dar nepaleistą LT prekybą nėra šiandienos operacinė tiesa.

Savininko patikslinimas: padėklas 20 × 20 × 5 cm, prideda tik 5 cm prie rinkinio dėžės aukščio. Poros derinys 2500 g / 200 × 200 × 220 mm; šeimos 4800 g / 250 × 250 × 250 mm. Priemoka 1200 ct, baziniai balti dažai 0 ct; kitų spalvų pavyzdys 300 ct.


## Įgyvendinta ir priimta 2026-10-21

CORE861d0d472cb11909c257265616f65624943ebc51 įgyvendina katalogo aprašymus / mediją / juodraščius / pasirinkimus ir bazinio SKU atsargų agregavimą.91667d8551109102bb84867e9c37c9b303a41ea8 sutraukia redaktorių ir fiksuoja PUBLIC patikras;3698689e atskiria netinkamą delivery quote ID400 nuo neprijungto adapterio503. PUBLICc34bf15b021888be8e76c20e5edd737bf025b7db naudoja tikslų SDK861d0d47, serveriui perduoda choices, produktų HTML / SEO gauna tik paskelbtą katalogą, interaktyvi galerija keičia spalvos vaizdą. Redaguojamas pavadinimas, trumpas / išsamus aprašymas, komplektacija, SEO, kainos, pakuotė, nuotraukos / alt / tvarka, grupės / reikšmės / priemokos / tikslaus derinio nuotrauka. Juodraštis atskiras nuo paskelbimo; stale/CAS konfliktas neperspaudžia kito darbo.

Patikros:206Node ir nativeworkerd/D1/R2/restart;137PUBLIC, TypeScript, scopedESLint, productionbuild ir staged-blob safety. Vėlesnis klaidos klasifikavimo pataisymas turi išsaugotą originalų FAIL ir4tikslines PASS. Git tikrinimo dokumentacijos neatitikimas pataisytas,13regresijų PASS. Dizaino detectorfinal neturi radinių; actualdesktop,390pxir320px vietinio redaktoriaus reflow, tikras failo upload, juodraštis / peržiūra / paskelbimas ir klaviatūros veiksmai patikrinti. Tai nėra pilnas WCAG ar browserzoom sertifikavimas.

Actual savininko Access sesija https://login.memocasting.lt/admin atvėrė „Prekės ir kainos“, abiejų prekių formą, realius7vaizdus ir visus laukus. Per tikrą UI išsaugoti ir paskelbti alt pataisymai; serverinis viešas HTML gavo tuos pačius tekstus / vaizdus / metadata. Krepšelio tikrasHTTPS bandymas išlaikė pasirinktą Auksinė + Medinis padėklas ir4700ct; laikinas savo naršyklės krepšelis atskiras nuo savininko ankstesnės laukiančios sesijos. Tiesioginė tikra carrier read su tinkamu ID davė524ct pristatymą,5224ct viso,2500g /200×200×220mm. Naujas order/charge/invoice/shipment nebuvo kuriamas.

Į produkcijos esamą EU R2 catalog prefix įkelti7WebP: poros balta +5spalvų vizualizacijos ir šeimos balta. Visi7HTTPS200 ir image/webp patikrinti. Poros kitų spalvų priemoka300ct, abiejų padėklas1200ct; bazės3200/4800ct išsaugotos. Šeimos papildomų spalvų reikšmės parengtos, bet neaktyvios, kol priskiriami tinkami šeimos liejinio vaizdai. Naujo padėklo / tikslaus spalva+padėklas bendro produkto vaizdo nebuvo pateikta: redaktorius jau leidžia tokį vaizdą įkelti ir susieti, tačiau pats montažas neišgalvotas. Padėklo pardavimas ir teisingas pakuotės skaičiavimas įjungti abiem rinkiniams.

Rinkinio aprašai ir vaizdai pakeisti tik versijuotame kataloge.92straipsnių leidinys / datos nepakeisti;3esami užsakymai, atsargos, policy, dokumentų numeracija ir actual provider bindings išsaugoti. Schema0025 tik prideda catalog_drafts/catalog_media; native migration ledger24→25, customerDataCreatedfalse. Actual prieš/po D1/R2/mail/Stripe/Access/Instagram/leads bindings, secret pavadinimai, vars, compatibility ir observability sutampa. Ankstesnis tracesfalse išsaugotas; šis darbas nėra observability migracija.

PUBLIC active832ddd9f-0e6e-4a4a-adc5-eb32c3cee592; prieš tai1a027950-e006-46d0-ac40-5e9005f55e38. Pirmas naujas backendebe1b7e1-434d-4156-97ce-06484bbf398b, ankstesnisbebb13b7-1e55-4dcc-85c1-b337c4f43396. Galutinį backend po ID klasifikavimo ir Git handoff fiksuoti papildomu kvitu žemiau. Source push / main merge / kitųPC adoption nėra tas pats kaip šis actual deployment.

Rollback: išsaugoti naujas katalogo revizijas, draft / media lenteles, R2 failus, choices turinčius užsakymų snapshot ir esamus provider ryšius. Neatkurti visos DB. Senas SKU-only kodas negali saugiai kurti naujų pasirinkimų užsakymų; pirmenybė suderinamai pataisai. PUBLIC rollback prieš tai patikrinti laukiančių variantų krepšelių atkūrimą. Carrierwallet papildymas ir realus mokamas sandorio / siuntos patvirtinimas yra atskiri savininko veiksmai, šiuo darbu neatlikti.

Privatūs tikslūs receipts / planas / prieš-po settings / source checks: ignored qa/product-editor-20261021. Jokių raktų, klientų duomenų ar privačių token Git nėra. Tolimesniam savininko darbui nereikia Codex kasdien: redaktorius ir duomenys yra hosted.

Galutinis hosted backend6adc9705-b551-4781-9450-5f8fa022e85b iš CORE3698689e; tinkamo ID vežėjo patikra200, netinkamo ID klasifikacija400/invalid_delivery_quote_id actualHTTPS. Final prieš-po settings bindings ir observability tapatūs abiejuose Worker. Viešo poros puslapio tikras browser pakeitė į auksinį vaizdą, pasirinko padėklą ir krepšelyje išlaikė4700ct bei abiejų pasirinkimų pavadinimus; naujas užsakymas nebuvo sukurtas. OwnerAccess juodraščio save ir publish patvirtinti tikrais serverio statusais; alt taisymai jau matomi viešame puslapyje.
