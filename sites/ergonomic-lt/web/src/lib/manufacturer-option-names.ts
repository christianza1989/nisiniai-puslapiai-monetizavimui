/** Translate explicit supplier words; never assign a colour from a finish code. */
export function manufacturerOptionName(binding:string,english:string):string|undefined{
 const field=binding.match(/^value:([^=]+)=/)?.[1];if(!field)return;
 const s=english.trim().replace(/\s+/g,' '),lower=s.toLowerCase();
 if(/^(?:G?D|GD)/.test(field)&&/^\d+(?:[.,]\d+)?\s*(?:mm|cm)$/i.test(s))return s;
 if(/SOCKET/.test(field))return /european/.test(lower)?'Europos standartas':/german/.test(lower)?'Vokiškasis standartas':undefined;
 if(!/COLOR|COL$|CHCOL/.test(field))return;
 // Owner decision 2026-11-06: colour names retain their supplier language.
 return s||undefined;
}
