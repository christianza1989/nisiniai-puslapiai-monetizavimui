# Auksarankiams — smulkių namų darbų poreikio kelias

2026-10-01. BUSINESS.md atliktas prieš šį naujos krypties darbą. Mode: homepage/service Persuade, gids Read, contact Operate. Code-led. Pagrindą išsaugo esamas rendereris, bet ankstesnė rankdarbių vizualinė tapatybė pakeičiama. Agentas pasirinko, savininko dizaino/teksto approval neimituojamas.

## Sprendimas prieš production kodą

`CONCEPT-SEED-PIVOT.txt` seed d375fdd3, priskirtas 5 variantas iš iš anksto užfiksuotų septynių: proceso kelias. Jį interpretuojame per realų dabartinį procesą — surašyti darbus, pažymėti neaiškumus, registruoti poreikį. Jokio fiktyvaus „vienos dienos vizito“ ar rezervavimo. Trijų HTML kompozicijų tikros 1440/390 PNG išsaugotos `studies-handyman/` ir visos peržiūrėtos.

A pasirinkta: didelė dviejų sakinių antraštė, paaiškinimas ir tikras veiksmas, po jais trijų parengimo veiksmų atvira eilė, tada plataus formato laukiančių daiktų vaizdas. Ji geriausiai paaiškina produktą ir skiria poreikio registraciją nuo meistro pažado. B konkurencinga: įprastas split hero greičiau parodo daiktus, bet aukšta dešinė foto ir mažesnis teksto plotis silpnina sąrašo idėją. C atmesta: pradžioje didelė foto, mobiles veiksmas nusileidžia žemiau; pirmą ekraną užima interjeras, ne konkreti registracija.

Seed challenger sprendimai dviem ašimis — auditorijos atpažinimas ir produkto aiškumas: jacquard declined (turinio/įrašo atsekamumo disciplina sustiprina esamą studio kelią); plankton declined (aiški ramybės/veiksmo būsena, be dalelių dekoracijos); seven-segment declined (nuoseklūs kiekio/laiko paaiškinimai, be LED kostiumo); algorave declined (prieš siuntimą matomos instrukcijos, be kodo/muzikos); Japanese density competitive produkto skenavimui, pralaimi skaitymo komfortą (aiškios atviros darbų eilės, ne smulkių modulių mozaika); generative identity declined (vienodas spalvų ir fokusavimo kontraktas, be atsitiktinio restyling). Nė vienas nelėmė fiktyvių faktų ar reikalavimo kurti naują technologiją.

## Sistema

Šilta matinė #f4efe5, rašalas #292b26, antrinis #575b50, linija #bcbcaf, tvirtas veiksmo akcentas #a94724 su balta. Nepainioti su seno rankdarbių žalio leidinio palete. Bricolage Grotesque 500–700 vietinis SIL OFL display, system-ui tekstas. Body 17–18 px, 1,65; util tekstas bent16 px. H1 fluid iki78 px; guides mažesnis iki64 px ir skaitymui tinkamas plotis. Lithuanian diacritics tikrinami browseriu.

1200 px turinio riba, 40 px desktop kraštai /20 px narrow. Homepage turi skirtingą ritmą: tezė ir veiksmas, parengimo seka, plati iliustracija, trys atviros paslaugų eilės, ramus apimties ribų tekstas, tik trijų gidų miniatiūros, tamsus baigiamasis tikras veiksmas. Nei testimonials, nei metrikų skaičiai, nei „patikrintų meistrų“ badges nenaudojami.

Guide: breadcrumbs, viena antraštė, realios organizacijos byline/datos, teminis vaizdas, native details turinys, teksto stulpelis ir šaltiniai. Form: didelis žinutės laukas su visada matoma darbų/vietos/apimties/laiko pagalba. Esamas backend ir schema; nėra neįgyvendinto upload ar kainos skaičiuotuvo. Native details meniu ir contents; aiškus outline, reduced-motion išlaiko viską matomą. Footer tikri vieši ID, kontaktas ir savininko attribution.

Kompromisas: A mobiliai nuotrauka pasirodo po registracijos paaiškinimo ir proceso. Pirmajame ekrane pirmenybė aiškiam veiksmui ir jo riboms. Nebandoma atrodyti kaip jau veikianti marketplace. Vaizdai iliustraciniai; instrukcijų/matuoklio detalės nėra techninės schemos ar matmenų šaltinis. Skaitymo bei legal puslapiams papildoma dekoratyvi nuotrauka reikšmės neprideda; išimtis bus audite.

Production rezultatai žemiau. Lighthouse ir detektorius neįrodo originalumo, ekonomikos ar konversijos.

## Production priėmimas

2026-10-01T05:10:43.194Z. Nuosekli vieno agento realių ekranų peržiūra prieš detektorių: pilnas1440 homepage ir gidai, 390 visų trijų gidų openings/index, home middle/end, ilgiausio body/sources, kontaktų forma/footer; 320 ir768; 200 % browser zoom. Evidence qa/; reikšmingas savitumas — laukiančių namų darbų daiktai, atvira trijų veiksmų seka ir trys poreikių eilės vietoj veikiančios marketplace rekvizito. Homepage seka keičia ritmą nuo užduoties iki ribų, pasiruošimo ir veiksmo; gidas aiškiai yra skaitymas, forma — Operate.

Verdiktas: nuosekli, aiški nišai tinkama tapatybė ir patogus kelias. Tai agento vertinimas, ne nepriklausomas dizaino/koversijos įrodymas. 768 px headline sąmoningai keturių eilučių, vis dar gerai subalansuotas su ribomis/veiksmu. Mobiliai proceso pirmumas nukelia foto; atviras ToC užima dalį pirmo scroll, bet leidžia rinktis konkrečią dalį. Bendras core formos server-error/success turi ramų bendrą stilių — aiški žinutė/realus grįžimas, ne papildoma nišos CSS kopija.

Detektorius po vizualios peržiūros: DETECTOR-HANDYMAN.json [], jokia repository-wide DESIGN paletė netaikyta (--no-design-system), aktyvūs tokenai patikrinti atskirai. Browser overlay/delegated reviewers neimituojami. CSS linter nėra pateikiamas kaip PASS: ESLint taikytas TSX, CSS atskirai detector/browser. Papildomos pataisos buvo įrodyti schema ir capture defektai, ne estetinio seed reroll. Galutinis mobile Lighthouse96/92; A11y/SEO100, bet gido LCP3,17 s ir CPU įspėjimas išlieka dokumentacijoje.
