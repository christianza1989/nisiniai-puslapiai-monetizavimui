import materialReferences from '../../content/text-review-material-references.json';
import manufacturerEnglish from '../../content/manufacturer-english-review.json';
import verifiedOptionProposals from '../../content/text-review-option-proposals.json';
import {createHash} from 'node:crypto';
import inventoryData from '../../content/text-review-inventory.json';
import {dbAll,dbAtomic} from './text-review-db';
import {publicProductView} from './public-product-copy';
import {studioDescriptionParagraphs,productStudioPresentation} from './product-studio';
import {configurableArticle} from './configuration-article';
import {publishedText,displayedReviewText,suggestedModelTitle,textReviewProposalPreview,textReviewStatus,reviewCounts,customerTextHasCode} from './text-review-state';
import {contentTextKey,type ReviewScope,type ReviewEntry,type TextDefinition,type TextEdit} from './text-review-types';
import {configurationOptionLabel,configurationOptionValue,optionDetails,supplierOptions} from './configuration-labels';
import {createExpandedEngine,fieldLabels,choiceLabel} from './expanded-configurator';
import type {CatalogRuntime} from './catalog-engine';
import type {Product} from './types';
import {optionExplanation,catalogOptionExplanations,type OptionExplanation} from './option-explanations';
import {explanationSourceModels,legacyExplanationModels} from './option-explanation-sources';
import {manufacturerOptionName} from './manufacturer-option-names';

type Inventory={at:string;terms:Record<string,TextDefinition>;models:Record<string,{productId:string;sample:string;name:string;path:string;sourceUrl:string;bindings:Record<string,string>;current:Record<string,string>;inventoryComplete:boolean;configuratorComplete?:boolean}>};
const inventory=inventoryData as unknown as Inventory;
const utilaCatalogueLabel={
 text:'Plastic elements colour – lumbar support',
 sourceUrl:'https://s3.eu-west-1.amazonaws.com/alphayourspace.s3-assets.com/brochures/AMD_Alpha_NowyStyl_Brochure_2024-Offit.pdf#page=20',
};
const deskCategory='rasomieji-stalai-ir-darbo-vietos';
const materialByModel:Record<string,Record<string,string>>=materialReferences.models;
const englishByModel:Record<string,Record<string,string>>=manufacturerEnglish.models;
const englishByBinding={chairs:new Map<string,Set<string>>(),desks:new Map<string,Set<string>>()};
const usage=new Map<string,{chairs:number;desks:number}>();
const proposalsByEnglish={chairs:new Map<string,Set<string>>(),desks:new Map<string,Set<string>>()};
const normalizeEnglish=(text:string)=>text.trim().replace(/\s+/g,' ').toLowerCase();
const helpUsage=new Map<string,number>();
function helpModelCount(def:OptionExplanation,group:'chairs'|'desks'){
 if(!helpUsage.size)for(const row of catalogOptionExplanations())helpUsage.set(row.definition.id,row.models.length);
 return helpUsage.get(def.id)||1;
}
const proposalsBySource:Record<string,Record<string,string>>=verifiedOptionProposals;
// Translate the material description while retaining the supplier's collection name.
const englishProposals=new Map([
 ['basic fabric c','Bazinis audinys C'],
 ['leather imitation v','Dirbtinė oda V'],
 ['fine leather le','Aukštos kokybės oda LE'],
 ['fine leather sd','Aukštos kokybės oda SD'],
 ['fine leather le front','Aukštos kokybės oda LE (priekinė pusė)'],
 ['leather nappa','Nappa oda'],
 ['polyester','Poliesteris'],
 ['arf-g/gr: fixed, arm: light grey polyamide, pad: dark grey polypropylene','Fiksuoti porankiai. Korpusas iš šviesiai pilko poliamido, atramos iš tamsiai pilko polipropileno'],
 ['pack-a1: partially assembled, compact cardboard packaging','Dalinai surinkta, kompaktiškoje kartoninėje pakuotėje'],
 ['backrest frame upholstered with upholstered pad, low','Žemas atlošas su apmuštu rėmu ir paminkštinimu'],
 ['mf mesh','MF tinklelis'],
 ['mesh, high','Aukštas tinklinis atlošas'],
 ['backrest frame upholstered with 3d fabric, high','Aukštas atlošas su 3D audiniu aptrauktu rėmu'],
 ['anodised aluminium silver matt asam','Matinis sidabrinis anoduotas aliuminis'],
 ['1.007 beech 0c','Buko apdaila'],
 ['plastic (pp), decorative cut-outs','Polipropileno atlošas su dekoratyvinėmis išpjovomis'],
 ['integrated with frame, back open, metal','Metaliniai porankiai, sujungti su rėmu, atviri gale'],
 ['polyamide','Poliamidas'],
 ['u963 dark grey','Tamsiai pilka'],
 ['ral 9006 white aluminium al, alu, wa, x','Balto aliuminio spalva'],
 ['insert – upholstered with plastic see-through cover','Apmuštas intarpas su skaidriu plastikiniu gaubtu'],
 ['hocker, 4-legs','Keturių kojų taburetė'],
 ['plastic','Plastikas'],
 ['ral 9005 jet black cz, bl, y','Sodri juoda'],
 ['integrated with the backrest','Su atlošu sujungti porankiai'],
 ['wooden, upholstered seat pad, low backrest','Medinis korpusas su paminkštinta sėdyne ir žemu atlošu'],
 ['ringbase','Kojų atramos žiedas'],
 ['box - 1 items','Dėžė, 1 vnt.'],
 ['ncs s 2005-y60r cashmere nk','Kašmyro spalva'],
 ['ral 5000 violet blue vb','Violetiškai mėlyna'],
 ['ral 6003 olive green og','Alyvuogių žalia'],
 ['ral 1024 ochre yellow oy','Ochros geltona'],
 ['ral 030 50 40 vermilion red vr','Cinoberio raudona'],
 ['ral 7016 anthracite grey ah','Antracito pilka'],
 ['ral 9016 traffic white bi, wt, w','Ryški balta'],
 ['op mesh','OP tinklelis'],
 ['nts02 dark grey','Tamsiai pilka'],
 ['nts01 black','Juoda'],
 ['gl-r2: pneumatic, raised','Paaukštinta dujinė pakėlimo kolonėlė'],
 ['ringbase, chromium plated steel','Chromuoto plieno kojų atramos žiedas'],
 ['gb59: for soft or hard floors','Minkštoms arba kietoms grindims'],
 ['pack-asm: fully assembled, cardboard packaging','Visiškai surinkta, kartoninėje pakuotėje'],
 ['bl - aluminium powder-coated in black','Juodai milteliniu būdu dažytas aliuminis'],
 ['chrome cr, z','Chromuota apdaila'],
 ['polished aluminium pol','Poliruotas aliuminis'],
 ['cantilever','Konsolinis rėmas'],
 ['integrated with frame, closed, metal','Uždari metaliniai porankiai, sujungti su rėmu'],
 ['polyurethane','Poliuretanas'],
 ['upholstered, stitching in a wave-shaped, plastic cover','Apmuštas atlošas su banguotomis siūlėmis ir plastikiniu gaubtu'],
 ['black','Juoda'],
 ['xngr grey f110','Pilka'],
 ['light grey','Šviesiai pilka'],
 ['sknb natural beech','Natūralus bukas'],
 ['polypropylene','Polipropilenas'],
 ['bl black','Juoda'],
 ['box - 4 items','Dėžė, 4 vnt.'],
 ['integrated with frame, pad: plywood','Su rėmu sujungti porankiai su faneros atramomis'],
 ['backrest frame upholstered with 3d fabric, low','Žemas atlošas su 3D audiniu aptrauktu rėmu'],
 ['upholstered, high, plastic cover','Apmuštas aukštas atlošas su plastikiniu gaubtu'],
 ['plywood, low','Žemas faneros atlošas'],
 ['me-wm: self-tension synchronous','Sinchroninis mechanizmas su automatiniu pasipriešinimo reguliavimu'],
 ['arf-b/b: fixed, arm: black polyamide, pad: black polypropylene','Fiksuoti porankiai. Korpusas iš juodo poliamido, atramos iš juodo polipropileno'],
 ['integrated with frame, closed, plastic, with antibacterial properties','Uždari antibakterinio plastiko porankiai, sujungti su rėmu'],
 ['plastic, upholstered seat and backrest pads','Plastikinis korpusas su apmuštais sėdynės ir atlošo įdėklais'],
 ['pack-asm: 1 item, fully assembled','1 vnt., visiškai surinktas'],
 ['aluminium rectangular cable outlet with brush','Stačiakampė aliumininė kabelių anga su šepetėliu'],
 ['plastic, oval grommet','Ovali plastikinė kabelių anga'],
 ['2x plastic, oval grommet','2 ovalios plastikinės kabelių angos'],
 ['2x aluminium rectangular cable outlet with brush','2 stačiakampės aliumininės kabelių angos su šepetėliu'],
 ['rectangular (90x60 mm) - three-segment','Trijų segmentų stačiakampė kolona (90 × 60 mm)'],
 ['rectangular with rounded corners','Stačiakampis, užapvalintais kampais'],
 ['foldable on one side, steel','Plieninis kabelių lovelis, atveriamas iš vienos pusės'],
 ['foldable on both sides, aluminium','Aliumininis kabelių lovelis, atveriamas iš abiejų pusių'],
 ['2x foldable on one side, steel','2 plieniniai kabelių loveliai, atveriami iš vienos pusės'],
 ['control panel with display and memory function (4 position)','Valdymo pultelis su ekranu ir 4 aukščio padėčių atmintimi'],
 ['2x control panel with display and memory function','2 valdymo pulteliai su ekranais ir aukščio padėčių atmintimi'],
 ['t-leg','T formos koja'],
 ['suspended with two drawers, felt organizer','Pakabinamas dviejų stalčių blokas su veltinio dėklu'],
 ['organization box','Daiktų dėklas'],
 ['upholstered, plastic cover','Su apmušalu ir plastikiniu gaubtu'],
 ['upholstered with springs, plastic cover','Su apmušalu, spyruoklėmis ir plastikiniu gaubtu'],
 ['plastic with felt','Plastikas su veltiniu'],
 ['gbp: self-leveling, for soft floors','Savaime išsilyginančios pėdelės minkštoms grindims'],
 ['gbpf: self-leveling, for hard floors, with felt','Savaime išsilyginančios pėdelės su veltiniu kietoms grindims'],
 ['eshh60: diam. 60 mm, for hard floors','60 mm ratukai kietoms grindims'],
 ['er-st: advanced synchronous, seat depth adjustment','Sinchroninis mechanizmas su sėdynės gylio reguliavimu'],
 ['ern-st: advanced synchronous, seat depth adjustment, negative seat inclination','Sinchroninis mechanizmas su sėdynės gylio reguliavimu ir palenkimu į priekį'],
 ['sa3-st: synchronous with automatic weight adjustment, seat depth adjustment','Sinchroninis mechanizmas, automatiškai prisitaikantis prie svorio, su sėdynės gylio reguliavimu'],
 ['gl-500n: pneumatic, with higher filling pressure (500 n)','Dujinė pakėlimo kolonėlė su didesne kėlimo jėga (500 N)'],
 ['gl-40.55: telescopic, compliant with npr 1813 norm','Teleskopinė pakėlimo kolonėlė, atitinkanti NPR 1813'],
 ['gb: for soft floors','Pėdelės minkštoms grindims'],
 ['gbf: for hard floors, with felt','Pėdelės su veltiniu kietoms grindims'],
 ['sh: diam. 50 mm, for soft floors, self-braking','50 mm savaime stabdantys ratukai minkštoms grindims'],
 ['shh: diam. 50 mm, for hard floors, self-braking','50 mm savaime stabdantys ratukai kietoms grindims'],
 ['gl-std: pneumatic, standard, black','Standartinė juoda dujinė pakėlimo kolonėlė'],
 ['esh60: diam. 60 mm, for soft floors, black','Juodi 60 mm ratukai minkštoms grindims'],
 ['eshh60: diam. 60 mm, for hard floors, black','Juodi 60 mm ratukai kietoms grindims'],
 ['integrated with frame, front open, metal','Priekyje atviri metaliniai porankiai, sujungti su rėmu'],
 ['synchronous, depth adjustment','Sinchroninis mechanizmas su sėdynės gylio reguliavimu'],
 ['box - 2 items','Dėžė, 2 vnt.'],
 ['4-legs','Keturios kojos'],
 ['double cantilever','Dvigubas konsolinis rėmas'],
 ['footbase','Pagrindas kojoms atremti'],
 ['plastic, upholstered seat pads, decorative cut-outs','Plastikinis korpusas su apmuštais sėdynės įdėklais ir dekoratyvinėmis išpjovomis'],
 ['plastic, upholstered seat pads','Plastikinis korpusas su apmuštais sėdynės įdėklais'],
 ['chromium plated steel','Chromuotas plienas'],
 ['powder-coated steel','Milteliniu būdu dažytas plienas'],
 ['low hocker, 4 metal legs','Žema taburetė su keturiomis metalinėmis kojomis'],
 ['box - 1 item, product assembled','Dėžė, 1 surinktas gaminys'],
 ['flame retardant polyurethane foam, with antibacterial properties','Sunkiai užsidegantis antibakterinis poliuretano putplastis'],
 ['veneered plywood','Lukštu dengta fanera'],
 ['upholstered, chipboard seat base','Apmušta sėdynė su medžio drožlių plokštės pagrindu'],
 ['melamine (mfc) 12 mm','12 mm melaminu dengta medžio drožlių plokštė'],
 ['tilt: seat depth adjustment','TILT mechanizmas su sėdynės gylio reguliavimu'],
 ['hocker, zeta','„Zeta“ taburetė'],
 ['gf46.58gt: pneumatic, raised','Paaukštinta dujinė pakėlimo kolonėlė'],
 ['gfk06gt: pneumatic, seat amortization function','Dujinė pakėlimo kolonėlė su sėdynės amortizacija'],
 ['wooden, upholstered seat pad, decorative cut-outs and handle','Medinis korpusas su apmuštu sėdynės įdėklu, dekoratyvinėmis išpjovomis ir rankena'],
 ['wooden, decorative cut-outs','Medinis korpusas su dekoratyvinėmis išpjovomis'],
 ['hocker, double metal cantilever','Taburetė su dvigubu metaliniu konsoliniu rėmu'],
 ['hocker, cantilever base','Taburetė su konsoliniu pagrindu'],
 ['manual, with height adjustment','Rankinis aukščio reguliavimas'],
 ['beech wood','Buko mediena'],
 ['imitation leather','Dirbtinė oda'],
 ['stacking spacers','Tarpikliai kėdėms sukrauti'],
 ['up to 10 pieces/ up to 25 pieces on cart','Iki 10 vnt., ant vežimėlio – iki 25 vnt.'],
 ['bench 2-seater','Dvivietis suolas'],
 ['backrest frame upholstered with 3d fabric','Atlošo rėmas aptrauktas 3D audiniu'],
 ['4 wooden legs with metal elements','Keturios medinės kojos su metalinėmis detalėmis'],
 ['wooden bench with metal connector, 2-seater','Dvivietis medinis suolas su metaline jungtimi'],
 ['pneumatic, standard, grey','Standartinė pilka dujinė pakėlimo kolonėlė'],
 ['pneumatic, standard, black','Standartinė juoda dujinė pakėlimo kolonėlė'],
 ['upholstered, medium high, plastic cover','Apmuštas vidutinio aukščio atlošas su plastikiniu gaubtu'],
 ['plywood, upholstered pad','Fanera su apmuštu įdėklu'],
 ['polypropylene bottom part covered with anti-slip rubber (up&down)','Polipropileno pagrindo apačia padengta neslystančia guma'],
]);
const armrestProposals=new Map([
 ['fixed, plastic','Fiksuoti plastikiniai porankiai'],
 ['fixed, plastic, black','Fiksuoti juodi plastikiniai porankiai'],
 ['fixed, black','Fiksuoti juodi porankiai'],
 ['fixed, grey','Fiksuoti pilki porankiai'],
 ['integrated with shell, plastic','Plastikiniai porankiai, sujungti su korpusu'],
 ['integrated with frame','Porankiai, sujungti su rėmu'],
 ['pf27-cr: fixed, arm: steel chromium plate, pad: upholstery','Fiksuoti chromuoto plieno porankiai su apmuštomis atramomis'],
]);
const proposalsByBinding={chairs:new Map<string,Set<string>>(),desks:new Map<string,Set<string>>()};
for(const [code,m] of Object.entries(inventory.models)){
 const group=m.path.startsWith('/produktai/'+deskCategory+'/')?'desks':'chairs';
 for(const [binding,text] of Object.entries(englishByModel[code]||{})){
  if(!binding.startsWith('field:')&&!binding.startsWith('value:'))continue;
  const labels=englishByBinding[group].get(binding)||new Set<string>();
  labels.add(text);englishByBinding[group].set(binding,labels);
 }
 for(const [binding,id] of Object.entries(m.bindings)){
  const term=inventory.terms[id],proposal=term?.suggested;
  if(!proposal)continue;
  const proposals=proposalsByBinding[group].get(binding)||new Set<string>();
  proposals.add(proposal);proposalsByBinding[group].set(binding,proposals);
  const english=englishByModel[code]?.[binding]||term.english;
  if(english){
   const key=binding.split(':',1)[0]+':'+normalizeEnglish(english);
   const matches=proposalsByEnglish[group].get(key)||new Set<string>();
   matches.add(proposal);proposalsByEnglish[group].set(key,matches);
  }
 }
 for(const id of new Set(Object.values(m.bindings))){
  const counts=usage.get(id)||{chairs:0,desks:0};
  counts[group]++;usage.set(id,counts);
 }
}
export function sharedTextKey(category:string,id:string){
 const counts=usage.get(id);
 return counts?.chairs&&counts.desks?'category:'+(category===deskCategory?'desks':'chairs')+':'+id:id;
}
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const localTextKey=(model:string,id:string)=>'local:'+model+':'+id;
export const productTextScope=(p:Product)=>p.id+':'+(p.modelConfigurationId||'line');
const englishModelWords=/\b(?:chairs?|armchairs?|tables?|desks?|stools?|sofas?|benches?|cabinets?|pedestals?|screens?|partitions?|seating|storage|pouffes?)\b/i;
export function contentDefinitions(p:Product):TextDefinition[]{
 const v=publicProductView(p),original=publicProductView({...p,textReviewHeading:undefined}),scope=productTextScope(p),out:TextDefinition[]=[];
 const sample=p.configurations.find(c=>c.id===p.modelConfigurationId);
 const supplierTitle=sample?.sourceDescription||sample?.description||'';
 const englishTitle=englishModelWords.test(supplierTitle)?supplierTitle:'';
 const put=(kind:string,text:string,context:string,source=text,suggested=text)=>{if(!text?.trim())return;out.push({id:contentTextKey(scope,kind),sourceHash:hash(source),role:'Produkto tekstas',english:kind==='title'?englishTitle:kind==='description:0'?p.sourceDescription||'':'',polish:'',sourceCode:'',suggested,context,notes:'',current:[text],modelCount:1});};
 const title=v.publicHeading||v.name;
 put('title',title,'Produkto pavadinimas',original.publicHeading||original.name,suggestedModelTitle(p,title));
 studioDescriptionParagraphs(v.description).forEach((s,i)=>put('description:'+i,s,'Aprašymo pastraipa '+(i+1)));
 const intro=configurableArticle(v)?.intro||v.modelArticle?.paragraphs||[];
 productStudioPresentation(v,intro).overview.forEach((s,i)=>put('intro:'+i,s,'Įžangos pastraipa '+(i+1)));
 return out;
}
export async function allTextEdits(){return new Map((await dbAll<TextEdit>('SELECT * FROM text_review_edits')).map(r=>[r.key,r]));}
export function inventoryModels(){return inventory.models;}
export function inventoryTerms(){return inventory.terms;}
export async function reviewProductForCode(code:string){
 const m=inventory.models[code];
 const {catalogAsync}=await import('./catalog'),{modelProduct}=await import('./product-models');
 const p=(await catalogAsync()).products.find(p=>m?p.id===m.productId:p.configurations.some(c=>c.code===code)),c=p?.configurations.find(c=>(!m||c.id===m.sample)&&c.code===code);
 return p&&c?modelProduct(p,c):undefined;
}
function modelFor(p:Product){return p.configurations.find(c=>c.id===p.modelConfigurationId)?.code||p.configurations.find(c=>c.code)?.code||productTextScope(p);}
export async function buildReviewScope(p:Product,providedEdits?:Map<string,TextEdit>,runtime?:CatalogRuntime):Promise<ReviewScope>{
 const globalKey=(id:string)=>sharedTextKey(p.categorySlug,id);
 const group=p.categorySlug===deskCategory?'desks':'chairs';
 const scope=productTextScope(p),model=modelFor(p),known=inventory.models[model],defs=contentDefinitions(p);
 const codes=[...new Set(p.configurations.map(c=>c.code).filter((c):c is string=>!!c&&!!inventory.models[c]))];
 if(known&&!codes.includes(model))codes.unshift(model);
 const bindings=Object.fromEntries(codes.map(code=>[code,inventory.models[code].bindings]));
 const terms=new Map<string,TextDefinition>();
 const modelBindings={...bindings[model]};
 const config=p.configurations.find(c=>c.id===p.modelConfigurationId);
 const directProposal=(binding:string,english:string)=>{
  const stacking=binding.startsWith('value:CSTACKING=')&&english.match(/^Up to (\d+) pieces$/i);
  if(stacking)return 'Iki '+stacking[1]+' vnt.';
  const normalized=normalizeEnglish(english);
  const verified=proposalsBySource[binding]?.[normalized];
  if(verified)return verified;
  const sourceName=manufacturerOptionName(binding,english);if(sourceName)return sourceName;
  if(normalized==='fixed'&&binding.startsWith('value:CARMRESTS='))return 'Fiksuoti';
  const armrest=binding.startsWith('value:CARMRESTS=')&&armrestProposals.get(normalized);
  if(armrest)return armrest;
  if(/^value:C(?:FRAME|BASE)=/.test(binding)){
   const base=normalized.match(/^diam\. (\d+) mm, 5-star, (black|grey) polyamide(?: \([^)]+\))?$/);
   if(base)return 'Penkių stipinų pagrindas iš '+(base[2]==='black'?'juodo':'pilko')+' poliamido, '+base[1]+' mm skersmens';
  }
  if(binding.startsWith('value:CCASTORS=')){
   const castors=normalized.match(/^diam\. (\d+) mm, plastic, (black|grey)$/);
   if(castors)return (castors[2]==='black'?'Juodi':'Pilki')+' plastikiniai '+castors[1]+' mm ratukai';
  }
  if(binding.startsWith('value:CBACKREST=')&&normalized==='upholstered, medium high')return 'Apmuštas vidutinio aukščio atlošas';
  if(binding.startsWith('value:CSHELL=')&&normalized==='upholstered, low')return 'Žemas apmuštas korpusas';
  if(normalized==='injected'&&/^value:[^=]*FOAM=/.test(binding))return 'Lietas putplastis';
  if(binding==='value:FDESKTOPTYPE=FIXEDTOP'&&normalized==='fixed')return 'Fiksuotas stalviršis';
  if(binding==='value:FDESKTOPTYPE=SLIDINGTOP'&&normalized==='sliding')return 'Slankiojantis stalviršis';
  if(binding==='value:FVERWIRETRUNKING=VERTICALFLEXIBLEMODPLA'&&normalized==='flexible, modular, plastic')return 'Lankstus modulinis plastikinis kabelių kanalas';
  if(binding==='value:FVERWIRETRUNKING=VERTICALFLXMODMAGNET'&&normalized==='flexible, modular, magnetic, plastic')return 'Lankstus modulinis plastikinis kabelių kanalas su magnetais';
  return englishProposals.get(normalized);
 };
 const proposalFor=(binding:string,text:string)=>{
  const proposals=proposalsByBinding[group].get(binding);
  const references=englishByBinding[group].get(binding);
  const english=englishByModel[model]?.[binding]||materialByModel[model]?.[binding]||(references?.size===1?[...references][0]:text);
  const verified=proposalsBySource[binding]?.[normalizeEnglish(english)];
  if(verified)return verified;
  const sourceName=manufacturerOptionName(binding,english);if(sourceName)return sourceName;
  const sameEnglish=proposalsByEnglish[group].get(binding.split(':',1)[0]+':'+normalizeEnglish(english));
  return proposals?.size===1?[...proposals][0]:sameEnglish?.size===1?[...sameEnglish][0]:directProposal(binding,english);
 };
 const add=(binding:string,role:string,context:string,text:string,sourceCode:string,presetProposal?:string)=>{
  if(modelBindings[binding])return;
  const id='runtime:'+model+':'+binding;
  modelBindings[binding]=id;
  const suggested=proposalFor(binding,text)||presetProposal||text;
  terms.set(id,{id,sourceHash:hash([binding,text]),role,english:'',polish:'',sourceCode,suggested,context,notes:'',current:[text],modelCount:1});
 };
 if(p.modelConfigurationId&&(runtime||legacyExplanationModels.has(model))){
  const engine=createExpandedEngine(runtime),state=engine.initialStateForProduct(p);
  const choices=new Map<string,Set<string>>();
  function include(source?:Record<string,string[]|null>){
   for(const [field,values] of Object.entries(source||{})){
    if(!values)continue;
    const choicesForField=choices.get(field)||new Set<string>();
    for(const value of values)choicesForField.add(value);
    choices.set(field,choicesForField);
   }
  }
  include(engine.stateChoices(state));
  if(!runtime)for(const anchor of engine.expandedForProduct(p)?.anchors||[]){
   include(anchor.choices);for(const profile of anchor.profiles||[])include(profile.choices);
  }
  for(const anchor of runtime?.family.anchors.filter(a=>a.article===model)||[]){
   include(anchor.choices);
   for(const profile of anchor.profiles)include(profile.choices);
   for(const component of anchor.components)for(const variant of component.variants){include(variant.choices);include(variant.dependentChoices);}
  }
  for(const [field,values] of choices){
   // Legacy finish palettes already have their own editor. Do not expand every
   // colour into this structural-help scope on each page request.
   if(!runtime&&/COLOR|CHCOL|COL$|GROUP/.test(field))continue;
   const label=runtime?.palettes._fieldLabels?.[field]?.text||fieldLabels[field]||field;
   add('field:'+field,'Lauko pavadinimas',label,label,field);
   for(const value of values)add('value:'+field+'='+value,'Parinktis',label,engine.choiceLabel(field,value,runtime?.palettes,state.family),field+'='+value,manufacturerOptionName('value:'+field+'='+value,runtime?.palettes[field]?.[value]?.text||''));
  }
 }
 if(config){
  for(const option of supplierOptions(config)){
   const equals=option.indexOf('=');
   if(equals<1)continue;
   const field=option.slice(0,equals).split('.').at(-1)!,value=option.slice(equals+1);
   if(!field||!value)continue;
   const fieldBinding='field:'+field,valueBinding='value:'+field+'='+value;
   const title=configurationOptionLabel(field)||fieldLabels[field]||field;
   if(title!==field||proposalFor(fieldBinding,title))add(fieldBinding,'Lauko pavadinimas',title,title,field);
   const text=configurationOptionValue(value)||choiceLabel(field,value);
   if(text!==value||proposalFor(valueBinding,text))add(valueBinding,'Parinktis',title,optionDetails([option])[0]?.value||value,field+'='+value,text);
  }
 }
 for(const [binding,text] of Object.entries(materialByModel[model]||{})){
  const sourceCode=binding.slice('value:'.length),field=sourceCode.split('=',1)[0];
  const labelId=modelBindings['field:'+field],label=terms.get(labelId)||inventory.terms[labelId];
  add(binding,'Parinktis',label?.suggested||fieldLabels[field]||field,text,sourceCode);
 }
 const modelEnglish=Object.entries(englishByModel[model]||{});
 for(const [binding,english] of modelEnglish){
  if(!binding.startsWith('field:'))continue;
  const proposal=proposalsBySource[binding]?.[normalizeEnglish(english)];
  if(proposal)add(binding,'Lauko pavadinimas',proposal,english,binding.slice('field:'.length),proposal);
 }
 for(const [binding,english] of modelEnglish){
  if(!/^value:[CF]/.test(binding))continue;
  const proposal=directProposal(binding,english);if(!proposal)continue;
  const sourceCode=binding.slice('value:'.length),field=sourceCode.split('=',1)[0];
  const labelId=modelBindings['field:'+field],label=terms.get(labelId)||inventory.terms[labelId];
  if(!labelId&&!configurationOptionLabel(field)&&!fieldLabels[field])continue;
  add(binding,'Parinktis',label?.suggested||configurationOptionLabel(field)||fieldLabels[field],english,sourceCode,proposal);
 }
 const helpDefs=new Map<string,OptionExplanation>();
 if(textReviewProposalPreview())for(const binding of Object.keys(modelBindings)){
  const match=binding.match(/^value:([^=]+)=(.*)$/);if(!match)continue;
  const [,field,value]=match,def=terms.get(modelBindings[binding])||inventory.terms[modelBindings[binding]];
  const label=def?.suggested||def?.current[0]||value,context=def?.context||fieldLabels[field]||field;
  const help=optionExplanation({group,model,field,value,english:explanationSourceModels[model]?.[binding]||def?.english||'',label,context,configuratorUrl:config?.configurator||''});
  if(help){terms.set(help.id,help);helpDefs.set(help.id,help);modelBindings[help.optionBinding]=help.id;}
 }
 if(Object.keys(modelBindings).length){bindings[model]=modelBindings;if(!codes.includes(model))codes.push(model);}
 defs.push(...[...new Set(Object.values(modelBindings))].map(id=>terms.get(id)||inventory.terms[id]).filter(Boolean));
 let edits=providedEdits;
 if(!edits){
  edits=new Map();
  if(terms.size)for(const row of await dbAll<TextEdit>('SELECT * FROM text_review_edits WHERE key GLOB ?', 'runtime:'+model+':*'))if(terms.has(row.key))edits.set(row.key,row);
  const keys=[...new Set([...defs.map(d=>globalKey(d.id)),...codes.flatMap(code=>Object.values(bindings[code]).flatMap(id=>[globalKey(id),localTextKey(code,id)]))])].filter(key=>!key.startsWith('runtime:')&&!key.includes(':runtime:'));
  for(let i=0;i<keys.length;i+=70){const batch=keys.slice(i,i+70);for(const row of await dbAll<TextEdit>('SELECT * FROM text_review_edits WHERE key IN ('+batch.map(()=>'?').join(',')+')',...batch))edits.set(row.key,row);}
 }
 const values:Record<string,string>={};
 for(const code of codes)for(const id of new Set(Object.values(bindings[code]))){
  const def=terms.get(id)||inventory.terms[id];if(!def)continue;
  const local=edits.get(localTextKey(code,id)),global=edits.get(globalKey(id));
  const fallback=displayedReviewText(def,global,'');
  const value=local?displayedReviewText(def,local,fallback):fallback;
  if(value)values[code+':'+id]=value;
 }
 for(const d of defs.filter(d=>d.role==='Produkto tekstas')){const value=displayedReviewText(d,edits.get(d.id),'');if(value)values[d.id]=value;}
 const optionCodesByTerm=new Map<string,string[]>(),englishByTerm=new Map<string,Set<string>>(),referenceByTerm=new Map<string,Set<string>>();
 for(const [binding,id] of Object.entries(modelBindings)){
  const english=englishByModel[model]?.[binding]||materialByModel[model]?.[binding];
  if(english){
   const labels=englishByTerm.get(id)||new Set<string>();
   labels.add(english);englishByTerm.set(id,labels);
  }
  const references=englishByBinding[group].get(binding);
  if(references?.size===1){
   const labels=referenceByTerm.get(id)||new Set<string>();
   labels.add([...references][0]);referenceByTerm.set(id,labels);
  }
  if(!binding.startsWith('value:'))continue;
  const codes=optionCodesByTerm.get(id)||[];
  codes.push(binding.slice('value:'.length));
  optionCodesByTerm.set(id,codes);
 }
 const entries:ReviewEntry[]=defs.map(def=>{
  const shared=def.role!=='Produkto tekstas'&&(!terms.has(def.id)||helpDefs.has(def.id)),global=edits!.get(globalKey(def.id)),local=shared?edits!.get(localTextKey(model,def.id)):undefined;
  const edit=local||global,baseStatus=textReviewStatus(def,edit);
  const originalText=shared?known?.current[def.id]||def.current[0]||def.sourceCode:def.current[0];
  const currentText=publishedText(def,local,publishedText(def,global,originalText));
  const customerNameRequired=customerTextHasCode(def,currentText),status=baseStatus==='approved'&&customerTextHasCode(def,edit?.state==='kept'?currentText:edit?.draft||currentText)?'changed':baseStatus;
  const sourceConfig=config||p.configurations.find(c=>c.code===model);
  const isPublished=status==='approved'&&(edit?.state==='kept'||edit?.published_hash===def.sourceHash&&edit.published===edit.draft);
  const originalEnglish=(def.id.endsWith(':title')?englishByModel[model]?.title:[...englishByTerm.get(def.id)||[]].join(' · '))||def.english;
  const catalogueLabel=!originalEnglish&&/^KUTI(?:003WW001|004WW00[12])$/.test(model)&&def.sourceCode==='CLUMBARPLASTICCOLOR'?utilaCatalogueLabel:undefined;
  const englishReference=originalEnglish||catalogueLabel?'':[...referenceByTerm.get(def.id)||[]].join(' · ');
  return {...def,english:originalEnglish||catalogueLabel?.text||englishReference,englishCatalogueUrl:catalogueLabel?.sourceUrl,englishReference:!!englishReference,currentText,optionCodes:helpDefs.has(def.id)?[def.sourceCode]:optionCodesByTerm.get(def.id),customerNameRequired,edit,globalEdit:global,status,published:!!isPublished,key:local?.key||globalKey(def.id),shared,model,sourceUrl:helpDefs.get(def.id)?.sourceUrl||p.sourceUrl,configuratorUrl:sourceConfig?.configurator||'',affected:helpDefs.has(def.id)?helpModelCount(helpDefs.get(def.id)!,group):shared?(usage.get(def.id)?.[p.categorySlug===deskCategory?'desks':'chairs']||1):1};
 });
 const originals=Object.fromEntries(defs.filter(d=>d.role==='Produkto tekstas').map(d=>[d.id,d.current[0]]));
 return {publicScope:{scope,model,bindings,values,originals},entries,productId:p.id,model,title:publicProductView(p).publicHeading||p.name,path:'/produktai/'+p.categorySlug+'/'+p.slug+'/',complete:!!known?.inventoryComplete,...reviewCounts(entries),inventoryAt:inventory.at,proposalPreview:textReviewProposalPreview()};
}
export type ReviewAction='draft'|'approve'|'keep'|'publish'|'unpublish';
export class ReviewConflict extends Error{}
export async function mutateText(def:TextDefinition,args:{key:string;sourceHash:string;expectedRevision:number;text?:string;action:ReviewAction}){
 if(args.sourceHash!==def.sourceHash)throw new ReviewConflict('Pasikeitė teksto šaltinis. Atnaujinkite puslapį.');
 if(!Number.isSafeInteger(args.expectedRevision)||args.expectedRevision<0)throw Error('Neteisinga teksto versija.');
 const prior=await dbAll<TextEdit>('SELECT * FROM text_review_edits WHERE key=?',args.key);
 const previous=prior[0];
 if((previous?.revision||0)!==args.expectedRevision)throw new ReviewConflict('Šį tekstą jau pakeitė kita sesija. Atnaujinkite įrašą.');
 let text=(args.text??previous?.draft??'').trim();
 if(args.action==='keep'&&customerTextHasCode(def,(def as Partial<ReviewEntry>).currentText||def.current[0]||''))throw Error('Klientui reikia pavadinimo be gamintojo kodo. Įrašykite pavadinimą.');
 if(['approve','publish'].includes(args.action)&&customerTextHasCode(def,text))throw Error('Pašalinkite gamintojo ar parinkties kodą iš klientui skirto teksto.');
 if(args.action!=='keep'&&args.action!=='unpublish'&&(!text||text.length>12000||/<[^>]*>|\[\[(?:open|close|void)/.test(text)))throw Error('Įrašykite tekstą be HTML žymų (iki 12 000 ženklų).');
 if(def.id.endsWith(':title')&&text.length>250)throw Error('Pavadinimas gali būti iki 250 ženklų.');
 if(def.role!=='Produkto tekstas'&&text.length>500)throw Error('Parinkties tekstas gali būti iki 500 ženklų.');
 if(/Nowy\s*Styl|SOHOS|Kusch\s*\+\s*Co/i.test(text))throw Error('Viešame tekste negalima skelbti vidinės tiekėjo tapatybės.');
 if(args.action==='publish'&&(previous?.state!=='approved'||previous.source_hash!==def.sourceHash||previous.draft!==text))throw new ReviewConflict('Prieš skelbdami patvirtinkite dabartinę teksto versiją.');
 let state:TextEdit['state']=args.action==='draft'?'draft':args.action==='keep'?'kept':previous?.state||'approved';
 if(args.action==='approve')state='approved';
 if(args.action==='keep')text='';
 const published=args.action==='publish'?text:args.action==='unpublish'?null:previous?.published??null;
 const publishedHash=args.action==='publish'?def.sourceHash:args.action==='unpublish'?null:previous?.published_hash??null;
 const at=new Date().toISOString();
 const result=await dbAtomic([
  {sql:'INSERT OR IGNORE INTO text_review_edits(key,source_hash,draft,state,revision,updated_at) VALUES(?,?,?,?,0,?)',params:[args.key,def.sourceHash,'','draft',at]},
  {sql:'UPDATE text_review_edits SET source_hash=?,draft=?,state=?,revision=revision+1,published=?,published_hash=?,updated_at=? WHERE key=? AND revision=?',params:[def.sourceHash,text,state,published,publishedHash,at,args.key,args.expectedRevision]},
  {sql:'INSERT INTO text_review_history(key,action,source_hash,text,revision,actor,at) SELECT ?,?,?,?,?,?,? WHERE changes()=1',params:[args.key,args.action,def.sourceHash,text,args.expectedRevision+1,'admin',at]},
 ]);
 const update=result[1] as unknown as {changes?:number;meta?:{changes:number}};
 if((update.changes??update.meta?.changes)!==1)throw new ReviewConflict('Teksto versijos konfliktas. Atnaujinkite įrašą.');
 return args.expectedRevision+1;
}
