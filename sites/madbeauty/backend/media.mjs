import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {optimizeRaster} from '../../../content-studio/src/image-pipeline.mjs';
import {randomId,reject} from './store.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
export const mediaRoot=store=>path.join(path.dirname(store.filename),'media');
export function mediaPublic(a){return {id:a.id,alt:a.alt,variants:a.variants.map(v=>({file:'api/madbeauty/media/'+v.storageFile,width:v.width,height:v.height,bytes:v.bytes,sha256:v.sha256}))};}
export async function prepareMedia(store,{bytes,mime,alt,rights,usage,organizationId}){
 if(!['portrait','gallery'].includes(usage)||!alt?.trim()||alt.length>250||!rights?.trim()||rights.length>600)reject('INVALID_INPUT','Nurodykite vaizdo paskirtį, aprašą ir viešinimo teisę.');
 let output;try{output=await optimizeRaster(bytes,mime);}catch(e){reject('INVALID_IMAGE',e.message);}
 const id=randomId('asset'),root=mediaRoot(store),original=id+'.original',variants=[];await mkdir(root,{recursive:true});await writeFile(path.join(root,original),bytes,{flag:'wx',mode:0o600});
 for(const v of output.variants){const storageFile=id+'-'+v.width+'.webp';await writeFile(path.join(root,storageFile),v.bytes,{flag:'wx'});variants.push({storageFile,width:v.width,height:v.height,bytes:v.bytes.length,sha256:hash(v.bytes)});}
 return {id,organizationId,usage,alt:alt.trim(),rights:rights.trim(),source:{original,mime,bytes:bytes.length,sha256:hash(bytes),...output.source},variants,policy:output.policy,createdAt:new Date(store.clock()).toISOString()};
}
export async function readMedia(store,file,user,platform){
 if(!/^asset_[a-f0-9-]+-\d+\.webp$/.test(file))reject('NOT_FOUND','Vaizdas nerastas.',404);
 const d=store.read(),a=(d.media||[]).find(a=>a.variants.some(v=>v.storageFile===file));if(!a)reject('NOT_FOUND','Vaizdas nerastas.',404);
 const p=platform.profile(a.organizationId),published=p&&(p.gallery.includes(a.id)||p.avatarImageId===a.id),owner=user&&d.memberships.some(m=>m.accountId===user.id&&m.organizationId===a.organizationId);
 if(!published&&!owner&&!user?.operator)reject('NOT_FOUND','Vaizdas nerastas.',404);return readFile(path.join(mediaRoot(store),file));
}
