import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {openStore} from '../backend/store.mjs';
import {createAuth} from '../backend/auth.mjs';
import {createPlatform} from '../backend/platform.mjs';
import {canonicalVerifiedEmail,createRecipientBindingProposal} from './recipient-binding-proposal.mjs';
const secret=Uint8Array.from({length:32},(_,i)=>i+1); // Public synthetic test key, never configured.
const scope={business_id:'business-test',site_id:'madbeauty',environment_id:'capture-native',environment_class:'test'};
const configuration={secret,scope,adapterId:'madbeauty-native',keyId:'recipient-test-v1'};
const input={invitationRef:'I'.repeat(32),challengeNonce:'C'.repeat(32),verifiedEmail:'Owner@example.test'};
test('Actual captured native OTP canonicalizes email and creates stable provider/profile ID',()=>{
 const store=openStore({filename:':memory:',secret:'public-synthetic-native-capture-secret',clock:()=>Date.parse('2026-10-10T01:00:00Z')});
 try{
  const auth=createAuth(store),session=auth.session(null),challenge=auth.start(session,'  OWNER+Salon@EXAMPLE.TEST  ','synthetic-test');
  const verified=auth.verify(session,challenge.challengeId,store.capture(challenge.challengeId).code,'synthetic-test');
  assert.equal(verified.user.email,canonicalVerifiedEmail('  OWNER+Salon@EXAMPLE.TEST  '));
  assert.equal(verified.user.email,'owner+salon@example.test');
  const api=createPlatform(store),org=api.createOrganization(verified.user,{name:'Synthetic capture provider',bio:'Offline fixture',kind:'solo',city:'Vilnius'});
  assert.match(org.id,/^provider_[a-f0-9-]{36}$/);
  assert.equal(api.session(verified.user).organizations[0].id,org.id);
  assert.equal(api.profile(org.id),null,'Unapproved profile cannot imply activation');
  const rows=store.db.prepare('SELECT recipient,state FROM mail_outbox').all();
  assert.equal(rows.length,1);assert.equal(rows[0].recipient,'owner+salon@example.test');assert.equal(rows[0].state,'captured');
 }finally{store.close();}
});
test('Address parity preserves aliases/dots, handles Unicode and rejects invalid/coerced input',()=>{
 assert.equal(canonicalVerifiedEmail(' A.B+tag@EXAMPLE.TEST '),'a.b+tag@example.test');
 assert.notEqual(canonicalVerifiedEmail('a.b@example.test'),canonicalVerifiedEmail('ab@example.test'));
 assert.equal(canonicalVerifiedEmail('İ@EXAMPLE.TEST'),'i\u0307@example.test');
 assert.throws(()=>canonicalVerifiedEmail(false));assert.throws(()=>canonicalVerifiedEmail('a b@example.test'));
});
test('Recipient proof separates actual recipient, invitation, nonce, scope, adapter and key',async()=>{
 const codec=await createRecipientBindingProposal(configuration),digest='v1='+await codec.sign(input);
 assert.equal(digest,'v1=a39e849704152919e268adec4d97256611429ed7ed9f0eae2ac678615476bdf4','Fixed cross-language wire vector');
 assert.equal(await codec.matches({...input,verifiedEmail:' OWNER@EXAMPLE.TEST '},digest),true);
 for(const changed of [{verifiedEmail:'other@example.test'},{invitationRef:'J'.repeat(32)},{challengeNonce:'D'.repeat(32)}])assert.equal(await codec.matches({...input,...changed},digest),false);
 for(const change of [{scope:{...scope,business_id:'other-business'}},{scope:{...scope,environment_id:'other-capture'}},{scope:{...scope,environment_class:'production'}},{adapterId:'other-native'},{keyId:'other-key'},{secret:Uint8Array.from(secret,v=>v+1)}])assert.equal(await(await createRecipientBindingProposal({...configuration,...change})).matches(input,digest),false);
 assert.notEqual(digest.slice(3),createHash('sha256').update('owner@example.test').digest('hex'));
});
test('Dedicated key and opaque token validation fail closed',async()=>{
 await assert.rejects(createRecipientBindingProposal({...configuration,secret:new Uint8Array(31)}));
 await assert.rejects(createRecipientBindingProposal({...configuration,scope:{...scope,unexpected:true}}));
 const codec=await createRecipientBindingProposal(configuration);
 await assert.rejects(codec.sign({...input,invitationRef:'owner@example.test'}));
 assert.equal(await codec.matches(input,'v1='+'A'.repeat(64)),false);
 assert.equal(await codec.matches(input,'v1='+'0'.repeat(63)),false);
});
