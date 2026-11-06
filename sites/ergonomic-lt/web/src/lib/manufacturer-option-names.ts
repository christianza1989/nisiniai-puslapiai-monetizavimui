/** Translate explicit supplier words; never assign a colour from a finish code. */
export function manufacturerOptionName(binding:string,english:string):string|undefined{
 const field=binding.match(/^value:([^=]+)=/)?.[1];if(!field)return;
 const s=english.trim().replace(/\s+/g,' '),lower=s.toLowerCase();
 if(/^(?:G?D)(?:TOPS?|FRAME|SEAT)?(?:WIDTH|DEPTH|HEIGHT|DIAMETER|LENGTH|THICKNESS|RADIUS)$/.test(field)){
  // Captured manufacturer measurements, including totals and repeated tops.
  // Never decode concatenated identifiers such as _14902X700 into dimensions.
  const dimension=s.replace(/\bwith panel\b/gi,'su pertvara').replace(/(\d)\s*[xX×]\s*(?=\d)/g,'$1 × ');
  const numeric=dimension.replace(/\b(?:mm|cm|su pertvara)\b/gi,'');
  if(/\b(?:mm|cm)\b/i.test(dimension)&&/^[\d\s.,/()×–−-]+$/.test(numeric))return dimension;
 }
 if(/SOCKET/.test(field))return /european/.test(lower)?'Europos standartas':/german/.test(lower)?'Vokiškasis standartas':undefined;
 if(!/COLOR|COL$|CHCOL/.test(field))return;
 // Owner decision 2026-11-06: colour names retain their supplier language.
 return s||undefined;
}
