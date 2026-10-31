import type {ExpandedState,Asset} from './expanded-configurator';
import type {QualifiedGroup,QualifiedSelection,QualifiedWitness} from './chair-qualified-colors';

// Exact supplier controller IDs, not substring/name/material-hash matching.
// The IDs describe a role only after an own source primitive or qualified
// measured group has supplied its binding. See CHAIR_MATERIAL_GROUPS.md.
export const chairFinishRoles:Record<string,'upholstery'|'mesh'>={
 CUPHCOLOR:'upholstery',CUPHSEATCOLOR:'upholstery',CUPHBACKRESTCOLOR:'upholstery',CUPHBACKCOLOR:'upholstery',
 CSEBASIDEPROFILUPHCOLOR:'upholstery',CUPHSIDECOLORSEAT:'upholstery',CHEADRESTUPHCHCOLOR:'upholstery',
 CHEADRESTUPHCOLOR:'upholstery',CHEADSIDEPROFUPHCHCOL:'upholstery',CARMRESTUPHCOLOR:'upholstery',
 CMESHCOLOR:'mesh',CBACKRESTMESHCOLOR:'mesh',C3DBACKRESTMESHCOLOR:'mesh',
};
const controllers:Record<string,string[]>={CUPHCOLOR:['CUPHGROUP'],CUPHSEATCOLOR:['CSEATUPHGROUP','CBACKRESTUPHGROUP','CUPHGROUP'],
 CUPHBACKRESTCOLOR:['CBACKRESTUPHGROUP','CUPHGROUP'],CUPHBACKCOLOR:['CBACKUPHGROUP','CBACKRESTUPHGROUP','CUPHGROUP'],CSEBASIDEPROFILUPHCOLOR:['CSEBASIDEPROFILUPHGROUP'],
 CUPHSIDECOLORSEAT:['CUPHGROUP'],CHEADRESTUPHCHCOLOR:['CHEADRESTUPHCHGROUP'],CHEADRESTUPHCOLOR:['CHEADRESTUPHGROUP'],
 CHEADSIDEPROFUPHCHCOL:['CHEADSIDEPROFUPHCHGROUP'],CMESHCOLOR:['CMESHGROUP']};
const textiles=new Set(['CSE','BN','YB','SM','SMM','CUR','EGL','XR','ST','STG','STMG','CUZ','RX','C','M','EF','OL','FLG','MR','F','LDS','FYR']);
function materialClass(collection:string|undefined){return collection&&textiles.has(collection)?'textile':collection==='VL'?'leatherette':collection&&['SD','LE','SP'].includes(collection)?'leather':'upholstery';}
export function chairMaterialLabel(kind:'upholstery'|'mesh',groups:string[]=[]){
 if(kind==='mesh')return 'Tinklelis';
 if(groups.length&&groups.every(g=>textiles.has(g)))return 'Gobelenas';
 if(groups.length&&groups.every(g=>['SD','LE','SP'].includes(g)))return 'Oda';
 if(groups.length&&groups.every(g=>g==='VL'))return 'Dirbtinė oda';
 return 'Apmušalas';
}
export type ChairSurfaceRole={assetSha256:string;node:number;primitive:number;material:number;field:string;partId?:string};
export type LegacyChairRoleProof={assets:Asset[];surfaces:ChairSurfaceRole[]};
export type ChairMaterialControl<S>={id:string;label:string;fields:string[];hiddenFields:string[];value:string;options:{id:string;code:string;collection?:string;state:S}[];reason?:string};
const same=(a:Record<string,string>,b:Record<string,string>)=>Object.keys(a).length===Object.keys(b).length&&Object.entries(a).every(([k,v])=>b[k]===v);
const unique=<T,>(a:T[])=>[...new Set(a)];

/** Project the EXISTING legal engine into atomic material choices. Every
 * candidate is a sequence of admitted transitions, then checked as a complete
 * final state. No intermediate state reaches React, PDF, URL or the renderer. */
export function legacyChairMaterialControls(input:{state:ExpandedState;proof?:LegacyChairRoleProof;assets:Asset[];
 choices:(s:ExpandedState)=>Record<string,string[]>;values:(s:ExpandedState)=>Record<string,string>;
 change:(s:ExpandedState,field:string,value:string)=>ExpandedState}):ChairMaterialControl<ExpandedState>[]{
 const {state,proof,assets,choices,values,change}=input,domains=choices(state),current=values(state);
 const assetKey=(a:Asset)=>JSON.stringify([a.assetSha256,a.asset,a.bytes]);
 const addresses=proof?.surfaces.map(s=>s.assetSha256+':'+s.node+':'+s.primitive)||[];
 const proofMatches=!!proof&&JSON.stringify(proof.assets.map(assetKey).sort())===JSON.stringify(assets.map(assetKey).sort())&&
  new Set(addresses).size===addresses.length&&proof.surfaces.every(s=>assets.some(a=>a.assetSha256===s.assetSha256)&&[s.node,s.primitive,s.material].every(n=>Number.isSafeInteger(n)&&n>=0));
 const controller=(f:string)=>(controllers[f]||[]).find(k=>current[k]!==undefined||domains[k]);
 const fieldClass=(f:string)=>chairFinishRoles[f]==='mesh'?'mesh':materialClass(current[controller(f)||'']);
 const allOffered=Object.keys(domains).filter(f=>chairFinishRoles[f]),allSurfaces=proofMatches?proof!.surfaces:[];
 const allFields=unique([...allOffered,...allSurfaces.map(s=>s.field)]).filter(f=>chairFinishRoles[f]);
 return unique(allFields.map(fieldClass)).flatMap(kind=>{
  const offered=allOffered.filter(f=>fieldClass(f)===kind),surfaces=allSurfaces.filter(s=>fieldClass(s.field)===kind);
  const fields=allFields.filter(f=>fieldClass(f)===kind);if(!fields.length)return [];
  const groupFields=unique(fields.flatMap(f=>controller(f)?[controller(f)!]:[]));
  const label=kind==='mesh'?'Tinklelis':kind==='textile'?'Gobelenas':kind==='leatherette'?'Dirbtinė oda':kind==='leather'?'Oda':'Apmušalas';
  const control:ChairMaterialControl<ExpandedState>={id:'chair-material-'+kind,label,fields,hiddenFields:[...fields,...groupFields],value:'',options:[]};
  if(!proofMatches||offered.some(f=>!surfaces.some(s=>s.field===f))){control.reason='Trūksta šios konstrukcijos originalių paviršių ir medžiagos ryšio.';return [control];}
  if(!surfaces.length){control.reason='Šiai medžiagai nepateikta keičiamų 3D paviršių.';return [control];}
  const allowed=new Set([...fields,...groupFields]);
  const collections=groupFields.length?unique(groupFields.flatMap(k=>domains[k]||[current[k]])):[''];
  for(const collection of collections){
   let prefix=state;
   try{for(const f of groupFields){if(values(prefix)[f]===collection)continue;if(!choices(prefix)[f]?.includes(collection))throw Error('Fixed collection');prefix=change(prefix,f,collection);}}
   catch{continue;}
   const first=fields.find(f=>choices(prefix)[f]?.length),colors=first?choices(prefix)[first]:[values(prefix)[fields[0]]];
   for(const code of colors||[]){
    let next=prefix;
    try{
     for(const f of fields){if(values(next)[f]===code)continue;if(!choices(next)[f]?.includes(code))throw Error('No common value');next=change(next,f,code);}
     const final=values(next);
     if(next.anchor!==state.anchor||fields.some(f=>final[f]!==code)||groupFields.some(f=>final[f]!==collection)||
       !same(Object.fromEntries(Object.entries(current).filter(([k])=>!allowed.has(k))),Object.fromEntries(Object.entries(final).filter(([k])=>!allowed.has(k)))))continue;
     const id=JSON.stringify([collection,code]);if(control.options.some(o=>o.id===id))continue;
     control.options.push({id,code,collection:collection||undefined,state:next});
     if(fields.every(f=>current[f]===code)&&groupFields.every(f=>current[f]===collection))control.value=id;
    }catch{/* A measured conditional/fixed value is not a new combination. */}
   }
  }
  if(!control.options.length)control.reason='Šiai konstrukcijai neįrodytas bendras visų šios medžiagos dalių spalvos pasirinkimas.';
  return [control];
 });
}

/** A qualified group is indivisible. Only groups whose entire tuple consists
 * of one documented material role can join. Whole states, mixed groups and
 * controller branches remain in the original admission layer. */
export function qualifiedChairMaterialControls(w:QualifiedWitness,selection:QualifiedSelection,
 admit:(s:QualifiedSelection)=>boolean):{controls:ChairMaterialControl<QualifiedSelection>[];remaining:QualifiedGroup[]}{
 const branch=w.branches.find(b=>b.id===selection.branch),groups=[...w.groups,...branch?.groups||[]],used=new Set<string>();
 const descriptors=groups.flatMap(g=>{
  const fields=unique(g.options.flatMap(o=>Object.keys(o.values).filter(f=>chairFinishRoles[f])));if(!fields.length)return [];
  const role=chairFinishRoles[fields[0]];if(fields.some(f=>chairFinishRoles[f]!==role))return [];
  const allowed=new Set([...fields,...fields.flatMap(f=>controllers[f]||[]),'CPRICEGROUP']);
  if(g.options.some(o=>Object.keys(o.values).some(f=>!allowed.has(f))||fields.some(f=>!o.values[f])))return [];
  const collections=(o:typeof g.options[number])=>unique([...fields.flatMap(f=>{const k=(controllers[f]||[]).find(k=>o.values[k]!==undefined||branch?.values[k]!==undefined);return k?[o.values[k]??branch!.values[k]]:[];})]).sort();
  const current=g.options.find(o=>o.id===(selection.groups[g.id]??g.base))||g.options.find(o=>o.id===g.base)!;
  const prefix=collections(current),kind=role==='mesh'?'mesh':materialClass(prefix.length===1?prefix[0]:undefined);
  const signature=(o:typeof g.options[number])=>unique(fields.map(f=>o.values[f])).length===1?JSON.stringify([collections(o),o.values[fields[0]]]):undefined;
  return [{g,fields,kind,signature,collections}];
 });
 const controls=unique(descriptors.map(d=>d.kind)).map(kind=>{
  const members=descriptors.filter(d=>d.kind===kind);members.forEach(d=>used.add(d.g.id));
  const fields=unique(members.flatMap(d=>d.fields)),label=kind==='mesh'?'Tinklelis':kind==='textile'?'Gobelenas':kind==='leatherette'?'Dirbtinė oda':kind==='leather'?'Oda':'Apmušalas';
  const control:ChairMaterialControl<QualifiedSelection>={id:'chair-material-'+kind,label,fields,hiddenFields:members.map(d=>d.g.id),value:'',options:[]};
  for(const id of unique(members[0].g.options.map(members[0].signature).filter((x):x is string=>!!x))){
   const options=members.map(d=>d.g.options.filter(o=>d.signature(o)===id));if(options.some(o=>o.length!==1))continue;
   const chosen=options.map(o=>o[0]),values:Record<string,string>={};let conflict=false;
   for(const o of chosen)for(const [k,v]of Object.entries(o.values)){if(values[k]!==undefined&&values[k]!==v)conflict=true;values[k]=v;}
   if(conflict)continue;
   const next={...selection,groups:{...selection.groups,...Object.fromEntries(members.map((d,i)=>[d.g.id,chosen[i].id]))}};
   if(!admit(next))continue;
   const code=chosen[0].values[members[0].fields[0]],collection=members[0].collections(chosen[0]).join(' / ');
   control.options.push({id,code,collection:collection||undefined,state:next});
   if(members.every((d,i)=>(selection.groups[d.g.id]??d.g.base)===chosen[i].id))control.value=id;
  }
  if(!control.options.length)control.reason='Perduotos grupės neturi bendros patikrintos spalvos.';
  return control;
 });
 return {controls,remaining:groups.filter(g=>!used.has(g.id))};
}
