// Synthetic local diagnostic only. Does not accept databases, endpoints or credentials.
import {readFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {openStore} from '../backend/store.mjs';
import {createSqlMediaBucket} from '../cloudflare/media-bucket.mjs';
import {optimizeRaster} from '../../../content-studio/src/image-pipeline.mjs';
const store=openStore({filename:':memory:',secret:'isolated-media-measure-'.repeat(3)}),bucket=createSqlMediaBucket(store);
const sample=async fn=>{const times=[];for(let n=0;n<8;n++){const start=performance.now();await fn();times.push(performance.now()-start);}times.sort((a,b)=>a-b);return {medianMs:+times[4].toFixed(2),maxMs:+times[7].toFixed(2)};};
try{
 const original=await readFile(new URL('../prototype/public/images/nails-neutral-1536.webp',import.meta.url)),start=performance.now(),output=await optimizeRaster(original,'image/webp'),transformMs=performance.now()-start,objects=[];
 for(let n=1;n<=24;n++){
  const id='asset_'+String(n).padStart(8,'0')+'-0000-0000-0000-000000000000',entries=[{key:'originals/'+id,value:original},...output.variants.map(v=>({key:'variants/'+id+'-'+v.width+'.webp',value:v.bytes}))];await bucket.putMany(entries);objects.push(entries[1].key);
 }
 const d=store.read();d.bookings=Array.from({length:4000},(_,n)=>({id:'fixture-measure-'+n,organizationId:'fixture-org-'+n%20,status:'completed',startAt:'2026-10-01T07:00:00Z',endAt:'2026-10-01T08:00:00Z',serviceSnapshot:{label:'Synthetic stored visit',description:'x'.repeat(500),priceMinor:3000}}));store.write(d);
 const models=[10,20,1000].map(organizations=>{
  const images=organizations*12,mediaBytes=images*2500000,bookings=organizations*1000,monthWrites=images*6,monthReads=organizations*1000*6,initialTransforms=images*5,gb=mediaBytes/1e9;
  return {organizations,images,bookings,bookingPayloadBytes:bookings*900,mediaBytes,withinPilotMediaCap:mediaBytes<=bucket.stats().capacityBytes,monthWrites,monthReads,initialTransforms,conditionalR2StandardUsd:+(Math.ceil(Math.max(0,gb-10))*.015+Math.ceil(Math.max(0,monthWrites-1e6)/1e6)*4.5+Math.ceil(Math.max(0,monthReads-1e7)/1e6)*.36).toFixed(2),conditionalImagesPaidTransformUsd:+(Math.max(0,initialTransforms-5000)/1000*.5).toFixed(2)};
 });
 console.log(JSON.stringify({at:new Date().toISOString(),environment:'isolated-node-memory-sqlite',actualFixture:{image:'project-original-illustration-not-provider-work',originalBytes:original.length,variants:output.variants.map(v=>({width:v.width,bytes:v.bytes.length})),transformMs:+transformMs.toFixed(2),media:bucket.stats(),state:store.rowStats(),databasePageBytes:store.db.prepare('PRAGMA page_count').get().page_count*store.db.prepare('PRAGMA page_size').get().page_size,readDerivative:await sample(()=>bucket.get(objects[0])),readCatalogue:await sample(()=>store.readCollections(['organizations','services','locations','media'])),readWholeState:await sample(()=>store.read())},assumptions:{photosPerOrganization:12,originalBytes:2000000,totalFiveDerivativeBytes:500000,bookingsPerOrganizationRetained:1000,bookingPayloadBytes:900,profileViewsPerOrganizationMonth:1000,imagesPerView:6,allImagesWrittenAndTransformedInFirstMonth:true,pricesVerified:'2026-10-07',freeTiersAssumedOtherwiseUnused:true},models,limitations:'Illustrative USD tariff scenario, not an account quote. Excludes Workers compute/base plan, mail, taxes, other account usage, SQL indexes/checkpoints and long-term backups. Existing SQL pilot selected; R2/Images paid activation or migration not performed. Local timing is not hosted latency.'},null,2));
}finally{store.close();}
