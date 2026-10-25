# Memocasting SEO / GEO užbaigimo darbai · 2026-10-25

Savininko pavedimas: pagal abu pateiktus PDF sukurti tvarkingus poros ir šeimos instrukcijų puslapius, nuosekliai sutvarkyti likusias įgyvendinamas SEO / GEO spragas ir pateikti tikrą viešo leidinio priėmimą. Šis sąrašas nevadina puslapio prieinamumo Google indeksavimu ar AI citavimu ir nežada „idealių“ reitingų. Nauji mokami tyrimai, mokamos paslaugos, periodiniai darbai, nuorodų kampanijos ar žinutės partneriams neįjungiami.

## Darbo pagrindas

- [x] Abiejuose savo checkout sėkmingai fetch dabartinį main, išsaugoti svetimus failus ir integruoti naujienas. CORE `51249b01` su main `d3fe34b1`; PUBLIC `a65a6d2d` su main `8e47c34e`. Du dokumentų append konfliktai išspręsti išsaugant abi neprieštaraujančias dalis; actual taisyklės perskaitytos po integravimo.
- [x] Perskaityti abu savininko PDF ir vizualiai patikrinti abu vieno puslapio originalus. Išsaugoti jų SHA-256, atskirus kiekius / temperatūras ir visus veiksmų etapus. PDF nėra saugos sertifikatas; jame nėra alginato / gipso gramų ar vaikų amžiaus ribų.
- [ ] Užfiksuoti aktualų deployed source, bindings, native leidinį, sitemap ir matavimo / paskyrų būseną. Istoriniai kvitai lieka istoriniai.
- [x] Atlaisvinti C: tik savo sugeneruotų build failų perkėlimu į atskirą patikrintą D: vietą; nešalinti originalų, studijos, užsakymų, kitų agentų darbo ar priklausomybių.

## Instrukcijos ir naudojimo informacija

- [ ] Esamą `/pages/instrukcija` išlaikyti kaip tikrą dviejų instrukcijų pasirinkimo puslapį.
- [ ] Paskelbti `/instrukcijos/poros-rinkiniui`: 2 l / 22–24 °C alginatui, 700 ml šalto vandens gipsui; atskirti rekomenduojamą temperatūrą nuo papildomo perspėjimo neviršyti 25 °C.
- [ ] Paskelbti `/instrukcijos/seimos-rinkiniui`: 3,2 l / 23 °C alginatui, 1 400 ml šalto vandens gipsui; atskiras perspėjimas neviršyti 24 °C. Poros recepto automatiškai nedvigubinti.
- [ ] Aiškiai pateikti reikmenis, pasiruošimą, 60–70 s maišymą, 3–4 min rankų laikymą su sąlyga dėl temperatūros, du gipso pylimo etapus, 45° pasukimą, 1 val. stingimą / ne daugiau 3 val., išėmimą, 5–7 parų džiovinimą ir 2–3 plonus dažų sluoksnius.
- [ ] Išsaugoti papildomus patarimus apie padėtį, burbuliukus, gipso liekanų nepylimą į kanalizaciją ir skulptūros detalių valymą; nepublikuoti neaiškaus patarimo klijuoti žmogaus nagą / odą.
- [ ] Pridėti tikrus originalių PDF atsisiuntimus, spausdinimui pritaikytą HTML ir patikrinti host / publikavimo / medijos prieigos ribas.
- [ ] Susieti instrukcijas su tinkamu produktu, katalogu, pagalba ir susijusiais jau esančiais techniniais gidais. Kiekių nelaikyti antrame rankiniame frontend šaltinyje.

## Turinys ir pasitikėjimas

- [x] Iš viso esamo paketo surinkti likusius priešpaleidiminius / vietinio bandymo / nepatvirtinto veikimo tekstus, taip pat būsimose publikacijose. Koreguoti pagal tikrą dabartinę būseną, ne vien šalinti teisėtą nežinomybę.
- [x] Užbaigti pagalbos, redakcijos ir „Apie Memocasting“ tekstus; sutikrinti operatorių, adresų vaidmenis, veikiančius kanalus ir redakcinę kilmę.
- [x] PDF pagrindu sustiprinti esamus susijusius techninius atsakymus, išlaikyti jų URL ir publikavimo datas; nekurti dubliuojančių long-tail puslapių.
- [x] Sutikrinti komercinių puslapių, instrukcijų ir svarbiausių Kalėdų gidų vidines nuorodas bei aiškų kelią į realią prekę.
- [ ] Praktiškai panaudoti tik savininko turimą tikrą produkto / vaizdo medžiagą ten, kur ji paaiškina veiksmą. Neišgalvoti klientų istorijų, bandymų, reitingų ar leidimų trečiųjų šalių nuotraukoms.
- [x] Išsaugoti 97 straipsnių sutartą serverinį pasirodymą; naujas scheduleris ir masinis ateities tekstų išleidimas neatliekami.

## Techninis SEO ir prekių paieška

- [x] Užbaigti bounded visų viešų URL / vidinių nuorodų / canonical / title / H1 / robots / sitemap / media auditą ir sutaisyti atkuriamas klaidas.
- [x] Sutvarkyti tikrą Product / Offer semantiką: prekybos pasiūlymai tik realiai palaikomoms rinkoms ir prekėms, kontaktiniai puslapiai be fiktyvių kainų, reitingų ar Google rich-result pažadų.
- [x] Sutikrinti Organization / grąžinimo / socialinių profilių / produktų variantų duomenis su matomu turiniu; įgyvendinti tik naudingus ir faktais paremtus papildymus.
- [ ] Patikrinti esamą Merchant Center ir GSC priėmimą; užbaigti prieinamus nemokamus prekių duomenų / sitemap / patikrų veiksmus. Nauji account Terms ar trūkstamos faktinės teisės yra atskiras tikras savininko veiksmas.
- [ ] Patikrinti realų desktop / mobile įkėlimą ir prieinamumą; optimizuoti nustatytas problemas, nevaizduoti vien TTFB ar seno Lighthouse kaip dabartinio CWV.

## GEO ir matavimas

- [ ] Patikrinti, kad normalus HTML, schema, sitemap ir abu LLM skaitymo eksportai rodytų tą pačią patvirtintą versiją, naujas instrukcijas ir tikrai viešus puslapius.
- [ ] Patikrinti paieškos robotų prieigą ir turimus CDN / WAF duomenis, atskiriant paieškos robotus nuo mokymo. Vien pakeistas User-Agent nėra patvirtintas tikro roboto apsilankymas.
- [ ] Patikrinti GSC / analitikos prieigą ir faktinius parodymus, indeksavimą bei pirkimo matavimo būseną. Neprijungti ar neprieinami duomenys nėra nulis.
- [ ] Užfiksuoti atkuriamą nemokamą SEO / GEO baseline ir konkrečius vėlesnio palyginimo klausimus; nematuotą citavimą palikti nematuotu, nepradėti naujų mokamų ar periodinių užduočių.

## Priėmimas ir publikavimas

- [x] Atlikti pilną galutinio lietuviško teksto saviredakciją ir kiekvienos pakeistos revizijos usefulness / facts / sources / media / links / presentation peržiūrą.
- [x] Parengti atominį native leidinį per esamą turinio studiją, eksportuoti ir importuoti; nepaliestų puslapių tekstus / datas / patvirtinimus palyginti su baseline.
- [ ] Prasmingi unit testai, TypeScript, tikslinis lint, build ir dry-run; originalias nesėkmes išsaugoti, shared defektus taisyti canonical vietoje su regresija ir žurnalu.
- [ ] Patikrinti tikrą naršyklės vaizdą 1280 / 390 / 320 px, spausdinimą, PDF, klaviatūros veiksmus ir teksto / tarpų didinimą.
- [ ] Paskelbti tikslų leidinį su iš naujo sutikrintais actual bindings / routes / observability ir išsaugotu rollback; neliesti užsakymų, Stripe, likučių, siuntų ar paslapčių.
- [ ] Po įkėlimo patikrinti HTTPS, exact source / release, visus pakeistus URL, robots / sitemap / canonical / schema / eksportus, PDF baitus ir ateities puslapio / medijos filtrą.
- [ ] Užbaigti būsenos dokumentus ir scoped Git perdavimą; aiškiai atskirti įgyvendinta / patikrinta / įkelta nuo Google indeksuota, AI cituojama ir parduota.

## Faktai, kurių negalima sukurti už savininką

- Mamos ir vaiko rinkinio bei dviejų alginato papildymų dabartinės kainos, supakuoti svoriai / matmenys ir laikinas pardavimo limitas vis dar atskirai nepatvirtinti. Tai netrukdo instrukcijų ir bendrų SEO pataisų darbui; šie trys puslapiai išlieka kontaktiniai.
- Nepateikti GTIN, klientų atsiliepimai, medžiagų saugos sertifikatai, papildomos amžiaus / dalyvių ribos ar realių rezultatų matavimai neišgalvojami.
- Neprieinama paskyra, žmogaus autentifikavimas ar paslaugos sąlygų priėmimas fiksuojami tik po nepriklausomo parengimo ir konkretaus tikro bandymo. Vienas toks veiksmas nestabdo kitų įgyvendinamų darbų.

## Papildymai ir dabartinė būsena · 2026-10-25

- [x] Peržiūrėta 70 puslapių turinio partija: 13 LT ir 57 PL / LV / ET. Nepriklausomai perskaityti abu pilni receptai; trys kalbinės pataisos priimtos naujomis revizijomis.
- [x] Visų 187 native puslapių prekės ženklo kontekstas sutikrintas: „Memory Casting“; juridinis operatorius lieka MB Memocasting. Ankstesnės publikavimo datos ir 97 LT gidų kalendorius išsaugoti.
- [x] Pagrindinės užklausos paskirstytos pagal vaidmenį: homepage „rankų liejimo rinkiniai“; produktai „rankų liejimo rinkinys porai / šeimai“. Homepage title: „Rankų liejimo rinkiniai porai ir šeimai | Memory Casting“. Bendras nepagrįstas superlatyvas nenaudojamas.
- [x] Kainos ir baltos konfigūracijos nuotraukos gaunamos iš to paties aktualaus LIVE katalogo; title / description / OG / Twitter suvienodinti. Parengtas pageidaujamas WebSite vardas ir didelių vaizdų peržiūros leidimas.
- [x] Savininkas patvirtino, kad poros ir šeimos rinkiniai EAN neturi. Gamintojo MPN: `MC-COUPLE-WHITE` / `MC-FAMILY-WHITE`; GTIN neišgalvoti. Oficiali GS1 registracija mokama; ji neužsakyta.
- [x] Savininkas patvirtino perdavimą vežėjui per 1–2 darbo dienas po apmokėjimo. Pristatymo tekste paruošimas atskirtas nuo vežimo laiko.
- [x] Patikrinta tikra GSC paskyra: 56 indeksuoti / 133 neindeksuoti istorinėje ataskaitoje. Sitemap priimtas, paskutinis nuskaitymas 2026-10-22 / 103 URL. Produktų klaidos patvirtinimas „atrodo gerai“; senas šeimos puslapio crawl 2026-10-22. Šių duomenų nepateikiame kaip naujo leidinio nuskaitymo.
- [x] Tikroje „Merchant Center“ paskyroje dabar 0 prekių ir 20 senų užsienio siuntimo taisyklių. Oficialiuose „Shopping“ / free-listing rinkų ir kalbų sąrašuose nėra Lietuvos / lietuvių kalbos. LT XML parengtas techniškai; neapsimetame kita rinka. Tai atskira riba nuo organinės paieškos Product duomenų ir vaizdų parengties.
- [x] Naujų mokamų tyrimų išlaidos 0 USD. Septyni faktiniai privatūs šaltinių / crawl / GSC stebėjimai importuoti canonical helperiu; ankstesnis 63 stebėjimų tyrimas išsaugotas pilnas.
- [x] C: atlaisvinta perkeliant tik savo seną generated dist į D: ir sukuriant valdomą naujo build junction. Originalai, DB, studija ir užsakymai neištrinti.
- [x] PUBLIC 229 / 229 ir canonical 12 / 12 testų praėjo prieš galutinį trijų sakinių pakartotinį importą. Pirmo bandymo dvi home-admission nesėkmės išsaugotos; po suderinto native importo abi regresijos praėjo.
- [ ] Galutinio leidinio build, naršyklės, spausdinimo ir PDF priėmimas bei publikavimas dar vykdomi.

Pavienis Chrome lab baseline (ne field CWV ar Lighthouse): 390 px homepage LCP 1,30 s, poros produktas 2,15 s; turinys ir navigacija prieinami be JavaScript. Penkių spalvų miniatiūrų 1,56 MB apkrova užfiksuota atskiram tiksliniam optimizavimui. Global SKILLS auditas turi nepraėjusių istorinių / įrankių patikrų; jos atskiriamos nuo pakeisto canonical SEO šaltinio patikros. Istorinis FAIL neperrašytas.
