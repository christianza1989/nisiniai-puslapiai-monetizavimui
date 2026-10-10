import test from 'node:test';
import assert from 'node:assert/strict';
import {offerCsv,parseOfferCsv,previewOfferCsv} from './public/offer-csv.mjs';
test('CSV export/import round trip preserves quoted scoped IDs, prices in cents and distinct staff rates',()=>{
 const offers=[{id:'offer;one',version:3,state:'draft',variants:[{id:'variant"quoted',priceMinor:2500,durationMin:60,staffOptions:[{practitionerId:'staff-1',priceMinor:3500,durationMin:90}]}]}],rows=parseOfferCsv(offerCsv(offers));
 assert.deepEqual(rows,[{offerId:'offer;one',version:3,variantId:'variant"quoted',practitionerId:'*',priceMinor:2500,durationMin:60},{offerId:'offer;one',version:3,variantId:'variant"quoted',practitionerId:'staff-1',priceMinor:3500,durationMin:90}]);
 assert.throws(()=>parseOfferCsv('offerId;price\n1;25'),/stulpelius/);assert.throws(()=>parseOfferCsv(offerCsv(offers).replace('"3500"','"35.50"')),/centais/);
});
test('CSV preview resolves current owned rows, inherited staff values and all duplicate/unmatched/version/range issues without mutating inputs',()=>{
 const offer={id:'own',organizationId:'org',version:3,state:'draft',label:'Manikiūras',variants:[{id:'v',label:'Klasikinis',priceMinor:2500,durationMin:60,staffOptions:[{practitionerId:'p',priceMinor:null,durationMin:null}]}]},foreign={...structuredClone(offer),id:'foreign',organizationId:'other'},archived={...structuredClone(offer),id:'archived',state:'archived'},workspace={offers:[offer,foreign,archived],practitioners:[{id:'p',name:'Meistrė'}]},before=structuredClone(workspace);
 const csv=offerCsv([offer]).replaceAll('"2500"','"3100"').replace('"p";"";""','"p";"3500";"60"'),preview=previewOfferCsv(csv,workspace,'org');
 assert.equal(preview.errors.length,0);assert.equal(preview.changes.length,2);assert.equal(preview.changes[1].practitionerLabel,'Meistrė');assert.deepEqual(preview.changes[1].before,{priceMinor:2500,durationMin:60});assert.deepEqual(preview.changes[0].after,{priceMinor:3100,durationMin:60});
 const header='offerId;version;variantId;practitionerId;priceMinor;durationMin',bad=previewOfferCsv(header+'\nown;2;v;*;100001;14\nown;3;v;*;3000;60\nforeign;3;v;*;3000;60\nown;3;missing;*;3000;60\nown;3;v;unassigned;3000;60\narchived;3;v;*;3000;60\nown;9007199254740993;v;p;9007199254740993;481',workspace,'org');
 assert.match(bad.errors.map(e=>e.message).join(' '),/versija pasikeitė/);assert.match(bad.errors.find(e=>e.line===3).message,/eilute 2/);assert.equal(bad.errors.filter(e=>e.line===4).length,1);assert.match(bad.errors.find(e=>e.line===4).message,/darbo vietoje nėra/);assert.match(bad.errors.find(e=>e.line===5).message,/Varianto/);assert.match(bad.errors.find(e=>e.line===6).message,/nepriskirtas/);assert.match(bad.errors.find(e=>e.line===7).message,/archyvuotas/);assert.equal(bad.errors.filter(e=>e.line===8).length,4);assert.deepEqual(workspace,before);
});
