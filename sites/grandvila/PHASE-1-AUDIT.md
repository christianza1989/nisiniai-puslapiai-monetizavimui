# Grand Vila svetainės auditas ir modernizavimo išvada

2026-10-14. Audituota esama [grandvila.lt](https://grandvila.lt/) svetainė. Savininkas pasirinko **dabar tik auditą ir konkretų atnaujinimo planą**. Visi darbai buvo vieši ir tik skaitantys: nauja svetainė, WordPress pakeitimai, DNS, pašto siuntimas ir agentų runtime nevykdyti.

Rekomenduoju visą svetainės pateikimą perkurti bendrame core, išsaugant URL, tekstus ir autentišką fotografiją. Dabartinis turinys turi komercinę vertę – erdvės, nakvynė, maitinimas, šefo profilis ir pramogos – tačiau temos ir sliderio techninis pagrindas yra sunkus, semantika nenuosekli, o kontaktų ir privatumo kelias turi aiškių trūkumų. Vien nuotraukų suspaudimo neužteks visiems nustatytiems radiniams.

## Apimtis ir išsaugojimas

| Patikrinta | Rezultatas |
|---|---|
| Robots ir sitemap | Robots 200, sitemap_index bei 4 jo XML failai 200. Sitemap: **51 URL**. |
| Visas aktyvus crawl | **53 HTML puslapiai**, iš jų 51 sitemap ir 2 papildomi archyvo URL; visi HTTP 200. Kiekvienam saugomi tikri HTML, tekstas, metadata, nuorodos, antraštės, schema ir SHA-256. |
| Medijos biblioteka | **1 682** vieši WordPress vaizdų įrašai; **2 412** skirtingų source_url ir original_image adresų. |
| Originalų archyvas | **2 399** originalų adresai atsisiųsti, **13** grąžino 404. Originalų dydis apie **6,53 GB**. Papildomai išsaugotos svetainėje naudojamos miniatiūros, CSS/JS ir 3 išoriniai „Vilos Pasaka“ patalpų planai. |
| Vientisumas | 3 953 atsisiųsti resursų failai, apie 6,72 GB, ir visų 53 puslapių HTML/teksto SHA patikrinti; **0 neatitikimų**. Atskirai papildyta ir patikrinta viena anksčiau neatsisiuntusi miniatiūra. |
| Domeno istorija | Canonical helper: 80 istorinių URL, 2 skaitomi snapshot; dalinis indeksas. 2019 ir 2026 mėginiai rodo tos pačios nišos tęstinumą. Seni EN mėginių URL dabar 404. |
| Lighthouse | 7 matavimai su realia produkcine svetaine: homepage desktop, 2 mobile bandymai ir 4 vidinių puslapių šeimos. |
| Vizualinė patikra | Homepage desktop/mobile, mobile meniu, kontaktai ir paslaugos tekstas 390/320 px; pilnos galerijų, tablet, keyboard ir 200 % didinimo patikros ribos aiškiai pažymėtos. |

Visi dabartinio sitemap adresai numatyti **tokie patys** naujoje versijoje. [Pilnas URL registras](URL-INVENTORIUS.md) ir [mašininis atitikmenų registras](URL-INVENTORIUS.json). Atsisiuntimas nėra teisės viešai perpublikuoti visas bibliotekos fotografijas įrodymas; originalūs šaltiniai ir istorija paliekami privačiai.

## Lighthouse rezultatai

| Puslapis | Profilis | Našumas | Prieinamumas | Gerosios praktikos | SEO |
|---|---|---:|---:|---:|---:|
| Pagrindinis | Mobile, du bandymai | **21 / 21** | 80 / 80 | 100 / 100 | 85 / 85 |
| Pagrindinis | Desktop | **65** | 87 | 100 | 85 |
| Pokylių salės galerija | Mobile | **16** | 87 | 100 | 92 |
| Pokylių salės paslauga | Mobile | **18** | 87 | 100 | 92 |
| Kontaktai | Mobile | **35** | 92 | 100 | 92 |
| Pramogos | Mobile | **16** | 87 | 96 | 92 |

Pakartotinis homepage mobile rezultatas išliko 21 baigus bibliotekos atsisiuntimą. Pirmajame bandyme puslapis perdavė apie 22 MB, simulated LCP 62,0 s; pakartotiniame – 60,0 s. Vidinių puslapių simulated LCP 5,1–18,8 s; galerijos, paslaugos ir pramogų CLS apie 0,27–0,29. Taigi reikia spręsti ir JS, stilių, šriftų bei išdėstymo pokyčių priežastis.

Matavimo aplinka ir visi 7 report: [LIGHTHOUSE.md](LIGHTHOUSE.md), [JSON](LIGHTHOUSE-REZULTATAI.json). Tai laboratoriniai rezultatai. GSC, CrUX ir realių lankytojų INP šioje sesijoje neprijungti. Lighthouse SEO 100 savaime nepatikrina visų verslo faktų, kalbos ir schema ryšių. [Chrome balų paaiškinimas](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring).

## Prioritetiniai radiniai

| ID ir prioritetas | Problema ir poveikis | Konkretus taisymas | Priėmimo įrodymas |
|---|---|---|---|
| G01 · P1 | Visos pagrindinės šeimos lėtos; homepage 21, kitos 16–35. Temos JS/CSS, 18 šrifto užklausų, Revolution Slider ir dideli vaizdai. | Mažas serverio generuojamas HTML, viena pagrindinė fotografija, pagal poreikį kraunama galerija, žemėlapis ir video, tik naudojami fontai; bendras responsive importas. | Tikro turinio production build LH ir metrikos kiekvienai šeimai; turinys/vaizdai neišmesti dėl balo. |
| G02 · P1 | Homepage turi klaidingą papildomą nulį `tel:`. | Vienas patvirtintas telefono source visai svetainei. | Visible/text/tel/schema/form/export lygybė. |
| G03 · P1 | Schema sameAs apjungia „Vila Pasaka“ FB ir kitą YouTube kanalą. | Tikra Grand Vila entity, atskiri gretimų vilų ryšiai. | JSON-LD ir matomų kontaktų/profilių palyginimas. |
| G04 · P1 | 52/53 be meta description, visi `en-GB`, 19 H1 problemų, 6 title dubliavimo grupės. | URL paskirtį atitinkantys title/description, `lt`, vienas H1 ir H2/H3 tvarka. | Visų 53 URL HTML crawl, source ir rendered patikra. |
| G05 · P1 | Kontrasto, unnamed links, ARIA-hidden focus, heading ir alt trūkumai. | Sutvarkyti tikrus komponentus bei tekstų sistemą; matomas mobile logo, labels ir focus. | Keyboard, contrast, lightbox/menu, 320 ir tikras 200 % zoom; LH A11y papildomai. |
| G06 · P1 | Formos laukai neturi label, email yra text, required false; nėra privacy kelio. | Proporcinga tikra užklausos forma su serverine validation, durable record, privacy paaiškinimu ir gavimo bandymu. | Native/server error, DB išlikimas ir atskiras matching INBOX receipt. Šiuo auditu laiškai nesiųsti. |
| G07 · P1 | Naujas LH bandymas be sutikimo veiksmų krauna GTM, Meta fbevents ir facebook.com/tr; public peržiūroje privacy/consent kelias neaptiktas. | Peržiūrėti faktinius matavimo tikslus ir nustatymus; pasirinkti reikalingą consent/default-off matavimą bei atitinkamą viešą informaciją. | Nauja naršyklės sesija prieš pasirinkimą ir po jo ir tikrų tinklo užklausų ir saugomų duomenų inventorius. Nevadinti vien skriptų trynimo teisine sertifikacija. |
| G08 · P1 | Bibliotekoje 13 dingusių originalų. Vienas su miniatiūra matomai siejamas su pramogų galerija. | Atkurti tikrus trūkstamus failus iš savininko kopijos arba suderinti pakaitalą; archyvo 404 nesislepia. | Kiekvieno URL vaizdų atitikmenų registras; visi publikuojami variantai tikri 200. |
| G09 · P1 migracijai | Dabartiniai slash URL, seni XML adresai, 121 galerijos nuotrauka ir wp-content media URL nepriimami prielaida „core jau viską moka“. | Ankstyvas shared lossless bandymas ir suderinti helper/schema/adapter pakeitimai. | Tikras HTTP, visų blokų ir vaizdų atitikmenų registras, negative publication/host bandymai. |
| G10 · P2 | Sitemap turi Hello world, Uncategorized, tuščius hub ir portfolio; `kartu-varzybos-2` dubliuoja temą. | Visus adresus išsaugoti pagal nurodymą; prieš semantinę konsolidaciją aiškiai sutarti redakcinį sprendimą. | Nė vieno slapta išimto URL; išspręstas sitemap/SEO konflikto pasirinkimas. |
| G11 · P2 | 5 URL neturi įeinančios nuorodos iš kito nuskaityto puslapio; 7 #comments vietos be taikinio. | Prasminga paslaugų, pramogų, planų ir galerijų navigacija; ištaisyti nenaudingus fragmentus. | Pilnas vidinių nuorodų/fragmentų crawl. |
| G12 · P1 turiniui | SPA ir kai kurios pramogos priklauso nuo gretimos vilos nuomos; tekstuose universalūs sveikatinimo ir saugumo pažadai. | Išsaugoti sąlygas ir faktus, atlikti redakcinę peržiūrą; neišgalvoti dabartinio pajėgumo. | Claims ledger, viso teksto saviredakcija ir patvirtinta revizija. |
| G13 · P2 | 2021 išskirtinumo ir apdovanojimo teiginiai skamba kaip aktualūs; organizacijos/datos ne visur matomos. | Patikrintas faktų, profilių ir datų šaltinis; neperrašyti istorinių datų audito data. | Matomas tekstas ir schema turi tą pačią reikšmę. |
| G14 · P2 | Tekstas 14/28 px lygiuotas abipusiai; kontaktų pradžia tuščia, mobile ženklas nematomas. | Savitas vilos dizainas, kairinis lygiavimas, aiški tekstų hierarchija ir kompaktiškas kontaktų kelias. | Tikri desktop/mobile middle/footer ir ilgo teksto vaizdai. |
| G15 · P2 core integracijai | llms failai 404; realus AI citavimas nepatikrintas. | Bendros projekcijos tekstinės išvestys ir tikras domeno matavimas. | HTML/LLM faktų bei publikavimo sutapimas; tikri AI paieškų mėginiai tik su atskiru biudžetu. |
| G16 · P2 operacijoms | GSC/GA4/qualified leads/admin/backup įrodymų nėra šioje sesijoje. | Prieš launch rinkti tikrus domeno duomenis prieš pakeitimus, duomenų ir pašto runbook, backup/restore bei rollback. | Teisingas domenas ir realūs įrodymai, ne sintetiniai paklausos skaičiai. |

Nėra patvirtintos kritinės sistemos pažeidžiamumo diagnozės. Viešai matomos plugin versijų žymos ir temų amžius nėra CVE ar įsilaužimo įrodymas. Auditui naudotas GET, ne saugumo exploit ar admin prieiga. Dalis saugumo antraštės nepateiktos atsakymuose, tačiau jų tinkamumą reikia nustatyti kartu su esamu hostingu, išoriniais embed ir operacijomis.

## Dizainas ir išsaugotina vertė

Tikros nuotraukos, erdvių įvairovė, maitinimo ir šefo puslapiai yra stiprus turinio pagrindas. Kryptis – šviesi, rami vilos sistema su autentiška fotografija ir aiškiais renginio pasirinkimo keliais. Išlaikyti ženklą, visą turinį ir visas galerijas, tačiau leisti naują kompoziciją, tekstų hierarchiją ir greitesnius komponentus.

Mobilios peržiūros įrodymai rodo nematomą baltą logo, didelį kontaktų pradžios tarpą ir abipusio lygiavimo teksto tarpus. Meniu atsidaro, paslaugos 320 px peržiūroje horizontalus overflow neaptiktas. Tai tik konkrečios būsenos įrodymas; negalima jo išplėsti visai svetainei.

Vietiniam palyginimui skaityti [Daukšiagirės dvaras](https://dauksiagiresdvaras.lt/) ir [Romaškių sodyba](https://www.romaskiusodyba.lt/), tarptautiniam – [Hedsor House](https://www.hedsor.com/). Pritaikytinos struktūros: atskiri vestuvių ir įmonių renginių keliai, erdvių/kambarių peržiūra, tikras kontaktas ir aiškus užklausos veiksmas. Kitų verslų kainos, privalumai, teksto ir fotografijos neperkeliami į Grand Vila. Šių analogų viso desktop/mobile vizualinio įgyvendinimo ši sesija nepriėmė: browser challenge ir CDP connection timeout ribos paliktos UNVERIFIED. Naujo maketo pasirinkimas remsis būsimomis tikromis kompozicijų peržiūromis, ne vien šiais tekstiniais pavyzdžiais.

## SEO ir GEO išvada

Techninė kryptis aiški: korektiški išsaugoti URL, lietuviška semantika, tikri metadata ir breadcrumbs, sutampantys organizacijos faktai, visos prieinamos nuotraukos bei vidinės nuorodos. Gera schemas ir `llms.txt` tvarka padeda pateikti teisingus faktus, tačiau nėra paieškos pozicijų ar AI citavimo pažadas. [Google AI gairės](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

Pilna temų, faktų ir matavimo analizė: [SEO-GEO.md](SEO-GEO.md). Esamo turinio kalbos klaidos ir sąlygų išsaugojimas turi atskirą naujos revizijos vartą. Kainos, užimtumas, teisinis operatorius, licencijos ir susijusių vilų pajėgumas nebus automatiškai perimami iš senų tekstų kaip naujai patvirtinti faktai.

## Įgyvendinimo planas

[ATNAUJINIMO-PLANAS.md](ATNAUJINIMO-PLANAS.md) apima pilną puslapių sistemą, tipografiją, vaizdų ir funkcijų išsaugojimą, performance biudžetus, priėmimą ir diegimo/rollback tvarką. [CORE-SUDERINAMUMAS.md](CORE-SUDERINAMUMAS.md) įvardija konkrečius bendro core pritaikymus, kuriuos reikia įrodyti prieš masinį importą.

Pirmasis įgyvendinimo bandymas turi apimti homepage, didžiausią galeriją, kontaktų POST, datinį URL ir seną vaizdo adresą. Tik įrodžius lossless kelią pereiti prie visų 53 puslapių. Nauja vietinė versija šiame audit-only pavedime nekurta. Publikavimas ir domeno perjungimas lieka atskiras patikrinto release veiksmas.

## Patikrų ribos ir išlaidos

Neprijungti GSC/GA4 property duomenys, realūs field CWV, operatoriaus admin/DB/inbox/backup ir svetainės nuosavybės įrodymai. Tikra 200 % zoom, tablet, pilna keyboard/lightbox ir visų 53 puslapių vizualinė peržiūra neįrodytos. Tai matomi UNVERIFIED vartai, o ne PASS dėl šaltinio ar Lighthouse.

Mokamų Treg calls ir charges: **0 / 0 USD**. Katalogas ir prieiga peržiūrėti, mokami duomenys nepirkti. Privačių kontaktų/DB/credentials į šaltinių paketą nėra. Originalių nuotraukų archyvas ir raw HTML lieka vietiniame ignoruojamame `artifacts/`; jų GitHub PR nekels. Naujos svetainės formų, SEO/core ir publikavimo regression nevykdyti, nes naujas kodas ir release nekurti.

Auditą galima laikyti pateiktu kaip esamos būklės tyrimą ir planą. **Naujos svetainės local-ready/domain-ready/100 Lighthouse/top pozicijų priėmimo nėra.** Toliau pateikiamas visas core A–Z baseline registras.

## A–Z įrodymų registras

Bendro core pasirengimo kriterijų baseline esamai WordPress svetainei. Tai nėra naujai pastatytos svetainės priėmimas ar verslo patikimumo reitingas. FAIL reiškia pastebėtą neatitikimą; UNVERIFIED – neįrodytą patikrą; NA turi konkrečią šios užduoties apimties priežastį.

| ID | Būsena | Etapas | Įrodymas ir išvada |
|---|---|---|---|
| A1 | NA | local | Audituojamas esamas švenčių verslas; naujo F1 paklausos testo ši užduotis nekuria. |
| A2 | UNVERIFIED | local | Pasiūlymas ir kontaktai vieši, bet realus formos pristatymas ir šio verslo pajėgumas nebandyti. |
| A3 | UNVERIFIED | operations | Kvalifikuotų užklausų, pajamų ir plėtros duomenys nepateikti. |
| B1 | FAIL | local | Homepage tel:+370645422220 skiriasi nuo kontaktų ir poraštės tel:+37064542222. |
| B2 | UNVERIFIED | local | Nefabrikuota tapatybė, tačiau nuotraukų, susijusių vilų atsiliepimų ir apdovanojimų aktualumo teisės dar nepatvirtintos. |
| B3 | UNVERIFIED | launch | Teisinis operatorius ir savininko domeno kontrolė viešu GET neįrodomi. |
| C1 | PASS | local | Canonical history helper: 80 URL, 2 skaitomi snapshot, dalinis istorijos indeksas aiškiai pažymėtas. |
| C2 | PASS | local | Visiems 53 aktyviems adresams tikslus adreso išsaugojimo registras; istoriniams EN URL atskira defer/404 peržiūra. |
| C3 | PASS | launch | HTTP ir www bei slashless paslaugos URL grąžina vieną 301 į patikrintą HTTPS slash 200. |
| D1 | UNVERIFIED | local | Analogų turinio palyginimas atliktas, bet pilnas abiejų rinkų desktop/mobile dizaino palyginimas ir būsimas maketas dar nepriimti. |
| D2 | UNVERIFIED | local | Esami tekstai ir vieša biblioteka archyvuoti; naudojimo teisės bei visos paslaugų sąlygos laukia patvirtinimo. |
| D3 | PASS | local | Plane paieškos ketinimai atskirti nuo nepasiekiamų GSC/GA ir paklausos skaičių. |
| E1 | FAIL | local | Homepage slideris, blank white mobile logo, kontaktų tuščias tarpas ir paslaugų skaitymas nesudaro priimtos naujos sistemos. |
| E2 | FAIL | local | Dabartinė svetainė neturi priimto šios svetainės DESIGN; šiame etape parengta tik specifikacija. |
| E3 | UNVERIFIED | local | Viešų vaizdų kilmė užfiksuota, licencijos ir atsiliepimų/klientų nuotraukų teisės neįrodomos viešu parsisiuntimu. |
| F1 | FAIL | local | 5 adresams crawl rinkinyje nerasta įeinančios nuorodos iš kito puslapio. |
| F2 | UNVERIFIED | local | Homepage mobile meniu atsidaro, tačiau visų submenu/lightbox/keyboard veikimas neįrodytas. |
| F3 | FAIL | local | Hello world/uncategorized/portfolio šablono adresai ir kartų varžybų -2 dubliuojanti tema. |
| G1 | FAIL | local | Kintantis sliderio pirmas ekranas ir nematomas mobile logo; CTA Rezervuoti veda į bendrą kontaktų puslapį. |
| G2 | PASS | local | Homepage turi atskirą erdvių, maitinimo, nakvynės, pramogų ir vietos informaciją; išsaugotinos skirtingos temos. |
| G3 | FAIL | local | Nėra formos privatumo kelio; serverinės error/success būsenos nepriimtos. |
| H1 | NA | local | Tai esamo verslo migracijos auditas; naujų trijų gidų leidimas neužsakytas. Visi esami URL įtraukti į registrą. |
| H2 | FAIL | local | Pramogų tekste yra nepagrįstų universalių sveikatinimo ir visiško saugumo teiginių; paslaugų vietos sąlygos turi būti išsaugotos. |
| H3 | UNVERIFIED | local | Pilna aktyvių tekstų inventorizacija nėra naujos redakcinės revizijos priėmimas. |
| H4 | UNVERIFIED | local | Paslaugos skaitymas telefone peržiūrėtas; visų galutinių būsimų ilgų tekstų rendererio dar nėra. |
| H5 | FAIL | local | Pramogų galerijos vienas originalas ir miniatiūra pakartotinai 404; generiniai Image alt ir placeholder šeimos. |
| I1 | PASS | local | Grand Vila brand/organizacija bei tikras šefo profilis viešai identifikuoti, fiktyvus autorius nepridėtas. |
| I2 | FAIL | local | Organization sameAs turi Vila Pasaka FB ir kitą YouTube kanalą nei matoma poraštėje. |
| I3 | FAIL | local | Schemose datos ir en-GB; daugelyje puslapių nėra matomų atitinkamos reikšmės datų. |
| I4 | UNVERIFIED | launch | 2017-02-14 schema data nėra patikrinta tikro pirmojo Grand Vila leidimo data; archyvas rodo tik mėginius. |
| J1 | FAIL | local | Nerasta prieinamos redakcinės/taisymų informacijos ar privatumo metodo; apie mus yra verslo istorija. |
| J2 | NA | local | Nauja review/approved revizija šiame report-only etape nekurta; auditą atliko vienas agentas, nepriklausoma peržiūra neimituota. |
| J3 | UNVERIFIED | local | WordPress turinio atnaujinimo procesas ir būsimas studio exact-revision dar nebandyti. |
| K1 | FAIL | local | 52/53 be description; visi en-GB; 19 puslapių H1 !=1; 1 archyvas be canonical. |
| K2 | FAIL | local | 6 duplicate title grupės, generic alt, heading-order ir logo kontrasto trūkumai. |
| K3 | PASS | local | Unikalus neegzistuojantis kelias HTTP 404; EN istorijos mėginiai taip pat 404. |
| L1 | UNVERIFIED | local | Yoast JSON-LD parses, tačiau entity social/date/language semantika neatitinka viso matomo turinio. |
| L2 | FAIL | local | Schema breadcrumb vardas Home visur; paslaugos matomame rendererio vaizde breadcrumb nerastas. |
| L3 | UNVERIFIED | local | Išgalvota schema nepridėta; esamų sertifikatų, atsiliepimų ir Person teiginių faktinės teisės nepriimtos. |
| L4 | UNVERIFIED | launch | GSC URL Inspection ir oficialus Rich Results vertinimas neatlikti. |
| M1 | FAIL | local | 7 #comments nuorodų vietos neturi taikinio id; 5 silpnai susieti URL. |
| M2 | UNVERIFIED | local | Esamo WordPress draft/date/revocation link filter prieiga nepatikrinta. |
| M3 | FAIL | local | Tušti Paslaugos/Naujienos ir dubliuojantys pramogų puslapiai turi IA kliūčių. |
| N1 | FAIL | local | Sveikatinimo, saugumo ir vienintelės sodybos teiginiams nerasta susietų aktualių pirminių šaltinių puslapiuose. |
| N2 | UNVERIFIED | local | Vilaitė/Pasaka/Fotopramoga/Dilano knyga sąsajos išsaugotos; jų nuosavybė ir publikavimo tinkamumas nepatvirtinti. |
| N3 | UNVERIFIED | local | Prose ir navigacijos nuorodos inventorizuotos, visų trečiųjų šalių galutinių tikslų nebandyta. |
| N4 | UNVERIFIED | launch | Socialinių profilių paskyrų ir visų išorinių tikslų kontrolė nepatvirtinta. |
| O1 | PASS | local | 51 sitemap 200 su self canonical; baziniai 301 ir slash patikrinti, vienas papildomas archive canonical trūkumas pažymėtas K1. |
| O2 | FAIL | local | Sitemap laiko Hello world/uncategorized/portfolio ir tuščius hub; semantinio tinkamumo vartas neįvykdytas. |
| O3 | UNVERIFIED | launch | HTTPS/DNS viešai veikia, bet savininko control, būsimo core domain isolation ir indeksavimas nepriimti. |
| P1 | UNVERIFIED | local | Esamas WordPress nėra importuotas į bendrą core; vieno approval predicate įrodymai nepasiekiami. |
| P2 | UNVERIFIED | local | Draft/hash/date/revocation/cross-host bandymai naujam adapteriui neatlikti. |
| P3 | UNVERIFIED | local | Grand Vila package import/compile neįvyko šiame audite. |
| Q1 | FAIL | local | llms.txt ir llms-full.txt HTTP 404 – trūksta core papildomų skaitymo išvesčių. |
| Q2 | FAIL | local | Svarbios paslaugų sąlygos fragmentuotos; universalūs sveikatinimo teiginiai be šaltinių, planų paaiškinimai raster-only. |
| Q3 | PASS | local | Ataskaita ir planas nevadina llms.txt Google reikalavimu ar citavimo/reitingo garantija. |
| R1 | FAIL | local | Kontaktų laukai be labels, unnamed mobile menu ir Lighthouse unnamed links/ARIA radiniai. |
| R2 | FAIL | local | Lighthouse kontrastas 2,4:1 ir 3,69:1, menu 32×36; tikras 200% didinimas papildomai UNVERIFIED. |
| R3 | FAIL | local | H1 hierarchy/ARIA-hidden focus/image-alt radiniai; native form type/required nepateikti. |
| S1 | UNVERIFIED | local | Home ir paslauga desktop/mobile bei paslaugos 320 peržiūrėti; tablet/visų galerijų vizualinė patikra neužbaigta. |
| S2 | FAIL | local | Justified 14px/28px tekstas telefone su dideliais tarpais; white mobile logo/tuščia kontaktų pradžia; zoom nežinomas. |
| S3 | PASS | local | Įrodymai pažymėti kaip emuliuotas viewport; nevadinami fizinio telefono ar tikro enlargement bandymu. |
| T1 | FAIL | local | Homepage pirmas mobile 21 ir desktop 65, tikri vaizdai, LH13.5; papildomi bandymai LIGHTHOUSE rezultate. |
| T2 | PASS | local | Konkrečios išmatuotos nuotraukų, JS/CSS/font/cache/LCP/TBT/CLS priežastys ir biudžetai dokumentuoti. |
| T3 | UNVERIFIED | launch | CrUX ir savininko production field CWV šiame audite neprijungti. |
| U1 | UNVERIFIED | local | Viešas formos HTML neturi native required/email tipo; serverinė validation/durable DB nebandyti. |
| U2 | UNVERIFIED | local | SMTP priėmimo bandymo nėra; žinutės nesiųstos. |
| U3 | UNVERIFIED | local | Matching Message-ID inbox receipt nėra; žinutės nesiųstos. |
| U4 | UNVERIFIED | launch | Produkcijos DB/pristatymo/atsparumo/spam operacijos nepasiekiamos read-only scope. |
| V1 | UNVERIFIED | local | Yra GTM/GA4/Meta snippet, bet property scope, bot/test/DNT/GPC ir qualified conversions nepatikrinti. |
| V2 | FAIL | local | Privatumo kelias nerastas formoje/nav, nors Lighthouse be consent veiksmų krauna GTM ir Meta bei facebook.com/tr. |
| V3 | UNVERIFIED | operations | GSC/GA4/qualified inquiry rezultatai auditui neprijungti; nei nulis, nei įrodyta paklausa. |
| W1 | FAIL | local | 53 aktyvių URL/nav/sitemap rinkinyje nerasta prieinamo privacy/terms kelio. |
| W2 | FAIL | local | Formoje nėra duomenų paskirties, gavėjų, saugojimo ir teisių informacijos. |
| W3 | UNVERIFIED | launch | Teisinio operatoriaus ir production duomenų procesų nėra prieigos patvirtinti. |
| W4 | FAIL | local | GTM/Meta script ir Meta pixel request įvyko naujame LH bandyme; sutikimo sąsaja nenaudota ir viešoje peržiūroje neaptikta. |
| X1 | UNVERIFIED | local | Šiame Git pakete nėra raw media/klientų DB/sekretų; legacy backend security/private draft ribos netikrintos. |
| X2 | PASS | local | Headers, redirect/404, vieša medijos biblioteka ir formos/source/priklausomybių ribos aprašytos; CVE/vuln neišgalvoti. |
| X3 | UNVERIFIED | launch | Backup/restore/admin/rate/incident controls nepateikti. |
| Y1 | NA | local | Report-only užduotis shared kodo ar schemos nekeičia; reikalingi pritaikymai dokumentuoti kaip būsimas core darbas. |
| Y2 | NA | local | Core/SEO source nekeistas; regresijų vykdymas neįrodo dabartinio WordPress ar būsimos migracijos. |
| Y3 | PASS | local | Savo svetainės planas, inventorius ir core feedback susieti; esamos canonical taisyklės išsaugotos. |
| Z1 | PASS | local | A-Z 85 kriterijai, URL/source hashes, LH, screenshots ribos ir backlog saugomi šiame site kataloge. |
| Z2 | PASS | local | Verdict NOT_READY_MIGRATION; tikra audit-only apimtis, nėra 10/10 ir domain-ready teiginių. |
| Z3 | UNVERIFIED | launch | Naujos svetainės paleidimo, domain readiness ir paklausos priėmimas neužsakytas/nevykdytas. |

| Etapas | PASS / taikomi | Balas pagal core / 10 | Gate ready |
|---|---|---:|---|
| local | 14/67 | 2.08 | ne |
| launch | 1/11 | 0.9 | ne |
| operations | 0/2 | 0 | ne |

Skaičiai yra vienodo svorio core kriterijų suvestinė. Jie neprilyginami Lighthouse, paieškos pozicijai, dizaino profesionalumui ar teisinei sertifikacijai. Reporting scorer PASS patvirtina registro pilnumą, o ne svetainės parengtį. `--require-local` šiam baseline turi FAIL. Nėra SITE_COMPLETION, nes naujas paketas ir svetainė nekurti.
