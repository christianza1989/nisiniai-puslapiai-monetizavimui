# Madbeauty: katalogo, filtrų ir AI paieškos tyrimas

2026-10-05. Tikras interneto tyrimas ir projekto dokumentų / trijų public core failų ribotas read-only palyginimas. Savininko tikslas: pirma pilnas vietinis platformos prototipas su dummy data, paskui realūs duomenys ir backend; SEO/GEO suprojektuotas nuo pradžių. Rezultatas yra planas, ne frontend ar SEO runtime priėmimas.

## Išvada ir pasirinkimas

Sąsajos-first kryptis tinkama užduočiai: realiai paspaudžiamas prototipas atskleidžia trūkstamus kelius ir būsenas. Duomenų / API / autorizacijos / laisvų laikų taisyklės projektuojamos kartu, prieš integraciją. Demo katalogas lieka privatus ir neindeksuojamas. Gamybinis katalogas naudoja patvirtintus teikėjus; ne automatinį visų įmanomų kombinacijų publikavimą.

SEO sprendimas: ribotas paslaugos + vietos katalogo URL registras, iš kurio vartotojas gali tęsti patogią laiko paiešką. Suprantamas paslaugos miesto puslapis atsako į „veido masažas Vilnius“. Trumpalaikės data / valanda / arbitrary kaina / sort / geokoordinatės nekuria atskirų indeksuojamų puslapių. Ši politika yra mūsų produkto sprendimas remiantis pirminėmis gairėmis, ne privaloma viena visiems svetainių schema.

## Tyrimo metodas ir ribos

29 pirminių URL bandymai / patikros įrašyti [SOURCES.json](SOURCES.json): Google, Microsoft, OpenAI, Schema.org ir pačių konkurentų puslapiai. Atskirtas retrieved, shell_only ir fetch_error. Search naudojamas šaltiniams / pirkimo intencijų pavyzdžiams atrasti; nėra Lietuvos Google pozicijų, paieškų apimties, domain authority ar konkurentų konversijų matavimo. Tekstinis realių puslapių peržiūrėjimas nėra mobilus UX / Lighthouse / booking testas. Nėra apžiūrėtos mūsų GSC ar Bing paskyros.

## Rinkoje apžiūrėti puslapiai

| Puslapis | Faktinė matoma struktūra | Pritaikymas / atmetimas |
|---|---|---|
| [Treatwell: veido masažas Vilniuje](https://www.treatwell.lt/salonai/procedura-veido-masazas/pasiulymo-tipas-vietinis/kur-vilnius-lt/) | Paslauga ir vieta, rajonai, datos valdiklis, realiai pateikiamos kortelės su procedūrų variantais / kainomis / trukmėmis / siūlomais laikais | Pritaikyti tiesioginį katalogo pirkimo kelią. Nekopijuoti salonų / atsiliepimų / ekspertizės; šaltinio skaičiai nėra mūsų rinka ar gyva pasiūla. |
| [Treatwell: Masažo namai](https://www.treatwell.lt/salonas/masazo-namai/) | Skirtingi veido paslaugų variantai ir registracija | Paslaugų taxonomija turi atskirti skirtingas procedūras, ne sumaišyti į vieną „facial“. Medicinos teiginių neperimti. |
| [BeautyBook: manikiūras Vilniuje](https://beautybook.lt/paslauga/manikiuras/vilnius/) | Vietinis sąrašas, paslaugos aprašymas ir DUK | Adaptuoti paaiškinimo vietą, tačiau kainas išvesti iš to paties pasiūlos šaltinio: kortelė / DUK ir bendras aprašymas šiame pavyzdyje pateikia skirtingus minimumus. Tai stebėtas tekstų skirtumas, ne veiklos tyrimas. |
| [Fresha: face massage London](https://www.fresha.com/lp/en/tt/facial-massages/in/gb-london) | Paslauga / miestas, profiliai, price / duration, klausimai ir vietų atradimas | Pasinaudoti katalogo bei paaiškinimo deriniu; ne kopijuoti bendrų sveikatos pažadų ir užsienio kainų į Lietuvą. |
| [Booksy: facials NYC](https://booksy.com/en-us/s/facial/30067_new-york-city) | Paslaugos miesto sąrašas, aiškiai žymėta promoted pasiūla, pagination, susijusios procedūros ir pasirinkimo turinys | Pritaikyti browse hierarchiją ir puslapiavimą. Bendro generinio esė nepadaryti kiekvieno mūsų miesto vertės pagrindu. Facials semantika platesnė už veido masažą. |

Fresha LT facials URL fetch nepavyko; to nevadiname pasiūlos ar puslapio nebuvimo įrodymu. HTML head canonical / robots visiems konkurentams atskirai netikrinti; iš jų URL formos nenustatome indeksavimo strategijos sėkmės.

## Pirminės gairės ir ką jos pakeičia

- [Faceted navigation](https://developers.google.com/crawling/docs/faceted-navigation): beribės filtrų kombinacijos gali eikvoti crawling ir lėtinti svarbių URL atradimą. Renkamės pastovius atrinktus katalogus ir hash būseną trumpalaikiams filtrams. Nonsensical ar neegzistuojančios kombinacijos netampa naujais katalogais.
- [Spam policies](https://developers.google.com/search/docs/essentials/spam-policies): daug menkos vertės miesto / raktažodžio variantų ir AI teksto apimtis nekuria naudos. Automatizuojame puslapio sudėjimą iš tikros pasiūlos ir patikrinto turinio; neišgalvojame specialistų ar jų autoriteto.
- [Canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing) ir [pagination](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading): dublikato signalas, indeksavimo atsisakymas ir puslapiavimas yra skirtingi darbai. Puslapis 2 neturi būti canonical į puslapį 1. Robots blokavimas neleidžia perskaityti noindex.
- [AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide): aktualūs originalūs duomenys ir įprastas SEO; ne visų sinonimų tikslus pakartojimas. Google llms.txt nenaudoja reitingams; papildomos AI schemos nėra. Bendrą core LLM indeksą paliekame kitiems vartotojams, bet nepriskiriame jam Google pažado.
- [Google updates](https://developers.google.com/search/updates): FAQ rich result neberodomas nuo 2026-05-07. DUK kuriami skaitytojui, jų schema netampa šio plano augimo priklausomybe. Tai aktualumo pataisa prieš senesnius SEO patarimus.
- [LocalBusiness](https://developers.google.com/search/docs/appearance/structured-data/local-business), [reviews](https://developers.google.com/search/docs/appearance/structured-data/review-snippet), [BeautySalon](https://schema.org/BeautySalon) ir [ItemList](https://schema.org/ItemList): realus teikėjas, operatorius ir katalogo sąrašas turi atskirus objektus. Tikros trečiųjų teikėjų platformoje renkamos reviews gali būti tinkamos, kai įgyvendinta ir laikomasi gairių; ne importuotos / dummy ar mūsų operatoriaus self-serving žvaigždės.
- [OpenAI crawlers](https://developers.openai.com/api/docs/bots): paieškos ir mokymo prieiga skirtinga. Viešo katalogo paieškos bot leidimas nėra privatus klientų / kalendorių eksportas.

## Matavimas 2026-10-05

[Naujesnis Google Search generative AI performance dokumentas](https://support.google.com/webmasters/answer/16984139) aprašo atskirą impressions report; jame nurodytas 2026-08-31 worldwide rollout, taip pat likusios matomumo / mažo duomenų kiekio pastabos. Tai naujesnė matavimo informacija už AI features puslapio bendro Web report tekstą. Mūsų paskyros funkcijos ir duomenys lieka nepatikrinti. Įprasti Search clicks ir inquiries / confirmed / completed events vertinami atskirai; AI impressions nėra konversijos.

[Bing oficialus AI Performance public preview pristatymas](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/) aprašo citations ir grounding queries. Tikslus mūsų paskyros šiandienos prieinamumas nežinomas. Bing help puslapiai grąžino tik shell, todėl jų full-body teiginių nevertiname patikrintais.

## Dar nežinoma

Patvirtintų mūsų specialistų skaičius, jų kainos / vietos / kalendoriai, keyword volumes, GSC indexing, realios AI citatos, live hosting ir backend. Demo prototipas gali parodyti visą taksonomiją bei kelių miestų eigą; public rollout turi atskirą tikros pasiūlos vartą. Pirmas tikras tiekėjų segmentas lieka BUSINESS hipotezė, ne užsakymas tuoj pat indeksuoti visą šalį.

## Rezultatai

[SEO/GEO planas](../../sites/madbeauty/SEO_GEO_PLAN.md), [privataus prototipo roadmap](../../sites/madbeauty/PROTOTYPE_ROADMAP.md), [machine-readable URL politika](../../sites/madbeauty/URL_POLICY.json). Bendrų skills / runtime / SEO schemų šiame langelyje nekeičiame: šios marketplace ypatybės per-nišos; bendras techninis pagrindas nekeičiamas dokumentų kopijomis.
