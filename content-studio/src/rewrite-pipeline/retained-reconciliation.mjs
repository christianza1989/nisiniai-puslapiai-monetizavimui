import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { parseRetainedGenerationAnswer } from './host-ports.mjs';
import { attachGenerationResult } from './runner.mjs';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function claimingRequest(document,{requestId,actor,payloadSha256,response}) {
  const request=document.requests?.find(r=>r.id===requestId);
  assert(request?.kind==='GEMINI_GENERATE'&&request.status==='UNKNOWN','Only an explicit UNKNOWN Gemini request may be reconciled');
  assert(actor&&request.actor===actor&&Number.isFinite(Date.parse(request.claimedAt)),'Original actual claiming actor required');
  assert(typeof request.attemptId==='string'&&request.attemptId,'Original host attempt ID required');
  assert.equal(request.payloadSha256,payloadSha256);assert.equal(hash(request.payload),payloadSha256,'Original request payload changed');
  assert.equal(response.send?.attemptId,request.attemptId,'Original host attempt required');
  assert(Date.parse(request.claimedAt)<=Date.parse(response.send.at),'Retained response predates the actual host claim');
  assert(request.sendIntent?.receipt?.durable&&request.sendIntent.receipt.state==='ATTEMPTED'&&
    request.sendIntent.receipt.attemptId===request.attemptId,'Original durable send intent required; never infer a send');
  assert.equal(request.sendIntent.receipt.batchId,request.payload.batchId,'Durable intent belongs to another batch');
  return request;
}

/** Operator-only reconciliation of already retained evidence. No send, review,
 * native write or new author attempt. UNKNOWN history remains intact. */
export async function reconcileRetainedGeneration(store,input) {
  const before=await store.read(),request=claimingRequest(before,input);
  const result=await parseRetainedGenerationAnswer(request.payload,input.response,{attemptId:request.attemptId});
  let receipt;
  await store.locked(async()=>{
    const document=await store.read(),current=claimingRequest(document,input),pipeline=document.pipeline;
    if(current.lateRetained){
      assert.deepEqual(current.lateRetained.response,input.response,'A different retained response cannot replace reconciliation history');
      receipt=current.lateRetained.receipt;return;
    }
    assert(pipeline.publication==='paused_by_owner','Publication hold required');
    assert(pipeline.runner?.status!=='RUNNING'&&!pipeline.pages.some(p=>['GENERATING','REVIEWING','IMPORTING'].includes(p.status)),
      'Drain/stop the pipeline before explicit retained reconciliation');
    assert.deepEqual(current.payload,request.payload,'Request changed during evidence validation');
    const batch=pipeline.batches.find(b=>b.batchId===request.payload.batchId);
    assert(batch?.status==='UNKNOWN','Original unknown batch required');
    assert(!batch.lateRetained,'Existing batch reconciliation requires separate inspection');
    assert.deepEqual(batch.pageIds,request.payload.pages.map(p=>p.pageId),'Original batch page identities differ');
    assert.equal(document.requests.filter(r=>r.kind==='GEMINI_GENERATE'&&r.payload.batchId===batch.batchId).length,1,'Ambiguous request history for this batch');
    assert.deepEqual([...result.pages,...result.rejections].map(p=>p.pageId).sort(),[...batch.pageIds].sort(),'Every original page needs an explicit retained outcome');
    for(const id of batch.pageIds){
      const page=pipeline.pages.find(p=>p.pageId===id),attempt=page?.attempts.at(-1);
      assert(page?.status==='UNKNOWN'&&attempt?.batchId===batch.batchId,'Page has advanced or belongs to another attempt');
      assert(page.generationResults.some(g=>g.attemptId===attempt.attemptId&&g.status==='UNKNOWN'),'Original UNKNOWN outcome required');
      assert(!page.candidates.some(c=>c.attemptId===attempt.attemptId),'Existing candidate requires separate inspection');
    }
    const link={requestId:request.id,receiptId:randomUUID(),at:new Date().toISOString()};
    attachGenerationResult(pipeline,batch,result,{reconciliation:link});
    receipt={...link,status:'OBSERVED_RETAINED',batchId:batch.batchId,responseId:input.response.captureSelection.responseId,
      responseIndex:input.response.captureSelection.responseIndex,captureRef:input.response.captureRef,
      pages:batch.pageIds.map(id=>{const p=pipeline.pages.find(p=>p.pageId===id);return{pageId:id,status:p.status,attemptId:p.attempts.at(-1).attemptId,candidateId:p.candidates.at(-1)?.candidateId??null};})};
    current.lateRetained={response:structuredClone(input.response),receipt};
    await store.write(document);
  });
  return structuredClone(receipt);
}
