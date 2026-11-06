import {Mesh,Texture,Source,NoColorSpace,type Object3D,type Scene,type WebGLRenderer} from 'three';

const imageIdentities=new WeakMap<Texture,string>();
export function copyViewerTextureIdentity(from:Texture,to:Texture){const id=imageIdentities.get(from);if(id)imageIdentities.set(to,id);}
/** Only byte-identical embedded images from the verified GLB may share a GPU
 * upload across distinct components. Names, geometry and material IDs are never
 * used as image identity; external images retain their original source identity. */
export async function tagViewerTextureSources(root:Object3D,parser:{associations:{get(texture:Texture):{textures?:number}|undefined};json:{textures?:{source?:number}[];images?:{bufferView?:number;mimeType?:string}[];bufferViews?:{buffer?:number}[];buffers?:{uri?:string}[]};getDependency(type:string,index:number):Promise<ArrayBuffer>}){
 const textures=new Set<Texture>();root.traverse(o=>{if(o instanceof Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])for(const value of Object.values(m))if(value instanceof Texture)textures.add(value);});
 const hashes=new Map<number,Promise<string>>();
 await Promise.all([...textures].map(async texture=>{const index=parser.associations.get(texture)?.textures,image=index===undefined?undefined:parser.json.images?.[parser.json.textures?.[index]?.source??-1],view=image?.bufferView;
  if(view===undefined||parser.json.buffers?.[parser.json.bufferViews?.[view]?.buffer??-1]?.uri)return;
  let pending=hashes.get(view);if(!pending){pending=parser.getDependency('bufferView',view).then(async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join(''));hashes.set(view,pending);}imageIdentities.set(texture,(image?.mimeType||'')+':'+await pending);
 }));
}

type Upload={image:unknown;signature:string;source:Texture['source'];flipY:boolean;holder:Texture;bytes:number;bitmap?:ImageBitmap;users:number;retained:boolean};
/** Renderer-local GPU leases: keep the exact immutable pixels uploaded across
 * assembly replacements. Active textures remain valid when an LRU lease expires. */
export class ViewerTextureCache{
 private entries:Upload[]=[];private assigned=new WeakMap<Texture,Upload>();private bytes=0;
 constructor(private renderer:Pick<WebGLRenderer,'initTexture'>,private limit=96*1024*1024){}
 private release(entry:Upload){if(!entry.retained&&entry.users===0)entry.bitmap?.close();}
 private attach(texture:Texture,entry:Upload){
  if(this.assigned.get(texture)===entry)return;
  this.assigned.set(texture,entry);entry.users++;
  const release=()=>{texture.removeEventListener('dispose',release);this.assigned.delete(texture);entry.users--;this.release(entry);};texture.addEventListener('dispose',release);
  if(texture.source!==entry.source||texture.flipY!==entry.flipY){texture.source=entry.source;texture.flipY=entry.flipY;
   // Updating the texture binding must not mark shared immutable pixels dirty.
   texture.version++;
  }
 }
 async prepare(texture:Texture,signal:AbortSignal){
  signal.throwIfAborted();const assigned=this.assigned.get(texture);if(assigned){this.renderer.initTexture(texture);return;}
  const image=texture.image,identity=imageIdentities.get(texture)||image,signature=JSON.stringify([image?.constructor?.name,texture.flipY,texture.premultiplyAlpha,texture.colorSpace,texture.wrapS,texture.wrapT,texture.minFilter,texture.magFilter,texture.anisotropy,texture.format,texture.type,texture.internalFormat,texture.generateMipmaps,texture.unpackAlignment]);
  let entry=this.entries.find(e=>e.image===identity&&e.signature===signature);
  if(entry){this.entries.splice(this.entries.indexOf(entry),1);this.entries.push(entry);}
  else{
   let bitmap:ImageBitmap|undefined,source=texture.source,flipY=texture.flipY;
   if(typeof HTMLImageElement!=='undefined'&&image instanceof HTMLImageElement&&image.complete&&image.naturalWidth&&typeof createImageBitmap==='function'){
    try{bitmap=await createImageBitmap(image,{imageOrientation:flipY?'flipY':'none',premultiplyAlpha:texture.premultiplyAlpha?'premultiply':'none',colorSpaceConversion:texture.colorSpace===NoColorSpace?'none':'default'});if(signal.aborted){bitmap.close();signal.throwIfAborted();}source=new Source(bitmap);flipY=false;}catch{signal.throwIfAborted();}
   }
   const dimensions=image as {data?:{byteLength:number};width?:number;height?:number}|undefined;
   const bytes=dimensions?.data?.byteLength||((dimensions?.width||0)*(dimensions?.height||0)*4),holder=texture.clone();holder.source=source;holder.flipY=flipY;holder.version++;
   entry={image:identity,signature,source,flipY,holder,bytes,bitmap,users:0,retained:true};this.entries.push(entry);this.bytes+=bytes;
   this.renderer.initTexture(holder);
  }
  this.attach(texture,entry);this.renderer.initTexture(texture);
  while(this.bytes>this.limit||this.entries.length>64){const oldest=this.entries.shift()!;oldest.retained=false;this.bytes-=oldest.bytes;oldest.holder.dispose();this.release(oldest);}
 }
 clear(){for(const e of this.entries){e.retained=false;e.holder.dispose();this.release(e);}this.entries=[];this.bytes=0;}
 get size(){return this.bytes;}
}

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
export async function prepareViewerTextures(renderer:Pick<WebGLRenderer,'initTexture'>,scene:Scene,signal:AbortSignal,cache?:ViewerTextureCache){
 for(const texture of viewerTextures(scene)){
  signal.throwIfAborted();
  if(cache){await cache.prepare(texture,signal);continue;}
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
