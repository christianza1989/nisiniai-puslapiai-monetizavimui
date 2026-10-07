import {createHash} from 'node:crypto';
import {optimizeRasterWithImages} from '../../../content-studio/src/cloudflare-image-pipeline.mjs';
import {randomId,reject} from '../backend/primitives.mjs';
import {canManageProfile} from '../backend/permissions.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

export function createMedia(env){
 return {
  async discardMedia(asset){await env.MEDIA.delete([asset.source.original,...asset.variants.map(v=>'variants/'+v.storageFile)]);},
  async prepareMedia(store,{bytes,mime,alt,rights,usage,organizationId,rightsConfirmedAt,rightsConfirmedBy}){
   if(!env.MEDIA||!env.IMAGES)reject('MEDIA_UNAVAILABLE','Vaizdų įkėlimas laikinai nepasiekiamas.',503);
   if(!['portrait','gallery'].includes(usage)||!alt?.trim()||alt.length>250||!rights?.trim()||rights.length>600)reject('INVALID_INPUT','Nurodykite vaizdo paskirtį, aprašą ir viešinimo teisę.');
   const count=(store.read().media||[]).filter(a=>a.organizationId===organizationId).length;
   if(count>=24)reject('LIMIT','Profilio vaizdų limitas pasiektas.');
   let output;try{output=await optimizeRasterWithImages(env.IMAGES,bytes,mime);}catch{reject('INVALID_IMAGE','Vaizdo paruošti nepavyko. Patikrinkite formatą ir matmenis.');}
   const id=randomId('asset'),original='originals/'+id,variants=[],written=[];
   const objects=[{key:original,value:bytes,httpMetadata:{contentType:mime}},...output.variants.map(v=>{const storageFile=id+'-'+v.width+'.webp';variants.push({storageFile,width:v.width,height:v.height,bytes:v.bytes.length,sha256:hash(v.bytes)});return {key:'variants/'+storageFile,value:v.bytes,httpMetadata:{contentType:'image/webp'}};})];
   try{
    if(env.MEDIA.putMany)await env.MEDIA.putMany(objects);
    else for(const object of objects){written.push(object.key);await env.MEDIA.put(object.key,object.value,{httpMetadata:object.httpMetadata});}
   }catch{await env.MEDIA.delete(written);reject('MEDIA_UNAVAILABLE','Vaizdo išsaugoti nepavyko.',503);}
   return {id,organizationId,usage,alt:alt.trim(),rights:rights.trim(),...(rightsConfirmedAt?{rightsConfirmedAt,rightsConfirmedBy}:{}),source:{original,mime,bytes:bytes.length,sha256:hash(bytes),...output.source},variants,policy:output.policy,createdAt:new Date(store.clock()).toISOString()};
  },
  async readMedia(store,file,user,platform){
   if(!/^asset_[a-f0-9-]+-\d+\.webp$/.test(file))reject('NOT_FOUND','Vaizdas nerastas.',404);
   const d=store.read(),asset=(d.media||[]).find(a=>a.variants.some(v=>v.storageFile===file));
   if(!asset)reject('NOT_FOUND','Vaizdas nerastas.',404);
   const p=platform.profile(asset.organizationId),published=p?.media.some(m=>m.id===asset.id),owner=user&&canManageProfile(d,user,asset.organizationId);
   if(!published&&!owner&&!user?.operator)reject('NOT_FOUND','Vaizdas nerastas.',404);
   let data;try{data=await env.MEDIA.get('variants/'+file);}catch{reject('MEDIA_UNAVAILABLE','Vaizdas laikinai nepasiekiamas.',503);}if(!data)reject('NOT_FOUND','Vaizdas nerastas.',404);return data.arrayBuffer();
  },
 };
}
