import {localInstant,TAXONOMY} from './demo-model.mjs';
export const PROFILE_NAMES=['Austėja Vaitkutė','Ieva Jankutė','Gabija Mockutė','Ema Laurinaitė','Rūta Noreikė','Monika Petraitė','Milda Kazlauskė','Ugnė Daukšaitė','Lina Žilinskė','Greta Rimkutė','Justė Šimkutė','Simona Kavaliauskė','Karolina Stankutė','Viktorija Balčiūtė','Agnė Sakalė','Giedrė Navickė','Dovilė Tumėnaitė','Laura Juškaitė','Indrė Mikutė','Erika Rauktytė','Neringa Žukaitė','Aistė Venckutė','Kamilė Valiukė','Rasa Šleinė','Toma Petrauskaitė','Paulius Naujokas','Tadas Karvelis','Martyna Kairytė','Kotryna Remeikė','Eglė Mažeikė','Darius Stasiulis','Saulė Dargytė','Vesta Vingė','Elena Adomė','Lukas Martinkus','Kristina Bartkutė','Jūratė Kvedarė','Emilija Žemaitė','Julija Savickė','Danguolė Mikė'];
export const PROFILE_SPECIALTIES=['nails','hair','brows','skin','massage','pedicure'];
const groups={nails:['manikiuras','gelinis-lakavimas','nagu-dizainas'],hair:['kirpimas','plauku-dazymas'],brows:['antakiai','blakstienos'],skin:['veido-prieziura'],massage:['masazas'],pedicure:['pedikiuras']};
const labels={nails:'Nagų priežiūra ir kruopštus dizainas',hair:'Kirpimas ir plaukų spalva',brows:'Antakių ir blakstienų priežiūra',skin:'Veido priežiūra',massage:'Masažas ir poilsis',pedicure:'Pedikiūras ir pėdų priežiūra'};
const cities=['Vilnius','Kaunas','Klaipėda','Šiauliai','Panevėžys','Alytus','Marijampolė','Palanga'];
const areas=['Centras','Naujamiestis','Senamiestis','Žaliakalnis','Pietinis rajonas','Parko kvartalas','Šiaurinė dalis','Pajūris'];
const seeded=n=>{let v=(n+7219)>>>0;return()=>{v=(1664525*v+1013904223)>>>0;return v/4294967296;};};
const demo=(id,v)=>({id,isDemo:true,version:1,...v});
export function applySalonFixtureMedia(d){
 for(const o of d.organizations.filter(o=>o.isDemo&&o.kind==='salon')){
  const images=[...new Set(d.services.filter(s=>s.organizationId===o.id&&s.active!==false).map(s=>TAXONOMY.find(t=>t.id===s.taxonomyServiceId)?.imageId).filter(Boolean))];
  o.gallery=[...images.slice(0,2),'studio'];o.avatarImageId='studio';
 }
 return d;
}
export function extendProfileFixtures(d){
 for(let i=30;i<46;i++){
  const orgId='demo-org-'+i,staffId='demo-staff-'+i+'-0',locationId='demo-loc-'+i;
  d.organizations.push(demo(orgId,{kind:'solo',locationId,approved:true,profileState:'approved',calendarState:'current'}));
  d.locations.push(demo(locationId,{organizationId:orgId}));d.practitioners.push(demo(staffId,{organizationId:orgId,locationId,active:true,role:'owner'}));
  d.resources.push(demo(orgId+'-room',{organizationId:orgId,label:'Procedūros vieta',active:true}));d.schedules.push(demo(staffId+'-schedule',{organizationId:orgId,practitionerId:staffId,startMin:540,endMin:1200,breakStartMin:780,breakEndMin:840,closedDay:null}));
  d.clients.push(demo('demo-client-'+i+'-new',{organizationId:orgId,name:PROFILE_NAMES[i-6].split(' ')[0],email:'profile-client-'+i+'@example.com'}));
  d.services.push(...Array.from({length:3},(_,j)=>demo('demo-service-'+i+'-v2-'+j,{organizationId:orgId,locationId,practitionerId:staffId,resourceId:orgId+'-room',addons:[],currency:'EUR',active:true,bufferBeforeMin:5,bufferAfterMin:10})));
 }
 const solos=d.organizations.filter(o=>o.kind==='solo');
 solos.forEach((o,i)=>{
  const spec=PROFILE_SPECIALTIES[i%6],rng=seeded(i),prefix='profile-'+String(i+1).padStart(2,'0'),name=PROFILE_NAMES[i],city=cities[i%8];
  Object.assign(o,{name,city,bio:labels[spec]+'. Prieš vizitą aptarkime norimą rezultatą, paslaugos apimtį ir tau tinkantį laiką.',avatarImageId:prefix+'-portrait',gallery:[prefix+'-work',prefix+'-space'],fixtureProfileIndex:i,specialty:spec,approved:true,profileState:'approved'});
  Object.assign(d.locations.find(l=>l.id===o.locationId),{city,area:areas[i%8],publicAddress:areas[i%8]+', '+city,openingHoursLabel:'Pagal meistro darbo grafiką',imageId:prefix+'-space'});
  const p=d.practitioners.find(p=>p.organizationId===o.id);Object.assign(p,{name,initials:name.split(' ').map(s=>s[0]).join(''),avatarImageId:o.avatarImageId,active:true});
  d.services.filter(s=>s.organizationId===o.id).forEach((s,j)=>{const t=TAXONOMY.find(t=>t.id===groups[spec][j%groups[spec].length]);Object.assign(s,{taxonomyServiceId:t.id,label:t.label+(j>=groups[spec].length?' · išplėstinė procedūra':''),durationMin:t.durationMin+(j>=groups[spec].length?15:0),priceMinor:2000+Math.floor(rng()*10)*300+j*200,imageId:prefix+'-work',bufferBeforeMin:5,bufferAfterMin:10,addons:[{id:'demo-addon-removal',label:'Papildomas paruošimas',durationMin:15,priceMinor:500}]});});
  const schedule=d.schedules.find(s=>s.practitionerId===p.id);Object.assign(schedule,{startMin:540+(i%3)*30,endMin:1140+(i%3)*30,breakStartMin:750+(i%4)*15,breakEndMin:795+(i%4)*15,closedDay:i%13===5?3:null});
  d.bookings=d.bookings.filter(b=>b.organizationId!==o.id);d.busyBlocks=d.busyBlocks.filter(b=>b.organizationId!==o.id);
  const clients=d.clients.filter(c=>c.organizationId===o.id),services=d.services.filter(s=>s.organizationId===o.id);
  for(let day=-4;day<10;day++){
   if(day===schedule.closedDay)continue;
   const count=1+Math.floor(rng()*4),occupied=[];
   for(let j=0;j<count;j++){
    const s=services[Math.floor(rng()*services.length)];let min=null;
    for(let attempt=0;attempt<32;attempt++){const trial=schedule.startMin+15+Math.floor(rng()*Math.floor((schedule.endMin-schedule.startMin-s.durationMin-30)/15))*15,lo=trial-5,hi=trial+s.durationMin+10;if(hi>schedule.endMin||lo<schedule.breakEndMin&&hi>schedule.breakStartMin||occupied.some(([a,b])=>lo<b&&hi>a))continue;min=trial;break;}
    if(min===null)continue;const startAt=localInstant(d.clock,day,min),state=day<0?'completed':rng()<.12?'canceled':'confirmed';if(state!=='canceled')occupied.push([min-5,min+s.durationMin+10]);
    d.bookings.push(demo('demo-booking-v2-'+i+'-'+day+'-'+j,{organizationId:o.id,clientId:clients[j%clients.length].id,practitionerId:p.id,providerServiceId:s.id,resourceId:s.resourceId,startAt,endAt:new Date(Date.parse(startAt)+s.durationMin*60000).toISOString(),bufferBeforeMin:5,bufferAfterMin:10,durationMin:s.durationMin,status:state,priceMinor:s.priceMinor,timezone:'Europe/Vilnius',currency:'EUR'}));
   }
   if(day>=0&&rng()<.65){const min=930+Math.floor(rng()*7)*15;if(!occupied.some(([a,b])=>min<b&&min+30>a))d.busyBlocks.push(demo('demo-busy-v2-'+i+'-'+day,{organizationId:o.id,resourceId:o.id+'-room',startAt:localInstant(d.clock,day,min),endAt:localInstant(d.clock,day,min+30)}));}
  }
 });
 d.organizations.filter(o=>o.kind==='salon').forEach((o,i)=>{o.name=['Linija','Atspalvis','Švelniai','Ritmas','Detalė','Forma'][i];o.bio='Komandos paslaugos ir darbo grafikai vienoje vietoje.';});
 d.practitioners.filter(p=>!solos.some(o=>o.id===p.organizationId)).forEach((p,i)=>{p.name=PROFILE_NAMES[(i+5)%40];});
 d.clients.forEach((c,i)=>{c.name=PROFILE_NAMES[(i+4)%40].split(' ')[0];});
 d.reviews=d.reviews.filter(r=>d.bookings.some(b=>b.id===r.bookingId));d.fixtureVersion=3;return applySalonFixtureMedia(d);
}
