import {backup} from 'node:sqlite';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {localStripeSandbox} from '../../commerce-core/src/local-stripe.mjs';
import {memoStripeTestAccount,memoStripeTestStoreConfig} from './MEMO-STRIPE-TEST.mjs';
const orderHash=rows=>createHash('sha256').update(JSON.stringify(rows)).digest('hex');
export async function prepareMemoStripeTest({service,db,runtime,configFile,adapterFactory=localStripeSandbox}){
 const adapter=adapterFactory(configFile);
 const identity=await adapter.verifyAccount();
 assert.deepEqual(identity,{ready:true,id:memoStripeTestAccount,verified:true});
 const id='memocasting_local_07_8827',store=await service.store(id,'sandbox');
 const original=await service.one('SELECT config_json FROM stores WHERE id=?',id);
 assert.deepEqual(JSON.parse(original.config_json),store);
 const before=await service.rows('SELECT * FROM orders WHERE store_id=? ORDER BY id',id);
 if(store.paymentAccountRef!==memoStripeTestAccount)assert.ok(before.every(o=>!o.checkout_id&&!o.payment_id&&o.payment_state!=='paid'),'Existing provider orders require their original binding');
 const marker=new Date().toISOString().replaceAll(':','-'),snapshot=new URL('pre-stripe-'+marker+'.sqlite',runtime);
 await backup(db.db,fileURLToPath(snapshot));
 const next=memoStripeTestStoreConfig(store,identity.id);
 await service.stmt('UPDATE stores SET config_json=? WHERE id=? AND config_json=?',JSON.stringify(next),id,original.config_json).run();
 const accepted=await service.store(id,'sandbox');assert.deepEqual(accepted,next);
 const after=await service.rows('SELECT * FROM orders WHERE store_id=? ORDER BY id',id);
 assert.equal(orderHash(after),orderHash(before));
 await writeFile(new URL('stripe-test-admission-'+marker+'.json',runtime),JSON.stringify({state:'VERIFIED_STRIPE_TEST_BINDING_ONLY',at:new Date().toISOString(),orders:before.length,ordersHash:orderHash(before),backup:fileURLToPath(snapshot),accountRef:identity.id,productionReady:false},null,2),{flag:'wx'});
 return {[id]:adapter};
}
