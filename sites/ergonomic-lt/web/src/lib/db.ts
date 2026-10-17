import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type {SqlValue,SqlCommand} from './sql-types';
const dbs=new Map<string,DatabaseSync>();
export function getDb() {
  const folder=path.resolve(/*turbopackIgnore: true*/ process.env.RUNTIME_DIR||'.runtime');
  let db=dbs.get(folder);if(db)return db;
  mkdirSync(folder,{recursive:true});
  db=new DatabaseSync(path.join(folder,'ergonomic.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS product_edits(id TEXT PRIMARY KEY,data TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS supplier_import(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS quotes(id TEXT PRIMARY KEY,submission_key TEXT NOT NULL UNIQUE,payload TEXT NOT NULL,created_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'new',delivery_status TEXT NOT NULL DEFAULT 'pending',delivery_error TEXT,delivery_attempts INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,window_start INTEGER NOT NULL,count INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS audit_events(id INTEGER PRIMARY KEY,event TEXT NOT NULL,object_id TEXT,created_at TEXT NOT NULL);
  `);
  const quoteColumns=db.prepare('PRAGMA table_info(quotes)').all() as {name:string}[];
  if(!quoteColumns.some(c=>c.name==='delivery_started_at'))db.exec('ALTER TABLE quotes ADD COLUMN delivery_started_at INTEGER');
  dbs.set(folder,db);return db;
}
export function transaction<T>(fn:()=>T):T {
  const db=getDb();db.exec('BEGIN IMMEDIATE');
  try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}
}
export function rateAllowed(key:string,limit:number,windowMs:number):boolean {
  return transaction(()=>{
    const db=getDb(),now=Date.now();
    const row=db.prepare('SELECT window_start,count FROM rate_limits WHERE key=?').get(key) as {window_start:number;count:number}|undefined;
    if(!row||now-row.window_start>=windowMs){db.prepare('INSERT OR REPLACE INTO rate_limits VALUES(?,?,1)').run(key,now);return true;}
    if(row.count>=limit)return false;
    db.prepare('UPDATE rate_limits SET count=count+1 WHERE key=?').run(key);return true;
  });
}
export function saveProductEdit(id:string,edit:Record<string,unknown>) {
  const db=getDb(),prior=db.prepare('SELECT data FROM product_edits WHERE id=?').get(id) as {data:string}|undefined;
  const data={...(prior?JSON.parse(prior.data):{}),...edit,updatedAt:new Date().toISOString()};
  db.prepare('INSERT OR REPLACE INTO product_edits VALUES(?,?,?)').run(id,JSON.stringify(data),data.updatedAt);
  db.prepare('INSERT INTO audit_events(event,object_id,created_at) VALUES(?,?,?)').run('product_edit',id,data.updatedAt);
}

// The web application uses these asynchronous operations on both runtimes.
// The synchronous API remains available to local import/backup scripts.
export async function dbOne<T>(sql:string,...params:SqlValue[]):Promise<T|undefined> {
  return getDb().prepare(sql).get(...params) as T|undefined;
}
export async function dbAll<T>(sql:string,...params:SqlValue[]):Promise<T[]> {
  return getDb().prepare(sql).all(...params) as T[];
}
export async function dbRun(sql:string,...params:SqlValue[]) {
  const result=getDb().prepare(sql).run(...params);return {changes:Number(result.changes)};
}
export async function dbAtomic(commands:SqlCommand[]) {
  return transaction(()=>commands.map(c=>getDb().prepare(c.sql).run(...(c.params||[]))));
}
