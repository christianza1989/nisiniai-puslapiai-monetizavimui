import {isColourField} from './colour-fields';
const parts:Record<string,string>={CUPHSEATCOLOR:'Sėdynė',CUPHSIDECOLORSEAT:'Sėdynės šonai',CUPHBACKRESTCOLOR:'Atlošas',C3DBACKRESTMESHCOLOR:'Atlošo 3D audinys',C3DHEADRESTMESHCOLOR:'Galvos atramos 3D audinys',CFRAMEMETALCOLOR:'Rėmas',CBENCHARMMETALCOLOR:'Porankiai'};
const partLabels:Record<string,string>={
 'Išorinės atlošo pusės apmušalo spalva':'Išorinė atlošo pusė',
 'Vidinės atlošo pusės apmušalo spalva':'Vidinė atlošo pusė',
 'Medinio rėmo spalva':'Medinis rėmas',
 'Sėdynės spalva':'Sėdynė',
};
/** Caption only: compare against this construction's original finish. The
 * complete measured tuple and all private supplier values remain unchanged. */
export function preparedFinishLabel(values:Record<string,string>,baseline:Record<string,string>,fieldLabel:(field:string)=>string,valueLabel:(field:string,value:string)=>string){
 const changed=Object.entries(values).filter(([field,value])=>baseline[field]!==value);
 const colours=changed.filter(([field])=>isColourField(field));
 if(colours.length===2&&colours.some(([field])=>field==='CFRAMEMETALCOLOR')&&colours.some(([field])=>field==='CBENCHARMMETALCOLOR')&&values.CFRAMEMETALCOLOR===values.CBENCHARMMETALCOLOR){
  return 'Rėmas ir porankiai '+valueLabel('CFRAMEMETALCOLOR',values.CFRAMEMETALCOLOR);
 }
 return (colours.length?colours:changed).map(([field,value])=>{
  const label=fieldLabel(field);
  const part=parts[field]||partLabels[label];
  return (part?part+' ':label+': ')+valueLabel(field,value);
 }).join(' · ')||'Pradinė apdaila';
}
