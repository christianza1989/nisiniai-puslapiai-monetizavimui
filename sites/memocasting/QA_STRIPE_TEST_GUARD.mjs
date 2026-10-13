import assert from 'node:assert/strict';
import {memoPreviewBackendAllowed} from './start-frontend-preview.mjs';
import {memoStripeTestStoreConfig,memoStripeTestAccount} from './MEMO-STRIPE-TEST.mjs';
const off={schemaVersion:1,environment:'sandbox',testOnly:true,paymentConnected:false,shippingConnected:false,shippingQuotesConnected:false,productionReady:false,publishOffers:false};
const test={...off,paymentConnected:true,paymentProvider:'stripe',paymentEnvironment:'test',paymentAccountVerified:true};
assert.equal(memoPreviewBackendAllowed(off),true);assert.equal(memoPreviewBackendAllowed(off,{stripeTest:true}),false);
assert.equal(memoPreviewBackendAllowed(test),false);assert.equal(memoPreviewBackendAllowed(test,{stripeTest:true}),true);
for(const key of Object.keys(test)){const incomplete={...test};delete incomplete[key];assert.equal(memoPreviewBackendAllowed(incomplete,{stripeTest:true}),false,key);}
for(const patch of [{environment:'production'},{testOnly:false},{paymentProvider:'fixture'},{paymentEnvironment:'live'},{paymentAccountVerified:false},{shippingConnected:true},{shippingQuotesConnected:true},{productionReady:true},{publishOffers:true}])assert.equal(memoPreviewBackendAllowed({...test,...patch},{stripeTest:true}),false);
const before={environment:'sandbox',testOnly:true,hosts:['127.0.0.1:8827'],paymentAccountRef:'unconnected',markets:[{country:'LT',policyVersion:'approved-hash'}],checkout:{customField:'preserve'},foreignField:{keep:true}};
const next=memoStripeTestStoreConfig(before,memoStripeTestAccount);assert.equal(before.paymentAccountRef,'unconnected');assert.deepEqual(next.markets,before.markets);assert.deepEqual(next.foreignField,before.foreignField);assert.equal(next.checkout.customField,'preserve');assert.ok(next.hosts.includes('127.0.0.1:8817'));
assert.throws(()=>memoStripeTestStoreConfig({...before,environment:'production'},memoStripeTestAccount));assert.throws(()=>memoStripeTestStoreConfig(before,'acct_other'));
console.log(JSON.stringify({state:'STRIPE_TEST_GUARD_AND_CONFIG_PRESERVATION_PASS'}));
