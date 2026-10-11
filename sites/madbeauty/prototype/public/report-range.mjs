// Shared date-only validation; the server separately computes Vilnius local-day boundaries.
export function validateReportRange(from,to){
 const noon=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)?Date.parse(value+'T12:00:00Z'):NaN;
 const a=noon(from),b=noon(to);
 if(!Number.isFinite(a)||!Number.isFinite(b)||new Date(a).toISOString().slice(0,10)!==from||new Date(b).toISOString().slice(0,10)!==to)return {error:'Pasirinkite galiojančią pradžios ir pabaigos datą.'};
 if(a>b)return {error:'Pabaigos data negali būti ankstesnė už pradžios datą.'};
 if(b-a>91*86400000)return {error:'Pasirinkite ne ilgesnį kaip 92 dienų laikotarpį.'};
 return {fromNoon:a,toNoon:b,days:(b-a)/86400000+1};
}
