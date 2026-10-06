import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,mkdir,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const temporary=await mkdtemp(path.join(os.tmpdir(),'studio-restore-'));
process.env.STUDIO_DATA_DIR=path.join(temporary,'data');process.env.STUDIO_OUTPUT_DIR=path.join(temporary,'output');
const model=await import('../src/model.mjs');
const source=path.resolve(import.meta.dirname,'../../../dovanos-memorycasting/content-staging/dovanos123');
test('restore keeps existing immutable approvals and media, rejects wrong bytes/occupied destinations, and requires a new review for release',async()=>{
 await model.initialize();
 await assert.rejects(model.restoreApprovedV2Package(source,'0'.repeat(64)),/exact known/);
 const seed=JSON.parse(await readFile(path.join(source,'content-package.json'),'utf8')).pages.flatMap(p=>p.media)[0],filename=path.basename(seed.src);
 const destination=path.join(model.DATA,'media/dovanos123');await mkdir(destination,{recursive:true});
 await writeFile(path.join(destination,filename),'changed');await assert.rejects(model.restoreApprovedV2Package(source,'f9a14e3a5772781afe1233fbd3ccc6041ea2bf73aef2d7a12d40924ca6b4febd'),/destination changed/);
 await writeFile(path.join(destination,filename),await readFile(path.join(source,'assets',filename)));
 const result=await model.restoreApprovedV2Package(source,'f9a14e3a5772781afe1233fbd3ccc6041ea2bf73aef2d7a12d40924ca6b4febd');assert.equal(result.pages,11);
 const pkg=JSON.parse(await readFile(path.join(source,'content-package.json'),'utf8')),site=await model.getSite('dovanos123');
 for(const page of site.pages){assert.deepEqual(page.publishedRevision,pkg.pages.find(p=>p.id===page.id));assert.equal(page.editorialReview,null);}
 for(const asset of site.assets)assert.deepEqual(await readFile(path.join(model.DATA,'media/dovanos123',path.basename(asset.src))),await readFile(path.join(source,'assets',path.basename(asset.src))));
 await assert.rejects(model.releaseContent('dovanos123'),/peržiūr/);
 await assert.rejects(model.restoreApprovedV2Package(source,result.packageSha256),/already exists/);
});
