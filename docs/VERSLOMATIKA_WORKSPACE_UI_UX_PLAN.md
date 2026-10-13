# Verslomatikos darbo erdvės UI ir UX planas

Verslomatika tampa viena nuolatine pasirinkto verslo darbo erdve. Savininkas centre kalbasi su AI komanda, kairėje pasirenka verslą, skiltį ir pokalbį, o dešinėje mato darbą bei rezultatus. Planas numato visą kliento kelią; pirmas įgyvendinimas turi leisti aiškiai pradėti pokalbį, aptarti planą ir suprasti tikrą vykdymo būseną.

Savininko prioritetas: pirmiau sutvarkyti UI/UX, tada tęsti tikrus modelių bandymus. Šis dokumentas yra siūloma įgyvendinimo kryptis, o ne jau veikiančios sąsajos ar užbaigtos platformos įrodymas. Dabartiniai duomenys, API teisės ir bandymų istorija išsaugomi.

**Patikslinta po abipusės UX peržiūros — 2026-10-13:** išlaikome savininko pateikto Codex ekrano trijų sričių principą. Nuolatinėje navigacijoje lieka penkios aiškios paskirtys; atskiriami verslas, pokalbis, darbas, rezultatas ir jo redakcija. Agentų profesijos neplečia pagrindinio meniu. Sprendimų argumentai, realios dviejų sesijų pastabos ir įgyvendinimo ribos išsaugoti [UX peržiūros įraše](VERSLOMATIKA_WORKSPACE_UX_REVIEW_2026-10-13.md). Tai patikslintas planas; grupinis pokalbis, naujų temų kūrimas registruotame versle ir visas agentų parengimas dar nėra priimtas runtime.

**Komandos pokalbio papildymas — 2026-10-13:** savininkas pasirinko bendravimą pirmiausia su koordinatoriumi. Koordinatorius pagal užduotį pasitelkia specialistus, o jie savo vardu atsako tame pačiame pokalbyje. Tam numatyti tikri dalyvių ID, aiškūs pavedimai, bendras versijuotas kontekstas ir naujų agentų prijungimas pagal jų paskirtį bei parengtį. Visi agentai automatiškai nevykdomi po kiekvienos žinutės. [Komandos pokalbio architektūros papildymas](VERSLOMATIKA_TEAM_CHAT_ARCHITECTURE.md) yra siūlomas būsimas core ir sąsajos išplėtimas; dabartinė trijų vaidmenų vykdymo eiga dar nėra ši grupinio pokalbio sistema.

**Naujo agento parengimas:** prašymas „sukurk agentą, kuris atliks šį darbą“ numatomas kaip vienas koordinatoriaus valdomas užsakymas. Jis apima paskirties ir rezultato apibrėžimą, reikalingus gebėjimus, įrankius bei žinias, agento sukūrimą, esamą kalibravimą, pataisymus, patikrintos versijos pritaikymą ir įtraukimą į komandą. Atskiro kalibravimo prašymo nereikės. Trūkstama integracija tampa aiškia įgyvendinimo užduotimi; išsaugotas aprašas dar nepatvirtina veikiančio agento. Vykdymas remiasi faktinėmis verslo teisėmis, prieigomis, parengtimi ir sutarta apimtimi.

## Pagrindinis ekranas

| Kairė — verslo erdvė | Centras — pokalbis | Dešinė — darbo sritis |
| --- | --- | --- |
| Verslo pasirinkimas viršuje | Pokalbio pavadinimas ir pasirinktas verslas | Aiškiai įvardytas pasirinktas darbas arba rezultatas |
| Naujas pokalbis pasirinkto verslo komandoje | Savininkas → koordinatorius → paskirti specialistai | Darbo rodinyje: Eiga · Žingsniai · Rezultatai · Patikros |
| Pokalbiai · Darbai · Rezultatai · Komanda · Verslas | Trumpi atsakymai, klausimai ir nuorodos į rezultatus | Dokumento rodinyje: turinys, redakcija, būsena ir grįžimas |
| Prisegti ir naujausi to verslo pokalbiai | Visada pasiekiamas žinutės laukas ir aiškus jos kontekstas | Skaitymo vietą išsaugantis išplėtimas ir suskleidimas |
| Paskyra ir pagalba apačioje | Veiksmas pagal tikrą dabartinį etapą | Šaltiniai, patikros ir istorija prie konkretaus įrašo |

Pirmame matomame ekrane yra pasirinktas verslas, aktyvus pokalbis, dabartinė užduotis ir kitas būtinas veiksmas. Visa programa netampa viena ilga vertikalia ataskaita. Kiekviena sritis slenka savarankiškai; nauja žinutė neatitraukia nuo skaitomos istorijos. Pokalbio laukas neišnyksta atvėrus planą ar rezultatą.

Orientacinis desktop išdėstymas: kairė 240–264 px, pokalbis gauna likusią erdvę, dešinė 360–440 px. Dydžiai valdomi, tačiau pokalbis nesuspaudžiamas žemiau patikroje nustatyto patogaus pločio. Pirmiausia suskleidžiama dešinė sritis, o siauresniame lange — kairė. 1366 px pločio darbas turi likti patogus. Atskirą rezultatą galima atverti plačiai ir vienu veiksmu grįžti į tą patį pokalbį, juodraštį bei skaitymo vietą. Naujam klientui dešinė sritis neprivalo būti atverta, kol joje nėra naudingo turinio.

Iš Codex perimame stabilų konteksto pasirinkimą, pokalbio pirmenybę, valdomas sritis ir atskirą rezultato peržiūrą. Terminalas, Git pakeitimai, failų medžiai ir papildoma nuolatinė ikonų juosta nėra verslo naudotojo pagrindinė navigacija.

## Susikaupimo rodinys

Savininko papildomi Codex ekranai rodo patogią suskleistos navigacijos ir trumpos darbo kortelės kryptį. **Susikaupti** yra aiškus vieno paspaudimo veiksmas: kairė navigacija paslepiama, pokalbis gauna daugiau vietos, o esamoje dešinėje srityje atveriama pasirinkto darbo santrauka. Pasirinktas verslas išlieka matomas ir pasirenkamas kompaktiškame viršutiniame valdiklyje. Atkurti išdėstymą grąžina ankstesnes sritis, atvertą objektą ir skaitymo vietą; juodraštis bei žinutės nuoroda nesikeičia.

Santrauka atsako į keturis klausimus: kas dabar vyksta, kurie specialistai pasitelkti, ko reikia iš savininko ir koks paskutinis naudingas rezultatas. Rodoma tik pasirinkto darbo tikra būsena; kai darbo nėra, pateikiamas vienas naudingas kitas žingsnis. Kelių darbų atveju pasirinkimą galima pakeisti aiškiai įvardytame valdiklyje, ne sekant paskutinį agento įvykį. Susijęs pokalbis atveriamas atskiru veiksmu.

Ši santrauka neužima ketvirtos srities ir nedubliuoja kitur rodomų pranešimų. Visa eiga ir dokumentas atveriami iš jos; Grįžti į santrauką išlaiko susikaupimo rodinį. Įprastas progresas neatveria kortelės automatiškai. Navigaciją ir dešinę sritį taip pat galima valdyti atskirai. Telefone išlieka vienos srities perjungimai; darbo santrauka yra Darbo pradinis rodinys, o ne siauras nuolatinis stulpelis.

## Navigacija ir puslapiai

Viršuje kairėje, kur savininko pavyzdyje yra Codex pasirinkimas, rodomas pasirinktas verslas. Paieška leidžia rasti visus dabar leidžiamus verslus; naujausi ir prisegti padeda grįžti greičiau. Šiame pasirinkime yra Mano verslai ir Naujas verslas. Idėjos bei kuriami verslai turi aiškų tipo ir etapo žymėjimą; jie nepaverčiami registruotais verslais vien dėl pokalbio pavadinimo.

Po verslo pasirinkimu yra **Naujas pokalbis**. Jis pradeda kitą temą tos pačios verslo komandos erdvėje. **Naujas verslas** pradeda atskirą idėjos ar prijungimo procesą. **Naujas darbas** yra pavedimas koordinatoriui, kuris gali likti tame pačiame pokalbyje. Šie veiksmai neturi bendro klaidinančio nukreipimo. Kol atitinkamos canonical sutarties nėra, sąsaja nesiūlo fiktyvaus veikiančio naujos temos kūrimo.

| Nuolatinė skiltis | Paskirtis |
| --- | --- |
| Pokalbiai | Bendras komandos pokalbis ir išsaugotos temos. Prisegti, naujausi, paieška ir istorija. Nereikia atskiro pokalbio kiekvienam specialistui. |
| Darbai | Reikalingi savininko sprendimai, aktyvūs darbai, priklausomybės ir baigtų darbų istorija. Pasirinkimas atveria darbo detales, automatiškai nekeisdamas pokalbio. |
| Rezultatai | Visi šio verslo išsaugoti dokumentai, peržiūros ir kiti rezultatai, įskaitant peržiūrai parengtus juodraščius. Naujausia redakcija sąraše, ankstesnės — dokumento istorijoje. |
| Komanda | Koordinatorius ir specialistai: paieška pagal paskirtį, sritys, gebėjimai, parengtis ir darbai. Pridėti agentą pradeda koordinatoriaus valdomą parengimą. |
| Verslas | Apžvalga, faktai ir tikros prijungtos verslo priemonės. Iš čia pasiekiami nustatymai, prieigos ir integracijų paruošimas. |

Penki aiškūs objektų tipai išlieka ir turint dvidešimt agentų. Paskyrų, profesijų ar neprijungtų modulių daugėjimas neprideda naujų nuolatinės navigacijos eilučių. Rezultatai turi atskirą vietą, kad žmogus rastų dokumentą neprisimindamas jį sukūrusio pokalbio ar užduoties.

Verslo papildomos priemonės pasiekiamos Verslo skiltyje ir konkrečių darbų kontekste:

| Išsamus turinys ar verslo priemonė | Ką žmogus joje mato ir daro |
| --- | --- |
| Apžvalga | Etapas, svarbiausias rezultatas, kliūtis, reikalingas savininko veiksmas ir paskutiniai pakeitimai. |
| Verslo planas | AI santrauka, pasirinktas modelis, pirkėjai, ekonomika, vykdymas, klientų paieška, rizikos ir versijos. Galima aptarti ir patvirtinti tik konkrečią dabartinę redakciją. |
| Svetainė | Puslapių medis, peržiūra desktop/mobile, funkcijų būsena ir užklausos kelias. Tikras draft atskirtas nuo patikrintos bei viešos versijos. |
| Turinys | Turinio planas, tekstai, media, redakcijos ir publikavimo būsena. Neapkrauta techniniais failų keliais. |
| Dizainas | Brandas, struktūra, variantai ir aiškūs prieš/po pakeitimai. Dizainerio profilis priklauso Komandai, o jo darbai bei variantai — Darbams ir Rezultatams. Dabartinės svetainės pagrindo sąlygos išlieka. |
| Klientai | Užklausos, kontaktai, pokalbiai, būsenos ir kitas veiksmas, kai konkretus modulis prijungtas bei leidžiamas. |
| Agentai | Paskirtis, užduotys, žinių šaltiniai, leidimai, paruošimas, esama kalibracija ir aktyvavimo būsena. |
| SEO ir GEO | Faktinės patikros, turinio spragos, indeksavimo ir matavimo duomenys, kai jie prieinami. |
| Rodikliai | Tikros užklausos, konversijos, agentų veikla ir išlaidos. Nežinoma kaina ar neprijungtas matavimas nerodomi kaip nulis. |
| Nustatymai | Verslo faktai, komanda ir teisės, domenas, integracijos, kanalai, pranešimai ir duomenų valdymas. |

Ši lentelė aprašo modulių turinį, o ne dešimt papildomų pagrindinio meniu eilučių. Katalogas, rezervacijos, apskaita ar tiekėjai ateina iš tikrų verslo modulių. Prijungtos priemonės rodomos pagal paskirtį ir teises; atskiras Priemonių pasirinkimas leidžia rasti dar neparuoštą galimybę bei jos parengimo kelią. Neprijungtų modulių siena nepasitinka žmogaus prieš pirmą žinutę. Nuosava istorija išlieka pasiekiama.

Pokalbių rodinyje po kompaktiška navigacija pirmiausia matomi to verslo prisegti ir naujausi pokalbiai. Jų temos gali būti kampanija, svetainė ar naujo agento parengimas; specialistai dėl to netampa atskirais privalomais chatais. Galima rasti, pervadinti, prisegti ir archyvuoti pagal įgyvendintą canonical sutartį. Dabartinės vietinės žymos neteikiamos kaip tarp įrenginių išsaugotas pervadinimas.

Pasirinkto verslo istorijoje rodoma tik canonical ryšiu jam priskirta istorija. Nepatvirtinto ryšio portfelio pokalbiai lieka atskiroje Mano verslai / Portfelio istorija vietoje, išsaugant savininko prieigą. Kito verslo duomenys, žinutės ir juodraščiai nepersineša keičiant pasirinkimą.

## Pokalbis centre

Pirmą kartą galima parašyti vieną sakinį arba pasirinkti Padėk rasti idėją. AI pateikia suprantamus klausimus ir pasirinkimų rekomendacijas. Atsakymą galima rinktis arba parašyti savo žodžiais; klausimo priežastis pateikiama trumpai. Žmogaus neprašoma parengti techninės specifikacijos.

AI žinutės pirmiausia pateikia išvadą ir kitą žingsnį. Didelės ataskaitos, failai ir patikros atveriami dešinėje iš aiškaus žinutės rezultato. Ilga informacija nėra privalomai įklijuojama į chatą. Naujesnės žinutės turi indikatorių, kol žmogus skaito ankstesnes.

Pagrindinis žinutės gavėjas yra koordinatorius. Jo pavedimas specialistui ir specialisto atsakymas susiejami su ta pačia užduotimi bei pokalbiu; atsakymo autorius rodomas pagal tikrą core vykdymo įrašą. Atsakant į specialisto žinutę, pirmoje versijoje pastaba perduodama koordinatoriui su nuoroda į tą rezultatą. Tiesioginis savininko `@agentas` pasirinkimas gali būti vėlesnis papildymas. Komanda gauna darbui reikalingą bendro konteksto dalį, o ne automatiškai iš naujo analizuoja visą istoriją po kiekvienos žinutės.

Pokalbyje matomi naudingi paskyrimai, specialistų išvados, svarbūs nesutarimai ir koordinatoriaus sprendimas. Įrankių kvietimai, pasikartojantis progresas ir tarpiniai bandymai lieka Eigoje. Trumpą Pasitelkti specialistai santrauką galima išskleisti. Koordinatorius neturi iš naujo pakartoti viso kiekvieno specialisto atsakymo.

**Pokalbis ir darbas yra atskiri.** Vienoje temoje gali būti keli darbai; vienas darbas gali turėti kelias susietas diskusijas. Vienas savininko prašymas gali tapti vienu pagrindiniu tikslu su ribotomis atskiromis užduotimis. Pasirinkus darbą ar dokumentą, keičiasi jo peržiūra dešinėje, bet ne tyliai žinutės paskirtis. Atverti susijusį pokalbį yra atskiras aiškus veiksmas. Pokalbio archyvavimas savaime nestabdo jo darbų; darbo sustabdymas neištrina diskusijos. Jei veiksmas turi abu padarinius, sąsaja juos aiškiai įvardija.

**Atsakyti ir Aptarti šį rezultatą** prie žinutės lauko prideda pašalinamą nuorodą, pavyzdžiui, Dėl: pradžios puslapis · 3 redakcija. Gavėjas lieka koordinatorius. Nuoroda remiasi tikru įrašo ID ir redakcija, o ne vien teksto pavadinimu. Vien dokumento atvėrimas nuorodos neprideda. Jei jau parašytas kito konteksto juodraštis, žmogus gali susieti jį su rezultatu arba išsaugoti ir rašyti naują; jo žodžiai neperrašomi. Pridėti agentą laikosi tos pačios juodraščio apsaugos.

Koordinatorius trumpai pasitikslina tik tada, kai nėra aišku, kuriam darbui skirta pastaba. Nauja užduotis, esamo darbo pastaba ir sustabdymas turi atskiras reikšmes core sutartyje. Esamos eilės, lygiagretumo ir siuntimo teisės lieka serverio atsakomybė; UI nežada visada leidžiamo siuntimo ar kelių darbų vykdymo, kol jų sutartys neįgyvendintos.

Žinutės juodraštis išlieka keičiant skiltį. Kai vykdymas neleidžia siųsti naujos žinutės, galima toliau rašyti vietinį juodraštį; siuntimo būsena ir priežastis aiškios. Nepatvirtintas siuntimo rezultatas nėra naujas automatinis bandymas. Atskiro verslo ar paskyros juodraščiai nesimaišo.

Pagrindiniai kontekstiniai veiksmai: Aptarti planą, Peržiūrėti pakeitimus, Patvirtinti šią versiją, Kurti verslą, Atverti svetainę. Siųsti žinutę, patvirtinti planą, paleisti darbą ir viešai publikuoti yra skirtingi veiksmai.

## Dešinė sritis ir rezultatų peržiūra

Viršuje visada matomas pasirinktas objektas. Darbo rodinyje įvardijamas darbas ir jo verslas; dokumento rodinyje — verslas, rezultato pavadinimas ir tiksli redakcija. Užduoties kilmė yra nuoroda, kai ji yra: importuotas ar atskirai prižiūrimas dokumentas neprivalo turėti išgalvotos užduoties. Tas pats rezultatas gali būti naudojamas keliuose darbuose.

Tik **darbo rodinys** turi keturias pastovias skiltis **Eiga · Žingsniai · Rezultatai · Patikros**. Jų perjungimas nepakeičia kairės navigacijos, pasirinkto verslo ar pokalbio. Agento profilis, dokumentas ir verslo priemonė turi savo prasmingą turinį; jiems nerodomos klaidinančios darbo skiltys.

**Eiga:** pasirinktos užduoties tikslas, būsena, reikalingas savininko veiksmas, pasitelkti specialistai ir kliūtys. Detali veiklos istorija išskleidžiama pagal poreikį. Aktyvus, laukiantis, baigtas ir nepavykęs darbas atskirti. Kūrėjo, kritiko ir koordinatoriaus būsenos rodomos tik ten, kur iš tikrųjų vyksta ši eiga; kitų darbų dalyviai gaunami iš tikro vykdymo įrašo. Nuoseklūs vykdymai neatvaizduojami kaip lygiagretūs. Slapti promptai ir vidinis modelio mąstymas nerodomi.

**Žingsniai:** šio darbo planas, priklausomybės, atsakomybės ir neatsakyti klausimai. Paprastas darbas gali turėti vieną tikrą žingsnį. Verslo planas, kampanijos planas ar turinio planas yra atskiri įvardyti dokumentai Rezultatuose; jų versijos ir patvirtinimas nesupainiojami su vykdymo žingsniais. Verslo plano santrauka, dešimt sprendimų sričių, klientų paieškos ir įrankių planai išlieka tame dokumente.

**Rezultatai:** svetainės peržiūra, puslapiai, turinys, dizaino variantai, katalogai ir kiti tikri artefaktai. Sąrašas turi rūšį, būseną, datą ir versiją. Paspaudus atveriamas rezultatas, iš kurio matomi jo šaltiniai, pokalbis bei pakeitimų istorija. Vidiniai runtime failai nerodomi kaip klientui naudingi dokumentai.

Darbo rezultatai ir viso verslo Rezultatų biblioteka remiasi tais pačiais išsaugotais įrašais. Bibliotekoje viena eilutė atitinka rezultatą, o ne kiekvieną jo redakciją. Rodomi ir peržiūrai parengti juodraščiai; filtrai padeda rasti paskirtį, būseną bei kilmę. Failo techninį pavadinimą ir atsisiuntimą galima rasti papildomai, tačiau pagrindinis pavadinimas yra Verslo pasiūlymas, Turinio planas ar Svetainės peržiūra.

Atvertas dokumentas pakeičia rezultatų sąrašą, o ne pridedamas po juo į ilgą slenkamą ataskaitą. Grįžti į rezultatus grąžina filtrą ir skaitymo vietą. Dokumento antraštėje yra redakcija, tikra būsena, patikros ir tikslios redakcijos veiksmai. Nauja redakcija rodoma kaip pasirinkimas; žmogaus skaitoma versija nepakeičiama tyliai. Atvertas rezultatas dar nėra patvirtintas ar paskelbtas.

**Patikros:** aiškūs rezultatai ir ką reikia sutaisyti. Atskirai vietinė kokybė, funkcijos, media/redakcija, SEO/GEO, domenas ir viešas paleidimas. Detalus pagrindimas pasiekiamas iš konkrečios patikros. Esama kalibracija pasiekiama agento kontekste, o ne kaip visiems darbams bendras vienas balas.

Istorija pasiekiama iš užduoties, ataskaitos ar artefakto; nereikia penkto nuolat tuščio pagrindinio tabo. Pasirinkta dešinės skiltis ir jos dydis išlieka grįžus į pokalbį. Pranešimas apie AI baigtą darbą neperjungia žmogaus dabar skaitomo dokumento.

Plačios lentelės, apskaita, klientų sąrašai ir dideli redaktoriai turi išplėstą darbo rodinį. Pokalbis bei juodraštis išsaugomi, o Grįžti į pokalbį lieka aiškus. Tokie moduliai negrūdami į 360 px peržiūrą; visi jų veiksmai vis tiek remiasi konkretaus modulio teisėmis ir esama core sutartimi.

## Didelė komanda ir dėmesio valdymas

Komanda ieškoma pagal agento vardą, paskirtį ir gebėjimą, pavyzdžiui, paruošti sąskaitas. Sritys gali būti Finansai, Dizainas, Rinkodara, Aptarnavimas ar kita tikrai pridėta sritis. Profilyje atskirai matoma, ką agentas gali atlikti, ar tam parengtas ir ar dabar vykdo darbą. Rengiamas, Tikrinamas, Paruoštas ir Pristabdytas nėra vienos užduoties būsenos. Parengtas profilis ar narystė komandoje savaime neįjungia išorinio kanalo.

Koordinatorius žino komandos registrą, specialistų paskirtis ir leidžiamus gebėjimus. Specialistai gauna bendrus patvirtintus faktus ir savo darbui leistiną kontekstą pagal versijuotą architektūros sutartį. Visų agentų automatinis vykdymas po kiekvienos žinutės nereikalingas; bendras pokalbis taip pat nesuteikia visiems prieigos prie ribotų apskaitos ar kitų duomenų.

Naujo agento parengimas rodomas kaip vienas tęstinis darbas: paskirtis → šaltiniai ir įrankiai → esamas kalibravimas → pataisos ir patikros → patikrintos versijos pritaikymas → įtraukimas į komandą. Žmogus neprivalo valdyti šių žingsnių atskirais chatais. Trūkstamas gebėjimas įvardijamas su konkrečia priklausomybe; vien aprašas nevirsta universaliu veikiančiu agentu.

**Darbų skaitiklis reiškia reikalingus jūsų veiksmus.** Neperskaitytos žinutės ir foninis progresas turi atskiras reikšmes. Viena užduotis gauna vieną sugrupuotą dėmesio įrašą, tačiau jame gali būti keli nepriklausomi sprendimai, pavyzdžiui, patvirtinti tekstą ir prijungti šaltinį. Kiekvienas sprendimas susietas su tikslia redakcija bei veiksmu; vienas patvirtinimas nenurašo kitų kliūčių. Užduoties baigtis nepatvirtina publikavimo.

Įprastos būsenos lieka Eigoje. Svarbus rezultatas, būtinas klausimas ar nesutarimas pasiekia pokalbį, sugrupuotas pagal darbą. Naujas įvykis neatveria skydelio ir neatitraukia nuo skaitomos vietos. Kito verslo svarbus veiksmas pažymimas verslo pasirinkime pagal dabartines prieigas; detalės atveriamos tik aiškiai pasirinkus tą verslą.

## Visas kliento kelias

1. Prisijungimas ir verslų pasirinkimas. Naujam žmogui aiškūs du veiksmai: Pradėti nuo idėjos arba Prijungti turimą verslą.
2. Pokalbis ir tyrimas. Centre klausimai, dešinėje faktinis tyrimo progresas; iš žmogaus renkami tik reikšmingi nežinomi sprendimai.
3. Plano aptarimas. Dešinėje išsaugota santrauka ir redakcija, centre aptarimas. Pastabos kuria naują versiją.
4. Aiškus Kurti verslą. Patvirtinamas tikslus planas; pradedamas realus statymas ir matomos jo priklausomybės.
5. Kūrimas ir patikra. Kūrėjas, kritikas ir koordinatorius rodo tikrus rezultatus, pataisymus bei kliūtis; užbaigta dalis nėra visas verslas.
6. Svetainės pagrindo priėmimas. Veikiantis kliento kelias ir būtinos patikros, tada atveriami atitinkami tolesni moduliai.
7. Dizaineris ir verslo agentai. Prašymas koordinatoriui → išsaugotas aprašas → šaltinių/leidimų paruošimas → esama kalibracija ir patikros → patikrintos versijos pritaikymas → atskiras kanalų aktyvavimas.
8. Paleidimas ir kasdienis darbas. Tikra domeno/hostingo/integracijų būsena; klientų užklausos, rezultatai ir patobulinimai toje pačioje erdvėje.

## Būsenos ir pasitikėjimas

Užduotims naudojamas nuoseklus žodynas: Laukia, Dirbama, Reikia jūsų atsakymo, Parengta peržiūrai, Sustabdyta. Reikia pataisyti nurodo konkrečias rezultato kokybės pastabas; techninis vykdymo gedimas įvardijamas kaip klaida su priežastimi ir atkūrimo veiksmu. Neprijungta galimybė nevadinama Sustabdyta. Patikrinta priklauso konkrečiai patikrai ir jos apimčiai. Viešai paleista rodoma tik pagal atskirą faktinį paleidimo įrodymą. Nežinoma būsena ir nepatikrinta dalis nevadinamos sėkme.

Ryšio praradimas turi paskutinio atnaujinimo laiką, aiškų pasenusių duomenų žymėjimą ir saugų Atnaujinti. Skaitymo atnaujinimas nepaleidžia modelio ar naujo darbo. Modelio klaida su išsaugotu kandidatu palieka matomą nepatvirtintą juodraštį. Sustabdyti rodo patvirtintą serverio rezultatą; įrašų ir apskaitos istorija išlieka.

Kritiko nesutikimas atvaizduojamas kaip konkrečios taisytinos pastabos ir susiję rezultatai. Neišgalvotas procentinis progresas, animuotas agento mąstymas ar vienodas viso verslo kokybės balas nenaudojami.

## Mobile ir vizualinė sistema

Desktop pirmiausia turi tris sritis. Tarpiniame plotyje išlieka kairė ir patogaus pločio pokalbis; dešinė atveriama darbo rodiniu su aiškiu grįžimu. Telefone vienu metu rodoma viena sritis su Pokalbis, Darbas ir Verslas perjungimais. Tai sričių, o ne antros informacijos hierarchijos pasirinkimas: Verslas rodo verslo pasirinkimą ir kompaktišką navigaciją, Pokalbis — pasirinktą temą, Darbas — pasirinktą objektą. Verslo pasirinkimas ir pokalbiai nepaslepiami po dešimčia modulių. Darbo antraštėje telefone matomi verslas, darbas ar rezultatas ir redakcija. Žinutės laukas, klaviatūra, atgal veiksmas ir pasirinktas kontekstas neprarandami. 320 px plotis persitvarko be įprasto teksto horizontalaus slinkimo.

Kryptis — santūri darbo aplinka, paremta savininko pateiktu Codex pavyzdžiu. Tamsus, šviesus ir sistemos režimai; aiški neutrali hierarchija ir vienas akcentas pasirinkimui bei pagrindiniams veiksmams. Jokio vienodai akcentuoto kortelių sienos efekto. Viena gerai sureguliuota lietuviškus ženklus palaikanti šriftų šeima, skaitomi label ir tekstai, vientisi tarpai ir valdikliai. Spalva nėra vienintelė būsenos indikacija.

Tabai ir skydeliai valdomi klaviatūra, turi matomą fokusą ir teisingą grįžimą jį uždarius. Regionų antraštės, prasmingi mygtukų pavadinimai, skaitomi kontrastai, 200% mastelis ir sumažinto judesio režimas. Svarbūs perspėjimai bei laukų klaidos nemažinami, kad tilptų į siaurą stulpelį.

## Ikonos, teksto akcentai ir judesys

Savininko papildymas — 2026-10-13: aplinka turi jaustis vientisa, šiuolaikiška ir tiksliai reaguoti į veiksmus. Kokybės pojūtis remiasi aiškumu, nuosekliais valdikliais ir išsaugotu kontekstu. Toliau aprašomi įgyvendinimo reikalavimai; paspaudžiamas maketas demonstruoja tik vietines sąveikas, ne agentų vykdymą.

Viena linijinių ikonų sistema naudojama prie penkių navigacijos skilčių, darbo tabų, pagrindinių veiksmų ir agentų vaidmenų. Ikonos lieka kartu su pavadinimais; profesija nėra atskira spalvų sistema. Pasirinkta skiltis, žinutės autorius, rezultato pavadinimas ir būtinas savininko veiksmas gauna aiškų teksto akcentą. Inter 400 skirtas tekstui, 500 — įprastiems valdikliams, 600 — pasirinkimui ir pagrindiniams veiksmams; 700 naudojamas tik trumpam svarbiam akcentui, kai jo reikia. Antrinė informacija neparyškinama vien dėl ikonų pridėjimo. Tikri šrifto svoriai ir lietuviški ženklai išlieka tikrinami.

| Sąveika | Judesio paskirtis ir orientacinė trukmė |
| --- | --- |
| Užvedimas, paspaudimas, klaviatūros pasirinkimas | Aiškus valdiklio atsakas per 100–140 ms; funkcija nepriklauso nuo užvedimo. |
| Darbo tabas, dokumento atvėrimas, grįžimas | Turinys keičiasi per 180–220 ms; atvertas objektas, redakcija ir grįžimo vieta išlieka aiškūs. |
| Susikaupti ir išdėstymo atkūrimas | Vienas pagrindinis erdvinis perėjimas per 240–280 ms parodo, kur persikėlė darbo sritis. Pokalbio istorija ir juodraštis nekuriami iš naujo. |
| Gauta nauja žinutė ar išsaugotas rezultatas | Trumpas vietinis patvirtinimas; skaitomos istorijos neperstumia. Skaitant senesnes žinutes pateikiamas aiškus naujų žinučių veiksmas. |
| Vykdomas darbas ir nutrūkęs ryšys | Tikra serverio būsena, paskutinio atnaujinimo laikas ir paaiškinimas. Judesys nesukuria fiktyvaus progreso ar sėkmės. |

Perėjimai greitai sulėtėja pabaigoje, neturi šokinėjimo ar privalomos pradžios animacijos. Ilgas atsakymas, foninė veikla ir agento mąstymas neanimuojami kaip pasirodymas. Naudojamos esamos naršyklės galimybės; vien mikrointerakcijoms nereikia naujos bibliotekos. Vienu metu ribojamas animuojamų sričių skaičius, neanimuojama visa ilgų žinučių istorija. Spartus pakartotinis paspaudimas nutraukia ankstesnį perėjimą ir palieka naujausią pasirinktą būseną; valdikliai nelaukia animacijos pabaigos.

Sumažinto judesio režime erdviniai perėjimai išjungiami, tačiau pasirinkimas, paspaudimo atsakas ir būsenų tekstai išlieka. Patikra apima desktop ir telefoną, klaviatūrą, pakartotinį perjungimą, sumažintą judesį, ilgą istoriją, skaitymo vietą, juodraštį ir konkrečios redakcijos nuorodą. Ikonų bei teksto patikra apima tamsią ir šviesią temas, siaurą ekraną bei teksto tarpų pakeitimus. Maketo judesio patikra nėra faktinės programos našumo ar žmogaus UI/UX priėmimo įrodymas.

## Modulinis įgyvendinimas

Vienas bendras WorkspaceShell, BusinessSwitcher, Navigation, ConversationPane, WorkPanel, ActivityFeed, ArtifactViewer, ApprovalCard ir būsenų komponentų rinkinys. Komandos katalogas, Darbų sąrašas ir Rezultatų biblioteka yra to paties workspace rodiniai, ne atskiri core. Pasirinktas verslas, pokalbis, peržiūrimas objektas ir rengiamai žinutei pridėta nuoroda yra atskiros būsenos. Vizualiniai tokenai ir modulio registras leidžia keisti išdėstymą bei funkcijas nekeisdami core verslo taisyklių.

Esamos discovery, creation, customer-agents, content ir kitos sutartys lieka duomenų šaltinis. UI turi atskirti idea/discovery ir registered-business tapatybes, actor/environment/scope, ataskaitų hash/redakcijas ir modulio leidimus. Naujai trūkstanti projekcija pirmiausia dokumentuojama bei įgyvendinama bendrame adapteryje. Vien gražus tabas neįjungia neprijungto runtime.

Istorijos importas ar nauja paskyra nesuteikia svetimo verslo prieigos. Seni URL lieka palaikomi arba saugiai nuveda į tą patį įrašą naujoje erdvėje. Dideli sąrašai puslapiuojami. Atvertas rezultatas ir jo redakcija nesupainiojami su vėlesniu agento darbu. Negalima naudoti fiktyvių agentų žinučių ar simuliuoto progreso kaip priėmimo įrodymo.

## Įgyvendinimo seka ir priėmimas

1. Bendra erdvės struktūra ir dizaino komponentai: penkių paskirčių navigacija, atskiri Naujas verslas / Naujas pokalbis veiksmai, verslo pasirinkimas, sričių valdymas, būsenos, light/dark, desktop/mobile. Pirmas peržiūrimas ekranas yra visas workspace, ne atskira homepage kortelė.
2. Tikras pradžios pokalbis, istorija ir plano aptarimas tame pačiame išdėstyme; perkelti esamą duomenų kelią ir normalų prisijungimą.
3. Atskiras darbo pasirinkimas, specialistų veikla, bendras rezultatų sąrašas, dokumento peržiūra, redakcijos, patikros ir tikslūs patvirtinimo veiksmai. Naujos temos, dalyvių ir pavedimų sutartys pirmiausia sutariamos core; neimituojamas neprijungtas grupinis runtime.
4. Svetainės, turinio, dizainerio, agentų ir verslo veiklos skiltys su tikrais modulio availability/permission vartais. Neįgyvendintos galimybės turi aiškų paruošimo kelią.
5. Naudojimo priėmimas su išsaugotomis esamų testinių būsenų projekcijomis: naujas klientas, keli verslai, ilgas chatas, nepavykęs darbas, dalinis juodraštis, neigiama peržiūra, pasenusi redakcija, nutrūkęs ryšys ir neprieinamas modulis. Tik po UI/UX priėmimo tęsti realius modelių pipeline bandymus bei pokalbio kalibravimą.

Priėmimo tikslai: žmogus iš pirmo ekrano supranta pasirinktą verslą, vykstantį darbą ir kitą veiksmą; atveria rezultatą ir grįžta neprarasdamas pokalbio; pakeitęs verslą negauna kito verslo duomenų; mato skirtumą tarp kandidato, patikrinto rezultato ir paleidimo; neprivalo nuslinkti per visą ataskaitą, kad galėtų atsakyti. Tikras keyboard/mobile/reflow ir būsenų priėmimas fiksuojamas atskirai nuo maketo patrauklumo.

Papildomi peržiūros scenarijai: dešimt verslų ir dvidešimt agentų; trys susiję bei nesusiję darbai tame pačiame pokalbyje; rezultatas be kilmės užduoties; keli to paties darbo sprendimai; nepatvirtinto ryšio portfelio istorija; įrašytas juodraštis prieš Aptarti rezultatą ar Pridėti agentą; parengtas ir neparengtas tos pačios profesijos agentas; užduoties pasirinkimas nepakeičiant pokalbio; archyvavimas nestabdant darbo; tarpinis ekrano plotis. Patikrinama, ar pirmą kartą prisijungęs žmogus be agentų sistemos paaiškinimo gali paprašyti darbo, rasti rezultatą ir grįžti prie savo žinutės. Dviejų agentų sutarimas nėra žmogaus naudojimo patikros ar runtime priėmimo pakaitalas.

UI/BFF įgyvendinimo savininkas — esamas koordinatorius jo own portal worktree/PR. Root palaiko core sutartis ir šį planą; foreign checkout nekeičiami. Funkciniai svetainės/controller, kanalų ir viešo paleidimo trūkumai lieka atskiri darbai po sąsajos etapo.
