import {openStore} from '../backend/store.mjs';
import {createPlatform} from '../backend/platform.mjs';
import path from 'node:path';
import {writeFile} from 'node:fs/promises';
const store=openStore({filename:path.resolve(import.meta.dirname,'../runtime/platform-preview.sqlite'),fixturePreview:true});
try{
 const api=createPlatform(store),owner=store.db.prepare('SELECT id,email,name FROM accounts WHERE site_id=? AND email=?').get('madbeauty','madbeauty-provider-first-v1@example.com');
 if(!owner)throw Error('Named QA owner missing');
 const name='Kalendoriaus priėmimo QA';
 let org=api.session(owner).organizations.find(o=>o.name===name);
 if(!org)org=api.createOrganization(owner,{name,bio:'Izoliuota vietinė kalendoriaus ir dialogų priėmimo darbo vieta. Tik QA.',kind:'salon',city:'Vilnius',practitionerName:'QA meistrė A'});
 if(org.approved)throw Error('QA organization must remain private');
 const scope={role:'professional',organizationId:org.id};
 let w=api.workspace(owner,scope);
 for(const staffName of ['QA meistrė B','QA meistrė C'])if(!w.practitioners.some(p=>p.name===staffName)){api.createStaff(owner,{organizationId:org.id,name:staffName});w=api.workspace(owner,scope);}
 for(const label of ['QA vieta B','QA vieta C'])if(!w.resources.some(r=>r.label===label)){api.createResource(owner,{organizationId:org.id,label});w=api.workspace(owner,scope);}
 const staff=w.practitioners,resources=w.resources;
 const services=[];
 for(let i=0;i<3;i++){
  const label='15 min. QA procedūra '+String.fromCharCode(65+i);
  services.push(w.services.find(s=>s.label===label)||api.createService(owner,{organizationId:org.id,practitionerId:staff[i].id,resourceId:resources[i].id,taxonomyServiceId:'manikiuras',label,durationMin:15,priceMinor:1000,bufferBeforeMin:0,bufferAfterMin:0}));
 }
 const longLabel='Vėlesnis 60 min. QA vizitas',longService=w.services.find(s=>s.label===longLabel)||api.createService(owner,{organizationId:org.id,practitionerId:staff[0].id,resourceId:resources[0].id,taxonomyServiceId:'manikiuras',label:longLabel,durationMin:60,priceMinor:2500});
 const clients=[];
 for(let i=0;i<3;i++)clients.push(api.createClient(owner,{organizationId:org.id,name:'QA klientas '+String.fromCharCode(65+i),email:'calendar-uiux-'+i+'@example.com'}));
 const dateKey=api.clock().localDate;
 const bookings=[];
 const add=(service,client,from,to,key)=>{
  const old=api.workspace(owner,scope).bookings.find(b=>b.providerServiceId===service.id&&b.from===from);
  if(old){bookings.push(old);return;}
  const candidate=api.availability({scope,providerServiceId:service.id,dayOffset:1,from,to,addons:[]},owner).slots[0];
  if(!candidate)throw Error('QA availability missing');
  bookings.push(api.manualVisit(owner,{scope,clientId:client.id,candidate,idempotencyKey:key}));
 };
 services.forEach((s,i)=>add(s,clients[i],540,555,'uiux-calendar-overlap-'+i));
 add(services[0],clients[0],555,570,'uiux-calendar-adjacent');
 add(longService,clients[0],600,660,'uiux-calendar-later');
 const result={at:new Date().toISOString(),scope:'Private named QA organization, existing fictional owner. Setup through actual backend business methods; not browser journey proof. No live delivery.',organizationId:org.id,name,approved:false,practitioners:staff.map(({id,name})=>({id,name})),services:services.map(({id,label})=>({id,label})),bookings:bookings.map(({id,startAt,endAt,practitionerId,providerServiceId,clientId,status})=>({id,startAt,endAt,practitionerId,providerServiceId,clientId,status}))};
 await writeFile(path.resolve('research/madbeauty-implementation/uiux-calendar-fixture-v2.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));
}finally{store.close();}
