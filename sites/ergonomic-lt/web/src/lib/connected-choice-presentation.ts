import {isColourField} from './colour-fields';
/** The captured supplier field explicitly means "Colour - stitching on seat". */
export const connectedColourField=(field:string)=>isColourField(field)||field==='CSEATDECSTITCHING';
/** Narrow corrections to captured chair labels. Original supplier data stays intact. */
const labels:Record<string,string>={
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
export function connectedFieldLabel(text:string){return text.split(' / ').map(part=>labels[part]||part).join(' / ');}
/** These are captured alternate catalogue aliases, not additional shades.
 * Keep textile marks and actual RAL/NCS references, never translate shade names. */
export function connectedColourLabel(text:string){
 let value=text.replace(/\s+(?:AL,\s*ALU,\s*WA,\s*X|BI,\s*(?:WH|WT),\s*W|CZ,\s*BL,\s*Y|CR,\s*Z)(?=\s*$|\s*·)/g,'');
 value=value.replace(/^(?:(?:AL|ALU|WA|X|BI|WH|WT|W|CZ|BL|Y)\s*[·–-]?\s*)+(?=RAL\s*\d{4}\b)/,'');
 value=value.replace(/\b(Polished Aluminium)\s+POL\b/g,'$1').replace(/^(?:POL|ALUPOL)\s*·\s*(?=Polished Aluminium)/,'');
 return value.trim();
}
export function connectedValueLabel(text:string){return text==='None'?'Nėra':text;}
