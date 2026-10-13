# Patvirtinto homepage integracija · 2026-10-13

Savininkas šioje sesijoje nurodė tęsti kartu su homepage prototipo sesija. Šaltinis: jos atrinktas `memory-casting-share-20261013/site` paketas ir atskiras viešas demo. Integracija nekeičia demo Worker, reklamų studijos, kitų agentų failų ar prekybos backend.

Apimtis: lietuviškas homepage, prototipo kompozicija ir animacijos, tikri patvirtinti produktų URL, esamas krepšelis, keturių kalbų perjungimas ir SEO. PL/LV/ET esamų patvirtintų tekstų bei kitų puslapių dizainas tęsiamas kitame etape. Naujas filmas negeneruojamas.

## Patikros ir pataisų planas

- [x] Peržiūrėti tikrą prototipo ir dabartinio homepage vaizdą bei visą HTML/CSS/JS; suderinti failų atsakomybę su prototipo sesija.
- [ ] Perkelti tik atrinktus viešus assetus, išlaikyti tikrus filmų ir šriftų baitus, licenciją ir kilmę.
- [ ] Izoliuoti Manrope400/600, spalvas, elementų stilius ir animacijų klases į homepage root. Hero/display iki80px, skyrių antraštės34–57px; body15–16px, navigacija/valdikliai14px, antrinės etiketės14px. Saugoti teksto didinimą, LT ženklus, kontrastą ir skaitymo plotį.
- [ ] Perkelti patvirtinto prototipo pasakojimą per oficialią Studio redakcinę versiją; pataisyti nepatvirtintą vienodą rinkinių sudėtį ir dažų įtraukimą. Išlaikyti ankstesnę naudingą rinkinių informaciją, originalų SEO title/description, nuorodas ir datas. Pavyzdinių atsiliepimų nelaikyti tikrais ir nedėti Review/AggregateRating schema.
- [ ] React mount/unmount nutraukia listenerius, rAF, observer ir video; be JS/judesio arba su video klaida lieka visos šešios proceso iliustracijos ir tekstai.
- [ ] Tikras filmų Range206, baitų palyginimas, suffix/neteisingas intervalas; Worker nebuferiuoja viso MP4 į atmintį.
- [ ] Desktop/mobile/320reflow, 200% teksto didinimas ir spacing override, forward/reverse dekoduoti kadrai, produktų CTA, krepšelis, kalbos, grįžimas į homepage ir vienas valdiklis.
- [ ] TS/build/core/SEO HTTP, dokumentuotos ribos, saugos skenas ir scoped Git perdavimas į esamus PR101/31. Visos svetainės ar produkcijos užbaigimas iš šios integracijos neišplaukia.

Prototipo hero bei galerijos iliustracijos ir video yra vizualinis pasakojimas, ne tikrų klientų projektų, neaprašytų rinkinio savybių ar saugumo įrodymas. Nauja lifestyle-v3 foto neįtraukiama, nes jai dar nepaskirta sekcija.

## Vietinis rezultatas · 2026-10-13

HOMEPAGE_LOCAL_INTEGRATED, peržiūra http://127.0.0.1:8817/. Oficialus Studio leidinys7b65db24-896c-486d-b049-40ce9ccabb9d, SHA256 3b350683681814d4a1fb130f6f9bdb5761de89eb7fb97b2663de75ca92a7ef14. Tik LT homepage papildytas42pasakojimo blokais. Visi87kiti puslapiai, originalūs home title/description/media/links/publishAt ir ankstesnis naudingas body tiksliai išsaugoti. Runtime video klaidos frazė neįtraukta į nuolatinį SEO/LLM body.

19 atrinktų dizaino failų turi siaurą SHA/dydžio manifestą ir nekeičia172WebP turinio inventoriaus. Originalūs MP4 turi8587634 ir3668917baitų. FontTools patvirtino tikrus Manrope400/600svorius ir visus18tikrintų LT ženklų, OFL išsaugota. Assetai reikalauja bendros eligible projekcijos, exact homepage pasakojimo, Memocasting domeno ir manifestui priklausančio kelio. Būsima/atšaukta/pakeista revizija arba svetimas domenas jų neatveria.

Prototipo sesija nepriklausomai peržiūrėjo JS/CSS valymą ir izoliavimą. Jos320pxradinys patvirtintas DOM: prieš pataisą cart right334.24px, nors document overflow0. Po pataisos right294px, dockscrollWidth291 prie292.67px, visi5matomi valdikliai44pxaukščio. Iki350pxGalerija pasiekiama poraštėje; nuo351pxlieka keturios dock nuorodos. CSS detektorius prieš ir po pataisos grąžino[], tai nėra WCAG/dizaino sertifikatas.

Tikra CUA patikra: desktop1440×900video15.2389→apie5.04s, mobile390×844video15.2176→5.0576s; readyState4 ir faktiškai skirtingi dekoduoti kadrai.320/390reflow, judesio išjungimas(video src pašalintas,6matomi etapai,0inert chapter), abu produkto CTA ir jų įjungti bazinio rinkinio pirkimo mygtukai, native tuščias cart/katalogo CTA, PL→LV→ET→LT ir vienas homepage root/motion valdiklis, pavyzdžių karuselė bei DUK patikrinti. Ši patikra užsakymų ar klientų duomenų nekuria.

Companion įrodymai: output/homepage-browser.private.json, desktop/mobile/320/forward/reverse/FAQ PNG, output/homepage-http.private.json ir output/homepage-all-seo-smoke.private.json; core qa/homepage-fonts.private.json bei oficialaus leidinio kvitas. Tai emuliuoti viewportai, ne fizinis telefonas.200%browserzoom, user text-spacing ir OSreduced-motion kontrolė šiame API nepalaikomi: UNVERIFIED. Video-error šaka peržiūrėta kode; šešių etapų fallback išbandytas judesio mygtuku, ne sugadinto tinklo bandymu.

88 PUBLIC testai, TypeScript ir10paketų buildPASS.42nativeHTTPužklausos tikrina19exactassetų, abu filmus206pradžią/vidurį/suffix,416/HEAD/If-Range,405ir svetimų domenų404. Kai kuriems206preview grąžina chunked beContent-Length: tikri1024baitai, Content-Range ir Accept-Ranges palyginti; pradinis griežtas header assertion išsaugotas. Filmas nebuferiuojamas įWorkeratmintį, fixed-lengthpipe perduodamas runtimewaitUntil pagal [Cloudflare gyvavimo sutartį](https://developers.cloudflare.com/workers/runtime-apis/context/#waituntil).

103SEOHTTP PASS,88pasiekiami/84indexable/24gidai; visų10nišų smokePASS.267bendroverifierHTTPnerado render problemų. Visos svetainės būsena tebėra NOT_COMPLETE dėl istorinio A–Z audito paketo nesutapimo ir likusių local audito vartų. Istoriniai audit hash/PASS nepakeisti. Lighthouse, gyvas SMTP, legal/provideriai irproduction priėmimas nėra šio kvito rezultatas.

Vietinis workerd nutrauktų media užklausų metu dar registravo opaque internal error nuorodas.42tikslių HTTPužklausų ir video kadrų patikros praėjo; pipeline gyvavimas sutvarkytas ir runtime patikrintas. Likę native preview logai nėra paskelbti pašalintais ar production hosting priėmimu. Originalūs gedimų įrodymai saugomi, vendor runtime neatnaujintas.

Upgrade upgrade-6eb97665-26f6-494a-9e86-014e7329ff97, esami draft PR101/31. Jokio main merge, DNS/deployment, mokamo generavimo ar backend/SDK/DB pakeitimo. Platesnis kitų puslapių dizainas tęsiamas po šio homepage.
