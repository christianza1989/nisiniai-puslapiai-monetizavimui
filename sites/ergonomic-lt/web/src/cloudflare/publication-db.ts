import {env} from 'cloudflare:workers';
function database(){return (env as unknown as {PUBLICATION_DB:D1Database}).PUBLICATION_DB;}
export async function publicationOne<T>(sql:string,...args:(string|number|null)[]):Promise<T|undefined>{return (await database().prepare(sql).bind(...args).first<T>())??undefined;}
export async function publicationAll<T>(sql:string,...args:(string|number|null)[]):Promise<T[]>{return (await database().prepare(sql).bind(...args).all<T>()).results;}
export async function publicationBatch(commands:{sql:string;params:(string|number|null)[]}[]){
 const results=await database().batch(commands.map(c=>database().prepare(c.sql).bind(...c.params)));
 return results.map(r=>({changes:r.meta.changes}));
}
