import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { makeMonthSeed, MONTH, VOLUMES } from '../month-fixture.mjs';
import { Store, summary } from '../store.mjs';
import { identities } from '../seed.mjs';
import { createServer } from '../server.mjs';

const seed=makeMonthSeed(),op=identities[0],inMonth=o=>o.at>=MONTH.start&&o.at<=MONTH.end;
function stored(t){const folder=mkdtempSync(path.join(os.tmpdir(),'ms-month-')),file=path.join(folder,'state.sqlite'),store=new Store(file,{seedFactory:()=>structuredClone(seed)});t.after(()=>{store.close();assert(path.resolve(folder).startsWith(path.resolve(os.tmpdir())+path.sep+'ms-month-'));rmSync(folder,{recursive:true,force:true});});return {store,file};}
test('complete deterministic month: all ten studios, every day and distinct volumes',()=>{
 assert.deepEqual(makeMonthSeed(),seed);assert.equal(seed.orders.filter(inMonth).length,489);assert.equal(seed.orders.length,499);assert.equal(seed.machines.length,16);
 for(const [i,p] of seed.partners.entries()){
  const rows=seed.orders.filter(o=>o.tenant===p.id&&inMonth(o));assert.equal(rows.length,VOLUMES[i]);assert.equal(new Set(rows.map(o=>o.at.slice(0,10))).size,30);
  assert(rows.some(o=>o.type==='portrait'));assert(rows.some(o=>o.type==='kit'));assert(rows.some(o=>o.state==='delivered'));assert(rows.some(o=>o.state!=='delivered'));
  assert.equal(seed.purchases.filter(o=>o.tenant===p.id).length,10);assert.equal(seed.assemblies.filter(o=>o.tenant===p.id).length,4);assert(seed.transfers.some(o=>o.from===p.id)&&seed.transfers.some(o=>o.to===p.id));
 }
 const states=new Set(seed.orders.map(o=>o.state));for(const state of ['inquiry','needs_photo','suitable','preview','approved','paid','reserved','producing','quality_failed','quality','packed','shipped','delivered','returned','cancelled'])assert(states.has(state),state);
});
test('every movement reconciles at every point, with exact reservations and no fictitious receipt stock',()=>{
 const running=new Map();
 for(const m of seed.movements){const key=m.tenant+'/'+m.sku,previous=running.get(key)||{onHand:0,reserved:0};previous.onHand+=m.onHand;previous.reserved+=m.reserved;assert(previous.onHand>=previous.reserved&&previous.reserved>=0,`${m.id}: negative availability`);running.set(key,previous);}
 for(const b of seed.stock){assert.deepEqual(running.get(b.tenant+'/'+b.sku),{onHand:b.onHand,reserved:b.reserved});const orderReserved=seed.orders.filter(o=>o.tenant===b.tenant).flatMap(o=>o.reservations).filter(l=>l.sku===b.sku).reduce((n,l)=>n+l.qty,0),transferReserved=seed.transfers.filter(t=>t.from===b.tenant&&t.sku===b.sku&&t.state==='reserved').reduce((n,t)=>n+t.qty,0);assert.equal(b.reserved,orderReserved+transferReserved);}
 assert.equal(seed.movements.filter(m=>m.reason.startsWith('Counted')&&m.sku==='kit42').reduce((n,m)=>n+m.onHand,0),825);
 assert.equal(seed.stock.filter(b=>b.sku==='kit42').reduce((n,b)=>n+b.onHand,0),612);
 for(const p of seed.purchases){const moves=seed.movements.filter(m=>m.link===p.id&&m.reason==='Supplier purchase received');assert.equal(moves.length,p.state==='received'?p.lines.length:0);}
 for(const tr of seed.transfers){const moves=seed.movements.filter(m=>m.link===tr.id&&m.reason==='Transfer received');assert.equal(moves.length,tr.state==='received'?1:0);}
});
test('chronology, approved project binding, machine intervals and capacity agree',()=>{
 for(const collection of [seed.orders,seed.purchases,seed.transfers])for(const row of collection){assert(row.at<=MONTH.end);let previous=row.at;for(const h of row.history){assert(h.at>=previous&&h.at<=MONTH.end,`${row.id} chronology`);previous=h.at;}assert.equal(row.history.at(-1).state,row.state);}
 for(const o of seed.orders.filter(inMonth)){
  for(const revision of o.revisions){assert(revision.at>=o.at&&revision.at<=MONTH.end);assert.equal(revision.project.createdAt,revision.at);}
  if(o.bomSnapshot){const approved=o.revisions.find(r=>r.number===o.approvedRevision);assert.equal(o.bomSnapshot.projectHash,createHash('sha256').update(JSON.stringify(approved.project)).digest('hex'));assert.equal(o.bomSnapshot.approvedRevision,o.approvedRevision);}
  if(o.productionConsumed)assert(o.materialIssues.length>0);if(o.consumed)assert.equal(o.reservations.length,0);
 }
 for(const m of seed.machines){if(m.job){const o=seed.orders.find(o=>o.id===m.job);assert.equal(o.machineId,m.id);assert.equal(o.tenant,m.tenant);assert(['producing','quality_failed'].includes(o.state));}const events=seed.audit.filter(a=>['order.produce','order.rework'].includes(a.type)&&seed.orders.find(o=>o.id===a.entity)?.machineId===m.id),daily=new Map();for(const e of events)daily.set(e.at.slice(0,10),(daily.get(e.at.slice(0,10))||0)+1);for(const n of daily.values())assert(n<=m.capacity);
  const intervals=seed.orders.filter(o=>o.machineId===m.id).map(o=>{const start=o.history.find(h=>h.state==='producing').at,end=o.history.find(h=>h.at>=start&&['quality','cancelled'].includes(h.state))?.at||'9999-12-31';return {start,end,order:o.id};}).sort((a,b)=>a.start.localeCompare(b.start));for(let i=1;i<intervals.length;i++)assert(intervals[i-1].end<=intervals[i].start,`${m.id}: overlapping jobs ${intervals[i-1].order}/${intervals[i].order}`);
 }
 assert(seed.orders.filter(inMonth).some(o=>o.materialIssues?.some(m=>m.type==='rework')));assert(seed.orders.filter(inMonth).some(o=>o.revisions.length===2));
 for(const a of seed.audit)assert(a.at>=MONTH.start&&a.at<=MONTH.end);for(let i=1;i<seed.audit.length;i++)assert(seed.audit[i].at>=seed.audit[i-1].at);
});
test('money, refunds and one-row commissions reconcile independently of August carry-over',()=>{
 const s=summary(seed),rows=seed.orders.filter(inMonth),net=rows.reduce((n,o)=>n+o.paidCents-o.refundGoodsCents-o.refundShippingCents,0);assert.equal(s.salesCents,net);assert.equal(net,8523208);
 assert.equal(s.byStudio.reduce((n,p)=>n+p.salesCents,0),net);assert.equal(s.daily.reduce((n,p)=>n+p.salesCents,0),net);assert.equal(s.daily.reduce((n,p)=>n+p.orders,0),489);assert.equal(s.refundCents,625971);
 assert.equal(new Set(seed.commissions.map(c=>c.orderId)).size,seed.commissions.length);
 for(const c of seed.commissions){const o=seed.orders.find(o=>o.id===c.orderId);assert.equal(c.amountCents,Math.round((o.goodsCents-o.refundGoodsCents)/1.21*.1));if(c.releaseAt)assert.equal(Date.parse(c.releaseAt),Date.parse(o.deliveredAt)+30*86400000);if(c.payout){assert(Date.parse(c.payout.at)>=Date.parse(c.releaseAt));assert.equal(c.recoveryCents||0,Math.max(0,c.payout.amountCents-c.amountCents));}}
 assert(seed.commissions.some(c=>c.status==='paid_simulated'));assert(seed.commissions.some(c=>c.recoveryCents>0));assert(seed.commissions.some(c=>c.status==='reversed'));
});
test('all ten partner projections and supplier privacy remain correct with the populated month',t=>{
 const {store}=stored(t);let total=0;
 for(const actor of identities.filter(a=>a.role==='partner')){const view=store.view(actor);assert.equal(view.partners.length,1);for(const key of ['orders','machines','stock','movements','assemblies','commissions','purchases'])assert(view[key].every(r=>r.tenant===actor.tenant));assert(view.audit.every(a=>a.tenant===actor.tenant));assert.equal(view.summary.daily.length,30);total+=view.summary.salesCents;const foreign=seed.orders.find(o=>o.tenant!==actor.tenant);assert.throws(()=>store.order(actor,foreign.id),/another workspace/);}
 assert.equal(total,store.view(op).summary.salesCents);const supplier=store.view(identities.find(a=>a.id==='supplier'));for(const key of ['orders','partners','stock','machines','audit','summary','commissions'])assert.equal(supplier[key],undefined);assert(supplier.purchases.every(p=>p.tenant===undefined));assert.equal(supplier.purchases.length,100);
});
test('month survives restart, accepts normal live-clock actions and safely resets to the same profile',t=>{
 const {store,file}=stored(t),actor=identities.find(a=>a.id==='partner-lt'),o=seed.orders.find(o=>o.tenant==='lt'&&o.state==='inquiry'&&inMonth(o));
 const result=store.command(actor,{type:'order.assess',key:'month-continue',id:o.id,version:o.version,suitable:true,note:'Continued from September fixture',at:MONTH.start});assert.equal(result.result.state,'suitable');assert(Date.parse(result.result.history.at(-1).at)>Date.parse(MONTH.end));
 const reopened=new Store(file);assert.equal(reopened.order(actor,o.id).state,'suitable');assert.equal(reopened.read().fixture,seed.fixture);reopened.close();
 const before=store.read();assert.throws(()=>store.command(actor,{type:'stock.assemble',key:'month-shortage',tenant:'lt',qty:100}),/Not enough/);assert.deepEqual(store.read(),before);
 store.command(op,{type:'reset',key:'month-reset'});assert.deepEqual(store.read().orders,seed.orders);assert.equal(store.read().generation,2);
});
test('default local HTTP server exposes the populated month and preserves it across reopen',async t=>{
 const folder=mkdtempSync(path.join(os.tmpdir(),'ms-month-http-')),file=path.join(folder,'state.sqlite'),{server}=createServer({dbFile:file});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(async()=>{await new Promise(resolve=>server.close(resolve));assert(path.resolve(folder).startsWith(path.resolve(os.tmpdir())+path.sep+'ms-month-http-'));rmSync(folder,{recursive:true,force:true});});
 const url=`http://127.0.0.1:${server.address().port}`,response=await fetch(url+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identity:'partner-fi'})}),cookie=response.headers.get('set-cookie').split(';')[0],state=await(await fetch(url+'/api/state',{headers:{Cookie:cookie}})).json();assert.equal(state.data.fixture,seed.fixture);assert.equal(state.data.summary.inquiries,33);assert.equal(state.data.orders.length,34);assert.equal(state.data.summary.daily.length,30);
});
