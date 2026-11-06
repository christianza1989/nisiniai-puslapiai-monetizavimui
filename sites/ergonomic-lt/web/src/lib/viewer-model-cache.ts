import {Mesh,Texture,type Object3D,type Material,type BufferGeometry} from 'three';
import {copyViewerTextureIdentity} from './prepare-viewer-textures';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

export function disposeViewerModel(root:Object3D){
 const geometries=new Set<BufferGeometry>(),materials=new Set<Material>(),textures=new Set<Texture>();
 root.traverse(o=>{if(o instanceof Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
 for(const m of materials){for(const v of Object.values(m))if(v instanceof Texture)textures.add(v);m.dispose();}
 geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());
}

/** Parsed, source-tagged originals are private templates. Every scene owns its
 * geometry, materials and texture objects; neither finishing nor cleanup can
 * mutate a cached original or another in-flight view. World matrices survive. */
export function cloneViewerModel(original:Object3D){
 const result=clone(original),geometries=new Map<BufferGeometry,BufferGeometry>(),materials=new Map<Material,Material>(),textures=new Map<Texture,Texture>();
 const material=(m:Material)=>{let c=materials.get(m);if(!c){c=m.clone();for(const [k,v]of Object.entries(m))if(v instanceof Texture){let t=textures.get(v);if(!t){t=v.clone();copyViewerTextureIdentity(v,t);textures.set(v,t);}(c as unknown as Record<string,unknown>)[k]=t;}materials.set(m,c);}return c;};
 result.traverse(o=>{if(o instanceof Mesh){const source=o.geometry as BufferGeometry;let g=geometries.get(source);if(!g){g=source.clone();geometries.set(source,g);}o.geometry=g;o.material=Array.isArray(o.material)?o.material.map(material):material(o.material);}});
 return result;
}
function weight(root:Object3D){
 const arrays=new Set<ArrayBufferLike>(),images=new Set<unknown>();let bytes=0;
 root.traverse(o=>{if(o instanceof Mesh){for(const a of [o.geometry.index,...Object.values(o.geometry.attributes)])if(a){const data='data'in a?a.data.array:a.array;if(!arrays.has(data.buffer)){arrays.add(data.buffer);bytes+=data.buffer.byteLength;}}for(const m of Array.isArray(o.material)?o.material:[o.material])for(const v of Object.values(m))if(v instanceof Texture&&v.image&&!images.has(v.image)){images.add(v.image);bytes+=(v.image.width||0)*(v.image.height||0)*4;}}});return bytes;
}
export class ViewerModelCache{
 private entries=new Map<string,{root:Object3D;bytes:number}>();private bytes=0;
 constructor(private readonly limit=96*1024*1024){}
 get(key:string){const e=this.entries.get(key);if(!e)return;this.entries.delete(key);this.entries.set(key,e);return cloneViewerModel(e.root);}
 put(key:string,root:Object3D){const bytes=weight(root);if(bytes>this.limit)return false;const old=this.entries.get(key);if(old){this.bytes-=old.bytes;disposeViewerModel(old.root);}this.entries.delete(key);this.entries.set(key,{root,bytes});this.bytes+=bytes;while(this.bytes>this.limit){const k=this.entries.keys().next().value!,e=this.entries.get(k)!;this.entries.delete(k);this.bytes-=e.bytes;disposeViewerModel(e.root);}return true;}
 clear(){this.entries.forEach(e=>disposeViewerModel(e.root));this.entries.clear();this.bytes=0;}
 get size(){return this.bytes;}
}
