# Vidinių puslapių dizainas ir rinkinių pardavimo kelias

2026-10-13. Būsena: bendras vidinių puslapių dizainas, katalogas ir abu produktai įgyvendinti bei vietiškai patikrinti. Own CORE bazė59bd8758, PUBLIC bazėaf6dd17; abiejų fetched main aktualumas patvirtintas prieš darbą. Upgrade-b2f259c9-c52d-4b8a-b764-930e3b774489, esami PR101/31.

## Apimtis ir kryptis

Bendras ne-homepage shell, katalogas ir abu produktai visose keturiose esamose kalbinėse versijose. LT adresai: /ranku-liejimo-rinkiniai, /rinkinys-porai, /seimos-rinkinys. Kalbinių atitikmenų keliai ir publikavimo vartai išsaugomi. LT bespoke homepage, patvirtintas turinio paketas, originali schema ir backend nuosavybė lieka atskiri.

Savininko pasirinktas baltas / Manrope / tamsus tekstas / rožinis akcentas. Produktą rodyti su erdve aplink jį, santūriais šriftais ir aiškiu pirkimo bloku. Katalogas skirtas dviejų realių rinkinių palyginimui; filtrų tam nereikia. Dokumentinis turinys išlaiko skaitymo plotį, semantines antraštes ir faktų ribas. Scope yra šablonų įgyvendinimas; nėra pavedimo sukurti nepatvirtintus rinkinio receptus ar produkcijos siuntimo tarifus.

## Tekstų ir komponentų sistema

| Vaidmuo | Šriftas / svoris | Dydis ir leading | Paskirtis |
|---|---|---|---|
| H1 | Esamas MemoryManrope400 | 32–44px / 1.2 | Santūri, aiški produkto / puslapio tapatybė |
| H2 | MemoryManrope400 | 26–36px / 1.2 | Turinio skyriai |
| Body | MemoryManrope400 | 16px / 1.65, iki68ch | Instrukcijos, straipsniai, informacija |
| Navigacija / valdikliai | MemoryManrope400 | 14–16px / 1.35–1.65 | Bent44px pagrindiniai veiksmai |
| Kaina | MemoryManrope400 | 29–32px / 1.2 | Faktinis prekybos API rezultatas |
| Pasirinkimo suma | MemoryManrope600 | 15px / 1.65 | Tik galiojanti dabartinė konfigūracija |
| Caption / klaida | MemoryManrope400 | 14–15px / 1.6 | Aiškios vaizdo ir veiksmo ribos |

Balta #fff, ink#282526, muted#6b6360, rose#a24f68, surface#f7f6f4, line#e6e0dc. Shared font-face iš jau priimtos homepage šeimos; 400 ir600 turi atskirus realius failus. Forms/focus/selection/caret laikosi tos pačios sistemos. Mobilus header pakeičia ankstesnę273px būseną kompaktišku logotipo / krepšelio / native meniu išdėstymu. Meniu veikia ir be JS; kalbų nuorodos remiasi tikrais tos pačios paskirties puslapiais.

## Kompozicija ir interaktyvumas

Katalogas: H1 / įžanga → du vaizdai ir aiškios produktų nuorodos → native kainos bei būsenos → patvirtintos sudėties sąrašai → palyginimas → originali katalogo informacija → instrukcija / pristatymas / grąžinimas / pagalba.

Produktas: breadcrumb → vienas H1 → desktop galerija kairėje / pirkimas dešinėje; telefone H1, galerija, pirkimas → semantinių skyrių nuorodos → visas originalus turinys / papildomo pagrindo vaizdas → proceso pagalbos nuorodos ir susiję gidai.

Galerija grupuoja esamo patvirtinto media variantus pagal kompoziciją, nekeičia vaizdo kilmės ar komplektacijos. Thumbnail keičia pasirinktą vaizdą; native dialogas leidžia priartinti1–3, tempti ribose, grąžinti vaizdą ir valdyti klaviatūra. Loading/error/retry, Escape/backdrop/focus grįžimas ir motion-off tikrinami. Tai nuotraukų galerija; realus3D lieka būsimas GLB žingsnis. Esamų savininko nuotraukų 533/400px kokybė nepaverčiama tariama didelės raiškos nuotrauka.

MemoAdd išsaugo native eligibility ir krepšelio SKU/kiekius. Nauja rodoma pasirinkimo suma skaičiuojama tik iš galiojančio native katalogo, tikros rinkos valiutos, tinkamų priedų ir galimo kiekio. Galutinę kainą / pristatymą / likutį patikrina serveris. Priedai be stock/prices/package/addonFor nepasirenkami. Kataloge native kaina turi loading/unavailable/error/retry; originalus aprašas išlieka informaciniame details.

## Shopo suderinimas

Sesija „Įvertinti Shopify alternatyvą“ patvirtino SDK0.12.1, markets.markets formatą, MemoAdd ir mountCheckout išlaikymą. Vietinis backend8827 naudoja esamą sandbox/testOnly DB ir visus providersOFF; katalogo neperkurti. Šiame fixture dažų / pagrindo nėra — jų mygtukai lieka nepasirenkami. Frontend vietinis transportas nukreipiamas iš8797 į8827, išsaugant kitus privačios konfigūracijos laukus. Netikrinti realiais pirkėjų duomenimis ar tikrais mokėjimais.

## Priėmimo planas

- [x] TS / prasminga total/media regresija / visi PUBLIC testai / build.
- [x] Abu produktai, katalogas ir bent vienas bendro shell informacinis puslapis: desktop1280, tablet768, mobile320.
- [x] Header/menu/language/cart ir galerijos selection/modal/zoom/pan/reset/focus/keyboard/error/retry.
- [x] Pirkimo kiekis, disabled priedai, API error/retry, abu SKU → cart → kiekis → reload / tuščia būsena; sandbox konteksto patikra.
- [x] Ilgesnė kalba, realūs 400/600 šriftai, diakritiniai ženklai ir 320 px reflow.
- [ ] Tikras 200 % naršyklės mastelis ir naudotojo text-spacing override: UNVERIFIED, šios IAB valdymo galimybės jų nepatvirtino.
- [x] 88 puslapių SEO, schema/current canonical/hreflang/301 ir oficialaus paketo SHA išsaugojimas.
- [x] Mechaninis detector po actual pirmos apžiūros; vienas bendras pataisų paketas ir konkrečių defektų patvirtinimas.

Patikrinti taikomi scenarijai; tikro200% naršyklės mastelio ir user text-spacing patikra lieka UNVERIFIED dėl šios IAB kontrolės ribų. 320px reflow, realūs400/600 šriftai ir diakritiniai ženklai patikrinti. Tai nėra WCAG sertifikavimas.

## Galutinis kvitas

105 testai, TS, scoped ESLint, production build,88-page SEO smoke ir103 SEOHTTP patikros PASS. Oficialus paketas nepakito: 983ec0c06cb3dd59d28002aeffc3a73f5d7f0bea6520eea74a27ff6ae9da07cf. 12 pardavimo URL keturiomis kalbomis naudoja naują šabloną, bendras shell taikomas kitiems vidiniams puslapiams; LT bespoke homepage išlaikytas.

Actual CUA: desktop produktas/katalogas,768px pora,320px šeima/katalogo palyginimas/kontaktai ir lenkiškas šeimos produktas. Header aukštis320px nuo273 iki72.7px; tikrintuose vaizduose horizontalios išklotinės nėra. Mobilus pirkimo veiksmas su native suma visada pasiekiamas; nekeičia originalaus submit kelio. Pataisytas kiekio validacijos pranešimas ir siauras palyginimas.

Abu SKU→cart, kiekio pakeitimas/reload,84.50EUR serverio testinė suma, vienas sintetinis order, disabled mokėjimas, atkūrimas/reload ir naujo užsakymo tuščiascart patvirtinti. Nepaliesti ankstesni7order, DB/SDK/backend kodas; pridėtas tik vienas autorizuotas sintetinis testinis užsakymas. Native priedai išjungti pagal tikrą fixture eligibility. API klaida/retry ir media klaida/retry patikrinti tikrai laikinai sustabdžius nuosavus procesus; sėkmingai atkurti. Galerijos pan130px/90px,1–3zoom/reset/Escape/focus patvirtinti; originali nuotraukų raiška nepagerinta fiktyviai.

Shopo sesija patvirtino sąsajas ir peržiūrėjo launcherį; papildomas shippingQuotesConnected=false guard įgyvendintas ir nepriklausomai unit patikrintas kartu su kitų flags atmetimu. Standartinė.dev.vars turi būti šalia dist/server/wrangler.json; root failo ir --env-file prielaidos workerbindings neprijungė. Tiesioginius CLI --var overrides atmetė automatinė patikra be priežasties detalės; standard config kelias sėkmingai patikrintas išlaikant Host/sandbox apsaugas.

Pradinis build bandymas, kol nuosavas Wrangler laikėdist, grąžinoEPERM. Sustabdžius tik savo preview procesą build sėkmingas. Žinomi framework warnings apie kitų nišų CSS/chunk dydžius išsaugoti privačiuose buildlog; jų nelaikome naujo dizaino našumo rezultatu. Detector nurodė0 radinių; mechaninis skenas nepakeičia actual UI įrodymo.

[Struktūrinis priėmimo kvitas](STOREFRONT_2026_10_13.json). Screenshot failai ir raw UI/HTTP / testinių order duomenys laikomi tik vietiniame qa/output, ne viešame pakete ar Git. Tikras200% zoom, user text-spacing ir fizinis pinch nepatvirtinti; nėra pilno WCAG/production/SEO pozicijų pažado.

## Atkuriamas vietinis paleidimas

Pirma CORE freshness wrapper paleisti sites/memocasting/local-commerce-07.mjs; jis naudoja esamą8827sandboxDB ir jos neperkuria. Tada po PUBLIC build CORE vykdyti:

node scripts/git-freshness.mjs --phase continue --companion ../dovanos-memorycasting -- node sites/memocasting/start-frontend-preview.mjs

Launcheris tikrina sandbox/testOnly bei payment/shipping/shippingQuotes/production/Offers OFF, pakeičia tik2 vietines bindings built config kataloge ir paleidžia8817loopback. Po kiekvieno build jis vėl sukuria teisingą privataus var failo vietą. Produkcijos iš šio kelio neaktyvuoja.
