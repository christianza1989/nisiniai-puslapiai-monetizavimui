import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {build}=await import(pathToFileURL(path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting/node_modules/esbuild/lib/main.js')));
const result=await build({entryPoints:[path.join(import.meta.dirname,'public/customer-tools-ui.mjs')],write:false,bundle:true,format:'esm',platform:'node',plugins:[{name:'public-root',setup(b){b.onResolve({filter:/^\/(demo-model|cities|taxonomy|seo-contract)\.mjs$/},a=>({path:path.join(import.meta.dirname,a.path.slice(1))}));}}]});
const {customerToolsAction}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));

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
