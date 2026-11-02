import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {REVISION} from 'three';
import recipe from '../content/product-environment.json';
import {productSceneSettings} from '../src/lib/viewer-scene';

test('precomputed environment is bound to the current full-quality room, lighting and Three revision',()=>{
 const hash=(name:string)=>createHash('sha256').update(readFileSync(new URL('../src/lib/'+name,import.meta.url),'utf8').replace(/\r\n/g,'\n')).digest('hex');
 assert.equal(hash('showroom.ts'),recipe.showroomSha256Lf);assert.equal(hash('viewer-scene.ts'),recipe.sceneSettingsSha256Lf);
 assert.equal(REVISION,recipe.threeRevision);assert.equal(productSceneSettings.lighting,recipe.lighting);
 assert.equal(recipe.bytes,recipe.width*recipe.height*4*2);assert.equal(recipe.sigma,.04);
 assert(recipe.asset.includes(recipe.assetSha256.slice(0,20)));assert.equal(recipe.width,768);assert.equal(recipe.height,1024);
});
