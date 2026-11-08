import type {ChairPreview} from './chair-preview';

export type ChairReviewSource={asset:string;sha256:string;bytes:number;runtimeSha256?:string};
export type ChairConstructionBinding={dimensions:Record<string,string>;structuralValues:Record<string,string>;runtimeSha256:string};
export type ChairReviewConstruction=ChairReviewSource&{id:string;label:string;contextLabel?:string;construction:ChairConstructionBinding;contexts?:Array<ChairReviewSource&{id:string;label:string}>};
export type ChairReviewEntry=ChairReviewSource&{code:string;name:string;contextLabel?:string;construction?:ChairConstructionBinding;contexts?:Array<ChairReviewSource&{id:string;label:string}>;constructions?:ChairReviewConstruction[];visualSupplement?:import('./segla-visual-routing').SeglaVisualSupplement};

// A finish menu belongs to one complete construction, never to a model code alone.
export function chairReviewRoute(entry:ChairReviewEntry,constructionId:string,finishId:string){
 const construction=constructionId==='default'?entry:entry.constructions?.find(c=>c.id===constructionId);
 if(!construction)throw Error('Unknown chair construction');
 const source=finishId==='default'?construction:construction.contexts?.find(c=>c.id===finishId);
 if(!source)throw Error('Unknown finish for this construction');
 return {construction,source};
}

/** Menus select complete admitted records; they never compose structural values. */
export function chairConstructionMenus(entry:ChairReviewEntry,id:string){
 if(!entry.constructions?.length||!entry.construction)return undefined;
 const rows=[{id:'default',label:entry.construction.structuralValues.CARMRESTS,construction:entry.construction},...entry.constructions];
 const current=rows.find(r=>r.id===id);if(!current)throw Error('Unknown chair construction');
 const arms=rows.filter((row,i)=>rows.findIndex(r=>r.construction.structuralValues.CARMRESTS===row.construction.structuralValues.CARMRESTS)===i);
 const matchesExcept=(row:typeof current,fields:string[])=>Object.entries(current.construction.structuralValues).every(([field,value])=>fields.includes(field)||row.construction.structuralValues[field]===value);
 const choices=(field:string,lower:string[])=>{
  const candidates=rows.filter(row=>matchesExcept(row,[field,...lower]));
  return candidates.filter((row,i)=>candidates.findIndex(r=>r.construction.structuralValues[field]===row.construction.structuralValues[field])===i).map(row=>{
   const same=candidates.filter(r=>r.construction.structuralValues[field]===row.construction.structuralValues[field]);
   for(let count=lower.length;count>0;count--){const preferred=same.find(r=>lower.slice(0,count).every(key=>r.construction.structuralValues[key]===current.construction.structuralValues[key]));if(preferred)return preferred;}
   return row;
  });
 };
 const bases=choices('CBASE',['CCASTORS','CGASLIFT','CMECHANISM','CSEATPADFOAM']),castors=choices('CCASTORS',['CGASLIFT','CMECHANISM','CSEATPADFOAM']),gaslifts=choices('CGASLIFT',['CMECHANISM','CSEATPADFOAM']),mechanisms=choices('CMECHANISM',['CSEATPADFOAM']),foams=choices('CSEATPADFOAM',[]);
 return {armId:arms.find(row=>row.construction.structuralValues.CARMRESTS===current.construction.structuralValues.CARMRESTS)!.id,arms:arms.map(r=>({id:r.id,label:r.label})),baseId:bases.find(row=>row.construction.structuralValues.CBASE===current.construction.structuralValues.CBASE)!.id,bases:bases.map(r=>({id:r.id,label:r.construction.structuralValues.CBASE})),castorId:castors.find(row=>row.construction.structuralValues.CCASTORS===current.construction.structuralValues.CCASTORS)!.id,castors:castors.map(r=>({id:r.id,label:r.construction.structuralValues.CCASTORS})),gasliftId:gaslifts.find(row=>row.construction.structuralValues.CGASLIFT===current.construction.structuralValues.CGASLIFT)!.id,gaslifts:gaslifts.map(r=>({id:r.id,label:r.construction.structuralValues.CGASLIFT})),mechanismId:mechanisms.find(row=>row.construction.structuralValues.CMECHANISM===current.construction.structuralValues.CMECHANISM)!.id,mechanisms:mechanisms.map(r=>({id:r.id,label:r.construction.structuralValues.CMECHANISM})),foams:foams.map(r=>({id:r.id,label:r.construction.structuralValues.CSEATPADFOAM}))};
}

export function validateChairConstructionBinding(data:ChairPreview,binding:ChairConstructionBinding){
 if(data.runtimeSha256!==binding.runtimeSha256||Object.keys(binding.structuralValues).length!==7||data.runtime.contexts.length!==1||!data.qualified?.witnesses.length)throw Error('Wrong construction runtime');
 const context=data.runtime.contexts[0];
 if(JSON.stringify(Object.entries(context.dimensions).sort())!==JSON.stringify(Object.entries(binding.dimensions).sort()))throw Error('Wrong construction dimensions');
 for(const [field,value]of Object.entries(binding.structuralValues)){
  if(context.dimensions[field]!==value||!data.qualified?.witnesses.every(w=>w.structural?.[field]?.value===value&&w.structural[field].supportedValues.length===1&&w.structural[field].supportedValues[0]===value))throw Error('Wrong structural binding');
 }
}
