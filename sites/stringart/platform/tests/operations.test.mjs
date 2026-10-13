import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../store.mjs';
import { identities } from '../seed.mjs';
import { sampleProject } from '../seed.mjs';
import { createServer } from '../server.mjs';
const operator=identities[0],partner=identities.find(a=>a.id==='partner-lt'),supplier=identities.find(a=>a.id==='supplier');
function fixture(t){const folder=mkdtempSync(path.join(os.tmpdir(),'ms-test-')),file=path.join(folder,'state.sqlite'),store=new Store(file);t.after(()=>{store.close();rmSync(folder,{recursive:true,force:true});});return {store,file};}
let sequence=0;
const run=(s,a,type,inputs={})=>s.command(a,{type,key:`action-${++sequence}`,...inputs}).result;
const order=(s,type='portrait')=>run(s,partner,'order.create',{tenant:'lt',orderType:type,customer:'Synthetic acceptance buyer',referral:'creator-lena'});
function paid(s,type='portrait'){
 let o=order(s,type);if(type==='portrait'){
  o=run(s,partner,'order.assess',{id:o.id,version:o.version,suitable:true,note:'Clear single subject and permission confirmed in fixture'});
  o=run(s,partner,'order.preview',{id:o.id,version:o.version});o=run(s,partner,'order.approve',{id:o.id,version:o.version,revision:1,simulated:true});
 }return run(s,partner,'order.pay',{id:o.id,version:o.version,simulated:true});
}
const stock=(s,sku,tenant='lt')=>s.read().stock.find(b=>b.tenant===tenant&&b.sku===sku);
test('exact EU fixture, derived sales and sanitized role projections',t=>{
 const {store:s}=fixture(t),v=s.view(operator);assert.equal(v.partners.length,10);assert.equal(v.machines.length,16);assert.equal(v.summary.kits,825);
 assert.equal(v.summary.salesCents,v.orders.reduce((n,o)=>n+o.paidCents,0));assert.equal(v.summary.ourAssumedRevenueCents,99000);assert.equal(v.summary.supplierPurchasesCents,0);
 const sv=s.view(supplier);for(const key of ['partners','orders','stock','audit','summary','referrals'])assert.equal(sv[key],undefined);assert.equal(sv.purchases[0].tenant,undefined);
 assert(s.view(partner).orders.every(o=>o.tenant==='lt'));assert.throws(()=>s.order(partner,'MS-DE-100'),/another workspace/);assert.throws(()=>s.order(supplier,'MS-LT-100'),/another workspace/);
});
test('persistent portrait path binds approval, reserves/consumes once, releases machine and creates one commission',t=>{
 const {store:s,file}=fixture(t);let o=paid(s),before=stock(s,'board42').onHand;
 o=run(s,partner,'order.reserve',{id:o.id,version:o.version});assert.equal(stock(s,'board42').reserved,1);
 assert.throws(()=>run(s,partner,'order.produce',{id:o.id,version:o.version,machineId:'machine-de-1'}),/another workspace/);
 o=run(s,partner,'order.produce',{id:o.id,version:o.version,machineId:'machine-lt-1'});assert.equal(o.productionRevision,1);assert.equal(stock(s,'board42').onHand,before-1);assert.equal(stock(s,'board42').reserved,0);
 o=run(s,partner,'order.quality',{id:o.id,version:o.version,pass:true,note:'Fixture inspection passed'});assert.equal(s.read().machines[0].job,null);
 o=run(s,partner,'order.pack',{id:o.id,version:o.version});assert.equal(stock(s,'board42').onHand,before-1);assert.equal(stock(s,'board42').reserved,0);
 o=run(s,partner,'order.ship',{id:o.id,version:o.version,simulated:true});o=run(s,partner,'order.deliver',{id:o.id,version:o.version});
 assert.equal(s.read().commissions.filter(l=>l.orderId===o.id).length,1);assert(s.read().commissions.find(l=>l.orderId===o.id).releaseAt);
 const other=new Store(file);assert.equal(other.order(partner,o.id).state,'delivered');other.close();
});
test('preview revision invalidates approval, stale writes and illegal jumps are rejected',t=>{
 const {store:s}=fixture(t);let o=order(s);assert.throws(()=>run(s,partner,'order.pay',{id:o.id,version:1,simulated:true}),/unavailable/);
 o=run(s,partner,'order.assess',{id:o.id,version:o.version,suitable:true,note:'Fixture suitable'});
 o=run(s,partner,'order.preview',{id:o.id,version:o.version});o=run(s,partner,'order.approve',{id:o.id,version:o.version,revision:1,simulated:true});
 o=run(s,partner,'order.preview',{id:o.id,version:o.version});assert.equal(o.approvedRevision,null);
 assert.throws(()=>run(s,partner,'order.approve',{id:o.id,version:o.version,revision:1,simulated:true}),/latest/);
 assert.throws(()=>run(s,partner,'order.approve',{id:o.id,version:1,revision:2,simulated:true}),/changed/);
});
test('idempotency replays exactly once and different bodies cannot reuse a key',t=>{
 const {store:s}=fixture(t),c={type:'stock.assemble',key:'assembly-unique',tenant:'lt',qty:2},before=stock(s,'kit42').onHand;
 const first=s.command(partner,c),second=s.command(partner,c);assert.equal(second.replayed,true);assert.equal(first.transaction,second.transaction);assert.equal(stock(s,'kit42').onHand,before+2);
 assert.throws(()=>s.command(partner,{...c,qty:3}),/different input/);assert.equal(s.read().assemblies.length,1);
});
test('failed multi-component assembly rolls back all stock, movements and audit',t=>{
 const {store:s}=fixture(t);run(s,partner,'stock.adjust',{tenant:'lt',sku:'insert',delta:-60,reason:'Fixture shortage'});const before=s.read();
 assert.throws(()=>run(s,partner,'stock.assemble',{tenant:'lt',qty:1}),/Not enough/);assert.deepEqual(s.read(),before);
});
test('packed kit sale consumes no BOM a second time; cancellation releases reservation',t=>{
 const {store:s}=fixture(t);run(s,partner,'stock.assemble',{tenant:'lt',qty:1});const before=stock(s,'thread').onHand;
 let o=paid(s,'kit');o=run(s,partner,'order.reserve',{id:o.id,version:o.version});o=run(s,partner,'order.pack',{id:o.id,version:o.version});assert.equal(stock(s,'thread').onHand,before);
 let cancel=paid(s,'kit');cancel=run(s,partner,'order.reserve',{id:cancel.id,version:cancel.version});run(s,partner,'order.cancel',{id:cancel.id,version:cancel.version});assert.equal(stock(s,'kit42').reserved,0);
});
test('last-unit reservation contention uses latest transactional balance across connections',async t=>{
 const {store:s,file}=fixture(t);run(s,partner,'stock.adjust',{tenant:'lt',sku:'kit42',delta:-79,reason:'Last-unit fixture'});const a=paid(s,'kit'),b=paid(s,'kit'),second=new Store(file);
 const result=await Promise.allSettled([Promise.resolve().then(()=>run(s,partner,'order.reserve',{id:a.id,version:a.version})),Promise.resolve().then(()=>run(second,partner,'order.reserve',{id:b.id,version:b.version}))]);second.close();
 assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal(stock(s,'kit42').reserved,1);
});
test('transfer dispatch and purchase incoming become on-hand only after permitted receipt',t=>{
 const {store:s}=fixture(t),before=stock(s,'kit42','de').onHand;let tr=run(s,operator,'transfer.create',{from:'lt',to:'de',sku:'kit42',qty:5});assert.equal(stock(s,'kit42','de').onHand,before);
 tr=run(s,operator,'transfer.dispatch',{id:tr.id,version:tr.version});assert.equal(stock(s,'kit42','de').onHand,before);
 assert.throws(()=>run(s,partner,'transfer.receive',{id:tr.id,version:tr.version}),/another/);tr=run(s,operator,'transfer.receive',{id:tr.id,version:tr.version});assert.equal(stock(s,'kit42','de').onHand,before+5);
 const start=stock(s,'thread').onHand;let p=s.read().purchases[0];p=run(s,supplier,'purchase.acknowledge',{id:p.id,version:p.version,eta:'2026-10-29'});p=run(s,supplier,'purchase.dispatch',{id:p.id,version:p.version});assert.equal(stock(s,'thread').onHand,start);
 assert.throws(()=>run(s,supplier,'purchase.receive',{id:p.id,version:p.version}),e=>e.code==='forbidden'&&e.status===403);run(s,operator,'purchase.receive',{id:p.id,version:p.version});assert.equal(stock(s,'thread').onHand,start+12000);
});
test('partial/full refund adjusts one ledger, return restocks once, production modes blocked',t=>{
 const {store:s}=fixture(t);let o=paid(s,'kit');o=run(s,partner,'order.reserve',{id:o.id,version:o.version});o=run(s,partner,'order.pack',{id:o.id,version:o.version});const before=stock(s,'kit42').onHand;
 o=run(s,partner,'order.refund',{id:o.id,version:o.version,goodsCents:5000});assert.equal(s.read().commissions.find(l=>l.orderId===o.id).amountCents,Math.round(4999/1.21*.1));
 o=run(s,partner,'order.return',{id:o.id,version:o.version,restock:true,note:'Unopened kit inspected'});assert.equal(stock(s,'kit42').onHand,before+1);
 assert.throws(()=>run(s,partner,'order.return',{id:o.id,version:o.version,restock:true,note:'Duplicate'}),/unavailable/);
 run(s,partner,'order.refund',{id:o.id,version:o.version,goodsCents:9999,shippingCents:900});assert.equal(s.read().commissions.find(l=>l.orderId===o.id).status,'reversed');assert.equal(s.read().commissions.filter(l=>l.orderId===o.id).length,1);
 assert.throws(()=>run(s,partner,'stock.adjust',{tenant:'de',sku:'kit42',delta:1,reason:'Forbidden'}),/another/);
});
test('production cancellation keeps issued materials consumed, releases packing, and rework issues replacement BOM',t=>{
 const {store:s}=fixture(t),initial=stock(s,'board42').onHand,boxes=stock(s,'box42').onHand;let o=paid(s);
 o=run(s,partner,'order.reserve',{id:o.id,version:o.version});o=run(s,partner,'order.produce',{id:o.id,version:o.version,machineId:'machine-lt-1'});
 o=run(s,partner,'order.quality',{id:o.id,version:o.version,pass:false,note:'Synthetic tension failure'});
 o=run(s,partner,'order.rework',{id:o.id,version:o.version,machineId:'machine-lt-1',note:'Replace failed board and thread'});assert.equal(stock(s,'board42').onHand,initial-2);assert.equal(o.materialIssues.length,2);
 o=run(s,partner,'order.cancel',{id:o.id,version:o.version,note:'Cancelled after replacement issue'});assert.equal(stock(s,'board42').onHand,initial-2);assert.equal(stock(s,'box42').onHand,boxes);assert.equal(stock(s,'box42').reserved,0);assert.equal(s.read().machines[0].job,null);
 assert(s.read().movements.some(m=>m.link===o.id&&m.reason.includes('written off')));
});
test('declared mono42/200 profile rejects diameter, layout and colour mismatch with atomic reservation rollback',t=>{
 const {store:s}=fixture(t);
 for(const mutateProject of [p=>p.frame.pins=240,p=>p.layers.push(structuredClone(p.layers[0])),p=>p.layers[0].color='#ff00ff']){
  let o=order(s),p=sampleProject();mutateProject(p);o=run(s,partner,'order.assess',{id:o.id,version:o.version,suitable:true,note:'Fixture suitable'});
  o=run(s,partner,'order.preview',{id:o.id,version:o.version,project:p});o=run(s,partner,'order.approve',{id:o.id,version:o.version,revision:1,simulated:true});o=run(s,partner,'order.pay',{id:o.id,version:o.version,simulated:true});
  const before=s.read();assert.throws(()=>run(s,partner,'order.reserve',{id:o.id,version:o.version}),e=>e.code==='profile_mismatch');assert.deepEqual(s.read(),before);
 }
 let o=order(s),p=sampleProject();p.frame.diameterCm=50;o=run(s,partner,'order.assess',{id:o.id,version:o.version,suitable:true,note:'Fixture suitable'});assert.throws(()=>run(s,partner,'order.preview',{id:o.id,version:o.version,project:p}),e=>e.code==='layout_mismatch');
});
test('cached responses cannot cross authenticated tenants or supplier boundaries',t=>{
 const {store:s}=fixture(t),c={type:'order.create',key:'shared-test-key',tenant:'lt',orderType:'kit',customer:'Private synthetic buyer'};
 const result=s.command(operator,c);assert.throws(()=>s.command(supplier,c),e=>e.code==='forbidden');assert.throws(()=>s.command(identities.find(a=>a.id==='partner-de'),c),e=>e.code==='forbidden');
 const foreign={type:'order.cancel',key:'operator-private-key',id:result.result.id,version:1};s.command(operator,foreign);assert.throws(()=>s.command(supplier,foreign),e=>e.code==='forbidden');assert.throws(()=>s.command(identities.find(a=>a.id==='partner-de'),foreign),e=>e.code==='forbidden');
 let p=s.read().purchases[0],purchase={type:'purchase.acknowledge',key:'supplier-replay',id:p.id,version:p.version,eta:p.eta};const response=s.command(supplier,purchase);assert(!JSON.stringify(response).includes('tenant'));assert.deepEqual(s.command(supplier,purchase).result,response.result);
 assert.throws(()=>s.command(identities.find(a=>a.id==='supplier-other'),purchase),e=>e.code==='forbidden');
});
test('delivery-only refunds preserve commission; historical payout reversal records recovery and one row',t=>{
 const {store:s}=fixture(t);let o=s.order(partner,'MS-LT-100');const before=s.read().commissions.find(l=>l.orderId===o.id).amountCents;
 run(s,operator,'commission.payout',{id:o.id});o=run(s,partner,'order.refund',{id:o.id,version:o.version,goodsCents:0,shippingCents:1200});assert.equal(s.read().commissions.find(l=>l.orderId===o.id).amountCents,before);
 o=run(s,partner,'order.refund',{id:o.id,version:o.version,goodsCents:13700,shippingCents:1200});const row=s.read().commissions.find(l=>l.orderId===o.id);assert.equal(row.amountCents,0);assert.equal(row.recoveryCents,before);assert.equal(s.read().commissions.filter(l=>l.orderId===o.id).length,1);
 assert.throws(()=>run(s,partner,'order.refund',{id:o.id,version:o.version,goodsCents:13701,shippingCents:1200}),e=>e.code==='invalid_quantity');
});
test('cross-machine rework assigns exactly one station; failure rolls back, completion/cancellation free only that job',t=>{
 const {store:s}=fixture(t);
 for(const finish of ['quality','cancel']){
  let o=paid(s);o=run(s,partner,'order.reserve',{id:o.id,version:o.version});o=run(s,partner,'order.produce',{id:o.id,version:o.version,machineId:'machine-lt-1'});o=run(s,partner,'order.quality',{id:o.id,version:o.version,pass:false,note:'Reassignment fixture'});
  const before=s.read();assert.throws(()=>run(s,partner,'order.rework',{id:o.id,version:o.version,machineId:'machine-de-1',note:'Invalid foreign reassignment'}),e=>e.code==='forbidden');assert.deepEqual(s.read(),before);
  o=run(s,partner,'order.rework',{id:o.id,version:o.version,machineId:'machine-lt-2',note:'New station and replacement materials'});
  assert.equal(s.read().machines.filter(m=>m.job===o.id).length,1);assert.equal(s.read().machines.find(m=>m.id==='machine-lt-1').job,null);
  let other=paid(s);other=run(s,partner,'order.reserve',{id:other.id,version:other.version});other=run(s,partner,'order.produce',{id:other.id,version:other.version,machineId:'machine-lt-1'});
  run(s,partner,finish==='quality'?'order.quality':'order.cancel',{id:o.id,version:o.version,pass:true,note:'Finish reworked job'});assert.equal(s.read().machines.filter(m=>m.job===o.id).length,0);assert.equal(s.read().machines.find(m=>m.id==='machine-lt-1').job,other.id);
  run(s,partner,'order.cancel',{id:other.id,version:other.version});
 }
});
test('busy machine service and invalid receipt date are rejected; fully refunded orders cannot reserve',t=>{
 const {store:s}=fixture(t);let o=paid(s);o=run(s,partner,'order.reserve',{id:o.id,version:o.version});o=run(s,partner,'order.produce',{id:o.id,version:o.version,machineId:'machine-lt-1'});const m=s.read().machines[0];
 assert.throws(()=>run(s,partner,'machine.service',{id:m.id,version:m.version,status:'service',note:'Cannot interrupt job'}),e=>e.code==='machine_busy');
 const p=s.read().purchases[0];assert.throws(()=>run(s,supplier,'purchase.acknowledge',{id:p.id,version:p.version,eta:'2026-02-31'}),e=>e.code==='invalid_date');
 let kit=paid(s,'kit');kit=run(s,partner,'order.refund',{id:kit.id,version:kit.version,goodsCents:kit.goodsCents,shippingCents:kit.shippingCents});assert.throws(()=>run(s,partner,'order.reserve',{id:kit.id,version:kit.version}),e=>e.code==='refunded_order');
 const previous=process.env.NODE_ENV;process.env.NODE_ENV='production';try{assert.throws(()=>createServer(),/not admitted for production/);}finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;}
});
