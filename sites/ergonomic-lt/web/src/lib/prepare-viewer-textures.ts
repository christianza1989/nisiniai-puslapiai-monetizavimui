import {Mesh,Texture,Source,NoColorSpace,type Scene,type WebGLRenderer} from 'three';

export function viewerTextures(scene:Scene):Texture[]{
 const textures=new Set<Texture>();if(scene.environment)textures.add(scene.environment);
 scene.traverseVisible(object=>{if(object instanceof Mesh)for(const material of Array.isArray(object.material)?object.material:[object.material]){
  for(const value of Object.values(material))if(value instanceof Texture)textures.add(value);
 }});
 return [...textures].filter(texture=>!texture.isRenderTargetTexture);
}

/** Decode the original full-resolution material off-thread, then upload in small
 * tasks. HTML image uploads otherwise combine into a long first-render stall.
 * All pixels, dimensions, UVs, sampling and material parameters are retained.
 */
export async function prepareViewerTextures(renderer:Pick<WebGLRenderer,'initTexture'>,scene:Scene,signal:AbortSignal){
 for(const texture of viewerTextures(scene)){
  signal.throwIfAborted();
  const image=texture.image;
  if(typeof HTMLImageElement!=='undefined'&&image instanceof HTMLImageElement&&image.complete&&image.naturalWidth&&typeof createImageBitmap==='function'){
   try{
    const bitmap=await createImageBitmap(image,{imageOrientation:texture.flipY?'flipY':'none',premultiplyAlpha:texture.premultiplyAlpha?'premultiply':'none',colorSpaceConversion:texture.colorSpace===NoColorSpace?'none':'default'});
    if(signal.aborted){bitmap.close();signal.throwIfAborted();}
    // Texture clones may share their original Source; only this texture takes
    // ownership of this bitmap. Captured asset/node IDs and material UUIDs survive.
    texture.source=new Source(bitmap);texture.flipY=false;texture.needsUpdate=true;
    const release=()=>{bitmap.close();texture.removeEventListener('dispose',release);};texture.addEventListener('dispose',release);
   }catch(error){signal.throwIfAborted();/* Preserve the original image path when this browser cannot decode a bitmap. */}
  }
  renderer.initTexture(texture);
  await new Promise<void>(resolve=>setTimeout(resolve,0));
 }
 signal.throwIfAborted();
}
