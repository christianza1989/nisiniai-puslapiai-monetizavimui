import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from './store.mjs';
import {createPlatform} from './platform.mjs';
import {createOrganizationHandoff} from './organization-handoff.mjs';

test('An oversized calendar transfer fails before leaving a fence or any export and the existing calendar remains writable',()=>{
 const store=openStore({filename:':memory:',secret:'isolated-capacity-handoff-'.repeat(3)});try{
  const owner={id:'handoff-capacity-owner',email:'capacity-owner@example.com',operator:true};store.db.prepare('INSERT INTO accounts(id,site_id,email,name,operator,created_at) VALUES(?,?,?,?,?,?)').run(owner.id,store.siteId,owner.email,'Fixture owner',1,store.clock());const d=store.read();d.clients.push({...owner,name:'Owner fixture',version:1});store.write(d);const api=createPlatform(store),org=api.createOrganization(owner,{name:'Transfer capacity fixture',city:'Vilnius',kind:'solo',bio:'Private bounded migration acceptance.'});
  const data=store.read();for(let n=0;n<10020;n++)data.bookings.push({id:'capacity-transfer-'+n,organizationId:org.id,status:'completed',clientId:'capacity-client-'+n,serviceSnapshot:{label:'Retained existing history',priceMinor:2500}});store.write(data);const version=store.rowStats().version,handoff=createOrganizationHandoff(store),control={operatorAccountId:owner.id,organizationId:org.id,epoch:0,requestKey:'bounded-capacity-check'};
  assert.throws(()=>handoff.freeze(control),e=>e.code==='CAPACITY');assert.equal(handoff.status(control).state,'source');assert.equal(store.rowStats().version,version);assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM organization_handoff_rows').get().n,0);assert.equal(store.organizationRecords('bookings',org.id).length,10020);assert.equal(api.createResource(owner,{organizationId:org.id,label:'Still writable after capacity rejection'}).label,'Still writable after capacity rejection');
 }finally{store.close();}
});
