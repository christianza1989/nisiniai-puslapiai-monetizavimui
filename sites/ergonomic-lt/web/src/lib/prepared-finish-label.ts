import {isColourField} from './colour-fields';
const parts:Record<string,string>={CUPHSEATCOLOR:'Sėdynė',CUPHSIDECOLORSEAT:'Sėdynės šonai',CUPHBACKRESTCOLOR:'Atlošas',C3DBACKRESTMESHCOLOR:'Atlošo 3D audinys',C3DHEADRESTMESHCOLOR:'Galvos atramos 3D audinys'};
/** Caption only: compare against this construction's original finish. The
 * complete measured tuple and all private supplier values remain unchanged. */
export function preparedFinishLabel(values:Record<string,string>,baseline:Record<string,string>,fieldLabel:(field:string)=>string,valueLabel:(field:string,value:string)=>string){
 return Object.entries(values).filter(([field,value])=>isColourField(field)&&baseline[field]!==value)
  .map(([field,value])=>(parts[field]||fieldLabel(field).replace(/\s+spalva$/i,''))+' '+valueLabel(field,value)).join(' · ')||'Pradinė apdaila';
}
