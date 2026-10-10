import * as files from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {reject} from './primitives.mjs';
import {mediaRoot} from './media.mjs';
import {organizationMediaObjects} from './organization-media.mjs';
import {createSqlMediaBucket} from '../cloudflare/media-bucket.mjs';
const json=JSON.stringify,hash=b=>createHash('sha256').update(b).digest('hex');
const integrity=()=>reject('MEDIA_IMPORT_INTEGRITY','Medijos importo failai arba indeksas nesutampa.',409);
const changed=()=>reject('VERSION_CONFLICT','Organizacijos medija pasikeitė. Pakartokite importą.',409);
function authorize(store,input){
 if(typeof input.organizationId!=='string'||!input.organizationId||input.organizationId.length>160)reject('INVALID_INPUT','Nurodykite organizaciją.');
 if(store.db.prepare('SELECT operator FROM accounts WHERE site_id=? AND id=?').get(store.siteId,input.operatorAccountId)?.operator!==1)reject('FORBIDDEN','Operatoriaus prieiga neleidžiama.',403);
 if(store.readCollections(['isDemo']).isDemo!==false)reject('HANDOFF_SCOPE','Testinis katalogas neimportuojamas į tikrą saugyklą.',409);
 const organization=store.recordById('organizations',input.organizationId);if(!organization)reject('NOT_FOUND','Organizacija nerasta.',404);store.assertOrganizationWritable(input.organizationId);return organization;
}
// Local maintenance only, before freeze. Each asset commits atomically; a failed
// later asset leaves earlier copies resumable. Originals/variants on disk remain
// untouched, and no transform, new ID or public media URL is introduced.
export async function importFilesystemMedia(store,input,{io=files}={}){
 const organization=authorize(store,input),assets=store.organizationRecords('media',input.organizationId);if(assets.length>24)reject('CAPACITY','Organizacijos medijos limitas viršytas.',503);
 const bucket=createSqlMediaBucket(store);let expected=json(assets),imported=0,alreadyImported=0,totalBytes=0;
 for(let index=0;index<assets.length;index++){
  const asset=assets[index],canonical={...asset,source:{...asset.source,original:'originals/'+asset.id}},descriptors=organizationMediaObjects([{collection:'media',raw:json(canonical)}],input.organizationId);totalBytes+=descriptors.reduce((n,o)=>n+o.bytes,0);
  if(asset.source.original===canonical.source.original){
   for(const descriptor of descriptors){const row=store.db.prepare('SELECT bytes,mime,sha256 FROM media_objects WHERE key=?').get(descriptor.key);if(!row||row.bytes!==descriptor.bytes||row.mime!==descriptor.mime||row.sha256!==descriptor.sha256)integrity();let object;try{object=await bucket.get(descriptor.key);}catch{integrity();}if(!object||hash(new Uint8Array(await object.arrayBuffer()))!==descriptor.sha256)integrity();}
   store.transaction(()=>{if(authorize(store,input).version!==organization.version||json(store.organizationRecords('media',input.organizationId))!==expected)changed();});alreadyImported++;continue;
  }
  if(asset.source.original!==asset.id+'.original'||store.filename===':memory:')integrity();
  let root;try{root=await io.realpath(mediaRoot(store));}catch{integrity();}
  const objects=[];
  for(const descriptor of descriptors){
   const name=descriptor.key===canonical.source.original?asset.source.original:descriptor.key.slice('variants/'.length),file=path.resolve(root,name);
   if(!file.startsWith(root+path.sep))integrity();let bytes;
   try{const stat=await io.lstat(file),actual=await io.realpath(file);if(!stat.isFile()||!actual.startsWith(root+path.sep)||stat.size!==descriptor.bytes)integrity();bytes=await io.readFile(file);}catch{integrity();}
   if(bytes.length!==descriptor.bytes||hash(bytes)!==descriptor.sha256)integrity();objects.push({key:descriptor.key,value:bytes,httpMetadata:{contentType:descriptor.mime}});
  }
  store.transaction(()=>{
   if(authorize(store,input).version!==organization.version||json(store.organizationRecords('media',input.organizationId))!==expected)changed();
   // Never overwrite an existing key, including one left by another importer.
   if(descriptors.some(o=>store.db.prepare('SELECT key FROM media_objects WHERE key=?').get(o.key)))integrity();
   bucket.putManySync(objects);const view=store.readOrganization(input.organizationId),current=view.media.findIndex(a=>a.id===asset.id);if(current<0)changed();view.media[current]=canonical;store.writeOrganization(view);
  });
  assets[index]=canonical;expected=json(assets);imported++;
 }
 return {organizationId:input.organizationId,assets:assets.length,imported,alreadyImported,bytes:totalBytes,filesystemWrites:0};
}
