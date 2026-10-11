import {ApiError} from './primitives.mjs';

// The account deletion transaction records this journal before identity is gone.
// Child objects are scrubbed idempotently; a crash never restores public access.
export function createCommunityLifecycle(store,getObject){
 const db=store.db;
 db.exec(`CREATE TABLE IF NOT EXISTS community_erasure_jobs(actor TEXT PRIMARY KEY,stage TEXT NOT NULL,rooms TEXT NOT NULL,cursor TEXT NOT NULL,created_at INTEGER NOT NULL) STRICT;
 CREATE TRIGGER IF NOT EXISTS community_account_deleted AFTER DELETE ON accounts BEGIN
 INSERT OR IGNORE INTO community_erasure_jobs VALUES('person:'||OLD.id,'own','[]','',unixepoch()*1000);
 DELETE FROM community_registry WHERE actor='person:'||OLD.id;
 END;`);
 const call=async(kind,id,method,input)=>{const r=await getObject(kind+':'+id).call(kind,id,{actor:id,maintenance:true},method,input);if(r.error)throw new ApiError(r.error.code,r.error.message,r.error.status);return r.result;};
 return {
  async flush(){
   if(!getObject)return {pending:0};
   const jobs=db.prepare('SELECT * FROM community_erasure_jobs ORDER BY created_at LIMIT 4').all();
   for(const job of jobs){
    if(job.stage==='own'){
     const own=await call('person',job.actor,'export',{});
     db.prepare("UPDATE community_erasure_jobs SET rooms=?,stage='rooms' WHERE actor=?").run(JSON.stringify(own.references),job.actor);
     await call('person',job.actor,'eraseActor',{target:job.actor});
     job.rooms=JSON.stringify(own.references);job.stage='rooms';
    }
    // Re-run own erasure as well after a crash between journal and object writes.
    if(job.stage==='rooms'){
     await call('person',job.actor,'eraseActor',{target:job.actor});
     for(const room of JSON.parse(job.rooms))await call('conversation',room,'eraseActor',{target:job.actor});
     db.prepare("UPDATE community_erasure_jobs SET stage='others' WHERE actor=?").run(job.actor);job.stage='others';
    }
    if(job.stage==='others'){
     const authors=db.prepare('SELECT actor FROM community_registry WHERE actor>? ORDER BY actor LIMIT 20').all(job.cursor);
     for(const a of authors){const r=await call('person',a.actor,'eraseActor',{target:job.actor});for(const room of r.rooms)await call('conversation',room,'eraseActor',{target:job.actor});}
     if(authors.length===20)db.prepare('UPDATE community_erasure_jobs SET cursor=? WHERE actor=?').run(authors.at(-1).actor,job.actor);
     else db.prepare('DELETE FROM community_erasure_jobs WHERE actor=?').run(job.actor);
    }
   }
   return {pending:db.prepare('SELECT COUNT(*) AS n FROM community_erasure_jobs').get().n};
  },
 };
}
