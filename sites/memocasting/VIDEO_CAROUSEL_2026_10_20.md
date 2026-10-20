# Savininko video karuselė

Savininkas pakeitė Instagram collab prijungimą į vietinių video karuselę. Šaltiniai:23video pateiktame aplanke ir vienas papildomasMP4. Originalai lieka privatūs ir nepakeisti. Tai kūrimo akimirkos, ne patvirtinti atsiliepimai; išsaugomi originalūs autoriaus žymėjimai. Senų konkursų ar akcijų negalima pateikti kaip galiojančio pasiūlymo.

## Realizavimo ir tekstų patikros apimtis

- [ ]24unikalūs H264/AAC faststart failai be metaduomenų, kiekvienas mažesnis nei24MiB. Viršeliai iš tikrų kadrų per bendrą responsiveWebP importerį, be didinimo virš šaltinio raiškos. Tikslus immutable asset manifest ir esamas homepage/host admission.
- [ ]Horizontali portretų juosta su daliniu kitu kadru, braukimu, pelės tempimu, klaviatūra, rodyklėmis ir tikru pozicijos skaitikliu. Be automatinio slinkimo. Tik pasirinktas video gauna src. Native garsas, laiko juosta, fullscreen; sustabdymas išėjus iš matomos srities ar paslėpus tab.
- [ ]Esama Manrope400/600, offwhite#f8f7f5, ink#282625, pink#8b4560. H2iki48px/1.08, body16px/1.6/max50ch, pavadinimai16px/1.4, metadata/valdikliai14px/1.5, target44px. Kontrastinga trukmė ant tamsaus paviršiaus. Pastaba „Įrašuose minimi konkursai ir akcijos gali būti pasibaigę.“14px.
- [ ]Įkėlimo, klaidos/pakartojimo ir uždarymo būsenos, fokusas ir natūralus LT visų24pavadinimų/alt/valdiklių perskaitymas. Nativecontrols klaviatūros neperimti. Reducedmotion ir esamas judesio išjungimas.
- [ ]Tikri desktop/mobile390/320, kelių klipų paleidimas, navigacija ir vienas aktyvus player; asset/range/admission regresija, lint/types/build ir vienas finaldetector. Tikro zoom/spacing negautam mechanizmui PASS nepriskirti.
- [ ]Frontend-only productiondeploy, išsaugant actualbindings, native3367ef65/181pages/759media,22galerijosnuotraukas ir92straipsniųdatas. Commerce/DNS/paštas/DB nekeičiami. Ankstesnė frontend97678db4 versija lieka coderollback.

## Priimtas gyvas rezultatas

2026-10-20T08:12:03Z frontend versija `316f4de3-9d9a-4ea1-a99b-5642ba45e4aa` įjungta abiejuose esamuose custom domains. PUBLIC source `b5edd7cf9e635fa58a6c4eab684b475c74d7dd56` įkeltas į esamą PR31 šaką; main merge neatliktas. 24 unikalūs video ir 66 responsive WebP viršeliai (90 medijos failų, 215121584 baitai). Naujas atskirai pateiktas15sek. įrašas pirmas. Originalų vardai, failai ir hash žurnalas privatūs; svetainėje tik neutralūs nekintami pavadinimai, LT antraštės ir tikri kadrų alt tekstai.

Visi24H264, AAC ten, kur originalas turi garsą; trukmė išsaugota0,3sek. tikslumu. Kiekvienas mažesnis nei24MiB, moov priešmdat. Viršeliai nepadidinti virš360/720px šaltinio ir importuoti per bendrą studijos pipeline. Native content package neperrašytas: SHA256 `5a0183d6618e1388ca76deb8410f2ac63018791b4f11ee17cc604b3edb3dd95c`, release3367ef65,181pages/759native media,22galerijosnuotraukos ir92straipsniųdatos išsaugoti.

Viešas HTTP08:12:48Z: visi90HEAD200 su teisingu MIME/Content-Length; visi24video patikrinti pirmų ir paskutinių128baitų intervalais —48tikrų206 atsakymų, tikslūs vietiniai baitai. Neįtrauktas failas404, POST405, www308. Esami ASSETS/DB59b0f59f/MEMO_COMMERCE/MEMO_INSTAGRAM bindings bei observability prieš ir po sutapo. Commerce versija67d8fdd8, DB, DNS, paštas ir secrets nekeisti.

Tikra naršyklė: desktop1280, mobile390/320 be dokumento horizontalios slinkties;24kortelės, prieš pasirinkimą0video elementų. Naujas15sek. ir poros80,386sek. video realiai paleisti, readyState4, error=null; telefono poros įrašas pasiekė23,4sek. be klaidos. Naršymas rodyklėmis ir Home/End, pelės tempimas, vienas aktyvus player, pause išėjus iš matomos srities, Escape/uždarymas ir grįžtantis fokusas patikrinti. Mobilus02/24 perjungimas tikrame domene priimtas. Visas galutinis LT tekstas perskaitytas; pilna200%text resize/spacing patikra atskirai nepatvirtinta.

124Node testai, atnaujintos2media/admission regresijos,3Instagrambridge regresijos, scopedESLint, visasTypeScript, finalproductionbuild ir dry-run PASS. Detector finalscan[]; naršyklė aptiko per tamsų play ženklą dėl incumbent buttoncolor — pataisyta scoped specifika ir patvirtintas tikras baltas fill. Vietinis SEO smoke sustojo ties unknown-host/favicon: Wrangler HTTP peržiūra perrašo callerHost (canonical/unknown/akmenas užklausos visos atidavė tą pačią Memo svetainę). Tai užfiksuotas šio bandymo transporto apribojimas, ne tariamas naujas88puslapiųSEO PASS; proxy jau turi unknown404, contentpackage baitai nepakito. Privačios patikros `qa/memocasting-video-carousel-20261020/`.

Upgrade2c4ff2e5 apima karuselę. Papildomas e90986c0 sutvarko retainedInstagram TypeScript tipus, nepakeisdamas teisių. Tiksliai99PUBLIC pakeistų Git kelių ir10scope blob/tree patikrinti pačiame PUBLIC b5edd7c. CORE checker aptikta atkuriama foreign bracketed route lookup spraga sutvarkyta atskiru upgradec8b7636a:13regresijų PASS; foreignscope nepriskiriamas privatecoverage. Ši CORE pataisa perduota šakoje, ne visųPC adoption.

Ankstesnis Instagram backend/privatusKV ir30min.cron išsaugoti rollback; homepage jo nebekviečia. Facebook collab eiga netęsiama. Karuselė remiasi savininko failais, naujų Instagram įrašų automatiškai neimportuoja. Naujam video pakanka pateikti failą ir atlikti tokį patį scoped medijos atnaujinimą.

Rollback: ankstesnė frontend97678db4 versija, išsaugant visas dabartines duomenų bazes, secrets, DNS ir užsakymus. Galutinės desktop/mobile ekrano nuotraukos išsaugotos privačiai; vartotojui paliktas originalus gyvos svetainės skirtukas.

## Savininko sekcijų tvarkos pataisa

2026-10-20: video karuselę perkelti iškart po #procesas scrollytelling. Ekrano nuotraukoje parodytą #akimirkos sekciją „Ką norite pasilikti?“ laikinai išjungti rendererio lygiu, originalų HTML/kodą palikti atkūrimui. Tekstų vaidmenys, šriftai ir dydžiai nekeičiami. Patikra: nauja sekcijų tvarka, nematoma išjungta sekcija, 24 video ir desktop/mobile; bendro puslapių audito nekartoti.

Patikrinta ir įjungta: frontend ee022a72-4066-4be0-9976-6f3922771985, 2026-10-20T08:35:34Z, PUBLIC22cfe5d/PR31. Tikra DOM tvarka: pradzia → rinkiniai → procesas → instagram → skulpturos → sudetis → galerija → gidai → klausimai. #akimirkos nerenderinamas, originali sekcija lieka source. Desktop1280/mobile390 ir originalus596pane patikrinti,24video išsaugoti; bindings/observability nepakito. Privatus placement-desktop.png įrodo karuselę iškart po proceso timeline.

## Valdiklių pataisa ir paslėpti pavadinimai

2026-10-20 savininkas pranešė, kad Play perstumia karuselę ir trukdo valdyti video; papildomai paprašė pašalinti matomus pavadinimus po kortelėmis. Atkurta aktyvioje559613fb versijoje: paspaudus antrą matomą kortelę pozicija01→02 ir track x51,20→−134,48px dar vykstant animacijai. Priežastis: start() tiesiogiai kvietė scrollTo(index).

Pataisos apimtis tik PUBLIC memocasting-video-carousel.tsx/.css: Play nekeičia juostos pozicijos; nuo Play ženklo, video, uždarymo ir pakartojimo valdiklių nepradedamas tempimas; grotuvo valdiklių fokusas neinicijuoja Embla navigacijos. Atidarytas video gauna fokusą su preventScroll. Native video klavišai neperimami, Escape ir uždarymo fokusas išsaugomi. Kortelių h3 ir nebereikalingi jų stiliai pašalinti; pavadinimai liko aria-label, tikri alt ir trukmės žymos išsaugoti. Naujos tipografikos nėra; liko esami H2/body/metadata vaidmenys.

Vietinis galutinis production artefaktas:7esamos media/admission/homepage regresijos, scoped ESLint, TypeScript, build ir Wrangler dry-run PASS. Tikras desktop1280: hover ir Play išlaiko x51,20 bei01/24;18px pelės judesys laikant nuspaustą Play nejudina juostos; video realiai leidžiamas, valdikliai/Tab nekeičia horizontalios pozicijos; Escape grąžina fokusą, tyčinis posterio tempimas ir rodyklė keičia poziciją. Mobile390: Play x23→23,01/24 lieka; uždarymas ir posterio tempimas veikia;0h3/24prieinamumoetiketės/0horizontaloverflow. Jutiklinio įvesties įvykio API IAB nepalaiko, todėl390patikra yra realus mobilus išdėstymas su pointer gesture, ne atskiro fizinio telefono touch sertifikavimas. Vietiniame preview nėra commerce service, jo kainų klaidos nėra naujas hosted checkout rezultatas. Privati prieš/pataisytos būsenos medžiaga:qa/memocasting-video-controls-20261020/.

Paketas3367ef65/SHA5a0183d6,24video,22galerijosnuotraukos,92datos ir kiti puslapiai nekeičiami. Frontend ankstesnė559613fb versija yra šios pataisos rollback, prieš grąžinant būtina perskaityti actual settings. Hosted priėmimas fiksuojamas atskirai po įkėlimo.
