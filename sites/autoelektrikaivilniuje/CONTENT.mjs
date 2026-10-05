const blocks=s=>{const out=[];for(const line of s.trim().split('\n').map(x=>x.trim()).filter(Boolean)){if(line.startsWith('## '))out.push({type:'heading',level:2,text:line.slice(3)});else if(line.startsWith('- ')){if(out.at(-1)?.type!=='list')out.push({type:'list',items:[]});out.at(-1).items.push(line.slice(2))}else out.push({type:'paragraph',text:line})}return out};
const source=(url,label,reason)=>({url,label,reason,verified:true});
const varta=source('https://www.varta-automotive.com/en-gb/knowledge/articles/article-details/which-is-the-right-battery-for-short-distance-driving','VARTA: trumpi važiavimai ir akumuliatorius','Gamintojo bendras paaiškinimas apie trumpų kelionių ir papildomos elektros įrangos apkrovas. Jis nenustato konkretaus automobilio gedimo. Patikrinta 2026-10-03.');
const aa=source('https://www.theaa.com/breakdown-cover/advice/starting-a-car','The AA: kai automobilis neužsiveda','Techninės pagalbos organizacijos simptomo ir galimų priežasčių apžvalga. Šiame gide nėra perkelta užvedimo laidais instrukcija. Patikrinta 2026-10-03.');
const bosch=source('https://www.boschcarservice.com/de/de/werkstattleistungen/elektronik-service/batterie-service/','Bosch Car Service: akumuliatoriaus patikra','Viešas Vokietijos paslaugos aprašas atskiria patikrą ir tinkamą pakeitimą. Tai ne mūsų partnerystė, Lietuvos kaina ar pasiūlymas. Patikrinta 2026-10-03.');
const kemi=source('https://www.kemi.lt/paslaugos/elektros-sistemu-diagnostika-ir-remontas','Kemi: elektros sistemų diagnostika ir remontas','Vietinis paslaugų pavyzdys: kompiuterinė diagnostika, elektros diagnostika ir remontas pateikiami atskirai. Mūsų įkainio ar serviso registracijos nėra. Kainos gali keistis. Patikrinta 2026-10-03.');
export const pages=[
{slug:'',type:'home',title:'Autoelektriko paieška prasideda nuo simptomo.',description:'Akumuliatorius išsikrauna ar automobilis neužsiveda? Paruoškite aiškų diagnostikos poreikį Vilniuje.',intent:'Parengti planinės lengvojo automobilio elektros diagnostikos poreikį Vilniuje',images:['hero','battery'],links:['diagnostikos-poreikis','akumuliatorius-issikrauna','automobilis-neuzsiveda','diagnostikos-kaina','kontaktai'],body:blocks(`
Padedame susisteminti pasikartojantį išsikrovimą, užvedimo ar įkrovimo simptomą prieš ieškant planinės elektros diagnostikos Vilniuje.
Tai MB Pinet išankstinis poreikio tyrimas. Servisas, partneris, atvykimas, kaina ar priėmimo laikas dar nepatvirtinti. Užklausa nėra užsakymas.
## Kas nutinka jūsų automobiliui?
Užrašykite vieną konkretų įvykį: kada automobilis paskutinį kartą važiavo, kiek stovėjo ir ką pastebėjote bandydami užvesti. Šis aprašas naudingesnis už iš anksto pasirinktą keičiamą detalę.
- Akumuliatorius išsikrauna: po stovėjimo, trumpų kelionių ar net po neseno pakeitimo.
- Automobilis neužsiveda: nėra reakcijos, girdėti spragtelėjimas arba variklis sukamas, bet nepasileidžia.
- Įkrovimo klausimas: įspėjimas ar ankstesnė patikra; tai aprašoma, o ne diagnozuojama internetu.
## Susitarkite dėl tyrimo apimties
Klaidų nuskaitymas, konkretaus elektros simptomo tyrimas ir remontas gali būti skirtingi darbai. Prieš susitarimą svarbu paklausti, kas bus tikrinama, kaip gausite išvadą ir kada reikės papildomo sutikimo.
Diagnostikos kainos gidas padės palyginti darbų ribas. Mūsų projektas neturi savo kainoraščio ir nepriima mokėjimų.
## Paruoškite poreikį
Kontaktų puslapyje automobilio, simptomo ir pristatymo duomenis galima sudėti į redaguojamą žinutę. Vardą ir el. paštą įrašykite tik nusprendę pateikti užklausą. Gavę poreikį galime jo patikslinti; atsakymo terminas ir paslaugos įvykdymas nežadami.
` )},
{slug:'diagnostikos-poreikis',type:'faq',title:'Planinės elektros diagnostikos poreikis Vilniuje',description:'Kam skirtas pirmasis projekto etapas, ką verta parašyti ir ko užklausa dar nepatvirtina.',intent:'Suprasti konkretų bandomo pasiūlymo veiksmą ir vykdymo ribas',links:['kontaktai','akumuliatorius-issikrauna','automobilis-neuzsiveda','diagnostikos-kaina'],body:blocks(`
Registruojame išankstinį poreikį planinei lengvojo automobilio elektros diagnostikai Vilniuje. Pirmasis etapas skirtas pasikartojančiam akumuliatoriaus išsikrovimui, užvedimo ar įkrovimo simptomui, kai savininkas gali planuoti automobilio pristatymą.
## Ką pateikiate dabar
Kontaktų formoje aprašykite automobilį, pastebėtą simptomą, kada jis pasireiškia, ankstesnius bandymus ir pageidaujamą laikotarpį. Biudžetas nėra būtinas; nesiųskite VIN, valstybinio numerio, dokumentų, mokėjimo ar sveikatos duomenų.
Tai nėra serviso registracija, kainos pasiūlymas ar pažadas rasti meistrą. MB Pinet vertina, ar tokio poreikio yra. Jūsų informacija nebus automatiškai persiųsta servisams. Jei vėliau atsirastų tinkamas paslaugos vykdytojas, konkretus kitas žingsnis ir duomenų perdavimas turėtų būti suderinti atskirai.
## Ką verta pasiruošti
- Automobilio markė, modelis, apytikriai metai ir variklio tipas, jei žinote.
- Kada problema pasireiškia ir kuo ši situacija skiriasi nuo įprasto naudojimo.
- Ar buvo keistas akumuliatorius, papildyta elektros įranga arba atliktas remontas.
- Ar galite pristatyti ir palikti automobilį; nežinomo pristatymo nevadinkite patvirtintu.
- Jūsų laikotarpis ir neaiškumai, kuriuos norėtumėte aptarti.
## Kur yra šio etapo riba
Neatliekame nuotolinės diagnozės ir neparduodame remonto. Avarinis iškvietimas, užvedimo pagalba vietoje, elektromobilio aukštos įtampos darbai ir konkretaus serviso laiko rezervavimas šiame etape nesiūlomi. Jei reikia skubios pagalbos, pasirinkite realiai veikiančią techninės pagalbos tarnybą.
## Kaip vertinsime rezultatą
Projekto plėtra priklausys nuo tikrų tinkamų užklausų, galimo vykdytojo ir atskirai suderintos paslaugos ekonomikos. Gidų peržiūros ar el. pašto nuorodos paspaudimas savaime nėra atliktos diagnostikos ar patenkinto kliento įrodymas.
` )},
{slug:'gidai',type:'faq',title:'Aiškiau prieš diagnostiką',description:'Trys skirtingi klausimai: pasikartojantis išsikrovimas, nepavykęs užvedimas ir diagnostikos kainos apimtis.',intent:'Pasirinkti savo klausimą atitinkantį gidą',images:['battery','start','scope'],links:['akumuliatorius-issikrauna','automobilis-neuzsiveda','diagnostikos-kaina'],body:blocks(`
Pasirinkite tą situaciją, kurią iš tikrųjų pastebėjote. Gidai padeda surinkti aplinkybes ir pasirengti pokalbiui; pagal vieną požymį nustatyti gedimo negalima.
Akumuliatoriaus išsikrovimo gidas skirtas pasikartojimui po stovėjimo ar naudojimo. Užvedimo gidas padeda atskirti jūsų girdėtą ir matytą reakciją. Kainos gidas paaiškina, kokių darbų ribas reikia sutarti prieš lyginant sumas.
Jei norite pranešti planinės diagnostikos poreikį Vilniuje, perskaitykite pasiūlymo ribas ir paruoškite žinutę kontaktų puslapyje. Tai išankstinis tyrimas, be serviso rezervacijos.
` )},
{slug:'akumuliatorius-issikrauna',type:'guide',title:'Akumuliatorius išsikrauna: ką užrašyti prieš diagnostiką',description:'Stovėjimo trukmė, važiavimo įpročiai ir ankstesni bandymai padeda aiškiau aprašyti pasikartojantį išsikrovimą.',intent:'Surinkti pasikartojančio išsikrovimo aplinkybes prieš planinį tyrimą',images:['battery'],sources:[varta,bosch],links:['automobilis-neuzsiveda','diagnostikos-kaina','kontaktai'],body:blocks(`
Pasikartojantis išsikrovimas dar nepasako, kurią detalę reikia keisti. Pirmas naudingas žingsnis – aprašyti, kada automobilis veikė įprastai, kiek stovėjo ir kaip problema pasikartojo. Tokia įvykių seka padeda pokalbyje dėl tyrimo, tačiau nepakeičia automobilio patikros.
## Atskirti aplinkybes nuo priežasties
VARTA paaiškina, kad trumpos kelionės gali nepapildyti užvedimui sunaudotos energijos, o papildoma elektros įranga didina apkrovą. Akumuliatoriaus būklė ir naudojimo sąlygos taip pat svarbios. Tai bendras kontekstas; iš jo negalima daryti išvados, kad jūsų automobilio problema tik akumuliatoriuje.
Užrašuose išlaikykite skirtumą tarp to, ką pastebėjote, ir to, ką spėjate. „Po dviejų parų stovėjimo nebeužsivedė“ yra aplinkybė. „Sugedo generatorius“ be patikros yra hipotezė. Jei turite ankstesnę serviso išvadą, trumpai nurodykite, kas buvo tikrinta ir kada. Nereikia siųsti visos sąskaitos su asmens duomenimis.
## Sudarykite trumpą įvykių seką
- Paskutinis įprastas važiavimas: diena, apytikris kelionės pobūdis ir ar po jo buvo įspėjimų.
- Stovėjimas iki problemos: valandos ar paros, jei žinote; užrašykite ir neaiškumą.
- Bandymas užvesti: ar buvo šviesos, reakcija ir garsas. Vien prietaisų skydelio veikimas nėra patikros rezultatas.
- Ankstesnis bandymas: įkrovimas, akumuliatoriaus keitimas ar serviso apsilankymas, tik jei tai iš tikrųjų buvo.
- Pakartojimas: ar problema grįžo ir per kiek laiko, ar tai kol kas vienas įvykis.
Neprisimintą laiką galima nurodyti apytikriai. Tikslumas nereiškia privalomų matavimų: nereikia atjunginėti laidų ar bandyti savarankiškai matuoti srovės vien tam, kad užpildytumėte žinutę.
## Ką pasakyti apie naudojimą
Servisui gali būti naudinga žinoti, ar automobilis daugiausia naudojamas trumpoms miesto kelionėms, ar ilgai stovi. Užrašykite įprastą režimą savo žodžiais. Jei neseniai pridėta kamera, signalizacija ar kita įranga, nurodykite jos įrengimo laiką ir ar simptomas pasirodė prieš tai, ar po to. Laiko sutapimas nėra įrodymas, kad konkreti įranga kalta.
Taip pat pasakykite, kada buvo pakeistas akumuliatorius, jei tai žinote. „Naujas“ be datos arba įrašo gali reikšti skirtingus dalykus. Bosch paslaugos aprašas akumuliatoriaus patikrą ir jo tinkamą pakeitimą pateikia kaip atskirus veiksmus. Nesirinkite kito akumuliatoriaus vien pagal internetinio gido pavadinimą: konkretaus automobilio reikalavimai turi būti patikrinti.
## Kokį tyrimą verta aptarti
Prašykite paaiškinti, kaip planuojama tirti jūsų aprašytą pasikartojimą. Ar bus vertinama akumuliatoriaus būklė, įkrovimas ar stovėjimo metu atsirandanti apkrova? Kurie iš šių veiksmų įtraukti į pirmą etapą, o kuriems reikėtų papildomo laiko ir sutikimo? Tai klausimai paslaugos vykdytojui, ne šio gido paskirtas tyrimų sąrašas.
Jei gedimas pasireiškia tik po ilgesnio stovėjimo, aptarkite ir automobilio palikimo galimybę. Negalima iš anksto pažadėti, kad problema bus atkartota per trumpą vizitą. Paklauskite, kokią išvadą gausite, jei patikros metu simptomas nepasireikš, ir kaip būtų sutariamas tęsinys.
## Pavyzdys, kurį galite pritaikyti
Žinutės struktūra: „Automobilis [modelis ir metai]. Po [apytikrio stovėjimo] pastebėjau [tikras simptomas]. Iki tol važiavau [naudojimo pobūdis]. Jau bandyta [tikri veiksmai arba nieko]. Problema kartojosi [kada arba dar nežinau]. Galiu pristatyti [laikotarpis], dėl palikimo [galiu / negaliu / reikia aptarti].“ Laužtinių skliaustų vietas pakeiskite savo duomenimis, o nežinomų aplinkybių neišgalvokite.
Nepalikite žinutėje detalių, kurių nenorite perduoti operatoriui. VIN, valstybinis numeris, tiksli gyvenamoji vieta ir dokumentų kopijos šiam poreikio tyrimui nereikalingi. Užvedimo simptomo gidas padės, jei neaišku, kaip aprašyti automobilio reakciją; diagnostikos kainos gidas – jei norite suprasti darbų ribas.
## Tolimesnis veiksmas ir saugumo riba
Kontaktų puslapyje galite paruošti planinės diagnostikos poreikį Vilniuje. MB Pinet šiuo metu tiria poreikį ir neturi patvirtinto serviso, priėmimo laiko ar kainoraščio. Užklausa nėra rezervacija. Šis tekstas nėra remonto, matavimo ar užvedimo laidais instrukcija. Neaiškius ar pavojingus požymius aptarkite su realiai veikiančiu specialistu; bandomos formos atsakymo nelaukite, jei reikia skubios pagalbos.
` )},
{slug:'automobilis-neuzsiveda',type:'guide',title:'Automobilis neužsiveda: aprašykite reakciją, ne spėjamą gedimą',description:'Nėra reakcijos, girdėti spragtelėjimas ar variklis sukamas? Trumpas aplinkybių sąrašas pokalbiui dėl patikros.',intent:'Tiksliai aprašyti nepavykusio užvedimo simptomą ir pasirinkti planinį arba skubų kelią',images:['start'],sources:[aa],links:['akumuliatorius-issikrauna','diagnostikos-kaina','kontaktai'],body:blocks(`
„Neužsiveda“ gali reikšti skirtingas pastebėtas reakcijas. Naudinga pirmiausia pasakyti, kas įvyko paspaudus įprastą užvedimo mygtuką ar pasukus raktą: nieko negirdėjote, išgirdote spragtelėjimą ar variklis buvo sukamas, bet nepasileido. Tai aprašymas specialistui, o ne nuotolinis gedimo nustatymas.
## Pirmiausia nuspręskite, kokios pagalbos reikia
Jei automobilis stovi taip, kad kelia pavojų, reikia pagalbos vietoje arba negalite saugiai tęsti kelionės, kreipkitės į realiai veikiančią techninės pagalbos tarnybą. MB Pinet poreikio forma nesiūlo avarinio iškvietimo, užvedimo pagalbos ar atsakymo per konkretų laiką. Ji skirta planiniam diagnostikos poreikiui, kurį galima aptarti vėliau.
Šiame tekste nėra bandymų užvesti laidais, remonto veiksmų ar patarimo vairuoti esant gedimui. Automobilio vadovas ir konkrečios situacijos specialisto nurodymai turi pirmenybę. Vien tam, kad pateiktumėte užklausą, nereikia kartoti bandymų, ardyti detalių ar fotografuoti po automobiliu.
## Užrašykite, ką tikrai pastebėjote
The AA savo apžvalgoje išskiria skirtingus garsus ir reakcijas bei kelias galimas priežasčių grupes. Akumuliatorius, starteris, laidai ar kitos sistemos gali būti svarbios, tačiau vienas garsas konkrečios priežasties nepatvirtina. Nesiremkite garsu kaip nurodymu įsigyti detalę.
- Ar tuo metu įsijungė prietaisų skydelis? Aprašykite matytą būseną, nespėkite energijos atsargos.
- Ar girdėjote vieną spragtelėjimą, kelis, kitą garsą, ar jokio garso? Jei nesate tikri, taip ir parašykite.
- Ar variklis buvo sukamas, bet nepasileido? Nevadinkite to „akumuliatoriaus gedimu“ be patikros.
- Ar matėte konkretų pranešimą? Galite perrašyti jo tekstą, jei jį prisimenate; nerinkite spėjamų klaidų kodų iš interneto.
- Ar tai pirmas atvejis, ar pasikartojimas? Nurodykite bent apytikrį laiką.
Tai nėra savarankiškos patikros protokolas. Sąrašo laukus užpildykite iš jau pastebėtų aplinkybių. Jei automobilio valdymas ar požymiai neįprasti, pasitarkite su specialistu, o ne bandykite įrodyti pasirinktą internetinę diagnozę.
## Papildykite įvykio kontekstą
Užrašykite, kada automobilis paskutinį kartą važiavo įprastai ir kiek stovėjo. Jei prieš problemą buvo remontas, keistas akumuliatorius ar įrengta papildoma įranga, pateikite laiko seką. Po remonto atsiradęs simptomas dar neįrodo priežasties, bet padeda specialistui suprasti, nuo ko pradėti klausimus.
Pridėkite markę, modelį ir apytikrius metus. Jei žinote variklio tipą ar start-stop buvimą, galite nurodyti; nežinoma informacija netrukdo aprašyti poreikio. VIN ir registracijos dokumentai šio projekto formoje nereikalingi. Tekste nereikia tikslaus stovėjimo adreso ar kitų žmonių duomenų.
## Kas jau buvo bandyta
Trumpai išvardykite tik atliktus veiksmus ir jų rezultatą. „Akumuliatorius pakeistas prieš mėnesį; po pakeitimo problema pasikartojo“ pasako daugiau nei „viskas sutvarkyta“. Jei turite ankstesnę serviso išvadą, atskirkite jos tekstą nuo savo spėjimo. Jei nieko nebandėte, toks atsakymas taip pat aiškus.
Ankstesnis sėkmingas užvedimas ar laikinas pagerėjimas savaime nepatvirtina, kad gedimas pašalintas. Tyrimo pokalbyje svarbi ir pasikartojimo eiga. Jei įvykis daugiau nepasikartojo, nevadinkite jo nuolatiniu. Specialistas turėtų žinoti, ar patikros metu bus galima tikėtis tokios pačios būsenos, tačiau to garantuoti negalite.
## Aptarkite automobilio pristatymą
Planinės diagnostikos užklausoje nurodykite, ar automobilis gali būti pristatytas ir paliktas, ar pristatymo dar nežinote. Šis projektas transportavimo neorganizuoja. Pageidaujamas laikotarpis yra jūsų poreikis, o ne patvirtintas vizitas. Kol nėra konkretaus vykdytojo ir suderinto laiko, planuokite kitą realų kelią, jei pagalbos reikia greičiau.
Prašydami paslaugos paklauskite, kuo baigtųsi pirmas diagnostikos etapas: tyrimo išvada, papildomo darbo pasiūlymu ar konkrečiu remontu. Nepriimkite remonto kaip savaime įtraukto į patikrą. Diagnostikos kainos gidas padės susidaryti klausimus apie apimtį, papildomą laiką ir sutikimą.
## Žinutės ruošinys
„Automobilis [modelis, metai]. [Kada] bandant užvesti pastebėjau [reakcija ir garsas]. Iki tol stovėjo [laikas arba nežinau]. Problema [pirmą kartą / kartojasi]. Jau atlikta [tikri veiksmai], rezultatas [pastebėjimas]. Pristatymas [galiu / reikia aptarti], pageidaujamas laikotarpis [jūsų poreikis].“ Tai pavyzdinė struktūra, ne tikras kliento atvejis.
Jei problema kartojasi po stovėjimo, akumuliatoriaus išsikrovimo gidas padeda išplėsti laiko seką. Kontaktų puslapyje galite pateikti išankstinį poreikį Vilniuje. Net ir tikslus aprašas šiuo etapu nepatvirtina serviso, diagnozės, kainos ar rezervacijos; jis leidžia suprasti, ko jums reikia.
` )},
{slug:'diagnostikos-kaina',type:'guide',title:'Autoelektriko diagnostikos kaina: pirmiausia sutarkite apimtį',description:'Klaidų nuskaitymas, elektros simptomo tyrimas ir remontas: kokius klausimus užduoti prieš lyginant pasiūlymus.',intent:'Palyginti realios planinės diagnostikos pasiūlymų apimtį be išgalvotų įkainių',images:['scope'],sources:[kemi,bosch],links:['akumuliatorius-issikrauna','automobilis-neuzsiveda','kontaktai'],body:blocks(`
Diagnostikos sumą prasminga lyginti tada, kai aišku, už kokį darbą ji mokama. Klaidų nuskaitymas, pasikartojančio elektros simptomo tyrimas ir remontas nebūtinai apima tuos pačius veiksmus. Šis gidas padeda paruošti klausimus tikram vykdytojui. MB Pinet neturi patvirtinto diagnostikos kainoraščio ir nepateikia individualios remonto sąmatos.
## Ką vadinate diagnostika?
Lietuvos Kemi viešame puslapyje kompiuterinė diagnostika, elektros sistemų diagnostika ir remontas pateikiami atskiromis eilutėmis. Tai konkretus rinkos pavyzdys, kodėl vien pavadinimo „diagnostika“ neužtenka pasiūlymams palyginti. Svetimos kainos nėra mūsų įkainiai; jos gali keistis ir nepakeičia jūsų automobilio darbų apimties susitarimo.
Pradėkite nuo savo klausimo: ar norite perskaityti klaidų informaciją, ištirti konkretų pasikartojantį simptomą, ar jau turite patvirtintą remonto poreikį? Nesirinkite platesnio darbo vien todėl, kad internetinėje antraštėje jis vadinamas pilna diagnostika. Paprašykite vykdytojo paaiškinti, kaip siūlomas pirmas etapas atsako į jūsų aprašą.
## Pirmo etapo ribos
- Koks simptomas arba klausimas bus tiriamas?
- Kurie patikros veiksmai įtraukti, o kurie būtų papildomi?
- Ar mokama už apibrėžtą etapą, laiką, ar kitą aiškiai sutartą darbą?
- Ką gausite po etapo: žodinį paaiškinimą, rašytinę išvadą, matavimų santrauką ar remonto pasiūlymą?
- Kaip bus elgiamasi, jei simptomas per vizitą nepasikartos?
Klausimai nėra įrodymas, kad visos dirbtuvės taiko tą patį modelį. Užrašykite konkrečius gautus atsakymus ir neužpildykite trūkstamų vietų savo prielaidomis. Jei pasiūlyme tik pradinė suma, paklauskite, kokiomis sąlygomis ji gali pasikeisti. Žodis „nuo“ nepasako jūsų būsimos galutinės sąskaitos.
## Kaip sutarti papildomą darbą
Aiškiai paklauskite, kada reikės jūsų papildomo sutikimo. Ar vykdytojas sustos po pirmo etapo ir susisieks, ar gali tęsti iki iš anksto sutartos ribos? Jei susitariate dėl ribos, ji turi būti konkreti ir suprantama jums abiem. Šis projektas nenurodo universalaus valandų ar eurų limito ir neturi teisės sutikti dėl jūsų remonto.
Papildomos detalės, jų keitimas ir automobilio grąžinimo sąlygos aptariamos su realiu paslaugos vykdytoju. Diagnostikos užklausa nėra leidimas pakeisti akumuliatorių ar starterį. Bosch akumuliatoriaus paslaugos aprašas patikrą ir pakeitimą aptaria atskirai; jis taip pat nenustato Lietuvos darbų kainų. Pasiūlyme palikite šias dalis atskirtas, kad žinotumėte, kam pritariate.
## Palyginimo lapas be tariamos rinkos kainos
Surašykite kiekvieną gautą pasiūlymą tomis pačiomis eilutėmis: jūsų simptomas, pirmo etapo apimtis, mokėjimo pagrindas, numatyta išvada, papildomo darbo sutikimas, detalės ir pristatymas. Nurodykite pasiūlymo datą ir kas jį pateikė. Nepatikslintą informaciją žymėkite „nežinau“ arba „reikia paklausti“.
Vien mažesnė antraštinė suma neįrodo, kad pasiūlymas jums tinkamesnis. Viename gali būti tik siauresnis pirmas žingsnis, kitame daugiau tyrimo darbo. Jeigu apimtis nevienoda, pirmiausia užduokite trūkstamus klausimus. Nereikia atlikti aritmetinio palyginimo iš skirtingų darbų ir vadinti jo patikimu rinkos vidurkiu.
## Pavyzdinis klausimas vykdytojui
„Po [laikotarpio stovėjimo] automobilis [tikras simptomas]. Norėčiau suprasti, ką apimtų pirmas tyrimo etapas, kaip jis apmokamas ir kokią išvadą gausčiau. Kada būtų reikalingas papildomas mano sutikimas? Ar reikėtų automobilį palikti ir kokia būtų pristatymo tvarka?“ Pritaikykite klausimą savo situacijai; tai nėra mūsų kainos užsakymo forma.
Jei jau turite ankstesnių patikrų, nurodykite tik jų datą ir reikšmingą išvadą. Tiksliau aprašytas poreikis padeda aptarti darbą, bet negarantuoja vieno vizito, konkrečios trukmės ar sėkmingo remonto. Jei aprašas neaiškus, akumuliatoriaus išsikrovimo arba užvedimo gidas padės atskirti įvykio aplinkybes nuo priežasties spėjimo.
## Kada ši informacija nepakankama
Gidas netinka skubiam iškvietimui organizuoti, individualiai sąmatai ar techninei diagnozei. Nereikia laukti projekto atsakymo, kai pagalbos reikia dabar. Elektromobilio aukštos įtampos darbai taip pat nėra šio pirmo etapo pasiūlymas. Konkrečios paslaugos saugumas ir vykdymas turi būti aptarti su realiu specialistu.
Kontaktų puslapyje galite parengti planinės diagnostikos poreikį Vilniuje. Tai leidžia MB Pinet įvertinti susidomėjimą ir galimus kitus žingsnius, tačiau partneris, mokama paslauga ir jos ekonomika dar nepatvirtinti. Šioje formoje nėra mokėjimų, automatinio kainos skaičiavimo ar patvirtinto serviso laiko.
` )},
{slug:'kontaktai',type:'faq',title:'Aprašykite diagnostikos poreikį',description:'Automobilis, simptomas, pasikartojimas ir pristatymas. Pateikite išankstinį poreikį Vilniuje.',intent:'Sąmoningai pateikti konkretų planinės diagnostikos poreikį',links:['diagnostikos-poreikis','privatumas'],body:blocks(`
Projektą administruoja MB Pinet. Kontaktinis el. paštas: info@pinet.lt. Telefonas, dirbtuvių adresas ir priėmimo laikas šiame etape nenurodomi, nes diagnostikos vykdytojas nepatvirtintas.
## Prieš pateikiant
Ši forma skirta išankstiniam planinės elektros diagnostikos poreikiui Vilniuje. Tai nėra užsakymas, rezervacija, kainos pasiūlymas ar avarinės pagalbos kanalas. Atsakymo terminas ir galimybė įvykdyti paslaugą nežadami. Duomenys automatiškai servisams neperduodami.
Užrašykite automobilio modelį ir apytikrius metus, pastebėtą reakciją, kada ji kartojasi, tikrus ankstesnius bandymus ir pageidaujamą laikotarpį. Pasakykite, ar galite pristatyti bei palikti automobilį. Nežinomą aplinkybę taip ir pažymėkite.
Ruošinys veikia jūsų naršyklėje ir pats nieko neišsiunčia. Gautą žinutę galėsite pakeisti. Galima tiesiog parašyti laisvą tekstą; ruošinio naudoti neprivaloma. Nesiųskite VIN, numerio, tikslaus adreso, dokumentų ar kitų žmonių duomenų.
## Vietinės peržiūros riba
Dabartinė versija tikrinama vietoje, su išjungtu laiškų siuntimu. Bandymui naudokite tik sintetinį vardą ir adresą. Sėkmingas vietinis įrašymas nereiškia realaus el. laiško gavimo. Prieš tikrą paleidimą privalės būti patikrinti pristatymas, saugojimo tvarka ir aktualus privatumo tekstas.
` )},
{slug:'apie-projekta',type:'faq',title:'Apie projektą „Autoelektrikai Vilniuje“',description:'MB Pinet poreikio tyrimas planinei automobilių elektros diagnostikai Vilniuje.',intent:'Suprasti operatorių, bandomą pasiūlymą ir dabartines ribas',links:['redakcija','diagnostikos-poreikis','kontaktai'],body:blocks(`
Autoelektrikaivilniuje.lt yra MB Pinet kuriamas planinės automobilių elektros diagnostikos poreikio tyrimas. Norime suprasti, ar vairuotojams Vilniuje reikalingas aiškesnis pasikartojančio išsikrovimo, užvedimo ir įkrovimo simptomų aprašymo kelias.
## Kas veikia pirmame etape
Pateikiame atskirų klausimų gidus, aprašymo ruošinį ir išankstinio poreikio formą. Tai informacija ir tyrimas; projekto operatorius nėra čia pristatomas kaip veikiantis autoservisas. Neturime patvirtinto dirbtuvių adreso, mechanikų komandos, kainoraščio, darbo valandų ar atliktų klientų darbų.
## Galima komercinė kryptis
Jei būtų tinkamų tikrų poreikių ir realus vykdytojas, būtų galima atskirai svarstyti atlyginamą klientų perdavimo ar užbaigtos diagnostikos modelį. Tai hipotezė, ne esama partnerystė. Jūsų užklausa šiuo etapu neparduodama ir automatiškai servisui nesiunčiama.
Plėtra priklausys nuo tinkamų užklausų ir vykdymo ekonomikos. Gidų skaitymas ar nuorodos paspaudimas nėra paslaugos paklausos patvirtinimas. Dabartinė vietinė versija taip pat nėra tikro domeno paleidimo įrodymas.
## Susisiekite dėl turinio arba poreikio
Operatoriaus kontaktas – info@pinet.lt. Rašydami nurodykite autoelektrikaivilniuje.lt ir klausimo puslapį. Pastebėtus netikslumus galima pranešti tuo pačiu adresu. Redakcijos puslapyje paaiškinta šaltinių ir iliustracijų metodika.
` )},
{slug:'redakcija',type:'faq',title:'MB Pinet redakcija',description:'Kas atsako už gidus, kaip tikrinami šaltiniai ir ką reiškia šiame projekte naudojamos iliustracijos.',intent:'Patikrinti tikrą organizacinę autorystę ir turinio ribas',links:['kontaktai','apie-projekta'],body:blocks(`
Už šio projekto turinį atsako MB Pinet. Tai organizacinis redakcinis profilis, o ne išgalvoto autoelektriko biografija. Netvirtiname mechaniko kvalifikacijos, atliktų darbų patirties ar konkretaus serviso partnerystės. Turinys yra informacinis pasirengimas pokalbiui, ne techninė diagnozė.
## Kaip rengiami ir tikrinami gidai
Pasirenkame vieną skaitytojo klausimą kiekvienam gidui, tikriname gamintojų, techninės pagalbos organizacijų ir realių paslaugų aprašus. Prie gido pateikiame konkrečias nuorodas, patikros datą ir šaltinio ribą. Atskirai vertiname, ar teiginys tinka šio projekto pasiūlymui. Kitos įmonės paslauga ar kaina nėra MB Pinet paslauga ar kaina.
Juodraščiai rengiami naudojant AI, po to teiginiai ir nuorodos redakciškai peržiūrimi. Tai nėra specialisto atlikta konkretaus automobilio patikra. Nežinomus verslo faktus paliekame nežinomus; neskelbiame tariamų atsiliepimų, klientų atvejų ar patvirtintų remonto rezultatų.
## Iliustracijų kilmė
Originalios temos iliustracijos sukurtos su generatyviniu AI ir peržiūrėtos. Jos vaizduoja bendrą automobilio bei diagnostikos kontekstą, o ne mūsų dirbtuves, darbuotojus ar klientų darbus. Privatūs medijos įrašai saugo originalus, tikslius generavimo aprašus ir pasirinkimą. Trečiųjų šalių fotografijos nenaudotos; būtinos licencinės autorystės žymos nebūtų šalinamos.
## Datos ir pataisymai
Gido paskelbimo bei atnaujinimo datos rodomos prie jo. Atnaujinimas nėra įrodymas, kad keitėsi jūsų automobilio diagnozė ar kad iš naujo patikrinta visa rinka. Prieš tikrą paleidimą ir keičiantis pasiūlymui peržiūrėsime kintančius šaltinius bei projekto faktus.
Jei matote netikslų teiginį, praneškite info@pinet.lt, nurodydami šį domeną, URL ir sakinį. Patvirtintas turinys keičiamas nauja peržiūrėta versija. Projektas nežada paieškos reitingų, remonto sėkmės ar atsakymo termino.
` )},
{slug:'privatumas',type:'faq',title:'Privatumas ir užklausos duomenys',description:'Dabartinės vietinės peržiūros forma, duomenų laukai, matavimas ir kontaktas dėl jūsų teisių.',intent:'Suprasti dabartinį duomenų kelią prieš pateikiant formą',sources:[source('https://eur-lex.europa.eu/eli/reg/2016/679','Bendrasis duomenų apsaugos reglamentas','Teisių, informavimo ir saugojimo trukmės principų šaltinis. Paieškos tekstas patikrintas 2026-10-03; tiesioginis HTML/PDF prieigos bandymas buvo ribotas robotų patikros.')],links:['kontaktai','naudojimo-salygos'],body:blocks(`
Šis tekstas skirtas 2026-10-03 vietinei projekto peržiūrai. Už projekto sprendimus atsako MB Pinet, kontaktas info@pinet.lt. Tikras domeno paleidimas ir komercinio duomenų tvarkymo sąlygos dar nepatikrinti. Šioje peržiūroje bandymams naudokite tik sintetinius duomenis.
## Ką priima forma
Forma priima vardą, el. paštą, jūsų parašytą žinutę ir sutikimo pateikti ją patvirtinimą. Įraše taip pat yra užklausos identifikatorius, svetainės identifikatorius, pateikimo bei sutikimo laikas ir pradinis puslapis. Nerenkame VIN, automobilio numerio ar dokumentų kaip privalomų laukų. Nerašykite jų ir laisvoje žinutėje.
Ruošinio laukai naudojami žinutei parengti naršyklėje. Jie neišsiunčiami vien juos užpildžius ar paspaudus „Paruošti žinutę“. Siunčiama tik paties lankytojo pateikta kontaktų forma. Sutikimas skirtas konkretaus poreikio nagrinėjimui ir nėra rinkodaros prenumerata.
## Vietinis saugojimas ir siuntimas
Techninė peržiūra pirmiausia išsaugo pateiktą užklausą atskiroje vietinėje bandymų duomenų bazėje. Laiškų siuntimas išjungtas. Tikras laiškas operatoriui nebus išsiųstas. Bandymų įrašai yra sintetiniai; jie identifikuojami QA žyma ir šalinami tik iš šiai peržiūrai skirtos bazės. Tai nėra pažadas apie veikiančio domeno duomenų terminą.
Prieš tikrą formos paleidimą būtina nustatyti ir paskelbti konkretų duomenų tvarkymo pagrindą, saugojimo terminą arba jo kriterijus, faktinius paslaugų teikėjus, galimą duomenų perdavimą ir teisių įgyvendinimo tvarką. Neįjungta būsima partnerystė ar balso modulis nesuteikia teisės perduoti šioje formoje gautus duomenis.
## Peržiūrų matavimas
Pirmojo projekto matavimo kelias skaičiuoja dienos, puslapio ir įvykio suvestines atskirai šiam siteId. El. pašto nuorodos paspaudimas nėra gautas laiškas. Šis kelias nesukuria lankytojo paskyros, individualaus sekimo slapuko ar profilio ir į suvestinę neįrašo formos teksto. DNT arba Global Privacy Control signalas bei atpažinti automatizuoti testai matavime praleidžiami.
Šioje versijoje nėra reklamos pikselių, pokalbio ar balso agento, žemėlapio ir išorinių vaizdo įrašų įterpimų. Šriftai bei iliustracijos pateikiami su projektu. Atvėrus išorinį šaltinį jo svetainė duomenis tvarko pagal savo taisykles.
## Duomenų klausimai ir teisės
Dėl savo duomenų galite kreiptis info@pinet.lt, nurodydami šį domeną ir užklausos identifikatorių, jei jį turite. Priklausomai nuo tvarkymo pagrindo ir aplinkybių, BDAR numato teisę susipažinti, ištaisyti, ištrinti, apriboti tvarkymą, nesutikti arba atšaukti sutikimą. Galima pateikti skundą Valstybinei duomenų apsaugos inspekcijai. Nepateikite papildomų asmens dokumentų paprastoje žinutėje.
` )},
{slug:'naudojimo-salygos',type:'faq',title:'Naudojimo sąlygos',description:'Informacinių gidų ir išankstinio poreikio formos paskirtis bei dabartinio projekto ribos.',intent:'Suprasti ką reiškia svetainės turinys ir pateikta užklausa',links:['privatumas','kontaktai'],body:blocks(`
Autoelektrikaivilniuje.lt projektą administruoja MB Pinet; kontaktas info@pinet.lt. Dabartinė versija yra vietinė pirmo etapo peržiūra. Domeno nuosavybė, DNS, tikras hostingas ir formos pristatymas nėra šios peržiūros patvirtintas paleidimas.
## Informacinė paskirtis
Gidai ir ruošinys padeda suformuluoti automobilio elektros diagnostikos poreikį. Jie nėra techninė diagnozė, remonto instrukcija, ekspertizė ar nurodymas pirkti dalį. Konkretaus automobilio būklę ir darbo atlikimo sąlygas vertina realus specialistas. Projekto bandomos formos nenaudokite skubiai ar avarinei pagalbai.
## Ką reiškia pateiktas poreikis
Pateikta žinutė nėra sutartis, serviso rezervacija, kainos pasiūlymas ar mokėjimo prievolė. Šiame etape nėra patvirtinto serviso, darbo laiko, vykdytojo, partnerio ar kainoraščio. Negarantuojame atsakymo termino, paslaugos suradimo, atvykimo ar remonto rezultato. Bet kokia vėlesnė mokama paslauga turėtų būti suderinta atskirai.
Duomenų automatiškai servisams neperduodame. Nesiųskite svetimų, perteklinių ar jautrių duomenų. Vietinės peržiūros testuose naudokite tik sintetinius duomenis. Saugų tikro projekto formos paleidimą turi patvirtinti atskira pristatymo ir privatumo patikra.
## Šaltiniai ir iliustracijos
Išorinės nuorodos pateikiamos kaip konkretaus teiginio arba klausimo šaltiniai. Jos nepatvirtina partnerystės ir gali keistis. Originalios iliustracijos yra bendro konteksto vaizdai, o ne mūsų patalpų ar atliktų darbų fotografijos. Autorystės ir redakcinė metodika paaiškinta redakcijos puslapyje.
## Pataisymai ir aktualumas
Apie pastebėtą klaidą praneškite info@pinet.lt, pateikdami domeną, URL ir konkretų sakinį. Pasikeitus komerciniam pasiūlymui ar tikram duomenų keliui turinys turės būti iš naujo peržiūrėtas. Šis projektas nežada paieškos reitingų ar individualaus diagnostikos rezultato. Jokių užsakymo atsiskaitymų ar vartotojo paskyrų šioje versijoje nėra.
` )}
];
