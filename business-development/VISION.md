# Verslomatika.lt — savininko platformos vizija

Užfiksuota 2026-10-01 iš tiesioginės savininko žinutės idėjų sesijoje `01a0f67b-b3e3-7062-ad1b-66a8737443db`. Pagrindinį platformos domeną **verslomatika.lt** pasirinko savininkas. Tai strateginis orientyras tolesniam planavimui; šioje žinutėje nepavesta dabar įgyvendinti visos platformos, pirkti domenų ar įjungti klientų operacijų. [BDEV-0003](ideas/BDEV-0003.md): **discussing**.

## Produktas

Verslomatika būtų bendra verslų tyrimo, kūrimo, automatizavimo, pardavimo ir valdymo platforma. Nišinės svetainės, domenų vertinimas ir agentų core sudaro jos vidinį kūrimo / paklausos bandymų pagrindą. Klientas galėtų turėti kelis atskirus verslus viename valdymo skydelyje — savo „verslų fermą“ — ir prižiūrėti bendrą rezultatą bei išimtis.

Parduodamo rezultato hipotezė: verslas su savo domenu, pasiūlymu, turiniu, klientų įėjimo keliu, agentų komanda, procesais, prijungtomis teisėtomis integracijomis, matavimo / išlaidų kontrole ir perleidimo arba platformoje eksploatavimo tvarka. Svetainės egzistavimas vienas šio rezultato nepatvirtina.

## Keturi savininko pasirinkti įėjimo keliai

| Kelias | Kliento įėjimas | Siekiamas rezultatas |
|---|---|---|
| Turimo verslo analizė | Klientas įveda savo veikiančio verslo domeną | AI tiria viešą pasiūlymą, nišą ir procesų automatizavimo galimybes; parengia / pristato idėjas, pasiūlymus ir plėtros etapus. |
| Mūsų paruošto verslo įsigijimas | Klientas pasirenka iš mūsų turimų verslų | Įsigyja aiškiai aprašyto etapo verslo paketą, kurį pagal poreikį vėliau tobuliname etapais. |
| Kliento idėjos įgyvendinimas | Klientas pateikia savo verslo idėją AI specialistui | Agentai tiria komercinį modelį, padeda jį sukonkretinti, stato ir pagal įrodymus plečia / automatizuoja. |
| Verslo užsakymas pagal domenų atranką | Klientas pasirenka mūsų pasiūlytą dar laisvą domeną ir verslo hipotezę | Užsako tyrimą / pirmą verslo etapą ant tinkamo domeno. Prieinamumas ir teisės tikrinami pasirinkimo metu. |

„AI ištiria viską“ yra siekiamo išsamumo kryptis. Iš viešo domeno neįmanoma patvirtinti neviešos maržos, vidinių procesų, leidimų ar pajėgumo. Audito rezultatas turės skirti patikrintus viešus faktus, kliento pateiktus faktus, prielaidas ir trūkstamus duomenis. Trūkstami duomenys neturi virsti išgalvotu pasiūlymu ar tariamai veikiančia integracija. Asmeninio inbox ar klientų paskyrų vien domeno įvedimas neatveria.

## Mūsų verslų portfelio ciklas

Savininko planas: apie **45 tūkst. expired domenų → TOP 1 000 → maždaug TOP 100 portfeliui → pirkimas → pirma fazė stebėjimui / skaidriam išankstiniam pardavimui → perspektyviausių verslų plėtra → aukcionas arba fiksuota kaina**.

Tai atrankos / investavimo kryptis, ne jau turimas šimtukas ar patvirtintas jo pelningumas. [Domenų klasifikatoriaus dokumentacija](../domain-sorter/README.md) atskirai nurodo pirmos atrankos ir TOP 1 000 strategijų etapus; galutinis maždaug 100 sąrašas sudaromas po DR ir istorijos patikros. Ši sesija nestabdo ir nekeičia fone vykstančio darbo.

AI balas yra hipotezės atranka. Domeno istorija / nuorodų kokybė, dabartinė registravimo galimybė, komercinis pasiūlymas, vykdymo galimybė ir reali paklausa yra atskiri įrodymai. „Geras expired domenas“ pats nepaverčia verslo pelningu. Pirkti skirtas kapitalas, renovavimo / eksploatavimo sąnaudos ir paklausos įrodymai registruojami atskirai, kai jų yra.

Visos mūsų naujos nišos pradeda nuo Phase 1. Išankstiniame pasiūlyme pirkėjas turi suprasti, ar renkasi hipotezę / kuriamą paketą, vietinį demonstracinį sprendimą, viešą paklausos testą ar veikiančią komercinę veiklą. Nepakeisti išankstinio intereso rinkimo fiktyviu jau veikiančio verslo užsakymu.

## Kelių verslų valdymas klientui

Savininko tikslas: žmogus gali užsisakyti, pavyzdžiui, penkis verslus ir prižiūrėti jų portfelį. Skydelyje jam reikėtų matyti kiekvieno verslo užklausas / sandorius, faktiškai gautas pajamas, išlaidas, agentų ir integracijų būseną, vykdymo išimtis, tobulinimo darbus bei sustabdymo / biudžetų valdiklius. Šie laukai yra produkto reikalavimai, ne dabartinio klientų skydelio egzistavimo įrodymas.

Automatizavimą aprašyti pagal veiksmus: rinkos / turinio tyrimas, užklausų kvalifikavimas, pardavimai, tiekėjo procesas, užsakymas, vykdymas, dokumentai, aptarnavimas ir tobulinimas. Kiekvienas veiksmas turi atskirą realios integracijos, leidimo ir patikros būseną. „Pilnai automatizuotas“ reiškia įrodytą konkretaus verslo veikimo apimtį bei išmatuotą žmogaus priežiūrą. Fizinį darbą gali atlikti sutartas vykdytojas; agentai tada koordinuoja procesą. Nėra universalios jau įrodytos bet kokios nišos autonomijos.

Skirtingų klientų duomenų / mokėjimų / prieigų / leidimų izoliacija yra papildomas platformos reikalavimas. Dabartinė business/environment izoliacija mūsų core savaime neįrodo kelių savininkų produkto. Bendra dabartinė MB Pinet / info@pinet.lt konfigūracija priklauso mūsų tinklui; parduoto ar kliento verslo operatorius ir kontaktai nustatomi pagal tikrą eksploatavimo / perleidimo modelį.

Perleidimui reikia tikrinti, kas parduodama: domenas / kodas / turinys / procesai / integracijų naudojimo teisės / duomenys ir konkretūs rezultatai. Platformoje eksploatuojamo verslo modelis ir visiškai klientui perduodamas verslas nėra savaime tas pats susitarimas. Kliento galimybė išsinešti paketą, keisti prieigas ir tęsti veiklą turi savo patikras.

## Savininko patvirtintas maksimalios autonomijos reikalavimas

2026-10-01 savininkas tiesiogiai patikslino tikslą: turint, pavyzdžiui, 50 nupirktų skirtingų nišų domenų, agentai patys suplanuoja kiekvieno verslo valdymą, susikuria reikalingus įrankius ir vykdo darbą nuo pradžios iki rezultato. Žmogus aptaria / tvirtina naujas verslo idėjas; įprastas planavimas, vykdymas ir techninis taisymas deleguoti agentams. Šis principas **patvirtintas savininko** ir taikomas tolesniam planavimui. Visos platformos įgyvendinimo apimtis bei realių operacijų mandatai iš šio strateginio reikalavimo savaime neatsiranda.

### Organizacija ir savarankiškas įrankių kūrimas

Portfelio valdytojas paskirsto dėmesį ir išteklius pagal kiekvieno verslo stadiją / rezultatus. Kiekvienas verslas turi direktoriaus funkciją, savo planą, rodiklius ir užduočių eilę. Direktorius pasitelkia tyrimo, pardavimų, tiekimo, aptarnavimo, programavimo ir kitus specialistus pagal tikrą užduotį; 50 domenų nereiškia 50 nuolat veikiančių ir sąnaudas kaupiančių vienodų komandų.

Trūkstamo įrankio eiga: konkretus verslo poreikis → esamų įrankių patikra → specifikacija → kūrimas izoliuotoje aplinkoje → klaidų / neteisingų duomenų / verslų izoliacijos bandymai → registruota versija → aktyvavimas leistiname mandate → faktinio veikimo stebėjimas ir prireikus grįžimas į ankstesnę versiją. Naujo techninio įrankio ar rutininės pataisos kūrimas nereikalauja kiekvieną kartą pateikti naujos verslo idėjos savininkui. Bendrai naudingi įrankiai grįžta į bendrą biblioteką; nišos taisyklės lieka jos profilyje.

Agentas užbaigia procesą: suranda problemą, suplanuoja darbą, atlieka veiksmus, patikrina rezultatą, pataiso neatitikimus ir užfiksuoja įrodymą. Jam nepavykęs bandymas turi sukurti kitą pagrįstą veiksmą, taisymą ar ribotą sustabdymą. Savininkui neperduodama programuotojo, tiekėjų tyrėjo ar dokumentų rūšiuotojo rutina.

### Tiekėjai, pristatymas ir aptarnavimas

Savininko aiškiai įvardytas pavyzdys — agentai ieško geriausių prekių pristatymo partnerių. Jie turi suformuluoti nišos poreikį, rasti kandidatus, gauti palyginamas aktualias sąlygas, įvertinti bendrą kainą, geografiją, terminus, grąžinimus ir patikimumą, pasirinkti sprendimą pagal verslo taisykles bei sekti vykdymą. Patvirtintame komunikacijos / sandorių mandate susirašinėjimas, derybos ir įprasti užsakymai vyksta savarankiškai. Partnerio fizinį pristatymą koordinuoja agentai; paieškos rezultatas dar nėra sutarta partnerystė.

### Apskaita ir paruoštas paketas buhalteriui

Savininkas pageidauja kuo daugiau apskaitos darbo perduoti agentams ir tik likusią dalį — tikram buhalteriui. Siekiamas ciklas: originalių dokumentų surinkimas → duomenų / rekvizitų patikra → juridinio asmens ir nišos priskyrimas → dublikatų atmetimas → susiejimas su užsakymais, banko / mokėjimo duomenimis → sumų sutikrinimas → įrašų parengimas ar įkėlimas per patikrintą apskaitos adapterį → laikotarpio uždarymo paketas. Neatitikimus agentas pirmiausia sprendžia pats, remdamasis šaltiniais ir prieigomis.

Buhalterio paketas turi originalus, dokumentų registrą, mokėjimų sąsajas, pajamas / išlaidas ir skolas, trūkstamų dokumentų būseną, korekcijų istoriją bei apskaitos programai tinkamą eksportą. Atskirai pateikiami tik konkretūs neišspręsti klausimai su įrodymais ir jau atliktais veiksmais. Perdavimas nustatytu periodiškumu ir patikrintu kanalu taip pat turi būti automatizuotas, kai prijungtas tikras gavėjas ir suteiktas siuntimo mandatas. Šiame pokalbyje dokumentai buhalteriui nesiunčiami.

Apskaita tvarkoma pagal tikrą juridinį asmenį / apskaitos profilį, o nišos turi savo analitinius pjūvius: 50 domenų savaime nėra 50 įmonių. Apskaitos taisyklės, PVM statusas ir dokumento rūšis turi būti patvirtintos konfigūracijoje. Skaičiavimus ir suderinimą vykdo patikrinama logika; modelis aiškina / organizuoja darbą ir negali spėjimu užpildyti finansinio fakto. [AVNT patvirtintų metodinių rekomendacijų katalogas](https://avnt.lrv.lt/lt/veiklos-sritys/apskaita-1/verslo-apskaitos-standartai/metodines-rekomendacijos/) patikrintas 2026-10-01 kaip vėlesnio apskaitos taisyklių tyrimo šaltinis; konkreti įmonės apskaitos politika šiuo įrašu nenustatyta.

### Žmogaus vaidmuo ir rezultato priėmimas

Savininkas patvirtina naują verslo kryptį ir nustato reikalingą veiklos mandatą; agentai patys vykdo darbus jo ribose. Trūkstamą neviešą faktą, paskyros prieigą ar mandato pakeitimą pateikia kaip konkretų sujungtą poreikį, atlikę visą nuo jo nepriklausomą darbą. Įprastoms užduotims neįvedamas rankinis savininko patvirtinimo žingsnis.

Autonomiją priimame pagal visą konkrečios nišos procesą ir išmatuotą rezultatą: realiai užbaigti darbai / sandoriai, faktinės sąnaudos, žmogaus darbo laikas, klaidos ir jų ištaisymas, pristatymo / aptarnavimo būsena, apskaitos paketo suderinimas. Įrankių ar agentų skaičius šio rezultato neįrodo. Šis naujas reikalavimas išplečia siekiamą darbų aprėptį; [esamo core architektūros](../agent-business-core/ARCHITECTURE.md) įrankių, mandatų, apskaitos ir autonominio tobulinimo pagrindą pernaudojame. Jo dokumentuose numatytos funkcijos ir šis tikslas atskiri nuo jau patikrinto runtime.

## Pajamų kryptys ir nežinomos sąnaudos

Savininko išvardyta aiški pardavimo kryptis — paruoštų verslų aukcionas arba fiksuota kaina, individualių verslų / jų etapų užsakymas ir vėlesnis tobulinimas. Audito apmokėjimas, nuolatinės priežiūros / platformos mokestis ir AI naudojimo apmokestinimas dar nėra pasirinktas kainynas. Juos tirti kaip modelius su konkrečiu mokėtoju ir rezultatu.

Sąnaudos: domenų įsigijimas / atnaujinimas, tyrimas ir kūrimas, hostingas / duomenys, AI / kanalai, partneriai, aptarnavimas, perdavimas ir taisymas. Šiuo metu nėra patvirtinto visos platformos biudžeto, vieno perduodamo verslo savikainos ar kliento mokėjimo įrodymo. Penki verslai neturi būti penkios nevaldomos sąnaudų ir instrukcijų kopijos; bendrą patikrintą core pernaudojame.

## Santykis su tuo, ką jau darome

[Core M8–M9](../agent-business-core/ROADMAP.md) jau numato realios nišos ekonomiką, portfelį, perleidžiamą paketą ir vieno verslo iškėlimą. Jų neperplanuojame kaip naujo lygiagretaus runtime. Naujas šios vizijos sluoksnis — išorinio kliento keturi užsakymo keliai, kelių jo verslų valdymas, pasiūlymo / pardavimo katalogas ir paslaugos ryšys su etapine mūsų portfelio plėtra.

[BDEV-0001](ideas/BDEV-0001.md) Facebook modulis tebėra root darbas. [BDEV-0002](ideas/BDEV-0002.md) vienos ataskaitos pasiūlymas lieka atskira nepatvirtinta nišos hipotezė; ši žinutė jo nepatvirtino. Ankstesnio tyrimo ir faktinių rezultatų atgaline data nekeičiame.

Mažas būsimas platformos hipotezės patikrinimas galėtų apimti vieną tikrą paruošto verslo paketą, jo įrodymų aprašą ir bandomą perdavimą izoliuotam „kito savininko“ kontekstui. Techninė simuliacija tikrintų perleidimą / izoliaciją, realus pirkėjo bandymas — norą įsigyti ir prižiūrėti. Tai dar nepatvirtintas testas. Jo išėjimo kriterijai: tiksliai suprastas pardavimo etapas, patikrintas vieno verslo veikimas / priežiūros laikas, teisėtas perdavimas ir žinomos eksploatavimo sąnaudos. Pilnos platformos specifikacijai ir komercinei validacijai dar reikės atskiro tyrimo.

## Tęstinumo taisyklė

Tolesni idėjų sesijos tyrimai turi vertinti pagerinimus šios platformos ir verslų portfelio kontekste: konkretaus mokamo rezultato įrodymas, atkuriamas kūrimas, išmatuotas automatizavimas, aiškus pirkėjui parduodamas etapas ir valdomos kelių verslų sąnaudos. Nekurti naujų agentų / modulių vien dėl jų kiekio. Šiame įraše užfiksuota savininko vizija; code, pirkimai, paskyros, klientų siuntimas ar production nepakeisti.
