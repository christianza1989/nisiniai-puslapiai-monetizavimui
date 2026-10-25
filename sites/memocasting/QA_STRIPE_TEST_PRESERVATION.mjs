import assert from 'node:assert/strict';
import {mkdtemp,readdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,basename,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {NodeDatabase} from '../../commerce-core/src/node-db.mjs';
import {CommerceService} from '../../commerce-core/src/service.mjs';
import {fixtureStore,fixtureProducts,cart,key} from '../../commerce-core/test/fixtures.mjs';
import {prepareMemoStripeTest} from './PREPARE-STRIPE-TEST.mjs';
import {memoStripeTestAccount} from './MEMO-STRIPE-TEST.mjs';
const directory=await mkdtemp(join(tmpdir(),'memo-stripe-preservation-')),runtime=pathToFileURL(directory+'/');
const db=new NodeDatabase(join(directory,'fixture.sqlite'));db.migrate();const service=new CommerceService(db),id='memocasting_local_07_8827';
try{
 const config={...fixtureStore(id),hosts:['127.0.0.1:8827'],foreignField:{keep:true}};await service.provisionStore(config,fixtureProducts());
 await service.createOrder(id,'sandbox',cart(),key(1));
 const before=await service.rows('SELECT * FROM orders ORDER BY id'),oldStore=await service.store(id,'sandbox');
 await service.stmt('UPDATE stores SET config_json=? WHERE id=?',JSON.stringify(oldStore,null,2),id).run();
 await assert.rejects(prepareMemoStripeTest({db,service,runtime,adapterFactory:()=>({verifyAccount:async()=>({ready:true,id:'acct_other',verified:true})})}));
 assert.deepEqual(await service.store(id,'sandbox'),oldStore);assert.equal((await readdir(directory)).filter(f=>f.startsWith('pre-stripe')).length,0);
 const result=await prepareMemoStripeTest({db,service,runtime,adapterFactory:()=>({verifyAccount:async()=>({ready:true,id:memoStripeTestAccount,verified:true})})});
 assert.ok(result[id]);assert.deepEqual(await service.rows('SELECT * FROM orders ORDER BY id'),before);
 const next=await service.store(id,'sandbox');assert.deepEqual(next.markets,oldStore.markets);assert.deepEqual(next.foreignField,oldStore.foreignField);
 const file=(await readdir(directory)).find(f=>f.startsWith('pre-stripe')&&f.endsWith('.sqlite')),restored=new NodeDatabase(join(directory,file));
 assert.deepEqual(restored.db.prepare('SELECT * FROM orders ORDER BY id').all(),before);restored.close();
 const receipt=JSON.parse(await readFile(join(directory,(await readdir(directory)).find(f=>f.startsWith('stripe-test-admission'))),'utf8'));assert.equal(receipt.orders,1);assert.equal(receipt.productionReady,false);
 console.log(JSON.stringify({state:'ISOLATED_DB_BACKUP_ORDER_POLICY_AND_FOREIGN_FIELD_PRESERVATION_PASS',provider:'injected regression only; no Stripe acceptance claim'}));
}finally{db.close();assert.equal(dirname(resolve(directory)),resolve(tmpdir()));assert.ok(basename(directory).startsWith('memo-stripe-preservation-'));await rm(directory,{recursive:true,force:true});}
