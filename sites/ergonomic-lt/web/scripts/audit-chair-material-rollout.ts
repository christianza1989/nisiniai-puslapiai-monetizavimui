import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chairFinishRoles} from '../src/lib/chair-material-groups';

// Inventory the immutable admission bindings once. This is not another GLB,
// Native, transport, PDF or visual acceptance run. Those proofs remain valid
// when their source bindings and the code that consumes them have not changed.
const read=(file:string)=>JSON.parse(fs.readFileSync(file,'utf8'));
const seed=read('content/seed.json');
const chairProducts=new Set<string>(seed.products.filter((p:any)=>p.categorySlug==='kedes').map((p:any)=>p.id));
const structure=Object.values(read('content/chair-structure-candidates.json').models).filter((e:any)=>chairProducts.has(e.productId)) as any[];
const pc2=read('content/pc2-chair-review-candidates.json').entries as any[];
const coverage=read('content/chair-material-group-coverage.json');
const mapArg=process.argv.find(a=>a.startsWith('--asset-map='));
assert(mapArg,'Use --asset-map=PATH [--write] to inventory the exact published review list');
const assets=read(mapArg.slice('--asset-map='.length));
const list=assets['/3d-visi.html'];
assert(list,'The published asset map must contain /3d-visi.html');
const bytes=fs.readFileSync(list.file);
assert.equal(bytes.length,list.size);
assert.equal(createHash('sha256').update(bytes).digest('hex'),list.sha256);
const rows=[...bytes.toString('utf8').matchAll(/<tr\b[^>]*><td>(K[A-Z0-9]+)<\/td><td><a\s+href="([^"]+)"/g)]
 .map((m:any)=>({code:m[1],url:m[2]}));
assert.equal(new Set(rows.map(r=>r.code)).size,rows.length,'Duplicate code in published list');
const models=[...structure.map(entry=>{
 assert.equal(entry.collectionMode,'structure-only');
 return {code:entry.code,mode:'ORIGINAL_FINISH_ONLY',bindingSha256:entry.runtime.sha256};
}),...pc2.map(entry=>{
 const prior=coverage.pc2.find((c:any)=>c.code===entry.code);
 assert(prior&&prior.reviewSha256===entry.sha256&&prior.version===entry.version,'Changed PC2 binding requires a new scoped proof: '+entry.code);
 return {code:entry.code,mode:prior.status,bindingSha256:entry.sha256};
})].map(model=>{
 const matches=rows.filter(row=>row.code===model.code);assert.equal(matches.length,1,'Missing published chair: '+model.code);
 const url=matches[0].url;
 assert(url.startsWith('/produktai/kedes/')||url.startsWith('/3d-perziura-pc2/'),'Unexpected chair route: '+url);
 return {...model,url};
}).sort((a,b)=>a.code.localeCompare(b.code));
assert.equal(models.length,251,'A changed batch must be explicitly inventoried');
assert.equal(new Set(models.map(m=>m.code)).size,251,'Chair admissions must not overlap');
const publishedChairs=rows.filter(row=>row.url.startsWith('/produktai/kedes/')||row.url.startsWith('/3d-perziura-pc2/'));
assert.deepEqual(publishedChairs.map(r=>r.code).sort(),models.map(m=>m.code).sort(),'Every published chair must be accounted for');

// Also cover the older configurable families (including saved configurations).
// Catch a supplier upholstery/mesh controller that the shared UI would miss.
const baseline=['configurator-expanded.json','configurator-catalog.json'].flatMap(file=>read('content/'+file).families)
 .filter((f:any)=>chairProducts.has(f.productId)).map((f:any)=>{
 const fields=[...new Set<string>(f.anchors.flatMap((a:any)=>Object.keys(a.defaults).filter(k=>/UPH|MESH/.test(k)&&/COLOR$|CHCOL$/.test(k))))].sort();
 for(const field of fields)assert(chairFinishRoles[field],'Missing own-source material role: '+f.baseArticle+' / '+field);
 return {family:f.id,code:f.baseArticle,anchors:f.anchors.length,fields};
});
const counts=Object.fromEntries([...new Set(models.map(m=>m.mode))].sort().map(mode=>[mode,models.filter(m=>m.mode===mode).length]));
const report={schemaVersion:1,publishedListSha256:list.sha256,sourceCoverage:'chair-material-group-coverage.json',
 scope:'Shared controls for all admitted materials; immutable full states remain whole; original-only models retain their original finish',
 geometryRechecked:false,NativeAllowed:false,newVariantsCreated:0,productionApproved:false,counts,baseline,models};
const output='content/chair-material-rollout.json';
if(process.argv.includes('--write'))fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
else assert.deepEqual(read(output),report,'Chair material rollout inventory is stale');
console.log(JSON.stringify({result:'PASS',chairs:models.length,baselineFamilies:baseline.length,baselineAnchors:baseline.reduce((n:number,f:any)=>n+f.anchors,0),counts,geometryRechecked:false,output}));
