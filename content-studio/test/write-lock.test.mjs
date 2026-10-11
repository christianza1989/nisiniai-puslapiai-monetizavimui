import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {withStudioWriteLock} from '../src/write-lock.mjs';
test('independent model processes preserve both concurrent page additions',async()=>{
  const data=await mkdtemp(path.join(tmpdir(),'studio-model-lock-'));
  try{
    await mkdir(path.join(data,'sites'));
    const modelUrl=new URL('../src/model.mjs',import.meta.url).href;
    const setup=path.join(data,'setup.mjs');
    await writeFile(setup,`const model=await import(${JSON.stringify(modelUrl)});await model.createSite({canonicalHost:'lock-fixture.example',name:'Fixture',offer:'Test'});await model.createJob('fixture','lock-fixture');`);
    const run=filename=>new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,[filename],{env:{...process.env,STUDIO_DATA_DIR:data},cwd:fileURLToPath(new URL('..',import.meta.url)),stdio:['ignore','ignore','pipe']});let error='';child.stderr.on('data',c=>error+=c);child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(error)));
    });
    await run(setup);
    const init=path.join(data,'initialize.mjs');await writeFile(init,`const model=await import(${JSON.stringify(modelUrl)});await model.initialize();`);await run(init);
    assert.equal(JSON.parse(await readFile(path.join(data,'jobs.json'),'utf8'))[0].status,'queued','CLI initialize must not fail another process queued job');
    const writers=[];
    for(let writer=0;writer<2;writer++){
      const filename=path.join(data,`writer-${writer}.mjs`);await writeFile(filename,`const model=await import(${JSON.stringify(modelUrl)});for(let i=0;i<15;i++)await model.addPage('lock-fixture',{type:'guide',slug:'writer-${writer}-'+i,title:'Fixture '+i});`);writers.push(filename);
    }
    await Promise.all(writers.map(run));
    const site=JSON.parse(await readFile(path.join(data,'sites/lock-fixture.json'),'utf8'));assert.equal(site.pages.length,30);assert.equal(new Set(site.pages.map(p=>p.slug)).size,30);
    await withStudioWriteLock(data,async()=>{throw Error('fixture failure');}).then(()=>assert.fail(),error=>assert.match(error.message,/fixture failure/));
    await withStudioWriteLock(data,async()=>{});
  }finally{await rm(data,{recursive:true,force:true});}
});
test('an abandoned or active lock fails within a bound and is never silently removed',async()=>{
  const data=await mkdtemp(path.join(tmpdir(),'studio-stale-lock-'));
  try{const bytes=JSON.stringify({pid:987654321,token:'other',createdAt:'2000-01-01T00:00:00Z'});await writeFile(path.join(data,'.model-write.lock'),bytes);
    await assert.rejects(withStudioWriteLock(data,async()=>assert.fail(),100),/užraktas užimtas/);assert.equal(await readFile(path.join(data,'.model-write.lock'),'utf8'),bytes);
  }finally{await rm(data,{recursive:true,force:true});}
});
test('release refuses changed ownership and preserves the replacement lock',async()=>{
  const data=await mkdtemp(path.join(tmpdir(),'studio-changed-lock-'));
  const filename=path.join(data,'.model-write.lock'),bytes=JSON.stringify({token:'replacement-owner',pid:987654321});
  try{
    await assert.rejects(withStudioWriteLock(data,async()=>{await writeFile(filename,bytes);}),/savininkas pasikeitė/);
    assert.equal(await readFile(filename,'utf8'),bytes);
  }finally{await rm(data,{recursive:true,force:true});}
});
test('transient Windows exclusive-open errors recover, permanent permission errors retain their identity',async()=>{
  const data=await mkdtemp(path.join(tmpdir(),'studio-open-lock-'));
  const lockUrl=new URL('../src/write-lock.mjs',import.meta.url).href;
  try{
    const script=`import fs from 'node:fs/promises';
import {syncBuiltinESMExports} from 'node:module';
import assert from 'node:assert/strict';
const data=${JSON.stringify(data)},original=fs.open;
let calls=0,taskCalls=0,mode='once',fault='EPERM';
fs.open=async(...args)=>{calls++;if(mode==='always'||calls===1)throw Object.assign(new Error('synthetic Windows sharing denial'),{code:fault});return original(...args);};
syncBuiltinESMExports();
const {withStudioWriteLock}=await import(${JSON.stringify(lockUrl)});
for(const code of ['EPERM','EACCES','EBUSY']){
  fault=code;calls=0;taskCalls=0;mode='once';
  const task=async()=>{taskCalls++;assert.equal(taskCalls,1);return 'executed';};
  if(process.platform==='win32'){
    assert.equal(await withStudioWriteLock(data,task,150),'executed');
    assert.equal(calls,2);assert.equal(taskCalls,1);
  }else{await assert.rejects(withStudioWriteLock(data,task,150),e=>e.code===code);assert.equal(calls,1);assert.equal(taskCalls,0);}
}
mode='always';fault='EPERM';calls=0;taskCalls=0;
const start=Date.now();await assert.rejects(withStudioWriteLock(data,async()=>{taskCalls++;},80),e=>e.code==='EPERM');
assert.equal(taskCalls,0);assert.ok(Date.now()-start<1500);
await assert.rejects(fs.stat(data+'/.model-write.lock'),e=>e.code==='ENOENT');
console.log(JSON.stringify({recovered:process.platform==='win32',permanentErrorPreserved:true,taskCalls}));`;
    const result=await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,['--input-type=module','-e',script],{stdio:['ignore','pipe','pipe'],windowsHide:true});
      let output='',error='';child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>error+=c);
      child.on('error',reject);child.on('exit',code=>code===0?resolve(JSON.parse(output)):reject(Error(error)));
    });
    assert.equal(result.recovered,process.platform==='win32');assert.equal(result.permanentErrorPreserved,true);assert.equal(result.taskCalls,0);
  }finally{await rm(data,{recursive:true,force:true});}
});
