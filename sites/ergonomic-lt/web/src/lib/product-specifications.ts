import type {TechnicalRow} from './types';

/** Presentation only: every supplied row survives exactly once, with unchanged facts. */
export function productSpecificationSections(rows:TechnicalRow[]){
 const groups=[
  {id:'model',heading:'Modelis ir komplektacija',matches:/^(produkto kodas|bazinis kodas|modelis|linija|komplektacija)/i},
  {id:'mechanism',heading:'Mechanizmas ir reguliavimas',matches:/mechanizm|judėjim|reguliavim|keltuv|aukšči/i},
  {id:'supports',heading:'Atramos',matches:/galvos|poranki|juosmens/i},
  {id:'construction',heading:'Konstrukcija ir apdaila',matches:/konstrukc|pagrind|kryžm|ratuk|atram|rėm|koj|sėdyn|atloš|užpild|put|dyd|plot|gyl|svor|apdail|stalvirš|surink|jung/i},
  {id:'finishes',heading:'Apmušalai ir spalvos',matches:/apmuš|audin|spalv|kainų grup|medžiag/i},
  {id:'other',heading:'Kiti techniniai duomenys',matches:/.*/},
 ];
 const grouped=new Map<string,TechnicalRow[]>();
 for(const row of rows){
  // Upholstery labels can also contain "atlošas" or "sėdynė".
  const group=/apmuš|audin|spalv|kainų grup/i.test(row.label)?groups[4]:groups.find(g=>g.matches.test(row.label))!;
  const list=grouped.get(group.id)||[];list.push(row);grouped.set(group.id,list);
 }
 return groups.filter(g=>grouped.has(g.id)).map(({id,heading})=>{
  const sectionRows=grouped.get(id)!;
  return {id,heading:id==='finishes'&&!sectionRows.some(r=>/apmuš|audin/i.test(r.label))?'Medžiagos ir spalvos':heading,rows:sectionRows};
 });
}

export function productSpecificationRows(code:string|null|undefined,rows:TechnicalRow[]=[]):TechnicalRow[]{
 return [...(code?[{label:'Produkto kodas',value:code}]:[]),...rows];
}
