import {env} from 'cloudflare:workers';
import type {SqlValue,SqlCommand} from '../lib/sql-types';

export function getDb():never {throw new Error('Cloudflare duomenims naudokite asinchroninę D1 sąsają.');}
export async function dbOne<T>(sql:string,...params:SqlValue[]):Promise<T|undefined> {
  return (await env.DB.prepare(sql).bind(...params).first<T>())??undefined;
}
export async function dbAll<T>(sql:string,...params:SqlValue[]):Promise<T[]> {
  return (await env.DB.prepare(sql).bind(...params).all<T>()).results;
}
export async function dbRun(sql:string,...params:SqlValue[]) {
  const result=await env.DB.prepare(sql).bind(...params).run();return {changes:result.meta.changes};
}
export async function dbAtomic(commands:SqlCommand[]) {
  return env.DB.batch(commands.map(c=>env.DB.prepare(c.sql).bind(...(c.params||[]))));
}
export async function rateAllowed(key:string,limit:number,windowMs:number):Promise<boolean> {
  // One conditional UPSERT prevents concurrent requests exceeding the limit.
  const now=Date.now();
  const result=await dbRun(`INSERT INTO rate_limits(key,window_start,count) VALUES(?,?,1)
    ON CONFLICT(key) DO UPDATE SET
      window_start=CASE WHEN ?-window_start>=? THEN ? ELSE window_start END,
      count=CASE WHEN ?-window_start>=? THEN 1 ELSE count+1 END
    WHERE ?-window_start>=? OR count<?`,key,now,now,windowMs,now,now,windowMs,now,windowMs,limit);
  return result.changes===1;
}
export async function saveProductEdit(id:string,edit:Record<string,unknown>) {
  const now=new Date().toISOString(),data=JSON.stringify({...edit,updatedAt:now});
  await dbAtomic([
    {sql:`INSERT INTO product_edits(id,data,updated_at) VALUES(?,?,?)
      ON CONFLICT(id) DO UPDATE SET data=json_patch(product_edits.data,excluded.data),updated_at=excluded.updated_at`,params:[id,data,now]},
    {sql:'INSERT INTO audit_events(event,object_id,created_at) VALUES(?,?,?)',params:['product_edit',id,now]},
  ]);
}
