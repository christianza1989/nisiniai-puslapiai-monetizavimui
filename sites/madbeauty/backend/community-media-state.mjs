import {createHash} from 'node:crypto';
import {reject} from './primitives.mjs';

const missing=()=>reject('NOT_FOUND','Nuotrauka nerasta.',404);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const chunkSize=128*1024;
const quota=50*1024*1024;
export const communityMediaSchema=`
CREATE TABLE IF NOT EXISTS community_media(id TEXT PRIMARY KEY,owner TEXT NOT NULL,operation TEXT NOT NULL,manifest TEXT NOT NULL,bytes INTEGER NOT NULL,created_at INTEGER NOT NULL,attached_to TEXT,UNIQUE(owner,operation)) STRICT;
CREATE TABLE IF NOT EXISTS community_media_parts(id TEXT NOT NULL,width INTEGER NOT NULL,part INTEGER NOT NULL,data BLOB NOT NULL,PRIMARY KEY(id,width,part),FOREIGN KEY(id) REFERENCES community_media(id) ON DELETE CASCADE) STRICT;`;

// These private SQL objects contain only metadata-free WebP variants.
// Originals and booking-gallery records never enter this community database.
export function communityMediaState(store){
 store.db.exec(communityMediaSchema);
 const get=id=>store.db.prepare('SELECT * FROM community_media WHERE id=?').get(id);
 const remove=id=>{store.db.prepare('DELETE FROM community_media_parts WHERE id=?').run(id);store.db.prepare('DELETE FROM community_media WHERE id=?').run(id);};
 return {
  register(owner,{asset,objects,operation}){
   if(!/^asset_[a-f0-9-]+$/.test(asset?.id)||typeof operation!=='string'||operation.length<8||operation.length>100)reject('INVALID_INPUT','Netinkama nuotraukos tapatybė.');
   return store.transaction(()=>{
    const prior=store.db.prepare('SELECT id,manifest FROM community_media WHERE owner=? AND operation=?').get(owner,operation);
    if(prior)return JSON.parse(prior.manifest);
    if(!Array.isArray(asset.variants)||!asset.variants.length||asset.variants.length>8)reject('INVALID_IMAGE','Nuotraukos variantai neparuošti.');
    const variants=asset.variants.map(v=>{const object=objects.find(o=>o.key==='variants/'+v.storageFile),bytes=object?.value;if(!(bytes instanceof Uint8Array)||bytes.length!==v.bytes||digest(bytes)!==v.sha256||!Number.isInteger(v.width)||v.width<1)reject('INVALID_IMAGE','Nuotraukos variantas neatitinka manifest.');return {...v,bytes};});
    const bytes=variants.reduce((n,v)=>n+v.bytes.length,0),used=store.db.prepare('SELECT COUNT(*) AS count,COALESCE(SUM(bytes),0) AS bytes FROM community_media').get();
    if(used.count>=120||used.bytes+bytes>quota)reject('LIMIT','Pasiektas šio profilio ar pokalbio nuotraukų limitas.',409);
    const manifest={id:asset.id,alt:asset.alt,rights:asset.rights,rightsConfirmedAt:asset.rightsConfirmedAt,rightsConfirmedBy:asset.rightsConfirmedBy,policy:asset.policy,variants:asset.variants,createdAt:asset.createdAt};
    store.db.prepare('INSERT INTO community_media(id,owner,operation,manifest,bytes,created_at) VALUES(?,?,?,?,?,?)').run(asset.id,owner,operation,JSON.stringify(manifest),bytes,store.clock());
    for(const v of variants)for(let offset=0,part=0;offset<v.bytes.length;offset+=chunkSize,part++)store.db.prepare('INSERT INTO community_media_parts(id,width,part,data) VALUES(?,?,?,?)').run(asset.id,v.width,part,v.bytes.slice(offset,offset+chunkSize));
    return manifest;
   });
  },
  attach(owner,ids,entity,max){
   if(!Array.isArray(ids)||ids.length>max||new Set(ids).size!==ids.length)reject('INVALID_INPUT','Patikrink nuotraukų skaičių.');
   for(const id of ids){const row=get(id);if(!row||row.owner!==owner||row.attached_to&&row.attached_to!==entity)missing();}
   for(const id of ids)store.db.prepare('UPDATE community_media SET attached_to=? WHERE id=?').run(entity,id);
   return ids;
  },
  read(id,entity,width){
   const row=get(id);if(!row||row.attached_to!==entity)missing();const manifest=JSON.parse(row.manifest),variant=manifest.variants.find(v=>v.width===Number(width))||manifest.variants.find(v=>v.width===800)||manifest.variants.at(-1);
   const parts=store.db.prepare('SELECT data FROM community_media_parts WHERE id=? AND width=? ORDER BY part').all(id,variant.width),bytes=Buffer.concat(parts.map(p=>Buffer.from(p.data)));
   if(bytes.length!==variant.bytes||digest(bytes)!==variant.sha256)reject('MEDIA_UNAVAILABLE','Nuotrauka laikinai nepasiekiama.',503);
   return {bytes,alt:manifest.alt,width:variant.width,height:variant.height};
  },
  details(ids,entity){return ids.flatMap(id=>{const row=get(id);if(!row||row.attached_to!==entity)return [];const m=JSON.parse(row.manifest);return [{id,alt:m.alt,variants:m.variants.map(({width,height})=>({width,height}))}];});},
  cleanup(liveEntities){
   const now=store.clock(),rows=store.db.prepare('SELECT id,attached_to,created_at FROM community_media').all();let removed=0;
   for(const r of rows)if(r.attached_to?!liveEntities.has(r.attached_to):r.created_at<now-24*60*60*1000){remove(r.id);removed++;}
   return {removed};
  },
 };
}
