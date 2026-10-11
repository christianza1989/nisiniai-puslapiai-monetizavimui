export function publicLocation(d,id){
 const l=d.locations.find(l=>l.id===id);if(!l||l.active===false)return null;
 const value=l.published||(l.state?null:l);if(!value)return null;
 const o=d.organizations.find(o=>o.id===l.organizationId);
 return {id:l.id,organizationId:l.organizationId,label:value.label||o?.name||'Veiklos vieta',city:value.city,area:value.area||'',publicAddress:value.publicAddress||'',openingHoursLabel:value.openingHoursLabel||'Pagal darbo grafiką',latitude:value.latitude??null,longitude:value.longitude??null,version:l.publicVersion||1};
}
export const practitionerPlaces=(d,p)=>p.locationIds||[p.locationId||d.organizations.find(o=>o.id===p.organizationId)?.locationId];
export const bookingPlace=(d,b)=>b.locationId||b.serviceSnapshot?.location?.id||d.services.find(s=>s.id===b.providerServiceId)?.locationId||d.organizations.find(o=>o.id===b.organizationId)?.locationId;
export const staffAtLocation=(d,p,id)=>p.active&&practitionerPlaces(d,p).includes(id);
export const resourceAtLocation=(d,r,id)=>r.active&&(r.locationId||d.organizations.find(o=>o.id===r.organizationId)?.locationId)===id;
export function locationSchedule(d,p,id){return d.schedules.find(s=>s.practitionerId===p.id&&(s.locationId||p.locationId||d.organizations.find(o=>o.id===p.organizationId)?.locationId)===id);}
export function distanceKm(a,b){
 if(!a||!b||a.latitude==null||a.longitude==null||b.latitude==null||b.longitude==null)return null;
 const rad=n=>n*Math.PI/180,lat=rad(b.latitude-a.latitude),lon=rad(b.longitude-a.longitude),v=Math.sin(lat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(lon/2)**2;
 return Math.round(6371*2*Math.atan2(Math.sqrt(v),Math.sqrt(1-v))*100)/100;
}
