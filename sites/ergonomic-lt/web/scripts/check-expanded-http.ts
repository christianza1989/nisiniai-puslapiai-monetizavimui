import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {families,initialState,validateState,stateToken,parseStateToken,expandedSelection} from '../src/lib/expanded-configurator';
import {catalog} from '../src/lib/catalog';
async function main(){
const origin=process.env.CHECK_ORIGIN||'http://127.0.0.1:3002';
assert(['http://127.0.0.1:3002','http://localhost:3002'].includes(origin),'Use the isolated local QA server');
const dir='.impeccable/review/configurator-expanded',ui=JSON.parse(fs.readFileSync(dir+'/browser-check.json','utf8'));
const report:any={checkedAt:new Date().toISOString(),origin,anchors:[],assets:[],pdfs:[]};
const products=catalog().products,assets=new Map();
for(const f of families){const p=products.find(p=>p.id===f.productId)!;
 for(const a of f.anchors){const state=validateState(p,{family:f.id,anchor:a.id,values:Object.fromEntries(Object.keys(a.choices).map(k=>[k,a.defaults[k]]))}),url=origin+'/api/produkto-kortele/?produktas='+p.id+'&konfig='+encodeURIComponent(stateToken(state));
  const r=await fetch(url);assert.equal(r.status,200);assert.equal(r.headers.get('Content-Type'),'application/pdf');assert(Buffer.from(await r.arrayBuffer()).subarray(0,5).equals(Buffer.from('%PDF-')));report.anchors.push({model:f.id,anchor:a.id,pdf:200});
  assets.set(a.geometry.asset,a.geometry);for(const patch of [...Object.values(a.patches),...Object.values(a.conditionalPatches)])if(patch.geometry)assets.set(patch.geometry.asset,patch.geometry);
 }
 const link=ui.pdfLinks[f.id],r=await fetch(origin+link),buffer=Buffer.from(await r.arrayBuffer());assert.equal(r.status,200);
 const token=new URL(origin+link).searchParams.get('konfig')!,state=parseStateToken(p,token),selected=expandedSelection(p,state);
 const file='output/pdf/'+f.id+'-individuali-kortele.pdf';fs.mkdirSync('output/pdf',{recursive:true});fs.writeFileSync(file,buffer);
 report.pdfs.push({model:f.id,file,state,codes:selected.configuration.supplierOptions,sha256:createHash('sha256').update(buffer).digest('hex')});
 const invalid=await fetch(origin+'/api/produkto-kortele/?produktas='+p.id+'&konfig=bad');assert.equal(invalid.status,400);
 const other=initialState(families.find(x=>x.id!==f.id)!);assert.equal((await fetch(origin+'/api/produkto-kortele/?produktas='+p.id+'&konfig='+encodeURIComponent(stateToken(other)))).status,400);
}
for(const asset of assets.values()){const r=await fetch(origin+asset.asset);assert.equal(r.status,200);const b=Buffer.from(await r.arrayBuffer());assert.equal(createHash('sha256').update(b).digest('hex'),asset.assetSha256);report.assets.push({url:asset.asset,status:200,sha256:asset.assetSha256});}
const db=new DatabaseSync(path.resolve('.runtime-expanded-qa/ergonomic.sqlite'),{readOnly:true});
const rows=db.prepare('SELECT id,payload,delivery_status FROM quotes ORDER BY created_at DESC').all() as {id:string;payload:string;delivery_status:string}[];
const row=rows.find(r=>JSON.parse(r.payload).name==='[PATIKRA] išplėstas 3D');assert(row,'Browser inquiry must be stored in QA SQLite');const saved=JSON.parse(row.payload);assert.equal(saved.items.length,3);
for(const item of saved.items){const p=products.find(p=>p.id===item.productId)!,selected=expandedSelection(p,item.configurationState);assert.deepEqual(item.supplierOptions,selected.configuration.supplierOptions);assert.equal(item.configurationEvidence.schemaVersion,2);assert.equal(item.configurationEvidence.base.assetSha256,selected.assets.base.assetSha256);}
assert.equal(row.delivery_status,'awaiting_configuration');assert.equal(new Set(saved.items.map((i:any)=>stateToken(i.configurationState))).size,3);
report.inquiry={id:row.id,items:saved.items.length,quantities:saved.items.map((i:any)=>i.quantity),exactOptions:true,modelHashes:true,status:row.delivery_status,smtpSent:false};db.close();
const real=new DatabaseSync(path.resolve('.runtime/ergonomic.sqlite'),{readOnly:true});report.realRuntime={integrity:real.prepare('PRAGMA integrity_check').get(),testQuotes:real.prepare("SELECT COUNT(*) AS n FROM quotes WHERE json_extract(payload,'$.name') LIKE '[PATIKRA]%'").get()};assert.equal((report.realRuntime.testQuotes as any).n,0);real.close();
fs.writeFileSync(dir+'/http-check.json',JSON.stringify(report,null,2));console.log(JSON.stringify({anchors:report.anchors.length,assets:assets.size,pdfs:report.pdfs.length,inquiry:report.inquiry,realRuntime:report.realRuntime},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
