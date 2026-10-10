import {normalizeSearch} from '../prototype/taxonomy.mjs';
export function matchingQuotes(s,filters={}){
 return (s.staffOptions||[{practitionerId:s.practitionerId,name:s.practitionerName,priceMinor:s.priceMinor,durationMin:s.durationMin}]).filter(q=>(!filters.practitionerId||q.practitionerId===filters.practitionerId)&&(filters.maxPrice==null||q.priceMinor<=filters.maxPrice)&&(!filters.name||normalizeSearch(q.name+' '+s.label+' '+s.organizationName).includes(normalizeSearch(filters.name))));
}
// Group only the approved, currently matching service projection; never raw provider state.
export function groupSearchRows(rows,filters={}){
 const salons=new Map(),professionals=new Map();
 const make=(s,type,id,name)=>({id,entityType:type,organizationId:s.organizationId,locationId:s.locationId,kind:s.kind,name,organizationName:s.organizationName,city:s.city,location:s.location,distanceKm:s.distanceKm??null,avatarImageId:s.avatarImageId,media:s.media||[],reviewSummary:s.reviewSummary||null,services:[],slots:[]});
 const add=(group,s,quote,slots)=>{if(!group.services.some(x=>x.id===s.id))group.services.push({id:s.id,label:s.label,priceMinor:quote.priceMinor,durationMin:quote.durationMin,bookingMode:s.bookingMode||'instant',needsOptions:s.availability?.state==='needs-options'});for(const c of slots)if(!group.slots.some(x=>x.id===c.id))group.slots.push(c);};
 for(const s of rows){
  const slots=s.availability?.slots||[];
  if(s.kind==='salon'){const key=s.organizationId+'|'+s.locationId;if(!salons.has(key))salons.set(key,make(s,'salon',key,s.organizationName));add(salons.get(key),s,s,slots);}
  for(const quote of s.staffOptions||[{practitionerId:s.practitionerId,name:s.practitionerName,priceMinor:s.priceMinor,durationMin:s.durationMin}]){
   if(filters.practitionerId&&quote.practitionerId!==filters.practitionerId||filters.maxPrice!=null&&quote.priceMinor>filters.maxPrice)continue;
   if(filters.name&&!normalizeSearch(quote.name+' '+s.label+' '+s.organizationName).includes(normalizeSearch(filters.name)))continue;
   const own=slots.filter(c=>c.practitionerId===quote.practitionerId);if(!filters.anyTime&&(!s.bookingMode||s.bookingMode==='instant')&&s.availability?.state!=='needs-options'&&!own.length)continue;
   const key=s.organizationId+'|'+quote.practitionerId+'|'+s.locationId;if(!professionals.has(key))professionals.set(key,{...make(s,'professional',key,quote.name),practitionerId:quote.practitionerId});add(professionals.get(key),s,quote,own);
  }
 }
 const finish=map=>[...map.values()].map(g=>({...g,slots:g.slots.sort((a,b)=>a.startAt.localeCompare(b.startAt)||a.id.localeCompare(b.id)),priceMinor:Math.min(...g.services.map(s=>s.priceMinor)),nextAt:g.slots.map(c=>c.startAt).sort()[0]||null})).sort(filters.sort==='price'?(a,b)=>a.priceMinor-b.priceMinor||a.id.localeCompare(b.id):filters.sort==='name'?(a,b)=>a.name.localeCompare(b.name,'lt')||a.id.localeCompare(b.id):filters.sort==='distance'?(a,b)=>(a.distanceKm??Infinity)-(b.distanceKm??Infinity)||a.id.localeCompare(b.id):(a,b)=>(a.nextAt||'z').localeCompare(b.nextAt||'z')||a.id.localeCompare(b.id));
 return {treatments:rows,salons:finish(salons),professionals:finish(professionals)};
}
