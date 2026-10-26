import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {v2Fixture} from './fixtures/v2.mjs';
import {validateV2Package,v2RevisionHash} from '../src/content-package-v2.mjs';
const publicRoot=process.env.STUDIO_PUBLIC_CORE_DIR||path.resolve(import.meta.dirname,'../../../dovanos-memorycasting');
const publicCore=await import(pathToFileURL(path.join(publicRoot,'scripts/content-package-core.mjs')));

test('paired V2 media contracts accept 120 variants and reject overflow without changing legacy packages',async()=>{
 const studio=JSON.parse(await readFile(new URL('../schemas/content-package.v2.schema.json',import.meta.url),'utf8'));
 const renderer=JSON.parse(await readFile(path.join(publicRoot,'schemas/content-package.v2.schema.json'),'utf8'));
 assert.deepEqual(studio,renderer);
 const pkg=v2Fixture(),page=pkg.pages[0];
 assert.equal(validateV2Package(pkg),pkg);assert.equal(publicCore.validateContentPackage(pkg),pkg);
 assert.equal(studio.$defs.page.properties.media.maxItems,120);
 page.media=Array.from({length:120},(_,i)=>({id:`image-${i}`,familyId:`frame-${Math.floor(i/5)}`,src:`/content-assets/${pkg.siteId}/image-${i}.webp`,alt:'Same descriptive product text',width:800,height:600,rights:'Synthetic test only'}));
 page.revisionHash=v2RevisionHash(page);page.approval.revisionHash=page.revisionHash;
 validateV2Package(pkg);publicCore.validateContentPackage(pkg);
 page.media[0].familyId='new-frame';
 assert.throws(()=>validateV2Package(pkg),/hash/);assert.throws(()=>publicCore.validateContentPackage(pkg),/hash/);
 page.revisionHash=v2RevisionHash(page);page.approval.revisionHash=page.revisionHash;
 for(const familyId of ['',null,123,'../private','https://example.org/image','x'.repeat(129)]){
  const invalid=structuredClone(pkg);invalid.pages[0].media[0].familyId=familyId;
  assert.throws(()=>validateV2Package(invalid));assert.throws(()=>publicCore.validateContentPackage(invalid));
 }
 page.media.push({...page.media[0],id:'overflow',src:`/content-assets/${pkg.siteId}/overflow.webp`});
 assert.throws(()=>validateV2Package(pkg),/items/);assert.throws(()=>publicCore.validateContentPackage(pkg),/items/);
});
