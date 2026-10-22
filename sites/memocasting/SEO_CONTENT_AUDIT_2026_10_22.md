# Memocasting turinio ir SEO auditas — 2026-10-22

**Išvada:** savininko abejonė pagrįsta. Sezoninių gidų tekstai sklandūs, tačiau daugiausia moko, kaip galvoti apie pasirinkimą. Žmogui, ieškančiam konkrečios kalėdinės dovanos, dažnai dar reikia pačiam iš naujo ieškoti prekių, kainų ir pardavėjų. Prioritetas — atkurti prasmingą senų URL tęstinumą, sustiprinti esamus sezoninius atsakymus ir sutvarkyti nuorodas. Daugiau bendro teksto ar dar viena beveik tokia pati „TOP 10“ puslapio versija šios problemos neišspręs.

Tai dabartinio paketo auditas ir įgyvendinimo planas. Šiuo pavedimu pakeista **0 viešų straipsnių, 0 publikavimo datų, 0 produkcijos nustatymų**. DPD atidėtas pagal savininko nurodymą. Ankstesnės patvirtintų revizijų istorijos neperrašytos.

## 1. Ką iš tikrųjų patikrinome

| Apimtis | Rezultatas |
|---|---:|
| Visas eksportuotas paketas | 181 puslapis |
| Visų kalbų `guide` įrašai | 116 |
| Lietuviški straipsniai, neįtraukiant `/pagalba` | **97** |
| Vieši LT straipsniai audito metu | **20** |
| Parengti LT straipsniai su ateities data | **77** |
| Kalėdų / Advento temos | **21**, iš jų **14 viešų** |
| Visų LT straipsnių inventorius, ketinimas, struktūra, nuorodų ir šaltinių įrašai | **97** |
| Visas perskaitytas ir redakciškai įvertintas sezoninis tekstas | **21** |
| Kitų temų pilna redakcinė peržiūra | 76 tekstai dar nėra iš naujo patvirtinti šiuo auditu |
| GSC našumo eksportas | 28 dienos, 125 užklausų ir 51 puslapio eilutė |
| Senų / naujų GSC adresų HTTP patikra | Visos 51 eksportuotos puslapių eilutės |
| Dabartinis viešas HTML | Visi jau vieši LT gidai, indeksai, techniniai failai, du ateities URL ir abu produktai |
| Reprezentatyvus tikras naršyklės vaizdas | Mamos gidas, desktop ir 390 × 844 mobile |

97 URL individualūs sprendimai yra [CSV faile](SEO_CONTENT_AUDIT_2026_10_22_URLS.csv), matavimai ir jų ribos — [JSON ataskaitoje](SEO_CONTENT_AUDIT_2026_10_22.json). 21 sezoninio URL užduotys ir 87 konkretesnių užklausų priskyrimas pateikti [stiprinimo plane](CHRISTMAS_SEO_PLAN_2026_10_22.md).

Paketo SHA-256: `dd5f50b1ae41043323ebc510eb820d0240de64bb0c1a92dd24ab99ddb227a34e`. CORE bazė `06bcc821945d233b454df84923fd8d06ed9f55a9`; PUBLIC bazė `559a18a4aece89947f9d96637b2bbdc79c9fa92c`. Tai audito metu buvęs šaltinis, ne būsimo diegimo patvirtinimas.

## 2. Tikras paieškos atskaitos taškas

GSC nuosavybė — **`sc-domain:memocasting.lt`**. Laikotarpis **2026-09-23–2026-10-20**, žiniatinklio paieška. Domeno `memorycasting.lt` ar kitų nuosavybių metrika čia nenaudojama.

| Pjūvis | Paspaudimai | Parodymai |
|---|---:|---:|
| Visa nuosavybė, visos šalys | **48** | **1 379** |
| GSC šalių lentelės Lietuva eilutė | **43** | **1 301** |

Lietuvos eilutės PR — 3,31 %, vidutinė pozicija — 40,85. Toliau pateikti atskirų užklausų ir puslapių skaičiai paimti iš **nefiltruoto visų šalių eksporto**; jų nevadiname atskiru LT pozicijų matavimu. Užklausų anonimizavimas ir puslapio / nuosavybės agregavimas reiškia, kad lentelių sumų nereikia prilyginti grafiko sumai.

- `ranku liejimo rinkinys`: 9 paspaudimai, 43 parodymai, vidutinė pozicija 2,51. Šią jau naudingą komercinę kryptį reikia saugoti.
- `kalėdinės dovanos`: 0 paspaudimų, 39 parodymai, vidutinė pozicija 79,9. Varianto be lietuviškų raidžių apimtis nėra papildomas nepriklausomų žmonių skaičius.
- `dovanos moterims`: 0 paspaudimų, 68 parodymai, vidutinė pozicija 48,85.
- Senas moterų Kalėdų straipsnis: 425 parodymai, dabar veikiantis 301 į `/gidai/kaledines-dovanos-moterims`.
- Senas bendras moterų straipsnis: 236 parodymai, dabar **404**.
- Senas „dovana mamai 50 metų jubiliejaus proga“ URL: 21 parodymas, vidutinė pozicija 11,52, dabar **404**. Tai nedidelis, bet konkretesnis atkūrimo kandidatas.

Didžioji paspaudimų dalis ateina į pradžios / prekės / prekių ženklo puslapius. Naujieji sezoniniai gidai pradėti rodyti spalio 15–22 d.; šis eksportas baigiasi spalio 20 d. **Iš kelių dienų negalima spręsti, kad nauji gidai jau įrodytai nepavyko.** Kokybės spragas nustatėme iš pačių tekstų ir veikiančio HTML, ne iš tariamos priežastinės reitingų analizės.

## 3. P0 — senų adresų tęstinumas

Iš 51 GSC puslapių eilutės **31 baigiasi HTTP 200, 20 — HTTP 404**. Tarp 404 yra ir teisėtai pašalintų techninių adresų bei senų prekių; visų 20 nereikia automatiškai nukreipti.

| Pavyzdys | Dabartinė būsena | Sprendimas |
|---|---|---|
| `/products/seimos-rinkinys` | 404 | Patikrintas tos pačios prekės pakaitalas `/seimos-rinkinys`: pirmas tiesioginio 301 kandidatas. |
| `/blogs/news/kaledines-dovanos-moterims-sventines-idejos` | 404 | Sutikrinti sezoninį atsakymą ir nukreipti į jau viešą moterų Kalėdų gidą. |
| `/blogs/news/ypatingos-dovanos-moterims-nepamirstamoms-akimirkoms` | 404 | Evergreen atsakymas; kandidatas `/gidai/dovanos-moterims` dar suplanuotas. Pirma parengti ir paskelbti tikrą atitikmenį. |
| Mamos personalizuotų, prabangių, jaunai ar vyresnei mamai skirtų dovanų URL | 404 | Įvertinti atskirą klausimą; sustiprinti konkretų atitinkamą skyrių arba atkurti naudingą seną URL. Tik tada konsoliduoti. |
| `/en` ir seni EN produktų / kolekcijų adresai | 404 | Atskiras kalbos sprendimas. Automatinis nukreipimas į LT homepage nėra tinkamas pakaitalas. |
| `/password`, `/en/password` | 404 | Pašalintam techniniam adresui tai gali būti teisinga būsena. |

Visi adresai ir atskiros sąlygos: [51 eilutės migracijos matrica](SEO_CONTENT_AUDIT_2026_10_22_LEGACY.csv). Matrica yra pasiūlymas, serverio taisyklės nepakeistos. Kolekcijos pirkimo ketinimas taip pat nėra savaime tapatus informaciniam gidui.

301 tikslas turi būti viešas, atsakyti į tą patį klausimą, grąžinti 200 ir turėti savo canonical. Vengti grandinių ir bendro „visi seni adresai → homepage“. Tai atitinka [Google migracijos rekomendacijas](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes).

## 4. P0 — informacijos naudingumas

97 LT straipsnių žodžių mediana — **629**, mažiausias — 322, didžiausias — 841; šeši turi mažiau nei 500 žodžių. Tai aprašomoji statistika, ne kokybės balas. [Google nenurodo pageidaujamo žodžių skaičiaus](https://developers.google.com/search/docs/fundamentals/creating-helpful-content). Ilginti iki 1 500 ar 2 000 žodžių vien dėl skaičiaus nerekomenduojama.

**Kas jau gerai:** rišli kalba, aiškios antraštės, pagarba gavėjo norams, nėra išgalvotų išbandymų ar klientų istorijų. Naudingi konkretūs elementai: darbuotojų dovanų kiekių pavyzdys, Advento 24 dienų seka, pakavimo žingsniai. Juos išlaikyti ir papildyti realiomis priemonėmis, ne pakeisti bendru TOP sąrašu.

**Kas silpna:** skirtingose temose kartojama panaši patarimų sistema: paklauskite norų, susitarkite dėl biudžeto, patikrinkite sąlygas, neįpareigokite veiklai. Tai pagrįsti patarimai, bet jais nebaigiamas konkretus pirkimo pasirinkimas. Nerasta identiškų ilgesnių nei 100 ženklų pastraipų tarp LT gidų; tai **neįrodo semantinio originalumo**.

| Gidas | Dabartinė spraga | Konkretus papildymas |
|---|---|---|
| Mamai, 556 žodžiai | Albumas, laiškas ir veikla paminėti abstrakčiai; nėra patikrintų išorinių pasiūlymų ar nuorodų tekste. | 10 argumentuotų idėjų, pilnos kainos ribos, kam tinka / netinka, konkretus šaltinis ir foto teisė. |
| Porai, 538 žodžiai | Bendros dovanos kryptys be realių kainos dviem ir rezervacijos skirtumų. | Namų rinkinio, keramikos ir kitos patirties palyginimas tuo pačiu kriterijų rinkiniu. |
| Šeimai, 556 žodžiai | Klausimai apie dalyvius, bet mažai konkrečių pasirinkimų. | Tikro žaidimo, išvykos, kūrybos ir prisiminimo palyginimas pagal visos šeimos kainą ir dokumentuotas sąlygas. |
| Kolegoms, 516 žodžių | Secret Santa scenarijai naudingi, tačiau nėra konkrečių biudžeto ribą atitinkančių variantų. | Patikrinti pasirinkimai iki 10 ir 20 eurų, skaičiuojant siuntimą atskirai. |
| Darbuotojams, 841 žodis | Yra naudingas kiekių pavyzdys, bet teksto aprašymas dar nėra naudojama lentelė. | Tikras biudžeto / pasirinkimų CSV ir realūs pasiūlymų formatai. |
| Adventas, 721 žodis | Geras praktinis branduolys; nėra tikro spausdinamo rinkinio. | Užbaigti kortelių ir biudžeto failus, tik tada siūlyti atsisiųsti. |

90 iš 97 LT straipsnių `externalLinks` tušti; **visuose 21 sezoniniame gide nėra išorinių šaltinių įrašų**. Išorinių nuorodų trūkumas savaime nėra Google bauda. Šiuo atveju jis sutampa su didesne spraga — nėra tikrų, vartotojui palyginamų pasiūlymų. Nuorodos turi patvirtinti konkrečius faktus arba padėti pirkti, o ne būti įdėtos dėl tariamo SEO skaičiaus.

## 5. P0 — nuorodos tekste ir skaitytojo kelias

**8 iš 14 jau viešų sezoninių straipsnių** neturi kontekstinių nuorodų pagrindiniame tekste: mamai, moterims, vyrams, šeimai, porai, tėčiui, draugams, kolegoms. Susijusių gidų / produktų blokai puslapio pabaigoje yra; nevadiname šių puslapių visiškai našlaičiais. Visame LT inventoriuje 20 iš 97 tekstų nėra tikslaus nuorodų teksto atitikmens.

Priežastis atkuriama: `linked-text.tsx` naudoja `contextualParts`; nuorodos label turi tiksliai sutapti su fraze pastraipoje, įskaitant raidžių dydį. Patvirtintas pilnas pavadinimas ir natūrali linksniuota frazė nėra tas pats. Stiprinant turinį parinkti **natūralų label, realiai esantį sakinyje**, susieti su tikru `targetPageId` ir tikrinti galutinį HTML. Fuzzy automatinio nuorodų dėjimo nesiūlome.

Pavyzdys mamos gide: „Jei dovanojate abiem tėvams, palyginkite **kalėdines dovanas tėvams**.“ Tas tikslus tekstas tampa nuorodos label. Produkto nuoroda dedama ten, kur skaitomas jo palyginimas. Pagrindinis Kalėdų gidas turi nuvesti į gavėjų gidus, o gavėjo gidas — atgal į tinkamą platesnį pasirinkimą ir naudingą kitą žingsnį. Ateities puslapių nuorodų nerodyti iki jų viešo tinkamumo.

Nėra universalaus „teisingo“ vidinių ar išorinių nuorodų skaičiaus. Svarbūs kontekstas, aiškus tekstas ir tikras `<a href>`. [Google nuorodų gairės](https://developers.google.com/search/docs/crawling-indexing/links-crawlable).

## 6. P1 — techninis SEO ir terminai

- **Sitemap veikia:** HTTP 200, audito metu 100 URL. Dviejų tikrintų ateities gidų adresų jame nėra; tie adresai teisingai grąžina 404 iki publikavimo. GSC dabartinis `/sitemap.xml` pažymėtas „Pavyko“, paskutinė GSC nuskaitymo data 2026-10-15, 85 tuomet atrasti puslapiai. Tai nėra dabartinių 100 URL indeksavimo patvirtinimas.
- **Seni Shopify sitemap įrašai likę GSC:** keli rodomi „Nepavyko gauti“, datos senos. Po URL migracijos sutvarkymo peržiūrėti ir pašalinti tik nebeaktualius pateikimus. Toks sąrašo valymas pats savaime reitingų nekelia ir nepašalina istorinių URL iš indekso.
- **Viešų gidų HTML patikra:** atsakymas 200, po vieną H1 ir self canonical, yra Article schema `@graph` viduje. Tai bazė, ne turinio kokybės ar rich result garantija.
- **Abu produktai turi realią schemos spragą:** `/rinkinys-porai` ir `/seimos-rinkinys` Product node neturi `offers`. GSC rodo 2 netinkamus elementus su „Reikia nurodyti offers, review arba aggregateRating“; dabartinis HTML tai patvirtina. Pataisa turi imti kainą, valiutą ir tikrą availability iš veikiančio parduotuvės katalogo / viešo produkto šaltinio, įskaitant pasirenkamus priedus. Nenaudoti tekstinio kainos regex ar sugalvotų atsiliepimų schemai užpildyti. Ši nišos parduotuvės ir SEO duomenų integracija dar neįgyvendinta šiame audite.
- GSC apžvalgos 56 indeksuoti / 133 neindeksuoti adresai apima senus ir naujus URL. Tai nėra teiginys, kad 133 dabartiniai gidai blogi. Reikia atskirai išskaidyti aktualių viešų gidų ir istorinių adresų kohortas.
- „Paskutinės minutės“ gidas dabar suplanuotas **gruodžio 21 d.** Jis turi atsirasti gerokai anksčiau; plane siūloma lapkričio pirma pusė, perskaičiavus 1–2 naujų straipsnių per dieną kalendorių. Datos automatiškai nepakeistos.
- Mamos gido desktop / mobile vaizdas įskaitomas, 390 px pločiu nėra horizontalaus išlindimo. Tačiau iki praktinio pasirinkimo pirmiausia rodomas ilgas įvadas, metaduomenys, didelis vaizdas ir turinys. Stiprinant verta greitą pasirinkimų santrauką pateikti anksčiau; mobilų turinį galima sutraukti. Šrifto smulkinti nereikia. Šis testas nėra visų puslapių Lighthouse / CWV auditas.

## 7. Konkurentų tyrimo išvada

Nemokama dabartinių viešų rezultatų ir pardavėjų puslapių imtis patvirtina mišrų ketinimą: **dovanų kategorijos su realiomis prekėmis ir redakciniai pasirinkimų sąrašai**. Tai nėra kontroliuotas Google LT pozicijų tyrimas.

| Šaltinis | Ką patikrinome | Ką pritaikyti Memocasting |
|---|---|---|
| [Pigu.lt: kalėdinė dovana mamai](https://pigu.lt/lt/g/kaledines-dovanos-mamai) | Gidas su realiais produktų pavadinimais, kortelėmis ir kainomis; straipsnio data 2023-11-27. | Konkrečius pasirinkimus ir matomus faktus. Nekopijuoti aprašymų, stereotipų ar sveikatos pažadų. |
| [Gera dovana: dovanos mamai](https://www.geradovana.lt/dovanos-moterims/dovanos-mamai) | Realios patirtys ir atranka pagal pasiūlymo sąlygas. | Vietą, dalyvių skaičių, rezervaciją ir naudojimą lyginti taip pat aiškiai kaip kainą. |
| [Gerduva: kalėdinės dovanos mamai](https://gerduva.lt/dovanu-idejos/dovanos-mamoms/kaledines-dovanos-mamai) | Tikras dovanų kategorijos asortimentas ir produktų vaizdai. | Redakcinį paaiškinimą, kodėl konkretus daiktas tinka, pridėti prie realaus produkto. |
| [e-dovanos.lt albumas „Šeimos medis“](https://e-dovanos.lt/nuotrauku-albumas-seimos-medis) | Konkretaus prisiminimo formato pasiūlymas, atskiras nuo abstraktaus „padovanokite albumą“. | Lyginti albumą su nuosavu fiziniu prisiminimu pagal pasiruošimą ir gavėjo dalyvavimą. |

`dovanos.lt` šiuo web įrankiu neatsivėrė. **`e-dovanos.lt` yra kitas domenas**; jo nelaikome vartotojo minėtos svetainės patvirtinimu. Neaptikta patvirtinto Pigu / Gera dovana partnerystės feed ar vaizdų naudojimo leidimo; jų neišgalvojame.

Mūsų pranašumas gali būti tikras nuosavo rankų liejimo produkto išmanymas, savi proceso video ir skirtingi realūs rezultatai. Bendras visų įmanomų dovanų katalogas be savito darbo šio pranašumo nesukuria. [Google palyginimų rekomendacijos](https://developers.google.com/search/docs/specialty/ecommerce/write-high-quality-reviews) pabrėžia pasirinkimo argumentus, alternatyvas ir originalią vertę, o ne vien produktų nuorodų sąrašą.

## 8. Tyrimo ribos ir perdavimas

Panaudoti galiojantys 2026-10-14 Treg raktažodžių duomenys su jų pirminėmis datomis. Jų apimtys yra tiekėjo įverčiai, ne 2026 m. Kalėdų prognozė. 2026-10-14 SERP įrodymai paseno 2026-10-21; jų nevadiname šiandienos pozicijomis. Naujų mokamų tyrimų išlaidos — **0 USD**. Nemokamas Treg GSC nuosavybių bandymas negrąžino prisijungimo; faktiniai GSC duomenys gauti prisijungusioje Chrome per CSV eksportą, ne iš kitos svetainės paskyros.

Originalūs CSV, HTTP, GSC UI tekstai, ekrano vaizdai ir šaltinių atsakymai yra ignoruojamame `qa/seo-content-20261022/`. Tyrimas importuotas bendru privačiu `seo-research.mjs` adapteriu: galutinis snapshot `7699f759-3e88-4cc1-98a1-da341ae695e6`, 48 stebėjimai, evidence SHA-256 `09b0ea250a2c2be217679cff1ac50dc077141930f29e5676ae37f25be5266090`. Dabartiniai keywords / analytics / crawl / source duomenys atpažinti; bendras `refresh_due` lieka dėl išsaugotų pasenusių SERP ir kitų istorinių stebėjimų. Senų darbų įrodymai ir instrukcijų fingerprint nepakeisti. GA4 konversijos, backlink profilis ir AI citavimo metrika šiame audite nematuoti.

Toliau vykdyti [prioritetinį planą](CHRISTMAS_SEO_PLAN_2026_10_22.md). Auditas nepažada TOP pozicijų ar konkretaus srauto per du mėnesius; jis pašalina nustatytas kliūtis ir sukuria tikrinamą, naudingesnį turinį.
