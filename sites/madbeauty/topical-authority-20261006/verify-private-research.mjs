import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {artifactBytes,researchContext} from '../../../content-studio/src/seo-research.mjs';
const dir=new URL('./',import.meta.url),root=path.resolve(process.argv[2]??'C:/Users/Lenovo/.codex/tmp/madbeauty-writing-studio-20261007/seo-research'),siteDirectory=path.join(root,'madbeauty');
const sha=b=>createHash('sha256').update(b).digest('hex');
const result=researchContext({id:'madbeauty',domain:'madbeauty.lt',locale:'lt-LT'},{root});
assert.equal(result.status,'available');assert.equal(result.observations.length,102);assert.deepEqual(result.missingKinds,['backlinks','geo','analytics']);
let calls=0,rows=0,related=0,cost=0;
for(const o of result.observations.filter(o=>o.callId)){
 const raw=JSON.parse(artifactBytes(siteDirectory,o.source.artifact));assert.equal(raw.format,'exact-provider-request-response-bytes/v1');
 for(const type of ['response','request']){const b=Buffer.from(raw[type].base64,'base64');assert.equal(sha(b),raw[type].sha256);assert.equal(sha(b),o.originalBytes[type+'Sha256']);}
 const response=JSON.parse(Buffer.from(raw.response.base64,'base64').toString('utf8')),request=JSON.parse(Buffer.from(raw.request.base64,'base64').toString('utf8'));
 assert.equal(o.callId,response._treg.call_id);assert.equal(o.chargedUsd,response._treg.charged_micro/1e6);assert.equal(o.newChargedUsd,0);assert.equal(o.replay,true);assert.equal(o.freshSample,false);assert.equal(request[0].location_code,2440);assert.equal(o.value.query??o.value.seed??null,request[0].keyword??null);
 if(o.id==='volume-lt-clean')rows=response.result.tasks[0].result.length;
 if(o.id.startsWith('ideas-'))related+=response.result.tasks[0].result[0].items.length;
 cost+=o.chargedUsd;calls++;
}
assert.equal(calls,94);assert.equal(rows,730);assert.equal(related,931);assert.ok(Math.abs(cost-0.71772)<1e-9);
const manifest=JSON.parse(readFileSync(new URL('RESEARCH_IMPORT_MANIFEST.json',dir),'utf8'));
manifest.sharedImport={status:result.status,evidenceSha256:result.evidenceSha256,currentKinds:result.currentKinds,missingKinds:result.missingKinds,observations:result.observations.length,privateStudio:'madbeauty-writing-studio-20261007',paidExecution:result.paidExecution,newPaidUsd:0,exactBytePairsVerified:calls,responseAndRequestHashesVerified:true,assessedAt:result.assessedAt,freshSamples:result.observations.filter(x=>x.freshSample).map(x=>x.id),replayedProviderSamples:calls};
writeFileSync(new URL('RESEARCH_IMPORT_MANIFEST.json',dir),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({status:result.status,observations:102,exactBytePairsVerified:calls,volumeRows:rows,relatedRows:related,historicalPaidUsd:Number(cost.toFixed(5)),newPaidUsd:0,evidenceSha256:result.evidenceSha256}));
