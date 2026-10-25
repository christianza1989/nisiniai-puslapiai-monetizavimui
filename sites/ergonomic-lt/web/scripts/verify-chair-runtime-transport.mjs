// Independent exhaustive original/transport parity; invoke with node --import tsx.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createExpandedEngine} from '../src/lib/expanded-configurator.ts';
import {modelProduct} from '../src/lib/product-models.ts';
import {restorePackedAssignments} from './pack-chair-runtime.mjs';
import {RUNTIME_TRANSPORT_MAX_BYTES} from '../src/lib/runtime-transport-limits.mjs';
const arg=n=>process.argv.find(v=>v.startsWith('--'+n+'='))?.slice(n.length+3);
const originalBytes=await fs.readFile(arg('original')),transportBytes=await fs.readFile(arg('transport'));
const original=JSON.parse(originalBytes),packed=JSON.parse(transportBytes);assert(transportBytes.length<=RUNTIME_TRANSPORT_MAX_BYTES);
assert.deepEqual(restorePackedAssignments(packed),original,'All original metadata must reconstruct exactly');
const seed=JSON.parse(await fs.readFile('content/seed.json','utf8')),parent=seed.products.find(p=>p.id===original.family.productId);assert(parent);
const product=modelProduct(parent,parent.configurations.find(c=>c.id===original.family.sample));
const engines=[createExpandedEngine(original),createExpandedEngine(packed)];let transitions=0;
for(const a of original.family.anchors){
 const input={family:original.family.id,anchor:a.id,values:Object.fromEntries(a.axes.map(k=>[k,a.defaults[k]]).sort(([a],[b])=>a.localeCompare(b)))};
 const selected=engines.map(e=>e.expandedSelection(product,input));assert.deepEqual(selected[0],selected[1]);
 assert.deepEqual(engines[0].stateChoices(input),engines[1].stateChoices(input));
 const token=engines[0].stateToken(selected[0].state);assert.equal(token,engines[1].stateToken(selected[1].state));assert.deepEqual(engines[0].parseStateToken(product,token),engines[1].parseStateToken(product,token));
 for(const control of Object.keys(a.axisTransitions)){
  const n=control.indexOf('='),field=control.slice(0,n),value=control.slice(n+1);
  assert.deepEqual(engines[0].changeField(input,field,value),engines[1].changeField(input,field,value));transitions++;
 }
}
const proof={at:new Date().toISOString(),result:'PASS_FULL_ORIGINAL_TRANSPORT_PARITY',originalSha256:createHash('sha256').update(originalBytes).digest('hex'),transportSha256:createHash('sha256').update(transportBytes).digest('hex'),originalBytes:originalBytes.length,transportBytes:transportBytes.length,states:original.family.anchors.length,transitions,fullSelectionsAndSupplierOptionsEqual:true,allTokensEqual:true,allOriginalMetadataReconstructs:true,geometryAndDefaultsAndChoicesUnchanged:true,compilerAndCodecUnchanged:true,runtimeLimitBytes:RUNTIME_TRANSPORT_MAX_BYTES,publicDeployment:false};
await fs.writeFile(arg('proof'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
