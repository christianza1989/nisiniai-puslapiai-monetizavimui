import {env} from 'cloudflare:workers';
import type {SqlValue,SqlCommand} from '../lib/sql-types';
const database=()=>env.TEXT_REVIEW_DB||env.DB;
export async function dbAll<T>(sql:string,...params:SqlValue[]):Promise<T[]>{return(await database().prepare(sql).bind(...params).all<T>()).results;}
export async function dbSelectBatch<T>(commands:SqlCommand[]):Promise<T[][]>{
 if(commands.length>32||commands.some(c=>!/^SELECT\s/i.test(c.sql.trim())||(c.params?.length||0)>100))throw Error('Invalid bounded read batch');
 if(!commands.length)return [];
 const db=database();return(await db.batch<T>(commands.map(c=>db.prepare(c.sql).bind(...(c.params||[]))))).map(r=>r.results);
}
export async function dbAtomic(commands:SqlCommand[]){return database().batch(commands.map(c=>database().prepare(c.sql).bind(...c.params||[])));}
