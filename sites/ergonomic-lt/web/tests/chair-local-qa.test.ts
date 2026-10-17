import test from 'node:test';
import assert from 'node:assert/strict';
import {localChairQA} from '../src/lib/chair-local-qa';
import {GET} from '../src/app/models/configurator/structure/[file]/route';

test('private technical QA cannot expose assets or read private files in production',async()=>{
 const saved={NODE_ENV:process.env.NODE_ENV,ERGONOMIC_CHAIR_LOCAL_QA:process.env.ERGONOMIC_CHAIR_LOCAL_QA,ERGONOMIC_CHAIR_QA_MANIFEST:process.env.ERGONOMIC_CHAIR_QA_MANIFEST};
 try{
  Object.assign(process.env,{NODE_ENV:'production',ERGONOMIC_CHAIR_LOCAL_QA:'1',ERGONOMIC_CHAIR_QA_MANIFEST:'D:/Core/NEVER_READ_NONEXISTENT_QA_FILE.json'});
  assert.equal(await localChairQA(),undefined);
  const response=await GET(new Request('http://fixture.invalid/models/configurator/structure/KTEST-'+'a'.repeat(20)+'.glb'),{params:Promise.resolve({file:'KTEST-'+'a'.repeat(20)+'.glb'})});
  assert.equal(response.status,404);
 }finally{
  for(const [key,value] of Object.entries(saved))if(value===undefined)delete process.env[key];else process.env[key]=value;
 }
});
