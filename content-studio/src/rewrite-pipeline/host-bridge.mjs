import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const now = () => new Date().toISOString();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** External work is performed by Codex's real editor and official MCP tools.
 * Requests share CURRENT_LEAN_BATCH; there is no browser API/CLI substitute and
 * no synthetic reviewer. Host claims are durable and never redelivered. */
export class HostBridge {
  constructor(store, { pollMs = 200, timeoutMs = 20 * 60_000 } = {}) { this.store=store; this.pollMs=pollMs; this.timeoutMs=timeoutMs; }
  async change(mutator) { return this.store.locked(async()=>{const doc=await this.store.read();mutator(doc);await this.store.write(doc);return structuredClone(doc);}); }
  async request(kind,payload,{signal}={}) {
    const request={id:randomUUID(),kind,payload,payloadSha256:hash(payload),status:'WAITING',at:now()};
    await this.change(doc=>(doc.requests??=[]).push(request));
    const start=Date.now();
    while(!signal?.aborted&&Date.now()-start<this.timeoutMs){
      const saved=(await this.store.read()).requests.find(r=>r.id===request.id);
      if(saved.status==='ANSWERED'){assert.equal(saved.payloadSha256,request.payloadSha256);return saved.response;}
      if(saved.status==='UNKNOWN')throw new Error('External outcome unknown; inspect instead of replaying');
      await sleep(this.pollMs);
    }
    await this.change(doc=>{const saved=doc.requests.find(r=>r.id===request.id);if(saved.status!=='ANSWERED'){saved.status='UNKNOWN';saved.reason=signal?.aborted?'Owner pause':'Host response timeout';}});
    throw new Error('External outcome unknown; no automatic retry');
  }
  async pending(){return((await this.store.read()).requests??[]).filter(r=>r.status==='WAITING');}
  async claim(id,actor){
    assert(typeof actor==='string'&&actor.trim());let claimed;
    await this.change(doc=>{const request=doc.requests?.find(r=>r.id===id);assert(request?.status==='WAITING','Already claimed/attempted; do not redispatch');Object.assign(request,{status:'CLAIMED',actor,claimedAt:now(),attemptId:randomUUID()});claimed=structuredClone(request);});return claimed;
  }
  async reply(id,actor,payloadSha256,response){
    await this.change(doc=>{const request=doc.requests?.find(r=>r.id===id);assert(request?.status==='CLAIMED'&&request.actor===actor,'Only actual claiming host may reply');assert.equal(request.payloadSha256,payloadSha256);request.response=response;request.status='ANSWERED';request.answeredAt=now();});
  }
  async recordSendIntent(id,actor,prepared){
    let receipt;
    await this.change(doc=>{const request=doc.requests?.find(r=>r.id===id);assert(request?.status==='CLAIMED'&&request.kind==='GEMINI_GENERATE'&&request.actor===actor);assert(!request.sendIntent,'Attempted send cannot be repeated');assert.equal(prepared.batchId,request.payload.batchId);receipt={durable:true,state:'ATTEMPTED',batchId:prepared.batchId,preparedId:prepared.preparedId,preparedSha256:prepared.preparedSha256,promptSha256:prepared.promptSha256,attemptId:request.attemptId,attemptedAt:now(),recordRef:`${this.store.stateFile}#requests/${id}/sendIntent`};request.sendIntent={prepared,receipt};});return receipt;
  }
}
