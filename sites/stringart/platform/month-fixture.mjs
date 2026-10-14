import { Store } from './store.mjs';
import { makeSeed, identities, sampleProject } from './seed.mjs';

export const MONTH = Object.freeze({label:'September 2026',start:'2026-09-01T00:00:00.000Z',end:'2026-09-30T23:59:59.999Z',snapshot:'2026-09-30T23:59:59.999Z',timezone:'UTC'});
export const VOLUMES = [45,72,51,39,78,36,54,42,39,33];
const names = [['Ema','Jonas','Ruta','Mantas'],['Clara','Felix','Anna','Leon'],['Sanne','Daan','Noor','Lars'],['Camille','Louis','Lea','Hugo'],['Zofia','Jan','Maja','Adam'],['Lucia','Mateo','Elena','Pablo'],['Giulia','Luca','Sofia','Marco'],['Elsa','Erik','Alma','Oskar'],['Freja','Emil','Ida','Oliver'],['Aino','Elias','Sofia','Onni']];
const surnames = ['Brook','Vale','Reed','Wren','Rowan','Field','Lane','Lake'];
const occasions = ['Birthday gift','Family keepsake','Pet memory','Anniversary gift','New home gift','Weekend craft'];
const stamp=(day,hour=8,minute=0)=>new Date(Date.UTC(2026,8,day,hour,minute)).toISOString();

function opening(){
 const s=makeSeed();s.fixture='eu-ten-september-2026-v1';s.period={...MONTH};
 // August sales predate September's independently counted opening stock.
 s.orders=s.partners.map((p,i)=>{
  const previous=s.orders.find(o=>o.tenant===p.id&&o.type==='portrait'),project=sampleProject();project.createdAt='2026-08-02T09:00:00.000Z';
  return {...previous,id:`MS-${p.id.toUpperCase()}-090`,customer:`Demo ${names[i][0]} ${surnames[i%8]} · August`,email:`august@${p.id}.customers.example`,channel:'Instagram creator',at:'2026-08-01T09:00:00.000Z',deliveredAt:'2026-08-05T10:00:00.000Z',referral:`creator-${p.id}`,revisions:[{number:1,project,note:'Opening historical AI sample; materials predate this month',at:'2026-08-02T09:00:00.000Z'}],history:[{state:'delivered',at:'2026-08-05T10:00:00.000Z',note:'August opening history; excluded from September order-cohort sales'}]};
 });
 s.referrals.push(...s.partners.map((p,i)=>({id:`creator-${p.id}`,name:`${names[i][1]} · ${p.city} ${i%2?'YouTube craft':'Instagram gifts'}`,code:`${p.id.toUpperCase()}CRAFT10`,email:`creator@${p.id}.creators.example`,rate:0.1})));
 s.commissions=s.orders.map(o=>({orderId:o.id,tenant:o.tenant,referral:o.referral,basisCents:o.goodsCents,amountCents:Math.round(o.goodsCents/1.21*.1),status:'held',releaseAt:'2026-09-04T10:00:00.000Z',adjustments:[],payout:null}));
 s.purchases=[];s.transfers=[];s.assemblies=[];
 s.machines.forEach(m=>{m.status='ready';m.service=[{at:'2026-08-31T16:00:00.000Z',note:'Opening synthetic inspection: guide and tension checked',actor:`partner-${m.tenant}`}];});
 for(const b of s.stock){const i=s.partners.findIndex(p=>p.id===b.tenant);if(b.sku!=='kit42')b.onHand=b.sku==='thread'?18000+i*1000:b.sku==='nails'?10000+i*500:40+i*2;}
 s.movements=s.stock.map((b,i)=>({id:`opening-${i}`,transaction:'september-opening',tenant:b.tenant,sku:b.sku,onHand:b.onHand,reserved:0,reason:'Counted synthetic opening balance · 1 September',link:s.fixture,actor:'operator',at:MONTH.start}));
 s.audit=[{id:'month-seed',at:MONTH.start,actor:'operator',role:'operator',tenant:null,type:'seed',entity:s.fixture,note:'September transactions replayed through the business engine; August carry-over orders excluded from monthly sales'}];
 return s;
}

// Replay the existing business engine; no alternative stock/commission arithmetic.
// Fixture-only clock and IDs never accept timestamps from an HTTP caller.
export function makeMonthSeed(){
 let now=MONTH.start,activeTenant='network',serial=0,key=0,eventSerial=0;
 const orderNumbers=new Map(),events=[];
 const store=new Store(':memory:',{seedFactory:opening,clock:()=>now,idFactory:prefix=>prefix==='MS'?`MS-${activeTenant.toUpperCase()}-${100+(orderNumbers.get(activeTenant)||0)}`:`${prefix}-SEP-${String(++serial).padStart(6,'0')}`});
 // This disposable batch has no readers, concurrent writers or recovery/retry.
 // Retain state between commands instead of serializing thousands of complete
 // snapshots. Any failed command aborts the entire build and exports nothing.
 // Loading the completed result still uses the normal atomic SQLite write.
 let replayState=store.read();store.read=()=>replayState;store.write=s=>{replayState=s;};
 const op=identities[0],supplier=identities.find(a=>a.id==='supplier');
 const partner=tenant=>identities.find(a=>a.tenant===tenant&&a.role==='partner');
 const schedule=(at,fn)=>{if(at<=MONTH.end)events.push({at,fn,serial:++eventSerial});};
 const run=(actor,type,values={})=>{activeTenant=values.tenant||actor.tenant||'network';const result=store.command(actor,{type,key:`september-${++key}`,...values}).result;if(type==='order.create')orderNumbers.set(activeTenant,(orderNumbers.get(activeTenant)||0)+1);return result;};
 const mutateOrder=(tenant,ref,action,values={})=>{const o=store.order(partner(tenant),ref.id);return run(partner(tenant),`order.${action}`,{id:o.id,version:o.version,...values});};
 const stage=(tenant,ref,day,hour,minute,action,values={})=>schedule(stamp(day,hour,minute),()=>mutateOrder(tenant,ref,action,typeof values==='function'?values():values));
 const ownReady=(tenant,orderId)=>store.read().machines.find(m=>m.tenant===tenant&&m.status==='ready'&&(!m.job||m.job===orderId))?.id;
 const partners=store.read().partners;
 try{
  for(const [i,p] of partners.entries()){
   const actor=partner(p.id);
   schedule(stamp(6,16,i),()=>run(op,'commission.payout',{id:`MS-${p.id.toUpperCase()}-090`}));
   if(i%3===0)schedule(stamp(10,16,i),()=>{const o=store.order(actor,`MS-${p.id.toUpperCase()}-090`);run(actor,'order.refund',{id:o.id,version:o.version,goodsCents:2500,shippingCents:0});});
   for(const day of [3,10,17,24])schedule(stamp(day,7,i),()=>run(actor,'stock.assemble',{tenant:p.id,qty:4+i%4}));
   schedule(stamp(13,18,i),()=>{const m=store.read().machines.find(m=>m.tenant===p.id);run(actor,'machine.service',{id:m.id,version:m.version,status:'service',note:'Scheduled synthetic guide cleaning and tension inspection'});});
   schedule(stamp(14,7,i),()=>{const m=store.read().machines.find(m=>m.tenant===p.id);run(actor,'machine.service',{id:m.id,version:m.version,status:'ready',note:'Synthetic preventive inspection complete; station returned to service'});});
   schedule(stamp(22,18,i),()=>run(actor,'stock.adjust',{tenant:p.id,sku:'insert',delta:-1-i%3,reason:'September cycle count: damaged instruction inserts removed'}));
   for(const [sku,qty,unitCents,day] of [['thread',12000+i*500,1,2],['board42',24,700,12],['nails',4000,2,12],['cover42',24,350,12],['box42',24,240,12],['insert',24,30,12],['kit42',12+i,5400,12]]){
    const ref={};schedule(stamp(day,6,i),()=>{ref.id=run(op,'purchase.create',{tenant:p.id,sku,qty,unitCents,eta:`2026-09-${String(day+5).padStart(2,'0')}`}).id;});
    for(const [offset,action,who] of [[1,'acknowledge',supplier],[2,'dispatch',supplier],[5,'receive',op]])schedule(stamp(day+offset,6,i),()=>{const po=store.read().purchases.find(x=>x.id===ref.id);run(who,`purchase.${action}`,{id:po.id,version:po.version,...(action==='acknowledge'?{eta:po.eta}:{})});});
   }
   for(const [sku,day,state,eta] of [['thread',26,'in_transit','2026-10-05'],['kit42',29,'acknowledged','2026-10-06'],['board42',30,'proposed','2026-10-08']]){
    const ref={};schedule(stamp(day,6,i),()=>{ref.id=run(op,'purchase.create',{tenant:p.id,sku,qty:sku==='thread'?15000:20,unitCents:sku==='thread'?1:sku==='kit42'?5400:700,eta}).id;});
    if(state!=='proposed')schedule(stamp(day,7,i),()=>{const po=store.read().purchases.find(x=>x.id===ref.id);run(supplier,'purchase.acknowledge',{id:po.id,version:po.version,eta});});
    if(state==='in_transit')schedule(stamp(day+1,7,i),()=>{const po=store.read().purchases.find(x=>x.id===ref.id);run(supplier,'purchase.dispatch',{id:po.id,version:po.version});});
   }
   for(const [day,endState] of [[18,'received'],[28,i%2?'reserved':'in_transit']]){
    const ref={},destination=partners[(i+1)%partners.length].id;
    schedule(stamp(day,17,i),()=>{ref.id=run(op,'transfer.create',{from:p.id,to:destination,sku:'kit42',qty:2+i%3}).id;});
    if(endState!=='reserved')schedule(stamp(day+1,17,i),()=>{const tr=store.read().transfers.find(x=>x.id===ref.id);run(actor,'transfer.dispatch',{id:tr.id,version:tr.version});});
    if(endState==='received')schedule(stamp(day+2,17,i),()=>{const tr=store.read().transfers.find(x=>x.id===ref.id);run(partner(destination),'transfer.receive',{id:tr.id,version:tr.version});});
   }
   let ordinal=0;
   for(let day=1;day<=30;day++){
    const count=Math.floor(day*VOLUMES[i]/30)-Math.floor((day-1)*VOLUMES[i]/30);
    for(let slot=0;slot<count;slot++){
     const n=ordinal++,special=slot===0,ref={};
     const type=special&&[1,8,12,20,23,30].includes(day)?'portrait':special&&[4,9,16].includes(day)?'kit':[8,30].includes(day)?'kit':(day+slot+i)%3===0?'portrait':'kit';
     const target=day===30&&special?['inquiry','needs_photo','suitable','preview','approved','paid','reserved','producing','quality_failed','quality'][i]:day===29?(type==='portrait'?['preview','approved','paid','reserved'][i%4]:'packed'):'delivered';
     const referral=(day+slot)%4===0?null:(day+slot)%5===0?'creator-lena':(day+slot)%7===0?'creator-milo':`creator-${p.id}`;
     schedule(stamp(day,8,slot*10+i),()=>{ref.id=run(actor,'order.create',{tenant:p.id,orderType:type,customer:`Demo ${names[i][n%4]} ${surnames[Math.floor(n/4)%8]} ${n+1}`,email:`buyer${n+1}@${p.id}.customers.example`,title:`42 cm ${type==='kit'?'DIY kit':'pet portrait'} · ${occasions[(n+i)%occasions.length]}`,quantity:type==='kit'?1+(n+i)%3:1,referral,channel:referral?(i%2?'YouTube creator':'Instagram creator'):n%3?'Direct website':'Local craft workshop'}).id;});
     if(target==='inquiry')continue;
     if(type==='portrait'){
      stage(p.id,ref,day,8,40+slot*3,'assess',{suitable:target!=='needs_photo',note:target==='needs_photo'?'Replacement photo requested: subject is too small in the synthetic example':'Single subject accepted in synthetic photo review'});if(target==='needs_photo'||target==='suitable')continue;
      stage(p.id,ref,day,9,slot*4,'preview',()=>{const project=sampleProject();project.createdAt=now;project.id=`${ref.id}-r1`;return {project,note:'Prepared original AI-photo sample for the requested pet portrait'};});
      if(special&&day===23)stage(p.id,ref,day,9,20,'preview',()=>{const project=sampleProject(2);project.createdAt=now;project.id=`${ref.id}-r2`;return {project,note:'Second synthetic preview after a crop/contrast review'};});
      if(target==='preview')continue;
      stage(p.id,ref,day,9,30+slot*3,'approve',()=>({revision:store.order(actor,ref.id).revisions.at(-1).number,simulated:true}));if(target==='approved')continue;
     }
     stage(p.id,ref,day,10,slot*4,'pay',{simulated:true});if(target==='paid')continue;
     stage(p.id,ref,day,10,20+slot*4,'reserve');if(target==='reserved')continue;
     if(special&&day===12){stage(p.id,ref,day,11,0,'cancel',{note:'Gift date changed; unused reservations released and payment refunded'});continue;}
     if(type==='portrait'){
      const productionDay=day===30?30:day+1,productionHour=day===30?12:8+slot*3;
      stage(p.id,ref,productionDay,productionHour,i,'produce',()=>({machineId:ownReady(p.id,ref.id)}));if(target==='producing')continue;
      if(special&&day===20){stage(p.id,ref,productionDay,productionHour+1,i,'cancel',{note:'Customer cancelled after production issue; consumed materials written off'});continue;}
      const rework=special&&day===8;
      stage(p.id,ref,productionDay,productionHour+2,30+i,'quality',{pass:!rework&&target!=='quality_failed',note:rework||target==='quality_failed'?'Synthetic inspection: loose thread; replacement material required':'Synthetic inspection: likeness, thread tension and finish accepted'});if(target==='quality_failed')continue;
      if(rework){stage(p.id,ref,productionDay+1,8,i,'rework',()=>({machineId:ownReady(p.id,ref.id),note:'Full replacement production BOM issued after the tension inspection'}));stage(p.id,ref,productionDay+1,10,30+i,'quality',{pass:true,note:'Synthetic rework accepted after replacement thread and board'});}
      if(target==='quality')continue;
      const packDay=productionDay+(rework?1:0),packHour=rework?11:productionHour+3;
      stage(p.id,ref,packDay,packHour,i,'pack');stage(p.id,ref,packDay,packHour,30+i,'ship',{simulated:true});stage(p.id,ref,packDay+2,15,i,'deliver');
     }else{
      if(day===30)continue;
      stage(p.id,ref,day+1,11,slot*8+i,'pack');if(target==='packed')continue;stage(p.id,ref,day+1,12,slot*8+i,'ship',{simulated:true});stage(p.id,ref,day+3,15,slot*8+i,'deliver');
     }
     if(special&&day===4)stage(p.id,ref,day+6,16,i,'refund',{goodsCents:9999,shippingCents:0});
     if(special&&day===9){stage(p.id,ref,day+5,16,i,'return',{restock:true,note:'Returned unopened kit inspected; packed SKU restored once'});stage(p.id,ref,day+5,17,i,'refund',()=>{const o=store.order(actor,ref.id);return {goodsCents:o.goodsCents,shippingCents:o.shippingCents};});}
     if(special&&day===16)stage(p.id,ref,day+5,16,i,'refund',{goodsCents:0,shippingCents:900});
     if(special&&day===23)stage(p.id,ref,day+5,16,i,'refund',{goodsCents:2000,shippingCents:0});
    }
   }
  }
  schedule(stamp(30,7,40),()=>{const m=store.read().machines.find(m=>m.id==='machine-se-2');run(partner('se'),'machine.service',{id:m.id,version:m.version,status:'service',note:'Synthetic follow-up: thread guide inspection pending'});});
  events.sort((a,b)=>a.at.localeCompare(b.at)||a.serial-b.serial);
  for(const event of events){now=event.at;try{event.fn();}catch(e){throw Error(`Month fixture failed at ${now} (${event.serial}): ${e.message}`,{cause:e});}}
  return structuredClone(store.read());
 }finally{store.close();}
}
