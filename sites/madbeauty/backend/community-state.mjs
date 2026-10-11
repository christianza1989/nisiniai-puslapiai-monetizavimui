import {reject} from './primitives.mjs';
// One coordination atom: a person, an organization feed, or a conversation.
// This schema never opens or copies the booking database.
export const communitySchema=`CREATE TABLE IF NOT EXISTS community_documents(id TEXT PRIMARY KEY,version INTEGER NOT NULL,data TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS community_limits(bucket TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL) STRICT;`;
export function communityState(db,transaction,clock=()=>Date.now()){
 db.exec(communitySchema);
 return {db,clock,transaction,
  read(id,initial){const r=db.prepare('SELECT version,data FROM community_documents WHERE id=?').get(id);return r?{...JSON.parse(r.data),version:r.version}:{...structuredClone(initial),version:0};},
  write(id,data,version){const next={...data,version:version+1},encoded=JSON.stringify(next);if(Buffer.byteLength(encoded)>1024*1024)reject('LIMIT','Pasiektas šio profilio ar pokalbio turinio limitas.',409);const r=db.prepare('INSERT INTO community_documents(id,version,data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET version=excluded.version,data=excluded.data WHERE community_documents.version=?').run(id,version+1,encoded,version);if(!r.changes)throw Error('Community write conflict');return next;},
 };
}
