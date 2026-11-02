import {PMREMGenerator,type WebGLRenderer} from 'three';
import {roomEnvironment} from '../src/lib/showroom';
import {productSceneSettings} from '../src/lib/viewer-scene';

/** Offline, on a qualified WebGL2 device. Preserve all original RGBA16F texels.
 * Compare representative PBR renders to target.texture before accepting bytes;
 * persist a new SHA-addressed asset and recipe when the source changes.
 */
export function bakeProductEnvironment(renderer:WebGLRenderer){
 const generator=new PMREMGenerator(renderer),room=roomEnvironment(productSceneSettings.lighting);
 const target=generator.fromScene(room,.04),data=new Uint16Array(target.width*target.height*4);
 renderer.readRenderTargetPixels(target,0,0,target.width,target.height,data);
 if(renderer.getContext().getError()||!data.some(value=>value>0)){
  target.dispose();room.dispose();generator.dispose();throw Error('Cannot read the exact half-float environment');
 }
 return {data,width:target.width,height:target.height,originalTexture:target.texture,
  dispose(){target.dispose();room.dispose();generator.dispose();}};
}
