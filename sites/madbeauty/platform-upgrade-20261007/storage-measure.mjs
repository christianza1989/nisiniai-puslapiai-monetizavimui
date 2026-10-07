// Synthetic diagnostic only. No production database or endpoint argument is accepted.
import {performance} from 'node:perf_hooks';
import {openStore} from '../backend/store.mjs';
const store=openStore({filename:':memory:',secret:'isolated-storage-measurement-only-'.repeat(3)});
const sample=fn=>{const times=[];for(let i=0;i<12;i++){const start=performance.now();fn();times.push(performance.now()-start);}times.sort((a,b)=>a-b);return {medianMs:+times[6].toFixed(2),p95Ms:+times[11].toFixed(2)};};
try{
 const checkpoints=[];
 for(const count of [100,1000,4000]){
  const d=store.read();d.organizations=[{id:'fixture-measured-org',name:'Synthetic measurement'}];d.bookings=Array.from({length:count},(_,i)=>({id:'fixture-measured-'+i,organizationId:i<100?'fixture-small-org':'fixture-measured-org',status:'completed',startAt:'2026-10-01T07:00:00Z',endAt:'2026-10-01T08:00:00Z',serviceSnapshot:{description:'x'.repeat(500),priceMinor:3000}}));store.write(d);
  checkpoints.push({bookings:count,storage:store.rowStats(),fullRead:sample(()=>store.read()),catalogueRead:sample(()=>store.readCollections(['organizations','services','locations','practitioners','resources','qualifications','taxonomyChanges','media'])),smallOrganizationRead:sample(()=>store.organizationRecords('bookings','fixture-small-org')),oneRecordWrite:sample(()=>{const next=store.read();next.bookings[0].measurementVersion=(next.bookings[0].measurementVersion||0)+1;store.write(next);})});
 }
 console.log(JSON.stringify({at:new Date().toISOString(),environment:'isolated-node-memory-sqlite',checkpoints,limitations:'Synthetic local timing, not Workers production latency or per-organization routing acceptance. Whole-state mutation serialization remains.'},null,2));
}finally{store.close();}
