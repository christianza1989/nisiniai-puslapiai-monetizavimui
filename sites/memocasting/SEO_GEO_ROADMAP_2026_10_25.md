# Memocasting SEO / GEO užbaigimo darbai · 2026-10-25

Savininko pavedimas: pagal abu pateiktus PDF sukurti tvarkingus poros ir šeimos instrukcijų puslapius, nuosekliai sutvarkyti likusias įgyvendinamas SEO / GEO spragas ir pateikti tikrą viešo leidinio priėmimą. Šis sąrašas nevadina puslapio prieinamumo Google indeksavimu ar AI citavimu ir nežada „idealių“ reitingų. Nauji mokami tyrimai, mokamos paslaugos, periodiniai darbai, nuorodų kampanijos ar žinutės partneriams neįjungiami.

## Darbo pagrindas

- [x] Abiejuose savo checkout sėkmingai fetch dabartinį main, išsaugoti svetimus failus ir integruoti naujienas. CORE `51249b01` su main `d3fe34b1`; PUBLIC `a65a6d2d` su main `8e47c34e`. Du dokumentų append konfliktai išspręsti išsaugant abi neprieštaraujančias dalis; actual taisyklės perskaitytos po integravimo.
- [x] Perskaityti abu savininko PDF ir vizualiai patikrinti abu vieno puslapio originalus. Išsaugoti jų SHA-256, atskirus kiekius / temperatūras ir visus veiksmų etapus. PDF nėra saugos sertifikatas; jame nėra alginato / gipso gramų ar vaikų amžiaus ribų.
- [x] Užfiksuoti aktualų deployed source, bindings, native leidinį, sitemap ir matavimo / paskyrų būseną. Istoriniai kvitai lieka istoriniai.
- [x] Atlaisvinti C: tik savo sugeneruotų build failų perkėlimu į atskirą patikrintą D: vietą; nešalinti originalų, studijos, užsakymų, kitų agentų darbo ar priklausomybių.

## Instrukcijos ir naudojimo informacija

- [x] Esamą `/pages/instrukcija` išlaikyti kaip tikrą dviejų instrukcijų pasirinkimo puslapį.
- [x] Paskelbti `/instrukcijos/poros-rinkiniui`: 2 l / 22–24 °C alginatui, 700 ml šalto vandens gipsui; atskirti rekomenduojamą temperatūrą nuo papildomo perspėjimo neviršyti 25 °C.
- [x] Paskelbti `/instrukcijos/seimos-rinkiniui`: 3,2 l / 23 °C alginatui, 1 400 ml šalto vandens gipsui; atskiras perspėjimas neviršyti 24 °C. Poros recepto automatiškai nedvigubinti.
- [x] Aiškiai pateikti reikmenis, pasiruošimą, 60–70 s maišymą, 3–4 min rankų laikymą su sąlyga dėl temperatūros, du gipso pylimo etapus, 45° pasukimą, 1 val. stingimą / ne daugiau 3 val., išėmimą, 5–7 parų džiovinimą ir 2–3 plonus dažų sluoksnius.
- [x] Išsaugoti papildomus patarimus apie padėtį, burbuliukus, gipso liekanų nepylimą į kanalizaciją ir skulptūros detalių valymą; nepublikuoti neaiškaus patarimo klijuoti žmogaus nagą / odą.
- [x] Pridėti tikrus originalių PDF atsisiuntimus, spausdinimui pritaikytą HTML ir patikrinti host / publikavimo / medijos prieigos ribas.
- [x] Susieti instrukcijas su tinkamu produktu, katalogu, pagalba ir susijusiais jau esančiais techniniais gidais. Kiekių nelaikyti antrame rankiniame frontend šaltinyje.

## Turinys ir pasitikėjimas

- [x] Iš viso esamo paketo surinkti likusius priešpaleidiminius / vietinio bandymo / nepatvirtinto veikimo tekstus, taip pat būsimose publikacijose. Koreguoti pagal tikrą dabartinę būseną, ne vien šalinti teisėtą nežinomybę.
- [x] Užbaigti pagalbos, redakcijos ir „Apie Memocasting“ tekstus; sutikrinti operatorių, adresų vaidmenis, veikiančius kanalus ir redakcinę kilmę.
- [x] PDF pagrindu sustiprinti esamus susijusius techninius atsakymus, išlaikyti jų URL ir publikavimo datas; nekurti dubliuojančių long-tail puslapių.
- [x] Sutikrinti komercinių puslapių, instrukcijų ir svarbiausių Kalėdų gidų vidines nuorodas bei aiškų kelią į realią prekę.
- [x] Instrukcijų pasirinkimui naudoti jau priimtus rinkinių įkvėpimo vaizdus ir pilnus originalius PDF. Esami savininko video ir galerija išsaugoti; naujų tariamų proceso / klientų fotografijų ar leidimų nekūrėme.
- [x] Išsaugoti 97 straipsnių sutartą serverinį pasirodymą; naujas scheduleris ir masinis ateities tekstų išleidimas neatliekami.

## Techninis SEO ir prekių paieška

- [x] Užbaigti bounded visų viešų URL / vidinių nuorodų / canonical / title / H1 / robots / sitemap / media auditą ir sutaisyti atkuriamas klaidas.
- [x] Sutvarkyti tikrą Product / Offer semantiką: prekybos pasiūlymai tik realiai palaikomoms rinkoms ir prekėms, kontaktiniai puslapiai be fiktyvių kainų, reitingų ar Google rich-result pažadų.
- [x] Sutikrinti Organization / grąžinimo / socialinių profilių / produktų variantų duomenis su matomu turiniu; įgyvendinti tik naudingus ir faktais paremtus papildymus.
- [x] Patikrinti esamą Merchant Center ir GSC priėmimą; užbaigti prieinamus nemokamus prekių duomenų / sitemap / patikrų veiksmus. Nauji account Terms ar trūkstamos faktinės teisės yra atskiras tikras savininko veiksmas.
- [x] Patikrinti naujų sąsajų realų desktop / mobile įkėlimą ir prieinamumą; pataisytas figūrų crop ir nereikalingas checkout skydelis. Miniatiūrų optimizavimo rezervas ir field CWV nežinomybė užfiksuoti atskirai, seno lab matavimo nevadinant dabartiniu CWV.

## GEO ir matavimas

- [x] Patikrinti, kad normalus HTML, schema, sitemap ir abu LLM skaitymo eksportai rodytų tą pačią patvirtintą versiją, naujas instrukcijas ir tikrai viešus puslapius.
- [x] Patikrinti paieškos robotų prieigą ir turimus CDN / WAF duomenis, atskiriant paieškos robotus nuo mokymo. Vien pakeistas User-Agent nėra patvirtintas tikro roboto apsilankymas.
- [x] Patikrinti GSC / analitikos prieigą ir faktinius parodymus, indeksavimą bei pirkimo matavimo būseną. Neprijungti ar neprieinami duomenys nėra nulis.
- [x] Užfiksuoti atkuriamą nemokamą SEO / GEO baseline ir konkrečius vėlesnio palyginimo klausimus; nematuotą citavimą palikti nematuotu, nepradėti naujų mokamų ar periodinių užduočių.

## Priėmimas ir publikavimas

- [x] Atlikti pilną galutinio lietuviško teksto saviredakciją ir kiekvienos pakeistos revizijos usefulness / facts / sources / media / links / presentation peržiūrą.
- [x] Parengti atominį native leidinį per esamą turinio studiją, eksportuoti ir importuoti; nepaliestų puslapių tekstus / datas / patvirtinimus palyginti su baseline.
- [x] Prasmingi unit testai, TypeScript, tikslinis lint, build ir dry-run; originalias nesėkmes išsaugoti, shared defektus taisyti canonical vietoje su regresija ir žurnalu.
- [x] Patikrinti tikrą naršyklės vaizdą 1280 / 390 / 320 px, spausdinimą, PDF, klaviatūros veiksmus ir teksto / tarpų didinimą.
- [x] Paskelbti tikslų leidinį su iš naujo sutikrintais actual bindings / routes / observability ir išsaugotu rollback; neliesti užsakymų, Stripe, likučių, siuntų ar paslapčių.
- [x] Po įkėlimo patikrinti HTTPS, exact source / release, visus pakeistus URL, robots / sitemap / canonical / schema / eksportus, PDF baitus ir ateities puslapio / medijos filtrą.
- [x] Užbaigti būsenos dokumentus ir scoped Git perdavimą; aiškiai atskirti įgyvendinta / patikrinta / įkelta nuo Google indeksuota, AI cituojama ir parduota.

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
- [x] C: atlaisvinta perkeliant tik savo seną generated dist į D:. Vite vėliau pašalino junction ir sukūrė įprastą C: dist; naujo build vieta nėra klaidingai vadinama D:. Originalai, DB, studija ir užsakymai neištrinti.
- [x] PUBLIC 229 / 229 ir canonical 12 / 12 testų praėjo prieš galutinį trijų sakinių pakartotinį importą. Pirmo bandymo dvi home-admission nesėkmės išsaugotos; po suderinto native importo abi regresijos praėjo.
- [x] Galutinio leidinio build, naršyklės, spausdinimo ir PDF priėmimas bei publikavimas dar vykdomi.

Ankstesnis pavienis Chrome lab baseline nėra naujo leidinio field CWV ar Lighthouse. Dėl Chrome zoom ne visi prašyti viewport dydžiai buvo tie patys kaip realus innerWidth; tų skaičių nenaudojame kaip naujo mobiliojo leidinio priėmimo. Tikros naujų instrukcijų 390 / 320 px būsenos užfiksuotos atskirais innerWidth/clientWidth, overflow ir nuotraukų bounds įrodymais. Penkių spalvų miniatiūrų 1,56 MB apkrova yra optimizavimo rezervas; bazinio produkto lab LCP nebuvo nustatyta kaip nepraėjusi vartų klaida.

## Tikras pirmos partijos publikavimas ir GA4 tęsinys

- [x] PUBLIC `39e4cace` / native `47fc0797` paskelbti: Worker `9fd8a2bc-44e9-4226-9a0f-7889904cc3b6`. Visos keturios actual bindings, observability, abu domenai ir commerce versija išsaugoti.
- [x] Tikras HTTPS auditas: 113 sitemap HTML puslapių, viena H1 / title / canonical, validi JSON-LD; abiejų PDF SHA-256 / GET / HEAD / Range ir raw404; abu LLM eksportai su instrukcijomis; būsimo straipsnio ir jo unikalaus vaizdo404. Dvi senos index `page` užklausos rastos ir pataisytos source `535936a0`; jų hosted priėmimas – kitoje partijoje.
- [x] Actual instrukcijos 1280 / 1024 darbalaukyje, 390 / 320 telefone: abi figūros pilnos, įkeltos, nėra horizontalaus perpildymo. Šeimos18žingsnių,1H1; print paslepia navigaciją / TOC / footer, išlaiko instrukcijos antraštę ir veiksmus.
- [x] GSC sitemap pakartotinai pateiktas2026-10-25; UI sėkmė išsaugota. Paskutinis Google skaitymas dar2026-10-22 /103URL, tai nėra naujo113URL paketo indeksavimo patvirtinimas. Pagrindinio URL skubaus indeksavimo užklausa nepavyko dėl Google reCAPTCHA ryšio; sitemap pateikimas sėkmingas.
- [x] Savininkas patvirtino naują atskirą nemokamą GA4 ir Google Terms / BDAR. Nauja nuosavybė560554153, vienas stream16198963010; papildomas sharing, Enhanced Measurement, Signals, ads ir detalūs geo/device išjungti, abu retention2m ir resetOFF. Senos GA4 istorijos išsaugotos.
- [x] Savininkas atskirai patvirtino tik seno GSC susiejimo perkėlimą. Naujas sc-domain:memocasting.lt →560554153/16198963010 ryšys patvirtintas GA4 ir GSC, Merchant Center asociacija išsaugota.
- [x] Parengta LT-only Basic consent jungtis: iki persistinto sutikimo jokio mūsų Google žymos įkėlimo; atsisakymas / saugyklos klaidos išjungia. Krepšelyje pradinis skydelis nesirodo; footer pasirinkimas veikia, atsiskaitymas nematuojamas. Native privatumo papildymas pakeitė tik vieną187puslapių paketo puslapį, kiti186 ir visos datos tiksliai išsaugoti.
- [x] Naujos partijos250regresijų, TypeScript ir tikslinis ESLint PASS. Source `5cff95db` turi ir mažą checkout pasirinkimo pataisą, priimtą tikru UI. Pradėtas ankstesnis build sąmoningai sustabdytas prieš ją įtraukiant; nesėkmė neištrinta ir nevadinama programos regresija.
- [x] Galutinis Analytics build / dry-run / aktyvūs du env flagai ir realaus G-ID hosted sutikimo / užklausų / atšaukimo priėmimas.

GA4 šiame etape matuoja tik turinio peržiūras. Purchase / pajamų atribucija, Google Ads ar papildomos rinkos neįjungiamos ir neveikimas neslepiamas. Faktiniai pardavimai tebėra prekybos sistemos užsakymuose; nauja GA4 nėra ankstesnių pardavimų matavimo pakaitalas.

## Galutinis priėmimas

Actual `f5212538-6ecb-4fad-aaad-143ed08ce6ce` / source `5cff95db` / native `2844fc35` aktyvus100%. Galutinis113HTML/2PDF/17redirects/futureguard auditas PASS; tikras opt-in204 ir GA4RealtimeQA patvirtintas, withdrawal/cart/foreign0Google. Visi šios vietinės darbų apimties taikomi etapai priimti; pažymėti veiksmai nereiškia Google reitingų ar neįgyvendinto purchase matavimo garantijos. Išsamus faktų ir ribų kvitas: [SEO_GEO_ACCEPTANCE_2026_10_25.md](SEO_GEO_ACCEPTANCE_2026_10_25.md).
