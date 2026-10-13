# Kitų puslapių planas · 2026-10-13

Vėlesnis šios dienos etapas įgyvendintas: [bendras vidinių puslapių dizainas, katalogas ir abu produktai](STOREFRONT_2026_10_13.md). 12 pardavimo URL keturiomis kalbomis pažymėti kaip vietiškai realizuoti; kitų puslapių turinio ir individualių šablonų darbai lieka pagal šį planą.

Visi 88 esami URL inventorizuoti: 87 kitų puslapių planai ir jau realizuoto LT homepage audito bazė. 22 paskirtys keturiomis kalbomis: LT, PL, LV ir ET. Tai įgyvendinimo planas, o ne naujas publikuotas turinys. Tikslūs ID, esami ir siūlomi metaduomenys, sekos, nuorodos ir faktų ribos pateikti [PAGE_BRIEFS_2026_10_13.json](PAGE_BRIEFS_2026_10_13.json).

## Bendra vizualinė sistema

Tęsti savininko pasirinktą baltą, švarią homepage tapatybę: Manrope, tamsus tekstas, saikingas rožinis akcentas, didelė erdvė ir santūrūs šriftų dydžiai. Vidinių puslapių dabartinį kreminį / serif / rudų mygtukų stilių pakeisti nuosekliai. Produkto galerija ir pirkimo blokas yra pagrindiniai; ilgas gidas turi būti patogus skaityti. Neslėpti svarbios informacijos už slinkimo efekto.

Darbalaukio turinio plotis iki maždaug 1280 px, straipsnio eilutė 60–72ch; mobiliajame 20–24 px paraštės, kompaktiška navigacija, 44 px pagrindiniai valdikliai. Tipografija ir spacing naudoti bendrus tokenus. Saugoti LT/PL/LV/ET diakritinius ženklus. Animacija turi papildyti turinį: nedidelis vaizdų ir antraščių atsiradimas; be judesio ir be JS tekstas bei pirkimo kelias lieka naudingi. Produkto ir teisinių puslapių nesieti su priverstiniu filmo slinkimu.

Bendra antraštė: logotipas, Rinkiniai, Gidai, Kontaktai, kalbos pasirinkimas, krepšelis; mobiliajame kompaktiškas meniu su klaviatūros ir fokuso grįžimo palaikymu. Footer: pardavėjas, kontaktai, instrukcija, pristatymas, grąžinimas, privatumas, sąlygos. Homepage dock išlieka homepage navigacija; jo sekcijų nuorodos kituose puslapiuose veda į tikrus homepage fragmentus.

## Puslapių struktūra ir SEO paskirtis

Kiekvienas puslapis turi vieną pagrindinį skaitytojo darbą. Žemiau pateiktos frazės yra redakcinės hipotezės, ne šios dienos paieškų apimčių matavimas. Produktų bendrinė frazė priklauso katalogui; konkreti poros / šeimos frazė — produktui; informacinis klausimas — atitinkamam gidui.

### / · P1

**Tikslas:** Atpažinti pasiūlymą ir pasirinkti kitą žingsnį.

**Paieškos paskirtis:** Memory Casting rankų liejimas (brand/navigation).

**Sekcijų seka:**

1. Hero ir pasirinkimo CTA
2. Akimirkų pasirinkimas
3. Du rinkiniai
4. Proceso istorija
5. Skulptūrų peržiūra
6. Gidai, Instagram ir DUK

**Vidinės nuorodos:** `/ranku-liejimo-rinkiniai`, `/pages/instrukcija`, `/gidai`.

**Duomenų ribos:** LT homepage jau realizuotas; kitoms kalboms pritaikyti tą pačią tapatybę.

**Išdėstymas ir veikimas:** Quiet white homepage identity; role-specific content hierarchy, compact mobile header. Small reversible reveals; content visible without JS and with motion off; Native links/details and keyboard controls.

### /rinkinys-porai · P1

**Tikslas:** Patikrinti sudėtį ir nusipirkti tinkamą poros rinkinį.

**Paieškos paskirtis:** rankų liejimo rinkinys porai (transactional).

**Sekcijų seka:**

1. Breadcrumb ir H1
2. Tikro produkto galerija / zoom
3. Native kaina, likutis, priedai ir pirkti
4. Tiksli bazinė sudėtis bei pasirenkami priedai
5. Proceso santrauka ir instrukcija
6. Pristatymas, grąžinimas ir pagalba
7. Tikri klientų darbai, kai bus pateikti
8. Susiję gidai

**Vidinės nuorodos:** `/ranku-liejimo-rinkiniai`, `/pages/instrukcija`, `/pristatymas`, `/grazinimas`, `/gidai/dovana-porai`, `/pagalba`.

**Duomenų ribos:** 32 EUR bazė; balti dažai +3 EUR tik jei priedas aktyvus; 1200 g gipso; alginato masė nepatvirtinta. Native stock, addonFor, rinkos kaina ir tikri pakuotės matmenys; neužrašyti universalių laikų.

**Išdėstymas ir veikimas:** Desktop media + purchase columns; mobile media/title/price/actions before long detail. Gallery zoom + keyboard/focus; Native variants/addons/state errors; Accessible accordions; Optional on-demand 3D.

### /seimos-rinkinys · P1

**Tikslas:** Įvertinti šeimos kompozicijos ir rinkinio tinkamumą.

**Paieškos paskirtis:** rankų liejimo rinkinys šeimai (transactional).

**Sekcijų seka:**

1. Breadcrumb ir H1
2. Tikros šeimos rinkinio nuotraukos
3. Native kaina, likutis ir pirkti
4. Du alginato ir du gipso pakeliai bei pagaliukai
5. Tinkamumas ir kompozicijos ribos iš instrukcijos
6. Proceso santrauka
7. Pristatymas ir pagalba
8. Susiję gidai

**Vidinės nuorodos:** `/ranku-liejimo-rinkiniai`, `/pages/instrukcija`, `/pristatymas`, `/grazinimas`, `/pagalba`.

**Duomenų ribos:** 48 EUR LT bazė; nepatvirtinti dalyvių skaičius, pakelių masės ir kibiras. Vaikų tinkamumą, talpą ir pozų ribas apibrėžti tik pagal tikrus dokumentus.

**Išdėstymas ir veikimas:** Desktop media + purchase columns; mobile media/title/price/actions before long detail. Gallery zoom + keyboard/focus; Native variants/addons/state errors; Accessible accordions; Optional on-demand 3D.

### /ranku-liejimo-rinkiniai · P1

**Tikslas:** Palyginti du rinkinius ir pasirinkti tinkamą.

**Paieškos paskirtis:** rankų liejimo rinkiniai (commercial comparison).

**Sekcijų seka:**

1. Aiški įžanga ir H1
2. Dvi prekės su native kaina ir būsena
3. Porai / šeimai palyginimo lentelė
4. Bazinė sudėtis ir pasirinkimo kriterijai
5. Pasiruošimas / instrukcijos nuoroda
6. Tik keli sprendimą papildantys DUK

**Vidinės nuorodos:** `/rinkinys-porai`, `/seimos-rinkinys`, `/pages/instrukcija`, `/gidai/ranku-liejimo-rinkinys-ar-paruosta-dovana`.

**Duomenų ribos:** Tik dvi tikros prekės; nedaryti tuščių filtrų ir nepagrįstų talpos pažadų.

**Išdėstymas ir veikimas:** Quiet white homepage identity; role-specific content hierarchy, compact mobile header. Small reversible reveals; content visible without JS and with motion off; Native links/details and keyboard controls.

### /pages/instrukcija · P0

**Tikslas:** Saugiai pasiruošti ir atlikti savo rinkinio procesą.

**Paieškos paskirtis:** rankų liejimo instrukcija (procedural).

**Sekcijų seka:**

1. Pasirinkti rinkinį ir dokumento versiją
2. Pasiruošimo kontrolinis sąrašas
3. Medžiagų žymėjimas / dokumentai
4. Žingsniai su realiomis proporcijomis ir laikais
5. Išėmimas, džiovinimas ir apdaila
6. Kada sustoti ir kreiptis pagalbos
7. Spausdinama instrukcija / patikrintas video

**Vidinės nuorodos:** `/rinkinys-porai`, `/seimos-rinkinys`, `/gidai/dziovinimas-ir-isemimas`, `/gidai/liejinio-dazymas-ir-prieziura`, `/pagalba`, `/kontaktai`.

**Duomenų ribos:** Be konkretaus gamintojo IFU/SDS negeneruoti receptų, temperatūrų, saugos ar minučių. Dabartinis dokumentų patikros tekstas nėra baigta praktinė instrukcija.

**Išdėstymas ir veikimas:** Readable 60–72ch article, short answer, optional desktop TOC, compact mobile disclosure. Small reversible reveals; content visible without JS and with motion off; Native links/details and keyboard controls.

### /gidai · P1

**Tikslas:** Greitai rasti atsakymą pagal savo etapą.

**Paieškos paskirtis:** rankų liejimo gidai (informational navigation).

**Sekcijų seka:**

1. Trumpa įžanga
2. Dovanos ir pasirinkimo grupė
3. Prieš liejimą / proceso grupė
4. Išėmimas ir priežiūra
5. Problemų pagalba
6. Kontekstinė rinkinių nuoroda

**Vidinės nuorodos:** `/gidai/dovana-porai`, `/gidai/dovana-vestuviu-metinems`, `/gidai/ranku-liejimo-rinkinys-ar-paruosta-dovana`, `/gidai/dziovinimas-ir-isemimas`, `/gidai/liejinio-dazymas-ir-prieziura`, `/pagalba`, `/ranku-liejimo-rinkiniai`.

**Duomenų ribos:** Šeši esami gidai; paiešką ir filtrus pridėti tik kai jų kiekis pagrindžia poreikį.

**Išdėstymas ir veikimas:** Readable 60–72ch article, short answer, optional desktop TOC, compact mobile disclosure. Small reversible reveals; content visible without JS and with motion off; Native links/details and keyboard controls.

### /gidai/dovana-porai · P1

**Tikslas:** Pasirinkti, kaip padovanoti bendrą veiklą.

**Paieškos paskirtis:** dovana porai (informational decision).

**Sekcijų seka:**

1. Trumpas atsakymas
2. Gavėjų noras dalyvauti
3. Rinkinio įteikimas / kartu kuriama dovana
4. Trijų scenarijų palyginimas
5. Pasiruošimo klausimai
6. Tinkamas rinkinys ir instrukcija

**Vidinės nuorodos:** `/rinkinys-porai`, `/gidai/ranku-liejimo-rinkinys-ar-paruosta-dovana`, `/pages/instrukcija`.

**Duomenų ribos:** Nežadėti kiekvienam tinkamo rezultato, įtraukti dalyvavimo ir proceso lūkesčius.

**Išdėstymas ir veikimas:** Readable 60–72ch article, short answer, optional desktop TOC, compact mobile disclosure. Small reversible reveals; content visible without JS and with motion off; Native links/details and keyboard controls.

### /gidai/dovana-vestuviu-metinems · P1

**Tikslas:** Suplanuoti, ką įteikti metinių dieną ir kada kurti.

**Paieškos paskirtis:** dovana vestuvių metinėms (informational planning).

**Sekcijų seka:**

1. Trumpas atsakymas
2. Ką įteikti tą dieną
3. Veiklos ir baigto liejinio skirtumas
4. Planas iki datos su nepatvirtintų terminų žyma
5. Pateikimo idėjos
6. Rinkinys / pristatymas / instrukcija

**Vidinės nuorodos:** `/rinkinys-porai`, `/pristatymas`, `/pages/instrukcija`, `/gidai/dziovinimas-ir-isemimas`.

**Duomenų ribos:** Nekurti spėjamų pristatymo ar visiško išdžiūvimo terminų.

**Išdėstymas ir veikimas:** Readable 60–72ch article, short answer, optional desktop TOC, compact mobile disclosure. Small reversible reveals; content visible without JS and with motion off; Native links/details and keyboard controls.

### /gidai/ranku-liejimo-rinkinys-ar-paruosta-dovana · P1

**Tikslas:** Nuspręsti tarp dalyvavimo veikloje ir paruošto daikto.

**Paieškos paskirtis:** rankų liejimo rinkinys ar paruošta dovana (commercial investigation).

**Sekcijų seka:**

1. Sprendimo santrauka
2. Dalyvavimas, laikas, lūkestis: lentelė
3. Kam tinka kiekvienas variantas
4. Trys praktiniai scenarijai
5. Ką pasitikrinti prieš perkant
6. Rinkinių katalogas

**Vidinės nuorodos:** `/ranku-liejimo-rinkiniai`, `/gidai/dovana-porai`, `/gidai/dovana-vestuviu-metinems`.

**Duomenų ribos:** Paruošta individuali skulptūra nėra patvirtinta mūsų paslauga.

**Išdėstymas ir veikimas:** Readable 60–72ch article, short answer, optional desktop TOC, compact mobile disclosure. Small reversible reveals; content visible without JS and with motion off; Native links/details and keyboard controls.

### /apie-projekta · P1

**Tikslas:** Suprasti kas kuria ir parduoda produktą.

**Paieškos paskirtis:** apie Memory Casting (trust/navigation).

**Sekcijų seka:**

1. Žmogiška, patvirtinta prekės ženklo istorija
2. Ką parduodame ir kaip kuriamas prisiminimas
3. Tikros komandos / darbų nuotraukos
4. MB ir kontaktų rekvizitai
5. Turinio ir iliustracijų skaidrumas
6. Susisiekti / pasirinkti rinkinį

**Vidinės nuorodos:** `/kontaktai`, `/redakcija`, `/ranku-liejimo-rinkiniai`.

**Duomenų ribos:** Jokių išgalvotų klientų skaičių, apdovanojimų ar komandos ekspertų.

**Išdėstymas ir veikimas:** Quiet white homepage identity; role-specific content hierarchy, compact mobile header. Small reversible reveals; content visible without JS and with motion off; Native links/details and keyboard controls.

### /redakcija · P1

**Tikslas:** Patikrinti kas atsako už gidus ir kaip taisomos klaidos.

**Paieškos paskirtis:** Memory Casting turinio šaltiniai (trust/navigation).

**Sekcijų seka:**

1. Atsakingas operatorius
2. Faktų ir tiekėjo dokumentų tikrinimas
3. Šaltinių taikymo ribos
4. AI iliustracijų ir originalių nuotraukų žymėjimas
5. Tikros atnaujinimų datos
6. Klaidų pranešimas

**Vidinės nuorodos:** `/apie-projekta`, `/kontaktai`, `/gidai`.

**Duomenų ribos:** Autorystė organizacijai, kol nėra tikro įvardyto ir sutikusio specialisto.

**Išdėstymas ir veikimas:** Quiet white homepage identity; role-specific content hierarchy, compact mobile header. Small reversible reveals; content visible without JS and with motion off; Native links/details and keyboard controls.

### /kontaktai · P0

**Tikslas:** Gauti tinkamą pagalbą prieš ar po pirkimo.

**Paieškos paskirtis:** Memory Casting kontaktai (support/navigation).

**Sekcijų seka:**

1. Kontaktai ir temos pasirinkimas
2. Užsakymo / produkto / proceso klausimai
3. Minimali forma su aiškia duomenų paskirtimi
4. Validacija / siuntimas / klaida / pakartojimas
5. Gavimo patvirtinimas tik po tikro gavimo
6. Susiję atsakymai ir rekvizitai

**Vidinės nuorodos:** `/pagalba`, `/pristatymas`, `/grazinimas`, `/privatumas`.

**Duomenų ribos:** Nepateikti išsiųsta būsenos jei SMTP ar realus pristatymas neveikia. Nerodyti išgalvotų darbo valandų ar atsakymo termino.

**Išdėstymas ir veikimas:** Quiet white homepage identity; role-specific content hierarchy, compact mobile header. Small reversible reveals; content visible without JS and with motion off; Native links/details and keyboard controls.

### /pristatymas · P0

**Tikslas:** Prieš pirkimą suprasti teritoriją, kainą ir eigą.

**Paieškos paskirtis:** Memory Casting pristatymas (purchase support).

**Sekcijų seka:**

1. Kur siunčiame
2. Kaina ir kaip ji apskaičiuojama
3. Paruošimas ir vežėjo terminų ribos
4. Sekimas / nepavykęs pristatymas
5. Sugadintas siuntinys
6. Kontaktai ir krepšelis

**Vidinės nuorodos:** `/cart`, `/kontaktai`, `/grazinimas`.

**Duomenų ribos:** 4.50 EUR sandbox fixture nėra patvirtintas vežėjo tarifas. Reikia realių LT/PL/LV/EE teritorijų, kainų, vežėjų ir terminų.

**Išdėstymas ir veikimas:** Quiet white homepage identity; role-specific content hierarchy, compact mobile header. Small reversible reveals; content visible without JS and with motion off; Native links/details and keyboard controls.

### /grazinimas · P0

**Tikslas:** Suprasti atsisakymą, trūkumus ir konkrečią procedūrą.

**Paieškos paskirtis:** Memory Casting grąžinimas (purchase support).

**Sekcijų seka:**

1. Trumpa veiksmų santrauka
2. Atsisakymas ir atskirai nekokybiška prekė
3. Kas pranešama ir kur
4. Grąžinimo adresas / kaštai / terminai
5. Dokumentų perdavimas privačiai
6. Susisiekti

**Vidinės nuorodos:** `/kontaktai`, `/naudojimo-salygos`, `/privatumas`.

**Duomenų ribos:** Patvirtinti realią procedūrą ir rinkai galiojančią teisę; rinkinys automatiškai nėra individualus negrąžinamas gaminys. Užsakymo tokenai ir asmens duomenys ne URL, ne viešame turinyje.

**Išdėstymas ir veikimas:** Quiet white homepage identity; role-specific content hierarchy, compact mobile header. Small reversible reveals; content visible without JS and with motion off; Native links/details and keyboard controls.

### /privatumas · P0

**Tikslas:** Suprasti realų asmens duomenų tvarkymą.

**Paieškos paskirtis:** Memory Casting privatumo politika (legal/navigation).

**Sekcijų seka:**

1. Valdytojas ir kontaktas
2. Duomenų kategorijos ir kiekviena paskirtis
3. Teisiniai pagrindai ir gavėjai
4. Tikri saugojimo terminai / perdavimai
5. Slapukai ir consent pasirinkimai
6. Teisės bei kreipimosi tvarka

**Vidinės nuorodos:** `/kontaktai`, `/naudojimo-salygos`.

**Duomenų ribos:** Suderinti su tikrais mokėjimo, pašto, analitikos, įterpimų tiekėjais ir realia konfigūracija. Dabartinė vietinio bandymo politika nėra produkcijos politika.

**Išdėstymas ir veikimas:** Quiet white homepage identity; role-specific content hierarchy, compact mobile header. Small reversible reveals; content visible without JS and with motion off; Native links/details and keyboard controls.

### /naudojimo-salygos · P0

**Tikslas:** Prieš pirkimą suprasti sutartį ir įsipareigojimus.

**Paieškos paskirtis:** Memory Casting pirkimo sąlygos (legal/navigation).

**Sekcijų seka:**

1. Pardavėjo tapatybė
2. Sutarties sudarymas ir užsakymo patvirtinimas
3. Kaina / mokesčiai / mokėjimo būdai
4. Pristatymas
5. Atsisakymas ir prekių trūkumai
6. Ginčai / kontaktas / versija

**Vidinės nuorodos:** `/pristatymas`, `/grazinimas`, `/privatumas`, `/kontaktai`.

**Duomenų ribos:** Produkcijos procesą ir rinkų teisę patikrinti prieš perrašant testines sąlygas.

**Išdėstymas ir veikimas:** Quiet white homepage identity; role-specific content hierarchy, compact mobile header. Small reversible reveals; content visible without JS and with motion off; Native links/details and keyboard controls.

### /cart · P0

**Tikslas:** Patikrinti ir saugiai užbaigti pasirinkimą.

**Paieškos paskirtis:** n/a – ne paieškos puslapis (functional).

**Sekcijų seka:**

1. Native krepšelio eilutės / priedai / kiekiai
2. Serverio perskaičiuota suma
3. Pirkėjo ir pristatymo duomenys
4. Mokėjimo žingsnis
5. Grįžimas / atkūrimas / patvirtinimas
6. Pagalba ir dokumentai

**Vidinės nuorodos:** `/ranku-liejimo-rinkiniai`, `/pristatymas`, `/grazinimas`, `/privatumas`, `/naudojimo-salygos`, `/kontaktai`.

**Duomenų ribos:** Noindex, nofollow; nėra sitemap/llms; asmeninės būsenos no-store. Tuščia / užkraunama / stokos konfliktas / pakeista kaina / klaida / atkūrimas / patvirtinimas; grįžimas nėra apmokėjimo įrodymas.

**Išdėstymas ir veikimas:** Quiet white homepage identity; role-specific content hierarchy, compact mobile header. Native functional state flow; no decorative scroll takeover.

### /products/alginato-papildymas-650g-dvieju-ranku-rinkiniui · P1

**Tikslas:** Patikrinti seno papildymo suderinamumą ir pasiūlymo statusą.

**Paieškos paskirtis:** alginato papildymas rankų liejimo rinkiniui (informational compatibility).

**Sekcijų seka:**

1. Seno adreso ir dabartinio statuso paaiškinimas
2. Žymėjimo ir instrukcijos patikra
3. Suderinamumas su likusia rinkinio dalimi
4. Ką atsiųsti pagalbai
5. Dabartiniai rinkiniai

**Vidinės nuorodos:** `/pages/instrukcija`, `/pagalba`, `/kontaktai`, `/ranku-liejimo-rinkiniai`.

**Duomenų ribos:** Nėra aktyvaus papildymo SKU; neteikti kainos, buy CTA ar Product/Offer. 650 g URL dalis nėra dabartinės prekės fakto patvirtinimas.

**Išdėstymas ir veikimas:** Quiet white homepage identity; role-specific content hierarchy, compact mobile header. Small reversible reveals; content visible without JS and with motion off; Native links/details and keyboard controls.

### /products/kudikio-pedutes · P0

**Tikslas:** Patikrinti ar egzistuoja tinkamas dokumentuotas produktas.

**Paieškos paskirtis:** kūdikio pėdučių liejinys (informational suitability).

**Sekcijų seka:**

1. Dabartinio pasiūlymo statusas
2. Tinkamumo ir dokumentų klausimai
3. Ko negalima spręsti iš vienos nuotraukos
4. Kreiptis su produkto duomenimis

**Vidinės nuorodos:** `/kontaktai`, `/pages/instrukcija`, `/pagalba`.

**Duomenų ribos:** Nėra aktyvaus baby SKU, patvirtinto amžiaus / odos tinkamumo; neskatinti naudojimo be dokumentų.

**Išdėstymas ir veikimas:** Quiet white homepage identity; role-specific content hierarchy, compact mobile header. Small reversible reveals; content visible without JS and with motion off; Native links/details and keyboard controls.

### /gidai/dziovinimas-ir-isemimas · P0

**Tikslas:** Atskirti stingimą, išėmimą ir visišką džiūvimą.

**Paieškos paskirtis:** kada išimti ir džiovinti rankų liejinį (informational).

**Sekcijų seka:**

1. Trumpas etapų skirtumo atsakymas
2. Išėmimas iš formos
3. Džiūvimas ir aplinkos sąlygos pagal dokumentus
4. Kada vertinti pasiruošimą dangai
5. Proceso užrašų lentelė
6. Kada kreiptis pagalbos

**Vidinės nuorodos:** `/pages/instrukcija`, `/gidai/liejinio-dazymas-ir-prieziura`, `/pagalba`.

**Duomenų ribos:** Jokio universalaus valandų skaičiaus be tikslaus rinkinio dokumento.

**Išdėstymas ir veikimas:** Readable 60–72ch article, short answer, optional desktop TOC, compact mobile disclosure. Small reversible reveals; content visible without JS and with motion off; Native links/details and keyboard controls.

### /gidai/liejinio-dazymas-ir-prieziura · P0

**Tikslas:** Pasirinkti išvaizdą ir patikrinti dangos suderinamumą.

**Paieškos paskirtis:** rankų liejinio dažymas ir priežiūra (informational).

**Sekcijų seka:**

1. Trumpas pasirinkimo atsakymas
2. Natūralus / dažytas paviršius
3. Džiūvimo ir suderinamumo patikra
4. Dokumentuotas paviršiaus paruošimas
5. Priežiūra ir eksponavimas
6. Klausimai prieš renkantis dangą

**Vidinės nuorodos:** `/gidai/dziovinimas-ir-isemimas`, `/pages/instrukcija`, `/pagalba`, `/rinkinys-porai`.

**Duomenų ribos:** Edinburgh finishing yra idėjų šaltinis, ne mūsų teikiama finishing paslauga. Dekoro iliustracija nėra patikrinta danga ar garantuotas rezultatas.

**Išdėstymas ir veikimas:** Readable 60–72ch article, short answer, optional desktop TOC, compact mobile disclosure. Small reversible reveals; content visible without JS and with motion off; Native links/details and keyboard controls.

### /pagalba · P0

**Tikslas:** Tiksliai užfiksuoti problemą ir gauti tikslinę pagalbą.

**Paieškos paskirtis:** nepavyko rankų liejinys (informational support).

**Sekcijų seka:**

1. Požymis ir proceso etapas
2. Medžiagos / partija / galiojimas
3. Kas iš tikrųjų buvo padaryta
4. Nuotraukų ir užrašų lapas
5. Kada sustoti ir nespėti priežasties
6. Kontaktų kelias su privatumo nuoroda

**Vidinės nuorodos:** `/pages/instrukcija`, `/gidai/dziovinimas-ir-isemimas`, `/gidai/liejinio-dazymas-ir-prieziura`, `/kontaktai`, `/privatumas`.

**Duomenų ribos:** Nediagnozuoti universaliai pagal vieną simptomą; nerodyti neaktyvaus papildymo pardavimo.

**Išdėstymas ir veikimas:** Readable 60–72ch article, short answer, optional desktop TOC, compact mobile disclosure. Small reversible reveals; content visible without JS and with motion off; Native links/details and keyboard controls.

## Nuotraukos, 3D ir pasitikėjimo įrodymai

Jau turimą asset kit naudoti atmosferai ir aiškiai žymėti kaip iliustracijas. SKU puslapiuose reikia tikro rinkinio visumos, sudėties ir detalių nuotraukų; dydžių bei kiekių nekurti iš generuoto vaizdo. Originalūs klientų darbai ir atsiliepimai bus įtraukti tik gavus šaltinius bei naudojimo teisę. Instagram nėra inventoriaus, garantijos ar pirkėjo atsiliepimo patvirtinimas. Įterpimams numatyti privatumo ir neveikiančio įterpimo fallback.

3D yra pasirenkamas peržiūros sluoksnis: savininko GLB/GLTF, optimizuota geometrija ir tekstūros, įkėlimas tik po paspaudimo, sukimas/artinimas/atstatymas, statinis plakatas ir klaviatūros valdikliai. Neapkrauti pradinio produkto atvaizdavimo; modelio forma nėra garantuotas kiekvieno liejinio rezultatas. Jokių fiktyvių modelių failų ar neveikiančių privalomų 3D blokų.

## Naujų temų atranka

| Siūlomas URL | Skaitytojo darbas | Kada kurti | Sąlyga |
|---|---|---|---|
| /dovanos | Dovanos pasirinkimo katalogas | Tik pagrindus poreikį | Iš pradžių naudoti /gidai grupes; atskiras katalogas turi padėti sujungti tris tikrai skirtingus darbus. |
| /gidai/dovana-seimai | Šeimos veiklos planavimas | Gavus produkto dokumentus | Skiriasi nuo dovanos porai; nespėti dalyvių skaičiaus, amžiaus ar talpos. |
| /gidai/ranku-liejimo-pozos | Pozos pasirinkimas iš originalių pavyzdžių | Gavus originalius vaizdus ir IFU | Originali galerija ir dokumentuotos kompozicijos ribos, ne bendrinis paveikslų sąrašas. |
| /produkto-sauga | Patvirtinta produkto sauga ir dokumentai | Patikrinus IFU/SDS | Konkretus SKU ir versija; jokio universalaus saugumo odai pažado. |
| /galerija | Tikri klientų darbai | Gavus originalus ir teises | Sutikimas, kilmė ir naudingas kontekstas; AI įkvėpimas lieka homepage. |
| /atsiliepimai | Tikri pirkėjų atsiliepimai | Atidėta | Pirmiausia naudoti produktų / homepage įrodymus; naujam URL reikia pakankamai tikro turinio. |

Motinos / Tėvo diena, seneliai, Kalėdos ir Valentino diena iš pradžių yra esamų dovanų gidų skyriai. Sinonimų ir progų kombinacijų nepaversti dešimtimis panašių URL. Pasiruošimą laikyti instrukcijoje, problemų požymius — pagalbos gide, kol atskiras darbas ir šaltiniai pagrindžia naują straipsnį. Senų alginato / pėdučių URL tikslas informacinis: jokio neaktyvaus produkto pardavimo ar Product schemos. B2B / memorycasting.com partnerių turinys yra atskiras būsimas komercinis etapas; nekurti minimalaus užsakymo ar paslaugų pažadų be sprendimo.

## Lokalizacija

Visi 88 esami URL turi atskirus briefus ir tos pačios rinkos nuorodas. LT tikslinių frazių nevadinti PL/LV/ET tyrimu. Kitų kalbų esami tekstai ir metaduomenys išsaugoti kaip bazė; reikia native redakcijos, vietinės paklausos ir tikrų rinkos kainų / pristatymo / teisinių sąlygų patikros. Kiekviena kalba lieka self-canonical, su abipusiu hreflang. Vien tik vertimas neįrodo pasirengimo prekybai rinkoje. Nepervadinti užsienio istorinių produktų adresų dėl LT migracijos.

## Įgyvendinimo eilė ir priėmimas

1. **P0 — produkto ir prekybos tiesa:** IFU/SDS, tikra sudėtis / talpa / pakuotės matmenys, aktyvūs SKU ir priedai, rinkų kainos / likučiai / siuntimas, mokėjimo / pašto gavimas, realios prekybos ir privatumo sąlygos. Testinės sumos nėra produkcijos pažadai.
2. **P1 — pardavimo kelias:** bendras vidinių puslapių shell, katalogas, poros ir šeimos produktai. Tikros galerijos, native valdikliai, aiškios pasirinkimo būsenos. Priėmimas: 320/768/1280 px, klaviatūra, motion-off, JS-off informacija, tuščias / klaidos / stokos / priedų scenarijai.
3. **P1 — informacijos kelias:** gidų katalogas, straipsnio šablonas, instrukcija, pagalba, apie / redakcija / kontaktai. P0 faktų turintys gidai pildomi tik gavus dokumentus.
4. **P2 — originalus turinys:** patvirtintos nuotraukos, klientų darbai ir atsiliepimai; atrinkti atskiri šeimos / pozų darbai; kitos kalbos po native ir komercinės patikros.
5. **P3 — papildoma patirtis:** 3D, turtingesni atvejai ir atskirai apibrėžtas B2B pasiūlymas.

Kiekvieno įgyvendinto šeimos šablono priėmimas: crawlable tikros nuorodos; vienas H1; unikalūs title / description / ID; self-canonical / abipusis hreflang; schema atitinka matomą turinį; nėra klaidingų Offer/ratings; pirkimas nepriklauso nuo animacijos. Produkto LCP vaizdas turi dimensions/srcset ir prioritetą; likę vaizdai lazy. Tikslai po produkcijos paleidimo: lauko LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1 (75 procentilis); tai priėmimo tikslai, ne išmatuoti šios versijos rezultatai.

## SEO/GEO tyrimas ir tolesnė patikra

Žiūrėti [dabartinį auditą](SEO_AUDIT_2026_10_13.md). Pirminės Google gairės patvirtina, kad AI Search pagrindas yra įprasta indeksuojama, aiškiai susieta ir patikima svetainė; nėra specialios privalomos AI schemos. llms eksportas yra papildomas skaitymo formatas, ne reitingavimo garantija.

GSC reikia tikros property prieigos ir produkcijos pateikimo. Po paleidimo tikrinti page indexing, pasirinktą canonical, sitemap, užklausas / CTR pagal atskirą URL ir rinką; lyginti vienodo ilgio laikotarpius. AI citavimą tikrinti su konkrečiomis užklausomis / regionu / data; jo šiandien nematuota. Keyword/backlink mokamų calls dabartinei užduočiai neatlikta. Senų tyrimų apimtys lieka istorinis signalas, ne 2026-10-13 aktualumo patvirtinimas.

Briefai neįrašyti į patvirtintų Studio puslapių turinį: dabartiniame core nėra palaikomo planningBrief reconciliation adapterio. Tai aiškus redakcinis / įgyvendinimo perdavimas; pakeitimus rašyti per oficialią Studio versijavimo ir peržiūros eigą, ne ranka perrašyti viešą paketą.

## Suderinimas su shopo sesija

2026-10-13 suderinta su „Įvertinti Shopify alternatyvą“: SDK 0.12.1 / manifest be32c223; CommerceClient naudoja /prekyba/catalog ir /prekyba/markets. Pirkimo tinkamumą lemia aktyvus SKU, teigiamas parduodamas kiekis, rinkos kaina, tikri pakuotės matmenys; priedui — addonFor. Kainų / likučių / užsakymų logika priklauso shopo workstream. Checkout, atkūrimas ir patvirtinimas dabar yra /cart viduje; /checkout ir /uzsakymas nėra vieši funkcionalūs puslapiai. Savininko duomenys ir produkcijos aktyvavimas lieka atskiri nuo šio plano.

## Esamų kalbinių adresų matrica

| Paskirtis | LT | PL | LV | ET |
|---|---|---|---|---|
| home | `/` | `/pl` | `/lv` | `/et` |
| product | `/rinkinys-porai` | `/pl/products/liejimo-rinkinys-porai` | `/lv/products/liejimo-rinkinys-porai` | `/et/products/liejimo-rinkinys-porai` |
| product | `/seimos-rinkinys` | `/pl/products/seimos-rinkinys-1` | `/lv/products/seimos-rinkinys-1` | `/et/products/seimos-rinkinys-1` |
| category | `/ranku-liejimo-rinkiniai` | `/pl/collections/all` | `/lv/collections/all` | `/et/collections/all` |
| instruction | `/pages/instrukcija` | `/pl/pages/instrukcija` | `/lv/pages/instrukcija` | `/et/pages/instrukcija` |
| guide-index | `/gidai` | `/pl/gidai` | `/lv/gidai` | `/et/gidai` |
| gift-guide | `/gidai/dovana-porai` | `/pl/gidai/dovana-porai` | `/lv/gidai/dovana-porai` | `/et/gidai/dovana-porai` |
| gift-guide | `/gidai/dovana-vestuviu-metinems` | `/pl/gidai/dovana-vestuviu-metinems` | `/lv/gidai/dovana-vestuviu-metinems` | `/et/gidai/dovana-vestuviu-metinems` |
| comparison-guide | `/gidai/ranku-liejimo-rinkinys-ar-paruosta-dovana` | `/pl/gidai/ranku-liejimo-rinkinys-ar-paruosta-dovana` | `/lv/gidai/ranku-liejimo-rinkinys-ar-paruosta-dovana` | `/et/gidai/ranku-liejimo-rinkinys-ar-paruosta-dovana` |
| about | `/apie-projekta` | `/pl/apie-projekta` | `/lv/apie-projekta` | `/et/apie-projekta` |
| editorial | `/redakcija` | `/pl/redakcija` | `/lv/redakcija` | `/et/redakcija` |
| contact | `/kontaktai` | `/pl/kontaktai` | `/lv/kontaktai` | `/et/kontaktai` |
| shipping | `/pristatymas` | `/pl/pristatymas` | `/lv/pristatymas` | `/et/pristatymas` |
| returns | `/grazinimas` | `/pl/grazinimas` | `/lv/grazinimas` | `/et/grazinimas` |
| privacy | `/privatumas` | `/pl/privatumas` | `/lv/privatumas` | `/et/privatumas` |
| terms | `/naudojimo-salygos` | `/pl/naudojimo-salygos` | `/lv/naudojimo-salygos` | `/et/naudojimo-salygos` |
| cart | `/cart` | `/pl/cart` | `/lv/cart` | `/et/cart` |
| legacy-information | `/products/alginato-papildymas-650g-dvieju-ranku-rinkiniui` | `/pl/products/alginato-papildymas-650g-dvieju-ranku-rinkiniui` | `/lv/products/alginato-papildymas-650g-dvieju-ranku-rinkiniui` | `/et/products/alginato-papildymas-650g-dvieju-ranku-rinkiniui` |
| legacy-information | `/products/kudikio-pedutes` | `/pl/products/kudikio-pedutes` | `/lv/products/kudikio-pedutes` | `/et/products/kudikio-pedutes` |
| process-guide | `/gidai/dziovinimas-ir-isemimas` | `/pl/gidai/dziovinimas-ir-isemimas` | `/lv/gidai/dziovinimas-ir-isemimas` | `/et/gidai/dziovinimas-ir-isemimas` |
| finishing-guide | `/gidai/liejinio-dazymas-ir-prieziura` | `/pl/gidai/liejinio-dazymas-ir-prieziura` | `/lv/gidai/liejinio-dazymas-ir-prieziura` | `/et/gidai/liejinio-dazymas-ir-prieziura` |
| troubleshooting | `/pagalba` | `/pl/pagalba` | `/lv/pagalba` | `/et/pagalba` |
