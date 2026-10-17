import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSceneSettings,readSceneSettings,sceneBackground} from '../src/lib/viewer-scene';

test('invalid or stale browser preferences safely restore presentation defaults',()=>{
  for(const saved of [null,[],false,'warm',{background:'__proto__',lighting:'constructor',color:'url(example)',brightness:NaN}])assert.deepEqual(readSceneSettings(saved),defaultSceneSettings);
});
test('custom colours survive a saved preference and exposure stays bounded',()=>{
  const saved={background:'custom',lighting:'warm',color:'#ABc123',brightness:900,configuration:['ignored']};
  assert.deepEqual(readSceneSettings(saved),{background:'custom',lighting:'warm',color:'#abc123',brightness:160,direction:0});
  assert.equal(sceneBackground(readSceneSettings(saved)),'#abc123');
  assert.equal(readSceneSettings({brightness:-3}).brightness,60);
  assert.equal(sceneBackground(readSceneSettings({background:'graphite',color:'#abcdef'})),'#323833');
  assert.equal(readSceneSettings({direction:-90}).direction,0);
  assert.equal(readSceneSettings({direction:900}).direction,360);
  assert.equal(readSceneSettings({direction:93,brightness:107}).direction,90);
  assert.equal(readSceneSettings({direction:93,brightness:107}).brightness,105);
});
