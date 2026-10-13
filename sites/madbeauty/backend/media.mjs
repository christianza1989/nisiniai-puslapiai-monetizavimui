import {readFile,writeFile,mkdir,unlink} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {optimizeRaster} from '../../../content-studio/src/image-pipeline.mjs';
import {randomId,reject} from './primitives.mjs';
import {canManageProfile} from './permissions.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
export const mediaRoot=store=>path.join(path.dirname(store.filename),'media');
export {mediaPublic} from './primitives.mjs';
const files={readFile,writeFile,mkdir,unlink};
export async function discardMedia(store,asset,{io=files}={}){
 if(!/^asset_[a-f0-9-]+$/.test(asset.id))throw Error('Invalid prepared media identity');
 const names=[asset.source.original,...asset.variants.map(v=>v.storageFile)];
 if(names.some(n=>n!==asset.id+'.original'&&!new RegExp('^'+asset.id+'-\\d+\\.webp$').test(n)))throw Error('Invalid prepared media path');
 const results=await Promise.allSettled(names.map(n=>io.unlink(path.join(mediaRoot(store),n)).catch(e=>{if(e.code!=='ENOENT')throw e;})));
 if(results.some(r=>r.status==='rejected'))throw Error('Prepared media cleanup unavailable');
}
export async function prepareMedia(store,{bytes,mime,alt,rights,usage,organizationId,rightsConfirmedAt,rightsConfirmedBy},{io=files}={}){
 if(!['portrait','gallery'].includes(usage)||!alt?.trim()||alt.length>250||!rights?.trim()||rights.length>600)reject('INVALID_INPUT','Nurodykite vaizdo paskirtį, aprašą ir viešinimo teisę.');
 let output;try{output=await optimizeRaster(bytes,mime);}catch(e){reject('INVALID_IMAGE',e.message);}
 const id=randomId('asset'),root=mediaRoot(store),original=id+'.original',variants=[];
 const asset={id,source:{original},variants};await io.mkdir(root,{recursive:true});
 try{
  await io.writeFile(path.join(root,original),bytes,{flag:'wx',mode:0o600});
  for(const v of output.variants){const storageFile=id+'-'+v.width+'.webp';variants.push({storageFile,width:v.width,height:v.height,bytes:v.bytes.length,sha256:hash(v.bytes)});await io.writeFile(path.join(root,storageFile),v.bytes,{flag:'wx',mode:0o600});}
 }catch{await discardMedia(store,asset,{io});reject('MEDIA_UNAVAILABLE','Vaizdo išsaugoti nepavyko.',503);}
 return {id,organizationId,usage,alt:alt.trim(),rights:rights.trim(),...(rightsConfirmedAt?{rightsConfirmedAt,rightsConfirmedBy}:{}),source:{original,mime,bytes:bytes.length,sha256:hash(bytes),...output.source},variants,policy:output.policy,createdAt:new Date(store.clock()).toISOString()};
}
export async function readMedia(store,file,user,platform){
 if(!/^asset_[a-f0-9-]+-\d+\.webp$/.test(file))reject('NOT_FOUND','Vaizdas nerastas.',404);
 const d=store.read(),a=(d.media||[]).find(a=>a.variants.some(v=>v.storageFile===file));if(!a)reject('NOT_FOUND','Vaizdas nerastas.',404);
 const p=platform.profile(a.organizationId),published=p?.media.some(m=>m.id===a.id),owner=user&&canManageProfile(d,user,a.organizationId);
 if(!published&&!owner&&!user?.operator)reject('NOT_FOUND','Vaizdas nerastas.',404);
 let bytes;try{bytes=await readFile(path.join(mediaRoot(store),file));}catch{reject('MEDIA_UNAVAILABLE','Vaizdas laikinai nepasiekiamas.',503);}
 const variant=a.variants.find(v=>v.storageFile===file);if((variant.bytes&&bytes.length!==variant.bytes)||(variant.sha256&&hash(bytes)!==variant.sha256))reject('MEDIA_UNAVAILABLE','Vaizdas laikinai nepasiekiamas.',503);return bytes;
}
