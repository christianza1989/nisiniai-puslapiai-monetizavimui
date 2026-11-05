import {createHash} from 'node:crypto';
import mechanisms from '../../content/option-mechanism-explanations.json';
import {explanationSourceModels,explanationSourceMetadata} from './option-explanation-sources';
import inventory from '../../content/text-review-inventory.json';
import {verifiedDeskOption} from './verified-desk-media-options';
import type {TextDefinition} from './text-review-types';

export type OptionExplanation=TextDefinition&{sourceUrl:string;optionBinding:string};
export const explanationBinding=(field:string,value:string)=>'explanation:'+field+'='+value;
const normalize=(s:string)=>s.trim().replace(/\s+/g,' ').toLowerCase();
const sentence=(s:string)=>s.replace(/[.;\s]+$/,'')+'.';
const dimensionWords:Record<string,string>={'1':'vienu būdu','2':'dviem būdais','3':'trimis būdais','4':'keturiais būdais'};
const materialTerms:Record<string,string>={
 'polyamide':'poliamidas','polypropylene':'polipropilenas','polypropylen':'polipropilenas','polyurethane':'poliuretanas','plastic':'plastikas','steel':'plienas','aluminium':'aliuminis','aluminum':'aliuminis',
 'beech wood':'buko mediena','oak wood':'ąžuolo mediena','beech plywood':'buko fanera','laminated plywood':'laminuota fanera','laminate plywood':'laminuota fanera','plywood':'fanera','leather':'oda','imitation leather':'dirbtinė oda','upholstery':'apmušalas','black elastomer':'juodas elastomeras',
 'powder-coated steel':'milteliniu būdu dažytas plienas','chromium plated steel':'chromuotas plienas','steel chromium plate':'chromuotas plienas','polished aluminium':'poliruotas aliuminis','polished aluminum':'poliruotas aliuminis','anodised aluminium':'anoduotas aliuminis',
 'black polyamide':'juodas poliamidas','white polyamide':'baltas poliamidas','light grey polyamide':'šviesiai pilkas poliamidas','grey polyamide':'pilkas poliamidas','black polypropylene':'juodas polipropilenas','white polypropylene':'baltas polipropilenas','black polypropylen':'juodas polipropilenas','black polyurethane':'juodas poliuretanas','grey polyurethane':'pilkas poliuretanas','dark grey polypropylene':'tamsiai pilkas polipropilenas','black plastic':'juodas plastikas',
 'melamine (mfc)':'melaminu dengta medžio drožlių plokštė','mdf lacquered':'lakuota MDF plokštė','veneered board':'medienos lukštu dengta plokštė','veneered plywood':'medienos lukštu dengta fanera','chipboard':'medžio drožlių plokštė','linoleum':'linoleumas','perforated metal':'perforuotas metalas',
};
function materials(source:string){
 const exact=materialTerms[normalize(source)];if(exact)return exact;
 const t=normalize(source).replace(/\([^)]*\)/g,'').trim();
 return materialTerms[t]||Object.entries(materialTerms).sort((a,b)=>b[0].length-a[0].length).find(([key])=>t===key)?.[1];
}
/** Only explicit supplier words produce capabilities. A code prefix never does. */
export function explainManufacturerOption(field:string,source:string):string|undefined{
 const s=normalize(source),body=s.replace(/^[a-z0-9/()._–-]{1,45}:\s*/,''),parts:string[]=[];
 if(!s||s===field.toLowerCase())return;
 if(/COLOR|CHCOL|COL$|PRICEGROUP/.test(field))return;
 if(/GROUP/.test(field))return /MESH/.test(field)?'Pasirenkama atlošo arba kitos dalies tinklelio kolekcija.':'Pasirenkama šios dalies apmušalo kolekcija.';
 const component:Record<string,string>={CARMRESTS:'porankių',CHEADREST:'galvos atramos',CLUMBARSUPPORT:'juosmens atramos',CCASTORS:'ratukų',CGLIDES:'atraminių pėdelių',CFOOTREST:'kojų atramos',CTABLET:'rašymo lentelės',CBAGHOLDER:'krepšio laikiklio',CPILLOW:'pagalvėlių',CCONNECTOR:'kėdžių jungties',CSTACKINGPROTECTION:'apsaugos kėdėms sukrauti',FPANEL:'pertvaros',FPANELSIDE:'šoninės pertvaros',FUPPERPANEL:'viršutinės pertvaros',FHORWIRETRUNKING:'horizontalaus kabelių lovelio',FVERWIRETRUNKING:'vertikalaus kabelių kanalo',FPCHOLDER:'kompiuterio laikiklio',FDRAWER:'stalčiaus',FPOWERSTRIP:'elektros lizdų bloko',FPEDESTAL:'stalčių bloko',FTOPINSERT:'stalviršio įdėklo'};
 if(body==='none'||body==='no'||body==='without upholstery'||body==='without side panel')return body==='without upholstery'?'Šis variantas yra be apmušalo.':component[field]?'Komplektacija be '+component[field]+'.':'Šis priedas arba funkcija į komplektaciją neįtraukiama.';
 if(field==='CMECHANISM'){
  if(/asynchronous/.test(body))parts.push('Atlošo ir sėdynės pasvirimą galima reguliuoti atskirai');
  else if(/synchronous|synchro\b/.test(body))parts.push('Atsilošiant atlošas ir sėdynė juda suderintai');
  else if(/integrated seat and backrest tilting|multiblock/.test(body))parts.push('Atlošas ir sėdynė siūbuoja kartu');
  else if(/permanent contact/.test(body))parts.push('Galima keisti atlošo pasvirimą');
  else if(/seat base/.test(body))return 'Sėdynės tvirtinimo pagrindas.';
  else if(/smooth backrest tilt|free-floating/.test(body))parts.push('Leidžia atsilošti');
  if(/automatic weight|self-tension/.test(body))parts.push('pasipriešinimas atsilošimui automatiškai prisitaiko prie žmogaus svorio');
  if(/seat depth|depth adjust/.test(body))parts.push('reguliuojamas sėdynės gylis');
  if(/negative.*inclination/.test(body))parts.push('sėdynę galima palenkti į priekį');
  if(/harder spring|increased spring tension|reinforced spring/.test(body))parts.push('stipresnė spyruoklė padidina pasipriešinimą atsilošimui');
  if(/without height/.test(body))parts.push('aukštis nereguliuojamas');
  return parts.length?sentence(parts.join('; ')):undefined;
 }
 if(field==='CBACKRESTMOVEMECH')return /no backrest movement/.test(body)?'Papildomos atlošo judėjimo funkcijos nėra.':/mobile back movement/.test(body)?'Atlošas gali judėti į šonus ir šiek tiek pasisukti.':undefined;
 if(field==='CBACKRESTCONNECTOR')return /polished alum/.test(body)?'Atlošo jungtis pagaminta iš poliruoto aliuminio.':/plastic/.test(body)?'Atlošo jungtis pagaminta iš plastiko.':undefined;
 if(field==='FHEIGHTADJUSTMENT')return /electric/.test(body)?'Stalviršis pakeliamas ir nuleidžiamas elektriniu mechanizmu.':/crank/.test(body)?'Stalviršio aukštis keičiamas ranka sukant rankeną.':/fixed height/.test(body)?'Šio varianto stalviršio aukštis nereguliuojamas.':/manual/.test(body)?'Stalviršio aukštis reguliuojamas rankiniu būdu.':undefined;
 if(field==='FHADJUSTMENTWAY'){
  if(/crank/.test(body))return 'Stalviršis pakeliamas ir nuleidžiamas ranka sukant rankeną.';
  if(/memory/.test(body))return 'Pulteliu reguliuojamas stalviršio aukštis, ekranas rodo jo reikšmę. '+(/4 position/.test(body)?'Atmintyje galima išsaugoti keturias aukščio padėtis.':'Atmintyje galima išsaugoti pasirinktą aukštį.');
  if(/up.?&.?down|up.down/.test(body))return 'Mygtukais stalviršis keliamas arba leidžiamas.'+(/display/.test(body)?' Ekrane rodoma aukščio reikšmė.':'');
 }
 if(field==='CARMRESTS'){
  const d=body.match(/\b([1-4])\s*-?d\b/);
  const ref=s.split(':',1)[0],r35=ref.match(/^r35k([23])(?:-sb2)?(?:-w\/b)?$/);
  if(/^r55-(?:pol\/)?[bw]\/bpu$|^r55-pol\/[bw]\/bpu$/.test(ref))parts.push('Reguliuojamas porankių aukštis ir atstumas tarp jų, atramos slankioja pirmyn bei atgal ir sukasi per papildomus lankstus');
  else if(r35&&d&&Number(d[1])===(r35[1]==='2'?1:3)+(ref.includes('-sb2')?1:0)){
   parts.push(r35[1]==='2'?(ref.includes('-sb2')?'Reguliuojamas porankių aukštis ir atstumas tarp jų':'Reguliuojamas porankių aukštis'):(ref.includes('-sb2')?'Reguliuojamas porankių aukštis ir atstumas tarp jų, atramos slankioja pirmyn bei atgal ir sukasi':'Reguliuojamas porankių aukštis, atramos slankioja pirmyn bei atgal ir sukasi'));
  }
  else if(d)parts.push('Porankių padėtis reguliuojama '+dimensionWords[d[1]]);
  else if(/fixed/.test(body))parts.push('Fiksuoti porankiai be padėties reguliavimo');
  else if(/integrated with (frame|shell|the backrest)/.test(body))parts.push(/backrest/.test(body)?'Porankiai sujungti su atlošu':/shell/.test(body)?'Porankiai sujungti su kėdės korpusu':'Porankiai sujungti su kėdės rėmu');
  const pad=body.match(/pad:\s*(.*)/)?.[1],material=pad&&materials(pad);
  if(material)parts.push('atramos paviršius – '+material);
  return parts.length?sentence(parts.join('; ')):undefined;
 }
 if(field==='CHEADREST'){
  const d=body.match(/\b([1-4])\s*-?d\b/);
  if(d)parts.push('Galvos atramos padėtis reguliuojama '+dimensionWords[d[1]]);
  else if(/no adjustable|fixed/.test(body))parts.push('Fiksuota galvos atrama be padėties reguliavimo');
  else if(/adjustable/.test(body))parts.push('Galvos atramos padėtį galima reguliuoti');
  if(/mesh/.test(body))parts.push('atramos paviršius iš tinklelio');
  else if(/upholstered/.test(body))parts.push('atrama su apmušalu');
  return parts.length?sentence(parts.join('; ')):undefined;
 }
 if(field==='CLUMBARSUPPORT'){
  if(body==='air shape')return 'Atloše yra keturios oro kameros, pripučiamos po sėdyne esančia pompa. Taip reguliuojamas juosmens srities atrėmimas.';
  if(/height/.test(body))parts.push('Reguliuojamas juosmens atramos aukštis');
  if(/depth/.test(body))parts.push((parts.length?'reguliuojamas':'Reguliuojamas')+' atramos išsikišimas link nugaros');
  if(/pneumatic|pumping/.test(body))parts.push('atrama reguliuojama pripučiant');
  if(/magnetic/.test(body))parts.push('atrama tvirtinama magnetais');
  return parts.length?sentence(parts.join('; ')):undefined;
 }
 if(field==='CCASTORS'||field==='CGLIDES'||field==='FGLIDES'||field==='FCASTORS'){
  if(/soft (?:or|and) hard floors/.test(body))parts.push('Tinka minkštoms ir kietoms grindims');
  else if(/soft floors/.test(body))parts.push('Skirta minkštai grindų dangai, pavyzdžiui, kiliminei');
  else if(/hard floors/.test(body))parts.push('Skirta kietai grindų dangai');
  if(/felt/.test(body))parts.push('apačioje yra veltinis');
  if(/self.level|leveling/.test(body))parts.push(/self.level/.test(body)?'pėdelės prisitaiko prie grindų nelygumų':'pėdelėmis galima išlyginti baldą ant nelygių grindų');
  if(/self.braking/.test(body))parts.push('ratukai turi savaiminio stabdymo funkciją');
  if(/with brakes/.test(body))parts.push('dalis ratukų turi stabdžius');
  const diam=body.match(/(?:diam\.?\s*|ø\s*)(\d+)\s*mm/);if(diam)parts.push('skersmuo – '+diam[1]+' mm');
  if(parts.length)return sentence(parts.join('; '));
  if(field==='CGLIDES')return /teflon/.test(body)?'Atraminės pėdelės su teflonu.':/plastic/.test(body)?'Plastikinės atraminės pėdelės.':/white/.test(body)?'Baltos atraminės pėdelės.':body==='protect'?'Atraminės pėdelės po kėdės kojomis.':undefined;
 }
 if(field==='CGASLIFT'){
  if(/height adjustment/.test(body)&&/manual/.test(body))return 'Kėdės aukštis reguliuojamas rankiniu būdu.';
  if(/pneumatic|telescopic/.test(body)){
   parts.push('Kolonėlė leidžia reguliuoti sėdynės aukštį');
   if(/raised/.test(body))parts.push('tai paaukštintas kolonėlės variantas');
   if(/amortization/.test(body))parts.push('turi sėdynės amortizavimo funkciją');
   if(/500\s*n/.test(body))parts.push('gamintojo nurodyta kėlimo jėga – 500 N');
   return sentence(parts.join('; '));
  }
 }
 if(field==='FDESKTOPTYPE')return /sliding/.test(body)?'Stalviršį galima pastumti.':/folding flap/.test(body)?'Stalviršis fiksuotas, tačiau turi atverčiamą dangtelį.':/folding/.test(body)?'Stalviršį galima atlenkti.':/fixed/.test(body)?'Stalviršis fiksuotas ir neslankioja.':undefined;
 if(field==='FDESKTOPSLIDINGRANGE')return 'Stalviršio slankiojimo eiga – '+body+'.';
 if(field==='CBASE'||field==='CFRAME'||field==='FBASE'){
  if(/bench/.test(body)){const n=body.match(/([2-4]).seater/)?.[1];return n?'Suolas su '+n+' sėdėjimo vietomis.':undefined;}
  if(body==='panel')return 'Stalo pagrindas iš atraminių plokščių.';
  if(/zeta/.test(body))return 'Taburetės pagrindo variantas.';
  if(/5.star/.test(body))parts.push('Penkių stipinų pagrindas');
  else if(/4.star|four.star/.test(body))parts.push('Keturių stipinų pagrindas');
  else if(/4.legs|4 (?:wooden |metal )?legs/.test(body))parts.push('Pagrindą sudaro keturios kojos');
  else if(/double cantilever/.test(body))parts.push('Dvigubas konsolinis rėmas');
  else if(/cantilever/.test(body))parts.push('Konsolinis rėmas be atskirų galinių kojų');
  else if(/round plate/.test(body))parts.push('Apvalios plokštės pagrindas');
  else if(/plate/.test(body))parts.push('Plokštės pagrindas');
  else {const shape=body.match(/^([athiou])(?:-|.type)/);if(shape)parts.push(shape[1].toUpperCase()+' formos kojų arba rėmo konstrukcija');}
  if(/mobile/.test(body))parts.push((parts.length?'pagrindas':'Pagrindas')+' mobilus');
  if(/storage function/.test(body))parts.push('turi vietą daiktams');
  if(/anti.slip rubber/.test(body))parts.push('apačia padengta neslystančia guma');
  return parts.length?sentence(parts.join('; ')):undefined;
 }
 if(/FOAM$/.test(field))return /viscoelastic/.test(body)?'Sėdynėje naudojamas viskoelastinis putplastis.':/injected/.test(body)?'Paminkštinimas pagamintas iš formoje lieto putplasčio.':/cut/.test(body)?'Paminkštinimas pagamintas iš išpjauto putplasčio.'+(/fire retardant/.test(body)?' Pasirinktas sunkiau užsidegantis variantas.':''):/flame retardant|fire retardant/.test(body)?'Pasirinktas sunkiau užsidegantis paminkštinimo variantas.':/polyester/.test(body)?'Paminkštinimo medžiaga – poliesteris.':/standard/.test(body)?'Standartinis šio modelio paminkštinimas.':undefined;
 if(field==='CBACKREST'||field==='CSHELL'||field==='CSEAT'){
  const subject=field==='CBACKREST'?'Atlošas':field==='CSEAT'?'Sėdynė':'Kėdės korpusas';
  if(/mesh/.test(body))parts.push(subject+' su tinkleliu');
  else if(/upholstered|upholstery/.test(body))parts.push(subject+' su apmušalu');
  else if(/wood/.test(body))parts.push(subject+' iš medienos');
  else if(/plastic/.test(body))parts.push(subject+' iš plastiko');
  else if(/plywood/.test(body))parts.push(subject+' iš faneros');
  else if(/chipboard/.test(body))parts.push(subject+' iš medžio drožlių plokštės');
  else if(/metal/.test(body))parts.push(subject+' iš metalo');
  else if(/polyamide/.test(body))parts.push(subject+' iš poliamido');
  if(/springs/.test(body))parts.push('paminkštinime yra spyruoklės');
  if(/plastic cover/.test(body))parts.push('su plastikiniu gaubtu');
  if(/decorative cut.outs/.test(body))parts.push('turi dekoratyvines išpjovas');
  if(/handle/.test(body))parts.push('turi rankeną');
  return parts.length?sentence(parts.join('; ')):undefined;
 }
 if(field==='CSTACKING'){
  if(body==='yes')return 'Kėdes galima sukrauti vieną ant kitos.';
  const count=body.match(/up to (\d+) pieces/),cart=body.match(/up to (\d+) pieces on cart/);
  return count?'Vieną ant kitos galima sukrauti iki '+count[1]+' kėdžių'+(cart?', ant vežimėlio – iki '+cart[1]:'')+'.':undefined;
 }
 if(field==='CCONNECTOR')return 'Jungtis skirta kėdėms sujungti į eilę.'+(/magnetic numb|magnetic numbering/.test(body)?' Turi vietą magnetiniam numeriui.':'');
 if(field==='CFOOTREST')return /ringbase/.test(body)?'Žiedo formos atrama kojoms.':'Atrama kojoms padėti.';
 if(field==='CTABLET')return /left/.test(body)?'Rašymo lentelė kairėje pusėje, skirta kairiarankiams.':/right/.test(body)?'Rašymo lentelė dešinėje pusėje, skirta dešiniarankiams.':undefined;
 if(field==='CASSEMBLY'||field==='FASSEMBLY'||field==='CPACKAGING'||field==='FPACKAGING'){
  if(/unassembled/.test(body))return 'Gaminys pateikiamas nesurinktas.';
  if(/partially/.test(body))return 'Gaminys pateikiamas iš dalies surinktas.'+(/tool.free/.test(body)?' Likusioms dalims surinkti įrankių nereikia.':'');
  if(/fully assembled|product assembled|\bassembled\b/.test(body))return 'Gaminys pateikiamas surinktas.';
 }
 if(/MATERIAL$|BOARDMAT$/.test(field)){
  const material=materials(s);if(material)return 'Medžiaga – '+material+'.';
  if(/^stained beech/.test(body))return /plywood/.test(body)?'Medžiaga – beicuota buko fanera.':'Medžiaga – beicuota buko mediena.';
  if(/^melamine/.test(body))return 'Melaminu dengta medžio drožlių plokštė'+(body.match(/\d+\s*mm/)?.[0]?'; storis – '+body.match(/\d+\s*mm/)![0]:'')+'.';
  if(body==='aluminium powder-coated')return 'Medžiaga – milteliniu būdu dažytas aliuminis.';
  if(/flame retardant polyurethane/.test(body))return 'Sunkiau užsidegantis poliuretano putplastis su antibakterinėmis savybėmis.';
  if(body==='fenix ntm')return 'Matinis, švelnus liesti laminato paviršius.';
 }
 if(field==='FLEGCROSSSECTIONSHAPE')return /round/.test(body)?'Kojos skerspjūvis apvalus.':/square/.test(body)?'Kojos skerspjūvis kvadratinis.':undefined;
 if(field==='FTOPSHAPE')return /l.shape/.test(body)?'Kampinis L formos stalviršis.':/rounded/.test(body)?'Stačiakampis stalviršis su užapvalinimu.' :/rectangular/.test(body)?'Stačiakampio formos stalviršis.':/round/.test(body)?'Apvalus stalviršis.':undefined;
 if(/WIRETRUNKING/.test(field)){
  parts.push(field.includes('HOR')?'Horizontalus lovelis kabeliams po stalviršiu':'Vertikalus kanalas kabeliams');
  if(/foldable on both|foldable on two/.test(body))parts.push('atveriamas iš abiejų pusių');
  else if(/foldable on one/.test(body))parts.push('atveriamas iš vienos pusės');
  if(/flexible/.test(body))parts.push('lankstus');
  if(/magnetic/.test(body))parts.push('tvirtinamas magnetais');
  if(/modular/.test(body))parts.push('sudarytas iš modulių');
  return sentence(parts.join('; '));
 }
 if(/MEDIAPORT/.test(field)&&/grommet|cable outlet/.test(body))return 'Anga kabeliams išvesti per stalviršį.'+(/brush/.test(body)?' Anga uždengta šepetėliu.':'');
 if(/CONFIGURATIONMEDIA/.test(field))return 'Įmontuojamas elektros ir jungčių blokas.';
 if(field==='FDESKTYPE')return /integrated/.test(body)?'Stalas sujungtas su šonine spintele.':'Atskirai pastatomas stalas.';
 if(field==='FPEDESTAL')return 'Po stalviršiu pakabinamas blokas su dviem stalčiais ir veltinio dėklu.';
 if(field==='FGLIDES')return 'Atraminės pėdelės po stalo pagrindu.';
 if(field==='CSTACKINGPROTECTION')return 'Apsauga tarp kėdžių, kai jos sukraunamos viena ant kitos.';
 if(field==='CSDA')return 'Sėdynę galima pastumti pirmyn arba atgal ir taip pakeisti jos gylį.';
 if(field==='CARMPAD'){
  const m=materials(body);if(m)return 'Porankio atramos paviršius – '+m+'.';
  if(/stained beech/.test(body))return 'Porankio atramos paviršius – beicuota buko mediena arba fanera.';
  if(body==='upholstered')return 'Porankio atrama turi apmušalą.';
 }
 if(/EDGETHICKNESS/.test(field)){
  if(/no edge/.test(body))return 'Atskira briaunos juosta nenaudojama; matoma faneros sluoksnių struktūra.';
  const n=body.match(/\d+\s*mm/)?.[0];if(n)return 'Briaunos juostos storis – '+n+'. '+(/laser/.test(body)?'Briauna pritvirtinta lazeriniu būdu.':'Briauna priklijuota.');
 }
 if(field==='CUPHOLSTERINGTYPE')return /fully/.test(body)?'Apmušalu padengiama visa sėdynė ir atlošas.':/front part/.test(body)?'Apmušalu padengiama priekinė kėdės korpuso dalis.':/seat pad and backrest pad/.test(body)?'Paminkštinti sėdynės ir atlošo įdėklai turi apmušalus.':/seat pad/.test(body)?'Apmušalą turi sėdynės įdėklas.':undefined;
 if(field==='FBASEFEET')return /taper/.test(body)?'Stačiakampė, siaurėjanti kojos atraminė dalis.':/chamfered/.test(body)?'Stačiakampė kojos atraminė dalis su nuožulniu galu.':/rectangular/.test(body)?'Stačiakampė kojos atraminė dalis.':undefined;
 if(field==='FCOLUMN')return 'Stačiakampė aukščio reguliavimo kolona'+(/three.segment/.test(body)?' iš trijų segmentų':/two.segment/.test(body)?' iš dviejų segmentų':'')+'.';
 if(field==='CCOLUMN')return 'Viena apvali atraminė kolona.';
 if(field==='FCOLUMNSHAPE')return 'Kvadratinio skerspjūvio atraminė kolona.';
 if(field==='CVERSION')return /fixed to floor/.test(body)?'Baldas tvirtinamas prie grindų.':/freestanding/.test(body)?'Atskirai pastatomas baldas.':/swivel seat/.test(body)?'Sėdynę galima pasukti.':/fixed seat/.test(body)?'Sėdynė fiksuota ir nesisuka.':undefined;
 if(field==='CFIXINGGROUND')return /glued/.test(body)?'Pagrindas prie grindų priklijuojamas.':/screwed/.test(body)?'Pagrindas prie grindų prisukamas.':undefined;
 if(field==='FANTICOLLISION')return 'Pasirinktas variantas su apsauga nuo susidūrimo.';
 if(field==='CBHA')return 'Atlošo aukštį galima reguliuoti.';
 if(field==='CBAGHOLDER')return 'Komplektacijoje yra krepšio laikiklis.';
 if(field==='CPILLOW')return 'Komplektacijoje yra trys apmuštos 480 × 480 mm pagalvėlės.';
 if(field==='CNUMBERINGTYPE')return 'Numatyta vieta magnetiniam sėdėjimo vietos numeriui.';
 if(field==='CMETALLACQUERING')return 'Metalinės dalys padengiamos laku.';
 if(field==='CWOODLACQUERINGUV')return 'Mediena padengiama vandens pagrindo laku.';
 if(field==='CPACKAGING'){
  const n=body.match(/(?:box|pallet).*?[-–]\s*(\d+)\s*items?/)?.[1];
  if(n)return 'Vienoje pakuotėje – '+n+' vnt.';
  if(body==='box')return 'Gaminys pakuojamas į dėžę.';
  if(body==='pallet')return 'Gaminys pakuojamas ant padėklo.';
 }
 if(/SOCKET/.test(field))return /german/.test(body)?'Vokiškojo standarto elektros jungtis.':/european/.test(body)?'Europos standarto elektros jungtis.':undefined;
 if(/MEDIAPORT/.test(field)){
  if(/grommet|cable outlet/.test(body))return /brush/.test(body)?'Kabelių įvadas su šepetėliu.':'Stalviršio įvadas kabeliams prakišti.';
  return 'Stalviršyje montuojamas jungčių modulis.';
 }
 if(field==='FMODULE')return 'Pagrindinis stalo modulis.';
 if(field==='FORGANIZER')return 'Daiktų dėklas dešinėje pusėje.';
 if(field==='FDRAWER')return 'Stalviršyje įmontuotas stalčius su juodos odos apmušalu.';
 if(field==='FTOPACCESSORIES')return 'Lentynėlė dokumentams susidėti.';
 if(field==='FTOPINSERT')return /glass/.test(body)?'Stalviršio įdėklas iš odos ir stiklo.':'Stalviršio įdėklas iš odos.';
 if(field==='FCABLECOVER')return 'Dangtis uždengia kabeliams skirtą vietą.';
 if(field==='FHANDLESIDEBOARD')return 'Metalinė šoninės spintelės rankenėlė.';
 if(field==='FLOCKSIDEBOARD')return 'Cilindrinė spyna su keičiama rakto šerdele; spynos numeris parenkamas atsitiktinai.';
 if(field==='FVERSION')return /without/.test(body)?'Šiame variante nenumatytas viršutinės priekinės pertvaros tvirtinimas.':'Kairysis konstrukcijos variantas.';
 if(field==='FBASICBRACKET')return 'Komplektacijoje yra pagrindinis tvirtinimo laikiklis.';
 if(field==='FPERFORATIONPATTERN')return 'Kvadratinių angų perforavimo raštas.';
 if(/^FSLOTSON/.test(field))return 'Numatytos dvi angos kabeliams arba jungtims.';
 if(field==='CTOPINSTEADOFSEAT')return 'Vietoje sėdynės galima montuoti stalelio paviršių.';
 if(field==='FPANEL'||field==='FPANELSIDE'||field==='FUPPERPANEL'||field==='FMODESTYPANEL'){
  if(/modesty/.test(body))parts.push('Apatinė pertvara po stalviršiu');
  if(/upper|height above the tabletop/.test(body))parts.push((parts.length?'viršutinė':'Viršutinė')+' pertvara virš stalviršio');
  if(!parts.length)parts.push('Pertvara');
  if(/upholstered/.test(body))parts.push('su apmušalu');
  if(/felt/.test(body))parts.push('iš veltinio');
  if(/melamine/.test(body))parts.push('iš melaminu dengtos plokštės');
  if(/perforated steel/.test(body))parts.push('iš perforuoto plieno');
  return sentence(parts.join('; '));
 }
 if(field==='FPANELACCESSORIES')return /organization box/.test(body)?'Dėklas daiktams susidėti.':/inserting pins/.test(body)?'Apmušalu padengti įdėklai, į kuriuos galima smeigti smeigtukus.':'Pertvaros priedai daiktams ir užrašams laikyti.';
 if(field==='CFSC'||field==='FCERTIFICATIONCOC')return /certified forests/.test(body)?'Žaliava iš sertifikuotų miškų; šis variantas skirtas sertifikavimo teisę turinčioms įmonėms.':'Žaliavai taikomi ES prekybos mediena reikalavimai.';
 if(field==='CGLIDES')return /teflon/.test(body)?'Atraminės pėdelės su teflonu.':/plastic/.test(body)?'Plastikinės atraminės pėdelės.':/white/.test(body)?'Baltos atraminės pėdelės.':body==='protect'?'Apsauginės atraminės pėdelės.':undefined;
 return;
}

export function optionExplanation(args:{group:'chairs'|'desks';model:string;field:string;value:string;english:string;label:string;context:string;configuratorUrl:string}):OptionExplanation|undefined{
 const {group,model,field,value,english,label,context,configuratorUrl}=args;
 const media=group==='desks'?verifiedDeskOption(model,field,value):undefined;
 if(!english&&!media)return;
 const curated=group==='chairs'&&field==='CMECHANISM'?mechanisms.find(r=>r.code===value&&r.models.includes(model)):undefined;
 // Retain an existing source-backed explanation identity when a newly verified
 // accessory name adds coverage, so prior human explanation edits still apply.
 const preserved=media?.preserveSourceExplanation&&english&&english!==value?explainManufacturerOption(field,english):undefined;
 const text=preserved||media?.explanation||curated?.suggestedLt||explainManufacturerOption(field,english);
 if(!text)return;
 // Shared only for the same category, field, exact original meaning and verified explanation.
 const meaning=[group,field,normalize(english||media?.english||''),text],id='help:'+createHash('sha256').update(JSON.stringify(meaning)).digest('hex').slice(0,24);
 const sourceUrl=media?.source||(field==='CLUMBARSUPPORT'&&normalize(english)==='air shape'?'https://www.nowystyl.com/en/tiger-up/':field==='CBACKRESTMOVEMECH'||field==='CARMRESTS'&&/^r55-/i.test(english)?'https://www.nowystyl.com/files/doc/WWW_Office-chairs_Technical-details_EXP.pdf#page=20':field==='CARMRESTS'&&/^r35k/i.test(english)?'https://www.nowystyl.com/files/doc/WWW_Office-chairs_Technical-details_EXP.pdf#page=99':normalize(english)==='fenix ntm'?'https://www.nowystyl.com/media/NowyStyl/Files/Finishes_Catalogue_EN-PL-DE-FR_E01_2025.pdf':curated?.sources.at(-1)?.url||configuratorUrl);
 return {id,sourceHash:createHash('sha256').update(JSON.stringify([meaning,curated?.sources||[]])).digest('hex'),role:'Pasirinkimo paaiškinimas',english:english||media?.english||'',polish:'',sourceCode:field+'='+value,suggested:text,context:context+' – '+label+': paaiškinimas',notes:'Trumpas paaiškinimas pagal gamintojo duomenis.',current:[text],modelCount:1,sourceUrl,optionBinding:explanationBinding(field,value)};
}

export function catalogOptionExplanations(){
 const rows=new Map<string,{definition:OptionExplanation;group:'chairs'|'desks';models:{code:string;path:string;name:string}[]}>();
 for(const [model,labels]of Object.entries(explanationSourceModels)){
  const meta=explanationSourceMetadata[model];
  if(!meta||!/^\/produktai\/(?:kedes|rasomieji-stalai-ir-darbo-vietos)\//.test(meta.path))continue;
  const group=meta.path.includes('/kedes/')?'chairs':'desks';
  for(const [binding,english]of Object.entries(labels)){
   const m=binding.match(/^value:([CF][^=]*)=(.*)$/);if(!m)continue;
   const [,field,value]=m;if(/COLOR|CHCOL|COL$|GROUP/.test(field))continue;
   const term=(inventory.terms as Record<string,TextDefinition>)[meta.bindings['field:'+field]];
   const def=optionExplanation({group,model,field,value,english,label:english,context:term?.suggested||labels['field:'+field]||field,configuratorUrl:'https://configurator.nowystyl.com/#ban='+model+'&sid='+model.slice(1,4)+'&ovc='+encodeURIComponent(model+'_OPTIONS.'+field+'='+value)+'&lang=en'});
   if(!def)continue;
   const row=rows.get(def.id)||{definition:def,group,models:[]};
   if(!row.models.some(m=>m.code===model))row.models.push({code:model,path:meta.path,name:meta.name});
   rows.set(def.id,row);
  }
 }
 return [...rows.values()];
}
