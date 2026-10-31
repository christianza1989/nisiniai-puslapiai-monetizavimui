
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import data from '../../content/configurator-expanded.json';
import sourceChoiceData from '../../content/source-choice-presentation.json';
import {verifiedArmrestValueLabel} from './armrest-presentation';
import type {Product,Configuration} from './types';
import type {PilotVariant} from './configurator';
import {supplierOptions} from './configuration-labels';
import {catalogFamilies,catalogPalettes,createCatalogEngine,type CatalogRuntime} from './catalog-configurator';
import {articleChoiceLabel,articleFieldLabels,configurableArticle,resolveConfigurationArticle} from './configuration-article';

export type Asset={asset:string;assetSha256:string;bytes:number};
export type ExpandedState={family:string;anchor:string;values:Record<string,string>};
type Profile={defaults:Record<string,string>;choices:Record<string,string[]>};
export type Patch={remove:string[];addIds:string[];changes:Record<string,string>;choices:Record<string,string[]>;geometry:Asset|null;geometries?:Asset[]};
export type Anchor=Profile&{id:string;fields:string[];classes:Record<string,string>;geometry:Asset;roles:Record<string,string>;patches:Record<string,Patch>;conditionalPatches:Record<string,Patch>};
export type Family={id:string;kind?:'catalog';productId:string;baseArticle:string;sample:string;anchors:(Anchor&{profiles:Profile[]})[]};
type PaletteItem={text:string;image?:string;color?:string};
export const families=[...data.families,...catalogFamilies] as unknown as Family[];
export const palettes:Record<string,Record<string,PaletteItem>>={...data.palettes};for(const [k,v] of Object.entries(catalogPalettes))palettes[k]={...palettes[k],...v};
export const fieldLabels:Record<string,string>={CMECHANISM:copyText("ui.b47ff451bbfc110f0f64","Mechanizmas"),CBACKRESTMOVEMECH:copyText("ui.79720dfc398c9388deab","Atlošo judėjimas"),CPLASTICCOLORVERSION2:copyText("ui.c369f9c6c8cef2743a34","Konstrukcijos spalva"),CPLASTICCOLORVERSION:copyText("ui.c369f9c6c8cef2743a34","Konstrukcijos spalva"),CHEADREST:copyText("ui.d0465984924eed4cc952","Galvos atrama"),CBACKRESTCONNECTOR:copyText("ui.9f4b55a91b93f2ee8786","Atlošo jungtis"),CARMRESTS:copyText("ui.43918a55eedd909adf0b","Porankiai"),CBASE:copyText("ui.182bd335a3438914fd81","Pagrindas"),CCASTORS:copyText("ui.36e738d9a76c4205b18f","Ratukai"),CPRICEGROUP:copyText("ui.a8b403b3d4bd5c6f0d63","Apmušalų kainų grupė"),CBACKRESTUPHGROUP:copyText("ui.c177753a1a258f27f20d","Atlošo apmušalas"),CSEATUPHGROUP:copyText("ui.068f7e08a18f9eb5f3be","Sėdynės apmušalas"),CASSEMBLY:copyText("ui.f4aea37b6c458d327729","Pakavimas ir surinkimas"),CSEBASIDEPROFILUPHGROUP:copyText("ui.4dfd22287232b72556f4","Šoninių profilių apmušalas"),CHEADRESTUPHCHGROUP:copyText("ui.749a8bb63a9241fcb420","Galvos atramos apmušalas"),CHEADSIDEPROFUPHCHGROUP:copyText("ui.f5cbff7d1c4951917a5a","Atramos šonų apmušalas"),CUPHBACKRESTCOLOR:copyText("ui.2d1f699f807bf61d9cdb","Atlošo spalva"),CUPHSEATCOLOR:copyText("ui.977e2ebba454c9318066","Sėdynės spalva"),CSEBASIDEPROFILUPHCOLOR:copyText("ui.dd9bb08cedaacf2022b0","Šoninių profilių spalva"),CHEADRESTUPHCHCOLOR:copyText("ui.92bf1218e3eb71e577a9","Galvos atramos spalva"),CHEADSIDEPROFUPHCHCOL:copyText("ui.707ce75ce186b1066d38","Atramos šonų spalva"),CLUMBARSUPPORT:copyText("ui.fcad0da6720ef4577a7a","Juosmens atrama"),CSEAT:copyText("ui.3875a6b4825d17627492","Sėdynė"),CGASLIFT:copyText("ui.a5a56156e1905fe412ed","Dujinė pakėlimo kolonėlė"),CUPHGROUP:copyText("ui.a7faed224d5e3135d6f8","Apmušalas"),CMESHGROUP:copyText("ui.57be37c285a17ddc4703","Atlošo tinklelis"),CMESHCOLOR:copyText("ui.c499c051ed21c04572aa","Tinklelio spalva"),CUPHCOLOR:copyText("ui.fc5063bc9151467226e6","Apmušalo spalva"),CUPHSIDECOLORSEAT:copyText("ui.6f0f9e641fd834945034","Sėdynės šonų spalva")};
Object.assign(fieldLabels,{CSEATFOAM:copyText("ui.47a8d8cb25114f821b2f","Sėdynės putplastis"),CBACKRESTFOAM:copyText("ui.bc9b4a9a13feeed25951","Atlošo putplastis"),CFRAMEPLASTICCOLOR:copyText("ui.c94e50b8e24994bb02ad","Atlošo rėmo spalva"),C3DBACKRESTMESHCOLOR:copyText("ui.de617bf5484cbf19cc97","3D atlošo audinio spalva"),CHEADRESTUPHGROUP:copyText("ui.749a8bb63a9241fcb420","Galvos atramos apmušalas"),CHEADRESTUPHCOLOR:copyText("ui.92bf1218e3eb71e577a9","Galvos atramos spalva")});
const additionalLabels:Record<string,string>={ESP:'ESP · sinchroninis',ESPT:copyText("ui.197b09647e8ba2d99f24","ESPT · sinchroninis, sėdynės gylio reguliavimas"),ESPTN:copyText("ui.f1d462a6fcbec9b3e8fa","ESPTN · sinchroninis, gylio ir neigiamo posvyrio reguliavimas"),FS:'FS · sinchroninis',FST:copyText("ui.b65fc729c6b4373cc407","FST · sinchroninis, sėdynės gylio reguliavimas"),EAST:copyText("ui.b7936ba6d7ce9dcb42db","EAST · asinchroninis, sėdynės gylio reguliavimas"),ER:'ER · sinchroninis',ERT:copyText("ui.468c120958a1f91033b5","ERT · sinchroninis, sėdynės gylio reguliavimas"),ERTN:copyText("ui.667dd267d30192199c02","ERTN · sinchroninis, gylio ir −2° posvyrio reguliavimas"),SYNCROIBRATR:copyText("ui.2410856c2ad9a8c72c20","SYNCRO IBRA TR · asinchroninis, gylio reguliavimas"),ERGON2L:copyText("ui.057fb44aff9421d6275b","ERGON-2L · nuolatinis kontaktas"),BS:'BS · sinchroninis',SA3IN:copyText("ui.37c8866762bc877dc6d5","SA3-IN · automatinis svorio pritaikymas, gylio reguliavimas"),ERIN:copyText("ui.16165fcc48c8a000e4b6","ER-IN · sinchroninis, gylio reguliavimas"),ERNIN:copyText("ui.3d5f57b2ea01a512a588","ERN-IN · sinchroninis, gylio ir neigiamo posvyrio reguliavimas"),EFT:copyText("ui.6137ef462b8a3d22fd0e","EFT · sinchroninis, gylio ir neigiamo posvyrio reguliavimas"),DA:copyText("ui.148da5dc2470e5a34f37","Reguliuojamas gylis"),HA:copyText("ui.b1734b4defcabc275c51","Reguliuojamas aukštis"),LSD2:copyText("ui.095d1254cb0800182be6","LSD2 · gylis reguliuojamas rankenėle"),LUD:copyText("ui.7b3a9e6b10fa0b96b1fc","LUD · reguliuojamas gylis"),LU:copyText("ui.6080c6a02d91da440043","Reguliuojamas gylis, apmušta"),LU2:copyText("ui.83e4225f5b390eeb3b3f","Reguliuojamas gylis, poliuretanas"),HRUA:copyText("ui.7374fab3a7a41db243fe","Reguliuojama, apmušta"),PNEUMATIC:copyText("ui.6c7076f95cee68a47379","Standartinė pneumatinė"),RGL4457:copyText("ui.76a220daf2cd52b72f1f","RGL44.57 · paaukštinta pneumatinė"),RGL4659:copyText("ui.94c2fb97f84984c4dd03","RGL46.59 · paaukštinta pneumatinė"),GLB:copyText("ui.9c28513a310144aaf5b2","Standartinė pneumatinė, juoda"),STANDARD:'Standartinis',FLAMERETARDANT:copyText("ui.d9cf084d7d1f733fb230","Sumažinto degumo"),BL:copyText("ui.63594342344560949914","Juoda"),W:copyText("ui.6742b790540b4b73c71c","Balta"),PACKL:copyText("ui.0d19b106e1ba83fd9e43","PACK-L · iš dalies surinkta, L formos dėžė"),PACKA1:copyText("ui.0fe5874504fe4a3875bc","Iš dalies surinkta, kompaktiška dėžė"),PACKASMBOX:copyText("ui.96a994626b5146a41e69","Visiškai surinkta, dėžė"),PACKUA:copyText("ui.ccd367f5e684ee6fcc3c","PACK-UA · nesurinkta, dėžė"),ARMRESTS1:'4D · juodi plastikiniai',ARMRESTS3:copyText("ui.d2d47c05630c22db70e2","4D · šviesiai pilki plastikiniai"),GTP56:'GTP56 · fiksuoti, juodi',GTP56W:'GTP56-W · fiksuoti, balti',GTP46:'GTP46 · fiksuoti, juodi',R33:'R33 · 2D, juodi',R33ALUW:copyText("ui.8fb316bf57d1f312c1f5","R33-ALU/W · 2D, aliuminis ir baltas plastikas"),R31:'R31 · 4D, juodi',R31ALUW:copyText("ui.b10c376bf6caa2b83f6f","R31-ALU/W · 4D, aliuminis ir baltas plastikas"),R35K2:'R35K2 · 1D, juodi',R35K2WB:copyText("ui.722229e7823b8b103c95","R35K2-W/B · 1D, balti ir juodi"),R35K2SB2:'R35K2-SB2 · 2D, juodi',R35K2SB2WB:copyText("ui.bb81eb4c04dbd1b1b1d0","R35K2-SB2-W/B · 2D, balti ir juodi"),R35K3:'R35K3 · 3D, juodi',R35K3WB:copyText("ui.75330f30a46873c80d74","R35K3-W/B · 3D, balti ir juodi"),R35K3SB2:'R35K3-SB2 · 4D, juodi',R35K3SB2WB:copyText("ui.a8fa31961550bb1756aa","R35K3-SB2-W/B · 4D, balti ir juodi"),R73:'R73 · 1D, juodi',R73W:'R73-W · 1D, balti',R74:'R74 · 2D, juodi',R74W:'R74-W · 2D, balti',R32R:copyText("ui.a36881bcabf292f14a93","R32R · 3D, chromuotas plienas ir juodas plastikas")};
const valueLabels:Record<string,string>={NONE:copyText("ui.e7e438f3acc412890bfd","Be atramos / nėra"),BLACKEDITION:copyText("ui.63594342344560949914","Juoda"),WHITEEDITION:copyText("ui.6742b790540b4b73c71c","Balta"),LIGHTGREY:copyText("ui.50a43e53d58bcca71b1a","Šviesiai pilka"),XV:copyText("ui.4c880a2f9e758bc423ac","X-MOVE judėjimas trimis kryptimis"),WHITEPLASTIC:copyText("ui.41a3f9a6f7b18627c83a","Baltas plastikas"),BLACKPLASTIC:copyText("ui.16198ea219ab18cbe545","Juodas plastikas"),ALUPOLISHED:copyText("ui.b64e61c1d447c6cd3d5a","Poliruotas aliuminis"),HRUA2DPLASTICSIDPROF:copyText("ui.369595913ed9d84fb6b9","Reguliuojama 2D, apmušta su šoniniais profiliais"),HRUA3:copyText("ui.3f17e6e0ea31b84e108c","Reguliuojama 3D, apmušta"),LUH2MANUAL:copyText("ui.2c9bd50d6bec14129b51","LUH2 – reguliuojamas aukštis"),UPHCOVERPLASTIC:copyText("ui.5c51afa2e91569bfe063","Apmušta, su plastikiniu gaubtu"),UPHCPLASTICSPROFILES:copyText("ui.8035608d0347d34ef6b0","Apmušta, su šoniniais profiliais"),UPHSP:copyText("ui.5d19e07bd3559ccf2bec","Apmušta, su spyruoklėmis"),UPHSIDEPROFILESSP:copyText("ui.17910ae12d49a98f5d09","Su šoniniais profiliais ir spyruoklėmis"),GLSTDB:copyText("ui.c650fdf7ee7d195f7c61","Standartinė, juoda"),GLG:copyText("ui.4266a1656bb11a4ab51e","Standartinė, pilka")};
export function choiceLabel(field:string,value:string,localPalettes?:CatalogRuntime['palettes'],family?:string){
 const local=localPalettes?._valueLabels?.[field+'='+value]?.text;if(local)return local;
 const verified=(field==='CARMRESTS'?verifiedArmrestValueLabel(value):undefined)||(sourceChoiceData.choices as Record<string,{label:string}>)[field+'='+value]?.label;if(verified)return verified;
 if(value==='NONE')return field==='CARMRESTS'?copyText("ui.d5354ada1565435058e7","Be porankių"):field==='CHEADREST'?copyText("ui.4a2815f0377c3c896f28","Be galvos atramos"):field==='CLUMBARSUPPORT'?copyText("ui.7b6374a4fa6de44f21cd","Be juosmens atramos"):copyText("ui.e2a779c195a0ba9785bb","Nėra");
 if(valueLabels[value])return valueLabels[value];
 if(additionalLabels[value])return additionalLabels[value];
 if(field==='CPRICEGROUP')return copyText("ui.7aa964a6ac066503896a","Grupė ")+value.replace(/^_/,'');
 if(field==='CMECHANISM')return ({ERST:copyText("ui.43664e50262310f9efde","ER-ST · sinchroninis, sėdynės gylio reguliavimas"),ERNST:copyText("ui.965697f30d9e11c4a1e3","ERN-ST · sinchroninis, neigiamas sėdynės posvyris"),SA3ST:copyText("ui.4af1de9a0759577e7306","SA3-ST · automatinis svorio pritaikymas"),ERNHST:copyText("ui.fd56dbcf7e2584d5ecab","ERNH-ST · neigiamas sėdynės posvyris, sustiprinta spyruoklė"),SA2ST:copyText("ui.4a8a399b488f8b63c3e3","SA2-ST · automatinis svorio pritaikymas")} as Record<string,string>)[value]||value;
 // Xilium Office technical description, physical PDF page 193 (printed 189).
 // R53/R54/R55 dimensions are article facts, not a global code heuristic.
 if(field==='CARMRESTS'){const model=value.match(/^R\d+/)?.[0]||value;const dimensions=(family==='xilium'?{R53:'3D',R54:'4D',R55:'X-D'} as Record<string,string>:{} as Record<string,string>)[model]||({R70:'2D',R71:'3D',R72:'4D'} as Record<string,string>)[model];return value+(dimensions?' · '+dimensions:'');}
 // Unknown source codes never acquire guessed material or floor compatibility.
 if(field==='CBASE'||field==='CCASTORS')return localPalettes?.[field]?.[value]?.text?.replace(/ \(extended\)/g,'')||value;
 if(field==='CUPHSIDECOLORSEAT')return value;
 const text=(localPalettes?.[field]?.[value]?.text||palettes[field]?.[value]?.text)?.replace(/ \(extended\)/g,'');
 return text&&(/GROUP$/.test(field))?text:value;
}
export function createExpandedEngine(runtime?:CatalogRuntime){
const catalogEngine=createCatalogEngine(runtime?.family);
const {catalogFamily,catalogForProduct,catalogInitial,catalogChoices,catalogChange,catalogValidate,catalogAssets,catalogSelection}=catalogEngine;
function expandedForProduct(p:Product){return catalogForProduct(p) as unknown as Family||families.find(f=>!f.kind&&f.productId===p.id&&(!p.modelConfigurationId||p.configurations.find(c=>c.id===p.modelConfigurationId)?.code===f.baseArticle)&&(p.configurations.some(c=>c.id===f.sample&&c.code===f.baseArticle)||(typeof (p as Product&{publicationOriginalCount?:number}).publicationOriginalCount==='number'&&p.configurations.some(c=>c.id===p.modelConfigurationId&&c.code===f.baseArticle))));}
function anchorFor(s:ExpandedState){return catalogEngine.catalogAnchor(s) as unknown as (Anchor&{profiles:Profile[]})||families.find(f=>f.id===s.family)?.anchors.find(a=>a.id===s.anchor);}
// Read the same effective supplier values for material controls and exports.
// Xilium's seat collection is a captured mirror of its backrest collection;
// an old anchor default must not classify that seat as a different material.
function stateValues(s:ExpandedState):Record<string,string>{
 if(catalogFamily(s))return catalogEngine.catalogValues(s);
 const values={...anchorFor(s)!.defaults,...s.values};
 if(values.CBACKRESTUPHGROUP)values.CSEATUPHGROUP=values.CBACKRESTUPHGROUP;
 return values;
}
const isGroup=(k:string)=>k.endsWith('GROUP')&&k!=='CPRICEGROUP';
const sideSeat=(seat:string)=>['UPHCPLASTICSPROFILES','UPHSIDEPROFILESSP'].includes(seat);
function profilesFor(s:ExpandedState){const a=anchorFor(s)!;if(s.family!=='souly')return a.profiles;return a.profiles.filter(p=>sideSeat(s.values.CSEAT)?p.defaults.CSEAT===s.values.CSEAT:!sideSeat(p.defaults.CSEAT));}
function stateChoices(s:ExpandedState):Record<string,string[]>{
 if(catalogFamily(s))return catalogChoices(s);
 const a=anchorFor(s);if(!a)return {};const choices={...a.choices};
 for(const [k,v] of Object.entries(s.values))Object.assign(choices,a.patches[k+'='+v]?.choices||{});
 const profiles=profilesFor(s),price=profiles.find(p=>p.defaults.CPRICEGROUP===s.values.CPRICEGROUP);
 if(s.family==='souly'&&sideSeat(s.values.CSEAT))choices.CPRICEGROUP=[...new Set(profiles.map(p=>p.defaults.CPRICEGROUP))];
 if(price)for(const k of Object.keys(choices))if(k.includes('GROUP')||k.includes('COLOR')||k.endsWith('CHCOL')){
  // The source omits a choice list when the current group has one fixed value.
  // Use that captured value instead of retaining the previous group's list.
  if(price.choices[k])choices[k]=price.choices[k];
  else if(price.defaults[k])choices[k]=[price.defaults[k]];
 }
 for(const field of Object.keys(choices).filter(isGroup)){
  const p=profiles.find(p=>p.defaults.CPRICEGROUP===s.values.CPRICEGROUP&&p.defaults[field]===s.values[field]);
  if(p)for(const [k,v] of Object.entries(p.choices))if(k.includes('COLOR')||k.endsWith('CHCOL')){
   // Pick only colours belonging to this group's family. Other captured groups
   // in the same profile may have their own default selection.
   const groupForColor:Record<string,string>={CUPHBACKRESTCOLOR:'CBACKRESTUPHGROUP',CUPHSEATCOLOR:'CBACKRESTUPHGROUP',CSEBASIDEPROFILUPHCOLOR:'CSEBASIDEPROFILUPHGROUP',CHEADRESTUPHCHCOLOR:'CHEADRESTUPHCHGROUP',CHEADSIDEPROFUPHCHCOL:'CHEADSIDEPROFUPHCHGROUP',CUPHCOLOR:'CUPHGROUP',CUPHSIDECOLORSEAT:'CUPHGROUP',CMESHCOLOR:'CMESHGROUP'};
   if(groupForColor[k]===field)choices[k]=v;
  }
 }
 return choices;
}
function normalize(s:ExpandedState){
 const a=anchorFor(s);if(!a)throw Error(copyText("ui.bce39388837b87564703","Komplektacija nerasta."));let values={...s.values};
 for(let pass=0;pass<5;pass++){const choices=stateChoices({...s,values});for(const [k,list] of Object.entries(choices))if(!list.includes(values[k]))values[k]=list.includes(a.defaults[k])?a.defaults[k]:list[0];
  for(const k of Object.keys(values))if(!choices[k])delete values[k];}
 return {...s,values:Object.fromEntries(Object.entries(values).sort(([a],[b])=>a.localeCompare(b)))};
}
function initialState(f:Family):ExpandedState{
 if(f.kind==='catalog')return catalogInitial(f as unknown as import('./catalog-configurator').CatalogFamily);
 const a=f.anchors.find(a=>a.id.startsWith(f.id==='xilium'?'WHITEEDITION-HR':'BLACKEDITION-NONE'))||f.anchors[0];
 const reference:Record<string,string>=f.id==='xilium'?{CMECHANISM:'ERST',CBACKRESTMOVEMECH:'XV',CBACKRESTCONNECTOR:'WHITEPLASTIC',CARMRESTS:'R55POLWBPU',CBASE:'TS30W',CCASTORS:'ESH60',CPRICEGROUP:'_2',CBACKRESTUPHGROUP:'VL',CSEBASIDEPROFILUPHGROUP:'VL',CHEADRESTUPHCHGROUP:'VL',CHEADSIDEPROFUPHCHGROUP:'VL',CUPHBACKRESTCOLOR:'VL0034',CUPHSEATCOLOR:'VL0034',CSEBASIDEPROFILUPHCOLOR:'VL4041',CHEADRESTUPHCHCOLOR:'VL0034',CHEADSIDEPROFUPHCHCOL:'VL4041'}:{CARMRESTS:'R71BBBPU',CLUMBARSUPPORT:'LUH2MANUAL'};
 return normalize({family:f.id,anchor:a.id,values:{...a.defaults,...reference}});
}
function initialStateForProduct(p:Product):ExpandedState{
 const f=expandedForProduct(p)!;let state=initialState(f);
 // A measured desk overlay chooses the captured initial context with the best
 // working color coverage. A catalog example must not silently overwrite that
 // choice. Explicit state tokens still restore their original configuration.
 if(catalogFamily(state)?.deskColors)return validateState(p,state);
 const c=p.configurations.find(c=>c.id===p.modelConfigurationId);if(!c)return state;
 const wanted=Object.fromEntries(supplierOptions(c).map(option=>{const [key,original]=option.split('='),field=key.split('.').at(-1)!;
  const value=runtime?.palettes._sourceValueAliases?.[c.id+'/'+field+'='+original]?.text||original;
  return [field,key.endsWith('.CPRICEGROUP')&&/^\d+$/.test(value)?'_'+value:value];}));
 // Structural controls precede fabric groups and colours, whose choices depend
 // on the selected construction. Only source-captured choices are accepted.
 const keys=Object.keys(wanted).sort((a,b)=>Number(/GROUP/.test(a))+Number(/COLOR|CHCOL/.test(a)&&!a.startsWith('CPLASTIC'))*2-Number(/GROUP/.test(b))-Number(/COLOR|CHCOL/.test(b)&&!b.startsWith('CPLASTIC'))*2);
 for(let pass=0;pass<3;pass++)for(const k of keys)if(state.values[k]!==wanted[k]&&stateChoices(state)[k]?.includes(wanted[k]))try{state=changeField(state,k,wanted[k]);}catch{/* Some supplier examples contain options outside the captured 3D scope. */}
 return validateState(p,state);
}
function changeField(s:ExpandedState,field:string,value:string){
 if(catalogFamily(s))return catalogChange(s,field,value);
 if(!stateChoices(s)[field]?.includes(value))throw Error(copyText("ui.a45a85b5ad299eb715f4","Šis pasirinkimas negalimas."));const a=anchorFor(s)!;let next={...s,values:{...s.values,[field]:value}};
 if(field==='CHEADREST'||field.startsWith('CPLASTICCOLORVERSION')){
  const f=families.find(f=>f.id===s.family)!,plastic=field.startsWith('CPLASTIC')?value:s.values[f.id==='xilium'?'CPLASTICCOLORVERSION2':'CPLASTICCOLORVERSION'];
  const head=field==='CHEADREST'?value:s.values.CHEADREST,anchor=f.anchors.find(a=>a.id===plastic+'-'+head);if(!anchor)throw Error(copyText("ui.990865ffe3b8ee6c3adc","Ši konstrukcija dar nepateikta."));
  next={...next,anchor:anchor.id,values:{...anchor.defaults,...next.values}};
 }else Object.assign(next.values,a.patches[field+'='+value]?.changes||{});
 if(field==='CPRICEGROUP'||isGroup(field)){
  const profile=profilesFor(next).find(p=>p.defaults.CPRICEGROUP===next.values.CPRICEGROUP&&(!isGroup(field)||p.defaults[field]===value));
  if(profile)for(const [k,v] of Object.entries(profile.defaults))if(k===field||field==='CPRICEGROUP'&&(k.includes('GROUP')||k.includes('COLOR')||k.endsWith('CHCOL'))||isGroup(field)&&/COLOR|CHCOL/.test(k)&&profile.choices[k]?.some(v=>v.startsWith(value)))next.values[k]=v;
 }
 return normalize(next);
}
function validateState(product:Product,input:unknown):ExpandedState{
 if(catalogForProduct(product))return catalogValidate(product,input);
 const f=expandedForProduct(product);if(!f||!input||typeof input!=='object')throw Error(copyText("ui.59a1cd4cfa64392134f2","Neleistina komplektacija."));const s=input as ExpandedState;
 if(s.family!==f.id||typeof s.anchor!=='string'||!s.values||typeof s.values!=='object'||Array.isArray(s.values)||Object.keys(s.values).length>35||Object.values(s.values).some(v=>typeof v!=='string'||v.length>100))throw Error(copyText("ui.b12113f7560a1720ce23","Neleistini pasirinkimai."));
 const canonical=normalize(s);if(JSON.stringify(canonical.values)!==JSON.stringify(Object.fromEntries(Object.entries(s.values).sort(([a],[b])=>a.localeCompare(b)))))throw Error(copyText("ui.2ca5de226990278480c1","Pasirinkimai tarpusavyje nesuderinami."));
 const a=anchorFor(s)!;const plastic=s.values[f.id==='xilium'?'CPLASTICCOLORVERSION2':'CPLASTICCOLORVERSION'];if(a.id!==plastic+'-'+s.values.CHEADREST)throw Error(copyText("ui.c927305948bb709d4b2c","Konstrukcija neatitinka pasirinktų detalių."));return canonical;
}
function stateToken(s:ExpandedState){return JSON.stringify([s.family,s.anchor,Object.entries(s.values).sort(([a],[b])=>a.localeCompare(b))]);}
function parseStateToken(p:Product,token:string){if(token.length>5000)throw Error(copyText("ui.e1ba214296fcef9d4334","Per ilgas kodas."));const [family,anchor,entries]=JSON.parse(token);return validateState(p,{family,anchor,values:Object.fromEntries(entries)});}
function assembledAssets(s:ExpandedState){if(catalogFamily(s))return catalogAssets(s);const a=anchorFor(s)!;const entries=Object.entries(s.values).sort(([k],[l])=>(k==='CMECHANISM'?-1:k==='CARMRESTS'?1:0)-(l==='CMECHANISM'?-1:l==='CARMRESTS'?1:0));
 return {base:a.geometry,patches:entries.map(([k,v])=>k==='CARMRESTS'&&a.conditionalPatches?.[s.values.CMECHANISM+'|'+v]||a.patches[k+'='+v]).filter((p):p is Patch=>!!p)};}
function stateDetails(s:ExpandedState,product?:Product){return Object.entries(stateChoices(s)).map(([k])=>({label:(product&&articleFieldLabels(product)[k])||(['CARMRESTS','CBASE','CCASTORS'].includes(k)?fieldLabels[k]:runtime?.palettes._fieldLabels?.[k]?.text)||fieldLabels[k]||k,value:(product&&articleChoiceLabel(product,k,s.values[k]))||choiceLabel(k,s.values[k],runtime?.palettes,s.family)}));}
function expandedSelection(product:Product,input:unknown){
 if(catalogForProduct(product)){
  const selected=catalogSelection(product,input,s=>stateDetails(s,product));
  const model=configurableArticle(product)&&product.configurations.find(c=>c.id===product.modelConfigurationId&&c.code===selected.configuration.code);
   return model?{...selected,configuration:{...selected.configuration,id:model.id,image:'/media/configurator/'+model.id+'.jpg',description:product.name},variant:{...selected.variant,image:'/media/configurator/'+model.id+'.jpg',label:product.name}}:selected;
 }
 const state=validateState(product,input),f=expandedForProduct(product)!,a=anchorFor(state)!;
 const values=stateValues(state);
 const specKeys=new Set(Object.keys(state.values));if(values.CASSEMBLY)specKeys.add('CASSEMBLY');if(values.CBACKRESTUPHGROUP&&values.CSEATUPHGROUP)specKeys.add('CSEATUPHGROUP');
 for(const key of specKeys)if(!a.classes[key])throw Error(copyText("ui.c557d5e4cad349878adc","Nerastas pasirinkimo gamintojo kodas: ")+key);
 const options=Object.entries(values).filter(([k])=>specKeys.has(k)&&a.classes[k]).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>a.classes[k]+'.'+k+'='+(k==='CPRICEGROUP'?v.replace(/^_/,''):v));
 const label=(f.id==='xilium'?'Duo-Back':'Tinklinis')+' · '+choiceLabel('CPLASTICCOLORVERSION',state.values[f.id==='xilium'?'CPLASTICCOLORVERSION2':'CPLASTICCOLORVERSION']).toLowerCase()+' · '+(state.values.CHEADREST==='NONE'?'be galvos atramos':'su galvos atrama');
 const modelSample=product.modelConfigurationId&&product.configurations.find(c=>c.id===product.modelConfigurationId&&c.code===f.baseArticle);
 if(product.modelConfigurationId&&!modelSample)throw Error('Expanded model identity mismatch');
 const sample=modelSample?modelSample.id:f.sample;
 const configuration:Configuration={id:sample,name:copyText("ui.20ce263b92f0b663a1ae","Individuali komplektacija"),description:label,image:'/media/configurator/'+sample+'.jpg',code:f.baseArticle,configurator:null,supplierOptions:options,details:stateDetails(state,product)};
 let checksum=2166136261;for(const char of stateToken(state))checksum=Math.imul(checksum^char.charCodeAt(0),16777619)>>>0;
 const variant={id:'EG-'+checksum.toString(16).padStart(8,'0').toUpperCase(),label,image:configuration.image!,supplierCode:f.baseArticle,supplierOptions:options,visualizationNote:copyText("ui.1fc6412c0c4af8ac1518","Individuali komplektacija. Apdailų spalvos ekrane orientacinės.")} as PilotVariant;
 return {state,configuration,variant,assets:assembledAssets(state)};
}
function selectionArticle(product:Product,input:unknown){
 const state=validateState(product,input),labels={...fieldLabels,...Object.fromEntries(Object.entries(runtime?.palettes._fieldLabels||{}).map(([k,v])=>[k,v.text])),...articleFieldLabels(product)};
 return resolveConfigurationArticle(product,state,stateChoices(state),(k,v)=>articleChoiceLabel(product,k,v)||choiceLabel(k,v,runtime?.palettes,state.family),labels);
}
return {expandedForProduct,anchorFor,stateValues,stateChoices,initialState,initialStateForProduct,changeField,validateState,stateToken,parseStateToken,assembledAssets,stateDetails,expandedSelection,selectionArticle,catalog:catalogEngine};
}
export const {expandedForProduct,anchorFor,stateChoices,initialState,initialStateForProduct,changeField,validateState,stateToken,parseStateToken,assembledAssets,stateDetails,expandedSelection}=createExpandedEngine();

