import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {build}=await import(pathToFileURL(path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting/node_modules/esbuild/lib/main.js')));
const result=await build({entryPoints:[path.join(import.meta.dirname,'public/customer-tools-ui.mjs')],write:false,bundle:true,format:'esm',platform:'node',plugins:[{name:'public-root',setup(b){b.onResolve({filter:/^\/(demo-model|cities|taxonomy|seo-contract)\.mjs$/},a=>({path:path.join(import.meta.dirname,a.path.slice(1))}));}}]});
const {customerToolsAction,customerToolsForm,privacyTools}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));

test('Active-policy customer deletion previews future and backup consequences, binds the server policy, clears drafts and leaves the signed-out account with a receipt',async()=>{
 let html,calls=[];const policy={version:'madbeauty-2026-10-10-v1',futureExplanation:'Būsimas vizitas lieka be vardo.',backupExplanation:'Kopijos galioja iki 30 dienų.'},ctx={adapter:{mode:'real',erasurePreview:async()=>({policy,futureBookings:[{id:'owned'}]}),requestErasure:async i=>{assert.deepEqual(i,{confirmEmail:'own@example.com',policyVersion:policy.version});return {id:'erasure_fixture',state:'processing',signInRevoked:true};}},openDialog:(title,body)=>{html=body;calls.push(title);},closeDialog:()=>calls.push('close'),clearDrafts:()=>calls.push('clear'),navigate:async p=>calls.push(p)};
 assert.match(privacyTools({retentionPolicy:policy}),/Pašalinti mano paskyrą/);await customerToolsAction(ctx,'request-erasure',{});assert.match(html,/Būsimų vizitų: 1/);assert.match(html,/Kopijos galioja iki 30 dienų/);assert.match(html,/name="understand" required/);assert.match(html,/data-policy-version="madbeauty-2026-10-10-v1"/);assert.doesNotMatch(html,/Pateikti prašymą peržiūrai/);
 await customerToolsForm(ctx,{id:'erasure-request',dataset:{policyVersion:policy.version}},new Map([['confirmEmail','own@example.com']]));assert.deepEqual(calls.slice(-4),['close','clear','/paskyra','Paskyra pašalinta']);assert.match(html,/Organizacijų saugyklų valymas tęsiamas automatiškai/);assert.match(html,/erasure_fixture/);
});

test('Lost committed erasure reply refreshes the revoked session and recovers only the server-issued receipt capability',async()=>{
 let html;const calls=[],token='A'.repeat(43),policy={version:'madbeauty-2026-10-10-v1',futureExplanation:'Anonimiškas vizitas.',backupExplanation:'30 dienų.'},ctx={adapter:{mode:'real',erasurePreview:async()=>({receiptToken:token,policy,futureBookings:[]}),requestErasure:async()=>{calls.push('request');throw Object.assign(Error('Lost reply'),{code:'NETWORK_ERROR'});},erasureStatus:async input=>{assert.deepEqual(input,{receiptToken:token});calls.push('receipt');return {id:'erasure_committed',state:'completed',signInRevoked:true};}},realAdapter:{refreshSession:async()=>calls.push('session')},openDialog:(_t,h)=>{html=h;},closeDialog:()=>calls.push('close'),clearDrafts:()=>calls.push('clear'),navigate:async p=>calls.push(p)};
 await customerToolsAction(ctx,'request-erasure',{});await customerToolsForm(ctx,{id:'erasure-request',dataset:{policyVersion:policy.version}},new Map([['confirmEmail','own@example.com']]));assert.deepEqual(calls,['request','session','receipt','close','clear','/paskyra']);assert.equal(ctx.erasureReceiptToken,null);assert.match(html,/erasure_committed/);
 ctx.erasureReceiptToken=token;ctx.adapter.erasureStatus=async()=>{throw Object.assign(Error('Not found'),{code:'NOT_FOUND'});};await assert.rejects(customerToolsForm(ctx,{id:'erasure-request',dataset:{policyVersion:policy.version}},new Map()),e=>e.code==='NETWORK_ERROR');
});

test('Rebooking retries retain the booking ID, clear old choices and use authoritative profile kinds despite a stale client catalogue',async()=>{
 const reply={state:'unavailable',reason:'Variantas nebesiūlomas.',searchPath:'/paieska',alternatives:[{providerServiceId:'new-salon-service',label:'Naujas <variantas>',organizationId:'salon',kind:'salon'},{providerServiceId:'changed-service',label:'Kitas variantas',organizationId:'solo',kind:'solo'}]};
 let html;const ctx={rows:[{id:'changed-service',kind:'salon'}],adapter:{mode:'real',rebooking:async input=>{assert.equal(input.id,'old-booking');return reply;}},openDialog:(title,body)=>{assert.equal(title,'Pakartoti vizitą');html=body;}};
 assert.equal(await customerToolsAction(ctx,'rebook-visit',{dataset:{id:'old-booking'}}),true);assert.equal(ctx.rebooking,reply);
 assert.match(html,/href="\/salonai\/salon"/);assert.match(html,/href="\/meistrai\/solo"/);assert.doesNotMatch(html,/href="\/meistrai\/salon"|href="\/salonai\/solo"/);
 assert.match(html,/Naujas &lt;variantas&gt;/);assert.match(html,/Ankstesnis vizitas išlieka istorijoje/);assert.match(html,/href="\/paieska"/);
 const priorDocument=globalThis.document,attributes={};let focused=false;
 globalThis.document={querySelector:selector=>{assert.equal(selector,'#dialog .error-box');return {setAttribute:(name,value)=>{attributes[name]=value;},focus:()=>{focused=true;}};}};
 try{
  ctx.adapter.rebooking=async input=>{assert.equal(input.id,'old-booking');throw Object.assign(Error('Laikinai nepasiekiama.'),{code:'UNAVAILABLE'});};
  assert.equal(await customerToolsAction(ctx,'rebook-visit',{dataset:{id:'old-booking'}}),true);assert.equal(ctx.rebooking,null);assert.equal(focused,true);assert.equal(attributes.tabindex,'-1');
  assert.match(html,/role="alert"/);assert.match(html,/Laikinai nepasiekiama/);assert.match(html,/data-action="rebook-visit" data-id="old-booking"/);assert.match(html,/Bandyti dar kartą/);
  ctx.adapter.rebooking=async input=>{assert.equal(input.id,'old-booking');return reply;};await customerToolsAction(ctx,'rebook-visit',{dataset:{id:'old-booking'}});assert.equal(ctx.rebooking,reply);assert.doesNotMatch(html,/role="alert"/);assert.match(html,/href="\/salonai\/salon"/);
 }finally{if(priorDocument===undefined)delete globalThis.document;else globalThis.document=priorDocument;}
});
