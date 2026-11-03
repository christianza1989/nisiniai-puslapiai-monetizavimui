import {createHash} from 'node:crypto';
import path from 'node:path';
import {customerKey} from './customer-capability';
import {customerGlb} from './customer-glb';
import {customerSourceAsset} from './customer-source-asset';
import type {CustomerAsset} from './customer-configuration';
type SourceAsset={asset:string;assetSha256?:string;bytes?:number};
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const prepared=new Map<string,Promise<CustomerAsset>>();
export const customerSceneName=(name:string)=>'n_'+customerKey().id('scene',name);
const publicMime=(asset:string)=>({'.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.bin':'application/octet-stream','.f16':'application/octet-stream'}[path.extname(asset).toLowerCase()]);
function projectGlb(bytes:Uint8Array,token:string){const cap=customerKey();return customerGlb(bytes,customerSceneName,uri=>'/media/p/'+token+'?resource='+cap.id('resource',uri));}
export async function prepareCustomerAsset(source:SourceAsset):Promise<CustomerAsset>{
 const key=customerKey().id('asset-cache',source),known=prepared.get(key);if(known)return known;
 const pending=prepare(source);prepared.set(key,pending);if(prepared.size>512)prepared.delete(prepared.keys().next().value!);
 try{return await pending;}catch(error){prepared.delete(key);throw error;}
}
async function prepare(source:SourceAsset):Promise<CustomerAsset>{
 const cap=customerKey(),bytes=await customerSourceAsset(source.asset),sha=digest(bytes);
 if(source.assetSha256&&source.assetSha256!==sha||source.bytes!==undefined&&source.bytes!==bytes.byteLength)throw Error('Source asset identity mismatch');
 const mime=publicMime(source.asset);if(!mime)throw Error('Unsupported public asset');
 const token=cap.seal('asset',{asset:source.asset,assetSha256:sha,bytes:bytes.byteLength});
 const body=source.asset.endsWith('.glb')?projectGlb(bytes,token):bytes;
 return {url:'/media/p/'+token,sha256:digest(body),bytes:body.byteLength};
}
export async function customerAssetResponse(token:string,request:Request){
 const cap=customerKey(),source=cap.open<SourceAsset>('asset',token);
 if(!source||typeof source.asset!=='string')throw Error('Invalid asset');
 const bytes=await customerSourceAsset(source.asset),sha=digest(bytes);if(source.assetSha256&&sha!==source.assetSha256||source.bytes!==undefined&&bytes.byteLength!==source.bytes)throw Error('Source identity changed');
 let mime=publicMime(source.asset);if(!mime)throw Error('Unsupported asset');
 let body:Uint8Array=source.asset.endsWith('.glb')?projectGlb(bytes,token):bytes;
 const resource=new URL(request.url).searchParams.get('resource');
 if(resource){
  if(!source.asset.endsWith('.glb')||!/^[a-f0-9]{32}$/.test(resource))throw Error('Invalid resource');
  const buffer=Buffer.from(bytes),size=buffer.readUInt32LE(12),doc=JSON.parse(buffer.subarray(20,20+size).toString('utf8'));const uris:string[]=[];
  const walk=(v:any)=>{if(!v||typeof v!=='object')return;for(const[k,x]of Object.entries(v)){if(k==='uri'&&typeof x==='string')uris.push(x);else walk(x);}};walk(doc);
  const uri=uris.find(uri=>cap.id('resource',uri)===resource);if(!uri)throw Error('Unknown resource');
  const base=new URL('https://internal.invalid'+source.asset),resolved=new URL(uri,base);if(resolved.origin!==base.origin)throw Error('External resource is not admitted');
  mime=publicMime(resolved.pathname);if(!mime||resolved.pathname.endsWith('.glb'))throw Error('Unsupported resource');body=await customerSourceAsset(resolved.pathname);
 }
 const headers={'Content-Type':mime,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff',ETag:'"'+digest(body)+'"'};
 if(request.headers.get('If-None-Match')===headers.ETag)return new Response(null,{status:304,headers});
 return new Response(request.method==='HEAD'?null:new Uint8Array(body),{headers:{...headers,'Content-Length':String(body.byteLength)}});
}
