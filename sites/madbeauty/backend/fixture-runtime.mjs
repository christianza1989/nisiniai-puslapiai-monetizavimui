import {generateDemo,makeClock,localInstant} from '../prototype/demo-model.mjs';
import {enrichDemo} from '../prototype/platform-domain.mjs';
import {extendProfileFixtures} from '../prototype/profile-fixtures-v2.mjs';
import {initialState} from './store.mjs';
// Explicit private fixture DB only. Uses the same durable auth/availability/booking API.
export function initializeFixtureRuntime(store){
 if(!store.fixturePreview)throw Error('Private fixture runtime not enabled');
 const old=store.read();if(old.fixtureRuntime==='server-preview-v1')return {created:false,profiles:old.organizations.length};
 if(old.organizations.length||store.db.prepare('SELECT count(*) AS n FROM accounts').get().n)throw Error('Refusing to seed a populated database');
 return store.transaction(()=>{
  const clock=makeClock(new Date(store.clock()).toISOString()),seed=extendProfileFixtures(enrichDemo(generateDemo(clock))),d={...initialState(),...seed,isDemo:true,fixtureRuntime:'server-preview-v1',fixtureSeededAt:clock.now,memberships:[],events:[],media:[],idempotency:{},holds:[]};
  for(const c of d.clients){if(!c.email.endsWith('@example.com'))throw Error('Fixture contact must be reserved example.com');store.db.prepare('INSERT INTO accounts(id,site_id,email,name,created_at) VALUES(?,?,?,?,?)').run(c.id,store.siteId,c.email,c.name,store.clock());}
  for(const o of d.organizations){
   const n=Number(o.id.replace('demo-org-','')),id='fixture-owner-'+n,email='demo-provider-'+n+'@example.com';
   store.db.prepare('INSERT INTO accounts(id,site_id,email,name,created_at) VALUES(?,?,?,?,?)').run(id,store.siteId,email,o.name,store.clock());
   d.clients.push({id,accountId:id,email,name:o.name,version:1,isDemo:true});d.memberships.push({id:id+'-membership',organizationId:o.id,accountId:id,role:'owner'});
   o.leadTimeMin=30;const location=d.locations.find(l=>l.id===o.locationId);location.publicAddress=location.area+', '+o.city;location.openingHoursLabel='Pagal meistrų darbo grafiką';
  }
  for(const s of d.schedules){s.closedDate=s.closedDay==null?null:new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Vilnius',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(localInstant(clock,s.closedDay,720)));s.closedDay=null;s.weekdays=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];}
  for(const s of d.services){s.active=s.active!==false;s.bufferBeforeMin??=0;s.bufferAfterMin??=0;s.addons||=[];s.currency='EUR';}
  for(const p of d.practitioners)p.active=p.active!==false;
  for(const r of d.resources)r.active=r.active!==false;
  store.write(d);return {created:true,profiles:d.organizations.length,solo:d.organizations.filter(o=>o.kind==='solo').length};
 });
}
