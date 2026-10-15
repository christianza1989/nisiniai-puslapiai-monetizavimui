import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {build}=await import(pathToFileURL(path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting/node_modules/esbuild/lib/main.js')));
const result=await build({entryPoints:[path.join(import.meta.dirname,'public/booking-ui.mjs')],write:false,bundle:true,format:'esm',platform:'node',plugins:[{name:'public-root',setup(b){b.onResolve({filter:/^\/(demo-model|cities|taxonomy|seo-contract)\.mjs$/},a=>({path:path.join(import.meta.dirname,a.path.slice(1))}));}}]});
const {bookingAction}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));

test('Failed slot retries replace the current focused alert and preserve selection until a successful hold',async()=>{
 const alerts=[],candidate={id:'candidate',practitionerId:'staff'},booking={serviceId:'service',addons:['addon'],hold:null},search={diena:'1',nuo:'17:00',iki:'20:00'};
 let attempts=0,saved=0,navigated;
 const ctx={state:{booking,search},candidates:new Map([[candidate.id,candidate]]),realAdapter:{session:{user:{id:'client'}}},adapter:{mode:'real',hold:async input=>{assert.equal(input,candidate);attempts++;if(attempts<3)throw Object.assign(Error('Bandymas '+attempts+' nepavyko.'),{code:'UNAVAILABLE'});return {id:'hold'};}},saveUI:()=>saved++,navigate:async value=>{navigated=value;}};
 const form={querySelectorAll:()=>[],parentElement:{querySelectorAll:()=>[...alerts]},insertAdjacentHTML:(where,html)=>{assert.equal(where,'afterend');const alert={html,focused:false,attributes:{},setAttribute(name,value){this.attributes[name]=value;},focus(){this.focused=true;},remove(){alerts.splice(alerts.indexOf(this),1);}};alerts.push(alert);}};
 const priorDocument=globalThis.document;
 globalThis.document={querySelector:selector=>selector==='#booking-time-filter'?form:selector==='#main .error-box'?alerts[0]:null};
 try{
  for(let attempt=1;attempt<=2;attempt++){
   assert.equal(await bookingAction(ctx,'booking-slot',{dataset:{id:candidate.id}}),true);
   assert.equal(alerts.length,1);assert.match(alerts[0].html,new RegExp('Bandymas '+attempt+' nepavyko'));assert.equal(alerts[0].focused,true);assert.equal(alerts[0].attributes.tabindex,'-1');
   assert.deepEqual(booking,{serviceId:'service',addons:['addon'],hold:null});assert.deepEqual(search,{diena:'1',nuo:'17:00',iki:'20:00'});assert.equal(saved,0);assert.equal(navigated,undefined);
  }
  await bookingAction(ctx,'booking-slot',{dataset:{id:candidate.id}});assert.equal(attempts,3);assert.equal(booking.hold.id,'hold');assert.equal(booking.candidate,candidate);assert.equal(booking.practitionerId,'staff');assert.equal(saved,1);assert.equal(navigated,'/registracija/duomenys');
 }finally{if(priorDocument===undefined)delete globalThis.document;else globalThis.document=priorDocument;}
});
