import path from 'node:path';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {openStore} from './store.mjs';
import {applySalonFixtureMedia} from '../prototype/profile-fixtures-v2.mjs';
const store=openStore({filename:path.resolve(import.meta.dirname,'../runtime/platform-preview.sqlite'),fixturePreview:true});
try{
 const proof=store.transaction(()=>{
  const d=store.read();if(d.fixtureRuntime!=='server-preview-v1')throw Error('Named preview fixture required');
  const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
  const before=hash({bookings:d.bookings,services:d.services,schedules:d.schedules,clients:d.clients});
  const prior=d.organizations.filter(o=>o.isDemo&&o.kind==='salon').map(o=>({id:o.id,gallery:o.gallery}));
  applySalonFixtureMedia(d);const after=hash({bookings:d.bookings,services:d.services,schedules:d.schedules,clients:d.clients});
  if(before!==after)throw Error('Non-media record changed');store.write(d);
  return {at:new Date().toISOString(),scope:'named local preview fixture only',prior,current:d.organizations.filter(o=>o.isDemo&&o.kind==='salon').map(o=>({id:o.id,gallery:o.gallery})),recordsPreserved:before===after,preservedSha256:after};
 });
 writeFileSync(path.resolve('research/madbeauty-implementation/salon-media-repair-v1.json'),JSON.stringify(proof,null,2));console.log(JSON.stringify({profiles:proof.current.length,recordsPreserved:proof.recordsPreserved}));
}finally{store.close();}
