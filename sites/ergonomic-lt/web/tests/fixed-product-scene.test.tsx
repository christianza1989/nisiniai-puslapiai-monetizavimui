import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseHTML} from 'linkedom';
import Viewer3D from '../src/components/viewer-3d';
import {pilotModels} from '../src/lib/configurator';
import {productSceneSettings} from '../src/lib/viewer-scene';

test('every product presentation is fixed to white / side window / 100% / 45 degrees',()=>{
 assert.deepEqual(productSceneSettings,{background:'white',color:'#ffffff',lighting:'side',brightness:100,direction:45});
 assert(Object.isFrozen(productSceneSettings));
 assert.throws(()=>Object.assign(productSceneSettings,{color:'#000000',brightness:60}));
});
test('normal and fullscreen viewers expose model controls but no room/background editor',()=>{
 for(const fullscreen of [false,true]){
  const html=renderToStaticMarkup(<Viewer3D variant={pilotModels[0].variants[0]} name="Xilium" fullscreen={fullscreen} onFullscreen={()=>{}}/>),{document}=parseHTML(html);
  assert.equal(document.querySelectorAll('.viewer-settings,input[type="range"],input[type="color"],select').length,0);
  assert(!/Fonas ir apšvietimas|Kambario šviesumas|Šviesos kryptis/.test(document.querySelector('.viewer-3d')?.textContent||''));
  assert(document.querySelector('button[aria-label="Pasukti į dešinę"]'));assert(document.querySelector('button[aria-label="Priartinti"]'));assert(document.querySelector('canvas'));
 }
});
