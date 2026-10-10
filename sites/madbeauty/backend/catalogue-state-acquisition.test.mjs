import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from './store.mjs';
import {createAuth} from './auth.mjs';
import {createPlatform} from './platform.mjs';
for(const table of ['practitioners','resources'])test('Legacy native public eligibility follows actual '+table+' activity',()=>{
 const store=openStore({filename:':memory:',secret:'public-native-eligibility-fixture-32',clock:()=>Date.parse('2026-10-10T01:00:00Z')});
 try{
  const auth=createAuth(store),api=createPlatform(store),login=email=>{const session=auth.session(null),c=auth.start(session,email,'fixture');return auth.verify(session,c.challengeId,store.capture(c.challengeId).code,'fixture').user;};
  const owner=login('owner@example.test'),operator={...login('operator@example.test'),operator:true},org=api.createOrganization(owner,{name:'Native eligibility fixture',bio:'Isolated regression',kind:'solo',city:'Vilnius'}),scope={role:'professional',organizationId:org.id},workspace=api.workspace(owner,scope);
  api.createService(owner,{organizationId:org.id,practitionerId:workspace.practitioners[0].id,resourceId:workspace.resources[0].id,taxonomyServiceId:'manikiuras',label:'Fixture service',durationMin:30,priceMinor:2200});
  api.moderate(operator,{id:api.submitRevision(owner,{scope,name:org.name,bio:org.bio}).id,state:'approved'});
  assert.equal(api.profile(org.id).services.length,1);assert.equal(api.catalog().length,1);
  api.edit(owner,{scope,table,id:workspace[table][0].id,version:workspace[table][0].version,values:{active:false}});
  assert.equal(api.profile(org.id).services.length,0);assert.equal(api.catalog().length,0);
 }finally{store.close();}
});
