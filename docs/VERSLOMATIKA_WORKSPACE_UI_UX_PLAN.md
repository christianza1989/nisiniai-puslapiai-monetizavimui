# Verslomatikos darbo erdvės UI ir UX planas

Verslomatika tampa viena nuolatine pasirinkto verslo darbo erdve. Savininkas centre kalbasi su AI komanda, kairėje pasirenka verslą, skiltį ir pokalbį, o dešinėje mato darbą bei rezultatus. Planas numato visą kliento kelią; pirmas įgyvendinimas turi leisti aiškiai pradėti pokalbį, aptarti planą ir suprasti tikrą vykdymo būseną.

Savininko prioritetas: pirmiau sutvarkyti UI/UX, tada tęsti tikrus modelių bandymus. Šis dokumentas yra siūloma įgyvendinimo kryptis, o ne jau veikiančios sąsajos ar užbaigtos platformos įrodymas. Dabartiniai duomenys, API teisės ir bandymų istorija išsaugomi.

**Komandos pokalbio papildymas — 2026-10-13:** savininkas pasirinko bendravimą pirmiausia su koordinatoriumi. Koordinatorius pagal užduotį pasitelkia specialistus, o jie savo vardu atsako tame pačiame pokalbyje. Tam numatyti tikri dalyvių ID, aiškūs pavedimai, bendras versijuotas kontekstas ir naujų agentų prijungimas pagal jų paskirtį bei parengtį. Visi agentai automatiškai nevykdomi po kiekvienos žinutės. [Komandos pokalbio architektūros papildymas](VERSLOMATIKA_TEAM_CHAT_ARCHITECTURE.md) yra siūlomas būsimas core ir sąsajos išplėtimas; dabartinė trijų vaidmenų vykdymo eiga dar nėra ši grupinio pokalbio sistema.

## Pagrindinis ekranas

| Kairė — verslo erdvė | Centras — pokalbis | Dešinė — darbo sritis |
| --- | --- | --- |
| Verslo pasirinkimas ir Naujas verslas | Pokalbio pavadinimas, verslas, būsena | Veikla · Planas · Rezultatai · Patikros |
| Apžvalga, planas, svetainė, turinys, dizainas | Žinutės, AI klausimai, siūlomi sprendimai | Pasirinkto darbo ar dokumento turinys |
| Klientai, agentai, SEO/GEO, rodikliai | Trumpi rezultatų pranešimai su nuorodomis | Agentų būsenos, puslapio peržiūra, pakeitimai |
| To verslo išsaugoti pokalbiai | Visada pasiekiamas žinutės laukas | Skiltį galima išplėsti arba suskleisti |
| Nustatymai ir pagalba | Pagrindinis veiksmas pagal dabartinį etapą | Istorija ir šaltiniai pasiekiami iš konkretaus įrašo |

Pirmame matomame ekrane yra pasirinktas verslas, aktyvus pokalbis, dabartinė užduotis ir kitas būtinas veiksmas. Visa programa netampa viena ilga vertikalia ataskaita. Kiekviena sritis slenka savarankiškai; nauja žinutė neatitraukia nuo skaitomos istorijos. Pokalbio laukas neišnyksta atvėrus planą ar rezultatą.

Orientacinis desktop išdėstymas: kairė240–264px, pokalbis gauna likusią erdvę, dešinė360–440px. Valdomi dydžiai, minimalus patogus pokalbio plotis, suskleidimas ir išplėtimas; proporcijas galutinai vertiname tikrame ekrane. 1366px pločio darbas turi likti patogus. Atskirą artefaktą galima atverti plačiai ir vienu veiksmu grįžti į tą patį pokalbį.

## Navigacija ir puslapiai

Viso produkto lygis: Mano verslai, Naujas verslas, Domenų idėjos, Pranešimai, Paskyra ir Pagalba. Verslo pasirinkimas išlieka toje pačioje vietoje. Dar nesukurtos idėjos aiškiai atskirtos nuo jau registruotų verslų.

| Pasirinkto verslo skiltis | Ką žmogus joje mato ir daro |
| --- | --- |
| Apžvalga | Etapas, svarbiausias rezultatas, kliūtis, reikalingas savininko veiksmas ir paskutiniai pakeitimai. |
| Verslo planas | AI santrauka, pasirinktas modelis, pirkėjai, ekonomika, vykdymas, klientų paieška, rizikos ir versijos. Galima aptarti ir patvirtinti tik konkrečią dabartinę redakciją. |
| Svetainė | Puslapių medis, peržiūra desktop/mobile, funkcijų būsena ir užklausos kelias. Tikras draft atskirtas nuo patikrintos bei viešos versijos. |
| Turinys | Turinio planas, tekstai, media, redakcijos ir publikavimo būsena. Neapkrauta techniniais failų keliais. |
| Dizaineris | Pokalbis apie brandą, struktūrą ir vizualus, variantų peržiūra bei aiškūs prieš/po pakeitimai. Vykdymas galimas tik po tikro svetainės pagrindo priėmimo. |
| Klientai | Užklausos, kontaktai, pokalbiai, būsenos ir kitas veiksmas, kai konkretus modulis prijungtas bei leidžiamas. |
| Agentai | Paskirtis, užduotys, žinių šaltiniai, leidimai, paruošimas, esama kalibracija ir aktyvavimo būsena. |
| SEO ir GEO | Faktinės patikros, turinio spragos, indeksavimo ir matavimo duomenys, kai jie prieinami. |
| Rodikliai | Tikros užklausos, konversijos, agentų veikla ir išlaidos. Nežinoma kaina ar neprijungtas matavimas nerodomi kaip nulis. |
| Nustatymai | Verslo faktai, komanda ir teisės, domenas, integracijos, kanalai, pranešimai ir duomenų valdymas. |

Skiltys grupuojamos į Darbo erdvę, Verslo veiklą ir Nustatymus. Kiekvieno verslo papildomos funkcijos ateina iš jo modulių: katalogas, rezervacijos ar tiekėjai nėra priverstinai įjungiami visiems. Neparuoštos galimybės turi aiškų paaiškinimą ir kitą žingsnį. Jau turima nuosava istorija lieka pasiekiama.

Po navigacija yra to verslo pokalbiai: pagrindinis idėjos/kūrimo pokalbis ir, kai aktualu, Dizainas, Turinys, Klientų paieška, Aptarnavimo agentas. Galima kurti naują pokalbį, pervadinti, prisegti, rasti ir archyvuoti. Trys kūrimo komandos agentai netampa trimis privalomais kliento valdomais chatais.

## Pokalbis centre

Pirmą kartą galima parašyti vieną sakinį arba pasirinkti Padėk rasti idėją. AI pateikia suprantamus klausimus ir pasirinkimų rekomendacijas. Atsakymą galima rinktis arba parašyti savo žodžiais; klausimo priežastis pateikiama trumpai. Žmogaus neprašoma parengti techninės specifikacijos.

AI žinutės pirmiausia pateikia išvadą ir kitą žingsnį. Didelės ataskaitos, failai ir patikros atveriami dešinėje iš aiškaus žinutės rezultato. Ilga informacija nėra privalomai įklijuojama į chatą. Naujesnės žinutės turi indikatorių, kol žmogus skaito ankstesnes.

Pagrindinis žinutės gavėjas yra koordinatorius. Jo pavedimas specialistui ir specialisto atsakymas susiejami su ta pačia užduotimi bei pokalbiu; atsakymo autorius rodomas pagal tikrą core vykdymo įrašą. Atsakant į specialisto žinutę, pirmoje versijoje pastaba perduodama koordinatoriui su nuoroda į tą rezultatą. Tiesioginis savininko `@agentas` pasirinkimas gali būti vėlesnis papildymas. Komanda gauna darbui reikalingą bendro konteksto dalį, o ne automatiškai iš naujo analizuoja visą istoriją po kiekvienos žinutės.

Žinutės juodraštis išlieka keičiant skiltį. Kai vykdymas neleidžia siųsti naujos žinutės, galima toliau rašyti vietinį juodraštį; siuntimo būsena ir priežastis aiškios. Nepatvirtintas siuntimo rezultatas nėra naujas automatinis bandymas. Atskiro verslo ar paskyros juodraščiai nesimaišo.

Pagrindiniai kontekstiniai veiksmai: Aptarti planą, Peržiūrėti pakeitimus, Patvirtinti šią versiją, Kurti verslą, Atverti svetainę. Siųsti žinutę, patvirtinti planą, paleisti darbą ir viešai publikuoti yra skirtingi veiksmai.

## Dešinės srities tabai

**Veikla:** dabartinė užduotis, tikros kūrėjo, kritiko ir koordinatoriaus būsenos, atlikti veiksmai, svarbiausios pastabos ir kliūtys. Aktyvus, laukiantis, baigtas ir nepavykęs darbas atskirti. Jei agentai veikia nuosekliai, sąsaja nesimuliuoja jų lygiagretaus veikimo. Rodoma naudinga darbų santrauka, sprendimai ir įrodymai, o ne slapti promptai ar vidinis modelio mąstymas.

**Planas:** trumpa santrauka pirmame ekrane, toliau10 sprendimų sričių, klientų paieškos ir įrankių planai, priklausomybės bei neatsakyti klausimai. Versijos ir pakeitimų palyginimas; nepatvirtintas kandidatas turi aiškią būseną. Patvirtinimas susietas su atverta redakcija, ne tyliai atnaujintu planu.

**Rezultatai:** svetainės peržiūra, puslapiai, turinys, dizaino variantai, katalogai ir kiti tikri artefaktai. Sąrašas turi rūšį, būseną, datą ir versiją. Paspaudus atveriamas rezultatas, iš kurio matomi jo šaltiniai, pokalbis bei pakeitimų istorija. Vidiniai runtime failai nerodomi kaip klientui naudingi dokumentai.

**Patikros:** aiškūs rezultatai ir ką reikia sutaisyti. Atskirai vietinė kokybė, funkcijos, media/redakcija, SEO/GEO, domenas ir viešas paleidimas. Detalus pagrindimas pasiekiamas iš konkrečios patikros. Esama kalibracija pasiekiama agento kontekste, o ne kaip visiems darbams bendras vienas balas.

Istorija pasiekiama iš užduoties, ataskaitos ar artefakto; nereikia penkto nuolat tuščio pagrindinio tabo. Pasirinkta dešinės skiltis ir jos dydis išlieka grįžus į pokalbį. Pranešimas apie AI baigtą darbą neperjungia žmogaus dabar skaitomo dokumento.

## Visas kliento kelias

1. Prisijungimas ir verslų pasirinkimas. Naujam žmogui aiškūs du veiksmai: Pradėti nuo idėjos arba Prijungti turimą verslą.
2. Pokalbis ir tyrimas. Centre klausimai, dešinėje faktinis tyrimo progresas; iš žmogaus renkami tik reikšmingi nežinomi sprendimai.
3. Plano aptarimas. Dešinėje išsaugota santrauka ir redakcija, centre aptarimas. Pastabos kuria naują versiją.
4. Aiškus Kurti verslą. Patvirtinamas tikslus planas; pradedamas realus statymas ir matomos jo priklausomybės.
5. Kūrimas ir patikra. Kūrėjas, kritikas ir koordinatorius rodo tikrus rezultatus, pataisymus bei kliūtis; užbaigta dalis nėra visas verslas.
6. Svetainės pagrindo priėmimas. Veikiantis kliento kelias ir būtinos patikros, tada atveriami atitinkami tolesni moduliai.
7. Dizaineris ir verslo agentai. Paskirties pokalbis → išsaugotas aprašas → šaltinių/leidimų paruošimas → esama kalibracija → atskiras kanalų aktyvavimas.
8. Paleidimas ir kasdienis darbas. Tikra domeno/hostingo/integracijų būsena; klientų užklausos, rezultatai ir patobulinimai toje pačioje erdvėje.

## Būsenos ir pasitikėjimas

Visur naudojamas tas pats būsenų žodynas: Laukia, Dirbama, Reikia jūsų atsakymo, Parengta peržiūrai, Reikia pataisyti, Patikrinta, Sustabdyta. Viešai paleista rodoma tik pagal atskirą faktinį paleidimo įrodymą. Nežinoma būsena ir nepatikrinta dalis nevadinamos sėkme.

Ryšio praradimas turi paskutinio atnaujinimo laiką, aiškų pasenusių duomenų žymėjimą ir saugų Atnaujinti. Skaitymo atnaujinimas nepaleidžia modelio ar naujo darbo. Modelio klaida su išsaugotu kandidatu palieka matomą nepatvirtintą juodraštį. Sustabdyti rodo patvirtintą serverio rezultatą; įrašų ir apskaitos istorija išlieka.

Kritiko nesutikimas atvaizduojamas kaip konkrečios taisytinos pastabos ir susiję rezultatai. Neišgalvotas procentinis progresas, animuotas agento mąstymas ar vienodas viso verslo kokybės balas nenaudojami.

## Mobile ir vizualinė sistema

Desktop pirmiausia turi tris sritis. Siauresniame lange dešinė sritis tampa pasirinktinai atveriamu plačiu skydeliu; kairė suskleidžiama. Telefone vienu metu rodoma viena sritis su aiškiais Pokalbis, Darbas ir Verslas perjungimais. Žinutės laukas, klaviatūra, atgal veiksmas ir pasirinktas kontekstas neprarandami. 320px plotis turi persitvarkyti be įprasto teksto horizontalaus slinkimo.

Kryptis — santūri darbo aplinka, paremta savininko pateiktu Codex pavyzdžiu. Tamsus, šviesus ir sistemos režimai; aiški neutrali hierarchija ir vienas akcentas pasirinkimui bei pagrindiniams veiksmams. Jokio vienodai akcentuoto kortelių sienos efekto. Viena gerai sureguliuota lietuviškus ženklus palaikanti šriftų šeima, skaitomi label ir tekstai, vientisi tarpai ir valdikliai. Spalva nėra vienintelė būsenos indikacija.

Tabai ir skydeliai valdomi klaviatūra, turi matomą fokusą ir teisingą grįžimą jį uždarius. Regionų antraštės, prasmingi mygtukų pavadinimai, skaitomi kontrastai, 200% mastelis ir sumažinto judesio režimas. Svarbūs perspėjimai bei laukų klaidos nemažinami, kad tilptų į siaurą stulpelį.

## Modulinis įgyvendinimas

Vienas bendras WorkspaceShell, BusinessSwitcher, Navigation, ConversationPane, WorkPanel, ActivityFeed, ArtifactViewer, ApprovalCard ir būsenų komponentų rinkinys. Vizualiniai tokenai ir modulio registras leidžia keisti išdėstymą bei atskiras funkcijas nekeisdami core verslo taisyklių.

Esamos discovery, creation, customer-agents, content ir kitos sutartys lieka duomenų šaltinis. UI turi atskirti idea/discovery ir registered-business tapatybes, actor/environment/scope, ataskaitų hash/redakcijas ir modulio leidimus. Naujai trūkstanti projekcija pirmiausia dokumentuojama bei įgyvendinama bendrame adapteryje. Vien gražus tabas neįjungia neprijungto runtime.

Istorijos importas ar nauja paskyra nesuteikia svetimo verslo prieigos. Seni URL lieka palaikomi arba saugiai nuveda į tą patį įrašą naujoje erdvėje. Dideli sąrašai puslapiuojami. Atvertas rezultatas ir jo redakcija nesupainiojami su vėlesniu agento darbu. Negalima naudoti fiktyvių agentų žinučių ar simuliuoto progreso kaip priėmimo įrodymo.

## Įgyvendinimo seka ir priėmimas

1. Bendra erdvės struktūra ir dizaino komponentai: navigacija, verslo pasirinkimas, pane valdymas, būsenos, light/dark, desktop/mobile. Pirmas peržiūrimas ekranas yra visas workspace, ne atskira homepage kortelė.
2. Tikras pradžios pokalbis, istorija ir plano aptarimas tame pačiame išdėstyme; perkelti esamą duomenų kelią ir normalų prisijungimą.
3. Agentų veikla, užduotys, rezultatų peržiūra, redakcijos, patikros ir konkretūs approval veiksmai.
4. Svetainės, turinio, dizainerio, agentų ir verslo veiklos skiltys su tikrais modulio availability/permission vartais. Neįgyvendintos galimybės turi aiškų paruošimo kelią.
5. Naudojimo priėmimas su išsaugotomis esamų testinių būsenų projekcijomis: naujas klientas, keli verslai, ilgas chatas, nepavykęs darbas, dalinis juodraštis, neigiama peržiūra, pasenusi redakcija, nutrūkęs ryšys ir neprieinamas modulis. Tik po UI/UX priėmimo tęsti realius modelių pipeline bandymus bei pokalbio kalibravimą.

Priėmimo tikslai: žmogus iš pirmo ekrano supranta pasirinktą verslą, vykstantį darbą ir kitą veiksmą; atveria rezultatą ir grįžta neprarasdamas pokalbio; pakeitęs verslą negauna kito verslo duomenų; mato skirtumą tarp kandidato, patikrinto rezultato ir paleidimo; neprivalo nuslinkti per visą ataskaitą, kad galėtų atsakyti. Tikras keyboard/mobile/reflow ir būsenų priėmimas fiksuojamas atskirai nuo maketo patrauklumo.

UI/BFF įgyvendinimo savininkas — esamas koordinatorius jo own portal worktree/PR. Root palaiko core sutartis ir šį planą; foreign checkout nekeičiami. Funkciniai svetainės/controller, kanalų ir viešo paleidimo trūkumai lieka atskiri darbai po sąsajos etapo.
