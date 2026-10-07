import test from 'node:test';
import assert from 'node:assert/strict';
import {editorialCliArgs,verifyArticleCliHeader} from '../src/editorial-cli.mjs';
test('article args pin Luna/xhigh independently of user config and planning stays separate',()=>{
 const args=editorialCliArgs({schemaPath:'schema',resultFile:'result'});
 assert.equal(args[args.indexOf('--model')+1],'gpt-6-luna');
 assert.ok(args.includes('model_reasoning_effort="xhigh"'));assert.ok(args.includes('--ignore-user-config'));
 assert.ok(!editorialCliArgs({schemaPath:'schema',resultFile:'result',mode:'plan'}).includes('--model'));
 assert.throws(()=>editorialCliArgs({schemaPath:'schema',resultFile:'result',mode:'unknown'}),/Unknown/);
});
test('model mismatch or absent runtime confirmation rejects instead of silently accepting a fallback',()=>{
 assert.deepEqual(verifyArticleCliHeader('model: gpt-6-luna\nreasoning effort: xhigh\n'),{model:'gpt-6-luna',reasoningEffort:'xhigh'});
 for(const header of ['model: gpt-6.1-sol\nreasoning effort: xhigh','model: gpt-6-luna\nreasoning effort: high',''])assert.throws(()=>verifyArticleCliHeader(header),/nepatvirtino/);
});
