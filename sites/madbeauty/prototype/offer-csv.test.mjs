import test from 'node:test';
import assert from 'node:assert/strict';
import {offerCsv,parseOfferCsv} from './public/offer-csv.mjs';
test('CSV export/import round trip preserves quoted scoped IDs, prices in cents and distinct staff rates',()=>{
 const offers=[{id:'offer;one',version:3,state:'draft',variants:[{id:'variant"quoted',priceMinor:2500,durationMin:60,staffOptions:[{practitionerId:'staff-1',priceMinor:3500,durationMin:90}]}]}],rows=parseOfferCsv(offerCsv(offers));
 assert.deepEqual(rows,[{offerId:'offer;one',version:3,variantId:'variant"quoted',practitionerId:'*',priceMinor:2500,durationMin:60},{offerId:'offer;one',version:3,variantId:'variant"quoted',practitionerId:'staff-1',priceMinor:3500,durationMin:90}]);
 assert.throws(()=>parseOfferCsv('offerId;price\n1;25'),/stulpelius/);assert.throws(()=>parseOfferCsv(offerCsv(offers).replace('"3500"','"35.50"')),/centais/);
});
