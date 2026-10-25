import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const out='D:/Core/output/ergonomic-catalog-dedupe-20261016',origin='https://ergonomic-preview.pinet-azprekyba.workers.dev';
const index=JSON.parse(fs.readFileSync('content/configurator-additional-index.json','utf8')),receipts=[];
const articles=Object.entries(index.articles);let next=0;
await Promise.all(Array.from({length:4},async()=>{while(next<articles.length){const [code,entry]=articles[next++],r=await fetch(origin+entry.asset,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,code);const b=Buffer.from(await r.arrayBuffer());assert.equal(createHash('sha256').update(b).digest('hex'),entry.sha256,code);receipts.push({code,sha256:entry.sha256,bytes:b.length,status:r.status});}}));
const old=JSON.parse(fs.readFileSync(out+'/ORIGINAL-PRESETS.json','utf8')),selected=JSON.parse(fs.readFileSync(out+'/HISTORICAL-ORDERS-PDF-PARITY.json','utf8')).pdfs,pdfs=[];
for(const check of selected){const p=old.find(p=>p.id===check.id);assert(p?.runtimeBeforeMerge?.token);const uri='/api/produkto-kortele/?produktas='+encodeURIComponent(p.productId)+'&konfig='+encodeURIComponent(p.runtimeBeforeMerge.token)+(p.id==='23636152'?'&modelis='+p.id:'');const r=await fetch(origin+uri,{signal:AbortSignal.timeout(60000)}),b=Buffer.from(await r.arrayBuffer());assert.equal(r.status,200,p.id);assert.equal(b.toString('ascii',0,5),'%PDF-');pdfs.push({id:p.id,status:r.status,bytes:b.length});}
fs.writeFileSync(out+'/PUBLIC-RUNTIME-PDF-PROOF.json',JSON.stringify({at:new Date().toISOString(),result:'PASS',immutableRuntimeArticles:receipts.length,receipts,pdfs},null,2));console.log(JSON.stringify({result:'PASS',articles:receipts.length,pdfs:pdfs.length}));
