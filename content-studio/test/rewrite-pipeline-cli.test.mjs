import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { JsonPipelineStore, createPipelineState } from '../src/rewrite-pipeline/runner.mjs';
import { HostBridge } from '../src/rewrite-pipeline/host-bridge.mjs';

test('large file-backed intent creates official MCP dispatch source once without shell/stdin', async () => {
  const outputRoot = path.resolve(fileURLToPath(new URL('../output/',import.meta.url)));
  const dir = await mkdtemp(path.join(outputRoot, 'pipeline-cli-'));
  try {
    const state = path.join(dir,'state.json'), input = path.join(dir,'prepared.json'), dispatch = path.join(dir,'dispatch.mjs');
    const store = new JsonPipelineStore(state);
    await store.init(createPipelineState({siteId:'fixture',pages:[],publication:'paused_by_owner'}));
    const prepared = {kind:'PREPARED_GEMINI_SEND',batchId:'large-file-test',preparedId:'fixture-prepared',preparedSha256:'fixture-hash',promptSha256:'fixture-prompt',prompt:'x'.repeat(250_000)};
    const request = {id:'fixture-request',kind:'GEMINI_GENERATE',payload:{batchId:prepared.batchId},status:'WAITING'};
    const bridge = new HostBridge(store);
    await bridge.change(doc => {doc.requests=[request];});
    await bridge.claim(request.id,'fixture-host');
    await writeFile(input,JSON.stringify(prepared));
    const cli = fileURLToPath(new URL('../scripts/rewrite-pipeline.mjs',import.meta.url));
    const args = [cli,'send-intent','--state',state,'--request',request.id,'--actor','fixture-host','--input',input,'--dispatch-file',dispatch];
    const run = () => spawnSync(process.execPath,args,{encoding:'utf8',timeout:10_000});
    const first = run();
    assert.equal(first.status,0,first.stderr);
    const receipt = JSON.parse(first.stdout);
    assert.equal(receipt.state,'ATTEMPTED');
    const source = await readFile(dispatch,'utf8');
    assert.ok(source.includes(prepared.prompt));
    assert.match(source,/return dispatchPreparedGeminiSend\(page,/);
    assert.match(source,/document must be visible/);
    assert.equal(typeof new Function(`return (${source})`)(),'function');
    const saved = await readFile(state,'utf8');
    assert.notEqual(run().status,0,'existing dispatch must never be overwritten/replayed');
    assert.equal(await readFile(state,'utf8'),saved);
    assert.equal(await readFile(dispatch,'utf8'),source);
  } finally {
    assert.equal(path.dirname(path.resolve(dir)),outputRoot);
    assert.ok(path.basename(dir).startsWith('pipeline-cli-'));
    await rm(dir,{recursive:true,force:true});
  }
});
