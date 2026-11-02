import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {REVISION} from 'three';
import {createRequire} from 'node:module';
import path from 'node:path';
const recipe=JSON.parse(readFileSync('content/product-environment.json','utf8'));
for(const [file,key]of [['showroom.ts','showroomSha256Lf'],['viewer-scene.ts','sceneSettingsSha256Lf']]){
 const hash=createHash('sha256').update(readFileSync('src/lib/'+file,'utf8').replace(/\r\n/g,'\n')).digest('hex');
 if(hash!==recipe[key])throw Error('Requalify the precomputed environment after changing '+file);
}
if(REVISION!==recipe.threeRevision||recipe.bytes!==recipe.width*recipe.height*8)throw Error('Environment recipe changed');
const threeRoot=path.dirname(path.dirname(createRequire(import.meta.url).resolve('three')));
if(JSON.parse(readFileSync(threeRoot+'/package.json','utf8')).version!==recipe.threeVersion)throw Error('Requalify environment after Three version change');
for(const [file,key]of [['src/extras/PMREMGenerator.js','pmremSha256Lf'],['examples/jsm/environments/RoomEnvironment.js','roomEnvironmentSha256Lf']]){
 const hash=createHash('sha256').update(readFileSync(threeRoot+'/'+file,'utf8').replace(/\r\n/g,'\n')).digest('hex');
 if(hash!==recipe[key])throw Error('Requalify environment after dependency source change');
}
console.log('Exact product environment source/revision binding PASS');
