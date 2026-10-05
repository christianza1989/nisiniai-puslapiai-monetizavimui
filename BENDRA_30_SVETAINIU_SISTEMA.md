# Bendras maždaug 30 svetainių planas

Data: 2026-09-29. Būsena: architektūros planas ir įgyvendinimo eiga. Vietinė turinio studija sukurta; viešos svetainės variklio darbai vyksta atskiroje Dovanos sesijoje. Produkcija, domenų DNS ir paskyrų planai nekeičiami.

## Įgyvendinta šiame etape

- [Turinio studija](content-studio/README.md) yra veikiantis vietinis GUI. Jame yra 20 pradiniam planavimui skirtų domenų, verslo faktų ir kontaktų įrašai, Codex CLI temų planavimas ir struktūrizuoto turinio generavimas, redagavimas, vaizdų importas, peržiūra, publikavimo laikas, nekintamų patvirtintų versijų kontrolė ir paketo eksportas.
- [Paketo sutartis](content-studio/schemas/content-package.schema.json) suderinta su Dovanos projekto importo validatoriumi. Realus bandomasis paketas su WebP vaizdu jį praėjo. Bandomasis domenas ir kontaktai laikomi izoliuotame `tmp/`, o ne viešoje svetainėje.
- Studijos automatiniai testai praėjo. Vietinio neindeksuojamo GUI išmatuoti Lighthouse balai: Performance 99, Accessibility 100, Best Practices 100. Jo SEO balas 60 dėl sąmoningo `noindex`; viešo variklio SEO ir našumo balai vertinami atskirai.
- Viešame Dovanos projekte veikia patvirtinto paketo importas, domenų registras, nišiniai puslapiai, canonical, robots ir sitemap. Su izoliuotu bandomuoju paketu produkcijos režime patikrinta: pradinis puslapis, sitemap, robots ir WebP grąžino 200; nežinomas URL ir domenas grąžino 404. Cloudflare statiniams vaizdams pridėta Worker-first taisyklė: vaizdas kitame domene grąžina 404. Bandomasis paketas su netikrais kontaktais po patikros iškeltas, švarus build turi 0 paketų.
- Viešo puslapio Lighthouse balas dar nepatvirtintas: šiame apkrautame kompiuteryje Chrome auditas neužsibaigė. Realių užklausų patvarus išsaugojimas, pristatymas ir lankytojų/kontaktų matavimas dar neprijungti; prieš pirmos tikros svetainės paleidimą tam reikia pasirinkti ir patikrinti tiekėją bei tikrus kontaktus. Šio dokumento žemiau esantys priėmimo kriterijai vis dar galioja; produkcija ir domenų DNS neįjungti.

Šis planas sujungia 20 nišinių svetainių paklausos testą su esamu `dovanos-memorycasting` pagrindu. Ankstesnės rekomendacijos prijungti Fabriką kaip privalomą turinio šaltinį nebetaikomos. Pirmo etapo verslo apimtis lieka [20 svetainių SEO MVP](20_SVETAINIU_SEO_MVP.md).

## 1. Sprendimo kryptis

Tobulinti esamą Dovanos123 Next.js pagrindą, sukurti bendrą svetainių konfigūraciją ir atskirą nedidelį turinio planuotoją/generatorių. Fabrikas nėra būtina šios sistemos priklausomybė. Iš jo galima panaudoti kokybės tikrinimo, temų planavimo ir GSC analizės idėjas, tačiau nekopijuoti WordPress publikavimo mechanizmo.

Viena bendra kodo bazė ir pradžioje vienas viešų SEO svetainių diegimas. Kiekvienas verslas turi savo domeną, pasiūlymą, puslapių struktūrą, turinį, išvaizdos konfigūraciją ir kontaktų priskyrimą. Esami komerciniai projektai gali naudoti bendrus komponentus, išlaikydami savo dabartinį diegimą ir pardavimo integracijas; jų migracija nėra 20 svetainių starto sąlyga. Vienos kodo bazės ir vieno diegimo modelis aprašytas [Vercel platformų dokumentacijoje](https://vercel.com/docs/platforms).

Visos 20 nišinių svetainių paleidžiamos paklausos testui. Vienos svetainės techninis bandymas tikrina šabloną; kitų 19 paleidimas nelaukia jos verslo sėkmės. Pilnos prekybos, rezervacijų, tiekėjų, klientų kabinetų ir individualios CRM funkcijos pridedamos tik atrinktiems verslams. Dovanos projekto ankstesni prekybos planai nėra automatiškai taikomi visoms nišoms.

## 2. Ką iš tiesų jau turime

Patikrintas vietinis `C:/Users/lenovo/Documents/dovanos-memorycasting` kodas. Tai nėra gyvos aplinkos ar paskyrų konfigūracijos patvirtinimas.

| Dalis | Faktas | Reikšmė bendram projektui |
|---|---|---|
| `lib/site-config.ts` | Yra `siteId`, domenai, kalbos, spalva ir produkto CTA. Trys konfigūracijos: `dovanos123.lt`, `dovaneles.lt`, `dovanadladov.pl`. | Panaudoti ir išplėsti; konfigūracijos egzistavimas neįrodo domeno nuosavybės ar veikiančio projekto. |
| `lib/content.ts` | Failuose esantys `scheduled` ir `published` įrašai matomi pagal `publishAt <= now`. | Iš anksto paruoštam turiniui nereikia cron, kuris pakeistų būseną. |
| `vercel.json` | Yra Next.js build ir install komandos, cron nėra. | Cron nebuvimas pagrįstas kode. |
| `db/vercel-cloudflare-workers-stub.ts` | Vercel variante `env` neturi D1 DB binding. | Negalima teigti, kad Vercel jau turi veikiančią D1 CMS ar ingest. |
| `lib/content-store.ts` | DB klaidos atveju grąžinami failų straipsniai; DB skaito tik `published`, maišo juos su failų turiniu. | Dabartinis Vercel turinio rodymas gali veikti iš failų; dvi tyliai maišomos turinio linijos turi būti atskirtos. |
| `app/api/ingest/articles/route.ts`, `lib/scheduler.ts` | Importuota `pending` versija gali gauti publikavimo darbą; workeris redakcinio patvirtinimo netikrina. | Prieš naudojant šį importo kelią būtina pataisyti patvirtinimo kontrolę. |
| Straipsnių, autorių, sitemap ir vidinių nuorodų puslapiai | Jau naudoja bendras turinio funkcijas. | Panaudoti kaip bendro SEO sluoksnio pagrindą. |

Ankstesnio Dovanos projekto P0 auditas aprašytas `docs/DOVANOS123-PUBLIKAVIMO-IR-NUORODU-QA-2026.md`. Ten aprašytas tikslinis patvirtinimo modelis dar nėra įdiegtas vien dėl dokumento egzistavimo.

## 3. Pirmo etapo sistemos dalys

| Dalis | Pirmam etapui būtina | Vėliau |
|---|---|---|
| Svetainių variklis | Esamas Next.js, domeno atpažinimas, SEO puslapiai, keli kompozicijų šablonai, formos ir kontaktai. | Individualios verslo funkcijos. |
| Turinio planuotojas | Verslo aprašas, temų ir URL planas, šaltiniai, juodraščiai, peržiūra, publikavimo datos, turinio paketo eksportas. | Patogesnė bendra redaktoriaus sąsaja ir savarankiškas užduočių vykdytojas. |
| Turinio saugykla | Vienas aiškiai pasirinktas adapteris. Vercel MVP kandidatas – versijuoti patvirtinti failų paketai. | DB/API adapteris, kai reikia dažnų pakeitimų be deploy. |
| Užklausos | Patikimas išsaugojimas, serverio priskirtas `siteId`, el. pašto pristatymas, paprastas bendras sąrašas. | Partnerių persiuntimas, pardavimų automatika, CRM. |
| Rezultatų suvestinė | GSC kiekvienam domenui, srautas, paspaudimai, realios ir kvalifikuotos užklausos, sąnaudos. Pradžioje gali pakakti lentelės. | Automatinės ataskaitos ir prioritetų rekomendacijos. |

Nereikia naujo Payload, Postgres ar didelės administravimo platformos vien tam, kad paleistume puslapius. Užklausoms vis tiek reikia tikros patvarios saugyklos ar patikimo formų paslaugos tiekėjo; vien el. pašto išsiuntimo bandymas nėra saugus įrašymas.

## 4. Turinio eiga ir publikavimas be cron

```text
Verslo faktai → temos ir URL → šaltiniai → juodraštis → peržiūra
                                                        ↓
                            patvirtinta nekintama versija + publishAt
                                                        ↓
                         patvirtintas svetainės turinio paketas
                                                        ↓
                             vienas valdomas deploy / importas
                                                        ↓
               užklausos metu rodyti tik patvirtintą, jau atėjusios datos versiją
```

Pavyzdys: paruošiame ir įdiegiame spalio straipsnių paketą rugsėjį. Spalio 10 d. 07:30 numatytas straipsnis tampa matomas pirmoje tinkamoje serverio užklausoje po to momento. Tai nereiškia, kad tuo metu AI kažką parašė ar kad Google iškart indeksuos. Naują paketą vis dar reikia sugeneruoti, patikrinti ir pristatyti į svetainę.

Failų adapteryje būsimas turinys laikomas tik serverio dalyje, ne `public/` ir ne naršyklei siunčiamame duomenų rinkinyje. Patvirtinimas siejamas su konkrečia turinio versija/hash; pakeitus ją, reikalinga nauja peržiūra. `pending`, atmestas ar atšauktas turinys viešai nerodomas.

Vienodas matomumo sprendimas naudojamas straipsniui, sąrašams, homepage, autoriams, sitemap, struktūriniams duomenims ir vidinėms nuorodoms. Laikas saugomas UTC, planavimo sąsajoje rodoma `Europe/Vilnius`; fiksuotas `+03:00` netinka visiems metams.

Pirmiausia patikrinti teisingą rodymą be ilgai gyvuojančio HTML cache. Cache optimizacija įjungiama tik patikrinus publikavimo, naujos versijos ir atšaukimo ribas; negalima pažadėti tikslios minutės, jei CDN dar laiko seną atsakymą. Failų režime atšaukimas įsigalioja po patvirtinto atnaujinimo įdiegimo ir cache išvalymo, o ne nuo vien pakeitimo vietiniame faile. Jei būtinas skubus atšaukimas be deploy, tai konkretus argumentas valdomai DB/API saugyklai.

Generatorius veikia atskirai nuo lankytojo užklausos. Pradžioje – operatoriaus paleidžiamos partijos su išsaugota eiga; nereikia nei lankytojo laukimo, nei nuolatinio didelio serviso. Kiekviena užduotis turi `siteId`, `contentId`, versiją, etapą, bandymų skaičių, klaidą ir kainos limitą. Pakartotas paleidimas tęsia arba praleidžia jau atliktą žingsnį. Vėliau tas pats vykdymas perkeliamas į patvarią eilę/workerį; pokalbio sesija nėra 24/7 vykdytojas.

Peržiūra nėra vien dar vieno modelio nuomonė: faktai remiami šaltiniais ar patvirtintu verslo aprašu, o kodas tikrina formatą, URL unikalumą, nuorodas ir privalomus laukus. Nežinoma kaina, atsargos ar tiekėjas negali būti išgalvoti. Autorius yra tikras patvirtintas žmogus arba tikra redakcija; išgalvoti ekspertai ir patirtis iš demo turinio neperkeliami. Patvirtinimo taisyklės ir atsakingas redaktorius aiškūs; nebūtina kiekvienam mažam pakeitimui kurti atskiro vartotojo leidimo žingsnio.

## 5. Ką atskiriame pagal svetainę

- `siteId`, pirminis domenas, aliasai, kalba, laiko juosta ir aktyvumo būsena.
- Verslo auditorija, realus pasiūlymas, aptarnavimo teritorija ir žinomi faktai.
- Kompozicijos tipas, spalvos, logotipas, vaizdai, navigacija ir CTA.
- Turinio/URL planas, tekstai, autoriai, šaltiniai, medija ir patvirtintos versijos.
- El. pašto aliasas, telefonas, formos gavėjas, GSC nuosavybė ir matavimo žymos.
- Cache raktai, prieigos teisės, įrašymo ir eksporto ribos.

Host parenkamas iš leidžiamų domenų registro. Nežinomas domenas negali gauti numatytos Dovanos123 svetainės. Canonical ir sitemap naudoja nustatytą pirminį domeną, o ne laisvai pateiktą užklausos host. Viešos preview kopijos neindeksuojamos. Užklausų API nepasitiki vien kliento atsiųstu `siteId`.

Pardavimo galimybė numatoma nuo pradžių: svetainės konfigūraciją, turinį ir jai priklausančią mediją galima eksportuoti atskirai. Kodo ir medijos naudojimo teisės bei kontaktų duomenų perdavimo apimtis tikrinamos atskirai; eksportas nėra leidimas perduoti viso tinklo klientus ar paslaptis. Atskiras diegimas kuriamas tik kai reikia izoliacijos, pardavimo ar specifinių funkcijų.

## 6. SEO ir paklausos bandymas

Kiekvienai svetainei ruošiamas savas pagrindinis puslapis, prasmingi paslaugų/prekių aprašymai, teminis informacijos centras ir realūs kontaktai. Kiekvienas URL turi paieškos ketinimą, naudą, šaltinius ir CTA. Netaikoma vienoda straipsnių kvota visoms nišoms; temų žemėlapis yra aprėpties planas, ne Google pozicijų garantija.

Matuojame grandinę `indeksavimas → aktualus srautas → kontakto paspaudimas → gauta užklausa → kvalifikuota užklausa`. Telefono ar el. pašto paspaudimas nėra tikras pokalbis ar laiškas. Nežinomą skambučio šaltinį taip ir žymime. Vertiname amžių nuo indeksavimo, sezoną, turinio ir reklamos sąnaudas. Mažas srautas savaime neįrodo, kad nėra paklausos.

Visoms svetainėms nereikia bendro tarpusavio nuorodų tinklo. Nuorodos kuriamos pagal naudą skaitytojui. Fabriko išorinių publikacijų kampanijos nėra starto sąlyga. Automatiniai backlinkai reitingui kelti ir masiniai beveik vienodi puslapiai nėra šio plano pagrindas. [Google spam politika](https://developers.google.com/search/docs/essentials/spam-policies), [AI turinio gairės](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content).

## 7. Hostingas ir sąnaudos

Vercel techniškai palaiko kelių domenų platformą, tačiau **Hobby leidžiamas tik asmeniniam nekomerciniam naudojimui**. Verslų užklausų rinkimo tinklo nereikia planuoti kaip ilgalaikio nemokamo Hobby projekto. Pagrindinis kelias, jei liekame su Vercel, – komerciniam naudojimui tinkamas planas; kita galimybė – atskirai patikrintas kito hostingo pasiūlymas. Paskyros plano šiame darbe nekeičiame.

Oficialioje 2026-09-29 tikrintoje lentelėje Hobby turi 50 domenų vienam projektui; maždaug 30 verslų su atskirais apex ir `www` įrašais gali peržengti šį skaičių. Verslų skaičius nėra tas pats, kas prijungtų domenų/aliasų skaičius. Šis limitas nepanaikina komercinio naudojimo apribojimo. [Vercel Hobby dokumentacija](https://vercel.com/docs/plans/hobby).

Hostingas, AI generavimas, paštas, saugykla, domenų pratęsimas ir reklama yra atskiros sąnaudos. Vartotojo nurodyta 5 € domeno įsigijimo kaina savaime nepatvirtina tokios pat pratęsimo kainos. Nežinomos kainos ar kvotos šiame plane nežadamos.

## 8. Darbų eilė ir priėmimo kriterijai

1. Suderinti vieną bendrą turinio ir svetainės duomenų formatą. Pasirinkti viešo turinio adapterį pagal tikrą hostingą; nedaryti D1 migracijos vien dėl seno plano.
2. Sutvarkyti publikavimo P0: patvirtinta versija, laiko riba, atšaukimas, saugus domeno parinkimas, vienas canonical, jokio tylaus DB gedimo maskavimo kitu turiniu. Nenaudojamus rašymo endpointus laikyti neaktyvius.
3. Patikrinti šabloną su skirtingais bandomais `siteId`: tas pats slug negali sumaišyti turinio; prieš/po publikavimo laiko, nepatvirtintas ir atšauktas tekstas, sitemap ir nuorodos turi elgtis vienodai. Testuoti runtime adapterį, kuris iš tiesų bus diegiamas.
4. Pritaikyti kelias puslapių kompozicijas ir bendrą formą. Forma išsaugo kontaktą prieš rodydama sėkmę; pristatymo klaida neištrina užklausos. Išbandyti tikrą gavimą ir matavimo įvykius.
5. Parengti visų 20 verslų briefus ir URL planus; generuoti individualų turinį valdomomis partijomis. Nauja partija turi saugų sujungimą, kad skirtingų svetainių pakeitimai vienas kito neperrašytų.
6. Paleisti visus 20 domenų techninėmis bangomis ir registruoti pirmą indeksavimą, sąnaudas bei realias užklausas.
7. Pagal rezultatus pridėti individualias funkcijas laimėtojams. Nuolatinę generavimo automatiką pridėti tik kai išbandytas turinio ir publikavimo procesas.

## 9. Domenų inventoriaus ribos

Mūsų 20 tikslinių domenų sąrašas yra [TOP_20_PIRKIMUI.txt](TOP_20_PIRKIMUI.txt). Jų įsigijimas šiame darbe netikrintas ir nevykdomas.

Dovanos repozitorijoje yra trys svetainių konfigūracijos. Planavimo dokumentuose papildomai aptariami `memorycasting.lt`, `likimoknyga.lt` ir kitos produktų idėjos. Paminėjimas dokumente nėra nuosavybės, laisvumo ar pasirinkimo patvirtinimas. „Apie 30“ yra vartotojo numatomas mastas, ne jau patvirtintas 30 veikiančių verslų sąrašas; nereikia sugalvoti papildomų domenų vien tam, kad pasiektume skaičių.

## 10. Sesijų koordinavimas

Koordinuojama su vartotojo nurodyta sesija `01a0b5ba-c024-7343-94c6-8a672170ecb3` („Paaiškinti rankų liejimo rinkinius“). Šioje sesijoje sukurtas atskiras `content-studio/` GUI ir aprašyta 20 nišų bandymo apimtis. Dovanos sesija kuria viešą Next.js variklį savo repozitorijoje. Sesijos suderino tą patį turinio paketo formatą ir nekeičia tų pačių kodo failų vienu metu.
