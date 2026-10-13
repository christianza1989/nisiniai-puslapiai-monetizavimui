import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {openStore} from '../backend/store.mjs';
import {createAuth} from '../backend/auth.mjs';
import {createPlatform} from '../backend/platform.mjs';
import {offerCsv} from './public/offer-csv.mjs';
const {build}=await import(pathToFileURL(path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting/node_modules/esbuild/lib/main.js')));
const result=await build({entryPoints:[path.join(import.meta.dirname,'public/offer-editor.mjs')],write:false,bundle:true,format:'esm',platform:'node',plugins:[{name:'public-root',setup(b){b.onResolve({filter:/^\/(demo-model|cities|taxonomy|seo-contract)\.mjs$/},a=>({path:path.join(import.meta.dirname,a.path.slice(1))}));}}]});
const {offerAction,offerForm}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
function fixture(){
 const store=openStore({filename:':memory:',secret:'csv-preview-fixture-only-'.repeat(3),clock:()=>Date.parse('2026-10-08T07:00:00Z')}),auth=createAuth(store),api=createPlatform(store),session=auth.session(null),challenge=auth.start(session,'csv-preview-owner@example.com','127.0.0.1'),owner=auth.verify(session,challenge.challengeId,store.capture(challenge.challengeId).code,'127.0.0.1').user;
 const org=api.createOrganization(owner,{name:'Isolated preview',kind:'salon',city:'Vilnius',bio:'Test only'}),scope={role:'professional',organizationId:org.id},draft=api.selectProcedures(owner,{organizationId:org.id,procedureIds:['manikiuras-klasikinis-manikiuras'],version:0,idempotencyKey:'select-preview'})[0];
 api.saveOffer(owner,{id:draft.id,version:draft.version,label:'Offer <script>',variants:[{id:'csv-preview-variant',label:'Variant <img>',priceMinor:2500,durationMin:60,staffOptions:[]}]});
 const calls=[],ctx={state:{session:scope},workspace:api.workspace(owner,scope),adapter:{mode:'real',workspace:async input=>{calls.push({method:'workspace'});return api.workspace(owner,input);},bulkOfferPrices:async input=>{calls.push({method:'bulk',input:structuredClone(input)});return api.bulkOfferPrices(owner,input);}},openDialog:(title,html)=>{ctx.dialog={title,html};},closeDialog:()=>{ctx.closed=true;},toast:()=>{},render:async()=>{ctx.workspace=api.workspace(owner,scope);}};
 return {store,api,owner,org,scope,ctx,calls};
}
const submit=(ctx,id,text='')=>offerForm(ctx,{id},new Map([['csv',text]]));
const open=ctx=>offerAction(ctx,'offer-csv-import',{dataset:{}});
test('CSV entry only previews fresh scoped data; invalid rows retain escaped input and offer labels require separate confirmation',async()=>{
 const f=fixture(),previousDocument=globalThis.document;globalThis.document={querySelector:()=>({focus(){}})};
 try{await open(f.ctx);const csv=offerCsv(f.ctx.workspace.offers).replace('"2500"','"3100"');await submit(f.ctx,'offer-csv-import',csv+'\r\n'+csv.split('\r\n')[1]);assert.equal(f.calls.length,1);assert.equal(f.calls[0].method,'workspace');assert.match(f.ctx.dialog.html,/Dubliuojasi/);assert.match(f.ctx.dialog.html,/Partija neįrašyta/);assert.match(f.ctx.dialog.html,/&lt;|&quot;/);assert.equal(f.ctx.offerBulkPreview,null);
 await submit(f.ctx,'offer-csv-import',csv);assert.equal(f.calls.length,2);assert.equal(f.ctx.dialog.title,'Patikrink kainų pakeitimus');assert.match(f.ctx.dialog.html,/Offer &lt;script&gt;/);assert.match(f.ctx.dialog.html,/Variant &lt;img&gt;/);assert.match(f.ctx.dialog.html,/25,00/);assert.match(f.ctx.dialog.html,/31,00/);assert.match(f.ctx.dialog.html,/Patvirtinti ir išsaugoti/);assert.doesNotMatch(f.ctx.dialog.html,/<script>|<img>/);assert.equal(f.api.workspace(f.owner,f.scope).offers[0].variants[0].priceMinor,2500);
 const key=f.ctx.offerBulkKey;await offerAction(f.ctx,'offer-csv-revise',{dataset:{}});assert.equal(f.ctx.offerBulkPreview,null);assert.match(f.ctx.dialog.html,/3100/);await submit(f.ctx,'offer-csv-import',csv);assert.equal(f.ctx.offerBulkKey,key);await offerAction(f.ctx,'offer-csv-revise',{dataset:{}});await submit(f.ctx,'offer-csv-import',csv.replace('"3100"','"3200"'));assert.notEqual(f.ctx.offerBulkKey,key);f.ctx.state.session={...f.scope,organizationId:'other'};await assert.rejects(submit(f.ctx,'offer-csv-confirm'),/Darbo vieta pasikeitė/);assert.equal(f.calls.filter(c=>c.method==='bulk').length,0);
 }finally{globalThis.document=previousDocument;f.store.close();}
});
test('CSV confirmation rejects a concurrent version and repeats a lost committed reply with the original exact intent once',async()=>{
 const f=fixture();try{await open(f.ctx);let csv=offerCsv(f.ctx.workspace.offers).replace('"2500"','"3100"');await submit(f.ctx,'offer-csv-import',csv);const offer=f.api.workspace(f.owner,f.scope).offers[0];f.api.saveOffer(f.owner,{...offer,label:'Newer title'});await assert.rejects(submit(f.ctx,'offer-csv-confirm'),e=>e.code==='VERSION_CONFLICT');assert.equal(f.api.workspace(f.owner,f.scope).offers[0].variants[0].priceMinor,2500);assert.equal(f.ctx.closed,undefined);
 await offerAction(f.ctx,'offer-csv-revise',{dataset:{}});csv=offerCsv(f.api.workspace(f.owner,f.scope).offers).replace('"2500"','"3100"');await submit(f.ctx,'offer-csv-import',csv);const original=f.ctx.adapter.bulkOfferPrices;let lose=true;f.ctx.adapter.bulkOfferPrices=async input=>{const result=await original(input);if(lose){lose=false;throw Object.assign(Error('Lost committed reply'),{code:'NETWORK_ERROR'});}return result;};await assert.rejects(submit(f.ctx,'offer-csv-confirm'),/Lost committed/);const committed=f.api.workspace(f.owner,f.scope).offers[0];assert.equal(committed.variants[0].priceMinor,3100);assert.ok(f.ctx.offerBulkPreview);await submit(f.ctx,'offer-csv-confirm');const writes=f.calls.filter(c=>c.method==='bulk');assert.deepEqual(writes[1].input,writes[2].input);assert.equal(f.api.workspace(f.owner,f.scope).offers[0].version,committed.version);assert.equal(f.store.readCollections(['events']).events.filter(e=>e.type==='offer-bulk-draft').length,1);assert.equal(f.ctx.offerBulkPreview,null);assert.equal(f.ctx.closed,true);
 }finally{f.store.close();}
});
