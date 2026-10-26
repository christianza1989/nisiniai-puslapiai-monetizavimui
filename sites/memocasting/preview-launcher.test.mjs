import test from 'node:test';
import assert from 'node:assert/strict';
import {memoPreviewBackendAllowed,memoPreviewWorkerConfig} from './start-frontend-preview.mjs';
test('local preview removes custom-domain routes without mutating the deploy artifact or changing bindings',()=>{
 const actual={name:'memocasting-site',main:'index.js',routes:[{pattern:'memocasting.lt',custom_domain:true}],services:[{binding:'MEMO_COMMERCE',service:'memocasting-commerce'}],d1_databases:[{binding:'DB',database_id:'fixture'}]};
 const before=JSON.stringify(actual),preview=memoPreviewWorkerConfig(actual);
 assert.deepEqual(preview.routes,[]);assert.equal(preview.workers_dev,false);assert.equal(preview.preview_urls,false);assert.equal(JSON.stringify(actual),before);
 assert.deepEqual(preview.services,actual.services);assert.deepEqual(preview.d1_databases,actual.d1_databases);assert.equal(preview.main,'index.js');
});
test('preview never admits production, shipping writes or unverified Stripe',()=>{
 const context={environment:'sandbox',testOnly:true,shippingConnected:false,shippingQuotesConnected:false,productionReady:false,publishOffers:false,paymentConnected:false};
 assert.equal(memoPreviewBackendAllowed(context),true);
 for(const field of ['shippingConnected','shippingQuotesConnected','productionReady','publishOffers'])assert.equal(memoPreviewBackendAllowed({...context,[field]:true}),false);
 assert.equal(memoPreviewBackendAllowed({...context,environment:'production'}),false);
 assert.equal(memoPreviewBackendAllowed(context,{stripeTest:true}),false);
 assert.equal(memoPreviewBackendAllowed({...context,schemaVersion:1,paymentConnected:true,paymentProvider:'stripe',paymentEnvironment:'test',paymentAccountVerified:true},{stripeTest:true}),true);
});
