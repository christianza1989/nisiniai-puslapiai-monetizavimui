# Memory Casting: giluminis SEO / GEO auditas, 2026-10-25

Audito išvada: techninis atradimo ir publikavimo pagrindas veikia. Vis dėlto svetainė dar turi svarbių turinio, komercinių faktų, vaizdų perdavimo ir organinio autoriteto spragų. Vien didesnis straipsnių kiekis ar ilgesni tekstai jų neišspręs. Šiuo auditu gamybinis turinys, datos, nustatymai ir mokėjimai nekeisti.

## Apimtis ir atsekamumas

- Patikrinti visi **187 paketo URL**: **118 viešų HTTP 200**, **69 suplanuoti HTTP 404**. Tai nėra 187 šiuo metu indeksuojami puslapiai.
- Dabartinis kalbų inventorius: **121 LT, 22 PL, 22 LV, 22 ET**. Tarp LT puslapių yra **97 `/gidai/` straipsniai: 28 vieši, 69 būsimi**; atskiras `/pagalba` nepridedamas prie šių 97. Ankstesniame perdavime nurodyta 124/21/21/21 proporcija dabartinio inventoriaus nebeatitinka.
- Visiems URL tikrinti statusai, metaduomenys, canonical, H1, JSON-LD, viešumas, nuorodų grafas. Visų **28 viešų LT `/gidai/` tekstai ir `/pagalba` perskaityti individualiai**. 69 būsimų straipsnių tikrinti klausimai, struktūra, grafikas, nuorodos, šaltinių registras ir rizikų požymiai; papildomai skaityti persidengiančių ir sezoninių temų pilni tekstai. Tai nėra 69 būsimų tekstų ir visų užsienio kalbų kalbinės redakcijos patvirtinimas.
- Tikrintas tikras desktop ir emuliuotas 390 / 320 px mobilus vaizdas, prekės miniatiūrų tinklo duomenys, veikiantis straipsnio turinys ir nuoroda į skyriaus antraštę. Mobilus vaizdas nėra fizinio telefono bandymas.
- Skaityti tikri GSC našumo, indeksavimo, sitemap, produkto URL Inspection, struktūrinių duomenų, CWV, nuorodų, rankinių veiksmų ir saugos rodmenys. Našumo lentelėje surinktos 130 rodomų užklausų; puslapių lentelėje — 10 pirmųjų, ne visas eksportas.
- Naujas mokamas tyrimas neatliktas. Treg jungtis grąžino pasibaigusio prisijungimo klaidą; OpenRush neturėjo prijungtos šio domeno GSC nuosavybės. Veikiančius GSC duomenis perskaičiau per savininko Chrome. Nauji paieškų apimčių ar DR skaičiai neišgalvoti.

Versijos:

| Objektas | Audituota versija |
|---|---|
| CORE main / audito pradžia | `83b2ec3e99df79175284687bfe568249fb62c81a` |
| PUBLIC main | `a12d13659708a3caedcb8afdb19fe253bb9ea13e` |
| Įdiegtas PUBLIC source; identiškas dabartinio main medis | `ecbcd5020e0b8f40929f8ba97c23fbfd06978a0e` |
| Frontend Worker, 100 % | `fca0b35d-46bb-45e9-b9bd-7db8be42f4fe` |
| Backend, nepakeistas | `c3607521-ae24-4efe-9df4-ce3c3050341b` |
| Native leidinys | `2d2463df-fe76-4efb-9978-60112aa10aaf` |
| Paketo SHA-256 | `cfec71cb4763224748be22fb5084688dd7f80c16d9e11b6f47c9fd6398db01bb` |
| Inventoriaus laiko pjūvis | `2026-10-25T15:03:00.447Z` |

Prieš auditą ir jo tęsimą abiem repo sėkmingai vykdyta canonical Git freshness. Ankstesnė `PHASE-1-AUDIT.*` istorija neperrašyta. Naujas A–Z registras: `DEEP_SEO_GEO_AUDIT_2026_10_25.json`; 187 URL ir 97 straipsnių sprendimų lentelės — to paties prefikso CSV failai.

## Kas patikrinta ir veikia

| Sritis | Dabartinis įrodymas |
|---|---|
| Statusai | 118/118 viešų 200, 69/69 būsimų 404; nežinomas testinis URL 404 |
| Meta | Kiekvienas viešas URL turi vieną H1, title, description ir savo canonical; dubliuotų title/description nerasta |
| Kalbos | `lang` atitinka LT/PL/LV/ET; 82 puslapiuose hreflang grupės turi veikiančius abipusius adresus, 0 aptiktų grupių klaidų |
| Atradimas | Visi 118 viešų puslapių pasiekiami iš pradžios; didžiausias apskaičiuotas gylis — 2 nuorodos; viešų gidų našlaičių nerasta |
| Sitemap | 114 URL tiksliai sutampa su vieša projekcija be keturių funkcinių krepšelių; būsimų tekstų nėra |
| GSC sitemap | „Pavyko“, skaityta 2026-10-25, 113 atrastų. Šis GSC pjūvis gali vėluoti nuo šiandienos 114; tai savaime nėra klaida |
| GSC sankcijos / sauga | Abiejose tikrintose ataskaitose „Neaptikta jokių problemų“; tai nėra visos sistemos saugumo sertifikatas |
| Robots / krepšelis | Turinys leidžiamas, API ribojamas, krepšelis noindex. Krepšelio neblokuojant robots Google gali perskaityti noindex |
| Nuorodos | Sugedusių tikrintų vidinių HTML tikslų ir fragmentų nerasta. Įtartini galerijos / video URL pasirodė esą failai, visi tikrinti HEAD 200 |
| Schema | Visas viešas JSON-LD parsina; poros prekės GSC Inspection turi tinkamą Product, merchant listing ir breadcrumb |
| Prekyba | Viešas storefront-context praneša `productionReady`, Stripe LIVE ir pristatymo jungtį. Tai nėra naujas bandomasis apmokėjimas ar visas komercijos auditas |
| Prekės faktai | 32 € porai, 48 € šeimai, balti dažai abiejuose; išparduoto padėklo produkto puslapis sąžiningai tai nurodo |
| Instrukcijos | Atskiri poros ir šeimos puslapiai, originalių PDF nuorodos; šeimai 3,2 l / 1 400 ml, porai 2 l / 700 ml |
| Mobilus tekstas | Skaitytame 320 px gide scrollWidth = viewportWidth = 320; 390 px prekė ir straipsnis persirikiuoja į vieną skiltį |

### Seni adresai: iš naujo taisyti nereikia

Šie realūs adresai dabar grąžina 301 ir veda į esamą 200 puslapį:

| Senas kelias | Dabartinis tikslas |
|---|---|
| `/password` | `/` |
| `/products/liejimo-rinkinys-porai` | `/rinkinys-porai` |
| `/products/seimos-rinkinys-1` | `/seimos-rinkinys` |
| `/collections/all` | `/ranku-liejimo-rinkiniai` |
| `/en` | `/` |
| `/en/collections/dovanos-poroms` | `/gidai/dovana-porai` |
| `/blogs/news/populiariausios-kaledines-dovanos-moteriai-siais-metais` | `/gidai/kaledines-dovanos-moterims` |

Patikrintas www produkto adresas su UTM išlaiko kampanijos parametrą ir nukreipia tiesiai į canonical hostą. Slash normalizavimas duoda 308. Pirmas senų adresų bandymas be įprasto User-Agent gavo 403; pakartotas identifikuotas HTTP bandymas gavo tikruosius 301. Pirminė nesėkmė išsaugota, bet nelaikoma sugedusio redirect įrodymu. Išgalvotas trumpesnis blog URL ar spėtas feed kelias su 404 nėra pagrindas kurti naujus alias.

## Ką rodo tikras GSC

Našumo laikotarpis **2026-09-26–2026-10-23**: **54 paspaudimai**, apie **1,45 tūkst. parodymų**, **3,7 % CTR**, vidutinė pozicija **38,5**. Duomenys apima seną ir naują svetainę; jais negalima įvertinti spalio 25 d. leidinio rezultato.

| Užklausa, kaip rodoma GSC | Paspaudimai / parodymai | Vidutinė pozicija | Sprendimas |
|---|---:|---:|---|
| ranku liejimo rinkinys | 10 / 44 | 2,5 | Saugoti veikiančią pagrindinio puslapio temą ir URL |
| memory casting | 3 / 10 | 2,1 | Išlaikyti vienodą brandą ir organizacijos faktus |
| dovanos moterims | 0 / 63 | 50,9 | Reikia kitokio, konkretesnio pasirinkimo nei Kalėdų kopija |
| kalėdinės dovanos | 0 / 38 | 79,9 | Plati konkurencinė tema; pirmiausia stiprinti susijusius siauresnius atsakymus |
| kaledines dovanos | 0 / 34 | 78,4 | Ta pati intencija; nereikia atskiro URL be diakritikų |
| ypatingos dovanos moterims | 0 / 19 | 21,8 | Tinkamas esamo moterų gido skyrius, ne dar vienas sinoniminis straipsnis |
| ka dovanoti 50 jubiliejaus proga | 0 / 14 | 12,4 | Tikslus 50-mečio sprendimo skyrius esamame / planuojamame jubiliejaus gide |
| kaledines dovanos teciui | 0 / 9 | 17,1 | Aukštas redakcinio sustiprinimo prioritetas |
| kaledines dovanos tevams | 0 / 7 | 18,9 | Sustiprinti bendro biudžeto ir dviejų žmonių palyginimą |
| dovana dukrai | 0 / 27 | 29,0 | Gruodžio 6 d. būsimas gidas jau turi užklausos signalą; apsvarstyti ankstesnį slotą |

Tai mažos imtys ir vidutinės pozicijos, ne tiesioginiai dabartinių Google rezultatų rangai ir ne prognozuojamas lankytojų kiekis.

Indeksavimo ataskaita vėluoja: apžvalgoje atnaujinimas 2026-10-16, **56 indeksuoti / 133 neindeksuoti**, tarp priežasčių 55 redirect, 24 robots, 7 nerasti, 46 „patikrinta — neindeksuota“, 1 kita canonical. Pavyzdžių paskutinio tikrinimo datos siekia spalio 17 d. Negalima visų 133 laikyti naujos svetainės klaidomis. Tarp 46 pavyzdžių yra `/gidai/dovana-vestuviu-metinems` ir `/gidai/dziovinimas-ir-isemimas` bei lokalizuoti puslapiai: dabar jie pasiekiami, todėl jų vertę ir pakartotinį tikrinimą verta stebėti atskirai.

CWV ataskaita, atnaujinta spalio 21 d., abiem įrenginių tipams sako, kad neužtenka paskutinių 90 dienų duomenų. Tai nėra nei CWV PASS, nei FAIL. Trys PageSpeed API bandymai gavo 429, todėl šiam leidiniui naujo Lighthouse balo nepateikiu.

## Prioritetiniai radiniai ir priėmimo kriterijai

**Patvirtinto P0 indeksavimo blokavimo šiame audite nerasta.** P1 reiškia pirmiausia taisytiną komercinį / sezoninį trūkumą, o ne pažadėtą Google pozicijų pokytį.

### F01 · P1 · Dviejuose gyvuose giduose siūlomas išparduotas padėklas

Įrodymas: `/gidai/kaledines-dovanos-seimai` sako „galima rinktis papildomą apdailą ir padėklą“, o `/gidai/kaledines-dovanos-porai` — „medinį padėklą galima pasirinkti produkto puslapyje“. Tuo metu `/products/isdziovintas-uosinis-padeklas` ir prekės aprašymas nurodo, kad jis išparduotas; konfigūratoriuje jo rinktis negalima.

Veiksmas: native Studio pakeisti šias dvi vietas į tikrą prieinamumą, neištrinant teisingų spalvų pasirinkimų. Patikrinti kitus padėklo paminėjimus visose kalbose. Priėmimas: teksto, produkto UI, schema ir LLM projekcijos faktai sutampa; išlaikomi URL ir publikavimo datos; naujos facts/usefulness peržiūros susietos su tikslia revizija.

### F02 · P1 · Panašios temos ne visada turi pakankamai skirtingą naudą

Įrodymas: perskaitytuose moterų, mamų, vyrų, tėvų, porų ir šeimos giduose kartojasi nedidelis tų pačių albumo, puodelių, knygų kuponų, arbatos, žaidimo ir keramikos dirbtuvių pasiūlymų rinkinys. `/gidai/dovanos-moterims` ir `/gidai/kaledines-dovanos-moterims` ypač artimi. Dalis kitų viešų Kalėdų gidų daugiausia pateikia bendrus klausimus, bet mažai konkrečių palyginamų pasirinkimų. Kartu aštuoni sustiprinti tekstai turi realias kainas ir šaltinius — jų nereikia aklai išmesti.

Veiksmas: kiekvienam URL priskirti atskirą gavėjo sprendimą ir originalią palyginimo priemonę. Evergreen moterų gidas — proga / pomėgis / asmeniškumo lygis; Kalėdų — šventinis scenarijus, bendras biudžetas, paruošimas ir įteikimas. Tėčiui — realūs pomėgiai ir konkrečios alternatyvos; tėvams — dviem žmonėms tenkanti kaina ir logistika. Nepildyti automatiškai iki nustatyto žodžių skaičiaus.

Priėmimas: dviem panašiems URL negalima sukeisti įžangos ir daugumos pasiūlymų neprarandant jų paskirties; kiekvienas turi savą lentelę / pavyzdį / planą. Tikras GSC query→page duomenų pjūvis naudojamas prieš bet kokį suliejimą. Šis radinys yra semantinio persidengimo redakcinis įvertinimas, ne įrodyta algoritminė bauda ar patvirtinta „kanibalizacija“. Automatizuotas identiškų >100 simbolių sakinių tikrinimas nenustatė vieno sakinio, pasikartojančio šešiuose ar daugiau puslapių.

### F03 · P1 · „Paskutinės minutės“ straipsnis suplanuotas per vėlai sezonui

Įrodymas: `/gidai/kaledines-dovanos-paskutine-minute` turi `publishAt=2026-12-21T08:00:00Z`. Jis teisingai dabar 404, bet atsirastų tik prieš pat Kalėdas, be laiko atradimui ir turinio vertinimui. Tekstas kol kas daugiausia bendras, be konkretaus elektroninių kuponų / atsiėmimo / savarankiško paruošimo palyginimo.

Veiksmas: turinį sustiprinti ir perplanuoti į ankstesnę prasmingą vietą, pakeičiant mažiau skubų slotą; išlaikyti savininko 1–2 naujų straipsnių per dieną ribą. Pagal GSC signalus peržiūrėti ir dukros bei jubiliejaus temų laiką. Priėmimas: naujas kalendorius aiškus, nepridėta masinio backlog išleidimo, data neatgalinta, realūs šiandien patikrinami dovanos gavimo būdai nesupainioti su pažadėtu siuntos terminu.

### F04 · P1 · Mažos spalvų miniatiūros parsisiunčia visą raišką

Įrodymas: tikro Chrome produkto įkėlimo metu penki papildomų spalvų vaizdai perdavė **1 561 802 B** kūnų duomenų. Miniatiūra apie 60,67 CSS px pločio naudoja **1122 px** šaltinį. Atskiros spalvos: auksas 323 488 B, grafitas 275 470 B, bronza 315 760 B, antikinė bronza 310 038 B, varis 337 046 B; balta bazė papildomai 81 774 B.

Veiksmas: bendrame katalogo medijos kontrakte turėti mažus tikrus 128/192 px variantus miniatiūroms ir atitinkamą srcset. Visą raišką krauti pagrindiniam pasirinktai spalvai / priartinimui; išlaikyti originalus ir nekintamus versijuotus URL. Priėmimas: šaltame mobiliame bandyme nepasirinktos spalvos nebesiunčiamos 1122 px dydžiu vien miniatiūrai, matyti tas pats vaizdas, pasirinkimas ir priartinimas veikia. Nustatyti vaizdų baitų biudžetą ir išmatuoti prieš / po. Dabartinis radinys įrodo tinklo perteklių, ne išgalvotą blogą Lighthouse balą.

### F05 · P1 · Trūksta pirmųjų rankų produkto įrodymų

Įrodymas: parduodamų rinkinių galerija daugiausia rodo baigtos skulptūros baltą ir spalvotas vizualizacijas; tekste šeimos sudėtis aiškinama pakeliais, bet tikslus tinkamumas rankų kompozicijai nepatvirtintas. Svetainė turi savininko video ir originalius receptų PDF, tačiau dovanų gidai šios išskirtinės medžiagos beveik nepanaudoja.

Veiksmas: produkto puslapyje parodyti tikrą viso komplekto nuotrauką, savininko demonstraciją ir instrukcijos santrauką; sudėti poros / šeimos palyginimą pagal patvirtintus kiekius ir praktines ribas. Paprašyti tik trūkstamų realių matmenų / medžiagų specifikacijos; nesukurti bandymų, sertifikatų, vaikų amžiaus ar rankų skaičiaus. Priėmimas: pirkėjas prieš krepšelį mato, ką gauna ir kaip renkasi; aiškiai atskirti tikri vaizdai ir iliustracijos. Pirmųjų rankų medžiaga dokumentuota ir publikuojama turint teises.

### F06 · P2 · Organizacijos schema turi suderinamumo tobulinimą

Įrodymas: gyvo straipsnio grafe vienas `https://memocasting.lt/#organization` mazgas turi `name=Memory Casting`, `url=/`, o antras to paties ID mazgas — `name=MB Memocasting`, `url=/redakcija`. Tas pats pasitaiko įterptoje Article author/publisher struktūroje. JSON-LD sintaksė tinkama, GSC nenustatė kritinės klaidos; tai ne įrodyta rich-result netinkamumo priežastis.

Veiksmas: supaprastinti vieno juridinio / brandinio subjekto URL ir `name/legalName/alternateName`, o redakcijos profilio ryšį aprašyti aiškiai. Kelios to paties subjekto URL ar vardo reikšmės savaime JSON-LD nedaro negaliojančiu: čia rekomenduojamas aiškumas, ne patvirtintas sintaksės ar autorystės gedimas. Priėmimas: abiejų grafų ryšiai aiškūs, autorystė atitinka matomą MB Memocasting; kelių svetainių regresijos išsaugomos. Tai bendro rendererio semantikos patikslinimas, ne priežastis skubiai keisti visas prekių nuorodas.

### F07 · P2 · Product galima praturtinti tikrais identifikatoriais ir politika

Įrodymas: 32 / 48 € Product Offer yra tikras; esamame grafe nėra SKU/MPN ir aiškaus spalvos varianto ryšio. Tikri MPN `MC-COUPLE-WHITE` / `MC-FAMILY-WHITE` jau registruojami prekybinio feed logikoje. GSC spalio 23 d. prekės kopijoje rodo dvi **pasirenkamas** pastabas: shippingDetails ir hasMerchantReturnPolicy po Offer. Dabartiniame Organization yra merchantReturnLink.

Veiksmas: patvirtintus identifikatorius sujungti su Product ir actual variantais; tikrą grąžinimo politiką palaikyti viename šaltinyje. Organization-level nuorodos forma yra galiojantis Google Option B, jos nelaikyti kritine klaida. Dinaminės pristatymo kainos nepaversti išgalvotu vienodu tarifu; paruošimas 1–2 d. d. nėra bendras gavimo terminas. Priėmimas: aktualus Rich Results / URL Inspection po pakartotinio crawl; nėra išgalvotų EAN, reitingų ar pristatymo pažadų. Kainos ir nuotraukos paieškoje lieka Google pasirinkimas.

### F08 · P2 · Dovanų indeksai per vėlai nuveda į pasirinkimą

Įrodymas: `/dovanos` pirmiausia rodo ilgą bendrų patarimų tekstą, o konkretūs gavėjų ir progų keliai pateikiami žemiau. Nuorodų grafas veikia: problema nėra nerandami gidai, o papildomos pastangos lankytojui.

Veiksmas: viršuje pateikti paprastą pasirinkimą pagal gavėją, progą ir biudžetą su tinkamais esamais URL; įvadą trumpinti iki to, kas padeda rinktis. Straipsnių kontekstinės nuorodos turi vesti į kitą konkrečią užduotį, ne kartoti visą tinklą. Priėmimas: pirmame mobiliame ekrane aiškus kelias į aktualų gidą; būsimi tikslai vis dar filtruojami viena publikavimo projekcija.

### F09 · P2 · Pakavimo ir bendrų poros temų paskirtys turi būti atskirtos

Įrodymas: viešas `/gidai/kalediniu-dovanu-pakavimas` ir būsimas `/gidai/kaip-supakuoti-dovana` aptaria tas pačias dėžutės, cilindro ir trapaus daikto užduotis. `/gidai/dovana-porai`, `/gidai/dovana-vestuviu-metinems` ir `/gidai/ranku-liejimo-rinkinys-ar-paruosta-dovana` skiriasi nominalia proga, bet kartoja panašų trijų formatų pasirinkimą.

Veiksmas: universalų pakavimą palikti tikslia praktine instrukcija su matavimu, nuotraukomis ir klaidomis; Kalėdų gidą skirti kelių žmonių dovanų paruošimo planui ir šventiniam pateikimui. Metinių gidą sutelkti į datą, gavėjų planą ir atminimo turinį; formatų palyginimą — į aiškią rinkinio / gatavo gaminio matricą. Priėmimas: atskiras skaitytojo klausimas ir originalus rezultatas. Jei to nepavyksta pagrįsti ir GSC patvirtina tą pačią užduotį, tik tada suplanuoti vieną same-intent 301.

### F10 · P2 · Nuorodų profilis stipriai koncentruotas viename šaltinyje

Įrodymas: GSC rodo 1 398 išorines nuorodas; 1 308 (**93,6 %**) iš topdovanos.lt, 47 iš info.lt, 8 iš rekvi.lt. Tai nuorodų skaičiai, ne unikalūs nepriklausomi domenai. Šis pjūvis nenustato nuorodų dabartinės vietos, jų apmokėjimo, Google suteikto svorio ar baudos. Pagrindinis susietas tikslas yra homepage.

Veiksmas: vertinti naujus nepriklausomus, realios auditorijos redakcinius paminėjimus — vestuvių vedėjų proceso demonstracijas, kūrybos partnerių patirtis, autentiškus produkto pristatymus. Jei bendradarbiavimas apmokėtas ar rinkinys duotas mainais už reklaminį įrašą, komercinį ryšį atskleisti ir nuorodą tinkamai kvalifikuoti. Nedidinti automatinio sitewide nuorodų skaičiaus kaip atskiro tikslo. Priėmimas: registruojami tikri partneriai, kontekstas, paskirtis ir srautas / pardavimai; ne deklaruojamas DR augimas. Joks outreach šio audito metu nesiųstas.

### F11 · P2 · Našumo ir GEO rezultatai dar neturi pilno matavimo

Įrodymas: CWV duomenų neužtenka, PageSpeed API 429; vienas browser navigation matavimas nėra cold-mobile laboratorija. Tikslaus AI citavimo bazinio pjūvio šiame audite negauta. llms.txt / llms-full.txt veikia, bet jų buvimas neįrodo geresnio matomumo AI atsakymuose.

Veiksmas: po F04 atlikti atkuriamą šaltą mobile laboratorinį matavimą su realia medija ir išsaugotu leidiniu; lauko rodiklius vertinti gavus pakankamą imtį. GEO stiprinti tikromis aiškiomis instrukcijomis, originalia patirtimi ir tiksliais šaltiniais, o reprezentacines AI užklausas fiksuoti kaip laikiną matomumo imtį, ne universalų rangą. Priėmimas: realūs LCP/CLS/INP arba atitinkami lab rodikliai ir ribos; negalima priskirti 90+ balo be matavimo.

### F12 · P2 · Kainų ir prieinamumo šaltiniai turi turėti gyvą peržiūros tvarką

Įrodymas: 26 skirtingi pagrindinio teksto išoriniai adresai: 17 HTTP 200, 4 HTTP 403, 2 HTTP 429, 3 transporto nesėkmės. **Patvirtintų išorinių 404 nerasta.** Ribojimas nėra mirusios nuorodos įrodymas. Konkretūs pasiūlymai daugiausia tikrinti spalio 22 d.; keramikos dirbtuvių 50 € pasiūlymas papildomai patvirtintas pardavėjo puslapyje audito dieną. Iš 69 būsimų LT gidų 65 neturi užregistruotų išorinių šaltinių.

Veiksmas: kiekvieną pateikiamą konkretų kainos / sąlygų teiginį sieti su pardavėjo įrodymu ir data, o prieš sezono piko atnaujinimą patikrinti prieinamumą. Patarimų ar originalaus planavimo lapo nereikia dirbtinai apipinti citatomis. Nuotraukoms naudoti savas teisingai pažymėtas iliustracijas arba leistą tiekėjo medžiagą; svetimas produkto vaizdas nėra laisvas vien todėl, kad yra viešas. Priėmimas: pasikeitus pasiūlymui atnaujinamas atitinkamas tekstas ir tikras dateModified; užblokuotas šaltinis tikrinamas alternatyviu teisėtu būdu arba teiginys aiškiai pažymimas nepatvirtintu.

## Konkretus pirmos stiprinimo partijos planas

Tai rekomendacijų eilė, **ne jau atliktų perrašymų sąrašas**. Skaitomiausių paklausų ir esamos intencijos signalai svarbesni už privalomą „10 dovanų“ kiekį. Atskiro URL kiekvienai long-tail užklausai nereikia.

| Eilė | URL / užduotis | Originalus papildymas ir long-tail vieta |
|---:|---|---|
| 1 | `/gidai/kaledines-dovanos-teciui` | Konkrečių pomėgių × biudžeto matrica; tikri 5–8 pasiūlymai, kam netinka, paruošimo reikalavimai |
| 2 | `/gidai/kaledines-dovanos-tevams` | Bendra dovana prieš dvi individualias; reali suma abiem, vieta, kelionė, papildomos išlaidos |
| 3 | `/gidai/dovanos-moterims` | Atskira evergreen paskirtis; „ypatingos dovanos moterims“ kaip konkretus pasirinkimo scenarijus, ne naujas sinoniminis URL |
| 4 | `/gidai/kaledines-dovanos-moterims` | Kita atranka nei #3: Kalėdų įteikimas, šventiniai poreikiai, paruošimo planas; sumažinti tų pačių prekių kartojimą |
| 5 | `/gidai/kaledines-dovanos-mamai` | Išlaikyti geras 10 idėjų; įdėti trumpą tikrą palyginimą „mažiau daiktų / bendra veikla / pomėgis“ ir konkretesnes alternatyvas |
| 6 | `/gidai/kaledines-dovanos` | Aiškus gavėjo / biudžeto pasirinkimo centras; naudingi trumpi palyginimai ir kryptys į stiprius vaikus, ne visų tekstų dubliavimas |
| 7 | `/gidai/kaledines-dovanos-paskutine-minute` | Patikrinti e. kuponai / atsiėmimas / šiandien paruošiama dovana; ankstesnis slotas pagal F03 |
| 8 | `/gidai/dovanos-jubiliejui` | „Ką dovanoti 50 jubiliejaus proga“ išspręsti tikru pavyzdžiu, grupės biudžetu ir gavėjo sutikimu; ne nauju beveik identišku 50-mečio URL |

Be šios aštuonių tekstų partijos, F01 tikslinės dvi pataisos ir F04 medijos optimizavimas yra atskiri darbai. Kitų 97 temų sprendimai ir peržiūros gylis įrašyti CSV. Gerus Advento kalendoriaus, techninio džiovinimo ir dažymo tekstus išlaikyti; juos prasminga papildyti tikra demonstracija, o ne pradėti nuo nulio.

## Struktūra ir vidinės nuorodos

Siūlomas vaidmenų pasidalijimas:

- Homepage — pagrindinis komercinis „rankų liejimo rinkinys / rinkiniai“ įėjimas. Dabartinis title šią temą aiškiai turi; H1 „Akimirka, kuri lieka“ yra brandinė eilutė. Jos keitimas nėra skubus gedimo taisymas, ypač turint 2,5 vidutinės pozicijos signalą.
- `/ranku-liejimo-rinkiniai` — dviejų produktų palyginimas ir pasirinkimas; produktų URL — konkrečios komplektacijos, vaizdai, faktai ir pirkimas.
- `/dovanos` — gavėjų / progų vartai; `/gidai/kaledines-dovanos` — sezoninis pasirinkimas; konkretūs gavėjų gidai — realus skirtingas sprendimas.
- Instrukcijos — tikras receptas; džiovinimas, dažymas ir pagalba — papildomos skirtingos užduotys su nuoroda į konkretų receptą.
- Gidas → aktualus produktas tik tada, kai jis tinka aprašytam scenarijui; produktas → instrukcija ir atitinkami pagalbos puslapiai. „Naudinga toliau“ nepakeičia tikslaus kontekstinio paaiškinimo.

GSC „patikrinta — neindeksuota“ URL nešalinti vien dėl statuso. Pirmiausia patikrinti konkretaus puslapio indėlį, klaidingus faktus, paskutinį Google crawl ir aktualų request / response. `noindex` ar 301 yra redakcinis sprendimas po vertinimo, ne būdas pagerinti skaičių ataskaitoje.

## GEO ir paieškos pateikimas

Google rekomenduoja tą patį naudingą, originalų ir techniškai pasiekiamą turinį įprastai ir generatyvinei paieškai. Specialus llms.txt, papildomas „AI schema“ ar mechaninis užklausų išskaidymas nesuteikia atskiro reitingavimo pranašumo. Mūsų didžiausias išskirtinumas — tikras gaminamas rinkinys, originalūs receptai, savininko demonstracijos ir dokumentuotos problemų sprendimo patirtys, o ne bendras dovanų tekstų kiekis. [Google AI gairės](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

Siūloma aiški trumpa išvada kiekvieno gido pradžioje, patvirtintos kainos / sąlygos, naudinga palyginimo lentelė ir autentiškos proceso medijos. Nedėti sugalvoto eksperto, atsiliepimo ar „išbandėme“ žymos. Konkreti autorystė MB Memocasting ir AI pagalbos paaiškinimas jau yra.

„Memory Casting“ site name, brand ir canonical jau siunčiami. Google paskutinio crawl kopijoje dar rodoma sena brand reikšmė, nes tikrinta spalio 23 d.; dabartinis live šaltinis jau skiriasi. Turtingų rezultatų kainų, nuotraukų ir galutinio svetainės vardo rodymo garantuoti negalima. Product žymėjimas yra tinkamumo priemonė, ne garantija.

## Kas dar nepatvirtinta ir ko šiuo auditu nedariau

- Visi 187 URL patikrinti techniškai, bet 69 būsimiems tekstams ir 66 lokalizuotiems puslapiams nesuteiktas pilnos gimtakalbio redakcijos / faktų patvirtinimas. Tai aiškiai matoma inventoriaus peržiūros gylio stulpelyje.
- Nevykdytas naujas mokamas SERP / backlinks tyrimas; dabartinis DR nežinomas. GSC nuorodų kiekis nėra DR ir neleidžia apskaičiuoti jo atsigavimo.
- Nėra naujo šalto mobile Lighthouse ir pakankamo field CWV. 429 bandymai ir jų ribos išsaugoti.
- GA4 pirkimo / refund susiejimas anksčiau priimtas atskiru `GA4_ECOMMERCE_2026_10_25.md` procesu; šiame SEO audite nekurtas tikras užsakymas, mokėjimas, siunta ar klientui siunčiamas laiškas. Naujo pajamų priskyrimo rezultato neteikiu.
- Privatumo, serverio saugumo, viso WCAG, atsarginių kopijų atkūrimo ir visų pasaulio naršyklių atitiktis šiuo SEO auditu nesertifikuojama. A–Z registras šias ribas pažymi UNVERIFIED, o ne sugalvotu PASS.
- Straipsnių datos ir gyvas leidinys nepakeisti. Realiems pakeitimams reikia tikslios Studio revizijos peržiūros, paketo eksporto, regresijų, diegimo ir HTTPS priėmimo; vien šis dokumentas nėra pataisa.

## Vykdymo kontrolinis sąrašas

- [x] Patikrinti tikslų source / package / viešų datų pjūvį.
- [x] Nuskaityti visus 187 URL ir nuorodų grafą.
- [x] Patikrinti tikrus GSC našumo, indeksavimo, nuorodų ir produkto rodmenis.
- [x] Individualiai perskaityti visus 28 viešus LT gidus ir pagalbą.
- [x] Sudaryti 97 temų sprendimų bei 187 URL inventoriaus lenteles.
- [x] Išsaugoti mobilius vaizdus, miniatiūrų baitus ir ribotus / nesėkmingus bandymus.
- [x] Parengti naują A–Z registrą, neperrašant istorinio phase-one audito.
- [ ] F01: pataisyti netikrą padėklo pasirinkimą dviejuose giduose ir patikrinti projekcijas.
- [ ] F02/F09: atskirti persidengiančių temų paskirtį ir sustiprinti pirmąją tekstų partiją.
- [ ] F03: priimti atnaujintą sezoninį kalendorių, išlaikant 1–2/d. ribą.
- [ ] F04: mažinti nepasirinktų spalvų miniatiūrų baitus, išmatuoti prieš / po.
- [ ] F05: pridėti tikrą komplektaciją ir pirmųjų rankų proceso įrodymus.
- [ ] F06/F07: praturtinti ir suvienodinti entity / Product duomenis, jų neišgalvojant.
- [ ] F08: supaprastinti dovanų indeksų pasirinkimą.
- [ ] F10: auginti nepriklausomus kontekstinius paminėjimus, vertinti realią naudą.
- [ ] F11/F12: pakartoti našumo matavimą ir faktų / pasiūlymų peržiūrą prieš sezono piką.

## Įrodymų vieta ir pirminiai šaltiniai

Privatūs raw rezultatai saugomi `sites/memocasting/qa/deep-audit-20261025/` (Git ignore). `crawl.private.json` ir `html/*.html.gz` fiksuoja atsakymų hash, metaduomenis ir tekstus; `inventory.private.json` — tikslų paketą; `analysis.private.json`, `probes.private.json`, `supplemental.private.json` — nuorodų, failų, robots / sitemap ir kalbų patikras. GSC failai turi `gsc-*.private.txt` prefiksą. `product-browser-media.private.json` ir `product-390.private.png`, `guide-390.private.png`, `guide-320.private.png` — tikri naršyklės įrodymai. Nevieši GSC duomenys nepublikuojami svetainėje.

Audito vertinimo šaltiniai, peržiūrėti 2026-10-25:

- [Google: naudingas turinys ir originali vertė; nėra pageidaujamo žodžių skaičiaus](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).
- [Google: generatyvinės paieškos optimizavimas](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).
- [Google: Product / merchant listing](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing).
- [Google: Organization grąžinimo politika, įskaitant merchantReturnLink pasirinkimą](https://developers.google.com/search/docs/appearance/structured-data/return-policy).
- [Google: site name](https://developers.google.com/search/docs/appearance/site-names).
- [Google: nuorodų ir masinio turinio taisyklės](https://developers.google.com/search/docs/essentials/spam-policies).
- Pasiūlymo pakartotinio tikrinimo pavyzdys: [keramikos dirbtuvės dviem, pardavėjo sąlygos](https://www.geradovana.lt/tapybos-ant-keramikos-dirbtuves-dviem-kurybos-laisve).

Papildomi audito failai:

- [187 URL registras](DEEP_SEO_GEO_AUDIT_2026_10_25_URLS.csv).
- [97 LT straipsnių individualūs sprendimai ir peržiūros gylis](DEEP_SEO_GEO_AUDIT_2026_10_25_ARTICLES.csv).
- [85 A–Z kriterijų įrodymų aprėptis](DEEP_SEO_GEO_AUDIT_2026_10_25_CHECKLIST.md); [pilnas JSON](DEEP_SEO_GEO_AUDIT_2026_10_25.json).

Scorer sėkmingai patikrino visų 85 kriterijų buvimą ir įrodymų formatą. Jo platus local / launch / operations įrodymų aprėpties balas nėra SEO svetainės vertinimas: šiame diagnostiniame darbe daug komercijos, pašto, teisės ir atkūrimo vartų iš naujo nebandyta, todėl jie sąžiningai UNVERIFIED. Nauji dokumentai papildomai sutikrinti su paketo hash, 187/97 unikaliu inventoriu, visomis straipsnių revizijomis bei datomis. Pakeitimų kode nėra, todėl regresijų skaičius iš ankstesnio diegimo nepateikiamas kaip šio dokumentų audito naujas bandymas.

Auditas baigtas kaip diagnostika. Patvirtintos ir rekomenduojamos pataisos lieka aiškiai nepažymėtos kaip įgyvendintos; 10/10, garantuoto srauto ar visos sistemos operacinio priėmimo teiginio nėra.
