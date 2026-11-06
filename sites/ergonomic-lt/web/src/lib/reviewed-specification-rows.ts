import type{TechnicalRow}from'./types';
const normalize=(value:string)=>value.trim().replace(/\s+/g,' ').toLocaleLowerCase('lt');
/** A specification row can use an option edit only when its label identifies
 * exactly one selected field. Ambiguous or unrelated supplier facts survive.
 */
export function reviewedSpecificationRows(rows:TechnicalRow[],values:Record<string,string>,labels:(field:string)=>string[],published:(field:string,value?:string)=>string|undefined):TechnicalRow[]{
 return rows.map(row=>{
  const fields=Object.keys(values).filter(field=>labels(field).some(label=>normalize(label)===normalize(row.label)));
  if(fields.length!==1)return row;
  const field=fields[0],value=published(field,values[field]);
  return value?{label:published(field)||row.label,value}:row;
 });
}
