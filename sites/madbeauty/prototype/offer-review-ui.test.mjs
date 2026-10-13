import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {build}=await import(pathToFileURL(path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting/node_modules/esbuild/lib/main.js')));
const result=await build({entryPoints:[path.join(import.meta.dirname,'public/offer-admin.mjs')],write:false,bundle:true,format:'esm',platform:'node',plugins:[{name:'public-root',setup(b){b.onResolve({filter:/^\/(demo-model|cities|taxonomy|seo-contract)\.mjs$/},a=>({path:path.join(import.meta.dirname,a.path.slice(1))}));}}]});
const {offerAdminAction}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('Operator sees required extras, complete timing and independent staff occupancy before approving the same offer version',async()=>{
 const v={label:'Base service',priceMinor:2000,durationMin:30,bufferBeforeMin:5,bufferAfterMin:10,staffOptions:[{practitionerId:'p',resourceId:'r',priceMinor:2000,durationMin:30,phases:[{label:'Wait <script>',durationMin:15,staffBusy:false,resourceBusy:true}]}],addonGroups:[{id:'g',label:'Required care',min:1,max:1}],addons:[{id:'a',groupId:'g',label:'Care <img>',priceMinor:500,durationMin:15},{id:'b',label:'Optional',priceMinor:200,durationMin:0}],attributes:{technique:'Manual <b>'},availabilityRules:{weekdays:['Mon'],fromMin:540,toMin:1020,minLeadTimeMin:60,maxAdvanceDays:7}},offer={id:'o',label:'Offer',description:'Details',taxonomyServiceId:'t',version:4,bookingMode:'instant',variants:[v]};
 let html;const ctx={adapter:{mode:'real'},catalogueNodes:[{id:'t',path:['Nails','Manicure']}],workspace:{offers:[offer],organizations:[],practitioners:[{id:'p',name:'Practitioner'}],resources:[{id:'r',label:'Chair'}]},openDialog:(title,body)=>{html=body;}};
 await offerAdminAction(ctx,'offer-review',{dataset:{id:'o'}});assert.equal(ctx.reviewingOffer,offer);assert.equal(ctx.reviewingOffer.version,4);
 assert.match(html,/Required care/);assert.match(html,/Būtina pasirinkti 1–1/);assert.match(html,/Care &lt;img&gt;/);assert.match(html,/\+5,00/);assert.match(html,/\+15 min/);assert.match(html,/Neprivalomi priedai/);assert.match(html,/meistras laisvas/);assert.match(html,/darbo vieta užimta/);assert.match(html,/Wait &lt;script&gt;/);assert.match(html,/Manual &lt;b&gt;/);assert.match(html,/Pirmadienis/);assert.match(html,/09:00–17:00/);assert.match(html,/prieš 60 min/);assert.match(html,/7 dienų/);assert.doesNotMatch(html,/<script>|<img>|Manual <b>/);
});
const bookingBuild=await build({entryPoints:[path.join(import.meta.dirname,'public/booking-ui.mjs')],write:false,bundle:true,format:'esm',platform:'node',plugins:[{name:'public-root',setup(b){b.onResolve({filter:/^\/(demo-model|cities|taxonomy|seo-contract)\.mjs$/},a=>({path:path.join(import.meta.dirname,a.path.slice(1))}));}}]});
const {bookingSummary}=await import('data:text/javascript;base64,'+Buffer.from(bookingBuild.outputFiles[0].text).toString('base64'));
test('Required selections never advertise the incomplete base amount as a final visit total',()=>{
 const ctx={state:{booking:{}}},s={organizationName:'Fixture',city:'Vilnius',label:'Base',bufferBeforeMin:0,bufferAfterMin:0},base={durationMin:30,priceMinor:2000,addons:[],requiresSelection:true};
 const pending=bookingSummary(ctx,s,base);assert.match(pending,/Pasirink priedus/);assert.match(pending,/Bazinė suma/);assert.match(pending,/Bazinė trukmė/);assert.doesNotMatch(pending,/Bendra suma/);
 const selected=bookingSummary(ctx,s,{durationMin:45,priceMinor:2500,addons:[{label:'Required care',priceMinor:500}]});assert.match(selected,/45 min/);assert.match(selected,/25,00/);assert.match(selected,/Bendra suma/);assert.doesNotMatch(selected,/Bazinė suma|Pasirink priedus/);
});
