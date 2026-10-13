import { readFileSync } from 'node:fs';
import { validateProject } from '../mobile/model.mjs';
const preparedSample = validateProject(JSON.parse(readFileSync(new URL('../mobile/design/kit/samples/quick.json',import.meta.url),'utf8')));

export const SKU = [
  {id:'kit42',name:'Packed DIY kit · 42 cm',unit:'kits',reorder:30},
  {id:'board42',name:'42 cm artwork board',unit:'boards',reorder:25},
  {id:'nails',name:'Special pins',unit:'pins',reorder:5000},
  {id:'thread',name:'Black PE thread',unit:'m',reorder:10000},
  {id:'cover42',name:'42 cm protective cover',unit:'covers',reorder:25},
  {id:'box42',name:'42 cm shipping box',unit:'boxes',reorder:25},
  {id:'insert',name:'Instruction insert',unit:'inserts',reorder:25}
];
export const BOMS = {
  kit:{version:'kit42-demo-v1',lines:[['board42',1],['nails',200],['thread',600],['cover42',1],['box42',1],['insert',1]]},
  portrait:{version:'portrait42-mono200-demo-v1',profile:{diameterCm:42,pins:200,numbering:'clockwise-top-1',layers:1,hypothetical:true},production:[['board42',1],['nails',200],['thread',450]],packing:[['cover42',1],['box42',1]],lines:[['board42',1],['nails',200],['thread',450],['cover42',1],['box42',1]]}
};
const markets = [
 ['lt','Lithuania','Vilnius',2,80,'Neris Memory Studio','Portrait and family gifts'],
 ['de','Germany','Berlin',3,120,'Linden Thread Atelier','Photography and design'],
 ['nl','Netherlands','Amsterdam',2,95,'Canal Light Workshop','Pet portraits and home decor'],
 ['fr','France','Lyon',1,70,'Atelier des Souvenirs','Wedding and anniversary gifts'],
 ['pl','Poland','Warsaw',2,150,'Vistula Makers Studio','DIY workshops and gift retail'],
 ['es','Spain','Valencia',1,60,'Orange Grove Portraits','Family and travel memories'],
 ['it','Italy','Milan',1,85,'Filo Forma Studio','Interior and design gifts'],
 ['se','Sweden','Stockholm',2,55,'Birch & Thread Collective','Minimal portraits and craft'],
 ['dk','Denmark','Copenhagen',1,65,'Harbour Memory Workshop','Community craft workshops'],
 ['fi','Finland','Helsinki',1,45,'Northern Light Thread Studio','Nature, pets and seasonal gifts']
];
export const identities = [
 {id:'operator',role:'operator',name:'Network operator',tenant:null},
 ...markets.map(([id,country,city])=>({id:`partner-${id}`,role:'partner',name:`${city} studio`,tenant:id})),
 {id:'supplier',role:'supplier',name:'Equipment & materials supplier',tenant:'supplier-demo'},
 {id:'supplier-other',role:'supplier',name:'Unassigned supplier (empty-state test)',tenant:'supplier-other'}
];
export function sampleProject(revision=1){
 return {...structuredClone(preparedSample),id:`demo-portrait-r${revision}`,title:'Synthetic pet portrait · hand-threading project',createdAt:'2026-10-14T08:00:00Z',step:0};
}
export function makeSeed(){
 const partners=markets.map(([id,country,city,count,kits,name,profile],i)=>({id,country,city,name,profile,email:`studio@${id}.memorystring.example`,address:`${10+i} Fictional Workshop Lane, ${city} · synthetic address`,machines:count,openingKits:kits}));
 const machines=partners.flatMap(p=>Array.from({length:p.machines},(_,i)=>({id:`machine-${p.id}-${i+1}`,tenant:p.id,name:`Thread station ${i+1}`,serial:`DEMO-${p.id.toUpperCase()}-${String(i+1).padStart(3,'0')}`,location:`${p.city} · Bay ${i+1}`,status:p.id==='se'&&i===1?'service':'ready',profileId:BOMS.portrait.version,version:1,job:null,capacity:5,warrantyUntil:'2027-10-14',service:[{at:'2026-10-14T08:00:00Z',note:p.id==='se'&&i===1?'Fixture: thread guide inspection required':'Fixture: initial inspection recorded',actor:'operator'}]})));
 const stock=partners.flatMap(p=>SKU.map(s=>({tenant:p.id,sku:s.id,onHand:s.id==='kit42'?p.openingKits:s.id==='thread'?30000:s.id==='nails'?15000:60,reserved:0})));
 const orders=partners.flatMap((p,i)=>Array.from({length:2+(i%3)},(_,j)=>({id:`MS-${p.id.toUpperCase()}-${100+j}`,tenant:p.id,type:j%2?'kit':'portrait',customer:`Synthetic buyer ${i+1}.${j+1}`,email:`buyer${j+1}@${p.id}.customers.example`,title:j%2?'42 cm DIY gift kit':'42 cm monochrome portrait',quantity:1,state:'delivered',version:1,goodsCents:j%2?9999:13700,shippingCents:j%2?900:1200,paidCents:j%2?10899:14900,refundGoodsCents:0,refundShippingCents:0,referral:j===0?'creator-lena':null,revisions:j%2?[]:[{number:1,project:sampleProject(),note:'Synthetic historical preview',at:'2026-10-01T09:00:00Z'}],approvedRevision:j%2?null:1,reservations:[],consumed:true,returned:false,at:`2026-10-${String(1+j).padStart(2,'0')}T09:00:00Z`,deliveredAt:'2026-10-05T10:00:00Z',history:[{state:'delivered',at:'2026-10-05T10:00:00Z',note:'Synthetic opening history; opening stock recorded separately'}]})));
const commissions=orders.filter(o=>o.referral).map(o=>({orderId:o.id,tenant:o.tenant,referral:o.referral,basisCents:o.goodsCents,amountCents:Math.round(o.goodsCents/1.21*.1),status:'held',releaseAt:o.tenant==='lt'?'2026-10-05T10:00:00.000Z':'2026-11-04T10:00:00.000Z',adjustments:[],payout:null}));
 // One dated historical record demonstrates an elapsed review period without moving the live clock.
 orders.find(o=>o.id==='MS-LT-100').deliveredAt='2026-09-05T10:00:00Z';
 orders.find(o=>o.id==='MS-LT-100').at='2026-09-01T09:00:00Z';
 orders.find(o=>o.id==='MS-LT-100').revisions[0].at='2026-09-01T09:00:00Z';
 orders.find(o=>o.id==='MS-LT-100').history=[{state:'delivered',at:'2026-09-05T10:00:00Z',note:'Synthetic eligible historical order; opening stock remains independent'}];
 const movements=stock.map((s,i)=>({id:`opening-${i}`,transaction:'opening-fixture',tenant:s.tenant,sku:s.sku,onHand:s.onHand,reserved:0,reason:'Synthetic opening balance',link:'eu-ten-v1',actor:'operator',at:'2026-10-14T08:00:00Z'}));
 return {schema:1,fixture:'eu-ten-v1',generation:1,partners,machines,skus:SKU,boms:BOMS,stock,orders,commissions,movements,assemblies:[],transfers:[],
  referrals:[{id:'creator-lena',name:'Lena · home & gifts',code:'LENA10',email:'lena@creators.example',rate:0.1},{id:'creator-milo',name:'Milo · pets & craft',code:'MILO10',email:'milo@creators.example',rate:0.1}],
  purchases:[{id:'PO-1001',supplier:'supplier-demo',tenant:'lt',state:'proposed',version:1,eta:'2026-10-28',lines:[{sku:'thread',qty:12000,unitCents:1},{sku:'board42',qty:24,unitCents:700}],note:'Synthetic replenishment · no supplier commitment'}],
  audit:[{id:'seed-1',at:'2026-10-14T08:00:00Z',actor:'operator',role:'operator',tenant:null,type:'seed',entity:'eu-ten-v1',note:'Ten synthetic EU studios; opening stock and historical sales are independent fixtures'}],
  assumptions:{vat:0.21,commissionRate:0.1,reviewDays:30,subscriptionCents:9900,platformMonths:1},
  adapters:{payment:'simulated',payout:'simulated',shipping:'simulated',email:'off',telemetry:'simulated',machine:'off',activation:'off'}};
}
