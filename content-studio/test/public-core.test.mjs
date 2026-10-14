import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {publicCoreDirectory,publicMedia} from '../src/public-core.mjs';

test('configured nonadjacent companion loads the actual media module',async t=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'studio-companion-'));
  t.after(async()=>{
    assert.ok(root.startsWith(path.join(os.tmpdir(),'studio-companion-')));
    await rm(root,{recursive:true,force:true});
  });
  const companion=path.join(root,'custom companion');await mkdir(path.join(companion,'lib'),{recursive:true});
  await writeFile(path.join(companion,'lib/niche-media.mjs'),'export const marker="configured-companion";');
  const loaded=await publicMedia({STUDIO_PUBLIC_CORE_DIR:companion});
  assert.equal(loaded.marker,'configured-companion');
  assert.equal(publicCoreDirectory({PINET_PUBLIC_CORE_PATH:companion}),companion);
  assert.equal(publicCoreDirectory({STUDIO_NETWORK_SETTINGS:path.join(companion,'config/niche-network.json')}),companion);
});

test('explicit bad configuration cannot silently fall back',()=>{
  for(const value of ['', 'relative-companion']){
    assert.throws(()=>publicCoreDirectory({STUDIO_PUBLIC_CORE_DIR:value}));
    assert.throws(()=>publicCoreDirectory({PINET_PUBLIC_CORE_PATH:value}));
    assert.throws(()=>publicCoreDirectory({STUDIO_NETWORK_SETTINGS:value}));
  }
});

test('legacy default retains the original sibling root',()=>{
  assert.equal(publicCoreDirectory({}),path.resolve(import.meta.dirname,'../../../dovanos-memorycasting'));
});

test('studio server imports with configured actual companion without starting or initializing data',()=>{
  const companion=process.env.STUDIO_PUBLIC_CORE_DIR;
  assert.ok(companion&&path.isAbsolute(companion),'set the maintained configured companion for this integration check');
  const value=spawnSync(process.execPath,['--input-type=module','-e',
    "const module=await import('./src/server.mjs');console.log(typeof module.createServer)"],
    {cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,STUDIO_PUBLIC_CORE_DIR:companion},
     encoding:'utf8',timeout:10000,windowsHide:true});
  assert.equal(value.error,undefined);assert.equal(value.status,0,value.stderr);assert.equal(value.stdout.trim(),'function');
});
