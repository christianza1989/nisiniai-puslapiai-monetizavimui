import {reject} from './primitives.mjs';
import {plus} from './occupancy.mjs';
export function normalizePhases(value,durationMin){
 if(value===undefined||Array.isArray(value)&&!value.length)return [];
 if(!Array.isArray(value)||value.length>8)reject('INVALID_INPUT','Vienai procedūrai galima nurodyti iki 8 fazių.');
 const phases=value.map(p=>{if(!p||typeof p.label!=='string'||!p.label.trim()||p.label.trim().length>80||!Number.isInteger(p.durationMin)||p.durationMin<1||p.durationMin>480||typeof p.staffBusy!=='boolean'||typeof p.resourceBusy!=='boolean')reject('INVALID_INPUT','Kiekvienai fazei įrašykite pavadinimą, trukmę ir meistro bei darbo vietos užimtumą.');return {label:p.label.trim(),durationMin:p.durationMin,staffBusy:p.staffBusy,resourceBusy:p.resourceBusy};});
 if(!phases.some(p=>p.staffBusy||p.resourceBusy))reject('INVALID_INPUT','Bent vienoje fazėje turi būti užimtas meistras arba darbo vieta.');
 if(durationMin!==null&&phases.reduce((n,p)=>n+p.durationMin,0)!==durationMin)reject('INVALID_INPUT','Fazių trukmių suma turi sutapti su procedūros trukme.');return phases;
}
export function phaseTiming(service,startAt,calc){
 const configured=service.phases?.length?service.phases:[{label:service.label,durationMin:service.durationMin,staffBusy:true,resourceBusy:true}],phases=[];let at=startAt;
 for(const p of configured){const endAt=plus(at,p.durationMin);phases.push({...p,startAt:at,endAt});at=endAt;}
 if(calc.durationMin>service.durationMin)phases.push({label:'Pasirinkti priedai',durationMin:calc.durationMin-service.durationMin,staffBusy:true,resourceBusy:true,startAt:at,endAt:plus(startAt,calc.durationMin)});
 const range=(p,startAt,endAt)=>({practitionerId:p.staffBusy?service.practitionerId:null,resourceId:p.resourceBusy?service.resourceId:null,locationId:service.locationId,startAt,endAt});
 const occupancies=phases.filter(p=>p.staffBusy||p.resourceBusy).map(p=>range(p,p.startAt,p.endAt));
 if(service.bufferBeforeMin)occupancies.unshift(range({staffBusy:true,resourceBusy:true},plus(startAt,-service.bufferBeforeMin),startAt));
 if(service.bufferAfterMin)occupancies.push(range({staffBusy:true,resourceBusy:true},plus(startAt,calc.durationMin),plus(startAt,calc.durationMin+service.bufferAfterMin)));
 return {phases,occupancies};
}
