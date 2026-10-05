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
