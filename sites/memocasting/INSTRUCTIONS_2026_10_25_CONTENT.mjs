// Owner-supplied recipes, visually checked against both one-page PDFs on 2026-10-25.
// Quantities belong to native content, never to the presentation component.
const p=text=>({type:'paragraph',text}),h=text=>({type:'heading',level:2,text}),list=(...items)=>({type:'list',items});
export const instructionSources=Object.freeze({
 couple:{path:'D:/dvieju ranku receptas Lithuanian.pdf',sha256:'4dc1623fb5367065c2136296b6a14c44f07e2cb61a4c38f898fb04e36eaf9cfe'},
 family:{path:'D:/Šeimos ranku receptas (2) (1).pdf',sha256:'8113f91dcad9490a4d5eebfcf01e0f5acd593971bafadf82b19647c6f29fd07c'},
});
const sharedLinks=[['pagalba','Pagalba dėl liejinio'],['gidai/dziovinimas-ir-isemimas','Išėmimas ir džiovinimas'],['gidai/liejinio-dazymas-ir-prieziura','Dažymas ir priežiūra']];
export const instructionHub={slug:'pages/instrukcija',type:'faq',title:'Rankų liejimo instrukcijos',description:'Pasirinkite poros arba šeimos rinkinio instrukciją: tikslūs vandens kiekiai, temperatūra, liejimo žingsniai, džiovinimas ir dažymas.',body:[
 p('Prieš atidarydami medžiagas pasirinkite savo Memocasting rinkinį. Poros ir šeimos receptai skiriasi: naudokite tam rinkiniui nurodytą vandens kiekį ir temperatūrą. Šeimos receptas nėra tiesiog dvigubas poros receptas.'),
 h('Kaip pasirinkti instrukciją?'),list('Poros rinkiniui: alginatui reikia 2 l vandens, gipsui – 700 ml.','Šeimos rinkiniui: alginatui reikia 3,2 l vandens, gipsui – 1 400 ml.','Jei turite kitą gaminį ar atskirai įsigytas medžiagas, šių proporcijų automatiškai netaikykite. Prieš maišydami pasitikslinkite.'),
 h('Pirmiausia perskaitykite visą eigą'),p('Pasiruoškite reikmenis, pamatuokite vandens temperatūrą ir išbandykite rankų padėtį tuščiame kibire. Iš anksto numatykite vietą liejiniui džiūti: po išėmimo iki dažymo reikia 5–7 parų. Vien vaizdo įrašo nepakanka tiksliems jūsų rinkinio kiekiams pasirinkti.'),
 h('Instrukcija po ranka'),p('Abiejuose puslapiuose rasite nuoseklius žingsnius, spausdinimo mygtuką ir originalų PDF. Interneto tekstas parengtas pagal Memocasting pateiktus receptus; jei jūsų pakuotėje esantis lapas skiriasi, prieš pradėdami susisiekite su mumis.'),
 h('Reikia pagalbos?'),p('Parašykite, kurį rinkinį turite ir kuriame etape kilo klausimas. Pagalba dėl liejinio padės surinkti tikslius duomenis. Neaiškaus kiekio ar laiko nespėkite pagal kito gamintojo receptą.')
],links:[['instrukcijos/poros-rinkiniui','Poros rinkinio instrukcija'],['instrukcijos/seimos-rinkiniui','Šeimos rinkinio instrukcija'],['ranku-liejimo-rinkiniai','Palyginti rinkinius'],...sharedLinks]};
function recipe(kind){
 const family=kind==='family',name=family?'Šeimos':'Poros',slug=family?'seimos-rinkiniui':'poros-rinkiniui',water=family?'3,2 l':'2 l',temp=family?'23 °C':'22–24 °C',limit=family?'24 °C':'25 °C',plaster=family?'1 400 ml':'700 ml';
 const steps=[
 ['Uždenkite darbo vietą','Stalą uždenkite staltiese arba plėvele. Rekomenduojama prijuostė. Pasiruoškite vietą, kur galėsite ramiai maišyti ir vėliau palikti užpildytą formą.'],
 ['Išbandykite rankų padėtį','Pasirinkite kompoziciją ir išbandykite ją tuščiame rinkinio kibire. Dalyviams turi būti patogu išlaikyti padėtį. Prieš maišymą galite pasipraktikuoti ir su šiam rinkiniui nurodytu vandens kiekiu.'],
 ['Pamatuokite vandenį alginatui',`Į rinkinio kibirą įpilkite ${water} vandens. Rekomenduojama temperatūra – ${temp}; patikrinkite termometru. Papildomas perspėjimas: nenaudokite šiltesnio nei ${limit} vandens. Ši viršutinė riba nėra rekomenduojama tikslinė temperatūra.`],
 ['Labai plonai patepkite rankas','Rankas labai plonai patepkite kosmetiniu ar kūdikių aliejumi; recepte leidžiamas ir augalinis aliejus. Nepadauginkite.'],
 ['Maišykite alginatą 60–70 sekundžių','Berdami alginatą aktyviai maišykite dideliu šaukštu ar virtuvine šluotele. Maišykite 60–70 sekundžių, kad neliktų sausų miltelių. Smulkūs gumuliukai savaime nėra priežastis nutraukti darbą. Visi dalyviai jau turi būti pasiruošę.'],
 ['Įmerkite rankas ir palikite tarpą','Pasirinktoje padėtyje rankas lėtai nuleiskite iki kibiro dugno. Laisva ranka kelis kartus pasukite kibirą, tada rankas vos pakelkite. Galutinėje padėtyje rankos neturi liesti dugno ar sienelių.'],
 ['Laikykite, kol forma sustings','Rankas laikykite nejudindami maždaug 3–4 minutes. Šaltesniame vandenyje tai gali trukti ilgiau. Prieš ištraukdami patikrinkite, ar masė jau sukietėjo; vien laikmačio nepakanka.'],
 ['Atsargiai ištraukite rankas','Rankas ištraukite lėtai, po vieną. Saugokite susidariusią alginato formą ir jos kraštus.'],
 ['Paruoškite vandenį gipsui',`Į atskirą indą suberkite šiam rinkiniui skirtą gipsą ir įpilkite ${plaster} kuo šaltesnio vandens. Tai gipso mišinio vanduo – jo nepainiokite su alginatui naudotu kiekiu.`],
 ['Išmaišykite gipsą','Užsimaukite vienkartines pirštines. Mišinį aktyviai ir kruopščiai išmaišykite bei išminkykite. Dirbkite pasiruošę, nes gipsas tirštėja greitai.'],
 ['Pripildykite pusę formos','Pirmiausia į rankų atspaudo ertmę supilkite maždaug pusę paruošto gipso mišinio.'],
 ['Pasukite formą 45° kampu','Kibirą pakreipkite maždaug 45° kampu ir pasukiokite, kad mišinys pasiektų smulkias ertmes. Lengvai patapšnokite kibiro sieneles.'],
 ['Supilkite likusį mišinį','Užpildykite likusią atspaudo ertmę, neišliedami mišinio už jos ribų. Dar kartą lengvai patapšnokite kibiro sieneles.'],
 ['Palaukite vieną valandą','Užpildytą formą palikite vienai valandai. Pagal receptą liejinio alginato formoje nelaikykite ilgiau nei 3 valandas. Tai išėmimo etapas, o ne galutinis išdžiūvimas.'],
 ['Išimkite formą iš kibiro','Kibirą apverskite ir atsargiai nuimkite nuo formos. Liejinį paremkite, saugodami smulkias jo dalis.'],
 ['Nuimkite alginato formą','Alginatą švelniai lupkite nuo gipso liejinio. Jei reikia, padėkite mediniu peiliuku. Dirbkite mažais gabalėliais ir netraukite už gipso pirštų.'],
 ['Nuvalykite smulkias detales','Mediniais įrankiais pašalinkite likusius alginato gabalėlius ir nepageidaujamus gipso iškilimus, susidariusius dėl oro burbuliukų. Nago formos detalę galima atsargiai padildyti tik jau išimtame gipso liejinyje.'],
 ['Išdžiovinkite ir tik tada dažykite','Liejinį palikite džiūti 5–7 paras, kol jis taps baltas. Tik tada dažykite vandens pagrindo dažais: minkštu teptuku tepkite 2–3 labai plonus sluoksnius. Balti dažai į poros ir šeimos rinkinius jau įtraukti.'],
 ];
 return {slug:`instrukcijos/${slug}`,type:'faq',title:`${name} rinkinio rankų liejimo instrukcija`,description:`${name} rinkinio eiga nuo pasiruošimo iki dažymo: ${water} vandens alginatui, ${plaster} gipsui, tikslūs veiksmai ir originalus PDF.`,productSlug:family?'seimos-rinkinys':'rinkinys-porai',body:[
 p(`Šis receptas skirtas Memocasting ${family?'šeimos':'poros'} rinkiniui. Prieš pradėdami perskaitykite visus žingsnius ir pasiruoškite reikmenis. Jei jūsų rinkinio lapas ar medžiagos skiriasi, prieš maišydami pasitikslinkite.`),
 h('Trumpa atmintinė'),list(`Alginatui: ${water} vandens, rekomenduojama ${temp}.`,`Gipsui: ${plaster} kuo šaltesnio vandens.`,`Alginatą maišykite 60–70 s; rankas laikykite apie 3–4 min, kol masė sukietės.`,`Gipsui formoje: 1 val.; nelaikykite ilgiau nei 3 val.`,`Džiovinimas po išėmimo: 5–7 paros. Dažymas: 2–3 labai ploni sluoksniai.`),
 h('Ko reikės?'),list('Savo rinkinio alginato, gipso, kibiro, medinių įrankių ir dažų.','Vandens matavimo indo ir termometro.','Didelio šaukšto ar virtuvinės šluotelės, atskiro indo gipsui, vienkartinių pirštinių.','Nedidelio kiekio aliejaus, stalo uždangalo, laikmačio ir minkšto teptuko.'),
 h('Prieš pradedant'),p('Patikrinkite, kad instrukcija atitiktų jūsų rinkinį. Visi dalyviai turi pasiruošti iš anksto – pradėjus maišyti laiko ieškoti reikmenų nebus. Rankų padėtis turi būti patogi; laikyti per jėgą nereikia. Jei dalyvauja vaikas, veiklą prižiūri suaugęs žmogus.'),
 ...steps.flatMap(([title,text],i)=>[h(`${i+1}. ${title}`),p(text)]),
 h('Džiovinimas ir dažymas'),p('Vieną valandą formoje stingęs gipsas dar nėra paruoštas dažymui. Išimtą liejinį džiovinkite 5–7 paras ir dažykite jam tapus baltam. Išėmimas ir džiovinimas paaiškina šių etapų skirtumą, o Dažymas ir priežiūra padeda suplanuoti apdailą. Kitų dažų gamintojo nurodymus tikrinkite atskirai; šis receptas nesuteikia liejiniui atsparumo vandeniui.'),
 h('Padėtis ir oro burbuliukai'),list('Stipriai neužrieskite pirštų galiukų į viršų: taip susidariusios oro kišenės gali likti neužpildytos gipsu.','Pirštų galiukus ir ilgus nagus galima švelniai priglausti prie kitos rankos, tačiau rankų stipriai nesuspauskite.','Nepamirškite dalinio užpildymo, pakreipimo ir lengvo patapšnojimo etapų.'),
 h('Kur dėti likusį gipsą?'),p('Gipso likučių nepilkite į kriauklę ar unitazą. Leiskite jiems sukietėti inde ir pašalinkite iš indo. Prieš plaudami įrankius pašalinkite ant jų likusį gipsą.'),
 h('Jei kyla klausimų'),p('Sustokite prieš neaiškų veiksmą. Pagalba dėl liejinio pateikia klausimo ir nuotraukų paruošimo sąrašą. Parašykite rinkinio pavadinimą, naudotus kiekius, vandens temperatūrą ir etapą, kuriame kilo klausimas. Neperkelkite kito rinkinio proporcijų.')
 ],links:[['pages/instrukcija','Visos instrukcijos'],[family?'seimos-rinkinys':'rinkinys-porai',`${name} rinkinys`],...sharedLinks],externalLinks:[{url:`https://memocasting.lt/dokumentai/${family?'seimos':'poros'}-rinkinio-instrukcija.pdf`,label:'Atsisiųsti originalų PDF',reason:'Memocasting pateiktas originalus šio rinkinio receptas. Kiekiai, temperatūra ir veiksmai sutikrinti su visu dokumentu 2026-10-25.',verified:true}]};
}
export const instructionPages=[instructionHub,recipe('couple'),recipe('family')];
