export const plus=(iso,min)=>new Date(Date.parse(iso)+min*60000).toISOString();
export const overlaps=(a,b,c,d)=>Date.parse(a)<Date.parse(d)&&Date.parse(c)<Date.parse(b);
export const visitSegments=record=>record.segments?.length?record.segments:[record];
export const bookingUses=(record,key,value)=>visitSegments(record).some(s=>s[key]===value);
export function occupiedRanges(record){
 return visitSegments(record).flatMap(s=>s.occupancies||[{practitionerId:s.practitionerId,resourceId:s.resourceId,locationId:s.locationId||record.locationId,startAt:s.occupiedStart||plus(s.startAt,-(s.bufferBeforeMin||0)),endAt:s.occupiedEnd||plus(s.endAt,s.bufferAfterMin||0)}]);
}
export function rangesConflict(d,a,b,practitioner){
 const sameStaff=a.practitionerId&&a.practitionerId===b.practitionerId,sameResource=a.resourceId&&a.resourceId===b.resourceId;
 const travel=sameStaff&&a.locationId!==b.locationId?(practitioner.transferBufferMin||0):0;
 return (sameStaff||sameResource)&&overlaps(a.startAt,a.endAt,plus(b.startAt,-travel),plus(b.endAt,travel));
}
