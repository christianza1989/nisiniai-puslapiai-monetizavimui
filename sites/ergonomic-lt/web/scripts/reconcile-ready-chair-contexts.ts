/** Narrow reconciliation of the three diagnosed mixed-axis review tables.
 * Completed metadata entries are reused; no completed source/body audit runs. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {validateChairComponents,validateChairReviewComponents} from '../src/lib/chair-components';
import {catalogModelVisible} from '../src/lib/catalog-consolidation';
const q=process.argv[2];assert(q);const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const source=JSON.parse(await fs.readFile(path.join(q,'SOURCE-INVENTORY.json'),'utf8')),seed=JSON.parse(await fs.readFile('content/seed.json','utf8'));
const accepted=[...source.accepted],codes=['KVAP008WW001','KWI2006WW001','KWI2011WW001'];
for(const code of codes){
 assert(source.rejected.some((r:any)=>r.kind==='chair'&&r.code===code&&r.reason==='Invalid prepared chair component table'));
 const root=path.join(source.source,'paruosti-kedes',code),headers:Record<string,string>={},values:Record<string,any>={};
 for(const file of ['runtime.json','colors.json','selectors.json','SHA256SUMS.json']){const b=await fs.readFile(path.join(root,file));assert(b.length<=15_000_000);headers[file]=sha(b);values[file]=JSON.parse(b.toString());}
 const runtime=values['runtime.json'],palette=values['colors.json'],selectors=values['selectors.json'],manifest=values['SHA256SUMS.json'];
 assert.throws(()=>validateChairComponents(runtime,code));validateChairReviewComponents(runtime,code);
 assert(palette.schema==='chair-colors-observed-partial-344-v1'&&palette.runtimeSha256===headers['runtime.json']&&palette.code===code&&palette.actualPaletteComplete===false&&selectors.schema==='canonical-world-primitive-selectors-329-v1'&&manifest.code===code);
 const files=Object.entries(manifest.files).map(([file,item]:[string,any])=>{assert(!file.includes('\\')&&!path.isAbsolute(file)&&file.split('/').every(p=>p&&p!=='.'&&p!=='..')&&/^[a-f0-9]{64}$/.test(item.sha256)&&Number.isSafeInteger(item.bytes)&&item.bytes>0);assert(!file.endsWith('.glb')||item.bytes<=25*1024*1024);return {file,...item};});
 for(const file of ['runtime.json','colors.json','selectors.json'])assert(manifest.files[file]?.sha256===headers[file]);
 const products=seed.products.flatMap((p:any)=>p.configurations.filter((c:any)=>c.code===code&&catalogModelVisible(p.id,c)).map((c:any)=>({productId:p.id,sample:c.id,name:p.name,slug:p.slug})));assert(products.length===1);
 accepted.push({kind:'chair',code,root,...products[0],runtimeSha256:headers['runtime.json'],runtimeBytes:manifest.files['runtime.json'].bytes,runtime,contexts:runtime.contexts.length,headers,manifestSha256:headers['SHA256SUMS.json'],palette,selectors,files,declaredBytes:files.reduce((n:any,r:any)=>n+r.bytes,0),wholeContextReviewOnly:true,catalogGuardStillRejects:true});
}
const assignmentFile=path.join(source.source,'kedes-pc2/EILE.json'),assignmentRaw=await fs.readFile(assignmentFile),assignment=JSON.parse(assignmentRaw.toString()),assigned=new Set(assignment.queue.map((r:any)=>r.code));assert(assignment.mainNativeStartAllowed===false&&assignment.totalAssigned===56);for(const row of accepted.filter((r:any)=>r.kind==='chair'))assert(assigned.has(row.code),'Outside own PC2 assignment');
const result={...source,at:new Date().toISOString(),result:'METADATA_CANDIDATES_WITH_THREE_WHOLE_CONTEXT_RECONCILIATIONS_NOT_PACKAGE_PASS',accepted,rejected:source.rejected.filter((r:any)=>!codes.includes(r.code)),reconciledCodes:codes,originalMetadataReplayed:false,pc2AssignmentSha256:sha(assignmentRaw),declaredBytes:accepted.reduce((n,r)=>n+r.declaredBytes,0)};
await fs.writeFile(path.join(q,'SOURCE-INVENTORY-V2.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:result.result,chairs:accepted.filter(r=>r.kind==='chair').length,desks:accepted.filter(r=>r.kind==='desk').length,rejected:result.rejected.length,NativeAllowed:false}));
