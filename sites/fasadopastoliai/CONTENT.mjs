const blocks=s=>{const out=[];for(const line of s.trim().split('\n').map(x=>x.trim()).filter(Boolean)){if(line.startsWith('## '))out.push({type:'heading',level:2,text:line.slice(3)});else if(line.startsWith('- ')){if(out.at(-1)?.type!=='list')out.push({type:'list',items:[]});out.at(-1).items.push(line.slice(2))}else out.push({type:'paragraph',text:line})}return out};
const source=(url,label,reason)=>({url,label,reason,verified:true});
const ts=source('https://tspastoliai.lt/fasadiniu-pastoliu-nuoma/','Tvirtas sukibimas: fasadinės nuomos apimtis','Konkretaus tiekėjo viešas pasiūlymas. Matmenys, laikas ir vieta padeda aptarti projektą; tai ne mūsų kaina, partnerystė ar techninė komplektacijos taisyklė. Patikrinta 2026-10-03.');
const pilaite=source('https://www.pilaitespastoliai.lt/paslaugos/','Pilaitės pastoliai: atskiros paslaugos','Viešas tiekėjo nuomos, transporto ir montavimo atskyrimas. Jo įkainiai bei matavimo sistema neperkeliami į mūsų pasiūlymą. Patikrinta 2026-10-03.');
const str=source('https://strscaffolding.co.uk/domestic-scaffolding','STR: namo projekto pasiūlymo apimtis','UK nuomotojo pasiūlymo pavyzdys; vietos apžiūra ir sutartas nuomos laikas. Tai nėra Lietuvos kaina ar Lietuvai taikoma teisinė taisyklė. Patikrinta 2026-10-03.');
const tr=source('https://www.transrifus.lt/documents/Pastoli%C5%B3%20nuomos%20taisykl%C4%97s%20%28kai%20montuoja%20Nuomotojas%29%202024.pdf','Transrifus: 2024 nuomos taisyklių pavyzdys','Dviejų puslapių konkretaus nuomotojo sutartis, kai jis montuoja. Parodo priėmimo, nuomos ir grąžinimo ribas; jos tarifai ir terminai nėra mūsų ar universalūs. Aktualų pasiūlymą tikrinkite su tiekėju. Patikrinta 2026-10-03.');
const vdi=source('https://vdi.lrv.lt/media/viesa/saugykla/2023/12/wzrBu4Hhyn4.pdf','VDI: statybviečių kontrolinis klausimynas','2023 kontrolinio klausimyno darbo aukštyje dalis (PDF 3 puslapis): projektas, priežiūra, specialiai apmokyti darbuotojai. Šis gidas nėra konkretaus objekto atitikties ar teisės konsultacija. Patikrinta 2026-10-03.');
export const pages=[
{slug:'',type:'home',title:'Nuomos apimtis prasideda nuo jūsų fasado.',description:'Fasado matmenys, laikotarpis ir paslaugų apimtis – aiškesnis pastolių nuomos poreikis Vilniuje ir Vilniaus rajone.',intent:'Suformuluoti realų namo fasado pastolių nuomos poreikį Vilniaus regione',images:['hero','measure'],links:['nuomos-poreikis','fasado-matmenys','pastoliu-nuomos-kaina','nuoma-su-montavimu','kontaktai'],body:blocks(`
Padedame namo savininkui aiškiai aprašyti planuojamos fasado pastolių nuomos poreikį Vilniuje ir Vilniaus rajone: fasadą, laikotarpį ir reikalingas paslaugas.
Tai MB Pinet išankstinis poreikio tyrimas. Įranga, vykdytojas, kaina ir atvykimo laikas dar nepatvirtinti. Užklausa nėra rezervacija.
## Trys klausimai prieš nuomą
- Fasadas: kurios sienos, kokie žinomi matmenys, kokių duomenų dar trūksta?
- Laikas: kada planuojate pradėti ir kiek laiko numatote dirbti?
- Apimtis: vien įranga, ar reikia ir pristatymo, profesionalaus montavimo, išmontavimo bei išvežimo?
## Plotą aprašykite, komplektą derinkite
Stačiakampės sienos ilgis × aukštis padeda aprašyti fasadą. Tai nėra pastolių dalių kiekis, saugos patikra ar nuomos sąmata. Langų plotas automatiškai neatimamas; nestandartinę geometriją ir nežinomus aukščius aptarkite su realiu vykdytoju.
Fasado matmenų gidas padės atskirti žinomus dydžius nuo spėjimų. Ruošinys žemiau skaičiuoja tik jūsų įrašytą paprastą geometriją ir nieko neišsiunčia.
## Palyginkite visą pasiūlymą
Vien antraštinio €/m² dydžio neužtenka: reikia žinoti laikotarpį, paslaugų ribas ir grąžinimo sąlygas. Pastolių nuomos kainos gidas padės parengti vienodus klausimus skirtingiems tikriems pasiūlymams. Mūsų kainoraščio šiame etape nėra.
Nuomos su montavimu gidas atskiria įrangą nuo profesionalaus vykdymo ir priėmimo. Savarankiško montavimo instrukcijų čia nepateikiame.
## Aprašykite savo projektą
Kontaktų puslapyje pateikite vietovę, fasado duomenis, laikotarpį ir paslaugų poreikį. Tikslaus adreso ar dokumentų pirmam poreikio tyrimui nereikia. Galima rašyti tiesiai arba naudoti neprivalomą ruošinį.
Nėra automatinio perdavimo tiekėjams ar pažado gauti pasiūlymų. Pirmo etapo ribas paaiškina nuomos poreikio puslapis; vėlesnė mokama paslauga būtų derinama atskirai.
`)},
{slug:'nuomos-poreikis',type:'faq',title:'Kokį pastolių nuomos poreikį registruojame?',description:'Planinė individualaus namo fasado nuoma Vilniuje ir Vilniaus rajone: ką pateikiate ir ką tai reiškia.',intent:'Suprasti pirmo etapo nuomos užklausą ir vykdymo ribas',links:['kontaktai','fasado-matmenys','nuoma-su-montavimu','pastoliu-nuomos-kaina'],body:blocks(`
Registruojame individualaus namo savininko išankstinį poreikį planinei fasado pastolių nuomai Vilniuje ir Vilniaus rajone. Tai gali būti fasado atnaujinimas, šiltinimas ar dažymas, kai nuomos sprendimą priimate jūs, o rangovas pastolių dar nepateikia.
## Ką galite pateikti dabar
Užrašykite vietovę be tikslaus adreso, planuojamus fasado darbus, numatomą pradžią ir trukmę. Nurodykite žinomus sienų matmenis arba aiškiai parašykite, kad jų dar neturite. Pasakykite, kokios apimties reikia: įrangos, transporto, profesionalaus montavimo ir išmontavimo. Nežinoma informacija nėra kliūtis parašyti, tačiau ji netampa patvirtintu dydžiu.
## Ką reiškia užklausa
MB Pinet šiuo etapu tiria poreikį. Tai nėra nuomos užsakymas, kainos pasiūlymas, apžiūros rezervacija ar įrangos likučio patvirtinimas. Neturime patvirtinto nuomotojo partnerio, brigados, kainoraščio ar darbo grafiko. Atsakymo laiko ir vykdymo nežadame.
Informacija automatiškai nuomotojams nepersiunčiama. Jeigu vėliau būtų galimas konkretus vykdytojas, jo pasiūlymas ir duomenų perdavimas turėtų būti atskirai suderinti. Formos checkbox nėra reklamos prenumerata.
## Kam šis etapas netinka
- Skubiam įrangos pristatymui ar darbų saugos klausimo sprendimui šiandien.
- Pastolių pirkimui, naudotos įrangos supirkimui ar tariamam katalogo likučiui.
- Konkrečios sistemos projektavimui, montavimo instrukcijai ar techninei ekspertizei.
- Situacijai, kurioje rangovo sutartis jau apima visą pastolių organizavimą; pirmiausia patikrinkite savo sutartį.
## Kaip ruoštis tikram susitarimui
Su realiu nuomotoju reikėtų suderinti vietos įvertinimą, sistemą, laiką, logistiką, profesionalų montavimą, dokumentus ir grąžinimo tvarką. Ploto ruošinys nieko iš to nepatvirtina. Paslaugų apimtį ir mokėjimo sąlygas turi įvardyti tikras vykdytojas.
## Kaip spręsime dėl plėtros
Reikšmingas rezultatas būtų tikros tinkamos užklausos, suderintas vykdytojas ir mokėtojas bei išmatuota ekonomika. Gidų peržiūros, el. pašto nuorodos paspaudimai ir vietiniai testai nėra atliktos nuomos ar pajamų įrodymas. Dabar tik vietinė peržiūra su sintetiniais formos bandymais.
`)},
{slug:'gidai',type:'faq',title:'Klausimai prieš fasado pastolių nuomą',description:'Matmenys, kainos apimtis ir profesionalus montavimas – trys skirtingi nuomos sprendimai.',intent:'Pasirinkti konkretų nuomos pasirengimo klausimą',images:['measure','scope','mount'],links:['fasado-matmenys','pastoliu-nuomos-kaina','nuoma-su-montavimu','kontaktai'],body:blocks(`
Pasirinkite, kas dar neaišku jūsų projektui. Matmenų gidas padeda aprašyti sienas; kainos gidas – palyginti vienodą pasiūlymų apimtį; montavimo gidas – atskirti įrangos nuomą nuo vykdymo ir priėmimo.
Gidai nėra įrangos katalogas ar darbo aukštyje instrukcija. Jei norite pateikti konkretų planuojamos nuomos poreikį Vilniaus regione, kontaktų puslapyje galima parašyti žinutę. Tai išankstinis tyrimas be rezervacijos ar pasiūlymo garantijos.
`)},
{slug:'fasado-matmenys',type:'guide',title:'Fasado matmenys nuomai: ką užrašyti, ko neskaičiuoti',description:'Stačiakampių sienų ilgis ir aukštis padeda aprašyti poreikį. Fasado plotas nėra techninė pastolių komplektacija.',intent:'Aprašyti žinomas fasado sienų dimensijas be tariamo įrangos kiekio',images:['measure'],sources:[ts,pilaite],links:['pastoliu-nuomos-kaina','nuoma-su-montavimu','kontaktai'],body:blocks(`
Nuomotojui svarbu suprasti, kurią namo dalį norite pasiekti ir kokie darbai planuojami. Paprastas fasado aprašas padeda pradėti pokalbį, tačiau vien sienos kvadratūra nepasako, kiek ir kokių pastolių elementų reikia. Šis gidas skirtas žinomų duomenų surinkimui iš planų ar jau turimų matavimų, be lipimo, montavimo ar konstrukcijos parinkimo.
## Pirmiausia įvardykite sienas
Surašykite kiekvieną reikalingą fasado pusę atskirai. Galite vadinti jas priekine, kiemo ar šonine siena; adresą ar geografinę kryptį nurodyti nebūtina. Užrašykite, ar darbai vyks visoje sienoje, dalyje fasado, ties priestatu ar keliais etapais. Vien bendras namo perimetras neatskleidžia, ar visos pusės reikalingos vienu metu.
Jei fasado rangovas jau pateikia pastolius, pirmiausia patikrinkite jo pasiūlymo ribas. Dviguba nuomos užklausa gali būti nereikalinga. Jeigu rangovas pateikia tik dalį įrangos ar dirbs atskirais etapais, taip ir aprašykite. Nespėkite, kad visi rangovai pastolius organizuoja vienodai.
## Žinomi dydžiai ir jų kilmė
- Kiekvienos sienos apytikris ilgis metrais ir iš kur dydis paimtas: planas, ankstesnis matavimas arba dar nežinomas.
- Žinomas sienos aukštis ir kur baigiasi planuojamas darbas. Darbinės platformos aukštis yra atskiras techninis klausimas vykdytojui.
- Iškyšos, priestatas, balkonas, stogelis ar dalis skirtingame lygyje: aprašykite jų buvimą, ne projektuojamą atramą.
- Ar yra šlaitinė viršutinė sienos dalis, kurios neaprašo vienas stačiakampis?
- Ar aplink sieną skiriasi pagrindo lygis ir ar prieiga iš visų reikalingų pusių vienoda?
Duomenis pateikite iš saugiai jau turimos informacijos. Vien užklausai nereikia lipti ant kopėčių, stogo ar pastolių, artintis prie elektros linijų ar bandyti matuoti nepasiekiamos vietos. Jei dydžio nežinote, palikite jį nežinomą ir aptarkite tinkamą objekto įvertinimą su specialistu.
## Ką reiškia ilgis × aukštis
Stačiakampės sienos geometrinis plotas yra ilgis padaugintas iš aukščio. Kelių tokių sienų plotai gali būti sudedami. Pavyzdžiui, iliustracinės 10 × 6 m ir 8 × 6 m sienos duotų 60 + 48 = 108 m² žinomos stačiakampės geometrijos. Tai skaičiavimo pavyzdys, ne jūsų namo matmenys, mūsų kainos pagrindas ar rekomenduojamas pastolių dydis.
Ruošinys automatiškai neatima langų ir durų. Darbui prie angų taip pat gali reikėti prieigos, todėl jų plotų atėmimas nėra automatinė įrangos kiekio taisyklė. Šlaitai, laiptai, iškyšos, keli aukščiai ir sistemos parinkimas ruošinyje neįvertinami. Dalies žinomų sienų suma negali būti vadinama viso objekto plotu, jei kita dalis nežinoma.
## Kodėl fasado plotas nėra komplektas
Skirtingi tiekėjai pasiūlyme gali vartoti skirtingus ploto ir aukščio apibrėžimus. Pilaitės viešame puslapyje atskiria skaičiuojamą ir pasiekiamą aukštį pagal savo sistemą. To skirtumo negalima universaliai pritaikyti jūsų objektui. Paprašykite realaus nuomotojo paaiškinti, kas būtent laikoma jo pasiūlymo m² ir kuo tai susiję su jūsų pateiktais matmenimis.
Konkreti įranga, atramos, prieiga, darbo lygiai ir tvirtinimas reikalauja profesionalaus sprendimo. Mūsų ruošinys nepateikia elementų sąrašo, apkrovos, tvirtinimo žingsnio ar saugos įvertinimo. Nuomos su montavimu gidas padeda pasiruošti klausimus apie atsakomybę; jis taip pat nepakeičia techninio projekto.
## Trumpas matmenų aprašas
„Kiemo siena: apytikriai [ilgis] × [aukštis], dydžiai iš [šaltinis]. Šoninė siena: aukščio nežinau. Darbai [paskirtis], planuojami [vienu metu / etapais]. Prie [sienos] yra priestatas. Reikia aptarti objekto įvertinimą ir visą paslaugų apimtį.“ Tai pavyzdinis jūsų žinutės karkasas, ne tikras kliento atvejis.
Pastolių nuomos kainos gidas padės prie matmenų pridėti laikotarpį ir paslaugas. Kontaktų puslapyje galite pateikti išankstinį poreikį; jis nėra nuomos rezervacija ar įrangos pasiūlymas.
`)},
{slug:'pastoliu-nuomos-kaina',type:'guide',title:'Pastolių nuomos kaina: lyginkite apimtį ir laikotarpį',description:'Ką reiškia m², nuomos dienos, transportas ir grąžinimas? Klausimų lapas tikriems pasiūlymams palyginti.',intent:'Palyginti realių nuomos pasiūlymų sąlygas be išgalvoto tarifo',images:['scope'],sources:[pilaite,str,tr],links:['fasado-matmenys','nuoma-su-montavimu','kontaktai'],body:blocks(`
Nuomos kainą prasminga lyginti tik tada, kai aišku, už kokį laiką, įrangą ir paslaugas mokama. Vien antraštinis €/m² dydis nepasako visos projekto sumos. Šis gidas yra klausimų lapas jūsų gautiems pasiūlymams, be tariamo rinkos vidurkio ar mūsų kainoraščio. MB Pinet šiame etape nuomos sąmatos nepateikia ir mokėjimų nepriima.
## Sutarkite, kas skaičiuojama
Paprašykite tiekėjo įvardyti ploto pagrindą, laikotarpį ir įtrauktą komplektaciją. Ar suma skirta vienai dienai, sutartam laikotarpiui ar kitam aiškiam vienetui? Ar nurodyta kaina su PVM, ar be jo? Ar tai tik pradinis „nuo“ tarifas, ar konkrečiam objektui parengta suma? Jei vieneto nėra, neužpildykite jo prielaida.
Fasado matmenų gidas parodo, kodėl geometrinis sienos plotas nėra automatinis nuomotojo sąskaitos plotas. Prie kiekvieno pasiūlymo užrašykite jo datą ir tą patį savo projekto aprašą. Skirtingų sienų ar skirtingo darbo aukščio pasiūlymų negalima patikimai palyginti vien bendromis sumomis.
## Atskirkite paslaugų eilutes
- Įrangos nuoma: kokiai apimčiai ir kiek laiko, nuo kokio įvykio prasideda nuomos skaičiavimas?
- Pristatymas ir išvežimas: ar įtraukta abu kartus, koks objektas ir sutartas iškrovimo kelias?
- Profesionalus montavimas ir išmontavimas: ar įtraukti abu darbai, ar juos reikia derinti atskirai?
- Perstatymas ir etapai: ar planuojama perkelti prie kitų sienų, ar tai papildoma paslauga?
- Priėmimo, priežiūros ir dokumentų apimtis: kas atsakingas ir kas iš tiesų įtraukta į pasiūlymą?
- Grąžinimas, valymas ir trūkstama ar sugadinta įranga: kokios sutarties sąlygos taikomos?
Pilaitės viešai atskiria nuomą, transportą ir montavimą. STR namo projektų apraše siūlo visą sutartą darbų apimtį. Tai du skirtingi pasiūlymo pateikimo pavyzdžiai, o ne pažadas, kad Lietuvos tiekėjai taiko tą pačią sutartį. Mūsų klausimų lapas leidžia patikrinti būtent jums pateiktą apimtį.
## Laikas keičia palyginimą
Užrašykite pageidaujamą pradžią, tikėtiną trukmę ir kas nutiktų fasado darbams užsitęsus. Kuri data yra nuomos pabaiga: prašymas išmontuoti, faktinis išmontavimas, išvežimas ar kitas sutartas įvykis? Kas nutinka, jei išvežimo laikas keičiasi? Atsakymą turi pateikti jūsų realus nuomotojas; šiame projekte nėra universalaus termino.
Jei pasiūlyme numatytas pratęsimas, paprašykite aiškaus jo skaičiavimo pagrindo ir pranešimo tvarkos. Nevadinkite planuojamo darbų laikotarpio garantuotu. Priklausomybę nuo kitų rangovų, paviršiaus darbų ar numatomų etapų verta aptarti prieš susitarimą, o ne laikyti papildomas dienas iš anksto nemokamomis.
## Lyginimo pavyzdys be tariamų kainų
Tarkime, iliustracinis A pasiūlymas nurodo tik įrangą sutartam laikotarpiui, o B – įrangą ir profesionalų montavimą. Mažesnė A suma dar nereiškia mažesnės viso projekto kainos. Užpildykite tas pačias eilutes abiem: įranga, laikas, abu transportai, abu montavimo darbai, pratęsimas ir grąžinimas. Nepateiktą eilutę pažymėkite „reikia patikslinti“.
Tai nėra tikri mūsų gauti pasiūlymai ar skaičių simuliacija. Jei turite tikras sumas, lyginkite jas tik patikslinę tą pačią apimtį. Nežinomos paslaugos neprilyginkite nuliui. Taip išvengsite palyginimo, kuris atrodo tikslus, bet remiasi skirtingais projektais.
## Sutarties smulkūs punktai yra apimties dalis
Transrifus 2024 viešos taisyklės rodo, kad grąžinimas ir įrangos būklė gali turėti atskiras pasekmes. Nekopijuojame jų tarifų ar pranešimo dienų į jūsų projektą. Paprašykite aktualių konkretaus tiekėjo sąlygų ir išsiaiškinkite, kas priima įrangą, fiksuoja kiekius, patvirtina nuomos pabaigą bei sprendžia neatitikimus.
Nuomos su montavimu gidas padės pasiruošti atsakomybės ir priėmimo klausimus. Jei norite pranešti tikrą planuojamą poreikį Vilniaus regione, kontaktų puslapyje galima pateikti žinutę. Tai lieka išankstinis tyrimas, be kainos, užsakymo ar tiekėjo pažado.
`)},
{slug:'nuoma-su-montavimu',type:'guide',title:'Pastolių nuoma su montavimu: ką suderinti prieš darbus',description:'Įranga, profesionalus montavimas, priėmimas ir grąžinimas yra atskiros projekto atsakomybės.',intent:'Atskirti įrangos nuomą nuo profesionalaus montavimo ir priėmimo',images:['mount'],sources:[vdi,tr],links:['fasado-matmenys','pastoliu-nuomos-kaina','kontaktai'],body:blocks(`
„Nuoma su montavimu“ turėtų būti konkreti darbų ir atsakomybių apimtis, o ne vien patogi pasiūlymo antraštė. Prieš susitarimą išsiaiškinkite, kas vertina objektą, parenka įrangą, montuoja, priima, prižiūri ir išmontuoja. Šis gidas padeda pasiruošti pokalbiui su realiu vykdytoju. Jis nėra surinkimo instrukcija ar konkretaus objekto saugos patikra.
## Įranga ir vykdymas nėra tas pats
Vien išnuomota įranga savaime nepatvirtina, kad pastoliai jūsų objekte tinkamai sumontuoti ir parengti naudoti. Paklauskite, ar tiekėjas siūlo profesionalų montavimą ir išmontavimą, ar jo pasiūlymas apima tik įrangos pateikimą. Jeigu darbą organizuoja jūsų fasado rangovas, aiškiai suderinkite, kuri atsakomybės dalis priklauso jam.
VDI statybviečių kontroliniame klausimyne darbo aukštyje dalis tikrina projektą, priežiūrą ir darbuotojų parengimą. Tai aiški priežastis nelaikyti interneto nuotraukos ar bendros sienos kvadratūros montavimo sprendimu. Šis projektas netvirtina operatoriaus techninės kvalifikacijos ar brigados pajėgumo. Konkretaus objekto reikalavimus bei instrukcijas nustato atsakingi specialistai.
## Ką pasakyti apie vietą
Pateikite jau žinomas aplinkybes: skirtingi pagrindo lygiai, siauras praėjimas, priestatas, vartai, transporto privažiavimas, šalia esantis viešas kelias ar kiti apribojimai. Aprašas nėra leidimas užimti viešą erdvę ar išvada, kad parinktas pagrindas tinkamas. Nežinomus klausimus įvardykite ir aptarkite įvertinimą su vykdytoju.
Vien užklausai nereikia tikrinti tvirtinimo taškų, ardyti sienos, bandyti apkrovos ar lipti aukštyn. Nesiūlome universalių tvirtinimo, paklotų, apkrovų ar surinkimo taisyklių. Konkreti sistema ir situacija lemia techninį sprendimą; bendras gidas jo neperima.
## Klausimai apie darbų apimtį
- Kas profesionaliai įvertins objektą ir parengs taikytiną montavimo bei naudojimo sprendimą?
- Kas pateikia įrangą, montuoja ir išmontuoja; ar tai aiškiai įvardyti vykdytojai?
- Kas organizuoja pristatymą, iškrovimą ir išvežimą, kokias vietos sąlygas reikia iš anksto suderinti?
- Kokiu dokumentu ir kokia tvarka patvirtinamas įrangos bei sumontuotų pastolių priėmimas?
- Kas vykdo priežiūrą ir patikrą pagal konkrečias instrukcijas, kam pranešama apie pokytį ar neatitikimą?
- Kas sprendžia dėl papildomų dangų, perstatymo ar pasikeitusios darbų apimties?
Užrašykite konkrečius atsakymus. Žodis „įtraukta“ nepasako, ar apima ir išmontavimą, transportą atgal ar kitą etapą. Jei pasiūlyme šių dalių nėra, paklauskite prieš laikydami jį pilnu. Nepalikite atsakomybės vien numanomam susitarimui tarp dviejų rangovų, kurio patys nesate matę.
## Priėmimas nėra formalus paveikslėlis
Susitarkite, kas dalyvaus priimant įrangą ir darbą, kaip bus fiksuojami kiekiai, būklė bei pastabos ir kur gausite taikytinas instrukcijas. Mūsų generuota fasado iliustracija nieko iš to nepatvirtina. Viešas Transrifus taisyklių pavyzdys atskirai aptaria priėmimą ir grąžinimą; jūsų realus tiekėjas turi pateikti savo aktualias sąlygas.
Jeigu pastebėjote problemą ar sąlygos pasikeitė, nepradėkite savo jėgomis keisti konstrukcijos remdamiesi gidu. Kreipkitės į atsakingą vykdytoją ir vadovaukitės konkretaus objekto saugos tvarka. MB Pinet forma nesiūlo skubios pagalbos, apžiūros ar nuotolinio leidimo naudoti pastolius.
## Išmontavimas ir nuomos pabaiga
Prieš pasirašydami išsiaiškinkite, kaip prašomas išmontavimas, kas suderina datą ir kada baigiasi nuomos skaičiavimas. Ar reikės patvirtinti grąžinamą kiekį, ar taikomos valymo sąlygos ir kaip sprendžiami neatitikimai? Tai jūsų nuomotojo sutarties klausimai, ne šio projekto universalūs terminai.
Pastolių nuomos kainos gidas padės visus šiuos punktus įtraukti į palyginimą. Fasado matmenų gidas leidžia parengti pradinį objekto aprašą. Kontaktų puslapyje galite pateikti konkretų planinį poreikį, aiškiai pažymėdami, ar reikia visos profesionalaus vykdymo apimties. Užklausa nepatvirtina nei brigados, nei nuomos laiko ar saugaus naudojimo.
`)},
{slug:'kontaktai',type:'faq',title:'Aprašykite pastolių nuomos poreikį',description:'Vietovė, fasadas, laikotarpis ir paslaugų apimtis. Galima rašyti tiesiai arba naudoti neprivalomą ruošinį.',intent:'Pateikti realų nuomos poreikį be užsakymo pažado',links:['nuomos-poreikis','privatumas'],body:blocks(`
Kontaktas – MB Pinet, info@pinet.lt. Rašydami nurodykite fasadopastoliai.lt ir savo planuojamų fasado darbų poreikį Vilniuje arba Vilniaus rajone. Telefono, sandėlio, įrangos ar montavimo brigados šis projektas neturi patvirtintų.
Tai išankstinis poreikio tyrimas. Nuomos rezervacija, sąmata, atvykimo laikas ir atsakymo terminas nežadami. Skubiam poreikiui kreipkitės į realiai veikiančią nuomos įmonę. Duomenų automatiškai tiekėjams nesiunčiame.
## Ką parašyti
Vietovė be tikslaus adreso, fasado darbai ir žinomi matmenys arba „nežinau“, pageidaujama pradžia/trukmė, reikalingos paslaugos. Jei pastolius jau organizuoja rangovas, tai nurodykite. Nesiųskite asmens dokumentų, sutarties kopijų ar svetimų kontaktų.
## Dabartinė peržiūra
Vietiniuose bandymuose naudokite tik sintetinius duomenis. Forma įrašo testą į atskirą vietinę bazę, tačiau laiškų siuntimas išjungtas. Nuomos poreikio puslapis ir privatumo tekstas paaiškina ribas prieš pateikimą.
`)},
{slug:'apie-projekta',type:'faq',title:'Apie projektą „Fasado pastoliai“',description:'MB Pinet poreikio tyrimo projektas ir jo skirtumas nuo archyve buvusios nuomos įmonės.',intent:'Patikrinti projekto operatorių, tikslą ir istorijos ribą',links:['redakcija','kontaktai','nuomos-poreikis'],body:blocks(`
Fasadopastoliai.lt yra MB Pinet administruojamas išankstinio nuomos poreikio tyrimo projektas. Padedame individualaus namo savininkui aiškiau parengti fasado, laiko ir paslaugų apimties klausimus. Operatorius ir kontaktas info@pinet.lt patvirtinti savininko kaip bendri tinklo kontaktai.
## Ankstesnis domeno turinys nėra mūsų veikla
Viešame archyve šis domenas buvo siejamas su kita pastolių nuomos ir pardavimo įmone. Mes neperimame jos įrangos, sandėlių, klientų, sertifikavimo, kontaktų ar darbų istorijos. Dabartinio projekto nereikia laikyti tos įmonės tęsiniu. Ankstesnio operatoriaus užsakymų šioje formoje neadministruojame.
## Pirmo etapo ribos
Turime informacinius gidus, geometrinio fasado aprašo ruošinį ir išankstinio poreikio kelią. Patvirtinto nuomotojo, brigados, likučio ar nuomos kainoraščio nėra. Tai nėra pilna nuomos platforma, parduotuvė ar mokama montavimo paslauga. Tikras domeno paleidimas ir pristatymas atskirai tikrinami; dabar vietinė versija.
## Galima komercinė kryptis
Jei tikri poreikiai ir būsimas vykdytojo susitarimas tai pagrįstų, galėtume svarstyti atlyginamą tinkamų užklausų modelį. Tai hipotezė, ne esama partnerystė ar jūsų duomenų pardavimas. Konkretaus perdavimo sąlygos turėtų būti suderintos atskirai.
Gidų skaitymas nėra nuomos paklausos įrodymas. Plėtra priklausys nuo tinkamų užklausų, vykdymo ir ekonomikos, o ne vien nuo lankomumo.
## Turinys ir klausimai
Redakcijos puslapyje paaiškinta šaltinių ir iliustracijų metodika. Dėl netikslumo ar projekto poreikio rašykite info@pinet.lt, nurodydami domeną ir URL. Netvirtiname specialisto kvalifikacijos, paslaugos pajėgumo ar konkretaus atsakymo termino.
`)},
{slug:'redakcija',type:'faq',title:'MB Pinet redakcija',description:'Kas atsako už gidus, kaip vertinami šaltiniai ir kodėl iliustracijos nėra atliktų darbų įrodymai.',intent:'Patikrinti realią organizacinę autorystę ir metodiką',links:['kontaktai','apie-projekta'],body:blocks(`
Už projekto turinį atsako MB Pinet. Tai organizacinis redakcinis profilis, ne išgalvoto montuotojo ar inžinieriaus biografija. Neteigiame techninės kvalifikacijos, pastolių projektavimo ar atliktų darbų patirties. Turinys padeda pasiruošti pokalbiui su realiu vykdytoju.
## Kaip rengiame gidus
Kiekvienam URL pasirenkame vieną konkretų skaitytojo klausimą. Tikriname realių nuomotojų pasiūlymų apimtį ir oficialios institucijos saugos kontekstą. Prie gido yra konkreti nuoroda, patikros data ir šaltinio riba. Užsienio kainų, teisinių taisyklių ir svetimos kvalifikacijos automatiškai į Lietuvą neperkeliame.
Juodraščiai rengiami naudojant AI, po to teiginiai, nuorodos ir kontakto ribos peržiūrimi agento redakciniu procesu. Tai nėra žmogaus inžinieriaus patvirtintas montavimo projektas. Nežinomus mūsų įkainius, pajėgumą, tiekėjus ir rezultatus paliekame nežinomus. Tariamo eksperto ar kliento atsiliepimų nėra.
## Iliustracijos ir ruošinys
Originalios temos iliustracijos sukurtos generatyviniu AI ir peržiūrėtos kaip kontekstiniai vaizdai. Jos nėra mūsų darbuotojų, sandėlio, įrangos ar tikrų klientų darbų fotografijos ir neįrodo techninės atitikties. Kilmė, tikslūs promptai ir originalai laikomi privačiame medijos žurnale; trečiųjų šalių fotografijos nenaudotos.
Ploto ruošinyje taikoma tik stačiakampės geometrijos aritmetika. Jis nepateikia techninės komplektacijos, kainos, projekto ar saugos išvados. Nežinoma dalis taip ir įvardijama. Pavyzdžiai aiškiai iliustraciniai, jie nėra realių klientų įrašai.
## Datos ir pataisymai
Gido datos yra suplanuotos patvirtinto turinio versijos datos, ne vietinės peržiūros faktinio viešo paskelbimo įrodymas. Keičiantis pasiūlymui ar tikram duomenų keliui reikės naujos peržiūros. Netikslumą praneškite info@pinet.lt, pateikdami domeną, URL ir sakinį; pakeistas tekstas patvirtinamas iš naujo. Paieškos reitingų, nuomos įvykdymo ar konversijų garantijų nėra.
`)},
{slug:'privatumas',sources:[source('https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en','Europos Komisija: asmens duomenų teisės','Bendras teisių ir informavimo reikalavimų paaiškinimas, patikrintas 2026-10-03. Jis neįrodo šio projekto produkcijos teisinio pagrindo ar veikiančios komercinės tvarkos.')],type:'faq',title:'Privatumas ir užklausos duomenys',description:'Vietinės formos laukai, geometrinio ruošinio paskirtis, saugojimas ir atskiras peržiūrų matavimas.',intent:'Suprasti dabartinį duomenų kelią prieš užklausą',links:['kontaktai','naudojimo-salygos'],body:blocks(`
Šis tekstas skirtas 2026-10-03 vietinei peržiūrai. Už projekto sprendimus atsako MB Pinet, kontaktas info@pinet.lt. Tikras domeno paleidimas ir komercinio duomenų tvarkymo sąlygos dar nepatikrinti. Bandymams naudokite tik sintetinius duomenis.
## Formos laukai
Priimamas vardas, el. paštas, jūsų žinutė ir pateikimo sutikimas. Įraše yra identifikatorius, siteId, pateikimo ir sutikimo laikas bei pradinis puslapis. Tikslaus adreso, asmens dokumentų, sutarčių kopijų ar svetimų duomenų nereikalaujame; nesiųskite jų laisvoje žinutėje.
Matmenų ir projekto ruošiniai veikia naršyklėje. Laukų užpildymas, geometrinės sumos apskaičiavimas ar žinutės paruošimas duomenų neišsiunčia ir nelaiko jų URL ar ilgalaikėje naršyklės saugykloje. Pateikiama tik paties lankytojo galutinai siunčiama forma. Checkbox skirtas šiam poreikiui nagrinėti, ne rinkodaros prenumeratai.
## Vietinis saugojimas
Techninė peržiūra pateiktą sintetinę užklausą išsaugo atskiroje vietinėje bandymų bazėje. SMTP išjungtas; tikras laiškas operatoriui neišsiunčiamas. QA identifikuoti sintetiniai įrašai pašalinami iš šios bazės. Tai nėra veikiančio domeno duomenų saugojimo termino pažadas.
Prieš tikrą paleidimą būtina nustatyti ir paskelbti teisėtą tvarkymo pagrindą, konkretų saugojimo terminą arba kriterijus, faktinius paslaugų teikėjus, galimą perdavimą ir teisių įgyvendinimo tvarką. Neįjungtas būsimas nuomotojas ar agentas nesuteikia teisės automatiškai perduoti pateiktos informacijos.
## Matavimas
Skaičiuojamos dienos, puslapio ir įvykio suvestinės atskirai šiam siteId. Formos tekstas į jas nepatenka; nuorodos į el. paštą paspaudimas nėra gautas laiškas. Kelias nesukuria paskyros, individualaus sekimo slapuko ar profilio. DNT / Global Privacy Control signalai ir atpažinti automatizuoti testai praleidžiami.
Reklamos pikselių, balso agento, žemėlapio ar išorinio vaizdo įrašo įterpimo šioje versijoje nėra. Šriftai ir vaizdai pateikiami su projektu. Išorinių šaltinių puslapiai turi savo duomenų tvarkymo taisykles.
## Duomenų klausimai
Galite prašyti informacijos ir susipažinti su savo duomenimis, prašyti juos ištaisyti; teisės aktuose numatytais atvejais – ištrinti, apriboti tvarkymą ar perkelti, nesutikti su tvarkymu ir atšaukti sutikimą. Taikymas priklauso nuo tvarkymo pagrindo ir aplinkybių. Galima teikti skundą priežiūros institucijai. Bendrą teisių paaiškinimą pateikia Europos Komisija: asmens duomenų teisės. Tai nėra patvirtinimas, kad šios vietinės peržiūros komercinės procedūros jau įdiegtos.
Dėl savo duomenų kreipkitės info@pinet.lt, nurodydami šį domeną ir užklausos ID, jei jį turite. Tvarkymo pagrindas bei aplinkybės lemia teisių taikymą; prieš tikrą paleidimą operatorius turi patvirtinti informavimą ir teisių įgyvendinimo kelią. Neskelbiame išgalvotos veikiančios komercinės privatumo politikos. Į paprastą žinutę papildomų asmens dokumentų nedėkite.
`)},
{slug:'naudojimo-salygos',type:'faq',title:'Naudojimo sąlygos',description:'Gidų, geometrinio ruošinio ir išankstinės nuomos poreikio formos ribos.',intent:'Suprasti kad turinys ir užklausa nėra sutartis ar techninis projektas',links:['privatumas','kontaktai','redakcija'],body:blocks(`
Fasadopastoliai.lt projektą administruoja MB Pinet, kontaktas info@pinet.lt. Dabartinė versija yra vietinė peržiūra, ne patvirtintas tikro domeno paleidimas. Ankstesnio šiame domene buvusio operatoriaus įrangos, klientų, kontaktų ir reputacijos neperimame.
## Informacinė paskirtis
Gidai ir ruošiniai padeda aprašyti nuomos poreikį. Jie nėra pastolių projektas, surinkimo instrukcija, ekspertizė, saugos patikra ar techninė komplektacija. Matmenų aritmetika apsiriboja stačiakampių sienų geometrija; individualų objektą ir vykdymą vertina realūs atsakingi specialistai.
## Užklausos reikšmė
Žinutė nėra sutartis, rezervacija, sąmata, mokėjimo prievolė ar pažadas gauti tiekėjo pasiūlymą. Patvirtintos įrangos, nuomotojo, brigados, kainoraščio ir atvykimo grafiko neturime. Atsakymo termino, paslaugos suradimo, montavimo ar nuomos rezultato negarantuojame. Vėlesnė paslauga būtų suderinta atskirai.
Tiekėjams informacija automatiškai nesiunčiama. Vietiniams bandymams naudokite sintetinius duomenis. Tikro kontakto ir duomenų kelio paleidimas reikalauja atskiros operatoriaus bei pristatymo patikros. Skubiam ar saugos klausimui ši forma netinka.
## Šaltiniai ir iliustracijos
Šaltiniai pateikiami konkretiems klausimams pagrįsti; jie gali keistis ir nepatvirtina partnerystės. Kitos įmonės sutarties sąlygos ar UK taisyklės netampa mūsų ar universaliomis Lietuvos sąlygomis. Originalūs vaizdai yra konteksto iliustracijos, ne mūsų darbų ar įrangos atitikties fotografijos. Metodika redakcijos puslapyje.
## Pataisymai
Netikslumą galima pranešti info@pinet.lt, nurodant domeną, URL ir sakinį. Pasikeitęs pasiūlymas ir duomenų tvarkymas turi būti peržiūrėti iš naujo. Nėra atsiskaitymų, paskyrų, balso ar automatinio nuomos užsakymo. Paieškos reitingų ir individualaus nuomos rezultato nežadame.
`)}
];
