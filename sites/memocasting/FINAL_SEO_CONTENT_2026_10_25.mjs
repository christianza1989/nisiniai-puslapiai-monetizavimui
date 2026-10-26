// Declarative editorial changes for issue261. Uses the maintained native Studio;
// this is not an alternative exporter, scheduler or approval implementation.
import assert from 'node:assert/strict';
export const P=text=>({type:'paragraph',text});
export const H=text=>({type:'heading',level:2,text});
export const L=(...items)=>({type:'list',items});
const sources={
 moka:['https://www.skonis-kvapas.lt/aksesuarai/kavos-ruosimui/kavinukas-moka-3-puod-juodas','MOKA 3 puodelių kavinukas','15,99 €; 180 ml, aliuminis, netinka indukcinei viryklei.'],
 books:['https://www.patogupirkti.lt/knyga/20-euru-dovanu-kuponas.html','20 € knygų kuponas','Elektroninis, po apmokėjimo; galioja šešis mėnesius; brangesnei prekei primokama, mažesnės vertės skirtumas negrąžinamas.'],
 angel:['https://angelutakais.lt/produktai/elektroninis-dovanu-kuponas-20e/','„Angelų Takais“ elektroninis 20 € kuponas','PDF el. paštu po apmokėjimo; vieta, seansas ir galimos priemokos tikrinami atskirai.'],
 delivery:['https://www.geradovana.lt/apie/informacija/pristatymas','„Gera dovana“ elektroninio čekio pristatymas','Skaitmeninis pristatymas skiriasi nuo apmokėjimo sąskaita, kurio įskaitymas gali trukti darbo dieną.'],
 payment:['https://www.patogupirkti.lt/apmokejimas','Knygų kupono apmokėjimo sąlygos','Kuponas nepadengia pristatymo; vienas kuponas krepšeliui, papildomi nuolaidų kodai netaikomi.'],
};
export const sourceEvidence=Object.entries(sources).map(([key,[url,label,facts]])=>({key,url,label,facts,checkedAt:'2026-10-25',method:'Primary seller pages read; no purchase, reservation or physical product test.'}));
const ext=key=>{const [url,label,facts]=sources[key];return{url,label,reason:'Patikrinta 2026-10-25 pardavėjo puslapyje: '+facts,verified:true};};
export function editorialChanges(pkg){
 const pages=new Map(pkg.pages.map(p=>[p.slug,p])),changes=new Map();
 const edit=slug=>{assert.ok(pages.has(slug),slug);if(!changes.has(slug))changes.set(slug,{body:structuredClone(pages.get(slug).body)});return changes.get(slug);};
 const insert=(slug,at,blocks)=>edit(slug).body.splice(at,0,...blocks);
 const links=(slug,keys)=>{const q=edit(slug),old=pages.get(slug).externalLinks||[];q.externalLinks=[...old.map(x=>({...x,verified:true}))];for(const key of keys){const x=ext(key),i=q.externalLinks.findIndex(y=>y.url===x.url);if(i<0)q.externalLinks.push(x);else q.externalLinks[i]=x;}};
 const replace=(slug,find,to)=>{const b=edit(slug).body;let n=0;for(const x of b)if(x.text?.includes(find)){x.text=x.text.replace(find,to);n++;}assert.equal(n,1,slug+': expected exact single phrase');};

 // Each addition answers a different job; existing useful prose/media remain.
 insert('gidai/kaledines-dovanos-teciui',5,[
 H('Šešios konkrečios kryptys: ką rinktis ir kada atsisakyti'),
 P('MOKA 3 puodelių kavinukas patikros metu kainavo 15,99 €. Jo 180 ml talpa skirta mažoms kavos porcijoms; šis aliumininis modelis netinka indukcinei viryklei. Tėčiui, kuris mėgsta kavos ruošimo ritualą ir turi tinkamą viryklę, tai konkretus kandidatas. Jei viryklės nežinote, modelio nepirkite iš akies.'),
 P('20 € knygų kuponas praverčia skaitančiam tėčiui, kurio norimo leidinio nežinote. „Angelų Takais“ elektroninis 20 € kuponas – kitas formatas: prieš renkantis reikia įvertinti, ar jam įdomi tokia patirtis, patogi vieta ir seanso laikas. Šių dviejų vienodos vertės kuponų negalima laikyti vienodai lengvai panaudojamais.'),
 L('Muzikos vakarui: jo jau turimas mėgstamas albumas ir jūsų paruoštas klausymo vakaras. Naujos laikmenos nepirkite nepatikrinę turimos įrangos.','Išvykai: jo pasirinktas pažįstamas maršrutas ir jūsų pasirūpinta kelionė. Tai asmeninis planas, ne nupirkta ekskursija.','Šeimos istorijai: dešimt jau turimų nuotraukų su jo pasakojimais. Pirma sutarkite, ar jis norės kalbėtis ir ar pasakojimus galima išsaugoti.'),
 H('Greitas pasirinkimas pagal vieną trūkstamą atsakymą'),
 L('Nežinau tikslaus įrankio modelio → prašau norų sąrašo arba renkuosi bendrą išsirinkimą.','Žinau pomėgį, bet ne konkrečią knygą → lyginu knygyno pasirinkimą ir kupono sąlygas.','Žinau daiktą, bet nežinau, ar jį jau turi → pasitikslinu prieš apmokėdamas.','Tėtis nenori daugiau daiktų → siūlau vieną veiklą, dvi datas ir pats pasirūpinu organizavimu.'),
 P('Konkrečių trijų pardavėjų pasiūlymų sąlygos papildomai tikrintos 2026 m. spalio 25 d. Kainos gali keistis; pristatymas ir galimos paslaugų priemokos neįtraukti. Tai atranka pagal aprašus, ne išbandytų gaminių reitingas.'),
 ]);
 replace('gidai/kaledines-dovanos-teciui','Šios idėjos yra pasirinkimo kryptys, o ne konkrečių prekių ar paslaugų rekomendacijos.','Pomėgio kryptį pirmiausia susiekite su konkrečiu tėčio noru.');
 links('gidai/kaledines-dovanos-teciui',['moka','books','angel']);

 insert('gidai/kaledines-dovanos-tevams',5,[
 H('Vienos ar dviejų dovanų patikra prieš apmokant'),
 L('Abu pasirenka tą pačią veiklą, bet ne tą pačią datą → pirma raskite bendrą laiką; čekis šio skirtumo neišspręs.','Vienas nori kavos ruošimo priemonės, kitas knygos → rinkitės dvi aiškiai jiems skirtas dovanas; vienodo įpakavimo pakanka bendram įteikimui.','Abu nori prisiminimo, bet nenori kurti patys → paruoškite albumą, ne kūrybinę užduotį.','Vienas siūlo dovaną, kitas tik mandagiai sutinka → pasikalbėkite su kiekvienu atskirai ir nespręskite pagal aktyvesnį žmogų.'),
 P('Kavos ir knygų derinio spąstas konkretus: šiame sąraše esantis MOKA 3 puodelių kavinukas netinka indukcinei viryklei, o 20 € knygų kuponas galioja šešis mėnesius. „Jie tikrai panaudos kada nors“ nėra pakankamas pagrindas. Patikrinkite abi sąlygas dar prieš dalydami bendrą biudžetą.'),
 ]);links('gidai/kaledines-dovanos-tevams',['moka','books']);

 const women=edit('gidai/dovanos-moterims');
 women.body[0]=P('Dovaną moteriai lengviau parinkti atskyrus du dalykus: ką ji pati mėgsta ir kokio artumo yra jūsų santykis. Tas pats 20 € pirkinys gali būti taiklus draugei ir pernelyg asmeniškas kolegei. Šis gidas skirtas gimtadieniui, padėkai ir kitoms progoms; Kalėdų sąrašo planavimą bei užsakymų laiką aptariame atskirai.');
 women.body[1]=L('Kolegei ar menkai pažįstamai gavėjai → sutarta suma ir neutralus, žinomą pomėgį atitinkantis pasirinkimas.','Draugei → bendras prisiminimas arba jos išsakytas noras, kurio nereikės aiškinti.','Partnerei → individualus noras; bendra veikla tinka tik jei jos nori abu.','Bendrai komandos dovanai → vienas pirkėjas, savanoriški indėliai ir išsaugotas pirkimo dokumentas.');
 insert('gidai/dovanos-moterims',5,[H('Trys situacijos, kai vien kainos neužtenka'),
 P('Padėka kolegei: pirmiausia pasitikrinkite komandos susitarimą. Jei ji kalbėjo apie mėgstamą autorių, knygų kuponas palieka pasirinkimo; asmeninio drabužio dydžio ar kosmetikos poreikio čia spėti nereikia. Dovaną įteikite be užuominos, kad ji turi atsilyginti.'),
 P('Draugės gimtadienis: jei turite daug bendrų kelionių nuotraukų, atrinktas albumas bus asmeniškesnis už dar vieną atsitiktinį puodelį. Pirmus puslapius paruoškite patys, o ne pažadėkite juos užpildyti po šventės.'),
 P('Partnerės noras turėti mažiau daiktų: pasiūlykite veiklą ir jos pasirinktą palydovą, jei tokio reikia. Pirma suderinkite formatą, tik tada mokėkite. „Dviem“ ant čekio nesuteikia dovanotojui automatinės vietos.'),
 H('Pasirinkimo taisyklė: du privalomi taip'),
 P('Užrašykite „ji pati to nori“ ir „jai nereikės tvarkyti mano dovanos“. Jei nors vieno teiginio negalite pagrįsti tikru pokalbiu ar įpročiu, pasitikslinkite. Toliau pateikti pirkiniai yra kandidatai šiam sprendimui, o ne privalomas sąrašas pagal lytį.'),
 ]);

 const xwomen=edit('gidai/kaledines-dovanos-moterims');
 xwomen.body[0]=P('Kalėdinę dovaną moteriai derinkite prie jos pomėgio ir savo pasiruošimo laiko. Žemiau rasite konkrečius pasiūlymus, o pirmiausia pasirinkite, ką realiai spėsite paruošti: jau turimą daiktą, užpildytą albumą, patvirtintą siuntą ar elektroninį kuponą. Tai 2026 m. sezoninė atranka, ne dovanos pagal lytį receptas.');
 insert('gidai/kaledines-dovanos-moterims',2,[H('Kuri dovana tinka pagal pasiruošimo laiką?'),
 L('Turite kelias savaites → galima ruošti asmeninį albumą: surinkite kadrus, patikrinkite leidimą juos naudoti ir tik tada užsakykite spaudą.','Turite kelias dienas → remkitės konkretaus pardavėjo patvirtintu gavimu. Vien užrašas „sandėlyje“ nėra pažadas įteikti per šventę.','Turite tik vakarą → rinkitės jau turimą užbaigtą dovaną arba patikrinkite elektroninio kupono gavimo sąlygas. Nežadėkite, kad fizinė siunta suspės.','Dovanojate kolegei → pirma galioja susitarimas dėl sumos; šventinis dizainas nepaverčia labai asmeniško daikto neutraliu.'),
 H('Du konkretūs 20 € biudžeto sprendimai'),
 P('Jei norite fizinės dovanos, 15,99 € MOKA kavinukui lieka 4,01 € pristatymui ir pakavimui; šis modelis netinka indukcijai. Jei renkatės 20 € knygų kuponą, visa suma jau skirta kuponui, o knygų siuntimo išlaidos juo neapmokamos. Prieš įteikdami patikrinkite, ar gavėjai tinka parduotuvė ir šešių mėnesių galiojimas. Šias dvi sąlygas papildomai tikrinome 2026 m. spalio 25 d.'),
 ]);links('gidai/kaledines-dovanos-moterims',['moka','books','payment']);

 insert('gidai/kaledines-dovanos-mamai',2,[H('Pasirinkite iš trijų situacijų, o ne iš dešimties atsitiktinių prekių'),
 L('Mama sako „nieko nereikia“ ir vengia naujų daiktų → pirmiausia skaitykite 9 ir 10 idėjas: laišką arba jūsų suplanuotą susitikimą.','Mama pati mini konkretų pomėgį → žiūrėkite 1–6 idėjas ir patikrinkite, ar ji jau neturi panašaus daikto.','Mama nori veiklos su jumis → palyginkite 7 ir 8 idėjas pagal vietą, pasiruošimą ir kelionę, ne vien kainą.'),
 H('Kaip asmeninę dovaną užbaigti iki šventės?'),
 P('Pavyzdžiui, renkatės prisiminimų albumą: vieną vakarą surinkite nuotraukas, kitą parašykite vietas bei metus, o trečią patikrinkite jų eiliškumą. Tai jūsų darbų planas, ne spaustuvės terminas. Jei spausdinimo gavimas nepatvirtintas, įteikimui paruoškite užbaigtą laišką su viena jau turima nuotrauka. Mamai nereikės pabaigti jūsų pradėtos dovanos.'),
 ]);

 insert('gidai/kaledines-dovanos',5,[H('Vienas sąrašas visiems gavėjams: penki stulpeliai'),
 P('Užrašykite gavėją, konkretų norą, didžiausią galutinę sumą, gavimo būdą ir žmogų, kuris pasirūpins įteikimu. Šalia kiekvienos dovanos pažymėkite vieną būseną: „dar tik idėja“, „užsakyta“, „gavimas patvirtintas“ arba „paruošta įteikti“. Taip atskirsite nupirktą prekę nuo tos, kurią tikrai turėsite per susitikimą.'),
 L('Mamai: noras susitikti → jūsų suplanuota popietė; patvirtinimas – abi sutartos datos.','Tėčiui: žinomas kavos ruošimo pomėgis → tik su jo virykle suderinamas modelis; patvirtinimas – modelio ir gavimo patikra.','Tėvams: vienas bendras noras → bendras pasirinkimas; skirtingi norai → du mažesni pirkiniai.','Šeimai: bendra veikla → tikrinkite tikrą dalyvių skaičių, kalbą ir visų norą dalyvauti.','Kolegei: simbolinis gestas → komandos sutarta suma ir nedidelė asmeniška žinutė.'),
 H('Pavyzdys: trys dovanos ir viena bendra 80 € riba'),
 P('Tarkime, pasirenkate 20 € knygų kuponą, 14,99 € puodelį ir 32 € rankų liejimo rinkinį. Prekių suma yra 66,99 €, taigi iš 80 € lieka 13,01 € visų siuntų bei pakavimo išlaidoms. Šis likutis nėra pristatymo kainos pasiūlymas. Jei perkate iš trijų parduotuvių, tikrinkite tris krepšelius; vieno pardavėjo nemokamo siuntimo riba kitiems negalioja.'),
 ]);

 insert('gidai/kaledines-dovanos-paskutine-minute',4,[H('Trys elektroniniai variantai ir jų skirtingos sąlygos'),
 P('20 € knygų kuponas siunčiamas el. paštu po apmokėjimo ir galioja šešis mėnesius. Įvertinkite, ar gavėjas ras norimų knygų; siuntimas kuponu neapmokamas. Jei pirkinių suma mažesnė, likutis negrąžinamas. Tai konkretus knygyno pasirinkimas, ne pinigai bet kuriai parduotuvei.'),
 P('„Angelų Takais“ elektroninis 20 € kuponas pateikiamas PDF formatu po apmokėjimo. Tai indėlis į pasirinktą patirtį: atskirai tikrinkite miestą, seansą ir galimą priemoką. Neįrašykite į sveikinimą pažado, kad šios vertės užteks dviem žmonėms ar konkrečiam vakarui, to nepatikrinę.'),
 P('„Gera dovana“ elektroninio čekio pristatymas leidžia išvengti fizinės siuntos. Tačiau apmokėjimas pagal sąskaitą gali būti įskaitomas darbo dieną; vien pasirinktas elektroninis formatas dar nereiškia, kad čekis jau jūsų pašte. Šventinį vakarą pirma įsitikinkite, kad gautą failą galite atidaryti ir jame matote tinkamą pasiūlymą.'),
 P('Šių pasiūlymų sąlygos tikrintos 2026 m. spalio 25 d. pas pardavėjus. Elektroninio kupono gavimas ir rezervuotas apsilankymas yra atskiri veiksmai; konkretaus išsiuntimo per šventes ši svetainė negarantuoja.'),
 H('Jei liko pusvalandis: veiksmų seka'),
 L('Pirmos 5 minutės: pasirinkite vieną gavėjo norą atitinkančią kryptį ir perskaitykite sąlygas.','Kitos 10 minučių: jei perkate, patikrinkite apmokėjimą ir tikrai gautą failą. Jei jo nėra, nekurkite įteikimo pažado pagal užsakymo ekraną.','Likusios 15 minučių: parašykite trumpą žinutę, išbandykite nuorodą arba atspausdinkite gautą dokumentą. Jei pirkimas nebaigtas, paruoškite nuoširdų asmeninį kvietimą ir aiškiai taip jį įvardykite.'),
 ]);links('gidai/kaledines-dovanos-paskutine-minute',['books','payment','angel','delivery']);
 edit('gidai/kaledines-dovanos-paskutine-minute').description='Dovana reikalinga šiandien? Trys elektroniniai variantai su sąlygomis, patvirtintas atsiėmimas ir konkretus pusvalandžio planas.';

 insert('gidai/dovanos-jubiliejui',10,[H('Trys konkretūs 50-mečio dovanos planai'),
 P('Prisiminimų dovana iš artimųjų: kiekvienas pateikia po vieną nuotrauką ir trumpą, jubiliatui malonią istoriją. Vienas žmogus atrenka ir surašo tekstus, kitas patikrina vardus bei datas. Nereikia surinkti lygiai 50 daiktų ar nuotraukų vien dėl sukakties skaičiaus – dvylika prasmingų istorijų bus rišlesnė dovana už skubiai užpildytą albumą.'),
 P('Pasirinkimo laisvė skaitančiam žmogui: 20 € knygų kuponas gali papildyti asmeninį sveikinimą, jei gavėjas per šešis mėnesius galės juo pasinaudoti. Net ir bendrai dovanai nesumaišykite kelių tokių kuponų su grynųjų biudžetu: prieš pirkdami perskaitykite knygų kupono apmokėjimo sąlygas. Tai padeda išvengti netinkamo kelių kodų pirkimo vienam didesniam krepšeliui.'),
 P('Bendra kūryba namuose: poros rankų liejimo rinkinys kainuoja 32 €, šeimos – 48 €, abiejuose yra balti dažai. Jei trys žmonės sutaria bendrą 60 € ribą, po 48 € rinkinio lieka 12 € siuntimui ir įteikimui. Krepšelyje patikrinkite tikrą sumą. Tai priemonių dovana būsimai veiklai; jau paruoštą liejinį reikėtų suplanuoti atskirai.'),
 H('Paskutinis grupės susitarimas: kas lieka gavėjui?'),
 L('Jei dovanojate daiktą – pridėkite reikalingą naudojimo informaciją ir saugokite pirkimo dokumentą.','Jei dovanojate veiklą – kas rezervuos, kas važiuos kartu ir kas apmokės papildomas išlaidas?','Jei dovanojate prisiminimus – originalių nuotraukų savininkams grąžinkite failus ir neviešinkite jų be leidimo.','Jei dalis surinktų pinigų liko – grupei iš anksto pasirinkite grąžinimą arba aiškiai sutartą papildymą.'),
 ]);links('gidai/dovanos-jubiliejui',['books','payment']);

 replace('gidai/kaledines-dovanos-seimai','Balti dažai įtraukti; galima rinktis papildomą apdailą ir padėklą už produkto puslapyje nurodytą priedą.','Balti dažai įtraukti. Kitų spalvų pasirinkimus ir jų kainą tikrinkite produkto puslapyje; medinis padėklas šiuo metu išparduotas.');
 const pair=edit('gidai/kaledines-dovanos-porai');
 for(const b of pair.body)if(b.text?.includes('medinį padėklą galima pasirinkti'))b.text=b.text.replace(/[^.!?]*medinį padėklą galima pasirinkti[^.!?]*[.!?]/i,' Į kainą įeina balti dažai. Medinis padėklas šiuo metu išparduotas.');
 assert.ok(pair.body.some(b=>b.text?.includes('Medinis padėklas šiuo metu išparduotas.')));

 // Different jobs for overlapping pages; universal packing retains its manual.
 const packing=edit('gidai/kalediniu-dovanu-pakavimas');
 const firstImage=packing.body.find(b=>b.type==='image');
 packing.body=[P('Kai Kalėdoms reikia supakuoti kelių žmonių dovanas, didžiausią skirtumą padaro pasiruošimas: sužymėkite gavėjus, atskirkite siuntas nuo asmeniškai įteikiamų dovanų ir pasirinkite vieną derantį pakavimo būdą. Dėžutės, cilindro ir trapaus daikto vyniojimo žingsnius rasite gide kaip supakuoti dovaną; čia planuojame visą šventinį rinkinį.'),
 H('Prieš kirpdami popierių sužymėkite visas dovanas'),
 L('Ant nuimamo lapelio užrašykite gavėją ir susitikimą, į kurį vešitės dovaną.','Atskirkite dar negautus pirkinius: jiems dar nekirpkite popieriaus pagal spėjamą dėžutės dydį.','Patikrinkite, ar nuimtos kainų etiketės; pirkimo dokumentus pasilikite atskirai.','Trapias dovanas pirma apsaugokite tinkama vidine pakuote. Dekoratyvinis popierius jos nepakeičia.'),
 H('Trys vientiso stiliaus variantai'),
 P('Šviesus popierius ir viena spalvota juostelė tinka, kai norite skirtingų formų dėžutes sujungti į vieną vaizdą. Paprastas kraftpopieris ir ranka parašytos kortelės leidžia kiekvienam pridėti savą sakinį. Daugkartiniai medžiaginiai maišeliai patogūs gavėjams, kurie juos naudos ir vėliau; trapiam turiniui vis tiek reikia atskiros apsaugos.'),
 ...(firstImage?[firstImage]:[]),
 H('Kaip nesumaišyti panašių dėžučių?'),
 P('Kortelę pritvirtinkite vos užvynioję dovaną, o ne baigę visą partiją. Jei nenorite išduoti turinio, ant privačiame sąraše esančios dovanos ir jos pakuotės naudokite tą patį trumpą numerį. Prieš išvykdami patikrinkite sąrašą pagal susitikimą: kam, kur ir kurią dieną įteiksite.'),
 H('Jei dovana keliaus paštomatu'),
 P('Šventinį įpakavimą dėkite į tinkamą siuntimo dėžę, kuri saugo turinį. Neužklijuokite gavėjo kortelės taip, kad atplėšiant siuntą būtų pažeista pati dovana. Išorinės dėžės matmenis, turinio apribojimus ir apsaugą tikrinkite pagal pasirinkto vežėjo taisykles; šiame gide nėra siuntos atsparumo garantijos.'),
 H('Vieno vakaro pakavimo planas'),
 L('Pirmas etapas: apžiūrėti turinį, paruošti apsaugines dėžes ir korteles.','Antras etapas: kartu apvynioti panašias tvirtas dėžutes; trapius ar netaisyklingus daiktus ruošti atskirai.','Trečias etapas: kiekvieną paruoštą dovaną sužymėti ir padėti prie atitinkamo išvykimo sąrašo.','Pabaigoje: nufotografuoti savo sąrašą atminčiai, o pakuotes laikyti taip, kad jos nesusispaustų ir nesudrėktų.'),
 H('Ką daryti, jei viena dovana dar neatkeliavo?'),P('Likusią partiją užbaikite, o laukiamą siuntą sąraše pažymėkite atskirai. Pristatymo datos neperkelkite į sveikinimo pažadą, kol ji nepatvirtinta. Jei laiko nebeliko, padės gidas kalėdinės dovanos paskutinę minutę. Šventinis derėjimas nėra svarbesnis už nepažeistą turinį ir aiškią žinutę gavėjui.')];
 const addInternal=(slug,target,label)=>{const q=edit(slug);q.links=structuredClone(pages.get(slug).links||[]);if(!q.links.some(l=>l.targetPageId===pages.get(target).id))q.links.push({targetPageId:pages.get(target).id,label});};
 addInternal('gidai/kalediniu-dovanu-pakavimas','gidai/kaip-supakuoti-dovana','kaip supakuoti dovaną');
 addInternal('gidai/kalediniu-dovanu-pakavimas','gidai/kaledines-dovanos-paskutine-minute','kalėdinės dovanos paskutinę minutę');
 insert('gidai/dovana-vestuviu-metinems',1,[H('Kai data svarbi: du atskiri terminai'),P('Pasižymėkite metinių dieną ir dieną, kada turėtumėte pradėti norimą sumanymą. Per pačias metines galite įteikti priemones bei asmeninį kvietimą veiklai; baigtam kūriniui reikia ir instrukcijoje nurodyto paruošimo bei džiūvimo. Jei laiko darbui nebeužtenka, keiskite įteikimo formatą, ne trumpinkite medžiagų instrukciją.'),L('Per metines įteiksiu rinkinį → svarbu laiku gauti neatidarytą pakuotę.','Per metines kursime kartu → iš anksto abu sutariame laiką ir pasiruošiame darbo vietą.','Per metines įteiksiu baigtą liejinį → atskirai suplanuoju kūrimą, džiūvimą, apdailą ir apsaugą.')] );
 insert('gidai/ranku-liejimo-rinkinys-ar-paruosta-dovana',1,[H('Palyginkite tą pačią gavėjo užduotį'),L('Rinkinys: gavėjas dalyvauja procese, pasiruošia vietą ir vadovaujasi konkrečia instrukcija. Tai tinka norinčiam kurti.','Paruoštas kūrinys: gavėjas gauna jau užbaigtą daiktą. Svarbesni jo stilius, matmenys, laikymo vieta ir trapaus daikto apsauga.','Sąžiningas kainos palyginimas: prie rinkinio įvertinkite tikrai reikalingą pasiruošimą, prie gatavo kūrinio – gamybą ir saugų gavimą. Nesulyginkite priemonių kainos su individualaus darbo paslaugos kaina.'),P('Sprendimą užrašykite taip: „Noriu padovanoti dalyvavimą“ arba „Noriu padovanoti baigtą daiktą“. Jeigu gavėjas pats nenori kurti, graži liejinio nuotrauka šio skirtumo nepanaikins. Konkrečiai metinių dienai skirtą darbų planavimą aptariame atskirai.')]);
 // Future-only exchanges preserve the per-day cadence and all already-public dates.
 for(const [a,b] of [['gidai/kaledines-dovanos-paskutine-minute','gidai/bendros-veiklos'],['gidai/dovanos-dukrai','gidai/ranku-liejinio-iteikimas'],['gidai/dovanos-jubiliejui','gidai/bendras-kurybos-vakaras']]){
  assert.ok(Date.parse(pages.get(a).publishAt)>Date.parse('2026-10-25T23:59:59Z'));
  assert.ok(Date.parse(pages.get(b).publishAt)>Date.parse('2026-10-25T23:59:59Z'));
  edit(a).publishAt=pages.get(b).publishAt;edit(b).publishAt=pages.get(a).publishAt;
 }
 return [...changes].map(([slug,input])=>({slug,id:pages.get(slug).id,expectedRevisionHash:pages.get(slug).revisionHash,input}));
}
