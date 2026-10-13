// Original planning data. Not imported by the production platform.
const slug=s=>s.toLocaleLowerCase('lt').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const categories=[];
function category(id,label,scope,groups,review=false){
 categories.push({id,label,scope,publication:'proposal',reviewRequired:review,groups:groups.map(([gid,title,items])=>({id:gid,label:title,treatments:items.split(';').map(v=>{const [label,...aliases]=v.trim().split('|');return {id:gid+'-'+slug(label),label,aliases,reviewRequired:review,priceMinor:null,durationMin:null,bookingMode:'provider-configured'};})}))});
}
category('plaukai','Plaukai','core',[
 ['kirpimai','Kirpimas','Moterų kirpimas; Vyrų kirpimas|vyriskas kirpimas; Vaikų kirpimas; Kirpčiukų kirpimas; Galiukų kirpimas'],
 ['plauku-dazymas','Dažymas','Visų plaukų dažymas; Šaknų dažymas; Sruogelių dažymas; Balayage|balajazas; Ombre; Tonavimas; Šviesinimas; Spalvos korekcija'],
 ['sukavimas','Šukavimas ir šukuosenos','Plaukų plovimas ir džiovinimas; Sušukavimas; Garbanų formavimas; Vakarinė šukuosena; Vestuvinė šukuosena; Kasų pynimas'],
 ['plauku-proceduros','Plaukų ir galvos odos priežiūra','Drėkinamoji plaukų procedūra; Atkuriamoji plaukų procedūra; Galvos odos priežiūra; Galvos odos šveitimas; Plaukų priežiūros konsultacija'],
 ['plauku-forma','Tiesinimas ir garbanojimas','Plaukų tiesinimas; Keratininė plaukų procedūra; Ilgalaikis garbanojimas'],
 ['plauku-priauginimas','Priauginimas','Plaukų priauginimas; Priauginimo korekcija; Priaugintų plaukų nuėmimas'],
 ['barzda','Barzda ir skutimas','Barzdos kirpimas; Barzdos modeliavimas; Skutimas; Barzdos dažymas']
]);
category('nagai','Nagai','core',[
 ['manikiuras','Manikiūras','Klasikinis manikiūras; Aparatinis manikiūras; Kombinuotas manikiūras; Manikiūras be lakavimo; Vyriškas manikiūras'],
 ['lakavimas','Lakavimas','Paprastas nagų lakavimas; Gelinis lakavimas|ilgalaikis lakavimas; Prancūziškas lakavimas; Nagų lakavimo nuėmimas'],
 ['nagu-modeliavimas','Priauginimas ir korekcija','Nagų priauginimas geliu; Nagų priauginimas akrilu; Nagų priauginimas poligeliu; Priaugintų nagų papildymas; Priaugintų nagų nuėmimas; Nago taisymas; Nagų stiprinimas'],
 ['nagu-dizainas','Dizainas','Nagų dailė|nagu dizainas; Piešimas ant nagų; Nagų dekoravimas'],
 ['pedikiuras','Pedikiūras','Klasikinis pedikiūras; Aparatinis pedikiūras; Kombinuotas pedikiūras; Pedikiūras be lakavimo; Pedikiūras su geliniu lakavimu; Vyriškas pedikiūras'],
 ['rankos-pedos','Rankų ir pėdų priežiūra','Rankų SPA; Pėdų SPA; Parafino procedūra rankoms; Parafino procedūra pėdoms']
]);
category('antakiai','Antakiai','core',[
 ['antakiu-korekcija','Korekcija','Antakių korekcija pincetu; Antakių korekcija vašku; Antakių korekcija siūlu|threading; Antakių formos konsultacija'],
 ['antakiu-dazymas','Dažymas','Antakių dažymas dažais; Antakių dažymas chna|henna'],
 ['antakiu-laminavimas','Laminavimas','Antakių laminavimas; Antakių laminavimas su korekcija ir dažymu']
]);
category('blakstienos','Blakstienos','core',[
 ['blakstienu-priauginimas','Priauginimas','Klasikinis blakstienų priauginimas; Hibridinis blakstienų priauginimas; Volume blakstienų priauginimas'],
 ['blakstienu-korekcija','Korekcija ir nuėmimas','Blakstienų papildymas; Priaugintų blakstienų nuėmimas'],
 ['blakstienu-prieziura','Laminavimas ir dažymas','Blakstienų laminavimas|lash lift; Blakstienų dažymas; Blakstienų laminavimas ir dažymas']
]);
category('makiazas','Makiažas','core',[
 ['makiazo-tipai','Makiažo paslaugos','Dieninis makiažas; Vakarinis makiažas; Proginis makiažas; Nuotakos makiažas; Bandomasis nuotakos makiažas; Makiažas fotosesijai; Kūrybinis makiažas'],
 ['makiazo-mokymai','Individualūs mokymai','Asmeninė makiažo pamoka; Makiažo priemonių konsultacija']
]);
category('depiliacija','Depiliacija ir plaukų šalinimas','core',[
 ['depiliacija-vasku','Vašku','Kojų depiliacija vašku; Rankų depiliacija vašku; Pažastų depiliacija vašku; Bikini depiliacija vašku; Braziliška depiliacija vašku; Veido depiliacija vašku; Nugaros depiliacija vašku; Krūtinės depiliacija vašku'],
 ['depiliacija-cukrumi','Cukrumi','Kojų depiliacija cukrumi; Rankų depiliacija cukrumi; Pažastų depiliacija cukrumi; Bikini depiliacija cukrumi; Braziliška depiliacija cukrumi; Veido depiliacija cukrumi'],
 ['plauku-salinimas-aparatu','Aparatu','Plaukų šalinimas lazeriu; Fotoepiliacija|IPL; Elektroepiliacija'],
 ['depiliacija-kita','Kiti būdai','Veido plaukelių šalinimas siūlu; Plaukų šalinimo konsultacija']
]);
category('veidas','Veido priežiūra','core',[
 ['veido-valymas','Valymas','Mechaninis veido valymas; Ultragarsinis veido valymas; Kombinuotas veido valymas; Veido valymas be mechaninio poveikio'],
 ['veido-kaukes','Drėkinimas ir priežiūra','Drėkinamoji veido procedūra; Maitinamoji veido procedūra; Raminamoji veido procedūra; Veido kaukė; Akių srities priežiūra'],
 ['veido-sveitimas','Šveitimas','Paviršinis veido šveitimas; Rūgštinis veido šveitimas; Fermentinis veido šveitimas'],
 ['veido-aparatai','Aparatinė priežiūra','LED veido procedūra; Mikrosrovių veido procedūra; Radijo dažnio veido procedūra; Aparatinė veido procedūra'],
 ['veido-konsultacija','Konsultacijos','Odos priežiūros konsultacija; Veido procedūros parinkimo konsultacija']
]);
category('kunas','Kūno priežiūra','core',[
 ['kuno-sveitimas','Šveitimas ir priežiūra','Kūno šveitimas; Kūno drėkinimo procedūra; Nugaros odos priežiūra'],
 ['kuno-ivyniojimai','Įvyniojimai','Kūno įvyniojimas; Purvo įvyniojimas; Dumblių įvyniojimas'],
 ['kuno-aparatai','Aparatinės procedūros','Presoterapija; Vakuuminė kūno procedūra; Radijo dažnio kūno procedūra; Aparatinė kūno procedūros konsultacija'],
 ['idegis','Įdegis','Purškiamas įdegis; Soliariumas']
]);
category('masazas','Masažas','core',[
 ['kuno-masazai','Kūno masažai','Atpalaiduojantis masažas; Klasikinis masažas; Giliųjų audinių masažas; Sportinis masažas; Aromaterapinis masažas; Masažas karštais akmenimis; Tailandietiškas masažas; Švediškas masažas'],
 ['srities-masazai','Atskirų sričių masažai','Nugaros masažas; Kaklo ir pečių masažas; Galvos masažas; Pėdų masažas; Rankų masažas'],
 ['veido-masazai','Veido masažai','Kobido veido masažas; Klasikinis veido masažas; Bukalinis veido masažas; Veido limfodrenažinis masažas'],
 ['specialus-masazai','Specialūs masažai','Limfodrenažinis kūno masažas; Masažas nėščiosioms; Masažas poroms']
]);
category('spa','SPA ir poilsis','core',[
 ['spa-ritualai','Ritualai','SPA ritualas; SPA ritualas poroms; Kūno ir veido SPA ritualas'],
 ['pirtys','Pirtys ir vanduo','Pirtis; Hamamas; Garinė pirtis; Privatus SPA apsilankymas'],
 ['poilsio-proceduros','Poilsio procedūros','Galvos SPA|head spa; Aromaterapijos seansas']
]);
category('ilgalaikis-makiazas','Ilgalaikis makiažas','core',[
 ['pigmentavimas','Pigmentavimas','Ilgalaikis antakių makiažas; Ilgalaikis lūpų makiažas; Ilgalaikis akių makiažas; Galvos odos mikropigmentacija'],
 ['pigmento-korekcija','Korekcija ir konsultacijos','Ilgalaikio makiažo korekcija; Ilgalaikio makiažo konsultacija; Pigmento šalinimo konsultacija']
],true);
category('tatuiruotes','Tatuiruotės','core',[
 ['tatuiravimas','Tatuiravimas','Nauja tatuiruotė; Tatuiruotės atnaujinimas; Tatuiruotės uždengimas|cover up'],
 ['tatuiruociu-konsultacijos','Konsultacijos','Tatuiruotės eskizo konsultacija; Tatuiruotės šalinimo konsultacija']
],true);
category('verimas','Auskarų vėrimas','core',[
 ['papuosalu-verimas','Vėrimas','Ausų spenelių vėrimas; Ausies kremzlės vėrimas; Nosies auskaro vėrimas; Antakio auskaro vėrimas; Lūpos auskaro vėrimas; Bambos auskaro vėrimas'],
 ['verimo-prieziura','Priežiūra ir konsultacijos','Papuošalo pakeitimas; Auskaro vėrimo konsultacija']
],true);
category('estetika','Estetinės procedūros','core',[
 ['estetikos-konsultacijos','Konsultacijos','Estetinių procedūrų konsultacija; Odos būklės profesionalus įvertinimas'],
 ['estetikos-proceduros','Procedūros po atskiros kvalifikacijos patikros','Mikroadatinė procedūra; Mezoterapija; Biorevitalizacija; Injekcinių procedūrų konsultacija; Estetinio lazerio konsultacija; Randų priežiūros konsultacija']
],true);
// Complete extension proposal, activation separated from the beauty rollout.
category('fizinis-aktyvumas','Sportas ir judėjimas','extension',[
 ['sportas','Treniruotės','Asmeninė treniruotė; Grupinė treniruotė; Pilatesas; Joga; Judesio konsultacija'],
 ['sporto-programos','Programos','Individualios treniruočių programos konsultacija; Mobilumo užsiėmimas']
]);
category('kineziterapija','Kineziterapija','extension',[
 ['kineziterapeuto-paslaugos','Specialisto paslaugos','Kineziterapeuto konsultacija; Individuali kineziterapija; Kineziterapijos grupinis užsiėmimas; Gydomojo masažo konsultacija']
],true);
category('psichologine-pagalba','Psichologinė pagalba','extension',[
 ['psichologo-paslaugos','Konsultacijos','Psichologo konsultacija; Psichoterapijos konsultacija; Porų konsultacija; Šeimos konsultacija']
],true);
category('savijauta','Savijautos užsiėmimai','extension',[
 ['savijautos-uzsiemimai','Užsiėmimai','Meditacijos užsiėmimas; Kvėpavimo užsiėmimas; Garso atsipalaidavimo seansas; Savijautos užsiėmimo konsultacija']
]);
category('odontologija','Odontologija','extension',[
 ['dantu-prieziura','Burnos priežiūra','Profesionali burnos higiena; Dantų balinimo konsultacija'],
 ['odontologo-konsultacijos','Konsultacijos','Odontologo konsultacija; Ortodonto konsultacija']
],true);
category('medicina','Medicinos specialistai','extension',[
 ['medicinos-konsultacijos','Konsultacijos','Dermatologo konsultacija; Medicinos estetikos konsultacija; Kito medicinos specialisto konsultacija']
],true);
category('gyvunai','Gyvūnų priežiūra','extension',[
 ['gyvunu-grozis','Gyvūnų grožis','Šunų kirpimas; Kačių kailio priežiūra; Gyvūnų maudymas; Gyvūnų nagų priežiūra'],
 ['gyvunu-konsultacijos','Priežiūros konsultacijos','Gyvūno kailio priežiūros konsultacija']
]);
const legacyMappings=[
 ['manikiuras','manikiuras','group'],['gelinis-lakavimas','lakavimas-gelinis-lakavimas','treatment'],['nagu-dizainas','nagu-dizainas','group'],['pedikiuras','pedikiuras','group'],['kirpimas','kirpimai','group'],['plauku-dazymas','plauku-dazymas','group'],['antakiai','antakiai','category'],['blakstienos','blakstienos','category'],['masazas','masazas','category'],['veido-prieziura','veidas','category']
].map(([legacyId,targetId,targetType])=>({legacyId,targetId,targetType,providerOfferMigration:'manual-confirmation',preserveServiceId:true,preserveBookingSnapshot:true}));
export const taxonomy={schemaVersion:1,status:'proposal-not-runtime',checkedAt:'2026-10-06',sourceCommit:'c6516b7dacc52b35cd238aec5ce2dff7eca27359',categories,legacyMappings,facets:{audience:['Moterims','Vyrams','Vaikams','Visiems'],venueType:['Savarankiškas meistras','Salonas','Studija','SPA'],bookingMode:['instant','request','consultation'],locationMode:['venue','mobile','online']},rules:['Providers supply actual duration and price. Null is not free or bookable.','Review flags are proposed controls, not a legal classification. Every procedure requires eligibility assessment.','Extensions default off. No service or provider offering is asserted by this catalogue.','Other requests enter a moderation queue, not an unclassified public offer.']};

// A backlog entry is a delivery unit with observable acceptance, not a promise that it exists.
const rows=[];
function task(id,phase,priority,title,state,depends,acceptance,files){rows.push({id,phase,priority,title,currentState:state,dependsOn:depends.split(' ').filter(Boolean),acceptance:acceptance.split(' | '),files:files.split(' '),ownerRole:id.startsWith('G')?'Produkto ir operacijų atsakingasis':'Įgyvendinimo atsakingasis',status:'planned'});}
task('G01','0','P0','Aktuali platformos apimtis ir inventorius','Extend','','Kiekvienam moduliui atskirti gyvą veikimą, šaltinio įrodymą ir nepatikrintą būseną | Visos naujos užduotys turi ekraną, rolę, duomenų šaltinį ir priėmimo kriterijų','sites/madbeauty/IMPLEMENTATION_STATUS.md sites/madbeauty/uiux');
task('D01','1','P0','Hierarchinė taksonomija ir versijavimas','Missing','G01','Visi šio pasiūlymo ID unikalūs, paieška išplečia tėvą į palikuonis | Archyvavimas nepanaikina užsakytos paslaugos ir senų URL | Vieša taksonomijos projekcija ir serverinis validatorius naudoja tą pačią versiją','sites/madbeauty/prototype/demo-model.mjs sites/madbeauty/backend/platform.mjs');
task('D02','1','P0','Senų kategorijų ir paslaugų migracija','Missing','D01','Visi 10 senų URL išsaugoti arba prasmingai peradresuoti | Meistras patvirtina neaiškios paslaugos priskyrimą; nepasirinkta lytis neatspėjama | Prieš ir po migracijos sutampa paslaugų, vizitų ir kainų snapshot ID','sites/madbeauty/backend sites/madbeauty/cloudflare');
task('D03','1','P0','Meistro kelių paslaugų pasirinkimas','Partial','D01','Ieškodamas kirpimo ir lakavimo meistras gali pažymėti kelias procedūras iš skirtingų kategorijų | Pasirinkimai išlieka grįžus į žingsnį ir po reload | Nepildžius kainos, trukmės ar kompetencijos paslauga lieka privačiame juodraštyje','sites/madbeauty/prototype/public/workspace-ui.mjs');
task('D04','1','P0','Pasiūlymai, variantai ir keli meistrai','Partial','D03 D02','Viena procedūra turi atskirus variantus su kainomis ir trukmėmis | Du tinkami meistrai nedubliuoja viešo pasiūlymo; bet jų skirtingos kainos matomos | Kainos ar trukmės pakeitimas nekeičia esamo vizito snapshot','sites/madbeauty/backend/platform.mjs sites/madbeauty/prototype/public/service-editor.mjs');
task('D05','2','P1','Salono grupės ir paslaugų meniu tvarka','Missing','D04','Salonas sukuria savo meniu grupę ir surikiuoja pasiūlymus | Perkėlus į savo grupę nacionalinės taksonomijos ID nesikeičia | Mobiliajame profilyje grupių navigacija pasiekiama klaviatūra','sites/madbeauty/prototype/public/public-views.mjs sites/madbeauty/backend/platform.mjs');
task('D06','2','P1','Priedų grupės ir pasirinkimo taisyklės','Partial','D04','Priedų grupė turi min/max ir privalomumo taisykles | Keičiasi bendra kaina ir laisvi laikai | Serveryje atmesti kitai paslaugai priklausančius priedus ir netinkamą kiekį','sites/madbeauty/backend/availability.mjs sites/madbeauty/prototype/public/booking-ui.mjs');
task('D07','3','P1','CSV importas ir masinis redagavimas','Missing','D04 D05','Importo peržiūra parodo dublikatus ir neaiškius atitikmenis prieš įrašymą | Masinis kainų keitimas turi peržiūrą ir konfliktų apsaugą | Nepatikimas CSV turinys nevykdomas ir nepatenka į kitą tenant','sites/madbeauty/backend sites/madbeauty/prototype/public/workspace-ui.mjs');
task('S01','1','P0','Paieškos meniu su kategorijomis ir sinonimais','Partial','D01','Visos aktyvios kategorijos, subkategorijos ir procedūros pasiekiamos | Balayage, balajazas, antakiu ir antakių užklausos randa tinkamą ID | Escape uždaro, fokusas grįžta, rodyklės ir Enter veikia; paieška išlaiko URL būseną','sites/madbeauty/prototype/public/ui.mjs sites/madbeauty/prototype/public/public-views.mjs');
task('S02','1','P0','Miestų ir vietos paieška','Partial','S01','Visi 103 miestai randami pagal vardą ir be diakritinių ženklų | Pridėta rajono ar gyvenvietės įvestis nėra laikoma miestu | Geolokacija tik vartotojui pasirinkus; atsisakius galima įvesti vietą | 103 nuorodos nepaverčia kategorijos puslapio neišskaitomu','sites/madbeauty/prototype/cities.mjs sites/madbeauty/prototype/public/ui.mjs');
task('S03','1','P0','Rezultatai pagal tikrą laisvą viso vizito laiką','Partial','D04 S01','Pasirinkus rytoj 17–20 rodoma tik pasiūla su visu tinkamu intervalu | Rikiavimas pagal artimiausią laiką naudoja laiką, ne pavadinimą | Neišrinkta trukmė ar variantas nepaverčiamas patvirtintu laisvu laiku | Kalendoriaus pakeitimas patvirtinimo metu duoda aiškų 409 ir alternatyvas','sites/madbeauty/backend/availability.mjs sites/madbeauty/backend/platform.mjs sites/madbeauty/prototype/public/public-views.mjs');
task('S04','2','P1','Salonų ir meistrų atskiri paieškos rezultatai','Partial','S03','Procedūrų, salonų ir meistrų rezultatai turi atskirus tipus | Rezultatas nesidubliuoja pagal kiekvieną jo variantą | Rodomi realūs atsiliepimai, kainos paaiškinimas ir artimiausias laikas','sites/madbeauty/prototype/public/public-views.mjs sites/madbeauty/backend/platform.mjs');
task('S05','3','P1','Žemėlapis, atstumai ir adresai','Missing','S02 S04','Žemėlapis naudoja tik patvirtintas koordinates | Sutampa sąrašo ir žemėlapio filtrai | Žemėlapio nesant pilnai veikia sąrašas; klaidingas adresas taisomas | Providerio, geokodavimo, privatumo ir kainos sprendimas užrašytas prieš integraciją','sites/madbeauty/prototype/public/public-views.mjs sites/madbeauty/backend/platform.mjs');
task('P01','2','P1','Išsamus profilis ir tikrų darbų galerija','Extend','D05 S04','Paslaugos, komanda, tikri darbai, adresas, darbo laikas ir taisyklės aiškiai matomi | Nuotrauka priskiriama paslaugai ir turi viešinimo teisių patvirtinimą | Netinkamas ar pašalintas profilis nei kataloge, nei sitemap neatsiranda','sites/madbeauty/prototype/public/public-views.mjs sites/madbeauty/backend/media.mjs');
task('B01','2','P1','Kelių paslaugų vienas vizitas','Missing','D04 D06 S03','Manikiūras ir pedikiūras toje pačioje organizacijoje rezervuojami viena seka | Konfliktas antrame segmente nepalieka pusės užsakymo | Kainos ir trukmės santrauka sutampa su serverio snapshot | Perkėlimas ar atšaukimas apima visą sutartą seką','sites/madbeauty/backend/platform.mjs sites/madbeauty/backend/availability.mjs');
task('B02','3','P1','Procedūros fazės ir resursų rezervavimas','Missing','B01 I02','Dažų veikimo metu meistro laisvumas modeliuojamas atskirai nuo kėdės užimtumo | Nė vienas segmentas neleidžia kito resurso konflikto | Paralelinis užsakymas ir pakeitimas įrodo vieną atominišką sprendimą','sites/madbeauty/backend/availability.mjs sites/madbeauty/backend/platform.mjs');
task('B03','2','P1','Paslaugų prieinamumo taisyklės','Partial','D04 S03','Atskiri išankstinės registracijos, minimalaus įspėjimo ir dienų taisyklių nustatymai | Paslauga uždaromis organizacijos dienomis nerezervuojama | Konsultacija ir užklausa aiškiai atskirtos nuo momentinės registracijos','sites/madbeauty/backend/availability.mjs sites/madbeauty/prototype/public/workspace-ui.mjs');
task('B04','3','P1','Priminimai prieš vizitą','Unverified','B03 I01','Su valdomu laikrodžiu priminimas išsiunčiamas sutartu metu vieną kartą | Atšauktas vizitas negauna priminimo; perkeltas gauna naujo laiko priminimą | Tikro transporto pristatymas ir pagrindinio INBOX gavimas patikrinti atskirai','sites/madbeauty/cloudflare/platform-object.mjs sites/madbeauty/backend/platform.mjs infrastructure/mail-relay');
task('B05','3','P1','Automatinis laukiančiųjų pasiūlymas','Partial','S03 B04','Atšaukus vizitą atitikmuo tikrinamas pagal procedūrą, variantą, meistrą ir intervalą | Pasiūlymas riboto galiojimo; nėra automatinio užsakymo be kliento pasirinkimo | Du klientai negali patvirtinti to paties laiko','sites/madbeauty/backend/platform.mjs sites/madbeauty/cloudflare/platform-object.mjs');
task('C01','3','P1','Kliento paskyra ir pakartotinis vizitas','Extend','B01 P01','Pakartoti vizitą siūlo dabartinį variantą ir kainą su aiškiu pokyčio pranešimu | Išsaugotos vietos, žinutės ir užklausos atnaujinamos tame pačiame modelyje | Ištrinta paslauga turi alternatyvą ir nepanaikina vizito istorijos','sites/madbeauty/prototype/public/workspace-ui.mjs');
task('C02','3','P1','Klientų kortelės ir duomenų teisės','Partial','G02 I01','Organizacijos pastabos privatos ir nepasiekiamos kitai organizacijai | Eksportas ir trynimas turi tapatybės patikrą bei retention taisykles | Rinkodaros pasirinkimas atskirtas nuo rezervacijos ir paslaugos sutikimo','sites/madbeauty/backend/platform.mjs sites/madbeauty/prototype/public/workspace-ui.mjs');
task('C03','4','P2','Anketos ir sutikimų versijos','Missing','C02 G02','Formos turinys ir kliento sutikimas susieti su konkrečia versija | Renkama tik procedūrai būtina informacija; jautrūs laukai neteikiami viešai | Nustatytos prieigos, saugojimo trukmė ir ištrynimo tvarka prieš rinkimą','sites/madbeauty/backend sites/madbeauty/prototype/public/booking-ui.mjs');
task('W01','3','P1','Darbuotojų prieigos ir kompetencijos','Partial','D04 G02','Savininkas, administratorius, registratorius ir meistras turi skirtingas serverines teises | Meistras mato tik leidžiamą grafiką ir klientus | Atšauktas kvietimas ar narystė nebeleidžia veiksmų net žinant ID','sites/madbeauty/backend/auth.mjs sites/madbeauty/backend/platform.mjs');
task('W02','3','P1','Keli adresai ir komandos grafikas','Partial','W01 I02','Vienas meistras dviejuose adresuose negali būti rezervuotas tuo pačiu metu | Kainos, resursai ir darbo laikas priklauso teisingam adresui | Kelionės laiko blokas gali sustabdyti tarp vietų netinkamą seką','sites/madbeauty/backend/availability.mjs sites/madbeauty/backend/platform.mjs');
task('W03','3','P1','Veiklos rodikliai ir CSV','Partial','G03 I01','Vizitų vertė vadinama paslaugų verte, kol nėra mokėjimo įrodymo | Rodomi užimtumas, užklausų konversija, atšaukimai ir grįžtantys klientai su apibrėžtais vardikliais | CSV izoliuotas pagal organizaciją ir apsaugotas nuo formulių vykdymo','sites/madbeauty/prototype/public/workspace-ui.mjs sites/madbeauty/backend/platform.mjs');
task('W04','4','P2','Kalendorių ir išorinių sistemų integracijos','Missing','W02 I01','Importuoti įvykiai turi šaltinio ID ir kartotinio importo apsaugą | Vienpusio ir dvipusio sinchronizavimo ribos matomos | Išorinės klaidos neatlaisvina užimto laiko ir nesukuria dublikatų','sites/madbeauty/backend sites/madbeauty/prototype/public/workspace-ui.mjs');
task('O01','1','P0','Taksonomijos administravimas ir naujų paslaugų prašymai','Missing','D01','Operatorius peržiūri naujo tipo prašymą ir sujungia sinonimus | Negali ištrinti kategorijos palikdamas paslaugas be nuorodos | Kiekvienas keitimas turi versiją, veikėją ir audito įrašą','sites/madbeauty/backend/platform.mjs sites/madbeauty/prototype/public/workspace-ui.mjs');
task('O02','2','P0','Teikėjo tinkamumas ir dokumentų patikra','Partial','G02 D04 O01','Profilio approval atskirtas nuo paslaugos kvalifikacijos patikros | Patikros žyma turi aiškų objektą, datą ir galiojimo taisyklę | Privačių dokumentų ir klientų sveikatos duomenų nėra viešame API','sites/madbeauty/backend/platform.mjs sites/madbeauty/prototype/public/workspace-ui.mjs');
task('O03','3','P1','Skundai ir atsiliepimų priežiūra','Extend','P01 O02','Atsiliepimas išlieka susietas su atliktu vizitu | Skundas turi terminą, būseną ir veiksmų žurnalą | Suklastotas ar kito kliento atsiliepimas atmetamas serveryje','sites/madbeauty/backend/platform.mjs sites/madbeauty/prototype/public/workspace-ui.mjs');
task('I01','1','P0','Saugojimo migracijos projektas ir operacijų rodikliai','Partial','G01','Pamatuotas state JSON dydis, augimas, katalogo latencija ir DB apimtis | Aprašytos normalizuotos lentelės, indeksai, idempotency ir atkūrimas | Su tikru Workers adapteriu įrodytas perskaitymas ir atkūrimas iš izoliuotos kopijos','sites/madbeauty/cloudflare/store.mjs sites/madbeauty/cloudflare/OPERATIONS.md');
task('I02','2','P0','Katalogo projekcija ir organizacijų izoliacija','Missing','I01 D04','Viešas katalogas skaito patvirtintas revizijas ir indeksus | Perėjimas nuo globalios JSON būsenos nesukuria dviejų rašančių koordinatorių | Dalies migracijos rollback negrąžina seno meistro kalendoriaus virš naujų vizitų | Per-organizaciją koordinuojami užsakymai nesilpnina kliento teisių izoliacijos','sites/madbeauty/cloudflare/store.mjs sites/madbeauty/cloudflare/platform-object.mjs sites/madbeauty/cloudflare/worker.mjs');
task('I03','3','P1','Medijos saugojimas ir apkrova','Partial','I02 P01','Pasirinktas saugojimo adapteris tik po apimties ir kainos patikros | Išlaikyti bendri responsive vaizdų variantai, teisės ir EXIF tvarkymas | Gedimas ar ištrynimas nepalieka privataus originalo viešai | Apkrova išmatuota pagal aiškų užsakymų ir medijos scenarijų','sites/madbeauty/cloudflare/media-bucket.mjs sites/madbeauty/backend/media.mjs');
task('I04','1','P0','Visų svarbių kelių patikros matrica','Extend','G01','Matuotas tikras 320/390/820/1440 px plotis, o ne vien viewport komanda | Nauji ekranai turi keyboard, empty, error, loading, stale ir conflict įrodymus pagal taikomumą | Backend, platform, foundation, Workers ir search-options rinkinių sąrašas išlaikytas; istorinis PASS neperrašomas','sites/madbeauty/acceptance sites/madbeauty/uiux');
task('E01','2','P1','Kategorijų ir miestų SEO bei gidų sąsaja','Partial','D02 S04 P01','Viešų URL sąrašas remiasi naudingu turiniu ir tikra eligible pasiūla | Asmeninės paskyros, datos ir ploni sinonimų filtrai neindeksuojami | Gidų CTA naudoja esamus taksonomijos ID; kalendoriaus savininkas peržiūri atitikmenis | SSR, canonical, sitemap ir LLM naudoja bendrą core','sites/madbeauty/cloudflare/worker.mjs sites/madbeauty/content');
task('G02','0','P0','Paslaugų teisės, duomenų ir taisyklių matrica','Partial','G01','Grožio, invazinių ir sveikatos paslaugų reikalavimai vertinami pagal konkretų tipą ir vietą | Reguliuojamai paslaugai nepakanka savideklaracijos | Prieš anketas ar mokėjimus nustatytos atsakomybės, duomenų, atšaukimo ir skundų taisyklės','sites/madbeauty/upgrade-plan-20261006 sites/madbeauty/backend');
task('G03','0','P1','Realus meistrų pilotas ir produkto rodikliai','Unverified','G01','Pilotui kviesti tik savininkui autorizavus kontaktavimą | Su tikrais teikėjais išmatuoti paslaugų suvedimą, paiešką ir sėkmingą registraciją | Užfiksuotos pradinės reikšmės; nėra išgalvotų konversijų ar paklausos','sites/madbeauty/upgrade-plan-20261006');
task('X01','4','P2','Sveikatos, sporto ir gyvūnų plėtiniai','Missing','G02 I02 W01 C03','Visi pasiūlyti plėtiniai turi kategorijas, paslaugų ir kvalifikacijų taisykles | Įjungimas valdomas pagal sritį; grožio paieška nepripildoma netinkamų tipų | Medicinai, gyvūnams ir grupėms pritaikomi atskiri duomenys ir booking apribojimai','sites/madbeauty/upgrade-plan-20261006/TAXONOMY_PROPOSAL.json sites/madbeauty/backend');
task('X02','4','P2','Grupės, kursai ir paketai','Missing','B01 W02 X01','Grupės talpa patvariai rezervuojama ir neatveria kitų dalyvių duomenų | Kursas turi atskiras sesijas ir likučių apskaitą | Vienkartinis kelių paslaugų vizitas nenaudojamas kaip neaiškus abonementas','sites/madbeauty/backend');
task('X03','4','P2','Mokėjimai, avansai ir neatvykimas','Missing','G02 I02 W03','Prieš įjungimą užrašyti mokėtojas, gavėjas, kaštai ir grąžinimai | Patikrinti webhook, kartojimas, refund ir nesutampantis mokėjimas | Vizito būsena ir apmokėjimo būsena atskirtos | Dabartinis nemokamas pilotas nekeičiamas šio plano sukūrimu','sites/madbeauty/backend sites/madbeauty/prototype/public/booking-ui.mjs');
task('X04','4','P2','Dovanų kuponai, lojalumas ir rinkodara','Missing','X03 C02','Kupono vertė ir panaudojimas atominiški | Rinkodara siunčiama tik pagal atskirą tinkamą pasirinkimą | Nėra kainų, komisinių ar prenumeratos pažado be patvirtinto modelio','sites/madbeauty/backend');
task('X05','4','P2','Mobilioji patirtis ir pranešimai','Partial','I04 C01 B04','Visas klientų ir meistrų kelias veikia mobiliajame web prieš atskirą app | PWA cache nelaiko OTP, rezervacijų ar privačių klientų duomenų | Push jungiamas tik su aiškiu vartotojo pasirinkimu ir pristatymo patikra','sites/madbeauty/prototype/public');
export const backlog={schemaVersion:1,status:'plan-not-implementation',phases:[{id:'0',label:'Inventorius ir sutartys'},{id:'1',label:'Katalogas, meistras ir paieška'},{id:'2',label:'Pilnas rezervavimo ir profilio kelias'},{id:'3',label:'Salono veikla ir augimas'},{id:'4',label:'Papildomos verslo sritys'}],tasks:rows};
