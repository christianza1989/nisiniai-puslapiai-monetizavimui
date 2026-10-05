# Madbeauty: naudingi straipsniai ir paslaugų / filtrų ryšiai

2026-10-05. Savininko patikslinimas: straipsnyje, pvz. „Kaip išsirinkti nagų spalvą“, CTA atidaro tinkamą nagų meistrų filtrų / katalogo puslapį. Planas apima originalų naudingą atsakymą, turinio klasterį, katalogo ryšius ir būsimą automatizuotą publikavimą. Runtime ir straipsniai dar neįgyvendinti. [SEO planas](SEO_GEO_PLAN.md), [machine-readable turinio kandidatai](CONTENT_MAP.json).

## Vienas straipsnis — vienas klausimas ir prasmingas kitas žingsnis

„Kaip išsirinkti nagų spalvą“ pirmiausia turi padėti pasirinkti spalvą: norimas efektas, nagų ilgis / forma, aprangos ar progos kontekstas, priežiūros / ataugimo kompromisai, keli originalūs aiškiai iliustraciniai spalvų deriniai. Ne užpildyti puslapį „geriausi meistrai Vilniuje“ kartojimu ir ne pažadėti biologinių rezultatų.

Šio straipsnio pagrindinė paslauga — manikiūras; skyrius apie gelinį lakavimą gali turėti tikslesnę nuorodą į gelinio lakavimo katalogą. Spalva pati savaime nėra garantuotas specialisto kvalifikacijos ar laiko filtras: specialisto siūloma technika / stiliaus tag turi egzistuoti patvirtintame modelyje ir būti pagrįstas jo pasiūla / darbais. AI negali sugalvoti „visi šie meistrai daro prancūzišką“ iš vieno generuoto vaizdo.

Naudingas CTA pavyzdys: „Rasti manikiūro meistrą“. Jei skaitytojas pasirinko Vilnių ir tas katalogas public eligible → `/paslaugos/manikiuras/vilnius/`. Jei miestas nepasirinktas → paslaugos hub su vietos pasirinkimu, ne tylus default Vilnius. „Patikrinti laisvus laikus“ galimas tik priėmus realų availability ir paslaugos variantą; į F1 straipsnį neįdėti fiktyvaus instant booking pažado.

## Kaip straipsnio link plan laikomas duomenyse

Kiekvienas straipsnio planas turi articleId, canonicalPath, intent, clusterId, primaryServiceId, pasirinktinus secondaryServiceIds, katalogo ryšio priežastį, CTA action tipą, cityContext strategiją, fallback, media brief, šaltinių klausimus ir publikavimo priklausomybes. Konkretūs prototipo kandidatai [CONTENT_MAP.json](CONTENT_MAP.json). Tai per-nišos planavimo formatas, ne papildyti dabartinės content-package schemos laukai be bendros migracijos.

CTA target nėra agento laisvai sukurta URL eilutė. Resolveris iš tikrų service / city / district / catalog ID randa registruotą canonical; target turi būti patvirtintas, po publishAt, to paties site ir actual deployment eligible. Jei planuojamas katalogas dar nepublic, nuoroda nepublikuojama kaip gyvas tikslas. Agentas neperžiūri target būsimo puslapio vien pagal savo tekstinę nuojautą.

| Situacija | Kas rodoma / atsidaro |
|---|---|
| Straipsnis apie spalvą, miestas nežinomas | Tikras manikiūro service hub ir miesto pasirinkimas; CTA „Rasti manikiūro meistrą“ |
| Tas pats straipsnis, pasirinktas Vilnius, katalogas gyvas | Manikiūro Vilniuje katalogas; skaitytojas iškart mato tikrus tos paslaugos teikėjus |
| Žinomas miestas / data, accepted availability yra | Stabilus service/city URL su datų / valandų hash būsena; visa procedūros trukmė tikrinama pagal variantą |
| Teikėjai turi profilius be Madbeauty kalendoriaus | Katalogas ir tikras inquiry / external booking, jokių „laisvas šiandien“ fiktyvių laikų |
| Miestas dar neturi public eligible katalogo | Kitas tikras service hub arba skaidrus priešpaleidiminis poreikio kelias, jei jis iš tikrųjų priimtas; ne fictional list |
| Service hub taip pat dar nepublic | Nėra neegzistuojančio CTA; publication gali laukti dependency arba rodyti atskirai priimtą realų kontaktą. Preview gali demonstruoti mock target, bet visas private noindex |
| Katalogas / profilis revoked | Nuoroda nebepateikiama pagal vieną projekciją; likęs straipsnis nesiremia pašalintu provider kaip dabartiniu faktu |

Skaitytojo miesto pasirinkimas aiškus ir keičiamas; nespėjamas iš autoriaus miesto / IP. Selection state gali išlikti naršyklėje be PII pagal paskelbtą privatumo sutartį. Indexable straipsnio H1, body ir canonical nekuria URL kiekvienam lankytojo miesto pasirinkimui. Dinaminis CTA nepakeičia redakcinio straipsnio esmės.

## Nuorodų grafas

- Paslaugos hub → eligible city katalogai + tikri skirtingų klausimų gidai.
- Miesto hub → tikri tame mieste esantys service katalogai.
- Service/city katalogas → to sąrašo tikri profiliai + 1–keli konkretų pasirinkimą padedantys gidai, ne visa blog siena.
- Profilis → tikros jo paslaugos / vieta; related guide tik jei aktualus pasiruošimui. Ne kopijuoti visą gido tekstą kiekviename profilyje.
- Gidas → vienas pagrindinis service target, prasmingi variantų / susijusių klausimų ryšiai ir keli konkretūs realūs city target tik kai gidas turi vietinį klausimą. Nėra privalomo nuorodų skaičiaus ar visų miestų footer.
- Klasterio indeksas → originalūs gidai / service hub. Breadcrumbs yra kategorijų kelias, ne automatinis visų pasiūlytų temų parent.

Gidų skaičius negali pakeisti catalogue pasirinkimo. Katalogo lankytojas mato teikėjus pirmiausia; gido skaitytojas mato atsakymą pirmiausia. Vieno pobūdžio „kaip pasirinkti“ tekstas netampa atskiru puslapiu su kiekvieno miesto vardu.

## Straipsnio pilna struktūra

Aiškus H1; trumpas atsakymas; temas atitinkantis peržiūrėtas image; autoriaus / redakcijos atribucija ir tikros datos; naudingi skyriai, palyginimas / pasirinkimo lentelė / konkrečios originalios iliustracijos; natūrali contextual service nuoroda tada, kai ji padeda apsispręsti; aiškus galutinis CTA; keli related questions; tikrai panaudoti išoriniai šaltiniai; footer ir trust kelias.

Nėra automatinio „3 internal + 2 external + CTA kas 300 žodžių“ recepto. Spalvų pasirinkimo gidas gali remtis originaliomis iliustracijomis ir praktine pasirinkimo struktūra be dirbtinių išorinių faktų citatų. Sveikatos / higienos / technikos teiginiui reikia konkretaus patikrinto pirminio šaltinio. Konkurentas gali būti pasiūlos tyrimo šaltinis, bet ne mūsų teikėjo paslaugos / kvalifikacijos / sveikatos teiginio įrodymas.

External link turi padėti skaitytojui ir pagrįsti named claim; URL realiai atvertas, source date / scope privačiame žurnale. Mokamai / affiliate nuorodai atitinkamas sponsored žymėjimas tik jei tokia tikrai atsiranda. Nuosavo tinklo nuoroda tik pagal NETWORK_LINKING ir aktualų klausimą, ne manipuliacinis all-to-all.

## Vaizdai ir useful content

Kiekvienas pirmas gidas turi ne tik cover, bet ir visus atsakymui reikalingus originalius assets. Spalvų gide naudinga paletės / nagų stiliaus iliustracija ir aiški pasirinkimo lentelė; vien graži atsitiktinė buteliukų nuotrauka neatsako į klausimą. Kilmė / prompt / teisės saugomos, assets importuojami MEDIA_CORE WebP/srcset/sizes. Article image = actual matomas temos vaizdas; gidų kortelė naudoja tą pačią kompozicijų šeimą.

AI sugeneruoti spalvų / stiliaus pavyzdžiai yra redakcinės iliustracijos, ne realaus meistro portfolio. Tikro teikėjo galimybių neišvedame iš tokių vaizdų. Jokių ImageGen badge prie kiekvieno asset; redakcinėje metodikoje sąžiningai aprašyta kilmė.

## Planavimo ir publikavimo procesas

1. Agentas skaito šį planą, niche-content-planner, BUSINESS ir actual public service/city/provider registry.
2. Atrenka skirtingas reader intencijas, prioritizuoja realią pasiūlą ir pirkėjo neaiškumą; CONTENT_MAP kandidatai ne garantuotas live kalendorius.
3. Sudaro brief su klausimu, originalia nauda, reikalingais faktais, media ir service / link dependencies. Datą parenka pagal faktinį stage / sezoną; švenčių ar sezonų datos tikrinamos, ne pritempiamos visoms temoms.
4. Generuoja tekstą ir visus reikalingus assets, peržiūri klausimo atsakymą, faktus, target ir išorinius šaltinius, praktinį CTA bei schema.
5. Patvirtina konkrečią nepakitusią reviziją; public publication pagal core hash / publishAt / domain / deployment vartus. Future target neatsidengia vien todėl, kad gide jam sukurta nuoroda.
6. Content-studio kalendoriuje planuojamas įrašas rodo cluster, service, katalogo target, CTA, datą ir link status (planned / eligible / blocked / revoked), draft atidaromas privačiai. Esamų studijos laukų papildymas yra būsimas serializuotas implementation darbas; šiame plane GUI dar nepraplėstas.
7. Po realaus launch vertina skaitymo / gido → service click / qualified inquiry / completed visit kelią. Article skaitymas ar CTA click nėra realus klientas / mokėjimas.

## Priėmimas — PLANNED / NOT RUN

| ID | Ką būtina patikrinti |
|---|---|
| CL-01 | Visi pradiniai gidai turi skirtingą intent, originalią naudą, peržiūrėtą pilną image ir pilną actual article layout |
| CL-02 | CTA renkasi pagal tikrą serviceId ir katalogo registry, ne LLM įrašytą neegzistuojantį slug |
| CL-03 | Nežinomas miestas / pasirinktas miestas / nepalaikomas rajonas turi teisingą matomą fallback |
| CL-04 | Data / laikas išlieka hash būsena; nekuria indexable article ar filter kopijos |
| CL-05 | Nepublikuotas / future / revoked target negali ištekėti į body, CTA, sitemap ar LLM related links |
| CL-06 | CTA pažadas atitinka accepted runtime: F1 inquiry / external booking vs F2 check availability |
| CL-07 | Katalogas ir gidas turi tinkamas reciprocal discovery nuorodas, nėra orphans, nuorodų kvotos ar visų miestų sienos |
| CL-08 | Image ir service / style assertions nemeluoja apie meistrų darbų / technikų galimybes |
| CL-09 | External sources yra actual claim evidence; visible Article/byline/dates/schema vienodi |
| CL-10 | Matavimas skiria link click, inquiry ir confirmed/completed visit; demo / PII neįeina į realius rezultatus |

Gera architektūra leidžia ryšius automatizuoti iš vieno šaltinio; „tobulai“ priimama pagal actual viso kelio testus, ne vien plano išsamumą.
