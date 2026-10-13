import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { makeSeed, identities, sampleProject } from './seed.mjs';
import { validateProject, threadMeters } from '../mobile/model.mjs';

export class Fault extends Error { constructor(code,message,status=409){super(message);this.code=code;this.status=status;} }
const requireThat=(yes,code,message,status=409)=>{if(!yes)throw new Fault(code,message,status);};
const integer=(v,min=1,max=1000000)=>{requireThat(Number.isSafeInteger(v)&&v>=min&&v<=max,'invalid_quantity','Enter a whole quantity within the allowed range.',400);return v;};
const text=(v,max=160)=>{requireThat(typeof v==='string'&&v.trim().length>0&&v.length<=max,'invalid_text','Enter a short, nonempty value.',400);return v.trim();};
const calendarDate=v=>{requireThat(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().startsWith(v),'invalid_date','Enter a valid expected receipt date.',400);return v;};
const id=prefix=>`${prefix}-${randomUUID().slice(0,8)}`;
function owned(actor,tenant){requireThat(actor.role==='operator'||(actor.role==='partner'&&actor.tenant===tenant),'forbidden','This record belongs to another workspace.',403);}
function version(entity,c){requireThat(entity.version===c.version,'stale_version','This record changed. Refresh before trying again.');}
function entity(list,entityId){const e=list.find(e=>e.id===entityId);requireThat(e,'not_found','The record could not be found.',404);return e;}
function balance(s,tenant,sku){const b=s.stock.find(b=>b.tenant===tenant&&b.sku===sku);requireThat(b,'unknown_stock','Choose an existing studio and stock item.',400);return b;}
export function summary(s){
 const orders=s.orders.filter(o=>o.paidCents>0), net=orders.reduce((n,o)=>n+o.paidCents-o.refundGoodsCents-o.refundShippingCents,0);
 return {studios:s.partners.length,machines:s.machines.length,kits:s.stock.filter(b=>b.sku==='kit42').reduce((n,b)=>n+b.onHand,0),
  salesCents:net,orders:orders.length,delivered:orders.filter(o=>o.state==='delivered').length,
  ourAssumedRevenueCents:s.partners.length*s.assumptions.subscriptionCents*s.assumptions.platformMonths,
  supplierPurchasesCents:s.purchases.filter(p=>p.state==='received').reduce((n,p)=>n+p.lines.reduce((a,l)=>a+l.qty*l.unitCents,0),0),
  commissionCents:s.commissions.reduce((n,l)=>n+l.amountCents,0)};
}
export class Store {
 constructor(filename){
  mkdirSync(path.dirname(filename),{recursive:true});this.db=new DatabaseSync(filename);
  this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS receipts (actor TEXT, key TEXT, hash TEXT, response TEXT, PRIMARY KEY(actor,key));');
  this.db.prepare('INSERT OR IGNORE INTO state(id,value) VALUES(1,?)').run(JSON.stringify(makeSeed()));
 }
 close(){this.db.close();}
 read(){return JSON.parse(this.db.prepare('SELECT value FROM state WHERE id=1').get().value);}
 view(actor){
  const s=this.read();
  if(actor.role==='supplier')return {fixture:s.fixture,generation:s.generation,role:actor.role,adapters:s.adapters,
   demand:s.skus.map(sku=>({sku:sku.id,name:sku.name,unit:sku.unit,agreed:true,available:s.stock.filter(b=>b.sku===sku.id).reduce((n,b)=>n+b.onHand-b.reserved,0),
    reorderDemand:s.stock.filter(b=>b.sku===sku.id).reduce((n,b)=>n+Math.max(0,sku.reorder-(b.onHand-b.reserved)),0)})),
   purchases:s.purchases.filter(p=>p.supplier===actor.tenant).map(({id,state,version,eta,lines,note,tracking})=>({id,state,version,eta,lines,note,tracking})),skus:s.skus};
  if(actor.role==='operator')return {...s,summary:summary(s)};
  const scoped=structuredClone(s), tenant=actor.tenant;
  for(const key of ['partners','machines','stock','orders','commissions','movements','assemblies'])scoped[key]=s[key].filter(e=>(key==='partners'?e.id:e.tenant)===tenant);
  scoped.purchases=s.purchases.filter(p=>p.tenant===tenant);
  scoped.transfers=s.transfers.filter(t=>t.from===tenant||t.to===tenant).map(t=>({...t,counterpartName:entity(s.partners,t.from===tenant?t.to:t.from).name}));
  scoped.audit=s.audit.filter(e=>e.tenant===tenant);
  scoped.referrals=s.referrals.filter(r=>scoped.orders.some(o=>o.referral===r.id));
  scoped.summary=summary(scoped);return scoped;
 }
 order(actor,orderId){const o=entity(this.read().orders,orderId);owned(actor,o.tenant);return o;}
 command(actor,c){
  requireThat(identities.some(a=>a.id===actor.id&&a.role===actor.role&&a.tenant===actor.tenant),'unauthorized','Choose a local test identity.',401);
  requireThat(c&&typeof c==='object'&&!Array.isArray(c),'invalid_command','Invalid command.',400);
  text(c.key,100);text(c.type,60);
  // Authorize current entity ownership before replaying any cached response.
  const current=this.read();
  if(c.type.startsWith('order.')&&c.type!=='order.create')owned(actor,entity(current.orders,c.id).tenant);
  if(c.type.startsWith('purchase.')&&c.type!=='purchase.create'){
   const p=entity(current.purchases,c.id);requireThat(actor.role==='operator'||(actor.role==='supplier'&&actor.tenant===p.supplier&&c.type!=='purchase.receive'),'forbidden','This purchase action is unavailable to this workspace.',403);
  }
  if(['order.create','stock.assemble','stock.adjust'].includes(c.type))owned(actor,c.tenant);
  if(['reset','purchase.create','transfer.create','commission.payout'].includes(c.type))requireThat(actor.role==='operator','forbidden','Only the operator may perform this action.',403);
  if(c.type==='machine.service')owned(actor,entity(current.machines,c.id).tenant);
  if(c.type.startsWith('transfer.')&&c.type!=='transfer.create'){const tr=entity(current.transfers,c.id);owned(actor,c.type==='transfer.receive'?tr.to:tr.from);}
  const principal=`${actor.id}:${actor.role}:${actor.tenant||'network'}`;
  const hash=createHash('sha256').update(JSON.stringify(c)).digest('hex');
  this.db.exec('BEGIN IMMEDIATE');
  try {
   const prior=this.db.prepare('SELECT hash,response FROM receipts WHERE actor=? AND key=?').get(principal,c.key);
   if(prior){requireThat(prior.hash===hash,'key_conflict','This action key was already used with different input.');this.db.exec('COMMIT');return {...JSON.parse(prior.response),replayed:true};}
   const s=this.read(),now=new Date().toISOString(),tx=id('tx');
   const move=(tenant,sku,onHand,reserved,reason,link)=>{
    const b=balance(s,tenant,sku);
    requireThat(b.onHand+onHand>=0&&b.reserved+reserved>=0&&b.onHand+onHand>=b.reserved+reserved,'insufficient_stock',`Not enough available ${sku}. Release a reservation or receive stock first.`);
    b.onHand+=onHand;b.reserved+=reserved;
    s.movements.push({id:id('mv'),transaction:tx,tenant,sku,onHand,reserved,reason,link,actor:actor.id,at:now});
   };
   const transition=(o,state,note)=>{o.state=state;o.version++;o.history.push({state,at:now,note});};
   const release=o=>{for(const l of o.reservations)move(o.tenant,l.sku,0,-l.qty,'Unused reservation released',o.id);o.reservations=[];if(o.machineId){const m=entity(s.machines,o.machineId);if(m.job===o.id){m.job=null;m.version++;}}};
   const commission=o=>{
    if(!o.referral||!o.paidCents)return;
    let row=s.commissions.find(l=>l.orderId===o.id),amount=Math.round(Math.max(0,o.goodsCents-o.refundGoodsCents)/1.21*.1);
    if(!row){row={orderId:o.id,tenant:o.tenant,referral:o.referral,basisCents:o.goodsCents,amountCents:amount,status:'held',releaseAt:null,adjustments:[],payout:null};s.commissions.push(row);}
    if(row.amountCents!==amount)row.adjustments.push({at:now,deltaCents:amount-row.amountCents,reason:'Refund adjustment'});
    row.amountCents=amount;row.status=row.payout?'paid_adjusted':amount===0?'reversed':'held';row.recoveryCents=Math.max(0,(row.payout?.amountCents||0)-amount);
    if(o.deliveredAt)row.releaseAt=new Date(Date.parse(o.deliveredAt)+30*86400000).toISOString();
   };
   let result,tenant=null,entityId=c.id||null;
   if(c.type==='reset'){
    requireThat(actor.role==='operator','forbidden','Only the operator may reset synthetic fixtures.',403);
    const fresh=makeSeed();fresh.generation=s.generation+1;
    this.db.prepare('UPDATE state SET value=? WHERE id=1').run(JSON.stringify(fresh));this.db.exec('DELETE FROM receipts');
    result={ok:true,generation:fresh.generation};
   }else{
    if(c.type==='order.create'){
     owned(actor,c.tenant);entity(s.partners,c.tenant);tenant=c.tenant;
     requireThat(['portrait','kit'].includes(c.orderType),'invalid_type','Choose a portrait or kit.',400);
     if(c.referral)requireThat(s.referrals.some(r=>r.id===c.referral),'invalid_referral','Choose a known referral source.',400);
     const quantity=integer(c.quantity||1,1,c.orderType==='portrait'?1:20);
     const o={id:id('MS'),tenant,type:c.orderType,customer:text(c.customer,100),email:'buyer@demo.customers.example',title:c.orderType==='portrait'?'42 cm monochrome pet portrait':'42 cm DIY gift kit',quantity,state:'inquiry',version:1,
      goodsCents:(c.orderType==='portrait'?13700:9999)*quantity,shippingCents:c.orderType==='portrait'?1200:900,paidCents:0,refundGoodsCents:0,refundShippingCents:0,referral:c.referral||null,revisions:[],approvedRevision:null,reservations:[],consumed:false,returned:false,at:now,history:[{state:'inquiry',at:now,note:'Synthetic local order'}]};
     s.orders.push(o);result=o;entityId=o.id;
    }else if(c.type.startsWith('order.')){
     const o=entity(s.orders,c.id);owned(actor,o.tenant);tenant=o.tenant;version(o,c);
     const action=c.type.slice(6),state=o.state;
     const inStates=states=>requireThat(states.includes(state),'invalid_state',`This action is unavailable while the order is ${state.replaceAll('_',' ')}.`);
     if(action==='assess'){
      requireThat(o.type==='portrait','invalid_type','Photo assessment applies to portraits.');inStates(['inquiry','needs_photo']);
      requireThat(typeof c.suitable==='boolean','invalid_assessment','Record a photo suitability result.',400);o.photoNote=text(c.note);transition(o,c.suitable?'suitable':'needs_photo',o.photoNote);
     }else if(action==='preview'){
      requireThat(o.type==='portrait','invalid_type','Preview applies to portraits.');inStates(['suitable','preview','approved']);
      const number=o.revisions.length+1;let project;
      try{project=validateProject(c.project||sampleProject(number));}catch(e){throw new Fault('invalid_project',e.message,400);}
      requireThat(project.frame.diameterCm===42,'layout_mismatch','This order requires the declared 42 cm layout.',400);
      o.revisions.push({number,project,note:text(c.note||'Prepared synthetic sample'),at:now});o.approvedRevision=null;transition(o,'preview',`Preview revision ${number} prepared`);
     }else if(action==='approve'){
      inStates(['preview']);requireThat(c.revision===o.revisions.at(-1)?.number,'stale_preview','Approve the latest preview revision.');
      requireThat(c.simulated===true,'simulation_required','Customer approval is simulated in this local workspace.',400);o.approvedRevision=c.revision;transition(o,'approved',`Simulated customer approval of revision ${c.revision}`);
     }else if(action==='pay'){
      inStates(o.type==='portrait'?['approved']:['inquiry']);requireThat(c.simulated===true,'simulation_required','Use the explicitly simulated payment adapter.',400);
      o.paidCents=o.goodsCents+o.shippingCents;transition(o,'paid','Payment simulated; no money moved');commission(o);
     }else if(action==='reserve'){
      inStates(['paid']);requireThat(o.paidCents-o.refundGoodsCents-o.refundShippingCents>0,'refunded_order','A fully refunded order cannot reserve stock.');
      let lines;
      if(o.type==='kit')lines=[['kit42',o.quantity]];
      else{
       const project=o.revisions.find(r=>r.number===o.approvedRevision)?.project,profile=s.boms.portrait.profile;
       requireThat(project&&project.frame.diameterCm===profile.diameterCm&&project.frame.pins===profile.pins&&project.frame.numbering===profile.numbering&&project.layers.length===1&&['#151515','#183d35','#000000'].includes(project.layers[0].color.toLowerCase()),'profile_mismatch','This synthetic production profile supports only 42 cm, 200 clockwise pins and one black thread layer. Physical compatibility remains unverified.');
       const threadQty=Math.ceil(threadMeters(project)*1.15)+50;
       requireThat(threadQty<=600,'profile_capacity','This project exceeds the hypothetical profile material allowance.');
       const production=s.boms.portrait.production.map(([sku,n])=>[sku,sku==='thread'?threadQty:n]);
       o.bomSnapshot={version:s.boms.portrait.version,approvedRevision:o.approvedRevision,projectHash:createHash('sha256').update(JSON.stringify(project)).digest('hex'),profile:structuredClone(profile),production,packing:structuredClone(s.boms.portrait.packing),threadRule:'Ceiling of geometric span metres × 1.15 + 50 m; hypothetical waste/wrapping allowance'};
       lines=[...production,...o.bomSnapshot.packing];
      }
      for(const [sku,qty]of lines)move(tenant,sku,0,qty,'Order reservation',o.id);
      o.reservations=lines.map(([sku,qty])=>({sku,qty}));o.bomVersion=o.type==='kit'?'packed-kit-only':s.boms.portrait.version;transition(o,'reserved','Materials reserved atomically');
     }else if(action==='produce'||action==='rework'){
      requireThat(o.type==='portrait','invalid_type','Packed kits do not run through portrait production.');inStates(action==='produce'?['reserved']:['quality_failed']);
      requireThat(o.bomSnapshot?.approvedRevision===o.approvedRevision,'profile_mismatch','The material profile is not bound to this approved revision.');
      const m=entity(s.machines,c.machineId);owned(actor,m.tenant);requireThat(m.tenant===tenant&&m.status==='ready'&&(!m.job||m.job===o.id),'machine_unavailable','Choose a ready machine in this studio.');
      requireThat(m.profileId===o.bomSnapshot.version,'machine_profile','The station does not support this declared synthetic material profile.');
      if(action==='produce'){
       requireThat(!o.productionConsumed,'already_issued','Production materials were already issued.');
       for(const [sku,qty]of o.bomSnapshot.production)move(tenant,sku,-qty,-qty,'Production material issue',o.id);
       o.reservations=o.reservations.filter(l=>!o.bomSnapshot.production.some(([sku])=>sku===l.sku));o.productionConsumed=true;
      }else{
       text(c.note);for(const [sku,qty]of o.bomSnapshot.production)move(tenant,sku,-qty,0,'Replacement material issue for rework',o.id);
      }
      (o.materialIssues||=[]).push({at:now,type:action,reason:action==='rework'?c.note:'Initial production material issue',lines:structuredClone(o.bomSnapshot.production),revision:o.approvedRevision});
      // Reassignment and material issue share this transaction: failed validation/stock
      // leaves the previous station untouched; only this order's old assignments move.
      for(const previous of s.machines.filter(previous=>previous.job===o.id&&previous.id!==m.id)){previous.job=null;previous.version++;}
      m.job=o.id;m.version++;o.machineId=m.id;o.productionRevision=o.approvedRevision;transition(o,'producing','Production simulated; manufacturer control is off');
     }else if(action==='quality'){
      inStates(['producing']);requireThat(typeof c.pass==='boolean','invalid_quality','Record the inspection result.',400);o.qualityNote=text(c.note);
      transition(o,c.pass?'quality':'quality_failed',o.qualityNote);if(c.pass&&o.machineId){const m=entity(s.machines,o.machineId);m.job=null;m.version++;}
     }else if(action==='pack'){
      inStates(o.type==='kit'?['reserved']:['quality']);requireThat(!o.consumed,'already_consumed','The order stock was already consumed.');
      for(const l of o.reservations)move(tenant,l.sku,-l.qty,-l.qty,'Packed order consumption',o.id);
      o.reservations=[];o.consumed=true;transition(o,'packed','Packing recorded; reserved stock consumed once');
     }else if(action==='ship'){
      inStates(['packed']);requireThat(c.simulated===true,'simulation_required','Use the simulated shipping adapter.',400);o.tracking=`SIM-${o.id}`;transition(o,'shipped','Shipment simulated');
     }else if(action==='deliver'){
      inStates(['shipped']);o.deliveredAt=now;transition(o,'delivered','Delivery simulated');commission(o);
     }else if(action==='cancel'){
      inStates(['inquiry','needs_photo','suitable','preview','approved','paid','reserved','producing','quality_failed','quality']);release(o);
      if(o.productionConsumed)for(const [sku]of o.bomSnapshot.production)move(tenant,sku,0,0,'Cancellation: issued production materials written off; no stock restored',o.id);
      o.refundGoodsCents=o.paidCents?o.goodsCents:0;o.refundShippingCents=o.paidCents?o.shippingCents:0;transition(o,'cancelled',text(c.note||'Cancelled in local fixture'));commission(o);
     }else if(action==='refund'){
      requireThat(o.paidCents>0,'not_paid','There is no collected payment to refund.');
      integer(c.goodsCents,0,o.goodsCents);integer(c.shippingCents||0,0,o.shippingCents);
      requireThat(c.goodsCents>=o.refundGoodsCents&&(c.shippingCents||0)>=o.refundShippingCents,'refund_regression','Enter cumulative refunded totals; a refund cannot be undone.');
      o.refundGoodsCents=c.goodsCents;o.refundShippingCents=c.shippingCents||0;o.version++;o.history.push({state:o.state,at:now,note:`Cumulative simulated refund: ${o.refundGoodsCents+o.refundShippingCents} cents`});commission(o);
     }else if(action==='return'){
      inStates(['packed','shipped','delivered']);requireThat(!o.returned,'already_returned','The return was already recorded.');
      requireThat(typeof c.restock==='boolean','invalid_return','Record the return inspection decision.',400);
      if(c.restock){requireThat(o.type==='kit','invalid_restock','Consumed portrait materials cannot be restocked as new components.');move(tenant,'kit42',o.quantity,0,'Inspected kit return',o.id);}
      o.returned=true;transition(o,'returned',text(c.note));
     }else throw new Fault('unknown_command','Unknown order action.',400);
     result=o;
    }else if(c.type==='stock.assemble'){
     owned(actor,c.tenant);tenant=c.tenant;const qty=integer(c.qty,1,100);const assembly=id('assembly');
     for(const [sku,n]of s.boms.kit.lines)move(tenant,sku,-n*qty,0,'Kit BOM assembly',assembly);
     move(tenant,'kit42',qty,0,'Packed kit assembly output',assembly);const row={id:assembly,tenant,qty,bomVersion:s.boms.kit.version,at:now};s.assemblies.push(row);result=row;entityId=assembly;
    }else if(c.type==='stock.adjust'){
     owned(actor,c.tenant);tenant=c.tenant;integer(c.delta,-1000000,1000000);requireThat(c.delta!==0,'invalid_quantity','Enter a nonzero adjustment.',400);
     move(tenant,c.sku,c.delta,0,text(c.reason),tx);result={ok:true};entityId=c.sku;
    }else if(c.type==='transfer.create'){
     requireThat(actor.role==='operator','forbidden','Cross-studio transfers are coordinated by the operator.',403);entity(s.partners,c.from);entity(s.partners,c.to);requireThat(c.from!==c.to,'invalid_transfer','Select a different destination.',400);
     const t={id:id('TR'),from:c.from,to:c.to,sku:c.sku,qty:integer(c.qty),state:'reserved',version:1,at:now};move(t.from,t.sku,0,t.qty,'Transfer reservation',t.id);s.transfers.push(t);result=t;entityId=t.id;tenant=t.from;
    }else if(c.type.startsWith('transfer.')){
     const t=entity(s.transfers,c.id);version(t,c);tenant=t.to;
     if(c.type==='transfer.dispatch'){owned(actor,t.from);requireThat(t.state==='reserved','invalid_state','Dispatch a reserved transfer.');move(t.from,t.sku,-t.qty,-t.qty,'Transfer dispatched',t.id);t.state='in_transit';}
     else if(c.type==='transfer.receive'){owned(actor,t.to);requireThat(t.state==='in_transit','invalid_state','Receive an in-transit transfer.');move(t.to,t.sku,t.qty,0,'Transfer received',t.id);t.state='received';}
     else if(c.type==='transfer.cancel'){owned(actor,t.from);requireThat(t.state==='reserved','invalid_state','Only an undispatched transfer may be cancelled.');move(t.from,t.sku,0,-t.qty,'Transfer cancelled',t.id);t.state='cancelled';}
     else throw new Fault('unknown_command','Unknown transfer action.',400);
     t.version++;result=t;
    }else if(c.type==='purchase.create'){
     requireThat(actor.role==='operator','forbidden','Only the operator creates supplier orders.',403);entity(s.partners,c.tenant);entity(s.skus,c.sku);
     const p={id:id('PO'),supplier:'supplier-demo',tenant:c.tenant,state:'proposed',version:1,eta:calendarDate(c.eta),lines:[{sku:c.sku,qty:integer(c.qty),unitCents:integer(c.unitCents,1,100000)}],note:'Synthetic purchase · live ordering off'};
     s.purchases.push(p);result=p;entityId=p.id;tenant=p.tenant;
    }else if(c.type.startsWith('purchase.')){
     const p=entity(s.purchases,c.id);version(p,c);tenant=p.tenant;
     if(c.type==='purchase.receive'){
      requireThat(actor.role==='operator','forbidden','Only the operator reconciles a supplier receipt.',403);requireThat(p.state==='in_transit','invalid_state','Receive an in-transit purchase.');
      for(const l of p.lines)move(tenant,l.sku,l.qty,0,'Supplier purchase received',p.id);p.state='received';
     }else{
      requireThat(actor.role==='operator'||(actor.role==='supplier'&&actor.tenant===p.supplier),'forbidden','This purchase is assigned to another supplier.',403);
      if(c.type==='purchase.acknowledge'){requireThat(p.state==='proposed','invalid_state','Acknowledge a proposed purchase.');p.eta=calendarDate(c.eta);p.state='acknowledged';}
      else if(c.type==='purchase.dispatch'){requireThat(p.state==='acknowledged','invalid_state','Dispatch an acknowledged purchase.');p.tracking=`SIM-${p.id}`;p.state='in_transit';}
      else throw new Fault('unknown_command','Unknown purchase action.',400);
     }
     p.version++;result=actor.role==='supplier'?{id:p.id,state:p.state,version:p.version,eta:p.eta,lines:p.lines,tracking:p.tracking}:p;
    }else if(c.type==='machine.service'){
     const m=entity(s.machines,c.id);owned(actor,m.tenant);tenant=m.tenant;version(m,c);requireThat(!m.job,'machine_busy','Finish or cancel the assigned job before service.');requireThat(['ready','service'].includes(c.status),'invalid_status','Choose ready or service.',400);
     m.status=c.status;m.version++;m.service.push({at:now,note:text(c.note),actor:actor.id});result=m;
    }else if(c.type==='commission.payout'){
     requireThat(actor.role==='operator','forbidden','Only the operator reconciles commissions.',403);const row=s.commissions.find(l=>l.orderId===c.id);requireThat(row,'not_found','No commission exists for this order.',404);
     requireThat(row.amountCents>0&&row.releaseAt&&Date.parse(row.releaseAt)<=Date.now(),'review_period','The delivery review period has not ended.');requireThat(!row.payout,'already_paid','Payout is already simulated.');row.payout={at:now,amountCents:row.amountCents,simulated:true};row.status='paid_simulated';result=row;tenant=row.tenant;
    }else throw new Fault('unknown_command','Unknown action.',400);
    s.audit.push({id:id('audit'),at:now,actor:actor.id,role:actor.role,tenant,type:c.type,entity:entityId,transaction:tx});
    this.db.prepare('UPDATE state SET value=? WHERE id=1').run(JSON.stringify(s));
   }
   const response=JSON.parse(JSON.stringify({ok:true,result,transaction:tx}));this.db.prepare('INSERT INTO receipts(actor,key,hash,response) VALUES(?,?,?,?)').run(principal,c.key,hash,JSON.stringify(response));
   this.db.exec('COMMIT');return response;
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
}
