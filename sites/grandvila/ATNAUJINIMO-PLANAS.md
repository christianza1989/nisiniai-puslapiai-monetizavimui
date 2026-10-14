# Grand Vila svetainės atnaujinimo planas

2026-10-14. Apimtis: visos dabartinės svetainės migracija ir modernizavimas. Šiame pavedime savininkas pasirinko **auditą ir planą**. Ši specifikacija dar nėra įgyvendinta svetainė.

Rekomenduoju atkurti visą „Grand Vila“ puslapių sistemą bendrame core, išlaikant 51 sitemap URL, dar 2 aptiktus archyvo adresus, esamus tekstus, tikras nuotraukas, galerijų eiliškumą ir verslo kontaktus. Kurti savitą vilos dizainą ir mažus veikiančius komponentus. Dabartinės WordPress temos, WPBakery ir Revolution Slider kodo perkelti nereikia: būtent turinį ir lankytojo veiksmus reikia atkurti naujoje architektūroje.

## Nekeičiamos migracijos sąlygos

| Objektas | Reikalavimas | Priėmimo įrodymas |
|---|---|---|
| Vieši puslapių adresai | Išlaikyti visus `URL-INVENTORIUS.json` adresus, įskaitant vidinius katalogus, datas, `-2` ir paskutinį `/`. | Automatinis seno ir naujo URL rinkinių palyginimas; kiekvienas senas sitemap adresas grąžina 200 be nukreipimo į kitą kelią. |
| Sitemap | Išsaugoti `/sitemap_index.xml` ir keturis dabartinius XML failų adresus; generuoti iš tos pačios patvirtinto turinio projekcijos. | Penki HTTP atsakymai, XML parse ir 51 URL lygybė. `/sitemap.xml` suderinti su tuo pačiu registru. |
| Tekstai | Išsaugoti kiekvieną prasminį turinio bloką, skaičius, sąlygas, nuorodas, pramogų aprašymus ir šefo puslapius. | URL → seno bloko → naujo bloko registras; nulinis nepaaiškintų praradimų skaičius. HTML dekoracijų ir pasikartojančios navigacijos nereikia laikyti verslo tekstu. |
| Kalbos taisymai | Archyvas lieka tikslus. Naujoje revizijoje taisyti rašybą ir skyrybą, pateikiant pakeitimų sąrašą ir išsaugant reikšmę. | Atskira viso galutinio teksto saviredakcija bei senos ir naujos versijos palyginimas. |
| Nuotraukos | Išsaugoti prieinamus originalus; naujus WebP variantus kurti bendru medijos importu. Jokių generuotų pakaitalų tikriems įvykiams. | Šaltinio URL, vietinis failas, SHA-256, dydžiai, teisės ir puslapio vieta. Visi galerijos elementai pasiekiami be privalomo JavaScript. |
| Sugadintas vaizdas | `/galerija/pramogos/` šaltinyje yra nuotrauka, kurios originalas ir miniatiūra grąžina 404. | Atkurti iš savininko kopijos arba aiškiai sutarti pakaitalą. 404 negalima „išsaugoti“ kaip parsisiųstą nuotrauką. |
| Kontaktai | Naudoti `info@grandvila.lt`, „Grand Vila“ adresą ir patvirtintą telefono numerį. Svetainėje ir LKTA profilyje sutampa `+37064542222`; homepage turi papildomą nulį. | Vienas site-specific faktų šaltinis; sutampa forma, tekstai, `tel:`, schema ir eksportai. `info@pinet.lt` bei `MB Pinet` netampa šio verslo rekvizitais vien dėl bendro core. |
| Papildomi failai | Išlaikyti aktualių planų, originalių vaizdų ir esamų išorinių nuorodų prasminį ryšį. | Atskirai patikrinti 3 kambarių planus iš vilapasaka.lt, YouTube, socialinius profilius ir knygos nuorodą. |

## Sprendimas dėl senų šablono URL

`/2017/02/14/hello-world/`, `/category/uncategorized/`, `/portfolio/` ir `/portfolio/aplinka/` yra dabartiniame sitemap. Juos reikia įtraukti į migracijos testą, nes savininkas paprašė išsaugoti visus adresus. Pirmoji naujo leidimo versija neturi savavališkai jų pašalinti, keisti į 410, nukreipti į homepage ar išimti iš sitemap.

Vis dėlto šablono tekstas neteikia komercinės naudos. Taip pat `/pramogos/kartu-varzybos/` ir `/pramogos/kartu-varzybos-2/` dubliuoja temą. Aukštos SEO kokybės sprendimas reikalauja atskiros redakcinės peržiūros: suteikti puslapiams pagrįstai skirtingą paskirtį arba savininkui sutarti dėl konsolidavimo. `noindex` puslapis sitemap ar canonical į kitą puslapį neišsprendžia visų šių reikalavimų kartu. Šis konfliktas lieka aiškiai matomas; joks „100 SEO“ pažadas jo neuždengia.

## Dizaino kryptis

Siūloma kryptis – šviesus vilos katalogas, kuriame tikros erdvės ir gastronomija yra pagrindinė vizualinė medžiaga. Išlaikyti „Grand Vila“ ženklą, ornamentų charakterį ir šiltą akcentą. Pagrindą sudaryti iš šiltai balto fono, tamsaus teksto, ramaus bronzos akcento ir didelių autentiškų nuotraukų. Visos nuotraukos lieka galerijose; homepage jų nekrauna vienu metu.

Palyginti tris skirtingas kompozicijas prieš įgyvendinimą: (1) viena plati pagrindinė fotografija ir aiškus pasiūlymas; (2) vilos erdvių katalogas su nuosekliu pasirinkimo keliu; (3) gastronomija paremta redakcinė kompozicija. Rekomenduojama pirma kryptis su antrosios navigacijos aiškumu. Kompromisas – mažiau judesio ir momentinio nuotraukų kiekio pirmame ekrane, daugiau kontrolės ir greitesnis veikimas. Tai pasiūlymas, o ne jau peržiūrėtas maketas.

### Pagrindinio puslapio eiga

1. Kompaktiška antraštė su aiškiai matomu logotipu ir 5 pagrindiniais keliais: erdvės ir paslaugos, pramogos, maitinimas, galerija, kontaktai. Apie mus ir naujienos lieka pasiekiami meniu bei poraštėje. URL lieka esami.
2. Viena greitai užkraunama tikra vilos ar pokylių salės nuotrauka. Matomas H1, trumpas paaiškinimas ir veiksmas „Pasiteirauti dėl datos“, vedantis į veikiančią užklausą. „Rezervuoti“ neturi reikšti patvirtintos rezervacijos, jei sistema tik siunčia žinutę.
3. Trumpa faktų juosta su patikrintais rodikliais. 150 šventės svečių, 25 kambariai ir 23 km atstumas jau yra šaltiniuose; aktualumą patvirtinti prieš publikavimą. Kambarių ir miegamų vietų skaičiai nėra tas pats.
4. Du pagrindiniai pasirinkimo keliai: šeimos šventės ir įmonių renginiai. Abu veda į esamų paslaugų URL, o ne naujus tuščius miesto puslapius.
5. Erdvių peržiūra su keliomis nuotraukomis ir konkrečiomis nuorodomis į pilnas galerijas. Pokylių ir konferencijų salės pateikiamos atskirai.
6. Maitinimo dalis su realiu šefo profiliu, šventiniu meniu ir degustacijomis. Išsaugoti visus dabar egzistuojančius maitinimo puslapius.
7. Nakvynė, kambarių planai, SPA ir pramogos. Aiškiai nurodyti, kada paslauga yra gretimoje „Viloje Pasaka“ ir užsakoma papildomai.
8. Atsiliepimai tik su nustatytu šaltiniu ir teise naudoti. „Vilaitės“ rekomendacijos nepervadinamos „Grand Vila“ atsiliepimais. Nerodyti sugalvoto bendro reitingo.
9. Vieta ir užklausa. Žemėlapį įkrauti lankytojui pasirinkus; adresas ir maršruto nuoroda prieinami iš karto. Poraštė turi tikrus kontaktus ir privatumo informaciją.

### Vidinių puslapių šablonai

| Puslapių šeima | Nauja struktūra |
|---|---|
| Paslaugos | H1, trumpa paskirtis, aktualūs pajėgumo ir vietos faktai, visas senas aprašymas, susijusi galerija, sąlygos ir užklausa. |
| Galerija | H1, trumpas temos paaiškinimas, visos nuotraukos jų esama tvarka, aiškios miniatiūros, prieinama peržiūra ir grįžimas į susijusią paslaugą. |
| Pramogos | Aiškus sąrašas ir visos esamos atskiros pramogų nuorodos; trumpa santrauka, vieta, sąlygos, trukmė ir papildomas mokestis tik kai žinomi. |
| Maitinimas ir šefas | Realūs profiliai, išsaugotas meniu ir knygos turinys, patvirtinti atsakymai dėl patiekalų, alergijų ir derinimo. Nauji faktai nepridedami iš prielaidų. |
| Kontaktai | Matomas logotipas, H1, adresas, skambutis, el. paštas, maršrutas ir forma be kelių šimtų pikselių tuščio tarpo. |
| Planai | Tikri patalpų planai su pavadinimais ir alternatyviais aprašymais. Patikslinti, kad dabar naudojami „Vilos Pasaka“ planai. |
| Apie mus | Išsaugota istorija ir verslo tapatybė; istorinius apdovanojimus ir išskirtinumo teiginius atskirti nuo dabartinės patvirtintos būklės. |
| Naujienos ir archyvai | Veikiantis sąrašas arba aiški esama būsena; atskiros SEO ir turinio peržiūros reikalaujantys šablono adresai išlieka registre. |

### Tipografijos ir prieinamumo patikra

Naudoti suderintą antraščių ir teksto sistemą. Pradiniai orientyrai: tekstas 16–18 px, eilutės aukštis apie 1,55–1,7, skaitymo plotis apie 60–70 ženklų; svarbūs valdikliai ir pagalbiniai tekstai ne mažinami vien tam, kad tilptų. Paslaugų aprašymus lygiuoti į kairę – dabartinis abipusis lygiavimas telefone sukuria didelius tarpus.

Patikrinti tikrus šriftų svorius, lietuviškus ženklus, įkeltus failus, kontrastą su konkrečiomis nuotraukomis, logotipą baltame fone, focus, meniu, galerijos uždarymą ir formos klaidas. Kiekvienam URL vienas H1. Jokių H1 vien dėl didelio teksto dydžio. Forma turi matomas `<label>`, `type=email`, būtinumą ir suprantamus klaidų pranešimus.

Privalomi tikri 1440, 768, 390 ir 320 CSS px vaizdai, 200 % didinimas ir teksto tarpų patikra. Vien viewport keitimas neįrodo tikro browser zoom. Esamo audito didinimo dalis lieka UNVERIFIED.

## Našumas ir Lighthouse

Tikslas – 100/100 prieinamumo, gerųjų praktikų ir SEO kategorijose bei 100/100 našumo, kiek leidžia visas realus turinys ir pasirinkta infrastruktūra. Privalomas priėmimo orientyras – mobilus našumas bent 95 kiekvienai pagrindinei puslapių šeimai, siekiant 100. Nei vaizdai, nei turinys neišmetami vien dėl balo. Privatūs preview išlieka `noindex`; jų mažesnis SEO balas nėra priežastis išjungti apsaugą.

| Biudžetas ar rodiklis | Pradinis įgyvendinimo tikslas |
|---|---|
| Pirmo ekrano LCP vaizdas | Mobilus variantas maždaug iki 150–200 KB; vienas `fetchpriority=high`, tikslūs matmenys ir `sizes`. |
| Pradinis JS | Iki 40 KB gzip šios svetainės funkcijoms; jei framework bazė didesnė, atskirai parodyti ir pagrįsti. Galerija, video ir žemėlapis aktyvuojami pagal poreikį. |
| Pradinis CSS | Iki 30 KB gzip šios svetainės stiliams; nesiųsti kitų nišų temų. |
| Šriftai | Iki 2 šeimų ir tik naudojami WOFF2 svoriai; įvertinti 1 šeimos variantą, `font-display:swap`, licenciją ir lietuvišką rinkinį. |
| Pradinis mobilus perdavimas | Homepage orientyras iki 500–700 KB; galerijos pradinis ekrano rinkinys iki 1 MB. Visa galerija yra HTML, likę vaizdai native lazy. |
| LCP / CLS / TBT | LCP ≤2,5 s; CLS ≤0,05 projektinis orientyras; TBT ≤150 ms. Field INP ir 75-ojo procentilio CWV vertinami atskirai. |

Pašalinti priklausomybę nuo Revolution Slider pirmam ekranui, WPBakery ir DFD bendrų stilių paketo. Naudoti serverio grąžinamą HTML, native lazy vaizdams, lengvą galeriją, tekstinį video kvietimą ir žemėlapio nuorodą. Nuotraukų kilmė ir jų visa biblioteka išlieka privačiame archyve. Senų originalių medijos URL suderinamumą spręsti approved alias registre, ne apeinant publikavimo vartus.

Laboratorijoje atlikti 3 nuoseklius matavimus tomis pačiomis sąlygomis homepage desktop/mobile ir po pagrindinį kiekvienos šeimos puslapį. Saugoti visus rezultatus bei medianą. Paleidus tikrinti produkcinę aplinką, tada realių lankytojų CWV; Lighthouse nėra INP ar paieškos pozicijų įrodymas. [Chrome vertinimo paaiškinimas](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring), [Core Web Vitals](https://web.dev/articles/vitals).

## SEO ir GEO

1. `lang=lt`, schema `inLanguage=lt-LT`, vienas H1 ir unikalūs title/description kiekvienam išsaugotam URL. Galerijų pavadinimuose aiškiai atskirti nuotraukas nuo paslaugos aprašymo. OG vaizdas turi būti tikras to puslapio vaizdas.
2. Canonical, sitemap, breadcrumbs, HTML nuorodos ir LLM išvestys turi remtis vienu domeno ir patvirtintos revizijos filtru. Išlaikyti dabartinį URL su `/`, o ne pakeisti canonical į trumpesnį.
3. Sutvarkyti tikros „Grand Vila“ organizacijos ID, adresą, telefoną, logo ir socialinius profilius. Atskirai modeliuoti vietą ir susijusias vilas. `sameAs` neturi apjungti skirtingų verslų vien todėl, kad jie susiję.
4. Matomi breadcrumbs ir schema sutampa. Nuotraukų galerijoms tinka WebPage/CollectionPage ir tikri ImageObject; paslaugoms – patikrinta Service informacija. LocalBusiness/EventVenue pridėti pagal tikrą objektą ir faktus. Nekurti fiktyvių Offer, reitingų ar rezervavimo Event duomenų.
5. Atsakyti į tikrus pasirinkimo klausimus tame URL, kuris jau turi atitinkamą paskirtį: kiek telpa svečių, kur nakvojama, kas įeina, kas užsakoma papildomai, kaip derinama data. DUK matomi lankytojui; schema nėra privalomas reitingo įrankis.
6. Ištaisyti 5 aptiktus URL be įeinančios nuorodos crawl rinkinyje. Tikrinti dabartines 7 neveikiančias `#comments` nuorodų vietas ir tikrus pagrindinio puslapio fragmentus. Išsaugoti senus viešai naudojamus fragmentus, jei jiems tebėra atitinkama skiltis.
7. `/llms.txt` ir `/llms-full.txt` generuoti automatiniu core keliu iš tų pačių viešų faktų. Jie šiuo metu grąžina 404. Šie failai yra skaitymo pagalba, o ne Google AI reitingo sąlyga. [Google AI gairės](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).
8. Patikrinti paieškos botų prieigą per realų CDN/WAF ir GSC. Treniravimo botų politika yra atskiras sprendimas. Pasikeitusių puslapių datos reiškia tikrą redakcinį atnaujinimą, o ne šio audito datą.

Tikri GSC, GA4, užklausų, skambučių ir pajamų duomenys dabar neprijungti šiam auditui. Jų trūkumas nėra nulis. Prieš paleidimą reikalingas senų landing page ir užklausų baseline, sitemap/URL Inspection, faktinis kvalifikuotų užklausų matavimas ir tikras gavimo bandymas. „Top SEO/GEO“ vertinamas prieinamumu, naudingu turiniu ir matuojamais rezultatais; pirmos vietos ar AI citavimo garantijos nėra.

## Core pritaikymas prieš statant

Detalios kliūtys yra [CORE-SUDERINAMUMAS.md](CORE-SUDERINAMUMAS.md). Pirmiausia atlikti mažą lossless migracijos bandymą: homepage, `/galerija/pokyliu-sales/`, `/kontaktai/`, giliausias datinis URL ir vienas originalus `/wp-content/uploads/...` vaizdo adresas.

Bandymas turi įrodyti tikslų `/` URL, 121 galerijos elementą, seno vaizdo atitikmenį, tikrą teksto projekciją, vienodus HTML/sitemap/schema/LLM faktus ir neigiamus draft/date/revocation/cross-host atvejus. Jo negalima priimti vien dėl schema validator PASS. Tik po šio bandymo masiškai importuoti likusius puslapius.

## Įgyvendinimo tvarka

| Etapas | Darbas | Priėmimas |
|---|---|---|
| 1 | Užfiksuoti galutinį URL, teksto ir medijos manifestą; peržiūrėti tikrus verslo faktus, teises, archyvo URL bei šablono konfliktą. | Visi 51 sitemap URL ir 2 papildomi URL turi aiškų atitikmenų registrą; visi prieinami naudojami vaizdai archyvuoti; 404 ir nepatvirtinti teiginiai įvardyti. |
| 2 | Bendras core lossless bandymas ir tik reikalingos shared pataisos. | Abiejų repo validatoriai, atskira svetainės URL politika, galerija, media alias, regressions ir core improvement journal. |
| 3 | 2–3 kompozicijų palyginimas, savas DESIGN ir tekstų sistema. | Tikri desktop/mobile maketai su šios svetainės tekstais ir nuotraukomis. |
| 4 | Visa 53 URL sistema, galerijos, meniu, kontaktų forma ir peržiūrėtas turinys. | Nėra dingusių blokų, sugadintų nuorodų ar medijos praradimų; nesukurta fiktyvi rezervacija. |
| 5 | Isolated production build, pilnas crawl, Lighthouse, keyboard, 320 px, 200 % zoom, formos įrašymas ir inbox bandymas. | SITE_COMPLETION bei visi taikomi `--require-local` vartai; duomenys ir tikri vaizdai išlieka. |
| 6 | Patvirtintas release, deployment ir domeno perjungimas su rollback. | Patikrintas DNS/TLS, visų senų URL 200, sitemap, schema, kontaktų gavimas ir matavimas. Seno WordPress backup paliekamas. |
| 7 | Produkcinis crawl, GSC ir kvalifikuotų užklausų stebėjimas. | Indeksavimas, realūs CWV ir verslo rezultatai vertinami atskirai. |

Iki diegimo nekeisti MX, SPF, DKIM, DMARC ar esamo pašto. DNS tikslas ir komercinis hostingas sprendžiami pagal faktinę prieigą, ne iš domeno pavadinimo. Jokių klientų žinučių, agentų runtime ar mokamų tyrimų šis planas neįjungia.

## Duomenys kitam etapui

Reikia patvirtinti teisinį svetainės operatorių, vieną telefono numerį, medijos naudojimo teises, dabartinius šefus ir paslaugų pajėgumą, „Grand Vila“ ir gretimų vilų ribas, apdovanojimų aktualumą, atsiliepimų šaltinius, trūkstamos nuotraukos kopiją, kontaktų pristatymą ir GSC/GA4/hosting prieigas. Tai konkretūs būsimo paleidimo vartai; jie netrukdė užbaigti viešo audito ir išsaugojimo plano.
