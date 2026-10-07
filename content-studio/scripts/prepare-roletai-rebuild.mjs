// Fresh private studio in this isolated checkout. No legacy draft/package reuse.
import {initialize,getSite,editSite,addPage,editPage} from '../src/model.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const siteId='roletaiklaipedoje';
const base=path.resolve(import.meta.dirname,'../../sites',siteId);
await initialize();
const sources=[
 ['isotra-daynight','https://www.isotra.com/verra-semi-fabric-roller-blind','Dviejų audinio sluoksnių tankios/permatomos juostos persidengia; konstrukcija atskira nuo audinio.'],
 ['luxaflex-blackout','https://www.luxaflex.co.uk/products/blackout-blinds/','Tamsinantis audinys ir viso lango šoninės šviesos kontrolė nėra tas pats.'],
 ['luxaflex-roller','https://www.luxaflex.co.uk/products/roller-blinds/','Audinių pralaidumas, valdymas ir lango konstrukcija pasirenkami atskirai; konkrečių gaminių savybių negeneralizuoti.'],
 ['ikea-size','https://www.ikea.com/lt/lt/p/langdans-ritinine-uzuolaida-pilka-50471837/','Konkretaus modelio audinio ir bendras plotis skiriasi. Ne universalus matavimo receptas.'],
 ['optirole','https://www.optirole.lt/','Konkurentas Klaipėdoje siūlo gamybą pagal matmenis ir montavimą; ne mūsų pajėgumas.'],
 ['roleturojus','https://roleturojus.lt/gauti-pasiulyma/','Konkurentas skiria kainos, matavimo, montavimo ir remonto užklausas; ne mūsų pasiūlymas.'],
 ['stores-fr','https://storesenrouleur.com/','Prancūzijos gamintojas turi konkrečius gaminius/krepšelį ir informacinius naudojimo klausimus; kitokia vykdymo apimtis.']
];
await mkdir(path.join(base,'research-raw'),{recursive:true});
const observations=[];
for(const [id,url,reason] of sources){
 const at=new Date().toISOString();let status='failed',value=null,bytes;
 try {const response=await fetch(url,{signal:AbortSignal.timeout(20000)});bytes=Buffer.from(await response.arrayBuffer());if(!response.ok)throw new Error('HTTP '+response.status);status='observed';value={url,reason,httpStatus:response.status};}
 catch(error){bytes=Buffer.from(JSON.stringify({url,error:String(error.message),at}));}
 const artifact=`${id}.html`;await writeFile(path.join(base,'research-raw',artifact),bytes);
 observations.push({id,kind:'source',status,country:'GLOBAL',language:'und',observedAt:at,freshUntil:'2026-11-06T12:00:00Z',source:{artifact,sha256:createHash('sha256').update(bytes).digest('hex')},value,limitations:'Raw response hash preserves acquisition. Claim applicability requires separate reading. Not demand/volume data.'});
}
await writeFile(path.join(base,'research-raw/bundle.json'),JSON.stringify({version:1,siteId,domain:'roletaiklaipedoje.lt',language:'lt',country:'LT',observations},null,2));
await editSite(siteId,{name:'Roletai Klaipėdoje',offer:'Aiškesnis roletų pasirinkimas ir poreikio registracija Klaipėdoje',audience:'Klaipėdos gyventojai, besirenkantys roletus savo būstui.',facts:'Savininko patvirtintas operatorius MB Pinet, kontaktas info@pinet.lt. Kuriamas poreikių surinkimo pilotas: ne montuotojas, ne parduotuvė. Nėra patvirtinto tiekėjo, montavimo komandos, kainų, partnerystės, termino, telefonų, biuro ar klientų darbų. Užklausa yra poreikio registracija, ne užsakymas ar vizitas; trečiajai šaliai automatiškai neperduodama. Straipsnių autorystė MB Pinet / redakcija; tekstas rengiamas su AI ir tikrinamas pagal pirminius šaltinius. Šaltiniai tikrinti 2026-10-07; generuoti iliustraciniai interjerai nėra klientų darbai. Faktiniai išorinių gamintojų duomenys: ISOTRA Verra semi diena–naktis audinys turi du sluoksnius su tankiomis ir permatomomis juostomis. Luxaflex išskiria audinio pralaidumą, konstrukciją ir šoninius kanalus tamsinimui. IKEA LÅNGDANS 80x250 modelio audinio plotis ir bendras plotis skiriasi; tokio skirtumo neperkelti kitoms sistemoms. Matmenys užklausai tik preliminarūs, galutinį dydį lemia konkretaus gaminio instrukcija. Jokio universalaus cm atėmimo, kainų diapazono, energijos sutaupymo procento ar remonto procedūros. Vaikų saugos teiginiui reikia konkretaus gamintojo instrukcijos, neišgalvoti sertifikato. BUSINESS.md ir naujas topical plan nurodo vartotojo sprendimą ir originalų praktinį naudą.',brand:{accent:'#734b34'},contentPolicy:{months:6,cadence:'coverage',topicTarget:30,localTime:'10:00'},stage:'planning'});
const topics=[
 ['roletu-pasirinkimas','Kaip pasirinkti roletus: nuo kambario poreikio iki sistemos','roletai kaip pasirinkti','pasirinkimas','Poreikio sprendimų lapas, atskiri audinys/mechanizmas/tvirtinimas.'],
 ['sviesa-ir-privatumas','Diena–naktis ar blackout: šviesa ir privatumas','diena naktis ar blackout','pasirinkimas','Dienos ir vakaro scenarijų palyginimas, kraštų šviesos ribos.'],
 ['matmenys-uzklausai','Ką išmatuoti prieš roletų užklausą','roletu matavimas','pasirengimas','Lango inventoriaus ir matavimo vietos lapas, be užsakymo dydžio formulės.'],
 ['pasiulymu-palyginimas','Kaip palyginti roletų kainos pasiūlymus','roletu kaina','pirkimas','Vienodos apimties pasiūlymų patikros lentelė be išgalvotų kainų.'],
 ['kasetiniai-ar-klasikiniai','Kasetiniai ar klasikiniai roletai','kasetiniai roletai','pasirinkimas','Audinio ir konstrukcijos terminų atskyrimas.'],
 ['roletai-diena-naktis','Kaip veikia diena–naktis roletai','roletai diena naktis','pasirinkimas','Juostų padėties paaiškinimas ir privatumo bandymas.'],
 ['blackout-tarpai','Kodėl blackout roletai praleidžia šviesą kraštuose','blackout roletai tarpai','problemos','Atskirti audinį nuo visos sistemos, klausimai tiekėjui.'],
 ['roletai-ar-uzuolaidos','Roletai ar užuolaidos: kada ką rinktis','roletai ar uzuolaidos','pasirinkimas','Lango naudojimo, sluoksniavimo ir priežiūros sprendimų palyginimas.'],
 ['roletai-ar-plisuotos-zaliuzes','Roletai ar plisuotos žaliuzės','roletai ar plisuotos','pasirinkimas','Konstrukcijų/paslankumo skirtumai pagal gamintojo sistemą.'],
 ['audinio-pavyzdys','Kaip vertinti roleto audinio pavyzdį','roletu audiniai','pasirinkimas','Tikros dienos/vakaro šviesos patikros lapas.'],
 ['miegamasis','Roletai miegamajam: tamsinimo pasirinkimai','roletai miegamajam','kambariai','Tamsinimo poreikis ir kraštų kontrolė.'],
 ['darbo-kambarys','Roletai darbo kambariui: akinimas ir dienos šviesa','roletai nuo saules darbo kambarys','kambariai','Ekrano vietos ir naudojimo laiko stebėjimo lapas.'],
 ['virtuve','Roletai virtuvei: priežiūra ir lango naudojimas','roletai virtuvei','kambariai','Tinkamumo/valymo instrukcijos patikra.'],
 ['vonia','Roletai voniai: drėgmė ir audinio pasirinkimas','roletai voniai','kambariai','Produkto tinkamumas pagal instrukciją, ne universalus atsparumas.'],
 ['vaiku-kambarys','Roletai vaikų kambariui: saugos klausimai','roletai vaiku kambariui','sauga','Konkrečių valdymo saugos dokumentų patikra.'],
 ['balkono-durys','Roletai balkono durims ir dažnai atidaromiems langams','roletai balkono durims','langai','Varčios/rankenos/ėjimo kliūčių lapas.'],
 ['didelis-langas','Roletai dideliam langui: ko paklausti tiekėjo','roletai dideliems langams','langai','Sistemos pločio/apimties duomenys tik iš pasirinkto modelio.'],
 ['stoglangis','Roletai stoglangiui: modelio suderinamumas','roletai stoglangiams','langai','Lango modelio žymėjimo ir sistemos suderinamumo patikra.'],
 ['nuomojamas-bustas','Roletai nuomojamam būstui ir negręžiamas tvirtinimas','roletai be grezimo','pasirengimas','Savininko leidimas ir gamintojo tvirtinimo apribojimai.'],
 ['matavimas-montavimas','Kas turi būti sutarta dėl matavimo ir montavimo','roletu montavimas klaipeda','pirkimas','Atsakomybės/termino/garantijos klausimų lapas.'],
 ['standartiniai-ar-pagal-matmenis','Standartiniai ar pagal matmenis gaminami roletai','roletai pagal matmenis','pirkimas','Audinio/bendro pločio ir aptarnavimo palyginimas.'],
 ['roletai-internetu','Ką patikrinti perkant roletus internetu','roletai internetu','pirkimas','Instrukcija, matmenys, pardavėjo sąlygos ir neatitikimo kelias.'],
 ['prieziura','Kaip prižiūrėti roletus pagal audinį','roletu prieziura','naudojimas','Konkretaus audinio valymo instrukcija, jokio bendro plovimo recepto.'],
 ['pelesis','Pelėsis ant roleto: ką patikrinti prieš valymą','pelėsis ant roleto','problemos','Drėgmės/priežasties vertinimas ir dokumento ribos.'],
 ['grandinele','Roleto grandinėlė stringa: saugus problemos aprašymas','roletu grandinele stringa','problemos','Gedimo duomenys servisui, be pavojingo išardymo.'],
 ['audinys-krypsta','Roleto audinys vyniojasi kreivai','roletas kreivai vyniojasi','problemos','Stebėjimų lapas servisui, ne įtempimo remonto vadovas.'],
 ['elektriniai','Elektriniai roletai: ką suplanuoti prieš pasirinkimą','elektriniai roletai','valdymas','Maitinimo/suderinamumo dokumentai, ne elektros darbų instrukcija.'],
 ['valdymas','Grandinėlė ar kitoks valdymas: patogumas ir sauga','roletu valdymas','valdymas','Pasiekiamumo ir tikros gaminio dokumentacijos vertinimas.'],
 ['vakaro-privatumas','Kodėl roletas vakare atrodo permatomas','roletai permatomi vakare','problemos','Audinio bandymas su vidaus/išorės apšvietimu.'],
 ['vasaros-pasirengimas','Kaip pasiruošti vasaros akinimui namuose','roletai nuo saules','sezonas','Prieš sezoną surinkti langų laikų/poreikių duomenis, be šilumos procentų.']
];
const existing=await getSite(siteId);if(existing.pages.length)throw new Error('Fresh rebuild studio expected; refusing duplicate/resume overwrite.');
const initialTime=new Date().toISOString(), planned=[];
for(let i=0;i<topics.length;i++){
 const [slug,title,query,cluster,contribution]=topics[i];
 const date=i<3?initialTime:i===3?'2026-10-08T07:00:00Z':i<10?'2026-10-09T07:00:00Z':i<22?'2026-10-12T07:00:00Z':i<29?'2026-10-15T07:00:00Z':'2027-02-15T08:00:00Z';
 const page=await addPage(siteId,{type:'guide',slug:'gidai/'+slug,title,description:title+'. Praktinė sprendimo patikra ir aiškios ribos.',intent:query,cluster,reason:contribution+' Skaitytojas turi priimti atskirą sprendimą; nėra savaitinės kvotos. Tikslinė data priklauso nuo šaltinių, medijos ir review, ne automatinis approval.',sourceQueries:[query+' LT lt',...sources.slice(0,4).map(s=>s[1])],publishAt:date,seasonalHook:i===29?'Pasirengti prieš vasaros akinimo sezoną; datos prielaida.':''});
 planned.push({pageId:page.id,url:'/'+page.slug,title,query,variants:query==='roletu kaina'?['roletu kainos Klaipedoje','kiek kainuoja roletai']:[],country:'LT',language:'lt',demandEvidence:'unmeasured',decision:'new',intent:'informational-decision',cluster,rootUrl:'/gidai/roletu-pasirinkimas',contribution,requiredSources:sources.slice(0,4).map(s=>s[1]),plannedPublishAt:date,state:i<4?'DRAFT_REQUESTED':'PLANNED_NOT_WRITTEN',cta:'/kontaktai',links:[{url:'/gidai',reason:'Atrasti klausimą'},{url:'/kontaktai',reason:'Registruoti konkretų roletų poreikį'}],measurement:'Indexing → query impressions → relevant guide visits → stored/received/qualified inquiries; synthetic excluded.'});
}
await writeFile(path.join(base,'TOPICAL_PLAN.json'),JSON.stringify({siteId,scope:'Vidaus roletų pasirinkimas, pirkimo pasirengimas, langų/kambarių pritaikymas, valdymas/priežiūra ir pagrindinės problemos Klaipėdos būsto pirkėjui. Lauko ekranai, markizės, kitų miestų durys ir pilnas žaliuzių katalogas už šios apibrėžtos nišos ribų.',createdAt:new Date().toISOString(),timezone:'Europe/Vilnius',quota:null,dates:'Proposed editorial readiness targets; only reviewed immutable package becomes public at publishAt.',pages:planned,merges:[{queries:['roletai Klaipeda','roletai Klaipedoje','roletai Klaipėdoje'],target:'/',reason:'Vienas vietinis poreikio kelias, ne trys miesto durys.'},{queries:['roletu kainos','roletu kaina'],target:'/gidai/pasiulymu-palyginimas',reason:'Vienas palyginamų apimčių klausimas.'}]},null,2));
console.log(JSON.stringify({siteId,pages:planned.length,firstDraftIds:planned.slice(0,4).map(p=>p.pageId),rawSources:observations.map(o=>({id:o.id,status:o.status}))}));
