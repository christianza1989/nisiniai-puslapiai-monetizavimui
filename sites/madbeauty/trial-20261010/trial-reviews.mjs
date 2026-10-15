// Owner-authorized illustrative reviews belong only to the existing isolated trial.
// Additive, transactional, stable on restarts; never changes prior records or sends mail.
const key='trial-reviews-11-21-v1';
const comments=[
 'Patiko kruopštumas ir aiškiai aptarta procedūros eiga.',
 'Jauki aplinka, malonus bendravimas ir dėmesys detalėms.',
 'Vizitas prasidėjo laiku. Gavau naudingų priežiūros patarimų.',
 'Rezultatas patiko, mielai pasirinkčiau dar kartą.',
 'Buvo patogu pasirinkti laiką ir peržiūrėti paslaugos aprašymą.',
 'Meistras išklausė pageidavimus ir paaiškino galimus variantus.',
 'Malonus vizitas. Procedūrai norėčiau skirti šiek tiek daugiau laiko.',
 'Tvarkinga aplinka ir rūpestingas darbas.',
 'Patiko rezultatas ir ramus procedūros tempas.',
 'Prieš procedūrą aiškiai aptarta kaina ir trukmė.',
 'Viskas sklandžiai, tik patogaus laiko teko paieškoti.',
 'Kruopščiai atliktas darbas. Ačiū už patarimus po vizito.'
];
function randomFor(id){let state=2166136261;for(const c of id)state=Math.imul(state^c.charCodeAt(0),16777619);return()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0;};}
export function initializeTrialReviews(store){
 if(!store.fixturePreview)throw Error('Trial reviews require isolated fixture storage');
 store.db.exec('CREATE TABLE IF NOT EXISTS release_metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
 if(store.db.prepare('SELECT value FROM release_metadata WHERE key=?').get(key))return {created:false};
 return store.transaction(()=>{
  const d=store.read();if(d.fixtureRuntime!=='server-preview-v1'||d.isDemo!==true||d.organizations.some(o=>!o.isDemo||!o.id.startsWith('demo-org-')))throw Error('Reviews cannot enter real provider storage');
  const now=store.clock();let added=0;
  for(const o of d.organizations){
   const random=randomFor(o.id),target=11+random()%11,existing=d.reviews.filter(r=>r.organizationId===o.id&&r.approved).length;
   const service=d.services.find(s=>s.organizationId===o.id),client=d.clients.find(c=>c.organizationId===o.id)||d.clients.find(c=>c.id==='demo-client-0');
   if(!service||!client?.isDemo||!client.email.endsWith('@example.com'))throw Error('Existing fixture service/client required');
   for(let i=existing;i<target;i++){
    const suffix=o.id+'-'+i,bookingId='demo-trial-review-booking-'+suffix,id='demo-trial-review-'+suffix;
    if(d.reviews.some(r=>r.id===id)||d.bookings.some(b=>b.id===bookingId))throw Error('Trial review fixture ID collision');
    const startAt=new Date(now-(2+random()%59)*86400000-(random()%480)*60000).toISOString(),endAt=new Date(Date.parse(startAt)+service.durationMin*60000).toISOString();
    d.bookings.push({id:bookingId,isDemo:true,organizationId:o.id,clientId:client.id,practitionerId:service.practitionerId,providerServiceId:service.id,locationId:service.locationId,startAt,endAt,timezone:'Europe/Vilnius',status:'completed',priceMinor:service.priceMinor,currency:'EUR',version:1});
    const roll=random()%10,rating=roll<1?3:roll<4?4:5;
    d.reviews.push({id,isDemo:true,bookingId,organizationId:o.id,clientId:client.id,practitionerId:service.practitionerId,rating,text:'Bandomasis atsiliepimas · '+comments[random()%comments.length],createdAt:endAt,approved:true,state:'approved',version:1});added++;
   }
  }
  store.write(d);store.db.prepare('INSERT INTO release_metadata(key,value) VALUES(?,?)').run(key,JSON.stringify({added,at:new Date(now).toISOString()}));return {created:true,added};
 });
}
