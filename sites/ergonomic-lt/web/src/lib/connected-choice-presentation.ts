import {isColourField} from './colour-fields';
import type {TechnicalRow} from './types';
/** The captured supplier field explicitly means "Colour - stitching on seat". */
export const connectedColourField=(field:string)=>isColourField(field)||field==='CSEATDECSTITCHING';
/** Narrow corrections to captured chair labels. Original supplier data stays intact. */
const labels:Record<string,string>={
 'Mechanism':'Mechanizmas',
 'Headrest':'Galvos atrama',
 'Lumbar support':'Juosmens atrama',
 'Assembly':'Surinkimas',
 'Glides':'Pėdelės',
 'Seat':'Sėdynė',
 'Stacking protection':'Apsauga sukraunant kėdes',
 'Writing tablet':'Rašymo lentelė',
 'Armrest pads':'Porankių atraminės dalys',
 'Colour - media middle':'Vidurinio jungčių modulio spalva',
 'Colour concept':'Spalvų derinys',
 'Top instead of seat':'Stalviršis vietoje sėdynės',
 'Chipboard elements colour - desk internal surface':'Vidinės stalo pusės spalva',
 'Chipboard elements colour - desk external surface':'Išorinės stalo pusės spalva',
 'Upholstery colour - upper panel':'Viršutinės plokštės apmušalo spalva',
 'Chipboard elements colour - modesty panel':'Priekinės uždangos spalva',
 'Chipboard elements colour - side panel':'Šoninės plokštės spalva',
 'Colour - grommet':'Kabelių įvado spalva',
 'Chipboard elements colour - sideboard carcass':'Komodos korpuso spalva',
 'Chipboard elements colour - sideboard door':'Komodos durelių spalva',
 'Colour - sideboard handle':'Komodos rankenėlės spalva',
 'Chipboard elements colour - extension table top':'Papildomo stalviršio spalva',
 'Colour - extension top edge':'Papildomo stalviršio briaunos spalva',
 'Chipboard elements colour - flap':'Atverčiamo dangtelio spalva',
 'Colour - glass pad':'Stiklo įdėklo spalva',
 'Metal elements colour - footrest':'Kojų atramos metalo spalva',
 'Metal elements colour - bench armrest':'Porankių metalo spalva',
 'Metal elements material - armrest':'Porankių metalo apdaila',
 'Plastic elements colour - backrest':'Atlošo plastiko spalva',
 'Plastic elements colour - seat':'Sėdynės plastiko spalva',
 'Upholstering type':'Apmušalo tipas',
 'Upholstery colour - backrest outer side':'Išorinės atlošo pusės apmušalo spalva',
 'Upholstery colour - backrest inner side':'Vidinės atlošo pusės apmušalo spalva',
 'Upholstery group - backrest outer, side':'Išorinės atlošo pusės apmušalas',
 'Upholstery group - backrest inner side, seat':'Sėdynės ir vidinės atlošo pusės apmušalas',
 'Price group - backrest outer, side':'Išorinės atlošo pusės apmušalų kainų grupė',
 'Price group - backrest inner side, seat':'Sėdynės ir vidinės atlošo pusės apmušalų kainų grupė',
 'Wooden elements material - shell':'Korpuso mediena',
 'Upholstery colour - bottom shell pad part':'Apatinės korpuso dalies apmušalo spalva',
 'Upholstery colour - shell pad, upper part':'Viršutinės korpuso dalies apmušalo spalva',
 'Row connector':'Kėdžių jungtis',
 'Seat height':'Sėdynės aukštis','Seat width':'Sėdynės plotis','Backrest width':'Atlošo plotis',
 'Colour 3D upholstery - back of backrest':'Atlošo išorinės pusės 3D audinio spalva',
 'Colour 3D upholstery - headrest':'Galvos atramos 3D audinio spalva',
 '3D atlošo audinio spalva':'Atlošo išorinės pusės 3D audinio spalva',
 'Plastic elements colour - upper support of the backrest':'Viršutinės atlošo atramos plastiko spalva',
 'Plastic elements colour - headrest cover':'Galvos atramos gaubto spalva',
 'Plastic elements colour - supporting element':'Atraminės dalies plastiko spalva',
 'Plastic elements colour - backrest cover':'Atlošo gaubto spalva',
 'Suoliuko porankių metalo spalva':'Porankių metalo spalva',
 'Suoliuko porankių metalo apdaila':'Porankių metalo apdaila',
};
export function connectedFieldLabel(text:string){return text.split(' / ').map(part=>labels[part.trim()]||part).join(' / ');}
/** These are captured alternate catalogue aliases, not additional shades.
 * Keep textile marks and actual RAL/NCS references, never translate shade names. */
export function connectedColourLabel(text:string){
 let value=text.replace(/\s+(?:AL,\s*ALU,\s*WA,\s*X|BI,\s*(?:WH|WT),\s*W|CZ,\s*BL(?:\/BLT)?(?:,\s*Y)?|BI,\s*WT\/WTT|CR,\s*Z)(?=\s*$|\s*·)/g,'');
 value=value.replace(/^(?:(?:AL|ALU|WA|X|BI|WH|WT|W|CZ|BL|Y)\s*[·–-]?\s*)+(?=RAL\s*\d{4}\b)/,'');
 // A standardized paint reference is the visible mark. The captured trailing
 // two-letter catalogue shortcuts (GF, VB, NK...) are additional aliases.
 if(/\b(?:RAL\s+\d{3,4}|NCS\s+S?\s*\d)/.test(value)){
  const alias='(?:NK|VB|OG|OY|VR|WS|WK|GF|AL|ALU|WA|X|BI|WH|WT|WTT|W|CZ|BL|BLT|Y|SG|PW)';
  value=value.replace(new RegExp('(?:\\s*,\\s*|\\s+)'+alias+'(?:\\s*[,/]\\s*'+alias+')*\\s*$'),'');
  value=value.replace(new RegExp('^'+alias+'\\s*·\\s*(?=RAL\\b|NCS\\b)'),'');
  value=value.replace(/^[A-Z0-9_]+\s*·\s*(?=(?:RAL\s+\d|NCS\s+S?\s*\d))/,'');
 }
 value=value.replace(/(\b1\.007 Beech)\s+0C\b/g,'$1');
 value=value.replace(/\b(Polished Aluminium)\s+POL\b/g,'$1').replace(/^(?:POL|ALUPOL)\s*·\s*(?=Polished Aluminium)/,'');
 return value.trim();
}
export function connectedValueLabel(text:string){
 if(text==='None')return 'Nėra';
 if(/^Mini-glides, for hard floors(?: · kietoms grindims)?$/i.test(text))return 'Mažos pėdelės kietai grindų dangai';
 if(/^Mini-glides, for soft floors(?: · minkštoms grindims)?$/i.test(text))return 'Mažos pėdelės minkštai grindų dangai';
 return text;
}

/** Keep the Lithuanian configuration row when an imported specification repeats it. */
export function customerSummaryRows(rows:TechnicalRow[]):TechnicalRow[]{
 const normalized=rows.map(row=>({...row,label:connectedFieldLabel(row.label)}));
 const preferred=new Map<string,number>();
 normalized.forEach((row,index)=>{
  const key=row.label.toLocaleLowerCase('lt');
  const current=preferred.get(key);
  if(current===undefined||rows[current].label!==normalized[current].label&&rows[index].label===row.label)preferred.set(key,index);
 });
 const result:TechnicalRow[]=[];
 normalized.forEach((row,index)=>{
  const key=row.label.toLocaleLowerCase('lt'),winner=preferred.get(key)!;
  const aliases=normalized.filter((entry,i)=>entry.label.toLocaleLowerCase('lt')===key&&rows[i].label!==entry.label);
  if(aliases.length&&index!==winner&&rows[index].label!==row.label)return;
  if(aliases.length&&index===winner&&row.label==='Mechanizmas'&&!/\d+\s*°/.test(row.value)){
   const angle=aliases.map(entry=>entry.value.match(/([−–-]?\d+(?:[.,]\d+)?\s*°)/)?.[1]).find(Boolean);
   if(angle){result.push({...row,value:row.value+' ('+angle+')'});return;}
  }
  result.push(row);
 });
 return result;
}
