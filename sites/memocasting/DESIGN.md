# Memocasting vizualinė sistema

2026-10-13 vėlesnis savininko Egeon pavedimas: [hero ir storytelling tęsinys](HERO_STORYTELLING_2026_10_13.md). Naujas atitolintas viso ekrano hero, žodžių scroll reveal, full-width filmas ir šešių etapų timeline; pašalintas desktop aukščio651px ribojimas. Leidinys75ebcfb3, SHA2567a3251b32d44501c888c566d5c8da4f664075968c7ba43ad766d39212aef7361;24 dizaino assetai. Toliau pateikti kvitai yra ankstesni etapai.


Aktualus 2026-10-13 LT homepage turi 11 įgyvendintų sekcijų. Išlaikoma savininko pasirinkta Memory Casting tapatybė: Manrope 400/600, balta / šiltas neutralus fonas / rožinis akcentas. Vėlesnis savininko screenshot nustato hero mastelį: antraštė iki58px, visas produktas matomas iš toliau, ramūs tekstiniai CTA ir daugiau erdvės prieš dock. H2 iki48px, closing iki64px, body16px / hero15px desktop ir16px mobile, kontrolės14–15px. Finite scroll filmas dabar trečioje sekcijoje, tamsi skulptūrų scena ketvirtoje; [įgyvendinimas ir patikros](HOMEPAGE_IMPLEMENTATION_2026_10_13.md). [Pradinio prototipo integravimo istorija](HOMEPAGE_INTEGRATION.md). Žemiau esanti kontaktinio lapo sistema tebėra kitų puslapių laikinas dizainas.

Naujas savininko pavedimas: pirmiausia pilnai suplanuoti homepage. [10 sekcijų išdėstymas, trūkstamos medžiagos, Awwwards tyrimas ir 3D pritaikymas](HOMEPAGE_PLAN.md), [vietinės studijos šaltinis](homepage-study/index.html). Planavimo kvitas išlaikomas kaip ankstesnio etapo istorija; jo 10 sekcijų studija nėra aktualus 11 sekcijų rendereris. Tamsi būsimos skulptūrų vitrinos sekcija papildo pasirinktą tapatybę.

2026-10-12. Agentas renkasi autonomiškai pagal savininko perdavimą. Bendro tinklo maketai nėra šios parduotuvės tapatybė.

## Krypties atranka
Septynios pagrįstos kryptys: (1) poros prisiminimų albumas, (2) šiuolaikinė gipso dirbtuvė, (3) dovanų laiškas, (4) namų galerija, (5) bendro vakaro stalas, (6) fotografijos kontaktinis lapas, (7) rankų gestų teatro programa. Impeccable seed be5391af paskyrė šeštą. Pasirinkimas: fotografijos kontaktinis lapas — stambi viena akimirka, greta lakoniški rinkinio pasirinkimai, žemiau nuoseklus klausimų ir atsakymų ritmas. Vidiniai puslapiai išlaiko lapo kraštus, atvirus tekstų blokus ir aiškų skaitymo plotį; checkout ramus ir praktiškas.

Rietveld challenger atmestas: spalvotos judančios plokštumos silpnina dovanos emociją ir stabilų pasirinkimą; perimama aiški kiekvieno valdiklio paskirtis. Emigre/teletext atmesti: bitmap tekstas prastina ilgo LT skaitymo ir produkto aiškumą; perimama tik stipri tipografinė hierarchija. Provenance ribbon artima tikrų faktų skaidrumui, tačiau archyvinė istorija ne mūsų parduotuvės pagrindinis darbas; perimama aiški patvirtinto ir nežinomo duomens skirtis. Likę challengers nėra kopijuojami. Tai agento pasirinkimas, ne savininko ar nepriklausomo dizainerio approval.

## Tyrimo įtaka
CreativeDeco PL instrukcija apžiūrėta desktop1265 ir mobile390: tema, turinio nuorodos ir nuoseklūs vaizdai padeda orientuotis; didelis universalus meniu ir mobilus reviews overlay uždengia skaitymą. Pritaikyti kompaktišką navigaciją, aiškų straipsnio turinį, atmesti review lipduką ir svetimas proporcijas. Loovuspood EE produkto desktop1440/mobile390: produkto kaina ir pirkimas šalia vaizdo aiškūs desktop; mobile kategorijų sidebar nukelia produktą žemyn. Pritaikyti du tikrus variantus ir kainą, atmesti sidebar. Memorycasting.lt savininko ankstesnis briefas naudotas kaip klausimų inventorius, ne įrodymas apie atsiliepimus/saugą. Visų šaltinių retrieval2026-10-12; konkurentų teiginiai nepaversti Memo faktais. LT video URL web retrieval502 — ne vadinti apžiūrėtu. Tinklo artimiausių Akmenas/Auksarankiams faktinė screenshot peržiūra ir naujų studijų palyginimas dar privalomi prieš galutinį craft priėmimą.

## Tokenai ir tekstų vaidmenys
Šviesus popierius #fbf8f3, pagrindinis rašalas #302923, prislopintas tekstas #67584d, šiltas akcentas #97452f, neutralus paviršius #eee5da. Vientisas tamsus akcentas mygtukams, be gradientų. Display: savarankiškai hostintas OFL Newsreader regular iki4.75rem (Georgia fallback). Body: savarankiškai hostintas OFL Source Sans3 realūs400/600 svoriai1–1.125rem/1.65; headings1.5–2.5rem/1.15. Proza68ch. Kainos tabular numerals. Navigacija/mygtukai1rem, metadata0.9375rem. Focus3px akcentas+3px offset. Body niekada neblunka žemiau kontrasto ribos. Mobile320/390, tablet768, desktop1440; checkout lentelė reflow į įrašus. Atvira kompozicija, plonos skiriamosios linijos, jokio card kiekvienai pastraipai.

## Puslapių ir asetų planas
Homepage: asmeninis pažadas ir generuotas redakcinis susikibusių rankų fragmentas (3:2, center crop); du tikri rinkinių pasirinkimai be fiktyvios rinkinio foto; palyginimas; pasiruošimo kelias; gido įėjimai ir tikra įmonė. Produktas: patvirtinta komplektacija, kaina, poros dažų variantas, krepšelio veiksmas, instrukcijos/pagalbos nuorodos; responsive tikro produkto foto vieta laukia savininko, generuotas rinkinys jos nepakeičia. Catalog: dvi prekės, €32/€48, atskiras poros dažų variantas tik detail. Cart/checkout: serverio katalogas→quote→durable order→checkout, serverinės klaidos/empty/replay/token taisyklės. Gidai: peržiūrėtas vaizdas, H1, linked organization byline/datos/breadcrumbs, TOC, body, šaltiniai/ryšiai. Privacy/legal/contact: tekstiniai, be dekoratyvios foto.

Trys redakciniai bitmapai: gift (bendros veiklos dovana, negali vaizduoti Memo rinkinio), planning (datos ir susitarimas be išgalvoto delivery), comparison (nebranded rinkinys ar paruošta dovana, be netikros Memo prekės). Generavimo kilmė žurnale, ne „tikras klientas“; importas per bendrą saveResponsiveAsset. Tikri rinkinių masters atkeliauja vėliau ir bus atskirai peržiūrėti.

## Patikros planas
- [ ] Konceptų faktinis desktop/mobile palyginimas ir tinklo screenshots.
- [ ] Visi teksto vaidmenys, LT glyphs, loaded font/weights, wraps/measure/contrast.
- [ ] Homepage, catalog, product, guide/hub/profile, cart/checkout/status, contact/legal desktop/mobile.
- [ ] Keyboard, 320 reflow, 200% teksto didinimas ir spacing override.
- [ ] Faktinis HTTP/DOM/source/publication priėmimas; detector vienas final skenavimas, meaningful fixes ir confirmation.

## Atliktas 2026-10-12 perėjimas
Faktiškai peržiūrėti Akmenas c-desktop ir Auksarankiams studies-handyman c-desktop kaip saugotos konceptų studijos, ne dabartinės produkcijos įrodymas. Akmenas remiasi poreikio klausimais prieš užklausą; Auksarankiams plataus paveikslo ir darbų registravimo ritmu. Memo turi produkto pasirinkimą, native cart/order eigą, turinio lapo vaizdus ir mažą širdies mark. Pilnas mobile/final-network bei alternatyvių Memo konceptų palyginimas vis dar neatliktas; jo PASS nėra.

17pradinių puslapių tikras desktop/mobile DOM, naujų3gidų+indekso320/390/768/1440px metrikos be overflow. Peržiūrėti apdailos/džiovinimo/pagalbos teminiai bitmapai ir konkretūs mobilūs vaizdai. Faktinio200%zoom ir text-spacing override įrodymo nėra. Native screenshot kelias naudotas po CDPfullPage delsos; screenshot grąžinamų failų apimtis ir tool preview skyrėsi, todėl nekuriamas fiktyvus visas-state screenshot PASS.

Lighthouse13.5.0: home90 ir apdailos gidas94performance, kitose kategorijose100. GidoCLS0,1101 susijęs su heading/font pasikeitimu, likęs matavimo apribojimas. Detector failų scan confirmation JSON[]; jis neatstoja pastraipų skaitymo ar WCAG. Tikrų prekių foto vietos tebėra aiškūs placeholderiai pagal savininko išimtį.

## Aktualus kalbinių versijų tekstų patikros planas · 2026-10-12
Dizaino krypties pasirinkimas savininko atidėtas. Šis etapas tikrina 88 puslapių įskaitomumą ir veikimą esamoje sistemoje, nepatvirtina galutinės tapatybės.
- [x] FontTools faktiškai perskaitė penkių WOFF2 metaduomenis: Newsreader400 static; Source Sans3 tikra wght200–900 ašis. Abiejų Sans unicode šeimų junginys ir Newsreader turi visus LT/PL/LV/ET reikalingus tikrintus ženklus.
- [ ] Deklaruoti tikrą Sans svorių diapazoną vienoje šeimoje; pašalinti dubliuotas svorių deklaracijas ir sintetinio logo kursyvo poreikį. Originalūs fontų baitai/licencijos nepakeičiami.
- [ ] Dabartinis 320/390/768/1440 reflow, visos keturios kalbos, mygtukai/checkbox/formos, gids/autorius/datos/šaltiniai/footer. Atskirai tikra 200% zoom ir text-spacing patikra; bandymas nepaverčiamas PASS, jei mechanizmas neveikia.

2026-10-13 aktuali homepage iteracija: [kompaktiško filmo ir vaizdų rinkinio priėmimas](ASSET_KIT_2026_10_13.md), [3D tyrimas](3D_MODEL_RESEARCH_2026_10_13.md). Official release60c80be9, exact63 design assets;98tests/TS/build/86HTTP/88pageSEO ir actual desktop/mobile PASS. Upgrade-6ea0a7d2-e1c7-4bee-8c3e-434858238d70. Ankstesni priėmimai lieka istorija; main/production adoption neteigiama.

2026-10-13 right-film refinement plan: preserve Manrope/type sizes/copy and compact six-stage rail; move desktop film to right ~62% with full-frame contain, stronger edge feather and lighter grayscale. Text left30% on white, no overlap. Verify desktop1280x630 all stage captions, tablet and mobile manual view; retain verified wheel smoothing. PNG/video source and official content unchanged.

2026-10-13 moment choices plan: replace kit preparation photo in meaning section with selected pair/family/gift scene. Preserve current smaller Manrope headings, three buttons, paragraphs/CTA and semantic source. Responsive4:3 photography, no image distortion/crop; photo swaps together with panel, mild250ms opacity transition disabled for reduced motion. Verify all three selections, return, mobile320, image load failure and no-JS text/image fallback. No additional detail/3D controls in this interim photo integration.
