import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,access,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';

const source = new URL('../scripts/customer-content-preflight.mjs',import.meta.url);
async function fixture({sharp=true,badExport=false}={}) {
  const root=await mkdtemp(path.join(os.tmpdir(),'pinet-studio-preflight-'));
  const scripts=path.join(root,'scripts'),src=path.join(root,'src');
  await mkdir(scripts);await mkdir(src);
  await writeFile(path.join(scripts,'customer-content-preflight.mjs'),await readFile(source));
  for(const [name,symbol] of [['creation-intake','intakeCreationDraft'],['content-write','customerContentWrite'],['content-workflow','customerContentWorkflow']])
    await writeFile(path.join(scripts,'customer-'+name+'.mjs'),`export function ${badExport&&name==='content-write'?'wrongExport':symbol}(){throw Error('must not execute');}`);
  await writeFile(path.join(src,'model.mjs'),`export function initialize(){throw Error('must not initialize');}
    export function getSite(){throw Error('must not read cases');}
    export function saveResponsiveAsset(){throw Error('must not write assets');}`);
  if(sharp){
    const module=path.join(root,'node_modules','sharp');await mkdir(module,{recursive:true});
    await writeFile(path.join(module,'package.json'),JSON.stringify({name:'sharp',type:'module',exports:'./index.mjs'}));
    await writeFile(path.join(module,'index.mjs'),`function sharp(){throw Error('must not transform');}
      sharp.versions={sharp:'0.35.5'};export default sharp;`);
  }
  return {root,script:path.join(scripts,'customer-content-preflight.mjs')};
}
async function cleanup(root){
  const absolute=path.resolve(root),parent=path.resolve(os.tmpdir());
  assert.equal(path.dirname(absolute),parent);
  assert.ok(path.basename(absolute).startsWith('pinet-studio-preflight-'));
  await rm(absolute,{recursive:true,force:true});
}
function invoke(f,input={version:'customer-content-preflight.v1'}){
  return spawnSync(process.execPath,[f.script],{cwd:f.root,input:typeof input==='string'?input:JSON.stringify(input),
    encoding:'utf8',timeout:10000,windowsHide:true,env:{...process.env,
      STUDIO_DATA_DIR:path.join(f.root,'must-not-create-data'),STUDIO_OUTPUT_DIR:path.join(f.root,'must-not-create-output')}});
}
test('fixed helpers import without initialization, case reads, transforms or GUI server',async()=>{
  const f=await fixture();try{
    const result=invoke(f);assert.equal(result.status,0,result.stderr);
    const value=JSON.parse(result.stdout);assert.equal(value.state,'ready');
    assert.deepEqual(value.modules,['intake','writer','workflow','model','sharp']);
    assert.equal(value.providerCalls,0);assert.equal(value.initialization,'not-performed');assert.equal(value.server,'not-started');
    for(const name of ['must-not-create-data','must-not-create-output'])await assert.rejects(access(path.join(f.root,name)));
  }finally{await cleanup(f.root);}
});
test('missing Sharp is a specific safe preflight failure',async()=>{
  const f=await fixture({sharp:false});try{
    const result=invoke(f);assert.equal(result.status,1);assert.equal(result.stdout,'');
    assert.deepEqual(JSON.parse(result.stderr),{version:'customer-content-preflight.v1',state:'failed',code:'studio_dependency_missing'});
    assert.ok(!result.stderr.includes(f.root));
  }finally{await cleanup(f.root);}
});
test('present files with wrong maintained exports cannot pass',async()=>{
  const f=await fixture({badExport:true});try{
    const result=invoke(f);assert.equal(result.status,1);
    assert.equal(JSON.parse(result.stderr).code,'studio_preflight_invalid_exports');
  }finally{await cleanup(f.root);}
});
for(const input of [{version:'customer-content-preflight.v1',modulePath:'private-secret'},'invalid JSON','x'.repeat(4097)])
  test('invalid or oversized caller input cannot select imports or leak raw data',async()=>{
    const f=await fixture({sharp:false});try{
      const result=invoke(f,input);assert.equal(result.status,1);
      assert.equal(JSON.parse(result.stderr).code,'studio_preflight_invalid_input');
      assert.ok(!result.stderr.includes('private-secret'));
    }finally{await cleanup(f.root);}
  });
