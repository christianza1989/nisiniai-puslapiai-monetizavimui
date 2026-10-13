import test from 'node:test';
import assert from 'node:assert/strict';
import {offerEligibilityNotice,offerProcedureLabel,offerProcedureOptions,qualificationDisplayState} from './public/offer-eligibility-ui.mjs';
const offer={organizationId:'org',locationId:'place',taxonomyServiceId:'t'},nodes=[{id:'t',enabled:true,reviewRequired:true,kind:'treatment',path:['Brows','Permanent']}],now='2026-10-08T10:00:00Z';
test('Eligibility notice uses the current clock and the same organization, location and procedure; exact expiry cannot stay valid',()=>{
 const q={...offer,taxonomyNodeId:'t',state:'approved',expiresAt:'2026-10-08T10:00:00.001Z'};
 assert.equal(offerEligibilityNotice(nodes,[q],offer,now),'');
 assert.equal(qualificationDisplayState(q,now),'approved');
 assert.equal(qualificationDisplayState({...q,expiresAt:now},now),'expired');
 assert.equal(qualificationDisplayState({...q,expiresAt:'invalid'},now),'expired');
 assert.equal(qualificationDisplayState({...q,state:'returned'},now),'returned');
 assert.match(offerEligibilityNotice(nodes,[{...q,expiresAt:now}],offer,now),/galiojimas baigėsi/);
 for(const change of [{organizationId:'other'},{locationId:'other'},{taxonomyNodeId:'other'},{state:'returned'}])assert.match(offerEligibilityNotice(nodes,[{...q,...change}],offer,now),/reikia tinkamumo patikros/);
 assert.equal(offerEligibilityNotice([{...nodes[0],reviewRequired:false}],[],offer,now),'');
});
test('Editing an archived procedure keeps the original selected ID instead of silently changing to the first active procedure',()=>{
 const active={...nodes[0],id:'active',path:['Nails','Manicure']},choices=offerProcedureOptions([active,{...nodes[0],archived:true}],offer);
 assert.equal(choices[0][0],'t');assert.match(choices[0][1],/neaktyvi kataloge/);assert.equal(choices[1][0],'active');assert.equal(choices.filter(([id])=>id==='t').length,1);
 assert.match(offerEligibilityNotice([active,{...nodes[0],archived:true}],[],offer,now),/kataloge neaktyvi/);
 assert.deepEqual(offerProcedureOptions(nodes,offer),[['t','Brows → Permanent']]);
 const retained=[{...nodes[0],archived:true},{...active,id:'retained-only',path:['Nails','Archived option']}];
 assert.deepEqual(offerProcedureOptions([active],offer,retained),[['t','Brows → Permanent · neaktyvi kataloge'],['active','Nails → Manicure']]);
 assert.equal(offerProcedureLabel([active],offer,retained),'Brows → Permanent');
 assert.equal(offerProcedureLabel([{...nodes[0],path:['Current','Name']}],offer,retained),'Current → Name');
 assert.equal(offerProcedureLabel([],offer),'Ankstesnė procedūra');
});
