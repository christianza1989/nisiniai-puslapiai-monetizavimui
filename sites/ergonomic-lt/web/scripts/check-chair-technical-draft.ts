import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {baseSeed} from '../src/lib/catalog';
import {productModels} from '../src/lib/product-models';
import {chairCandidates,createChairCandidateLoader} from '../src/lib/chair-structure-candidates';
import {bindSourceModels,blockers} from '../src/lib/publication-workflow';
import {createExpandedEngine} from '../src/lib/expanded-configurator';
const stage=process.argv.find(v=>v.startsWith('--stage='))?.slice(8);assert(stage);
const models=new Map(productModels(baseSeed().products).map(p=>[p.id+':'+p.modelConfigurationId,p]));
const sources=new Map(bindSourceModels(baseSeed().products).map(m=>[m.key,m]));
const loader=createChairCandidateLoader(chairCandidates,async asset=>fs.readFile(path.join(stage,'assets',asset)));
const proofs=[];
for(const entry of Object.values(chairCandidates.models)){
 const product=models.get(entry.key);assert(product);const runtime=await loader(product);assert(runtime);
 const engine=createExpandedEngine(runtime),state=engine.initialStateForProduct(product);
 assert.deepEqual(engine.parseStateToken(product,engine.stateToken(state)),state);
 const source=sources.get(entry.key);assert(source?.withoutColors&&source.geometryAccepted);
 assert(source.technicalDraft&&!source.geminiReady&&blockers(source).some(b=>b.includes('Techninis draft')));
 proofs.push({key:entry.key,runtimeSha256:entry.runtime.sha256,states:runtime.family.anchors.length,modelBound:true,tokenRoundTrip:true,ownerApprovalBlocked:true});
}
assert(proofs.length>0);
const prior=process.env.LAUNCH_SITE;try{process.env.LAUNCH_SITE='true';for(const entry of Object.values(chairCandidates.models))assert.equal(await loader(models.get(entry.key)!),undefined);}finally{if(prior===undefined)delete process.env.LAUNCH_SITE;else process.env.LAUNCH_SITE=prior;}
await fs.writeFile(path.join(stage,'LOADER-WORKFLOW-PROOF.json'),JSON.stringify({at:new Date().toISOString(),result:'PASS',models:proofs.length,launchLoads:0,geminiAuthoringClaimed:false,proofs},null,2)+'\n');
console.log(JSON.stringify({result:'PASS',models:proofs.length,launchLoads:0,ownerApprovals:0}));
