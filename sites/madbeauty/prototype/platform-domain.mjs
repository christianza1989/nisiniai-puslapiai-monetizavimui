import {localInstant,visitFits} from './demo-model.mjs';

export const DEMO_NAMESPACE='madbeauty-demo:madbeauty-v1:platform-v1';
export class DemoError extends Error {constructor(code,message){super(message);this.code=code;}}
export const fail=(code,message)=>{throw new DemoError(code,message);};
const clone=x=>structuredClone(x);
const overlaps=(a,b,c,d)=>Date.parse(a)<Date.parse(d)&&Date.parse(c)<Date.parse(b);
const plus=(iso,min)=>new Date(Date.parse(iso)+min*60000).toISOString();
export function enrichDemo(data){
  data.resources=data.organizations.map(o=>({id:o.id+'-room',organizationId:o.id,isDemo:true,label:'Procedūros vieta',active:true,version:1}));
  data.schedules=data.practitioners.map(p=>({id:p.id+'-schedule',organizationId:p.organizationId,practitionerId:p.id,isDemo:true,startMin:540,endMin:1200,breakStartMin:780,breakEndMin:840,closedDay:null,version:1}));
  data.services.forEach(s=>{s.resourceId=s.organizationId+'-room';s.version=1;});
  data.bookings.forEach(b=>{const s=data.services.find(s=>s.id===b.providerServiceId);b.resourceId=s.resourceId;b.bufferBeforeMin=s.bufferBeforeMin;b.bufferAfterMin=s.bufferAfterMin;b.version=1;});
  data.busyBlocks=data.organizations.map(o=>({id:o.id+'-busy',organizationId:o.id,resourceId:o.id+'-room',startAt:localInstant(data.clock,1,960),endAt:localInstant(data.clock,1,990),isDemo:true}));
  data.organizations.forEach(o=>{o.version=1;o.profileState=o.approved?'approved':'draft';o.bio='Privatus demonstracinis profilis. Paslaugos, darbai ir vieta yra fiktyvūs.';o.gallery=['studio','nails-neutral','nails-french'];});
  data.holds=[];data.outbox=[];data.messages=[];data.revisions=[];data.reports=[];data.preferences=[];data.events=[];data.idempotency={};data.sequence=0;
  return data;
}
export function attachPlatform(base,data,{scenario,persistence=null}){
  let d=data;
  try{const saved=persistence?.load?.();if(saved?.namespace===DEMO_NAMESPACE&&saved.clock===d.clock.now&&saved.data?.isDemo&&saved.data.clients.every(c=>c.isDemo&&/@example\.com$/.test(c.email))){d=saved.data;}}catch{/* corrupt/private storage falls back only in explicitly enabled demo */}
  const now=()=>Date.parse(base.clock.now);
  const save=()=>{try{persistence?.save?.({namespace:DEMO_NAMESPACE,clock:d.clock.now,data:d});}catch{fail('STORAGE_FAILED','Vietinė demo saugykla nepasiekiama. Išvalykite demo ir bandykite dar kartą.');}};
  const next=type=>'demo-'+type+'-local-'+(++d.sequence);
  const entity=(table,id)=>{const e=d[table].find(e=>e.id===id);if(!e)fail('NOT_FOUND','Demonstracinis įrašas nerastas.');return e;};
  const access=(scope,org=null)=>{
    if(scenario==='permission-denied')fail('FORBIDDEN','Šio scenarijaus paskyrai prieiga neleidžiama. Pasirinkite įprastą scenarijų.');
    if(!scope||!['customer','professional','operator'].includes(scope.role))fail('UNAUTHENTICATED','Pasirinkite demonstracinę rolę.');
    if(scope.role==='professional'&&(!scope.organizationId||org&&scope.organizationId!==org))fail('FORBIDDEN','Kitos organizacijos duomenys neprieinami.');
    if(scope.role==='customer'&&!scope.clientId)fail('UNAUTHENTICATED','Pasirinkite demo klientą.');
  };
  const total=s=>({durationMin:s.durationMin,priceMinor:s.priceMinor});
  function option(s,addons=[]){
    if(!Array.isArray(addons)||addons.some(id=>!s.addons.some(a=>a.id===id)))fail('INVALID_INPUT','Nežinomas paslaugos priedas.');
    const selected=s.addons.filter(a=>addons.includes(a.id));return{...total(s),durationMin:s.durationMin+selected.reduce((n,a)=>n+a.durationMin,0),priceMinor:s.priceMinor+selected.reduce((n,a)=>n+a.priceMinor,0),addons:selected};
  }
  function slots(input){
    const {providerServiceId,addons=[],dayOffset=1,from=1020,to=1200,ignoreBookingId=null}=input;
    const s=entity('services',providerServiceId),o=entity('organizations',s.organizationId),schedule=entity('schedules',s.practitionerId+'-schedule');
    if(!Number.isInteger(dayOffset)||dayOffset<0||dayOffset>30||!Number.isInteger(from)||!Number.isInteger(to)||from<0||to>1439||from>=to)fail('INVALID_INPUT','Pasirinkite datą per 30 dienų ir teisingą valandų intervalą.');
    const calc=option(s,addons),state=scenario==='stale'?'stale':scenario==='no-calendar'?'none':o.calendarState;
    const meta={source:'private-demo',asOf:base.clock.now,expiresAt:plus(base.clock.now,5),scheduleVersion:schedule.version,...calc};
    if(!o.approved||!entity('resources',s.resourceId).active)return{state:'unavailable',slots:[],...meta};
    if(state!=='current')return{state,slots:[],...meta};
    if(scenario==='no-slots'||schedule.closedDay===dayOffset)return{state:'no-slots',slots:[],...meta};
    const windowStart=localInstant(base.clock,dayOffset,from),windowEnd=localInstant(base.clock,dayOffset,to);
    const shiftStart=localInstant(base.clock,dayOffset,schedule.startMin),shiftEnd=localInstant(base.clock,dayOffset,schedule.endMin);
    const breakStart=localInstant(base.clock,dayOffset,schedule.breakStartMin),breakEnd=localInstant(base.clock,dayOffset,schedule.breakEndMin);
    const out=[];
    for(let minute=from;minute<=to;minute+=15){
      if(minute>1439)break;
      const startAt=localInstant(base.clock,dayOffset,minute),endAt=plus(startAt,calc.durationMin),occupiedStart=plus(startAt,-s.bufferBeforeMin),occupiedEnd=plus(endAt,s.bufferAfterMin);
      if(Date.parse(startAt)<now()+30*60000||!visitFits({startAt,durationMin:calc.durationMin,windowStart,windowEnd})||Date.parse(occupiedStart)<Date.parse(shiftStart)||Date.parse(occupiedEnd)>Date.parse(shiftEnd)||overlaps(occupiedStart,occupiedEnd,breakStart,breakEnd))continue;
      if(d.bookings.some(b=>b.id!==ignoreBookingId&&b.status==='confirmed'&&(b.practitionerId===s.practitionerId||b.resourceId===s.resourceId)&&overlaps(occupiedStart,occupiedEnd,plus(b.startAt,-b.bufferBeforeMin),plus(b.endAt,b.bufferAfterMin))))continue;
      if(d.busyBlocks.some(b=>b.resourceId===s.resourceId&&overlaps(occupiedStart,occupiedEnd,b.startAt,b.endAt)))continue;
      if(d.holds.some(h=>h.state==='held'&&Date.parse(h.expiresAt)>now()&&(h.practitionerId===s.practitionerId||h.resourceId===s.resourceId)&&overlaps(occupiedStart,occupiedEnd,h.occupiedStart,h.occupiedEnd)))continue;
      out.push({id:[s.id,startAt,addons.join(',')].join('|'),providerServiceId:s.id,organizationId:o.id,practitionerId:s.practitionerId,locationId:s.locationId,resourceId:s.resourceId,startAt,endAt,occupiedStart,occupiedEnd,dayOffset,from,to,addonIds:addons,priceMinor:calc.priceMinor,durationMin:calc.durationMin,scheduleVersion:schedule.version,isDemo:true});
    }
    return{state:out.length?'current':'no-slots',slots:out,...meta};
  }
  const event=(type,entityId)=>d.events.push({id:next('event'),type,entityId,at:base.clock.now,isDemo:true});
  Object.assign(base,{
    async taxonomy(){return clone(d.taxonomy);},
    async availability(input){return clone(slots(input));},
    async option(id,addons=[]){return option(entity('services',id),addons);},
    async workspace(scope){
      access(scope,scope.organizationId);
      if(scope.role==='operator')return clone({...d,holds:[],clients:[],bookings:[],messages:[]});
      if(scope.role==='customer'){
        const c=entity('clients',scope.clientId);return clone({client:c,bookings:d.bookings.filter(b=>b.clientId===c.id),messages:d.messages.filter(m=>m.clientId===c.id),reviews:d.reviews.filter(r=>r.clientId===c.id),preferences:d.preferences.filter(p=>p.clientId===c.id)});
      }
      const org=scope.organizationId;entity('organizations',org);
      return clone(Object.fromEntries(Object.entries(d).filter(([k])=>Array.isArray(d[k])).map(([k,v])=>[k,k==='taxonomy'?v:v.filter(x=>x.organizationId===org||k==='organizations'&&x.id===org)])));
    },
    async hold(candidate){
      if(scenario==='conflict')fail('SLOT_CONFLICT','Laikas ką tik užimtas. Pasirinkite kitą laiką.');
      const fresh=slots({providerServiceId:candidate.providerServiceId,addons:candidate.addonIds,dayOffset:candidate.dayOffset,from:candidate.from,to:candidate.to});
      const match=fresh.slots.find(x=>x.id===candidate.id&&x.scheduleVersion===candidate.scheduleVersion&&x.priceMinor===candidate.priceMinor);
      if(!match)fail(fresh.state==='stale'?'STALE_AVAILABILITY':'SLOT_CONFLICT','Laikas arba paslauga pasikeitė. Atnaujinkite pasirinkimą.');
      const hold={...match,id:next('hold'),state:'held',expiresAt:plus(base.clock.now,scenario==='expired-hold'?-1:2)};d.holds.push(hold);save();return clone(hold);
    },
    async releaseHold(id){const h=d.holds.find(h=>h.id===id);if(h)h.state='released';save();},
    async confirm({holdId,name,email,idempotencyKey,clientId='demo-client-0'}){
      if(!idempotencyKey)fail('INVALID_INPUT','Trūksta pakartojimo rakto.');
      if(d.idempotency[idempotencyKey])return clone(entity('bookings',d.idempotency[idempotencyKey]));
      if(!name?.trim()||!/^demo[^@]*@example\.com$/.test(email||''))fail('INVALID_INPUT','Demo naudokite vardą ir demo…@example.com adresą.');
      const h=entity('holds',holdId);if(h.state!=='held'||Date.parse(h.expiresAt)<=now())fail('HOLD_EXPIRED','Demo laiko palaikymas baigėsi. Iš naujo pasirinkite laiką.');
      if(scenario==='conflict')fail('SLOT_CONFLICT','Laikas ką tik užimtas. Vizitas nesukurtas.');
      const service=entity('services',h.providerServiceId);if(service.version!==1&&h.priceMinor!==option(service,h.addonIds).priceMinor||entity('schedules',h.practitionerId+'-schedule').version!==h.scheduleVersion)fail('STALE_AVAILABILITY','Paslaugos arba grafiko versija pasikeitė.');
      const booking={...h,id:next('booking'),clientId,version:1,status:'confirmed',bufferBeforeMin:service.bufferBeforeMin,bufferAfterMin:service.bufferAfterMin,timezone:base.clock.timezone};delete booking.occupiedStart;delete booking.occupiedEnd;delete booking.expiresAt;delete booking.state;
      h.state='confirmed';d.bookings.push(booking);d.idempotency[idempotencyKey]=booking.id;
      d.outbox.push({id:next('outbox'),organizationId:h.organizationId,bookingId:booking.id,state:scenario==='delivery-error'?'failed':'demo-only',recipient:'demo-guest@example.com',type:'confirmation',isDemo:true});event('demo-booking-confirmed',booking.id);save();return clone(booking);
    },
    async changeBooking({scope,id,candidate,version}){
      const b=entity('bookings',id);access(scope,b.organizationId);if(scope.role==='customer'&&b.clientId!==scope.clientId)fail('FORBIDDEN','Tai kito kliento vizitas.');
      if(b.version!==version)fail('VERSION_CONFLICT','Vizitas pasikeitė. Atnaujinkite jo detales.');if(b.status!=='confirmed')fail('INVALID_INPUT','Keisti galima tik būsimą patvirtintą vizitą.');
      if(scenario==='conflict')fail('SLOT_CONFLICT','Naujas laikas užimtas. Ankstesnis vizitas išsaugotas.');
      const fresh=slots({...candidate,providerServiceId:b.providerServiceId,addons:candidate.addonIds,ignoreBookingId:b.id});
      const match=fresh.slots.find(x=>x.id===candidate.id);if(!match)fail('SLOT_CONFLICT','Naujas laikas nebetinka. Ankstesnis vizitas išsaugotas.');
      Object.assign(b,{startAt:match.startAt,endAt:match.endAt,priceMinor:match.priceMinor,version:b.version+1});event('demo-booking-changed',id);save();return clone(b);
    },
    async cancelBooking({scope,id,version,reason}){
      const b=entity('bookings',id);access(scope,b.organizationId);if(scope.role==='customer'&&b.clientId!==scope.clientId)fail('FORBIDDEN','Tai kito kliento vizitas.');
      if(b.version!==version)fail('VERSION_CONFLICT','Vizitas pasikeitė. Atnaujinkite.');if(b.status==='completed')fail('INVALID_INPUT','Atlikto vizito atšaukti negalima.');
      b.status='canceled';b.cancelReason=String(reason||'Kliento pasirinkimas').slice(0,300);b.version++;event('demo-booking-canceled',id);save();return clone(b);
    },
    async createInquiry({organizationId,providerServiceId,note,waitlist=false}){
      entity('organizations',organizationId);const s=entity('services',providerServiceId);if(s.organizationId!==organizationId)fail('INVALID_INPUT','Paslauga nepriklauso šiam teikėjui.');
      if(!note?.trim())fail('INVALID_INPUT','Aprašykite pageidaujamą laiką.');
      const item={id:next(waitlist?'waitlist':'inquiry'),isDemo:true,organizationId,providerServiceId,clientId:'demo-client-0',note:note.trim().slice(0,500),status:'new',state:'waiting',createdAt:base.clock.now,deliveryStatus:scenario==='delivery-error'?'failed':'demo-only'};d[waitlist?'waitlist':'inquiries'].push(item);event(waitlist?'demo-waitlist':'demo-inquiry',item.id);save();return clone(item);
    },
    async edit({scope,table,id,values,version}){
      const fields={services:['label','durationMin','priceMinor','bufferBeforeMin','bufferAfterMin'],schedules:['startMin','endMin','breakStartMin','breakEndMin','closedDay'],resources:['label','active'],organizations:['name','bio','gallery','profileState','approved'],practitioners:['name','role'],inquiries:['status'],waitlist:['state'],outbox:['state'],reports:['status'],clients:['name'],preferences:['service','marketing']};
      if(!fields[table])fail('INVALID_INPUT','Šis įrašas neredaguojamas.');const e=entity(table,id);access(scope,e.organizationId||e.id);
      if(scope.role==='customer'&&!(table==='clients'&&id===scope.clientId))fail('FORBIDDEN','Šį įrašą redaguoja meistras arba operatorius.');
      if(['approved','profileState'].some(k=>k in values)&&scope.role!=='operator'&&values.approved!==undefined)fail('FORBIDDEN','Patvirtinimą keičia operatorius.');
      if(version!==undefined&&e.version!==version)fail('VERSION_CONFLICT','Įrašas pasikeitė. Atnaujinkite.');
      if(Object.keys(values).some(k=>!fields[table].includes(k)))fail('INVALID_INPUT','Nežinomas laukas.');
      for(const k of ['durationMin','priceMinor','bufferBeforeMin','bufferAfterMin','startMin','endMin','breakStartMin','breakEndMin'])if(k in values&&(!Number.isInteger(values[k])||values[k]<0||values[k]>((k==='priceMinor')?100000:1439)))fail('INVALID_INPUT','Netinkama skaitinė reikšmė.');
      if('durationMin' in values&&values.durationMin<15)fail('INVALID_INPUT','Trukmė turi būti bent 15 min.');
      if(table==='schedules'){const n={...e,...values};if(n.startMin>=n.endMin||n.breakStartMin>=n.breakEndMin||n.breakStartMin<n.startMin||n.breakEndMin>n.endMin)fail('INVALID_INPUT','Pertrauka ir pamaina turi sudaryti teisingus intervalus.');
        const changed=d.bookings.some(b=>b.status==='confirmed'&&b.practitionerId===e.practitionerId&&Date.parse(b.startAt)>=now()&&(()=>{const p=new Intl.DateTimeFormat('en-GB',{timeZone:base.clock.timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(b.startAt)).split(':').map(Number);const start=p[0]*60+p[1]-b.bufferBeforeMin;return start<n.startMin||start+(Date.parse(b.endAt)-Date.parse(b.startAt))/60000+b.bufferAfterMin>n.endMin;})());if(changed)fail('SCHEDULE_CONFLICT','Nauja pamaina paslėptų esamą vizitą. Pirmiau perkelkite jį.');}
      Object.assign(e,clone(values),{version:(e.version||0)+1});event('demo-edit-'+table,id);save();return clone(e);
    },
    async submitRevision({scope,name,bio,kind='solo'}){
      access(scope,scope.organizationId);if(scope.role!=='professional')fail('FORBIDDEN','Paraišką pateikia meistras.');if(!name?.trim()||!bio?.trim()||!['solo','salon'].includes(kind))fail('INVALID_INPUT','Įrašykite pavadinimą ir veiklos aprašymą.');
      const r={id:next('revision'),organizationId:scope.organizationId,name:name.slice(0,100),bio:bio.slice(0,600),kind,state:'pending',createdAt:base.clock.now,isDemo:true};d.revisions.push(r);save();return clone(r);
    },
    async moderate({scope,id,state,reason}){
      access(scope);if(scope.role!=='operator')fail('FORBIDDEN','Reikia operatoriaus rolės.');const r=entity('revisions',id);if(!['approved','returned'].includes(state))fail('INVALID_INPUT','Netinkamas sprendimas.');if(state==='returned'&&!reason?.trim())fail('INVALID_INPUT','Nurodykite grąžinimo priežastį.');r.state=state;r.reason=String(reason||'').slice(0,500);
      if(state==='approved')Object.assign(entity('organizations',r.organizationId),{name:r.name,bio:r.bio,approved:true,profileState:'approved'});save();return clone(r);
    },
    async message({scope,bookingId,text}){
      const b=entity('bookings',bookingId);access(scope,b.organizationId);if(scope.role==='customer'&&b.clientId!==scope.clientId)fail('FORBIDDEN','Tai kito kliento pokalbis.');if(!text?.trim())fail('INVALID_INPUT','Įrašykite žinutę.');
      const m={id:next('message'),organizationId:b.organizationId,clientId:b.clientId,bookingId,sender:scope.role,text:text.slice(0,600),createdAt:base.clock.now,isDemo:true,deliveryStatus:'demo-only'};d.messages.push(m);save();return clone(m);
    },
    async review({scope,bookingId,rating,text}){
      access(scope);const b=entity('bookings',bookingId);if(scope.role!=='customer'||b.clientId!==scope.clientId||b.status!=='completed')fail('FORBIDDEN','Atsiliepimas galimas tik po savo atlikto demo vizito.');if(d.reviews.some(r=>r.bookingId===bookingId))fail('ALREADY_REVIEWED','Šis vizitas jau turi atsiliepimą.');if(!Number.isInteger(rating)||rating<1||rating>5||!text?.trim())fail('INVALID_INPUT','Pasirinkite įvertinimą ir įrašykite komentarą.');const r={id:next('review'),organizationId:b.organizationId,clientId:b.clientId,bookingId,rating,text:text.slice(0,600),createdAt:base.clock.now,isDemo:true};d.reviews.push(r);save();return clone(r);
    },
    async report({target,note}){if(!note?.trim())fail('INVALID_INPUT','Aprašykite problemą.');const r={id:next('report'),target,note:note.slice(0,500),status:'new',isDemo:true};d.reports.push(r);save();return clone(r);},
    async preferences({scope,service,marketing}){access(scope);const old=d.preferences.find(p=>p.clientId===scope.clientId);const value={id:scope.clientId+'-preferences',clientId:scope.clientId,service:!!service,marketing:!!marketing,isDemo:true};if(old)Object.assign(old,value);else d.preferences.push(value);save();return clone(value);},
    async metrics({scope}){access(scope);if(scope.role!=='operator')fail('FORBIDDEN','Reikia operatoriaus rolės.');return{demoEvents:d.events.length,realVisits:null,realInquiries:null,demand:'UNMEASURED',isDemo:true};},
    async reset(){persistence?.clear?.();},
  });
  // Read functions close over the same mutable model as all write operations.
  base.catalog=async({city=null,taxonomyServiceId=null,kind=null,name='',maxPrice=null}={})=>{
    if(scenario==='empty')return[];
    return clone(d.services.flatMap(s=>{const o=d.organizations.find(o=>o.id===s.organizationId),p=d.practitioners.find(p=>p.id===s.practitionerId);if(!o.approved||(city&&o.city!==city)||(taxonomyServiceId&&s.taxonomyServiceId!==taxonomyServiceId)||(kind&&o.kind!==kind)||(maxPrice!==null&&s.priceMinor>maxPrice)||name&&!((o.name+' '+p.name+' '+s.label).toLocaleLowerCase('lt').includes(name.toLocaleLowerCase('lt'))))return[];return[{...s,organizationName:o.name,practitionerName:p.name,initials:p.initials,city:o.city,kind:o.kind,area:d.locations.find(l=>l.id===o.locationId).area,calendarState:scenario==='stale'?'stale':scenario==='no-calendar'?'none':o.calendarState}];}));
  };
  base.profile=async id=>{const o=d.organizations.find(o=>o.id===id&&o.approved);return o?clone({...o,location:d.locations.find(l=>l.id===o.locationId),practitioners:d.practitioners.filter(p=>p.organizationId===id),services:d.services.filter(s=>s.organizationId===id),reviews:d.reviews.filter(r=>r.organizationId===id).map(({clientId,...r})=>r)}):null;};
  base.appointments=async({organizationId}={})=>{if(!organizationId)throw Error('Explicit demo scope required');return clone(d.bookings.filter(b=>b.organizationId===organizationId));};
  return base;
}
