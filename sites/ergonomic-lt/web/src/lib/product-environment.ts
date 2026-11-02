import {DataTexture,RGBAFormat,HalfFloatType,CubeUVReflectionMapping,LinearFilter,LinearSRGBColorSpace,PMREMGenerator,REVISION,type WebGLRenderer,type Texture} from 'three';
import data from '../../content/product-environment.json';
import {verifiedViewerAsset} from './verified-viewer-assets';
import {roomEnvironment} from './showroom';
import {productSceneSettings} from './viewer-scene';

export type ProductEnvironment={texture:Texture;dispose():void;source?:'precomputed'|'generated'};
export async function productEnvironment(renderer:WebGLRenderer,signal:AbortSignal):Promise<ProductEnvironment>{
 try{
  if(REVISION!==data.threeRevision||productSceneSettings.lighting!==data.lighting)throw Error('Environment recipe changed');
  const bytes=await verifiedViewerAsset(data,signal);
  if(bytes.byteLength!==data.width*data.height*8)throw Error('Invalid environment dimensions');
  const texture=new DataTexture(new Uint16Array(bytes),data.width,data.height,RGBAFormat,HalfFloatType);
  texture.mapping=CubeUVReflectionMapping;texture.minFilter=texture.magFilter=LinearFilter;
  texture.colorSpace=LinearSRGBColorSpace;texture.generateMipmaps=false;texture.flipY=false;texture.needsUpdate=true;
  return {texture,dispose:()=>texture.dispose(),source:'precomputed'};
 }catch(error){
  signal.throwIfAborted();
  // A missing/stale precomputed asset retains the original full-quality path.
  const generator=new PMREMGenerator(renderer),room=roomEnvironment(productSceneSettings.lighting);
  try{return Object.assign(generator.fromScene(room,.04),{source:'generated' as const});}
  finally{room.dispose();generator.dispose();}
 }
}
