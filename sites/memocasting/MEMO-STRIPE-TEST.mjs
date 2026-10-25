import assert from 'node:assert/strict';
export const memoStripeTestAccount='acct_1S5SjjLx4n55ikI7';
export function memoStripeTestStoreConfig(config,accountRef){
 assert.equal(accountRef,memoStripeTestAccount,'Unexpected Stripe TEST merchant');
 assert.equal(config.environment,'sandbox');assert.equal(config.testOnly,true);
 assert.notEqual(config.productionAdmission?.approved,true);assert.notEqual(config.operationalAdmission?.approved,true);
 const next=structuredClone(config);
 next.paymentAccountRef=accountRef;
 next.hosts=[...new Set([...config.hosts,'127.0.0.1:8817'])];
 next.checkout={...config.checkout,successUrl:'http://127.0.0.1:8817/cart?checkout=success',cancelUrl:'http://127.0.0.1:8817/cart?checkout=cancelled'};
 return next;
}
