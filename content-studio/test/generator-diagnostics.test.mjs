import test from 'node:test';
import assert from 'node:assert/strict';
import {generatorFailure} from '../src/generator-diagnostics.mjs';
test('actual structured provider error survives unrelated stderr warning',()=>{
  const stdout=[JSON.stringify({type:'thread.started'}),'not JSON',JSON.stringify({type:'error',message:'First transport error'}),JSON.stringify({type:'turn.failed',error:{message:'exceeded retry limit, last status: 429 Too Many Requests'}})].join('\n');
  assert.equal(generatorFailure(stdout,'WARN shell_snapshot: unsupported shell'),'exceeded retry limit, last status: 429 Too Many Requests');
});
test('agent content is not parsed as failure and legacy diagnostics remain bounded',()=>{
  assert.equal(generatorFailure(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'not a transport failure'}}),'old stderr failure'),'old stderr failure');
  assert.equal(generatorFailure('legacy stdout error',''),'legacy stdout error');
  assert.equal(generatorFailure('', 'x'.repeat(2000)).length,1400);
});
