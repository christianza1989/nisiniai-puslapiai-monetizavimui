import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
let database:DatabaseSync|undefined;
function local(){
 if(database)return database;
 const root=process.env.RUNTIME_DIR||'.runtime';mkdirSync(root,{recursive:true});
 database=new DatabaseSync(path.join(root,'publication.sqlite'));
 database.exec(readFileSync(path.join(process.cwd(),'publication-migrations/0001.sql'),'utf8'));
 database.exec(readFileSync(path.join(process.cwd(),'publication-migrations/0002.sql'),'utf8'));
 database.exec(readFileSync(path.join(process.cwd(),'publication-migrations/0003.sql'),'utf8'));
 return database;
}
export async function publicationOne<T>(sql:string,...args:(string|number|null)[]):Promise<T|undefined>{return local().prepare(sql).get(...args) as T|undefined;}
export async function publicationAll<T>(sql:string,...args:(string|number|null)[]):Promise<T[]>{return local().prepare(sql).all(...args) as T[];}
export async function publicationBatch(commands:{sql:string;params:(string|number|null)[]}[]){
 const db=local();db.exec('BEGIN IMMEDIATE');
 try{const results=commands.map(c=>db.prepare(c.sql).run(...c.params));db.exec('COMMIT');return results.map(r=>({changes:Number(r.changes)}));}
 catch(e){db.exec('ROLLBACK');throw e;}
}
